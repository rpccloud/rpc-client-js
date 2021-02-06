import {convertToIsoDateString} from "./utils"

export const LogLevelOff = 0
export const LogLevelFatal = 1
export const LogLevelError = 3
export const LogLevelWarn = 7
export const LogLevelInfo = 15
export const LogLevelAll = 31

const logMaskFatal = 1
const logMaskError = 2
const logMaskWarn = 4
const logMaskInfo = 8
const logMaskDebug = 16

export type CallbackFunc = ((msg: string) => void) | null

export class LogSubscription {
    private id: number
    private logger: Logger | null
    public onDebug: CallbackFunc = null
    public onInfo: CallbackFunc = null
    public onWarn: CallbackFunc = null
    public onError: CallbackFunc = null
    public onFatal: CallbackFunc = null

    public constructor(id: number, logger: Logger) {
        this.id = id
        this.logger = logger
    }

    public close(): boolean {
        if (this.logger === null || this.logger === undefined) {
            return false
        }

        const ret = this.logger.removeSubscription(this.id)
        this.id = 0
        this.logger = null
        this.onDebug = null
        this.onInfo = null
        this.onWarn = null
        this.onError = null
        this.onFatal = null

        return ret
    }

    public getID(): number {
        return this.id
    }
}

export class Logger {
    private level: number
    private readonly subscriptions: Array<LogSubscription>
    private seed: number

    public constructor() {
        this.level = LogLevelAll
        this.subscriptions = []
        this.seed = 1
    }

    public setLevel(level: number): boolean {
        if (
            Number.isSafeInteger(level) &&
            level >= LogLevelOff && level <= LogLevelAll
        ) {
            this.level = level
            return true
        } else {
            return false
        }
    }

    public removeSubscription(id: number): boolean {
        for (let i = 0; i < this.subscriptions.length; i++) {
            if (this.subscriptions[i].getID() === id) {
                this.subscriptions.splice(i, 1)
                return true
            }
        }
        return false
    }

    public subscribe(): LogSubscription {
        this.seed++
        const ret = new LogSubscription(this.seed, this)
        this.subscriptions.push(ret)
        return ret
    }

    public debug(msg: string): void {
        this.log(logMaskDebug, " Debug: ", msg)
    }

    public info(msg: string): void {
        this.log(logMaskInfo, " Info: ", msg)
    }

    public warn(msg: string): void {
        this.log(logMaskWarn, " Warn: ", msg)
    }

    public error(msg: string): void {
        this.log(logMaskError, " Error: ", msg)
    }

    public fatal(msg: string): void {
        this.log(logMaskFatal, " Fatal: ", msg)
    }

    public log(outputLevel: number, tag: string, msg: string): void {
        const level = this.level

        if (Number.isSafeInteger(outputLevel) && (level & outputLevel) > 0) {
            const subscriptions = this.subscriptions
            const isoTimeNow = convertToIsoDateString(new Date())
            const logMsg = `${isoTimeNow}${tag}${msg}\n`

            if (subscriptions.length == 0) {
                console.log(logMsg)
            } else {
                for (const subscription of this.subscriptions) {
                    let fn: CallbackFunc = null
                    switch (outputLevel) {
                    case logMaskDebug:
                        fn = subscription.onDebug
                        break
                    case logMaskInfo:
                        fn = subscription.onInfo
                        break
                    case logMaskWarn:
                        fn = subscription.onWarn
                        break
                    case logMaskError:
                        fn = subscription.onError
                        break
                    case logMaskFatal:
                        fn = subscription.onFatal
                        break
                    default:
                        break
                    }
                    if (fn != null) {
                        fn(logMsg)
                    } else {
                        console.log(logMsg)
                    }
                }
            }
        }
    }
}

