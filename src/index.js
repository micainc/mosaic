var originX = 0;
var originY = 0;
let scale = 1;
let isGesturing = false;

var offsetX = 0;
var offsetY = 0;
var scrollX = 0;
var scrollY = 0;
var mouseX = 0;
var mouseY = 0;
var leftClicked = false;
var rightClicked = false;
var drawDiameter = 10; // diameter
var drawPath = []
var loadouts = {}

const drawCanvas = document.getElementById('draw-canvas')

drawCanvas.width = window.innerWidth;
drawCanvas.height = window.innerHeight;

var drawCtx = drawCanvas.getContext('2d');

const svgCanvas = document.getElementById('svg-canvas')

const svgScaleGroup = document.getElementById('svg-scale-group');
let svgPath = null;

var cursor = document.getElementById('cursor');
cursor.style.width = drawDiameter+"px";
cursor.style.height = drawDiameter+"px";

var activeColour = {'colour': "#000000", 'label': ""}
var hoveredColour = "#000000"
var floodStack = []
var undoHistory = [];
const origin = { x: 0, y: 0 };

var IMAGE_LAYERS = {} 
var ACTIVE_IMAGE_LAYER = '';
const MAX_HISTORY_SIZE = 10;
var INTERACTION_MODE = "draw";

function setMode(newMode, button) {

    if (INTERACTION_MODE === "pen" && newMode !== "pen") {
        clearPenMode();
    }
    INTERACTION_MODE = newMode;

    // Initialize pen mode
    if (newMode === "pen") {
        initPenMode();
    }

    // Get all buttons with the 'tool' class and remove 'selected-tool' from each
    document.querySelectorAll('.tool').forEach(button => {
        button.classList.remove('selected-tool');
    });

    // Add the 'selected-tool' class to the selected button
    button.classList.add('selected-tool');
    clearHighlights();
}



// Add this function to clean up when image URLS
function revokeImageUrls() {
    Object.values(IMAGE_LAYERS).forEach(img => {
        URL.revokeObjectURL(img.src);
    });
}


