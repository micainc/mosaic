const { contextBridge, ipcRenderer } = require("electron");




window.addEventListener('DOMContentLoaded', () => {
    console.log('__dirname:', __dirname);
    console.log('process.resourcesPath:', process.resourcesPath);

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
            let validChannels = [
                "save_img",
                "save_label_colours", 
                "set_save_dir",
                "get_loadouts",
                "set_loadout",
                "open_analysis",
                "set_draw_data",
                "get_draw_data",
                'get_label_colours',
                'save_grains',
                'is_packaged',
                'apply_classifier',
                'apply_slic',

            ]; // list of ipcMain.handle channels you want access in frontend to
            if (validChannels.includes(channel)) {
                // ipcRenderer.invoke accesses ipcMain.handle channels like 'download_pdf'
                // make sure to include this return statement or you won't get your Promise back
                return ipcRenderer.invoke(channel, data); 
            }
        },
    }
);