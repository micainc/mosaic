Kanban: https://github.com/users/kfilyk/projects/1

A CV pipeline application for segmenting, classifying, verifying, and then reporting on multi-channel image data.

MOSAIC: Multimodal Object Segmentation, Analysis, Image Classification

## Development Setup

1. Install Emscripten:
```bash
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh  # On Windows: emsdk_env.bat

"scripts": {
  "start":  "Start the application in development mode"
  "make": "Create distributable packages of your application" (ex. Win .exe, Mac .dmg, Linux .deb)
  "package": "Package the app without creating installers" (good for testing distributable package)
}