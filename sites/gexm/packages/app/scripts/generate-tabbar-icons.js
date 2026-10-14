const fs = require('fs')
const path = require('path')

const tabbarDir = path.join(__dirname, '../src/static/tabbar')
if (!fs.existsSync(tabbarDir)) {
  fs.mkdirSync(tabbarDir, { recursive: true })
}

function createPNG(width, height, r, g, b, a = 255) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  function crc32(data) {
    let crc = 0xffffffff
    const table = []
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      }
      table[n] = c
    }
    for (let i = 0; i < data.length; i++) {
      crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
    }
    return (crc ^ 0xffffffff) >>> 0
  }

  function createChunk(type, data) {
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length)
    const typeBuffer = Buffer.from(type)
    const crcData = Buffer.concat([typeBuffer, data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(crcData))
    return Buffer.concat([length, typeBuffer, data, crc])
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const rawData = []
  for (let y = 0; y < height; y++) {
    rawData.push(0)
    for (let x = 0; x < width; x++) {
      rawData.push(r, g, b, a)
    }
  }

  const { deflateSync } = require('zlib')
  const compressed = deflateSync(Buffer.from(rawData))

  const ihdrChunk = createChunk('IHDR', ihdr)
  const idatChunk = createChunk('IDAT', compressed)
  const iendChunk = createChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

const icons = {
  'home.png': createPNG(48, 48, 153, 153, 153),
  'home-active.png': createPNG(48, 48, 64, 158, 255),
  'category.png': createPNG(48, 48, 153, 153, 153),
  'category-active.png': createPNG(48, 48, 64, 158, 255),
  'cart.png': createPNG(48, 48, 153, 153, 153),
  'cart-active.png': createPNG(48, 48, 64, 158, 255),
  'profile.png': createPNG(48, 48, 153, 153, 153),
  'profile-active.png': createPNG(48, 48, 64, 158, 255),
}

for (const [name, buffer] of Object.entries(icons)) {
  fs.writeFileSync(path.join(tabbarDir, name), buffer)
  console.log(`Created: ${name}`)
}

console.log('All tabbar icons generated successfully!')
