import {
    RPCAny,
    RPCArray,
    RPCBool,
    RPCBytes,
    RPCFloat64,
    RPCInt64, RPCMap,
    RPCString,
    RPCUint64
} from "./types"
import {Ieee754} from "./ieee754"
import {stringToUTF8, utf8ToString} from "./utils"

export class RPCStream {
    private static readonly streamVersion = 1

    private static readonly streamPosVersion = 0
    private static readonly streamPosLength = 4
    private static readonly streamPosCheckSum = 8
    private static readonly streamPosCallbackID = 38
    private static readonly streamPosBody = 48

    public static readonly StreamWriteOK = ""
    public static readonly StreamWriteOverflow = " overflows"
    public static readonly StreamWriteUnsupportedValue = " is not supported"

    public static readonly ControlStreamConnectRequest = 1
    public static readonly ControlStreamConnectResponse = 2
    public static readonly ControlStreamPing = 3
    public static readonly ControlStreamPong = 4

    private static readonly zero8Bytes = new Uint8Array(8)

    private data: Uint8Array;
    private readPos: number;
    private writePos: number;

    public constructor() {
        this.data = new Uint8Array(1024)
        this.data[0] = RPCStream.streamVersion
        this.readPos = RPCStream.streamPosBody
        this.writePos = RPCStream.streamPosBody
    }

    private getUint32(pos: number): [number, boolean] {
        if (
            Number.isSafeInteger(pos + 4) &&
            pos > 0 &&
            pos + 4 <= this.writePos
        ) {
            return [
                (this.data[pos + 3] & 0xFF) * 16777216 +
                (this.data[pos + 2] & 0xFF) * 65536 +
                (this.data[pos + 1] & 0xFF) * 256 +
                (this.data[pos] & 0xFF),
                true,
            ]
        } else {
            return [0, false]
        }
    }

    private setUint32(pos: number, value: number): boolean {
        if (Number.isSafeInteger(pos + 4) && pos > 0 && value < 4294967296) {
            this.enlarge(pos + 4)
            this.data[pos] = value
            value >>>= 8
            this.data[pos + 1] = value
            value >>>= 8
            this.data[pos + 2] = value
            value >>>= 8
            this.data[pos + 3] = value
            return true
        }

        return false
    }

    private enlarge(size: number): void {
        if (size > this.data.byteLength) {
            const newData = new Uint8Array(size + 1024)
            newData.set(this.data, 0)
            this.data = newData
        }
    }

    private putByte(value: number): void {
        this.enlarge(this.writePos + 1)
        this.data[this.writePos] = value
        this.writePos++
    }

    public putBytesTo(value: Uint8Array, pos: number): boolean {
        if (!Number.isSafeInteger(pos)) {
            return false
        }

        if (pos + value.length < RPCStream.streamPosBody) {
            return false
        }

        this.writePos = pos
        this.putBytes(value)
        return true
    }

    public putBytes(value: Uint8Array): void {
        this.enlarge(this.writePos + value.byteLength)
        for (const n of value) {
            this.data[this.writePos] = n
            this.writePos++
        }
    }

    private peekByte(): number {
        if (this.readPos < this.writePos) {
            return this.data[this.readPos]
        } else {
            return -1
        }
    }

    private readNBytes(n: number): Uint8Array {
        if (n > 0 && Number.isSafeInteger(n)) {
            const end = this.readPos + n
            if (end <= this.writePos) {
                const ret = this.data.slice(this.readPos, end)
                this.readPos = end
                return ret
            }
        }
        return new Uint8Array(0)
    }

    private getLength(): number {
        return this.getUint32(RPCStream.streamPosLength)[0]
    }

    public getVersion(): number {
        return this.data[RPCStream.streamPosVersion]
    }

    private getCheckSum(): Uint8Array {
        const ret = new Uint8Array(8)
        const blockSize = Math.ceil(this.writePos / 8) * 8

        for (let i = this.writePos; i < blockSize; i++) {
            this.data[i] = 0
        }

        for (let i = 0; i < blockSize; i++) {
            ret[i % 8] ^= this.data[i]
        }

        return ret
    }

