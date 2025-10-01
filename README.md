
# MOSAIC
**Multimodal Object Segmentation, Analysis, Image Classification**  
A computer vision pipeline application for segmenting, classifying, verifying, and reporting on multi-channel image data.

## Project Resources
### Kanban Board
https://github.com/users/kfilyk/projects/1
### Google docs
https://drive.google.com/drive/u/0/folders/1XxQ9vUEKWdX-FOmhfFwP5wQqB_2vcq0D

## Scripts

| Script    | Description                                                                                  |
|-----------|----------------------------------------------------------------------------------------------|
| `start`   | Start the application in development mode                                                    |
| `make`    | Create distributable packages of your application (e.g., Windows `.exe`, Mac `.dmg`, Linux `.deb`) |
| `package` | Package the app without creating installers (good for testing distributable packages)        |


## Tech Requirements
- Node.js version: **18.x** or **20.x**

## Start process
1. `npm i` (if first time running)
2. `npm start`



## Node.js & VSCode Setup Guide for Windows

### Step 1: Install VSCode
1. Download VSCode from the official website:  
   [https://code.visualstudio.com/](https://code.visualstudio.com/)
2. Download the installer:  
   `VSCodeUserSetup-x64-<version>.exe`
3. Run the installer and follow the prompts.


### Step 2: Install Node.js and Dependencies
You can install Node.js **using NVM (recommended)** or **without NVM**.

#### Option 1: Using NVM (Recommended)
1. Download NVM for Windows:  
   [https://github.com/coreybutler/nvm-windows/releases](https://github.com/coreybutler/nvm-windows/releases)
2. Install NVM and follow the setup instructions.
3. Install Node.js 20:
  ```bash
    nvm install 20
    nvm use 20
  ```
#### Option 2: Without NVM
1. Go to the official Node.js download page:
    [https://nodejs.org/en/download](https://nodejs.org/en/download)
2. Select the LTS (20.x.x) version.
3. Download the Windows Installer (.msi) (64-bit recommended).
  - Keep the default installation path.
  - Ensure “Add to PATH” is checked.

### Step 3: Verify the Installation
Open Command Prompt or Git Bash and run:
  ```bash
    nvm -v     # Only if using NVM
    node -v
    npm -v
  ```
Expected output
  ```bash
    NVM: 1.x.x
    Node: v20.x.x
    NPM: 10.x.x
  ```
### Troubleshooting Common Issues on Windows
- npm fails with node-gyp error
  - You need to install the latest version of Visual Studio including the "Desktop development with C++" workload" <br>
    Steps to resolve the error:
    1. Search for "Visual Studio Installer" in the Windows search bar and open it.
    2. Locate your installed version of Visual Studio and click the "Modify" button.
    3. In the Visual Studio Installer, navigate to the **Workloads** tab.
Check the box next to **Desktop development with C++**.
Optionally, ensure that a recent **Windows SDK** is also selected in the installation details on the right-hand panel.
    4. Click the "Modify" or "Install" button in the installer to begin the installation process.
    5. Delete node_modules and package-lock.json by running ```rm -rf node_modules package-lock.json```
    6. rerun the install command ```npm i```
- running `npm start` loads the app but the logs show this error  
  - **FAILED TO LOAD TFJS-NODE**: Error: The specified module could not be found. \\?~\node_modules\@tensorflow\tfjs-node\lib\napi-v8\tfjs_binding.node <br>
    Steps to resolve the error:
    1.  Missing build dependencies on Windows: When a precompiled binary isn't available, tfjs-node will attempt to compile from source. 
        - Install the Visual Studio Build Tools, including the "Desktop development with C++" workload.
        - Make sure you have Python installed and configured correctly in your system's PATH.
    2. This issue, where the tensorflow.dll and tfjs_binding.node files are in different napi-v* folders 
        - ```cp node_modules/@tensorflow/tfjs-node/lib/napi-v9/tensorflow.dll node_modules/@tensorflow/tfjs-node/lib/napi-v8/```









