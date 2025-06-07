
function getCommonSubstring(strings) {
    if (!strings.length) {
      return '';
    }
  
    // Helper function to find common prefix between two strings
    function commonPrefix(str1, str2) {
      let i = 0;
      while (i < str1.length && i < str2.length && str1[i] === str2[i]) {
        i++;
      }
      return str1.substring(0, i);
    }
  
    // Start with the first string as a candidate for the common substring
    // and compare it with all other strings, shortening it as necessary
    let commonSub = strings[0];
    for (let i = 1; i < strings.length && commonSub !== ''; i++) {
      commonSub = commonPrefix(commonSub, strings[i]);
      if (commonSub === '') break; // If empty, no common substring exists
    }
  
    // If commonSub still has length, it means it's present in all strings so far,
    // but it might not be the longest. Check for longer common substrings.
    if (commonSub.length > 0) {
      for (let i = commonSub.length; i > 0; i--) {
        let subCandidate = commonSub.substring(0, i);
        let isCommon = strings.every((str) => str.includes(subCandidate));
        if (isCommon) {
          return subCandidate; // Returns the longest common substring found
        }
      }
    }
  
    return commonSub; // Return the common substring (which may be empty)
}



function cropTiles() {
    const CHUNK_SIZE = 256;
    const MAX_OVERLAP_AREA = 0.5 * CHUNK_SIZE * CHUNK_SIZE; // 32768 pixels
  
    const width = drawCanvas.width;
    const height = drawCanvas.height;
  
    // 1. Get the image data and build a binary mask.
    // Foreground pixels are those with a nonzero alpha and not rgb(127, 127, 127) (not the transparent 'undefined' or grey 'unknown' reserved classes )
    const segmentationData = drawCtx.getImageData(0, 0, width, height).data;
    const foreground = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const r = segmentationData[4 * i],
            g = segmentationData[4 * i + 1],
            b = segmentationData[4 * i + 2],
            a = segmentationData[4 * i + 3];
      // If pixel is non-transparent and not grey, mark as foreground.
      foreground[i] = (a !== 0 && !(r === 127 && g === 127 && b === 127)) ? 1 : 0;
    }
  
    // 2. Build an integral image (summed-area table) for fast area-sum queries.
    const integral = new Uint32Array(width * height);
    for (let y = 0; y < height; y++) {
      let rowSum = 0;
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        rowSum += foreground[idx];
        if (y === 0) {
          integral[idx] = rowSum;
        } else {
          integral[idx] = integral[(y - 1) * width + x] + rowSum;
        }
      }
    }

    // 3. Find connected components of foreground pixels via flood fill.
    // (This will allow us to “tile” only over areas where foreground exists.)
    const visited = new Uint8Array(width * height);
    const grainBoundingBoxes = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (foreground[idx] === 1 && visited[idx] === 0) { // found a new unvisited component
          const comp = { minX: x, maxX: x, minY: y, maxY: y };
          const stack = [[x, y]];
          visited[idx] = 1;
          while (stack.length) {
            const [cx, cy] = stack.pop();
            comp.minX = Math.min(comp.minX, cx);
            comp.maxX = Math.max(comp.maxX, cx);
            comp.minY = Math.min(comp.minY, cy);
            comp.maxY = Math.max(comp.maxY, cy);
            // Check 4-connected neighbors.
            const neighbors = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
            for (const [nx, ny] of neighbors) {
              if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
                const nIdx = ny * width + nx;
                if (foreground[nIdx] === 1 && visited[nIdx] === 0) {
                  visited[nIdx] = 1;
                  stack.push([nx, ny]);
                }
              }
            }
          }
          grainBoundingBoxes.push(comp);
        }
      }
    }
    if (grainBoundingBoxes.length === 0) {
      console.log("No foreground found.");
      return [];
    }

    // return the sum of mask values in the rectangle [x1,y1]–[x2,y2] (inclusive)
    function getGrainSum(x1, y1, x2, y2) {
        x1 = Math.max(0, x1); y1 = Math.max(0, y1);
        x2 = Math.min(width - 1, x2); y2 = Math.min(height - 1, y2);
        const A = (x1 > 0 && y1 > 0) ? integral[(y1 - 1) * width + (x1 - 1)] : 0;
        const B = (y1 > 0) ? integral[(y1 - 1) * width + x2] : 0;
        const C = (x1 > 0) ? integral[y2 * width + (x1 - 1)] : 0;
        const D = integral[y2 * width + x2];
        return D - B - C + A;
    }

          
  
    // 4. For each component, tile its bounding box with 256×256 windows.
    // We “tile” such that the tiles cover the box and the step between adjacent tiles is never less than 128 (max 50% overlap).
    let candidateTiles = [];

    function boundingBoxToTiles(comp) {
      // Use the component’s bounding box.
      let x0 = comp.minX, y0 = comp.minY;
      let x1 = comp.maxX, y1 = comp.maxY;
      const boxWidth = x1 - x0 + 1;
      const boxHeight = y1 - y0 + 1;
  
      // Determine horizontal start positions.
      let xStarts = [];
      if (boxWidth <= CHUNK_SIZE) {
        // Single tile – choose the leftmost possible (clamped to canvas).
        xStarts.push(Math.max(0, Math.min(x0, width - CHUNK_SIZE)));
      } else {
        // Use as few tiles as possible. First try with no overlap (step = 256).
        let n = Math.ceil((boxWidth - CHUNK_SIZE) / 256) + 1;
        let step = (boxWidth - CHUNK_SIZE) / (n - 1);
        // If step would be too small (<128), force a 128-pixel step and recalc n.
        if (step < 128) {
          step = 128;
          n = Math.ceil((boxWidth - CHUNK_SIZE) / 128) + 1;
        }
        const minXStart = x0;
        const maxXStart = Math.min(x1 - CHUNK_SIZE + 1, width - CHUNK_SIZE);
        for (let i = 0; i < n; i++) {
          const pos = Math.round(minXStart + i * (maxXStart - minXStart) / (n - 1));
          xStarts.push(pos);
        }
        // Remove duplicates.
        xStarts = Array.from(new Set(xStarts));
      }
  
      // Determine vertical start positions.
      let yStarts = [];
      if (boxHeight <= CHUNK_SIZE) {
        yStarts.push(Math.max(0, Math.min(y0, height - CHUNK_SIZE)));
      } else {
        let n = Math.ceil((boxHeight - CHUNK_SIZE) / 256) + 1;
        let step = (boxHeight - CHUNK_SIZE) / (n - 1);
        if (step < 128) {
          step = 128;
          n = Math.ceil((boxHeight - CHUNK_SIZE) / 128) + 1;
        }
        const minYStart = y0;
        const maxYStart = Math.min(y1 - CHUNK_SIZE + 1, height - CHUNK_SIZE);
        for (let i = 0; i < n; i++) {
          const pos = Math.round(minYStart + i * (maxYStart - minYStart) / (n - 1));
          yStarts.push(pos);
        }
        yStarts = Array.from(new Set(yStarts));
      }
  
      // Combine horizontal and vertical starts to form candidate 256×256 tiles.
      for (const xs of xStarts) {
        for (const ys of yStarts) {
          // Only consider if at least one foreground pixel is inside.
          const cov = getGrainSum(xs, ys, xs + CHUNK_SIZE - 1, ys + CHUNK_SIZE - 1);
          if (cov > 0) {
            candidateTiles.push({ x: xs, y: ys, coverage: cov });
          }
        }
      }
    }

    for (const grainBoundingBox of grainBoundingBoxes) {
      boundingBoxToTiles(grainBoundingBox);
    }
  
    // 5. Run a simple non-maximum suppression to discard redundant tiles.
    // We sort candidates by “coverage” (number of foreground pixels inside)
    // and then suppress any candidate that overlaps more than 50% (i.e. >32768 pixels) with a higher scoring one.
    candidateTiles.sort((a, b) => b.coverage - a.coverage);
    const selectedTiles = [];
    const suppressed = new Array(candidateTiles.length).fill(false);
    function intersectionArea(tileA, tileB) {
      const xA = Math.max(tileA.x, tileB.x);
      const yA = Math.max(tileA.y, tileB.y);
      const xB = Math.min(tileA.x + CHUNK_SIZE, tileB.x + CHUNK_SIZE);
      const yB = Math.min(tileA.y + CHUNK_SIZE, tileB.y + CHUNK_SIZE);
      return (xB > xA && yB > yA) ? (xB - xA) * (yB - yA) : 0;
    }
    for (let i = 0; i < candidateTiles.length; i++) {
      if (suppressed[i]) continue;
      const tileA = candidateTiles[i];
      selectedTiles.push(tileA);
      for (let j = i + 1; j < candidateTiles.length; j++) {
        if (suppressed[j]) continue;
        const tileB = candidateTiles[j];
        if (intersectionArea(tileA, tileB) > MAX_OVERLAP_AREA) {
          suppressed[j] = true;
        }
      }
    }
  
    idx = 0;
    // 6. Format the output tiles.
    const tiles = selectedTiles.map(tile => ({
      left: tile.x,
      top: tile.y,
      right: tile.x + CHUNK_SIZE,
      bottom: tile.y + CHUNK_SIZE,
      index: idx++,
      coverage: tile.coverage // (optional; can be omitted)
    }));
  
    console.log("Found tiles:", tiles);
    return tiles;
}


