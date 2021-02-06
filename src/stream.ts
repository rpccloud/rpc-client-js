import {Ieee754} from "./ieee754"
import {
    RPCBool, RPCFloat64, RPCInt64, RPCUint64,
    RPCString, RPCBytes, RPCArray, RPCMap, RPCAny,
} from "./types"
import {stringToUTF8, utf8ToString} from "./utils"

const streamBodyPos = 33

export class RPCStream {
  public static readonly WriteOK: number = 0
  public static readonly UnsupportedType: number = 1
  public static readonly WriteOverflow: number = 2

  private data: Uint8Array
  private readPos: number
  private writePos: number

  public constructor() {
      this.data = new Uint8Array(1024)
      this.data[0] = 1
      this.readPos = streamBodyPos
      this.writePos = streamBodyPos
  }

  private enlarge(size: number): void {
      if (size > this.data.byteLength) {
          const newData: Uint8Array = new Uint8Array(size + 1024)
          newData.set(this.data, 0)
          this.data = newData
      }
  }

  private putByte(value: number): void {
      this.enlarge(this.writePos + 1)
      this.data[this.writePos] = value
      this.writePos++
  }

  private putBytes(value: Array<number>): void {
      this.enlarge(this.writePos + value.length)
      for (const n of value) {
          this.data[this.writePos] = n
          this.writePos++
      }
  }

