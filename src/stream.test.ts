import {
    RPCAny,
    RPCArray,
    RPCBytes,
    RPCFloat64,
    RPCInt64,
    RPCMap,
    RPCString,
    RPCUint64,
    toRPCFloat64,
    toRPCInt64,
    toRPCUint64,
} from "./types";
import { RPCStream } from "./stream";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

function getTestDepthArray(depth: number): [RPCAny, string] {
    if (depth <= 1) {
        return [true, ""];
    }

    const ret = getTestDepthArray(depth - 1);
    const arr = new Array<RPCAny>();
    arr.push(ret[0]);
    return [arr, "[0]" + ret[1]];
}

function getTestDepthMap(depth: number): [RPCAny, string] {
    if (depth <= 1) {
        return [true, ""];
    }

    const ret = getTestDepthMap(depth - 1);
    const map = new Map<string, RPCAny>();
    map.set("a", ret[0]);
    return [map, "[\"a\"]" + ret[1]];
}

const streamTestSuccessCollections = new Map([
    ["null", [[null, new Uint8Array([0x01])]]],
    [
        "bool",
        [
            [true, new Uint8Array([0x02])],
            [false, new Uint8Array([0x03])],
        ],
    ],
    [
        "float64",
        [
            [toRPCFloat64(0), new Uint8Array([0x04])],
            [
                toRPCFloat64(100),
                new Uint8Array([
                    0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x59, 0x40,
                ]),
            ],
            [
                toRPCFloat64(3.1415926),
                new Uint8Array([
                    0x05, 0x4a, 0xd8, 0x12, 0x4d, 0xfb, 0x21, 0x09, 0x40,
                ]),
            ],
            [
                toRPCFloat64(-3.1415926),
                new Uint8Array([
                    0x05, 0x4a, 0xd8, 0x12, 0x4d, 0xfb, 0x21, 0x09, 0xc0,
                ]),
            ],
            [
                toRPCFloat64(-100),
                new Uint8Array([
                    0x05, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x59, 0xc0,
                ]),
            ],
        ],
    ],
    [
        "int64",
        [
            // -9223372036854775808
            [
                RPCInt64.fromBytes(
                    new Uint8Array([
                        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                    ])
                ),
                new Uint8Array([
                    0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                ]),
            ],
            // -9007199254740992
            [
                RPCInt64.fromBytes(
                    new Uint8Array([
                        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xe0, 0x7f,
                    ])
                ),
                new Uint8Array([
                    0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xe0, 0x7f,
                ]),
            ],
            [
                toRPCInt64(-9007199254740991),
                new Uint8Array([
                    0x08, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0xe0, 0x7f,
                ]),
            ],
            [
                toRPCInt64(-9007199254740990),
                new Uint8Array([
                    0x08, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0xe0, 0x7f,
                ]),
            ],
            [
                toRPCInt64(-2147483649),
                new Uint8Array([
                    0x08, 0xff, 0xff, 0xff, 0x7f, 0xff, 0xff, 0xff, 0x7f,
                ]),
            ],
            [
                toRPCInt64(-2147483648),
                new Uint8Array([0x07, 0x00, 0x00, 0x00, 0x00]),
            ],
            [
                toRPCInt64(-32769),
                new Uint8Array([0x07, 0xff, 0x7f, 0xff, 0x7f]),
            ],
            [toRPCInt64(-32768), new Uint8Array([0x06, 0x00, 0x00])],
            [toRPCInt64(-8), new Uint8Array([0x06, 0xf8, 0x7f])],
            [toRPCInt64(-7), new Uint8Array([0x0e])],
            [toRPCInt64(-1), new Uint8Array([0x14])],
            [toRPCInt64(0), new Uint8Array([0x15])],
            [toRPCInt64(1), new Uint8Array([0x16])],
            [toRPCInt64(32), new Uint8Array([0x35])],
            [toRPCInt64(33), new Uint8Array([0x06, 0x21, 0x80])],
            [toRPCInt64(32767), new Uint8Array([0x06, 0xff, 0xff])],

            [toRPCInt64(32768), new Uint8Array([0x07, 0x00, 0x80, 0x00, 0x80])],
            [
                toRPCInt64(2147483647),
                new Uint8Array([0x07, 0xff, 0xff, 0xff, 0xff]),
            ],
            [
                toRPCInt64(2147483648),
                new Uint8Array([
                    0x08, 0x00, 0x00, 0x00, 0x80, 0x00, 0x00, 0x00, 0x80,
                ]),
            ],
            [
                toRPCInt64(9007199254740990),
                new Uint8Array([
                    0x08, 0xfe, 0xff, 0xff, 0xff, 0xff, 0xff, 0x1f, 0x80,
                ]),
            ],
            [
                toRPCInt64(9007199254740991),
                new Uint8Array([
                    0x08, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x1f, 0x80,
                ]),
            ],
            // 9007199254740992
            [
                RPCInt64.fromBytes(
                    new Uint8Array([
                        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x20, 0x80,
                    ])
                ),
                new Uint8Array([
                    0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x20, 0x80,
                ]),
            ],
            // 9223372036854775807
            [
                RPCInt64.fromBytes(
                    new Uint8Array([
                        0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
                    ])
                ),
                new Uint8Array([
                    0x08, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
                ]),
            ],
        ],
    ],
    [
        "uint64",
        [
            [toRPCUint64(0), new Uint8Array([0x36])],
            [toRPCUint64(9), new Uint8Array([0x3f])],
            [toRPCUint64(10), new Uint8Array([0x09, 0x0a, 0x00])],
            [toRPCUint64(65535), new Uint8Array([0x09, 0xff, 0xff])],
            [
                toRPCUint64(65536),
                new Uint8Array([0x0a, 0x00, 0x00, 0x01, 0x00]),
            ],
            [
                toRPCUint64(4294967295),
                new Uint8Array([0x0a, 0xff, 0xff, 0xff, 0xff]),
            ],
            [
                toRPCUint64(4294967296),
                new Uint8Array([
                    0x0b, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,
                ]),
            ],
            [
                toRPCUint64(9007199254740990),
                new Uint8Array([
                    0x0b, 0xfe, 0xff, 0xff, 0xff, 0xff, 0xff, 0x1f, 0x00,
                ]),
            ],
            [
                toRPCUint64(9007199254740991),
                new Uint8Array([
                    0x0b, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x1f, 0x00,
                ]),
            ],
            // 9007199254740992
            [
                RPCUint64.fromBytes(
                    new Uint8Array([
                        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x20, 0x00,
                    ])
                ),
                new Uint8Array([
                    0x0b, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x20, 0x00,
                ]),
            ],
            // 18446744073709551615
            [
                RPCUint64.fromBytes(
                    new Uint8Array([
                        0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
                    ])
                ),
                new Uint8Array([
                    0x0b, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
                ]),
            ],
        ],
    ],
    [
        "string",
        [
            ["", new Uint8Array([0x80])],
            ["a", new Uint8Array([0x81, 0x61, 0x00])],
            [
                "😀☘️🀄️©️🌈🎩",
                new Uint8Array([
                    0x9e, 0xf0, 0x9f, 0x98, 0x80, 0xe2, 0x98, 0x98, 0xef, 0xb8,
                    0x8f, 0xf0, 0x9f, 0x80, 0x84, 0xef, 0xb8, 0x8f, 0xc2, 0xa9,
                    0xef, 0xb8, 0x8f, 0xf0, 0x9f, 0x8c, 0x88, 0xf0, 0x9f, 0x8e,
                    0xa9, 0x00,
                ]),
            ],
            [
                "😀中☘️文🀄️©️🌈🎩测试a\n\r\b",
                new Uint8Array([
                    0xae, 0xf0, 0x9f, 0x98, 0x80, 0xe4, 0xb8, 0xad, 0xe2, 0x98,
                    0x98, 0xef, 0xb8, 0x8f, 0xe6, 0x96, 0x87, 0xf0, 0x9f, 0x80,
                    0x84, 0xef, 0xb8, 0x8f, 0xc2, 0xa9, 0xef, 0xb8, 0x8f, 0xf0,
                    0x9f, 0x8c, 0x88, 0xf0, 0x9f, 0x8e, 0xa9, 0xe6, 0xb5, 0x8b,
                    0xe8, 0xaf, 0x95, 0x61, 0x0a, 0x0d, 0x08, 0x00,
                ]),
            ],
            [
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                new Uint8Array([
                    0xbf, 0x45, 0x00, 0x00, 0x00, 0x61, 0x61, 0x61, 0x61, 0x61,
                    0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                    0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                    0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                    0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                    0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                    0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x00,
                ]),
            ],
            [
                "😀☘️🀄️©️🌈🎩😛👩👩👦👨👩👦👦👼🗣👑👚👹👺🌳🍊",
                new Uint8Array([
                    0xbf, 0x64, 0x00, 0x00, 0x00, 0xf0, 0x9f, 0x98, 0x80, 0xe2,
                    0x98, 0x98, 0xef, 0xb8, 0x8f, 0xf0, 0x9f, 0x80, 0x84, 0xef,
                    0xb8, 0x8f, 0xc2, 0xa9, 0xef, 0xb8, 0x8f, 0xf0, 0x9f, 0x8c,
                    0x88, 0xf0, 0x9f, 0x8e, 0xa9, 0xf0, 0x9f, 0x98, 0x9b, 0xf0,
                    0x9f, 0x91, 0xa9, 0xf0, 0x9f, 0x91, 0xa9, 0xf0, 0x9f, 0x91,
                    0xa6, 0xf0, 0x9f, 0x91, 0xa8, 0xf0, 0x9f, 0x91, 0xa9, 0xf0,
                    0x9f, 0x91, 0xa6, 0xf0, 0x9f, 0x91, 0xa6, 0xf0, 0x9f, 0x91,
                    0xbc, 0xf0, 0x9f, 0x97, 0xa3, 0xf0, 0x9f, 0x91, 0x91, 0xf0,
                    0x9f, 0x91, 0x9a, 0xf0, 0x9f, 0x91, 0xb9, 0xf0, 0x9f, 0x91,
                    0xba, 0xf0, 0x9f, 0x8c, 0xb3, 0xf0, 0x9f, 0x8d, 0x8a, 0x00,
                ]),
            ],
        ],
    ],
    [
        "bytes",
        [
            [new Uint8Array([]), new Uint8Array([0xc0])],
            [new Uint8Array([0xda]), new Uint8Array([0xc1, 0xda])],
            [
                new Uint8Array([
                    0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                    0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                    0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                    0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                    0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                    0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                    0x61, 0x61, 0x61,
                ]),
                new Uint8Array([
                    0xff, 0x44, 0x00, 0x00, 0x00, 0x61, 0x61, 0x61, 0x61, 0x61,
                    0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                    0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                    0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                    0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                    0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                    0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                ]),
            ],
        ],
    ],
    [
        "array",
        [
            [[], new Uint8Array([64])],
            [[true], new Uint8Array([65, 6, 0, 0, 0, 2])],
            [["", true], new Uint8Array([66, 7, 0, 0, 0, 0x80, 0x02])],
            [
                ["a", true],
                new Uint8Array([66, 9, 0, 0, 0, 0x81, 0x61, 0x00, 0x02]),
            ],
            [[true, false], new Uint8Array([66, 7, 0, 0, 0, 2, 3])],
            [
                [
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                ],
                new Uint8Array([
                    94, 35, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
                    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
                ]),
            ],
            [
                [
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                ],
                new Uint8Array([
                    95, 40, 0, 0, 0, 31, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
                    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
                    2,
                ]),
            ],
            [
                [
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                    true,
                ],
                new Uint8Array([
                    95, 41, 0, 0, 0, 32, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
                    2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
                    2, 2,
                ]),
            ],
        ],
    ],
    [
        "map",
        [
            [new Map([]), new Uint8Array([0x60])],
            [
                new Map([["1", true]]),
                new Uint8Array([
                    0x61, 0x09, 0x00, 0x00, 0x00, 0x81, 0x31, 0x00, 0x02,
                ]),
            ],
            [
                new Map([["1", ""]]),
                new Uint8Array([
                    0x61, 0x09, 0x00, 0x00, 0x00, 0x81, 0x31, 0x00, 0x80,
                ]),
            ],
            [
                new Map([["1", "a"]]),
                new Uint8Array([
                    0x61, 0x0b, 0x00, 0x00, 0x00, 0x81, 0x31, 0x00, 0x81, 0x61,
                    0x00,
                ]),
            ],
            [
                new Map([
                    ["1", true],
                    ["2", true],
                    ["3", true],
                    ["4", true],
                    ["5", true],
                    ["6", true],
                    ["7", true],
                    ["8", true],
                    ["9", true],
                    ["a", true],
                    ["b", true],
                    ["c", true],
                    ["d", true],
                    ["e", true],
                    ["f", true],
                    ["g", true],
                    ["h", true],
                    ["i", true],
                    ["j", true],
                    ["k", true],
                    ["l", true],
                    ["m", true],
                    ["n", true],
                    ["o", true],
                    ["p", true],
                    ["q", true],
                    ["r", true],
                    ["s", true],
                    ["t", true],
                    ["u", true],
                ]),
                new Uint8Array([
                    0x7e, 0x7d, 0x00, 0x00, 0x00, 0x81, 0x31, 0x00, 0x02, 0x81,
                    0x32, 0x00, 0x02, 0x81, 0x33, 0x00, 0x02, 0x81, 0x34, 0x00,
                    0x02, 0x81, 0x35, 0x00, 0x02, 0x81, 0x36, 0x00, 0x02, 0x81,
                    0x37, 0x00, 0x02, 0x81, 0x38, 0x00, 0x02, 0x81, 0x39, 0x00,
                    0x02, 0x81, 0x61, 0x00, 0x02, 0x81, 0x62, 0x00, 0x02, 0x81,
                    0x63, 0x00, 0x02, 0x81, 0x64, 0x00, 0x02, 0x81, 0x65, 0x00,
                    0x02, 0x81, 0x66, 0x00, 0x02, 0x81, 0x67, 0x00, 0x02, 0x81,
                    0x68, 0x00, 0x02, 0x81, 0x69, 0x00, 0x02, 0x81, 0x6a, 0x00,
                    0x02, 0x81, 0x6b, 0x00, 0x02, 0x81, 0x6c, 0x00, 0x02, 0x81,
                    0x6d, 0x00, 0x02, 0x81, 0x6e, 0x00, 0x02, 0x81, 0x6f, 0x00,
                    0x02, 0x81, 0x70, 0x00, 0x02, 0x81, 0x71, 0x00, 0x02, 0x81,
                    0x72, 0x00, 0x02, 0x81, 0x73, 0x00, 0x02, 0x81, 0x74, 0x00,
                    0x02, 0x81, 0x75, 0x00, 0x02,
                ]),
            ],
            [
                new Map([
                    ["1", true],
                    ["2", true],
                    ["3", true],
                    ["4", true],
                    ["5", true],
                    ["6", true],
                    ["7", true],
                    ["8", true],
                    ["9", true],
                    ["a", true],
                    ["b", true],
                    ["c", true],
                    ["d", true],
                    ["e", true],
                    ["f", true],
                    ["g", true],
                    ["h", true],
                    ["i", true],
                    ["j", true],
                    ["k", true],
                    ["l", true],
                    ["m", true],
                    ["n", true],
                    ["o", true],
                    ["p", true],
                    ["q", true],
                    ["r", true],
                    ["s", true],
                    ["t", true],
                    ["u", true],
                    ["v", true],
                ]),
                new Uint8Array([
                    0x7f, 0x85, 0x00, 0x00, 0x00, 0x1f, 0x00, 0x00, 0x00, 0x81,
                    0x31, 0x00, 0x02, 0x81, 0x32, 0x00, 0x02, 0x81, 0x33, 0x00,
                    0x02, 0x81, 0x34, 0x00, 0x02, 0x81, 0x35, 0x00, 0x02, 0x81,
                    0x36, 0x00, 0x02, 0x81, 0x37, 0x00, 0x02, 0x81, 0x38, 0x00,
                    0x02, 0x81, 0x39, 0x00, 0x02, 0x81, 0x61, 0x00, 0x02, 0x81,
                    0x62, 0x00, 0x02, 0x81, 0x63, 0x00, 0x02, 0x81, 0x64, 0x00,
                    0x02, 0x81, 0x65, 0x00, 0x02, 0x81, 0x66, 0x00, 0x02, 0x81,
                    0x67, 0x00, 0x02, 0x81, 0x68, 0x00, 0x02, 0x81, 0x69, 0x00,
                    0x02, 0x81, 0x6a, 0x00, 0x02, 0x81, 0x6b, 0x00, 0x02, 0x81,
                    0x6c, 0x00, 0x02, 0x81, 0x6d, 0x00, 0x02, 0x81, 0x6e, 0x00,
                    0x02, 0x81, 0x6f, 0x00, 0x02, 0x81, 0x70, 0x00, 0x02, 0x81,
                    0x71, 0x00, 0x02, 0x81, 0x72, 0x00, 0x02, 0x81, 0x73, 0x00,
                    0x02, 0x81, 0x74, 0x00, 0x02, 0x81, 0x75, 0x00, 0x02, 0x81,
                    0x76, 0x00, 0x02,
                ]),
            ],
            [
                new Map([
                    ["1", true],
                    ["2", true],
                    ["3", true],
                    ["4", true],
                    ["5", true],
                    ["6", true],
                    ["7", true],
                    ["8", true],
                    ["9", true],
                    ["a", true],
                    ["b", true],
                    ["c", true],
                    ["d", true],
                    ["e", true],
                    ["f", true],
                    ["g", true],
                    ["h", true],
                    ["i", true],
                    ["j", true],
                    ["k", true],
                    ["l", true],
                    ["m", true],
                    ["n", true],
                    ["o", true],
                    ["p", true],
                    ["q", true],
                    ["r", true],
                    ["s", true],
                    ["t", true],
                    ["u", true],
                    ["v", true],
                    ["w", true],
                ]),
                new Uint8Array([
                    0x7f, 0x89, 0x00, 0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 0x81,
                    0x31, 0x00, 0x02, 0x81, 0x32, 0x00, 0x02, 0x81, 0x33, 0x00,
                    0x02, 0x81, 0x34, 0x00, 0x02, 0x81, 0x35, 0x00, 0x02, 0x81,
                    0x36, 0x00, 0x02, 0x81, 0x37, 0x00, 0x02, 0x81, 0x38, 0x00,
                    0x02, 0x81, 0x39, 0x00, 0x02, 0x81, 0x61, 0x00, 0x02, 0x81,
                    0x62, 0x00, 0x02, 0x81, 0x63, 0x00, 0x02, 0x81, 0x64, 0x00,
                    0x02, 0x81, 0x65, 0x00, 0x02, 0x81, 0x66, 0x00, 0x02, 0x81,
                    0x67, 0x00, 0x02, 0x81, 0x68, 0x00, 0x02, 0x81, 0x69, 0x00,
                    0x02, 0x81, 0x6a, 0x00, 0x02, 0x81, 0x6b, 0x00, 0x02, 0x81,
                    0x6c, 0x00, 0x02, 0x81, 0x6d, 0x00, 0x02, 0x81, 0x6e, 0x00,
                    0x02, 0x81, 0x6f, 0x00, 0x02, 0x81, 0x70, 0x00, 0x02, 0x81,
                    0x71, 0x00, 0x02, 0x81, 0x72, 0x00, 0x02, 0x81, 0x73, 0x00,
                    0x02, 0x81, 0x74, 0x00, 0x02, 0x81, 0x75, 0x00, 0x02, 0x81,
                    0x76, 0x00, 0x02, 0x81, 0x77, 0x00, 0x02,
                ]),
            ],
        ],
    ],
]);

