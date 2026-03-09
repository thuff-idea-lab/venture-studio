// Generate PNG icons for the Chrome extension
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(assetsDir, { recursive: true });

function generateSVG(size) {
  const r = Math.round(size * 0.2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="#007BFF"/>
  <circle cx="${size/2}" cy="${size*0.35}" r="${size*0.18}" fill="white" opacity="0.9"/>
  <rect x="${size*0.25}" y="${size*0.55}" width="${size*0.5}" height="${size*0.06}" rx="${size*0.03}" fill="white" opacity="0.7"/>
  <rect x="${size*0.3}" y="${size*0.65}" width="${size*0.4}" height="${size*0.06}" rx="${size*0.03}" fill="white" opacity="0.5"/>
  <circle cx="${size*0.72}" cy="${size*0.78}" r="${size*0.13}" fill="#28A745"/>
  <circle cx="${size*0.72}" cy="${size*0.78}" r="${size*0.05}" fill="white"/>
</svg>`;
}

// Chrome accepts SVG icons in MV3, but for broadest compatibility, 
// we'll save as SVG and also create a conversion note.
[16, 48, 128].forEach(size => {
  const svg = generateSVG(size);
  // Save as PNG-compatible SVG (Chrome can use these)
  fs.writeFileSync(path.join(assetsDir, `icon${size}.svg`), svg);
  console.log(`Created icon${size}.svg`);
});

// Also create a simple PNG using raw bytes for each size
// This creates minimal valid PNG files with a blue background
function createPNG(size) {
  // Create a simple RGBA buffer
  const pixels = Buffer.alloc(size * size * 4);
  const r2 = Math.round(size * 0.2);
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      
      // Simple circle in the center for the icon
      const cx = size / 2;
      const cy = size / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const radius = size * 0.45;
      
      if (dist <= radius) {
        // Blue background
        pixels[idx] = 0;      // R
        pixels[idx + 1] = 123; // G
        pixels[idx + 2] = 255; // B
        pixels[idx + 3] = 255; // A
        
        // White dot in upper area (lens/record indicator)
        const dotCx = size * 0.5;
        const dotCy = size * 0.38;
        const dotR = size * 0.15;
        const dotDist = Math.sqrt((x - dotCx) ** 2 + (y - dotCy) ** 2);
        if (dotDist <= dotR) {
          pixels[idx] = 255;
          pixels[idx + 1] = 255;
          pixels[idx + 2] = 255;
          pixels[idx + 3] = 230;
        }
        
        // Green dot (record light)
        const gCx = size * 0.7;
        const gCy = size * 0.7;
        const gR = size * 0.1;
        const gDist = Math.sqrt((x - gCx) ** 2 + (y - gCy) ** 2);
        if (gDist <= gR) {
          pixels[idx] = 40;
          pixels[idx + 1] = 167;
          pixels[idx + 2] = 69;
          pixels[idx + 3] = 255;
        }
      } else {
        // Transparent
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
      }
    }
  }
  
  return encodePNG(size, size, pixels);
}

// Minimal PNG encoder
function encodePNG(width, height, pixels) {
  const zlib = require('zlib');
  
  // Add filter byte (0 = None) to each row
  const rawData = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    rawData[y * (width * 4 + 1)] = 0; // filter: None
    pixels.copy(rawData, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  
  const compressed = zlib.deflateSync(rawData);
  
  // Build PNG
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = makeChunk('IHDR', ihdrData);
  
  // IDAT
  const idat = makeChunk('IDAT', compressed);
  
  // IEND
  const iend = makeChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

function makeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = crc32(Buffer.concat([typeBuffer, data]));
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

[16, 48, 128].forEach(size => {
  const png = createPNG(size);
  fs.writeFileSync(path.join(assetsDir, `icon${size}.png`), png);
  console.log(`Created icon${size}.png (${png.length} bytes)`);
});

console.log('Done! Icons created in', assetsDir);
