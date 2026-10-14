const fs = require('fs')
const path = require('path')

const assetsDir = path.join(__dirname, '../assets')

const createPngIcon = (width, height, color) => {
  const png = Buffer.alloc(8 + 25 + 12 + 12 + 12 + width * height * 4 + 12 + 16)

  let offset = 0
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  signature.copy(png, offset)
  offset += 8

  const ihdrChunk = Buffer.alloc(13)
  ihdrChunk.writeUInt32BE(width, 0)
  ihdrChunk.writeUInt32BE(height, 4)
  ihdrChunk[8] = 8
  ihdrChunk[9] = 6
  ihdrChunk[10] = 0
  ihdrChunk[11] = 0
  ihdrChunk[12] = 0
  const ihdrLength = Buffer.alloc(4)
  ihdrLength.writeUInt32BE(13, 0)
  ihdrLength.copy(png, offset)
  offset += 4
  const ihdrType = Buffer.from('IHDR')
  ihdrType.copy(png, offset)
  offset += 4
  ihdrChunk.copy(png, offset)
  offset += 13
  const ihdrCrc = crc32(Buffer.concat([ihdrType, ihdrChunk]))
  const ihdrCrcBuf = Buffer.alloc(4)
  ihdrCrcBuf.writeUInt32BE(ihdrCrc >>> 0, 0)
  ihdrCrcBuf.copy(png, offset)
  offset += 4

  const rawData = []
  for (let y = 0; y < height; y++) {
    rawData.push(0)
    for (let x = 0; x < width; x++) {
      const r = parseInt(color.slice(1, 3), 16)
      const g = parseInt(color.slice(3, 5), 16)
      const b = parseInt(color.slice(5, 7), 16)
      rawData.push(r, g, b, 255)
    }
  }
  const rawBuffer = Buffer.from(rawData)

  const { deflateSync } = require('zlib')
  const compressedData = deflateSync(rawBuffer)

  const idatLength = Buffer.alloc(4)
  idatLength.writeUInt32BE(compressedData.length, 0)
  idatLength.copy(png, offset)
  offset += 4
  const idatType = Buffer.from('IDAT')
  idatType.copy(png, offset)
  offset += 4
  compressedData.copy(png, offset)
  offset += compressedData.length
  const idatCrc = crc32(Buffer.concat([idatType, compressedData]))
  const idatCrcBuf = Buffer.alloc(4)
  idatCrcBuf.writeUInt32BE(idatCrc >>> 0, 0)
  idatCrcBuf.copy(png, offset)
  offset += 4

  const iendLength = Buffer.alloc(4)
  iendLength.writeUInt32BE(0, 0)
  iendLength.copy(png, offset)
  offset += 4
  const iendType = Buffer.from('IEND')
  iendType.copy(png, offset)
  offset += 4
  const iendCrc = crc32(iendType)
  const iendCrcBuf = Buffer.alloc(4)
  iendCrcBuf.writeUInt32BE(iendCrc >>> 0, 0)
  iendCrcBuf.copy(png, offset)

  return png.slice(0, offset)
}

const crc32 = (buf) => {
  let crc = 0xffffffff
  const table = []
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c
  }
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return crc ^ 0xffffffff
}

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true })
}

console.log('Creating desktop application icons...')

const windowIcon = createPngIcon(256, 256, '#409EFF')
fs.writeFileSync(path.join(assetsDir, 'icon.png'), windowIcon)
console.log('Created: icon.png (256x256)')

const trayIcon = createPngIcon(64, 64, '#409EFF')
fs.writeFileSync(path.join(assetsDir, 'tray.png'), trayIcon)
console.log('Created: tray.png (64x64)')

const smallIcon = createPngIcon(32, 32, '#409EFF')
fs.writeFileSync(path.join(assetsDir, 'icon-32.png'), smallIcon)
console.log('Created: icon-32.png (32x32)')

const smallIcon16 = createPngIcon(16, 16, '#409EFF')
fs.writeFileSync(path.join(assetsDir, 'icon-16.png'), smallIcon16)
console.log('Created: icon-16.png (16x16)')

console.log('\nAll icons created successfully!')
console.log('Location:', assetsDir)
