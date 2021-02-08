import {
    RPCAny, RPCArray, RPCBytes, RPCFloat64,
    RPCInt64, RPCMap, RPCString,
    RPCUint64,
    toRPCFloat64,
    toRPCInt64,
    toRPCUint64
} from "./types"
import {RPCStream} from "./stream"

/* eslint-disable @typescript-eslint/no-explicit-any */

function getTestDepthArray(depth: number): [RPCAny, string] {
    if (depth <= 1) {
        return [true, ""]
    }

    const ret = getTestDepthArray(depth - 1)
    const arr = new Array<RPCAny>()
    arr.push(ret[0])
    return [arr, "[0]" + ret[1]]
}

function getTestDepthMap(depth: number): [RPCAny, string] {
    if (depth <= 1) {
        return [true, ""]
    }

    const ret = getTestDepthMap(depth - 1)
    const map = new Map<string, RPCAny>()
    map.set("a", ret[0])
    return [map, "[\"a\"]" + ret[1]]
}

const streamTestSuccessCollections = new Map([
    ["null", [
        [null, new Uint8Array([0x01])],
    ]],
    ["bool", [
        [true, new Uint8Array([0x02])],
        [false, new Uint8Array([0x03])],
    ]],
    ["float64", [
        [toRPCFloat64(0), new Uint8Array([0x04])],
        [toRPCFloat64(100), new Uint8Array([
            0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x59, 0x40,
        ])],
        [toRPCFloat64(3.1415926), new Uint8Array([
            0x05, 0x4A, 0xD8, 0x12, 0x4D, 0xFB, 0x21, 0x09, 0x40,
        ])],
        [toRPCFloat64(-3.1415926), new Uint8Array([
            0x05, 0x4A, 0xD8, 0x12, 0x4D, 0xFB, 0x21, 0x09, 0xC0,
        ])],
        [toRPCFloat64(-100), new Uint8Array([
            0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x59, 0xC0,
        ])],
    ]],
    ["int64", [
        // -9223372036854775808
        [RPCInt64.fromBytes(new Uint8Array([
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        ])), new Uint8Array([
            0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        ])],
        // -9007199254740992
        [RPCInt64.fromBytes(new Uint8Array([
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xE0, 0x7F,
        ])), new Uint8Array([
            0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xE0, 0x7F,
        ])],
        [toRPCInt64(-9007199254740991), new Uint8Array([
            0x08, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0xe0, 0x7F,
        ])],
        [toRPCInt64(-9007199254740990), new Uint8Array([
            0x08, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0xE0, 0x7F,
        ])],
        [toRPCInt64(-2147483649), new Uint8Array([
            0x08, 0xFF, 0xFF, 0xFF, 0x7F, 0xFF, 0xFF, 0xFF, 0x7F,
        ])],
        [toRPCInt64(-2147483648), new Uint8Array([
            0x07, 0x00, 0x00, 0x00, 0x00,
        ])],
        [toRPCInt64(-32769), new Uint8Array([
            0x07, 0xFF, 0x7F, 0xFF, 0x7F,
        ])],
        [toRPCInt64(-32768), new Uint8Array([0x06, 0x00, 0x00])],
        [toRPCInt64(-8), new Uint8Array([0x06, 0xF8, 0x7F])],
        [toRPCInt64(-7), new Uint8Array([0x0E])],
        [toRPCInt64(-1), new Uint8Array([0x14])],
        [toRPCInt64(0), new Uint8Array([0x15])],
        [toRPCInt64(1), new Uint8Array([0x16])],
        [toRPCInt64(32), new Uint8Array([0x35])],
        [toRPCInt64(33), new Uint8Array([0x06, 0x21, 0x80])],
        [toRPCInt64(32767), new Uint8Array([0x06, 0xFF, 0xFF])],

        [toRPCInt64(32768), new Uint8Array([
            0x07, 0x00, 0x80, 0x00, 0x80
        ])],
        [toRPCInt64(2147483647), new Uint8Array([
            0x07, 0xFF, 0xFF, 0xFF, 0xFF
        ])],
        [toRPCInt64(2147483648), new Uint8Array([
            0x08, 0x00, 0x00, 0x00, 0x80, 0x00, 0x00, 0x00, 0x80,
        ])],
        [toRPCInt64(9007199254740990), new Uint8Array([
            0x08, 0xFE, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x1F, 0x80,
        ])],
        [toRPCInt64(9007199254740991), new Uint8Array([
            0x08, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x1F, 0x80,
        ])],
        // 9007199254740992
        [RPCInt64.fromBytes(new Uint8Array([
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x20, 0x80,
        ])), new Uint8Array([
            0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x20, 0x80,
        ])],
        // 9223372036854775807
        [RPCInt64.fromBytes(new Uint8Array([
            0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        ])), new Uint8Array([
            0x08, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        ])],
    ]],
    ["uint64", [
        [toRPCUint64(0), new Uint8Array([0x36])],
        [toRPCUint64(9), new Uint8Array([0x3F])],
        [toRPCUint64(10), new Uint8Array([0x09, 0x0A, 0x00])],
        [toRPCUint64(65535), new Uint8Array([0x09, 0xFF, 0xFF])],
        [toRPCUint64(65536), new Uint8Array([
            0x0A, 0x00, 0x00, 0x01, 0x00,
        ])],
        [toRPCUint64(4294967295), new Uint8Array([
            0x0A, 0xFF, 0xFF, 0xFF, 0xFF,
        ])],
        [toRPCUint64(4294967296), new Uint8Array([
            0x0B, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,
        ])],
        [toRPCUint64(9007199254740990), new Uint8Array([
            0x0B, 0xFE, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x1F, 0x00,
        ])],
        [toRPCUint64(9007199254740991), new Uint8Array([
            0x0B, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0x1F, 0x00,
        ])],
        // 9007199254740992
        [RPCUint64.fromBytes(new Uint8Array([
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x20, 0x00,
        ])), new Uint8Array([
            0x0B, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x20, 0x00,
        ])],
        // 18446744073709551615
        [RPCUint64.fromBytes(new Uint8Array([
            0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        ])), new Uint8Array([
            0x0B, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        ])],
    ]],
    ["string", [
        ["", new Uint8Array([0x80])],
        ["a", new Uint8Array([0x81, 0x61, 0x00])],
        ["😀☘️🀄️©️🌈🎩", new Uint8Array([
            0x9E, 0xF0, 0x9F, 0x98, 0x80, 0xE2, 0x98, 0x98, 0xEF, 0xB8,
            0x8F, 0xF0, 0x9F, 0x80, 0x84, 0xEF, 0xB8, 0x8F, 0xC2, 0xA9,
            0xEF, 0xB8, 0x8F, 0xF0, 0x9F, 0x8C, 0x88, 0xF0, 0x9F, 0x8E,
            0xA9, 0x00,
        ])],
        ["😀中☘️文🀄️©️🌈🎩测试a\n\r\b", new Uint8Array([
            0xAE, 0xF0, 0x9F, 0x98, 0x80, 0xE4, 0xB8, 0xAD, 0xE2, 0x98,
            0x98, 0xEF, 0xB8, 0x8F, 0xE6, 0x96, 0x87, 0xF0, 0x9F, 0x80,
            0x84, 0xEF, 0xB8, 0x8F, 0xC2, 0xA9, 0xEF, 0xB8, 0x8F, 0xF0,
            0x9F, 0x8C, 0x88, 0xF0, 0x9F, 0x8E, 0xA9, 0xE6, 0xB5, 0x8B,
            0xE8, 0xAF, 0x95, 0x61, 0x0A, 0x0D, 0x08, 0x00,
        ])],
        [
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            new Uint8Array([
                0xBF, 0x45, 0x00, 0x00, 0x00, 0x61, 0x61, 0x61, 0x61, 0x61,
                0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x00,
            ]),
        ],
        ["😀☘️🀄️©️🌈🎩😛👩👩👦👨👩👦👦👼🗣👑👚👹👺🌳🍊", new Uint8Array([
            0xBF, 0x64, 0x00, 0x00, 0x00, 0xF0, 0x9F, 0x98, 0x80, 0xE2,
            0x98, 0x98, 0xEF, 0xB8, 0x8F, 0xF0, 0x9F, 0x80, 0x84, 0xEF,
            0xB8, 0x8F, 0xC2, 0xA9, 0xEF, 0xB8, 0x8F, 0xF0, 0x9F, 0x8C,
            0x88, 0xF0, 0x9F, 0x8E, 0xA9, 0xF0, 0x9F, 0x98, 0x9B, 0xF0,
            0x9F, 0x91, 0xA9, 0xF0, 0x9F, 0x91, 0xA9, 0xF0, 0x9F, 0x91,
            0xA6, 0xF0, 0x9F, 0x91, 0xA8, 0xF0, 0x9F, 0x91, 0xA9, 0xF0,
            0x9F, 0x91, 0xA6, 0xF0, 0x9F, 0x91, 0xA6, 0xF0, 0x9F, 0x91,
            0xBC, 0xF0, 0x9F, 0x97, 0xA3, 0xF0, 0x9F, 0x91, 0x91, 0xF0,
            0x9F, 0x91, 0x9A, 0xF0, 0x9F, 0x91, 0xB9, 0xF0, 0x9F, 0x91,
            0xBA, 0xF0, 0x9F, 0x8C, 0xB3, 0xF0, 0x9F, 0x8D, 0x8A, 0x00,
        ])],
    ]],
    ["bytes", [
        [new Uint8Array([]), new Uint8Array([0xC0])],
        [new Uint8Array([0xDA]), new Uint8Array([0xC1, 0xDA])],
        [new Uint8Array([
            0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
            0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
            0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
            0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
            0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
            0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
            0x61, 0x61, 0x61,
        ]), new Uint8Array([
            0xFF, 0x44, 0x00, 0x00, 0x00, 0x61, 0x61, 0x61, 0x61, 0x61,
            0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
            0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
            0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
            0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
            0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
            0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
        ])],
    ]],
    ["array", [
        [[], new Uint8Array([64])],
        [[true], new Uint8Array([65, 6, 0, 0, 0, 2])],
        [["", true], new Uint8Array([66, 7, 0, 0, 0, 0x80, 0x02])],
        [["a", true], new Uint8Array([
            66, 9, 0, 0, 0, 0x81, 0x61, 0x00, 0x02,
        ])],
        [[true, false], new Uint8Array([66, 7, 0, 0, 0, 2, 3])],
        [[
            true, true, true, true, true, true, true, true, true, true,
            true, true, true, true, true, true, true, true, true, true,
            true, true, true, true, true, true, true, true, true, true,
        ], new Uint8Array([
            94, 35, 0, 0, 0, 2, 2, 2, 2, 2,
            2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
            2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
            2, 2, 2, 2, 2,
        ])],
        [[
            true, true, true, true, true, true, true, true, true, true,
            true, true, true, true, true, true, true, true, true, true,
            true, true, true, true, true, true, true, true, true, true,
            true,
        ], new Uint8Array([
            95, 40, 0, 0, 0, 31, 0, 0, 0, 2,
            2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
            2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
            2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
        ])],
        [[
            true, true, true, true, true, true, true, true, true, true,
            true, true, true, true, true, true, true, true, true, true,
            true, true, true, true, true, true, true, true, true, true,
            true, true,
        ], new Uint8Array([
            95, 41, 0, 0, 0, 32, 0, 0, 0, 2,
            2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
            2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
            2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
            2,
        ])],
    ]],
    ["map", [
        [new Map([]), new Uint8Array([0x60])],
        [new Map([
            ["1", true],
        ]), new Uint8Array([
            0x61, 0x09, 0x00, 0x00, 0x00, 0x81, 0x31, 0x00, 0x02,
        ])],
        [new Map([
            ["1", ""],
        ]), new Uint8Array([
            0x61, 0x09, 0x00, 0x00, 0x00, 0x81, 0x31, 0x00, 0x80,
        ])],
        [new Map([
            ["1", "a"],
        ]), new Uint8Array([
            0x61, 0x0B, 0x00, 0x00, 0x00, 0x81, 0x31, 0x00, 0x81, 0x61, 0x00,
        ])],
        [new Map([
            ["1", true], ["2", true], ["3", true], ["4", true],
            ["5", true], ["6", true], ["7", true], ["8", true],
            ["9", true], ["a", true], ["b", true], ["c", true],
            ["d", true], ["e", true], ["f", true], ["g", true],
            ["h", true], ["i", true], ["j", true], ["k", true],
            ["l", true], ["m", true], ["n", true], ["o", true],
            ["p", true], ["q", true], ["r", true], ["s", true],
            ["t", true], ["u", true],
        ]), new Uint8Array([
            0x7E, 0x7D, 0x00, 0x00, 0x00, 0x81, 0x31, 0x00, 0x02, 0x81,
            0x32, 0x00, 0x02, 0x81, 0x33, 0x00, 0x02, 0x81, 0x34, 0x00,
            0x02, 0x81, 0x35, 0x00, 0x02, 0x81, 0x36, 0x00, 0x02, 0x81,
            0x37, 0x00, 0x02, 0x81, 0x38, 0x00, 0x02, 0x81, 0x39, 0x00,
            0x02, 0x81, 0x61, 0x00, 0x02, 0x81, 0x62, 0x00, 0x02, 0x81,
            0x63, 0x00, 0x02, 0x81, 0x64, 0x00, 0x02, 0x81, 0x65, 0x00,
            0x02, 0x81, 0x66, 0x00, 0x02, 0x81, 0x67, 0x00, 0x02, 0x81,
            0x68, 0x00, 0x02, 0x81, 0x69, 0x00, 0x02, 0x81, 0x6A, 0x00,
            0x02, 0x81, 0x6B, 0x00, 0x02, 0x81, 0x6C, 0x00, 0x02, 0x81,
            0x6D, 0x00, 0x02, 0x81, 0x6E, 0x00, 0x02, 0x81, 0x6F, 0x00,
            0x02, 0x81, 0x70, 0x00, 0x02, 0x81, 0x71, 0x00, 0x02, 0x81,
            0x72, 0x00, 0x02, 0x81, 0x73, 0x00, 0x02, 0x81, 0x74, 0x00,
            0x02, 0x81, 0x75, 0x00, 0x02,
        ])],
        [new Map([
            ["1", true], ["2", true], ["3", true], ["4", true],
            ["5", true], ["6", true], ["7", true], ["8", true],
            ["9", true], ["a", true], ["b", true], ["c", true],
            ["d", true], ["e", true], ["f", true], ["g", true],
            ["h", true], ["i", true], ["j", true], ["k", true],
            ["l", true], ["m", true], ["n", true], ["o", true],
            ["p", true], ["q", true], ["r", true], ["s", true],
            ["t", true], ["u", true], ["v", true],
        ]), new Uint8Array([
            0x7F, 0x85, 0x00, 0x00, 0x00, 0x1F, 0x00, 0x00, 0x00, 0x81,
            0x31, 0x00, 0x02, 0x81, 0x32, 0x00, 0x02, 0x81, 0x33, 0x00,
            0x02, 0x81, 0x34, 0x00, 0x02, 0x81, 0x35, 0x00, 0x02, 0x81,
            0x36, 0x00, 0x02, 0x81, 0x37, 0x00, 0x02, 0x81, 0x38, 0x00,
            0x02, 0x81, 0x39, 0x00, 0x02, 0x81, 0x61, 0x00, 0x02, 0x81,
            0x62, 0x00, 0x02, 0x81, 0x63, 0x00, 0x02, 0x81, 0x64, 0x00,
            0x02, 0x81, 0x65, 0x00, 0x02, 0x81, 0x66, 0x00, 0x02, 0x81,
            0x67, 0x00, 0x02, 0x81, 0x68, 0x00, 0x02, 0x81, 0x69, 0x00,
            0x02, 0x81, 0x6A, 0x00, 0x02, 0x81, 0x6B, 0x00, 0x02, 0x81,
            0x6C, 0x00, 0x02, 0x81, 0x6D, 0x00, 0x02, 0x81, 0x6E, 0x00,
            0x02, 0x81, 0x6F, 0x00, 0x02, 0x81, 0x70, 0x00, 0x02, 0x81,
            0x71, 0x00, 0x02, 0x81, 0x72, 0x00, 0x02, 0x81, 0x73, 0x00,
            0x02, 0x81, 0x74, 0x00, 0x02, 0x81, 0x75, 0x00, 0x02, 0x81,
            0x76, 0x00, 0x02,
        ])],
        [new Map([
            ["1", true], ["2", true], ["3", true], ["4", true],
            ["5", true], ["6", true], ["7", true], ["8", true],
            ["9", true], ["a", true], ["b", true], ["c", true],
            ["d", true], ["e", true], ["f", true], ["g", true],
            ["h", true], ["i", true], ["j", true], ["k", true],
            ["l", true], ["m", true], ["n", true], ["o", true],
            ["p", true], ["q", true], ["r", true], ["s", true],
            ["t", true], ["u", true], ["v", true], ["w", true],
        ]), new Uint8Array([
            0x7F, 0x89, 0x00, 0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 0x81,
            0x31, 0x00, 0x02, 0x81, 0x32, 0x00, 0x02, 0x81, 0x33, 0x00,
            0x02, 0x81, 0x34, 0x00, 0x02, 0x81, 0x35, 0x00, 0x02, 0x81,
            0x36, 0x00, 0x02, 0x81, 0x37, 0x00, 0x02, 0x81, 0x38, 0x00,
            0x02, 0x81, 0x39, 0x00, 0x02, 0x81, 0x61, 0x00, 0x02, 0x81,
            0x62, 0x00, 0x02, 0x81, 0x63, 0x00, 0x02, 0x81, 0x64, 0x00,
            0x02, 0x81, 0x65, 0x00, 0x02, 0x81, 0x66, 0x00, 0x02, 0x81,
            0x67, 0x00, 0x02, 0x81, 0x68, 0x00, 0x02, 0x81, 0x69, 0x00,
            0x02, 0x81, 0x6A, 0x00, 0x02, 0x81, 0x6B, 0x00, 0x02, 0x81,
            0x6C, 0x00, 0x02, 0x81, 0x6D, 0x00, 0x02, 0x81, 0x6E, 0x00,
            0x02, 0x81, 0x6F, 0x00, 0x02, 0x81, 0x70, 0x00, 0x02, 0x81,
            0x71, 0x00, 0x02, 0x81, 0x72, 0x00, 0x02, 0x81, 0x73, 0x00,
            0x02, 0x81, 0x74, 0x00, 0x02, 0x81, 0x75, 0x00, 0x02, 0x81,
            0x76, 0x00, 0x02, 0x81, 0x77, 0x00, 0x02,
        ])],
    ]]
])