    public buildStreamCheck(): void {
        this.setUint32(RPCStream.streamPosLength, this.writePos)
        this.data.set(RPCStream.zero8Bytes, RPCStream.streamPosCheckSum)
        this.data.set(this.getCheckSum(), RPCStream.streamPosCheckSum)
    }

    public checkStream(): boolean {
        if (this.getLength() !== this.writePos) {
            return false
        }

        const checkBytes = this.getCheckSum()
        for (let i = 0; i < 8; i++) {
            if (checkBytes[i] !== 0) {
                return false
            }
        }

        return true
    }

    public getReadPos(): number {
        return this.readPos
    }

    public setReadPos(readPos: number): boolean {
        if (readPos >= RPCStream.streamPosBody && readPos <= this.writePos) {
            this.readPos = readPos
            return true
        } else {
            return false
        }
    }

    public getWritePos(): number {
        return this.writePos
    }

    public setWritePos(writePos: number): boolean {
        if (writePos >= RPCStream.streamPosBody) {
            this.enlarge(writePos)
            this.writePos = writePos
            return true
        } else {
            return false
        }
    }

    public getBuffer(): Uint8Array {
        return this.data.slice(0, this.writePos)
    }

    private writeUint64Unsafe(v: number): void {
        this.putByte(v)
        v = (v - (v & 0xFF)) / 256
        this.putByte(v)
        v = (v - (v & 0xFF)) / 256
        this.putByte(v)
        v = (v - (v & 0xFF)) / 256
        this.putByte(v)
        v >>>= 8
        this.putByte(v)
        v >>>= 8
        this.putByte(v)
        this.putByte((v >>> 8) & 0x1F)
        this.putByte(0x00)
    }

    public getCallbackID(): number {
        const data = this.data.slice(
            RPCStream.streamPosCallbackID,
            RPCStream.streamPosCallbackID + 8,
        )
        return RPCUint64.fromBytes(data).toNumber()
    }

    public setCallbackID(id: number): boolean {
        if (Number.isSafeInteger(id) && id >= 0) {
            const saveWritePos = this.writePos
            this.writePos = RPCStream.streamPosCallbackID
            this.writeUint64Unsafe(id)
            this.writePos = saveWritePos
            return true
        } else {
            return false
        }
    }

    public canRead(): boolean {
        return this.readPos < this.writePos
    }

    public isReadFinish(): boolean {
        return this.readPos === this.writePos
    }

    public writeNull(): string {
        this.putByte(1)
        return RPCStream.StreamWriteOK
    }

    public writeBool(v: RPCBool): string {
        if (v === null || v === undefined) {
            return RPCStream.StreamWriteUnsupportedValue
        }

        if (v) {
            this.putByte(2)
        } else {
            this.putByte(3)
        }

        return RPCStream.StreamWriteOK
    }

    public writeFloat64(value: RPCFloat64): string {
        if (value === null || value === undefined) {
            return RPCStream.StreamWriteUnsupportedValue
        }

        const v = value.toNumber()
        if (v === 0) {
            this.putByte(4)
            return RPCStream.StreamWriteOK
        } else if (!Number.isNaN(v)) {
            this.putByte(5)
            const arr = new Uint8Array(8)
            Ieee754.write(arr, v, 0, true, 52, 8)
            this.putBytes(arr)
            return RPCStream.StreamWriteOK
        } else {
            return RPCStream.StreamWriteUnsupportedValue
        }
    }

