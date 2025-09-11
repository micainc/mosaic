# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MOSAIC is an Electron-based desktop application for computer vision work in geological/mineral analysis. It provides a complete pipeline for segmenting, classifying, verifying, and reporting on multi-channel image data.

## Key Commands

### Development
```bash
# Install dependencies
npm install

# Start development server
npm start

# Build production application
npm run dist         # Build for current platform
npm run dist-mac     # Build for macOS
npm run dist-win     # Build for Windows
```

### Code Quality
```bash
# No linting or type checking scripts are configured
# The project uses vanilla JavaScript without a formal linting setup
```

## Architecture Overview

### Technology Stack
- **Electron v32.1.2**: Desktop application framework
- **TensorFlow.js**: Deep learning inference with pre-trained DeepLab v4 model
- **Custom C++ Addon**: High-performance SLIC clustering algorithm (src/slic/)
- **Three.js**: 3D visualization window
- **Chart.js**: Statistical analysis charts
- **Vanilla JavaScript**: Frontend with jQuery/jQuery UI

### Core Architecture

The application follows a multi-process Electron architecture:

1. **Main Process** (`main.js`): 
   - Manages application lifecycle
   - Creates windows (main, charts, 3D visualization)
   - Handles IPC communication between processes

2. **Renderer Process** (`src/renderer.js`):
   - Main UI and interaction logic
   - Multi-canvas layered rendering system
   - Tool-based interaction system

3. **Processing Pipeline**:
   - **Image Loading**: Multi-channel image support (up to 15 channels)
   - **Segmentation**: TensorFlow.js DeepLab model (`src/segmentation.js`)
   - **Clustering**: C++ SLIC algorithm via Node addon
   - **Classification**: 86+ predefined mineral classes (`src/default_classes.js`)
   - **Verification**: Manual annotation tools
   - **Export**: Training data and segmentation maps

### Key Components

- **Canvas System**: Three-layer architecture
  - Image layer: Display original/processed images
  - Drawing layer: User annotations and selections
  - SVG layer: Overlays and UI elements

- **Tool System** (`src/tools/`):
  - Pen tool: Freehand drawing
  - Brush tool: Radius-based painting
  - Fill tool: Flood fill operations
  - Segmentation tool: ML-based segmentation
  - Clustering tool: SLIC clustering
  - Selection tools: Rectangle and polygon selection

- **Data Management**:
  - `annotations`: Stores user-drawn regions
  - `particles`: Stores segmented/clustered regions
  - `classes`: Manages mineral classifications with color codes

### Important Patterns

1. **IPC Communication**: Uses Electron's contextBridge for secure communication
2. **Tool Pattern**: Each tool extends base functionality with specific mouse/keyboard handlers
3. **Layer Management**: Separate canvases for different interaction modes
4. **State Management**: Global variables for application state (should be refactored)

## Domain-Specific Context

This is a geological/mineral analysis application with:
- 86+ predefined mineral classifications with scientific color mappings
- Multi-spectral image analysis capabilities
- Professional-grade segmentation and classification tools
- Export functionality for scientific workflows

## Development Notes

- **No formal testing framework**: Manual testing only
- **Platform considerations**: Primary macOS support, Windows compatible
- **Proprietary license**: Contributor agreements required
- **Performance critical**: C++ used for computationally intensive operations
- **Scientific application**: Maintains high precision for research use