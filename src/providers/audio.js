import { mkdir, writeFile } from 'fs/promises';
import { dirname } from 'path';
import logger from '../logger.js';

// Builds a minimal silent PCM WAV buffer (16-bit, 44100 Hz, mono).
// No external dependencies — just raw bytes.
function silentWav(seconds) {
  const sampleRate   = 44100;
  const channels     = 1;
  const bitsPerSample = 16;
  const numSamples   = Math.floor(sampleRate * seconds);
  const dataSize     = numSamples * channels * (bitsPerSample / 8);
  const buf          = Buffer.alloc(44 + dataSize); // zeros = silence

  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);                                      // PCM
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * channels * (bitsPerSample / 8), 28);
  buf.writeUInt16LE(channels * (bitsPerSample / 8), 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);

  return buf;
}

async function mockGenerateAudio(scene, outputPath) {
  if (scene.language === 'none') {
    logger.debug(`audio.mock: language=none, skipping scene ${scene.id}`);
    return;
  }
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, silentWav(scene.duration ?? 4));
  logger.debug(`audio.mock: silent WAV → ${outputPath}`);
}

async function localGenerateAudio(scene, outputPath) {
  if (scene.language === 'none') return;
  throw new Error('audio.local: XTTS-v2 not implemented yet');
}

export const mock  = mockGenerateAudio;
export const local = localGenerateAudio;
