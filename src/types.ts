function readNumberFromOriginalCode(bytes: Uint8Array): number {
    return (bytes[6] & 0x1F) * 281474976710656 +
        (bytes[5] & 0xFF) * 1099511627776 +
        (bytes[4] & 0xFF) * 4294967296 +
        (bytes[3] & 0xFF) * 16777216 +
        (bytes[2] & 0xFF) * 65536 +
        (bytes[1] & 0xFF) * 256 +
        (bytes[0] & 0xFF)
}

function readNumberFromComplementCode(bytes: Uint8Array): number {
    return (~bytes[6] & 0x1F) * 281474976710656 +
        (~bytes[5] & 0xFF) * 1099511627776 +
        (~bytes[4] & 0xFF) * 4294967296 +
        (~bytes[3] & 0xFF) * 16777216 +
        (~bytes[2] & 0xFF) * 65536 +
        (~bytes[1] & 0xFF) * 256 +
        (~bytes[0] & 0xFF)
}

export type RPCBool = boolean

export function toRPCInt64(v: number): RPCInt64 {
    return new RPCInt64(v)
}

export class RPCInt64 {
    public static fromBytes(bytes: Uint8Array): RPCInt64 {
        if (bytes.byteLength === 8) {
            // value > 0 and is a safety integer
            if (bytes[7] === 128 && (bytes[6] & 0xE0) === 0) {
                return new RPCInt64(readNumberFromOriginalCode(bytes))
            }

            // value < 0 and is a safety integer
            if (bytes[7] === 127 && (bytes[6] & 0xE0) === 0xE0) {
                const v = readNumberFromComplementCode(bytes)
                // v >= -9007199254740991
                if (v < 9007199254740991) {
                    return new RPCInt64(-v - 1)
                }
            }

            return new RPCInt64(NaN).setBytes(bytes)
        } else {
            return new RPCInt64(NaN)
        }
    }

    private readonly value: number
    private bytes: Uint8Array | null

    public constructor(v: number) {
        this.value = Number.isSafeInteger(v) ? v : NaN
        this.bytes = null
    }

    public toNumber(): number {
        return this.value
    }

    public getBytes(): Uint8Array | null {
        return this.bytes
    }

    private setBytes(bytes: Uint8Array): RPCInt64 {
        this.bytes = new Uint8Array(8)
        for (let i = 0; i < 8; i++) {
            this.bytes[i] = bytes[i]
        }
        return this
    }
}

export function toRPCUint64(v: number): RPCUint64 {
    return new RPCUint64(v)
}

export class RPCUint64 {
    public static fromBytes(bytes: Uint8Array): RPCUint64 {
        if (bytes.byteLength === 8) {
            // value > 0 and is a safety integer
            if (bytes[7] === 0 && (bytes[6] & 0xE0) === 0) {
                return new RPCUint64(readNumberFromOriginalCode(bytes))
            }

            return new RPCUint64(NaN).setBytes(bytes)
        } else {
            return new RPCUint64(NaN)
        }
    }

    private readonly value: number
    private bytes: Uint8Array | null

    public constructor(v: number) {
        this.value = (Number.isSafeInteger(v) && v >= 0) ? v : NaN
        this.bytes = null
    }

    public toNumber(): number {
        return this.value
    }

    public getBytes(): Uint8Array | null {
        return this.bytes
    }

    private setBytes(bytes: Uint8Array): RPCUint64 {
        this.bytes = new Uint8Array(8)
        for (let i = 0; i < 8; i++) {
            this.bytes[i] = bytes[i]
        }
        return this
    }
}

export function toRPCFloat64(v: number): RPCFloat64 {
    return new RPCFloat64(v)
}

export class RPCFloat64 {
    private readonly value: number

    public constructor(v: number) {
        this.value = v
    }

    public toNumber(): number {
        return this.value
    }
}

// eslint-disable-next-line
export function toRPCMap(value: any): RPCMap {
    const ret = new Map<string, RPCAny>()

    if (typeof value === "object") {
        for (const key in value) {
            if (Object.prototype.hasOwnProperty.call(value, key)) {
                ret.set(key, value[key])
            }
        }
    }

    return ret
}

export type RPCString = string

export type RPCBytes = Uint8Array

export type RPCArray = Array<RPCAny>

export type RPCMap = Map<string, RPCAny>

export type RPCAny =
    RPCBool |
    RPCInt64 |
    RPCUint64 |
    RPCFloat64 |
    RPCString |
    RPCBytes |
    RPCArray |
    RPCMap |
    null
