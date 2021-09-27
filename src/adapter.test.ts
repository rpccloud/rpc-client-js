import {
    IReceiver,
    IStreamConn,
    WebSocketStreamConn,
    ClientAdapter
} from "./adapter"
import {RPCStream} from "./stream"
import {
    ErrJSUnsupportedProtocol, ErrJSWebSocketDail,
    ErrJSWebSocketOnError,
    ErrJSWebSocketWriteStream, ErrStream,
    RPCError
} from "./error"
import {getTimeNowMS, sleep} from "./utils"

class TestReceiver implements IReceiver {
    public onConnOpen: (_: IStreamConn) => void
    public onConnClose: (_: IStreamConn) => void
    public onConnReadStream: (_: IStreamConn | null, __: RPCStream) => void
    public onConnError: (_: IStreamConn, __: RPCError) => void

    public constructor() {
        this.onConnOpen = () => void {}
        this.onConnClose = () => void {}
        this.onConnReadStream = () => void {}
        this.onConnError = () => void {}
    }

    public OnConnOpen(streamConn: IStreamConn) {
        this.onConnOpen(streamConn)
    }

    public OnConnClose(streamConn: IStreamConn) {
        this.onConnClose(streamConn)
    }

    public OnConnReadStream(streamConn: IStreamConn | null, stream: RPCStream) {
        this.onConnReadStream(streamConn, stream)
    }

    public OnConnError(streamConn: IStreamConn, err: RPCError) {
        this.onConnError(streamConn, err)
    }
}

