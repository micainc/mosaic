// main.js
const os = require('os');
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');


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

// const tf = require('@tensorflow/tfjs'); // this is for BROWSER environments
const tf = require('@tensorflow/tfjs-node');  // this is for node.js, supports loading models from the filesys

const { applyClassifier } = require('./src/classifier');

let model = null;

function custom_sparse_categorical_crossentropy(yTrue, yPred) {
  return tf.tidy(() => {
      const yTrueInt = tf.cast(yTrue, 'int32');
      const ignoreMask = tf.logicalOr(tf.equal(yTrueInt, 0), tf.equal(yTrueInt, 1));
      const yTrueModified = tf.where(ignoreMask, tf.onesLike(yTrueInt).mul(-1), yTrueInt);
      
      const lossFn = tf.losses.sparseCategoricalCrossentropy({
          from_logits: false,
          reduction: 'none'
      });
      
      const loss = lossFn(yTrueModified, yPred);
      const validMask = tf.logicalNot(ignoreMask);
      return tf.sum(tf.mul(loss, tf.cast(validMask, 'float32'))) / tf.sum(tf.cast(validMask, 'float32'));
  });
}

function custom_accuracy(yTrue, yPred) {
  return tf.tidy(() => {
      const yTrueInt = tf.cast(yTrue, 'int32');
      const ignoreMask = tf.logicalOr(tf.equal(yTrueInt, 0), tf.equal(yTrueInt, 1));
      const validMask = tf.logicalNot(ignoreMask);
      
      const correctPredictions = tf.equal(yTrueInt, tf.argMax(yPred, -1));
      const maskedCorrectPredictions = tf.logicalAnd(correctPredictions, validMask);
      
      return tf.mean(tf.cast(maskedCorrectPredictions, 'float32'));
  });
}

async function loadModel() {
  if (!model) {
    const customObjects = {
      custom_sparse_categorical_crossentropy,
      custom_accuracy
    };

    const modelPath = path.join(__dirname, 'models', 'linear_composite_beauty_model', 'model.json');

    // Read the model.json file
    const modelJSON = JSON.parse(fs.readFileSync(modelPath, 'utf8'));

    // Update the weightData paths to be absolute
    modelJSON.weightsManifest[0].paths = modelJSON.weightsManifest[0].paths.map(weightPath => 
      path.join(path.dirname(modelPath), weightPath)
    );

    // Create an IOHandler to load the weights
    const weightHandler = tf.io.fileSystem(path.dirname(modelPath));


    console.log("HERE")
    model = await tf.loadLayersModel(tf.io.fromMemory(modelJSON, weightHandler), { customObjects });  // Replace backslashes with forward slashes on Windows
    console.log("Model loaded successfully. Input shape:", model.inputs[0].shape);

  }
}

ipcMain.handle('apply-classifier', async (event, images) => {
  try {
    if (!model) {
      await loadModel();
    }
    console.log("Model loaded successfully. Input shape:", model.inputs[0].shape);

    // console.log("APPLYING CLASSIFIER")
    // const predictions = await applyClassifier(images, model);
    let predictions = []
    return { success: true, predictions };
  } catch (error) {
    console.error('Error applying classifier:', error);
    return { success: false, error: error.message };
  }
});