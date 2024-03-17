const Tools = {
    pencil: "pencil",
    fill: "fill"
};

var selectedTool = Tools.pencil;

function selectPencil(button) {
    selectedTool = Tools.pencil;
    updateButtonStyles(button);
}

function selectFill(button) {
    selectedTool = Tools.fill;
    updateButtonStyles(button);
}

function updateButtonStyles(selectedButton) {
    // Get all buttons with the 'tool' class and remove 'selected-tool' from each
    document.querySelectorAll('.tool').forEach(button => {
        button.classList.remove('selected-tool');
    });

    // Add the 'selected-tool' class to the selected button
    selectedButton.classList.add('selected-tool');
}

var array2dToKeepTrackOfPixelsToFill = null

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

function goOutFromDrawPointsToFill(drawPoints, draw_ctx) {
    array2dToKeepTrackOfPixelsToFill = create2DArray(draw_canvas.height, draw_canvas.width, 0);

    drawPoints.forEach(point => {
        if (array2dToKeepTrackOfPixelsToFill[point.x][point.y] == 0) {
            findSector(draw_ctx, point.x, point.y)
        }
    }); 

    return findCoordinatesWithValueOne(array2dToKeepTrackOfPixelsToFill)
}

function findSector(draw_ctx, startX, startY) {
    const imageData = draw_ctx.getImageData(0, 0, draw_ctx.canvas.width, draw_ctx.canvas.height);
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const startColor = draw_ctx.getImageData(startX, startY, 1, 1).data;

    // Skip if its an edge.
    if (startColor[0] == 0 && startColor[1] == 0 && startColor[2] == 0 && startColor[3] == 0) {
        return;
    }

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
        array2dToKeepTrackOfPixelsToFill[x][y] = 1;

        // Add valid neighbors
        if (x + 1 < width && !visited[idx + 1]) stack.push({ x: x + 1, y });
        if (x > 0 && !visited[idx - 1]) stack.push({ x: x - 1, y });
        if (y + 1 < height && !visited[idx + width]) stack.push({ x, y: y + 1 });
        if (y > 0 && !visited[idx - width]) stack.push({ x, y: y - 1 });
    }

    return array2dToKeepTrackOfPixelsToFill;
}