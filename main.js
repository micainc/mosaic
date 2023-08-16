// main.js

const { app, BrowserWindow } = require('electron')
const path = require('path');
const {ipcMain} = require('electron')
const fs = require('fs');
const { resolve } = require('path');
const {dialog} = require('electron')
const Store = require('electron-store');


var win = ""
var loadDirectory = ""
var saveDirectory = ""

const storage = new Store();

// initialize loadouts if not already built
if(typeof storage.get('loadouts') === undefined) {
  console.log("FLAG")
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
  return str.substring(str.lastIndexOf('/')+1);
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
  console.log(args)
  var path = 'loadouts.'+args['idx']
  storage.set(path, args['l'])
  console.log("ALL:", storage.get('loadouts'))
});

ipcMain.handle('save_crop', async (event, args) => {
  //file = getFilename(args['file']).replace('.jpg', '_'+args['id']).replace('.png', '_'+args['id']).replace('.jpeg', '_'+args['id']).replace('.tif', '_'+args['id']).replace('.tiff', '_'+args['id'])
  file = getFilename(args['file']).replace(/\.(jpg|JPG|png|PNG|jpeg|JPEG|tiff|TIFF|TIF|tif|gif|GIF)/, '_'+args['id'])
  console.log(args)
  console.log("SAVE PATH: ", saveDirectory+"/"+file+'.png')
  const base64Data = args['url'].replace(/^data:image\/png;base64,/, "");
  fs.writeFile(saveDirectory+"/"+file+'.png', base64Data, 'base64', function (err) {
    if (err) {
      return "Image map could not be saved: "+err
    } else
      return file
  });

  // append file to completed images; change to next image
  //completedImages.push(getFilename(args['file']))
  //let code = `document.getElementById("parameters-number").innerHTML = "(${completedImages.length}/${foundImages.length})"`;
  //win.webContents.executeJavaScript(code);
});

ipcMain.handle('set_file_path', async (event, args) => {
  const path = args['path'].replace('file://', '')

  const save_dialog_options = {
    title: args['type'] == 'save' ? 'Save Path' : 'Load Path',
    defaultPath: path,
    properties: ['openDirectory', 'createDirectory'],
  }
  
  const load_dialog_options = {
    title: args['type'] == 'save' ? 'Save Path' : 'Load Path',
    defaultPath: path,
    properties: ['openDirectory'],
  }

  // if image dragged: assume load path. If "load" button clicked, select load pth
  if(args['type'] == 'load_drag') {
    file = getFilename(path)
    loadDirectory = path.replace('/'+file, '');
    let code = `document.getElementById("load-path").innerHTML = "&nbsp; ${loadDirectory}"`;
    win.webContents.executeJavaScript(code);
  } else if(args['type'] == 'save' && saveDirectory == '') {
    await dialog.showOpenDialog(win, save_dialog_options).then((result) => {
      if(typeof result['filePaths'][0]  !== 'undefined') {
        saveDirectory = result['filePaths'][0]
        let code = `document.getElementById("save-path").innerHTML = "&nbsp; ${saveDirectory}"`;
        win.webContents.executeJavaScript(code);
      }
    });
  } else if(args['type'] == 'load') { // clicked load button
    await dialog.showOpenDialog(win, load_dialog_options).then((result) => {
      if(typeof result['filePaths'][0]  !== 'undefined') {
        loadDirectory = result['filePaths'][0]
        let code = `document.getElementById("load-path").innerHTML = "&nbsp; ${loadDirectory}"`;
        win.webContents.executeJavaScript(code);
      }
    });
  } 
  console.log("continuing checking load")
  if(args['type'] == 'load' || args['type'] == 'load_drag') {
    // get list of all images in loadDirectory
    fs.readdir(loadDirectory, function (err, files) {
      //handling error
      if (err) {
          return console.log('Unable to scan directory: ' + err);
      } 
      //listing all files using forEach
      /*
      files.forEach(function (file) {
          // Do whatever you want to do with the file
          if(file.match(/\.(jpg|JPG|png|PNG|jpeg|JPEG|tif|TIF|tiff|TIFF|gif|GIF)/)) {
            console.log(file); 
            foundImages.push(file)
          }
      });
      */
      //let code = `document.getElementById("parameters-number").innerHTML = "(${completedImages.length}/${foundImages.length})"`;
      //win.webContents.executeJavaScript(code);
    });
  }
})