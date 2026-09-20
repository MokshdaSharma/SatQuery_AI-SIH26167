# SatQuery AI — Prompts & Integration Guide

Companion to `SatQuery_AI_Solution_Design.md`. Contains copy-pasteable prompts for (1) an architecture image, (2) a workflow image, (3) a coding agent build prompt, plus step-by-step integration instructions for Mapbox and GEE.

> **Note on image-gen prompts**: AI image generators (Gemini, DALL·E, Midjourney, etc.) are unreliable at rendering exact, legible text inside diagrams — labels often come out garbled. For a PPT you'll actually present, it's usually safer to build the diagram in a proper diagramming tool (PowerPoint SmartArt, draw.io/diagrams.net, Whimsical, Napkin.ai, or Mermaid exported as an image) where text is guaranteed correct, and use an image generator only for the visual *style* (backgrounds, icons, color treatment) around it. The prompts below work with either type of tool — text-aware diagram AIs (Napkin.ai, Whimsical AI, Gamma) will render the labels correctly; pure image generators may need you to add text boxes afterward in PowerPoint.

---

## 1. Prompt: Architecture diagram image

```
Create a clean, professional technical architecture diagram for a PowerPoint slide, in a modern flat-design infographic style (no photorealism, no 3D, no gradients — flat shapes, soft rounded rectangles, thin connecting lines with arrowheads, a muted tech color palette of navy blue, teal, and coral on a white background).

Title at the top: "SatQuery AI — System Architecture"

Layout, top to bottom, as five horizontal tiers connected by downward arrows:

Tier 1 (single box): "Frontend" — subtitle "Mapbox map, ROI draw tool, query input, date picker"

Tier 2 (single box, wider, distinct color): "Agentic Controller" — subtitle "Task classification, input validation, model routing, execution logging"

Tier 3 (five boxes side by side, same color as each other, distinct from tier 2): "VQA / Captioning", "Grounding", "Change-VQA", "Optical–SAR Fusion", "Segmentation / Change-type classifier"

Tier 4 (single box): "Output Aggregator" — subtitle "Evidence overlay, confidence scoring, audit report"

Tier 5 (single box): "Map Layer & Export Service" — subtitle "Water / roads / buildings / vegetation layers, PDF, GeoTIFF, GeoJSON, ZIP export"

To the left of Tier 1, a small external box labeled "Google Earth Engine — Sentinel-1 SAR + Sentinel-2 optical" with an arrow feeding into Tier 1.

To the right of Tier 3, a small external box labeled "Fine-tuned on BigEarthNet, VRSBench, RSVQA, CDVQA, SECOND" with a dashed arrow pointing into Tier 3, indicating these models were trained on these datasets.

Keep all text short (2–5 words per label, one short subtitle per box). Generous whitespace between tiers. No decorative icons inside boxes, just clean text. Widescreen 16:9 aspect ratio suitable for a presentation slide.
```

---

## 2. Prompt: Workflow diagram image

```
Create a clean, professional step-by-step workflow diagram for a PowerPoint slide, in a modern flat-design infographic style (flat shapes, soft rounded rectangles or circles for step numbers, thin connecting arrows, muted tech color palette of navy blue, teal, and coral on a white background, no 3D, no gradients, no photorealism).

Title at the top: "SatQuery AI — End-to-End Workflow"

Show 9 sequential numbered steps, arranged in a left-to-right then wrapping snake/zigzag layout (steps 1–5 left to right on the top row, steps 6–9 left to right on the bottom row, with a connecting arrow curving from the end of the top row down to the start of the bottom row):

1. "Draw ROI on map" — user draws a bounding box or polygon on the satellite map
2. "Submit query" — user types a natural-language question and picks date(s)/modality
3. "Fetch imagery" — backend pulls Sentinel-1/Sentinel-2 imagery for the ROI from Earth Engine
4. "Classify task" — agentic controller determines VQA, captioning, grounding, change, or fusion
5. "Validate inputs" — controller checks image count, modality, and dates match the task
6. "Run specialist model" — the selected fine-tuned model performs inference and segmentation
7. "Aggregate results" — outputs, confidence, and evidence masks are combined
8. "Render on map" — evidence overlays and layer filters (water, roads, buildings, vegetation, change-type) appear on the map
9. "Export report" — user downloads a PDF report, imagery, GeoJSON, and execution log as a bundle

Each step is a rounded box with a bold step number (1–9) inside a small circle to its left, and a short label. Keep labels to 3–6 words. Use small simple line-art icons where natural (a pin for ROI, a magnifying glass for query, a satellite for imagery fetch, a chart for aggregation, a download arrow for export) — keep icons minimal and flat, not detailed illustrations. Widescreen 16:9 aspect ratio suitable for a presentation slide.
```

