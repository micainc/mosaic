// main.js
const os = require('os');
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');


app.commandLine.appendSwitch('in-process-gpu');
// app.commandLine.appendSwitch('disable-gpu-sandbox');
// app.commandLine.appendSwitch('js-flags', '--max-old-space-size=16384')
// app.commandLine.appendSwitch('ignore-gpu-blacklist'); // to enable three.js
// app.commandLine.appendSwitch('enable-gpu-rasterization'); // to enable three.js
// app.commandLine.appendSwitch('use-angle', 'd3d11');
// app.commandLine.appendSwitch('enable-zero-copy');
// app.commandLine.appendSwitch('disable-software-rasterizer');
// app.commandLine.appendSwitch('enable-webgl');
// app.commandLine.appendSwitch('enable-webgl2');
// app.commandLine.appendSwitch('no-sandbox');


// ENABLE LOGGER
const log = require('electron-log');

// Configure log
log.transports.file.level = 'debug';
log.transports.console.level = 'debug';

// Then use log instead of console
log.info('App starting...');
// log.error('Something failed:', error);

// Variables for constructing & transmiting data to Analysis window
let analysisWindow = null;
let storedImageData = null;

// Dictionary mapping colours to labels for various minerals
// We must have this here since multiple renderer processes need it (main renderer and analysis renderer)





// there are ~16.7M different colours in RGB format. I think I want to do a sort of 'hash' on these for when a user creates a custom set of labels during classification. 
// For example, take the label 'quartz': q = 17, u = 21, a = 1, r = 18, t = 20, z = 26. 

// (17^1) x (21^2) x (1^3) x (18^4) x (20^5) x (26^6) mod (256)^3

// ... in this way, a user can almost always be guaranteed a unique colour. 
// If the user modifies the label, we can find all instances of the previously used colour and update to the new colour accordingly
// numbers [0-9] would index to the range [27-36], hyphen '-' would be idx 37, and underscore '_' would be idx 38.
// if a hash collision is detected, indicate this to the user or add an underscore automatically?

