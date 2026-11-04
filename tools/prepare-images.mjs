import sharp from 'sharp';
import { stat } from 'node:fs/promises';

// Re-encode existing assets only; the original artwork and screenshots stay untouched.
const images = [
  ['daxton-room.png', 'room', [768, 1024, 1536]],
  ['triaswear.png', 'triaswear', [480, 960, 1536]],
  ['triaswear-product.png', 'triaswear-product', [480, 960, 1536]],
  ['flow.png', 'flow', [480, 960, 1536]],
  ['codepath.png', 'codepath', [480, 960, 1536]],
  ['vector.png', 'vector', [480, 960, 1536]],
];
for (const [source, name, widths] of images) {
  for (const width of widths) {
    const output = `dist/assets/${name}-${width}.webp`;
    await sharp(`dist/assets/${source}`)
      .resize({ width })
      .webp({ quality: 82, effort: 6 })
      .toFile(output);
    console.log(`${output}: ${Math.round((await stat(output)).size / 1024)} KB`);
  }
}
