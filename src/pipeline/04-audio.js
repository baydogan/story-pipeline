import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';
import config from '../config.js';
import logger from '../logger.js';
import { generateAudio } from '../providers/index.js';

function audioPathFor(scene) {
  return resolve(config.outputDir, `scene-${String(scene.id).padStart(2, '0')}`, 'narration.wav');
}

export { audioPathFor };

export async function step04Audio(scenes) {
  for (const scene of scenes) {
    if (scene.language === 'none') {
      logger.info(`04-audio: scene ${scene.id} language=none, skipping`);
      continue;
    }

    const audioPath = audioPathFor(scene);

    if (existsSync(audioPath)) {
      logger.info(`04-audio: scene ${scene.id} checkpoint found, skipping`);
      continue;
    }

    logger.info(`04-audio: generating narration for scene ${scene.id}...`);
    await mkdir(resolve(config.outputDir, `scene-${String(scene.id).padStart(2, '0')}`), { recursive: true });
    await generateAudio(scene, audioPath);
    logger.info(`04-audio: scene ${scene.id} done`);
  }
}
