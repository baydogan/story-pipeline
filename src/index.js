import config from './config.js';
import logger from './logger.js';
import { step01Scenes }  from './pipeline/01-scenes.js';
import { step02Images }  from './pipeline/02-images.js';
import { step03Clips }   from './pipeline/03-clips.js';
import { step04Audio }   from './pipeline/04-audio.js';
import { step05Compose } from './pipeline/05-compose.js';

logger.info('=== estación de la mano ===', { mode: config.mode, language: config.language });

if (config.mode === 'local') {
  const checks = [
    { name: 'Ollama',   url: `${config.ollama.url}/api/tags` },
    { name: 'ComfyUI',  url: `${config.comfy.url}/system_stats` },
  ];
  const failed = [];
  await Promise.all(checks.map(async ({ name, url }) => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) failed.push({ name, reason: `HTTP ${res.status}` });
    } catch {
      failed.push({ name, reason: 'not reachable' });
    }
  }));
  if (failed.length) {
    for (const { name, reason } of failed)
      logger.error(`PREFLIGHT: ${name} is ${reason} — start it before running in local mode`);
    logger.error('Pipeline aborted. Tip: run with MODE=mock to test without services.');
    process.exit(1);
  }
  logger.info('preflight: Ollama + ComfyUI reachable');
}

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
