

// SCRIPT FOR HANDLING SEGMENTATION TASKS 

async function applySlic() {
    console.log("Running SLIC")
    if (!LAYERS || Object.keys(LAYERS).length === 0) {
        console.error('No images loaded');
        return;
    }

    // Get the first image from LAYERS
    const firstImage = Object.values(LAYERS)[0];
    
    // Create a temporary canvas to extract pixel data from the bitmap
    const tempCanvas = new OffscreenCanvas(firstImage.width, firstImage.height);
    let tempCtx = tempCanvas.getContext('2d');  // Use let instead of const
    tempCtx.drawImage(firstImage.bitmap, 0, 0);

    const imageData = tempCtx.getImageData(0, 0, firstImage.width, firstImage.height);
    const width = firstImage.width;
    const height = firstImage.height;
    

    try {
        
        // Create new array without alpha channel
        const rgb = new Uint8Array(width * height * 3);
        const data = imageData.data;
        
        // Copy RGB values, skipping alpha channel
        let j = 0;
        for (let i = 0; i < data.length; i += 4) {
            rgb[j] = data[i];     // R
            rgb[j + 1] = data[i + 1]; // G
            rgb[j + 2] = data[i + 2]; // B
            j += 3;
        }

        tempCtx = null;
        console.log('INVOKING SLIC(RGB)...')

        const result = await window.api.invoke('apply_slic', {
            dimensions: `${width} ${height}`,
            pixelData: rgb.buffer // Send the raw buffer
        });


        console.log('SLIC algorithm completed - drawing segments')

        // Parse result string
        const lines = result.trim().split('\n');
        const [resultHeight, resultWidth] = lines[0].split(' ').map(Number);
        
        // Create a color map for segments
        const segmentColors = new Map();
        
        // Draw segments on canvas
        drawCtx.clearRect(0, 0, width, height);
        
        for(let y = 0; y < height; y++) {
            const segments = lines[y + 1].split(' ').map(Number);
            for(let x = 0; x < width; x++) {
                const segmentId = segments[x];
                
                // Generate a color for this segment if we haven't yet
                if (!segmentColors.has(segmentId)) {
                    segmentColors.set(segmentId, `hsl(${Math.random() * 360}, 70%, 70%)`);
                }
                
                // Draw pixel
                drawCtx.fillStyle = segmentColors.get(segmentId);
                drawCtx.fillRect(x, y, 1, 1);
            }
        }

        return result;

    } catch (error) {
        console.error('SLIC processing failed:', error);
        throw error;
    }

    // pass the ACTIVE image in
    // invoke a python script
    // RUN the python script ON the input image USING any cluent-specified parameters
    // return the results to the DRAW CANVAS
}
