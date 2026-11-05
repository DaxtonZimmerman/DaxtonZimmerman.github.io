import { mkdir, readFile } from 'node:fs/promises';
import sharp from 'sharp';

const source = new URL('../designs/flyers/', import.meta.url);
const output = new URL('../dist/assets/flyers/', import.meta.url);
const flyers = JSON.parse(
  await readFile(new URL('../content/flyers.json', import.meta.url), 'utf8'),
);
await mkdir(output, { recursive: true });

for (const { id, photo } of flyers) {
  const layout = await readFile(new URL(`${id}.svg`, source), 'utf8');
  const image = await readFile(new URL(photo, source));
  const artwork = Buffer.from(
    layout.replaceAll(
      `href="${photo}"`,
      `href="data:image/jpeg;base64,${image.toString('base64')}"`,
    ),
  );
  await sharp(artwork)
    .png()
    .toFile(new URL(`${id}.png`, output).pathname);
  await sharp(artwork)
    .resize(800)
    .webp({ quality: 87 })
    .toFile(new URL(`${id}.webp`, output).pathname);
}