    public writeInt64(value: RPCInt64): string {
        if (value === null || value === undefined) {
            return RPCStream.StreamWriteUnsupportedValue
        }

        let v = value.toNumber()
        if (v > -8 && v < 33) {
            this.putByte(v + 21)
            return RPCStream.StreamWriteOK
        } else if (v >= -32768 && v < 32768) {
            v += 32768
            this.putByte(6)
            this.putByte(v)
            this.putByte(v >>> 8)
            return RPCStream.StreamWriteOK
        } else if (v >= -2147483648 && v < 2147483648) {
            v += 2147483648
            this.putByte(7)
            this.putByte(v)
            v >>>= 8
            this.putByte(v)
            v >>>= 8
            this.putByte(v)
            this.putByte(v >>> 8)
            return RPCStream.StreamWriteOK
        } else if (Number.isSafeInteger(v)) {
            const negative = v < 0
            if (negative) {
                v += 9007199254740992
            }
            this.putByte(8)
            this.putByte(v)
            v = (v - (v & 0xFF)) / 256
            this.putByte(v)
            v = (v - (v & 0xFF)) / 256
            this.putByte(v)
            v = (v - (v & 0xFF)) / 256
            this.putByte(v)
            v >>>= 8
            this.putByte(v)
            v >>>= 8
            this.putByte(v)
            if (negative) {
                this.putByte((v >>> 8) | 0xE0)
                this.putByte(0x7F)
            } else {
                this.putByte((v >>> 8) & 0x1F)
                this.putByte(0x80)
            }
            return RPCStream.StreamWriteOK
        } else {
            const bytes = value.getBytes()
            if (bytes != null && bytes.byteLength === 8) {
                this.putByte(8)
                this.putBytes(bytes)
                return RPCStream.StreamWriteOK
            } else {
                return RPCStream.StreamWriteUnsupportedValue
            }
        }
    }

    public writeUint64(value: RPCUint64): string {
        if (value === null || value === undefined) {
            return RPCStream.StreamWriteUnsupportedValue
        }

        let v = value.toNumber()

        if (v < 10) {
            this.putByte(v + 54)
            return RPCStream.StreamWriteOK
        } else if (v < 65536) {
            this.putByte(9)
            this.putByte(v)
            this.putByte(v >>> 8)
            return RPCStream.StreamWriteOK
        } else if (v < 4294967296) {
            this.putByte(10)
            this.putByte(v)
            v >>>= 8
            this.putByte(v)
            v >>>= 8
            this.putByte(v)
            this.putByte(v >>> 8)
            return RPCStream.StreamWriteOK
        } else if (Number.isSafeInteger(v)) {
            this.putByte(11)
            this.writeUint64Unsafe(v)
            return RPCStream.StreamWriteOK
        } else {
            const bytes = value.getBytes()
            if (bytes != null && bytes.byteLength == 8) {
                this.putByte(11)
                this.putBytes(bytes)
                return RPCStream.StreamWriteOK
            } else {
                return RPCStream.StreamWriteUnsupportedValue
            }
        }
    }

    public writeString(v: RPCString): string {
        if (v === null || v === undefined) {
            return RPCStream.StreamWriteUnsupportedValue
        }

        if (v === "") {
            this.putByte(128)
            return RPCStream.StreamWriteOK
        }

        const strBuffer = stringToUTF8(v)
        const length = strBuffer.length

        if (length <= 0) {
            // utf8 error
            return RPCStream.StreamWriteUnsupportedValue
        } else if (length < 63) {
            // write header
            this.putByte(length + 128)
            // write body
            this.putBytes(strBuffer)
            // write tail
            this.putByte(0)
            return RPCStream.StreamWriteOK
        } else {
            // write header
            this.putByte(191)
            // write length
            this.setUint32(this.writePos, length + 6)
            this.writePos += 4
            // write body
            this.putBytes(strBuffer)
            // write tail
            this.putByte(0)
            return RPCStream.StreamWriteOK
        }
    }

    public writeBytes(v: RPCBytes): string {
        if (v === null || v === undefined) {
            return RPCStream.StreamWriteUnsupportedValue
        }

        const length = v.byteLength

        if (length == 0) {
            this.putByte(192)
            return RPCStream.StreamWriteOK
        } else if (length < 63) {
            // write header
            this.putByte(length + 192)
            // write body
            this.putBytes(v)
            return RPCStream.StreamWriteOK
        } else {
            // write header
            this.putByte(255)
            // write length
            this.setUint32(this.writePos, length + 5)
            this.writePos += 4
            // write body
            this.putBytes(v)
            return RPCStream.StreamWriteOK
        }
    }