function init() {

    document.getElementById('cursor-size-slider').addEventListener('input', function(e) {
        //console.log("sliding: ", e.target.value)
        drawDiameter = Number(e.target.value);
        cursor.style.width = drawDiameter+"px";
        cursor.style.height = drawDiameter+"px";
    })
    
    document.getElementById('cursor-size-slider').addEventListener('input', function(e) {
        //console.log("sliding: ", e.target.value)
        drawDiameter = Number(e.target.value);
        cursor.style.width = drawDiameter+"px";
        cursor.style.height = drawDiameter+"px";
    })

    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);

    drawCanvas.addEventListener('mousedown', function(e) {
        $('#cursor-text').css("display", "none")
        saveState(); // should move this: save state after 'mouseup' and save initial draw state once on load

        const rect = drawCanvas.getBoundingClientRect();
        const x = Math.round((e.clientX - rect.left) * drawCanvas.width / drawCanvas.clientWidth);
        const y = Math.round((e.clientY - rect.top) * drawCanvas.height / drawCanvas.clientHeight);
        
        
        if (e.button === 0) { 
            leftClicked = true;

            // push starting point of draw path
            console.log("ADDING TO DRAW PATH...")
            drawPath.push({x: mouseX, y: mouseY});

            if(INTERACTION_MODE === 'draw') {

                scrollX = document.documentElement.scrollLeft;
                scrollY = document.documentElement.scrollTop;
                // console.log("SCROLL X: ", scrollX)
                // console.log("SCROLL Y: ", scrollY)

                // Create new SVG PREVIEW path
                svgPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
                svgPath.setAttribute("stroke", activeColour.colour);
                svgPath.setAttribute("stroke-width", drawDiameter);
                svgPath.setAttribute("fill", "none");
                svgPath.setAttribute("stroke-linecap", "round");
                svgPath.setAttribute("stroke-linejoin", "round");

                // Scale coordinates to match canvas
                const scale = drawCanvas.width / drawCanvas.clientWidth;
                const d = `M ${(mouseX/scale)-scrollX} ${(mouseY/scale)-scrollY}`;
                svgPath.setAttribute("d", d);
                
                svgScaleGroup.appendChild(svgPath);

            } else if(INTERACTION_MODE === 'select') {
                // Get color at click point
                const imageData = drawCtx.getImageData(mouseX, mouseY, 1, 1);
                const pixel = imageData.data;

                const selectedColour = rgbToHex(pixel[0], pixel[1], pixel[2]);
                
                // Create selection mask and SVG outline
                highlightedMask = createHighlightMask(selectedColour);
                // oulineHighlightedComponents(highlightedMask);
                var label = colourLabelMap[selectedColour] + " selected ."

                drawColors.find((h, idx) => {
                    if(h === selectedColour) {
                        $('#toolbar-note').text(label);
                    }
                })
                

            } else if (INTERACTION_MODE === 'pen') {
                e.preventDefault();
                $('#cursor-text').css("display", "none");
                


                // Check if clicking on existing point
                const clickedPointIndex = getPointAtPosition(x, y);
                
                if (clickedPointIndex !== -1) {
                    // Start dragging
                    isDraggingPoint = true;
                    draggedPointIndex = clickedPointIndex;
                } else {
                    // Check if clicking on a line
                    const insertIndex = getLineInsertIndex(x, y);
                    
                    if (insertIndex !== -1) {
                        // Insert point between two existing points
                        penPoints.splice(insertIndex, 0, { x, y });
                    } else {
                        // Add new point
                        penPoints.push({ x, y });
                    }
                    updatePenDisplay();
                }
            }

        } else if (e.button === 2 && !leftClicked) {
            if (INTERACTION_MODE === 'pen') {

                const clickedPointIndex = getPointAtPosition(x, y);
                if (clickedPointIndex !== -1) {
                    penPoints.splice(clickedPointIndex, 1);
                    updatePenDisplay();
                }

            }

            rightClicked = true;
            
        }
    });
    









    drawCanvas.addEventListener('mouseup', function(e) {

        if (INTERACTION_MODE === 'pen' && !isDraggingPoint) {
            // This will only handle non-dragging pen mode actions
            return;
        }

        // doesn't matter what the draw path looks like, a drawn pixel will be without the boundaries returned by this function
        if(leftClicked) {
            switch (INTERACTION_MODE) {
                case "fill":
                    // if user was in fill mode and drew a line, we need to check all points on that line for loops to fill
                    console.log("FILLING")
                    drawPath.forEach(point => {
                        flood(point.x, point.y, 'replace') // replace 
                    })
                    break;
                case "draw":

                    // Remove the preview path
                    if (svgPath) {                    
                        const pathData = svgPath.getAttribute("d");
                        svgScaleGroup.removeChild(svgPath);
                        svgPath = null;

                        if (pathData) {
                            drawSVGPathToCanvas(pathData);
                        }
                    }
                    break;
                case "pen":
                    isDraggingPoint = false;
                    draggedPointIndex = -1;
                    return;

                default:
                    console.log('No tool was selected.');
            }

            drawPath = []
        }
        leftClicked = false;
        rightClicked =false;
        

    })


    window.addEventListener('mouseup', function(e) {
        if (INTERACTION_MODE === 'pen') {
            if (isDraggingPoint) {
                isDraggingPoint = false;
                draggedPointIndex = -1;
            }
            
            if (isTransforming) {
                isTransforming = false;
                transformType = '';
                
                // Reset cursor
                if (penRotationHandle) {
                    penRotationHandle.style.cursor = "grab";
                }
                
                // Update original points to current state
                originalPenPoints = penPoints.map(p => ({...p}));
            }
        }
    });


    function drawSVGPathToCanvas(pathData) {
        const scale = drawCanvas.width / drawCanvas.clientWidth;
        const radius = Math.max(1, Math.floor((drawDiameter * scale) / 2));
        
        // Parse the SVG path and convert to points
        const points = parseSVGPathToPoints(pathData, scale);
        
        // Draw hard-edged circles
        drawCtx.fillStyle = activeColour.colour;
        
        for (let i = 0; i < points.length - 1; i++) {
            // Fill gaps between points
            const dx = points[i + 1].x - points[i].x;
            const dy = points[i + 1].y - points[i].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const steps = Math.ceil(distance / (radius * 0.5));
            
            for (let step = 0; step <= steps; step++) {
                const t = step / steps;
                const x = Math.round(points[i].x + dx * t);
                const y = Math.round(points[i].y + dy * t);
                
                drawCircle(drawCtx, x, y, radius);
            }
        }
        
        // Handle single click
        if(drawPath.length === 1) {
            if(flood(mouseX, mouseY)) {
                flood(mouseX, mouseY, 'infill');
            }
            drawCircle(drawCtx, mouseX, mouseY, radius);
        }
    }

    function parseSVGPathToPoints(pathData, scale) {
        const points = [];
        const commands = pathData.match(/[MLZ]\s*[\d\s,.-]+/g);
        
        if (!commands) return points;
        
        let currentX = 0, currentY = 0;
        
        commands.forEach(cmd => {
            const type = cmd[0];
            const coords = cmd.slice(1).trim().split(/[\s,]+/).map(Number);
            
            if (type === 'M' && coords.length >= 2) {
                currentX = (coords[0] + scrollX) * scale;
                currentY = (coords[1] + scrollY) * scale;
                points.push({ x: Math.round(currentX), y: Math.round(currentY) });
            } else if (type === 'L' && coords.length >= 2) {
                currentX = (coords[0] + scrollX) * scale;
                currentY = (coords[1] + scrollY) * scale;
                points.push({ x: Math.round(currentX), y: Math.round(currentY) });
            }
        });
        
        return points;
    }



    drawCanvas.addEventListener("mouseleave", function(e) {
        document.getElementById('cursor').style.display = "none";
        switch (INTERACTION_MODE) {
            case "draw":
                if(leftClicked) {
                    // Remove the preview path
                    if (svgPath) {
                        svgScaleGroup.removeChild(svgPath);
                        svgPath = null;
                    }

                    drawPath.push({x: mouseX, y: mouseY}); // finish drawPath
                    drawPath = solidifyPath(drawPath); // algorithmically fills gaps in the draw path to create a solid continuous line 
                    drawCtx.fillStyle = activeColour.colour;
                    drawPath.forEach(point => { drawCircle(drawCtx, point.x, point.y, Math.floor((drawDiameter*(drawCanvas.width / drawCanvas.clientWidth))/2)-1) });
                }
                break;
            case "fill":
                drawPath.forEach(point => {
                    flood(point.x, point.y, 'replace')
                })
                break;
            default:
                break;
        }
        drawPath = []
        leftClicked = false;
        rightClicked = false;
    })



    
    // For trackpad scrolling 
    drawCanvas.addEventListener('wheel', function(e) {
        // console.log('wheel event:', e);
        if (e.ctrlKey || e.metaKey) {
            // Pinch zoom gesture
            e.preventDefault();
            const delta = e.deltaY;
            const scaleChange = 1 + (delta * -0.01); // Adjust the multiplier to tune sensitivity
            
            scale *= scaleChange;
            scale = Math.min(Math.max(1, scale), 20);
            zoomAround(scale, e.clientX, e.clientY);

            // zoomAround(scale);
        } else if (!isGesturing) {
            // Regular scrolling
            window.scrollBy({
                left: e.deltaX,
                top: e.deltaY,
                behavior: 'auto'
            });

        }
    }, { passive: false });



        // For Mac trackpad gestures
    drawCanvas.addEventListener('gesturestart', function(e) {
        console.log('gesture start:', e);
        e.preventDefault();
        isGesturing = true;
    });

    drawCanvas.addEventListener('gesturechange', function(e) {
        console.log('gesture change:', e);
        e.preventDefault();
        if (isGesturing) {
            scale *= e.scale;
            scale = Math.min(Math.max(0.5, scale), 16);
            // zoomAround(scale, e.clientX, e.clientY);
            zoomAround(scale, mouseX, mouseY);

        }
    });

    drawCanvas.addEventListener('gestureend', function(e) {
        console.log('gesture end:', e);
        e.preventDefault();
        isGesturing = false;
    });

    function zoomAround(scale, cursorX, cursorY) {
        // Get current scroll position
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Calculate cursor position relative to the document (not just the viewport)
        const cursorDocX = cursorX + scrollLeft;
        const cursorDocY = cursorY + scrollTop;
        
        // Get current dimensions and apply new scale
        const beforeWidth = $(".mosaic-canvas").width();
        $(".mosaic-canvas").css("width", Math.max(100, (100 * scale)) + "%");
        
        const afterWidth = $(".mosaic-canvas").width();
        
        // Calculate scaling factor
        const scaleFactor = afterWidth / beforeWidth;
        
        // Calculate new position of the cursor point after scaling
        const newCursorDocX = cursorDocX * scaleFactor;
        const newCursorDocY = cursorDocY * scaleFactor;
        
        // Calculate how far we need to scroll to keep the cursor over the same point
        const newScrollLeft = newCursorDocX - cursorX;
        const newScrollTop = newCursorDocY - cursorY;
        
        // Apply the new scroll position
        window.scrollTo({
            left: newScrollLeft,
            top: newScrollTop,
            behavior: 'auto'
        });

    }


    drawCanvas.addEventListener("mouseenter", function(e) {
        document.getElementById('cursor').style.display = "block";
    })

    document.getElementById('cursor-size-slider').addEventListener('mouseenter', function(e) {
        document.getElementById('cursor').style.display = "block";
    })

    document.getElementById('cursor-size-slider').addEventListener('mouseleave', function(e) {
        document.getElementById('cursor').style.display = "none";
    })

    drawCanvas.addEventListener("dragenter", catchDrag);
    drawCanvas.addEventListener("dragover", catchDrag);
    drawCanvas.addEventListener("drop", dropFiles);

    document.addEventListener('keydown', function(event) {
        // console.log("KEY: ", event.key)

        if (event.code === 'Space') {
            event.preventDefault()
            drawCanvas.style.opacity = '0';
        }

        // s for 'see segmentation'
        if (event.key === 's') {
            event.preventDefault()
            drawCanvas.style.opacity = '1';
        }

        // ctrl z: undo
        if (event.ctrlKey && event.key === 'z') {
            undo();
        } 

        var searchBox = document.getElementsByClassName('search-box')[0]
        console.log(searchBox.style.display)
        if (searchBox.style.display !== 'block') {
            if (event.key === 'ArrowRight' || event.key === 'd') {
                setActiveImageLayer(1);
            }

            if (event.key === 'ArrowLeft' || event.key === 'a') {
                setActiveImageLayer(-1);
            }
        } else {
            if(event.key === 'Escape') {
                //blur searchbox
                searchBox.blur()


            }
        }

        if (INTERACTION_MODE === 'pen') {
            if (event.key === 'Enter') {
                event.preventDefault();
                rasterizePenShape();
            } else if (event.key === 'Escape') {
                event.preventDefault();
                clearPenMode();
            } else if (event.key === 'Delete' || event.key === 'Backspace')  {
                event.preventDefault();
                erasePenShape();
            } else if (event.key === 'c')  {
                cropPenShape();
            }
        }

    });
    // Event listener for keyup
    document.addEventListener('keyup', function(event) {
        event.preventDefault()

        if (event.code === 'Space' || event.key === 's') {
            drawCanvas.style.opacity = '0.5';
        } 
    });

    initTooltip();

    function updateCursor(event) {
        const rect = drawCanvas.getBoundingClientRect();
        
        if(event.type === 'scroll') {
            // console.log(event)

            scrollX = document.documentElement.scrollLeft || document.body.scrollLeft;
            scrollY = document.documentElement.scrollTop || document.body.scrollTop;
            // console.log("SCROLL X/Y: ", scrollX+ ", " +scrollY)
            cursor.style.transform = `translate(${offsetX+scrollX - drawDiameter/2}px, ${offsetY+scrollY - drawDiameter/2}px)`;

        } else {
            offsetX = event.clientX;
            offsetY = event.clientY;
            //console.log("OFFSET X/Y: ", offsetX+ ", " +offsetY)
            // Calculate the adjusted mouseX and mouseY with respect to the canvas's position and scale.
            mouseX = Math.round((event.clientX - rect.left) * drawCanvas.width / drawCanvas.clientWidth);
            mouseY = Math.round((event.clientY - rect.top) * drawCanvas.height / drawCanvas.clientHeight);
            cursor.style.transform = `translate(${event.clientX + scrollX - drawDiameter/2}px, ${event.clientY + scrollY - drawDiameter/2}px)`;

        }

        // // Update coordinates text.
        // $('#coords').text(mouseX + ", " + mouseY);
        // $('#ecoords').text(event.clientX + ", " + event.clientY);

        // Function to compare the current point with the last point
        function isDistinct(p1, p0) {
            let dx = p1.x - p0.x
            let dy = p1.y - p0.y
            return Math.sqrt(dx * dx + dy * dy) > drawDiameter;
        }
    
        // If the mouse is being pressed, check if the last point is different from the current point before pushing
        if(leftClicked && isDistinct({x: mouseX, y: mouseY}, drawPath[drawPath.length - 1])) {
            drawPath.push({x: mouseX, y: mouseY});
        }

        // get colour of drawCanvas at mouse position
        var imageData = drawCtx.getImageData(mouseX, mouseY, 1, 1);
        var pixel = imageData.data;
        var inverted = rgbToHex(255-pixel[0], 255-pixel[1], 255-pixel[2])
        var pixelHex = rgbToHex(pixel[0], pixel[1], pixel[2]); // get colour as hex string

        if(activeColour.colour === pixelHex) {
            // invert the colour of the cursor itself
            $('#cursor').css("border-color", inverted)
        } else {
            $('#cursor').css("border-color", activeColour.colour)

        }
        

        var pixelHex = rgbToHex(pixel[0], pixel[1], pixel[2]);

        // if we have traversed onto a NEW COLOUR on the segmentation map:
        if(leftClicked) {
            $('#cursor-text').css("display", "none")
        } else if(hoveredColour !== pixelHex) {
            // if(pixelHex === "#000000" || pixelHex === "#7F7F7F") {

            if(pixelHex === "#000000") {
                $('#cursor-text').css("display", "none")
            } else if(activeColour.colour !== pixelHex) {
                var label = colourLabelMap[pixelHex]
                
                drawColors.find((h, idx) => {
                    if(h === pixelHex) {
                        $('#cursor-text').css("display", "block")
                        $('#cursor-text').css("color", inverted)
                        $('#cursor-text').text(label);
                    }
                })
    
            } else if(activeColour.colour === pixelHex){
                $('#cursor-text').css("display", "none")
            }
            hoveredColour = pixelHex
        }
        // let posX = mouseX / drawCanvas.width;
        // let posY = mouseY / drawCanvas.height;
        // console.log("UPDATED CURSOR POS: " + Math.round(1000*posX)/10 + ", " + Math.round(1000*posY)/10)
    }
    
    window.addEventListener('mousemove', function(e) {
        if (INTERACTION_MODE === 'pen') {
            const rect = drawCanvas.getBoundingClientRect();
            const x = Math.round((e.clientX - rect.left) * drawCanvas.width / drawCanvas.clientWidth);
            const y = Math.round((e.clientY - rect.top) * drawCanvas.height / drawCanvas.clientHeight);
            
            if (isDraggingPoint && draggedPointIndex !== -1) {
                penPoints[draggedPointIndex] = { x, y };
                updatePenDisplay();
            } else if (isTransforming) {
                performTransform(x, y);
            }
        }
        
        updateCursor(e);
    });
    
    window.addEventListener('scroll', (event) => {
        if (INTERACTION_MODE === 'pen') {
            updatePenDisplay();
        }

        leftClicked = false;
        rightClicked =false;
        updateCursor(event);
    });

    // get & populate with first loadout
    window.api.invoke('get_loadouts')
    .then(function(loadouts) {
        initLoadouts(loadouts)

    }).catch(function(err) {
        console.error("ERROR: ", err); // will print "This didn't work!" to the browser console.
    });

    window.addEventListener('unload', function() {
        revokeImageUrls();
    });
    
    window.requestAnimationFrame(draw); // start animating cursor movements
}

