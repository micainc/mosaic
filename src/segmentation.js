// SCRIPT FOR HANDLING SEGMENTATION TASKS 


async function handleApplyClassifier() {
    const classes = ['undefined', 'unknown', 'K-feldspar', 'amphibole', 'andalusite', 'anhydrite', 'apatite', 'arsenopyrite', 'azurite', 'barite', 'beryl', 'biotite', 'bornite', 'calcite', 'cassiterite', 'celestite', 'cerussite', 'chalcedony', 'chalcocite', 'chalcopyrite', 'chlorite', 'chloritoid', 'cinnabar', 'clay minerals', 'clinopyroxene', 'columbite', 'cordierite', 'corundum', 'cummingtonite', 'diamond', 'dolomite', 'epidote', 'fluorite', 'galena', 'garnet', 'goethite', 'graphite', 'gypsum', 'halite', 'hematite', 'ilmenite', 'kyanite', 'limonite', 'magnetite', 'malachite', 'molybdenite', 'monazite', 'muscovite', 'native copper', 'native gold', 'native silver', 'native sulfur', 'nepheline', 'olivine', 'opal', 'orpiment', 'orthopyroxene', 'pentlandite', 'plagioclase feldspar', 'prehnite', 'pyrite', 'pyrrhotite', 'quartz', 'realgar', 'rhodochrosite', 'rutile', 'scapolite', 'scheelite', 'serpentine', 'siderite', 'sillimanite', 'smithsonite', 'sphalerite', 'staurolite', 'stibnite', 'sylvite', 'talc', 'tantalite', 'titanite', 'topaz', 'tourmaline', 'vesuvianite', 'wolframite', 'wollastonite', 'zeolites', 'zircon'];
    const label_colours = {'#3FBF00': 'K-feldspar', 'K-feldspar': '#3FBF00', '#7F7F00': 'amphibole', 'amphibole': '#7F7F00', '#1F007F': 'andalusite', 'andalusite': '#1F007F', '#FF1F1F': 'anhydrite', 'anhydrite': '#FF1F1F', '#BFBF3F': 'apatite', 'apatite': '#BFBF3F', '#7FBF9F': 'arsenopyrite', 'arsenopyrite': '#7FBF9F', '#7FDFDF': 'azurite', 'azurite': '#7FDFDF', '#3FDFDF': 'barite', 'barite': '#3FDFDF', '#3FDF00': 'beryl', 'beryl': '#3FDF00', '#9F3F5F': 'biotite', 'biotite': '#9F3F5F', '#FFBF1F': 'bornite', 'bornite': '#FFBF1F', '#BFBFDF': 'calcite', 'calcite': '#BFBFDF', '#DFBF5F': 'cassiterite', 'cassiterite': '#DFBF5F', '#005FFF': 'celestite', 'celestite': '#005FFF', '#1F9F3F': 'cerussite', 'cerussite': '#1F9F3F', '#FFBF7F': 'chalcedony', 'chalcedony': '#FFBF7F', '#FF009F': 'chalcocite', 'chalcocite': '#FF009F', '#BF3FDF': 'chalcopyrite', 'chalcopyrite': '#BF3FDF', '#009F3F': 'chlorite', 'chlorite': '#009F3F', '#1F3F5F': 'chloritoid', 'chloritoid': '#1F3F5F', '#7FBF00': 'cinnabar', 'cinnabar': '#7FBF00', '#00BF1F': 'clay minerals', 'clay minerals': '#00BF1F', '#7F00BF': 'clinopyroxene', 'clinopyroxene': '#7F00BF', '#00BF5F': 'columbite', 'columbite': '#00BF5F', '#00BFDF': 'cordierite', 'cordierite': '#00BFDF', '#7F5F1F': 'corundum', 'corundum': '#7F5F1F', '#DF3FFF': 'cummingtonite', 'cummingtonite': '#DF3FFF', '#9FBF9F': 'diamond', 'diamond': '#9FBF9F', '#3F9F5F': 'dolomite', 'dolomite': '#3F9F5F', '#3F9F00': 'epidote', 'epidote': '#3F9F00', '#DF3F5F': 'fluorite', 'fluorite': '#DF3F5F', '#9F9F3F': 'galena', 'galena': '#9F9F3F', '#DFBF7F': 'garnet', 'garnet': '#DFBF7F', '#7F5FDF': 'goethite', 'goethite': '#7F5FDF', '#7FBF3F': 'graphite', 'graphite': '#7FBF3F', '#001F5F': 'gypsum', 'gypsum': '#001F5F', '#FFBF9F': 'halite', 'halite': '#FFBF9F', '#1F1FFF': 'hematite', 'hematite': '#1F1FFF', '#BF009F': 'ilmenite', 'ilmenite': '#BF009F', '#5F009F': 'kyanite', 'kyanite': '#5F009F', '#001F9F': 'limonite', 'limonite': '#001F9F', '#BF0000': 'magnetite', 'magnetite': '#BF0000', '#FF0000': 'malachite', 'malachite': '#FF0000', '#3F3F5F': 'molybdenite', 'molybdenite': '#3F3F5F', '#DFFFBF': 'monazite', 'monazite': '#DFFFBF', '#3F1F9F': 'muscovite', 'muscovite': '#3F1F9F', '#1FBF7F': 'native copper', 'native copper': '#1FBF7F', '#7F3FBF': 'native gold', 'native gold': '#7F3FBF', '#3FDF7F': 'native silver', 'native silver': '#3FDF7F', '#00001F': 'native sulfur', 'native sulfur': '#00001F', '#9FDF7F': 'nepheline', 'nepheline': '#9FDF7F', '#7F009F': 'olivine', 'olivine': '#7F009F', '#5F3FBF': 'opal', 'opal': '#5F3FBF', '#FF5F1F': 'orpiment', 'orpiment': '#FF5F1F', '#BF1FDF': 'orthopyroxene', 'orthopyroxene': '#BF1FDF', '#7FBFFF': 'pentlandite', 'pentlandite': '#7FBFFF', '#7FDFFF': 'plagioclase feldspar', 'plagioclase feldspar': '#7FDFFF', '#3FBFBF': 'prehnite', 'prehnite': '#3FBFBF', '#5F9FFF': 'pyrite', 'pyrite': '#5F9FFF', '#BFFF00': 'pyrrhotite', 'pyrrhotite': '#BFFF00', '#3F007F': 'quartz', 'quartz': '#3F007F', '#5FBFBF': 'realgar', 'realgar': '#5FBFBF', '#5F001F': 'rhodochrosite', 'rhodochrosite': '#5F001F', '#BFDFFF': 'rutile', 'rutile': '#BFDFFF', '#3F9FFF': 'scapolite', 'scapolite': '#3F9FFF', '#DFDFBF': 'scheelite', 'scheelite': '#DFDFBF', '#DF5F1F': 'serpentine', 'serpentine': '#DF5F1F', '#3FBFDF': 'siderite', 'siderite': '#3FBFDF', '#FF00BF': 'sillimanite', 'sillimanite': '#FF00BF', '#BF9FFF': 'smithsonite', 'smithsonite': '#BF9FFF', '#7F5F9F': 'sphalerite', 'sphalerite': '#7F5F9F', '#7F3F5F': 'staurolite', 'staurolite': '#7F3F5F', '#009F7F': 'stibnite', 'stibnite': '#009F7F', '#3F5F7F': 'sylvite', 'sylvite': '#3F5F7F', '#1F3F7F': 'talc', 'talc': '#1F3F7F', '#3FDF1F': 'tantalite', 'tantalite': '#3FDF1F', '#5F00BF': 'titanite', 'titanite': '#5F00BF', '#1FFF7F': 'topaz', 'topaz': '#1FFF7F', '#1FBF9F': 'tourmaline', 'tourmaline': '#1FBF9F', '#1FDF7F': 'vesuvianite', 'vesuvianite': '#1FDF7F', '#5F1FDF': 'wolframite', 'wolframite': '#5F1FDF', '#BFBF00': 'wollastonite', 'wollastonite': '#BFBF00', '#7FFF5F': 'zeolites', 'zeolites': '#7FFF5F', '#BF5F3F': 'zircon', 'zircon': '#BF5F3F', 'unknown': '#7F7F7F', '#7F7F7F': 'unknown', 'undefined': '#000000', '#000000': 'undefined'}

    // Use the actual image dimensions
    let width = draw_canvas.width;
    let height = draw_canvas.height;

    console.log("WIDTH/HEIGHT: " + width + ", "+ height)

    try {
        const {success, error, predictions} = await window.api.applyClassifier(images);
        if (success) {
            // predictions = _predictions
            for(let h = 0; h < height; h++) {
                for(let w = 0; w < width; w++) {
                    let maxPredictionClassIndex = -1;
                    let maxPrediction = 0;
                    for(let c = 0; c < classes.length; c++) {
                        const predictionValue = predictions[(h * width + w) * 86 + c];
                        if (predictionValue > maxPrediction) {
                            maxPrediction = predictionValue;
                            maxPredictionClassIndex = c;
                        }
                    }
                    const probableClass = classes[maxPredictionClassIndex];
                    const color = label_colours[probableClass];

                    // Set the fill style
                    draw_ctx.fillStyle = color;
                    // Draw the pixel (scaled to fit the canvas)
                    draw_ctx.fillRect(w, h, 1, 1);
                }
            }

            console.log('Classifier applied successfully');
        } else {
            console.error('Error applying classifier:', error);
        }
    } catch (error) {
        console.error('Error calling classifier:', error);
    }
}