const label_colours = {'#3FBF00': 'K-feldspar', 'K-feldspar': '#3FBF00', '#7F7F00': 'amphibole', 'amphibole': '#7F7F00', '#1F007F': 'andalusite', 'andalusite': '#1F007F', '#FF1F1F': 'anhydrite', 'anhydrite': '#FF1F1F', '#BFBF3F': 'apatite', 'apatite': '#BFBF3F', '#7FBF9F': 'arsenopyrite', 'arsenopyrite': '#7FBF9F', '#7FDFDF': 'azurite', 'azurite': '#7FDFDF', '#3FDFDF': 'barite', 'barite': '#3FDFDF', '#3FDF00': 'beryl', 'beryl': '#3FDF00', '#9F3F5F': 'biotite', 'biotite': '#9F3F5F', '#FFBF1F': 'bornite', 'bornite': '#FFBF1F', '#BFBFDF': 'calcite', 'calcite': '#BFBFDF', '#DFBF5F': 'cassiterite', 'cassiterite': '#DFBF5F', '#005FFF': 'celestite', 'celestite': '#005FFF', '#1F9F3F': 'cerussite', 'cerussite': '#1F9F3F', '#FFBF7F': 'chalcedony', 'chalcedony': '#FFBF7F', '#FF009F': 'chalcocite', 'chalcocite': '#FF009F', '#BF3FDF': 'chalcopyrite', 'chalcopyrite': '#BF3FDF', '#009F3F': 'chlorite', 'chlorite': '#009F3F', '#1F3F5F': 'chloritoid', 'chloritoid': '#1F3F5F', '#7FBF00': 'cinnabar', 'cinnabar': '#7FBF00', '#00BF1F': 'clay minerals', 'clay minerals': '#00BF1F', '#7F00BF': 'clinopyroxene', 'clinopyroxene': '#7F00BF', '#00BF5F': 'columbite', 'columbite': '#00BF5F', '#00BFDF': 'cordierite', 'cordierite': '#00BFDF', '#7F5F1F': 'corundum', 'corundum': '#7F5F1F', '#DF3FFF': 'cummingtonite', 'cummingtonite': '#DF3FFF', '#9FBF9F': 'diamond', 'diamond': '#9FBF9F', '#3F9F5F': 'dolomite', 'dolomite': '#3F9F5F', '#3F9F00': 'epidote', 'epidote': '#3F9F00', '#DF3F5F': 'fluorite', 'fluorite': '#DF3F5F', '#9F9F3F': 'galena', 'galena': '#9F9F3F', '#DFBF7F': 'garnet', 'garnet': '#DFBF7F', '#7F5FDF': 'goethite', 'goethite': '#7F5FDF', '#7FBF3F': 'graphite', 'graphite': '#7FBF3F', '#001F5F': 'gypsum', 'gypsum': '#001F5F', '#FFBF9F': 'halite', 'halite': '#FFBF9F', '#1F1FFF': 'hematite', 'hematite': '#1F1FFF', '#BF009F': 'ilmenite', 'ilmenite': '#BF009F', '#5F009F': 'kyanite', 'kyanite': '#5F009F', '#001F9F': 'limonite', 'limonite': '#001F9F', '#BF0000': 'magnetite', 'magnetite': '#BF0000', '#FF0000': 'malachite', 'malachite': '#FF0000', '#3F3F5F': 'molybdenite', 'molybdenite': '#3F3F5F', '#DFFFBF': 'monazite', 'monazite': '#DFFFBF', '#3F1F9F': 'muscovite', 'muscovite': '#3F1F9F', '#1FBF7F': 'native copper', 'native copper': '#1FBF7F', '#7F3FBF': 'native gold', 'native gold': '#7F3FBF', '#3FDF7F': 'native silver', 'native silver': '#3FDF7F', '#00001F': 'native sulfur', 'native sulfur': '#00001F', '#9FDF7F': 'nepheline', 'nepheline': '#9FDF7F', '#7F009F': 'olivine', 'olivine': '#7F009F', '#5F3FBF': 'opal', 'opal': '#5F3FBF', '#FF5F1F': 'orpiment', 'orpiment': '#FF5F1F', '#BF1FDF': 'orthopyroxene', 'orthopyroxene': '#BF1FDF', '#7FBFFF': 'pentlandite', 'pentlandite': '#7FBFFF', '#7FDFFF': 'plagioclase feldspar', 'plagioclase feldspar': '#7FDFFF', '#3FBFBF': 'prehnite', 'prehnite': '#3FBFBF', '#5F9FFF': 'pyrite', 'pyrite': '#5F9FFF', '#BFFF00': 'pyrrhotite', 'pyrrhotite': '#BFFF00', '#3F007F': 'quartz', 'quartz': '#3F007F', '#5FBFBF': 'realgar', 'realgar': '#5FBFBF', '#5F001F': 'rhodochrosite', 'rhodochrosite': '#5F001F', '#BFDFFF': 'rutile', 'rutile': '#BFDFFF', '#3F9FFF': 'scapolite', 'scapolite': '#3F9FFF', '#DFDFBF': 'scheelite', 'scheelite': '#DFDFBF', '#DF5F1F': 'serpentine', 'serpentine': '#DF5F1F', '#3FBFDF': 'siderite', 'siderite': '#3FBFDF', '#FF00BF': 'sillimanite', 'sillimanite': '#FF00BF', '#BF9FFF': 'smithsonite', 'smithsonite': '#BF9FFF', '#7F5F9F': 'sphalerite', 'sphalerite': '#7F5F9F', '#7F3F5F': 'staurolite', 'staurolite': '#7F3F5F', '#009F7F': 'stibnite', 'stibnite': '#009F7F', '#3F5F7F': 'sylvite', 'sylvite': '#3F5F7F', '#1F3F7F': 'talc', 'talc': '#1F3F7F', '#3FDF1F': 'tantalite', 'tantalite': '#3FDF1F', '#5F00BF': 'titanite', 'titanite': '#5F00BF', '#1FFF7F': 'topaz', 'topaz': '#1FFF7F', '#1FBF9F': 'tourmaline', 'tourmaline': '#1FBF9F', '#1FDF7F': 'vesuvianite', 'vesuvianite': '#1FDF7F', '#5F1FDF': 'wolframite', 'wolframite': '#5F1FDF', '#BFBF00': 'wollastonite', 'wollastonite': '#BFBF00', '#7FFF5F': 'zeolites', 'zeolites': '#7FFF5F', '#BF5F3F': 'zircon', 'zircon': '#BF5F3F', 'unknown': '#7F7F7F', '#7F7F7F': 'unknown', 'undefined': '#000000', '#000000': 'undefined'}

