let analysisCanvas = document.getElementById('analysis-canvas');
let ctx = analysisCanvas.getContext('2d');

let pixelLabels;
let proportions;

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16).toUpperCase();
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

// Populates labelColours with the corresponding mineral names for each color
function populatePixelLabels(imageData, labelColours) {
    pixelLabels = new Array(imageData.height)
    for (let y = 0; y < imageData.height; y++) {
        pixelLabels[y] = new Array(imageData.width);
        for (let x = 0; x < imageData.width; x++) {
            const idx = (y * imageData.width + x) * 4;
            const hex = rgbToHex(
                imageData.data[idx],
                imageData.data[idx + 1],
                imageData.data[idx + 2]
            );
            pixelLabels[y][x] = labelColours[hex];
        }
    }
}

// Calculates a percentage proportion for each mineral in pixelLabels
// Updates proportions with these percents
function findMineralProportions(pixelLabels) {
    proportions = {}
    const totalPixels = pixelLabels.length * pixelLabels[0].length;
    
    // Count occurrences
    for (let y = 0; y < pixelLabels.length; y++) {
        for (let x = 0; x < pixelLabels[y].length; x++) {
            const mineral = pixelLabels[y][x];
            proportions[mineral] = (proportions[mineral] || 0) + 1;
        }
    }

    // Convert to percentages
    for (const mineral in proportions) {
        proportions[mineral] = (proportions[mineral] / totalPixels * 100).toFixed(2);
    }
}

// Request image data when window loads
window.addEventListener('load', async () => {
    try {
        const [receivedData, labelColours] = await Promise.all([
            window.api.invoke('request-image-data'),
            window.api.invoke('get-label-colours')
        ]);

        if (receivedData) {
            analysisCanvas.width = receivedData.width;
            analysisCanvas.height = receivedData.height;
            const imageData = new ImageData(
                new Uint8ClampedArray(receivedData.data),
                receivedData.width,
                receivedData.height
            );

            populatePixelLabels(imageData, labelColours);
            findMineralProportions(pixelLabels);
            console.log("Mineral proportions:", proportions);

            // Debug - Put image data on canvas 
            // Unecessary, later on we'll add proper histogram data here
            ctx.putImageData(imageData, 0, 0);
            console.log(pixelLabels)
            console.log(imageData);
            console.log(labelColours);
        } else {
            console.error('No image data received');
        }
    } catch (error) {
        console.error('Error getting image data:', error);
    }
});