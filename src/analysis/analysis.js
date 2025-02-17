let proportions;

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16).toUpperCase();
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

/* 
classes = { 
    quartz: {
        size: 3680, // total number of pixels globally 
        colour: 1249986310124, // numeric colour value that can be transferred into hexadecimal
        hex: #FF0000,
        grains: ['quartz-0': { 
            size: // size in pixels 
            eccentricity: // DONT WORRY ABOUT FOR NOW: some way to measure sharpness/roundness of grain edge?
            direction:  // DONT WORRY ABOUT FOR NOW: direction in which grain is being elongated?
            confidence: // DONT WORRY ABOUT FOR NOW: assurance that grain is of a certain class
            x: // leftmost coordinate
            y: // topmost coordinate
            w: // width of grain mask
            h: // height of grain mask
            mask: [0 0 0 1 1 1 0 ....] 1D array? 2D array? whichever is faster given we save width, height
        },
        ]
    }, 
    plagioclase: {
        ...
    }
}
*/


function analyzeGrains(imageData, labelColours) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    // Create classes object to store mineral statistics
    let grains = {};
    
    // Create binary mask and color map in one pass
    const mask = new Uint8Array(width * height);
    const colorMap = new Uint32Array(width * height);
    
    for (let i = 0; i < width * height; i++) {
        const r = data[4 * i],
              g = data[4 * i + 1],
              b = data[4 * i + 2],
              a = data[4 * i + 3];
              
        // If pixel is non-transparent and not grey, mark as foreground
        if (a !== 0 && !(r === 127 && g === 127 && b === 127)) {
            mask[i] = 1;
            // Store color as 32-bit integer for faster comparison
            colorMap[i] = (a << 24) | (r << 16) | (g << 8) | b;
        }
    }

    // Find connected components using flood fill
    const visited = new Uint8Array(width * height);
    let grainId = 0;

    for (let y = 0; y < height; y += 2) {
        for (let x = 0; x < width; x += 2) {
            const idx = y * width + x;
            if (mask[idx] === 1 && visited[idx] === 0) { // iterate through all foreground pixels (non transparent, non gray)
                // Start new grain
                const color = colorMap[idx];
                // Extract RGB for hex (ignore alpha for hex representation)
                const r = (color >> 16) & 0xFF;
                const g = (color >> 8) & 0xFF;
                const b = color & 0xFF;
                const hex = '#' + [r, g, b].map(x => {
                    const hex = x.toString(16).toUpperCase();
                    return hex.length === 1 ? '0' + hex : hex;
                }).join('');

                const mineralType = labelColours[hex];
                
                // Initialize class if not exists
                if (!grains[mineralType]) {
                    grains[mineralType] = {
                        size: 0,
                        proportion: 0, // proportion of total image
                        colour: color,
                        hex: hex,
                        grains: {}
                    };
                }

                // Flood fill to find connected component
                const grain = {
                    size: 0,
                    x: x,
                    y: y,
                    w: 0,
                    h: 0,
                    minX: x,
                    minY: y,
                    maxX: x,
                    maxY: y
                };

                const stack = [[x, y]];
                visited[idx] = 1;
                
                while (stack.length) {
                    const [cx, cy] = stack.pop();
                    
                    // Update grain properties
                    grain.size++;
                    grain.minX = Math.min(grain.minX, cx);
                    grain.maxX = Math.max(grain.maxX, cx);
                    grain.minY = Math.min(grain.minY, cy);
                    grain.maxY = Math.max(grain.maxY, cy);

                    // Check 4-connected neighbors
                    const neighbors = [
                        [cx + 1, cy], [cx - 1, cy],
                        [cx, cy + 1], [cx, cy - 1]
                    ];

                    for (const [nx, ny] of neighbors) {
                        if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
                            const nIdx = ny * width + nx;
                            if (mask[nIdx] === 1 && visited[nIdx] === 0 && 
                                colorMap[nIdx] === color) {
                                visited[nIdx] = 1;
                                stack.push([nx, ny]);
                            }
                        }
                    }
                }

                // Finalize grain measurements
                grain.w = grain.maxX - grain.minX + 1;
                grain.h = grain.maxY - grain.minY + 1;

                // Add grain to class
                grains[mineralType].grains[`${mineralType}-${grainId}`] = grain;
                grains[mineralType].size += grain.size;
                grainId++;
            }
        }
    }

    console.log("GRAINS: ", grains)
    Object.entries(grains).forEach((key, value) => {
        console.log("KEY/VAL: "+ key+ ", "+ JSON.stringify(grains[value]))
    });

    return grains;
}


