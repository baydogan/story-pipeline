import config from '../config.js';
import * as _scenes from './scenes.js';
import * as _images from './images.js';
import * as _clips  from './clips.js';
import * as _audio  from './audio.js';

const m = config.mode; // 'mock' | 'local'

export const generateScenes = _scenes[m];
export const generateImage  = _images[m];
export const generateClip   = _clips[m];
export const generateAudio  = _audio[m];
