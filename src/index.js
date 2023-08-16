var originX = 0;
var originY = 0;
var zoom = false;

var mouseX = 0;
var mouseY = 0;
var scrollX = 0;
var scrollY = 0;
leftClicked = false;
rightClicked = false;
var drawSize = 20; // diameter
var drawPath = []
var drawAreas = []
var loadouts = {}

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

ctx_draw.imageSmoothingEnabled= false
ctx_temp.imageSmoothingEnabled= false

var cursor = document.querySelector('.cursor');
cursor.style.width = drawSize+"px";
cursor.style.height = drawSize+"px";

var activeColour = "#FF0000" // opaque red
var floodQueue = []

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
        ctx_draw.closePath()

        leftClicked = false;
        rightClicked =false;
        // doesn't matter what the draw path looks like, a drawn pixel will be without the boundaries returned by this function
        
        fillGaps(drawPath); // fills gaps in the drawing of a loop due to lag

        var res = findClosedLoops(drawPath);

        // returns: loop centers, not centers, 
        fillLoops(res[0], res[1])
        drawAreas.push(res[2])
        drawPath = []
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
    canvas_draw.addEventListener("drop", dropFile);


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

    /*
    window.onscroll = function(event) {
        console.log(event)
        const rect = canvas_image.getBoundingClientRect()
        scrollX = -rect.left;
        scrollY = -rect.top;
        mouseX = Math.round((event.clientX + scrollX) * canvas_image.width / canvas_image.clientWidth);
        mouseY = Math.round((event.clientY + scrollY) * canvas_image.height / canvas_image.clientHeight);

        cursor.style.transform = `translate(${mouseX - drawSize/2}px, ${mouseY - drawSize/2}px)`; // translate puts the cursor EXACTLY at these coordinates
        //console.log("x: " + mouseX + " y: " + mouseY)
        if(leftClicked){
            drawPath.push({x: mouseX, y: mouseY})
        }
        $('#coords').text(mouseX + ", " + mouseY)

    }
    */


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

    for(var i = 0; i < path.length-1; i++) {
        ctx_draw.fillStyle = activeColour; 
        var new_x = Math.round((path[i]['x'] + path[i+1]['x'])/2)
        var new_y = Math.round((path[i]['y'] + path[i+1]['y'])/2)
        fillPixelatedCircle(ctx_draw, new_x, new_y, Math.floor((drawSize*(canvas_image.width / canvas_image.clientWidth))/2)-1)
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
    var top = 1000000
    var bottom = -1
    var left = 1000000
    var right = -1 
    // in the case that the path in just a click

    var halfDrawSize = Math.ceil(drawSize/2)
    for(i=0; i<path.length; i++) {
        if(path[i]['x'] + halfDrawSize > right) {
            right = Math.round(path[i]['x'] + halfDrawSize) 
        }
        if(path[i]['x'] - halfDrawSize < left) {
            left = Math.round(path[i]['x'] - halfDrawSize);
        }
        if(path[i]['y'] + halfDrawSize > bottom) {
            bottom = Math.round(path[i]['y'] + halfDrawSize);
        } 
        if(path[i]['y'] - halfDrawSize < top) {
            top = Math.round(path[i]['y'] - halfDrawSize);
        }
    } 
    // make sure to only include pixels that are IN the canvas
    if(top < 0){
        top = 0;
    } 
    if(bottom > canvas_draw.height){
        bottom = canvas_draw.height-1;
    } 
    if(left < 0){
        left = 0;
    } 
    if(right > canvas_draw.width){
        right = canvas_draw.width-1;
    }

    var i = 0;
    var loopCenters = []
    var nonCenters = []

    // clear temp canvas before attempting floodFind on area
    ctx_temp.clearRect(left, top, right-left, bottom-top)
    console.log("FLAG: ("+top+" "+left+" "+bottom+" "+right+")")

    while(i<100) { // do i attempts before giving up
        var testX = Math.floor(Math.random()*(right-left) + left);
        var testY = Math.floor(Math.random()*(bottom-top) + top);
        var data = ctx_draw.getImageData(testX, testY, 1, 1).data;
        var col = rgbToHex(data[0], data[1], data[2])
        var dataT = ctx_temp.getImageData(testX, testY, 1, 1).data;
        // if random point is overtop a drawn or a traversed area, skip  
        // point is not black (traversed) and point is not the active colour

        if(col !== activeColour && (dataT[3] === 0) ) {
            if(floodFindInterior(testX, testY, bottom, top, left, right)) {
                loopCenters.push({'x': testX, 'y': testY})
            } else {
                nonCenters.push({'x': testX, 'y': testY}) // if the point was exterior (did not pass flood test, try new random point)
            }
        } 
        i++;
    }

    /*
    ctx_draw.fillStyle = '#00FF00'; // reset 
    ctx_draw.strokeStyle = '#00FF00'; // reset 
    for(var i = 0; i< loopCenters.length;i++) {
        fillRegion(ctx_draw, loopCenters[i]['x'],loopCenters[i]['y'], 3)
    }
    ctx_draw.strokeRect(left, top, right-left, bottom-top)
    ctx_draw.fillStyle = '#FF0000'; // reset 
    for(var i = 0; i< nonCenters.length;i++) {
        fillRegion(ctx_draw, nonCenters[i]['x'],nonCenters[i]['y'], 3)
    }
    ctx_draw.fillStyle = activeColour; // reset 
    */
    //console.log({'top': top-drawSize, 'left': left-drawSize, 'right': right+drawSize, 'bottom': bottom+drawSize, 'colour': activeColour})
    return [loopCenters, nonCenters, {'top': top-drawSize, 'left': left-drawSize, 'right': right+drawSize, 'bottom': bottom+drawSize, 'colour': activeColour}]

}

