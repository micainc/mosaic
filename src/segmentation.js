// SCRIPT FOR HANDLING SEGMENTATION TASKS 

async function handleApplySlic() {
    console.log("Running SLIC")

    if (!images || Object.keys(images).length === 0) {
        console.error('No images loaded');
        return;
    }

    //TODO: This is for testing, we likely don't simply want the first image a user dragged in!
    const firstImage = Object.values(images)[0];
    const imageData = firstImage.data;

    try {
        // Extract dimensions
        const width = imageData.width;
        const height = imageData.height;
        
        // Create new array without alpha channel
        const rgbOnly = new Array(width * height * 3);
        const data = imageData.data;
        
        // Copy RGB values, skipping alpha channel
        // Possibly innefficient! We loop through the entire image
        let j = 0;
        for (let i = 0; i < data.length; i += 4) {
            rgbOnly[j] = data[i];     // R
            rgbOnly[j + 1] = data[i + 1]; // G
            rgbOnly[j + 2] = data[i + 2]; // B
            j += 3;
        }

        const result = await window.api.runSlic({
            dimensions: `${width} ${height}`,
            pixelData: rgbOnly.join(' ')
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
