import {RPCStream} from "./stream"
import {RPCAny, toRPCInt64, toRPCUint64} from "./types"
import {
    ErrClientConfig,
    ErrClientTimeout,
    ErrStream,
    ErrUnsupportedValue, RPCError,
} from "./error"
import {
    __test__, Client,
    LogToScreenErrorStreamHub,
    parseResponseStream
} from "./client"
import {getTimeNowMS, sleep} from "./utils"
import {IStreamConn, WebSocketStreamConn} from "./adapter"

/* eslint-disable @typescript-eslint/no-explicit-any */

class FakeConn implements IStreamConn {
    onWriteStream: ((stream: RPCStream) => void) | null = null
    onClose: (() => void) | null = null
    onIsClosed: (() => boolean) | null = null
    onIsActive: ((nowMS: number, timeoutMS: number) => boolean) | null = null

    writeStream(stream: RPCStream): boolean {
        if (this.onWriteStream) {
            stream.buildStreamCheck()
            this.onWriteStream(stream)
            return true
        } else {
            return false
        }
    }

    close(): void {
        if (this.onClose) {
            this.onClose()
        }
    }

    isClosed(): boolean {
        if (this.onIsClosed) {
            return this.onIsClosed()
        }
        return true
    }

    isActive(nowMS: number, timeoutMS: number): boolean {
        if (this.onIsActive) {
            return this.onIsActive(nowMS, timeoutMS)
        }
        return false
    }
}

class TestServer {
    onRPCRequest: (stream: RPCStream) => RPCStream | null
    onConnectRequest: (stream: RPCStream) => RPCStream | null
    onPing: (stream: RPCStream) => RPCStream | null

    constructor(onRPCRequest: (stream: RPCStream) => RPCStream | null) {
        this.onRPCRequest = onRPCRequest
        this.onConnectRequest = (stream: RPCStream): RPCStream | null => {
            if (stream.getCallbackID() !== 0) {
                return null
            }

            const [sessionString, ok] = stream.readString()
            if (!ok || !stream.isReadFinish()) {
                return null
            }

            const ret = new RPCStream()
            ret.setKind(RPCStream.StreamKindConnectResponse)
            ret.writeString(sessionString ?
                sessionString :
                "234-12345678123456781234567812345678"
            )
            ret.writeInt64(toRPCInt64(32))
            ret.writeInt64(toRPCInt64(4 * 1024 * 1024))
            ret.writeInt64(toRPCInt64(4000000000))
            ret.writeInt64(toRPCInt64(8000000000))
            return ret
        }

        this.onPing = (stream: RPCStream): RPCStream | null => {
            if (!stream.isReadFinish()) {
                return null
            }
            const ret = new RPCStream()
            ret.setKind(RPCStream.StreamKindPong)
            return ret
        }
    }

    public emulate(stream: RPCStream): RPCStream | null {
        switch (stream.getKind()) {
        case RPCStream.ControlStreamConnectRequest:
            return this.onConnectRequest(stream)
        case RPCStream.StreamKindPing:
            return this.onPing(stream)
        case RPCStream.StreamKindRPCRequest:
            return this.onRPCRequest(stream)
        default:
            return null
        }
    }
}

function fnTestCheckPreSendList(c: any, arr: any): boolean {
    if (arr.length === 0) {
        return c.preSendHead === null && c.preSendTail === null
    }

    if (c.preSendHead !== arr[0] || c.preSendTail !== arr[arr.length - 1]) {
        console.log(c.preSendHead != arr[0])
        console.log(c.preSendTail != arr[arr.length - 1])
        return false
    }

    if (c.preSendTail.next !== null) {
        return false
    }

    for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i].next != arr[i + 1]) {
            return false
        }
    }

    return true
}

function testTryToTimeout(totalItems: number, timeoutItems: number): boolean {
    const v = new Client("error001") as any

    if (totalItems < 0 || totalItems < timeoutItems) {
        return false
    }

    const beforeData = []
    const afterData = []

    for (let i = 0; i < totalItems; i++) {
        const item = new __test__.SendItem(1000)

        if (v.preSendTail === null) {
            v.preSendHead = item
            v.preSendTail = item
        } else {
            v.preSendTail.next = item
            v.preSendTail = item
        }

        beforeData.push(item)
        afterData.push(item)
    }

    for (let i = 0; i < timeoutItems; i++) {
        const idx = Math.floor(Math.random() * 999999999) % afterData.length
        const item = afterData[idx] as any
        item.deferred.promise.then(() => ({})).catch(() => ({}))
        item["timeoutMS"] = 0
        afterData.splice(idx, 1)
    }

    if (!fnTestCheckPreSendList(v, beforeData)) {
        return false
    }

    v.tryToTimeout(getTimeNowMS() + 500)
    v.close()
    return fnTestCheckPreSendList(v, afterData)
}