const streamTestWriteCollections = new Map([
    [
        "bool",
        [
            [null, RPCStream.StreamWriteUnsupportedValue],
            [undefined, RPCStream.StreamWriteUnsupportedValue],
        ],
    ],
    [
        "float64",
        [
            [new RPCFloat64(NaN), RPCStream.StreamWriteUnsupportedValue],
            [null, RPCStream.StreamWriteUnsupportedValue],
            [undefined, RPCStream.StreamWriteUnsupportedValue],
        ],
    ],
    [
        "int64",
        [
            [new RPCInt64(NaN), RPCStream.StreamWriteUnsupportedValue],
            [null, RPCStream.StreamWriteUnsupportedValue],
            [undefined, RPCStream.StreamWriteUnsupportedValue],
        ],
    ],
    [
        "uint64",
        [
            [new RPCUint64(NaN), RPCStream.StreamWriteUnsupportedValue],
            [null, RPCStream.StreamWriteUnsupportedValue],
            [undefined, RPCStream.StreamWriteUnsupportedValue],
        ],
    ],
    [
        "string",
        [
            [
                String.fromCharCode(2097152),
                RPCStream.StreamWriteUnsupportedValue,
            ],
            [null, RPCStream.StreamWriteUnsupportedValue],
            [undefined, RPCStream.StreamWriteUnsupportedValue],
        ],
    ],
    [
        "bytes",
        [
            [null, RPCStream.StreamWriteUnsupportedValue],
            [undefined, RPCStream.StreamWriteUnsupportedValue],
        ],
    ],
    [
        "array",
        [
            [null, RPCStream.StreamWriteUnsupportedValue],
            [undefined, RPCStream.StreamWriteUnsupportedValue],
            [[true, 1, "hi"], "[1]" + RPCStream.StreamWriteUnsupportedValue],
            [[true, true, true, new Date(), true], "[3] is not supported"],
            [getTestDepthArray(65)[0], getTestDepthArray(65)[1] + " overflows"],
        ],
    ],
    [
        "map",
        [
            [null, RPCStream.StreamWriteUnsupportedValue],
            [undefined, RPCStream.StreamWriteUnsupportedValue],
            [
                new Map([["foo", 3]]),
                "[\"foo\"]" + RPCStream.StreamWriteUnsupportedValue,
            ],
            [
                new Map([[String.fromCharCode(2097152), true]]),
                "[" +
                    String.fromCharCode(2097152) +
                    "]" +
                    RPCStream.StreamWriteUnsupportedValue,
            ],
            [
                new Map<string, RPCAny>([
                    ["0", toRPCInt64(0)],
                    ["1", new Date() as never],
                ]),
                "[\"1\"] is not supported",
            ],
            [getTestDepthMap(65)[0], getTestDepthMap(65)[1] + " overflows"],
        ],
    ],
    [
        "value",
        [
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
                    ["0", toRPCInt64(0)],
                    ["1", new Date() as never],
                ]),
                "value[\"1\"] is not supported",
            ],
            [
                getTestDepthMap(65)[0],
                "value" + getTestDepthMap(65)[1] + " overflows",
            ],
            [new Date(), "value" + RPCStream.StreamWriteUnsupportedValue],
            [undefined, "value" + RPCStream.StreamWriteUnsupportedValue],
            [1, "value" + RPCStream.StreamWriteUnsupportedValue],
        ],
    ],
]);