async function handleApplySlic() {
    console.log("HEY SLICK!")
    console.log("IMAGES: ", images)
    //TODO: This is for testing, we likely don't simply want the first image a user dragged in!
    const firstImage = Object.values(images)[0];
    const imageData = firstImage.data;


    try {
        // Extract dimensions
        const width = imageData.width;
        const height = imageData.height;
        
        // Create new array without alpha channel
        const rgbOnly = new Array(width * height * 3);
        const data = imageData.data;
        
        // Copy RGB values, skipping alpha channel
        // Possibly innefficient! We loop through the entire image
        let j = 0;
        for (let i = 0; i < data.length; i += 4) {
            rgbOnly[j] = data[i];     // R
            rgbOnly[j + 1] = data[i + 1]; // G
            rgbOnly[j + 2] = data[i + 2]; // B
            j += 3;
        }

        const result = await window.api.runSlic({
            dimensions: `${width} ${height}`,
            pixelData: rgbOnly.join(' ')
        });

        console.log("RESULT: " + result);
        return result;

    } catch (error) {
        console.error('SLIC processing failed:', error);
        throw error;
    }

    // pass the ACTIVE image in
    // invoke a python script
    // RUN the python script ON the input image USING any cluent-specified parameters
    // return the results to the DRAW CANVAS
}

