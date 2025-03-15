// Global variables to track selection
let selectedMask = null;

function createColorMask(targetColor) {
    const width = drawCanvas.width;
    const height = drawCanvas.height;
    const mask = new Uint8Array(width * height);
    
    // Get image data once for efficiency
    const imageData = drawCtx.getImageData(0, 0, width, height);
    const buffer32 = new Uint32Array(imageData.data.buffer);
    
    // Convert target color to ABGR format for comparison
    let colorValue = targetColor.startsWith("#") ? targetColor.slice(1) : targetColor;
    colorValue = parseInt(colorValue, 16);
    let red = (colorValue >> 16) & 0xFF;
    let green = (colorValue >> 8) & 0xFF;
    let blue = (colorValue >> 0) & 0xFF;
    colorValue = (0xFF << 24) | (blue << 16) | (green << 8) | (red << 0);
    colorValue >>>= 0;
    
    // Mark matching pixels
    for (let i = 0; i < buffer32.length; i++) {
        if (buffer32[i] === colorValue) {
            mask[i] = 1;
        }
    }
    
    return mask;
}

function outlineSelectedComponents(mask, downscaleFactor = 4) {
    // Clear previous outlines
    const svgGroup = document.getElementById('svg-scale-group');
    while (svgGroup.firstChild) {
        svgGroup.removeChild(svgGroup.firstChild);
    }
    
    const width = drawCanvas.width;
    const height = drawCanvas.height;
    
    // Find and outline each connected component in the mask
    const visited = new Uint8Array(mask.length);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            if (mask[idx] === 1 && visited[idx] === 0) {
                // Found a new component - create a mask for it
                const componentMask = new Uint8Array(mask.length);
                const stack = [{x, y}];
                
                while (stack.length > 0) {
                    const {x: cx, y: cy} = stack.pop();
                    const cidx = cy * width + cx;
                    
                    if (cx < 0 || cx >= width || cy < 0 || cy >= height || 
                        visited[cidx] === 1 || mask[cidx] === 0) {
                        continue;
                    }
                    
                    // Mark as visited and part of this component
                    visited[cidx] = 1;
                    componentMask[cidx] = 1;
                    
                    // Check 4-connected neighbors
                    stack.push({x: cx+1, y: cy});
                    stack.push({x: cx-1, y: cy});
                    stack.push({x: cx, y: cy+1});
                    stack.push({x: cx, y: cy-1});
                }
                
                // Now outline this component
                // Find boundary pixels of the component
                let points = [];
                for (let py = 0; py < height; py += downscaleFactor) {
                    for (let px = 0; px < width; px += downscaleFactor) {
                        const pidx = py * width + px;
                        if (componentMask[pidx] === 1) {
                            // Check if this is an edge pixel
                            const isEdge = 
                                (px === 0 || componentMask[pidx - 1] === 0) ||
                                (px >= width-1 || componentMask[pidx + 1] === 0) ||
                                (py === 0 || componentMask[pidx - width] === 0) ||
                                (py >= height-1 || componentMask[pidx + width] === 0);
                            
                            if (isEdge) {
                                points.push({x: px, y: py});
                            }
                        }
                    }
                }
                
                // Create SVG path for the outline if we have points
                if (points.length > 0) {
                    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    
                    // Style with dashed line for "marching ants" effect
                    path.setAttribute("stroke", "white");
                    path.setAttribute("stroke-width", "2");
                    path.setAttribute("fill", "none");
                    path.setAttribute("stroke-dasharray", "4,4");
                    path.setAttribute("stroke-linecap", "round");
                    path.setAttribute("class", "selection-outline");
                    
                    // Build the path data
                    let pathData = `M ${points[0].x} ${points[0].y}`;
                    for (let i = 1; i < points.length; i++) {
                        pathData += ` L ${points[i].x} ${points[i].y}`;
                    }
                    
                    path.setAttribute("d", pathData);
                    
                    // Create animation for marching effect
                    const animate = document.createElementNS("http://www.w3.org/2000/svg", "animate");
                    animate.setAttribute("attributeName", "stroke-dashoffset");
                    animate.setAttribute("from", "0");
                    animate.setAttribute("to", "8");
                    animate.setAttribute("dur", "1s");
                    animate.setAttribute("repeatCount", "indefinite");
                    path.appendChild(animate);
                    
                    // Add the black outline behind for contrast
                    const shadowPath = path.cloneNode(true);
                    shadowPath.setAttribute("stroke", "black");
                    shadowPath.setAttribute("stroke-width", "3");
                    shadowPath.querySelector("animate").setAttribute("to", "-8"); // Reverse direction
                    
                    svgGroup.appendChild(shadowPath);
                    svgGroup.appendChild(path);
                }
            }
        }
    }
    
    return mask;
}



function applyActiveColourToSelection() {
    if (!selectedMask) return;
    
    const width = drawCanvas.width;
    const height = drawCanvas.height;
    
    // Save for undo
    saveState();
    
    // Get current canvas data
    const imageData = drawCtx.getImageData(0, 0, width, height);
    
    let col = activeColour.colour.startsWith("#") ? activeColour.colour.slice(1) : activeColour.colour;
    col = parseInt(col, 16);
    let red = (col >> 16) & 0xFF;
    let green = (col >> 8) & 0xFF;
    let blue = (col >> 0) & 0xFF;
    // col = (0xFF << 24) | (blue << 16) | (green << 8) | (red << 0);
    // col >>>= 0;

    // Parse the new color
    // let newColorValue = newColor.startsWith("#") ? newColor.slice(1) : newColor;
    // newColorValue = parseInt(newColorValue, 16);
    // const newRed = (newColorValue >> 16) & 0xFF;
    // const newGreen = (newColorValue >> 8) & 0xFF;
    // const newBlue = newColorValue & 0xFF;
    
    // Replace colors in the selected areas
    for (let i = 0; i < width * height; i++) {
        if (selectedMask[i] === 1) {
            const idx = i * 4;
            imageData.data[idx] = red;
            imageData.data[idx + 1] = green;
            imageData.data[idx + 2] = blue;
            // Alpha remains unchanged
        }
    }
    
    // Apply changes
    drawCtx.putImageData(imageData, 0, 0);
    
    // Clear selection
    clearSelection();
}

function clearSelection() {
    selectedMask = null;
    const svgGroup = document.getElementById('svg-scale-group');
    while (svgGroup.firstChild) {
        svgGroup.removeChild(svgGroup.firstChild);
    }
}