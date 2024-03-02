// main.js

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
          1: "k-feldspar", 
          2: "plagioclase feldspar", 
          3: "muscovite",
          4: "biotite", 
          5: "amphibole", 
          6: "orthopyroxene", 
          7: "clinopyroxine",
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
          18: "opaques",
          19: "semi-opaques",
          20: "chlorite",
          21: "unknown"
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

function createWindow () {
    win = new BrowserWindow({
        width: 1400,
        height: 1000,
        titleBarStyle: 'hidden',
        trafficLightPosition: { x: 10, y: 8 },

        webPreferences: {
            preload: path.join(__dirname, './src/preload.js'),
            enableRemoteModule: true
        },
    })

    win.loadFile(path.join(__dirname, './src/index.html'))
    win.webContents.openDevTools()

}
app.setName('Mapier');
app.disableHardwareAcceleration() // prevents stupid canvas slowdowns

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
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
  var nextIdx = 0;
  var identifier = args['identifier']
  if(args['type'] !== 'map' || args['type'] !== 'segmentation_map') {
    identifier = getFilename(args['absolute_path'])
  }

  // if images in the save dir have the same timestamp as passed in args, overwrite them- otherwise, add them to dir at higher idx
  fs.readdir(saveDirectory, (err, files) => {
    if (err) {
      console.error("Error reading directory:", err);
      return;
    }
    var pngFiles = files.filter(file => file.endsWith('.png'));

    for (const f of pngFiles) {
      if (f.includes(args['identifier']) && !f.includes(args['timestamp'])) { 
        console.log("FILE: ", f)
        // get the highest idx value
        var tokens = f.split('_')
        if(parseInt(tokens[tokens.length-2]) >= nextIdx) {
          nextIdx = parseInt(tokens[tokens.length-2])+1;
        }
      }
    }

    var file = ''

    if(args['idx'] !== '') {
      args['idx'] += nextIdx; 
      file = identifier+"_"+args['type']+'_'+args['idx']+'_'+args['timestamp']+'.png'

    } else {
      file = identifier+"_"+args['type']+"_"+args['timestamp']+'.png'
    }
    const base64Data = args['data'].replace(/^data:image\/png;base64,/, "");
    fs.writeFile(saveDirectory+"/"+file, base64Data, 'base64', function (err) {

      if (err) {
        console.log("ERROR WRITING "+ file + ": "+ err)

        return "Segmentation could not be saved: "+err
      } else {
        console.log(file + "saved. ")
        return file
      }
    });
  });
});

ipcMain.handle('set_file_path', async (event, args) => {
  console.log("FILE PATH ("+args['type']+"): " + args['path'])
  const path = args['path'].replace('file://', '')

  const save_dialog_options = {
    title: args['type'] == 'save' ? 'Save Path' : 'Load Path',
    defaultPath: path,
    properties: ['openDirectory', 'createDirectory'],
  }
  
  if(args['type'] == 'save' && saveDirectory == '') {
    await dialog.showOpenDialog(win, save_dialog_options).then((result) => {
      if(typeof result['filePaths'][0]  !== 'undefined') {
        saveDirectory = result['filePaths'][0]
        let code = `document.getElementById("save-path").innerHTML = "&nbsp; ${saveDirectory}"`;
        win.webContents.executeJavaScript(code);
      }
    });
  } 
})