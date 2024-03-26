// main.js
const os = require('os');
const { app, BrowserWindow } = require('electron')
const path = require('path');
const {ipcMain} = require('electron')
const fs = require('fs');
//const fsp = require('fs').promises;

//const { resolve } = require('path');
const {dialog} = require('electron')
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
          preload: path.join(__dirname, './src/preload.js'),
          enableRemoteModule: true
      },
      icon: path.join(__dirname, './src/images/icon.png') // Specify the path to your icon

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
  
  if(args['type'] == 'save' && saveDirectory == '') {
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

        let code = `document.getElementById("save-path").innerHTML = "&nbsp; ${saveDirectory}"`;
        win.webContents.executeJavaScript(code);
      }
    });
  } 
})