let tf;
try {
  const isPackaged = app.isPackaged;
  tf = require('@tensorflow/tfjs-node');

  log.info('LOADED TFJS-NODE Successfully');
} catch (error) {
  log.info('FAILED TO LOAD TFJS-NODE:', error);
  log.info('Error stack:', error.stack);
}


var win = ""
var saveDirectory = ""

const storage = new Store();
const static_loadouts = true;
// initialize loadouts if not already built
if(typeof storage.get('loadouts') === undefined || static_loadouts) {
  storage.set({'loadouts':
    { 
      "minerals": [
        "quartz",
        "K-feldspar",
        "plagioclase feldspar",
        "muscovite",
        "biotite",
        "amphibole",
        "orthopyroxene",
        "clinopyroxene",
        "olivine",
        "calcite",
        "dolomite",
        "gypsum",
        "anhydrite",
        "epidote",
        "garnet",
        "fluorite",
        "apatite",
        "zircon",
        "magnetite",
        "cassiterite",
        "chlorite",
        "clay minerals",
        "opal",
        "hematite",
        "limonite",
        "goethite",
        "pyrite",
        "chalcopyrite",
        "bornite",
        "galena",
        "sphalerite",
        "halite",
        "sylvite",
        "titanite",
        "rutile",
        "ilmenite",
        "corundum",
        "kyanite",
        "sillimanite",
        "andalusite",
        "staurolite",
        "talc",
        "serpentine",
        "prehnite",
        "zeolites",
        "topaz",
        "beryl",
        "tourmaline",
        "cordierite",
        "wollastonite",
        "vesuvianite",
        "scapolite",
        "siderite",
        "rhodochrosite",
        "smithsonite",
        "cerussite",
        "malachite",
        "azurite",
        "barite",
        "celestite",
        "graphite",
        "diamond",
        "native sulfur",
        "native gold",
        "native silver",
        "native copper",
        "chalcedony",
        "pentlandite",
        "chalcocite",
        "arsenopyrite",
        "cinnabar",
        "pyrrhotite",
        "molybdenite",
        "chloritoid",
        "stibnite",
        "realgar",
        "orpiment",
        "wolframite",
        "scheelite",
        "columbite",
        "tantalite",
        "monazite",
        "nepheline",
        "cummingtonite"
      ],

      "cystic_fibrosis": [
          "cf_alive", 
          "cf_dead", 
          "healthy_alive", 
          "healthy_dead"
      ],

      "plants": [
          "oregano", 
          "tomato", 
          "strawberry", 
          "pepper",
          "lettuce", 
          "zucchini", 
          "basil", 
          "cilantro",
          "dill",
          "mint",
          "seedling",
      ]
    }
  });
}

//var foundImages = []
//var completedImages = []
// if mac, use traffic light position (x: 10, y: 8) and hide title bar
// if windows, use the default title bar

function createWindow () {
  let trafficLightPosition = undefined;

  if (os.platform() === 'darwin') { // 'darwin' is the value for macOS
      trafficLightPosition = { x: 10, y: 8 };
  }

  win = new BrowserWindow({
      width: 1400,
      height: 1000,
      titleBarStyle: 'hidden',
      // titleBarStyle: os.platform() === 'darwin' ? 'hidden' : 'default',
      trafficLightPosition: trafficLightPosition,

      webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          nodeIntegration: false, // this is the best for distributables: keep it this way: Node.js is available in the Main and preload but not in the Renderer.
          contextIsolation: true,  // this is the best for distributables: keep it this way: preload NEEDED. default for electron now
          // enableRemoteModule: true,
          sandbox:false, // unfortunately, we absolutely need this to be set this to false in order to use some node modules
      },
      icon: path.join(__dirname, './src/public/img/icon.png') // Specify the path to your icon

  })

  win.loadFile(path.join(__dirname, './src/index.html'))

    // Make sure your main window close event is set up properly
  win.on('closed', () => {
    app.quit(); // Only quit when main window is closed
  });


  // win.webContents.openDevTools()
}

