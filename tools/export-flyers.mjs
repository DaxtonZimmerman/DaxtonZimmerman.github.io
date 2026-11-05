import { mkdir, readFile } from 'node:fs/promises';
import sharp from 'sharp';

const source = new URL('../designs/flyers/', import.meta.url);
const output = new URL('../dist/assets/flyers/', import.meta.url);
await mkdir(output, { recursive: true });

for (const [name, photo] of [
  ['open-house', 'modern.jpg'],
  ['just-listed', 'garden.jpg'],
]) {
  const layout = await readFile(new URL(`${name}.svg`, source), 'utf8');
  const image = await readFile(new URL(photo, source));
  const artwork = Buffer.from(
    layout.replace(`href="${photo}"`, `href="data:image/jpeg;base64,${image.toString('base64')}"`),
  );
  await sharp(artwork)
    .png()
    .toFile(new URL(`${name}.png`, output).pathname);
  await sharp(artwork)
    .resize(800)
    .webp({ quality: 87 })
    .toFile(new URL(`${name}.webp`, output).pathname);
}
