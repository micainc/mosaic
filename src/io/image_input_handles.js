
function getFilename(path) {
    // Extract the filename from a path, handling both Windows and Unix paths
    const filename = path.split(/[/\\]/).pop(); // Splits on both forward and backslash
    return filename.replace(/\.(jpg|JPG|png|PNG|jpeg|JPEG|tiff|TIFF|TIF|tif|gif|GIF)$/, ''); // Removes known image extensions
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
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

        Promise.all(imagePromises).then(() => {

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
                    drawCtx.drawImage(img, 0, 0);
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
                console.log("IMG LAYERS SETTING DIMENSIONS ...")

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
                const layerCount = Object.values(IMAGE_LAYERS).filter(img => img.type && img.type.startsWith('layer_')).length;
                type = `layer_${layerCount + 1}`;
            }

            IMAGE_LAYERS[file.name] = {
                icon: iconUrl,         
                src: displayUrl,         
                bitmap: bitmap,       
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