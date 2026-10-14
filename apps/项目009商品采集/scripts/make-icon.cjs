/**
 * 生成桌面原生安装包所需图标（build/icon.png 256x256 + build/icon.ico）
 * 纯 Node 实现（内置 zlib 手写 PNG/ICO 编码），零第三方依赖、无需联网。
 * 图形：靛蓝圆角底 + 白色定位图钉（与 Web 版主色 #4f6bed 一致）。
 */
const zlib = require('node:zlib')
const fs = require('node:fs')
const path = require('node:path')

const S = 256
const BG = [0x4f, 0x6b, 0xed] // --primary 靛蓝
const FG = [255, 255, 255]

// ---- CRC32 ----
const CRC_TABLE = (() => {
  const t = new Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const t = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}

// ---- 绘制像素 ----
const stride = S * 4 + 1
const raw = Buffer.alloc(S * stride)
const R = 56 // 圆角半径
for (let y = 0; y < S; y++) {
  const rowStart = y * stride
  raw[rowStart] = 0 // filter: none
  for (let x = 0; x < S; x++) {
    const o = rowStart + 1 + x * 4
    // 圆角矩形背景
    const cx = Math.min(Math.max(x, R), S - 1 - R)
    const cy = Math.min(Math.max(y, R), S - 1 - R)
    const dx = x - cx
    const dy = y - cy
    let color = dx * dx + dy * dy <= R * R ? BG : null

    if (color) {
      // 定位图钉：白色圆环
      const ax = x - 128
      const ay = y - 100
      const d = Math.sqrt(ax * ax + ay * ay)
      if (d <= 48 && d >= 21) color = FG
      // 图钉下方的三角（梯形近似）
      if (y >= 148 && y <= 200) {
        const t = (y - 148) / (200 - 148)
        const halfW = 3 + t * 25
        if (Math.abs(x - 128) <= halfW) color = FG
      }
    }

    if (color) {
      raw[o] = color[0]
      raw[o + 1] = color[1]
      raw[o + 2] = color[2]
      raw[o + 3] = 255
    } else {
      raw[o] = raw[o + 1] = raw[o + 2] = raw[o + 3] = 0 // 透明
    }
  }
}

// ---- PNG ----
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(S, 0)
ihdr.writeUInt32BE(S, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 6 // RGBA
ihdr[10] = 0
ihdr[11] = 0
ihdr[12] = 0
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])

// ---- ICO（内嵌该 PNG，Windows Vista+ 支持）----
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // type: icon
header.writeUInt16LE(1, 4) // count: 1
const entry = Buffer.alloc(16)
entry[0] = 0 // width 0 => 256
entry[1] = 0 // height 0 => 256
entry[2] = 0 // color count
entry[3] = 0 // reserved
entry.writeUInt16LE(1, 4) // planes
entry.writeUInt16LE(32, 6) // bit count
entry.writeUInt32LE(png.length, 8)
entry.writeUInt32LE(22, 12) // offset
const ico = Buffer.concat([header, entry, png])

// ---- 写出 ----
const buildDir = path.join(__dirname, '..', 'build')
fs.mkdirSync(buildDir, { recursive: true })
fs.writeFileSync(path.join(buildDir, 'icon.png'), png)
fs.writeFileSync(path.join(buildDir, 'icon.ico'), ico)
// 同时供 PWA manifest 使用
const pubDir = path.join(__dirname, '..', 'public')
if (fs.existsSync(pubDir)) fs.writeFileSync(path.join(pubDir, 'icon-256.png'), png)

console.log('icon.png  ' + png.length + ' bytes')
console.log('icon.ico  ' + ico.length + ' bytes')
