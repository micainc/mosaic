var originX = 0;
var originY = 0;
var zoom = false;

var mouseX = 0;
var mouseY = 0;
var scrollX = 0;
var scrollY = 0;
leftClicked = false;
rightClicked = false;
var drawSize = 10; // diameter
var drawPath = []
var drawAreas = []
var loadouts = {}

var timestamp = 0;

const canvas_image = document.getElementById('canvas-image')
const canvas_draw = document.getElementById('canvas-draw')
const canvas_temp = document.getElementById('canvas-temp')

canvas_image.width = window.innerWidth;
canvas_image.height = window.innerHeight;
canvas_draw.width = window.innerWidth;
canvas_draw.height = window.innerHeight;
canvas_temp.width = window.innerWidth;
canvas_temp.height = window.innerHeight;

var ctx_image = canvas_image.getContext('2d');
var ctx_draw = canvas_draw.getContext('2d');
var ctx_temp = canvas_temp.getContext('2d');

ctx_draw.imageSmoothingEnabled= false
ctx_temp.imageSmoothingEnabled= false

var cursor = document.querySelector('.cursor');
cursor.style.width = drawSize+"px";
cursor.style.height = drawSize+"px";

var activeColour = "#FF0000" // opaque red
var floodQueue = []

var images = {}
var currentImage = '';

function init() {
    ctx_draw.clearRect(0, 0, canvas_draw.width, canvas_draw.height);
    ctx_temp.fillStyle = "#000000"; // flood with black

    //ctx_temp.globalCompositeOperation = 'source-over'

    canvas_draw.addEventListener('mousedown', function(e) {
        if(e.button == 0){
            leftClicked = true;
            drawPath.push({x: mouseX, y: mouseY})

        } else if(e.button == 2) {
            rightClicked =true;
        }
    })
    canvas_draw.addEventListener('mouseup', function(e) {
        // doesn't matter what the draw path looks like, a drawn pixel will be without the boundaries returned by this function
        if(leftClicked) {
            ctx_draw.closePath()
            fillGaps(drawPath); // fills gaps in the drawing of a loop due to lag
            var res = findClosedLoops(drawPath);
            fillLoops(res[0])
            drawAreas.push(res[2])
            drawPath = []
        }
        leftClicked = false;
        rightClicked =false;
    })

    canvas_draw.addEventListener("mouseleave", function(e) {
        leftClicked = false;
        rightClicked = false;
    })

    canvas_draw.addEventListener("mouseleave", function(e) {
        leftClicked = false;
        rightClicked = false;
    })

    canvas_draw.addEventListener("dragenter", catchDrag);
    canvas_draw.addEventListener("dragover", catchDrag);
    canvas_draw.addEventListener("drop", dropFiles);


    function updateCursor(event) {
        const rect = canvas_image.getBoundingClientRect();
        
        scrollX = -rect.left;
        scrollY = -rect.top;

        // Calculate the adjusted mouseX and mouseY with respect to the canvas's position and scale.
        mouseX = Math.round((event.clientX - rect.left) * canvas_image.width / canvas_image.clientWidth);
        mouseY = Math.round((event.clientY - rect.top) * canvas_image.height / canvas_image.clientHeight);
    
        // Update the cursor's position.
        cursor.style.transform = `translate(${event.clientX + scrollX - drawSize/2}px, ${event.clientY + scrollY - drawSize/2}px)`;
    
        // If the mouse is being pressed, add the point to the drawPath.
        if(leftClicked) {
            drawPath.push({x: mouseX, y: mouseY});
        }
    
        // Update coordinates text.
        $('#coords').text(mouseX + ", " + mouseY);
    }
    
    window.addEventListener('mousemove', (event) => {
        console.log("MOVE")
        updateCursor(event);
    });
    
    window.addEventListener('scroll', (event) => {
        console.log("SCROLL")
        updateCursor(event);
    });

    // get & populate with first loadout
    window.api.invoke('get_loadouts')
    .then(function(loadouts) {
        for (const [loadout] of Object.entries(loadouts) ) {
            $("#loadouts > select").append('<option value='+loadout+'>'+loadouts[loadout]['name']+'</option>');
        }
        // populate the labels list with only the first loadout
        for (const [label, label_data] of Object.entries(Object.values(loadouts)[0]['labels'])) {
            $("#labels > select").append('<option value='+label+'>'+label_data['name']+'</option>');
        }
        initializeItemList(changeColour, document.getElementById('loadouts'));
        initializeItemList(changeColour, document.getElementById('labels'));

    }).catch(function(err) {
        console.error("ERROR: ", err); // will print "This didn't work!" to the browser console.
    });

    window.requestAnimationFrame(draw);
}

