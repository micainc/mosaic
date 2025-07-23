function rgbToHex(r, g, b) {
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).toUpperCase().slice(1);
}

function rgbStringToHex(col) {
  col=col.replace('rgb(','').replace(')','').split(',');
  return "#" + (1 << 24 | col[0] << 16 | col[1] << 8 | col[2]).toString(16).toUpperCase().slice(1);
}

function hexToRGB(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function invertHex(hex) {
  if (hex.indexOf('#') === 0) {
    hex = hex.slice(1);
  }

  if (hex.length === 8) { // transparent case; return #FFFFFF
        return '#FFFFFF';

  }

  if (hex.length !== 6) {
    throw new Error('Invalid HEX color.');
  }
  // invert color components
  var r = parseInt(hex.slice(0, 2), 16).toString(16),
      g = parseInt(hex.slice(2, 4), 16).toString(16),
      b = parseInt(hex.slice(4, 6), 16).toString(16);

  // calculate the brightness of the inverted color
  var brightness = (parseInt(r, 16) + parseInt(g, 16) + parseInt(b, 16)) / 3;

  // if the brightness is low, use white color; if it's high, use black color
  if (brightness < 127) {
    return '#ffffff';
  } else {
    return '#000000';
  }
}

function padZero(str, len) {
  len = len || 2;
  var zeros = new Array(len).join('0');
  return (zeros + str).slice(-len);
}