// NOTE: using 'createImageData()' is intentional: memory/speed trade off is substantial as we scale up with bigger images
// it is better to create a temporary image data object, then paint it all at once to canvas.
// async function handleApplyClassifier() {
//     const classes = ['undefined', 'unknown', 'K-feldspar', 'amphibole', 'andalusite', 'anhydrite', 'apatite', 'arsenopyrite', 'azurite', 'barite', 'beryl', 'biotite', 'bornite', 'calcite', 'cassiterite', 'celestite', 'cerussite', 'chalcedony', 'chalcocite', 'chalcopyrite', 'chlorite', 'chloritoid', 'cinnabar', 'clay minerals', 'clinopyroxene', 'columbite', 'cordierite', 'corundum', 'cummingtonite', 'diamond', 'dolomite', 'epidote', 'fluorite', 'galena', 'garnet', 'goethite', 'graphite', 'gypsum', 'halite', 'hematite', 'ilmenite', 'kyanite', 'limonite', 'magnetite', 'malachite', 'molybdenite', 'monazite', 'muscovite', 'native copper', 'native gold', 'native silver', 'native sulfur', 'nepheline', 'olivine', 'opal', 'orpiment', 'orthopyroxene', 'pentlandite', 'plagioclase feldspar', 'prehnite', 'pyrite', 'pyrrhotite', 'quartz', 'realgar', 'rhodochrosite', 'rutile', 'scapolite', 'scheelite', 'serpentine', 'siderite', 'sillimanite', 'smithsonite', 'sphalerite', 'staurolite', 'stibnite', 'sylvite', 'talc', 'tantalite', 'titanite', 'topaz', 'tourmaline', 'vesuvianite', 'wolframite', 'wollastonite', 'zeolites', 'zircon'];