---

## 3. Prompt for a coding agent (Codex / Copilot / Claude Code / Cursor)

Copy this whole block as the task description for your coding agent. It scaffolds the full application; model-internals (actual fine-tuned weights) are left as clearly marked integration points since those come from your separate ML training pipeline.

```
Build a web application called "SatQuery AI" — an agentic vision-language assistant for remote-sensing image analysis. Follow this exact spec.

OVERVIEW
The app lets a user draw a region of interest (ROI) on a satellite map, ask a natural-language question, and get back a text answer plus a visual evidence overlay on the map. It supports single-image VQA/captioning/grounding, bi-temporal change analysis with change-type segmentation, and optical-SAR fusion analysis. An agentic controller classifies the query, validates inputs, and routes to the right specialist model.

TECH STACK
- Frontend: React + Mapbox GL JS + @mapbox/mapbox-gl-draw, plain CSS (no heavy UI framework needed)
- Backend: Python FastAPI
- Satellite data access: earthengine-api / geemap (Google Earth Engine)
- Model serving: local Python functions/classes behind a common interface (see MODEL INTERFACE below) — actual model weights are loaded from a /models directory, to be filled in separately
- PDF report: reportlab
- Raster/vector export: rasterio (GeoTIFF), Pillow (PNG/JPEG), standard JSON (GeoJSON)
- Config: all secrets (Mapbox token, GEE service account key path) via environment variables / .env, never hardcoded

PROJECT STRUCTURE
/frontend
  /src
    App.jsx
    components/MapView.jsx        -- Mapbox map, ROI draw, layer toggles
    components/QueryPanel.jsx     -- query input, date picker, modality toggle
    components/ResultPanel.jsx    -- answer text, confidence, execution trace, export buttons
    api.js                        -- calls to backend REST endpoints
/backend
  main.py                         -- FastAPI app entrypoint
  /controller
    task_classifier.py            -- classify query into: vqa | caption | grounding | change_vqa | fusion
    input_validator.py            -- check image count/modality/dates against the classified task
    router.py                     -- dispatch to the right specialist model(s), collect outputs
    aggregator.py                 -- merge outputs, compute confidence, build execution trace
  /models
    base_model.py                 -- abstract interface all specialist models implement (see below)
    vqa_caption_model.py          -- stub implementing base_model for VQA + captioning
    grounding_model.py            -- stub implementing base_model for grounding
    change_vqa_model.py           -- stub implementing base_model for change-VQA
    fusion_model.py                -- stub implementing base_model for optical-SAR fusion
    change_segmentation_model.py  -- stub implementing base_model for change-type segmentation (new_construction, demolition, vegetation_growth, deforestation)
  /services
    gee_service.py                -- fetch Sentinel-1/2 imagery for an ROI + date range, clip, export to GeoTIFF
    map_layers_service.py         -- fetch JRC water, ESA WorldCover, Google Open Buildings from GEE; fetch OSM roads via Overpass API
    export_service.py             -- build PDF report, bundle GeoTIFF/PNG/GeoJSON/JSON log into a ZIP
  /schemas
    requests.py                   -- pydantic models for API request bodies
    responses.py                  -- pydantic models for API response bodies
  requirements.txt
  .env.example

MODEL INTERFACE (backend/models/base_model.py)
Define an abstract class SpecialistModel with:
  - def validate_input(self, images: list, metadata: dict) -> bool
  - def run(self, images: list, query: str, metadata: dict) -> dict
    returns: { "answer": str, "confidence": float, "evidence": geojson_or_none, "segmentation_mask": raster_or_none }
Each concrete model file (vqa_caption_model.py etc.) implements this interface. Leave the actual inference body as:
  # TODO: load fine-tuned checkpoint from /models/weights/<name> and run inference here
so it's obvious where trained weights plug in.

API ENDPOINTS (backend/main.py)
POST /api/roi/fetch-imagery
  body: { roi_geojson, date_start, date_end?, modality: "optical"|"sar"|"both" }
  -> fetches imagery via gee_service, returns image ids/paths + preview PNG urls

POST /api/query
  body: { roi_geojson, query, image_refs: [...], modality, date_start, date_end? }
  -> runs controller.task_classifier -> input_validator -> router -> aggregator
  -> returns { answer, confidence, evidence_geojson, segmentation_mask_url, execution_trace }

GET /api/layers/{layer_name}?roi=...
  layer_name in [water, roads, buildings, vegetation]
  -> returns GeoJSON/raster tile URL for that layer clipped to the ROI, via map_layers_service

POST /api/export
  body: { session_id, formats: ["pdf","geotiff","geojson","log","zip"] }
  -> returns downloadable file URL(s) via export_service

FRONTEND BEHAVIOR
- MapView renders a Mapbox satellite-streets map, initializes mapbox-gl-draw for polygon/bbox drawing, exposes the drawn geometry as GeoJSON to the parent component, and renders toggle switches for each of: Water, Roads, Buildings, Vegetation, and (once a change query has run) New construction / Demolition / Vegetation growth / Deforestation.
- QueryPanel captures the text query, an optional second date for change analysis, and a modality toggle (optical / SAR / both).
- On submit, call /api/roi/fetch-imagery then /api/query, show a loading state, then render the answer, confidence, and evidence overlay on the map via ResultPanel.
- ResultPanel shows the execution trace (task classified, models used, parameters) in a collapsible panel, and export buttons that call /api/export.

NON-FUNCTIONAL REQUIREMENTS
- All GEE and Mapbox calls must handle and surface errors gracefully (quota exceeded, invalid ROI, no imagery for date range) with clear user-facing messages.
- Log every controller decision (task classified, models called, parameters used, confidence) to a structured JSON log per session — this is the execution trace and must be exposed via the API and included in exports.
- Keep model inference behind the SpecialistModel interface so swapping in real fine-tuned weights later requires no changes to controller/router/aggregator code.
- Write a README with setup instructions, referencing environment variables MAPBOX_TOKEN and GEE_SERVICE_ACCOUNT_KEY_PATH.

Build this now as a working, runnable scaffold with the model inference bodies stubbed as described.
```

