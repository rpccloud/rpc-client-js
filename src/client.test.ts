import {RPCStream} from "./stream"
import {toRPCInt64, toRPCUint64} from "./types"
import {ErrClientTimeout, ErrStream} from "./error"
import {
    __test__, Client,
    LogToScreenErrorStreamHub,
    parseResponseStream
} from "./client"
import {getTimeNowMS, sleep} from "./utils"

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

describe("SendItem tests", () => {
    test("SendItem_new", async () => {
        const v = new __test__.SendItem(1200)
        expect(v["isRunning"]).toStrictEqual(true)
        expect(getTimeNowMS() - v["startTimeMS"] < 100).toStrictEqual(true)
        expect(v["sendTimeMS"]).toStrictEqual(0)
        expect(v["timeoutMS"]).toStrictEqual(1200)
        expect(!!v["deferred"]).toStrictEqual(true)
        expect(!!v["sendStream"]).toStrictEqual(true)
        expect(v["next"] === null).toStrictEqual(true)
    })

    test("SendItem_back, stream is null or undefined", async () => {
        const v = new __test__.SendItem(1200)
        /* eslint-disable @typescript-eslint/no-explicit-any */
        expect(v.back(null as any)).toStrictEqual(false)
        expect(!!v["deferred"]["reject"]).toStrictEqual(true)
        expect(!!v["deferred"]["resolve"]).toStrictEqual(true)
        expect(v.back(undefined as any)).toStrictEqual(false)
        expect(!!v["deferred"]["reject"]).toStrictEqual(true)
        expect(!!v["deferred"]["resolve"]).toStrictEqual(true)
        /* eslint-enable @typescript-eslint/no-explicit-any */
    })

    test("SendItem_back, item is not running", async () => {
        const v = new __test__.SendItem(1200)
        v["isRunning"] = false
        /* eslint-disable @typescript-eslint/no-explicit-any */
        expect(v.back(new RPCStream())).toStrictEqual(false)
        expect(!!v["deferred"]["reject"]).toStrictEqual(true)
        expect(!!v["deferred"]["resolve"]).toStrictEqual(true)
        /* eslint-enable @typescript-eslint/no-explicit-any */
    })

    test("SendItem_back, test ok （reject)", async () => {
        const v = new __test__.SendItem(1200)
        /* eslint-disable @typescript-eslint/no-explicit-any */
        expect(v.back(new RPCStream())).toStrictEqual(true)
        /* eslint-enable @typescript-eslint/no-explicit-any */
        let errCount = 0
        try {
            await v.deferred.promise
        } catch (e) {
            expect(e).toStrictEqual(ErrStream)
            errCount++
        } finally {
            expect(errCount).toStrictEqual(1)
        }
    })

    test("SendItem_back, test ok （resolve)", async () => {
        const v = new __test__.SendItem(1200)
        const stream = new RPCStream()
        stream.setKind(RPCStream.StreamKindRPCResponseOK)
        stream.writeString("OK")
        /* eslint-disable @typescript-eslint/no-explicit-any */
        expect(v.back(stream)).toStrictEqual(true)
        /* eslint-enable @typescript-eslint/no-explicit-any */
        let okCount = 0
        try {
            expect(await v.deferred.promise).toStrictEqual("OK")
            okCount++
        } catch (e) {
            expect(e).toStrictEqual(ErrStream)
        } finally {
            expect(okCount).toStrictEqual(1)
        }
    })

    test("SendItem_checkTime, test ok", async () => {
        const v = new __test__.SendItem(1)
        v.sendStream.setCallbackID(15)
        await sleep(100)
        expect(v.checkTime(getTimeNowMS())).toStrictEqual(true)
        expect(v["isRunning"]).toStrictEqual(false)
        let errCount = 0
        try {
            await v.deferred.promise
        } catch (e) {
            expect(e).toStrictEqual(ErrClientTimeout)
            errCount++
        } finally {
            expect(errCount).toStrictEqual(1)
        }
    })

    test("SendItem_checkTime, it is not timeout", async () => {
        const v = new __test__.SendItem(1000)
        v.sendStream.setCallbackID(15)
        await sleep(10)
        expect(v.checkTime(getTimeNowMS())).toStrictEqual(false)
        expect(v["isRunning"]).toStrictEqual(true)
    })

    test("SendItem_checkTime, it is not running", async () => {
        const v = new __test__.SendItem(1000)
        v.sendStream.setCallbackID(15)
        await sleep(10)
        v["isRunning"] = false
        expect(v.checkTime(getTimeNowMS())).toStrictEqual(false)
        expect(v["isRunning"]).toStrictEqual(false)
    })
})

