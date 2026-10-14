/**
 * 生成 Android 应用图标（品牌化：靛蓝 #4F6BED + 白色定位图钉，与 Web/桌面一致）。
 * 纯 Node 实现（内置 zlib 手写 PNG 编码），零依赖、无需联网、无需 ImageMagick。
 *
 * 产出：
 *   mipmap-<density>/ic_launcher.png               方形图标（API < 26）
 *   mipmap-<density>/ic_launcher_round.png         圆形图标（API < 26）
 *   mipmap-<density>/ic_launcher_foreground.png    自适应图标前景（API 26+ 安全区内）
 *   res/drawable/splash.png             纯色启动背景（不拉伸变形）
 *
 * 用法：node scripts/make-android-icons.cjs
 */
const zlib = require('node:zlib')
const fs = require('node:fs')
const path = require('node:path')

const BG = [0x4f, 0x6b, 0xed]
const FG = [255, 255, 255]

/* ---------- CRC32 / PNG chunk ---------- */
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

/**
 * 在归一化坐标（0..1）上求颜色，返回 [r,g,b,a] 或 null（透明）。
 * mode:
 *   square     — 圆角矩形底 + 图钉
 *   round      — 圆形底 + 图钉
 *   foreground — 透明底，仅图钉（自适应图标前景，居中且缩到安全区）
 */
function pixel(nx, ny, mode) {
  if (mode === 'solid') return [...BG, 255]
  if (mode === 'foreground') {
    return pin(nx, ny, 0.5, 0.5, 0.85)
  }
  // 背景形状
  let inShape
  if (mode === 'round') {
    const dx = nx - 0.5
    const dy = ny - 0.5
    inShape = dx * dx + dy * dy <= 0.25
  } else {
    const R = 0.219
    const cx = Math.min(Math.max(nx, R), 1 - R)
    const cy = Math.min(Math.max(ny, R), 1 - R)
    const dx = nx - cx
    const dy = ny - cy
    inShape = dx * dx + dy * dy <= R * R
  }
  if (!inShape) return null
  const p = pin(nx, ny, 0.5, 0.5, 1)
  return p || [...BG, 255]
}

/** 定位图钉（白色圆环 + 下方三角），(cx,cy) 为中心，f 为缩放系数 */
function pin(nx, ny, cx, cy, f) {
  const lx = (nx - cx) / f + 0.5
  const ly = (ny - cy) / f + 0.492
  const dx = lx - 0.5
  const dy = ly - 0.3906
  const d = Math.sqrt(dx * dx + dy * dy)
  if (d <= 0.1875 && d >= 0.082) return [...FG, 255]
  if (ly >= 0.578 && ly <= 0.781) {
    const t = (ly - 0.578) / (0.781 - 0.578)
    const halfW = 0.0117 + t * (0.109 - 0.0117)
    if (Math.abs(lx - 0.5) <= halfW) return [...FG, 255]
  }
  return null
}

/** 4x4 超采样渲染，消除锯齿 */
function render(size, mode) {
  const stride = size * 4 + 1
  const raw = Buffer.alloc(size * stride)
  const SS = 4
  for (let y = 0; y < size; y++) {
    const rowStart = y * stride
    raw[rowStart] = 0
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const nx = (x + (sx + 0.5) / SS) / size
          const ny = (y + (sy + 0.5) / SS) / size
          const c = pixel(nx, ny, mode)
          if (c) {
            const alpha = c[3] / 255
            r += c[0] * alpha
            g += c[1] * alpha
            b += c[2] * alpha
            a += c[3]
          }
        }
      }
      const n = SS * SS
      const o = rowStart + 1 + x * 4
      const alpha = a / n
      if (alpha <= 0) {
        raw[o] = raw[o + 1] = raw[o + 2] = raw[o + 3] = 0
      } else {
        // 预乘还原
        raw[o] = Math.round(r / n / (alpha / 255))
        raw[o + 1] = Math.round(g / n / (alpha / 255))
        raw[o + 2] = Math.round(b / n / (alpha / 255))
        raw[o + 3] = Math.round(alpha)
      }
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const res = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res')
if (!fs.existsSync(res)) {
  console.error('未找到 android/app/src/main/res，请先执行 npx cap add android')
  process.exit(1)
}

const densities = [
  ['mipmap-mdpi', 48, 108],
  ['mipmap-hdpi', 72, 162],
  ['mipmap-xhdpi', 96, 216],
  ['mipmap-xxhdpi', 144, 324],
  ['mipmap-xxxhdpi', 192, 432],
]

let count = 0
for (const [dir, iconSize, fgSize] of densities) {
  const d = path.join(res, dir)
  fs.mkdirSync(d, { recursive: true })
  fs.writeFileSync(path.join(d, 'ic_launcher.png'), render(iconSize, 'square'))
  fs.writeFileSync(path.join(d, 'ic_launcher_round.png'), render(iconSize, 'round'))
  fs.writeFileSync(path.join(d, 'ic_launcher_foreground.png'), render(fgSize, 'foreground'))
  count += 3
}

// 启动背景：纯色（避免不同屏幕比例拉伸导致图标变形）
const drawable = path.join(res, 'drawable')
fs.mkdirSync(drawable, { recursive: true })
fs.writeFileSync(path.join(drawable, 'splash.png'), render(256, 'solid'))
count += 1

console.log(`已生成 ${count} 个 Android 图标资源 -> android/app/src/main/res`)
