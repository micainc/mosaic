// Generate 128 maximally distinct, high-visibility hex colors using HSL color space
// with golden angle spacing for optimal hue separation.

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r, g, b;
  if (h < 60)      { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function colorDistance(hex1, hex2) {
  const r1 = parseInt(hex1.slice(1, 3), 16);
  const g1 = parseInt(hex1.slice(3, 5), 16);
  const b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16);
  const g2 = parseInt(hex2.slice(3, 5), 16);
  const b2 = parseInt(hex2.slice(5, 7), 16);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

const GOLDEN_ANGLE = 137.508;
const TARGET = 128;

// Saturation/lightness combos to cycle through per hue
// Saturation up to 100%, lightness 30-70%
const SL_COMBOS = [
  [100, 50],
  [80, 40],
  [90, 60],
  [70, 35],
  [95, 70],
];

const RESERVED = ['#000000', '#FFFFFF', '#7F7F7F'];
const MIN_DISTANCE = 10; // minimum Euclidean RGB distance from reserved colors

const colors = [];
const seen = new Set();

let hueIndex = 0;
let comboIndex = 0;

while (colors.length < TARGET) {
  const hue = (hueIndex * GOLDEN_ANGLE) % 360;
  const [sat, light] = SL_COMBOS[comboIndex % SL_COMBOS.length];

  const hex = hslToHex(hue, sat, light);

  // Check not duplicate
  if (!seen.has(hex)) {
    // Check not too close to reserved colors
    const tooClose = RESERVED.some(r => colorDistance(hex, r) < MIN_DISTANCE);
    if (!tooClose) {
      colors.push(hex);
      seen.add(hex);
    }
  }

  comboIndex++;
  if (comboIndex % SL_COMBOS.length === 0) {
    hueIndex++;
  }
}

console.log(JSON.stringify(colors));
