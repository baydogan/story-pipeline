import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';
import ffmpeg from 'fluent-ffmpeg';
import config from '../config.js';
import logger from '../logger.js';
import { clipPathFor } from './03-clips.js';

function toFfmpegPath(p) {
  // ffmpeg concat demuxer requires forward slashes even on Windows
  return p.replace(/\\/g, '/');
}

function runFfmpeg(cmd) {
  return new Promise((res, rej) =>
    cmd.on('end', res).on('error', rej).run()
  );
}

export async function step05Compose(scenes) {
  const finalPath = resolve(config.outputDir, 'final.mp4');

  if (existsSync(finalPath)) {
    logger.info('05-compose: checkpoint found, skipping');
    return finalPath;
  }

  await mkdir(config.outputDir, { recursive: true });

  // Verify all clips exist before attempting concat
  for (const scene of scenes) {
    const p = clipPathFor(scene);
    if (!existsSync(p)) throw new Error(`05-compose: missing clip for scene ${scene.id}: ${p}`);
  }

  // Write concat manifest
  const listPath = resolve(config.outputDir, 'concat.txt');
  const lines = scenes.map(s => `file '${toFfmpegPath(clipPathFor(s))}'`);
  await writeFile(listPath, lines.join('\n'));
  logger.debug(`05-compose: concat list\n${lines.join('\n')}`);

  logger.info(`05-compose: concatenating ${scenes.length} clips...`);

  await runFfmpeg(
    ffmpeg()
      .input(toFfmpegPath(listPath))
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions(['-c copy', '-movflags +faststart', '-y'])
      .output(toFfmpegPath(finalPath))
  );

  logger.info(`05-compose: final.mp4 ready → ${finalPath}`);
  return finalPath;
}