app.setName('Mosaic');
app.disableHardwareAcceleration() // prevents stupid canvas slowdowns

app.whenReady().then(createWindow);

app.on('activate', () => {
  if(os.platform() === 'darwin' && BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})



app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
       // Only quit if the main window is also closed: allow indep. closure of analysis window
       if (!win) {
        app.quit();
    }  
  }
})



function getFilename(path) {
  // Extract the filename from a path, handling both Windows and Unix paths
  const filename = path.split(/[/\\]/).pop(); // Splits on both forward and backslash
  return filename.replace(/\.(jpg|JPG|png|PNG|jpeg|JPEG|tiff|TIFF|TIF|tif|gif|GIF)$/, ''); // Removes known image extensions
}

ipcMain.handle('get_loadouts', async (event, args = "") => {
  if(args === "") {
    return storage.get('loadouts')
  } else {
    return storage.get('loadouts')[args]
  }
});

// auto set colours - its arbitrary. Each colour should be correlated to a value
// find highest unused value
ipcMain.handle('set_loadout', async (event, args) => {
  //var s = storage.get('loadouts')[args['loadout']]

  console.log("SAVING LOADOUT CHANGES... " , args)
  var path = 'loadouts.'+args['idx']
  storage.set(path, args['l'])
  console.log("LOADOUTS:", storage.get('loadouts'))
});


ipcMain.handle('save_img', async (event, args) => {
  var identifier = args['identifier']

  fs.readdir(saveDirectory, (err, items) => {
    if (err) {
      console.error("Error reading directory:", err);
      return;
    }

    var file = ''
    let base64Data;

    if(args['idx'] === '')  { // if there is no supplied index, it is not a grain: handle overlay / seg map
      
        // Create overlays directory if it doesn't exist
      const overlaysDir = path.join(saveDirectory, 'overlays');
      if (!fs.existsSync(overlaysDir)) {
        fs.mkdirSync(overlaysDir, { recursive: true });
      }

      if(args['type'] === 'segmentation_map' ) {
        file = identifier + "_" + args['type'] + '.png';
        base64Data = args['data'].replace(/^data:image\/png;base64,/, "");
  
      } else {
        file = path.join('overlays', identifier + "_" + args['type'] + '_overlay.jpg');
        base64Data = args['data'].replace(/^data:image\/jpeg;base64,/, "");
  
      }

    } else if(args['type'] === 'map') {
        file = identifier+"_"+args['type']+'_'+args['idx']+'.png'
        base64Data = args['data'].replace(/^data:image\/png;base64,/, "");
        
    } else {
      file = identifier+"_"+args['type']+'_'+args['idx']+'.jpg'
      base64Data = args['data'].replace(/^data:image\/jpeg;base64,/, "");
    }

    const fullPath = path.join(saveDirectory, file);

    // create folder for identifier
    fs.writeFile(fullPath, base64Data, 'base64', function (err) {

      if (err) {
        console.log("ERROR WRITING "+ file + ": "+ err)
        return "Segmentations could not be saved: "+err
      } else {
        console.log(file + " saved. ")
        return file;
      }
    });
  });
});

ipcMain.handle('save_label_colours', async(event, args) => {
  const labelColorsDict = args['dict'];
  const jsonString = JSON.stringify(labelColorsDict, null, 2);

  fs.writeFile(saveDirectory + "/label_colours.txt", jsonString, 'utf8', function (err) {
    if (err) {
      console.log("ERROR WRITING label_colours.txt: " + err);
      return "Label colors could not be saved: " + err;
    } else {
      console.log("label_colours.txt saved.");
      return "label_colours.txt";
    }
  });
});

