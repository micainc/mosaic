let analysisCanvas = document.getElementById('analysis-canvas');
let ctx = analysisCanvas.getContext('2d');

// Request image data when window loads
window.addEventListener('load', async () => {
    try {
        const [receivedData, label_colours] = await Promise.all([
            window.api.invoke('request-image-data'),
            window.api.invoke('get-label-colours')
        ]);

        if (receivedData) {
            const imageData = new ImageData(
                new Uint8ClampedArray(receivedData.data),
                receivedData.width,
                receivedData.height
            );
            // Debug - Put image data on canvas 
            // Unecessary, later on we'll add proper histogram data here
            ctx.putImageData(imageData, 0, 0);
            console.log(label_colours);
        } else {
            console.error('No image data received');
        }
    } catch (error) {
        console.error('Error getting image data:', error);
    }
});