import {
    stringToUTF8,
    convertToIsoDateString,
    utf8ToString,
    convertOrdinalToString, getTimeNowMS, getProtocol, sleep, returnAsync
} from "./utils"

describe("utils tests", () => {
    test("stringToUTF8_utf8ToString", () => {
        expect(utf8ToString(new Uint8Array(stringToUTF8(
            "a",
        )))).toStrictEqual([
            "a",
            true,
        ])

        expect(utf8ToString(new Uint8Array(stringToUTF8(
            "hello world",
        )))).toStrictEqual([
            "hello world",
            true,
        ])

        expect(utf8ToString(new Uint8Array(stringToUTF8(
            "测试",
        )))).toStrictEqual([
            "测试",
            true,
        ])

        expect(utf8ToString(new Uint8Array(stringToUTF8(
            "😀中☘️文🀄️©️🌈🎩测𝌆试a\n\r\b",
        )))).toStrictEqual([
            "😀中☘️文🀄️©️🌈🎩测𝌆试a\n\r\b",
            true,
        ])
    })

    test("utf8ToString", () => {
        expect(utf8ToString(undefined as never))
            .toStrictEqual(["", false])

        expect(utf8ToString(null as never))
            .toStrictEqual(["", false])

        expect(utf8ToString(new Uint8Array([])))
            .toStrictEqual(["", false])

        // ok
        expect(utf8ToString(new Uint8Array([
            0x01, 0x7F, 0xC2, 0x80, 0xDF, 0xBF, 0xE0, 0xA0, 0x80, 0xED,
            0x9F, 0xBF, 0xEE, 0x80, 0x80, 0xEF, 0xBF, 0xBF, 0xF0, 0x90,
            0x80, 0x80, 0xF4, 0x8F, 0xBF, 0xBF,
        ]))).toStrictEqual([
            String.fromCodePoint(...[
                0x01, 0x7F, 0x80, 0x07FF, 0x0800, 0xD7FF, 0xE000, 0xFFFF,
                0x10000, 0x10FFFF,
            ]),
            true,
        ])

        expect(utf8ToString(
            new Uint8Array([
                0x01,
            ]),
            -1,
            1,
        )).toStrictEqual(["", false])
        expect(utf8ToString(
            new Uint8Array([
                0x01,
            ]),
            0,
            2,
        )).toStrictEqual(["", false])
        expect(utf8ToString(
            new Uint8Array([
                0x01, 0x02, 0x03,
            ]),
            2,
            1,
        )).toStrictEqual(["", false])

        expect(utf8ToString(new Uint8Array([
            0xC2,
        ]))).toStrictEqual(["", false])
        expect(utf8ToString(new Uint8Array([
            0xC2, 0x00,
        ]))).toStrictEqual(["", false])
        expect(utf8ToString(new Uint8Array([
            0xC1, 0x80,
        ]))).toStrictEqual(["", false])

        expect(utf8ToString(new Uint8Array([
            0xE0, 0xA0,
        ]))).toStrictEqual(["", false])
        expect(utf8ToString(new Uint8Array([
            0xE0, 0xA0, 0x00,
        ]))).toStrictEqual(["", false])
        expect(utf8ToString(new Uint8Array([
            0xE0, 0x80, 0x80,
        ]))).toStrictEqual(["", false])

        expect(utf8ToString(new Uint8Array([
            0xF0, 0x90, 0x80,
        ]))).toStrictEqual(["", false])
        expect(utf8ToString(new Uint8Array([
            0xF0, 0x90, 0x00, 0x80,
        ]))).toStrictEqual(["", false])
        expect(utf8ToString(new Uint8Array([
            0xF0, 0x80, 0x80, 0x80,
        ]))).toStrictEqual(["", false])

        expect(utf8ToString(new Uint8Array([
            0xF8, 0x8F, 0xBF, 0xBF,
        ]))).toStrictEqual(["", false])
        expect(utf8ToString(new Uint8Array([
            0xF8, 0x8F, 0xBF, 0xBF,
        ]))).toStrictEqual(["", false])
    })

    test("toIsoDateString", () => {
        const start = new Date("1901-01-01T00:00:00.000Z")

        for (let i = 0; i < 10000; i++) {
            expect(new Date(convertToIsoDateString(start))).toStrictEqual(start)
            start.setSeconds(start.getSeconds() + 23109922)
        }

        expect(convertToIsoDateString(null as never)).toStrictEqual("")
        expect(convertToIsoDateString(undefined as never)).toStrictEqual("")

        const date1 = new Date("2000-01-01T00:00:00.000Z")
        date1.setFullYear(date1.getFullYear() + 10000)
        expect(new Date(convertToIsoDateString(date1)).toISOString())
            .toStrictEqual("9999-01-01T00:00:00.000Z")

        const date2 = new Date("2009-11-01T10:00:00.009Z")
        date2.setFullYear(date2.getFullYear() - 2000)
        expect(new Date(convertToIsoDateString(date2)).toISOString())
            .toContain("0009-11-01")

        const date3 = new Date("2019-11-01T10:00:00.019Z")
        date3.setFullYear(date3.getFullYear() - 2000)
        expect(new Date(convertToIsoDateString(date3)).toISOString())
            .toContain("0019-11-01")

        const date4 = new Date("2319-11-01T10:00:00.319Z")
        date4.setFullYear(date4.getFullYear() - 2000)
        expect(new Date(convertToIsoDateString(date4)).toISOString())
            .toContain("0319-11-01")
    })

    test("convertOrdinalToString", () => {
        expect(convertOrdinalToString(null as never)).toStrictEqual("")
        expect(convertOrdinalToString(undefined as never)).toStrictEqual("")
        expect(convertOrdinalToString(1.3)).toStrictEqual("")
        expect(convertOrdinalToString(-1)).toStrictEqual("")
        expect(convertOrdinalToString(0)).toStrictEqual("")
        expect(convertOrdinalToString(1)).toStrictEqual("1st")
        expect(convertOrdinalToString(2)).toStrictEqual("2nd")
        expect(convertOrdinalToString(3)).toStrictEqual("3rd")
        expect(convertOrdinalToString(4)).toStrictEqual("4th")
    })

    test("getTimeNowMS", () => {
        const nowMS = new Date().getTime()
        expect(Math.abs(nowMS - getTimeNowMS()) < 100)
    })

    test("getProtocol", () => {
        expect(getProtocol(null as never)).toStrictEqual("")
        expect(getProtocol(undefined as never)).toStrictEqual("")
        expect(getProtocol("hello")).toStrictEqual("")
        expect(getProtocol("http://127.0.0.1")).toStrictEqual("http")
        expect(getProtocol("https://127.0.0.1")).toStrictEqual("https")
        expect(getProtocol("ws://127.0.0.1:8080")).toStrictEqual("ws")
        expect(getProtocol("wss://127.0.0.1")).toStrictEqual("wss")
        expect(getProtocol("tcp://127.0.0.1")).toStrictEqual("tcp")
        expect(getProtocol("udp://127.0.0.1:8080")).toStrictEqual("udp")
    })

    test("sleep", async () => {
        const start = getTimeNowMS()
        expect(await sleep(300)).toStrictEqual(true)
        expect(Math.abs(getTimeNowMS() - start - 300) < 200).toStrictEqual(true)
    })

    test("returnAsync", async () => {
        const promise = returnAsync(12345)
        expect(await promise).toStrictEqual(12345)
    })
})

