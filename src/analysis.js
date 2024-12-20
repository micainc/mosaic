let analysisCanvas = document.getElementById('analysis-canvas');
let ctx = analysisCanvas.getContext('2d');

// Request image data when window loads
window.addEventListener('load', async () => {
    try {
        const receivedData = await window.api.invoke('request-image-data');
        if (receivedData) {
            const imageData = new ImageData(
                new Uint8ClampedArray(receivedData.data),
                receivedData.width,
                receivedData.height
            );
            // Debug - Put image data on canvas 
            // Unecessary, later on we'll add proper histogram data here
            ctx.putImageData(imageData, 0, 0);
        } else {
            console.error('No image data received');
        }
    } catch (error) {
        console.error('Error getting image data:', error);
    }
});