ipcMain.handle('set_save_dir', async (event, args) => {
  console.log("FILE PATH ("+args['type']+"): " + args['path'])
  const path = args['path'].replace('file://', '')
  const identifier = args['identifier']

  // pass in path as inital starting point for dialog
  const save_dialog_options = {
    title: args['type'] == 'save' ? "Save '/"+identifier+"' Grains: "  : 'Load Path',
    defaultPath: path,
    properties: ['openDirectory', 'createDirectory'],
  }
  
  if(args['type'] == 'save') {
    await dialog.showOpenDialog(win, save_dialog_options).then((result) => {
      if(typeof result['filePaths'][0]  !== 'undefined') {
        
        // if folder 'identifier' doesn't exist in saveDirectory, create it:
        fs.mkdir(result['filePaths'][0]+"/"+identifier, function(err) {
          if (err) {
            console.log("ERROR CREATING GRAIN DIRECTORY: "+ err)
            return "Segmentation could not be saved: "+err
          } else {
            console.log("Grain directory '"+identifier+"' created. ")
          }
        });
        saveDirectory = result['filePaths'][0] + "/"+ identifier
        let seg_code = `document.getElementById("save-segmentation-map").title = "&nbsp; Save tiles to: ${saveDirectory}"`;
        let tile_code = `document.getElementById("save-tiles").title = "&nbsp; Save tiles to: ${saveDirectory}"`;
        win.webContents.executeJavaScript(seg_code);
        win.webContents.executeJavaScript(tile_code);

      }
    });
  } 
})


const { applyClassifier } = require('./src/classifier');


let model = null;

async function loadModel() {
  if (!model) {
    try {
      let modelPath;
      // Log environment info
      log.info('Is app packaged?', app.isPackaged);
      log.info('Current __dirname:', __dirname);
      log.info('Resource path:', process.resourcesPath);
      
      if (app.isPackaged) {
        // In production, use resourcesPath
        modelPath = path.join(process.resourcesPath, 'models', 'lin_comp_beaut_model', 'model.json');
      } else {
        // In development
        modelPath = path.join(__dirname, 'models', 'lin_comp_beaut_model', 'model.json');
      }

      log.info('Attempting to load model from:', modelPath);

      model = await tf.loadLayersModel(`file://${modelPath}`);
      log.info("Model loaded successfully.");
      // Note: model.summary() is not available for SavedModels
      // You can print other information about the model if needed
    } catch (error) {
      log.info("Error loading model:", error);
    }
  }
}

ipcMain.handle('apply_classifier', async (event, images) => {
  try {
      if (!model) {
          await loadModel();
      }
      if (!model) {
          console.error("Model failed to load");
          return { success: false, error: "Model failed to load" };
      }
      console.log("APPLYING CLASSIFIER");
      const predictions = await applyClassifier(images, model, tf);
      return { success: true, predictions };
  } catch (error) {
      console.error('Error applying classifier:', error);
      return { success: false, error: error.message };
  }
});

ipcMain.handle('open_analysis', () => {
    if (analysisWindow) {
        analysisWindow.focus();
        return;
    }

    analysisWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        titleBarStyle: 'hidden',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
            webgl: true,
            webSecurity:false,
            gpuAcceleration:true

        }
    });

    analysisWindow.webContents.openDevTools()
    analysisWindow.loadFile('src/analysis/analysis.html');

    // Clean up resources before closing
    analysisWindow.on('close', (e) => {
      if (analysisWindow && !analysisWindow.isDestroyed()) {
          analysisWindow.webContents.closeDevTools();
          analysisWindow = null;
      }
    });

    // Null out the reference after window is closed
    analysisWindow.on('closed', () => {
        analysisWindow = null;
    });
  

    return 'Analysis window opened';
});

ipcMain.handle('set_draw_data', async (event, data) => {
  storedImageData = data;
  console.log('Received and stored image data in main process');
});

ipcMain.handle('get_draw_data', async () => {
  const data = storedImageData;
  storedImageData = null; // Clear stored data after sending
  return data;
});

ipcMain.handle('get_label_colours', async () => {
  return label_colours;
});

ipcMain.handle('save_grains', async (event, {path, data}) => {
  const savePath = dialog.showSaveDialogSync({
      defaultPath: path,
      filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  
  if (savePath) {
      fs.writeFileSync(savePath, data);
  }
});

ipcMain.handle('is-packaged', () => app.isPackaged);

