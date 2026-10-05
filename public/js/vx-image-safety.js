(function () {
  const MAX_HEADER_BYTES = 1024 * 1024;

  function readU24(view, offset, littleEndian) {
    if (littleEndian) {
      return view.getUint8(offset) | (view.getUint8(offset + 1) << 8) | (view.getUint8(offset + 2) << 16);
    }
    return (view.getUint8(offset) << 16) | (view.getUint8(offset + 1) << 8) | view.getUint8(offset + 2);
  }

  function ascii(bytes, offset, length) {
    return String.fromCharCode(...bytes.slice(offset, offset + length));
  }

  function dimensionsFromHeader(buffer) {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    if (bytes.length >= 24 && bytes[0] === 0x89 && ascii(bytes, 1, 3) === "PNG") {
      return { width: view.getUint32(16), height: view.getUint32(20) };
    }
    if (bytes.length >= 10 && (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a")) {
      return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
    }
    if (bytes.length >= 30 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") {
      const chunk = ascii(bytes, 12, 4);
      if (chunk === "VP8X" && bytes.length >= 30) {
        return { width: 1 + readU24(view, 24, true), height: 1 + readU24(view, 27, true) };
      }
      if (chunk === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
        const width = 1 + ((bytes[21] | (bytes[22] << 8)) & 0x3fff);
        const height = 1 + (((bytes[22] >> 6) | (bytes[23] << 2) | (bytes[24] << 10)) & 0x3fff);
        return { width, height };
      }
      if (chunk === "VP8 " && bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
        return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
      }
    }
    if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
      let offset = 2;
      while (offset + 9 < bytes.length) {
        if (bytes[offset] !== 0xff) { offset += 1; continue; }
        while (bytes[offset] === 0xff) offset += 1;
        const marker = bytes[offset++];
        if (marker === 0xd8 || marker === 0xd9) continue;
        if (offset + 1 >= bytes.length) break;
        const length = view.getUint16(offset);
        if (length < 2 || offset + length > bytes.length) break;
        const isFrame = (marker >= 0xc0 && marker <= 0xc3)
          || (marker >= 0xc5 && marker <= 0xc7)
          || (marker >= 0xc9 && marker <= 0xcb)
          || (marker >= 0xcd && marker <= 0xcf);
        if (isFrame && length >= 7) {
          return { width: view.getUint16(offset + 5), height: view.getUint16(offset + 3) };
        }
        offset += length;
      }
    }
    return null;
  }

  async function inspectDimensions(file) {
    const header = await file.slice(0, MAX_HEADER_BYTES).arrayBuffer();
    const parsed = dimensionsFromHeader(header, file.type);
    if (parsed && parsed.width > 0 && parsed.height > 0) return parsed;

    if (typeof window.ImageDecoder === "function") {
      try {
        const decoder = new window.ImageDecoder({ data: file, type: file.type });
        await decoder.tracks.ready;
        const track = decoder.tracks.selectedTrack;
        const result = track?.codedWidth && track?.codedHeight
          ? { width: track.codedWidth, height: track.codedHeight }
          : null;
        decoder.close();
        return result;
      } catch (_) {
        // The normal image loader remains the compatibility fallback.
      }
    }
    return null;
  }

  window.VxImageSafety = { inspectDimensions };
})();
