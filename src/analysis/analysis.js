let proportions;

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16).toUpperCase();
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

function analyzeGrains(imageData, labelColours) {
    const width = imageData.width;
    const height = imageData.height;
    const pixels = width * height;
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

    // Calculate proportions and add to grains object
    Object.entries(grains).forEach(([mineral, data]) => {
        data.proportion = data.size / pixels;
        // console.log(`${mineral}: ${(data.proportion * 100).toFixed(2)}% (${data.size} pixels)`);
    });

    return grains;
}

/*
grains = {
    "mineralName": {             // e.g., "quartz", "feldspar", etc.
        size: 5000,             // total pixels for this mineral type
        proportion: 0,          // proportion of total image (not currently calculated)
        colour: 4294967295,     // 32-bit color value (ARGB)
        hex: "#FFFFFF",         // hex color string
        grains: {
            "mineralName-0": {   // individual grain objects
                size: 150,      // grain size in pixels
                x: 10,          // leftmost coordinate
                y: 20,          // topmost coordinate
                w: 15,          // width of bounding box
                h: 12,          // height of bounding box
                minX: 10,       // minimum x coordinate
                minY: 20,       // minimum y coordinate
                maxX: 25,       // maximum x coordinate
                maxY: 32        // maximum y coordinate
            },
            "mineralName-1": {
                // next grain...
            }
        }
    },
    // Additional mineral types...
}
*/


function createFeretDiameterPlot(grains, labelColours) {
    const ctx = document.getElementById('feret-plot').getContext('2d');
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
    const ctx = document.getElementById('scatter-plot').getContext('2d');
 
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


function createHistogramPlot(grains) {
    // Scene setup
    const canvas = document.getElementById('histogram-plot');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: false,
        canvas: canvas
    });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    // THIS INCREASES RESOLUTION of 3js model on window size change
    window.addEventListener('resize', () => {
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    });


    // Add orbit controls for pivoting
    const controls = new OrbitControls(camera, renderer.domElement);
    camera.position.set(50, 50, 50);
    controls.update();


    // First compute global min/max grain sizes and create standardized bins
    function createGlobalBinning(grains, numBins = 32) {
        // Collect and sort all grain sizes
        const allSizes = Object.values(grains)
            .flatMap(mineralData => 
                Object.values(mineralData.grains).map(grain => grain.size)
            )
            .sort((a, b) => a - b);
        
        const globalMin = allSizes[0];
        const globalMax = allSizes[allSizes.length - 1];
        
        // Calculate grains per bin (approximately equal count in each bin)
        const grainsPerBin = Math.ceil(allSizes.length / numBins);
        
        // Create bins with dynamic widths
        const bins = [];
        for (let i = 0; i < numBins; i++) {
            const startIdx = i * grainsPerBin;
            const endIdx = Math.min((i + 1) * grainsPerBin, allSizes.length);
            
            if (startIdx >= allSizes.length) break;
            
            let binSize = 0;
            for(let j = startIdx; j< endIdx-1; j++) {
                binSize += allSizes[j];
            }
            binSize /= (endIdx - startIdx);
            const binMin = allSizes[startIdx];
            const binMax = allSizes[endIdx - 1];
            // const binWidth = binMax - binMin;
            
            bins.push({
                min: binMin,
                max: binMax,
                base: binSize/1000,  // Still using sqrt for visual scaling
                count: endIdx - startIdx  // Number of grains in this bin
            });
        }
    
        return {
            bins,
            globalMin,
            globalMax,
            totalGrains: allSizes.length
        };
    }

    // Count grains per bin for a specific mineral
    function binMineralGrains(mineralData, globalBinning) {
        const counts = new Array(globalBinning.bins.length).fill(0);
        
        Object.values(mineralData.grains).forEach(grain => {
            const binIndex = globalBinning.bins.findIndex(bin => 
                grain.size >= bin.min && grain.size < bin.max
            );
            if (binIndex !== -1) {
                counts[binIndex]++;
            }
        });

        return counts;
    }

    // Create global binning
    const globalBinning = createGlobalBinning(grains);

    // Sort minerals by proportion
    const sortedMinerals = Object.entries(grains)
        .sort(([,a], [,b]) => b.proportion - a.proportion);

    let zPosition = 0;

    // Create bars for each mineral
    sortedMinerals.forEach(([mineral, mineralData], mineralIdx) => {
        console.log("MIDX: ", mineralIdx)
        const counts = binMineralGrains(mineralData, globalBinning);
        let xPosition = 0;
        // Update z position for next mineral row
        // Create bars for each bin

        globalBinning.bins.forEach((bin, binIndex) => {
            const count = counts[binIndex];
            if (count > 0) {
                const geometry = new THREE.BoxGeometry(
                    bin.base,
                    count*bin.base,
                    bin.base
                );
                
                const color = new THREE.Color(mineralData.hex);
                const material = new THREE.MeshPhongMaterial({
                    color: color,
                    transparent: false,
                    opacity: 1
                });
                const bar = new THREE.Mesh(geometry, material);
                
                // Create edges
                const edges = new THREE.EdgesGeometry(geometry);
                const edgeMaterial = new THREE.LineBasicMaterial({ 
                    color: 0xFFFFFF,
                    linewidth: 1
                });
                const edgesMesh = new THREE.LineSegments(edges, edgeMaterial);
                
                // Position bars
                bar.position.x = xPosition + bin.base/2; // Add spacing between bars
                bar.position.y = count*bin.base / 2;
                bar.position.z = zPosition;
                
                edgesMesh.position.copy(bar.position);
                
                scene.add(bar);
                scene.add(edgesMesh);
            }
            xPosition += bin.base;
        });
        zPosition += globalBinning.bins[globalBinning.bins.length-1].base + globalBinning.bins[0].base/2; // Add spacing between mineral rows


    });

    // Add lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xFFFFFF));

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
            createHistogramPlot(grains);


        } else {
            console.error('No image data received');
        }
    } catch (error) {
        console.error('Error getting image data:', error);
    }
});