const streamTestWriteCollections = new Map([
    ["array", [
        [
            [true, true, true, new Date(), true],
            "[3] type is not supported",
        ],
        [
            getTestDepthArray(65)[0],
            getTestDepthArray(65)[1] + " overflows",
        ],
        [
            getTestDepthArray(64)[0],
            RPCStream.StreamWriteOK,
        ]
    ]],
    ["map", [
        [
            new Map<string, RPCAny>([
                ["0", toRPCInt64(0)], ["1", new Date() as never],
            ]),
            "[\"1\"] type is not supported",
        ],
        [
            getTestDepthMap(65)[0],
            getTestDepthMap(65)[1] + " overflows",
        ],
        [
            getTestDepthMap(64)[0],
            RPCStream.StreamWriteOK,
        ]
    ]],
    ["value", [
        [null, RPCStream.StreamWriteOK],
        [true, RPCStream.StreamWriteOK],
        [toRPCInt64(0), RPCStream.StreamWriteOK],
        [toRPCUint64(0), RPCStream.StreamWriteOK],
        [toRPCFloat64(0), RPCStream.StreamWriteOK],
        ["", RPCStream.StreamWriteOK],
        [new Uint8Array(), RPCStream.StreamWriteOK],
        [new Map<string, RPCAny>(), RPCStream.StreamWriteOK],
        [
            getTestDepthArray(65)[0],
            "value" + getTestDepthArray(65)[1] + " overflows",
        ],
        [
            new Map<string, RPCAny>([
                ["0", toRPCInt64(0)], ["1", new Date() as never],
            ]),
            "value[\"1\"] type is not supported",
        ],
        [
            getTestDepthMap(65)[0],
            "value" + getTestDepthMap(65)[1] + " overflows",
        ],
    ]]
])

