async function applySlic() {
    console.log("Running SLIC")
    if (!LAYERS || Object.keys(LAYERS).length === 0) {
        console.error('No images loaded');
        return;
    }

    // Get the first image from LAYERS
    const firstImage = Object.values(LAYERS)[0];
    const originalWidth = firstImage.width;
    const originalHeight = firstImage.height;
    
    // Calculate downscaled dimensions (1/4 size)
    const scaledWidth = Math.floor(originalWidth / 4);
    const scaledHeight = Math.floor(originalHeight / 4);
    
    console.log(`Scaling down from ${originalWidth}x${originalHeight} to ${scaledWidth}x${scaledHeight}`);
    
    // Create a temporary canvas for the downscaled image
    const tempCanvas = new OffscreenCanvas(scaledWidth, scaledHeight);
    let tempCtx = tempCanvas.getContext('2d');
    
    // Draw the original image scaled down (browser handles interpolation)
    tempCtx.drawImage(firstImage.bitmap, 0, 0, scaledWidth, scaledHeight);

    try {
        // Get the downscaled image data
        const imageData = tempCtx.getImageData(0, 0, scaledWidth, scaledHeight);
        const data = imageData.data;
        
        // Create new array without alpha channel
        const rgb = new Uint8Array(scaledWidth * scaledHeight * 3);
        
        // Copy RGB values, skipping alpha channel
        let j = 0;
        for (let i = 0; i < data.length; i += 4) {
            rgb[j] = data[i];        // R
            rgb[j + 1] = data[i + 1]; // G
            rgb[j + 2] = data[i + 2]; // B
            j += 3;
        }

        tempCtx = null;
        console.log('INVOKING SLIC on downscaled image...');

        // Process the downscaled image with SLIC
        const result = await window.api.invoke('apply_slic', {
            dimensions: `${scaledWidth} ${scaledHeight}`,
            pixelData: rgb.buffer
        });
        console.log("RESULT: ", result)
        // Get the segmentation result for the small image
        const labelData = new Uint8Array(result);
        console.log("LABEL DATA: ", labelData)

        // Create segmentation map for the downscaled image
        const smallSegmentMap = new Array(scaledHeight);
        for (let y = 0; y < scaledHeight; y++) {
            smallSegmentMap[y] = new Array(scaledWidth);
        }

        // Fill in the downscaled segmentation map
        let offset = 0;
        for (let y = 0; y < scaledHeight; y++) {
            for (let x = 0; x < scaledWidth; x++) {
                smallSegmentMap[y][x] = labelData[offset++];
            }
        }

        console.log('Upscaling segmentation map using nearest neighbor interpolation');
        
        // Create segmentation map for the original image size
        const segmentMap = new Array(originalHeight);
        for (let y = 0; y < originalHeight; y++) {
            segmentMap[y] = new Array(originalWidth);
        }
        
        // Upscale using nearest neighbor interpolation
        for (let y = 0; y < originalHeight; y++) {
            for (let x = 0; x < originalWidth; x++) {
                // Map to downscaled coordinates (nearest neighbor)
                const smallX = Math.floor(x / 4);
                const smallY = Math.floor(y / 4);
                
                // Copy the segment ID from the small map
                segmentMap[y][x] = smallSegmentMap[smallY][smallX];
            }
        }
                
        // Create a color map for segments
        const segmentColors = new Map();

        // Prepare for drawing on canvas
        const _imageData = drawCtx.createImageData(originalWidth, originalHeight);
        const _data = _imageData.data;
        
        // Draw the upscaled segmentation map
        for(let y = 0; y < originalHeight; y++) {
            for(let x = 0; x < originalWidth; x++) {
                const segmentId = segmentMap[y][x];
                
                if (!segmentColors.has(segmentId)) {
                    // Generate random RGB values
                    segmentColors.set(segmentId, [
                        Math.floor(Math.random() * 256),  // R
                        Math.floor(Math.random() * 256),  // G
                        Math.floor(Math.random() * 256)   // B
                    ]);
                }
                
                const idx = (y * originalWidth + x) * 4;
                const color = segmentColors.get(segmentId);
                
                _data[idx] = color[0];     // R
                _data[idx + 1] = color[1]; // G
                _data[idx + 2] = color[2]; // B
                _data[idx + 3] = 255;      // Alpha
            }
        }
        
        drawCtx.putImageData(_imageData, 0, 0);
        
        return segmentMap;

    } catch (error) {
        console.error('SLIC processing failed:', error);
        throw error;
    }
}




// async function applySlic() {
//     console.log("Running SLIC")
//     if (!LAYERS || Object.keys(LAYERS).length === 0) {
//         console.error('No images loaded');
//         return;
//     }

//     // Get the first image from LAYERS
//     const firstImage = Object.values(LAYERS)[0];
//     const width = firstImage.width;
//     const height = firstImage.height;
//     // Create a temporary canvas to extract pixel data from the bitmap
//     const tempCanvas = new OffscreenCanvas(width, height);
//     let tempCtx = tempCanvas.getContext('2d');  // Use let instead of const
//     tempCtx.drawImage(firstImage.bitmap, 0, 0);


    

//     try {
//         const imageData = tempCtx.getImageData(0, 0, width, height);
//         const data = imageData.data;
        
//         // Create new array without alpha channel
//         const rgb = new Uint8Array(width * height * 3);
        
//         // Copy RGB values, skipping alpha channel
//         let j = 0;
//         for (let i = 0; i < data.length; i += 4) {
//             rgb[j] = data[i];     // R
//             rgb[j + 1] = data[i + 1]; // G
//             rgb[j + 2] = data[i + 2]; // B
//             j += 3;
//         }

//         tempCtx = null;
//         console.log('INVOKING SLIC(RGB)...')

//         // should be a 2D array of uint8 values 
//         const result = await window.api.invoke('apply_slic', {
//             dimensions: `${width} ${height}`,
//             pixelData: rgb.buffer // Send the raw buffer
//         });

//         const labelData = new Uint8Array(result);

//         // Create segmentation map
//         const segmentMap = new Array(height);
//         for (let y = 0; y < height; y++) {
//             segmentMap[y] = new Array(width);
//         }

//         // Read label values (starting at offset 0 since there's no header)
//         let offset = 0;
//         for (let y = 0; y < height; y++) {
//             for (let x = 0; x < width; x++) {
//                 segmentMap[y][x] = labelData[offset++];
//             }
//         }
                
//         // Create a color map for segments
//         const segmentColors = new Map();

//         const _imageData = drawCtx.createImageData(width, height);
//         const _data = _imageData.data;
        
//         // Create colors for each segment ID
//         for(let y = 0; y < height; y++) {
//             for(let x = 0; x < width; x++) {
//                 const segmentId = segmentMap[y][x];
                
//                 if (!segmentColors.has(segmentId)) {
//                     // Generate random RGB values instead of HSL
//                     segmentColors.set(segmentId, [
//                         Math.floor(Math.random() * 256),  // R
//                         Math.floor(Math.random() * 256),  // G
//                         Math.floor(Math.random() * 256)   // B
//                     ]);
//                 }
                
//                 const idx = (y * width + x) * 4;
//                 const color = segmentColors.get(segmentId);
                
//                 _data[idx] = color[0];     // R
//                 _data[idx + 1] = color[1]; // G
//                 _data[idx + 2] = color[2]; // B
//                 _data[idx + 3] = 255;      // Alpha
//             }
//         }
        
//         drawCtx.putImageData(_imageData, 0, 0);

//         // return segmentMap;

//     } catch (error) {
//         console.error('SLIC processing failed:', error);
//         throw error;
//     }

// }
