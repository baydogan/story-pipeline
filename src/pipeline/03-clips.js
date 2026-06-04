import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';
import config from '../config.js';
import logger from '../logger.js';
import { generateClip } from '../providers/index.js';
import { imagePathFor } from './02-images.js';

function clipPathFor(scene) {
  return resolve(config.outputDir, `scene-${String(scene.id).padStart(2, '0')}`, 'clip.mp4');
}

export { clipPathFor };

export async function step03Clips(scenes) {
  for (const scene of scenes) {
    const clipPath  = clipPathFor(scene);
    const imagePath = imagePathFor(scene);

    if (existsSync(clipPath)) {
      logger.info(`03-clips: scene ${scene.id} checkpoint found, skipping`);
      continue;
    }

    if (!existsSync(imagePath)) {
      throw new Error(`03-clips: image missing for scene ${scene.id}: ${imagePath}`);
    }

    logger.info(`03-clips: generating clip for scene ${scene.id} (${scene.duration}s ${scene.camera_motion})...`);
    await mkdir(resolve(config.outputDir, `scene-${String(scene.id).padStart(2, '0')}`), { recursive: true });
    await generateClip(scene, imagePath, clipPath);
    logger.info(`03-clips: scene ${scene.id} done`);
  }
}
