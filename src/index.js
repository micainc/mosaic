var mouseX = 0;
var mouseY = 0;
var scrollX = 0;
var scrollY = 0;
leftClicked = false;
rightClicked = false;
var drawSize = 20; // diameter
var drawPath = []
var drawAreas = []

var img = new Image();
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

var cursor = document.querySelector('.cursor');
cursor.style.width = drawSize+"px";
cursor.style.height = drawSize+"px";

var activeColour = "red" // opaque red
var floodQueue = []

function init() {
    ctx_draw.clearRect(0, 0, canvas_draw.width, canvas_draw.height);
    ctx_temp.fillStyle = "black"; // flood with black

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
        leftClicked = false;
        rightClicked =false;
        // doesn't matter what the draw path looks like, a drawn pixel will be without the boundaries returned by this function
        var res = findClosedLoops(drawPath);
        fillLoops(res[0], res[1])
        drawAreas.push(res[2])
        drawPath = []
    })
    canvas_draw.addEventListener("mouseleave", function(e) {
        leftClicked = false;
        rightClicked = false;
    })

    canvas_draw.addEventListener("dragenter", catchDrag);
    canvas_draw.addEventListener("dragover", catchDrag);
    canvas_draw.addEventListener("drop", dropFile);

    window.requestAnimationFrame(draw);
}

window.onscroll = function() {
    var doc = document.documentElement;
    scrollX = (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0);
    scrollY = (window.pageYOffset || doc.scrollTop)  - (doc.clientTop || 0);
}

//------------------------------------------------------ LOOP FINDING + FILLING FUNCTIONALITY ------------------------------------------------------//

function findClosedLoops(path) {
    var top = 1000000
    var bottom = -1
    var left = 1000000
    var right = -1 
    // in the case that the path in just a click
    for(i=0; i<path.length; i++) {
        console.log("PATH")
        if(path[i]['x'] > right) {
            right = Math.round(path[i]['x']);
        }
        if(path[i]['x'] < left) {
            left = Math.round(path[i]['x']);
        }
        if(path[i]['y'] > bottom) {
            bottom = Math.round(path[i]['y']);
        } 
        if(path[i]['y'] < top) {
            top = Math.round(path[i]['y']);
        }
    } 

    ctx_draw.fillStyle = "black"; // flood with black
    var i = 0;
    var loopCenters = []
    var nonCenters = []

    while(i<100) { // do i attempts before giving up
        var testX = Math.floor(Math.random()*(right-left) + left);
        var testY = Math.floor(Math.random()*(bottom-top) + top);
        var data = ctx_draw.getImageData(testX, testY, 1, 1).data;
        var col = rgbToColorName([data[0], data[1], data[2], Math.ceil(data[3]/255)])
        // if random point overlaps a border or a previously traversed area, skip  
        if(col !== activeColour && col !== "black") {
            // if the point was exterior (did not pass flood test, try new random point)
            if(floodFind(testX, testY, bottom, top, left, right)) {
                loopCenters.push({'x': testX, 'y': testY})
            } else {
                nonCenters.push({'x': testX, 'y': testY})
            }
        } 
        i++;
    }

    ctx_draw.fillStyle = activeColour; // reset 
    return [loopCenters, nonCenters, {'top': top-drawSize, 'left': left-drawSize, 'right':right+drawSize, 'bottom':bottom+drawSize, 'colour': activeColour}]

}

function floodFind(x, y, b, t, l ,r) {
    //console.log("FLOOD FIND STARTED")

    floodQueue = [{'x': x, 'y': y}]
    
    do {
        var px = floodQueue.shift()
        //console.log(px)
        x = px['x']
        y = px['y']

        var data = ctx_draw.getImageData(x, y, 1, 1).data;
        var col = rgbToColorName([data[0], data[1], data[2], Math.ceil(data[3]/255)])
        if (x < l || x >= r || y < t || y >= b) {
            //console.log("FLOOD FIND FAILED")
            return false; // check if x or y go out of bounds: then we are 'exterior': we break the loop, empty queue, and signal 
        }  else if(col !== activeColour && col !== "black") {
            // if the pixel at a point is not a boundary or previously traversed, then continue
            fillRegion(ctx_draw, x, y, 2) // mark as traversed
            // check the neighboring pixels by adding to queue
            floodQueue.push({'x': x - 2, 'y': y})
            floodQueue.push({'x': x + 1, 'y': y})
            floodQueue.push({'x': x, 'y': y - 2})
            floodQueue.push({'x': x, 'y': y + 1})
        } 

    } while(floodQueue.length != 0)
    //console.log("FLOOD FIND SUCCESSFUL")
    return true;
}