function solidifyPath(path) {
    drawCtx.fillStyle = activeColour.colour;
    drawCtx.imageSmoothingEnabled = false; // Disable anti-aliasing to draw sharp circles

    // Calculate line width based on draw size and scaling factor, ensure it's not anti-aliased
    const lineWidth = Math.ceil(drawDiameter * (drawCanvas.width / drawCanvas.clientWidth));

    let points = []; // Initialize an array to store points where circles are drawn

    for(var i = 0; i < path.length - 1; i++) {

        points.push({x: path[i]['x'], y: path[i]['y']})

        // get distance between points
        const dx = path[i + 1]['x'] - path[i]['x'];
        const dy = path[i + 1]['y'] - path[i]['y'];
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < drawDiameter/2){
            continue;
        } 
        // if distance between points is greater than 'drawDiameter/2': draw intermediate.
        const steps = Math.max(Math.abs(dx), Math.abs(dy))/(drawDiameter/2) // The number of steps needed. 
        // Increment size for x and y over the steps
        const xInc = dx / steps;
        const yInc = dy / steps;

        // Draw the circles and record points
        for (let step = 0; step <= steps; step++) {
            // Calculate next point
            const x = path[i]['x'] + xInc * step;
            const y = path[i]['y'] + yInc * step;

            // Round these to ensure drawing at exact pixel coordinates
            const roundedX = Math.round(x);
            const roundedY = Math.round(y);

            // Draw the circle at this point
            drawCircle(drawCtx, roundedX, roundedY, lineWidth / 2);

            // Record the point in the array
            points.push({ x: roundedX, y: roundedY });
        }
    }
    points.push({x: path[path.length - 1]['x'], y: path[path.length - 1]['y']})

    // Return the array of points that were filled
    return points;
}

