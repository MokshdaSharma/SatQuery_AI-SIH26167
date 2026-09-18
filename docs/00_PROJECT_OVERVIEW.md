# 00 — Project Overview

## Project Identity
* **Project Name:** SatQuery AI (SIH Problem Statement SIH26167 / Geospatial Multimodal Agent)
* **Purpose:** An interactive, agentic vision-language assistant for multimodal remote-sensing image analysis through natural-language queries.
* **Problem Being Solved:** Non-expert users (analysts, disaster responders, urban planners, environmental researchers) cannot easily interpret raw multi-band satellite data (Sentinel-1 SAR, Sentinel-2 Optical), compute complex spectral indices, or navigate remote sensing pipelines. Generic commercial VLMs (e.g., standard ChatGPT or Claude) lack native remote-sensing spatial grounding, dual-epoch bi-temporal comparison, SAR physics comprehension, and on-the-fly Earth Engine clipping. SatQuery AI solves this with an agentic controller routing questions to specialized remote-sensing models and explainable spectral algorithms.
* **Target Users:** Remote sensing analysts, GIS specialists, urban development authorities, disaster response teams, and environmental monitoring organizations.
* **Main Use Cases:**
  1. *Draw-and-Ask VQA & Captioning:* Drawing an ROI polygon on a map and querying land use, surface features, or scene summaries.
  2. *Bi-Temporal Semantic Change Detection:* Comparing two epochs (Date 1 vs. Date 2) to detect and classify changes (new construction, deforestation, vegetation growth, demolition).
  3. *Optical + SAR Cross-Modal Fusion:* Fusing Sentinel-2 optical reflectance with Sentinel-1 C-band SAR backscatter for cloud-penetrating analysis.
  4. *Visual Grounding & Localization:* Detecting specific structures, water bodies, or solar installations and projecting them as GeoJSON polygons onto the map.
  5. *On-Demand Layer Overlays & Multi-Format Audit Reports:* Clipping live high-resolution thematic layers (JRC Water, ESA WorldCover, Google Open Buildings, OSM Roads) and exporting one-click PDF, GeoJSON, GeoTIFF, and JSON log bundles.
* **Current Project Status:** Core FastAPI backend, React/Vite map interface, agentic routing pipeline, spectral index engine, and fallback reasoning layers are fully implemented and verified. QLoRA training scripts for remote GPU execution on Kaggle are generated and linked.

---

## One-Sentence Explanation
**SatQuery AI** is an agentic geospatial AI platform that enables users to draw a region of interest on a satellite map, ask questions in natural language, and receive evidence-grounded answers powered by remote-sensing vision models, SAR-optical fusion, and automated Earth Engine pipelines.

---

## 30-Second Explanation (Non-Technical)
Imagine Google Earth combined with an AI analyst who can answer any question about what is happening on the ground. Instead of having to download huge satellite files and write specialized code, you simply draw a box around any city, forest, or coastline on a digital map, pick the dates you care about, and ask: *"What changed here between last year and this year?"* or *"Where are the water bodies and buildings?"*. SatQuery AI automatically downloads the real satellite images, inspects both optical photos and radar scans, highlights the exact locations on the map, and gives you a plain-English explanation with a downloadable PDF report.

---

## Technical Explanation (Deep Dive)
SatQuery AI implements a decoupled **Controller-Specialist-Aggregator** architecture:
1. **Frontend Client (`frontend/`):** A React 19 single-page application built on Vite 6 and Mapbox GL JS (`@mapbox/mapbox-gl-draw`). It manages spatial ROI vector geometries, date selections, multi-layer visibility toggles, bi-temporal image overlays, query submission, and interactive execution trace inspection.
2. **Agentic Controller Layer (`backend/controller/`):**
   - `task_classifier.py`: Evaluates natural-language queries, temporal parameters, and sensor modalities to classify user intent into 5 discrete task classes (`vqa`, `caption`, `grounding`, `change_vqa`, `fusion`).
   - `input_validator.py`: Enforces spatial, temporal, and sensor compatibility constraints.
   - `router.py`: Dynamically dispatches requests to concrete `SpecialistModel` implementations.
   - `aggregator.py`: Synthesizes specialist outputs, computes unified confidence scores, compiles GeoJSON evidence collections, and serializes auditable execution traces.
3. **Specialist Model Pool (`backend/models/`):** A modular pool of model adapters subclassing `SpecialistModel` (`base_model.py`):
   - `vqa_caption_model.py`: 4-bit QLoRA fine-tuned `LLaVA-1.5-7B` / VLM for scene Q&A.
   - `change_vqa_model.py`: Bi-temporal Siamese VLM for multi-date comparative reasoning.
   - `change_segmentation_model.py`: `ResNet34 U-Net` + deterministic spectral index difference engine.
   - `grounding_model.py`: Spatial coordinate projection engine mapping normalized bounding boxes to WGS84 GeoJSON polygons.
   - `fusion_model.py`: Optical multispectral + SAR microwave backscatter joint reasoning engine.