console.log(streamTestSuccessCollections !== streamTestWriteCollections)

describe("RPCStream tests", () => {
    test("RPCStream constant", () => {
        expect(RPCStream["streamVersion"]).toStrictEqual(1)
        expect(RPCStream["streamPosVersion"]).toStrictEqual(0)
        expect(RPCStream["streamPosLength"]).toStrictEqual(4)
        expect(RPCStream["streamPosCheckSum"]).toStrictEqual(8)
        expect(RPCStream["streamPosCallbackID"]).toStrictEqual(38)
        expect(RPCStream["streamPosBody"]).toStrictEqual(48)

        expect(RPCStream["StreamWriteOK"]).toStrictEqual("")
        expect(RPCStream["StreamWriteOverflow"]).toStrictEqual(" overflows")
        expect(RPCStream["StreamWriteUnsupportedValue"])
            .toStrictEqual(" is not support")

        expect(RPCStream.ControlStreamConnectRequest).toStrictEqual(1)
        expect(RPCStream.ControlStreamConnectResponse).toStrictEqual(2)
        expect(RPCStream.ControlStreamPing).toStrictEqual(3)
        expect(RPCStream.ControlStreamPong).toStrictEqual(4)

        expect(RPCStream["zero8Bytes"]).toStrictEqual(new Uint8Array([
            0, 0, 0, 0, 0, 0, 0, 0,
        ]))
    })

    test("new RPCStream", () => {
        const v = new RPCStream()
        const data = v["data"]
        expect(data.length).toStrictEqual(1024)
        expect(data[0]).toStrictEqual(RPCStream["streamVersion"])
        for (let i = 1; i < 1024; i++) {
            expect(data[i]).toStrictEqual(0)
        }
        expect(v["readPos"]).toStrictEqual(RPCStream["streamPosBody"])
        expect(v["writePos"]).toStrictEqual(RPCStream["streamPosBody"])
    })

    test("getUint32", () => {
        const v = new RPCStream()
        expect((v as any).getUint32(undefined)).toStrictEqual([0, false])
        expect((v as any).getUint32(null)).toStrictEqual([0, false])
        expect((v as any).getUint32(false)).toStrictEqual([0, false])
        expect((v as any).getUint32(0)).toStrictEqual([0, false])
        v["writePos"] = 1024
        expect((v as any).getUint32(1020)).toStrictEqual([0, true])
        expect((v as any).getUint32(1021)).toStrictEqual([0, false])

        expect((v as any).setUint32(100, 10843009)).toStrictEqual(true)
        expect((v as any).getUint32(100)).toStrictEqual([10843009, true])
    })

    test("setUint32", () => {
        const v = new RPCStream()
        v["writePos"] = 1024

        expect((v as any).setUint32(undefined)).toStrictEqual(false)
        expect((v as any).setUint32(null)).toStrictEqual(false)
        expect((v as any).setUint32(false)).toStrictEqual(false)
        expect((v as any).setUint32(0)).toStrictEqual(false)

        expect((v as any).setUint32(2048, 10843009)).toStrictEqual(true)
        v["writePos"] = 3000
        expect((v as any).getUint32(2048)).toStrictEqual([10843009, true])
    })

    test("enlarge", () => {
        const v = new RPCStream()
        for (let i = 0; i <= 1024; i++) {
            expect((v as any).enlarge(i)).toStrictEqual(undefined)
            expect((v as any).data.byteLength).toStrictEqual(1024)
        }

        for (let i = 1025; i <= 2048; i++) {
            expect((v as any).enlarge(i)).toStrictEqual(undefined)
            expect((v as any).data.byteLength).toStrictEqual(2049)
        }
    })

    test("putByte", () => {
        const v = new RPCStream()
        expect((v as any).putByte(11)).toStrictEqual(undefined)
        expect(v["data"][RPCStream["streamPosBody"]]).toStrictEqual(11)
        expect(v["writePos"]).toStrictEqual(RPCStream["streamPosBody"] + 1)

        expect((v as any).putByte(257)).toStrictEqual(undefined)
        expect(v["data"][RPCStream["streamPosBody"] + 1]).toStrictEqual(1)
        expect(v["writePos"]).toStrictEqual(RPCStream["streamPosBody"] + 2)

        expect((v as any).putByte(4294967299)).toStrictEqual(undefined)
        expect(v["data"][RPCStream["streamPosBody"] + 2]).toStrictEqual(3)
        expect(v["writePos"]).toStrictEqual(RPCStream["streamPosBody"] + 3)

        v["writePos"] = 2048
        expect((v as any).putByte(4294967298)).toStrictEqual(undefined)
        expect(v["data"][2048]).toStrictEqual(2)
        expect(v["writePos"]).toStrictEqual(2049)
    })

    test("putBytes", () => {
        const bytes = new Uint8Array([13, 14, 15, 16, 17, 18, 19, 20, 21, 22])
        const v = new RPCStream()
        for (let i = 1; i < 2048; i += 333) {
            for (let l = 0; l < 9; l++) {
                v["writePos"] = i
                const writeBytes = bytes.slice(0, l)
                expect((v as any).putBytes(writeBytes)).toStrictEqual(undefined)
                expect(v["data"].slice(i, i + l)).toStrictEqual(writeBytes)
                expect(v["writePos"]).toStrictEqual(i + l)
            }
        }
    })

    test("peekByte", () => {
        const v = new RPCStream()
        for (let i = 1; i < 2048; i++) {
            v["writePos"] = i
            expect((v as any).putByte(i)).toStrictEqual(undefined)
            v["readPos"] = i
            expect((v as any).peekByte()).toStrictEqual(i & 0xFF)
            expect(v["readPos"]).toStrictEqual(i)

            v["readPos"] = v["writePos"]
            expect((v as any).peekByte()).toStrictEqual(-1)
            expect(v["readPos"]).toStrictEqual(v["writePos"])
        }
    })

    test("readNBytes", () => {
        const v = new RPCStream()
        v["writePos"] = 1
        for (let i = 1; i < 2048; i++) {
            expect((v as any).putByte(i)).toStrictEqual(undefined)
        }
        expect(v["writePos"]).toStrictEqual(2048)

        for (let i = 1; i < 3072; i += 337) {
            for (let l = 0; l < 9; l++) {
                v["readPos"] = i

                if (i + l <= 2048) {
                    expect((v as any).readNBytes(l))
                        .toStrictEqual(v["data"].slice(i, i + l))
                } else {
                    expect((v as any).readNBytes(l))
                        .toStrictEqual(new Uint8Array(0))
                }
            }
        }
    })

    test("getLength", () => {
        const v = new RPCStream()
        for (let i = 1; i < 2048; i++) {
            expect((v as any).putByte(i)).toStrictEqual(undefined)
            expect(v.buildStreamCheck()).toStrictEqual(undefined)
            expect((v as any).getLength())
                .toStrictEqual(RPCStream["streamPosBody"] + i)
        }
    })

    test("getVersion", () => {
        const v = new RPCStream()
        expect(v.getVersion()).toStrictEqual(RPCStream["streamVersion"])
    })

    test("buildStreamCheck", () => {
        const v = new RPCStream()
        for (let i = 1; i < 2048; i++) {
            expect((v as any).putByte(i)).toStrictEqual(undefined)
            expect(v.buildStreamCheck()).toStrictEqual(undefined)
            expect(v.checkStream()).toStrictEqual(true)
        }
    })

    test("checkStream", () => {
        const v1 = new RPCStream()
        v1.buildStreamCheck()
        expect((v1 as any).putByte(1)).toStrictEqual(undefined)
        expect(v1.checkStream()).toStrictEqual(false)

        const v2 = new RPCStream()
        expect((v2 as any).putByte(1)).toStrictEqual(undefined)
        v2.buildStreamCheck()
        v2["data"][RPCStream["streamPosBody"]] = 2
        expect(v2.checkStream()).toStrictEqual(false)

        const v3 = new RPCStream()
        expect((v3 as any).putByte(1)).toStrictEqual(undefined)
        v3.buildStreamCheck()
        expect(v3.checkStream()).toStrictEqual(true)
    })

    test("getReadPos", () => {
        const v = new RPCStream()
        expect(v.getReadPos()).toStrictEqual(RPCStream["streamPosBody"])
    })

    test("setReadPos", () => {
        const v1 = new RPCStream()
        expect(v1.setReadPos(1)).toStrictEqual(false)

        const v2 = new RPCStream()
        expect(v2.setReadPos(RPCStream["streamPosBody"] + 1))
            .toStrictEqual(false)

        const v3 = new RPCStream()
        v3.setWritePos(2048)
        for (let i = RPCStream["streamPosBody"]; i <= 2048; i++) {
            expect(v3.setReadPos(i)).toStrictEqual(true)
            expect(v3["readPos"]).toStrictEqual(i)
        }
    })

    test("getWritePos", () => {
        const v = new RPCStream()
        expect(v.getWritePos()).toStrictEqual(RPCStream["streamPosBody"])
    })

    test("setWritePos", () => {
        const v = new RPCStream()

        for (let i = 0; i < 4096; i++) {
            if (i < RPCStream["streamPosBody"]) {
                expect(v.setWritePos(i)).toStrictEqual(false)
            } else {
                expect(v.setWritePos(i)).toStrictEqual(true)
                expect(v.getWritePos()).toStrictEqual(i)
                expect(v["data"].byteLength >= i).toStrictEqual(true)
            }
        }
    })

    test("getBuffer", () => {
        const v = new RPCStream()
        expect(v.getBuffer()).toStrictEqual(v["data"].slice(0, v.getWritePos()))
    })

    test("getCallbackID", () => {
        const v1 = new RPCStream()
        expect(v1.getCallbackID()).toStrictEqual(0)

        const v2 = new RPCStream()
        v2.setCallbackID(12345)
        expect(v2.getCallbackID()).toStrictEqual(12345)
    })

    test("setCallbackID", () => {
        const v1 = new RPCStream()
        expect(v1.setCallbackID(0)).toStrictEqual(true)

        const v2 = new RPCStream()
        expect(v2.setCallbackID(1)).toStrictEqual(true)

        const v3 = new RPCStream()
        expect(v3.setCallbackID(0.3)).toStrictEqual(false)

        const v4 = new RPCStream()
        expect(v4.setCallbackID(-1)).toStrictEqual(false)
    })

    test("canRead", () => {
        const v1 = new RPCStream()
        expect(v1.canRead()).toStrictEqual(false)

        const v2 = new RPCStream()
        v2["readPos"] = RPCStream["streamPosBody"] + 1
        expect(v2.canRead()).toStrictEqual(false)

        const v3 = new RPCStream()
        v3.setWritePos(RPCStream["streamPosBody"] + 1)
        expect(v3.canRead()).toStrictEqual(true)
    })

    test("isReadFinish", () => {
        const v1 = new RPCStream()
        expect(v1.isReadFinish()).toStrictEqual(true)

        const v2 = new RPCStream()
        v2["readPos"] = RPCStream["streamPosBody"] + 1
        expect(v2.isReadFinish()).toStrictEqual(false)

        const v3 = new RPCStream()
        v3.setWritePos(RPCStream["streamPosBody"] + 1)
        expect(v3.isReadFinish()).toStrictEqual(false)
    })
})