function floodFindInterior(x1, y1, b, t, l ,r) {
    floodQueue = [{'x': x1, 'y': y1}]
    //console.log("ACTIVE COLOUR: ", activeColour)
    do {
        var px = floodQueue.shift()
        //console.log(px)
        x = px['x']
        y = px['y']
        //console.log("CURRENT COL: ", col)
        var dataT = ctx_temp.getImageData(x, y, 1, 1).data;

        if (x <= l || x >= r || y <= t || y >= b) {
            return false; // check if x or y go out of bounds: then we are 'exterior': we break the loop, empty queue, and signal 
        }  else if(!(dataT[3] === 255)) {
            var data = ctx_draw.getImageData(x, y, 1, 1).data;
            var col = rgbToHex(data[0], data[1], data[2])
            if(col !== activeColour) {

                // if the pixel at a point is not a boundary or previously traversed, then continue
                fillRegion(ctx_temp, x-1, y-1, 3) // mark as filled
                // check the neighboring pixels by adding to queue
                ctx_temp.fillStyle= "rgba(0,0,0,0.5)"
                if(ctx_temp.getImageData(x-2, y, 1, 1).data[3] === 0) {
                    floodQueue.push({'x': x-2, 'y': y})
                    fillRegion(ctx_temp, x-2-1, y-1, 3) // mark as traversed
                }
                if(ctx_temp.getImageData(x+2, y, 1, 1).data[3] === 0) {
                    floodQueue.push({'x': x+2, 'y': y})
                    fillRegion(ctx_temp, x+2-1, y-1, 3) // mark as traversed
                }
                if(ctx_temp.getImageData(x, y-2, 1, 1).data[3] === 0) {
                    floodQueue.push({'x': x, 'y': y-2})
                    fillRegion(ctx_temp, x-1, y-2-1, 3) // mark as traversed
                }
                if(ctx_temp.getImageData(x, y+2, 1, 1).data[3] === 0) {
                    floodQueue.push({'x': x, 'y': y+2})
                    fillRegion(ctx_temp, x-1, y+2-1, 3) // mark as traversed
                }
                ctx_temp.fillStyle= "#000000"
            }
        }
    } while(floodQueue.length != 0)

    return true;
}

function circleIntersect(x0, y0, r0, x1, y1, r1) {
    return Math.hypot(x0 - x1, y0 - y1) <= r0 + r1;
}

function fillLoops(loops, duds) {
    // clean areas first - get rid of accumulated black areas.
    // BUG: Multiple floods is traversing the outside entirely, with some white space left over. If a new flood traversal occurs in a white space surrounded by black, it ends without traversal and assumes the point is interior. An activeColour flood can occur outside of a shape body accidentally in this case.
    // To avoid this issue, clean duds FIRST, then flood active colour.
    for(d in duds) {
        flood(duds[d]['x'], duds[d]['y'], "#FFFFFF")
    }
    console.log("FINISHED DUDS")
    for(l in loops) { // fill areas
        flood(loops[l]['x'], loops[l]['y'], activeColour)
    }
    console.log("FINISHED LOOPS")
}

