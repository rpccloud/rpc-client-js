// Config ...
import {IStreamConn, ClientAdapter, IReceiver} from "./adapter"
import {Deferred} from "./deferred"
import {RPCAny, toRPCUint64} from "./types"
import {RPCStream} from "./stream"
import {
    ErrClientTimeout,
    ErrStream,
    ErrUnsupportedValue,
    RPCError
} from "./error"
import {convertOrdinalToString, getTimeNowMS} from "./utils"

export function parseResponseStream(
    stream: RPCStream,
): [RPCAny, RPCError | null] {
    if (stream) {
        switch (stream.getKind()) {
        case RPCStream.StreamKindRPCResponseOK: {
            const [v, ok] = stream.read()
            if (ok && stream.isReadFinish()) {
                return [v, null]
            }
            return [null, ErrStream]
        }
        case RPCStream.StreamKindSystemErrorReport:
        case RPCStream.StreamKindRPCResponseError: {
            const [code, ok1] = stream.readUint64()
            const [message, ok2] = stream.readString()
            const errCode = code.toNumber()

            if (ok1 && ok2 && stream.isReadFinish() && errCode < 4294967296) {
                return [null, new RPCError(errCode, message)]
            }
            return [null, ErrStream]
        }
        default:
            return [null, ErrStream]
        }
    } else {
        return [null, ErrStream]
    }
}

export interface IStreamHub {
    OnReceiveStream(stream: RPCStream): void
}

export class LogToScreenErrorStreamHub implements IStreamHub {
    public OnReceiveStream(stream: RPCStream): void {
        const kind = stream.getKind()
        if (kind === RPCStream.StreamKindSystemErrorReport ||
            kind === RPCStream.StreamKindRPCResponseError) {
            const err = parseResponseStream(stream)[1]
            if (err !== null) {
                console.log(err.toString())
            }
        }
    }
}

class Config {
    numOfChannels = 0
    transLimit = 0
    heartbeatMS = 0
    heartbeatTimeoutMS = 0
}


// SendItem ...
class SendItem {
    private isRunning: boolean
    private readonly startTimeMS: number
    sendTimeMS: number
    private readonly timeoutMS: number
    readonly deferred: Deferred
    readonly sendStream: RPCStream
    stack: string | undefined
    next: SendItem | null = null

    constructor(timeoutMS: number) {
        this.isRunning = true
        this.startTimeMS = getTimeNowMS()
        this.sendTimeMS = 0
        this.timeoutMS = timeoutMS
        this.deferred = new Deferred()
        this.sendStream = new RPCStream()
        this.next = null
    }

    back(stream: RPCStream): boolean {
        if (stream && this.isRunning) {
            const [ret, err] = parseResponseStream(stream)

            if (err !== null) {
                this.deferred.doReject(err)
            } else {
                this.deferred.doResolve(ret)
            }

            return true
        }

        return false
    }

    checkTime(nowMS: number): boolean {
        if (nowMS - this.startTimeMS > this.timeoutMS && this.isRunning) {
            this.isRunning = false
            return true
        }

        return false
    }
}


// Channel ...
class Channel {
    sequence = 0
    item: SendItem | null

    constructor(sequence: number) {
        this.sequence = sequence
        this.item = null
    }

    use(item: SendItem, channelSize: number): boolean {
        if (this.item == null) {
            this.sequence += channelSize
            item.sendStream.setCallbackID(this.sequence)
            this.item = item
            this.item.sendTimeMS = getTimeNowMS()
            return true
        }

        return false
    }

    // Free ...
    free(stream: RPCStream): boolean {
        const item = this.item

        if (item !== null) {
            this.item = null
            return item.back(stream)
        }

        return false
    }

    // CheckTime ...
    checkTime(nowMS: number): boolean {
        if (this.item !== null) {
            return this.item.checkTime(nowMS)
        }

        return false
    }
}

class Subscription {
    private client: Client | null
    id: number
    onMessage: ((_: RPCAny) => void)

    public constructor(
        id: number,
        client: Client,
        onMessage: (_: RPCAny) => void,
    ) {
        this.id = id
        this.client = client
        this.onMessage = onMessage
    }

    close(): void {
        if (this.client !== null) {
            this.client.unsubscribe(this.id)
            this.id = 0
            this.client = null
        }
    }
}

export class Client implements IReceiver {
    private static makeErrorResponseStream(
        err: RPCError,
        callbackID: number,
    ): RPCStream {
        const stream = new RPCStream()
        stream.setKind(RPCStream.StreamKindRPCResponseError)
        stream.setCallbackID(callbackID)
        stream.writeUint64(toRPCUint64(err.getCode()))
        stream.writeString(err.getMessage())
        return stream
    }

    private seed: number
    private config: Config
    private sessionString: string
    private adapter: ClientAdapter
    private conn: IStreamConn | null
    private preSendHead: SendItem | null
    private preSendTail: SendItem | null
    private channels: Array<Channel> | null
    private lastPingTimeMS: number
    private readonly subscriptionMap: Map<string, Array<Subscription>>
    private errorHub: IStreamHub
    private timer: number | null
    private readonly debugMode: boolean
    private readonly stack: string | undefined

