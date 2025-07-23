// Add these variables at the top with other globals
var penPoints = [];
var penSVGGroup = null;
var penPolygon = null;
var penLines = null;
var penCircles = [];
var isDraggingPoint = false;
var draggedPointIndex = -1;
var penPointRadius = 6;


var penBoundingBox = null;
var penTransformHandles = [];
var penRotationHandle = null;
var isTransforming = false;
var transformType = ''; // 'scale-tl', 'scale-tr', 'scale-bl', 'scale-br', 'rotate'
var transformStartPoint = {x: 0, y: 0};
var transformCenter = {x: 0, y: 0};
var originalPenPoints = [];
var currentRotation = 0;
var handleSize = 8;


function initPenMode() {
    // Create SVG group for pen shapes
    if (!penSVGGroup) {
        penSVGGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        penSVGGroup.setAttribute("id", "pen-group");
        svgCanvas.appendChild(penSVGGroup);
    }
}

function clearPenMode() {
    penPoints = [];
    if (penSVGGroup) {
        while (penSVGGroup.firstChild) {
            penSVGGroup.removeChild(penSVGGroup.firstChild);
        }
    }
    penPolygon = null;
    penLines = null;
    penCircles = [];
    isDraggingPoint = false;
    draggedPointIndex = -1;
}

