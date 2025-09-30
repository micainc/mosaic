
function getFilename(path) {
    // Extract the filename from a path, handling both Windows and Unix paths
    const filename = path.split(/[/\\]/).pop(); // Splits on both forward and backslash
    return filename.replace(/\.(jpg|JPG|png|PNG|jpeg|JPEG|tiff|TIFF|TIF|tif|gif|GIF)$/, ''); // Removes known image extensions
}





function catchDrag(event) {
	event.dataTransfer.dropEffect = "copy"
	event.preventDefault();
}

var dimensionsSet = false;

function dropFiles(event) {
    // revokeImageUrls(); // Clear old URLs before processing new files
    dimensionsSet = false;
    event.preventDefault();
    if (event.dataTransfer && event.dataTransfer.files) {
        const files = Array.from(event.dataTransfer.files);

        // precheck if any of the files are .png
        files.forEach(file => {
            console.log("file.name: ", file.name)
            if (file.name.includes("segmentation")) {
            }
        })

        const imagePromises = files.map(file => {
            if (file.name.includes("segmentation")) {
                return processSegmentationLayer(file);
            } else {
                return processImageLayer(file);
            }
        });

        Promise.all(imagePromises).then(async () => {

            // finally, set active image layer
            const keys = Object.keys(IMAGE_LAYERS);
            const base = document.getElementById('base-image');
            
            if (keys.length > 0) {
                ACTIVE_IMAGE_LAYER = keys[0];
                base.src = IMAGE_LAYERS[ACTIVE_IMAGE_LAYER].src;
            } else {
                ACTIVE_IMAGE_LAYER = '';
                base.src = ''; // Clear the image
            }

            updateImageIcons();
            // await syncImageLayersToBackend(); // fix THIS!

        });
    }
    console.log("IMAGE LAYERS: ", IMAGE_LAYERS)
}


function processSegmentationLayer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();

            img.onload = function() {
                if(!dimensionsSet) {
                    console.log("SEG LAYER SETTING DIMENSIONS ...")
                    drawCanvas.width = img.width;
                    drawCanvas.height = img.height;
                    dimensionsSet = true;

                    // Reinitialize anchored mask canvas with new dimensions
                    if (typeof initAnchoredMaskCanvas === 'function') {
                        initAnchoredMaskCanvas();
                    }

                    drawCtx.drawImage(img, 0, 0);
                    
                    // ✅ Convert #7F7F7F pixels to #000000
                    console.log("Converting #7F7F7F pixels to #000000...");
                    convertGrayToTransparent();
                }
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
        resolve();
    });
}

function convertGrayToTransparent() {
    const imageData = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
    const data = imageData.data;
    
    // Loop through all pixels
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        
        // Check if pixel is #7F7F7F (127, 127, 127) and not transparent
        if (r === 127 && g === 127 && b === 127 && a !== 0) {
            // Convert to black #00000000
            data[i] = 0;     // R
            data[i + 1] = 0; // G
            data[i + 2] = 0; // B
            data[i + 3] = 0; // A

        }
    }
    
    // Put the modified image data back on the canvas
    drawCtx.putImageData(imageData, 0, 0);
    
}