    private writeArrayInner(v: RPCArray, depth: number): string {
        if (v === null || v === undefined) {
            return RPCStream.StreamWriteUnsupportedValue
        }

        const arrLen = v.length
        if (arrLen === 0) {
            this.putByte(64)
            return RPCStream.StreamWriteOK
        }

        const startPos = this.writePos
        if (arrLen > 30) {
            this.putByte(95)
        } else {
            this.putByte(arrLen + 64)
        }

        this.writePos += 4

        if (arrLen > 30) {
            this.setUint32(this.writePos, arrLen)
            this.writePos += 4
        }

        for (let i = 0; i < arrLen; i++) {
            const errCode = this.writeInner(v[i], depth - 1)
            if (errCode !== RPCStream.StreamWriteOK) {
                this.setWritePos(startPos)
                return `[${i}]${errCode}`
            }
        }

        // write total length
        this.setUint32(startPos + 1, this.writePos - startPos)

        return RPCStream.StreamWriteOK
    }

    private writeMapInner(v: RPCMap, depth: number): string {
        if (v === null || v === undefined) {
            return RPCStream.StreamWriteUnsupportedValue
        }

        const mapLen = v.size
        if (mapLen === 0) {
            this.putByte(96)
            return RPCStream.StreamWriteOK
        }
        const startPos = this.writePos
        if (mapLen > 30) {
            this.putByte(127)
        } else {
            this.putByte(mapLen + 96)
        }
        this.writePos += 4
        if (mapLen > 30) {
            this.setUint32(this.writePos, mapLen)
            this.writePos += 4
        }

        for (const [key, value] of v) {
            const errCode1 = this.writeString(key)
            if (errCode1 !== RPCStream.StreamWriteOK) {
                this.setWritePos(startPos)
                return `[${key}]${errCode1}`
            }
            const errCode2 = this.writeInner(value, depth - 1)
            if (errCode2 !== RPCStream.StreamWriteOK) {
                this.setWritePos(startPos)
                return `["${key}"]${errCode2}`
            }
        }

        // write total length
        this.setUint32(startPos + 1, this.writePos - startPos)

        return RPCStream.StreamWriteOK
    }

    public write(v: RPCAny): string {
        const reason = this.writeInner(v, 64)

        if (reason === RPCStream.StreamWriteOK) {
            return RPCStream.StreamWriteOK
        } else {
            return "value" + reason
        }
    }

    private writeInner(v: RPCAny, depth: number): string {
        if (v === undefined) {
            return RPCStream.StreamWriteUnsupportedValue
        }

        if (depth <= 0) {
            return RPCStream.StreamWriteOverflow
        }

        if (v === null) {
            return this.writeNull()
        }

        switch (typeof v) {
        case "boolean":
            return this.writeBool(v)
        case "string":
            return this.writeString(v)
        case "object":
            if (v instanceof RPCInt64) {
                return this.writeInt64(v)
            } else if (v instanceof RPCUint64) {
                return this.writeUint64(v)
            } else if (v instanceof RPCFloat64) {
                return this.writeFloat64(v)
            } else if (v instanceof Uint8Array) {
                return this.writeBytes(v)
            } else if (v instanceof Array) {
                return this.writeArrayInner(v, depth)
            } else if (v instanceof Map) {
                return this.writeMapInner(v, depth)
            } else {
                return RPCStream.StreamWriteUnsupportedValue
            }
        default:
            return RPCStream.StreamWriteUnsupportedValue
        }
    }

    public readNull(): boolean {
        if (this.canRead() && this.peekByte() === 1) {
            this.readPos++
            return true
        } else {
            return false
        }
    }

    public readBool(): [RPCBool, boolean] {
        const ch = this.peekByte()

        if (this.canRead()) {
            if (ch === 2) {
                this.readPos++
                return [true, true]
            } else if (ch === 3) {
                this.readPos++
                return [false, true]
            } else {
                return [false, false]
            }
        }

        return [false, false]
    }

    public readFloat64(): [RPCFloat64, boolean] {
        const ch = this.peekByte()
        if (ch === 4) {
            if (this.canRead()) {
                this.readPos++
                return [new RPCFloat64(0), true]
            }
        } else if (ch === 5) {
            const bytes = this.readNBytes(9)
            if (bytes.byteLength === 9) {
                const v = Ieee754.read(bytes, 1, true, 52, 8)
                return [new RPCFloat64(v), true]
            }
        }

        return [new RPCFloat64(NaN), false]
    }

