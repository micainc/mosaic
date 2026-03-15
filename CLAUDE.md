# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MOSAIC is a TypeScript+React+Redux web application for computer vision work in geological/mineral analysis. It provides tools for segmenting, classifying, verifying, and reporting on multi-channel image data.

## Key Commands

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev
# or
npm start

# Build production application
npm run build

# Preview production build
npm run preview

# Type check
npx tsc --noEmit
```

## Architecture Overview

### Technology Stack
- **React 19** + **TypeScript**: UI framework
- **Redux Toolkit**: State management
- **Vite 6**: Build tooling
- **Chart.js**: Statistical analysis charts
- **HTML5 Canvas + SVG**: Drawing and annotation

### Core Architecture

Single-page web application with:

1. **Redux Store** (`src/store/`):
   - `canvasSlice` - Interaction mode, brush size, zoom, canvas dimensions
   - `imageLayersSlice` - Multi-channel image layers (metadata in Redux, pixel data in refs)
   - `labelsSlice` - Loadouts, label-color mappings, anchored colors

2. **CanvasWorkspace** (`src/components/CanvasWorkspace.tsx`):
   - The core component (~1470 lines) handling all drawing/editing logic
   - Three-layer rendering: `<img>` (base) + `<canvas>` (draw) + `<svg>` (overlays)
   - All event handlers registered imperatively in mount-only useEffect
   - Mutable state in refs for performance (mouse position, draw paths, undo history)
   - Redux state mirrored into refs to avoid stale closures

3. **Tools**:
   - **Draw**: SVG preview during stroke → rasterized to canvas on release
   - **Erase**: Right-click draw with `destination-out` composite
   - **Pen**: Polygon editor with vertex add/delete/drag, scale/rotate transforms, rasterize/erase/crop
   - **Fill**: Flood fill with bit-packed visited array
   - **Select/Reclass**: Color selection → recolor all matching pixels

### Key Components

- **Toolbar** (`src/components/Toolbar.tsx`): Tool buttons, layer icons, brush slider
- **LabelSelector** (`src/components/LabelSelector.tsx`): Searchable label dropdown with anchoring
- **LoadoutSelector** (`src/components/LoadoutSelector.tsx`): Category switcher (minerals, plants, etc.)
- **StatsDialog** (`src/components/StatsDialog.tsx`): Modal with Chart.js scatter/feret plots

### Utilities (`src/utils/`)

- `drawCircle.ts` - Optimized Bresenham circle rasterization
- `floodFill.ts` - Bit-packed flood fill algorithm
- `highlight.ts` - Color selection mask operations
- `anchoring.ts` - Protected pixel system
- `rgbUtils.ts` - Color conversion functions
- `drawColors.ts` - 726-color palette + hash-based label mapping
- `grainStats.ts` - Connected component analysis for grain statistics
- `fileUtils.ts` - Browser file download utilities

### Data (`src/data/`)

- `loadouts.ts` - Default mineral/class lists (84 minerals, 4 CF, 11 plants)
- `labelColors.ts` - Hardcoded bidirectional color↔label map for 86 minerals

### Important Patterns

1. **Ref-based mutable state**: Canvas operations use refs (not useState) for performance
2. **Redux↔Ref sync**: `useEffect` hooks mirror Redux state into refs for stable event handlers
3. **Custom events**: Toolbar→CanvasWorkspace communication via `window.dispatchEvent`
4. **Three-layer canvas**: `<img>` base + `<canvas>` annotations + `<svg>` overlays
5. **Anchored colors**: Protected pixels reapplied after every draw operation

## Domain-Specific Context

- 86+ predefined mineral classifications with scientific color mappings
- Multi-spectral image analysis capabilities
- Professional-grade segmentation and classification tools
- Export functionality for scientific workflows

## Development Notes

- **No formal testing framework**: Manual testing only
- **Cloud ML**: Classification and clustering to be provided via cloud API (placeholder buttons)
- **Performance critical**: Bit-packed arrays, optimized circle drawing, OffscreenCanvas
- **Scientific application**: Maintains high precision for research use
