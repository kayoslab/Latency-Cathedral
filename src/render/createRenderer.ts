import { WebGLRenderer } from 'three';
import { clampPixelRatio } from './clampPixelRatio';

export function createRenderer(canvas: HTMLCanvasElement): WebGLRenderer {
  const renderer = new WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(clampPixelRatio());
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  return renderer;
}
