import { createReadStream } from "node:fs"

export type ZipFileEntry = {
  filePath: string
  name: string
  mtime?: Date
}

type CentralDirectoryEntry = {
  name: Uint8Array
  crc: number
  size: number
  offset: number
  dosTime: number
  dosDate: number
}

const encoder = new TextEncoder()
const crcTable = new Uint32Array(256)

for (let n = 0; n < 256; n += 1) {
  let c = n

  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }

  crcTable[n] = c >>> 0
}

function crc32Update(crc: number, chunk: Uint8Array) {
  let next = crc

  for (let index = 0; index < chunk.length; index += 1) {
    next = crcTable[(next ^ chunk[index]) & 0xff] ^ (next >>> 8)
  }

  return next >>> 0
}

function u16(value: number) {
  const bytes = new Uint8Array(2)
  const view = new DataView(bytes.buffer)
  view.setUint16(0, value, true)
  return bytes
}

function u32(value: number) {
  const bytes = new Uint8Array(4)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, value >>> 0, true)
  return bytes
}

function bytes(...chunks: Uint8Array[]) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const output = new Uint8Array(total)
  let offset = 0

  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.length
  }

  return output
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, Math.min(2107, date.getFullYear()))
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const seconds = Math.floor(date.getSeconds() / 2)

  return {
    dosTime: (hours << 11) | (minutes << 5) | seconds,
    dosDate: ((year - 1980) << 9) | (month << 5) | day
  }
}

function localHeader(name: Uint8Array, dosTime: number, dosDate: number) {
  return bytes(
    u32(0x04034b50),
    u16(20),
    u16(0x08),
    u16(0),
    u16(dosTime),
    u16(dosDate),
    u32(0),
    u32(0),
    u32(0),
    u16(name.length),
    u16(0),
    name
  )
}

function dataDescriptor(crc: number, size: number) {
  return bytes(u32(0x08074b50), u32(crc), u32(size), u32(size))
}

function centralDirectoryHeader(entry: CentralDirectoryEntry) {
  return bytes(
    u32(0x02014b50),
    u16(20),
    u16(20),
    u16(0x08),
    u16(0),
    u16(entry.dosTime),
    u16(entry.dosDate),
    u32(entry.crc),
    u32(entry.size),
    u32(entry.size),
    u16(entry.name.length),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u32(0),
    u32(entry.offset),
    entry.name
  )
}

function endOfCentralDirectory(fileCount: number, centralSize: number, centralOffset: number) {
  return bytes(
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(fileCount),
    u16(fileCount),
    u32(centralSize),
    u32(centralOffset),
    u16(0)
  )
}

async function* zipEntries(entries: ZipFileEntry[]) {
  const centralDirectory: CentralDirectoryEntry[] = []
  let offset = 0

  for (const entry of entries) {
    const normalizedName = entry.name.replace(/^\/+/, "").replace(/\\/g, "/")
    const name = encoder.encode(normalizedName)
    const { dosTime, dosDate } = dosDateTime(entry.mtime)
    const fileOffset = offset
    const header = localHeader(name, dosTime, dosDate)

    yield header
    offset += header.length

    let crc = 0xffffffff
    let size = 0

    for await (const chunk of createReadStream(entry.filePath)) {
      const data = typeof chunk === "string" ? encoder.encode(chunk) : new Uint8Array(chunk)
      crc = crc32Update(crc, data)
      size += data.length
      offset += data.length
      yield data
    }

    const finalizedCrc = (crc ^ 0xffffffff) >>> 0
    const descriptor = dataDescriptor(finalizedCrc, size)

    yield descriptor
    offset += descriptor.length
    centralDirectory.push({ name, crc: finalizedCrc, size, offset: fileOffset, dosTime, dosDate })
  }

  const centralOffset = offset

  for (const entry of centralDirectory) {
    const header = centralDirectoryHeader(entry)
    yield header
    offset += header.length
  }

  yield endOfCentralDirectory(centralDirectory.length, offset - centralOffset, centralOffset)
}

export function createZipReadableStream(entries: ZipFileEntry[]) {
  const iterator = zipEntries(entries)[Symbol.asyncIterator]()

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const result = await iterator.next()

      if (result.done) {
        controller.close()
        return
      }

      controller.enqueue(result.value)
    },
    async cancel() {
      if (iterator.return) {
        await iterator.return()
      }
    }
  })
}
