var originX = 0;
var originY = 0;
var zoom = false;

var mouseX = 0;
var mouseY = 0;
var scrollX = 0;
var scrollY = 0;
leftClicked = false;
rightClicked = false;
var drawDiameter = 10; // diameter
var drawPath = []
var loadouts = {}

const image_canvas = document.getElementById('image-canvas')
const draw_canvas = document.getElementById('draw-canvas')
const save_canvas = document.getElementById('temp-canvas')

image_canvas.width = window.innerWidth;
image_canvas.height = window.innerHeight;
draw_canvas.width = window.innerWidth;
draw_canvas.height = window.innerHeight;
save_canvas.width = window.innerWidth;
save_canvas.height = window.innerHeight;

var img_ctx = image_canvas.getContext('2d');
var draw_ctx = draw_canvas.getContext('2d');
var save_ctx = save_canvas.getContext('2d');

//draw_ctx.imageSmoothingEnabled= false
//save_ctx.imageSmoothingEnabled= false

var cursor = document.querySelector('.cursor');
cursor.style.width = drawDiameter+"px";
cursor.style.height = drawDiameter+"px";

var activeColour = "#FF0000" // opaque red
var floodStack = []

var images = {}
var currentImage = '';
var image_track_filled = new Set()

// Multi Image Classification And Segmentation : MICAS

