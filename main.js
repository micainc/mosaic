// main.js

const { app, BrowserWindow } = require('electron')
const path = require('path');
const {ipcMain} = require('electron')
const fs = require('fs');
const { resolve } = require('path');
const {dialog} = require('electron')
const storage = require('electron-json-storage');


var win = ""
var loadDirectory = ""
var saveDirectory = ""

storage.set('loadouts', { cystic_fibrosis: {cf_alive: { val: 1, color: "#FF0000"}, cf_dead: {val: 2, color: " #880000"}, healthy_alive: {val: 3, color: " #00FF00"}, healthy_dead: { val: 4, color: " #008800"}}}, function(error) {
  if (error) throw error;
});



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

var getFilename = function (str) {
  return str.substring(str.lastIndexOf('/')+1);
}

ipcMain.handle('get_loadouts', async (event) => {
  return storage.getSync('loadouts')
});

ipcMain.handle('save_map', async (event, args) => {
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