describe("RPCStream Null", () => {
    test("RPCStream_writeNull", () => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        for (const v of streamTestSuccessCollections.get("null")!) {
            const stream: RPCStream = new RPCStream()
            stream.writeNull()
            expect(stream.getBuffer().slice(RPCStream["streamPosBody"]))
                .toStrictEqual(v[1])
        }
    })
})

describe("RPCStream RPCBool", () => {
    test("RPCStream_writeBool", () => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        for (const v of streamTestSuccessCollections.get("bool")!) {
            const stream: RPCStream = new RPCStream()
            expect(stream.writeBool(v[0] as boolean))
                .toStrictEqual(RPCStream.StreamWriteOK)
            expect(stream.getBuffer().slice(RPCStream["streamPosBody"]))
                .toStrictEqual(v[1])
        }

        // null
        const bug1: RPCStream = new RPCStream()
        expect(bug1.writeBool(null as any))
            .toStrictEqual(RPCStream.StreamWriteUnsupportedValue)
        expect(bug1.getWritePos()).toStrictEqual(RPCStream["streamPosBody"])

        // undefined
        const bug2: RPCStream = new RPCStream()
        expect(bug2.writeBool(undefined as any))
            .toStrictEqual(RPCStream.StreamWriteUnsupportedValue)
        expect(bug2.getWritePos()).toStrictEqual(RPCStream["streamPosBody"])
    })
})

