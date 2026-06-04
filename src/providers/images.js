import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import sharp from 'sharp';
import logger from '../logger.js';

// One dark-toned color pair per scene (cycles for > 6 scenes)
const PALETTE = [
  { bg: '#1a1208', fg: '#c8b89a' },
  { bg: '#0d1a14', fg: '#9ab8a0' },
  { bg: '#1a0d0d', fg: '#c8a09a' },
  { bg: '#0d0d1a', fg: '#9a9ac8' },
  { bg: '#1a1510', fg: '#c8b89a' },
  { bg: '#100d1a', fg: '#b89ac8' },
];

function escape(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Wrap long text into lines of max `maxChars` chars
function wrap(text, maxChars = 60) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = line ? line + ' ' + w : w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function mockGenerateImage(scene, outputPath) {
  await mkdir(dirname(outputPath), { recursive: true });

  const { bg, fg } = PALETTE[(scene.id - 1) % PALETTE.length];
  const W = 1920, H = 1080;
  const cx = W / 2, cy = H / 2;

  const summaryLines = wrap(scene.summary);
  const lineH = 30;
  const summaryY = cy + 24;

  const linesSvg = summaryLines
    .map((l, i) =>
      `<text x="${cx}" y="${summaryY + i * lineH}" font-family="Georgia,serif" font-size="22"
             fill="${fg}" fill-opacity="0.72" text-anchor="middle">${escape(l)}</text>`
    )
    .join('\n    ');

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="rg" cx="50%" cy="50%" r="65%">
      <stop offset="0%" stop-color="${bg}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#050505" stop-opacity="1"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#050505"/>
  <rect width="${W}" height="${H}" fill="url(#rg)"/>
  <text x="${cx}" y="${cy - 12}" font-family="Georgia,serif" font-size="38"
        fill="${fg}" text-anchor="middle">Scene ${scene.id}</text>
  ${linesSvg}
</svg>`;

  await sharp(Buffer.from(svg)).png().toFile(outputPath);
  logger.debug(`images.mock: wrote ${outputPath}`);
}

async function localGenerateImage(scene, outputPath) {
  const { readFileSync } = await import('fs');
  const { resolve, dirname: dn } = await import('path');
  const { fileURLToPath } = await import('url');
  const { writeFile, mkdir: mkd } = await import('fs/promises');
  const { runWorkflow, downloadFile, patchWorkflow } = await import('../comfy/client.js');

  const __dirname = dn(fileURLToPath(import.meta.url));
  const template  = JSON.parse(readFileSync(resolve(__dirname, '../comfy/workflows/sdxl.json'), 'utf8'));

  const workflow = patchWorkflow(template, {
    '2': { text: scene.image_prompt },
    '3': { text: scene.negative_prompt || 'bright colors, modern, cartoon, text, watermark' },
    '5': { seed: scene.seed ?? 0 },
  });

  logger.info(`images.local: running SDXL for scene ${scene.id}...`);
  const files = await runWorkflow(workflow);
  const img   = files.find(f => /\.(png|jpg|webp)$/i.test(f.filename));
  if (!img) throw new Error(`SDXL produced no image output for scene ${scene.id}`);

  const buffer = await downloadFile(img.filename, img.subfolder, img.type);
  await mkd(dn(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);
  logger.info(`images.local: scene ${scene.id} → ${outputPath}`);
}

export const mock  = mockGenerateImage;
export const local = localGenerateImage;