function updatePenDisplay() {
    // Clear existing elements
    while (penSVGGroup.firstChild) {
        penSVGGroup.removeChild(penSVGGroup.firstChild);
    }
    penCircles = [];
    penTransformHandles = [];
    
    if (penPoints.length === 0) return;
    
    const scale = drawCanvas.width / drawCanvas.clientWidth;
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    // Calculate bounding box
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    penPoints.forEach(point => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
    });
    
    // Store transform center
    transformCenter = {
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2
    };
    
    // Create polygon fill (0.5 opacity)
    if (penPoints.length >= 3) {
        penPolygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        const points = penPoints.map(p => 
            `${(p.x/scale)-scrollX},${(p.y/scale)-scrollY}`
        ).join(" ");
        penPolygon.setAttribute("points", points);
        penPolygon.setAttribute("fill", activeColour.colour);
        penPolygon.setAttribute("fill-opacity", "0.5");
        penPolygon.setAttribute("stroke", "none");
        penSVGGroup.appendChild(penPolygon);
    }
    
    // Create lines (opacity 1)
    if (penPoints.length >= 2) {
        penLines = document.createElementNS("http://www.w3.org/2000/svg", "path");
        let pathData = `M ${(penPoints[0].x/scale)-scrollX} ${(penPoints[0].y/scale)-scrollY}`;
        
        for (let i = 1; i < penPoints.length; i++) {
            pathData += ` L ${(penPoints[i].x/scale)-scrollX} ${(penPoints[i].y/scale)-scrollY}`;
        }
        
        pathData += " Z";
        
        penLines.setAttribute("d", pathData);
        penLines.setAttribute("stroke", activeColour.colour);
        penLines.setAttribute("stroke-width", "2");
        penLines.setAttribute("fill", "none");
        penLines.setAttribute("stroke-opacity", "1");
        penLines.style.pointerEvents = "stroke";
        penLines.style.cursor = "crosshair";
        penSVGGroup.appendChild(penLines);
    }
    
    // Create bounding box
    penBoundingBox = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    penBoundingBox.setAttribute("x", (minX/scale) - scrollX);
    penBoundingBox.setAttribute("y", (minY/scale) - scrollY);
    penBoundingBox.setAttribute("width", ((maxX - minX)/scale));
    penBoundingBox.setAttribute("height", ((maxY - minY)/scale));
    penBoundingBox.setAttribute("fill", "none");
    penBoundingBox.setAttribute("stroke", "#ffffff");
    penBoundingBox.setAttribute("stroke-width", "1");
    penBoundingBox.setAttribute("stroke-dasharray", "5,5");
    penSVGGroup.appendChild(penBoundingBox);
    
    // Create corner handles for scaling
    const corners = [
        {id: 'scale-tl', x: minX, y: minY, cursor: 'nw-resize'},
        {id: 'scale-tr', x: maxX, y: minY, cursor: 'ne-resize'},
        {id: 'scale-bl', x: minX, y: maxY, cursor: 'sw-resize'},
        {id: 'scale-br', x: maxX, y: maxY, cursor: 'se-resize'}
    ];
    
    corners.forEach(corner => {
        const handle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        handle.setAttribute("x", (corner.x/scale) - scrollX - handleSize/2);
        handle.setAttribute("y", (corner.y/scale) - scrollY - handleSize/2);
        handle.setAttribute("width", handleSize);
        handle.setAttribute("height", handleSize);
        handle.setAttribute("fill", "#ffffff");
        handle.style.cursor = corner.cursor;
        handle.style.pointerEvents = "all";
        handle.dataset.handleType = corner.id;
        
        handle.addEventListener('mousedown', function(e) {
            if (e.button === 0) {
                e.preventDefault();
                e.stopPropagation();
                startTransform(corner.id, e);
            }
        });
        
        penSVGGroup.appendChild(handle);
        penTransformHandles.push(handle);
    });

    
    // Create rotation handle (at top center)
    const rotateX = (minX + maxX) / 2;
    const rotateY = minY;
    
    // Rotation handle line
    const rotateLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    rotateLine.setAttribute("x1", (rotateX/scale) - scrollX);
    rotateLine.setAttribute("y1", (minY/scale) - scrollY);
    rotateLine.setAttribute("x2", (rotateX/scale) - scrollX);
    rotateLine.setAttribute("y2", (rotateY/scale) - scrollY);
    rotateLine.setAttribute("stroke", "#ffffff7f");
    rotateLine.setAttribute("stroke-width", "1");

    penSVGGroup.appendChild(rotateLine);
    
    // Rotation handle circle
    penRotationHandle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    penRotationHandle.setAttribute("cx", (rotateX/scale) - scrollX);
    penRotationHandle.setAttribute("cy", (rotateY/scale) - scrollY);
    penRotationHandle.setAttribute("r", handleSize/2);
    penRotationHandle.setAttribute("fill", "#ffffff");

    penRotationHandle.style.cursor = "grab";
    penRotationHandle.style.pointerEvents = "fill";

    penRotationHandle.addEventListener('mousedown', function(e) {
        if (e.button === 0) {
            e.preventDefault();
            e.stopPropagation();
            startTransform('rotate', e);
        }
    });
    
    penSVGGroup.appendChild(penRotationHandle);
    
    // Create point handles
    penPoints.forEach((point, index) => {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", (point.x/scale)-scrollX);
        circle.setAttribute("cy", (point.y/scale)-scrollY);
        circle.setAttribute("r", penPointRadius);
        circle.setAttribute("fill", activeColour.colour);
        circle.setAttribute("stroke", "#ffffff");
        circle.setAttribute("stroke-width", "1");
        circle.style.cursor = "move";
        circle.style.pointerEvents = "fill";
        circle.dataset.pointIndex = index;
        
        circle.addEventListener('mousedown', function(e) {
            if (e.button === 0) {
                e.stopPropagation();
                isDraggingPoint = true;
                draggedPointIndex = index;
            }
        });
        
        circle.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            e.stopPropagation();
            penPoints.splice(index, 1);
            updatePenDisplay();
        });
        
        penSVGGroup.appendChild(circle);
        penCircles.push(circle);
    });
}

// Transform functions
function startTransform(type, e) {
    isTransforming = true;
    transformType = type;
    
    const rect = drawCanvas.getBoundingClientRect();
    transformStartPoint = {
        x: (e.clientX - rect.left) * drawCanvas.width / drawCanvas.clientWidth,
        y: (e.clientY - rect.top) * drawCanvas.height / drawCanvas.clientHeight
    };
    
    originalPenPoints = penPoints.map(p => ({...p}));
    
    if (type === 'rotate') {
        penRotationHandle.style.cursor = "grabbing";
    }
}