async function saveTiles() {
    const tiles = cropTiles();
    console.log("SAVING TILES...")

    // Get identifier same as before
    const filenames = Object.keys(IMAGE_LAYERS);
    const identifier = getCommonSubstring(filenames.map(filename => 
        getFilename(filename).trim().toLowerCase()
    )).replace(/^_+|_+$/g, '') || Date.now().toString();

    console.log("IDENTIFIER: ", identifier)

    window.api.invoke('set_save_dir', {'path': '', 'type': 'save', identifier}).then(async () => {


        // // Get draw layer data once
        // const drawLayerData = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
        // const drawBuffer = new Uint32Array(drawLayerData.data.buffer);

        // Create off-screen buffer once
        // const _offscreenCanvas = new OffscreenCanvas(drawCanvas.width, drawCanvas.height);
        // const _offscreenCtx = _offscreenCanvas.getContext('2d');

        try {

            // Process all tiles in parallel
            await Promise.all(tiles.map(async tile => {
                const { left, right, top, bottom, index } = tile;
                const width = right - left;
                const height = bottom - top;

                // Create crop buffer
                const cropCanvas = new OffscreenCanvas(width, height);
                const cropCtx = cropCanvas.getContext('2d');

                // Save segmentation map crop
                cropCtx.putImageData(
                    drawCtx.getImageData(left, top, width, height),
                    0, 0
                );
                const mapBlob = await cropCanvas.convertToBlob({type: 'image/png'});
                await window.api.invoke('save_img', {
                    data: await blobToBase64(mapBlob),
                    filename: '',
                    identifier,
                    type: 'map',
                    idx: index
                });

                // Process each image layer in parallel, using the stored bitmaps
                await Promise.all(Object.entries(IMAGE_LAYERS).map(async ([filename, image]) => {
                    cropCtx.clearRect(0, 0, width, height);
                    cropCtx.drawImage(image.bitmap, left, top, width, height, 0, 0, width, height);
                    
                    const layerBlob = await cropCanvas.convertToBlob({type: 'image/jpeg', quality: 1});
                    return window.api.invoke('save_img', {
                        data: await blobToBase64(layerBlob),
                        filename,
                        identifier,
                        type: image.type,
                        idx: index
                    });
                }));


            }));

            //  //... then we save the entire draw layer for a save file:
            // var draw_data = drawCanvas.toDataURL("image/png");
            // window.api.invoke('save_img', {'data': draw_data, 'filename': '', 'identifier':identifier, 'type': 'segmentation_map', 'idx': ''})



            await window.api.invoke('save_label_colours', {dict: colourLabelMap});

        } catch (error) {
            console.error('Error in saveTiles:', error);
            throw error;
        }
    });
}

