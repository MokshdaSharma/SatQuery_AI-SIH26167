# 25 — Architectural & Design Decisions

## Key Architectural Decisions

### 1. Agentic Controller Routing vs. Single Monolithic Mega-Model
* **Decision:** Split analysis across 5 specialist models (`VQACaptionModel`, `ChangeVQAModel`, `ChangeSegmentationModel`, `GroundingModel`, `FusionModel`) governed by an explicit `task_classifier.py` and `router.py`.
* **Evidence:** `backend/controller/router.py`, `backend/models/base_model.py`.
* **Explicit Rationale:** Problem statement explicitly requires verifiable execution tracing and specialized remote sensing domain adaptation. A generic single LLM cannot perform 5-class pixel change segmentation and lacks SAR radar understanding.
* **Trade-offs:** Increases codebase modularity and testing surface; requires maintaining multiple specialist model interfaces.

---

### 2. On-Demand Earth Engine Ingestion vs. Pre-Sourced GeoTIFF Databases
* **Decision:** Ingest satellite imagery dynamically via Google Earth Engine API based on user-drawn ROI coordinates.
* **Evidence:** `backend/services/gee_service.py`, `backend/main.py:128-172`.
* **Explicit Rationale:** Users can query *any* geographic point on Earth for arbitrary date ranges without needing to store petabytes of satellite rasters locally.
* **Trade-offs:** Depends on Google Cloud API availability and network bandwidth during on-demand clipping.

---

### 3. Multi-Tier Fallback Architecture (LoRA $\rightarrow$ Multimodal VLM $\rightarrow$ Deterministic Heuristics)
* **Decision:** Build resilient layered fallbacks inside all specialist model classes.
* **Evidence:** `backend/models/vqa_caption_model.py:108-190`, `backend/models/change_segmentation_model.py`.
* **Likely Technical Reason:** Remote sensing models require high GPU VRAM (~16GB). By implementing multi-tier fallbacks, the system can run anywhere (CPU development laptop, Kaggle GPU server, or low-cost cloud VM) without breaking the user experience.
* **Trade-offs:** Model responses when in fallback mode are synthesized rather than directly generated from local 7B weights.

---

### 4. Vectorized Deterministic Spectral Indices Engine
* **Decision:** Supplement neural network outputs with mathematical indices (NDVI, NDWI, NDBI, SAR VV/VH ratio).
* **Evidence:** `backend/services/spectral_indices_service.py`.
* **Explicit Rationale:** Provides explainability and scientific rigor (e.g. for ISRO/SAC evaluation) by providing exact quantified change percentages ($\% \text{ Area}$) to back up AI natural-language claims.
