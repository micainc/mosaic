// Define a dictionary of color names and their rgb values
var rgbs = {
    "black": [0, 0 ,0, 1], // floodfind colour
    "red": [255, 0, 0, 1], // CF ALIVE
    "maroon": [128, 0, 0, 1], // CD DEAD
    "lime": [0, 255, 0, 1], // HEALTHY ALIVE
    "green": [0, 128, 0, 1], //  HEALTHY DEAD
    "transparent": [0, 0 ,0, 0],
   // ... add more colors from the list of HTML color names[^1^][1]
};

// Define a function that takes an rgb array as input and returns the color name or null if not found
function rgbToColorName(rgb) {
    // Check if the input is a valid array of length three or four
    if (Array.isArray(rgb) && rgb.length ===4) {
      // Loop through the color names dictionary
      for (var col in rgbs) {
        // Check if the rgb values match with the dictionary values
        if (rgbs[col][0] === rgb[0] && 
            rgbs[col][1] === rgb[1] && 
            rgbs[col][2] === rgb[2] &&
            rgbs[col][3] === rgb[3]) {
          // Return the matching color name
          return col;
        }
      }
      // If no match is found, return null
      return null;
    }
    else {
      // If the input is not valid, throw an error
      throw new Error("Invalid input");
    }
}