//     // const classes = {'undefined': 0, 'unknown': 1, 'K-feldspar': 2, 'amphibole': 3, 'andalusite': 4, 'anhydrite': 5, 'apatite': 6, 'arsenopyrite': 7, 'azurite': 8, 'barite': 9, 'beryl': 10, 'biotite': 11, 'bornite': 12, 'calcite': 13, 'cassiterite': 14, 'celestite': 15, 'cerussite': 16, 'chalcedony': 17, 'chalcocite': 18, 'chalcopyrite': 19, 'chlorite': 20, 'chloritoid': 21, 'cinnabar': 22, 'clay minerals': 23, 'clinopyroxene': 24, 'columbite': 25, 'cordierite': 26, 'corundum': 27, 'cummingtonite': 28, 'diamond': 29, 'dolomite': 30, 'epidote': 31, 'fluorite': 32, 'galena': 33, 'garnet': 34, 'goethite': 35, 'graphite': 36, 'gypsum': 37, 'halite': 38, 'hematite': 39, 'ilmenite': 40, 'kyanite': 41, 'limonite': 42, 'magnetite': 43, 'malachite': 44, 'molybdenite': 45, 'monazite': 46, 'muscovite': 47, 'native copper': 48, 'native gold': 49, 'native silver': 50, 'native sulfur': 51, 'nepheline': 52, 'olivine': 53, 'opal': 54, 'orpiment': 55, 'orthopyroxene': 56, 'pentlandite': 57, 'plagioclase feldspar': 58, 'prehnite': 59, 'pyrite': 60, 'pyrrhotite': 61, 'quartz': 62, 'realgar': 63, 'rhodochrosite': 64, 'rutile': 65, 'scapolite': 66, 'scheelite': 67, 'serpentine': 68, 'siderite': 69, 'sillimanite': 70, 'smithsonite': 71, 'sphalerite': 72, 'staurolite': 73, 'stibnite': 74, 'sylvite': 75, 'talc': 76, 'tantalite': 77, 'titanite': 78, 'topaz': 79, 'tourmaline': 80, 'vesuvianite': 81, 'wolframite': 82, 'wollastonite': 83, 'zeolites': 84, 'zircon': 85}
//     const label_colours = {'#3FBF00': 'K-feldspar', 'K-feldspar': '#3FBF00', '#7F7F00': 'amphibole', 'amphibole': '#7F7F00', '#1F007F': 'andalusite', 'andalusite': '#1F007F', '#FF1F1F': 'anhydrite', 'anhydrite': '#FF1F1F', '#BFBF3F': 'apatite', 'apatite': '#BFBF3F', '#7FBF9F': 'arsenopyrite', 'arsenopyrite': '#7FBF9F', '#7FDFDF': 'azurite', 'azurite': '#7FDFDF', '#3FDFDF': 'barite', 'barite': '#3FDFDF', '#3FDF00': 'beryl', 'beryl': '#3FDF00', '#9F3F5F': 'biotite', 'biotite': '#9F3F5F', '#FFBF1F': 'bornite', 'bornite': '#FFBF1F', '#BFBFDF': 'calcite', 'calcite': '#BFBFDF', '#DFBF5F': 'cassiterite', 'cassiterite': '#DFBF5F', '#005FFF': 'celestite', 'celestite': '#005FFF', '#1F9F3F': 'cerussite', 'cerussite': '#1F9F3F', '#FFBF7F': 'chalcedony', 'chalcedony': '#FFBF7F', '#FF009F': 'chalcocite', 'chalcocite': '#FF009F', '#BF3FDF': 'chalcopyrite', 'chalcopyrite': '#BF3FDF', '#009F3F': 'chlorite', 'chlorite': '#009F3F', '#1F3F5F': 'chloritoid', 'chloritoid': '#1F3F5F', '#7FBF00': 'cinnabar', 'cinnabar': '#7FBF00', '#00BF1F': 'clay minerals', 'clay minerals': '#00BF1F', '#7F00BF': 'clinopyroxene', 'clinopyroxene': '#7F00BF', '#00BF5F': 'columbite', 'columbite': '#00BF5F', '#00BFDF': 'cordierite', 'cordierite': '#00BFDF', '#7F5F1F': 'corundum', 'corundum': '#7F5F1F', '#DF3FFF': 'cummingtonite', 'cummingtonite': '#DF3FFF', '#9FBF9F': 'diamond', 'diamond': '#9FBF9F', '#3F9F5F': 'dolomite', 'dolomite': '#3F9F5F', '#3F9F00': 'epidote', 'epidote': '#3F9F00', '#DF3F5F': 'fluorite', 'fluorite': '#DF3F5F', '#9F9F3F': 'galena', 'galena': '#9F9F3F', '#DFBF7F': 'garnet', 'garnet': '#DFBF7F', '#7F5FDF': 'goethite', 'goethite': '#7F5FDF', '#7FBF3F': 'graphite', 'graphite': '#7FBF3F', '#001F5F': 'gypsum', 'gypsum': '#001F5F', '#FFBF9F': 'halite', 'halite': '#FFBF9F', '#1F1FFF': 'hematite', 'hematite': '#1F1FFF', '#BF009F': 'ilmenite', 'ilmenite': '#BF009F', '#5F009F': 'kyanite', 'kyanite': '#5F009F', '#001F9F': 'limonite', 'limonite': '#001F9F', '#BF0000': 'magnetite', 'magnetite': '#BF0000', '#FF0000': 'malachite', 'malachite': '#FF0000', '#3F3F5F': 'molybdenite', 'molybdenite': '#3F3F5F', '#DFFFBF': 'monazite', 'monazite': '#DFFFBF', '#3F1F9F': 'muscovite', 'muscovite': '#3F1F9F', '#1FBF7F': 'native copper', 'native copper': '#1FBF7F', '#7F3FBF': 'native gold', 'native gold': '#7F3FBF', '#3FDF7F': 'native silver', 'native silver': '#3FDF7F', '#00001F': 'native sulfur', 'native sulfur': '#00001F', '#9FDF7F': 'nepheline', 'nepheline': '#9FDF7F', '#7F009F': 'olivine', 'olivine': '#7F009F', '#5F3FBF': 'opal', 'opal': '#5F3FBF', '#FF5F1F': 'orpiment', 'orpiment': '#FF5F1F', '#BF1FDF': 'orthopyroxene', 'orthopyroxene': '#BF1FDF', '#7FBFFF': 'pentlandite', 'pentlandite': '#7FBFFF', '#7FDFFF': 'plagioclase feldspar', 'plagioclase feldspar': '#7FDFFF', '#3FBFBF': 'prehnite', 'prehnite': '#3FBFBF', '#5F9FFF': 'pyrite', 'pyrite': '#5F9FFF', '#BFFF00': 'pyrrhotite', 'pyrrhotite': '#BFFF00', '#3F007F': 'quartz', 'quartz': '#3F007F', '#5FBFBF': 'realgar', 'realgar': '#5FBFBF', '#5F001F': 'rhodochrosite', 'rhodochrosite': '#5F001F', '#BFDFFF': 'rutile', 'rutile': '#BFDFFF', '#3F9FFF': 'scapolite', 'scapolite': '#3F9FFF', '#DFDFBF': 'scheelite', 'scheelite': '#DFDFBF', '#DF5F1F': 'serpentine', 'serpentine': '#DF5F1F', '#3FBFDF': 'siderite', 'siderite': '#3FBFDF', '#FF00BF': 'sillimanite', 'sillimanite': '#FF00BF', '#BF9FFF': 'smithsonite', 'smithsonite': '#BF9FFF', '#7F5F9F': 'sphalerite', 'sphalerite': '#7F5F9F', '#7F3F5F': 'staurolite', 'staurolite': '#7F3F5F', '#009F7F': 'stibnite', 'stibnite': '#009F7F', '#3F5F7F': 'sylvite', 'sylvite': '#3F5F7F', '#1F3F7F': 'talc', 'talc': '#1F3F7F', '#3FDF1F': 'tantalite', 'tantalite': '#3FDF1F', '#5F00BF': 'titanite', 'titanite': '#5F00BF', '#1FFF7F': 'topaz', 'topaz': '#1FFF7F', '#1FBF9F': 'tourmaline', 'tourmaline': '#1FBF9F', '#1FDF7F': 'vesuvianite', 'vesuvianite': '#1FDF7F', '#5F1FDF': 'wolframite', 'wolframite': '#5F1FDF', '#BFBF00': 'wollastonite', 'wollastonite': '#BFBF00', '#7FFF5F': 'zeolites', 'zeolites': '#7FFF5F', '#BF5F3F': 'zircon', 'zircon': '#BF5F3F', 'unknown': '#7F7F7F', '#7F7F7F': 'unknown', 'undefined': '#000000', '#000000': 'undefined'}
//     // Use the actual image dimensions
//     let width = Object.entries(images)[0][1].width;
//     let height = Object.entries(images)[0][1].height;

