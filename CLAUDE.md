# Project: story-to-video — Local AI Animation Pipeline

Converting Julio Cortázar's short story "Estación de la mano" into a short
animated video through a fully automated, **fully local** pipeline (no cloud,
zero cost). Hardware: RTX 4070 (12GB). OS: Windows (native, no WSL).

## Pipeline architecture

Story text
→ [Ollama, local]        scene JSON objects
→ [ComfyUI + SDXL]       images (PNG, 16:9)
→ [ComfyUI + SVD]        image-to-video clips (async polling)
→ [XTTS-v2, local]       narration (language TBD: en/es/none)
→ [MusicGen, local]      ambient music
→ [ffmpeg]               final montage

## Tech stack
- **Runtime:** Node.js 20+, ESM (`"type": "module"`).
- **Do NOT write Python application code.** All logic lives in Node. Local
  services are reached over HTTP via native `fetch` / `WebSocket`.
- **Libraries:** `fluent-ffmpeg`, `sharp`, `zod` (schema validation), `dotenv`.
  **No vendor SDKs** (no replicate / elevenlabs / anthropic SDK).
- **Local services:**
  - Ollama — `localhost:11434`, model `qwen2.5:7b`
  - ComfyUI — `localhost:8188` (images + video)
  - XTTS-v2 — `localhost:8020` (narration)
  - MusicGen — `localhost:8030` (music)

## Key decisions
- **Two-mode provider layer.** `MODE=mock` (sharp placeholder images, ffmpeg
  Ken Burns clips, espeak audio — instant & free for testing) and `MODE=local`
  (real 4070 services). Every provider exposes a `{ mock, local }` pair sharing
  the same signature.
- **Strict schema.** Scene objects validated with zod. Ollama may emit malformed
  JSON, so retry logic is mandatory (use Ollama's `format: "json"`).
- **Prompts in English.** `image_prompt` fields are always English. Generate a
  `style_anchor` on the first scene and feed a fixed seed + style into later
  prompts for visual consistency.
- **Checkpointing is mandatory.** SVD video is slow/expensive on a 4070. The
  orchestrator must write each step to disk (`output/scene-XX/image.png`,
  `clip.mp4`, ...) and SKIP already-completed steps on re-run.
- **Narration is language-agnostic.** A `language` field takes `en` / `es` /
  `none`. When `none`, the TTS layer is a no-op and the montage proceeds with
  music + visuals only. (Final language decision still pending.)
- **Aesthetic:** gothic-domestic, melancholic, surreal/oneiric, 1940s Buenos
  Aires. The story follows a hand that arrives, settles into a home, and later
  leaves — quiet, tender-uncanny, mostly static. Subtle camera motion (slow
  push-ins, parallax, drifting) suits both the story and SVD's strengths.

## Folder structure

estacion-de-la-mano/
├── .env  .env.example  .gitignore  package.json  CLAUDE.md
├── assets/   output/ (scene-XX/)   story/source.txt
└── src/
├── index.js  config.js  logger.js  schema.js
├── comfy/        client.js, workflows/ (sdxl.json, svd.json)
├── providers/    index.js, scenes.js, images.js, clips.js, audio.js
└── pipeline/     01-scenes.js .. 05-compose.js


## Scene schema (zod) — target shape
`id`, `summary`, `narration`, `language`, `image_prompt` (EN),
`negative_prompt`, `seed`, `motion_bucket` (for SVD), `camera_motion`,
`duration`. First scene additionally carries `style_anchor`.

## Build order
1. [DONE]    package.json + folders + .env.example
2. [CURRENT] config.js + logger.js
3.           schema.js (zod contract)
4.           provider interface + mock implementations
5.           comfy/client.js + workflow templates (sdxl.json, svd.json)
6.           01-scenes.js (Ollama) → 02-images.js → 03-clips.js → 04-audio.js
7.           05-compose.js (ffmpeg montage)
8.           index.js (checkpointed orchestrator)

## Working agreement
- Build **one file at a time**. Explain briefly what the file does, then write it.
- Wait for my review/approval before moving to the next file.
- Start with `MODE=mock` so the whole pipeline runs end-to-end before any model
  is installed.
- Keep the pipeline runnable at every step; never leave it in a broken state.