    constructor(connectString: string, debugMode?: boolean) {
        this.stack = new Error().stack
        this.debugMode = !!debugMode
        this.seed = 0
        this.config = new Config()
        this.sessionString = ""
        this.adapter = new ClientAdapter(
            connectString, this, this.debugMode ? this.stack : undefined,
        )
        this.conn = null
        this.preSendHead = null
        this.preSendTail = null
        this.channels = null
        this.lastPingTimeMS = 0
        this.subscriptionMap = new Map<string, Array<Subscription>>()
        this.errorHub = new LogToScreenErrorStreamHub()

        this.adapter.open()
        this.timer = window.setInterval(() => {
            const newMS = getTimeNowMS()
            this.tryToTimeout(newMS)
            this.tryToDeliverPreSendMessages()
            this.tryToSendPing(newMS)
        }, 1000)
    }

    private getSeed(): number {
        return ++this.seed
    }

    public setErrorHub(errorHub: IStreamHub | null): void {
        if (errorHub === null) {
            this.errorHub = {OnReceiveStream: () => ({})}
        } else {
            this.errorHub = errorHub
        }
    }

    private tryToSendPing(nowMS: number): void {
        if (this.conn === null ||
            nowMS - this.lastPingTimeMS < this.config.heartbeatMS) {
            return
        }

        // Send Ping
        this.lastPingTimeMS = nowMS
        const stream = new RPCStream()
        stream.setKind(RPCStream.StreamKindPing)
        stream.setCallbackID(0)
        this.conn.writeStream(stream)
    }

    private tryToTimeout(nowMS: number): void {
        const timeoutItems = []
        // sweep pre send list
        let preValidItem: SendItem | null = null
        let item = this.preSendHead
        while (item !== null) {
            if (item.checkTime(nowMS)) {
                const nextItem = item.next

                if (preValidItem === null) {
                    this.preSendHead = nextItem
                } else {
                    preValidItem.next = nextItem
                }

                if (item == this.preSendTail) {
                    this.preSendTail = preValidItem
                }

                item.next = null
                timeoutItems.push(item)
                item = nextItem
            } else {
                preValidItem = item
                item = item.next
            }
        }

        // sweep the channels
        if (this.channels !== null) {
            for (let i = 0; i < this.channels.length; i++) {
                const channel = this.channels[i]
                if (channel.item !== null && channel.checkTime(nowMS)) {
                    timeoutItems.push(channel.item)
                    channel.item = null
                }
            }
        }

        for (let i = 0; i < timeoutItems.length; i++) {
            const sendStream = timeoutItems[i].sendStream
            const [target] = sendStream.readString()
            const err = ErrClientTimeout
                .addDebug(`${target} timeout`)
                .addDebug(timeoutItems[i].stack)

            this.errorHub.OnReceiveStream(
                Client.makeErrorResponseStream(err, sendStream.getCallbackID()),
            )
            timeoutItems[i].deferred.doReject(err)
        }

        // check conn timeout
        if (this.conn !== null) {
            if (!this.conn.isActive(nowMS, this.config.heartbeatTimeoutMS)) {
                this.conn.close()
            }
        }
    }

    public tryToDeliverPreSendMessages(): void {
        if (this.conn === null || this.channels === null) {
            return
        }

        let findFree = 0
        const channelSize = this.channels.length

        while (findFree < channelSize && this.preSendHead != null) {
            // find a free channel
            while (findFree < channelSize && this.channels[findFree].item !== null) {
                findFree++
            }

            if (findFree < channelSize) {
                // remove sendItem from linked list
                const item = this.preSendHead
                if (item == this.preSendTail) {
                    this.preSendHead = null
                    this.preSendTail = null
                } else {
                    this.preSendHead = this.preSendHead.next
                }
                item.next = null

                this.channels[findFree].use(item, channelSize)
                this.conn.writeStream(item.sendStream)
            }
        }
    }

    public subscribe(
        nodePath: string,
        message: string,
        fn: (_: RPCAny) => void,
    ): Subscription {
        const ret = new Subscription(this.getSeed(), this, fn)
        const path = nodePath + "%" + message
        let list = this.subscriptionMap.get(path)
        if (!list) {
            list = new Array<Subscription>()
            this.subscriptionMap.set(path, list)
        }
        list.push(ret)
        return ret
    }

    unsubscribe(id: number): void {
        for (const [key, list] of this.subscriptionMap) {
            const newList = list.filter(v => v.id !== id)

            if (newList.length > 0) {
                this.subscriptionMap.set(key, newList)
            } else {
                this.subscriptionMap.delete(key)
            }
        }
    }

