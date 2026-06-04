import config from './config.js';
import logger from './logger.js';
import { step01Scenes }  from './pipeline/01-scenes.js';
import { step02Images }  from './pipeline/02-images.js';
import { step03Clips }   from './pipeline/03-clips.js';
import { step04Audio }   from './pipeline/04-audio.js';
import { step05Compose } from './pipeline/05-compose.js';

logger.info('=== estación de la mano ===', { mode: config.mode, language: config.language });

try {
  const scenes  = await step01Scenes();
  await step02Images(scenes);
  await step03Clips(scenes);
  await step04Audio(scenes);
  const output  = await step05Compose(scenes);
  logger.info(`=== done → ${output} ===`);
} catch (err) {
  logger.error('pipeline failed', { message: err.message });
  process.exit(1);
}
