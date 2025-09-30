var ANCHORED_COLOURS = {}
let ANCHORED_MASK = null;
let ANCHORED_MASK_CANVAS = null;
let ANCHORED_MASK_CTX = null;

// Initialize the mask canvas (call this in your init() function)
function initAnchoredMaskCanvas() {
    // Use OffscreenCanvas if available, otherwise fallback to regular canvas
    if (typeof OffscreenCanvas !== 'undefined') {
        ANCHORED_MASK_CANVAS = new OffscreenCanvas(drawCanvas.width, drawCanvas.height);
    } else {
        // Fallback for browsers that don't support OffscreenCanvas
        ANCHORED_MASK_CANVAS = document.createElement('canvas');
        ANCHORED_MASK_CANVAS.width = drawCanvas.width;
        ANCHORED_MASK_CANVAS.height = drawCanvas.height;
    }
    ANCHORED_MASK_CTX = ANCHORED_MASK_CANVAS.getContext('2d');
}


function updateAnchoredMask() {
    if (Object.keys(ANCHORED_COLOURS).length === 0) {
        ANCHORED_MASK = null;
        if (ANCHORED_MASK_CTX) {
            console.log("CLEARING ANCHORED MASK")
            ANCHORED_MASK_CTX.clearRect(0, 0, ANCHORED_MASK_CANVAS.width, ANCHORED_MASK_CANVAS.height);
        }
        return;
    }
    
    // console.log("Updating anchored mask for colors:", JSON.stringify(Object.entries(ANCHORED_COLOURS)));
    // console.log("ACTIVE DRAW LABEL COL: ", ACTIVE_DRAW_LABEL_COLOUR.colour)
    // Get current canvas state
    const imageData = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
    const data = imageData.data;
    
    // Clear the mask canvas
    ANCHORED_MASK_CTX.clearRect(0, 0, ANCHORED_MASK_CANVAS.width, ANCHORED_MASK_CANVAS.height);
    
    // Create a new image data for the mask
    ANCHORED_MASK = ANCHORED_MASK_CTX.createImageData(drawCanvas.width, drawCanvas.height);
    const maskData = ANCHORED_MASK.data;
    
    // Copy only anchored pixels to the mask
    let anchoredPixelCount = 0;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        
        // Check if this pixel color is anchored and not transparent
        if (a > 0) {
            const hex = rgbToHex(r, g, b);
            if (ANCHORED_COLOURS.hasOwnProperty(hex) && hex !== ACTIVE_DRAW_LABEL_COLOUR.colour) {
                // Copy this pixel to the mask
                maskData[i] = r;
                maskData[i + 1] = g;
                maskData[i + 2] = b;
                maskData[i + 3] = a;
                anchoredPixelCount++;
            }
        }
    }
    
    console.log(`Found ${anchoredPixelCount} anchored pixels`);
    
    // Put the mask data on the mask canvas
    if (anchoredPixelCount > 0) {
        // ANCHORED_MASK_CTX.globalCompositeOperation = 'source-over';

        ANCHORED_MASK_CTX.putImageData(ANCHORED_MASK, 0, 0);
    }
}

// Function to reapply the anchored mask
function reapplyAnchoredMask() {
    if (!ANCHORED_MASK_CANVAS || Object.keys(ANCHORED_COLOURS).length === 0) return;

    // Save current composite operation
    const originalOp = drawCtx.globalCompositeOperation;
    // console.log("WE ARE REAPPLYING NOW:",originalOp )

    // Draw the mask canvas on top (this respects transparency properly)
    drawCtx.globalCompositeOperation = 'source-over';
    // ANCHORED_MASK_CTX.globalCompositeOperation = 'source-over';


    drawCtx.drawImage(ANCHORED_MASK_CANVAS, 0, 0);
    
    // Restore original composite operation
    drawCtx.globalCompositeOperation = originalOp;
    // console.log("RESTORING OP:", drawCtx.globalCompositeOperation )

}




function onToggleLabelAnchor(e, colour, label) {
    e.stopPropagation()
    const element = e.currentTarget;
    if(ANCHORED_COLOURS[colour]) {
        delete ANCHORED_COLOURS[colour]
        element.classList.remove('active')
        element.parentElement.classList.remove('anchored');

    } else {
        ANCHORED_COLOURS[colour] = label
        element.parentElement.style.order = 1;
        element.classList.add('active')
        element.parentElement.classList.add('anchored');

    }
    updateAnchoredMask();

}