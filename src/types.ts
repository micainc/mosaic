export type InteractionMode = 'draw' | 'pen' | 'fill' | 'select' | 'roi' | 'pipette';

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

export type PointType = {
  x: number;
  y: number;
}

export type PolygonType = {
  id: string;
  label: string;
  colour: string;
  points: PointType[];
}
// export interface Grain {
//   size: number;
//   x: number;
//   y: number;
//   w: number;
//   h: number;
//   minX: number;
//   minY: number;
//   maxX: number;
//   maxY: number;
// }

// export interface MineralData {
//   size: number;
//   proportion: number;
//   colour: number;
//   hex: string;
//   grains: Record<string, Grain>;
// }

export interface Loadouts {
  [key: string]: string[];
}

export type TooltipType = {
    text: string,
    dimensions?: {w:number, h:number},
    styles: {
        textColor: string;
    },
    offsets: { x: number, y: number },
    target?: TooltipTargetType,
}

export type TooltipTargetType = {
  tag:string,
  classes:string[],
  bottom:number,
  top:number,
  left:number,
  right:number,
  w:number,
  h:number,
  x:number,
  y:number
}

export type RoiType = {
  roiId: number,
  label: string,
  colour: string,
  w:number, 
  h:number,
  x:number,
  y:number,
  // store pixelwise data obj of size wxh: each pixel in array contains a number indexing a mineral of our class
  pixels?: number[][]
}