function fillGaps(path) {
    ctx_draw.fillStyle = activeColour;
  
    for(var i = 0; i < path.length - 1; i++) {
        // Original points
        const x1 = path[i]['x'];
        const y1 = path[i]['y'];
        const x2 = path[i+1]['x'];
        const y2 = path[i+1]['y'];

        // Interpolate at 1/3 distance between x1,y1 and x2,y2
        const new_x1 = Math.round(x1 + (x2 - x1) * 1/3);
        const new_y1 = Math.round(y1 + (y2 - y1) * 1/3);

        // Interpolate at 2/3 distance between x1,y1 and x2,y2
        const new_x2 = Math.round(x1 + (x2 - x1) * 2/3);
        const new_y2 = Math.round(y1 + (y2 - y1) * 2/3);

        // Draw the circles at these new interpolated points
        const radius = Math.floor((drawSize * (canvas_image.width / canvas_image.clientWidth)) / 2) - 1;
        fillPixelatedCircle(ctx_draw, new_x1, new_y1, radius);
        fillPixelatedCircle(ctx_draw, new_x2, new_y2, radius);
    }
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


function findClosedLoops(path) {
    var boundingBox = getBoundingBox(path);
    
    console.log(boundingBox)
    var loopCenters = [];
    var nonCenters = [];
    var rows = 7;
    var cols = 7;
    var cellWidth = (boundingBox.right - boundingBox.left) / cols;
    var cellHeight = (boundingBox.bottom - boundingBox.top) / rows;

    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            var testX = Math.floor(boundingBox.left + c * cellWidth + cellWidth / 2);
            var testY = Math.floor(boundingBox.top + r * cellHeight + cellHeight / 2);

            var data = ctx_draw.getImageData(testX, testY, 1, 1).data;
            var col = rgbToHex(data[0], data[1], data[2]);

            var data2 = ctx_temp.getImageData(testX, testY, 1, 1).data;

            // if canvas not painted and traverse canvas not traversed
            if (col != activeColour && data2[3] === 0) {
                //const start = Date.now();

                if (floodFindInterior(testX, testY, boundingBox.bottom, boundingBox.top, boundingBox.left, boundingBox.right)) {
                    //const end = Date.now();
                    //console.log(`EXECUTION TIME: ${end - start} ms`);
                    loopCenters.push({ 'x': testX, 'y': testY });
                }

            }
        }
    }

    return [loopCenters, nonCenters, {
        'top': boundingBox.top - drawSize,
        'left': boundingBox.left - drawSize,
        'right': boundingBox.right + drawSize,
        'bottom': boundingBox.bottom + drawSize,
        'colour': activeColour
    }];
}


function getBoundingBox(path) {
    var halfDrawSize = Math.ceil(drawSize / 2);
    var top = Infinity;
    var bottom = -Infinity;
    var left = Infinity;
    var right = -Infinity;

    for (var i = 0; i < path.length; i++) {
        var px = path[i]['x'];
        var py = path[i]['y'];

        top = Math.min(top, py - halfDrawSize);
        bottom = Math.max(bottom, py + halfDrawSize);
        left = Math.min(left, px - halfDrawSize);
        right = Math.max(right, px + halfDrawSize);
    }

    return {
        'top': Math.max(top, 0),
        'left': Math.max(left, 0),
        'right': Math.min(right, canvas_draw.width - 1),
        'bottom': Math.min(bottom, canvas_draw.height - 1)
    };
}

function floodFindInterior(x1, y1, b, t, l, r) {
    const visited = new Set();
    const floodQueue = [{ x: x1, y: y1 }];
    const directions = [{ dx: -2, dy: 0 }, { dx: 2, dy: 0 }, { dx: 0, dy: -2 }, { dx: 0, dy: 2 }];
    let isInterior = true;
  
    const getKey = (x, y) => `${x},${y}`;
  
    while (floodQueue.length > 0) {
      const { x, y } = floodQueue.shift();
  
      if (visited.has(getKey(x, y))) continue;
  
      visited.add(getKey(x, y));
  
      if (x <= l || x >= r || y <= t || y >= b) {
        isInterior = false;
        continue;
      }
  
      const dataT = ctx_temp.getImageData(x, y, 1, 1).data;
      if (dataT[3] >= 255) continue;
  
      const data = ctx_draw.getImageData(x, y, 1, 1).data;
      if (rgbToHex(data[0], data[1], data[2]) !== activeColour) {
        fillRegion(ctx_temp, x, y);
        for (const { dx, dy } of directions) {
          floodQueue.push({ x: x + dx, y: y + dy });
        }
      }
    }
  
    return isInterior;
  }  


