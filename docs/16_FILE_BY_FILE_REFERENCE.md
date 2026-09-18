# 16 — File-by-File Reference Manual

## Backend Modules (`backend/`)

### `backend/main.py`
* **Purpose:** Primary application entrypoint and REST route registry.
* **Imports:** `fastapi`, `dotenv`, `controller.*`, `schemas.*`, `services.*`.
* **Key Functions / Routes:**
  - `health_check()`: Liveness probe at `/healthz`.
  - `fetch_imagery(req)`: GEE imagery endpoint at `POST /api/roi/fetch-imagery`.
  - `run_query(req)`: Core agentic pipeline endpoint at `POST /api/query`.
  - `get_layer(layer_name, roi)`: Thematic layer query at `GET /api/layers/{layer_name}`.
  - `upload_image(file)`: Multipart file ingestion at `POST /api/upload-image`.
  - `export_session(req)`: Multi-format bundle export at `POST /api/export`.
  - `download_file(session_id, filename)`: Artifact file retrieval at `GET /api/download/...`.
* **Modification Impact:** High. Modifying this file alters API paths, middleware, and request dispatching.

---

### `backend/controller/task_classifier.py`
* **Purpose:** Classifies natural language prompts into task categories.
* **Exports:** `classify_task()`, `ClassificationResult`, task constants (`VQA`, `CAPTION`, `GROUNDING`, `CHANGE_VQA`, `FUSION`).
* **Logic:** Employs keyword dictionaries and context heuristics (e.g. presence of second date triggers `CHANGE_VQA`; `both` modality triggers `FUSION`).

---

### `backend/controller/input_validator.py`
* **Purpose:** Validates input parameters against task requirements.
* **Exports:** `validate_inputs()`, `InputValidationError`.
* **Logic:** Checks that polygon coordinates form valid closed loops, checks date ranges, and warns on missing imagery.

---

### `backend/controller/router.py`
* **Purpose:** Manages the specialist model registry and task dispatching.
* **Exports:** `dispatch()`, `warm_up_all_models()`.
* **Logic:** Routes classified task types to the appropriate instance of `SpecialistModel` and resolves image descriptors.

---

### `backend/controller/aggregator.py`
* **Purpose:** Combines specialist outputs into unified responses.
* **Exports:** `aggregate()`.
* **Logic:** Merges text answers from multiple models, scales confidence by task classification certainty, compiles GeoJSON evidence, and structures execution trace steps.

---

### `backend/models/base_model.py`
* **Purpose:** Abstract Base Class defining the contract for all specialist models.
* **Exports:** `SpecialistModel(ABC)`.
* **Abstract Methods:**
  - `validate_input(images, metadata) -> bool`
  - `run(images, query, metadata) -> Dict[str, Any]`
  - `warm_up() -> None`

---

### `backend/models/vqa_caption_model.py`
* **Purpose:** Specialist model for single-image VQA and scene captioning.
* **Classes:** `VQACaptionModel(SpecialistModel)`.
* **Target Weights:** `mokshda/satquery-ai-vqa-lora` on `llava-hf/llava-1.5-7b-hf`.

---

### `backend/models/change_vqa_model.py`
* **Purpose:** Specialist model for bi-temporal change question answering.
* **Classes:** `ChangeVQAModel(SpecialistModel)`.
* **Target Weights:** `mokshda/satquery-ai-change-vqa` on `llava-hf/llava-1.5-7b-hf`.

---

### `backend/models/change_segmentation_model.py`
* **Purpose:** Specialist model for 5-class semantic change segmentation.
* **Classes:** `ChangeSegmentationModel(SpecialistModel)`.
* **Target Weights:** `mokshda/satquery-ai-change-segmentation` (`ResNet34 U-Net`).

---

### `backend/models/grounding_model.py`
* **Purpose:** Specialist model for visual localization and spatial bounding box extraction.
* **Classes:** `GroundingModel(SpecialistModel)`.
* **Key Logic:** Projects normalized sub-boxes $[0.0, 1.0]$ into geographic WGS84 coordinates.

---

### `backend/models/fusion_model.py`
* **Purpose:** Specialist model for joint Sentinel-2 (Optical) and Sentinel-1 (SAR) analysis.
* **Classes:** `FusionModel(SpecialistModel)`.
* **Key Logic:** Synthesizes microwave radar volume scattering with multispectral reflection.

---

### `backend/services/gee_service.py`
* **Purpose:** Google Earth Engine interface for Copernicus Sentinel-1/2 constellations.
* **Exports:** `fetch_imagery()`, `GEEError`.
* **Key Logic:** Projects GeoJSON polygons into `ee.Geometry`, filters collections, masks clouds via QA60, and exports thumbnails.

---

### `backend/services/spectral_indices_service.py`
* **Purpose:** Deterministic remote sensing index calculator.
* **Exports:** `compute_ndvi()`, `compute_ndwi()`, `compute_ndbi()`, `compute_sar_ratio()`, `analyze_bitemporal_changes()`.

---

### `backend/services/map_layers_service.py`
* **Purpose:** Generates vector thematic layers clipped to ROI.
* **Exports:** `fetch_layer()`.
* **Data Sources:** ESA WorldCover (Veg), JRC Water, Google Open Buildings, OpenStreetMap (Roads).

---

### `backend/services/image_upload_service.py`
* **Purpose:** Ingests local GeoTIFF and image files.
* **Exports:** `process_upload()`, `UploadError`.
* **Key Logic:** Reads CRS metadata using `rasterio`, calculates Mapbox 4-corner coordinates, and creates normalized PNG previews.

---

### `backend/services/export_service.py`
* **Purpose:** Builds PDF reports, GeoJSONs, logs, and ZIP archives.
* **Exports:** `export_session()`.

---

## Frontend Modules (`frontend/src/`)

### `frontend/src/App.jsx`
* **Purpose:** Root React component and central state store.
* **Coordinates:** `MapView`, `QueryPanel`, `ResultPanel`, and `ImageUploadPanel`.

### `frontend/src/components/MapView.jsx`
* **Purpose:** Mapbox GL JS WebGL map canvas with drawing tools, layer toggles, and raster overlays.

### `frontend/src/components/QueryPanel.jsx`
* **Purpose:** Query prompt textarea, temporal epoch pickers, modality buttons, and submit handler.

### `frontend/src/components/ResultPanel.jsx`
* **Purpose:** Formatted answer presentation, confidence meter, execution trace tree, and download triggers.

### `frontend/src/components/ImageUploadPanel.jsx`
* **Purpose:** Drag-and-drop file upload interface with progress bar and georeferencing status.

### `frontend/src/api.js`
* **Purpose:** Client-side HTTP helper wrapping `fetch` calls for all backend routes.