//batched implementation
function drawCircle(ctx, cx, cy, r) {
    r |= 0;
    if (r <= 0) return;

    ctx.beginPath(); // Start a single path for all rectangles
    
    let x = r;
    let y = 0;
    let err = 0;
    
    while (x >= y) {
        // Batch rectangle operations into a single path
        ctx.rect(cx - x - 1, cy + y - 1, x * 2 + 2, 2);
        ctx.rect(cx - x - 1, cy - y - 1, x * 2 + 2, 2);
        
        if (y > 0) {
            ctx.rect(cx - y - 1, cy + x - 1, y * 2 + 2, 2);
            ctx.rect(cx - y - 1, cy - x - 1, y * 2 + 2, 2);
        }
        
        y++;
        err += 2 * y + 1;
        
        if (err > x) {
            x--;
            err -= 2 * x + 1;
        }
    }
    
    ctx.fill(); // Single fill operation for all rectangles
}


function getBoundingBox(path) {
    var drawRadius = Math.ceil(drawDiameter / 2);
    var top = Infinity;
    var bottom = -Infinity;
    var left = Infinity;
    var right = -Infinity;

    for (var i = 0; i < path.length; i++) {
        var px = path[i]['x'];
        var py = path[i]['y'];

        top = Math.min(top, py - drawRadius);
        bottom = Math.max(bottom, py + drawRadius);
        left = Math.min(left, px - drawRadius);
        right = Math.max(right, px + drawRadius);
    }

    return {
        'top': Math.max(top, 0),
        'left': Math.max(left, 0),
        'right': Math.min(right, drawCanvas.width - 1),
        'bottom': Math.min(bottom, drawCanvas.height - 1)
    };
}