describe("WebSocketStreamConn tests", () => {
    test("WebSocketStreamConn_new", async () => {
        const ws = new WebSocket("ws://127.0.0.1:8080")
        const receiver = new TestReceiver()
        const v = new WebSocketStreamConn(ws, receiver)
        expect(v["ws"]).toStrictEqual(ws)
        expect(v["status"]).toStrictEqual(WebSocketStreamConn["StatusOpening"])
        expect(!!ws.onmessage).toStrictEqual(true)
        expect(!!ws.onopen).toStrictEqual(true)
        expect(!!ws.onclose).toStrictEqual(true)
        expect(!!ws.onerror).toStrictEqual(true)
    })

    test("WebSocketStreamConn_new onmessage error", async () => {
        let callbackCount = 0
        const ws = new WebSocket("ws://127.0.0.1:8080")
        const receiver = new TestReceiver()
        const v = new WebSocketStreamConn(ws, receiver)
        const stream = new RPCStream()
        stream.writeString("test")
        const streamBuffer = stream.getBuffer()
        const arrayBuffer = new ArrayBuffer(stream.getWritePos())
        const arrayBufferView = new Uint8Array(arrayBuffer)
        for (let i = 0; i < arrayBuffer.byteLength; i++) {
            arrayBufferView[i] = streamBuffer[i]
        }

        receiver.onConnError = (streamConn, err) => {
            if (callbackCount === 0) {
                expect(streamConn).toStrictEqual(v)
                expect(err).toStrictEqual(ErrStream)
                callbackCount++
            }
        }

        /* eslint-disable @typescript-eslint/no-explicit-any */
        const onMessage = ws.onmessage as any
        /* eslint-enable @typescript-eslint/no-explicit-any */
        onMessage(null)
        expect(callbackCount).toStrictEqual(1)
        v.close()
    })

    test("WebSocketStreamConn_new onmessage buffer is too short", async () => {
        const ws = new WebSocket("ws://127.0.0.1:8080")
        const receiver = new TestReceiver()
        const v = new WebSocketStreamConn(ws, receiver)
        const streamBuffer = new Uint8Array([1, 2, 3, 4, 5, 6])
        const arrayBuffer = new ArrayBuffer(streamBuffer.length)
        const arrayBufferView = new Uint8Array(arrayBuffer)
        for (let i = 0; i < arrayBuffer.byteLength; i++) {
            arrayBufferView[i] = streamBuffer[i]
        }

        let callbackCount = 0
        receiver.onConnError = (streamConn, err) => {
            if (callbackCount === 0) {
                expect(streamConn).toStrictEqual(v)
                expect(err).toStrictEqual(ErrStream)
                callbackCount++
            }
        }

        /* eslint-disable @typescript-eslint/no-explicit-any */
        const onMessage = ws.onmessage as any
        /* eslint-enable @typescript-eslint/no-explicit-any */
        onMessage({"data": arrayBuffer} as MessageEvent)
        expect(callbackCount).toStrictEqual(1)
    })

    test("WebSocketStreamConn_new onmessage checkStream error", async () => {
        const ws = new WebSocket("ws://127.0.0.1:8080")
        const receiver = new TestReceiver()
        const v = new WebSocketStreamConn(ws, receiver)
        const stream = new RPCStream()
        stream.writeString("test")
        const streamBuffer = stream.getBuffer()
        const arrayBuffer = new ArrayBuffer(stream.getWritePos())
        const arrayBufferView = new Uint8Array(arrayBuffer)
        for (let i = 0; i < arrayBuffer.byteLength; i++) {
            arrayBufferView[i] = streamBuffer[i]
        }

        let callbackCount = 0
        receiver.onConnError = (streamConn, err) => {
            if (callbackCount === 0) {
                expect(streamConn).toStrictEqual(v)
                expect(err).toStrictEqual(ErrStream)
                callbackCount++
            }
        }

        /* eslint-disable @typescript-eslint/no-explicit-any */
        const onMessage = ws.onmessage as any
        /* eslint-enable @typescript-eslint/no-explicit-any */
        onMessage({"data": arrayBuffer} as MessageEvent)
        expect(callbackCount).toStrictEqual(1)
    })

    test("WebSocketStreamConn_new onmessage checkStream ok", async () => {
        const ws = new WebSocket("ws://127.0.0.1:8080")
        const receiver = new TestReceiver()
        const v = new WebSocketStreamConn(ws, receiver)
        const stream = new RPCStream()
        stream.writeString("test")
        stream.buildStreamCheck()
        const streamBuffer = stream.getBuffer()
        const arrayBuffer = new ArrayBuffer(stream.getWritePos())
        const arrayBufferView = new Uint8Array(arrayBuffer)
        for (let i = 0; i < arrayBuffer.byteLength; i++) {
            arrayBufferView[i] = streamBuffer[i]
        }

        let callbackCount = 0
        receiver.onConnReadStream = () => {
            callbackCount++
        }

        /* eslint-disable @typescript-eslint/no-explicit-any */
        const onMessage = ws.onmessage as any
        /* eslint-enable @typescript-eslint/no-explicit-any */
        onMessage({"data": arrayBuffer} as MessageEvent)
        expect(callbackCount).toStrictEqual(1)
        v.close()
    })

    test("WebSocketStreamConn_new onopen", async () => {
        let callbackCount = 0
        const ws = new WebSocket("ws://127.0.0.1:8080")
        const receiver = new TestReceiver()
        const v = new WebSocketStreamConn(ws, receiver)

        receiver.onConnOpen = (streamConn) => {
            expect(streamConn).toStrictEqual(v)
            callbackCount++
        }

        /* eslint-disable @typescript-eslint/no-explicit-any */
        const onMessage = ws.onopen as any
        /* eslint-enable @typescript-eslint/no-explicit-any */
        onMessage()
        expect(callbackCount).toStrictEqual(1)
        expect(v["status"]).toStrictEqual(WebSocketStreamConn["StatusOpened"])
    })

    test("WebSocketStreamConn_new onclose", async () => {
        let callbackCount = 0
        const ws = new WebSocket("ws://127.0.0.1:8080")
        const receiver = new TestReceiver()
        const v = new WebSocketStreamConn(ws, receiver)

        receiver.onConnClose = (streamConn) => {
            expect(streamConn).toStrictEqual(v)
            callbackCount++
        }

        /* eslint-disable @typescript-eslint/no-explicit-any */
        const onOpen = ws.onopen as any
        const onClose = ws.onclose as any
        /* eslint-enable @typescript-eslint/no-explicit-any */
        onOpen()
        expect(v["status"]).toStrictEqual(WebSocketStreamConn["StatusOpened"])
        onClose()
        expect(v["status"]).toStrictEqual(WebSocketStreamConn["StatusClosed"])
        expect(callbackCount).toStrictEqual(1)
    })

    test("WebSocketStreamConn_new onerror", async () => {
        let callbackCount = 0
        const ws = new WebSocket("ws://127.0.0.1:8080")
        const receiver = new TestReceiver()
        const v = new WebSocketStreamConn(ws, receiver)

        receiver.onConnError = (streamConn, err) => {
            expect(streamConn).toStrictEqual(v)
            expect(err).toStrictEqual(ErrJSWebSocketOnError.addDebug("error"))
            callbackCount++
        }

        /* eslint-disable @typescript-eslint/no-explicit-any */
        const onOpen = ws.onopen as any
        const onError = ws.onerror as any
        /* eslint-enable @typescript-eslint/no-explicit-any */
        onOpen()
        onError({type: "error"} as Event)
        expect(callbackCount).toStrictEqual(1)
    })

    test("WebSocketStreamConn_writeStream error", async () => {
        let callbackCount = 0
        const ws = new WebSocket("ws://127.0.0.1:8080")
        const receiver = new TestReceiver()
        const v = new WebSocketStreamConn(ws, receiver)
        receiver.onConnError = (streamConn, err) => {
            if (callbackCount === 0) {
                expect(streamConn).toStrictEqual(v)
                expect(err).toStrictEqual(ErrJSWebSocketWriteStream
                    .addDebug("InvalidStateError: Still in CONNECTING state."))
                callbackCount++
            }
        }
        expect(v.writeStream(new RPCStream())).toStrictEqual(false)
        expect(callbackCount).toStrictEqual(1)
    })

    test("WebSocketStreamConn_writeStream ok", async () => {
        const ws = new WebSocket("ws://127.0.0.1:8080")
        ws["send"] = () => true
        const v = new WebSocketStreamConn(ws, new TestReceiver())
        expect(v.writeStream(new RPCStream())).toStrictEqual(true)
    })

    test("WebSocketStreamConn_close", async () => {
        const ws = new WebSocket("ws://127.0.0.1:8080")
        const receiver = new TestReceiver()
        const v = new WebSocketStreamConn(ws, receiver)
        v["status"] = WebSocketStreamConn["StatusOpening"]
        expect(v.close()).toStrictEqual(true)
        v["status"] = WebSocketStreamConn["StatusOpened"]
        expect(v.close()).toStrictEqual(true)
        v["status"] = WebSocketStreamConn["StatusClosing"]
        expect(v.close()).toStrictEqual(false)
        v["status"] = WebSocketStreamConn["StatusClosed"]
        expect(v.close()).toStrictEqual(false)
    })

    test("WebSocketStreamConn_isClosed", async () => {
        const ws = new WebSocket("ws://127.0.0.1:8080")
        const receiver = new TestReceiver()
        const v = new WebSocketStreamConn(ws, receiver)
        v["status"] = WebSocketStreamConn["StatusOpening"]
        expect(v.isClosed()).toStrictEqual(false)
        v["status"] = WebSocketStreamConn["StatusOpened"]
        expect(v.isClosed()).toStrictEqual(false)
        v["status"] = WebSocketStreamConn["StatusClosing"]
        expect(v.isClosed()).toStrictEqual(false)
        v["status"] = WebSocketStreamConn["StatusClosed"]
        expect(v.isClosed()).toStrictEqual(true)
    })

    test("WebSocketStreamConn_isActive", async () => {
        const ws = new WebSocket("ws://127.0.0.1:8080")
        const receiver = new TestReceiver()
        const v = new WebSocketStreamConn(ws, receiver)
        expect(v.isActive(getTimeNowMS(), 1000)).toStrictEqual(true)
        expect(v.isActive(getTimeNowMS() + 2000, 1000)).toStrictEqual(false)
    })
})


