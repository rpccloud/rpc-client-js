import {Ieee754} from "./ieee754"

describe("ieee754 tests", () => {
    test("Ieee754_read_write", () => {
        const data: Uint8Array = new Uint8Array(8)
        //  random number
        for (let i = 0; i < 1000; i++) {
            for (let j = 36; j < 58; j++) {
                const v: number = Math.random()
                Ieee754.write(data, v, 0, true, j, 8)
                expect(Ieee754.read(data, 0, true, j, 8))
                    .toBeCloseTo(v)

                Ieee754.write(data, v, 0, false, j, 8)
                expect(Ieee754.read(data, 0, false, j, 8))
                    .toBeCloseTo(v)
            }
        }
        // boundary numbers
        for (const v of [
            NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY,
            Number.EPSILON, 0, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER,
            Number.MAX_VALUE, Number.MIN_VALUE, Infinity,
        ]) {
            Ieee754.write(data, v, 0, true, 52, 8)
            expect(Ieee754.read(data, 0, true, 52, 8))
                .toStrictEqual(v)
            Ieee754.write(data, v, 0, false, 52, 8)
            expect(Ieee754.read(data, 0, false, 52, 8))
                .toStrictEqual(v)
        }
        // exponent bits overflow
        const v1 = 2341325345.23423
        Ieee754.write(data, v1, 0, true, 62, 8)
        expect(Ieee754.read(data, 0, true, 62, 8))
            .toStrictEqual(Infinity)
        // m_len is 23
        const v2 = 3.1415926
        Ieee754.write(data, v2, 0, true, 23, 8)
        expect(Ieee754.read(data, 0, true, 23, 8))
            .toBeCloseTo(v2)
    })
})
