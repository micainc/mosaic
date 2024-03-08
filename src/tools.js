const Tools = {
    pencil: "pencil",
    fill: "fill"
};

var selectedTool = Tools.pencil;
var setOfPointsToFill = new Set()
var setOfPointsToFillToCheck = null
var firstPixelForFill = null

function selectPencil(button) {
    selectedTool = Tools.pencil;
    updateButtonStyles(button);
}

function selectFill(button) {
    selectedTool = Tools.fill;
    updateButtonStyles(button);
}

function create2DArray(x, y, initialValue = null) {
    const array = new Array(y);

    for (let i = 0; i < y; i++) {
        array[i] = new Array(x).fill(initialValue);
    }

    return array;
}

function findCoordinatesWithValueOne(array) {
    const coordinates = [];

    for (let x = 0; x < array.length; x++) {
        for (let y = 0; y < array[x].length; y++) {
            if (array[x][y] === 1) {
                coordinates.push({ x, y });
            }
        }
    }

    return coordinates;
}

function largestRectangleArea(heights) {
    let maxArea = 0;
    const stack = [];
    heights.push(0); // Add a sentinel value to handle empty stack scenario

    for (let i = 0; i < heights.length; i++) {
        while (stack.length > 0 && heights[stack[stack.length - 1]] > heights[i]) {
            const height = heights[stack.pop()];
            const width = stack.length === 0 ? i : i - stack[stack.length - 1] - 1;
            maxArea = Math.max(maxArea, height * width);
        }
        stack.push(i);
    }

    return maxArea;
}

function maximalRectangle(matrix) {
    if (matrix.length === 0 || matrix[0].length === 0) return 0;
    let maxRectangle = 0;
    const dp = new Array(matrix[0].length).fill(0);

    for (let i = 0; i < matrix.length; i++) {
        for (let j = 0; j < matrix[0].length; j++) {
            dp[j] = matrix[i][j] === '1' ? dp[j] + 1 : 0;
        }
        maxRectangle = Math.max(maxRectangle, largestRectangleArea(dp));
    }

    return maxRectangle;
}

function updateButtonStyles(selectedButton) {
    // Get all buttons with the 'tool' class and remove 'selected-tool' from each
    document.querySelectorAll('.tool').forEach(button => {
        button.classList.remove('selected-tool');
    });

    // Add the 'selected-tool' class to the selected button
    selectedButton.classList.add('selected-tool');
}

function goOutFromDrawPointsToFill(drawPoints, draw_ctx) {
    drawPoints.forEach(point => {
        
        // Ideally i would check if boundry is in the set.
        // var rightboundry = findBoundaryPixel(draw_ctx, point.x, point.y)
        if (setOfPointsToFillToCheck[point.x][point.y] == 0) {
            findSector2(draw_ctx, point.x, point.y)
        }
    }); 

    r =  findCoordinatesWithValueOne(setOfPointsToFillToCheck)


    return r
    // return setOfPointsToFill;
}

function getStartPixelColor() {
    return `rgba(${firstPixelForFill[0]}, ${firstPixelForFill[1]}, ${firstPixelForFill[2]}, ${firstPixelForFill[ 3] / 255})`;
}

function getPixelColor(imageData, x, y) {
    if (x < 0 || y < 0 || x >= imageData.width || y >= imageData.height) {
        return null; // Out of bounds
    }
    const offset = (y * imageData.width + x) * 4;
    const data = imageData.data;
    return `rgba(${data[offset]}, ${data[offset + 1]}, ${data[offset + 2]}, ${data[offset + 3] / 255})`;
}



function isSameColor(color1, color2) {
    return color1 == color2;
}

function isBoundaryPixel(imageData, x, y, targetColor) {
    const color = getPixelColor(imageData, x, y);
    if (color === null || !isSameColor(color, targetColor)) {
        return false;
    }

    // Check the 8 neighbors
    const neighbors = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    return neighbors.some(([dx, dy]) => {
        const neighborColor = getPixelColor(imageData, x + dx, y + dy);
        return neighborColor !== null && !isSameColor(neighborColor, targetColor);
    });
}