describe("RPCStream RPCFloat64", () => {
    test("RPCStream_writeFloat64", () => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        for (const v of streamTestSuccessCollections.get("float64")!) {
            const stream: RPCStream = new RPCStream()
            expect(stream.writeFloat64(v[0] as RPCFloat64))
                .toStrictEqual(RPCStream.StreamWriteOK)
            expect(stream.getBuffer().slice(RPCStream["streamPosBody"]))
                .toStrictEqual(v[1])
        }

        // NaN
        const bug1: RPCStream = new RPCStream()
        expect(bug1.writeFloat64(new RPCFloat64(NaN)))
            .toStrictEqual(RPCStream.StreamWriteUnsupportedValue)
        expect(bug1.getWritePos()).toStrictEqual(RPCStream["streamPosBody"])

        // null
        const bug2: RPCStream = new RPCStream()
        expect(bug2.writeFloat64(null as any))
            .toStrictEqual(RPCStream.StreamWriteUnsupportedValue)
        expect(bug2.getWritePos()).toStrictEqual(RPCStream["streamPosBody"])

        // undefined
        const bug3: RPCStream = new RPCStream()
        expect(bug3.writeFloat64(undefined as any))
            .toStrictEqual(RPCStream.StreamWriteUnsupportedValue)
        expect(bug3.getWritePos()).toStrictEqual(RPCStream["streamPosBody"])
    })
})

