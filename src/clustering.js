function scaleNearestNeighbour(pixels, originalWidth, originalHeight, scaleFactor) {
    const newWidth = Math.floor(originalWidth / scaleFactor);
    const newHeight = Math.floor(originalHeight / scaleFactor);
    const scaledPixels = new Uint8Array(newWidth * newHeight * 3);
    
    for (let y = 0; y < newHeight; y++) {
        for (let x = 0; x < newWidth; x++) {
            // Sample from center of the block
            const srcX = Math.floor(x * scaleFactor + scaleFactor / 2);
            const srcY = Math.floor(y * scaleFactor + scaleFactor / 2);
            
            const srcIdx = (srcY * originalWidth + srcX) * 3;
            const outIdx = (y * newWidth + x) * 3;
            
            scaledPixels[outIdx] = pixels[srcIdx];         // R
            scaledPixels[outIdx + 1] = pixels[srcIdx + 1]; // G
            scaledPixels[outIdx + 2] = pixels[srcIdx + 2]; // B
        }
    }
    
    return { pixels: scaledPixels, width: newWidth, height: newHeight };
}


async function applyClustering() {
    if (!IMAGE_LAYERS || Object.keys(IMAGE_LAYERS).length === 0) {
        console.error('No images loaded');
        return;
    }

    // Get the first image from LAYERS
    const firstImage = Object.values(IMAGE_LAYERS)[0];
    const originalWidth = firstImage.width;
    const originalHeight = firstImage.height;
    
    const scaled = scaleNearestNeighbour(firstImage.pixels, originalWidth, originalHeight, 4)
    const scaledWidth = scaled.width;
    const scaledHeight = scaled.height;
    const scaledPixels = scaled.pixels;

    try {


        
        // Process the downscaled image with SLIC
        const result = await window.api.invoke('apply_clustering', {
            dimensions: `${scaledWidth} ${scaledHeight}`,
            pixelData: scaledPixels
        });


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