function processImageLayer(file) {
    return new Promise(async (resolve, reject) => {
        try {
            // 1. Create URL for display (keep this for HTML img element)
            const displayUrl = URL.createObjectURL(file);
            
            // 2. Load image once - use for everything
            const tempImg = new Image();
            await new Promise(imgResolve => {
                tempImg.onload = imgResolve;
                tempImg.src = displayUrl;
            });

            // 3. Extract pixel data using tempImg 
            const canvas = new OffscreenCanvas(tempImg.naturalWidth, tempImg.naturalHeight);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(tempImg, 0, 0); // Use tempImg directly
            const imageData = ctx.getImageData(0, 0, tempImg.naturalWidth, tempImg.naturalHeight);

            // Extract RGB only
            const rgbPixels = new Uint8Array(tempImg.naturalWidth * tempImg.naturalHeight * 3);
            const rgbaData = imageData.data;
            
            let rgbIndex = 0;
            for (let i = 0; i < rgbaData.length; i += 4) {
                rgbPixels[rgbIndex++] = rgbaData[i];     // R
                rgbPixels[rgbIndex++] = rgbaData[i + 1]; // G  
                rgbPixels[rgbIndex++] = rgbaData[i + 2]; // B
            }

            // 4. Generate icon using the same tempImg
            const iconCanvas = document.createElement('canvas');
            const iconCtx = iconCanvas.getContext('2d');
            
            let iconWidth, iconHeight;
            if (tempImg.naturalWidth >= tempImg.naturalHeight) {
                iconWidth = 256;
                iconHeight = Math.round((tempImg.naturalHeight / tempImg.naturalWidth) * 256);
            } else {
                iconHeight = 256;
                iconWidth = Math.round((tempImg.naturalWidth / tempImg.naturalHeight) * 256);
            }
            
            iconCanvas.width = iconWidth;
            iconCanvas.height = iconHeight;
            iconCtx.drawImage(tempImg, 0, 0, iconWidth, iconHeight);
            const iconUrl = iconCanvas.toDataURL('image/jpeg', 1);

            // 5. Set canvas dimensions if first image
            if(!dimensionsSet) {
                drawCanvas.width = tempImg.naturalWidth;
                drawCanvas.height = tempImg.naturalHeight;

                // Reinitialize anchored mask canvas with new dimensions
                if (typeof initAnchoredMaskCanvas === 'function') {
                    initAnchoredMaskCanvas();
                }
                
                const baseImg = document.getElementById('base-image');
                baseImg.src = displayUrl;
                baseImg.style.width = '100%';
                baseImg.style.height = 'auto';
                dimensionsSet = true;
            }

            // 6. Determine type (unchanged)
            const filename = file.name.toLowerCase();
            const typeKeywords = ['xpol_texture', 'xpol', 'ppol_texture', 'ppol', 'lin', 'ref', 'texture', 'composite'];
            const matchedType = typeKeywords.find(keyword => filename.includes(keyword));
            
            let type;
            if (matchedType) {
                type = matchedType;
            } else {
                const layerCount = Object.values(IMAGE_LAYERS).filter(img => img.type && img.type.startsWith('layer_')).length;
                type = `layer_${layerCount + 1}`;
            }

            IMAGE_LAYERS[file.name] = {
                icon: iconUrl,         
                src: displayUrl,         
                pixels: rgbPixels,
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

function updateImageIcons() {
    const layersContainer = document.getElementById('toolbar-layers');
    
    layersContainer.innerHTML = ''; // clear layer icons
    
    // Add an icon for each layer
    Object.keys(IMAGE_LAYERS).forEach(layerName => {
        const img = document.createElement('img');
        img.src = IMAGE_LAYERS[layerName].icon;
        img.className = 'layer-icon';
        img.title = layerName;
        img.setAttribute('data-tooltip', layerName); // Add this line

        // Mark the active layer
        if (layerName === ACTIVE_IMAGE_LAYER) {
            img.classList.add('active');
        }
        
        // Set click handler
        img.addEventListener('click', () => {
            // Update visible layer
            ACTIVE_IMAGE_LAYER = layerName;
            
            // Update base image
            const baseImg = document.getElementById('base-image');
            baseImg.src = IMAGE_LAYERS[layerName].src;
            
            // Update active state of icons
            document.querySelectorAll('.layer-icon').forEach(icon => {
                icon.classList.remove('active');
            });
            img.classList.add('active');
        });
        
        layersContainer.appendChild(img);
    });
}



async function syncImageLayersToBackend() {
    const serializedLayers = {};
    
    for (const [layerName, layer] of Object.entries(IMAGE_LAYERS)) {
        serializedLayers[layerName] = {
            pixels: layer.pixels, 
            width: layer.width,
            height: layer.height,
            type: layer.type
            // Exclude 'src' - Object URLs won't work in backend
        };
    }

    try {
        await window.api.invoke('set_image_layers', serializedLayers);
        console.log('Synced IMAGE_LAYERS to backend:', Object.keys(serializedLayers));
    } catch (error) {
        console.error('Failed to sync IMAGE_LAYERS to backend:', error);
    }
}