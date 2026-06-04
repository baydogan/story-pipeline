import { readFileSync } from 'fs';
import config from '../config.js';
import logger from '../logger.js';
import { parseScenes } from '../schema.js';

const STYLE_ANCHOR =
  'gothic-domestic, muted sepia-green palette, heavy film grain, ' +
  'candlelight and deep shadow, 1940s Buenos Aires interior, surreal realism, painterly';

const MOCK_SCENES = [
  {
    id: 1,
    summary: 'A pale hand appears on the windowsill of a dim apartment.',
    narration: '',
    language: 'none',
    image_prompt:
      'A pale disembodied hand resting gently on a dark wooden windowsill, ' +
      'dim 1940s Buenos Aires apartment interior, afternoon light filtering through dusty curtains, gothic-domestic',
    negative_prompt: 'bright colors, modern, people, faces, cartoon, text',
    style_anchor: STYLE_ANCHOR,
    seed: 1000,
    motion_bucket: 100,
    camera_motion: 'slow_push_in',
    duration: 5,
  },
  {
    id: 2,
    summary: 'The hand settles quietly into domestic life.',
    narration: '',
    language: 'none',
    image_prompt:
      'A disembodied hand holding a small glass of water in a dim 1940s kitchen, ' +
      'melancholic warm light, cracked tile floor, gothic-domestic surreal',
    negative_prompt: 'bright colors, modern, people, faces, cartoon, text',
    seed: 1001,
    motion_bucket: 90,
    camera_motion: 'static',
    duration: 4,
  },
  {
    id: 3,
    summary: 'The hand marks the page of an open book by candlelight.',
    narration: '',
    language: 'none',
    image_prompt:
      'A pale hand resting between pages of a worn leather-bound book, ' +
      'dark wooden desk, single candle casting long shadow, 1940s Buenos Aires study, surreal',
    negative_prompt: 'bright colors, modern, people, faces, cartoon, text',
    seed: 1002,
    motion_bucket: 80,
    camera_motion: 'parallax_left',
    duration: 4,
  },
  {
    id: 4,
    summary: 'The hand strokes the back of a sleeping cat.',
    narration: '',
    language: 'none',
    image_prompt:
      'A disembodied hand gently touching a black cat sleeping on a velvet armchair, ' +
      'dim interior, 1940s Buenos Aires, muted palette, tender and uncanny',
    negative_prompt: 'bright colors, modern, people, faces, cartoon, text',
    seed: 1003,
    motion_bucket: 95,
    camera_motion: 'drift_up',
    duration: 4,
  },
  {
    id: 5,
    summary: 'At dusk the hand rests alone on the balcony railing.',
    narration: '',
    language: 'none',
    image_prompt:
      'A lone pale hand resting on a wrought-iron balcony railing at dusk, ' +
      'Buenos Aires rooftops in silhouette, melancholic golden-grey sky, heavy film grain',
    negative_prompt: 'bright colors, modern, people, faces, cartoon, text',
    seed: 1004,
    motion_bucket: 110,
    camera_motion: 'slow_pull_out',
    duration: 5,
  },
  {
    id: 6,
    summary: 'The windowsill is empty. The hand has gone.',
    narration: '',
    language: 'none',
    image_prompt:
      'An empty dark wooden windowsill in a dim 1940s Buenos Aires apartment, ' +
      'afternoon light, dusty curtain barely swaying, profound absence, gothic-domestic melancholy',
    negative_prompt: 'bright colors, modern, people, faces, cartoon, text',
    seed: 1005,
    motion_bucket: 85,
    camera_motion: 'slow_pull_out',
    duration: 6,
  },
];

async function mockGenerateScenes() {
  logger.debug('scenes.mock: returning hardcoded scenes');
  const { scenes, error } = parseScenes(MOCK_SCENES);
  if (error) throw new Error(`Mock scenes failed validation: ${JSON.stringify(error)}`);
  return scenes;
}

async function localGenerateScenes() {
  const story = readFileSync(config.storyFile, 'utf8');

  const prompt =
    `You are a cinematographer adapting a short literary story into 6 animated scenes.\n\n` +
    `Story:\n${story}\n\n` +
    `Output a JSON array of exactly 6 scene objects. Each must have:\n` +
    `id (int 1-6), summary (string), narration (empty string), language ("none"),\n` +
    `image_prompt (English, gothic-domestic 1940s Buenos Aires),\n` +
    `negative_prompt (string), seed (int), motion_bucket (int 1-255),\n` +
    `camera_motion (static|slow_push_in|slow_pull_out|parallax_left|parallax_right|drift_up|drift_down),\n` +
    `duration (number, 4-6 seconds).\n` +
    `The FIRST scene must also include style_anchor (string: concise visual style for consistency).\n` +
    `Output ONLY valid JSON. No markdown, no explanation.`;

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    logger.info(`scenes.local: Ollama attempt ${attempt}/3`);
    try {
      const res = await fetch(`${config.ollama.url}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.ollama.model,
          prompt,
          format: 'json',
          stream: false,
        }),
      });
      if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
      const body = await res.json();
      const raw = JSON.parse(body.response);
      const { scenes, error } = parseScenes(Array.isArray(raw) ? raw : (raw.scenes ?? []));
      if (error) throw new Error(`Schema validation: ${JSON.stringify(error)}`);
      return scenes;
    } catch (err) {
      lastError = err;
      logger.warn(`scenes.local: attempt ${attempt} failed`, { message: err.message });
    }
  }
  throw new Error(`Ollama failed after 3 attempts: ${lastError.message}`);
}

export const mock  = mockGenerateScenes;
export const local = localGenerateScenes;