describe("RPCStream RPCInt64", () => {
    test("RPCStream_writeInt64", () => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        for (const v of streamTestSuccessCollections.get("int64")!) {
            const stream: RPCStream = new RPCStream()
            expect(stream.writeInt64(v[0] as RPCInt64))
                .toStrictEqual(RPCStream.StreamWriteOK)
            expect(stream.getBuffer().slice(RPCStream["streamPosBody"]))
                .toStrictEqual(v[1])
        }

        // NaN
        const bug1: RPCStream = new RPCStream()
        expect(bug1.writeInt64(new RPCInt64(NaN)))
            .toStrictEqual(RPCStream.StreamWriteUnsupportedValue)
        expect(bug1.getWritePos()).toStrictEqual(RPCStream["streamPosBody"])

        // null
        const bug2: RPCStream = new RPCStream()
        expect(bug2.writeInt64(null as any))
            .toStrictEqual(RPCStream.StreamWriteUnsupportedValue)
        expect(bug2.getWritePos()).toStrictEqual(RPCStream["streamPosBody"])

        // undefined
        const bug3: RPCStream = new RPCStream()
        expect(bug3.writeInt64(undefined as any))
            .toStrictEqual(RPCStream.StreamWriteUnsupportedValue)
        expect(bug3.getWritePos()).toStrictEqual(RPCStream["streamPosBody"])
    })
})