async function saveSegmentationMap() {
    console.log("SAVING SEGMENTATION MAP...")

    // Get identifier same as before
    const filenames = Object.keys(IMAGE_LAYERS);
    const identifier = getCommonSubstring(filenames.map(filename => 
        getFilename(filename).trim().toLowerCase()
    )).replace(/^_+|_+$/g, '') || Date.now().toString();

    window.api.invoke('set_save_dir', {'path': '', 'type': 'save', identifier}).then(async () => {
        try {

            var draw_data = drawCanvas.toDataURL("image/png");
            window.api.invoke('save_img', {'data': draw_data, 'filename': '', 'identifier':identifier, 'type': 'segmentation_map', 'idx': ''})

            // ... then we create all overlays in parallel
            // await Promise.all(Object.entries(images).map(async ([filename, image]) => {

            //     _offscreenCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
            //     _offscreenCtx.drawImage(image.bitmap, 0, 0);
            //     _offscreenCtx.globalAlpha = 0.5;
            //     _offscreenCtx.drawImage(drawCanvas, 0, 0);
            //     _offscreenCtx.globalAlpha = 1.0;

            //     const overlayBlob = await _offscreenCanvas.convertToBlob({type: 'image/jpeg', quality: 1});
            //     return window.api.invoke('save_img', {
            //         data: await blobToBase64(overlayBlob),
            //         filename,
            //         identifier,
            //         type: images[filename].type,
            //         idx: '',
                    
            //     });
            // }));

        } catch (error) {
            console.error('Error in saveTiles:', error);
            throw error;
        }
    });
}

