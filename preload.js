const { contextBridge, ipcRenderer } = require("electron");
const { spawn } = require('child_process')
const path = require('path')

// Helper function to get the correct SLIC executable path
const getSlicPath = () => {
    // For development, use project directory
    const basePath = path.join(__dirname, 'resources');
    const execName = process.platform === 'win32' ? 'slic_win.exe' : 'slic_unix';
    
    // Debug log
    console.log('Base path:', basePath);
    console.log('Looking for executable:', execName);
    
    return path.join(basePath, execName);
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
            let validChannels = [
                "save_segment",
                "save_label_colours", 
                "set_file_path",
                "get_loadouts",
                "set_loadout",
                "open-analysis",
                "send-image-data",
                "request-image-data"
            ]; // list of ipcMain.handle channels you want access in frontend to
            if (validChannels.includes(channel)) {
                // ipcRenderer.invoke accesses ipcMain.handle channels like 'download_pdf'
                // make sure to include this return statement or you won't get your Promise back
                return ipcRenderer.invoke(channel, data); 
            }
        },
        applyClassifier: (images) => ipcRenderer.invoke('apply-classifier', images),
        runSlic: async ({ dimensions, pixelData }) => {
            // The stdout of slic.cpp is what this promsie ends up returning on success
            return new Promise((resolve, reject) => {
                const slicPath = getSlicPath();
                
                // Spawn process with just dimensions as argument
                const process = spawn(slicPath, [dimensions]);
                
                let stdout = '';
                let stderr = '';

                // Handle stdout data
                process.stdout.on('data', (data) => {
                    stdout += data;
                });

                // Handle stderr data
                process.stderr.on('data', (data) => {
                    stderr += data;
                });

                // Handle errors
                process.on('error', (error) => {
                    console.error('Failed to start SLIC process:', error);
                    reject(error);
                });

                // Handle process completion
                process.on('close', (code) => {
                    if (code === 0) {
                        resolve(stdout);
                    } else {
                        reject(new Error(`SLIC process exited with code ${code}: ${stderr}`));
                    }
                });

                // Write pixel data to stdin
                process.stdin.write(pixelData);
                process.stdin.end();
            });
        },
        openAnalysisWindow: () => ipcRenderer.invoke('open-analysis')
    }
);