describe("RPCStream RPCUint64", () => {
    test("RPCStream_writeInt64", () => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        for (const v of streamTestSuccessCollections.get("uint64")!) {
            const stream: RPCStream = new RPCStream()
            expect(stream.writeUint64(v[0] as RPCUint64))
                .toStrictEqual(RPCStream.StreamWriteOK)
            expect(stream.getBuffer().slice(RPCStream["streamPosBody"]))
                .toStrictEqual(v[1])
        }

        // NaN
        const bug1: RPCStream = new RPCStream()
        expect(bug1.writeUint64(new RPCUint64(NaN)))
            .toStrictEqual(RPCStream.StreamWriteUnsupportedValue)
        expect(bug1.getWritePos()).toStrictEqual(RPCStream["streamPosBody"])

        // null
        const bug2: RPCStream = new RPCStream()
        expect(bug2.writeUint64(null as any))
            .toStrictEqual(RPCStream.StreamWriteUnsupportedValue)
        expect(bug2.getWritePos()).toStrictEqual(RPCStream["streamPosBody"])

        // undefined
        const bug3: RPCStream = new RPCStream()
        expect(bug3.writeUint64(undefined as any))
            .toStrictEqual(RPCStream.StreamWriteUnsupportedValue)
        expect(bug3.getWritePos()).toStrictEqual(RPCStream["streamPosBody"])
    })
})

describe("RPCStream RPCString", () => {
    test("RPCStream_writeString", () => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        for (const v of streamTestSuccessCollections.get("string")!) {
            const stream: RPCStream = new RPCStream()
            expect(stream.writeString(v[0] as RPCString))
                .toStrictEqual(RPCStream.StreamWriteOK)
            expect(stream.getBuffer().slice(RPCStream["streamPosBody"]))
                .toStrictEqual(v[1])
        }

        // null
        const bug1: RPCStream = new RPCStream()
        expect(bug1.writeString(null as any))
            .toStrictEqual(RPCStream.StreamWriteUnsupportedValue)
        expect(bug1.getWritePos()).toStrictEqual(RPCStream["streamPosBody"])

        // undefined
        const bug2: RPCStream = new RPCStream()
        expect(bug2.writeString(undefined as any))
            .toStrictEqual(RPCStream.StreamWriteUnsupportedValue)
        expect(bug2.getWritePos()).toStrictEqual(RPCStream["streamPosBody"])

        // bad string
        const badString: string = String.fromCharCode(2097152)
        const bug3: RPCStream = new RPCStream()
        expect(bug3.writeString(badString))
            .toStrictEqual(RPCStream.StreamWriteUnsupportedValue)
        expect(bug3.getWritePos()).toStrictEqual(RPCStream["streamPosBody"])
    })
})

