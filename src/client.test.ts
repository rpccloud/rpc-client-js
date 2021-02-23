import {RPCStream} from "./stream"
import {toRPCInt64, toRPCUint64} from "./types"
import {ErrClientTimeout, ErrStream} from "./error"
import {LogToScreenErrorStreamHub, parseResponseStream} from "./client"

describe("parseResponseStream tests", () => {
    test("errCode format error", async () => {
        const v = new RPCStream()
        v.setKind(RPCStream.StreamKindSystemErrorReport)
        v.writeInt64(toRPCInt64(3))
        expect(parseResponseStream(v)).toStrictEqual([null, ErrStream])
    })

    test("errCode == 0", async () => {
        const v = new RPCStream()
        v.setKind(RPCStream.StreamKindSystemErrorReport)
        v.writeUint64(toRPCUint64(0))
        expect(parseResponseStream(v)).toStrictEqual([null, ErrStream])
    })

    test("error code overflows", async () => {
        const v = new RPCStream()
        v.setKind(RPCStream.StreamKindRPCResponseError)
        v.writeUint64(toRPCUint64(4294967296))
        v.writeString(ErrClientTimeout.getMessage())
        expect(parseResponseStream(v)).toStrictEqual([null, ErrStream])
    })

    test("error message Read error", async () => {
        const v = new RPCStream()
        v.setKind(RPCStream.StreamKindRPCResponseError)
        v.writeUint64(toRPCUint64(ErrClientTimeout.getCode()))
        v.writeBool(true)
        expect(parseResponseStream(v)).toStrictEqual([null, ErrStream])
    })

    test("error stream is not finish", async () => {
        const v = new RPCStream()
        v.setKind(RPCStream.StreamKindRPCResponseError)
        v.writeUint64(toRPCUint64(ErrClientTimeout.getCode()))
        v.writeString(ErrClientTimeout.getMessage())
        v.writeBool(true)
        expect(parseResponseStream(v)).toStrictEqual([null, ErrStream])
    })

    test("kind unsupported", async () => {
        const v = new RPCStream()
        v.setKind(RPCStream.StreamKindRPCBoardCast)
        v.writeUint64(toRPCUint64(ErrClientTimeout.getCode()))
        v.writeString(ErrClientTimeout.getMessage())
        expect(parseResponseStream(v)).toStrictEqual([null, ErrStream])
    })

    test("error stream ok", async () => {
        const v = new RPCStream()
        v.setKind(RPCStream.StreamKindRPCResponseError)
        v.writeUint64(toRPCUint64(ErrClientTimeout.getCode()))
        v.writeString(ErrClientTimeout.getMessage())
        expect(parseResponseStream(v)).toStrictEqual([null, ErrClientTimeout])
    })

    test("read ret ok", async () => {
        const v = new RPCStream()
        v.setKind(RPCStream.StreamKindRPCResponseOK)
        v.writeBool(true)
        expect(parseResponseStream(v)).toStrictEqual([true, null])
    })

    test("read ret error (empty)", async () => {
        const v = new RPCStream()
        v.setKind(RPCStream.StreamKindRPCResponseOK)
        expect(parseResponseStream(v)).toStrictEqual([null, ErrStream])
    })

    test("read ret error (not finish)", async () => {
        const v = new RPCStream()
        v.setKind(RPCStream.StreamKindRPCResponseOK)
        v.writeBool(true)
        v.writeBool(true)
        expect(parseResponseStream(v)).toStrictEqual([null, ErrStream])
    })
})

describe("LogToScreenErrorStreamHub tests", () => {
    beforeEach(() => {
        jest.spyOn(console, "log")
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    test("LogToScreenErrorStreamHub_new", async () => {
        const v = new LogToScreenErrorStreamHub("Client")
        expect(v["prefix"]).toStrictEqual("Client")
    })

    test("LogToScreenErrorStreamHub_OnReceiveStream 01", async () => {
        const v = new LogToScreenErrorStreamHub("Client")
        const stream = new RPCStream()
        stream.setKind(RPCStream.StreamKindRPCResponseError)
        stream.writeUint64(toRPCUint64(ErrClientTimeout.getCode()))
        stream.writeString(ErrClientTimeout.getMessage())
        v.OnReceiveStream(stream)
        /* eslint-disable @typescript-eslint/no-explicit-any */
        expect((console.log as any).mock.calls.length).toStrictEqual(1)
        expect((console.log as any).mock.calls[0][0])
            .toStrictEqual("[Client Error]: NetWarn[1025]: timeout")
        /* eslint-enable @typescript-eslint/no-explicit-any */
    })

    test("LogToScreenErrorStreamHub_OnReceiveStream 02", async () => {
        const v = new LogToScreenErrorStreamHub("Client")
        const stream = new RPCStream()
        stream.setKind(RPCStream.StreamKindSystemErrorReport)
        stream.writeUint64(toRPCUint64(ErrClientTimeout.getCode()))
        stream.writeString(ErrClientTimeout.getMessage())
        v.OnReceiveStream(stream)
        /* eslint-disable @typescript-eslint/no-explicit-any */
        expect((console.log as any).mock.calls.length).toStrictEqual(1)
        expect((console.log as any).mock.calls[0][0])
            .toStrictEqual("[Client Error]: NetWarn[1025]: timeout")
        /* eslint-enable @typescript-eslint/no-explicit-any */
    })

    test("LogToScreenErrorStreamHub_OnReceiveStream 03", async () => {
        const v = new LogToScreenErrorStreamHub("Client")
        const stream = new RPCStream()
        stream.setKind(RPCStream.StreamKindRPCResponseOK)
        stream.writeBool(true)
        v.OnReceiveStream(stream)
        /* eslint-disable @typescript-eslint/no-explicit-any */
        expect((console.log as any).mock.calls.length).toStrictEqual(0)
        /* eslint-enable @typescript-eslint/no-explicit-any */
    })
})

