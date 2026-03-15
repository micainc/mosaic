export type InteractionMode = 'draw' | 'pen' | 'fill' | 'select';

export interface LabelColour {
  colour: string;
  label: string;
}

export interface ImageLayer {
  icon: string;        // data URL thumbnail
  src: string;         // blob URL for display
  pixels: Uint8Array;  // Raw RGB pixel data (3 bytes per pixel)
  width: number;
  height: number;
  type: string;        // e.g. "xpol", "ppol", "ref", "layer_1"
}

export interface Point {
  x: number;
  y: number;
}

export interface Grain {
  size: number;
  x: number;
  y: number;
  w: number;
  h: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface MineralData {
  size: number;
  proportion: number;
  colour: number;
  hex: string;
  grains: Record<string, Grain>;
}

export interface Loadouts {
  [key: string]: string[];
}