function circleIntersect(x0, y0, r0, x1, y1, r1) {
    return Math.hypot(x0 - x1, y0 - y1) <= r0 + r1;
}

function fillLoops(loops, duds) {
    for(l in loops) {
        floodFill(loops[l]['x'], loops[l]['y'])
    }

    for(d in duds) {
        floodClean(duds[d]['x'], duds[d]['y'])
    }
}

// image is a 2D array of pixel colors
// x and y are the coordinates of the starting pixel
function floodFill(x, y) {
    floodQueue = [{'x': x, 'y': y}]

    do {
        var px = floodQueue.shift()
        //console.log(px)
        x = px['x']
        y = px['y']

        var data = ctx_draw.getImageData(x, y, 1, 1).data;
        var col = rgbToColorName([data[0], data[1], data[2], Math.ceil(data[3]/255)])
        if(col === "black") {
            // if the pixel at a point is not a boundary or previously traversed, then continue
            fillRegion(ctx_draw, x, y, 2) // mark as traversed
            // check the neighboring pixels by adding to queue
            floodQueue.push({'x': x - 2, 'y': y})
            floodQueue.push({'x': x + 1, 'y': y})
            floodQueue.push({'x': x, 'y': y - 2})
            floodQueue.push({'x': x, 'y': y + 1})
        } else {
            fillRegion(ctx_draw, x, y, 2) // mark as traversed
        }

    } while(floodQueue.length != 0)
}


function floodClean(x, y) {
    floodQueue = [{'x': x, 'y': y}]

    do {
        var px = floodQueue.shift()
        //console.log(px)
        x = px['x']
        y = px['y']

        var data = ctx_draw.getImageData(x, y, 1, 1).data;
        var col = rgbToColorName([data[0], data[1], data[2], Math.ceil(data[3]/255)])
        if(col === "black") {
            // if the pixel at a point is not a boundary or previously traversed, then continue
            ctx_draw.clearRect(x-1, y-1, 2, 2)

            //fillRegion(x, y, 4) // mark as traversed
            // check the neighboring pixels by adding to queue
            floodQueue.push({'x': x - 2, 'y': y})
            floodQueue.push({'x': x + 1, 'y': y})
            floodQueue.push({'x': x, 'y': y - 2})
            floodQueue.push({'x': x, 'y': y + 1})
        } else if(col === "transparent")  {
            ctx_draw.clearRect(x-1, y-1, 2, 2)
        }

    } while(floodQueue.length != 0)
}

function fillRegion(canvas, x, y, size) {
    canvas.beginPath();
    canvas.fillRect(x-size/2, y-size/2, size, size);
    canvas.fill();
}

//------------------------------------------------------ CURSOR FUNCTIONALITY ------------------------------------------------------//


window.addEventListener('mousemove', (event) => {
    const rect = canvas_image.getBoundingClientRect()
    mouseX = Math.round((event.clientX - rect.left) * canvas_image.width / canvas_image.clientWidth);
    mouseY = Math.round((event.clientY - rect.top) * canvas_image.height / canvas_image.clientHeight);
    cursor.style.transform = `translate(${event.clientX + scrollX - drawSize/2}px, ${event.clientY + scrollY - drawSize/2}px)`;
    //console.log("x: " + mouseX + " y: " + mouseY)
    if(leftClicked){
        drawPath.push({x: mouseX, y: mouseY})
    }
    //$('#coords').text(mouseX + ", " + mouseY)
})

document.getElementById('cursor-size-slider').addEventListener('input', function(e) {
    //console.log("sliding: ", e.target.value)
    drawSize = e.target.value;
    cursor.style.width = drawSize+"px";
    cursor.style.height = drawSize+"px";
})


//------------------------------------------------------ LOAD FUNCTIONALITY ------------------------------------------------------//

