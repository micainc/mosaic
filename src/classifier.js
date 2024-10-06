async function applyClassifier(images, model) {
    // 1. Sort and prepare the images
    const sortedImages = sortImages(images);
    if (!sortedImages) {
        console.error("Could not find all required image types.");
        return;
    }

    // 2. Prepare the input data
    const inputData = prepareInputData(sortedImages);
    console.log("HERE!")
    // 3. Apply the classifier in a sliding window
    return applySlideWindow(inputData, model);
}

function sortImages(images) {
    let lin, composite, beauty;
    for (let [filename, imageData] of Object.entries(images)) {
        if (filename.includes('lin')) lin = imageData;
        else if (filename.includes('composite')) composite = imageData;
        else if (filename.includes('beauty')) beauty = imageData;
    }
    return (lin && composite && beauty) ? { lin, composite, beauty } : null;
}

function prepareInputData({ lin, composite, beauty }) {
    const width = lin.data.width;
    const height = lin.data.height;
    const inputData = new Float32Array(width * height * 9);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const j = (y * width + x) * 9;

            // Lin image
            inputData[j] = lin.data.data[i] / 255;
            inputData[j + 1] = lin.data.data[i + 1] / 255;
            inputData[j + 2] = lin.data.data[i + 2] / 255;

            // Composite image
            inputData[j + 3] = composite.data.data[i] / 255;
            inputData[j + 4] = composite.data.data[i + 1] / 255;
            inputData[j + 5] = composite.data.data[i + 2] / 255;

            // Beauty image
            inputData[j + 6] = beauty.data.data[i] / 255;
            inputData[j + 7] = beauty.data.data[i + 1] / 255;
            inputData[j + 8] = beauty.data.data[i + 2] / 255;
        }
    }

    return { data: inputData, width, height };
}

async function applySlideWindow(inputData, model) {
    const { data, width, height } = inputData;
    const windowSize = 256;
    const stride = 128;
    const predictions = new Array(height).fill().map(() => new Array(width).fill().map(() => new Array(86).fill(0)));
    const counts = new Array(height).fill().map(() => new Array(width).fill(0));

    for (let y = 0; y <= height - windowSize; y += stride) {
        for (let x = 0; x <= width - windowSize; x += stride) {
            const windowTensor = extractWindow(data, x, y, windowSize, width);
            console.log("HERE!")
            const predictionTensor = model.predict(windowTensor);
            const prediction = await predictionTensor.array();

            // Accumulate predictions
            for (let wy = 0; wy < windowSize; wy++) {
                for (let wx = 0; wx < windowSize; wx++) {
                    const px = x + wx;
                    const py = y + wy;
                    for (let c = 0; c < 86; c++) {
                        predictions[py][px][c] += prediction[wy][wx][c];
                    }
                    counts[py][px]++;
                }
            }

            // Dispose of tensors to free memory
            windowTensor.dispose();
            predictionTensor.dispose();
        }
    }

    // Average the predictions
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (counts[y][x] > 0) {
                for (let c = 0; c < 86; c++) {
                    predictions[y][x][c] /= counts[y][x];
                }
            }
        }
    }

    return predictions;
}

function extractWindow(data, x, y, windowSize, fullWidth) {
    const windowData = new Float32Array(windowSize * windowSize * 9);
    for (let wy = 0; wy < windowSize; wy++) {
        for (let wx = 0; wx < windowSize; wx++) {
            const fullIndex = ((y + wy) * fullWidth + (x + wx)) * 9;
            const windowIndex = (wy * windowSize + wx) * 9;
            for (let c = 0; c < 9; c++) {
                windowData[windowIndex + c] = data[fullIndex + c];
            }
        }
    }
    // Convert to tensor and add batch dimension
    return tf.tensor4d(windowData, [1, windowSize, windowSize, 9]);
}