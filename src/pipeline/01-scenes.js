import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';
import config from '../config.js';
import logger from '../logger.js';
import { generateScenes } from '../providers/index.js';
import { parseScenes } from '../schema.js';

const scenesPath = resolve(config.outputDir, 'scenes.json');

export async function step01Scenes() {
  if (existsSync(scenesPath)) {
    logger.info('01-scenes: checkpoint found, loading from disk');
    const raw = JSON.parse(await readFile(scenesPath, 'utf8'));
    const { scenes, error } = parseScenes(raw);
    if (error) throw new Error(`Checkpoint scenes.json is invalid: ${JSON.stringify(error)}`);
    return scenes;
  }

  logger.info('01-scenes: generating scenes...');
  const scenes = await generateScenes();
  await mkdir(config.outputDir, { recursive: true });
  await writeFile(scenesPath, JSON.stringify(scenes, null, 2));
  logger.info(`01-scenes: ${scenes.length} scenes saved → scenes.json`);
  return scenes;
}