function catchDrag(event) {
	event.dataTransfer.dropEffect = "copy"
	event.preventDefault();
}

function dropFile(event) {
    event.preventDefault();
    if(event.dataTransfer)
        if(event.dataTransfer.files)
            procFile(event.dataTransfer.files[0]);
}

function procFile(file) {
    console.log("processing file " + file.name);
    console.log(file)
    img.src = file.path;
    img.title = file.name
    console.log(img.src)
    console.log(img.title)

    if(file.type === "image/tiff") {
        var reader = new FileReader();
        reader.onload = function (e) {
            var ifds = UTIF.decode(e.target.result);
            const timage = ifds[0]; // ifds is an array of IFDs (image file directories)
            UTIF.decodeImage(e.target.result, timage); // decoding pixel data
            const array = new Uint8ClampedArray(UTIF.toRGBA8(timage))
            const imageData = new ImageData(array, timage.width, timage.height);
            canvas_image.width = timage.width;
            canvas_image.height = timage.height;
            canvas_draw.width = timage.width;
            canvas_draw.height = timage.height;
            canvas_temp.width = timage.width;
            canvas_temp.height = timage.height;
            ctx_image.putImageData(imageData, 0, 0);
        }
        reader.readAsArrayBuffer(file);

    } else {
        img.onload = function () {
            canvas_image.width = img.width;
            canvas_image.height = img.height;
            canvas_draw.width = img.width;
            canvas_draw.height = img.height;
            canvas_temp.width = img.width;
            canvas_temp.height = img.height;
            ctx_image.drawImage(img, 0, 0);
        };
    }

    ctx_draw.clearRect(0, 0, canvas_draw.width, canvas_draw.height);
    drawAreas = []
    window.api.invoke('set_file_path', {'path': file.path, 'type': 'load_drag'})
    document.getElementById('parameters-filename').innerHTML = file.name

}

 //------------------------------------------------------ DRAW FUNCTIONALITY ------------------------------------------------------//


function draw() {
    //https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation
    //ctx.globalCompositeOperation = "copy";

    //ctx_draw.globalCompositeOperation = 'source-over';
    if(leftClicked) {
        ctx_draw.globalCompositeOperation = 'source-over'
        ctx_draw.beginPath();
        ctx_draw.fillStyle = activeColour; 
        ctx_draw.arc(mouseX, mouseY, (drawSize*(canvas_image.width / canvas_image.clientWidth))/2, 0, 2 * Math.PI, false);
        ctx_draw.fill();

    } else if(rightClicked) {
        ctx_draw.globalCompositeOperation = 'destination-out' // this clears the canvas
        ctx_draw.beginPath();
        ctx_draw.arc(mouseX, mouseY, (drawSize*(canvas_image.width / canvas_image.clientWidth))/2, 0, 2 * Math.PI, false);
        ctx_draw.fill();
    }
    /* else {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(0,0, 255, 128)";
        ctx.arc(mouseX, mouseY, 10, 0, 2 * Math.PI, false);
        ctx.stroke();
    }
    */

    window.requestAnimationFrame(draw);
}
  
init();

//------------------------------------------------------ SAVE FUNCTIONALITY ------------------------------------------------------//

// ctx is the canvas context
// x and y are the coordinates of the pixel
// r, g, b and a are the red, green, blue and alpha values of the color
/*
function setPixel(ctx, x, y, r, g, b, a) {
    // create a new image data object with a 1x1 size
    let imageData = ctx.createImageData(1, 1);
    // get the data array of the image data object
    let data = imageData.data;
    // set the color values for the pixel
    data[0] = r; // red
    data[1] = g; // green
    data[2] = b; // blue
    data[3] = a; // alpha
    // put the image data object at the specified coordinates
    ctx.putImageData(imageData, x, y);
  }
  */

