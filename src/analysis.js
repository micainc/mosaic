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
        proportions[mineral] = (proportions[mineral] / totalPixels * 100);
    }
}

/* ---------------- Find Grains ----------------*/

// Store visited pixels to avoid re-processing
const visited = new Set();

// Helper to generate unique key for pixel coordinates
const getPixelKey = (x, y) => `${x},${y}`;

// Check if a pixel is within bounds
function isValidPixel(x, y, width, height) {
    return x >= 0 && x < width && y >= 0 && y < height;
}

// Get neighboring pixels (8-connected neighborhood)
function getNeighbors(x, y, width, height) {
    const neighbors = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            const newX = x + dx;
            const newY = y + dy;
            if (isValidPixel(newX, newY, width, height)) {
                neighbors.push([newX, newY]);
            }
        }
    }
    return neighbors;
}

// Find a single grain starting from a pixel
function findGrain(startX, startY, pixelLabels) {
    const width = pixelLabels[0].length;
    const height = pixelLabels.length;
    const label = pixelLabels[startY][startX];
    const queue = [[startX, startY]];
    const pixels = new Set();
    
    // Add start pixel to visited and grain
    const startKey = getPixelKey(startX, startY);
    visited.add(startKey);
    pixels.add(startKey);

    while (queue.length > 0) {
        const [x, y] = queue.shift();
        
        // Check all neighbors
        for (const [newX, newY] of getNeighbors(x, y, width, height)) {
            const key = getPixelKey(newX, newY);
            if (!visited.has(key) && pixelLabels[newY][newX] === label) {
                visited.add(key);
                pixels.add(key);
                queue.push([newX, newY]);
            }
        }
    }

    return {
        label,
        pixels  // Set of pixel coordinates in this grain
    };
}

// Find all grains in the image
function findAllGrains(pixelLabels) {
    const width = pixelLabels[0].length;
    const height = pixelLabels.length;
    const grains = {};
    
    // Clear visited set for new analysis
    visited.clear();

    // Scan through all pixels
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const key = getPixelKey(x, y);
            if (!visited.has(key) && pixelLabels[y][x] !== undefined) {
                const grain = findGrain(x, y, pixelLabels);
                
                // Initialize array for this label if it doesn't exist
                if (!grains[grain.label]) {
                    grains[grain.label] = [];
                }
                
                // Add grain to appropriate label group
                grains[grain.label].push({
                    pixels: grain.pixels
                });
            }
        }
    }

    return grains;
}

function createScatterPlot(grains, proportions, labelColours) {
    const ctx = document.getElementById('scatterPlot').getContext('2d');
 
    // Create datasets for each mineral type
    const datasets = Object.entries(grains).map(([mineral, grainClusters]) => {
        // Get all grain sizes for this mineral
        const sizes = grainClusters.map(grain => grain.pixels.size);
        
        // Create data points - each point has same y value (proportion) but different x values (sizes)
        const data = sizes.map(size => ({
            x: size,
            y: proportions[mineral]
        }));
 
        return {
            label: mineral,
            data: data,
            backgroundColor: labelColours[mineral],
            pointStyle: 'circle',
            pointRadius: 5
        };
    });
 
    new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: datasets
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'Grain Size (pixels)'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Proportion of Thin Section (%)'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        usePointStyle: true
                    }
                }
            }
        }
    });
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

            grains = findAllGrains(pixelLabels);
            console.log("Grains: ", grains);

            // Todo - Figure out a way to make bucketSize more generic, not just hardcoded
            createScatterPlot(grains, proportions, labelColours);

            // Debug - Put image data on canvas 
            // Unecessary, later on we'll add proper histogram data here
            // ctx.putImageData(imageData, 0, 0);
            // console.log(pixelLabels)
            // console.log(imageData);
            // console.log(labelColours);
        } else {
            console.error('No image data received');
        }
    } catch (error) {
        console.error('Error getting image data:', error);
    }
});