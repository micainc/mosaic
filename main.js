// main.js

const { app, BrowserWindow } = require('electron')
const path = require('path');
const {ipcMain} = require('electron')
const fs = require('fs');
const { resolve } = require('path');
const {dialog} = require('electron')

function createWindow () {
    const win = new BrowserWindow({
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

ipcMain.handle('download_map', async (event, args) => {
  const dialog_options = {
    title: 'Save JSON',
    defaultPath: args['path'].replace('.jpg', '_'+args['id']).replace('.png', '_'+args['id']).replace('.jpeg', '_'+args['id']).replace('.tif', '_'+args['id']).replace('.tiff', '_'+args['id']).replace('file://', ''),
  }

  console.log(dialog_options['defaultPath'])
  await dialog.showSaveDialog(null, dialog_options).then((result) => {
    return new Promise(function(resolve, reject) {
      const base64Data = args['url'].replace(/^data:image\/png;base64,/, "");
      console.log(result['filePath'])
      fs.writeFile(dialog_options['defaultPath']+'.png', base64Data, 'base64', function (err) {
        if (err) {
          reject("Image map could not be saved: ", err)
        }
      });
      resolve("Map Generated successfully Successfully")
    });
  })
});