// modes: null, 'infill', 'replace'
// null: check from starting point x1, y1 if we started in a closed loop
// 'infill': fill pixels that are non active colour
// 'replace': fill pixels that are non-transparent
function flood(x1, y1, mode=null) {
    const width = drawCanvas.width;
    const height = drawCanvas.height;
    
    // Create bit array (1 bit per pixel instead of 8 bits)
    const bitArraySize = Math.ceil((width * height) / 32); // 32 bits per element
    const visited = new Uint32Array(bitArraySize);
    
    // Bit operations helper functions (inline for performance)
    const floodStack = [{ x: x1, y: y1 }];
    let isClosedShape = true;

    // Get image data
    const imageData = drawCtx.getImageData(0, 0, width, height);
    const buffer32 = new Uint32Array(imageData.data.buffer);
    
    // Get starting pixel value for 'replace' mode
    const startIndex = y1 * width + x1;
    const startPixelValue = buffer32[startIndex];
    console.log("FLOOD MODE: ", mode)

    // Check if starting pixel is transparent for 'replace' mode
    // if (mode === 'replace' && (startPixelValue >> 24) & 0xFF === 0) {
    //     console.log("STARTING PIXEL WAS TRANSP 1")
    //     return false;
    // }

    // Color conversion for active color
    let col = activeColour.colour.startsWith("#") ? activeColour.colour.slice(1) : activeColour.colour;
    col = parseInt(col, 16);
    let red = (col >> 16) & 0xFF;
    let green = (col >> 8) & 0xFF;
    let blue = (col >> 0) & 0xFF;
    col = (0xFF << 24) | (blue << 16) | (green << 8) | (red << 0);
    col >>>= 0;

    // For 'replace' mode: bail if starting pixel is already the active color, or if starting pixel is transparent for 'replace' mode
    // if (mode === 'replace' && (startPixelValue === col || (startPixelValue >> 24) & 0xFF === 0)) {
    if (mode === 'replace' && (startPixelValue === col || (startPixelValue >> 24) === 0)) {
        console.log("STARTING PIXEL WAS TRANSP 2: startPixelValue")
        return false;
    }

    console.log(`STARTING PIXEL: ${x1}, ${y1}: ${startPixelValue >> 24}`)

    if(mode !== null) {
        drawCtx.fillStyle = activeColour.colour;
    }

    while (floodStack.length > 0) {
        const p = floodStack.pop();
        const { x, y } = p;
        
        if (x < 0 || x >= width || y < 0 || y >= height) {
            isClosedShape = false;
            break;
        }
        
        const pixelIndex = y * width + x;
        const arrayIndex = pixelIndex >>> 5;  // Divide by 32, faster than Math.floor(pixelIndex/32)
        const bitMask = 1 << (pixelIndex & 31); // Same as pixelIndex % 32
        
        // If already visited, skip
        if (visited[arrayIndex] & bitMask) continue;
        
        // Mark as visited
        visited[arrayIndex] |= bitMask;
        
        const pixelValue = buffer32[pixelIndex];

        // For replace mode, only continue if pixel matches starting color
        if (mode === 'replace') {
            if (pixelValue === startPixelValue ) {
                // Fill pixel with active color
                drawCtx.beginPath();
                drawCtx.fillRect(x-1, y-1, 3, 3);
                drawCtx.fill();
                
                // Continue flood in all directions
                floodStack.push({ x: x - 2, y: y });
                floodStack.push({ x: x + 2, y: y });
                floodStack.push({ x: x, y: y - 2 });
                floodStack.push({ x: x, y: y + 2 });
            }
        } else {
            // Original behavior for null and infill modes
            if (pixelValue !== col) { // IMPORTANT: this LIMITS the infill function: when encountering pixels of its OWN colour, will NOT progress further
                floodStack.push({ x: x - 2, y: y });
                floodStack.push({ x: x + 2, y: y });
                floodStack.push({ x: x, y: y - 2 });
                floodStack.push({ x: x, y: y + 2 });
            } 
            
            if(mode === 'infill') {
                drawCtx.beginPath();
                drawCtx.fillRect(x-1, y-1, 3, 3);
                drawCtx.fill();
            }
        }
    }

    return isClosedShape;
}


