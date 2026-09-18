# 14 — External Services & Third-Party Dependencies

## External Services Inventory

| Service | Purpose | Provider | Authentication | Data Sent | Data Received | Failure Handling Strategy |
|---|---|---|---|---|---|---|
| **Google Earth Engine (GEE)** | Cloud satellite imagery querying, cloud bitmasking & band compositing | Google Cloud | Service Account Key JSON (`satquery-ai-*.json`) | ROI GeoJSON polygon, date filters, sensor modalities | Thumbnail image URLs, raw GeoTIFF arrays, asset descriptors | Falls back to cached local session rasters or descriptive execution warnings |
| **Mapbox GL API** | Vector satellite basemaps & elevation tiles | Mapbox | Public Access Token (`VITE_MAPBOX_TOKEN`) | Map viewport bounding box & zoom level | Vector/Raster map tiles | UI displays explicit token-missing banner with instructions to populate `frontend/.env` |
| **OpenStreetMap (Overpass API)** | Vector road network extraction clipped to ROI | OpenStreetMap Foundation | None (Public API) | Overpass QL bounding box query (`[out:json]; way["highway"]...`) | OSM road line geometries | Falls back to empty road feature layer with warning banner; does not halt pipeline |
| **Hugging Face Hub** | Weights & LoRA adapter repository for fine-tuned checkpoints | Hugging Face | Bearer Token (`HF_TOKEN`) | Model repository slug | Model configuration JSON, tokenizer configs, `.safetensors` adapter weights | Falls back to multi-tier VLM prompts or domain heuristics |
| **OpenAI Vision API** | Zero-shot multimodal VLM fallback for scene reasoning | OpenAI | API Key (`OPENAI_API_KEY`) | System prompt, user query, downsampled image thumbnail base64 | Autoregressive JSON / text completion | Catches HTTP 429 quota exhaustion or network timeout; falls back to deterministic domain responses |
| **Kaggle REST API** | Automated deployment and polling of GPU training kernels | Kaggle (Google) | Bearer Token in `~/.kaggle/kaggle.json` | Notebook JSON source, kernel metadata, GPU accelerator configuration | Kernel execution status, logs, trained output weight URLs | Logs HTTP error code; allows manual kernel run via Kaggle web interface |

---

## Detailed External Service Configurations

### 1. Google Earth Engine Integration (`backend/services/gee_service.py`)
* **Collections Queried:**
  - `COPERNICUS/S2_SR_HARMONIZED`: Sentinel-2 Level-2A surface reflectance (B2, B3, B4, B8, QA60).
  - `COPERNICUS/S1_GRD`: Sentinel-1 C-band SAR Ground Range Detected (VV, VH polarizations, IW mode, descending/ascending orbits).
  - `JRC/GSW1_4/GlobalSurfaceWater`: Global surface water occurrence and extent.
  - `GOOGLE/Research/open-buildings/v3/polygons`: High-precision building footprints.
  - `ESA/WorldCover/v200`: 10m global land cover mapping.

### 2. OpenStreetMap Overpass API (`backend/services/map_layers_service.py`)
* **Endpoint:** `https://overpass-api.de/api/interpreter`
* **Query Format:**
  ```text
  [out:json][timeout:25];
  (
    way["highway"~"motorway|trunk|primary|secondary|tertiary|residential"](south,west,north,east);
  );
  out geom;
  ```
* **Processing:** Overpass nodes and ways are transformed in-memory to standard GeoJSON `LineString` features.
