# 09 — Frontend Architecture Deep Dive

## Component Hierarchy

```text
frontend/src/App.jsx (Root State Coordinator)
│
├── Header (Status Pill, System Identity, Subtitle)
│
├── Main Layout (Three-Column / Responsive Split)
│   │
│   ├── Left Sidebar (Query & Upload Controls)
│   │   ├── Mode Selector Tabs (Draw on Map vs. Upload Image)
│   │   ├── QueryPanel.jsx (Text prompt, dates, modality toggles, submit)
│   │   └── ImageUploadPanel.jsx (Drag-and-drop file picker, upload status)
│   │
│   ├── Central Viewport (Map Canvas)
│   │   └── MapView.jsx
│   │       ├── Mapbox GL JS Satellite Canvas
│   │       ├── Mapbox Draw Polygon Tool (Top-right)
│   │       ├── Layer Control Panel (Bottom-left)
│   │       └── GeoJSON Evidence & Upload Raster Overlays
│   │
│   └── Right Sidebar (Results & Audit Export)
│       └── ResultPanel.jsx
│           ├── Task Header & Calibrated Confidence Meter
│           ├── AI Answer Text Card
│           ├── Change Type Chips
│           ├── Spatial Evidence Summary
│           ├── Collapsible Execution Trace Steps
│           └── Multi-Format Export Selector (PDF, GeoJSON, ZIP)
```

---

## Core Component Specifications

### 1. `App.jsx`
* **File:** [`frontend/src/App.jsx`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/frontend/src/App.jsx)
* **Responsibilities:**
  - Manages global application state: `roi`, `queryResult`, `layerVisibility`, `layerData`, `uploadResult`, `isLoading`, `backendOnline`.
  - Coordinates asynchronous requests to `submitQuery()`, `fetchLayer()`, `uploadImage()`, and `exportSession()`.
  - Computes `uploadedImageOverlay` coordinates to project local GeoTIFF bounds directly into `<MapView />`.

### 2. `MapView.jsx`
* **File:** [`frontend/src/components/MapView.jsx`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/frontend/src/components/MapView.jsx)
* **Responsibilities:**
  - Initializes WebGL Mapbox map with satellite style (`satellite-streets-v12`).
  - Manages `MapboxDraw` instance in `polygon` mode; synchronizes `draw.create`, `draw.update`, `draw.delete` events to the parent `handleROIChange()`.
  - Renders dynamic vector layers (`water`, `vegetation`, `buildings`, `roads`) as GeoJSON sources with custom paint styling.
  - Renders `satquery-evidence` polygons (blue fill `#38bdf8` at 25% opacity with 2px stroke).
  - Handles image overlays using Mapbox raster sources with exact 4-corner coordinates.

### 3. `QueryPanel.jsx`
* **File:** [`frontend/src/components/QueryPanel.jsx`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/frontend/src/components/QueryPanel.jsx)
* **Responsibilities:**
  - Natural-language query textarea with interactive sample prompts.
  - Primary date picker (`dateStart`, `dateEnd`) and secondary date picker (`dateStart2`, `dateEnd2`) for bi-temporal change detection.
  - Modality selector buttons: `Optical (Sentinel-2)`, `SAR (Sentinel-1)`, `Both (Fusion)`.
  - Mode toggle: `Draw ROI on Map` vs. `Upload Satellite Image`.

### 4. `ResultPanel.jsx`
* **File:** [`frontend/src/components/ResultPanel.jsx`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/frontend/src/components/ResultPanel.jsx)
* **Responsibilities:**
  - Renders task badge, session ID, and color-coded confidence bar (`high`: green $\ge 65\%$, `medium`: yellow $\ge 45\%$, `low`: red $<45\%$).
  - Displays structured AI answer and detected change type chips.
  - Formats collapsible execution trace explaining *why* the AI took each step in plain English.
  - Manages multi-format export buttons (`PDF`, `GeoJSON`, `GeoTIFF`, `JSON Log`, `ZIP Bundle`).

### 5. `ImageUploadPanel.jsx`
* **File:** [`frontend/src/components/ImageUploadPanel.jsx`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/frontend/src/components/ImageUploadPanel.jsx)
* **Responsibilities:**
  - Drag-and-drop zone supporting `.tif`, `.tiff`, `.png`, `.jpg`, `.jpeg`, `.jp2` (up to 200MB).
  - Upload progress meter and thumbnail preview card.
  - Displays CRS georeferencing status badge (`✓ Georeferenced` vs `⚠ No geo-ref`).
