# 07 — Complete Data Flow

## End-to-End Query Analysis Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Map as MapView.jsx
    participant QP as QueryPanel.jsx
    participant API as api.js
    participant Main as backend/main.py
    participant Classify as task_classifier.py
    participant Valid as input_validator.py
    participant GEE as gee_service.py
    participant Router as router.py
    participant Specialist as SpecialistModel
    participant Agg as aggregator.py
    participant RP as ResultPanel.jsx

    User->>Map: Draws ROI polygon on Mapbox
    Map-->>QP: Updates roi_geojson state
    User->>QP: Enters query, dates, modality & clicks "Run Analysis"
    QP->>API: submitQuery({roi_geojson, query, dateStart, modality...})
    API->>Main: POST /api/query (QueryRequest)
    
    activate Main
    Main->>Classify: classify_task(query, modality, has_second_date)
    Classify-->>Main: ClassificationResult(task_type, confidence, keywords)
    
    Main->>Valid: validate_inputs(task_type, image_refs, modality, metadata)
    Valid-->>Main: Validation warnings / pass
    
    alt If image_refs is empty (Auto-Fetch Mode)
        Main->>GEE: fetch_imagery(roi_geojson, date_start, modality)
        GEE-->>Main: [image_id, preview_url, local_path]
    end
    
    Main->>Router: dispatch(task_type, image_refs, query, metadata)
    activate Router
    Router->>Specialist: run(images, query, metadata)
    activate Specialist
    Specialist-->>Router: {answer, confidence, evidence, segmentation_mask}
    deactivate Specialist
    Router-->>Main: [model_output_1, model_output_2...]
    deactivate Router
    
    Main->>Agg: aggregate(task_type, confidence, model_outputs, metadata)
    Agg-->>Main: {answer, confidence, evidence_geojson, execution_trace, warnings}
    
    Main->>Main: _save_session_manifest(session_id, session_log)
    Main-->>API: QueryResponse JSON
    deactivate Main
    
    API-->>RP: Renders Answer, Confidence & Trace
    API-->>Map: Renders evidence_geojson overlay on Mapbox
```

---

## Data Transformations Throughout the Pipeline

### 1. Ingestion Phase
* **Input:** Raw user inputs from React form (`query: string`, `dateStart: YYYY-MM-DD`, Mapbox polygon GeoJSON).
* **Format:**
  ```json
  {
    "type": "Polygon",
    "coordinates": [[[75.80, 26.90], [75.82, 26.90], [75.82, 26.92], [75.80, 26.92], [75.80, 26.90]]]
  }
  ```

### 2. Validation & Preprocessing Phase
* `Pydantic` validates regex dates (`^\d{4}-\d{2}-\d{2}$`) and geometry type (`Polygon` / `MultiPolygon`).
* `input_validator.py` checks spatial bounding box extent, date chronology (`date_start < date_end`), and epoch parity for bi-temporal tasks.

### 3. Imagery Fetching Phase
* `gee_service.py` projects GeoJSON coordinates into an `ee.Geometry.Polygon`.
* Sentinel-2 Level-2A surface reflectance (`COPERNICUS/S2_SR_HARMONIZED`) is filtered by bounds, date, and `<20%` cloud coverage.
* QA60 cloud bitmask is applied; visual bands `B4`, `B3`, `B2` are median-composited and visual thumbnail URLs / GeoTIFFs are created.

### 4. Specialist Reasoning & Spectral Modeling
* **Optical / SAR Processing:** Multispectral arrays are ingested by `vqa_caption_model.py` or `fusion_model.py`.
* **Spectral Index Analysis:** `spectral_indices_service.py` computes $\Delta NDVI$, $\Delta NDWI$, $\Delta NDBI$, and pixel shift masks.
* **Spatial Projection:** `grounding_model.py` translates normalized coordinates $[ymin, xmin, ymax, xmax]$ into geographic WGS84 bounding polygons $[min\_lon, min\_lat, max\_lon, max\_lat]$.

### 5. Aggregation & Trace Formatting Phase
* `aggregator.py` combines text answers, scales confidence by task classification certainty, compiles GeoJSON `FeatureCollection` evidence, and generates an auditable execution trace.

### 6. Persistence & Presentation Phase
* Stored to disk: `./sessions/{session_id}/session.json`.
* Returned to client as `QueryResponse`:
  ```json
  {
    "session_id": "2feff571-3f5f-4e7c-ba7d-19087d23b6ff",
    "task_type": "change_vqa",
    "answer": "Comparative analysis reveals new_construction in the central sector...",
    "confidence": 0.84,
    "evidence_geojson": { "type": "FeatureCollection", "features": [...] },
    "execution_trace": [
      { "step": "task_classification", "detail": { "task_type": "change_vqa" } },
      { "step": "model_dispatch", "detail": { "models_called": ["change_vqa", "change_segmentation"] } }
    ]
  }
  ```
* React updates `<ResultPanel />` and Mapbox injects the evidence vector layer into the map canvas.