function performTransform(currentX, currentY) {
    if (transformType.startsWith('scale-')) {
        const corner = transformType.split('-')[1];
        
        // Get original bounding box
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        originalPenPoints.forEach(point => {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        });
        
        const originalWidth = maxX - minX;
        const originalHeight = maxY - minY;
        
        if (originalWidth === 0 || originalHeight === 0) return;
        
        let scaleX = 1, scaleY = 1;
        let anchorX = minX, anchorY = minY;
        
        switch(corner) {
            case 'tl':
                scaleX = (maxX - currentX) / originalWidth;
                scaleY = (maxY - currentY) / originalHeight;
                anchorX = maxX;
                anchorY = maxY;
                break;
            case 'tr':
                scaleX = (currentX - minX) / originalWidth;
                scaleY = (maxY - currentY) / originalHeight;
                anchorX = minX;
                anchorY = maxY;
                break;
            case 'bl':
                scaleX = (maxX - currentX) / originalWidth;
                scaleY = (currentY - minY) / originalHeight;
                anchorX = maxX;
                anchorY = minY;
                break;
            case 'br':
                scaleX = (currentX - minX) / originalWidth;
                scaleY = (currentY - minY) / originalHeight;
                anchorX = minX;
                anchorY = minY;
                break;
        }
        
        // Apply uniform scaling (keep aspect ratio)
        const scale = Math.max(0.1, Math.min(scaleX, scaleY));
        
        // Transform all points
        penPoints = originalPenPoints.map(p => ({
            x: Math.round(anchorX + (p.x - anchorX) * scale),
            y: Math.round(anchorY + (p.y - anchorY) * scale)
        }));
        
    } else if (transformType === 'rotate') {
        // Get current center from original points
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        originalPenPoints.forEach(point => {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        });
        
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        // Calculate rotation angle
        const angle1 = Math.atan2(transformStartPoint.y - centerY, 
                                  transformStartPoint.x - centerX);
        const angle2 = Math.atan2(currentY - centerY, 
                                  currentX - centerX);
        const deltaAngle = angle2 - angle1;
        
        // Rotate all points around center
        const cos = Math.cos(deltaAngle);
        const sin = Math.sin(deltaAngle);
        
        penPoints = originalPenPoints.map(p => {
            const dx = p.x - centerX;
            const dy = p.y - centerY;
            
            return {
                x: Math.round(centerX + dx * cos - dy * sin),
                y: Math.round(centerY + dx * sin + dy * cos)
            };
        });
    }
    
    updatePenDisplay();
}

// function updatePenDisplay() {
//     // Clear existing elements
//     while (penSVGGroup.firstChild) {
//         penSVGGroup.removeChild(penSVGGroup.firstChild);
//     }
//     penCircles = [];
    
//     if (penPoints.length === 0) return;
    
//     const scale = drawCanvas.width / drawCanvas.clientWidth;
//     const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
//     const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
//     // Create polygon fill (0.5 opacity)
//     if (penPoints.length >= 3) {
//         penPolygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
//         const points = penPoints.map(p => 
//             `${(p.x/scale)-scrollX},${(p.y/scale)-scrollY}`
//         ).join(" ");
//         penPolygon.setAttribute("points", points);
//         penPolygon.setAttribute("fill", activeColour.colour);
//         penPolygon.setAttribute("fill-opacity", "0.5");
//         penPolygon.setAttribute("stroke", "none");
//         penSVGGroup.appendChild(penPolygon);
//     }
    
//     // Create lines (opacity 1)
//     if (penPoints.length >= 2) {
//         penLines = document.createElementNS("http://www.w3.org/2000/svg", "path");
//         let pathData = `M ${(penPoints[0].x/scale)-scrollX} ${(penPoints[0].y/scale)-scrollY}`;
        
//         for (let i = 1; i < penPoints.length; i++) {
//             pathData += ` L ${(penPoints[i].x/scale)-scrollX} ${(penPoints[i].y/scale)-scrollY}`;
//         }
        
//         // Close the path
//         pathData += " Z";
        
//         penLines.setAttribute("d", pathData);
//         penLines.setAttribute("stroke", activeColour.colour);
//         penLines.setAttribute("stroke-width", "2");
//         penLines.setAttribute("fill", "none");
//         penLines.setAttribute("stroke-opacity", "1");
//         penLines.style.pointerEvents = "stroke";
//         penLines.style.cursor = "crosshair";
//         penSVGGroup.appendChild(penLines);
//     }
    