function testTryToDeliverPreSendMessages(
    totalPreItems: number,
    chSize: number,
    chFree: number,
): boolean {
    if (chSize < chFree) {
        return false
    }

    const v = new Client("error002") as any
    v.lastPingTimeMS = 10000
    v.config.heartbeatMS = 9
    v.channels = []
    v.conn = new FakeConn()

    const chFreeArr = []
    const itemsArray = []

    for (let i = 0; i < chSize; i++) {
        v.channels.push(new __test__.Channel(i))
        chFreeArr.push(i)
    }

    for (let i = 0; i < totalPreItems; i++) {
        const item = new __test__.SendItem(1000)
        itemsArray.push(item)
        if (v.preSendHead === null) {
            v.preSendHead = itemsArray[i]
            v.preSendTail = itemsArray[i]
        } else {
            v.preSendTail.next = itemsArray[i]
            v.preSendTail = itemsArray[i]
        }
    }

    if (!fnTestCheckPreSendList(v, itemsArray)) {
        return false
    }

    while (chFreeArr.length > chFree) {
        const idx = Math.floor(Math.random() * 999999999) % chFreeArr.length
        v.channels[chFreeArr[idx]].item = new __test__.SendItem(1000)
        chFreeArr.splice(idx, 1)
    }

    v.tryToDeliverPreSendMessages()
    v.close()
    return fnTestCheckPreSendList(
        v,
        itemsArray.slice(Math.min(itemsArray.length, chFree)),
    )
}

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

    test("stream is nil", async () => {
        expect(parseResponseStream(undefined as any))
            .toStrictEqual([null, ErrStream])
        expect(parseResponseStream(null as any))
            .toStrictEqual([null, ErrStream])
    })
})

