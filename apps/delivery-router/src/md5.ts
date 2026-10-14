// 最小 MD5 实现（无依赖）。
// 用途：高德 Web 服务「数字签名」鉴权 —— 当 Key 在控制台开启了签名校验时，
// 每次 restapi 请求必须附带 sig=MD5(参数按名字升序拼接 + 签名私钥)，否则返回
// INVALID_USER_SIGNATURE（infocode 10007）。

/** 字符串 → UTF-8 字节数组（正确处理中文与代理对） */
function utf8Bytes(str: string): number[] {
  const out: number[] = []
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    if (c < 0x80) {
      out.push(c)
    } else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f))
    } else if (c < 0xd800 || c >= 0xe000) {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f))
    } else {
      // 代理对（emoji / 扩展汉字）
      i++
      const c2 = str.charCodeAt(i)
      const cp = 0x10000 + (((c & 0x3ff) << 10) | (c2 & 0x3ff))
      out.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f),
      )
    }
  }
  return out
}

function hex(n: number): string {
  return (n >>> 0).toString(16).padStart(8, '0')
}

const SHIFT = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14,
  20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10,
  15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
]

/** 计算字符串的 MD5（32 位小写十六进制） */
export function md5(input: string): string {
  const msg = utf8Bytes(input)
  const bitLen = msg.length * 8

  // 填充：0x80，补 0 至长度 ≡ 56 (mod 64)，再追加 64 位长度（小端）
  msg.push(0x80)
  while (msg.length % 64 !== 56) msg.push(0)
  const low = bitLen >>> 0
  const high = Math.floor(bitLen / 0x100000000) >>> 0
  for (let i = 0; i < 4; i++) msg.push((low >>> (i * 8)) & 0xff)
  for (let i = 0; i < 4; i++) msg.push((high >>> (i * 8)) & 0xff)

  const K = new Array<number>(64)
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0

  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476

  for (let off = 0; off < msg.length; off += 64) {
    const M = new Array<number>(16)
    for (let j = 0; j < 16; j++) {
      const i0 = off + j * 4
      M[j] = msg[i0] | (msg[i0 + 1] << 8) | (msg[i0 + 2] << 16) | (msg[i0 + 3] << 24)
    }
    let A = a0
    let B = b0
    let C = c0
    let D = d0
    for (let i = 0; i < 64; i++) {
      let f: number
      let g: number
      if (i < 16) {
        f = (B & C) | (~B & D)
        g = i
      } else if (i < 32) {
        f = (D & B) | (~D & C)
        g = (5 * i + 1) % 16
      } else if (i < 48) {
        f = B ^ C ^ D
        g = (3 * i + 5) % 16
      } else {
        f = C ^ (B | ~D)
        g = (7 * i) % 16
      }
      const tmp = (f + A + K[i] + M[g]) >>> 0
      A = D
      D = C
      C = B
      B = (B + ((tmp << SHIFT[i]) | (tmp >>> (32 - SHIFT[i])))) >>> 0
    }
    a0 = (a0 + A) >>> 0
    b0 = (b0 + B) >>> 0
    c0 = (c0 + C) >>> 0
    d0 = (d0 + D) >>> 0
  }
  return hex(a0) + hex(b0) + hex(c0) + hex(d0)
}
