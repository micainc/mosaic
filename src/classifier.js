

// called by frontend- frontend function!
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

// called by frontend- frontend function!
async function applyClassifier() {
    const classes = ['undefined', 'unknown', 'K-feldspar', 'amphibole', 'andalusite', 'anhydrite', 'apatite', 'arsenopyrite', 'azurite', 'barite', 'beryl', 'biotite', 'bornite', 'calcite', 'cassiterite', 'celestite', 'cerussite', 'chalcedony', 'chalcocite', 'chalcopyrite', 'chlorite', 'chloritoid', 'cinnabar', 'clay minerals', 'clinopyroxene', 'columbite', 'cordierite', 'corundum', 'cummingtonite', 'diamond', 'dolomite', 'epidote', 'fluorite', 'galena', 'garnet', 'goethite', 'graphite', 'gypsum', 'halite', 'hematite', 'ilmenite', 'kyanite', 'limonite', 'magnetite', 'malachite', 'molybdenite', 'monazite', 'muscovite', 'native copper', 'native gold', 'native silver', 'native sulfur', 'nepheline', 'olivine', 'opal', 'orpiment', 'orthopyroxene', 'pentlandite', 'plagioclase feldspar', 'prehnite', 'pyrite', 'pyrrhotite', 'quartz', 'realgar', 'rhodochrosite', 'rutile', 'scapolite', 'scheelite', 'serpentine', 'siderite', 'sillimanite', 'smithsonite', 'sphalerite', 'staurolite', 'stibnite', 'sylvite', 'talc', 'tantalite', 'titanite', 'topaz', 'tourmaline', 'vesuvianite', 'wolframite', 'wollastonite', 'zeolites', 'zircon'];
    const label_colours = await window.api.invoke('get_label_colours');

    // Use the actual image dimensions
    let width = drawCanvas.width;
    let height = drawCanvas.height;

    console.log("WIDTH/HEIGHT: " + width + ", "+ height)

    try {
        // Prepare images first
        const preparedImages = await prepareImagesForClassifier(IMAGE_LAYERS);
        const {success, error, predictions} = await window.api.invoke('apply_classifier', preparedImages);
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
                    drawCtx.fillStyle = color;
                    // Draw the pixel (scaled to fit the canvas)
                    drawCtx.fillRect(w, h, 1, 1);
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








// ALL BACKEND!!! 
async function classify(images, model, tf) {
    // console.log("APPLY CLASSIFIER IMAGES: ", images)
    // 1. Sort and prepare the images
    console.log("IMAGES: ", images)
    const { xpol, ppol, xpol_texture, ppol_texture, ref, width, height } = sortImages(images);
    if (!xpol || !ppol || !xpol_texture || !ppol_texture || !ref) {
        console.error("Could not find all required image types.");
        return;
    }

    return applySlideWindow({ xpol, ppol, xpol_texture, ppol_texture, ref, width, height }, model, tf);

}

function sortImages(images) {
    let xpol, ppol, xpol_texture, ppol_texture, ref, width, height;
    for (let [filename, imageData] of Object.entries(images)) {
        if (filename.includes('xpol')) xpol = imageData.data.data;
        else if (filename.includes('ppol')) ppol = imageData.data.data;
        else if (filename.includes('xpol_texture')) xpol_texture = imageData.data.data;
        else if (filename.includes('ppol_texture')) ppol_texture = imageData.data.data;
        else if (filename.includes('ref')) ref = imageData.data.data;

        width = imageData.width;
        height = imageData.height;
    }
    return (xpol && ppol && xpol_texture && ppol_texture && ref) ? { xpol, ppol, xpol_texture, ppol_texture, ref, width, height } : null;
}

async function applySlideWindow(input, model, tf) {
    const windowSize = 256;
    const stride = 256;
    const { xpol, ppol, xpol_texture,  ppol_texture, ref, width, height } = input;
    console.log("WIDTH/HEIGHT: " + width + ", "+ height)
    // Initialize predictions and counts arrays to match the original image size
    const predictions = new Uint16Array(width * height * 86) // instead of float32, use uInt8 to store percent predictions: normalize predition values from range (0,1) to 0 to 255
    const counts = new Uint8Array(height * width);
    console.log(model.inputs[0].shape);  // Shows input shape
    console.log(model.inputs[0].dtype);  // Shows expected data type
    
    for (let y = 0; y < height; y += stride) {
        for (let x = 0; x < width; x += stride) {
            const windowTensor = extractWindow({ xpol, ppol, xpol_texture, ppol_texture, ref }, x, y, windowSize, width, height, tf);
            console.log("CLASSIFYING " + windowTensor.shape + " (" + windowTensor.dtype+ ") WINDOW AT "+ x + ", " + y + "... ");
            const predictionTensor = model.predict(windowTensor);
            const prediction = await predictionTensor.array();

            if (!Array.isArray(prediction) || !Array.isArray(prediction[0]) || !Array.isArray(prediction[0][0])) {
                console.error("Unexpected prediction shape:", prediction);
                continue;
            }
            
            // Accumulate predictions (adjust indices to match original image coordinates)
            for (let wy = 0; wy < windowSize; wy++) {
                for (let wx = 0; wx < windowSize; wx++) {
                    // const px = x + wx - Math.floor(windowSize / 2);
                    // const py = y + wy - Math.floor(windowSize / 2);
                    const px = x + wx;
                    const py = y + wy;
                    if (px >= 0 && px < width && py >= 0 && py < height) {
                        const index = (py * width + px);
                        for (let c = 0; c < 86; c++) {
                            // Convert prediction from [0, 1] to [0, 10000] and round to nearest integer
                            predictions[index * 86 + c] +=  Math.round(prediction[0][wy][wx][c] * 100);
                        }
                        counts[index]++;
                    }
                }
            }
            windowTensor.dispose();
            predictionTensor.dispose();
        }
    }

    // Average the predictions
    const percentPredictions = new Uint8Array(width * height * 86);

    for (let i = 0; i < width * height; i++) {
        if (counts[i] > 0) {
            for (let c = 0; c < 86; c++) {
                percentPredictions[i * 86 + c] = Math.min(100, Math.round(predictions[i * 86 + c] / counts[i]));
            }
        }
    }
    
    return percentPredictions;
}

function extractWindow(images, x, y, windowSize, fullWidth, fullHeight, tf) {

    // Get a mutable buffer from the tensor to modify its values
    const windowData = new Float32Array(windowSize * windowSize * 15);

    let r1, g1, b1, r2, g2, b2, r3, g3, b3;

    for (let wy = 0; wy < windowSize; wy++) {
        for (let wx = 0; wx < windowSize; wx++) {
            // Calculate the corresponding coordinates in the original image
            // Subtracting halfWindow centers the window around (x, y)
            const imgX = x + wx;
            const imgY = y + wy;

            // Check if the calculated coordinates are within the original image bounds

            if (imgX >= 0 && imgX < fullWidth && imgY >= 0 && imgY < fullHeight) {
                const fullIndex = (imgY * fullWidth + imgX) * 4;
                // console.log("r1, g1, b1: " + images.xpol[fullIndex] + ", "+ images.xpol[fullIndex + 1] + ", "+ images.xpol[fullIndex + 2])
                r1 = images.xpol[fullIndex] / 255;
                g1 = images.xpol[fullIndex + 1] / 255;
                b1 = images.xpol[fullIndex + 2] / 255;
                r2 = images.ppol[fullIndex] / 255;
                g2 = images.ppol[fullIndex + 1] / 255;
                b2 = images.ppol[fullIndex + 2] / 255;
                r3 = images.xpol_texture[fullIndex] / 255;
                g3 = images.xpol_texture[fullIndex + 1] / 255;
                b3 = images.xpol_texture[fullIndex + 2] / 255;
                r4 = images.ppol_texture[fullIndex] / 255;
                g4 = images.ppol_texture[fullIndex + 1] / 255;
                b4 = images.ppol_texture[fullIndex + 2] / 255;
                r5 = images.ref[fullIndex] / 255;
                g5 = images.ref[fullIndex + 1] / 255;
                b5 = images.ref[fullIndex + 2] / 255;
            } else {
                r1 = g1 = b1 = r2 = g2 = b2 = r3 = g3 = b3 = r4 = g4 = b4 = r5 = g5 = b5 = 0;
            }

            const index = (wy * windowSize + wx) * 15;
            windowData[index + 0] = r1;
            windowData[index + 1] = g1;
            windowData[index + 2] = b1;

            windowData[index + 3] = r2;
            windowData[index + 4] = g2;
            windowData[index + 5] = b2;

            windowData[index + 6] = r3;
            windowData[index + 7] = g3;
            windowData[index + 8] = b3;

            windowData[index + 9] = r4;
            windowData[index + 10] = g4;
            windowData[index + 11] = b4;

            windowData[index + 12] = r5;
            windowData[index + 13] = g5;
            windowData[index + 14] = b5;
        }
    }
    // console.log("WINDOW DATA: ", windowData)
    // Update the windowTensor with the new values
    return tf.tensor4d(windowData, [1, windowSize, windowSize, 15]);
}

module.exports = { classify };