function createFeretDiameterPlot(grains, labelColours) {
    const ctx = document.getElementById('feretPlot').getContext('2d');
    const datasets = [];

    // Process data for each mineral type
    Object.entries(grains).forEach(([mineral, mineralData]) => {
        // Get major axis lengths (Feret diameters)
        const diameters = Object.values(mineralData.grains).map(grain => 
            Math.sqrt(grain.size) // Approximating Feret diameter
        ).sort((a, b) => a - b);

        // Calculate cumulative percentages
        const cumulativeData = diameters.map((diameter, index) => ({
            x: diameter,
            y: ((index + 1) / diameters.length) * 100
        }));

        datasets.push({
            label: mineral,
            data: cumulativeData,
            borderColor: mineralData.hex, // Use the hex color stored in the grains object
            fill: false,
            tension: 0.4
        });
    });

    new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            scales: {
                x: {
                    type: 'logarithmic',
                    title: {
                        display: true,
                        text: 'Grain Size (pixels)'
                    },
                    reverse: true
                },
                y: {
                    title: {
                        display: true,
                        text: 'Cumulative Percent Finer (%)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Feret Diameter Analysis'
                },
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

function createScatterPlot(grains, labelColours) {
    const ctx = document.getElementById('scatterPlot').getContext('2d');
 
    // Create datasets for each mineral type
    const datasets = Object.entries(grains).map(([mineral, mineralData]) => {
        // Get all grain sizes from the grains object
        const sizes = Object.values(mineralData.grains).map(grain => grain.size);
        
        // Calculate proportion for this mineral
        const proportion = (mineralData.size / Object.values(grains).reduce((sum, m) => sum + m.size, 0)) * 100;
        
        // Create data points - each point has same y value (proportion) but different x values (sizes)
        const data = sizes.map(size => ({
            x: size,
            y: proportion
        }));
 
        return {
            label: mineral,
            data: data,
            backgroundColor: mineralData.hex,  // Use the hex color stored in the grains object
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


function createHistogramPlot(grains, containerId) {
    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: false,
        canvas: document.createElement('canvas')
    });
    renderer.setSize(800, 400);
    document.getElementById(containerId).appendChild(renderer.domElement);

    // Add orbit controls for pivoting
    const controls = new OrbitControls(camera, renderer.domElement);
    camera.position.set(50, 50, 50);
    controls.update();

    // Process grain data
    function createHistogramData(mineralData, numBins = 64) {
        const sizes = Object.values(mineralData.grains).map(grain => grain.size);
        const min = Math.min(...sizes);
        const max = Math.max(...sizes);
        const binWidth = (max - min) / numBins;
        
        const bins = new Array(numBins).fill(0);
        
        sizes.forEach(size => {
            const binIndex = Math.min(
                Math.floor((size - min) / binWidth),
                numBins - 1
            );
            bins[binIndex]++;
        });
        
        return {
            bins,
            min,
            max,
            binWidth
        };
    }

    // Create histogram bars for each mineral
    Object.entries(grains).forEach(([mineral, mineralData], mineralIndex) => {
        const histData = createHistogramData(mineralData);
        const maxCount = Math.max(...histData.bins);
        
        histData.bins.forEach((count, binIndex) => {
            if (count > 0) {
                const heightScale = 2;
                const baseSize = Math.sqrt(histData.binWidth);
                
                const geometry = new THREE.BoxGeometry(
                    baseSize,
                    count * heightScale,
                    baseSize
                );
                
                // Use the mineral's hex color instead of HSL
                const color = new THREE.Color(mineralData.hex);
                const material = new THREE.MeshPhongMaterial({
                    color: color,
                    transparent: false,
                    opacity: 1
                });
                
                const bar = new THREE.Mesh(geometry, material);
                
                bar.position.x = binIndex * (baseSize + 0.5);
                bar.position.y = count * heightScale / 2;
                bar.position.z = mineralIndex * (baseSize + 2);
                
                scene.add(bar);
            }
        });
    });

    // Add lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
}



// Request image data when window loads
window.addEventListener('load', async () => {
    try {
        const [receivedData, labelColours] = await Promise.all([
            window.api.invoke('get_draw_data'),
            window.api.invoke('get_label_colours')
        ]);

        if (receivedData) {
            const imageData = new ImageData(new Uint8ClampedArray(receivedData.data), receivedData.width, receivedData.height);

            console.log("LABEL COLOURS: ", labelColours)
            const grains = analyzeGrains(imageData, labelColours);

            console.log("GRAIN STATS ", grains)
            
            // // Save to file
            // window.api.invoke('save_grains', {
            //     path: 'grain_sizes.json',
            //     data: JSON.stringify(grains, null, 2)
            // });

            createScatterPlot(grains, labelColours);
            createFeretDiameterPlot(grains, labelColours)
            createHistogramPlot(grains, 'histogramPlot');


        } else {
            console.error('No image data received');
        }
    } catch (error) {
        console.error('Error getting image data:', error);
    }
});