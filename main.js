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
      0: {
        name: "minerals",
        labels: {
          0: {name: "quartz"}, 
          1: {name: "k-feldspar"}, 
          2: {name: "plagioclase feldspar"}, 
          3: {name: "muscovite"},
          4: {name: "biotite"}, 
          5: {name: "amphibole"}, 
          6: {name: "orthopyroxene"}, 
          7: {name: "clinopyroxine"},
          8: {name: "olivine"},
          9: {name: "calcite"},
          10: {name: "dolomite"},
          11: {name: "gypsum"},
          12: {name: "anhydrite"},
          13: {name: "epidote"},
          14: {name: "garnet"},
          15: {name: "fluorite"},
          16: {name: "apatite"},
          17: {name: "zircon"},
          18: {name: "opaques"},
          19: {name: "semi-opaques"},
        }
      },

      1: {
        name: "cystic_fibrosis",
        labels: {
          0: {name:"cf_alive"}, 
          1: {name:"cf_dead"}, 
          2: {name:"healthy_alive"}, 
          3: {name: "healthy_dead"}
        }
      },

      2: {
        name: "plants",
        labels: {
          0: { name: "oregano"}, 
          1: {name: "tomato"}, 
          2: {name: "strawberry"}, 
          3: { name: "pepper"},
          4: { name: "lettuce"}, 
          5: {name: "zucchini"}, 
          6: {name: "basil"}, 
          7: { name: "cilantro"},
          8: { name: "dill"},
          9:{ name: "mint"},
          10:{ name: "seedling"},
        }
      },
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
    //win.webContents.openDevTools()

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

var getFilename = function (str) {
  return str.substring(str.lastIndexOf('/')+1).replace(/\.(jpg|JPG|png|PNG|jpeg|JPEG|tiff|TIFF|TIF|tif|gif|GIF)/, '');
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
  var name = getFilename(args['file'])
  
  if(args['type'] === 'map'){
    name = name.split("_")[0]+"_map"
  }  
  console.log("NAME: ", name)

  var nextIdx = 0;
  // if images in the save dir have the same timestamp as passed in args, overwrite them- otherwise, add them to dir at higher idx
  fs.readdir(saveDirectory, (err, files) => {
    if (err) {
      console.error("Error reading directory:", err);
      return;
    }
    var pngFiles = files.filter(file => file.endsWith('.png'));
    console.log("TYPE: ", args['type'])

    for (const f of pngFiles) {
      if (f.includes(name) && !f.includes(args['timestamp'])) { 
        console.log("FILE: ", f)
        // get the highest idx value
        var tokens = f.split('_')
        if(parseInt(tokens[1]) >= nextIdx) {
          nextIdx = parseInt(tokens[1])+1;
        }
      }
    }
    console.log("NEXT IDX: ", nextIdx)

    args['idx'] += nextIdx; //
  
    var file = ""
    file = name+'_'+args['idx']+'_'+args['timestamp']+'.png'
    
    console.log("WRITING FILE : ", file)
    const base64Data = args['url'].replace(/^data:image\/png;base64,/, "");
    fs.writeFile(saveDirectory+"/"+file, base64Data, 'base64', function (err) {
      if (err) {
        return "Image map could not be saved: "+err
      } else
        return file
    });
  });
});

ipcMain.handle('set_file_path', async (event, args) => {
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