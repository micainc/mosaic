// SCRIPT FOR HANDLING SEGMENTATION TASKS 

async function prepareImagesForClassifier(images) {
    // Create a canvas to get image data
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    let prepared = {};
    
    for (const [filename, imageInfo] of Object.entries(images)) {
        const img = new Image();
        await new Promise((resolve) => {
            img.onload = () => {
                tempCanvas.width = img.naturalWidth;
                tempCanvas.height = img.naturalHeight;
                tempCtx.drawImage(img, 0, 0);
                const imageData = tempCtx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
                prepared[filename] = {
                    data: imageData,
                    width: img.naturalWidth,
                    height: img.naturalHeight
                };
                resolve();
            };
            img.src = imageInfo.src;
        });
    }
    
    return prepared;
}

async function handleApplyClassifier() {
    const classes = ['undefined', 'unknown', 'K-feldspar', 'amphibole', 'andalusite', 'anhydrite', 'apatite', 'arsenopyrite', 'azurite', 'barite', 'beryl', 'biotite', 'bornite', 'calcite', 'cassiterite', 'celestite', 'cerussite', 'chalcedony', 'chalcocite', 'chalcopyrite', 'chlorite', 'chloritoid', 'cinnabar', 'clay minerals', 'clinopyroxene', 'columbite', 'cordierite', 'corundum', 'cummingtonite', 'diamond', 'dolomite', 'epidote', 'fluorite', 'galena', 'garnet', 'goethite', 'graphite', 'gypsum', 'halite', 'hematite', 'ilmenite', 'kyanite', 'limonite', 'magnetite', 'malachite', 'molybdenite', 'monazite', 'muscovite', 'native copper', 'native gold', 'native silver', 'native sulfur', 'nepheline', 'olivine', 'opal', 'orpiment', 'orthopyroxene', 'pentlandite', 'plagioclase feldspar', 'prehnite', 'pyrite', 'pyrrhotite', 'quartz', 'realgar', 'rhodochrosite', 'rutile', 'scapolite', 'scheelite', 'serpentine', 'siderite', 'sillimanite', 'smithsonite', 'sphalerite', 'staurolite', 'stibnite', 'sylvite', 'talc', 'tantalite', 'titanite', 'topaz', 'tourmaline', 'vesuvianite', 'wolframite', 'wollastonite', 'zeolites', 'zircon'];
    const label_colours = await window.api.invoke('get_label_colours');

    // Use the actual image dimensions
    let width = draw_canvas.width;
    let height = draw_canvas.height;

    console.log("WIDTH/HEIGHT: " + width + ", "+ height)

    try {
        // Prepare images first
        const preparedImages = await prepareImagesForClassifier(images);
        const {success, error, predictions} = await window.api.applyClassifier(preparedImages);
        if (success) {
            // predictions = _predictions
            for(let h = 0; h < height; h++) {
                for(let w = 0; w < width; w++) {
                    let maxPredictionClassIndex = -1;
                    let maxPrediction = 0;
                    for(let c = 0; c < classes.length; c++) {
                        const predictionValue = predictions[(h * width + w) * 86 + c];
                        if (predictionValue > maxPrediction) {
                            maxPrediction = predictionValue;
                            maxPredictionClassIndex = c;
                        }
                    }
                    const probableClass = classes[maxPredictionClassIndex];
                    const color = label_colours[probableClass];

                    // Set the fill style
                    draw_ctx.fillStyle = color;
                    // Draw the pixel (scaled to fit the canvas)
                    draw_ctx.fillRect(w, h, 1, 1);
                }
            }

            console.log('Classifier applied successfully');
        } else {
            console.error('Error applying classifier:', error);
        }
    } catch (error) {
        console.error('Error calling classifier:', error);
    }
}

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
        draw_ctx.clearRect(0, 0, width, height);
        
        for(let y = 0; y < height; y++) {
            const segments = lines[y + 1].split(' ').map(Number);
            for(let x = 0; x < width; x++) {
                const segmentId = segments[x];
                
                // Generate a color for this segment if we haven't yet
                if (!segmentColors.has(segmentId)) {
                    segmentColors.set(segmentId, `hsl(${Math.random() * 360}, 70%, 70%)`);
                }
                
                // Draw pixel
                draw_ctx.fillStyle = segmentColors.get(segmentId);
                draw_ctx.fillRect(x, y, 1, 1);
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
