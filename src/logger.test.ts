import {
    Logger,
    LogLevelAll,
    LogLevelError,
    LogLevelFatal,
    LogLevelInfo,
    LogLevelOff,
    LogLevelWarn,
    LogSubscription,
} from "./logger"

describe("logger tests", () => {
    beforeEach(() => {
        jest.spyOn(console, "log")
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    const emptyCB = function (): void {
        return
    }

    test("LogSubscription_close", () => {
        const logger = new Logger()
        const subscription = logger.subscribe()
        subscription.onDebug = emptyCB
        subscription.onInfo = emptyCB
        subscription.onWarn = emptyCB
        subscription.onError = emptyCB
        subscription.onFatal = emptyCB
        expect(subscription.close()).toStrictEqual(true)
        expect(subscription["id"]).toStrictEqual(0)
        expect(subscription["logger"]).toStrictEqual(null)
        expect(subscription["onDebug"]).toStrictEqual(null)
        expect(subscription["onInfo"]).toStrictEqual(null)
        expect(subscription["onWarn"]).toStrictEqual(null)
        expect(subscription["onError"]).toStrictEqual(null)
        expect(subscription["onFatal"]).toStrictEqual(null)

        const subscription1 = logger.subscribe()
        const subscription2 = logger.subscribe()
        expect(subscription1.close()).toStrictEqual(true)
        expect(subscription1.close()).toStrictEqual(false)
        expect(subscription2.close()).toStrictEqual(true)

        const subscription3 = logger.subscribe()
        subscription3["logger"] = null
        expect(subscription3.close()).toStrictEqual(false)
    })

    test("Logger_new", () => {
        const logger = new Logger()
        expect(logger["level"]).toStrictEqual(LogLevelAll)
        expect(logger["subscriptions"]["length"]).toStrictEqual(0)
    })

    test("Logger_setLevel", () => {
        const logMaskFatal = 1
        const logMaskError = 2
        const logMaskWarn = 4
        const logMaskInfo = 8
        const logMaskDebug = 16
        const logger: Logger = new Logger()

        expect((LogLevelOff & logMaskFatal) != 0).toStrictEqual(false)
        expect((LogLevelOff & logMaskError) != 0).toStrictEqual(false)
        expect((LogLevelOff & logMaskWarn) != 0).toStrictEqual(false)
        expect((LogLevelOff & logMaskInfo) != 0).toStrictEqual(false)
        expect((LogLevelOff & logMaskDebug) != 0).toStrictEqual(false)

        expect((LogLevelFatal & logMaskFatal) != 0).toStrictEqual(true)
        expect((LogLevelFatal & logMaskError) != 0).toStrictEqual(false)
        expect((LogLevelFatal & logMaskWarn) != 0).toStrictEqual(false)
        expect((LogLevelFatal & logMaskInfo) != 0).toStrictEqual(false)
        expect((LogLevelFatal & logMaskDebug) != 0).toStrictEqual(false)

        expect((LogLevelError & logMaskFatal) != 0).toStrictEqual(true)
        expect((LogLevelError & logMaskError) != 0).toStrictEqual(true)
        expect((LogLevelError & logMaskWarn) != 0).toStrictEqual(false)
        expect((LogLevelError & logMaskInfo) != 0).toStrictEqual(false)
        expect((LogLevelError & logMaskDebug) != 0).toStrictEqual(false)

        expect((LogLevelWarn & logMaskFatal) != 0).toStrictEqual(true)
        expect((LogLevelWarn & logMaskError) != 0).toStrictEqual(true)
        expect((LogLevelWarn & logMaskWarn) != 0).toStrictEqual(true)
        expect((LogLevelWarn & logMaskInfo) != 0).toStrictEqual(false)
        expect((LogLevelWarn & logMaskDebug) != 0).toStrictEqual(false)

        expect((LogLevelInfo & logMaskFatal) != 0).toStrictEqual(true)
        expect((LogLevelInfo & logMaskError) != 0).toStrictEqual(true)
        expect((LogLevelInfo & logMaskWarn) != 0).toStrictEqual(true)
        expect((LogLevelInfo & logMaskInfo) != 0).toStrictEqual(true)
        expect((LogLevelInfo & logMaskDebug) != 0).toStrictEqual(false)

        expect((LogLevelAll & logMaskFatal) != 0).toStrictEqual(true)
        expect((LogLevelAll & logMaskError) != 0).toStrictEqual(true)
        expect((LogLevelAll & logMaskWarn) != 0).toStrictEqual(true)
        expect((LogLevelAll & logMaskInfo) != 0).toStrictEqual(true)
        expect((LogLevelAll & logMaskDebug) != 0).toStrictEqual(true)

        expect(logger.setLevel(-1)).toStrictEqual(false)
        expect(logger["level"]).toStrictEqual(LogLevelAll)

        expect(logger.setLevel(32)).toStrictEqual(false)
        expect(logger["level"]).toStrictEqual(LogLevelAll)

        expect(logger.setLevel(0)).toStrictEqual(true)
        expect(logger["level"]).toStrictEqual(0)

        expect(logger.setLevel(31)).toStrictEqual(true)
        expect(logger["level"]).toStrictEqual(31)

        // test all level and logs
        const fnTestLogLevel = (level: number): number => {
            const logger1 = new Logger()
            logger1.setLevel(level)

            let ret = 0
            const subscription = logger1.subscribe()
            subscription.onDebug = (msg: string): void => {
                if (msg.includes("message") && msg.includes("Debug")) {
                    ret += logMaskDebug
                }
            }
            subscription.onInfo = (msg: string): void => {
                if (msg.includes("message") && msg.includes("Info")) {
                    ret += logMaskInfo
                }
            }
            subscription.onWarn = (msg: string): void => {
                if (msg.includes("message") && msg.includes("Warn")) {
                    ret += logMaskWarn
                }
            }
            subscription.onError = (msg: string): void => {
                if (msg.includes("message") && msg.includes("Error")) {
                    ret += logMaskError
                }
            }
            subscription.onFatal = (msg: string): void => {
                if (msg.includes("message") && msg.includes("Fatal")) {
                    ret += logMaskFatal
                }
            }
            logger1.debug("message")
            logger1.info("message")
            logger1.warn("message")
            logger1.error("message")
            logger1.fatal("message")
            subscription.close()
            return ret
        }

        expect(fnTestLogLevel(-1)).toStrictEqual(31)
        for (let i = 0; i < 32; i++) {
            expect(fnTestLogLevel(i)).toStrictEqual(i)
        }
        expect(fnTestLogLevel(32)).toStrictEqual(31)
    })

    test("Logger_subscribe", () => {
        const logger = new Logger()
        const subscription = logger.subscribe()
        expect(subscription["id"] > 0).toStrictEqual(true)
        expect(subscription["logger"] === logger).toStrictEqual(true)
        expect(logger["subscriptions"]["length"]).toStrictEqual(1)
        expect(subscription.close()).toStrictEqual(true)
        expect(subscription["id"]).toStrictEqual(0)
        expect(subscription["logger"]).toStrictEqual(null)
        expect(subscription.close()).toStrictEqual(false)

        // bug subscription
        logger.subscribe()
        const bugSubscription = new LogSubscription(234828, logger)
        expect(bugSubscription.close()).toStrictEqual(false)
    })

    test("Logger_log", () => {
        const logger = new Logger()
        logger.subscribe()

        logger.debug("")
        /* eslint-disable @typescript-eslint/no-explicit-any */
        expect((console.log as any).mock.calls.length).toStrictEqual(1)
        expect((console.log as any).mock.calls[0][0]).toContain("Debug")

        logger.info("")
        expect((console.log as any).mock.calls.length).toStrictEqual(2)
        expect((console.log as any).mock.calls[1][0]).toContain("Info")

        logger.warn("")
        expect((console.log as any).mock.calls.length).toStrictEqual(3)
        expect((console.log as any).mock.calls[2][0]).toContain("Warn")

        logger.error("")
        expect((console.log as any).mock.calls.length).toStrictEqual(4)
        expect((console.log as any).mock.calls[3][0]).toContain("Error")

        logger.fatal("")
        expect((console.log as any).mock.calls.length).toStrictEqual(5)
        expect((console.log as any).mock.calls[4][0]).toContain("Fatal")

        logger.log(33, " Debug: ", "message")
        expect((console.log as any).mock.calls.length).toStrictEqual(6)
        /* eslint-enable @typescript-eslint/no-explicit-any */
    })

    test("Logger_debug", () => {
        const logger = new Logger()
        logger.debug("message")
        /* eslint-disable @typescript-eslint/no-explicit-any */
        expect((console.log as any).mock.calls.length).toStrictEqual(1)
        expect(new RegExp(
            "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d{3}" +
            "\\+\\d{2}:\\d{2}(\\s)Debug:(\\s)message\n$",
        ).test((console.log as any).mock.calls[0][0])).toStrictEqual(true)
        /* eslint-enable @typescript-eslint/no-explicit-any */
    })

    test("Logger_info", () => {
        const logger = new Logger()
        logger.info("message")
        /* eslint-disable @typescript-eslint/no-explicit-any */
        expect((console.log as any).mock.calls.length).toStrictEqual(1)
        expect(new RegExp(
            "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d{3}" +
            "\\+\\d{2}:\\d{2}(\\s)Info:(\\s)message\n$",
        ).test((console.log as any).mock.calls[0][0])).toStrictEqual(true)
        /* eslint-enable @typescript-eslint/no-explicit-any */
    })

    test("Logger_warn", () => {
        const logger = new Logger()
        logger.warn("message")
        /* eslint-disable @typescript-eslint/no-explicit-any */
        expect((console.log as any).mock.calls.length).toStrictEqual(1)
        expect(new RegExp(
            "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d{3}" +
            "\\+\\d{2}:\\d{2}(\\s)Warn:(\\s)message\n$",
        ).test((console.log as any).mock.calls[0][0])).toStrictEqual(true)
        /* eslint-enable @typescript-eslint/no-explicit-any */
    })

    test("Logger_error", () => {
        const logger = new Logger()
        logger.error("message")
        /* eslint-disable @typescript-eslint/no-explicit-any */
        expect((console.log as any).mock.calls.length).toStrictEqual(1)
        expect(new RegExp(
            "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d{3}" +
            "\\+\\d{2}:\\d{2}(\\s)Error:(\\s)message\n$",
        ).test((console.log as any).mock.calls[0][0])).toStrictEqual(true)
        /* eslint-enable @typescript-eslint/no-explicit-any */
    })

    test("Logger_fatal", () => {
        const logger = new Logger()
        logger.fatal("message")
        /* eslint-disable @typescript-eslint/no-explicit-any */
        expect((console.log as any).mock.calls.length).toStrictEqual(1)
        expect(new RegExp(
            "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d{3}" +
            "\\+\\d{2}:\\d{2}(\\s)Fatal:(\\s)message\n$",
        ).test((console.log as any).mock.calls[0][0])).toStrictEqual(true)
        /* eslint-enable @typescript-eslint/no-explicit-any */
    })
})

