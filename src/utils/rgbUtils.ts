export function rgbToHex(r: number, g: number, b: number): string {
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).toUpperCase().slice(1);
}

export function rgbStringToHex(col: string): string {
  const parts = col.replace('rgb(', '').replace(')', '').split(',');
  return "#" + (1 << 24 | Number(parts[0]) << 16 | Number(parts[1]) << 8 | Number(parts[2])).toString(16).toUpperCase().slice(1);
}

export function hexToRGB(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export function getBlackWhiteContrast(hex: string): string {
  if (hex.indexOf('#') === 0) {
    hex = hex.slice(1);
  }
  if (hex.length === 8) {
    return '#FFFFFF';
  }
  if (hex.length !== 6) {
    throw new Error('Invalid HEX color.');
  }
  var r = parseInt(hex.slice(0, 2), 16).toString(16),
      g = parseInt(hex.slice(2, 4), 16).toString(16),
      b = parseInt(hex.slice(4, 6), 16).toString(16);
  var brightness = (parseInt(r, 16) + parseInt(g, 16) + parseInt(b, 16)) / 3;
  if (brightness < 127) {
    return '#FFFFFF';
  } else {
    return '#000000';
  }
}