describe("RPCStream tests", () => {
    test("RPCStream constant", () => {
        expect(RPCStream["streamVersion"]).toStrictEqual(1);
        expect(RPCStream["streamPosVersion"]).toStrictEqual(0);
        expect(RPCStream["streamPosLength"]).toStrictEqual(4);
        expect(RPCStream["streamPosCheckSum"]).toStrictEqual(8);
        expect(RPCStream["streamPosCallbackID"]).toStrictEqual(50);
        expect(RPCStream["streamPosBody"]).toStrictEqual(60);

        expect(RPCStream.StreamKindConnectRequest).toStrictEqual(1);
        expect(RPCStream.StreamKindConnectResponse).toStrictEqual(2);
        expect(RPCStream.StreamKindPing).toStrictEqual(3);
        expect(RPCStream.StreamKindPong).toStrictEqual(4);
        expect(RPCStream.StreamKindRPCRequest).toStrictEqual(5);
        expect(RPCStream.StreamKindRPCResponseOK).toStrictEqual(6);
        expect(RPCStream.StreamKindRPCResponseError).toStrictEqual(7);
        expect(RPCStream.StreamKindRPCBoardCast).toStrictEqual(8);
        expect(RPCStream.StreamKindSystemErrorReport).toStrictEqual(9);

        expect(RPCStream["StreamWriteOK"]).toStrictEqual("");
        expect(RPCStream["StreamWriteOverflow"]).toStrictEqual(" overflows");
        expect(RPCStream["StreamWriteUnsupportedValue"]).toStrictEqual(
            " is not supported"
        );

        expect(RPCStream.ControlStreamConnectRequest).toStrictEqual(1);
        expect(RPCStream.ControlStreamConnectResponse).toStrictEqual(2);
        expect(RPCStream.ControlStreamPing).toStrictEqual(3);
        expect(RPCStream.ControlStreamPong).toStrictEqual(4);

        expect(RPCStream["zero8Bytes"]).toStrictEqual(
            new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0])
        );
    });

    test("new RPCStream", () => {
        const v = new RPCStream();
        const data = v["data"];
        expect(data.length).toStrictEqual(1024);
        expect(data[0]).toStrictEqual(RPCStream["streamVersion"]);
        for (let i = 1; i < 1024; i++) {
            expect(data[i]).toStrictEqual(0);
        }
        expect(v["readPos"]).toStrictEqual(RPCStream["streamPosBody"]);
        expect(v["writePos"]).toStrictEqual(RPCStream["streamPosBody"]);
    });

    test("getUint32", () => {
        const v = new RPCStream();
        expect((v as any).getUint32(undefined)).toStrictEqual([0, false]);
        expect((v as any).getUint32(null)).toStrictEqual([0, false]);
        expect((v as any).getUint32(false)).toStrictEqual([0, false]);
        expect((v as any).getUint32(0)).toStrictEqual([0, false]);
        v["writePos"] = 1024;
        expect((v as any).getUint32(1020)).toStrictEqual([0, true]);
        expect((v as any).getUint32(1021)).toStrictEqual([0, false]);

        expect((v as any).setUint32(100, 10843009)).toStrictEqual(true);
        expect((v as any).getUint32(100)).toStrictEqual([10843009, true]);
    });

    test("setUint32", () => {
        const v = new RPCStream();
        v["writePos"] = 1024;

        expect((v as any).setUint32(undefined)).toStrictEqual(false);
        expect((v as any).setUint32(null)).toStrictEqual(false);
        expect((v as any).setUint32(false)).toStrictEqual(false);
        expect((v as any).setUint32(0)).toStrictEqual(false);

        expect((v as any).setUint32(2048, 10843009)).toStrictEqual(true);
        v["writePos"] = 3000;
        expect((v as any).getUint32(2048)).toStrictEqual([10843009, true]);
    });

    test("enlarge", () => {
        const v = new RPCStream();
        for (let i = 0; i <= 1024; i++) {
            expect((v as any).enlarge(i)).toStrictEqual(undefined);
            expect((v as any).data.byteLength).toStrictEqual(1024);
        }

        for (let i = 1025; i <= 2048; i++) {
            expect((v as any).enlarge(i)).toStrictEqual(undefined);
            expect((v as any).data.byteLength).toStrictEqual(2049);
        }
    });

    test("putByte", () => {
        const v = new RPCStream();
        expect((v as any).putByte(11)).toStrictEqual(undefined);
        expect(v["data"][RPCStream["streamPosBody"]]).toStrictEqual(11);
        expect(v["writePos"]).toStrictEqual(RPCStream["streamPosBody"] + 1);

        expect((v as any).putByte(257)).toStrictEqual(undefined);
        expect(v["data"][RPCStream["streamPosBody"] + 1]).toStrictEqual(1);
        expect(v["writePos"]).toStrictEqual(RPCStream["streamPosBody"] + 2);

        expect((v as any).putByte(4294967299)).toStrictEqual(undefined);
        expect(v["data"][RPCStream["streamPosBody"] + 2]).toStrictEqual(3);
        expect(v["writePos"]).toStrictEqual(RPCStream["streamPosBody"] + 3);

        v["writePos"] = 2048;
        expect((v as any).putByte(4294967298)).toStrictEqual(undefined);
        expect(v["data"][2048]).toStrictEqual(2);
        expect(v["writePos"]).toStrictEqual(2049);
    });

    test("putBytes", () => {
        const bytes = new Uint8Array([13, 14, 15, 16, 17, 18, 19, 20, 21, 22]);
        const v = new RPCStream();
        for (let i = 1; i < 2048; i += 333) {
            for (let l = 0; l < 9; l++) {
                v["writePos"] = i;
                const writeBytes = bytes.slice(0, l);
                expect((v as any).putBytes(writeBytes)).toStrictEqual(
                    undefined
                );
                expect(v["data"].slice(i, i + l)).toStrictEqual(writeBytes);
                expect(v["writePos"]).toStrictEqual(i + l);
            }
        }
    });

    test("peekByte", () => {
        const v = new RPCStream();
        for (let i = 1; i < 2048; i++) {
            v["writePos"] = i;
            expect((v as any).putByte(i)).toStrictEqual(undefined);
            v["readPos"] = i;
            expect((v as any).peekByte()).toStrictEqual(i & 0xff);
            expect(v["readPos"]).toStrictEqual(i);

            v["readPos"] = v["writePos"];
            expect((v as any).peekByte()).toStrictEqual(-1);
            expect(v["readPos"]).toStrictEqual(v["writePos"]);
        }
    });

    test("readNBytes", () => {
        const v = new RPCStream();
        v["writePos"] = 1;
        for (let i = 1; i < 2048; i++) {
            expect((v as any).putByte(i)).toStrictEqual(undefined);
        }
        expect(v["writePos"]).toStrictEqual(2048);

        for (let i = 1; i < 3072; i += 337) {
            for (let l = 0; l < 9; l++) {
                v["readPos"] = i;

                if (i + l <= 2048) {
                    expect((v as any).readNBytes(l)).toStrictEqual(
                        v["data"].slice(i, i + l)
                    );
                } else {
                    expect((v as any).readNBytes(l)).toStrictEqual(
                        new Uint8Array(0)
                    );
                }
            }
        }
    });

    test("getLength", () => {
        const v = new RPCStream();
        for (let i = 1; i < 2048; i++) {
            expect((v as any).putByte(i)).toStrictEqual(undefined);
            expect(v.buildStreamCheck()).toStrictEqual(undefined);
            expect((v as any).getLength()).toStrictEqual(
                RPCStream["streamPosBody"] + i
            );
        }
    });

    test("getVersion", () => {
        const v = new RPCStream();
        expect(v.getVersion()).toStrictEqual(RPCStream["streamVersion"]);
    });

    test("getKind", () => {
        const v = new RPCStream();
        v.setKind(RPCStream.StreamKindPing);
        expect(v.getKind()).toStrictEqual(RPCStream.StreamKindPing);
    });

    test("setKind", () => {
        const v = new RPCStream();
        v.setKind(RPCStream.StreamKindPing);
        expect(v.getKind()).toStrictEqual(RPCStream.StreamKindPing);
    });

    test("buildStreamCheck", () => {
        const v = new RPCStream();
        for (let i = 1; i < 2048; i++) {
            expect((v as any).putByte(i)).toStrictEqual(undefined);
            expect(v.buildStreamCheck()).toStrictEqual(undefined);
            expect(v.checkStream()).toStrictEqual(true);
        }
    });

    test("checkStream", () => {
        const v1 = new RPCStream();
        v1.buildStreamCheck();
        expect((v1 as any).putByte(1)).toStrictEqual(undefined);
        expect(v1.checkStream()).toStrictEqual(false);

        const v2 = new RPCStream();
        expect((v2 as any).putByte(1)).toStrictEqual(undefined);
        v2.buildStreamCheck();
        v2["data"][RPCStream["streamPosBody"]] = 2;
        expect(v2.checkStream()).toStrictEqual(false);

        const v3 = new RPCStream();
        expect((v3 as any).putByte(1)).toStrictEqual(undefined);
        v3.buildStreamCheck();
        expect(v3.checkStream()).toStrictEqual(true);
    });

    test("getReadPos", () => {
        const v = new RPCStream();
        expect(v.getReadPos()).toStrictEqual(RPCStream["streamPosBody"]);
    });

    test("setReadPos", () => {
        const v1 = new RPCStream();
        expect(v1.setReadPos(1)).toStrictEqual(false);

        const v2 = new RPCStream();
        expect(v2.setReadPos(RPCStream["streamPosBody"] + 1)).toStrictEqual(
            false
        );

        const v3 = new RPCStream();
        v3.setWritePos(2048);
        for (let i = RPCStream["streamPosBody"]; i <= 2048; i++) {
            expect(v3.setReadPos(i)).toStrictEqual(true);
            expect(v3["readPos"]).toStrictEqual(i);
        }
    });

    test("getWritePos", () => {
        const v = new RPCStream();
        expect(v.getWritePos()).toStrictEqual(RPCStream["streamPosBody"]);
    });

    test("setWritePos", () => {
        const v = new RPCStream();

        for (let i = 0; i < 4096; i++) {
            v.setWritePos(i);
            expect(v.getWritePos()).toStrictEqual(i);
            expect(v["data"].byteLength >= i).toStrictEqual(true);
        }
    });

    test("getBuffer", () => {
        const v = new RPCStream();
        expect(v.getBuffer()).toStrictEqual(
            v["data"].slice(0, v.getWritePos())
        );
    });

    test("getCallbackID", () => {
        const v1 = new RPCStream();
        expect(v1.getCallbackID()).toStrictEqual(0);

        const v2 = new RPCStream();
        v2.setCallbackID(12345);
        expect(v2.getCallbackID()).toStrictEqual(12345);
    });

    test("setCallbackID", () => {
        const v1 = new RPCStream();
        expect(v1.setCallbackID(0)).toStrictEqual(true);

        const v2 = new RPCStream();
        expect(v2.setCallbackID(1)).toStrictEqual(true);

        const v3 = new RPCStream();
        expect(v3.setCallbackID(0.3)).toStrictEqual(false);

        const v4 = new RPCStream();
        expect(v4.setCallbackID(-1)).toStrictEqual(false);
    });

    test("canRead", () => {
        const v1 = new RPCStream();
        expect(v1.canRead()).toStrictEqual(false);

        const v2 = new RPCStream();
        v2["readPos"] = RPCStream["streamPosBody"] + 1;
        expect(v2.canRead()).toStrictEqual(false);

        const v3 = new RPCStream();
        v3.setWritePos(RPCStream["streamPosBody"] + 1);
        expect(v3.canRead()).toStrictEqual(true);
    });

    test("isReadFinish", () => {
        const v1 = new RPCStream();
        expect(v1.isReadFinish()).toStrictEqual(true);

        const v2 = new RPCStream();
        v2["readPos"] = RPCStream["streamPosBody"] + 1;
        expect(v2.isReadFinish()).toStrictEqual(false);

        const v3 = new RPCStream();
        v3.setWritePos(RPCStream["streamPosBody"] + 1);
        expect(v3.isReadFinish()).toStrictEqual(false);
    });

    test("RPCStream_writeNull", () => {
        for (const v of streamTestSuccessCollections.get("null")!) {
            const stream: RPCStream = new RPCStream();
            stream.writeNull();
            expect(
                stream.getBuffer().slice(RPCStream["streamPosBody"])
            ).toStrictEqual(v[1]);
        }
    });

    test("RPCStream_writeBool", () => {
        for (const v of streamTestSuccessCollections.get("bool")!) {
            const stream: RPCStream = new RPCStream();
            expect(stream.writeBool(v[0] as boolean)).toStrictEqual(
                RPCStream.StreamWriteOK
            );
            expect(
                stream.getBuffer().slice(RPCStream["streamPosBody"])
            ).toStrictEqual(v[1]);
        }

        for (const v of streamTestWriteCollections.get("bool")!) {
            const stream: RPCStream = new RPCStream();
            expect(stream.writeBool(v[0] as boolean)).toStrictEqual(v[1]);
            expect(stream.getBuffer().slice(RPCStream["streamPosBody"]));
            expect(stream.getWritePos()).toStrictEqual(
                RPCStream["streamPosBody"]
            );
        }
    });

    test("RPCStream_writeFloat64", () => {
        for (const v of streamTestSuccessCollections.get("float64")!) {
            const stream: RPCStream = new RPCStream();
            expect(stream.writeFloat64(v[0] as RPCFloat64)).toStrictEqual(
                RPCStream.StreamWriteOK
            );
            expect(
                stream.getBuffer().slice(RPCStream["streamPosBody"])
            ).toStrictEqual(v[1]);
        }

        for (const v of streamTestWriteCollections.get("float64")!) {
            const stream: RPCStream = new RPCStream();
            expect(stream.writeFloat64(v[0] as RPCFloat64)).toStrictEqual(v[1]);
            expect(stream.getBuffer().slice(RPCStream["streamPosBody"]));
            expect(stream.getWritePos()).toStrictEqual(
                RPCStream["streamPosBody"]
            );
        }
    });

    test("RPCStream_writeInt64", () => {
        for (const v of streamTestSuccessCollections.get("int64")!) {
            const stream: RPCStream = new RPCStream();
            expect(stream.writeInt64(v[0] as RPCInt64)).toStrictEqual(
                RPCStream.StreamWriteOK
            );
            expect(
                stream.getBuffer().slice(RPCStream["streamPosBody"])
            ).toStrictEqual(v[1]);
        }

        for (const v of streamTestWriteCollections.get("int64")!) {
            const stream: RPCStream = new RPCStream();
            expect(stream.writeInt64(v[0] as RPCInt64)).toStrictEqual(v[1]);
            expect(stream.getBuffer().slice(RPCStream["streamPosBody"]));
            expect(stream.getWritePos()).toStrictEqual(
                RPCStream["streamPosBody"]
            );
        }
    });

    test("RPCStream_writeUint64", () => {
        for (const v of streamTestSuccessCollections.get("uint64")!) {
            const stream: RPCStream = new RPCStream();
            expect(stream.writeUint64(v[0] as RPCUint64)).toStrictEqual(
                RPCStream.StreamWriteOK
            );
            expect(
                stream.getBuffer().slice(RPCStream["streamPosBody"])
            ).toStrictEqual(v[1]);
        }

        for (const v of streamTestWriteCollections.get("uint64")!) {
            const stream: RPCStream = new RPCStream();
            expect(stream.writeUint64(v[0] as RPCUint64)).toStrictEqual(v[1]);
            expect(stream.getBuffer().slice(RPCStream["streamPosBody"]));
            expect(stream.getWritePos()).toStrictEqual(
                RPCStream["streamPosBody"]
            );
        }
    });

    test("RPCStream_writeString", () => {
        for (const v of streamTestSuccessCollections.get("string")!) {
            const stream: RPCStream = new RPCStream();
            expect(stream.writeString(v[0] as RPCString)).toStrictEqual(
                RPCStream.StreamWriteOK
            );
            expect(
                stream.getBuffer().slice(RPCStream["streamPosBody"])
            ).toStrictEqual(v[1]);
        }

        for (const v of streamTestWriteCollections.get("string")!) {
            const stream: RPCStream = new RPCStream();
            expect(stream.writeString(v[0] as RPCString)).toStrictEqual(v[1]);
            expect(stream.getBuffer().slice(RPCStream["streamPosBody"]));
            expect(stream.getWritePos()).toStrictEqual(
                RPCStream["streamPosBody"]
            );
        }
    });

    test("RPCStream_writeBytes", () => {
        for (const v of streamTestSuccessCollections.get("bytes")!) {
            const stream: RPCStream = new RPCStream();
            expect(stream.writeBytes(v[0] as RPCBytes)).toStrictEqual(
                RPCStream.StreamWriteOK
            );
            expect(
                stream.getBuffer().slice(RPCStream["streamPosBody"])
            ).toStrictEqual(v[1]);
        }

        for (const v of streamTestWriteCollections.get("bytes")!) {
            const stream: RPCStream = new RPCStream();
            expect(stream.writeBytes(v[0] as RPCBytes)).toStrictEqual(v[1]);
            expect(stream.getBuffer().slice(RPCStream["streamPosBody"]));
            expect(stream.getWritePos()).toStrictEqual(
                RPCStream["streamPosBody"]
            );
        }
    });

    test("RPCStream_writeArray", () => {
        for (const v of streamTestSuccessCollections.get("array")!) {
            const stream: RPCStream = new RPCStream();
            expect(
                (stream as any).writeArrayInner(v[0] as RPCArray, 64)
            ).toStrictEqual(RPCStream.StreamWriteOK);
            expect(
                stream.getBuffer().slice(RPCStream["streamPosBody"])
            ).toStrictEqual(v[1]);
        }

        for (const v of streamTestWriteCollections.get("array")!) {
            const stream: RPCStream = new RPCStream();
            expect(
                (stream as any).writeArrayInner(v[0] as RPCArray, 64)
            ).toStrictEqual(v[1]);
            expect(stream.getBuffer().slice(RPCStream["streamPosBody"]));
            expect(stream.getWritePos()).toStrictEqual(
                RPCStream["streamPosBody"]
            );
        }
    });

    test("RPCStream_writeMap", () => {
        for (const v of streamTestSuccessCollections.get("map")!) {
            const stream: RPCStream = new RPCStream();
            expect(
                (stream as any).writeMapInner(v[0] as RPCMap, 64)
            ).toStrictEqual(RPCStream.StreamWriteOK);
            expect(
                stream.getBuffer().slice(RPCStream["streamPosBody"])
            ).toStrictEqual(v[1]);
        }

        for (const v of streamTestWriteCollections.get("map")!) {
            const stream: RPCStream = new RPCStream();
            expect(
                (stream as any).writeMapInner(v[0] as RPCMap, 64)
            ).toStrictEqual(v[1]);
            expect(stream.getBuffer().slice(RPCStream["streamPosBody"]));
            expect(stream.getWritePos()).toStrictEqual(
                RPCStream["streamPosBody"]
            );
        }
    });

    test("RPCStream_write", () => {
        for (const key of [
            "null",
            "bool",
            "float64",
            "int64",
            "uint64",
            "string",
            "bytes",
            "array",
            "map",
        ]) {
            for (const v of streamTestSuccessCollections.get(key)!) {
                const stream: RPCStream = new RPCStream();
                expect(stream.write(v[0] as RPCAny)).toStrictEqual(
                    RPCStream.StreamWriteOK
                );
                expect(
                    stream.getBuffer().slice(RPCStream["streamPosBody"])
                ).toStrictEqual(v[1]);
            }
        }

        for (const v of streamTestWriteCollections.get("value")!) {
            const stream: RPCStream = new RPCStream();
            expect(stream.write(v[0] as RPCAny)).toStrictEqual(v[1]);
            expect(stream.getBuffer().slice(RPCStream["streamPosBody"]));
        }
    });

    test("RPCStream_readNull", () => {
        for (const v of streamTestSuccessCollections.get("null")!) {
            // ok
            const stream1: RPCStream = new RPCStream();
            expect(stream1.write(v[0] as RPCAny)).toStrictEqual(
                RPCStream.StreamWriteOK
            );
            expect(stream1.readNull()).toStrictEqual(true);
            expect(stream1.getWritePos()).toStrictEqual(stream1.getReadPos());

            // overflow
            const stream2: RPCStream = new RPCStream();
            expect(stream2.write(v[0] as RPCAny)).toStrictEqual(
                RPCStream.StreamWriteOK
            );
            const writePos: number = stream2.getWritePos();
            for (let idx = RPCStream["streamPosBody"]; idx < writePos; idx++) {
                stream2.setWritePos(idx);
                expect(stream2.readNull()).toStrictEqual(false);
                expect(stream2.getReadPos()).toStrictEqual(
                    RPCStream["streamPosBody"]
                );
            }

            // type not match
            const stream3: RPCStream = new RPCStream();
            (stream3 as any).putByte(13);
            expect(stream3.readNull()).toStrictEqual(false);
            expect(stream3.getReadPos()).toStrictEqual(
                RPCStream["streamPosBody"]
            );
        }
    });

    test("RPCStream_readBool", () => {
        for (const v of streamTestSuccessCollections.get("bool")!) {
            // ok
            const stream1: RPCStream = new RPCStream();
            expect(stream1.write(v[0] as RPCAny)).toStrictEqual(
                RPCStream.StreamWriteOK
            );
            expect(stream1.readBool()).toStrictEqual([v[0], true]);
            expect(stream1.getWritePos()).toStrictEqual(stream1.getReadPos());

            // overflow
            const stream2: RPCStream = new RPCStream();
            expect(stream2.write(v[0] as RPCAny)).toStrictEqual(
                RPCStream.StreamWriteOK
            );
            const writePos: number = stream2.getWritePos();
            for (let idx = RPCStream["streamPosBody"]; idx < writePos; idx++) {
                stream2.setWritePos(idx);
                expect(stream2.readBool()).toStrictEqual([false, false]);
                expect(stream2.getReadPos()).toStrictEqual(
                    RPCStream["streamPosBody"]
                );
            }

            // type not match
            const stream3: RPCStream = new RPCStream();
            (stream3 as any).putByte(13);
            expect(stream3.readBool()).toStrictEqual([false, false]);
            expect(stream3.getReadPos()).toStrictEqual(
                RPCStream["streamPosBody"]
            );
        }
    });

    test("RPCStream_readFloat64", () => {
        for (const v of streamTestSuccessCollections.get("float64")!) {
            // ok
            const stream1: RPCStream = new RPCStream();
            expect(stream1.write(v[0] as RPCAny)).toStrictEqual(
                RPCStream.StreamWriteOK
            );
            expect(stream1.readFloat64()).toStrictEqual([v[0], true]);
            expect(stream1.getWritePos()).toStrictEqual(stream1.getReadPos());

            // overflow
            const stream2: RPCStream = new RPCStream();
            expect(stream2.write(v[0] as RPCAny)).toStrictEqual(
                RPCStream.StreamWriteOK
            );
            const writePos: number = stream2.getWritePos();
            for (let idx = RPCStream["streamPosBody"]; idx < writePos; idx++) {
                stream2.setWritePos(idx);
                expect(stream2.readFloat64()).toStrictEqual([
                    new RPCFloat64(NaN),
                    false,
                ]);
                expect(stream2.getReadPos()).toStrictEqual(
                    RPCStream["streamPosBody"]
                );
            }

            // type not match
            const stream3: RPCStream = new RPCStream();
            (stream3 as any).putByte(13);
            expect(stream3.readFloat64()).toStrictEqual([
                new RPCFloat64(NaN),
                false,
            ]);
            expect(stream3.getReadPos()).toStrictEqual(
                RPCStream["streamPosBody"]
            );
        }
    });

    test("RPCStream_readInt64", () => {
        for (const v of streamTestSuccessCollections.get("int64")!) {
            // ok
            const stream1: RPCStream = new RPCStream();
            expect(stream1.write(v[0] as RPCAny)).toStrictEqual(
                RPCStream.StreamWriteOK
            );
            expect(stream1.readInt64()).toStrictEqual([v[0], true]);
            expect(stream1.getWritePos()).toStrictEqual(stream1.getReadPos());

            // overflow
            const stream2: RPCStream = new RPCStream();
            expect(stream2.write(v[0] as RPCAny)).toStrictEqual(
                RPCStream.StreamWriteOK
            );
            const writePos: number = stream2.getWritePos();
            for (let idx = RPCStream["streamPosBody"]; idx < writePos; idx++) {
                stream2.setWritePos(idx);
                expect(stream2.readInt64()).toStrictEqual([
                    new RPCInt64(NaN),
                    false,
                ]);
                expect(stream2.getReadPos()).toStrictEqual(
                    RPCStream["streamPosBody"]
                );
            }

            // type not match
            const stream3: RPCStream = new RPCStream();
            (stream3 as any).putByte(13);
            expect(stream3.readInt64()).toStrictEqual([
                new RPCInt64(NaN),
                false,
            ]);
            expect(stream3.getReadPos()).toStrictEqual(
                RPCStream["streamPosBody"]
            );
        }
    });

    test("RPCStream_readUint64", () => {
        for (const v of streamTestSuccessCollections.get("uint64")!) {
            // ok
            const stream1: RPCStream = new RPCStream();
            expect(stream1.write(v[0] as RPCAny)).toStrictEqual(
                RPCStream.StreamWriteOK
            );
            expect(stream1.readUint64()).toStrictEqual([v[0], true]);
            expect(stream1.getWritePos()).toStrictEqual(stream1.getReadPos());

            // overflow
            const stream2: RPCStream = new RPCStream();
            expect(stream2.write(v[0] as RPCAny)).toStrictEqual(
                RPCStream.StreamWriteOK
            );
            const writePos: number = stream2.getWritePos();
            for (let idx = RPCStream["streamPosBody"]; idx < writePos; idx++) {
                stream2.setWritePos(idx);
                expect(stream2.readUint64()).toStrictEqual([
                    new RPCUint64(NaN),
                    false,
                ]);
                expect(stream2.getReadPos()).toStrictEqual(
                    RPCStream["streamPosBody"]
                );
            }

            // type not match
            const stream3: RPCStream = new RPCStream();
            (stream3 as any).putByte(13);
            expect(stream3.readUint64()).toStrictEqual([
                new RPCUint64(NaN),
                false,
            ]);
            expect(stream3.getReadPos()).toStrictEqual(
                RPCStream["streamPosBody"]
            );
        }
    });

    test("RPCStream_readString", () => {
        for (const v of streamTestSuccessCollections.get("string")!) {
            // ok
            const stream1: RPCStream = new RPCStream();
            expect(stream1.write(v[0] as RPCAny)).toStrictEqual(
                RPCStream.StreamWriteOK
            );
            expect(stream1.readString()).toStrictEqual([v[0], true]);
            expect(stream1.getWritePos()).toStrictEqual(stream1.getReadPos());

            // overflow
            const stream2: RPCStream = new RPCStream();
            expect(stream2.write(v[0] as RPCAny)).toStrictEqual(
                RPCStream.StreamWriteOK
            );
            const writePos: number = stream2.getWritePos();
            for (let idx = RPCStream["streamPosBody"]; idx < writePos; idx++) {
                stream2.setWritePos(idx);
                expect(stream2.readString()).toStrictEqual(["", false]);
                expect(stream2.getReadPos()).toStrictEqual(
                    RPCStream["streamPosBody"]
                );
            }

            // type not match
            const stream3: RPCStream = new RPCStream();
            (stream3 as any).putByte(13);
            expect(stream3.readString()).toStrictEqual(["", false]);
            expect(stream3.getReadPos()).toStrictEqual(
                RPCStream["streamPosBody"]
            );

            // read tail is not zero
            const stream4: RPCStream = new RPCStream();
            expect(stream4.write(v[0] as RPCAny)).toStrictEqual(
                RPCStream.StreamWriteOK
            );
            stream4.setWritePos(stream4.getWritePos() - 1);
            (stream4 as any).putByte(1);
            expect(stream4.readString()).toStrictEqual(["", false]);
            expect(stream4.getReadPos()).toStrictEqual(
                RPCStream["streamPosBody"]
            );
        }

        // read string utf8 error
        const stream5: RPCStream = new RPCStream();
        (stream5 as any).putBytes(
            new Uint8Array([
                0x9e, 0xff, 0x9f, 0x98, 0x80, 0xe2, 0x98, 0x98, 0xef, 0xb8,
                0x8f, 0xf0, 0x9f, 0x80, 0x84, 0xef, 0xb8, 0x8f, 0xc2, 0xa9,
                0xef, 0xb8, 0x8f, 0xf0, 0x9f, 0x8c, 0x88, 0xf0, 0x9f, 0x8e,
                0xa9, 0x00,
            ])
        );
        expect(stream5.readString()).toStrictEqual(["", false]);
        expect(stream5.getReadPos()).toStrictEqual(RPCStream["streamPosBody"]);

        // read string utf8 error
        const stream6: RPCStream = new RPCStream();
        (stream6 as any).putBytes(
            new Uint8Array([
                0xbf, 0x6d, 0x00, 0x00, 0x00, 0xff, 0x9f, 0x98, 0x80, 0xe2,
                0x98, 0x98, 0xef, 0xb8, 0x8f, 0xf0, 0x9f, 0x80, 0x84, 0xef,
                0xb8, 0x8f, 0xc2, 0xa9, 0xef, 0xb8, 0x8f, 0xf0, 0x9f, 0x8c,
                0x88, 0xf0, 0x9f, 0x8e, 0xa9, 0xf0, 0x9f, 0x98, 0x9b, 0xf0,
                0x9f, 0x91, 0xa9, 0xe2, 0x80, 0x8d, 0xf0, 0x9f, 0x91, 0xa9,
                0xe2, 0x80, 0x8d, 0xf0, 0x9f, 0x91, 0xa6, 0xf0, 0x9f, 0x91,
                0xa8, 0xe2, 0x80, 0x8d, 0xf0, 0x9f, 0x91, 0xa9, 0xe2, 0x80,
                0x8d, 0xf0, 0x9f, 0x91, 0xa6, 0xe2, 0x80, 0x8d, 0xf0, 0x9f,
                0x91, 0xa6, 0xf0, 0x9f, 0x91, 0xbc, 0xf0, 0x9f, 0x97, 0xa3,
                0xf0, 0x9f, 0x91, 0x91, 0xf0, 0x9f, 0x91, 0x9a, 0xf0, 0x9f,
                0x91, 0xb9, 0xf0, 0x9f, 0x91, 0xba, 0xf0, 0x9f, 0x8c, 0xb3,
                0xf0, 0x9f, 0x8d, 0x8a, 0x00,
            ])
        );
        expect(stream6.readString()).toStrictEqual(["", false]);
        expect(stream6.getReadPos()).toStrictEqual(RPCStream["streamPosBody"]);

        // read string length error
        const stream7: RPCStream = new RPCStream();
        (stream7 as any).putBytes(
            new Uint8Array([
                0xbf, 0x2f, 0x00, 0x00, 0x00, 0x61, 0x61, 0x61, 0x61, 0x61,
                0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x00,
            ])
        );
        expect(stream7.readString()).toStrictEqual(["", false]);
        expect(stream7.getReadPos()).toStrictEqual(RPCStream["streamPosBody"]);
    });

    test("RPCStream_readBytes", () => {
        for (const v of streamTestSuccessCollections.get("bytes")!) {
            // ok
            const stream1: RPCStream = new RPCStream();
            expect(stream1.write(v[0] as RPCAny)).toStrictEqual(
                RPCStream.StreamWriteOK
            );
            expect(stream1.readBytes()).toStrictEqual([v[0], true]);
            expect(stream1.getWritePos()).toStrictEqual(stream1.getReadPos());

            // overflow
            const stream2: RPCStream = new RPCStream();
            expect(stream2.write(v[0] as RPCAny)).toStrictEqual(
                RPCStream.StreamWriteOK
            );
            const writePos: number = stream2.getWritePos();
            for (let idx = RPCStream["streamPosBody"]; idx < writePos; idx++) {
                stream2.setWritePos(idx);
                expect(stream2.readBytes()).toStrictEqual([
                    new Uint8Array([]),
                    false,
                ]);
                expect(stream2.getReadPos()).toStrictEqual(
                    RPCStream["streamPosBody"]
                );
            }

            // type not match
            const stream3: RPCStream = new RPCStream();
            (stream3 as any).putByte(13);
            expect(stream3.readBytes()).toStrictEqual([
                new Uint8Array([]),
                false,
            ]);
            expect(stream3.getReadPos()).toStrictEqual(
                RPCStream["streamPosBody"]
            );
        }

        // read bytes length error
        const stream4: RPCStream = new RPCStream();
        (stream4 as any).putBytes(
            new Uint8Array([
                0xff, 0x2f, 0x00, 0x00, 0x00, 0x61, 0x61, 0x61, 0x61, 0x61,
                0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
                0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61, 0x61,
            ])
        );
        expect(stream4.readBytes()).toStrictEqual([new Uint8Array([]), false]);
        expect(stream4.getReadPos()).toStrictEqual(RPCStream["streamPosBody"]);
    });

    test("RPCStream_readArray", () => {
        for (const v of streamTestSuccessCollections.get("array")!) {
            // ok
            const stream1: RPCStream = new RPCStream();
            expect(stream1.write(v[0] as RPCAny)).toStrictEqual(
                RPCStream.StreamWriteOK
            );
            expect(stream1.readArray()).toStrictEqual([v[0], true]);
            expect(stream1.getWritePos()).toStrictEqual(stream1.getReadPos());

            // overflow
            const stream2: RPCStream = new RPCStream();
            expect(stream2.write(v[0] as RPCAny)).toStrictEqual(
                RPCStream.StreamWriteOK
            );
            const writePos: number = stream2.getWritePos();
            for (let idx = RPCStream["streamPosBody"]; idx < writePos; idx++) {
                stream2.setWritePos(idx);
                expect(stream2.readArray()).toStrictEqual([[], false]);
                expect(stream2.getReadPos()).toStrictEqual(
                    RPCStream["streamPosBody"]
                );
            }

            // type not match
            const stream3: RPCStream = new RPCStream();
            (stream3 as any).putByte(13);
            expect(stream3.readArray()).toStrictEqual([[], false]);
            expect(stream3.getReadPos()).toStrictEqual(
                RPCStream["streamPosBody"]
            );

            // error in stream
            const stream4: RPCStream = new RPCStream();
            expect(stream4.write(v[0] as RPCAny)).toStrictEqual(
                RPCStream.StreamWriteOK
            );
            if ((v[0] as Array<RPCAny>).length > 0) {
                stream4.setWritePos(stream4.getWritePos() - 1);
                (stream4 as any).putByte(13);
                expect(stream4.readArray()).toStrictEqual([[], false]);
                expect(stream4.getReadPos()).toStrictEqual(
                    RPCStream["streamPosBody"]
                );
            }

            // error in stream
            const stream5: RPCStream = new RPCStream();
            (stream5 as any).putBytes(
                new Uint8Array([0x41, 0x07, 0x00, 0x00, 0x00, 0x02, 0x02])
            );
            expect(stream5.readArray()).toStrictEqual([[], false]);
            expect(stream5.getReadPos()).toStrictEqual(
                RPCStream["streamPosBody"]
            );
        }
    });

    test("RPCStream_readMap", () => {
        for (const v of streamTestSuccessCollections.get("map")!) {
            // ok
            const stream1: RPCStream = new RPCStream();
            expect(stream1.write(v[0] as RPCAny)).toStrictEqual(
                RPCStream.StreamWriteOK
            );
            expect(stream1.readMap()).toStrictEqual([v[0], true]);
            expect(stream1.getWritePos()).toStrictEqual(stream1.getReadPos());

            // overflow
            const stream2: RPCStream = new RPCStream();
            expect(stream2.write(v[0] as RPCAny)).toStrictEqual(
                RPCStream.StreamWriteOK
            );
            const writePos: number = stream2.getWritePos();
            for (let idx = RPCStream["streamPosBody"]; idx < writePos; idx++) {
                stream2.setWritePos(idx);
                expect(stream2.readMap()).toStrictEqual([
                    new Map<string, RPCAny>(),
                    false,
                ]);
                expect(stream2.getReadPos()).toStrictEqual(
                    RPCStream["streamPosBody"]
                );
            }

            // type not match
            const stream3: RPCStream = new RPCStream();
            (stream3 as any).putByte(13);
            expect(stream3.readMap()).toStrictEqual([
                new Map<string, RPCAny>(),
                false,
            ]);
            expect(stream3.getReadPos()).toStrictEqual(
                RPCStream["streamPosBody"]
            );

            // error in stream
            const stream4: RPCStream = new RPCStream();
            expect(stream4.write(v[0] as RPCAny)).toStrictEqual(
                RPCStream.StreamWriteOK
            );
            if ((v[0] as Array<RPCAny>).length > 0) {
                stream4.setWritePos(stream4.getWritePos() - 1);
                (stream4 as any).putByte(13);
                expect(stream4.readMap()).toStrictEqual([
                    new Map<string, RPCAny>(),
                    false,
                ]);
                expect(stream4.getReadPos()).toStrictEqual(
                    RPCStream["streamPosBody"]
                );
            }

            // error in stream, length error
            const stream5: RPCStream = new RPCStream();
            (stream5 as any).putBytes(
                new Uint8Array([
                    0x61, 0x0a, 0x00, 0x00, 0x00, 0x81, 0x31, 0x00, 0x02, 0x02,
                ])
            );
            expect(stream5.readMap()).toStrictEqual([
                new Map<string, RPCAny>(),
                false,
            ]);
            expect(stream5.getReadPos()).toStrictEqual(
                RPCStream["streamPosBody"]
            );

            // error in stream, key error
            const stream6: RPCStream = new RPCStream();
            expect(stream1.write(v[0] as RPCAny)).toStrictEqual(
                RPCStream.StreamWriteOK
            );
            const mapSize: number = (v[0] as Map<string, RPCAny>).size;
            const wPos: number = stream6.getWritePos();
            if (mapSize > 30) {
                stream6.setWritePos(RPCStream["streamPosBody"] + 9);
                (stream6 as any).putByte(13);
                stream6.setWritePos(wPos);
                expect(stream6.readMap()).toStrictEqual([
                    new Map<string, RPCAny>(),
                    false,
                ]);
                expect(stream6.getReadPos()).toStrictEqual(
                    RPCStream["streamPosBody"]
                );
            } else if (mapSize > 0) {
                stream6.setWritePos(RPCStream["streamPosBody"] + 5);
                (stream6 as any).putByte(13);
                stream6.setWritePos(wPos);
                expect(stream6.readMap()).toStrictEqual([
                    new Map<string, RPCAny>(),
                    false,
                ]);
                expect(stream6.getReadPos()).toStrictEqual(
                    RPCStream["streamPosBody"]
                );
            }
        }
    });

    test("RPCStream_read", () => {
        for (const key of [
            "null",
            "bool",
            "float64",
            "int64",
            "uint64",
            "string",
            "bytes",
            "array",
            "map",
        ]) {
            for (const v of streamTestSuccessCollections.get(key)!) {
                const stream: RPCStream = new RPCStream();
                (stream as any).putBytes(v[1]);
                expect(stream.read()).toStrictEqual([v[0], true]);
            }
        }

        const stream1: RPCStream = new RPCStream();
        (stream1 as any).putByte(12);
        expect(stream1.read()).toStrictEqual([null, false]);

        const stream2: RPCStream = new RPCStream();
        (stream2 as any).putByte(13);
        expect(stream2.read()).toStrictEqual([null, false]);

        // error in stream
        const stream3: RPCStream = new RPCStream();
        (stream3 as any).putBytes(
            new Uint8Array([0x41, 0x07, 0x00, 0x00, 0x00, 0x02, 0x02])
        );
        expect(stream3.read()).toStrictEqual([null, false]);
    });
});

/* eslint-enable @typescript-eslint/no-explicit-any */
/* eslint-enable @typescript-eslint/no-non-null-assertion */