describe("RPCStream RPCBytes", () => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    for (const v of streamTestSuccessCollections.get("bytes")!) {
        const stream: RPCStream = new RPCStream()
        expect(stream.writeBytes(v[0] as RPCBytes))
            .toStrictEqual(RPCStream.StreamWriteOK)
        expect(stream.getBuffer().slice(RPCStream["streamPosBody"]))
            .toStrictEqual(v[1])
    }

    // null
    const bug1: RPCStream = new RPCStream()
    expect(bug1.writeBytes(null as any))
        .toStrictEqual(RPCStream.StreamWriteUnsupportedValue)
    expect(bug1.getWritePos()).toStrictEqual(RPCStream["streamPosBody"])

    // undefined
    const bug2: RPCStream = new RPCStream()
    expect(bug2.writeBytes(null as any))
        .toStrictEqual(RPCStream.StreamWriteUnsupportedValue)
    expect(bug2.getWritePos()).toStrictEqual(RPCStream["streamPosBody"])
})

describe("RPCStream RPCArray", () => {
    test("RPCStream_writeArray", () => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        for (const v of streamTestSuccessCollections.get("array")!) {
            const stream: RPCStream = new RPCStream()
            expect((stream as any).writeArrayInner(v[0] as RPCArray, 64))
                .toStrictEqual(RPCStream.StreamWriteOK)
            expect(stream.getBuffer().slice(RPCStream["streamPosBody"]))
                .toStrictEqual(v[1])
        }

        // null
        const bug1: RPCStream = new RPCStream()
        expect((bug1 as any).writeArrayInner(null as any, 64))
            .toStrictEqual(RPCStream.StreamWriteUnsupportedValue)
        expect(bug1.getWritePos()).toStrictEqual(RPCStream["streamPosBody"])

        // undefined
        const bug2: RPCStream = new RPCStream()
        expect((bug2 as any).writeArrayInner(undefined as any, 64))
            .toStrictEqual(RPCStream.StreamWriteUnsupportedValue)
        expect(bug2.getWritePos()).toStrictEqual(RPCStream["streamPosBody"])

        // contain other types
        const bug3: RPCStream = new RPCStream()
        expect((bug3 as any).writeArrayInner([true, 1, "hi"] as any, 64))
            .toStrictEqual(RPCStream.StreamWriteUnsupportedValue)
        expect(bug3.getWritePos()).toStrictEqual(RPCStream["streamPosBody"])
    })
})

describe("RPCStream RPCMap", () => {
    test("RPCStream_writeMap", () => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        for (const v of streamTestSuccessCollections.get("map")!) {
            const stream: RPCStream = new RPCStream()
            expect((stream as any).writeMapInner(v[0] as RPCMap, 64))
                .toStrictEqual(RPCStream.StreamWriteOK)
            expect(stream.getBuffer().slice(RPCStream["streamPosBody"]))
                .toStrictEqual(v[1])
        }

        // null
        const bug1: RPCStream = new RPCStream()
        expect((bug1 as any).writeMapInner(null as any, 64))
            .toStrictEqual(RPCStream.StreamWriteUnsupportedValue)
        expect(bug1.getWritePos()).toStrictEqual(RPCStream["streamPosBody"])

        // undefined
        const bug2: RPCStream = new RPCStream()
        expect((bug2 as any).writeMapInner(undefined as any, 64))
            .toStrictEqual(RPCStream.StreamWriteUnsupportedValue)
        expect(bug2.getWritePos()).toStrictEqual(RPCStream["streamPosBody"])

        // contain other types
        const bug3: RPCStream = new RPCStream()
        expect((bug3 as any).writeMapInner(new Map([["foo", 3]]) as any, 64))
            .toStrictEqual(RPCStream.StreamWriteUnsupportedValue)
        expect(bug3.getWritePos()).toStrictEqual(RPCStream["streamPosBody"])

        // map key error
        const bug4: RPCStream = new RPCStream()
        expect((bug4 as any).writeMapInner(new Map<string, RPCAny>([
            [String.fromCharCode(2097152), true],
        ]), 64)).toStrictEqual(RPCStream.StreamWriteUnsupportedValue)
        expect(bug4.getWritePos()).toStrictEqual(RPCStream["streamPosBody"])
    })
})

describe("RPCStream RPCAny", () => {
    test("RPCStream_write", () => {
        for (const key of [
            "null", "bool", "float64", "int64", "uint64",
            "string", "bytes", "array", "map",
        ]) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            for (const v of streamTestSuccessCollections.get(key)!) {
                const stream: RPCStream = new RPCStream()
                expect(stream.write(v[0] as RPCAny))
                    .toStrictEqual(RPCStream.StreamWriteOK)
                expect(stream.getBuffer().slice(RPCStream["streamPosBody"]))
                    .toStrictEqual(v[1])
            }
        }

        // other unsupported object type
        const bug1: RPCStream = new RPCStream()
        expect(bug1.write(new Date() as any))
            .toStrictEqual(RPCStream.StreamWriteUnsupportedValue)
        expect(bug1.getWritePos())
            .toStrictEqual(RPCStream["streamPosBody"])

        // unsupported number type
        const bug2: RPCStream = new RPCStream()
        expect(bug2.write(1 as any))
            .toStrictEqual(RPCStream.StreamWriteUnsupportedValue)
        expect(bug2.getWritePos()).toStrictEqual(RPCStream["streamPosBody"])

        // undefined
        const bug3: RPCStream = new RPCStream()
        expect(bug3.write(undefined as any))
            .toStrictEqual(RPCStream.StreamWriteUnsupportedValue)
        expect(bug3.getWritePos()).toStrictEqual(RPCStream["streamPosBody"])
    })
})

/* eslint-enable @typescript-eslint/no-explicit-any */