    public readInt64(): [RPCInt64, boolean] {
        const ch = this.peekByte()

        if (ch > 13 && ch < 54) {
            if (this.canRead()) {
                this.readPos++
                return [new RPCInt64(ch - 21), true]
            }
        } else {
            switch (ch) {
            case 6: {
                const bytes = this.readNBytes(3)
                if (bytes.byteLength === 3) {
                    const v = (bytes[2] & 0xFF) * 256 +
                            (bytes[1] & 0xFF) -
                            32768
                    return [new RPCInt64(v), true]
                }
                break
            }
            case 7: {
                const bytes = this.readNBytes(5)
                if (bytes.byteLength === 5) {
                    const v = (bytes[4] & 0xFF) * 16777216 +
                            (bytes[3] & 0xFF) * 65536 +
                            (bytes[2] & 0xFF) * 256 +
                            (bytes[1] & 0xFF) -
                            2147483648
                    return [new RPCInt64(v), true]
                }
                break
            }
            case 8: {
                const bytes = this.readNBytes(9)
                if (bytes.byteLength === 9) {
                    return [RPCInt64.fromBytes(bytes.slice(1)), true]
                }
                break
            }
            default:
                break
            }
        }

        return [new RPCInt64(NaN), false]
    }

    public readUint64(): [RPCUint64, boolean] {
        const ch = this.peekByte()

        if (ch > 53 && ch < 64) {
            if (this.canRead()) {
                this.readPos++
                return [new RPCUint64(ch - 54), true]
            }
        } else {
            switch (ch) {
            case 9: {
                const bytes = this.readNBytes(3)
                if (bytes.byteLength === 3) {
                    const v = (bytes[2] & 0xFF) * 256 +
                            (bytes[1] & 0xFF)
                    return [new RPCUint64(v), true]
                }
                break
            }
            case 10: {
                const bytes = this.readNBytes(5)
                if (bytes.byteLength === 5) {
                    const v = (bytes[4] & 0xFF) * 16777216 +
                            (bytes[3] & 0xFF) * 65536 +
                            (bytes[2] & 0xFF) * 256 +
                            (bytes[1] & 0xFF)
                    return [new RPCUint64(v), true]
                }
                break
            }
            case 11: {
                const bytes = this.readNBytes(9)
                if (bytes.byteLength === 9) {
                    return [RPCUint64.fromBytes(bytes.slice(1)), true]
                }
                break
            }
            default:
                break
            }
        }

        return [new RPCUint64(NaN), false]
    }

    public readString(): [RPCString, boolean] {
        const ch = this.peekByte()
        const oldReadPos = this.readPos
        let strLen = 0

        if (ch === 128) {
            if (this.canRead()) {
                this.readPos++
                return ["", true]
            }
        } else if (ch > 128 && ch < 191) {
            strLen = ch - 128
            this.readPos++
        } else if (ch === 191) {
            strLen = this.getUint32(this.readPos + 1)[0] - 6
            this.readPos += 5
            // check
            if (strLen <= 62) {
                strLen = 0
            }
        } else {
            strLen = 0
        }

        if (strLen > 0) {
            const bytes = this.readNBytes(strLen + 1)
            if (bytes.byteLength === strLen + 1 && bytes[strLen] === 0) {
                const [v, ok] = utf8ToString(bytes, 0, strLen)
                if (ok) {
                    return [v, true]
                }
            }
        }

        this.setReadPos(oldReadPos)
        return ["", false]
    }

    public readBytes(): [RPCBytes, boolean] {
        const ch = this.peekByte()
        const oldReadPos = this.readPos
        let bytesLen = 0

        if (ch === 192) {
            if (this.canRead()) {
                this.readPos++
                return [new Uint8Array([]), true]
            }
        } else if (ch > 192 && ch < 255) {
            bytesLen = ch - 192
            this.readPos++
        } else if (ch === 255) {
            bytesLen = this.getUint32(this.readPos + 1)[0] - 5
            this.readPos += 5
            // check
            if (bytesLen <= 62) {
                bytesLen = 0
            }
        } else {
            bytesLen = 0
        }

        if (bytesLen > 0) {
            const bytes = this.readNBytes(bytesLen)
            if (bytes.byteLength === bytesLen) {
                return [bytes, true]
            }
        }

        this.setReadPos(oldReadPos)
        return [new Uint8Array([]), false]
    }