// image is a 2D array of pixel colors
// x and y are the coordinates of the starting pixel
function flood(x1, y1, newCol) {
    floodQueue = [{'x': x1, 'y': y1}]
    ctx_draw.fillStyle = newCol;

    /*
    var data = ctx_draw.getImageData(x1, y1, 1, 1).data;
    var col = rgbToHex(data[0], data[1], data[2])

    if(!(col === "#000000" && data[3] === 255)){
        console.log("WTF: " + data +" | "+ x1 + ", "+ y1)
    }
    */

    do {
        var p = floodQueue.shift()
        //console.log(px)
        x = p['x']
        y = p['y']
        //console.log("("+x+", "+y+")")
        var data = ctx_draw.getImageData(x, y, 1, 1).data;
        var col = rgbToHex(data[0], data[1], data[2])

        var dataT = ctx_temp.getImageData(x, y, 1, 1).data;

        if(col != activeColour && dataT[3] !== 0) { // while on a traversed pixel
            // if the pixel at a point is not a boundary or previously traversed, then continue
            if(newCol === "#FFFFFF"){
                ctx_temp.clearRect(x-1, y-1, 3, 3) // clear 
            } else if(col !== activeColour) { // if point hasnt been filled
                fillRegion(ctx_draw, x-1, y-1, 3) // fill with colour
                ctx_temp.clearRect(x-1, y-1, 3, 3)
            }

            // check the neighboring pixels by adding to queue
            if(x > 0 && y > 0 && x < canvas_draw.width && y < canvas_draw.height) {
                floodQueue.push({'x': x - 2, 'y': y})
                floodQueue.push({'x': x + 2, 'y': y})
                floodQueue.push({'x': x, 'y': y - 2})
                floodQueue.push({'x': x, 'y': y + 2})
                floodQueue.push({'x': x - 2, 'y': y - 2})
                floodQueue.push({'x': x + 2, 'y': y + 2})
                floodQueue.push({'x': x + 2, 'y': y - 2})
                floodQueue.push({'x': x - 2, 'y': y + 2})
            }
        }
    } while(floodQueue.length != 0)

    /*
    ctx_draw.fillStyle = '#00FF00';
    fillRegion(ctx_draw, x-1, y-1, 3) // mark as traversed
    */
}

function fillRegion(canvas, x, y, size) {
    canvas.beginPath();
    canvas.fillRect(x, y, size, size);
    canvas.fill();
}

//------------------------------------------------------ CURSOR FUNCTIONALITY ------------------------------------------------------//


/*
window.addEventListener('mousemove', (event) => {
    const rect = canvas_image.getBoundingClientRect()
    mouseX = Math.round((event.clientX - rect.left) * canvas_image.width / canvas_image.clientWidth);
    mouseY = Math.round((event.clientY - rect.top) * canvas_image.height / canvas_image.clientHeight);
    cursor.style.transform = `translate(${event.clientX + scrollX - drawSize/2}px, ${event.clientY + scrollY - drawSize/2}px)`;
    //console.log("x: " + mouseX + " y: " + mouseY)
    if(leftClicked){
        drawPath.push({x: mouseX, y: mouseY})
    }
    $('#coords').text(mouseX + ", " + mouseY)

})
*/

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
}

function dropFile(event) {
    event.preventDefault();
    if(event.dataTransfer && event.dataTransfer.files) {
        console.log(event.dataTransfer.files)
        for(var i = 0; i < event.dataTransfer.files.length; i++){
            procFile(event.dataTransfer.files[i])
        }
        procFile(event.dataTransfer.files[0]);
    }

}

function procFile(file) {
    console.log("processing file " + file.name);
    console.log(file)
    img.src = file.path;
    img.title = file.name
    console.log(img.src)
    console.log(img.title)

    if(file.type === "image/tiff" || file.type === "image/tif") {
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
function toggleZoom() {
    console.log(zoom)
    zoom = !zoom;
    if(zoom) {
        $("#zoom-img").attr("src","./images/zoom_2.png");
        $(".mapier-canvas").css({"width":"max-content"});
    } else {
        $("#zoom-img").attr("src","./images/zoom_1.png");
        $(".mapier-canvas").css({"width":"100%"});
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
                        fillRegion(ctx_temp, x-1, y-1, 3)
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
    window.api.invoke('set_file_path', {'path': img.src, 'type': 'save'})
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
                window.api.invoke('save_crop', {'url': url, 'file': img.src, 'id': "map_"+index})

                crop = ctx_image.getImageData(left, top, (right-left), (bottom-top))
                ctx_temp.putImageData(crop, 0, 0)
                url = canvas_temp.toDataURL("image/png");
                window.api.invoke('save_crop', {'url': url, 'file': img.src, 'id': "img_"+index})
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