    public send(
        timeoutMS: number,
        target: string,
        ...args: Array<RPCAny>): Promise<RPCAny> {
        const item = new SendItem(timeoutMS)

        if (this.debugMode) {
            item.stack = new Error().stack
        }

        item.sendStream.setKind(RPCStream.StreamKindRPCRequest)

        // write target
        item.sendStream.writeString(target)
        // write from
        item.sendStream.writeString("@")
        // write args
        for (let i = 0; i < args.length; i++) {
            const eStr = item.sendStream.write(args[i])
            if (eStr !== RPCStream.StreamWriteOK) {
                item.deferred.doReject(ErrUnsupportedValue.addDebug(
                    `${convertOrdinalToString(i + 1)} argument(${args[i]}): ${eStr}`
                ))
                return item.deferred.promise
            }
        }

        // add item to the list tail
        if (this.preSendTail == null) {
            this.preSendHead = item
            this.preSendTail = item
        } else {
            this.preSendTail.next = item
            this.preSendTail = item
        }
        this.tryToDeliverPreSendMessages()

        return item.deferred.promise
    }

    public close(): boolean {
        if (this.timer !== null) {
            window.clearInterval(this.timer)
            this.timer = null
            return this.adapter.close()
        }

        return false
    }

    OnConnOpen(streamConn: IStreamConn): void {
        const stream = new RPCStream()
        stream.setKind(RPCStream.StreamKindConnectRequest)
        stream.setCallbackID(0)
        stream.writeString(this.sessionString)
        streamConn.writeStream(stream)
    }

    OnConnReadStream(streamConn: IStreamConn | null, stream: RPCStream): void {
        const callbackID = stream.getCallbackID()

        if (this.conn === null && streamConn !== null) {
            this.conn = streamConn

            if (callbackID != 0) {
                this.OnConnError(streamConn, ErrStream)
            } else if (stream.getKind() !== RPCStream.StreamKindConnectResponse) {
                this.OnConnError(streamConn, ErrStream)
            } else {
                const [sessionString, ok1] = stream.readString()
                const [numOfChannels, ok2] = stream.readInt64()
                const [transLimit, ok3] = stream.readInt64()
                const [heartbeat, ok4] = stream.readInt64()
                const [heartbeatTimeout, ok5] = stream.readInt64()

                if (ok1 && ok2 && ok3 && ok4 && ok5 && stream.isReadFinish()) {
                    if (sessionString != this.sessionString) {
                        // new session
                        this.sessionString = sessionString

                        // update config
                        this.config.numOfChannels = numOfChannels.toNumber()
                        this.config.transLimit = transLimit.toNumber()
                        this.config.heartbeatMS = heartbeat.toNumber() / 1000000
                        this.config.heartbeatTimeoutMS = heartbeatTimeout.toNumber() / 1000000

                        // build channels
                        this.channels = Array<Channel>()
                        for (let i = 0; i < this.config.numOfChannels; i++) {
                            this.channels.push(new Channel(i))
                        }
                    } else {
                        // try to resend channel message
                        if (this.channels !== null) {
                            for (const channel of this.channels) {
                                if (channel.item != null) {
                                    this.conn.writeStream(channel.item.sendStream)
                                }
                            }
                        }
                    }

                    this.lastPingTimeMS = getTimeNowMS()
                }
            }
        } else {
            switch (stream.getKind()) {
            case RPCStream.StreamKindRPCResponseOK:
                if (this.channels !== null && this.channels.length > 0) {
                    const channel = this.channels[callbackID % this.channels.length]
                    if (channel.item && channel.sequence == callbackID) {
                        channel.free(stream)
                        this.tryToDeliverPreSendMessages()
                    }
                }
                break
            case RPCStream.StreamKindRPCResponseError:
                if (this.channels !== null && this.channels.length > 0) {
                    const channel = this.channels[callbackID % this.channels.length]
                    if (channel.item && channel.sequence == callbackID) {
                        let [, err] = parseResponseStream(stream)
                        if (err === null) {
                            err = ErrStream
                        }
                        err = err.addDebug(channel.item.stack)
                        this.errorHub.OnReceiveStream(
                            Client.makeErrorResponseStream(err, callbackID)
                        )
                        channel.free(stream)
                        this.tryToDeliverPreSendMessages()
                    }
                }
                break
            case RPCStream.StreamKindRPCBoardCast: {
                const [path, ok1] = stream.readString()
                const [value, ok2] = stream.read()

                if (ok1 && ok2 && stream.isReadFinish()) {
                    const subList = this.subscriptionMap.get(path)
                    if (subList) {
                        for (const sub of subList) {
                            sub.onMessage(value)
                        }
                    }
                } else {
                    this.OnConnError(streamConn, ErrStream)
                }
                break
            }
            case RPCStream.StreamKindPong:
                if (!stream.isReadFinish()) {
                    this.OnConnError(streamConn, ErrStream)
                }
                break
            default:
                this.OnConnError(streamConn, ErrStream)
            }
        }
    }

    OnConnError(streamConn: IStreamConn | null, err: RPCError): void {
        if (err) {
            const stream = new RPCStream()
            stream.setKind(RPCStream.StreamKindSystemErrorReport)
            stream.writeUint64(toRPCUint64(err.getCode()))
            stream.writeString(err.getMessage())
            this.errorHub.OnReceiveStream(stream)
        }

        if (streamConn) {
            streamConn.close()
        }
    }

    OnConnClose(): void {
        this.conn = null
    }
}

export const __test__ = {
    SendItem,
    Channel,
    Subscription,
}