function circleIntersect(x0, y0, r0, x1, y1, r1) {
    return Math.hypot(x0 - x1, y0 - y1) <= r0 + r1;
}

function fillLoops(loops) {
    for(l in loops) { // fill areas
        const start = Date.now();
        flood(loops[l]['x'], loops[l]['y'], activeColour)

        const end = Date.now();
        console.log(`EXECUTION TIME: ${end - start} ms`);
    }
}

// Flood fills an area starting from (x1, y1) with the new color `newCol`.
// `image` is a 2D array of pixel colors.

function flood(x1, y1, newCol) {
    const visited = new Set();
    const floodQueue = [{ x: x1, y: y1 }];
    const getKey = (x, y) => `${x},${y}`;
  
    ctx_draw.fillStyle = newCol;
  
    while (floodQueue.length !== 0) {
      const p = floodQueue.shift();
      const { x, y } = p;
  
      if (visited.has(getKey(x, y))) continue;
  
      visited.add(getKey(x, y));
  
      const data = ctx_draw.getImageData(x, y, 1, 1).data;
      const col = rgbToHex(data[0], data[1], data[2]);
  
      if (col !== activeColour && x > 0 && y > 0 && x < canvas_draw.width && y < canvas_draw.height) {
        fillRegion(ctx_draw, x, y);
        
        floodQueue.push({ x: x - 2, y: y });
        floodQueue.push({ x: x + 2, y: y });
        floodQueue.push({ x: x, y: y - 2 });
        floodQueue.push({ x: x, y: y + 2 });
      }
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
    drawSize = Number(e.target.value);
    cursor.style.width = drawSize+"px";
    cursor.style.height = drawSize+"px";
})

document.getElementById('cursor-size-slider').addEventListener('input', function(e) {
    //console.log("sliding: ", e.target.value)
    drawSize = Number(e.target.value);
    cursor.style.width = drawSize+"px";
    cursor.style.height = drawSize+"px";
})



//------------------------------------------------------ LOAD DROPPED IMAGES ------------------------------------------------------//

function catchDrag(event) {
	event.dataTransfer.dropEffect = "copy"
	event.preventDefault();
    currentImage = '';
    images = {};
}

function dropFiles(event) {
    event.preventDefault();
    if(event.dataTransfer && event.dataTransfer.files) {
        const filePromises = [];
        for(var i = 0; i < event.dataTransfer.files.length; i++){
            filePromises.push(procFile(event.dataTransfer.files[i]));
        }
        
        Promise.all(filePromises).then(() => {
            setTimeout(function() {
                ctx_draw.clearRect(0, 0, canvas_draw.width, canvas_draw.height);
                drawAreas = []

                currentImage = Object.keys(images)[0]
                document.getElementById('parameters-filename').innerHTML = currentImage
                if (currentImage && images[currentImage] && images[currentImage]['data']) {
                    const imageData = images[currentImage]['data'];

                    // Use putImageData to draw ImageData
                    ctx_image.putImageData(imageData, 0, 0);
                } else {
                    console.error("Invalid currentImage:", currentImage);
                }
            }, 1000);
        });
    }
    timestamp = Date.now(); // need this for a unique identifier of mapier output (UNIX TIMESTAMP)
}

function nextImage() {
    console.log("NEXT IMAGE");
    console.log("IMAGES: ", images);
    var keys = Object.keys(images);
    var idx = keys.indexOf(currentImage);
    console.log("IDX: ", idx);

    if (idx >= keys.length - 1) {
        idx = 0; // Restart at idx = 0 when it has rotated through all images
    } else {
        idx++;
    }

    currentImage = keys[idx];
    console.log("CURRENT IMAGE: ", currentImage);
    ctx_image.clearRect(0, 0, canvas_image.width, canvas_image.height);
    
    // Check if currentImage exists in the images dictionary
    if (images[currentImage] && images[currentImage]['data']) {
        const imageData = images[currentImage]['data'];
        ctx_image.putImageData(imageData, 0, 0);
        document.getElementById('parameters-filename').innerHTML = currentImage;
    } else {
        console.error("Image data for " + currentImage + " is not available.");
    }
}

