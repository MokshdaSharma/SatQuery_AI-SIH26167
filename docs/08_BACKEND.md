# 08 — Backend Architecture Deep Dive

## Overview
The SatQuery AI backend is implemented in Python using FastAPI (`backend/main.py`). It orchestrates satellite data ingestion, agentic task classification, specialist vision-language modeling, on-demand thematic layer clipping, and multi-format report export.

---

## Route Catalog

| HTTP Method | Route | Tag | Request Schema | Response Schema | Description |
|---|---|---|---|---|---|
| `GET` | `/healthz` | `Meta` | `None` | `{"status": "ok", "timestamp": str}` | Liveness & health probe |
| `POST` | `/api/roi/fetch-imagery` | `Imagery` | `FetchImageryRequest` | `ImageryResponse` | Queries GEE for Sentinel-1/2 rasters clipped to ROI |
| `POST` | `/api/upload-image` | `Imagery` | `multipart/form-data` | `UploadResponse` | Ingests local GeoTIFF/PNG/JPEG with CRS extraction |
| `POST` | `/api/query` | `Analysis` | `QueryRequest` | `QueryResponse` | End-to-end agentic reasoning and evidence pipeline |
| `GET` | `/api/layers/{layer_name}` | `Layers` | `roi: query param` | `LayerResponse` | Fetches thematic vector layer (water, veg, buildings, roads) |
| `POST` | `/api/export` | `Export` | `ExportRequest` | `ExportResponse` | Generates PDF, GeoJSON, GeoTIFF, and JSON log bundle |
| `GET` | `/api/download/{session_id}/{filename}` | `Export` | Path parameters | `FileResponse` | Serves exported reports and preview thumbnails |

---

## Detailed Endpoint Specifications

### 1. `POST /api/query`
* **File:** [`backend/main.py:178-305`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/main.py#L178-L305)
* **Execution Lifecycle:**
  1. `classify_task()` determines task type (`vqa`, `caption`, `grounding`, `change_vqa`, `fusion`).
  2. `validate_inputs()` validates geometry, date chronology, and modality parity.
  3. If `image_refs` is empty, automatically invokes `gee_service.fetch_imagery()`.
  4. `dispatch()` routes parameters to the selected model from `_MODEL_REGISTRY`.
  5. `aggregate()` calculates final confidence, attaches execution traces, and saves `session.json`.
* **Sample Request:**
  ```json
  {
    "roi_geojson": {
      "type": "Polygon",
      "coordinates": [[[75.80, 26.90], [75.82, 26.90], [75.82, 26.92], [75.80, 26.92], [75.80, 26.90]]]
    },
    "query": "Detect structural changes between these two dates",
    "modality": "optical",
    "date_start": "2023-01-01",
    "date_end": "2023-03-31",
    "date_start_2": "2024-01-01",
    "date_end_2": "2024-03-31"
  }
  ```
* **Sample Response:**
  ```json
  {
    "session_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "task_type": "change_vqa",
    "answer": "Comparative analysis indicates new construction in the northern section...",
    "confidence": 0.84,
    "change_types": ["new_construction", "vegetation_growth"],
    "evidence_geojson": { "type": "FeatureCollection", "features": [...] },
    "execution_trace": [
      { "step": "task_classification", "detail": { "task_type": "change_vqa", "classifier_confidence": 0.82 } },
      { "step": "model_dispatch", "detail": { "models_called": ["change_vqa", "change_segmentation"] } }
    ],
    "warnings": []
  }
  ```

---

### 2. `POST /api/upload-image`
* **File:** [`backend/main.py:406-476`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/main.py#L406-L476), [`backend/services/image_upload_service.py`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/services/image_upload_service.py)
* **Functionality:** Accepts multipart uploads up to 200MB. For GeoTIFFs, uses `rasterio` to extract EPSG CRS, transforms bounds to WGS84 (`[west, south, east, north]`), and calculates Mapbox 4-corner coordinates `[[NW], [NE], [SE], [SW]]` so the raster can be pinned on the live satellite map.

---

### 3. `GET /api/layers/{layer_name}`
* **File:** [`backend/main.py:312-345`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/main.py#L312-L345), [`backend/services/map_layers_service.py`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/services/map_layers_service.py)
* **Supported Layers:**
  - `water`: JRC Global Surface Water 10m dataset via GEE (`ee.Image('JRC/GSW1_4/GlobalSurfaceWater')`).
  - `vegetation`: ESA WorldCover 10m land cover class 10 (Tree cover) & class 30 (Grassland) via GEE.
  - `buildings`: Google Open Buildings v3 dataset (`GOOGLE/Research/open-buildings/v3/polygons`).
  - `roads`: OpenStreetMap high-resolution highway geometries queried via Overpass API.

---

### 4. `POST /api/export`
* **File:** [`backend/main.py:352-381`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/main.py#L352-L381), [`backend/services/export_service.py`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/services/export_service.py)
* **Generates:**
  - `report_{session_id}.pdf`: Formatted executive analysis report with embedded metadata, execution trace, metrics table, and branding.
  - `evidence_{session_id}.geojson`: Spatial vector evidence.
  - `log_{session_id}.json`: Complete machine-readable audit trail.
  - `bundle_{session_id}.zip`: Comprehensive ZIP archive containing all artifacts.
