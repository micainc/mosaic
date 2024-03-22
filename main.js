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
      "minerals": {
        0: "quartz",
        1: "K-feldspar",
        2: "plagioclase feldspar",
        3: "muscovite",
        4: "biotite",
        5: "amphibole",
        6: "orthopyroxene",
        7: "clinopyroxene",
        8: "olivine",
        9: "calcite",
        10: "dolomite",
        11: "gypsum",
        12: "anhydrite",
        13: "epidote",
        14: "garnet",
        15: "fluorite",
        16: "apatite",
        17: "zircon",
        18: "magnetite",
        19: "cassiterite",
        20: "chlorite",
        21: "clay minerals",
        22: "opal",
        23: "hematite",
        24: "limonite",
        25: "goethite",
        26: "pyrite",
        27: "chalcopyrite",
        28: "bornite",
        29: "galena",
        30: "sphalerite",
        31: "halite",
        32: "sylvite",
        33: "titanite",
        34: "rutile",
        35: "ilmenite",
        36: "corundum",
        37: "kyanite",
        38: "sillimanite",
        39: "andalusite",
        40: "staurolite",
        41: "talc",
        42: "serpentine",
        43: "prehnite",
        44: "zeolites",
        45: "topaz",
        46: "beryl",
        47: "tourmaline",
        48: "cordierite",
        49: "wollastonite",
        50: "vesuvianite",
        51: "scapolite",
        52: "siderite",
        53: "rhodochrosite",
        54: "smithsonite",
        55: "cerussite",
        56: "malachite",
        57: "azurite",
        58: "barite",
        59: "celestite",
        60: "graphite",
        61: "diamond",
        62: "native sulfur",
        63: "native gold",
        64: "native silver",
        65: "native copper",
        67: "chalcedony",
        68: "pentlandite",
        69: "chalcocite",
        70: "arsenopyrite",
        71: "cinnabar",
        72: "pyrrhotite",
        73: "molybdenite",
        74: "chloritoid",
        75: "stibnite",
        76: "realgar",
        77: "orpiment",
        78: "wolframite",
        79: "scheelite",
        80: "columbite",
        81: "tantalite",
        82: "monazite",
        83: "nepheline",
        84: "cummingtonite",
      },

      "cystic_fibrosis": {
          0: "cf_alive", 
          1: "cf_dead", 
          2: "healthy_alive", 
          3: "healthy_dead"
      },

      "plants": {
        0: "oregano", 
          1: "tomato", 
          2: "strawberry", 
          3: "pepper",
          4: "lettuce", 
          5: "zucchini", 
          6: "basil", 
          7: "cilantro",
          8: "dill",
          9: "mint",
          10: "seedling",
      }
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

app.whenReady().then(() => {
  createWindow()
  if(os.platform() === 'darwin') {
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
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


ipcMain.handle('save_crop', async (event, args) => {
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
        fs.mkdir(saveDirectory+"/"+identifier, function(err) {
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