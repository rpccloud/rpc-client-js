/* tslint:disable: all */
export class Ieee754 {
  public static read(
    buf: any,
    offset: number,
    isLE: boolean,
    mLen: number,
    nBytes: number,
  ): number {
    let e, m;
    let eLen = (nBytes * 8) - mLen - 1;
    let eMax = (1 << eLen) - 1;
    let eBias = eMax >> 1;
    let nBits = -7;
    let i = isLE ? (nBytes - 1) : 0;
    let d = isLE ? -1 : 1;
    let s = buf[offset + i];

    i += d;

    e = s & ((1 << (-nBits)) - 1);
    s >>= (-nBits);
    nBits += eLen;
    for (; nBits > 0; e = (e * 256) + buf[offset + i], i += d, nBits -= 8) {
    }

    m = e & ((1 << (-nBits)) - 1);
    e >>= (-nBits);
    nBits += mLen;
    for (; nBits > 0; m = (m * 256) + buf[offset + i], i += d, nBits -= 8) {
    }

    if (e === 0) {
      e = 1 - eBias;
    } else if (e === eMax) {
      return m ? NaN : ((s ? -1 : 1) * Infinity);
    } else {
      m = m + Math.pow(2, mLen);
      e = e - eBias;
    }
    return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
  }

  public static write(
    buf: any,
    value: number,
    offset: number,
    isLE: boolean,
    mLen: number,
    nBytes: number,
  ) {
    let e, m, c;
    let eLen = (nBytes * 8) - mLen - 1;
    let eMax = (1 << eLen) - 1;
    let eBias = eMax >> 1;
    let rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
    let i = isLE ? 0 : (nBytes - 1);
    let d = isLE ? 1 : -1;
    let s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

    value = Math.abs(value);

    if (isNaN(value) || value === Infinity) {
      m = isNaN(value) ? 1 : 0;
      e = eMax;
    } else {
      e = Math.floor(Math.log(value) / Math.LN2);
      if (value * (c = Math.pow(2, -e)) < 1) {
        e--;
        c *= 2;
      }
      if (e + eBias >= 1) {
        value += rt / c;
      } else {
        value += rt * Math.pow(2, 1 - eBias);
      }
      if (value * c >= 2) {
        e++;
        c /= 2;
      }

      if (e + eBias >= eMax) {
        m = 0;
        e = eMax;
      } else if (e + eBias >= 1) {
        m = ((value * c) - 1) * Math.pow(2, mLen);
        e = e + eBias;
      } else {
        m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
        e = 0;
      }
    }

    for (; mLen >= 8; buf[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {
    }

    e = (e << mLen) | m;
    eLen += mLen;
    for (; eLen > 0; buf[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {
    }

    buf[offset + i - d] |= s * 128;
  }
}
