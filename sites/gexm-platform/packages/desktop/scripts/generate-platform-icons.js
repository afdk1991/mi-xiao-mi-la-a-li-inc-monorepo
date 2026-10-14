const fs = require('fs')
const path = require('path')

const assetsDir = path.join(__dirname, '../assets')

function pngToIco(pngData, sizes) {
  const ico = []

  ico.push(0, 0)
  ico.push(1, 0)
  ico.push(sizes.length)

  const iconDirEntries = []
  const imageData = []

  let offset = 6 + sizes.length * 16

  sizes.forEach((size) => {
    const width = size
    const height = size

    const rawData = []
    for (let y = 0; y < height; y++) {
      rawData.push(0)
      for (let x = 0; x < width; x++) {
        rawData.push(64, 158, 255, 255)
      }
    }

    const { deflateSync } = require('zlib')
    const compressed = deflateSync(Buffer.from(rawData))

    iconDirEntries.push(width)
    iconDirEntries.push(height)
    iconDirEntries.push(0)
    iconDirEntries.push(0)
    iconDirEntries.push(1)
    iconDirEntries.push(32)
    iconDirEntries.push(0)
    iconDirEntries.push(0)
    iconDirEntries.push((compressed.length >> 0) & 0xff)
    iconDirEntries.push((compressed.length >> 8) & 0xff)
    iconDirEntries.push((compressed.length >> 16) & 0xff)
    iconDirEntries.push((compressed.length >> 24) & 0xff)
    iconDirEntries.push((offset >> 0) & 0xff)
    iconDirEntries.push((offset >> 8) & 0xff)
    iconDirEntries.push((offset >> 16) & 0xff)
    iconDirEntries.push((offset >> 24) & 0xff)

    imageData.push(...compressed)
    offset += compressed.length
  })

  return Buffer.from([...ico, ...iconDirEntries, ...imageData])
}

console.log('Creating Windows ICO file...')

const icoData = pngToIco(null, [16, 32, 48, 64, 128, 256])
fs.writeFileSync(path.join(assetsDir, 'icon.ico'), icoData)
console.log('Created: icon.ico')

console.log('\nCreating macOS ICNS file...')

function createIcns() {
  const icns = Buffer.alloc(8)
  icns.write('icns', 0)
  icns.writeUInt32BE(8, 4)

  const types = [
    ['ICON', 32, 32],
    ['ICN#', 64, 64],
    ['ic07', 128, 128],
    ['ic08', 256, 256],
    ['ic09', 512, 512],
  ]

  const result = [icns]
  let totalSize = 8

  types.forEach(([type, w, h]) => {
    const rawData = []
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        rawData.push(64, 158, 255, 255)
      }
    }

    const { deflateSync } = require('zlib')
    const compressed = deflateSync(Buffer.from(rawData))

    const entry = Buffer.alloc(8 + compressed.length)
    entry.write(type, 0)
    entry.writeUInt32BE(8 + compressed.length, 4)
    compressed.copy(entry, 8)

    result.push(entry)
    totalSize += 8 + compressed.length
  })

  const finalResult = Buffer.concat(result)
  finalResult.writeUInt32BE(totalSize, 4)

  return finalResult
}

const icnsData = createIcns()
fs.writeFileSync(path.join(assetsDir, 'icon.icns'), icnsData)
console.log('Created: icon.icns')

console.log('\nAll platform icons created successfully!')
