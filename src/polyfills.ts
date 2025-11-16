// src/polyfills.ts
import { Buffer } from 'buffer';

// Essential polyfills for browser
(window as any).global = window;
(window as any).Buffer = Buffer;

// Minimal process polyfill
(window as any).process = {
  env: { NODE_ENV: 'development' },
  version: '',
  nextTick: (callback: Function) => setTimeout(callback, 0)
};