  public putUint8Bytes(value: Uint8Array): void {
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
          const end: number = this.readPos + n
          if (end <= this.writePos) {
              const ret: Uint8Array = this.data.slice(this.readPos, end)
              this.readPos = end
              return ret
          }
      }
      return new Uint8Array(0)
  }

  public getReadPos(): number {
      return this.readPos
  }

  public setReadPos(readPos: number): boolean {
      if (readPos >= 0 && readPos <= this.writePos) {
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
      if (writePos >= 0) {
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

  private writeLengthUnsafe(v: number): void {
      this.putByte(v)
      v >>>= 8
      this.putByte(v)
      v >>>= 8
      this.putByte(v)
      this.putByte(v >>> 8)
  }

  private static getLengthUnsafe(bytes: Uint8Array, start: number): number {
      return (bytes[start + 3] & 0xFF) * 16777216 +
      (bytes[start + 2] & 0xFF) * 65536 +
      (bytes[start + 1] & 0xFF) * 256 +
      (bytes[start] & 0xFF)
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

  public reset(): void {
      this.writePos = streamBodyPos
      this.readPos = streamBodyPos
  }

  public getCallbackID(): number {
      const data: Uint8Array = this.data.slice(1, 9)
      return RPCUint64.fromBytes(data).toNumber()
  }

  public setCallbackID(id: number): boolean {
      if (Number.isInteger(id) && id >= 0 && id <= 9007199254740991) {
          const prevWritePos: number = this.writePos
          this.writePos = 1
          this.writeUint64Unsafe(id)
          this.writePos = prevWritePos
          return true
      } else {
          return false
      }
  }

  public getSequence(): number {
      const data: Uint8Array = this.data.slice(9, 17)
      return RPCUint64.fromBytes(data).toNumber()
  }

  public setSequence(id: number): boolean {
      if (Number.isInteger(id) && id >= 0 && id <= 9007199254740991) {
          const prevWritePos: number = this.writePos
          this.writePos = 9
          this.writeUint64Unsafe(id)
          this.writePos = prevWritePos
          return true
      } else {
          return false
      }
  }

  public canRead(): boolean {
      return this.readPos < this.writePos && this.readPos < this.data.byteLength
  }

  public isReadFinish(): boolean {
      return this.readPos === this.writePos
  }

  public writeNull(): void {
      this.putByte(1)
  }

  public writeBool(v: RPCBool): number {
      if (v === null || v === undefined) {
          return RPCStream.UnsupportedType
      }
      if (v) {
          this.putByte(2)
          return RPCStream.WriteOK
      } else {
          this.putByte(3)
          return RPCStream.WriteOK
      }
  }

  public writeFloat64(value: RPCFloat64): number {
      if (value === null || value === undefined) {
          return RPCStream.UnsupportedType
      }

      const v: number = value.toNumber()
      if (v === 0) {
          this.putByte(4)
          return RPCStream.WriteOK
      } else if (!Number.isNaN(v)) {
          this.putByte(5)
          const arr = new Uint8Array(8)
          Ieee754.write(arr, v, 0, true, 52, 8)
          this.putUint8Bytes(arr)
          return RPCStream.WriteOK
      } else {
          return RPCStream.UnsupportedType
      }
  }

  public writeInt64(value: RPCInt64): number {
      if (value === null || value === undefined) {
          return RPCStream.UnsupportedType
      }

      let v: number = value.toNumber()
      if (v > -8 && v < 33) {
          this.putByte(v + 21)
          return RPCStream.WriteOK
      } else if (v >= -32768 && v < 32768) {
          v += 32768
          this.putByte(6)
          this.putByte(v)
          this.putByte(v >>> 8)
          return RPCStream.WriteOK
      } else if (v >= -2147483648 && v < 2147483648) {
          v += 2147483648
          this.putByte(7)
          this.putByte(v)
          v >>>= 8
          this.putByte(v)
          v >>>= 8
          this.putByte(v)
          this.putByte(v >>> 8)
          return RPCStream.WriteOK
      } else if (v >= -9007199254740991 && v <= 9007199254740991) {
          const negative: boolean = v < 0
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
          return RPCStream.WriteOK
      } else {
          const bytes: Uint8Array | null = value.getBytes()
          if (bytes != null && bytes.byteLength === 8) {
              this.putByte(8)
              this.putUint8Bytes(bytes)
              return RPCStream.WriteOK
          } else {
              return RPCStream.UnsupportedType
          }
      }
  }

  public writeUint64(value: RPCUint64): number {
      if (value === null || value === undefined) {
          return RPCStream.UnsupportedType
      }

      let v: number = value.toNumber()

      if (v < 10) {
          this.putByte(v + 54)
          return RPCStream.WriteOK
      } else if (v < 65536) {
          this.putByte(9)
          this.putByte(v)
          this.putByte(v >>> 8)
          return RPCStream.WriteOK
      } else if (v < 4294967296) {
          this.putByte(10)
          this.putByte(v)
          v >>>= 8
          this.putByte(v)
          v >>>= 8
          this.putByte(v)
          this.putByte(v >>> 8)
          return RPCStream.WriteOK
      } else if (v <= 9007199254740991) {
          this.putByte(11)
          this.writeUint64Unsafe(v)
          return RPCStream.WriteOK
      } else {
          const bytes: Uint8Array | null = value.getBytes()
          if (bytes != null && bytes.byteLength == 8) {
              this.putByte(11)
              this.putUint8Bytes(bytes)
              return RPCStream.WriteOK
          } else {
              return RPCStream.UnsupportedType
          }
      }
  }

  public writeString(v: RPCString): number {
      if (v === null || v === undefined) {
          return RPCStream.UnsupportedType
      }

      if (v === "") {
          this.putByte(128)
          return RPCStream.WriteOK
      }

      const strBuffer: Array<number> = stringToUTF8(v)
      const length: number = strBuffer.length

      if (length <= 0) {
      // to utf8 error
          return RPCStream.UnsupportedType
      } else if (length < 63) {
      // write header
          this.putByte(length + 128)
          // write body
          this.putBytes(strBuffer)
          // write tail
          this.putByte(0)
          return RPCStream.WriteOK
      } else {
      // write header
          this.putByte(191)
          // write length
          this.writeLengthUnsafe(length)
          // write body
          this.putBytes(strBuffer)
          // write tail
          this.putByte(0)
          return RPCStream.WriteOK
      }
  }

  public writeBytes(v: RPCBytes): number {
      if (v === null || v === undefined) {
          return RPCStream.UnsupportedType
      }

      const length: number = v.byteLength

      if (length == 0) {
          this.putByte(192)
          return RPCStream.WriteOK
      } else if (length < 63) {
      // write header
          this.putByte(length + 192)
          // write body
          this.putUint8Bytes(v)
          return RPCStream.WriteOK
      } else {
      // write header
          this.putByte(255)
          // write length
          this.writeLengthUnsafe(length)
          // write body
          this.putUint8Bytes(v)
          return RPCStream.WriteOK
      }
  }

  public writeArray(v: RPCArray): number {
      return this.writeArrayInner(v, 64)
  }

  private writeArrayInner(v: RPCArray, depth: number): number {
      if (v === null || v === undefined) {
          return RPCStream.UnsupportedType
      }

      const arrLen: number = v.length
      if (arrLen === 0) {
          this.putByte(64)
          return RPCStream.WriteOK
      }

      const startPos: number = this.writePos
      if (arrLen > 30) {
          this.putByte(95)
      } else {
          this.putByte(arrLen + 64)
      }

      this.writePos += 4

      if (arrLen > 30) {
          this.writeLengthUnsafe(arrLen)
      }

      for (let i = 0; i < arrLen; i++) {
          const errCode: number = this.writeInner(v[i], depth - 1)
          if (errCode !== RPCStream.WriteOK) {
              this.setWritePos(startPos)
              return errCode
          }
      }

      // write total length
      const endPos: number = this.writePos
      this.writePos = startPos + 1
      this.writeLengthUnsafe(endPos - startPos)
      this.writePos = endPos

      return RPCStream.WriteOK
  }

  public writeMap(v: RPCMap): number {
      return this.writeMapInner(v, 64)
  }

  private writeMapInner(v: RPCMap, depth: number): number {
      if (v === null || v === undefined) {
          return RPCStream.UnsupportedType
      }

      const mapLen: number = v.size
      if (mapLen === 0) {
          this.putByte(96)
          return RPCStream.WriteOK
      }
      const startPos: number = this.writePos
      if (mapLen > 30) {
          this.putByte(127)
      } else {
          this.putByte(mapLen + 96)
      }
      this.writePos += 4
      if (mapLen > 30) {
          this.writeLengthUnsafe(mapLen)
      }

      for (const [key, value] of v) {
          const errCode1: number = this.writeString(key)
          if (errCode1 !== RPCStream.WriteOK) {
              this.setWritePos(startPos)
              return errCode1
          }
          const errCode2: number = this.writeInner(value, depth - 1)
          if (errCode2 !== RPCStream.WriteOK) {
              this.setWritePos(startPos)
              return errCode2
          }
      }

      // write total length
      const endPos: number = this.writePos
      this.writePos = startPos + 1
      this.writeLengthUnsafe(endPos - startPos)
      this.writePos = endPos

      return RPCStream.WriteOK
  }

  public write(v: RPCAny): number {
      return this.writeInner(v, 64)
  }

  private writeInner(v: any, depth: number): number {
      if (v === undefined) {
          return RPCStream.UnsupportedType
      }

      if (depth <= 0) {
          return RPCStream.WriteOverflow
      }

      if (v === null) {
          this.writeNull()
          return RPCStream.WriteOK
      }

      switch (typeof v) {
      case "boolean":
          this.writeBool(v)
          return RPCStream.WriteOK
      case "string":
          this.writeString(v)
          return RPCStream.WriteOK
      case "object":
          if (v instanceof RPCInt64) {
              this.writeInt64(v)
              return RPCStream.WriteOK
          } else if (v instanceof RPCUint64) {
              this.writeUint64(v)
              return RPCStream.WriteOK
          } else if (v instanceof RPCFloat64) {
              this.writeFloat64(v)
              return RPCStream.WriteOK
          } else if (v instanceof Uint8Array) {
              this.writeBytes(v)
              return RPCStream.WriteOK
          } else if (v instanceof Array) {
              return this.writeArrayInner(v, depth)
          } else if (v instanceof Map) {
              return this.writeMapInner(v, depth)
          } else {
              return RPCStream.UnsupportedType
          }
      default:
          return RPCStream.UnsupportedType
      }
  }

  public readNull(): boolean {
      if (this.peekByte() === 1) {
          this.readPos++
          return true
      } else {
          return false
      }
  }

  public readBool(): [RPCBool, boolean] {
      const ch: number = this.peekByte()

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

  public readFloat64(): [RPCFloat64, boolean] {
      const ch: number = this.peekByte()
      if (ch === 4) {
          this.readPos++
          return [new RPCFloat64(0), true]
      } else if (ch === 5) {
          const bytes: Uint8Array = this.readNBytes(9)
          if (bytes.byteLength === 9) {
              const v: number =
          Ieee754.read(bytes, 1, true, 52, 8)
              return [new RPCFloat64(v), true]
          }
      }

      return [new RPCFloat64(NaN), false]
  }

  public readInt64(): [RPCInt64, boolean] {
      const ch: number = this.peekByte()
      if (ch > 13 && ch < 54) {
          this.readPos++
          return [new RPCInt64(ch - 21), true]
      } else {
          switch (ch) {
          case 6: {
              const bytes: Uint8Array = this.readNBytes(3)
              if (bytes.byteLength === 3) {
                  const v: number =
              (bytes[2] & 0xFF) * 256 +
              (bytes[1] & 0xFF) -
              32768
                  return [new RPCInt64(v), true]
              }
              break
          }
          case 7: {
              const bytes: Uint8Array = this.readNBytes(5)
              if (bytes.byteLength === 5) {
                  const v: number =
              (bytes[4] & 0xFF) * 16777216 +
              (bytes[3] & 0xFF) * 65536 +
              (bytes[2] & 0xFF) * 256 +
              (bytes[1] & 0xFF) -
              2147483648
                  return [new RPCInt64(v), true]
              }
              break
          }
          case 8: {
              const bytes: Uint8Array = this.readNBytes(9)
              if (bytes.byteLength === 9) {
                  return [RPCInt64.fromBytes(bytes.slice(1)), true]
              }
              break
          }
          default:
              break
          }
          return [new RPCInt64(NaN), false]
      }
  }

  public readUint64(): [RPCUint64, boolean] {
      const ch: number = this.peekByte()
      if (ch > 53 && ch < 64) {
          this.readPos++
          return [new RPCUint64(ch - 54), true]
      } else {
          switch (ch) {
          case 9: {
              const bytes: Uint8Array = this.readNBytes(3)
              if (bytes.byteLength === 3) {
                  const v: number =
              (bytes[2] & 0xFF) * 256 +
              (bytes[1] & 0xFF)
                  return [new RPCUint64(v), true]
              }
              break
          }
          case 10: {
              const bytes: Uint8Array = this.readNBytes(5)
              if (bytes.byteLength === 5) {
                  const v: number =
              (bytes[4] & 0xFF) * 16777216 +
              (bytes[3] & 0xFF) * 65536 +
              (bytes[2] & 0xFF) * 256 +
              (bytes[1] & 0xFF)
                  return [new RPCUint64(v), true]
              }
              break
          }
          case 11: {
              const bytes: Uint8Array = this.readNBytes(9)
              if (bytes.byteLength === 9) {
                  return [RPCUint64.fromBytes(bytes.slice(1)), true]
              }
              break
          }
          default:
              break
          }
          return [new RPCUint64(NaN), false]
      }
  }

  public readString(): [RPCString, boolean] {
      const ch: number = this.peekByte()
      if (ch === 128) {
          this.readPos++
          return ["", true]
      } else if (ch > 128 && ch < 191) {
          const oldReadPos: number = this.readPos
          const length: number = ch - 128
          const bytes: Uint8Array = this.readNBytes(length + 2)
          if (bytes.byteLength === length + 2 && bytes[length + 1] === 0) {
              const [v, ok] = utf8ToString(bytes, 1, length + 1)
              if (ok) {
                  return [v, true]
              }
          }
          this.setReadPos(oldReadPos)
          return ["", false]
      } else if (ch == 191) {
          const oldReadPos: number = this.readPos
          const lenBytes: Uint8Array = this.readNBytes(5)
          if (lenBytes.byteLength === 5) {
              const length: number = RPCStream.getLengthUnsafe(lenBytes, 1)
              if (length > 62) {
                  const bytes: Uint8Array = this.readNBytes(length + 1)
                  if (bytes.byteLength === length + 1 && bytes[length] === 0) {
                      const [v, ok] = utf8ToString(bytes, 0, length)
                      if (ok) {
                          return [v, true]
                      }
                  }
              }
          }
          this.setReadPos(oldReadPos)
          return ["", false]
      }
      return ["", false]
  }

  public readBytes(): [RPCBytes, boolean] {
      const ch: number = this.peekByte()
      if (ch === 192) {
          this.readPos++
          return [new Uint8Array([]), true]
      } else if (ch > 192 && ch < 255) {
          const length: number = ch - 192
          const bytes: Uint8Array = this.readNBytes(length + 1)
          if (bytes.byteLength === length + 1) {
              return [bytes.slice(1), true]
          }
      } else if (ch === 255) {
          const oldReadPos: number = this.readPos
          const lenBytes: Uint8Array = this.readNBytes(5)
          if (lenBytes.byteLength === 5) {
              const length: number = RPCStream.getLengthUnsafe(lenBytes, 1)
              if (length > 62) {
                  const bytes: Uint8Array = this.readNBytes(length)
                  if (bytes.byteLength === length) {
                      return [bytes, true]
                  }
              }
          }
          this.setReadPos(oldReadPos)
          return [new Uint8Array([]), false]
      }

      return [new Uint8Array([]), false]
  }

  public readArray(): [RPCArray, boolean] {
      const ch: number = this.peekByte()

      if (ch >= 64 && ch < 96) {
          let arrLen = 0
          let totalLen = 0
          const readStart: number = this.readPos

          if (ch === 64) {
              this.readPos++
              return [new Array<RPCAny>(), true]
          } else if (ch < 95) {
              arrLen = ch - 64
              const lenBytes: Uint8Array = this.readNBytes(5)
              if (lenBytes.byteLength === 5) {
                  totalLen = RPCStream.getLengthUnsafe(lenBytes, 1)
              }
          } else {
              const lenBytes: Uint8Array = this.readNBytes(9)
              if (lenBytes.byteLength === 9) {
                  totalLen = RPCStream.getLengthUnsafe(lenBytes, 1)
                  arrLen = RPCStream.getLengthUnsafe(lenBytes, 5)
              }
          }

          if (arrLen > 0 && totalLen > 4) {
              const ret: Array<RPCAny> = new Array<RPCAny>()

              for (let i = 0; i < arrLen; i++) {
                  const [v, ok] = this.read()
                  if (ok) {
                      ret.push(v)
                  } else {
                      this.setReadPos(readStart)
                      return [[], false]
                  }
              }
              if (this.getReadPos() == readStart + totalLen) {
                  return [ret, true]
              }
          }
          this.setReadPos(readStart)
      }
      return [[], false]
  }

  public readMap(): [RPCMap, boolean] {
      const ch: number = this.peekByte()
      if (ch >= 96 && ch < 128) {
          let mapLen = 0
          let totalLen = 0
          const readStart: number = this.readPos

          if (ch == 96) {
              this.readPos++
              return [new Map<string, RPCAny>(), true]
          } else if (ch < 127) {
              mapLen = ch - 96
              const lenBytes: Uint8Array = this.readNBytes(5)
              if (lenBytes.byteLength === 5) {
                  totalLen =
            (lenBytes[4] & 0xFF) * 16777216 +
            (lenBytes[3] & 0xFF) * 65536 +
            (lenBytes[2] & 0xFF) * 256 +
            (lenBytes[1] & 0xFF)
              }
          } else {
              const lenBytes: Uint8Array = this.readNBytes(9)
              if (lenBytes.byteLength === 9) {
                  totalLen =
            (lenBytes[4] & 0xFF) * 16777216 +
            (lenBytes[3] & 0xFF) * 65536 +
            (lenBytes[2] & 0xFF) * 256 +
            (lenBytes[1] & 0xFF)
                  mapLen =
            (lenBytes[8] & 0xFF) * 16777216 +
            (lenBytes[7] & 0xFF) * 65536 +
            (lenBytes[6] & 0xFF) * 256 +
            (lenBytes[5] & 0xFF)
              }
          }

          if (mapLen > 0 && totalLen > 4) {
              const ret: Map<string, RPCAny> = new Map<string, RPCAny>()

              for (let i = 0; i < mapLen; i++) {
                  const [name, ok] = this.readString()
                  if (!ok) {
                      this.setReadPos(readStart)
                      return [new Map<string, RPCAny>(), false]
                  }
                  const [value, vok] = this.read()
                  if (vok) {
                      ret.set(name, value)
                  } else {
                      this.setReadPos(readStart)
                      return [new Map<string, RPCAny>(), false]
                  }
              }
              if (this.getReadPos() == readStart + totalLen) {
                  return [ret, true]
              }
          }
          this.setReadPos(readStart)
      }

      return [new Map<string, RPCAny>(), false]
  }

  public read(): [RPCAny, boolean] {
      const op: number = this.peekByte()

      switch (op) {
      case 1:
          return [null, this.readNull()]
      case 2:
      case 3:
          return this.readBool()
      case 4:
      case 5:
          return this.readFloat64()
      case 6:
      case 7:
      case 8:
          return this.readInt64()
      case 9:
      case 10:
      case 11:
          return this.readUint64()
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
              return this.readInt64()
          } else {
              return this.readUint64()
          }
      case 1:
          if (op < 96) {
              return this.readArray()
          } else {
              return this.readMap()
          }
      case 2:
          return this.readString()
      default:
          return this.readBytes()
      }
  }
}
