import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import ffmpeg from 'fluent-ffmpeg';
import logger from '../logger.js';

// zoompan expressions for each camera_motion type.
// d = total output frames (duration * fps).
// Backslash-comma (\\,) escapes commas inside ffmpeg filter expressions.
function zoomFilter(motion, d) {
  switch (motion) {
    case 'slow_push_in':
      return `zoompan=z='min(zoom+0.0008\\,1.2)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${d}:s=1920x1080:fps=25`;
    case 'slow_pull_out':
      return `zoompan=z='if(eq(on\\,1)\\,1.2\\,max(zoom-0.0008\\,1.0))':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${d}:s=1920x1080:fps=25`;
    case 'parallax_left':
      return `zoompan=z='1.06':x='min(iw*0.0015*on\\,iw*0.06)':y='ih/2-(ih/zoom/2)':d=${d}:s=1920x1080:fps=25`;
    case 'parallax_right':
      return `zoompan=z='1.06':x='max(iw*0.06-iw*0.0015*on\\,0)':y='ih/2-(ih/zoom/2)':d=${d}:s=1920x1080:fps=25`;
    case 'drift_up':
      return `zoompan=z='1.06':x='iw/2-(iw/zoom/2)':y='min(ih*0.0015*on\\,ih*0.06)':d=${d}:s=1920x1080:fps=25`;
    case 'drift_down':
      return `zoompan=z='1.06':x='iw/2-(iw/zoom/2)':y='max(ih*0.06-ih*0.0015*on\\,0)':d=${d}:s=1920x1080:fps=25`;
    default: // static
      return `zoompan=z='1':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${d}:s=1920x1080:fps=25`;
  }
}

function runFfmpeg(cmd) {
  return new Promise((resolve, reject) =>
    cmd.on('end', resolve).on('error', reject).run()
  );
}

async function mockGenerateClip(scene, imagePath, outputPath) {
  await mkdir(dirname(outputPath), { recursive: true });
  const fps = 25;
  const dur = scene.duration ?? 4;
  const frames = Math.ceil(dur * fps);
  const filter = zoomFilter(scene.camera_motion ?? 'static', frames);

  logger.debug(`clips.mock: scene ${scene.id} ${scene.camera_motion} ${dur}s`);

  await runFfmpeg(
    ffmpeg()
      .input(imagePath)
      .inputOptions(['-loop 1'])
      .videoFilters(filter)
      .outputOptions([
        '-c:v libx264',
        `-t ${dur}`,
        '-pix_fmt yuv420p',
        '-an',
        '-y',
      ])
      .output(outputPath)
  );

  logger.debug(`clips.mock: wrote ${outputPath}`);
}

async function localGenerateClip(scene, imagePath, outputPath) {
  const { readFileSync } = await import('fs');
  const { readFile, writeFile, mkdir: mkd } = await import('fs/promises');
  const { resolve, dirname: dn } = await import('path');
  const { fileURLToPath } = await import('url');
  const { runWorkflow, uploadImage, downloadFile, patchWorkflow } = await import('../comfy/client.js');

  const __dirname = dn(fileURLToPath(import.meta.url));
  const template  = JSON.parse(readFileSync(resolve(__dirname, '../comfy/workflows/svd.json'), 'utf8'));

  // Upload reference image to ComfyUI input folder
  const imgBuffer = await readFile(imagePath);
  const uploaded  = await uploadImage(imgBuffer, `scene-${String(scene.id).padStart(2,'0')}.png`);
  logger.info(`clips.local: uploaded image → ${uploaded.name}`);

  const workflow = patchWorkflow(template, {
    '2': { image: uploaded.name },
    '3': { motion_bucket_id: scene.motion_bucket ?? 127 },
    '5': { seed: scene.seed ?? 0 },
  });

  logger.info(`clips.local: running SVD for scene ${scene.id} (motion_bucket=${scene.motion_bucket})...`);
  const files   = await runWorkflow(workflow);
  const video   = files.find(f => /\.mp4$/i.test(f.filename));
  if (!video) throw new Error(`SVD produced no MP4 output for scene ${scene.id}`);

  const buffer = await downloadFile(video.filename, video.subfolder, video.type);
  await mkd(dn(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);
  logger.info(`clips.local: scene ${scene.id} → ${outputPath}`);
}

export const mock  = mockGenerateClip;
export const local = localGenerateClip;