function init() {
    draw_ctx.clearRect(0, 0, draw_canvas.width, draw_canvas.height);
    save_ctx.fillStyle = "#000000"; // flood with black

    //save_ctx.globalCompositeOperation = 'source-over'

    draw_canvas.addEventListener('mousedown', function(e) {
        if (e.button === 0) {
            leftClicked = true;
            // push starting point of draw path
            drawPath.push({x: mouseX, y: mouseY});
            var imageData = draw_ctx.getImageData(mouseX, mouseY, 1, 1);
            firstPixelForFill = imageData.data;
        } else if (e.button === 2 && !leftClicked) {
            rightClicked = true;
        }
    });

    draw_canvas.addEventListener('mouseup', function(e) {
        // doesn't matter what the draw path looks like, a drawn pixel will be without the boundaries returned by this function
        if(leftClicked) {
            switch (selectedTool) {
                case Tools.fill:
                    var points = goOutFromDrawPointsToFill(drawPath, draw_ctx)
                    fillPointsWithActiveColor(points)
                    break;
                case Tools.pencil:
                    if( drawPath.length < 2 ) { // if user just clicked, check if user wants to flood a shape

                        // clear the draw area first
                        draw_ctx.globalCompositeOperation = 'destination-out' // this clear the point first
                        fillPixelatedCircle(draw_ctx, mouseX, mouseY, Math.floor((drawDiameter*(image_canvas.width / image_canvas.clientWidth))/2)-1)
        
                        // then: either flood the area, or draw that erased point back
                        draw_ctx.globalCompositeOperation = 'source-over'
                        if(flood(mouseX, mouseY)) {
                            flood(mouseX, mouseY, activeColour)
                        } else {
                            fillPixelatedCircle(draw_ctx, mouseX, mouseY, Math.floor((drawDiameter*(image_canvas.width / image_canvas.clientWidth))/2)-1)
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
        switch (selectedTool) {
            case Tools.pencil:
                if(leftClicked) {
                    drawPath.push({x: mouseX, y: mouseY}); // finish drawPath
                    drawPath = fillGaps(drawPath); // algorithmically fills gaps in the draw path to create a solid continuous line 
                    /*
                    console.log("DRAW PATH: ", drawPath)
                    var loops = findLoopsInPath(drawPath, drawDiameter)         
                    console.log("LOOPS: ", loops)   
                    */
        
                    /*
                    var res = findClosedLoops(drawPath);
                    fillLoops(res[0])
                    */
                    
                }
                break;
            case Tools.fill:
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

    draw_canvas.addEventListener("dragenter", catchDrag);
    draw_canvas.addEventListener("dragover", catchDrag);
    draw_canvas.addEventListener("drop", dropFiles);
    document.addEventListener('keydown', function(event) {
        if (event.code === 'Space') {
            event.preventDefault()
            draw_canvas.style.opacity = '0';
        }
    });
    // Event listener for keyup
    document.addEventListener('keyup', function(event) {
        if (event.code === 'Space') {
            event.preventDefault()
            draw_canvas.style.opacity = '0.5';
        }
    });

    function updateCursor(event) {
        const rect = image_canvas.getBoundingClientRect();
        
        // Calculate the adjusted mouseX and mouseY with respect to the canvas's position and scale.
        mouseX = Math.round((event.clientX - rect.left) * image_canvas.width / image_canvas.clientWidth);
        mouseY = Math.round((event.clientY - rect.top) * image_canvas.height / image_canvas.clientHeight);
        
        // Update the cursor's position.
        cursor.style.transform = `translate(${event.clientX + window.scrollX - drawDiameter/2}px, ${event.clientY + window.scrollY - drawDiameter/2}px)`;
    
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
    
        // Update coordinates text.
        $('#coords').text(mouseX + ", " + mouseY);
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
        setLoadoutList(loadouts)
        /*
        for (var [loadout] of Object.entries(loadouts) ) {
            $("#loadouts > select").append('<option value='+loadout+'>'+loadouts[loadout]['name']+'</option>');
        }
        // populate the labels list with the first loadout
        for (const [label, label_data] of Object.entries(Object.values(loadouts)[0]['labels'])) {
            $("#labels > select").append('<option value='+label+'>'+label_data['name']+'</option>');
        }
        initializeItemList(changeColour, document.getElementById('loadouts'));
        initializeItemList(changeColour, document.getElementById('labels'));
        */

    }).catch(function(err) {
        console.error("ERROR: ", err); // will print "This didn't work!" to the browser console.
    });

    window.requestAnimationFrame(draw);
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
        fillRegion(draw_ctx, x, y)
        draw_ctx.fillStyle = activeColour
    }
}

function fillGaps(path) {
    draw_ctx.fillStyle = activeColour;
    draw_ctx.imageSmoothingEnabled = false; // Disable anti-aliasing to draw sharp circles

    // Calculate line width based on draw size and scaling factor, ensure it's not anti-aliased
    const lineWidth = Math.ceil(drawDiameter * (image_canvas.width / image_canvas.clientWidth));

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

function fillPixelatedCircle(ctx, cx, cy, r){
    r |= 0; // floor radius
    ctx.setTransform(1,0,0,1,0,0); // ensure default transform
    var x = r, y = 0, dx = 1, dy = 1;
    var err = dx - (r << 1);
    var x0 = cx - 1| 0, y0 = cy | 0;
    var lx = x,ly = y;
    ctx.beginPath();
    while (x >= y) {
        ctx.rect(x0 - x, y0 + y, x * 2 + 2, 1);
        ctx.rect(x0 - x, y0 - y, x * 2 + 2, 1);
        if (x !== lx){
            ctx.rect(x0 - ly, y0 - lx, ly * 2 + 2, 1);
            ctx.rect(x0 - ly, y0 + lx, ly * 2 + 2, 1);
        }
        lx = x;
        ly = y;
        y++;
        err += dy;
        dy += 2;
        if (err > 0) {
            x--;
            dx += 2;
            err += (-r << 1) + dx;
        }
    }
    if (x !== lx) {
        ctx.rect(x0 - ly, y0 - lx, ly * 2 + 1, 1);
        ctx.rect(x0 - ly, y0 + lx, ly * 2 + 1, 1);
    }    
    ctx.fill();
}

//------------------------------------------------------ LOOP FINDING + FILLING FUNCTIONALITY ------------------------------------------------------//
function findLoopsInPath(path, margin) {

    // Helper function to check if two points collide considering line width
    function pointsCollide(p1, p2, diameter) {
        let dx = p1.x - p2.x;
        let dy = p1.y - p2.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        return Math.floor(distance) <= diameter+2; // Check within double the radius for overlapping
    }

    // Helper function to get points in a loop from start to end index
    function getLoopPoints(startIndex, endIndex, path) {
        let loopPoints = [];
        for (let i = startIndex; i <= endIndex; i++) {
            loopPoints.push(path[i]);
        }
        return loopPoints;
    }

    let loops = []; // Store all the loops found
    
    // Iterate over each point in the path except the last one
    for (let i = 0; i < path.length - 1; i++) {
        // if a point goes from touching, to not touching, to touching, we are in business
        var neighbours = true; // assume next point in path will be neighbour

        var i0 = 0; 
        
        // FIRST get away from the reference point
        for (let j = i + 1; j < path.length; j++) {
            //... base case: points collide and neighbors == 1... just continue
            if(pointsCollide(path[i], path[j], margin)) {
                if(!neighbours) {
                    loops.push(getLoopPoints(i, j, path));
                    i = i0;
                    j = i0 + 1;
                    break;
                }
            } else if(neighbours) {  // if points DIDNT collide and neighbours is still set to true
                neighbours = false;
                i0 = j; // set point at which we will continue out algorithm from should we complete a loop
            }

        }

    }

    return loops; // Return all loops found
}


function findClosedLoops(path) {
    var boundingBox = getBoundingBox(path);
    
    console.log(boundingBox)
    var loopCenters = [];
    var rows = 7;
    var cols = 7;
    var cellWidth = (boundingBox.right - boundingBox.left) / cols;
    var cellHeight = (boundingBox.bottom - boundingBox.top) / rows;

    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            var testX = Math.floor(boundingBox.left + c * cellWidth + cellWidth / 2);
            var testY = Math.floor(boundingBox.top + r * cellHeight + cellHeight / 2);

            var data = draw_ctx.getImageData(testX, testY, 1, 1).data;
            var col = rgbToHex(data[0], data[1], data[2]);

            // if canvas not painted
            if (col != activeColour) {
                const start = Date.now();

                if (flood(testX, testY)) { 
                    const end = Date.now();
                    console.log(`LOOP FIND EXECUTION TIME: ${end - start} ms`);
                    loopCenters.push({ 'x': testX, 'y': testY });
                }
            }
        }
    }

    return [loopCenters, {
        'top': boundingBox.top - drawDiameter,
        'left': boundingBox.left - drawDiameter,
        'right': boundingBox.right + drawDiameter,
        'bottom': boundingBox.bottom + drawDiameter,
        'colour': activeColour
    }];
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

    let activeColourValue = activeColour.startsWith("#") ? activeColour.slice(1) : activeColour;
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
            fillRegion(draw_ctx, x, y);
        }
    }

    return interior;
}

function fillLoops(loops) {
    for(l in loops) { // fill areas
        const start = Date.now();
        flood(loops[l]['x'], loops[l]['y'], activeColour)

        const end = Date.now();
        console.log(`LOOP FLOOD EXECUTION TIME: ${end - start} ms`);
    }
}

function fillRegion(canvas, x, y) {
    canvas.beginPath();
    canvas.fillRect(x-1, y-1, 3, 3);
    canvas.fill();
}

//------------------------------------------------------ PARAM LISTENER FUNCTIONALITY ------------------------------------------------------//

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

function toggleZoom() {
    console.log(zoom)
    zoom = !zoom;
    if(zoom) {
        $("#zoom-img").attr("src","./images/zoom_2.png");
        $(".mapier-canvas").css({"width":"max-content"});
    } else {
        $("#zoom-img").attr("src","./images/zoom_1.png");
        $(".mapier-canvas").css({"width":"100%"});
        window.scrollTo(0, 0)
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
    should_erase_draw_layer = true
    dimensions_set = false;
    event.preventDefault();
    if (event.dataTransfer && event.dataTransfer.files) {
        const files = Array.from(event.dataTransfer.files);
        const imagePromises = files.map(file => {
            if (file.name.includes("edge_map") || file.name.includes("segmentation_map")) {
                should_erase_draw_layer = false
                return processEdgeOrSegmentationMap(file);
            } else {
                return processImageFile(file);
            }
        });

        Promise.all(imagePromises).then(() => {
            updateCurrentImage();
        });
    }
}


function processEdgeOrSegmentationMap(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                if (file.name.includes("edge_map")) {
                    processEdgeMap(img);
                } else {
                    draw_ctx.drawImage(img, 0, 0);
                }
                resolve();
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function processEdgeMap(img) {
    const offscreenCanvas = document.createElement('canvas');
    if(!dimensions_set) {
        image_canvas.width = img.width;
        image_canvas.height = img.height;
        draw_canvas.width = img.width;
        draw_canvas.height = img.height;
        save_canvas.width = img.width;
        save_canvas.height = img.height;
        offscreenCanvas.width = img.width;
        offscreenCanvas.height = img.height;
        dimensions_set = true;
    }
    const offscreenCtx = offscreenCanvas.getContext('2d');
    offscreenCtx.drawImage(img, 0, 0);

    const imageData = offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        if (data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255) {
            setTransparentNeighbors(i, data, offscreenCanvas.width);
        } else if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0) {
            data[i] = data[i + 1] = data[i + 2] = 128;
        }
    }

    offscreenCtx.putImageData(imageData, 0, 0);
    draw_ctx.drawImage(offscreenCanvas, 0, 0);
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
    return new Promise((resolve, reject) => {
        const img = new Image();
        console.log(file)
        img.onload = function() {
            console.log("CREATING IMAGE: ", file)
            if(!dimensions_set) {
                image_canvas.width = img.width;
                image_canvas.height = img.height;
                draw_canvas.width = img.width;
                draw_canvas.height = img.height;
                save_canvas.width = img.width;
                save_canvas.height = img.height;
                dimensions_set = true;
            }

            img_ctx.drawImage(img, 0, 0, img.width, img.height);
            const imageData = img_ctx.getImageData(0, 0, img.width, img.height);

            images[file.name] = {
                data: imageData,
                src: file.path
            };

            resolve();
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

function updateCurrentImage() {
    const imageKeys = Object.keys(images);
    if (imageKeys.length > 0) {
        currentImage = imageKeys[0];
        document.getElementById('parameters-filename').textContent = currentImage;
        img_ctx.putImageData(images[currentImage].data, 0, 0);
    } else {
        currentImage = '';
        document.getElementById('parameters-filename').textContent = '';
        img_ctx.clearRect(0, 0, image_canvas.width, image_canvas.height);
        should_erase_draw_layer ? draw_ctx.clearRect(0, 0, draw_canvas.width, draw_canvas.height) : null;
    }
}

function cycleImage(dir) {
    const keys = Object.keys(images);
    const idx = keys.indexOf(currentImage);
    const newIdx = (idx + dir + keys.length) % keys.length;
    currentImage = keys[newIdx];

    img_ctx.clearRect(0, 0, image_canvas.width, image_canvas.height);
    img_ctx.putImageData(images[currentImage].data, 0, 0);
    document.getElementById('parameters-filename').textContent = currentImage;
}


function draw() {
    //https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation
    //ctx.globalCompositeOperation = "copy";

    //draw_ctx.globalCompositeOperation = 'source-over';
    switch (selectedTool) {
        case Tools.pencil:
            if(leftClicked) {
                draw_ctx.globalCompositeOperation = 'source-over'
                draw_ctx.fillStyle = activeColour; 
                fillPixelatedCircle(draw_ctx, mouseX, mouseY, Math.floor((drawDiameter*(image_canvas.width / image_canvas.clientWidth))/2)-1)

            } else if(rightClicked) {
                draw_ctx.globalCompositeOperation = 'destination-out' // this clears the canvas
                fillPixelatedCircle(draw_ctx, mouseX, mouseY, Math.floor((drawDiameter*(image_canvas.width / image_canvas.clientWidth))/2)-1)
            }
            break;
        case Tools.fill:
            break
        default:
            break;
    }
    window.requestAnimationFrame(draw);
}
  
init();

//------------------------------------------------------ SAVE FUNCTIONALITY ------------------------------------------------------//

var regions = []

function findRegions() {
    const visited = new Set();
    const getKey = (x, y) => `${x},${y}`;
    let width = draw_canvas.width;
    let height = draw_canvas.height;
    // Retrieve the full image data just once
    const imageData = draw_ctx.getImageData(0, 0, width, height);
    const buffer32 = new Uint32Array(imageData.data.buffer); // Use a 32-bit buffer for performance


    regions = []

    // try almost all points on canvas.
    for(var i = 0; i< width; i+=4) {
        for(var j = 0; j< height; j+=4) {
            if (visited.has(getKey(i, j))) continue;
            else {
                // get starting pixel
                const index = j * width + i;
                const regionColour = buffer32[index]; // format:ABGR. If transparent: 00000000
                //console.log("REGION COLOUR: ", regionColour)
                
                
                // if transparent pixel or colour is grey (#808080, 128 128 128), skip
                if(regionColour === 0 || regionColour === 4286611584) {
                    visited.add(getKey(i, j)); // if canvas pixel is transparent, SKIP
                    continue;

                } else {
                    var top = j-1
                    var bottom = j+1
                    var left = i-1
                    var right = i+1

                    // start the flood!
                    const floodStack = [{ x: i, y: j }];

                    while (floodStack.length > 0) {
                        const p = floodStack.pop();
                        const { x, y } = p;
                        if (x < 0 || y < 0 || x >= width || y >= height) {
                            continue; // Skip out-of-bounds points
                        }
                        // if pixel untraversed AND NOT transparent and same colour as FIRST explored pixel 
                        if (!visited.has(getKey(x, y)) && buffer32[y * width + x] === regionColour) {
                            floodStack.push({ x: x - 2, y: y });
                            floodStack.push({ x: x + 2, y: y });
                            floodStack.push({ x: x, y: y - 2 });
                            floodStack.push({ x: x, y: y + 2 });
                            if (x > right) right = x;
                            if (x < left) left = x;
                            if (y > bottom) bottom = y;
                            if (y < top) top = y;
                        }
                        visited.add(getKey(x, y));
                    }

                    //when floodstack done : establish minimum size of new region
                    // increase box size by 10% 
                    var buffer = 10; //Math.max(10, Math.round(Math.min(right - left, bottom - top) * 0.1));

                    regions.push({'top': top-buffer, 'left': left-buffer, 'right':right+buffer, 'bottom':bottom+buffer, 'colour': regionColour, 'index': regions.length})
                }
            }
        }
    }
    console.log("FOUND REGIONS ("+regions.length+"): ", regions)
    saveRegions()

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

function getParentFolder(path) {
    // Extract the parent folder name from a path, handling both Windows and Unix paths
    const segments = path.split(/[/\\]/);
    if (segments.length > 1) {
        return segments[segments.length - 2]; // Second to last item is the parent folder name
    }
    return ''; // Return empty string if no parent folder is found
}

function saveRegions() {
    // get immediate parent folder of images: if all images are in the same folder, use that as the identifier
    console.log("SAVING REGIONS...")
    console.log("IMAGES: ", images)
    var filenames = []
    var parent_folder = []
    Object.keys(images).map( (key) => {
        filenames.push(getFilename(images[key]['src']).trim().toLowerCase()) 
        parent_folder.push(getParentFolder(images[key]['src']).trim().toLowerCase()) 
    });
    console.log("IMAGE FILENAMES: ", filenames)
    console.log("PARENT FOLDER: ", images)

    var identifier = getCommonSubstring(filenames).replace(/^_+|_+$/g, '')
    if (identifier === '') {
        identifier = getCommonSubstring(parent_folder).replace(/^_+|_+$/g, '')// trim trailing/leading whitespace and underscores
    }
    // identifier is a short, common name shared by this current image set. ex 'w15'
    console.log("IDENTIFIER: ", identifier)
    
    window.api.invoke('set_file_path', {'path': images[currentImage]['src'], 'type': 'save'})
        .then(() => {
            var rgbs = {}
            // convert drawColors to RGB -> compare with pixels
            for(var c = 0; c < drawColors.length; c++) {
                var rgb = hexToRGB(drawColors[c])
                rgbs[c] = rgb
            }
            console.log("RGBs: ", rgbs)
            regions.forEach(({ left, right, top, bottom, colour, index}) => {
                save_canvas.width = (right-left);
                save_canvas.height = (bottom-top);
                console.log(" REGION " + index+ ": | "+colour+" | "+ save_canvas.width +"x"+save_canvas.height)

                var crop = draw_ctx.getImageData(left, top, (right-left), (bottom-top))
                var cropData = crop.data;

                // use the opacity (A) channel to store up to 255 different class values, where class = 255-A.
                // get each pixel value; convert opacity value to (255 - index)

                for(var i = 0; i < cropData.length; i+=4) {
                    for(var c = 0; c < drawColors.length; c++){
                        if((rgbs[c]['r'] === cropData[i]) && (rgbs[c]['g'] === cropData[i+1]) && (rgbs[c]['b'] === cropData[i+2])) {
                            cropData[i+3] = 254 - c // reserve 255 (full opacity) for (ironically) the EMPTY class!!
                            break
                        }
                    }
                }
                // first we save the draw layer...
                save_ctx.putImageData(crop, 0, 0)
                let data = save_canvas.toDataURL("image/png");
                window.api.invoke('save_crop', {'data': data, 'absolute_path': images[currentImage]['src'], 'identifier':identifier, 'type': 'map', 'idx': index})

                //... then we save every other image layer...
                saveSegmentLayers(left, top, right, bottom, index, identifier)
            });

            //... then we save the entire draw layer for a save state:
            var draw_data = draw_canvas.toDataURL("image/png");
            window.api.invoke('save_crop', {'data': draw_data, 'absolute_path': '', 'identifier':identifier, 'type': 'segmentation_map', 'idx': ''})

            // ... finally we save a copy of the draw layer overlaid on each image layer:
            for (let i = 0; i < Object.keys(images).length; i++) {
                const key = Object.keys(images)[i];
                if (images[key] && images[key]['data']) {
                    // Load image data onto main canvas
                    save_canvas.width = image_canvas.width;
                    save_canvas.height = image_canvas.height;
                    save_ctx.putImageData(images[key]['data'], 0, 0);

                    save_ctx.globalAlpha = 0.5;

                    // Draw the 'draw' layer onto the temp canvas
                    save_ctx.drawImage(draw_canvas, 0, 0);
                
                    // Reset global alpha if necessary
                    save_ctx.globalAlpha = 1.0;
                    
                    // Convert the temp canvas data to DataURL
                    const data = save_canvas.toDataURL("image/png");
                    
                    // Save it
                    window.api.invoke('save_crop', {
                        'data': data,
                        'absolute_path': images[key]['src'], // pass in the reference
                        'type': 'overlay',
                        'idx': '',
                        'identifier': identifier
                    });
                } else {
                    console.error("Image data for " + key + " is not available.");
                }
            }

            // after all files have been saved, reset the temp canvas to fit the image
            save_canvas.width = image_canvas.width;
            save_canvas.height = image_canvas.height;
        }).catch(function(err) {
            console.error("ERROR: ", err); // will print "This didn't work!" to the browser console.
        });
}


function saveSegmentLayers(left, top, right, bottom, index, identifier) {
    console.log("SAVING " + identifier + " | SEGMENT LAYERS: ")
    const keys = Object.keys(images);

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        
        // Check if image data for the key exists
        if (images[key] && images[key]['data']) {
            // Load image data onto main canvas
            img_ctx.putImageData(images[key]['data'], 0, 0);

            // Crop to segment boundary
            const crop = img_ctx.getImageData(left, top, (right-left), (bottom-top));
            
            // Place the cropped data onto the temp canvas
            save_ctx.putImageData(crop, 0, 0);
            
            // Convert the temp canvas data to DataURL
            const data = save_canvas.toDataURL("image/png");
            
            // Save it
            window.api.invoke('save_crop', {
                'data': data,
                'absolute_path': images[key]['src'],
                'type': 'img',
                'idx': index,
                'identifier': identifier
            });
        } else {
            console.error("Image data for " + key + " is not available.");
        }

    }

    console.log("COMPLETED SAVING CROPPED IMAGES.")

}

function changeColour(colour) {
    activeColour = colour;
    cursor.style.borderColor= activeColour;
    document.getElementById("cursor-size-slider").style.setProperty('--color', activeColour);
}

function fillPointsWithActiveColor(points) {
    draw_ctx.fillStyle = activeColour
    points.forEach(point => {
        draw_ctx.fillRect(point.x, point.y, 1, 1);
    });
}
