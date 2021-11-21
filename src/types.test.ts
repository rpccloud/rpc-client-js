import {
    RPCFloat64,
    RPCInt64,
    RPCUint64,
    toRPCFloat64,
    toRPCInt64,
    toRPCMap,
    toRPCUint64,
} from "./types";

describe("RPCInt64 tests", () => {
    test("toRPCInt64", () => {
        expect(toRPCInt64(5)).toStrictEqual(new RPCInt64(5));
    });

    test("RPCInt64.fromBytes", () => {
        const v1: RPCInt64 = RPCInt64.fromBytes(
            new Uint8Array([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0xe0, 0x7f])
        );
        expect(v1.toNumber()).toStrictEqual(-9007199254740991);

        const v2: RPCInt64 = RPCInt64.fromBytes(
            new Uint8Array([0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0xe0, 0x7f])
        );
        expect(v2.toNumber()).toStrictEqual(-9007199254740990);

        const v3: RPCInt64 = RPCInt64.fromBytes(
            new Uint8Array([0xff, 0xff, 0xff, 0x7f, 0xff, 0xff, 0xff, 0x7f])
        );
        expect(v3.toNumber()).toStrictEqual(-2147483649);

        const v4: RPCInt64 = RPCInt64.fromBytes(
            new Uint8Array([0x00, 0x00, 0x00, 0x80, 0x00, 0x00, 0x00, 0x80])
        );
        expect(v4.toNumber()).toStrictEqual(2147483648);

        const v5: RPCInt64 = RPCInt64.fromBytes(
            new Uint8Array([0xfe, 0xff, 0xff, 0xff, 0xff, 0xff, 0x1f, 0x80])
        );
        expect(v5.toNumber()).toStrictEqual(9007199254740990);

        const v6: RPCInt64 = RPCInt64.fromBytes(
            new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x1f, 0x80])
        );
        expect(v6.toNumber()).toStrictEqual(9007199254740991);

        const notSafetyInt1: RPCInt64 = RPCInt64.fromBytes(
            new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
        );
        expect(isNaN(notSafetyInt1.toNumber())).toStrictEqual(true);
        expect(notSafetyInt1.getBytes()).toStrictEqual(
            new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
        );

        const notSafetyInt2: RPCInt64 = RPCInt64.fromBytes(
            new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xe0, 0x7f])
        );
        expect(isNaN(notSafetyInt2.toNumber())).toStrictEqual(true);
        expect(notSafetyInt2.getBytes()).toStrictEqual(
            new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xe0, 0x7f])
        );

        const notSafetyInt3: RPCInt64 = RPCInt64.fromBytes(
            new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x20, 0x80])
        );
        expect(isNaN(notSafetyInt3.toNumber())).toStrictEqual(true);
        expect(notSafetyInt3.getBytes()).toStrictEqual(
            new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x20, 0x80])
        );

        const notSafetyInt4: RPCInt64 = RPCInt64.fromBytes(
            new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff])
        );
        expect(isNaN(notSafetyInt4.toNumber())).toStrictEqual(true);
        expect(notSafetyInt4.getBytes()).toStrictEqual(
            new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff])
        );

        const bugInt: RPCInt64 = RPCInt64.fromBytes(
            new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff])
        );
        expect(isNaN(bugInt.toNumber())).toStrictEqual(true);
        expect(bugInt.getBytes()).toStrictEqual(null);
    });
});

describe("RPCUint64 tests", () => {
    test("toRPCUint64", () => {
        expect(toRPCUint64(5)).toStrictEqual(new RPCUint64(5));
    });

    test("RPCUint64.fromBytes", () => {
        const v1: RPCUint64 = RPCUint64.fromBytes(
            new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00])
        );
        expect(v1.toNumber()).toStrictEqual(4294967296);

        const v2: RPCUint64 = RPCUint64.fromBytes(
            new Uint8Array([0xfe, 0xff, 0xff, 0xff, 0xff, 0xff, 0x1f, 0x00])
        );
        expect(v2.toNumber()).toStrictEqual(9007199254740990);

        const v3: RPCUint64 = RPCUint64.fromBytes(
            new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x1f, 0x00])
        );
        expect(v3.toNumber()).toStrictEqual(9007199254740991);

        const notSafetyUint1: RPCUint64 = RPCUint64.fromBytes(
            new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x20, 0x00])
        );
        expect(isNaN(notSafetyUint1.toNumber())).toStrictEqual(true);
        expect(notSafetyUint1.getBytes()).toStrictEqual(
            new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x20, 0x00])
        );

        const notSafetyUint2: RPCUint64 = RPCUint64.fromBytes(
            new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff])
        );
        expect(isNaN(notSafetyUint2.toNumber())).toStrictEqual(true);
        expect(notSafetyUint2.getBytes()).toStrictEqual(
            new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff])
        );

        const bugUint: RPCUint64 = RPCUint64.fromBytes(
            new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff])
        );
        expect(isNaN(bugUint.toNumber())).toStrictEqual(true);
        expect(bugUint.getBytes()).toStrictEqual(null);
    });
});

describe("RPCFloat64 tests", () => {
    test("toRPCFloat64", () => {
        expect(toRPCFloat64(5.1)).toStrictEqual(new RPCFloat64(5.1));
    });

    test("new RPCFloat64", () => {
        expect(new RPCFloat64(5.1)).toStrictEqual(toRPCFloat64(5.1));
    });

    test("toNumber", () => {
        expect(new RPCFloat64(5.1).toNumber()).toStrictEqual(5.1);
    });
});

describe("RPCMap tests", () => {
    const now = new Date();

    /* eslint-disable @typescript-eslint/no-explicit-any */
    test("toRPCMap", () => {
        expect(toRPCMap({ 1: 12, 2: 12 })).toStrictEqual(
            new Map<string, any>([
                ["1", 12],
                ["2", 12],
            ])
        );
    });

    test("toRPCMap", () => {
        expect(toRPCMap({ 1: 12, 2: now })).toStrictEqual(
            new Map<string, any>([
                ["1", 12],
                ["2", now],
            ])
        );
    });

    test("toRPCMap", () => {
        expect(toRPCMap(undefined)).toStrictEqual(new Map<string, any>([]));
    });

    test("toRPCMap", () => {
        expect(toRPCMap(null)).toStrictEqual(new Map<string, any>([]));
    });

    test("toRPCMap", () => {
        expect(toRPCMap(12)).toStrictEqual(new Map<string, any>([]));
    });

    test("toRPCMap", () => {
        expect(toRPCMap(true)).toStrictEqual(new Map<string, any>([]));
    });

    test("toRPCMap", () => {
        expect(toRPCMap(toRPCInt64(12))).toStrictEqual(
            new Map<string, any>([
                ["bytes", null],
                ["value", 12],
            ])
        );
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */
});
