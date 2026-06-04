import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Minimal dotenv parse — avoids a hard dependency on dotenv for the config
// module itself (dotenv is still available for other consumers).
function loadEnv() {
  try {
    const raw = readFileSync(resolve(root, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    // No .env file — rely on real environment variables.
  }
}

loadEnv();

const VALID_MODES = ['mock', 'local'];
const VALID_LANGUAGES = ['en', 'es', 'none'];

function require_env(key, fallback) {
  const val = process.env[key] ?? fallback;
  if (val === undefined) throw new Error(`Missing required env var: ${key}`);
  return val;
}

const mode = require_env('MODE', 'mock');
if (!VALID_MODES.includes(mode)) {
  throw new Error(`MODE must be one of ${VALID_MODES.join('|')}, got: ${mode}`);
}

const language = require_env('LANGUAGE', 'none');
if (!VALID_LANGUAGES.includes(language)) {
  throw new Error(`LANGUAGE must be one of ${VALID_LANGUAGES.join('|')}, got: ${language}`);
}

const config = Object.freeze({
  mode,                                              // 'mock' | 'local'
  language,                                          // 'en' | 'es' | 'none'

  ollama: Object.freeze({
    url:   require_env('OLLAMA_URL',  'http://localhost:11434'),
    model: require_env('OLLAMA_MODEL', 'qwen2.5:7b'),
  }),

  comfy: Object.freeze({
    url: require_env('COMFY_URL', 'http://localhost:8188'),
  }),

  xtts: Object.freeze({
    url: require_env('XTTS_URL', 'http://localhost:8020'),
  }),

  musicgen: Object.freeze({
    url: require_env('MUSICGEN_URL', 'http://localhost:8030'),
  }),

  outputDir: resolve(root, require_env('OUTPUT_DIR', 'output')),
  storyFile: resolve(root, 'story', 'source.txt'),
});

export default config;
