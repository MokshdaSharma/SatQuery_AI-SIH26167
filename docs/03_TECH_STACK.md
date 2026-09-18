# 03 — Complete Technology Stack

## Technology Inventory

| Category | Technology | Version | Where Used | Purpose | Why Chosen | Alternatives Considered | Trade-offs Accepted |
|---|---|---|---|---|---|---|---|
| **Backend Framework** | **FastAPI** | `^0.115` | `backend/main.py` | Core ASGI Web Framework | High async throughput, native Pydantic schema validation, automated OpenAPI docs | Flask, Django, Express.js | Async event loop requires careful handling of blocking CPU/GeoTIFF tasks |
| **ASGI Server** | **Uvicorn** | `^0.30` | `backend/main.py` | Production HTTP Server | Lightweight, lightning-fast ASGI execution for FastAPI | Hypercorn, Gunicorn (Uvicorn workers) | Single-process reload on Windows during development |
| **Data Validation** | **Pydantic** | `v2.x` | `backend/schemas/` | Request & Response Typing | Type safety, regex date/modality validation, automated error responses | Marshmallow, Cerberus, manual dict checks | Strict validation rejects slightly malformed client payloads |
| **Frontend UI** | **React** | `19.0` | `frontend/src/` | Declarative View Layer | Modern component model, state hooks, high ecosystem compatibility | Vue 3, Svelte, Streamlit | Streamlit is faster for basic prototypes but cannot support custom Mapbox polygon manipulation |
| **Build Tool** | **Vite** | `6.2` | `frontend/` | Frontend Bundler | Instant HMR, fast ES modules compilation, optimized production builds | Webpack, Create-React-App | ESM module resolution requires strict modern JavaScript standards |
| **Map Rendering** | **Mapbox GL JS** | `^3.10` | `frontend/src/components/MapView.jsx` | Geospatial Canvas | High-performance WebGL vector/raster rendering, smooth rotation & zoom | Leaflet, OpenLayers | Requires Mapbox access token; heavier initial bundle size |
| **Map Drawing** | **@mapbox/mapbox-gl-draw**| `^1.5` | `frontend/src/components/MapView.jsx` | ROI Polygon Tools | Native integration with Mapbox GL JS for polygon and bounding box drawing | Leaflet.draw, custom canvas | API is tightly coupled with Mapbox GL JS |
| **Geospatial Processing** | **Google Earth Engine (GEE)** | `^1.4` | `backend/services/gee_service.py` | Satellite Data Ingestion | Cloud-based access to multi-petabyte Sentinel-1/2 archives without local storage | Sentinel Hub API, Planetary Computer | Requires Google Cloud Project & Earth Engine service account authentication |
| **Raster I/O** | **Rasterio** | `^1.3` | `backend/services/image_upload_service.py` | GeoTIFF CRS Ingestion | Read geospatial raster metadata, bounds transformation, reprojection | GDAL direct bindings, PyTif | Binary C-dependencies can be complex to compile on certain Windows setups |
| **Geometric Operations** | **Shapely** | `^2.0` | `backend/models/`, `backend/services/` | Vector Geometry Logic | Polygon intersections, bounding box computation, GeoJSON feature parsing | GeoPandas, PyGEOS | Operates in memory; large GeoJSON collections require memory awareness |
| **Deep Learning** | **PyTorch & PEFT** | `^2.2` | `backend/models/`, `notebooks/` | Specialist Model Inference | Industry standard for deep vision-language modeling, 4-bit LoRA adapter loading | ONNX Runtime, TensorRT | 7B VLM checkpoints require ~16GB GPU VRAM for local execution |
| **VLM Architecture** | **LLaVA-1.5-7B** | `HF Hub` | `backend/models/`, `notebooks/` | Base Vision-Language Backbone | State-of-the-art open-weight VLM easily fine-tunable with QLoRA on remote sensing | GeoChat, Prithvi, GPT-4V | High parameter count necessitates 4-bit quantization on consumer hardware |
| **Report Generation** | **ReportLab** | `^4.2` | `backend/services/export_service.py` | PDF Audit Bundle Generation | Programmatic PDF generation with custom tables, branding, and imagery | WeasyPrint, pdfkit | Low-level drawing API requires explicit coordinate/layout calculations |

---

## Detailed Technology Analysis

### 1. FastAPI (`backend/main.py`)
* **What is it?** A modern, high-performance web framework for building APIs with Python based on standard Python type hints.
* **Why chosen here?** *(Strong Technical Inference)* Remote sensing requests involve heterogeneous payloads (large GeoJSON objects, temporal strings, bounding boxes, file uploads). FastAPI's deep integration with Pydantic guarantees that malformed coordinates or dates are caught at the gateway before reaching heavy AI or Earth Engine pipelines. Furthermore, automatic Swagger generation at `/api/docs` simplifies frontend-backend synchronization.
* **Alternatives:** Flask (lighter, but requires manual schema validation and lacks native async), Django (too monolithic, heavy ORM overhead unnecessary for stateless geospatial APIs).

### 2. Google Earth Engine Python API (`backend/services/gee_service.py`)
* **What is it?** A planetary-scale platform for Earth observation data analysis.
* **Why chosen here?** *(Explicit Rationale in Solution Design)* Rather than forcing users to manually source, download, and preprocess gigabytes of Sentinel-1 SAR and Sentinel-2 optical GeoTIFF files, GEE allows on-demand querying, temporal aggregation, and cloud masking computed on Google's cloud infrastructure directly clipped to the user's drawn ROI.
* **Trade-offs:** Relies on external Google Cloud infrastructure and active API tokens. If network access fails or quotas are exceeded, fallback mock/sample layers are used.

### 3. React 19 + Mapbox GL JS (`frontend/`)
* **What is it?** Component-driven reactive UI framework combined with a WebGL-powered mapping engine.
* **Why chosen here?** *(Explicit Rationale)* Geospatial AI tools require fluid visual responsiveness. When a user draws an ROI or toggles a 2000-polygon building layer, Mapbox uses hardware-accelerated WebGL shaders to render vector polygons and raster overlays at 60 FPS without UI stuttering.
* **Trade-offs:** Requires client-side Mapbox API tokens and increases initial JavaScript bundle size (~2MB uncompressed).
