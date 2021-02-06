import {Deferred} from "./deferred"
import {RPCAny} from "./types"

function pad2(num: number): string {
    const norm = Math.floor(Math.abs(num))
    return (norm < 10 ? "0" : "") + norm.toString(10)
}

function pad3(num: number): string {
    const norm = Math.floor(Math.abs(num))
    if (norm < 10) {
        return "00" + norm.toString(10)
    } else if (norm < 100) {
        return "0" + norm.toString(10)
    } else {
        return "" + norm.toString(10)
    }
}

function pad4(num: number): string {
    const norm = Math.floor(Math.abs(num))
    if (norm < 10) {
        return "000" + norm.toString(10)
    } else if (norm < 100) {
        return "00" + norm.toString(10)
    } else if (norm < 1000) {
        return "0" + norm.toString(10)
    } else {
        return "" + norm.toString(10)
    }
}

export function stringToUTF8(v: string): Uint8Array {
    let buffer = new Uint8Array(v.length)
    let ch: number
    let strPos = 0
    let bufPos = 0

    while ((ch = v.charCodeAt(strPos++)) > 0) {
        if (bufPos - buffer.byteLength < 4) {
            const newBuffer = new Uint8Array(buffer.byteLength * 2)
            newBuffer.set(buffer, 0)
            buffer = newBuffer
        }

        if (ch >= 0xD800 && ch <= 0xDBFF) {
            const low = v.charCodeAt(strPos++)
            ch = (((ch & 0x3FF) << 10) | (low & 0x3FF)) + 65536
        }


        if (ch < 128) {
            buffer[bufPos++] = ch
        } else if (ch < 2048) {
            buffer[bufPos++] = ((ch >>> 6) & 0xFF) | 0xC0
            buffer[bufPos++] = (ch & 0x3F) | 0x80
        } else if (ch < 65536) {
            buffer[bufPos++] = ((ch >>> 12) & 0xFF) | 0xE0
            buffer[bufPos++] = ((ch >>> 6) & 0x3F) | 0x80
            buffer[bufPos++] = (ch & 0x3F) | 0x80
        } else {
            buffer[bufPos++] = ((ch >>> 18) & 0xFF) | 0xF0
            buffer[bufPos++] = ((ch >>> 12) & 0x3F) | 0x80
            buffer[bufPos++] = ((ch >>> 6) & 0x3F) | 0x80
            buffer[bufPos++] = (ch & 0x3F) | 0x80
        }
    }

    return buffer.slice(0, bufPos)
}

export function utf8ToString(
    v: Uint8Array,
    start?: number,
    end?: number,
): [string, boolean] {
    if (v === null || v === undefined) {
        return ["", false]
    }

    const retArray = new Array<number>()
    let idx = (start === undefined) ? 0 : start
    const readEnd = (end === undefined) ? v.byteLength : end
    if (idx < 0 || readEnd > v.byteLength || idx >= readEnd) {
        return ["", false]
    }

    const byteLen = v.byteLength

    while (idx < readEnd) {
        const ch = v[idx]

        if (ch < 128) {
            idx++
            retArray.push(ch)
        } else if (ch < 224) {
            if (idx + 1 < byteLen) {
                if ((v[idx + 1] & 0xC0) !== 0x80) {
                    return ["", false]
                }
                const unicode = ((ch & 0x1F) << 6) | (v[idx + 1] & 0x3F)
                idx += 2
                if (unicode >= 0x0080 && unicode <= 0x07FF) {
                    retArray.push(unicode)
                } else {
                    return ["", false]
                }
            } else {
                return ["", false]
            }
        } else if (ch < 240) {
            if (idx + 2 < byteLen) {
                if (
                    (v[idx + 1] & 0xC0) !== 0x80 ||
                    (v[idx + 2] & 0xC0) !== 0x80
                ) {
                    return ["", false]
                }
                const unicode =
                    ((ch & 0x0F) << 12) |
                    ((v[idx + 1] & 0x3F) << 6) |
                    (v[idx + 2] & 0x3F)
                idx += 3
                if (unicode >= 0x0800 && unicode <= 0xD7FF) {
                    retArray.push(unicode)
                } else if (unicode >= 0xE000 && unicode <= 0xFFFF) {
                    retArray.push(unicode)
                } else {
                    return ["", false]
                }
            } else {
                return ["", false]
            }
        } else if (ch < 248) {
            if (idx + 3 < byteLen) {
                if (
                    (v[idx + 1] & 0xC0) !== 0x80 ||
                    (v[idx + 2] & 0xC0) !== 0x80 ||
                    (v[idx + 3] & 0xC0) !== 0x80
                ) {
                    return ["", false]
                }
                const unicode =
                    ((ch & 0x07) << 18) |
                    ((v[idx + 1] & 0x3F) << 12) |
                    ((v[idx + 2] & 0x3F) << 6) |
                    (v[idx + 3] & 0x3F)
                idx += 4
                if (unicode >= 0x010000 && unicode <= 0x10FFFF) {
                    retArray.push(unicode)
                } else {
                    return ["", false]
                }
            } else {
                return ["", false]
            }
        } else {
            return ["", false]
        }
    }
    return [String.fromCodePoint(...retArray), true]
}

export function convertToIsoDateString(date: Date): string {
    if (date === null || date === undefined) {
        return ""
    }
    const tzo = -date.getTimezoneOffset()
    const dif = tzo >= 0 ? "+" : "-"
    let year = date.getFullYear()
    if (year > 9999) {
        year = 9999
    }
    return pad4(year) +
        "-" + pad2(date.getMonth() + 1) +
        "-" + pad2(date.getDate()) +
        "T" + pad2(date.getHours()) +
        ":" + pad2(date.getMinutes()) +
        ":" + pad2(date.getSeconds()) +
        "." + pad3(date.getMilliseconds()) +
        dif + pad2(tzo / 60) +
        ":" + pad2(tzo % 60)
}

export function convertOrdinalToString(n: number): string {
    if (!Number.isSafeInteger(n) || n <= 0) {
        return ""
    }

    switch (n) {
    case 1:
        return "1st"
    case 2:
        return "2nd"
    case 3:
        return "3rd"
    default:
        return `${n}th`
    }
}

export function getTimeNowMS(): number {
    return new Date().getTime()
}

export function getProtocol(urlString: string): string {
    if (urlString === null || urlString === undefined) {
        return ""
    }

    const idx = urlString.indexOf(":")
    if (idx > 0) {
        return urlString.substr(0, idx)
    } else {
        return ""
    }
}

export async function sleep(timeMS: number): Promise<RPCAny> {
    const deferred = new Deferred()
    setTimeout(() => {
        deferred.doResolve(true)
    }, timeMS)
    return deferred.promise
}

export async function returnAsync<T>(value: T): Promise<T> {
    return new Promise((
        resolve: (value: T | PromiseLike<T>) => void,
    ) => {
        resolve(value)
    })
}
