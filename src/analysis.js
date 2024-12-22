let analysisCanvas = document.getElementById('analysis-canvas');
let ctx = analysisCanvas.getContext('2d');

let pixelLabels;

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16).toUpperCase();
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

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