//     penPoints.forEach((point, index) => {
//     const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
//     circle.setAttribute("cx", (point.x/scale)-scrollX);
//     circle.setAttribute("cy", (point.y/scale)-scrollY);
//     circle.setAttribute("r", penPointRadius);
//     circle.setAttribute("fill", activeColour.colour);
//     circle.setAttribute("stroke", "#ffffff");
//     circle.setAttribute("stroke-width", "2");
//     circle.style.cursor = "move";
//     circle.style.pointerEvents = "fill";
//     circle.dataset.pointIndex = index;
    
//     // Add direct event handlers to circles
//     circle.addEventListener('mousedown', function(e) {
//         if (e.button === 0) {
//             e.stopPropagation();
//             isDraggingPoint = true;
//             draggedPointIndex = index;
//         }
//     });
    
//     circle.addEventListener('contextmenu', function(e) {
//         e.preventDefault();
//         e.stopPropagation();
//         penPoints.splice(index, 1);
//         updatePenDisplay();
//     });
    
//     penSVGGroup.appendChild(circle);
//     penCircles.push(circle);
// });


// }




// Helper functions
function getPointAtPosition(x, y) {
    const scale = drawCanvas.width / drawCanvas.clientWidth;
    const threshold = penPointRadius * scale * 2;
    
    for (let i = 0; i < penPoints.length; i++) {
        const dx = penPoints[i].x - x;
        const dy = penPoints[i].y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= threshold) {
            return i;
        }
    }
    return -1;
}

function getLineInsertIndex(x, y) {
    if (penPoints.length < 2) return -1;
    
    const scale = drawCanvas.width / drawCanvas.clientWidth;
    const threshold = 10 * scale; // Distance threshold for line clicking
    
    let minDistance = Infinity;
    let insertIndex = -1;
    
    for (let i = 0; i < penPoints.length; i++) {
        const p1 = penPoints[i];
        const p2 = penPoints[(i + 1) % penPoints.length];
        
        const distance = pointToLineDistance(x, y, p1.x, p1.y, p2.x, p2.y);
        
        if (distance < threshold && distance < minDistance) {
            minDistance = distance;
            insertIndex = i + 1;
        }
    }
    
    return insertIndex;
}

function pointToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) {
        param = dot / lenSq;
    }
    
    let xx, yy;
    
    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
}

function rasterizePenShape() {
    if (penPoints.length < 3) return;
    
    // Save state for undo first
    saveState();
    
    // Create an offscreen canvas
    const offCanvas = document.createElement('canvas');
    offCanvas.width = drawCanvas.width;
    offCanvas.height = drawCanvas.height;
    const offCtx = offCanvas.getContext('2d');
    
    // Disable image smoothing
    offCtx.imageSmoothingEnabled = false;
    
    // Draw the polygon
    offCtx.fillStyle = activeColour.colour;
    offCtx.beginPath();
    offCtx.moveTo(penPoints[0].x, penPoints[0].y);
    
    for (let i = 1; i < penPoints.length; i++) {
        offCtx.lineTo(penPoints[i].x, penPoints[i].y);
    }
    
    offCtx.closePath();
    offCtx.fill();
    
    // Get the image data
    const imageData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
    const data = imageData.data;
    
    // Convert active color to RGB
    let col = activeColour.colour.startsWith("#") ? activeColour.colour.slice(1) : activeColour.colour;
    col = parseInt(col, 16);
    const r = (col >> 16) & 0xFF;
    const g = (col >> 8) & 0xFF;
    const b = col & 0xFF;
    
    // Process pixels: convert any partially filled pixels to fully filled
    for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        
        if (alpha > 0) { // If pixel has any opacity
            // Set to exact color with full opacity
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
            data[i + 3] = 255;
        }
    }
    
    // Put the processed image data back
    offCtx.putImageData(imageData, 0, 0);
    
    // Copy to main canvas
    drawCtx.imageSmoothingEnabled = false;
    drawCtx.drawImage(offCanvas, 0, 0);
}