//------------------------------------------------------ PARAM LISTENER FUNCTIONALITY ------------------------------------------------------//



async function openStatsWindow() {
    // Send image data to main process for temporary storage
    // Right now, if we want to update the draw canvas data, we need to close and re-open the window.
    // Not ideal, but works for now.
    const imageData = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);

    try {
        const result = await window.api.invoke('open_stats_window', {
            data: imageData.data,
            width: drawCanvas.width,
            height: drawCanvas.height
        });
    } catch (error) {
        console.error('Failed to open stats window:', error);
    }
}

async function openClusteringWindow() {
    // Send image data to main process for temporary storage
    // Right now, if we want to update the draw canvas data, we need to close and re-open the window.
    // Not ideal, but works for now.
    const imageData = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);

    try {
        const result = await window.api.invoke('open_clustering_window', {
            data: imageData.data,
            width: drawCanvas.width,
            height: drawCanvas.height
        });
    } catch (error) {
        console.error('Failed to open clustering window:', error);
    }
}


function setActiveImageLayer(dir) {
    const keys = Object.keys(IMAGE_LAYERS);
    if(keys.length < 2) return;
    const idx = keys.indexOf(ACTIVE_IMAGE_LAYER);
    const newIdx = (idx + dir + keys.length) % keys.length;
    ACTIVE_IMAGE_LAYER = keys[newIdx];

    const img = document.getElementById('base-image');
    img.src = IMAGE_LAYERS[ACTIVE_IMAGE_LAYER].src;    
    // Add this to update the active icon
    updateImageIcons();
}



