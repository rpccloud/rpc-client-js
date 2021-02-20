import {RPCStream} from "./stream"
import {
    ErrWebSocketDail,
    ErrWebSocketOnError,
    ErrWebSocketWriteStream,
    RPCError
} from "./error"
import {getTimeNowMS} from "./utils"

const websocketCloseNormalClosure = 1000

export interface IReceiver {
    OnConnOpen(streamConn: IStreamConn): void

    OnConnClose(streamConn: IStreamConn): void

    OnConnReadStream(streamConn: IStreamConn, stream: RPCStream): void

    OnConnError(streamConn: IStreamConn | null, err: RPCError): void
}

export interface IStreamConn {
    writeStream(stream: RPCStream): boolean

    close(): void
}

export interface IAdapter {
    open(): boolean

    close(): boolean
}

export class WebSocketStreamConn implements IStreamConn {
    private static StatusOpening = 1;
    private static StatusOpened = 2;
    private static StatusClosing = 3;
    private static StatusClosed = 4;

    private readonly ws: WebSocket
    private status: number
    private receiver: IReceiver

    public constructor(ws: WebSocket, receiver: IReceiver) {
        ws.binaryType = "arraybuffer"
        this.ws = ws
        this.status = WebSocketStreamConn.StatusOpening
        this.receiver = receiver
        ws.onmessage = (event?: MessageEvent) => {
            if (event?.data instanceof ArrayBuffer) {
                const stream: RPCStream = new RPCStream()
                stream.setWritePos(0)
                stream.putBytesTo(new Uint8Array(event?.data), 0)
                receiver.OnConnReadStream(this, stream)
            }
        }
        ws.onopen = () => {
            this.status = WebSocketStreamConn.StatusOpened
            receiver.OnConnOpen(this)
        }
        ws.onclose = () => {
            receiver.OnConnClose(this)
            this.status = WebSocketStreamConn.StatusClosed
        }
        ws.onerror = (ev: Event) => {
            receiver.OnConnError(this, ErrWebSocketOnError.addDebug(ev.type))
        }
    }

    public writeStream(stream: RPCStream): boolean {
        try {
            this.ws.send(stream.getBuffer())
            return true
        } catch (e) {
            this.receiver.OnConnError(
                this, ErrWebSocketWriteStream.addDebug(e.toString()),
            )
            return false
        }
    }

    public close(): boolean {
        if (this.status === WebSocketStreamConn.StatusOpening
            || this.status === WebSocketStreamConn.StatusOpened) {
            this.status = WebSocketStreamConn.StatusClosing
            this.ws.close(websocketCloseNormalClosure, "")
            return true
        }

        return false
    }

    public isClosed(): boolean {
        return this.status === WebSocketStreamConn.StatusClosed
    }
}

export class WSClientAdapter implements IAdapter {
    private conn: WebSocketStreamConn | null
    private checkHandler: number | null
    private readonly connectString: string
    private readonly receiver: IReceiver

    public constructor(connectString: string, receiver: IReceiver) {
        this.checkHandler = null
        this.connectString = connectString
        this.receiver = receiver
        this.conn = null
    }

    public open(): boolean {
        if (this.checkHandler === null) {
            let connectMS = 0
            this.checkHandler = window.setInterval(() => {
                const nowMS = getTimeNowMS()
                if (this.conn === null || this.conn.isClosed()) {
                    if (nowMS - connectMS > 3000) {
                        connectMS = nowMS
                        try {
                            const webSocket = new WebSocket(this.connectString)
                            this.conn = new WebSocketStreamConn(
                                webSocket,
                                this.receiver,
                            )
                        } catch (e) {
                            this.receiver.OnConnError(
                                null, ErrWebSocketDail.addDebug(e.toString()),
                            )
                        }
                    }
                }
            }, 300)

            return true
        }

        return false
    }

    public close(): boolean {
        if (this.checkHandler === null) {
            return false
        }

        window.clearInterval(this.checkHandler)
        this.checkHandler = null

        if (this.conn !== null) {
            this.conn.close()
        }

        return true
    }
}
