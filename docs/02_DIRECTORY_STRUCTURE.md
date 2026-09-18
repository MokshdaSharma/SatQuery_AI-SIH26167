# 02 — Complete Directory Structure

## Repository Tree

```text
SatQueryAI/
├── backend/
│   ├── controller/
│   │   ├── __init__.py                # Package initializer
│   │   ├── aggregator.py              # Combines model outputs, confidence & traces
│   │   ├── input_validator.py         # Validates ROI geometry, epochs, modalities
│   │   ├── router.py                  # Model registry & task dispatcher
│   │   └── task_classifier.py         # Natural language intent & task classifier
│   ├── models/
│   │   ├── __init__.py                # Package initializer
│   │   ├── base_model.py              # Abstract SpecialistModel base class
│   │   ├── change_segmentation_model.py # ResNet34 U-Net + spectral change segmenter
│   │   ├── change_vqa_model.py        # Bi-temporal Siamese LLaVA-1.5-7B adapter
│   │   ├── fusion_model.py            # Optical + SAR radar cross-modal model
│   │   ├── grounding_model.py         # Visual localization & spatial bbox engine
│   │   └── vqa_caption_model.py       # Single-image VQA & captioning LLaVA adapter
│   ├── schemas/
│   │   ├── __init__.py                # Package initializer
│   │   ├── requests.py                # Pydantic request models (Fetch, Query, Export)
│   │   └── responses.py               # Pydantic response models (Imagery, Query, Layers)
│   ├── services/
│   │   ├── __init__.py                # Package initializer
│   │   ├── export_service.py          # PDF report, GeoJSON, GeoTIFF & ZIP builder
│   │   ├── gee_service.py             # Google Earth Engine data pipeline
│   │   ├── image_upload_service.py    # Local GeoTIFF & image CRS/bounding processor
│   │   ├── map_layers_service.py      # Thematic vector layers (Water, Veg, Buildings, Roads)
│   │   └── spectral_indices_service.py# Vectorized NDVI, NDWI, NDBI & SAR ratio engine
│   ├── main.py                        # FastAPI application entrypoint & API routes
│   ├── requirements.txt               # Backend Python dependencies
│   ├── satquery-ai-*.json             # Google Earth Engine Service Account key
│   └── .env                           # Backend environment configuration
├── frontend/
│   ├── src/
│   │   ├── assets/                    # Static images & icons
│   │   ├── components/
│   │   │   ├── ImageUploadPanel.jsx   # Drag-and-drop satellite image upload panel
│   │   │   ├── MapView.jsx            # Mapbox GL JS map, drawing tools & layer toggles
│   │   │   ├── QueryPanel.jsx         # Prompt box, date selectors & modality toggles
│   │   │   └── ResultPanel.jsx        # AI answer, confidence, trace & export panel
│   │   ├── api.js                     # API client functions for backend communication
│   │   ├── App.jsx                    # Root application component & state orchestrator
│   │   ├── index.css                  # Global styles, glassmorphic design & variables
│   │   ├── main.jsx                   # React DOM application mounting point
│   │   ├── main.ts                    # TypeScript entrypoint (supporting file)
│   │   └── style.css                  # Supplementary utility styles
│   ├── package.json                   # Frontend npm dependencies & scripts
│   ├── vite.config.ts                 # Vite bundler configuration
│   └── .env                           # Frontend environment variables (VITE_MAPBOX_TOKEN)
├── notebooks/
│   ├── pipeline_a_vqa_bigearthnet.ipynb # Kaggle QLoRA notebook for VQA / Captioning
│   ├── pipeline_b_change_vqa_cdvqa.ipynb # Kaggle QLoRA notebook for Bi-Temporal Change
│   └── pipeline_c_change_segmentation_second.ipynb # Kaggle notebook for U-Net Segmentation
├── ref_docs/
│   ├── SatQuery_AI_FineTuning_Guide.md # Comprehensive guide on RS fine-tuning
│   ├── SatQuery_AI_Kaggle_Full_Pipeline.md # Step-by-step Kaggle GPU execution pipeline
│   ├── SatQuery_AI_Prompts_and_Integration_Guide.md # Prompt templates & agent design
│   └── SatQuery_AI_Solution_Design.md # Core architectural blueprint & requirements
├── scripts/
│   ├── generate_notebooks.py          # Builds standalone Jupyter notebooks
│   ├── list_kaggle_kernels.py         # Inspects remote Kaggle kernel registry
│   ├── poll_kaggle_kernels.py         # Asynchronously monitors remote Kaggle training
│   └── push_notebooks_to_kaggle.py    # Deploys training notebooks via Kaggle API
├── sessions/                          # Ephemeral filesystem storage for session assets
├── docs/                              # Full reverse-engineered documentation suite
├── .gitignore                         # Git exclusion rules for secrets, caches, and datasets
└── test_layers.py                     # Standalone verification script for map layers
```

---

## Folder-by-Folder Responsibilities

### `backend/`
* **Purpose:** Core server-side application containing the API endpoints, agentic routing logic, specialist model adapters, and geospatial service layer.
* **Key Subdirectories:**
  - `controller/`: Implements the agentic reasoning pipeline (Task Classifier $\rightarrow$ Validator $\rightarrow$ Router $\rightarrow$ Aggregator).
  - `models/`: Concrete subclasses of `SpecialistModel` that encapsulate model inference, LoRA loading, and heuristic fallback logic.
  - `schemas/`: Strongly-typed Pydantic schemas validating all incoming JSON payloads and structuring outgoing HTTP responses.
  - `services/`: Dedicated geospatial, raster, spectral, vector, and document generation services.

### `frontend/`
* **Purpose:** Single Page Application (SPA) providing an interactive geospatial interface.
* **Key Subdirectories:**
  - `src/components/`: Reusable React components (`MapView`, `QueryPanel`, `ResultPanel`, `ImageUploadPanel`).
  - `src/api.js`: Client-side HTTP abstraction using `fetch` to communicate with the FastAPI backend.

### `notebooks/`
* **Purpose:** Standalone, self-contained Jupyter notebooks configured with GPU accelerators, ready to be executed on Kaggle or Google Colab for QLoRA fine-tuning and weights generation.

### `scripts/`
* **Purpose:** Automation and orchestration tools for developer workflows, Kaggle kernel synchronization, and model artifact pushing.

### `ref_docs/`
* **Purpose:** Architectural specifications, prompt engineering guidelines, and dataset integration plans established during initial system design.

### `sessions/`
* **Purpose:** Local filesystem cache indexed by UUID (`./sessions/{session_id}/`). Stores temporary GEE image downloads, GeoTIFF patches, user upload previews, generated PDF reports, and JSON manifests. Ignored by git to avoid storing binary raster data in source control.