describe("LogToScreenErrorStreamHub tests", () => {
    beforeEach(() => {
        jest.spyOn(console, "log")
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    test("LogToScreenErrorStreamHub_OnReceiveStream 01", async () => {
        const v = new LogToScreenErrorStreamHub()
        const stream = new RPCStream()
        stream.setKind(RPCStream.StreamKindRPCResponseError)
        stream.writeUint64(toRPCUint64(ErrClientConfig.getCode()))
        stream.writeString(ErrClientConfig.getMessage())
        v.OnReceiveStream(stream)
        expect((console.log as any).mock.calls.length).toStrictEqual(1)
        expect((console.log as any).mock.calls[0][0]).toStrictEqual(
            "ConfigWarn[1026]: client config error",
        )
    })

    test("LogToScreenErrorStreamHub_OnReceiveStream 02", async () => {
        const v = new LogToScreenErrorStreamHub()
        const stream = new RPCStream()
        stream.setKind(RPCStream.StreamKindSystemErrorReport)
        stream.writeUint64(toRPCUint64(ErrClientConfig.getCode()))
        stream.writeString(ErrClientConfig.getMessage())
        v.OnReceiveStream(stream)
        expect((console.log as any).mock.calls.length).toStrictEqual(1)
        expect((console.log as any).mock.calls[0][0]).toStrictEqual(
            "ConfigWarn[1026]: client config error",
        )
    })

    test("LogToScreenErrorStreamHub_OnReceiveStream 03", async () => {
        const v = new LogToScreenErrorStreamHub()
        const stream = new RPCStream()
        stream.setKind(RPCStream.StreamKindRPCResponseOK)
        stream.writeBool(true)
        v.OnReceiveStream(stream)
        expect((console.log as any).mock.calls.length).toStrictEqual(0)
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
        expect(v.back(null as any)).toStrictEqual(false)
        expect(!!v["deferred"]["reject"]).toStrictEqual(true)
        expect(!!v["deferred"]["resolve"]).toStrictEqual(true)
        expect(v.back(undefined as any)).toStrictEqual(false)
        expect(!!v["deferred"]["reject"]).toStrictEqual(true)
        expect(!!v["deferred"]["resolve"]).toStrictEqual(true)
    })

    test("SendItem_back, item is not running", async () => {
        const v = new __test__.SendItem(1200)
        v["isRunning"] = false
        expect(v.back(new RPCStream())).toStrictEqual(false)
        expect(!!v["deferred"]["reject"]).toStrictEqual(true)
        expect(!!v["deferred"]["resolve"]).toStrictEqual(true)
    })

    test("SendItem_back, test ok （reject)", async () => {
        const v = new __test__.SendItem(1200)
        expect(v.back(new RPCStream())).toStrictEqual(true)
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
        expect(v.back(stream)).toStrictEqual(true)
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
        v.item = new __test__.SendItem(1)
        await sleep(10)
        expect(v.checkTime(getTimeNowMS())).toStrictEqual(true)
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
        client.close()
    })

    test("Subscription_close", async () => {
        const client = new Client("")
        const v = new __test__.Subscription(13, client, () => void {})
        client["subscriptionMap"].set("#.test%Message", [v])
        v.close()
        expect(v["id"]).toStrictEqual(0)
        expect(v["client"]).toStrictEqual(null)
        expect(client["subscriptionMap"]).toStrictEqual(new Map())
        client.close()
    })
})

describe("Client tests", () => {
    test("new", async () => {
        const v = new Client("error003")
        expect(v["seed"]).toStrictEqual(0)
        expect(v["config"]["numOfChannels"]).toStrictEqual(0)
        expect(v["config"]["transLimit"]).toStrictEqual(0)
        expect(v["config"]["heartbeatMS"]).toStrictEqual(0)
        expect(v["config"]["heartbeatTimeoutMS"]).toStrictEqual(0)
        expect(v["sessionString"]).toStrictEqual("")
        expect(v["adapter"]["checkHandler"] as any > 0).toStrictEqual(true)
        expect(v["conn"] === null).toStrictEqual(true)
        expect(v["preSendHead"] === null).toStrictEqual(true)
        expect(v["preSendTail"] === null).toStrictEqual(true)
        expect(v["channels"] === null).toStrictEqual(true)
        expect(v["lastPingTimeMS"]).toStrictEqual(0)
        expect(v["subscriptionMap"]).toStrictEqual(new Map())
        expect(!!v["errorHub"]).toStrictEqual(true)
        expect(v["timer"] as any > 0).toStrictEqual(true)

        // check tryLoop
        let errCount = 0
        try {
            await v.send(100, "#.user:Sleep")
        } catch (e) {
            expect(e.toString().startsWith(
                ErrClientTimeout.addDebug("#.user:Sleep timeout").toString(),
            )).toStrictEqual(true)
            errCount++
        } finally {
            expect(errCount).toStrictEqual(1)
        }

        v.close()
    })

    test("getSeed", async () => {
        const v = new Client("error004")
        expect(v["getSeed"]()).toStrictEqual(1)
        expect(v["getSeed"]()).toStrictEqual(2)
        v.close()
    })

    test("setErrorHub", async () => {
        const v = new Client("error005")
        const hub = new LogToScreenErrorStreamHub()
        v.setErrorHub(hub)
        expect(v["errorHub"]).toStrictEqual(hub)
        v.close()
    })

    test("tryToSendPing, p.conn === nil", async () => {
        const v = new Client("error006")
        v["tryToSendPing"](1)
        expect(v["lastPingTimeMS"]).toStrictEqual(0)
        v.close()
    })

    test("tryToSendPing, not need ping", async () => {
        const v = new Client("error007")
        v["config"]["heartbeatMS"] = 1000
        v["conn"] = new WebSocketStreamConn(new WebSocket("ws://localhost"), v)
        v["tryToSendPing"](1)
        expect(v["lastPingTimeMS"]).toStrictEqual(0)
        v.close()
    })

    test("tryToSendPing, test ok", async () => {
        const v = new Client("error008")
        const fakeConn = new FakeConn()
        let isRun = false
        v["conn"] = fakeConn
        fakeConn.onWriteStream = (stream: RPCStream) => {
            expect(stream.getKind()).toStrictEqual(RPCStream.StreamKindPing)
            expect(stream.isReadFinish()).toStrictEqual(true)
            expect(stream.checkStream()).toStrictEqual(true)
            isRun = true
        }
        v["tryToSendPing"](getTimeNowMS())
        expect(isRun).toStrictEqual(true)
        v.close()
    })

    test("tryToTimeout, test ok", async () => {
        for (let n = 0; n < 10; n++) {
            for (let i = 0; i < 10; i++) {
                for (let j = 0; j <= i; j++) {
                    expect(testTryToTimeout(i, j)).toStrictEqual(true)
                }
            }
        }
    })

    test("tryToTimeout, channels has been swept", async () => {
        const v = new Client("ws://localhost") as any
        v.lastPingTimeMS = 10000
        v.config.heartbeatTimeoutMS = 9
        v.channels = [new __test__.Channel(0)]
        const item = new __test__.SendItem(5)
        item.deferred.promise.then(() => ({})).catch(() => ({}))
        v.channels[0].use(item, 1)
        v.tryToTimeout(item.sendTimeMS + 4)
        expect(v.channels[0].sequence).toStrictEqual(1)
        expect(v.channels[0].item === null).toStrictEqual(false)
        v.tryToTimeout(item.sendTimeMS + 10)
        expect(v.channels[0].sequence).toStrictEqual(1)
        expect(v.channels[0].item === null).toStrictEqual(true)
        v.close()
    })

    test("tryToTimeout, conn has been swept", async () => {
        const v = new Client("ws://localhost") as any
        v.lastPingTimeMS = 10000
        v.config.heartbeatTimeoutMS = 9
        v.channels = [new __test__.Channel(0)]

        // conn is nil
        v.tryToTimeout(getTimeNowMS())
        expect(v.conn).toStrictEqual(null)

        // set conn
        let doOnClose = false
        const fakeConn = new FakeConn()
        const fakeConnActiveMS = getTimeNowMS()
        fakeConn.onIsActive =
            (nowMS, timeoutMS) => nowMS - fakeConnActiveMS < timeoutMS
        fakeConn.onClose = () => {
            doOnClose = true
        }
        v.conn = fakeConn

        // conn is active
        v.tryToTimeout(getTimeNowMS() + 4)
        expect(doOnClose).toStrictEqual(false)

        // conn is not active
        v.tryToTimeout(getTimeNowMS() + 20)
        expect(doOnClose).toStrictEqual(true)

        v.close()
    })

    test("tryToDeliverPreSendMessages, test ok", async () => {
        for (let n = 16; n <= 32; n++) {
            for (let i = 0; i < 10; i++) {
                for (let j = 0; j <= n; j++) {
                    expect(testTryToDeliverPreSendMessages(i, n, j))
                        .toStrictEqual(true)
                }
            }
        }
    })

    test("tryToDeliverPreSendMessages, this.conn === null", async () => {
        const v = new Client("error009") as any
        const item = new __test__.SendItem(1000)
        v.lastPingTimeMS = 10000
        v.config.heartbeatMS = 9
        v.channels = [new __test__.Channel(0)]
        v.preSendHead = item
        v.tryToDeliverPreSendMessages()
        expect(v.preSendHead).toStrictEqual(item)
        v.close()
    })

    test("tryToDeliverPreSendMessages, this.channel === null", async () => {
        const v = new Client("error010") as any
        const item = new __test__.SendItem(1000)
        v.lastPingTimeMS = 10000
        v.config.heartbeatMS = 9
        v.conn = new FakeConn()
        v.preSendHead = item
        v.tryToDeliverPreSendMessages()
        expect(v.preSendHead).toStrictEqual(item)
        v.close()
    })

    test("subscribe, basic", async () => {
        const v = new Client("error011") as any

        const sub1 = v.subscribe("#.test", "Message01", () => ({}))
        const sub2 = v.subscribe("#.test", "Message01", () => ({}))
        const sub3 = v.subscribe("#.test", "Message02", () => ({}))
        expect(!!sub1).toStrictEqual(true)
        expect(!!sub2).toStrictEqual(true)
        expect(!!sub3).toStrictEqual(true)

        const map = new Map()
        map.set("#.test%Message01", [sub1, sub2])
        map.set("#.test%Message02", [sub3])
        expect(v.subscriptionMap).toStrictEqual(map)
        v.close()
    })

    test("subscribe, message", async () => {
        const v = new Client("error012")
        let runOK = false
        v.subscribe("#.test", "Message01", (v: RPCAny) => {
            expect(v).toStrictEqual("OK")
            runOK = true
        })

        const stream = new RPCStream()
        stream.setKind(RPCStream.StreamKindRPCBoardCast)
        stream.writeString("#.test%Message01")
        stream.writeString("OK")
        v["conn"] = new FakeConn()
        v.OnConnReadStream(v["conn"], stream)

        expect(runOK).toStrictEqual(true)
        v.close()
    })

    test("unsubscribe", async () => {
        const v = new Client("error013") as any
        const sub1 = v.subscribe("#.test", "Message01", () => ({}))
        const sub2 = v.subscribe("#.test", "Message01", () => ({}))
        const sub3 = v.subscribe("#.test", "Message02", () => ({}))

        const map1 = new Map()
        map1.set("#.test%Message01", [sub1, sub2])
        map1.set("#.test%Message02", [sub3])
        expect(v.subscriptionMap).toStrictEqual(map1)

        v.unsubscribe(sub1.id)
        const map2 = new Map()
        map2.set("#.test%Message01", [sub2])
        map2.set("#.test%Message02", [sub3])
        expect(v.subscriptionMap).toStrictEqual(map2)

        v.unsubscribe(sub2.id)
        const map3 = new Map()
        map3.set("#.test%Message02", [sub3])
        expect(v.subscriptionMap).toStrictEqual(map3)

        v.unsubscribe(sub3.id)
        expect(v.subscriptionMap).toStrictEqual(new Map())
        v.close()
    })

    test("send, args error", async () => {
        const v = new Client("error014") as any
        v.conn = new FakeConn()
        let runOK = false
        try {
            await v.send(1000, "#.user:SayHello", 0)
        } catch (e) {
            expect(e).toStrictEqual(ErrUnsupportedValue.addDebug(
                "1st argument(0): value is not supported",
            ))
            runOK = true
        } finally {
            expect(runOK).toStrictEqual(true)
        }
        v.close()
    })

    test("send, test ok", async () => {
        const server = new TestServer((stream: RPCStream): RPCStream | null => {
            const [target, ok1] = stream.readString()
            const [from, ok2] = stream.readString()
            const [arg, ok3] = stream.readString()
            if (target === "#.user:SayHello" && from === "@" && arg === "kitty"
                && ok1 && ok2 && ok3) {
                const retStream = new RPCStream()
                retStream.setCallbackID(stream.getCallbackID())
                retStream.setKind(RPCStream.StreamKindRPCResponseOK)
                retStream.writeString("hello kitty")
                return retStream
            } else {
                return null
            }
        })

        const v = new Client("wdl://localhost") as any
        const conn = new FakeConn()
        conn.onIsActive = () => true
        conn.onIsClosed = () => false
        conn.onWriteStream = (stream: RPCStream) => {
            const retStream = server.emulate(stream)
            if (retStream) {
                retStream.buildStreamCheck()
                setTimeout((s) => {
                    v.OnConnReadStream(conn, s)
                }, 30, retStream)
            }
        }
        await sleep(500)
        v.OnConnOpen(conn)
        let sendCount = 0
        for (let i = 0; i < 100; i++) {
            v.send(6000, "#.user:SayHello", "kitty").then((ret: RPCAny) => {
                expect(ret).toStrictEqual("hello kitty")
                sendCount++
            }).catch((e: RPCError) => {
                console.log(e)
            })
        }

        await sleep(1500)
        expect(sendCount).toStrictEqual(100)
        v.close()
    })

    test("send, timeout in pre delivery list", async () => {
        const v = new Client("wdl://localhost", true)
        try {
            await v.send(100, "#.test:Timeout")
        } catch (e) {
            expect(e.getMessage().includes("Client.send"))
                .toStrictEqual(true)
            expect(e.getMessage().includes("client.test.ts"))
                .toStrictEqual(true)
        }
    })

    test("close, test ok", async () => {
        const v = new Client("ws://localhost") as any
        expect(v.timer !== null).toStrictEqual(true)
        expect(v.close()).toStrictEqual(true)
        expect(v.timer === null).toStrictEqual(true)
        expect(v.close()).toStrictEqual(false)
    })

    test("OnConnOpen", async () => {
        const v = new Client("wdl://localhost")
        v["sessionString"] = "123456"
        const conn = new FakeConn()
        let runOK = false
        conn.onWriteStream = (stream: RPCStream) => {
            expect(stream.getKind())
                .toStrictEqual(RPCStream.StreamKindConnectRequest)
            expect(stream.getCallbackID()).toStrictEqual(0)
            expect(stream.readString()).toStrictEqual(["123456", true])
            expect(stream.isReadFinish()).toStrictEqual(true)
            runOK = true
        }
        v.OnConnOpen(conn)
        expect(runOK).toStrictEqual(true)
    })

    test("OnConnError", async () => {
        const v = new Client("wdl://localhost")
        let runOK = false
        v["errorHub"] = {
            OnReceiveStream: (stream: RPCStream) => {
                expect(parseResponseStream(stream))
                    .toStrictEqual([null, ErrStream])
                runOK = true
            },
        }
        v.OnConnError(null, ErrStream)
        expect(runOK).toStrictEqual(true)
    })

    test("OnConnClose", async () => {
        const v = new Client("wdl://localhost")
        v["conn"] = new FakeConn()
        v.OnConnClose()
        expect(v["conn"] === null).toStrictEqual(true)
    })
})

/* eslint-enable @typescript-eslint/no-explicit-any */
