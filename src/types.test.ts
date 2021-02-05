import { RPCInt64, RPCUint64 } from "./types"

describe("RPCInt64 tests", () => {
    test("RPCInt64_fromBytes", () => {
        const v1: RPCInt64 = RPCInt64.fromBytes(new Uint8Array([
            0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0xE0, 0x7F,
        ]))
        expect(v1.toNumber()).toBe(-9007199254740991)

        const v2: RPCInt64 = RPCInt64.fromBytes(new Uint8Array([
            0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0xE0, 0x7F,
        ]))
        expect(v2.toNumber()).toBe(-9007199254740990)

        const v3: RPCInt64 = RPCInt64.fromBytes(new Uint8Array([
            0xFF, 0xFF, 0xFF, 0x7F, 0xFF, 0xFF, 0xFF, 0x7F,
        ]))
        expect(v3.toNumber()).toBe(-2147483649)

        const v4: RPCInt64 = RPCInt64.fromBytes(new Uint8Array([
            0x00, 0x00, 0x00, 0x80, 0x00, 0x00, 0x00, 0x80,
        ]))
        expect(v4.toNumber()).toBe(2147483648)

        const v5: RPCInt64 = RPCInt64.fromBytes(new Uint8Array([
            0xFE, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x1F, 0x80,
        ]))
        expect(v5.toNumber()).toBe(9007199254740990)

        const v6: RPCInt64 = RPCInt64.fromBytes(new Uint8Array([
            0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x1F, 0x80,
        ]))
        expect(v6.toNumber()).toBe(9007199254740991)

        const notSafetyInt1: RPCInt64 = RPCInt64.fromBytes(
            new Uint8Array([
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            ]))
        expect(isNaN(notSafetyInt1.toNumber())).toBe(true)
        expect(notSafetyInt1.getBytes())
            .toStrictEqual(new Uint8Array([
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            ]))

        const notSafetyInt2: RPCInt64 = RPCInt64.fromBytes(
            new Uint8Array([
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xE0, 0x7F,
            ]))
        expect(isNaN(notSafetyInt2.toNumber())).toBe(true)
        expect(notSafetyInt2.getBytes())
            .toStrictEqual(new Uint8Array([
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xE0, 0x7F,
            ]))

        const notSafetyInt3: RPCInt64 = RPCInt64.fromBytes(
            new Uint8Array([
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x20, 0x80,
            ]))
        expect(isNaN(notSafetyInt3.toNumber())).toBe(true)
        expect(notSafetyInt3.getBytes())
            .toStrictEqual(new Uint8Array([
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x20, 0x80,
            ]))

        const notSafetyInt4: RPCInt64 = RPCInt64.fromBytes(
            new Uint8Array([
                0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
            ]))
        expect(isNaN(notSafetyInt4.toNumber())).toBe(true)
        expect(notSafetyInt4.getBytes())
            .toStrictEqual(new Uint8Array([
                0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
            ]))

        const bugInt: RPCInt64 = RPCInt64.fromBytes(
            new Uint8Array([
                0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
            ]))
        expect(isNaN(bugInt.toNumber())).toBe(true)
        expect(bugInt.getBytes()).toStrictEqual(null)
    })
})

describe("RPCUint64 tests", () => {
    test("RPCUint64_fromBytes", () => {
        const v1: RPCUint64 = RPCUint64.fromBytes(new Uint8Array([
            0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,
        ]))
        expect(v1.toNumber()).toBe(4294967296)

        const v2: RPCUint64 = RPCUint64.fromBytes(new Uint8Array([
            0xFE, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x1F, 0x00,
        ]))
        expect(v2.toNumber()).toBe(9007199254740990)

        const v3: RPCUint64 = RPCUint64.fromBytes(new Uint8Array([
            0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x1F, 0x00,
        ]))
        expect(v3.toNumber()).toBe(9007199254740991)

        const notSafetyUint1: RPCUint64 = RPCUint64.fromBytes(
            new Uint8Array([
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x20, 0x00,
            ]))
        expect(isNaN(notSafetyUint1.toNumber())).toBe(true)
        expect(notSafetyUint1.getBytes())
            .toStrictEqual(new Uint8Array([
                0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x20, 0x00,
            ]))

        const notSafetyUint2: RPCUint64 = RPCUint64.fromBytes(
            new Uint8Array([
                0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
            ]))
        expect(isNaN(notSafetyUint2.toNumber())).toBe(true)
        expect(notSafetyUint2.getBytes())
            .toStrictEqual(new Uint8Array([
                0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
            ]))

        const bugUint: RPCUint64 = RPCUint64.fromBytes(
            new Uint8Array([
                0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
            ]))
        expect(isNaN(bugUint.toNumber())).toBe(true)
        expect(bugUint.getBytes()).toStrictEqual(null)
    })
})
