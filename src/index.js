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

var layers = {} // image layers used by MOSAIC
var currentImage = '';
var undoHistory = [];
const MAX_HISTORY_SIZE = 10;
const origin = { x: 0, y: 0 };


// Add this function to clean up when image URLS
function revokeImageUrls() {
    Object.values(layers).forEach(img => {
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

        if (e.button === 0) { 
            leftClicked = true;

            // push starting point of draw path
            console.log("ADDING TO DRAW PATH...")
            drawPath.push({x: mouseX, y: mouseY});

            if(mode === 'pencil') {

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

            } else if(mode === 'select') {
                // Get color at click point
                const imageData = drawCtx.getImageData(mouseX, mouseY, 1, 1);
                const pixel = imageData.data;

                const selectedColour = rgbToHex(pixel[0], pixel[1], pixel[2]);
                
                // Create selection mask and SVG outline
                selectedMask = createColorMask(selectedColour);
                // outlineSelectedComponents(selectedMask);
                var label = colourLabelMap[selectedColour] + " selected ."

                drawColors.find((h, idx) => {
                    if(h === selectedColour) {
                        $('#toolbar-note').text(label);
                    }
                })
                

            }

        } else if (e.button === 2 && !leftClicked) {
            rightClicked = true;
            
        }
    });
    









    drawCanvas.addEventListener('mouseup', function(e) {
        // doesn't matter what the draw path looks like, a drawn pixel will be without the boundaries returned by this function
        if(leftClicked) {
            switch (mode) {
                case "fill":
                    // if user was in fill mode and drew a line, we need to check all points on that line for loops to fill
                    console.log("FILLING")
                    drawPath.forEach(point => {
                        flood(point.x, point.y, 'replace') // replace 
                    })
                    break;
                case "pencil":

                    // Remove the preview path
                    if (svgPath) {
                        svgScaleGroup.removeChild(svgPath);
                        svgPath = null;
                    }

                    if( drawPath.length === 1 ) { // if user clicked once: check if user wants to flood a closed-loop path of the same colour

                        // !IMPORTANT! clear the draw area where clicked first to ensure uniform
                        // drawCtx.globalCompositeOperation = 'destination-out' // this clear the point first
                        // drawCircle(drawCtx, mouseX, mouseY, Math.floor((drawDiameter*(drawCanvas.width / drawCanvas.clientWidth))/2)-1)
                        // then: either flood the area, or draw that erased point back
                        drawCtx.globalCompositeOperation = 'source-over'
                        if(flood(mouseX, mouseY)) { // do an initial check
                            console.log("INFILLING")
                            flood(mouseX, mouseY, 'infill') // flood the white area...

                        } 
                        // !IMPORTANT! draw a circle: if user didnt mean to flood, still meant to draw small region 
                        drawCircle(drawCtx, mouseX, mouseY, Math.floor((drawDiameter*(drawCanvas.width / drawCanvas.clientWidth))/2)-1); 

                    } else {
                        // user is finishing a path
                        drawPath.push({x: mouseX, y: mouseY}); // finish drawPath
                        // drawPath = solidifyPath(drawPath); // RESOLVE: fill in the gaps between the drawn points of the line/loop path
                            // Draw the final path to canvas
                        //if (drawPath.length > 1) {

                            drawPath = solidifyPath(drawPath);
                            drawCtx.fillStyle = activeColour.colour;
                            drawPath.forEach(point => {
                                drawCircle(drawCtx, point.x, point.y, Math.floor((drawDiameter*(drawCanvas.width / drawCanvas.clientWidth))/2)-1);
                            });
                        //}                    
                    }
                    break;
                default:
                    console.log('No tool was selected.');
            }

            drawPath = []
        }
        leftClicked = false;
        rightClicked =false;
        

    })

    drawCanvas.addEventListener("mouseleave", function(e) {
        document.getElementById('cursor').style.display = "none";
        switch (mode) {
            case "pencil":
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
            scale = Math.min(Math.max(1, scale), 10);
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
        console.log("KEY: ", event.key)

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
                changeActiveLayer(1);
            }

            if (event.key === 'ArrowLeft' || event.key === 'a') {
                changeActiveLayer(-1);
            }
        } else {
            if(event.key === 'Escape') {
                //blur searchbox
                searchBox.blur()


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

        // Update coordinates text.
        $('#coords').text(mouseX + ", " + mouseY);
        $('#ecoords').text(event.clientX + ", " + event.clientY);

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
            if(pixelHex === "#000000" || pixelHex === "#7F7F7F") {
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
    
    window.addEventListener('mousemove', (event) => {
        updateCursor(event);
    });
    
    window.addEventListener('scroll', (event) => {
        leftClicked = false;
        rightClicked =false;
        updateCursor(event);
    });

    // get & populate with first loadout
    window.api.invoke('get_loadouts')
    .then(function(loadouts) {
        console.log("LOADOUTS: ", loadouts)
        initLoadoutList(loadouts)
        /*
        for (var [loadout] of Object.entries(loadouts) ) {
            $("#loadouts > select").append('<option value='+loadout+'>'+loadouts[loadout]['name']+'</option>');
        }
        // populate the labels list with the first loadout
        for (const [label, label_data] of Object.entries(Object.values(loadouts)[0]['labels'])) {
            $("#labels > select").append('<option value='+label+'>'+label_data['name']+'</option>');
        }
        initializeItemList(changeActiveColour, document.getElementById('loadouts'));
        initializeItemList(changeActiveColour, document.getElementById('labels'));
        */

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
            if (pixelValue !== col) {
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



async function openAnalysisWindow() {
    // Send image data to main process for temporary storage
    // Right now, if we want to update the draw canvas data, we need to close and re-open the window.
    // Not ideal, but works for now.
    const imageData = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
    const imageDataToSend = {
        data: imageData.data,
        width: drawCanvas.width,
        height: drawCanvas.height
    };
    window.api.invoke('set_draw_data', imageDataToSend)

    // Open analysis window
    try {
        const result = await window.api.invoke('open_analysis');
    } catch (error) {
        console.error('Failed to open analysis window:', error);
    }
}

//------------------------------------------------------ LOAD DROPPED IMAGES ------------------------------------------------------//

function catchDrag(event) {
	event.dataTransfer.dropEffect = "copy"
	event.preventDefault();
}

var shouldEraseDrawLayer = true
var dimensionsSet = false;

function dropFiles(event) {
    // revokeImageUrls(); // Clear old URLs before processing new files
    shouldEraseDrawLayer = true
    dimensionsSet = false;
    event.preventDefault();
    if (event.dataTransfer && event.dataTransfer.files) {
        const files = Array.from(event.dataTransfer.files);

        // precheck if any of the files are .png
        files.forEach(file => {
            console.log("file.name: ", file.name)
            if (file.name.endsWith(".png")) {
                shouldEraseDrawLayer = false
            }
        })

        let segmentationLayer = null
        const imagePromises = files.map(file => {
            if (file.name.endsWith(".png")) {
                //return processEdgeOrSegmentationMap(file);
                segmentationLayer = file;
            } else {
                return processImageLayer(file);
            }
        });

        Promise.all(imagePromises).then(() => {
            if(segmentationLayer !== null) {
                processSegmentationLayer(segmentationLayer);
            }
            console.log("SHOULD ERASE DRAW LAYER? ", shouldEraseDrawLayer)

            // finally, set active image layer
            const keys = Object.keys(layers);
            const base = document.getElementById('base-image');
            
            if (keys.length > 0) {
                currentImage = keys[0];
                document.getElementById('toolbar-filename').textContent = currentImage;
                base.src = layers[currentImage].src;
            } else {
                document.getElementById('toolbar-filename').textContent = 'Drag image set below...';
                currentImage = '';
                base.src = ''; // Clear the image
                console.log("UPDATING IMAGE: ERASING DRAW LAYER? " + shouldEraseDrawLayer)
                shouldEraseDrawLayer ? drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height) : null;
            }
        });
    }
    console.log("IMAGE LAYERS: ", layers)
}


function processSegmentationLayer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();

            img.onload = function() {
                if(!dimensionsSet) {
                    console.log("SETTING DIMENSIONS...")
                    drawCanvas.width = img.width;
                    drawCanvas.height = img.height;
                    dimensionsSet = true;
                // }

                // if (file.name.includes("edge_map")) {
                //     console.log("IMPORTING EDGE MAP...")
                //     processEdgeMap(img);
                // } else {
                //     console.log("IMPORTING SEGMENTATION MAP...")
                    drawCtx.drawImage(img, 0, 0);
                }
                // resolve();
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function processImageLayer(file) {
    return new Promise(async (resolve, reject) => {
        try {
            // Create URL for display
            const displayUrl = URL.createObjectURL(file);
            
            // Create and store ImageBitmap for computations
            const blob = new Blob([await file.arrayBuffer()]);
            const bitmap = await createImageBitmap(blob);
            
            // Load image for dimension checking
            const tempImg = new Image();
            await new Promise(imgResolve => {
                tempImg.onload = imgResolve;
                tempImg.src = displayUrl;
            });

            // Generate icon with max dimension of 256px
            const iconCanvas = document.createElement('canvas');
            const iconCtx = iconCanvas.getContext('2d');
            
            // Calculate scaled dimensions maintaining aspect ratio
            let iconWidth, iconHeight;
            if (tempImg.naturalWidth >= tempImg.naturalHeight) {
                // Width is the longer side
                iconWidth = 256;
                iconHeight = Math.round((tempImg.naturalHeight / tempImg.naturalWidth) * 256);
            } else {
                // Height is the longer side
                iconHeight = 256;
                iconWidth = Math.round((tempImg.naturalWidth / tempImg.naturalHeight) * 256);
            }
            
            // Set canvas dimensions and draw the scaled image
            iconCanvas.width = iconWidth;
            iconCanvas.height = iconHeight;
            iconCtx.drawImage(tempImg, 0, 0, iconWidth, iconHeight);
            
            // Convert canvas to data URL for the icon
            const iconUrl = iconCanvas.toDataURL('image/jpeg', 1); // 1 === quality

            if(!dimensionsSet) {
                drawCanvas.width = tempImg.naturalWidth;
                drawCanvas.height = tempImg.naturalHeight;

                const baseImg = document.getElementById('base-image');
                baseImg.src = displayUrl;
                baseImg.style.width = '100%';
                baseImg.style.height = 'auto';
                dimensionsSet = true;
            }

            // Determine the type based on filename
            let type;
            const filename = file.name.toLowerCase();

            // existing default supported layer types
            const typeKeywords = ['xpol_texture', 'xpol', 'ppol_texture', 'ppol', 'lin', 'ref', 'texture', 'composite'];
            
            // Check if filename contains any of the keywords
            const matchedType = typeKeywords.find(keyword => filename.includes(keyword));
            
            if (matchedType) {
                type = matchedType;
            } else {
                // Count existing 'layer_x' types to determine the next number
                const layerCount = Object.values(layers).filter(img => img.type && img.type.startsWith('layer_')).length;
                type = `layer_${layerCount + 1}`;
            }

            layers[file.name] = {
                icon: iconUrl,             // New icon URL
                src: displayUrl,           // For display
                bitmap: bitmap,            // For computations
                width: tempImg.naturalWidth,
                height: tempImg.naturalHeight,
                type: type
            };

            resolve();
        } catch(err) {
            reject(err);
        }
    });
}

// function processImageLayer(file) {
//     return new Promise(async (resolve, reject) => {
//         try {
//             // Create URL for display
//             const displayUrl = URL.createObjectURL(file);
            
//             // Create and store ImageBitmap for computations
//             const blob = new Blob([await file.arrayBuffer()]);
//             const bitmap = await createImageBitmap(blob);
            
//             // Load image for dimension checking
//             const tempImg = new Image();
//             await new Promise(imgResolve => {
//                 tempImg.onload = imgResolve;
//                 tempImg.src = displayUrl;
//             });

//             if(!dimensionsSet) {
//                 drawCanvas.width = tempImg.naturalWidth;
//                 drawCanvas.height = tempImg.naturalHeight;

//                 const baseImg = document.getElementById('base-image');
//                 baseImg.src = displayUrl;
//                 baseImg.style.width = '100%';
//                 baseImg.style.height = 'auto';
//                 dimensionsSet = true;
//             }

//             // Determine the type based on filename
//             let type;
//             const filename = file.name.toLowerCase();

//             // existing default supported layer types
//             const typeKeywords = ['xpol_texture', 'xpol',  'ppol_texture', 'ppol',  'lin', 'ref', 'texture', 'composite'];
            
//             // Check if filename contains any of the keywords
//             const matchedType = typeKeywords.find(keyword => filename.includes(keyword));
            
//             if (matchedType) {
//                 type = matchedType;
//             } else {
//                 // Count existing 'layer_x' types to determine the next number
//                 const layerCount = Object.values(layers).filter(img => img.type && img.type.startsWith('layer_')).length;
//                 type = `layer_${layerCount + 1}`;
//             }



//             // Store both formats
//             layers[file.name] = {
//                 icon: 
//                 src: displayUrl,           // For display
//                 bitmap: bitmap,            // For computations
//                 width: tempImg.naturalWidth,
//                 height: tempImg.naturalHeight,
//                 type: type
//             };

//             resolve();
//         } catch(err) {
//             reject(err);
//         }
//     });
// }

function changeActiveLayer(dir) {
    const keys = Object.keys(layers);
    if(keys.length < 2) return;
    const idx = keys.indexOf(currentImage);
    const newIdx = (idx + dir + keys.length) % keys.length;
    currentImage = keys[newIdx];

    const img = document.getElementById('base-image');
    img.src = layers[currentImage].src;
    document.getElementById('toolbar-filename').textContent = currentImage;
}



function draw() {

    
    //https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation
    //ctx.globalCompositeOperation = "copy";

    //drawCtx.globalCompositeOperation = 'source-over';
    switch (mode) {
        case "pencil":
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



function cropTiles() {
    const CHUNK_SIZE = 256;
    const MAX_OVERLAP_AREA = 0.5 * CHUNK_SIZE * CHUNK_SIZE; // 32768 pixels
  
    const width = drawCanvas.width;
    const height = drawCanvas.height;
  
    // 1. Get the image data and build a binary mask.
    // Foreground pixels are those with a nonzero alpha and not rgb(127, 127, 127) (not the transparent 'undefined' or grey 'unknown' reserved classes )
    const segmentationData = drawCtx.getImageData(0, 0, width, height).data;
    const foreground = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const r = segmentationData[4 * i],
            g = segmentationData[4 * i + 1],
            b = segmentationData[4 * i + 2],
            a = segmentationData[4 * i + 3];
      // If pixel is non-transparent and not grey, mark as foreground.
      foreground[i] = (a !== 0 && !(r === 127 && g === 127 && b === 127)) ? 1 : 0;
    }
  
    // 2. Build an integral image (summed-area table) for fast area-sum queries.
    const integral = new Uint32Array(width * height);
    for (let y = 0; y < height; y++) {
      let rowSum = 0;
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        rowSum += foreground[idx];
        if (y === 0) {
          integral[idx] = rowSum;
        } else {
          integral[idx] = integral[(y - 1) * width + x] + rowSum;
        }
      }
    }

    // 3. Find connected components of foreground pixels via flood fill.
    // (This will allow us to “tile” only over areas where foreground exists.)
    const visited = new Uint8Array(width * height);
    const grainBoundingBoxes = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (foreground[idx] === 1 && visited[idx] === 0) { // found a new unvisited component
          const comp = { minX: x, maxX: x, minY: y, maxY: y };
          const stack = [[x, y]];
          visited[idx] = 1;
          while (stack.length) {
            const [cx, cy] = stack.pop();
            comp.minX = Math.min(comp.minX, cx);
            comp.maxX = Math.max(comp.maxX, cx);
            comp.minY = Math.min(comp.minY, cy);
            comp.maxY = Math.max(comp.maxY, cy);
            // Check 4-connected neighbors.
            const neighbors = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
            for (const [nx, ny] of neighbors) {
              if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
                const nIdx = ny * width + nx;
                if (foreground[nIdx] === 1 && visited[nIdx] === 0) {
                  visited[nIdx] = 1;
                  stack.push([nx, ny]);
                }
              }
            }
          }
          grainBoundingBoxes.push(comp);
        }
      }
    }
    if (grainBoundingBoxes.length === 0) {
      console.log("No foreground found.");
      return [];
    }

    // return the sum of mask values in the rectangle [x1,y1]–[x2,y2] (inclusive)
    function getGrainSum(x1, y1, x2, y2) {
        x1 = Math.max(0, x1); y1 = Math.max(0, y1);
        x2 = Math.min(width - 1, x2); y2 = Math.min(height - 1, y2);
        const A = (x1 > 0 && y1 > 0) ? integral[(y1 - 1) * width + (x1 - 1)] : 0;
        const B = (y1 > 0) ? integral[(y1 - 1) * width + x2] : 0;
        const C = (x1 > 0) ? integral[y2 * width + (x1 - 1)] : 0;
        const D = integral[y2 * width + x2];
        return D - B - C + A;
    }

          
  
    // 4. For each component, tile its bounding box with 256×256 windows.
    // We “tile” such that the tiles cover the box and the step between adjacent tiles is never less than 128 (max 50% overlap).
    let candidateTiles = [];

    function boundingBoxToTiles(comp) {
      // Use the component’s bounding box.
      let x0 = comp.minX, y0 = comp.minY;
      let x1 = comp.maxX, y1 = comp.maxY;
      const boxWidth = x1 - x0 + 1;
      const boxHeight = y1 - y0 + 1;
  
      // Determine horizontal start positions.
      let xStarts = [];
      if (boxWidth <= CHUNK_SIZE) {
        // Single tile – choose the leftmost possible (clamped to canvas).
        xStarts.push(Math.max(0, Math.min(x0, width - CHUNK_SIZE)));
      } else {
        // Use as few tiles as possible. First try with no overlap (step = 256).
        let n = Math.ceil((boxWidth - CHUNK_SIZE) / 256) + 1;
        let step = (boxWidth - CHUNK_SIZE) / (n - 1);
        // If step would be too small (<128), force a 128-pixel step and recalc n.
        if (step < 128) {
          step = 128;
          n = Math.ceil((boxWidth - CHUNK_SIZE) / 128) + 1;
        }
        const minXStart = x0;
        const maxXStart = Math.min(x1 - CHUNK_SIZE + 1, width - CHUNK_SIZE);
        for (let i = 0; i < n; i++) {
          const pos = Math.round(minXStart + i * (maxXStart - minXStart) / (n - 1));
          xStarts.push(pos);
        }
        // Remove duplicates.
        xStarts = Array.from(new Set(xStarts));
      }
  
      // Determine vertical start positions.
      let yStarts = [];
      if (boxHeight <= CHUNK_SIZE) {
        yStarts.push(Math.max(0, Math.min(y0, height - CHUNK_SIZE)));
      } else {
        let n = Math.ceil((boxHeight - CHUNK_SIZE) / 256) + 1;
        let step = (boxHeight - CHUNK_SIZE) / (n - 1);
        if (step < 128) {
          step = 128;
          n = Math.ceil((boxHeight - CHUNK_SIZE) / 128) + 1;
        }
        const minYStart = y0;
        const maxYStart = Math.min(y1 - CHUNK_SIZE + 1, height - CHUNK_SIZE);
        for (let i = 0; i < n; i++) {
          const pos = Math.round(minYStart + i * (maxYStart - minYStart) / (n - 1));
          yStarts.push(pos);
        }
        yStarts = Array.from(new Set(yStarts));
      }
  
      // Combine horizontal and vertical starts to form candidate 256×256 tiles.
      for (const xs of xStarts) {
        for (const ys of yStarts) {
          // Only consider if at least one foreground pixel is inside.
          const cov = getGrainSum(xs, ys, xs + CHUNK_SIZE - 1, ys + CHUNK_SIZE - 1);
          if (cov > 0) {
            candidateTiles.push({ x: xs, y: ys, coverage: cov });
          }
        }
      }
    }

    for (const grainBoundingBox of grainBoundingBoxes) {
      boundingBoxToTiles(grainBoundingBox);
    }
  
    // 5. Run a simple non-maximum suppression to discard redundant tiles.
    // We sort candidates by “coverage” (number of foreground pixels inside)
    // and then suppress any candidate that overlaps more than 50% (i.e. >32768 pixels) with a higher scoring one.
    candidateTiles.sort((a, b) => b.coverage - a.coverage);
    const selectedTiles = [];
    const suppressed = new Array(candidateTiles.length).fill(false);
    function intersectionArea(tileA, tileB) {
      const xA = Math.max(tileA.x, tileB.x);
      const yA = Math.max(tileA.y, tileB.y);
      const xB = Math.min(tileA.x + CHUNK_SIZE, tileB.x + CHUNK_SIZE);
      const yB = Math.min(tileA.y + CHUNK_SIZE, tileB.y + CHUNK_SIZE);
      return (xB > xA && yB > yA) ? (xB - xA) * (yB - yA) : 0;
    }
    for (let i = 0; i < candidateTiles.length; i++) {
      if (suppressed[i]) continue;
      const tileA = candidateTiles[i];
      selectedTiles.push(tileA);
      for (let j = i + 1; j < candidateTiles.length; j++) {
        if (suppressed[j]) continue;
        const tileB = candidateTiles[j];
        if (intersectionArea(tileA, tileB) > MAX_OVERLAP_AREA) {
          suppressed[j] = true;
        }
      }
    }
  
    idx = 0;
    // 6. Format the output tiles.
    const tiles = selectedTiles.map(tile => ({
      left: tile.x,
      top: tile.y,
      right: tile.x + CHUNK_SIZE,
      bottom: tile.y + CHUNK_SIZE,
      index: idx++,
      coverage: tile.coverage // (optional; can be omitted)
    }));
  
    console.log("Found tiles:", tiles);
    return tiles;
  }




function getCommonSubstring(strings) {
    if (!strings.length) {
      return '';
    }
  
    // Helper function to find common prefix between two strings
    function commonPrefix(str1, str2) {
      let i = 0;
      while (i < str1.length && i < str2.length && str1[i] === str2[i]) {
        i++;
      }
      return str1.substring(0, i);
    }
  
    // Start with the first string as a candidate for the common substring
    // and compare it with all other strings, shortening it as necessary
    let commonSub = strings[0];
    for (let i = 1; i < strings.length && commonSub !== ''; i++) {
      commonSub = commonPrefix(commonSub, strings[i]);
      if (commonSub === '') break; // If empty, no common substring exists
    }
  
    // If commonSub still has length, it means it's present in all strings so far,
    // but it might not be the longest. Check for longer common substrings.
    if (commonSub.length > 0) {
      for (let i = commonSub.length; i > 0; i--) {
        let subCandidate = commonSub.substring(0, i);
        let isCommon = strings.every((str) => str.includes(subCandidate));
        if (isCommon) {
          return subCandidate; // Returns the longest common substring found
        }
      }
    }
  
    return commonSub; // Return the common substring (which may be empty)
}

function getFilename(path) {
    // Extract the filename from a path, handling both Windows and Unix paths
    const filename = path.split(/[/\\]/).pop(); // Splits on both forward and backslash
    return filename.replace(/\.(jpg|JPG|png|PNG|jpeg|JPEG|tiff|TIFF|TIF|tif|gif|GIF)$/, ''); // Removes known image extensions
}


async function saveTiles() {
    const tiles = cropTiles();
    console.log("SAVING TILES...")

    // Get identifier same as before
    const filenames = Object.keys(layers);
    const identifier = getCommonSubstring(filenames.map(filename => 
        getFilename(filename).trim().toLowerCase()
    )).replace(/^_+|_+$/g, '') || Date.now().toString();

    console.log("IDENTIFIER: ", identifier)

    window.api.invoke('set_save_dir', {'path': '', 'type': 'save', identifier}).then(async () => {


        // // Get draw layer data once
        // const drawLayerData = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
        // const drawBuffer = new Uint32Array(drawLayerData.data.buffer);

        // Create off-screen buffer once
        // const _offscreenCanvas = new OffscreenCanvas(drawCanvas.width, drawCanvas.height);
        // const _offscreenCtx = _offscreenCanvas.getContext('2d');

        try {

            // Process all tiles in parallel
            await Promise.all(tiles.map(async tile => {
                const { left, right, top, bottom, index } = tile;
                const width = right - left;
                const height = bottom - top;

                // Create crop buffer
                const cropCanvas = new OffscreenCanvas(width, height);
                const cropCtx = cropCanvas.getContext('2d');

                // Save segmentation map crop
                cropCtx.putImageData(
                    drawCtx.getImageData(left, top, width, height),
                    0, 0
                );
                const mapBlob = await cropCanvas.convertToBlob({type: 'image/png'});
                await window.api.invoke('save_img', {
                    data: await blobToBase64(mapBlob),
                    filename: '',
                    identifier,
                    type: 'map',
                    idx: index
                });

                // Process each image layer in parallel, using the stored bitmaps
                await Promise.all(Object.entries(layers).map(async ([filename, image]) => {
                    cropCtx.clearRect(0, 0, width, height);
                    cropCtx.drawImage(image.bitmap, left, top, width, height, 0, 0, width, height);
                    
                    const layerBlob = await cropCanvas.convertToBlob({type: 'image/jpeg', quality: 1});
                    return window.api.invoke('save_img', {
                        data: await blobToBase64(layerBlob),
                        filename,
                        identifier,
                        type: image.type,
                        idx: index
                    });
                }));


            }));

            //  //... then we save the entire draw layer for a save file:
            // var draw_data = drawCanvas.toDataURL("image/png");
            // window.api.invoke('save_img', {'data': draw_data, 'filename': '', 'identifier':identifier, 'type': 'segmentation_map', 'idx': ''})



            await window.api.invoke('save_label_colours', {dict: colourLabelMap});

        } catch (error) {
            console.error('Error in saveTiles:', error);
            throw error;
        }
    });
}

async function saveMap() {
    console.log("SAVING SEG MAP...")

    // Get identifier same as before
    const filenames = Object.keys(layers);
    const identifier = getCommonSubstring(filenames.map(filename => 
        getFilename(filename).trim().toLowerCase()
    )).replace(/^_+|_+$/g, '') || Date.now().toString();

    window.api.invoke('set_save_dir', {'path': '', 'type': 'save', identifier}).then(async () => {
        try {

            var draw_data = drawCanvas.toDataURL("image/png");
            window.api.invoke('save_img', {'data': draw_data, 'filename': '', 'identifier':identifier, 'type': 'segmentation_map', 'idx': ''})

            // ... then we create all overlays in parallel
            // await Promise.all(Object.entries(images).map(async ([filename, image]) => {

            //     _offscreenCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
            //     _offscreenCtx.drawImage(image.bitmap, 0, 0);
            //     _offscreenCtx.globalAlpha = 0.5;
            //     _offscreenCtx.drawImage(drawCanvas, 0, 0);
            //     _offscreenCtx.globalAlpha = 1.0;

            //     const overlayBlob = await _offscreenCanvas.convertToBlob({type: 'image/jpeg', quality: 1});
            //     return window.api.invoke('save_img', {
            //         data: await blobToBase64(overlayBlob),
            //         filename,
            //         identifier,
            //         type: images[filename].type,
            //         idx: '',
                    
            //     });
            // }));

        } catch (error) {
            console.error('Error in saveTiles:', error);
            throw error;
        }
    });
}

// Helper function to convert Blob to base64
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function changeActiveColour(selection) {
    activeColour = selection
    drawCtx.fillStyle = activeColour.colour;
    console.log("NEW ACTIVE: ", selection)
    cursor.style.borderColor= activeColour.colour;
    document.getElementById("cursor-size-slider").style.setProperty('--color', activeColour.colour);
    if(selectedMask) {
        applyActiveColourToSelection()
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