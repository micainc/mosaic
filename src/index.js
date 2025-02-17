var originX = 0;
var originY = 0;
var zoom = 0;

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

const draw_canvas = document.getElementById('draw-canvas')
const save_canvas = document.getElementById('save-canvas')

draw_canvas.width = window.innerWidth;
draw_canvas.height = window.innerHeight;
save_canvas.width = window.innerWidth;
save_canvas.height = window.innerHeight;

var draw_ctx = draw_canvas.getContext('2d');
var save_ctx = save_canvas.getContext('2d');

//draw_ctx.imageSmoothingEnabled= false
//save_ctx.imageSmoothingEnabled= false

var cursor = document.getElementById('cursor');
cursor.style.width = drawDiameter+"px";
cursor.style.height = drawDiameter+"px";

var active = {'colour': "#000000", 'label': ""}
var hoveredColour = "#000000"
var floodStack = []

var images = {} // image layers used by MOSAIC
var currentImage = '';
var image_track_filled = new Set()
var undoHistory = [];
const MAX_HISTORY_SIZE = 10;
const origin = { x: 0, y: 0 };


// Add this function to clean up when image URLS
function revokeImageUrls() {
    Object.values(images).forEach(img => {
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

    draw_ctx.clearRect(0, 0, draw_canvas.width, draw_canvas.height);
    save_ctx.fillStyle = "#000000"; // flood with black

    //save_ctx.globalCompositeOperation = 'source-over'

    draw_canvas.addEventListener('mousedown', function(e) {
        $('#cursor-text').css("display", "none")
        if (e.button === 0) {
            leftClicked = true;
            // push starting point of draw path
            drawPath.push({x: mouseX, y: mouseY});
            var imageData = draw_ctx.getImageData(mouseX, mouseY, 1, 1);
            firstPixelForFill = imageData.data;

            saveState();
        } else if (e.button === 2 && !leftClicked) {
            rightClicked = true;
            
        }
    });

    draw_canvas.addEventListener('mouseup', function(e) {
        // doesn't matter what the draw path looks like, a drawn pixel will be without the boundaries returned by this function
        if(leftClicked) {
            switch (mode) {
                case "fill":
                    var points = goOutFromDrawPointsToFill(drawPath, draw_ctx)
                    fillPointsWithActiveColor(points)
                    break;
                case "pencil":
                    if( drawPath.length < 2 ) { // if user just clicked, check if user wants to flood a shape

                        // clear the draw area first
                        draw_ctx.globalCompositeOperation = 'destination-out' // this clear the point first
                        fillPixelatedCircle(draw_ctx, mouseX, mouseY, Math.floor((drawDiameter*(draw_canvas.width / draw_canvas.clientWidth))/2)-1)
        
                        // then: either flood the area, or draw that erased point back
                        draw_ctx.globalCompositeOperation = 'source-over'
                        if(flood(mouseX, mouseY)) {
                            flood(mouseX, mouseY, active.colour)
                        } else {
                            fillPixelatedCircle(draw_ctx, mouseX, mouseY, Math.floor((drawDiameter*(draw_canvas.width / draw_canvas.clientWidth))/2)-1)
                        }
        
                    } else {
                        drawPath.push({x: mouseX, y: mouseY}); // finish drawPath
                        drawPath = fillGaps(drawPath); // fills gaps in the drawing of a loop due to lag
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

    draw_canvas.addEventListener("mouseleave", function(e) {
        document.getElementById('cursor').style.display = "none";
        switch (mode) {
            case "pencil":
                if(leftClicked) {
                    drawPath.push({x: mouseX, y: mouseY}); // finish drawPath
                    drawPath = fillGaps(drawPath); // algorithmically fills gaps in the draw path to create a solid continuous line 
                    
                }
                break;
            case "fill":
                var points = goOutFromDrawPointsToFill(drawPath, draw_ctx)
                fillPointsWithActiveColor(points)
                break;
            default:
                break;
        }
        drawPath = []
        leftClicked = false;
        rightClicked = false;
    })


    let scale = 1;
    let isGesturing = false;
    
    // For trackpad scrolling 
    draw_canvas.addEventListener('wheel', function(e) {
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
    draw_canvas.addEventListener('gesturestart', function(e) {
        console.log('gesture start:', e);
        e.preventDefault();
        isGesturing = true;
    });

    draw_canvas.addEventListener('gesturechange', function(e) {
        console.log('gesture change:', e);
        e.preventDefault();
        if (isGesturing) {
            scale *= e.scale;
            scale = Math.min(Math.max(0.5, scale), 16);
            // zoomAround(scale, e.clientX, e.clientY);
            zoomAround(scale, mouseX, mouseY);

        }
    });

    draw_canvas.addEventListener('gestureend', function(e) {
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


    draw_canvas.addEventListener("mouseenter", function(e) {
        document.getElementById('cursor').style.display = "block";
    })

    document.getElementById('cursor-size-slider').addEventListener('mouseenter', function(e) {
        document.getElementById('cursor').style.display = "block";
    })

    document.getElementById('cursor-size-slider').addEventListener('mouseleave', function(e) {
        document.getElementById('cursor').style.display = "none";
    })

    draw_canvas.addEventListener("dragenter", catchDrag);
    draw_canvas.addEventListener("dragover", catchDrag);
    draw_canvas.addEventListener("drop", dropFiles);

    document.addEventListener('keydown', function(event) {
        console.log("KEY: ", event.key)

        if (event.code === 'Space') {
            event.preventDefault()
            draw_canvas.style.opacity = '0';
        }

        // s for 'see segmentation'
        if (event.key === 's') {
            event.preventDefault()
            draw_canvas.style.opacity = '1';
        }

        // ctrl z: undo
        if (event.ctrlKey && event.key === 'z') {
            undo();
        } 

        var searchBox = document.getElementsByClassName('search-box')[0]
        console.log(searchBox.style.display)
        if (searchBox.style.display !== 'block') {
            if (event.key === 'ArrowRight' || event.key === 'd') {
                cycleImage(1);
            }

            if (event.key === 'ArrowLeft' || event.key === 'a') {
                cycleImage(-1);
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
            draw_canvas.style.opacity = '0.5';
        } 
    });

    function updateCursor(event) {
        const rect = draw_canvas.getBoundingClientRect();
        
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
            mouseX = Math.round((event.clientX - rect.left) * draw_canvas.width / draw_canvas.clientWidth);
            mouseY = Math.round((event.clientY - rect.top) * draw_canvas.height / draw_canvas.clientHeight);
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
        var imageData = draw_ctx.getImageData(mouseX, mouseY, 1, 1);
        var pixel = imageData.data;
        var inverted = rgbToHex(255-pixel[0], 255-pixel[1], 255-pixel[2])
        var pixelHex = rgbToHex(pixel[0], pixel[1], pixel[2]); // get colour as hex string

        if(active.colour === pixelHex) {
            // invert the colour of the cursor itself
            $('#cursor').css("border-color", inverted)
        } else {
            $('#cursor').css("border-color", active.colour)

        }
        

        var pixelHex = rgbToHex(pixel[0], pixel[1], pixel[2]);
        // console.log("HEX: ", hex)
        // console.log("ACTIVE: ", active.colour)

        // if we have traversed onto a NEW COLOUR on the segmentation map:
        if(leftClicked) {
            $('#cursor-text').css("display", "none")
        } else if(hoveredColour !== pixelHex) {
            if(pixelHex === "#000000" || pixelHex === "#7F7F7F") {
                $('#cursor-text').css("display", "none")
            } else if(active.colour !== pixelHex) {
                var label = colourLabelMap[pixelHex]
                
                drawColors.find((h, idx) => {
                    if(h === pixelHex) {
                        $('#cursor-text').css("display", "block")
                        $('#cursor-text').css("color", inverted)
                        $('#cursor-text').text(label);
                    }
                })
    
            } else if(active.colour === pixelHex){
                $('#cursor-text').css("display", "none")
            }
            hoveredColour = pixelHex
        }
        // let posX = mouseX / draw_canvas.width;
        // let posY = mouseY / draw_canvas.height;
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
        initializeItemList(changeActive, document.getElementById('loadouts'));
        initializeItemList(changeActive, document.getElementById('labels'));
        */

    }).catch(function(err) {
        console.error("ERROR: ", err); // will print "This didn't work!" to the browser console.
    });

    window.addEventListener('unload', function() {
        revokeImageUrls();
    });
    
    window.requestAnimationFrame(draw); // start animating cursor movements
}

function drawLoopCenters(loops) {
    for(var l = 0; l< loops.length; l++) {
        var loop = loops[l]
        var x = 0;
        var y = 0;
        for(var p = 0; p < loop.length; p++) {
            x += loop[p].x
            y += loop[p].y
        }
        x /= loop.length;
        y /= loop.length;
        draw_ctx.fillStyle = "#00FF00"
        fillGrain(draw_ctx, x, y)
        draw_ctx.fillStyle = active.colour
    }
}

function fillGaps(path) {
    draw_ctx.fillStyle = active.colour;
    draw_ctx.imageSmoothingEnabled = false; // Disable anti-aliasing to draw sharp circles

    // Calculate line width based on draw size and scaling factor, ensure it's not anti-aliased
    const lineWidth = Math.ceil(drawDiameter * (draw_canvas.width / draw_canvas.clientWidth));

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
            fillPixelatedCircle(draw_ctx, roundedX, roundedY, lineWidth / 2);

            // Record the point in the array
            points.push({ x: roundedX, y: roundedY });
        }
    }
    points.push({x: path[path.length - 1]['x'], y: path[path.length - 1]['y']})

    // Return the array of points that were filled
    return points;
}

// function fillPixelatedCircle(ctx, cx, cy, r){
//     r |= 0; // floor radius
//     ctx.setTransform(1,0,0,1,0,0); // ensure default transform
//     var x = r, y = 0, dx = 1, dy = 1;
//     var err = dx - (r << 1);
//     var x0 = cx - 1| 0, y0 = cy | 0;
//     var lx = x,ly = y;
//     ctx.beginPath();
//     while (x >= y) {
//         ctx.rect(x0 - x, y0 + y, x * 2 + 2, 1);
//         ctx.rect(x0 - x, y0 - y, x * 2 + 2, 1);
//         if (x !== lx){
//             ctx.rect(x0 - ly, y0 - lx, ly * 2 + 2, 1);
//             ctx.rect(x0 - ly, y0 + lx, ly * 2 + 2, 1);
//         }
//         lx = x;
//         ly = y;
//         y++;
//         err += dy;
//         dy += 2;
//         if (err > 0) {
//             x--;
//             dx += 2;
//             err += (-r << 1) + dx;
//         }
//     }
//     if (x !== lx) {
//         ctx.rect(x0 - ly, y0 - lx, ly * 2 + 1, 1);
//         ctx.rect(x0 - ly, y0 + lx, ly * 2 + 1, 1);
//     }    
//     ctx.fill();
// }

function fillPixelatedCircle(ctx, cx, cy, r) {
    r |= 0; // floor radius
    if (r <= 0) return; // early exit for invalid radius
    
    // Pre-calculate values and use const where possible
    const x0 = cx - 1 | 0;
    const y0 = cy | 0;
    
    // Use a single path for better performance
    ctx.beginPath();
    
    // Modified Bresenham's circle algorithm
    let x = r;
    let y = 0;
    let err = 0;
    
    // Pre-calculate constants
    const twoX = x * 2;
    let width = twoX + 2;
    
    while (x >= y) {
        // Draw horizontal lines in pairs
        // Top and bottom sections
        ctx.rect(x0 - x, y0 + y, width, 1);
        ctx.rect(x0 - x, y0 - y, width, 1);
        
        // Left and right sections
        if (y > 0) {
            const innerWidth = y * 2 + 2;
            ctx.rect(x0 - y, y0 + x, innerWidth, 1);
            ctx.rect(x0 - y, y0 - x, innerWidth, 1);
        }
        
        y++;
        err += 2 * y + 1;
        
        if (err > x) {
            x--;
            width = x * 2 + 2;
            err -= 2 * x + 1;
        }
    }
    
    // Single fill call
    ctx.fill();
}

// //------------------------------------------------------ LOOP FINDING + FILLING FUNCTIONALITY ------------------------------------------------------//
// function findLoopsInPath(path, margin) {

//     // Helper function to check if two points collide considering line width
//     function pointsCollide(p1, p2, diameter) {
//         let dx = p1.x - p2.x;
//         let dy = p1.y - p2.y;
//         let distance = Math.sqrt(dx * dx + dy * dy);
//         return Math.floor(distance) <= diameter+2; // Check within double the radius for overlapping
//     }

//     // Helper function to get points in a loop from start to end index
//     function getLoopPoints(startIndex, endIndex, path) {
//         let loopPoints = [];
//         for (let i = startIndex; i <= endIndex; i++) {
//             loopPoints.push(path[i]);
//         }
//         return loopPoints;
//     }

//     let loops = []; // Store all the loops found
    
//     // Iterate over each point in the path except the last one
//     for (let i = 0; i < path.length - 1; i++) {
//         // if a point goes from touching, to not touching, to touching, we are in business
//         var neighbours = true; // assume next point in path will be neighbour

//         var i0 = 0; 
        
//         // FIRST get away from the reference point
//         for (let j = i + 1; j < path.length; j++) {
//             //... base case: points collide and neighbors == 1... just continue
//             if(pointsCollide(path[i], path[j], margin)) {
//                 if(!neighbours) {
//                     loops.push(getLoopPoints(i, j, path));
//                     i = i0;
//                     j = i0 + 1;
//                     break;
//                 }
//             } else if(neighbours) {  // if points DIDNT collide and neighbours is still set to true
//                 neighbours = false;
//                 i0 = j; // set point at which we will continue out algorithm from should we complete a loop
//             }

//         }

//     }

//     return loops; // Return all loops found
// }

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
        'right': Math.min(right, draw_canvas.width - 1),
        'bottom': Math.min(bottom, draw_canvas.height - 1)
    };
}

function flood(x1, y1, col=null) {
    const visited = new Set();
    const floodStack = [{ x: x1, y: y1 }];
    const getKey = (x, y) => `${x},${y}`;
    let interior = true;
    let width = draw_canvas.width;
    let height = draw_canvas.height;

    let activeColourValue = active.colour.startsWith("#") ? active.colour.slice(1) : active.colour;
    activeColourValue = parseInt(activeColourValue, 16);
    let red = (activeColourValue >> 16) & 0xFF;
    let green = (activeColourValue >> 8) & 0xFF;
    let blue = (activeColourValue >> 0) & 0xFF;
    activeColourValue = (0xFF << 24) | (blue << 16) | (green << 8) | (red << 0);
    
    // Use the unsigned right shift to convert to a 32-bit unsigned integer
    activeColourValue >>>= 0; // Correctly converts to unsigned for comparison

    // Retrieve the full image data just once
    const imageData = draw_ctx.getImageData(0, 0, width, height);
    const buffer32 = new Uint32Array(imageData.data.buffer); // Use a 32-bit buffer for performance
    // BUFFER IS IN ABGR FORMAT!!

    if(col !== null) {
        draw_ctx.fillStyle = col;
    }

    while (floodStack.length > 0) {
        const p = floodStack.pop();
        const { x, y } = p;
    
        if (visited.has(getKey(x, y))) continue;
    
        visited.add(getKey(x, y));

        //if flood hits edge of canvas and we are CHECKING if interior point in loop
        if (x < 0 || x >= width || y < 0 || y >= height) {
            interior = false;
            break;
        } 

        const index = y * width + x;
        const pixelValue = buffer32[index];

        if (pixelValue !== activeColourValue) {
            floodStack.push({ x: x - 2, y: y });
            floodStack.push({ x: x + 2, y: y });
            floodStack.push({ x: x, y: y - 2 });
            floodStack.push({ x: x, y: y + 2 });
        } 
        if(col !== null) {
            fillGrain(draw_ctx, x, y);
        }
    }

    return interior;
}

function fillLoops(loops) {
    for(l in loops) { // fill areas
        const start = Date.now();
        flood(loops[l]['x'], loops[l]['y'], active.colour)

        const end = Date.now();
        console.log(`LOOP FLOOD EXECUTION TIME: ${end - start} ms`);
    }
}

function fillGrain(canvas, x, y) {
    canvas.beginPath();
    canvas.fillRect(x-1, y-1, 3, 3);
    canvas.fill();
}

//------------------------------------------------------ PARAM LISTENER FUNCTIONALITY ------------------------------------------------------//



async function openAnalysisWindow() {
    // Send image data to main process for temporary storage
    // Right now, if we want to update the draw canvas data, we need to close and re-open the window.
    // Not ideal, but works for now.
    const imageData = draw_ctx.getImageData(0, 0, draw_canvas.width, draw_canvas.height);
    const imageDataToSend = {
        data: imageData.data,
        width: draw_canvas.width,
        height: draw_canvas.height
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

var should_erase_draw_layer = true
var dimensions_set = false;

function dropFiles(event) {
    // revokeImageUrls(); // Clear old URLs before processing new files
    should_erase_draw_layer = true
    dimensions_set = false;
    event.preventDefault();
    if (event.dataTransfer && event.dataTransfer.files) {
        const files = Array.from(event.dataTransfer.files);

        // check if any of the file names include edge_map or segmentation_map
        files.forEach(file => {
            console.log("file.name: ", file.name)
            if (file.name.includes("edge_map") || file.name.includes("segmentation_map")) {
                should_erase_draw_layer = false
            }
        })

        let segmentationLayer = null
        const imagePromises = files.map(file => {
            if (file.name.includes("edge_map") || file.name.includes("segmentation_map")) {
                //return processEdgeOrSegmentationMap(file);
                segmentationLayer = file;
            } else {
                return processImageFile(file);
            }
        });

        Promise.all(imagePromises).then(() => {
            if(segmentationLayer !== null) {
                processEdgeOrSegmentationMap(segmentationLayer);
            }
            console.log("SHOULD ERASE DRAW LAYER? ", should_erase_draw_layer)
            updateCurrentImage();
        });
    }
    console.log("IMAGES: ", images)
}


function processEdgeOrSegmentationMap(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();

            img.onload = function() {
                if(!dimensions_set) {
                    console.log("SETTING DIMENSIONS...")
                    draw_canvas.width = img.width;
                    draw_canvas.height = img.height;
                    dimensions_set = true;
                }

                if (file.name.includes("edge_map")) {
                    console.log("IMPORTING EDGE MAP...")
                    processEdgeMap(img);
                } else {
                    console.log("IMPORTING SEGMENTATION MAP...")
                    draw_ctx.drawImage(img, 0, 0);
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

function processEdgeMap(img) {
    const temp_canvas = document.createElement('canvas');
    temp_canvas.width = img.width;
    temp_canvas.height = img.height;

    const temp_ctx = temp_canvas.getContext('2d');
    temp_ctx.drawImage(img, 0, 0);

    const imageData = temp_ctx.getImageData(0, 0, temp_canvas.width, temp_canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        if (data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255) {
            setTransparentNeighbors(i, data, temp_canvas.width);
        } else if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0) {
            data[i] = data[i + 1] = data[i + 2] = 127;
        }
    }

    temp_ctx.putImageData(imageData, 0, 0);
    draw_ctx.drawImage(temp_canvas, 0, 0);
}


function setTransparentNeighbors(index, data, width) {
    const x = (index / 4) % width;
    const y = Math.floor((index / 4) / width);

    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < data.length / (4 * width)) {
                const nIdx = (ny * width + nx) * 4;
                data[nIdx + 3] = 0;
            }
        }
    }
}

function processImageFile(file) {
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

            if(!dimensions_set) {
                draw_canvas.width = tempImg.naturalWidth;
                draw_canvas.height = tempImg.naturalHeight;
                save_canvas.width = tempImg.naturalWidth;
                save_canvas.height = tempImg.naturalHeight;
                
                const baseImg = document.getElementById('base-image');
                baseImg.src = displayUrl;
                baseImg.style.width = '100%';
                baseImg.style.height = 'auto';
                dimensions_set = true;
            }

            // Determine the type based on filename
            let type;
            const filename = file.name.toLowerCase();
            const typeKeywords = ['lin', 'ref', 'texture', 'composite'];
            
            // Check if filename contains any of the keywords
            const matchedType = typeKeywords.find(keyword => filename.includes(keyword));
            
            if (matchedType) {
                type = matchedType;
            } else {
                // Count existing 'layer_x' types to determine the next number
                const layerCount = Object.values(images).filter(img => 
                    img.type && img.type.startsWith('layer_')
                ).length;
                type = `layer_${layerCount + 1}`;
            }


            // Store both formats
            images[file.name] = {
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

function updateCurrentImage() {
    const keys = Object.keys(images);
    const base = document.getElementById('base-image');
    
    if (keys.length > 0) {
        currentImage = keys[0];
        document.getElementById('toolbar-filename').textContent = currentImage;
        base.src = images[currentImage].src;
    } else {
        document.getElementById('toolbar-filename').textContent = 'Drag image set below...';
        currentImage = '';
        base.src = ''; // Clear the image
        console.log("UPDATING IMAGE: ERASING DRAW LAYER? " + should_erase_draw_layer)
        should_erase_draw_layer ? draw_ctx.clearRect(0, 0, draw_canvas.width, draw_canvas.height) : null;
    }
}

function cycleImage(dir) {
    const keys = Object.keys(images);
    if(keys.length < 2) return;
    const idx = keys.indexOf(currentImage);
    const newIdx = (idx + dir + keys.length) % keys.length;
    currentImage = keys[newIdx];

    const img = document.getElementById('base-image');
    img.src = images[currentImage].src;
    document.getElementById('toolbar-filename').textContent = currentImage;
}



function draw() {

    
    //https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation
    //ctx.globalCompositeOperation = "copy";

    //draw_ctx.globalCompositeOperation = 'source-over';
    switch (mode) {
        case "pencil":
            if(leftClicked) {
                draw_ctx.globalCompositeOperation = 'source-over'
                draw_ctx.fillStyle = active.colour; 
                fillPixelatedCircle(draw_ctx, mouseX, mouseY, Math.floor((drawDiameter*(draw_canvas.width / draw_canvas.clientWidth))/2)-1)

            } else if(rightClicked) {
                draw_ctx.globalCompositeOperation = 'destination-out' // this clears the canvas
                fillPixelatedCircle(draw_ctx, mouseX, mouseY, Math.floor((drawDiameter*(draw_canvas.width / draw_canvas.clientWidth))/2)-1)
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



function cropGrains() {
    const CHUNK_SIZE = 256;
    const MAX_OVERLAP_AREA = 0.5 * CHUNK_SIZE * CHUNK_SIZE; // 32768 pixels
  
    const width = draw_canvas.width;
    const height = draw_canvas.height;
  
    // 1. Get the image data and build a binary mask.
    // Foreground pixels are those with a nonzero alpha and not pure grey (128,128,128).
    const imageData = draw_ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const mask = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const r = data[4 * i],
            g = data[4 * i + 1],
            b = data[4 * i + 2],
            a = data[4 * i + 3];
      // If pixel is non-transparent and not grey, mark as foreground.
      mask[i] = (a !== 0 && !(r === 127 && g === 127 && b === 127)) ? 1 : 0;
    }
  
    // 2. Build an integral image (summed-area table) for fast area-sum queries.
    const integral = new Uint32Array(width * height);
    for (let y = 0; y < height; y++) {
      let rowSum = 0;
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        rowSum += mask[idx];
        if (y === 0) {
          integral[idx] = rowSum;
        } else {
          integral[idx] = integral[(y - 1) * width + x] + rowSum;
        }
      }
    }
    // Helper: return the sum of mask values in the rectangle [x1,y1]–[x2,y2] (inclusive)
    function getGrainSum(x1, y1, x2, y2) {
      x1 = Math.max(0, x1); y1 = Math.max(0, y1);
      x2 = Math.min(width - 1, x2); y2 = Math.min(height - 1, y2);
      const A = (x1 > 0 && y1 > 0) ? integral[(y1 - 1) * width + (x1 - 1)] : 0;
      const B = (y1 > 0) ? integral[(y1 - 1) * width + x2] : 0;
      const C = (x1 > 0) ? integral[y2 * width + (x1 - 1)] : 0;
      const D = integral[y2 * width + x2];
      return D - B - C + A;
    }
  
    // 3. Find connected components of foreground pixels via flood fill.
    // (This will allow us to “tile” only over areas where foreground exists.)
    const visited = new Uint8Array(width * height);
    const components = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (mask[idx] === 1 && visited[idx] === 0) {
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
                if (mask[nIdx] === 1 && visited[nIdx] === 0) {
                  visited[nIdx] = 1;
                  stack.push([nx, ny]);
                }
              }
            }
          }
          components.push(comp);
        }
      }
    }
    if (components.length === 0) {
      console.log("No foreground found.");
      return [];
    }
  
    // 4. For each component, tile its bounding box with 256×256 windows.
    // We “tile” such that the tiles cover the box and the step between adjacent tiles is never less than 128 (max 50% overlap).
    let candidateTiles = [];
    function tileBoundingBox(comp) {
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
    for (const comp of components) {
      tileBoundingBox(comp);
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


async function saveGrains() {
    const tiles = cropGrains();
    console.log("SAVING TILES...")

    // Get identifier same as before
    const filenames = Object.keys(images);
    const identifier = getCommonSubstring(filenames.map(filename => 
        getFilename(filename).trim().toLowerCase()
    )).replace(/^_+|_+$/g, '') || Date.now().toString();

    console.log("IDENTIFIER: ", identifier)

    window.api.invoke('set_save_dir', {'path': '', 'type': 'save', identifier}).then(async () => {


        // // Get draw layer data once
        // const drawLayerData = draw_ctx.getImageData(0, 0, draw_canvas.width, draw_canvas.height);
        // const drawBuffer = new Uint32Array(drawLayerData.data.buffer);

        // Create off-screen buffer once
        // const _offscreenCanvas = new OffscreenCanvas(draw_canvas.width, draw_canvas.height);
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
                    draw_ctx.getImageData(left, top, width, height),
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
                await Promise.all(Object.entries(images).map(async ([filename, image]) => {
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

             //... then we save the entire draw layer for a save file:
            var draw_data = draw_canvas.toDataURL("image/png");
            window.api.invoke('save_img', {'data': draw_data, 'filename': '', 'identifier':identifier, 'type': 'segmentation_map', 'idx': ''})

            // ... then we create all overlays in parallel
            // await Promise.all(Object.entries(images).map(async ([filename, image]) => {

            //     _offscreenCtx.clearRect(0, 0, draw_canvas.width, draw_canvas.height);
            //     _offscreenCtx.drawImage(image.bitmap, 0, 0);
            //     _offscreenCtx.globalAlpha = 0.5;
            //     _offscreenCtx.drawImage(draw_canvas, 0, 0);
            //     _offscreenCtx.globalAlpha = 1.0;

            //     const overlayBlob = await _offscreenCanvas.convertToBlob({type: 'image/jpeg', quality: 1});
            //     return window.api.invoke('save_img', {
            //         data: await blobToBase64(overlayBlob),
            //         filename,
            //         identifier,
            //         type: images[filename].type,
            //         idx: '-1',
                    
            //     });
            // }));

            await window.api.invoke('save_label_colours', {dict: colourLabelMap});

        } catch (error) {
            console.error('Error in saveGrains:', error);
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

function changeActive(selection) {
    active = selection
    console.log("NEW ACTIVE: ", selection)
    cursor.style.borderColor= active.colour;
    document.getElementById("cursor-size-slider").style.setProperty('--color', active.colour);
}

function fillPointsWithActiveColor(points) {
    draw_ctx.fillStyle = active.colour
    points.forEach(point => {
        draw_ctx.fillRect(point.x, point.y, 1, 1);
    });
}

function saveState() {
    if (undoHistory.length >= MAX_HISTORY_SIZE) {
        undoHistory.shift();
    }
    undoHistory.push(draw_ctx.getImageData(0, 0, draw_canvas.width, draw_canvas.height));
}

function undo() {
    if (undoHistory.length > 0) {
        // Pop the last state from the history and restore it
        const lastState = undoHistory.pop();
        draw_ctx.putImageData(lastState, 0, 0);
    } else {
        console.log("No more undo steps available.");
    }
}