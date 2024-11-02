const { contextBridge, ipcRenderer } = require("electron");
const { execFile } = require('child_process')
const path = require('path')

// Helper function to get the correct SLIC executable path
const getSlicPath = () => {
    switch (process.platform) {
        case 'win32':
            return path.join(process.resourcesPath, 'slic_win.exe');
        case 'darwin':
            return path.join(process.resourcesPath, 'slic_unix');
        case 'linux':
            return path.join(process.resourcesPath, 'slic_unix');
        default:
            throw new Error('Unsupported platform');
    }
};

window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector)
        if (element) element.innerText = text
    }

    for (const type of ['chrome', 'node', 'electron']) {
        replaceText(`${type}-version`, process.versions[type])
    }
})

contextBridge.exposeInMainWorld(
    "api", {
        invoke: (channel, data) => {
            let validChannels = ["save_segment", "save_label_colours", "set_file_path", "get_loadouts", "set_loadout"]; // list of ipcMain.handle channels you want access in frontend to
            if (validChannels.includes(channel)) {
                // ipcRenderer.invoke accesses ipcMain.handle channels like 'download_pdf'
                // make sure to include this return statement or you won't get your Promise back
                return ipcRenderer.invoke(channel, data); 
            }
        },
        applyClassifier: (images) => ipcRenderer.invoke('apply-classifier', images),
        runSlic: async (data) => {
            // currently, 'data' is just a string
            return new Promise((resolve, reject) => {
                const slicPath = getSlicPath();
                
                execFile(slicPath, [data], (error, stdout, stderr) => {
                    if (error) {
                        console.error('SLIC Error:', error);
                        reject(error);
                        return;
                    }
                    resolve(stdout);
                });
            });
        }
    },
);