// main.js
const os = require('os');
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');


// ENABLE LOGGER
const log = require('electron-log');

// Configure log
log.transports.file.level = 'debug';
log.transports.console.level = 'debug';

// Then use log instead of console
log.info('App starting...');
// log.error('Something failed:', error);



// ENABLE TFJS-NODE
let tf;
try {
  const isPackaged = app.isPackaged;
  if (isPackaged) {
      // We're in production/packaged mode
      const tfPath = path.join(process.resourcesPath, 'app.asar.unpacked/node_modules/@tensorflow/tfjs-node');
      tf = require(tfPath);
  } else {
      // We're in development mode
      tf = require('@tensorflow/tfjs-node');
  }
} catch (error) {
  console.error('Failed to load TensorFlow:', error);
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
  win.webContents.openDevTools()
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
    app.quit()
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


ipcMain.handle('save_segment', async (event, args) => {
  var identifier = args['identifier']

  if(args['type'] !== 'map' && args['type'] !== 'segmentation_map') {
    identifier = getFilename(args['absolute_path'])
  }

  fs.readdir(saveDirectory, (err, items) => {
    if (err) {
      console.error("Error reading directory:", err);
      return;
    }

    var file = ''

    if(args['idx'] !== '') {
      file = identifier+"_"+args['type']+'_'+args['idx']+'.png'

    } else {
      file = identifier+"_"+args['type']+'.png'
    }
    const base64Data = args['data'].replace(/^data:image\/png;base64,/, "");
    // create folder for identifier
    fs.writeFile(saveDirectory+"/"+file, base64Data, 'base64', function (err) {

      if (err) {
        console.log("ERROR WRITING "+ file + ": "+ err)
        return "Segmentation could not be saved: "+err
      } else {
        console.log(file + " saved. ")
        return file
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

ipcMain.handle('set_file_path', async (event, args) => {
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

        // let code = `document.getElementById("save-path").innerHTML = "&nbsp; ${saveDirectory}"`;
        // win.webContents.executeJavaScript(code);
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
      console.log('Is app packaged?', app.isPackaged);
      console.log('Current __dirname:', __dirname);
      console.log('Resource path:', process.resourcesPath);
      
      if (app.isPackaged) {
        // In production, use resourcesPath
        modelPath = path.join(process.resourcesPath, 'models', 'lin_comp_beaut_model', 'model.json');
      } else {
        // In development
        modelPath = path.join(__dirname, 'models', 'lin_comp_beaut_model', 'model.json');
      }

      console.log('Attempting to load model from:', modelPath);

      model = await tf.loadLayersModel(`file://${modelPath}`);
      console.log("Model loaded successfully.");
      // Note: model.summary() is not available for SavedModels
      // You can print other information about the model if needed
    } catch (error) {
      console.error("Error loading model:", error);
    }
  }
}

ipcMain.handle('apply-classifier', async (event, images) => {
  try {
    if (!model) {
      await loadModel();
    }
    if (!model) {
      console.error("Model failed to load");
      return { success: false, error: "Model failed to load" };
    }
    console.log("APPLYING CLASSIFIER")
    const predictions = await applyClassifier(images, model, tf);
    return { success: true, predictions };
  } catch (error) {
    console.error('Error applying classifier:', error);
    return { success: false, error: error.message };
  }
});