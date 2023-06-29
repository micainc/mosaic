function rgbToHex(r, g, b) {
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).toUpperCase().slice(1);
}

function rgbStringToHex(col) {
  col=col.replace('rgb(','').replace(')','').split(',');
  return "#" + (1 << 24 | col[0] << 16 | col[1] << 8 | col[2]).toString(16).toUpperCase().slice(1);
}