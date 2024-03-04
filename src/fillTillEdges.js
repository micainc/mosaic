// This function checks if a given point (x, y) is either an edge point or has already been visited.
function isEdgeOrVisited(x, y, edgeSet, visited) {
    return edgeSet.has(`${x},${y}`) || visited.has(`${x},${y}`);
}

// Depth-first search to identify and map out each unique region in the canvas.
function dfs(data, x, y, regionId, visited, regionMap, canvasWidth, canvasHeight, edgeSet) {
    let stack = [[x, y]]; // Initialize stack with starting point

    // Continue until all points in this region are processed
    while (stack.length > 0) {
        let [currentX, currentY] = stack.pop();
        // Ignore out-of-bounds or already processed points
        if (currentX < 0 || currentY < 0 || currentX >= canvasWidth || currentY >= canvasHeight) continue;
        if (isEdgeOrVisited(currentX, currentY, edgeSet, visited)) continue;

        visited.add(`${currentX},${currentY}`); // Mark the point as visited
        // Create a new region set if this is the first point in the region
        if (!regionMap.has(regionId)) {
            regionMap.set(regionId, new Set());
        }
        regionMap.get(regionId).add(`${currentX},${currentY}`); // Add point to the current region

        // Add adjacent points to the stack for further processing
        stack.push([currentX + 1, currentY], [currentX - 1, currentY], [currentX, currentY + 1], [currentX, currentY - 1]);
    }
}

// This function identifies all edge points in the canvas.
function getAllEdgePoints(draw_ctx, canvasWidth, canvasHeight) {
    let edgeSet = new Set();
    let imageData = draw_ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    let data = imageData.data;

    // Iterate through all pixels to find edge points (defined as completely transparent)
    for (let y = 0; y < canvasHeight; y++) {
        for (let x = 0; x < canvasWidth; x++) {
            let index = (y * canvasWidth + x) * 4;
            if (data[index] === 0 && data[index + 1] === 0 && data[index + 2] === 0 && data[index + 3] === 0) {
                edgeSet.add(`${x},${y}`);
            }
        }
    }

    return edgeSet;
}

// This function identifies distinct regions in the canvas and assigns them unique IDs.
function getRegionsByIds(draw_ctx, canvasWidth, canvasHeight) {
    let imageData = draw_ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    let data = imageData.data;
    let edgeSet = getAllEdgePoints(draw_ctx, canvasWidth, canvasHeight);
    let regionMap = new Map();
    let visited = new Set();

    let regionId = 0;
    // Iterate through all pixels, executing DFS for each unvisited, non-edge point
    for (let y = 0; y < canvasHeight; y++) {
        for (let x = 0; x < canvasWidth; x++) {
            if (!isEdgeOrVisited(x, y, edgeSet, visited)) {
                dfs(data, x, y, regionId, visited, regionMap, canvasWidth, canvasHeight, edgeSet);
                regionId++;
            }
        }
    }

    return regionMap;
}

// Creates a hash map for quick look-up of which region a given pixel belongs to.
function getRegionHash(draw_ctx, canvasWidth, canvasHeight) {
    let startTime = performance.now(); // Start timer for performance measurement

    let regionMap = getRegionsByIds(draw_ctx, canvasWidth, canvasHeight);
    let hash = new Map();
    // Create a map where each pixel is a key and its value is the set of pixels in its region
    regionMap.forEach((coordinates, regionId) => {
        coordinates.forEach(point => hash.set(point, coordinates));
    });

    let endTime = performance.now(); // End timer
    console.log(`Time taken to regionify everything: ${endTime - startTime} milliseconds`);
    return hash; 
}

// Retrieves the set of coordinates that belong to the same region as the given x, y point.
function findRegion(x, y, regionMap) {
    let index = `${x},${y}`;
    return regionMap.has(index) ? regionMap.get(index) : new Set();
}

function getCombinedRegionForPoints(points, regionMap) {
    let setOfRegionSets = new Set();

    for (let i = 0; i < points.length; i++) {
        let x = points[i].x;
        let y = points[i].y;
    
        radiusToFill = 10
    
        // Iterate over a 20x20 square centered at (x, y)
        for (let dx = -1 * radiusToFill; dx <= radiusToFill; dx++) {
            for (let dy = -1 * radiusToFill; dy <= radiusToFill; dy++) {
    
                // Calculate the coordinates of the current pixel
                let currentX = x + dx;
                let currentY = y + dy;
                
                setOfRegionSets.add(findRegion(currentX, currentY, regionMap))
            }
        }
    }

    // Create a new set to hold the combined elements
    let combinedSet = new Set();

    // Iterate over each set in setOfRegionSets
    setOfRegionSets.forEach(regionSet => {
        // Add each element of the current regionSet to the combinedSet
        regionSet.forEach(element => {
            combinedSet.add(element);
        });
    });

    return combinedSet;
}

// Colors regions for a set of given points.
function colorRegionsForPoints(points, regionMap, color) {
    getCombinedRegionForPoints(points, regionMap).forEach(point => {
        const [x, y] = point.split(',').map(Number);
    
        // Set the fill color and draw a 1x1 rectangle at the coordinate
        draw_ctx.fillStyle = color;
        draw_ctx.fillRect(x, y, 1, 1);
    })
}