function procFile(file) {
    return new Promise((resolve, reject) => {

        //console.log("processing file " + file.name);
        //console.log(file)
 
        if(file.type === "image/tiff" || file.type === "image/tif") {
            // do something with tiff
        } else {
            var img = new Image();
            img.src = file.path;
            img.title = file.name;
            img.onload = function () {
                canvas_image.width = img.width;
                canvas_image.height = img.height;
                canvas_draw.width = img.width;
                canvas_draw.height = img.height;
                canvas_temp.width = img.width;
                canvas_temp.height = img.height;

                // Draw the image on the canvas to extract pixel data
                ctx_image.drawImage(img, 0, 0, img.width, img.height);
                var imageData = ctx_image.getImageData(0, 0, img.width, img.height);

                console.log("FILE NAME: ", file.name);
                images[file.name] = {'data': imageData, 'src': file.path};
            };
        }
        resolve();
    });
}

 //------------------------------------------------------ DRAW FUNCTIONALITY ------------------------------------------------------//


function draw() {
    //https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation
    //ctx.globalCompositeOperation = "copy";

    //ctx_draw.globalCompositeOperation = 'source-over';
    if(leftClicked) {
        $('#parameters').hide()
        ctx_draw.globalCompositeOperation = 'source-over'
        ctx_draw.fillStyle = activeColour; 
        fillPixelatedCircle(ctx_draw, mouseX, mouseY, Math.floor((drawSize*(canvas_image.width / canvas_image.clientWidth))/2)-1)

    } else if(rightClicked) {
        $('#parameters').hide()
        ctx_draw.globalCompositeOperation = 'destination-out' // this clears the canvas
        fillPixelatedCircle(ctx_draw, mouseX, mouseY, Math.floor((drawSize*(canvas_image.width / canvas_image.clientWidth))/2)-1)
    } else {
        $('#parameters').show()
    }
    window.requestAnimationFrame(draw);
}
  
init();

//------------------------------------------------------ SAVE FUNCTIONALITY ------------------------------------------------------//

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