/*
  1. Iterate through known areas where canvas has been painted
  2. find pixels that are not transparent. recalculate bounding crop for that shape, in case multiple drawpaths overlap to composite a final shape
  3. once final bounding box is computed, return x, y, width, height, and save mask and cropped image to png
*/
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
            var col = rgbToColorName([data[0], data[1], data[2], Math.ceil(data[3]/255)])

            var data2 = ctx_temp.getImageData(x, y, 1, 1).data;
            var col2 = rgbToColorName([data2[0], data2[1], data2[2], Math.ceil(data2[3]/255)])
            
            // found the shape
            console.log(" L: "+left+" R: "+ right+" T: "+top+" B: "+bottom)

            if(col === colour && col2 === "transparent") {
                console.log("FOUND: ", colour)
                // start with the original boundaries of shape 
                var newTop = top
                var newBottom = bottom
                var newLeft = left
                var newRight = right 

                floodQueue = [{'x': x, 'y': y}]
                do {
                    var px = floodQueue.shift()
                    //console.log(px)
                    x = px['x']
                    y = px['y']

                    // check the draw canvas
                    data = ctx_draw.getImageData(x, y, 1, 1).data;
                    col = rgbToColorName([data[0], data[1], data[2], Math.ceil(data[3]/255)])

                    // check the temp canvas
                    data2 = ctx_temp.getImageData(x, y, 1, 1).data;
                    col2 = rgbToColorName([data2[0], data2[1], data2[2], Math.ceil(data2[3]/255)])

                    // if the pixel is on the draw canvas and not on the temporary canvas, continue 
                    if(col === colour && col2 === "transparent") { 
                        // check the neighboring pixels by adding to queue
                        fillRegion(ctx_temp, x, y, 2)
                        floodQueue.push({'x': x - 2, 'y': y})
                        floodQueue.push({'x': x + 1, 'y': y})
                        floodQueue.push({'x': x, 'y': y - 2})
                        floodQueue.push({'x': x, 'y': y + 1})
                    } else {
                        fillRegion(ctx_temp, x, y, 2)
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
                var x_diff = Math.round((newRight-newLeft)*1.1 - (newRight-newLeft))
                var y_diff = Math.round((newBottom-newTop)*1.1 - (newBottom-newTop))
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
    window.api.invoke('set_file_path', {'path': img.src, 'type': 'save'})
        .then(() => {
            shapes.forEach(({ left, right, top, bottom, colour, index}) => {
                var type = "";
                if(colour == 'red') {
                    type = "cf_alive"
                } else if(colour == 'maroon') {
                    type = "cf_dead"
                } else if(colour == 'lime') {
                    type = "healthy_alive"
                } else if(colour == 'green') {
                    type = "healthy_dead"
                }
                console.log(colour+" "+type)
                canvas_temp.width = (right-left);
                canvas_temp.height = (bottom-top);

                console.log(left+" "+top+" "+right+" "+bottom)

                var crop = ctx_draw.getImageData(left, top, (right-left), (bottom-top))
                ctx_temp.putImageData(crop, 0, 0)

                let url = canvas_temp.toDataURL("image/png");
                console.log("FILE: ", img.src)
                window.api.invoke('save_map', {'url': url, 'file': img.src, 'id': "map_"+index+"_"+colour+"_"+type})
                    .then(function(res) {
                        console.log("RES: ", res); // will print "This worked!" to the browser console
                    }).catch(function(err) {
                        console.error("ERROR: ", err); // will print "This didn't work!" to the browser console.
                    });


                crop = ctx_image.getImageData(left, top, (right-left), (bottom-top))
                ctx_temp.putImageData(crop, 0, 0)

                url = canvas_temp.toDataURL("image/png");
                console.log("FILE: ",img.src)
                window.api.invoke('save_map', {'url': url, 'file': img.src, 'id': "crop_"+index+"_"+type})
                    .then(function(res) {
                        console.log("RES: ", res); // will print "This worked!" to the browser console
                    }).catch(function(err) {
                        console.error("ERROR: ", err); // will print "This didn't work!" to the browser console.
                    });
            });
            // after all files have been saved, reset the temp canvas to fit the image
            canvas_temp.width = canvas_image.width;
            canvas_temp.height = canvas_image.height;
        }).catch(function(err) {
            console.error("ERROR: ", err); // will print "This didn't work!" to the browser console.
        });
}

function changeColour(colour) {
    activeColour = colour;
    cursor.style.borderColor= activeColour;
    document.getElementById("cursor-size-slider").style.setProperty('--color', activeColour);
}