function draw() {

    
    //https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation
    //ctx.globalCompositeOperation = "copy";

    //drawCtx.globalCompositeOperation = 'source-over';
    switch (INTERACTION_MODE) {
        case "draw":
            if(leftClicked) {

                if(svgPath) {
                    scrollX = document.documentElement.scrollLeft;
                    scrollY = document.documentElement.scrollTop;
                    const scale = drawCanvas.width / drawCanvas.clientWidth;
                    const currentPath = svgPath.getAttribute("d");
                    svgPath.setAttribute("d", `${currentPath} L ${(mouseX/scale)-scrollX} ${(mouseY/scale)-scrollY}`);
                    // drawPath.push({x: mouseX, y: mouseY});
                }
                // drawCtx.globalCompositeOperation = 'source-over'
                // drawCtx.fillStyle = active.colour; 
                // drawCircle(drawCtx, mouseX, mouseY, Math.floor((drawDiameter*(drawCanvas.width / drawCanvas.clientWidth))/2)-1)

            } else if(rightClicked) {
                drawCtx.globalCompositeOperation = 'destination-out' // this clears the canvas
                drawCircle(drawCtx, mouseX, mouseY, Math.floor((drawDiameter*(drawCanvas.width / drawCanvas.clientWidth))/2)-1)
                drawCtx.globalCompositeOperation = 'source-over';

            }
            break;
        case "fill":
            break
        default:
            break;
    }
    window.requestAnimationFrame(draw);
}
  
init();



function changeActiveColour(selection) {
    activeColour = selection
    drawCtx.fillStyle = activeColour.colour;
    console.log("NEW ACTIVE: ", selection)
    cursor.style.borderColor= activeColour.colour;
    document.getElementById("cursor-size-slider").style.setProperty('--color', activeColour.colour);

    if (INTERACTION_MODE === 'pen') {
        updatePenDisplay();
    }

    if(highlightedMask) {
        applyActiveColourToHighlighted()
    }
}


function saveState() {
    if (undoHistory.length >= MAX_HISTORY_SIZE) {
        undoHistory.shift();
    }
    undoHistory.push(drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height));
}

function undo() {
    if (undoHistory.length > 0) {
        // Pop the last state from the history and restore it
        const lastState = undoHistory.pop();
        drawCtx.putImageData(lastState, 0, 0);
    } else {
        console.log("No more undo steps available.");
    }
}