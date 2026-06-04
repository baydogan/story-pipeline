import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';
import config from '../config.js';
import logger from '../logger.js';
import { generateImage } from '../providers/index.js';

function sceneDir(scene) {
  return resolve(config.outputDir, `scene-${String(scene.id).padStart(2, '0')}`);
}

export function imagePathFor(scene) {
  return resolve(sceneDir(scene), 'image.png');
}

export async function step02Images(scenes) {
  for (const scene of scenes) {
    const imagePath = imagePathFor(scene);

    if (existsSync(imagePath)) {
      logger.info(`02-images: scene ${scene.id} checkpoint found, skipping`);
      continue;
    }

    logger.info(`02-images: generating image for scene ${scene.id}...`);
    await mkdir(sceneDir(scene), { recursive: true });
    await generateImage(scene, imagePath);
    logger.info(`02-images: scene ${scene.id} done`);
  }
}