function findShapes() {
    ctx_temp.clearRect(0, 0, canvas_temp.width, canvas_temp.height)   // clear the temp canvas after all shapes have been found. Placed here for debugging: allows one to view the shapes drawn to the temp canvas inbetween calls to download cropped images
    // reset temp canvas
    var data = '';
    var col = ''
    var shapes = []

    console.log("FINDING SHAPES. DRAW AREAS: ", drawAreas.length)
    drawAreas.forEach(({left, right, top, bottom, colour}) => {
   
        var i = 0;
        while(i < 50) { // i attempts to find seperate shapes within a draw area

            var x = Math.round(Math.random()*(right-left)+left) // test a random distribution of points in the draw area
            var y = Math.round(Math.random()*(bottom-top)+top) // test a random distribution of points in the draw area
            var data = ctx_draw.getImageData(x, y, 1, 1).data;
            var col = rgbToHex(data[0], data[1], data[2]) // get drawn colour category

            var data2 = ctx_temp.getImageData(x, y, 1, 1).data;
            var col2 = rgbToHex(data2[0], data2[1], data2[2])
            
            // flood a temporary canvas area with the new shape.
            if(col === colour && data2[3] === 0) {
                // found an untraversed shape in the current investigation area

                console.log("FOUND: ", colour)
                // starting boundaries are of the first found pixel -> expand outwards
                var newTop = y-1
                var newBottom = y+1
                var newLeft = x-1
                var newRight = x+1

                floodQueue = [{'x': x, 'y': y}]
                do {
                    var px = floodQueue.shift()
                    //console.log(px)
                    x = px['x']
                    y = px['y']

                    // check the draw canvas
                    data = ctx_draw.getImageData(x, y, 1, 1).data;
                    col = rgbToHex(data[0], data[1], data[2])

                    // check the temp canvas
                    data2 = ctx_temp.getImageData(x, y, 1, 1).data;
                    col2 = rgbToHex(data2[0], data2[1], data2[2])

                    // if the pixel is on the draw canvas and not on the temporary canvas, continue 
                    if(col === colour && data2[3] === 0) { 
                        // check the neighboring pixels by adding to queue
                        fillRegion(ctx_temp, x, y)
                        floodQueue.push({'x': x - 2, 'y': y})
                        floodQueue.push({'x': x + 2, 'y': y})
                        floodQueue.push({'x': x, 'y': y - 2})
                        floodQueue.push({'x': x, 'y': y + 2})
                        floodQueue.push({'x': x - 2, 'y': y - 2})
                        floodQueue.push({'x': x + 2, 'y': y + 2})
                        floodQueue.push({'x': x + 2, 'y': y - 2})
                        floodQueue.push({'x': x - 2, 'y': y + 2})
                    }
                                                        
                    if(x > newRight) {
                        newRight = Math.round(x);
                    } 
                    if(x < newLeft) {
                        newLeft = Math.round(x);
                    }
                    if(y > newBottom) {
                        newBottom = Math.round(y);
                    } 
                    if(y < newTop) {
                        newTop = Math.round(y);
                    }

                } while(floodQueue.length != 0)

                // increase box size by 10% 
                var x_diff = Math.round((newRight-newLeft)*0.1)
                var y_diff = Math.round((newBottom-newTop)*0.1)
                var buffer = 10
                
                if(x_diff < y_diff) {
                    buffer = x_diff
                } else {
                    buffer = y_diff
                }
                if(buffer < 10) {
                    buffer = 10
                }

                shapes.push({'top': newTop-buffer, 'left': newLeft-buffer, 'right':newRight+buffer, 'bottom':newBottom+buffer, 'colour': colour, 'index': shapes.length})
            } 
            i++;
        }
    })

    console.log("DOWNLOADING SHAPES: ")
    window.api.invoke('set_file_path', {'path': images[currentImage]['src'], 'type': 'save'})
        .then(() => {
            shapes.forEach(({ left, right, top, bottom, colour, index}) => {
                console.log(" ("+colour+"): "+ left+", "+top+", "+right+", "+bottom)
                canvas_temp.width = (right-left);
                canvas_temp.height = (bottom-top);

                var crop = ctx_draw.getImageData(left, top, (right-left), (bottom-top))
                var cropData = crop.data;

                //console.log(bgColors)
                var rgbs = {}
                // convert bgColors to RGB -> compare with pixels
                for(var c = 0; c< bgColors.length; c++) {
                    var rgb = hexToRgb(bgColors[c])
                    rgbs[c] = rgb
                }
                console.log("RGBs: ", rgbs)
                // use the opacity (A) channel to store up to 255 different values for classes, where class = 255-A.
                for(var i = 0; i < cropData.length; i+=4) {
                    for(var c = 0; c < bgColors.length; c++){
                        if((rgbs[c]['r'] === cropData[i]) && (rgbs[c]['g'] === cropData[i+1]) && (rgbs[c]['b'] === cropData[i+2])) {
                            cropData[i+3] = 254 - c
                            break
                        }
                    }
                    
                }
                ctx_temp.putImageData(crop, 0, 0)
                // get each pixel value; convert opacity value to (255 - index)
                let url = canvas_temp.toDataURL("image/png");
                console.log("INDEX: ", index)
                window.api.invoke('save_crop', {'url': url, 'file': images[currentImage]['src'], 'type': 'map', 'idx': index, 'timestamp': timestamp})
                saveCroppedImages(left, top, right, bottom, index)
            });
            // after all files have been saved, reset the temp canvas to fit the image
            canvas_temp.width = canvas_image.width;
            canvas_temp.height = canvas_image.height;
        }).catch(function(err) {
            console.error("ERROR: ", err); // will print "This didn't work!" to the browser console.
        });
}

function saveCroppedImages(left, top, right, bottom, index) {
    const keys = Object.keys(images);

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        
        // Check if image data for the key exists
        if (images[key] && images[key]['data']) {
            // Load image data onto main canvas
            ctx_image.putImageData(images[key]['data'], 0, 0);

            // Crop the required area
            const crop = ctx_image.getImageData(left, top, (right-left), (bottom-top));
            
            // Place the cropped data onto the temp canvas
            ctx_temp.putImageData(crop, 0, 0);
            
            // Convert the temp canvas data to DataURL
            const url = canvas_temp.toDataURL("image/png");
            
            // Save it
            window.api.invoke('save_crop', {
                'url': url,
                'file': images[key]['src'],
                'type': 'img',
                'idx': index,
                'timestamp': timestamp  // Assuming you want the current timestamp
            });
        } else {
            console.error("Image data for " + key + " is not available.");
        }
    }
}

function changeColour(colour) {
    activeColour = colour;
    cursor.style.borderColor= activeColour;
    document.getElementById("cursor-size-slider").style.setProperty('--color', activeColour);
}