    public readArray(): [RPCArray, boolean] {
        const ch = this.peekByte()
        const readStart = this.readPos
        let arrLen = 0
        let totalLen = 0

        if (ch === 64) {
            if (this.canRead()) {
                this.readPos++
                return [new Array<RPCAny>(), true]
            }
        } else if (ch > 64 && ch < 95) {
            arrLen = ch - 64
            totalLen = this.getUint32(this.readPos + 1)[0]
            this.readPos += 5
        } else if (ch === 95) {
            totalLen = this.getUint32(this.readPos + 1)[0]
            arrLen = this.getUint32(this.readPos + 5)[0]
            this.readPos += 9
        } else {
            arrLen = 0
        }

        if (arrLen > 0) {
            const ret = new Array<RPCAny>()

            for (let i = 0; i < arrLen; i++) {
                const [v, ok] = this.read()
                if (ok) {
                    ret.push(v)
                } else {
                    this.setReadPos(readStart)
                    return [[], false]
                }
            }

            if (this.getReadPos() === readStart + totalLen) {
                return [ret, true]
            }
        }

        this.setReadPos(readStart)
        return [[], false]
    }

    public readMap(): [RPCMap, boolean] {
        const ch = this.peekByte()
        const readStart = this.readPos
        let mapLen = 0
        let totalLen = 0

        if (ch == 96) {
            if (this.canRead()) {
                this.readPos++
                return [new Map<string, RPCAny>(), true]
            }
        } else if (ch > 96 && ch < 127) {
            mapLen = ch - 96
            totalLen = this.getUint32(this.readPos + 1)[0]
            this.readPos += 5
        } else if (ch === 127) {
            totalLen = this.getUint32(this.readPos + 1)[0]
            mapLen = this.getUint32(this.readPos + 5)[0]
            this.readPos += 9
        }

        if (mapLen > 0 && totalLen > 4) {
            const ret = new Map<string, RPCAny>()

            for (let i = 0; i < mapLen; i++) {
                const [name, ok] = this.readString()
                if (!ok) {
                    this.setReadPos(readStart)
                    return [new Map<string, RPCAny>(), false]
                }
                const [value, vok] = this.read()
                if (!vok) {
                    this.setReadPos(readStart)
                    return [new Map<string, RPCAny>(), false]
                }
                ret.set(name, value)
            }
            if (this.getReadPos() == readStart + totalLen) {
                return [ret, true]
            }
        }

        this.setReadPos(readStart)
        return [new Map<string, RPCAny>(), false]
    }

    public read(): [RPCAny, boolean] {
        const fnReturn = (v: [RPCAny, boolean]): [RPCAny, boolean] => {
            if (!v[1]) {
                return [null, false]
            } else {
                return v
            }
        }

        const op = this.peekByte()

        switch (op) {
        case 1:
            return [null, this.readNull()]
        case 2:
        case 3:
            return fnReturn(this.readBool())
        case 4:
        case 5:
            return fnReturn(this.readFloat64())
        case 6:
        case 7:
        case 8:
            return fnReturn(this.readInt64())
        case 9:
        case 10:
        case 11:
            return fnReturn(this.readUint64())
        case 12:
            return [null, false]
        case 13:
            return [null, false]
        default:
            break
        }

        switch ((op >>> 6) & 0x03) {
        case 0:
            if (op < 54) {
                return fnReturn(this.readInt64())
            } else {
                return fnReturn(this.readUint64())
            }
        case 1:
            if (op < 96) {
                return fnReturn(this.readArray())
            } else {
                return fnReturn(this.readMap())
            }
        case 2:
            return fnReturn(this.readString())
        default:
            return fnReturn(this.readBytes())
        }
    }
}