---

## 4. Integration instructions

### 4.1 Mapbox setup

1. Sign up at mapbox.com (free, no credit card needed to get a token in most current flows — some tiers may ask for card verification, this doesn't trigger a charge on the free tier).
2. Copy your default access token from the account page, or create a scoped token for production.
3. Install packages:
   ```
   npm install mapbox-gl @mapbox/mapbox-gl-draw
   ```
4. Initialize the map and drawing control:
   ```javascript
   import mapboxgl from 'mapbox-gl';
   import MapboxDraw from '@mapbox/mapbox-gl-draw';

   mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;

   const map = new mapboxgl.Map({
     container: 'map',
     style: 'mapbox://styles/mapbox/satellite-streets-v12',
     center: [76.9, 26.9], // default center, adjust as needed
     zoom: 10
   });

   const draw = new MapboxDraw({
     displayControlsDefault: false,
     controls: { polygon: true, trash: true }
   });
   map.addControl(draw);

   map.on('draw.create', updateROI);
   map.on('draw.update', updateROI);

   function updateROI() {
     const data = draw.getAll();
     const roiGeoJSON = data.features[0]?.geometry; // send this to the backend
   }
   ```
5. Store the token as an environment variable (`REACT_APP_MAPBOX_TOKEN` for CRA/Vite-style builds, or `NEXT_PUBLIC_MAPBOX_TOKEN` for Next.js) — never commit it to source control.
6. For rendering result layers (evidence overlays, water/roads/buildings/vegetation layers) returned as GeoJSON from the backend, add them with `map.addSource()` / `map.addLayer()`, and toggle visibility with `map.setLayoutProperty(layerId, 'visibility', 'visible'|'none')` for the filter switches.

### 4.2 Google Earth Engine setup

1. Sign up for Earth Engine access at earthengine.google.com and create/select a Google Cloud project.
2. Register the project under the **noncommercial** use category (free) at the Earth Engine configuration page — since April 2026 you'll also need to pick a noncommercial quota tier (Community tier is the default and is fine for a prototype).
3. Create a **service account** in Google Cloud Console, grant it the Earth Engine resource viewer/writer role, and generate a JSON key file. Keep this file out of source control; reference its path via an environment variable (`GEE_SERVICE_ACCOUNT_KEY_PATH`).
4. Install the Python client:
   ```
   pip install earthengine-api geemap
   ```
5. Authenticate in the backend using the service account (no interactive login needed once deployed):
   ```python
   import ee

   SERVICE_ACCOUNT = "your-service-account@your-project.iam.gserviceaccount.com"
   ee.Initialize(ee.ServiceAccountCredentials(SERVICE_ACCOUNT, "path/to/key.json"))
   ```
6. Fetch and clip imagery for an ROI:
   ```python
   def fetch_sentinel2(roi_geojson, start_date, end_date):
       roi = ee.Geometry(roi_geojson)
       collection = (
           ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
           .filterBounds(roi)
           .filterDate(start_date, end_date)
           .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20))
       )
       image = collection.median().clip(roi)
       return image

   def fetch_sentinel1(roi_geojson, start_date, end_date):
       roi = ee.Geometry(roi_geojson)
       collection = (
           ee.ImageCollection("COPERNICUS/S1_GRD")
           .filterBounds(roi)
           .filterDate(start_date, end_date)
           .filter(ee.Filter.eq("instrumentMode", "IW"))
       )
       image = collection.mosaic().clip(roi)
       return image
   ```
7. Export a small ROI patch directly (no Drive/Cloud Storage needed for small areas):
   ```python
   import geemap

   geemap.ee_export_image(
       image,
       filename="roi_export.tif",
       scale=10,
       region=roi,
       file_per_band=False
   )
   ```
8. Fetch the free precomputed map layers the same way:
   ```python
   water = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select("occurrence").clip(roi)
   worldcover = ee.ImageCollection("ESA/WorldCover/v200").first().clip(roi)
   buildings = ee.FeatureCollection("GOOGLE/Research/open-buildings/v3/polygons").filterBounds(roi)
   ```
9. Roads aren't in GEE — fetch them from OpenStreetMap via the Overpass API instead:
   ```python
   import requests

   def fetch_osm_roads(bbox):
       query = f"""
       [out:json];
       way["highway"]({bbox});
       out geom;
       """
       response = requests.post("https://overpass-api.de/api/interpreter", data={"data": query})
       return response.json()
   ```
10. Wrap all GEE calls in try/except and surface a clear message on `ee.EEException` (commonly quota-related) rather than a raw stack trace.

### 4.3 Deployment (free tier)

- **Backend**: containerize with a `Dockerfile`, push to Hugging Face Spaces (Docker SDK) or Render's free web service tier. Store `MAPBOX_TOKEN` and the GEE service account key as HF Spaces "secrets" / Render environment variables, not in the repo.
- **Frontend**: deploy to Vercel or Netlify free tier, pointing `REACT_APP_API_BASE_URL` at your backend's deployed URL.
- **Model weights**: since fine-tuned checkpoints can be large, host them on the Hugging Face Hub (free for public/private repos under generous size limits) and load them at backend startup rather than bundling in the Docker image.

### 4.4 Fine-tuning pipeline (separate from the app)

- Do LoRA/QLoRA fine-tuning in a Colab or Kaggle notebook (free GPU quota), not in the app repo.
- Save the resulting adapter weights, push to a private/public Hugging Face model repo.
- The backend's model stub files (`vqa_caption_model.py` etc.) load the base checkpoint + LoRA adapter from that Hugging Face repo at startup — this keeps the training pipeline and the serving app cleanly separated.
