import { z } from 'zod';

export const CameraMotion = z.enum([
  'static',
  'slow_push_in',
  'slow_pull_out',
  'parallax_left',
  'parallax_right',
  'drift_up',
  'drift_down',
]);

export const Language = z.enum(['en', 'es', 'none']);

// Base shape shared by every scene
const SceneBase = z.object({
  id:              z.number().int().positive(),
  summary:         z.string().min(1),
  narration:       z.string(),           // empty string when language === 'none'
  language:        Language,
  image_prompt:    z.string().min(1),    // always English
  negative_prompt: z.string().default(''),
  seed:            z.number().int().nonnegative().default(0),
  motion_bucket:   z.number().int().min(1).max(255).default(127),
  camera_motion:   CameraMotion.default('slow_push_in'),
  duration:        z.number().positive().default(4),  // seconds
});

// First scene carries the style anchor used by all subsequent scenes
export const FirstScene = SceneBase.extend({
  style_anchor: z.string().min(1),
});

export const Scene = z.union([FirstScene, SceneBase]);

export const SceneList = z.array(Scene).min(1);

// Parse + validate an array coming from Ollama (or mock).
// Returns { scenes, error } — never throws.
export function parseScenes(raw) {
  const result = SceneList.safeParse(raw);
  if (result.success) return { scenes: result.data, error: null };
  return { scenes: null, error: result.error.flatten() };
}