describe("ClientAdapter tests", () => {
    test("ClientAdapter_new", async () => {
        const receiver = new TestReceiver()
        const v = new ClientAdapter("ws://127.0.0.1:8080", receiver, "stack")
        expect(v["checkHandler"]).toStrictEqual(null)
        expect(v["connectString"]).toStrictEqual("ws://127.0.0.1:8080")
        expect(v["receiver"]).toStrictEqual(receiver)
        expect(v["conn"]).toStrictEqual(null)
        expect(v["stack"]).toStrictEqual("stack")
    })

    test("ClientAdapter_open error connectString", async () => {
        const receiver = new TestReceiver()
        let errCount = 0
        receiver.onConnError = (_, e) => {
            expect(e).toStrictEqual(ErrJSUnsupportedProtocol.addDebug(
                "unsupported protocol wsd",
            ))
            errCount++
        }
        const v = new ClientAdapter("wsd://127.0.0.1:8080", receiver, "")

        expect(v.open()).toStrictEqual(true)
        await sleep(4000)
        expect(v.close()).toStrictEqual(true)

        expect(errCount).toStrictEqual(2)
    })

    test("ClientAdapter_open error server", async () => {
        const receiver = new TestReceiver()
        let errCount = 0
        receiver.onConnError = (_, e) => {
            expect(e).toStrictEqual(ErrJSWebSocketOnError.addDebug("error"))
            errCount++
        }
        const v = new ClientAdapter("ws://127.0.0.1:65089", receiver, "")

        expect(v.open()).toStrictEqual(true)
        await sleep(4000)
        expect(v.close()).toStrictEqual(true)

        expect(errCount).toStrictEqual(2)
    })

    test("ClientAdapter_open", async () => {
        const v = new ClientAdapter(
            "ws://127.0.0.1:8080", new TestReceiver(), "",
        )
        expect(v.open()).toStrictEqual(true)
        expect(v["checkHandler"] as number > 0).toStrictEqual(true)
        expect(v.open()).toStrictEqual(false)
        const fakeConn = new WebSocketStreamConn(
            new WebSocket("ws://127.0.0.1:8080"),
            new TestReceiver(),
        )
        await sleep(1000)
        fakeConn["status"] = WebSocketStreamConn["StatusOpening"]
        v["conn"] = fakeConn
        await sleep(3000)
        expect(v.close()).toStrictEqual(true)
    })

    test("ClientAdapter_close", async () => {
        const v = new ClientAdapter(
            "ws://127.0.0.1:8080", new TestReceiver(), "",
        )
        expect(v.open()).toStrictEqual(true)
        expect(v.close()).toStrictEqual(true)
        expect(v["checkHandler"] as number === null).toStrictEqual(true)
        expect(v.close()).toStrictEqual(false)
    })

    test("ClientAdapter_dial ws ok", async () => {
        const receiver = new TestReceiver()
        const v = new ClientAdapter("ws://127.0.0.1:8080", receiver, "")
        expect(v["dial"]() !== null).toStrictEqual(true)
    })

    test("ClientAdapter_dial wss ok", async () => {
        const receiver = new TestReceiver()
        const v = new ClientAdapter("wss://127.0.0.1:8080", receiver, "")
        expect(v["dial"]() !== null).toStrictEqual(true)
    })

    test("ClientAdapter_dial unknown protocol", async () => {
        let errCount = 0
        const receiver = new TestReceiver()
        const v = new ClientAdapter("abc://127.0.0.1:8080", receiver, "")
        receiver.onConnError = (_, e) => {
            expect(e).toStrictEqual(ErrJSUnsupportedProtocol.addDebug(
                "unsupported protocol abc"
            ))
            errCount++
        }
        expect(v["dial"]() === null).toStrictEqual(true)
        expect(errCount).toStrictEqual(1)
    })

    test("ClientAdapter_dial panic", async () => {
        let errCount = 0
        const receiver = new TestReceiver()
        const v = new ClientAdapter("ws:@@@@@@@@@", receiver, "")
        receiver.onConnError = (_, e) => {
            expect(e).toStrictEqual(ErrJSWebSocketDail.addDebug(
                "SyntaxError: The URL 'ws:@@@@@@@@@' is invalid."
            ))
            errCount++
        }
        expect(v["dial"]() === null).toStrictEqual(true)
        expect(errCount).toStrictEqual(1)
    })
})
