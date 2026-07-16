import sharp from 'sharp';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const svgBuffer = readFileSync(path.join(publicDir, 'icon-512.svg'));

const BRAND_COLOR = '#2563EB';

async function generate() {
  await sharp(svgBuffer, { density: 384 })
    .resize(192, 192)
    .flatten({ background: BRAND_COLOR })
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));

  await sharp(svgBuffer, { density: 384 })
    .resize(512, 512)
    .flatten({ background: BRAND_COLOR })
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));

  await sharp(svgBuffer, { density: 384 })
    .resize(180, 180)
    .flatten({ background: BRAND_COLOR })
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  const contentSize = Math.round(512 * 0.8);
  const contentBuffer = await sharp(svgBuffer, { density: 384 })
    .resize(contentSize, contentSize)
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: BRAND_COLOR,
    },
  })
    .composite([{ input: contentBuffer, gravity: 'center' }])
    .png()
    .toFile(path.join(publicDir, 'maskable-512.png'));

  console.log('Icons generated: icon-192.png, icon-512.png, apple-touch-icon.png, maskable-512.png');
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