describe("Channel tests", () => {
    test("Channel_new", async () => {
        const v = new __test__.Channel(1000)
        expect(v["sequence"]).toStrictEqual(1000)
        expect(v["item"]).toStrictEqual(null)
    })

    test("Channel_use, this.item !== null", async () => {
        const v = new __test__.Channel(1000)
        v.item = new __test__.SendItem(1000)
        expect(v.use(new __test__.SendItem(1000), 32)).toStrictEqual(false)
    })

    test("Channel_use, test ok", async () => {
        const v = new __test__.Channel(1000)
        const item = new __test__.SendItem(1000)

        expect(v.use(item, 32)).toStrictEqual(true)
        expect(v.sequence).toStrictEqual(1032)
        expect(v.item).toStrictEqual(item)
        expect(item.sendStream.getCallbackID()).toStrictEqual(1032)
        const nowMS = getTimeNowMS()
        expect(nowMS - item["sendTimeMS"] < 1000).toStrictEqual(true)
        expect(nowMS - item["sendTimeMS"] > -1000).toStrictEqual(true)
    })

    test("Channel_free, this.item === null", async () => {
        const v = new __test__.Channel(1000)
        expect(v.free(new RPCStream())).toStrictEqual(false)
    })

    test("Channel_free, test ok", async () => {
        const v = new __test__.Channel(1000)
        const item = new __test__.SendItem(1000)
        v.item = item
        const stream = new RPCStream()
        expect(v.free(stream)).toStrictEqual(true)
        expect(v.item === null).toStrictEqual(true)
        let errCount = 0
        try {
            await item.deferred.promise
        } catch (e) {
            expect(e).toStrictEqual(ErrStream)
            errCount++
        } finally {
            expect(errCount).toStrictEqual(1)
        }
    })

    test("Channel_checkTime, this.item === null", async () => {
        const v = new __test__.Channel(1000)
        expect(v.checkTime(getTimeNowMS())).toStrictEqual(false)
    })

    test("Channel_checkTime, return false", async () => {
        const v = new __test__.Channel(1000)
        v.item = new __test__.SendItem(1000)
        expect(v.checkTime(getTimeNowMS())).toStrictEqual(false)
    })

    test("Channel_checkTime, return true", async () => {
        const v = new __test__.Channel(1000)
        const item = new __test__.SendItem(1)
        v.item = item
        await sleep(10)
        expect(v.checkTime(getTimeNowMS())).toStrictEqual(true)
        let errCount = 0
        try {
            await item.deferred.promise
        } catch (e) {
            expect(e).toStrictEqual(ErrClientTimeout)
            errCount++
        } finally {
            expect(errCount).toStrictEqual(1)
        }
    })
})

describe("Subscription tests", () => {
    test("Subscription_new", async () => {
        const client = new Client("")
        const onMessage = () => void {}
        const v = new __test__.Subscription(12, client, onMessage)
        expect(v["client"]).toStrictEqual(client)
        expect(v["id"]).toStrictEqual(12)
        expect(v["onMessage"]).toStrictEqual(onMessage)
    })

    test("Subscription_close", async () => {
        const client = new Client("")
        const v = new __test__.Subscription(13, client, () => void {})
        client["subscriptionMap"].set("#.test%Message", [v])
        v.close()
        expect(v["id"]).toStrictEqual(0)
        expect(v["client"]).toStrictEqual(null)
        expect(client["subscriptionMap"]).toStrictEqual(new Map())
    })
})
