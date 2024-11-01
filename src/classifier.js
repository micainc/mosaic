const tf = require('@tensorflow/tfjs-node');

async function applyClassifier(images, model) {
    // console.log("APPLY CLASSIFIER IMAGES: ", images)
    // 1. Sort and prepare the images
    console.log("IMAGES: ", images)
    const { lin, composite, beauty, width, height } = sortImages(images);
    if (!lin || !composite || !beauty) {
        console.error("Could not find all required image types.");
        return;
    }

    return applySlideWindow({ lin, composite, beauty, width, height }, model);

}

function sortImages(images) {
    let lin, composite, beauty, width, height;
    for (let [filename, imageData] of Object.entries(images)) {
        if (filename.includes('lin')) lin = imageData.data.data;
        else if (filename.includes('composite')) composite = imageData.data.data;
        else if (filename.includes('beauty')) beauty = imageData.data.data;
        width = imageData.width;
        height = imageData.height;
    }
    return (lin && composite && beauty) ? { lin, composite, beauty, width, height } : null;
}

async function applySlideWindow(input, model) {
    const windowSize = 256;
    const stride = 256;
    const { lin, composite, beauty, width, height } = input;
    console.log("WIDTH/HEIGHT: " + width + ", "+ height)
    // Initialize predictions and counts arrays to match the original image size
    const predictions = new Uint16Array(width * height * 86) // instead of float32, use uInt8 to store percent predictions: normalize predition values from range (0,1) to 0 to 255

    const counts = new Uint8Array(height * width);

    for (let y = 0; y < height; y += stride) {
        for (let x = 0; x < width; x += stride) {
            const windowTensor = extractWindow({ lin, composite, beauty }, x, y, windowSize, width, height);
            console.log("CLASSIFYING " + windowTensor.shape + " REGION AT "+ x + ", " + y + "... ");
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

function extractWindow(images, x, y, windowSize, fullWidth, fullHeight) {

    // console.log("IMAGES LIN: ", images.lin)
    // Get a mutable buffer from the tensor to modify its values
    const windowData = new Float32Array(windowSize * windowSize * 9);

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
                // console.log("r1, g1, b1: " + images.lin[fullIndex] + ", "+ images.lin[fullIndex + 1] + ", "+ images.lin[fullIndex + 2])
                r1 = images.lin[fullIndex] / 255;
                g1 = images.lin[fullIndex + 1] / 255;
                b1 = images.lin[fullIndex + 2] / 255;
                r2 = images.composite[fullIndex] / 255;
                g2 = images.composite[fullIndex + 1] / 255;
                b2 = images.composite[fullIndex + 2] / 255;
                r3 = images.beauty[fullIndex] / 255;
                g3 = images.beauty[fullIndex + 1] / 255;
                b3 = images.beauty[fullIndex + 2] / 255;
            } else {
                r1 = g1 = b1 = r2 = g2 = b2 = r3 = g3 = b3 = 0;
            }

            const index = (wy * windowSize + wx) * 9;
            windowData[index] = r1;
            windowData[index + 1] = g1;
            windowData[index + 2] = b1;
            windowData[index + 3] = r2;
            windowData[index + 4] = g2;
            windowData[index + 5] = b2;
            windowData[index + 6] = r3;
            windowData[index + 7] = g3;
            windowData[index + 8] = b3;
        }
    }
    // console.log("WINDOW DATA: ", windowData)
    // Update the windowTensor with the new values
    return tf.tensor4d(windowData, [1, windowSize, windowSize, 9]);
}

module.exports = { applyClassifier };