function findSector(draw_ctx, startX, startY) {
    const imageData = draw_ctx.getImageData(0, 0, draw_ctx.canvas.width, draw_ctx.canvas.height);
    const startColor = getStartPixelColor(); // Assuming this function gets the color at the start coordinates
    const sectorPixels = [];
    const visited = new Set();
    const stack = [{ x: startX, y: startY }];

    while (stack.length > 0) {
        const { x, y } = stack.pop();

        if (x < 0 || y < 0 || x >= imageData.width || y >= imageData.height) {
            continue; // Out of bounds
        }

        const key = `${x},${y}`;
        if (visited.has(key)) {
            continue; // Already visited
        }
        visited.add(key);

        const color = getPixelColor(imageData, x, y);
        if (color === null || !isSameColor(color, startColor)) {
            continue; // Different color, not part of the sector
        }

        sectorPixels.push({ x, y }); // Add the pixel as part of the sector

        // Push neighboring pixels to stack
        stack.push({ x: x + 1, y }); // Right
        stack.push({ x: x - 1, y }); // Left
        stack.push({ x, y: y + 1 }); // Down
        stack.push({ x, y: y - 1 }); // Up
    }

    return sectorPixels;
}

function findSector2(draw_ctx, startX, startY) {
    const imageData = draw_ctx.getImageData(0, 0, draw_ctx.canvas.width, draw_ctx.canvas.height);
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const startColor = firstPixelForFill; // Assuming this is [r, g, b, a]
    const visited = new Uint8Array(width * height);
    const stack = [{ x: startX, y: startY }];
    
    // Pre-compute offset multipliers
    const widthTimesFour = width * 4;

    while (stack.length > 0) {
        const { x, y } = stack.pop();

        if (x < 0 || x >= width || y < 0 || y >= height) continue;

        const idx = y * width + x;
        if (visited[idx]) continue;

        visited[idx] = 1;

        const offset = idx * 4;
        const currentColor = [data[offset], data[offset + 1], data[offset + 2], data[offset + 3]];
        
        if (currentColor[0] !== startColor[0] || currentColor[1] !== startColor[1] || 
            currentColor[2] !== startColor[2] || currentColor[3] !== startColor[3]) continue;

        // Update the sector pixel data
        setOfPointsToFillToCheck[x][y] = 1;

        // Add valid neighbors
        if (x + 1 < width && !visited[idx + 1]) stack.push({ x: x + 1, y });
        if (x > 0 && !visited[idx - 1]) stack.push({ x: x - 1, y });
        if (y + 1 < height && !visited[idx + width]) stack.push({ x, y: y + 1 });
        if (y > 0 && !visited[idx - width]) stack.push({ x, y: y - 1 });
    }

    return setOfPointsToFillToCheck;
}


function isSameColorArray(rgba1, rgba2) {
    return rgba1[0] === rgba2[0] && rgba1[1] === rgba2[1] && rgba1[2] === rgba2[2] && rgba1[3] === rgba2[3];
}

function findSectorBoundary(draw_ctx, startX, startY) {
    const imageData = draw_ctx.getImageData(0, 0, draw_ctx.canvas.width, draw_ctx.canvas.height);
    const startColor = getStartPixelColor();
    const boundary = [];
    const visited = new Set();
    const stack = [{x: startX, y: startY}]; // Use a stack for iterative DFS

    while (stack.length > 0) {
        const {x, y} = stack.pop();

        if (x < 0 || y < 0 || x >= imageData.width || y >= imageData.height) {
            continue; // Out of bounds
        }

        const key = `${x},${y}`;
        if (visited.has(key)) {
            continue; // Already visited
        }
        visited.add(key);

        const color = getPixelColor(imageData, x, y);
        if (color === null || !isSameColor(color, startColor)) {
            continue; // Different color, not part of the sector
        }

        if (isBoundaryPixel(imageData, x, y, startColor)) {
            boundary.push({x: x, y: y}); // Boundary pixel
        }

        // Push neighboring pixels to stack
        stack.push({x: x + 1, y}); // Right
        stack.push({x: x - 1, y}); // Left
        stack.push({x, y: y + 1}); // Down
        stack.push({x, y: y - 1}); // Up
    }

    return boundary;
}

function findBoundaryPixel(draw_ctx, startX, startY) {
    const imageData = draw_ctx.getImageData(0, 0, draw_ctx.canvas.width, draw_ctx.canvas.height);
    const startColor = getPixelColor(imageData, startX, startY);
    let boundaryPixel = null;

    for (let x = startX; x < imageData.width; x++) {
        const currentColor = getPixelColor(imageData, x, startY);
        if (currentColor === null || currentColor !== startColor) {
            boundaryPixel = { x: x - 1, y: startY };
            break;
        }
    }

    // If the boundary pixel wasn't found and we reached the edge of the canvas
    if (boundaryPixel === null) {
        boundaryPixel = { x: imageData.width - 1, y: startY };
    }

    return boundaryPixel;
}

function checkIfPointExistsInSet(setOfPoints, targetPoint) {
    for (const point of setOfPoints) {
        if (point.x === targetPoint.x && point.y === targetPoint.y) {
            return true;
        }
    }
    return false;
}