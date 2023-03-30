// main.js

const { app, BrowserWindow } = require('electron')
const path = require('path');
const {ipcMain} = require('electron')
const fs = require('fs');
const { resolve } = require('path');
const {dialog} = require('electron')
var win = ""
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


ipcMain.handle('download_map', async (event, args) => {
  file = getFilename(args['file']).replace('.jpg', '_'+args['id']).replace('.png', '_'+args['id']).replace('.jpeg', '_'+args['id']).replace('.tif', '_'+args['id']).replace('.tiff', '_'+args['id'])
  console.log(args['path']+"/"+file+'.png')
  const base64Data = args['url'].replace(/^data:image\/png;base64,/, "");
  fs.writeFile(args['path']+"/"+file+'.png', base64Data, 'base64', function (err) {
    if (err) {
      reject("Image map could not be saved: ", err)
    }
  });
});


ipcMain.handle('set_download_path', async (event, args) => {
  const dialog_options = {
    title: 'Save Path...',
    defaultPath: args['path'].replace('file://', ''),
    properties: ['openDirectory'],
  }

  return await dialog.showOpenDialog(win, dialog_options)
});







