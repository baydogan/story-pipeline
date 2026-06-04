import { randomUUID } from 'crypto';
import config from '../config.js';
import logger from '../logger.js';

const BASE    = config.comfy.url;
const WS_BASE = BASE.replace(/^http/, 'ws');

// Deep-clone a workflow JSON and apply patches: { nodeId: { inputKey: value, ... }, ... }
export function patchWorkflow(workflow, patches) {
  const wf = JSON.parse(JSON.stringify(workflow));
  for (const [nodeId, inputs] of Object.entries(patches)) {
    if (!wf[nodeId]) throw new Error(`Workflow: node "${nodeId}" not found`);
    Object.assign(wf[nodeId].inputs, inputs);
  }
  return wf;
}

async function queuePrompt(workflow, clientId) {
  const res = await fetch(`${BASE}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow, client_id: clientId }),
  });
  if (!res.ok) throw new Error(`ComfyUI /prompt ${res.status}: ${await res.text()}`);
  const { prompt_id } = await res.json();
  return prompt_id;
}

function waitForCompletion(promptId, clientId, timeoutMs = 10 * 60 * 1000) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${WS_BASE}/ws?clientId=${clientId}`);

    const timer = setTimeout(() => {
      ws.close();
      reject(new Error(`ComfyUI timed out after ${timeoutMs / 1000}s (prompt ${promptId})`));
    }, timeoutMs);

    ws.addEventListener('message', (evt) => {
      let msg;
      try { msg = JSON.parse(evt.data); } catch { return; }

      if (msg.type === 'progress') {
        logger.debug(`comfy progress ${msg.data.value}/${msg.data.max}`);
        return;
      }
      if (msg.data?.prompt_id !== promptId) return;

      if (msg.type === 'execution_complete') {
        clearTimeout(timer); ws.close(); resolve();
      } else if (msg.type === 'execution_error') {
        clearTimeout(timer); ws.close();
        reject(new Error(msg.data.exception_message ?? 'ComfyUI execution error'));
      }
    });

    ws.addEventListener('error', (evt) => {
      clearTimeout(timer);
      reject(new Error(`ComfyUI WebSocket error — is ComfyUI running at ${BASE}?`));
    });
  });
}

// Flatten all output file descriptors from a history entry
async function getOutputFiles(promptId) {
  const res = await fetch(`${BASE}/history/${promptId}`);
  if (!res.ok) throw new Error(`ComfyUI /history ${res.status}`);
  const history = await res.json();
  const entry = history[promptId];
  if (!entry) throw new Error(`No history entry for ${promptId}`);

  const files = [];
  for (const nodeOutputs of Object.values(entry.outputs)) {
    for (const items of Object.values(nodeOutputs)) {
      if (Array.isArray(items)) {
        for (const item of items) {
          if (item?.filename) files.push(item);
        }
      }
    }
  }
  return files;
}

// Queue a workflow, wait for completion, return output file descriptors
export async function runWorkflow(workflow) {
  const clientId = randomUUID();
  const promptId = await queuePrompt(workflow, clientId);
  logger.info(`comfy: queued prompt ${promptId}`);
  await waitForCompletion(promptId, clientId);
  logger.info(`comfy: prompt ${promptId} complete`);
  return getOutputFiles(promptId);
}

// Download an output file as a Buffer
export async function downloadFile(filename, subfolder = '', type = 'output') {
  const url = new URL(`${BASE}/view`);
  url.searchParams.set('filename', filename);
  url.searchParams.set('subfolder', subfolder);
  url.searchParams.set('type', type);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`ComfyUI /view ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// Upload an image buffer to ComfyUI's input folder; returns { name, subfolder, type }
export async function uploadImage(buffer, filename) {
  const form = new FormData();
  form.append('image', new Blob([buffer], { type: 'image/png' }), filename);
  form.append('type', 'input');
  form.append('overwrite', 'true');
  const res = await fetch(`${BASE}/upload/image`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`ComfyUI /upload/image ${res.status}`);
  return res.json();
}
