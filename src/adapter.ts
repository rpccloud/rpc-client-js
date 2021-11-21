import { RPCStream } from "./stream";
import {
    ErrJSUnsupportedProtocol,
    ErrJSWebSocketDail,
    ErrJSWebSocketOnError,
    ErrJSWebSocketWriteStream,
    ErrStream,
    RPCError,
} from "./error";
import { getTimeNowMS } from "./utils";

const websocketCloseNormalClosure = 1000;

export interface IReceiver {
    OnConnOpen(streamConn: IStreamConn): void;

    OnConnClose(streamConn: IStreamConn): void;

    OnConnReadStream(streamConn: IStreamConn, stream: RPCStream): void;

    OnConnError(streamConn: IStreamConn | null, err: RPCError): void;
}

export interface IStreamConn {
    writeStream(stream: RPCStream): boolean;

    close(): void;

    isClosed(): boolean;

    // IsActive ...
    isActive(nowMS: number, timeoutMS: number): boolean;
}

export class WebSocketStreamConn implements IStreamConn {
    private static StatusOpening = 1;
    private static StatusOpened = 2;
    private static StatusClosing = 3;
    private static StatusClosed = 4;

    private readonly ws: WebSocket;
    private status: number;
    private receiver: IReceiver;
    private activeTimeMS: number;

    public constructor(ws: WebSocket, receiver: IReceiver, stack?: string) {
        ws.binaryType = "arraybuffer";
        this.ws = ws;
        this.status = WebSocketStreamConn.StatusOpening;
        this.receiver = receiver;
        this.activeTimeMS = getTimeNowMS();
        ws.onmessage = (event?: MessageEvent) => {
            if (event?.data instanceof ArrayBuffer) {
                const stream: RPCStream = new RPCStream();
                stream.setWritePos(0);
                if (stream.putBytesTo(new Uint8Array(event.data), 0)) {
                    if (stream.checkStream()) {
                        this.activeTimeMS = getTimeNowMS();
                        receiver.OnConnReadStream(this, stream);
                    } else {
                        receiver.OnConnError(this, ErrStream);
                    }
                } else {
                    receiver.OnConnError(this, ErrStream);
                }
            } else {
                receiver.OnConnError(this, ErrStream);
            }
        };
        ws.onopen = () => {
            this.status = WebSocketStreamConn.StatusOpened;
            receiver.OnConnOpen(this);
        };
        ws.onclose = () => {
            receiver.OnConnClose(this);
            this.status = WebSocketStreamConn.StatusClosed;
        };
        ws.onerror = (ev: Event) => {
            receiver.OnConnError(
                this,
                ErrJSWebSocketOnError.addDebug(ev.type).addDebug(stack)
            );
            this.close();
        };
    }

    public writeStream(stream: RPCStream): boolean {
        try {
            stream.buildStreamCheck();
            this.ws.send(stream.getBuffer());
            return true;
        } catch (e: any) {
            this.receiver.OnConnError(
                this,
                ErrJSWebSocketWriteStream.addDebug(e.toString())
            );
            return false;
        }
    }

    public close(): boolean {
        if (
            this.status === WebSocketStreamConn.StatusOpening ||
            this.status === WebSocketStreamConn.StatusOpened
        ) {
            this.status = WebSocketStreamConn.StatusClosing;
            this.ws.close(websocketCloseNormalClosure, "");
            return true;
        }

        return false;
    }

    public isClosed(): boolean {
        return this.status === WebSocketStreamConn.StatusClosed;
    }

    public isActive(nowMS: number, timeoutMS: number): boolean {
        return nowMS - this.activeTimeMS < timeoutMS;
    }
}

export class ClientAdapter {
    private conn: IStreamConn | null;
    private checkHandler: number | null;
    private readonly connectString: string;
    private readonly receiver: IReceiver;
    private readonly stack?: string;

    public constructor(
        connectString: string,
        receiver: IReceiver,
        stack?: string
    ) {
        this.checkHandler = null;
        this.connectString = connectString;
        this.receiver = receiver;
        this.conn = null;
        this.stack = stack;
    }

    public open(): boolean {
        if (this.checkHandler === null) {
            let connectMS = 0;
            this.checkHandler = window.setInterval(() => {
                const nowMS = getTimeNowMS();
                if (this.conn === null || this.conn.isClosed()) {
                    if (nowMS - connectMS > 3000) {
                        connectMS = nowMS;
                        this.conn = this.dial();
                    }
                }
            }, 300);

            return true;
        }

        return false;
    }

    public close(): boolean {
        if (this.checkHandler === null) {
            return false;
        }

        window.clearInterval(this.checkHandler);
        this.checkHandler = null;

        if (this.conn !== null) {
            this.conn.close();
        }

        return true;
    }

    private dial(): IStreamConn | null {
        try {
            const protocol = this.connectString.trim().split(":")[0];

            if (protocol === "ws" || protocol === "wss") {
                const ws = new WebSocket(this.connectString);
                return new WebSocketStreamConn(ws, this.receiver, this.stack);
            }

            this.receiver.OnConnError(
                null,
                ErrJSUnsupportedProtocol.addDebug(
                    `unsupported protocol ${protocol}`
                ).addDebug(this.stack)
            );
            return null;
        } catch (e: any) {
            this.receiver.OnConnError(
                null,
                ErrJSWebSocketDail.addDebug(e.toString())
            );
            return null;
        }
    }
}