4. **Services Layer (`backend/services/`):**
   - `gee_service.py`: Interfaces with the Google Earth Engine Python API (`ee`) to query Copernicus Sentinel-1/2 constellations, apply cloud masks, generate web thumbnails, and export GeoTIFFs.
   - `spectral_indices_service.py`: Computes deterministic remote sensing indices (NDVI, NDWI, NDBI, and SAR VV/VH polarization ratios).
   - `map_layers_service.py`: Extracts vector thematic layers (ESA WorldCover 10m, JRC Global Surface Water 10m, Google Open Buildings v3, OpenStreetMap).
   - `image_upload_service.py`: Ingests user GeoTIFF/PNG/JPEG files, extracts CRS metadata with `rasterio`, and calculates 4-corner coordinates for Mapbox canvas projection.
   - `export_service.py`: Assembles PDF audit reports (using `reportlab`), GeoJSON layers, logs, and ZIP bundles.

---

## Feature Inventory

| Feature | Description | Implementation | Files | Dependencies | Status |
|---|---|---|---|---|---|
| **Interactive Satellite Canvas** | Satellite basemap with pan/zoom and polygon draw tools | Mapbox GL JS + Mapbox Draw | [`frontend/src/components/MapView.jsx`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/frontend/src/components/MapView.jsx) | `mapbox-gl`, `@mapbox/mapbox-gl-draw` | ✅ Implemented |
| **Live Imagery Retrieval** | Fetches Sentinel-1/2 imagery for drawn ROI and date range | GEE Python API | [`backend/services/gee_service.py`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/services/gee_service.py) | `earthengine-api`, `google-auth` | ✅ Implemented |
| **Local Raster Ingestion** | Upload GeoTIFF, PNG, JPEG with CRS projection | Rasterio & Pillow | [`backend/services/image_upload_service.py`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/services/image_upload_service.py) | `rasterio`, `pillow` | ✅ Implemented |
| **Query Intent Classification** | Categorizes natural language prompts into task types | Rule/Keyword + Zero-shot | [`backend/controller/task_classifier.py`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/controller/task_classifier.py) | Python standard library | ✅ Implemented |
| **Input Validation** | Validates GeoJSON geometry, epoch count, and sensor modalities | Pydantic + Shapely | [`backend/controller/input_validator.py`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/controller/input_validator.py) | `pydantic`, `shapely` | ✅ Implemented |
| **Single-Image VQA & Captioning** | Answers factual questions or generates scene descriptions | LLaVA-1.5-7B + LoRA + Vision fallback | [`backend/models/vqa_caption_model.py`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/models/vqa_caption_model.py) | `torch`, `transformers`, `peft`, `openai` | ✅ Implemented |
| **Bi-Temporal Change VQA** | Comparative reasoning between two dates | Siamese LLaVA-1.5-7B + LoRA | [`backend/models/change_vqa_model.py`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/models/change_vqa_model.py) | `torch`, `transformers`, `peft`, `openai` | ✅ Implemented |
| **Change-Type Segmentation** | Classifies pixels into 5 change categories with area % | ResNet34 U-Net + Spectral Delta | [`backend/models/change_segmentation_model.py`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/models/change_segmentation_model.py) | `segmentation-models-pytorch`, `numpy`, `shapely` | ✅ Implemented |
| **Visual Grounding** | Localizes queries and renders GeoJSON bounding boxes | Spatial projection + VLM extraction | [`backend/models/grounding_model.py`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/models/grounding_model.py) | `shapely`, `openai` | ✅ Implemented |
| **Optical-SAR Fusion** | Joint multispectral reflectance + radar backscatter analysis | Cross-modal reasoning engine | [`backend/models/fusion_model.py`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/models/fusion_model.py) | `openai`, `numpy` | ✅ Implemented |
| **Spectral Indices Engine** | Computes NDVI, NDWI, NDBI, and SAR VV/VH ratio | Vectorized NumPy | [`backend/services/spectral_indices_service.py`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/services/spectral_indices_service.py) | `numpy` | ✅ Implemented |
| **Thematic Map Layers** | Water, Vegetation, Buildings, Roads vector layers clipped to ROI | GEE WorldCover/JRC/Buildings + OSM | [`backend/services/map_layers_service.py`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/services/map_layers_service.py) | `earthengine-api`, `requests` | ✅ Implemented |
| **Multi-Format Export** | Generates PDF reports, GeoTIFFs, GeoJSONs, and ZIP packages | ReportLab & GeoJSON serializer | [`backend/services/export_service.py`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/services/export_service.py) | `reportlab`, `zipfile` | ✅ Implemented |
| **Kaggle GPU Training Orchestration** | Automated generation and pushing of GPU training kernels | Kaggle REST API & Bearer Auth | [`scripts/push_notebooks_to_kaggle.py`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/scripts/push_notebooks_to_kaggle.py) | `requests` | ✅ Implemented |