//     try {
//       const {success, error, _predictions} = await window.api.applyClassifier(images);
//       if (success) {
//         predictions = _predictions
//         const imageData = draw_ctx.createImageData(width, height);
        
//         for(let h = 0; h < height; h++) {
//             for(let w = 0; w< width; w++) {
//                 let maxPredictionClassIndex = -1;
//                 let maxPrediction = 0;
//                 for(let c = 0; c < classes.length; c++) {
//                     const predictionValue = _predictions[(h * width + w) * 86 + c];
//                     if (predictionValue > maxPrediction) {
//                         maxPrediction = predictionValue;
//                         maxPredictionClassIndex = c;
//                     }
//                 }
//                 const probableClass = classes[maxPredictionClassIndex];
//                 const color = label_colours[probableClass];

//                 // Convert hex color to RGB
//                 const r = parseInt(color.slice(1, 3), 16);
//                 const g = parseInt(color.slice(3, 5), 16);
//                 const b = parseInt(color.slice(5, 7), 16);
//                 // draw highest probability pixel colour for eah pixel over whole draw canvas WxH (same dimensions as all the input images)

//                 // Set pixel color in imageData
//                 const pixelIndex = (h * width + w) * 4;
//                 imageData.data[pixelIndex] = r;
//                 imageData.data[pixelIndex + 1] = g;
//                 imageData.data[pixelIndex + 2] = b;
//                 imageData.data[pixelIndex + 3] = 255; // Full opacity
                
//                 // draw_ctx.fillStyle = label_colours[probableClass]
//                 // draw_ctx.fillRect(point.x, point.y, 1, 1);

//             }
//         }

//         draw_ctx.putImageData(imageData, 0, 0);

//         //predictions: 1d array of size W*H*86 bytes, where each value is a number between 0 and 100, representing percent probability of mineral class
//         //  each set of 86 integers represent probabilities for 86 different minieral classes for one pixel 

//         // Handle the predictions here
//       } else {
//         console.error('Error applying classifier:', error);
//       }
//     } catch (error) {
//       console.error('Error calling classifier:', error);
//     }
// }