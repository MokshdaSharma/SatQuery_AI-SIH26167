# SatQuery AI — Solution Design Document

An interactive agentic vision-language assistant for multimodal remote-sensing image analysis through natural-language queries.

---

## 1. Problem Summary

SatQuery AI must let a non-expert user ask natural-language questions about satellite imagery (single image, optical+SAR pair, or bi-temporal pair) and get back an evidence-grounded answer, produced by an **agentic controller** that routes the query to the right **remote-sensing-adapted** specialist model — not a single generic VLM.

---

## 2. Compulsory features (must be built)

| # | Feature | Notes |
|---|---|---|
| 1 | Remote-sensing adaptation | At least one visual/vision-language component fine-tuned or adapted using BigEarthNet (or another open RS dataset) |
| 2 | Single-image VQA | Mandatory baseline |
| 3 | One more single-image task | Captioning/scene description **or** text-guided grounding |
| 4 | Bi-temporal change analysis | Change description or change-VQA (CDVQA-style); optional change mask — SatQuery AI goes further and produces a full change-type segmentation (new construction/demolition/vegetation growth/deforestation, Section 9), not just a binary mask |
| 5 | Optical–SAR cross-modal analysis | Joint extraction from co-registered Sentinel-2 + Sentinel-1 (Cartosat-2S + RISAT at final eval) |
| 6 | Agentic orchestration | Query→task classification, input validation, model routing, output fusion, confidence, execution trace |
| 7 | Input upload + compatibility check | Format/modality/metadata validation (GeoTIFF/TIFF; PNG/JPEG only for benchmark datasets) |
| 8 | GUI/web app | Full interactive frontend |
| 9 | Evidence + confidence + audit trail | Visual overlays, confidence scores, downloadable report, execution log |

A generic LLM/VLM with no RS adaptation disqualifies the solution — this is explicit in the brief.

---

## 3. Suggested USPs

- **True agentic routing, not a single mega-model** — an explicit controller that logs *why* it picked a tool (task type, modality check, parameters). This "auditable execution trace" is directly graded — make it visible and polished, not an afterthought.
- **Draw-your-ROI-and-ask** — the user draws a box on a live satellite map and the system pulls the actual Sentinel-1/2 imagery for that ROI on demand, instead of requiring pre-sourced GeoTIFFs. Few teams will bother building this.
- **Hybrid optical–SAR fusion** — combine a learned fusion model with classical, explainable indices (NDVI/NDWI/NDBI from optical, backscatter thresholds from SAR) so outputs are accurate *and* interpretable — useful where explainability matters (ISRO/SAC-style evaluation).
- **Confidence-calibrated, visually grounded answers** — every answer ships with a bounding box/mask/heatmap, not just text.
- **Multi-format downloadable audit package** — PDF report + raw imagery + GeoJSON evidence + machine-readable log, bundled in one click (see Section 9).
- **Modality-aware behaviour** — the same query behaves differently depending on whether one image, an optical+SAR pair, or a bi-temporal pair was supplied, and the system explains that choice in the trace.
- **Semantic change-type segmentation with causal explanation** — for bi-temporal pairs, don't just say "something changed": segment the changed pixels into **new construction, demolition, vegetation growth, and deforestation**, then have the LLM generate a plain-language explanation of the likely cause, grounded in the segmentation statistics.
- **Layered, filterable map** — toggle base feature layers (water bodies, roads, buildings, vegetation) on top of the ROI independently of any query, plus a change-type layer once a change analysis has been run.

---

## 4. Are we building the VLM from scratch, or using an API?

**Neither extreme works, and the middle path is mandatory given the brief:**

- **Training a VLM from scratch** is infeasible — foundation-model-scale pretraining needs compute and data far beyond a prototype budget.
- **Calling a closed proprietary API as-is** (e.g. a general-purpose vision-language API with no RS fine-tuning) directly **fails the stated requirement**: *"A generic LLM or VLM without remote-sensing adaptation will not satisfy the requirements."* You also can't easily attach an agentic controller that inspects and routes across multiple specialist internals if the core model is a black-box API.
- **The correct approach**: start from **open-weight pretrained VLM/RS checkpoints** you host yourself, and **fine-tune/adapt** them (LoRA/QLoRA) on BigEarthNet and the task datasets. This directly satisfies the "remote-sensing fine-tuning or domain adaptation" requirement, keeps compute cost near zero (fits free Colab/Kaggle GPU quotas), and gives you full control to build the agentic layer around it.
- **Where an API is still fine**: non-core, non-vision steps — e.g. using a free/cheap LLM API purely for query parsing / task classification, or for phrasing the final aggregated answer in natural language. These aren't the "vision-language component" being evaluated for RS adaptation, so using an off-the-shelf LLM there is a reasonable engineering shortcut. The core visual understanding models (VQA, captioning, grounding, change, fusion) must be your fine-tuned open-source models.

### How the VLM actually works (for your report)

1. **Vision encoder** (ViT/CNN) converts the image into a grid of patch embeddings.
2. **Projection/adapter layer** maps those embeddings into the LLM's token embedding space.
3. **LLM decoder** consumes the projected image tokens together with the text query tokens and autoregressively generates the answer.
4. **Grounding/change heads**: grounding models add a detection/segmentation head or coordinate-token output for bounding boxes; change models typically use a **Siamese** (twin) encoder that processes both dates and feeds a difference/attention representation into the LLM head.
5. **RS fine-tuning**: continue training on BigEarthNet image-text pairs — usually just the projector layer and LoRA adapters on the LLM (vision encoder frozen or lightly tuned) — so the model learns RS-specific vocabulary (land-cover classes, sensor terminology) and visual patterns (multispectral band combinations, SAR speckle) it never saw during general pretraining.

**Recommended starting checkpoints** (open weights, no license cost): GeoChat (RS VQA + grounding + conversation), RS-LLaVA-style captioning checkpoints, Prithvi (IBM/NASA geospatial foundation model) or a ResNet/ViT Siamese backbone for change tasks, Grounding DINO for open-vocabulary detection if not using GeoChat's native grounding.

---

## 5. Dataset integration plan

| Dataset | Role in the PS | How it's integrated |
|---|---|---|
| **BigEarthNet** | Primary adaptation dataset (paired Sentinel-1 SAR + Sentinel-2 multispectral + text annotations) | Fine-tune vision-language alignment (LoRA on projector + LLM) so the model learns multispectral/SAR bands and RS vocabulary; the paired S1/S2 structure also pretrains the optical–SAR fusion component |
| **VRSBench** | Eval: captioning, grounding, VQA on single images | Held-out test split — run inference only, score BLEU/CIDEr (captioning), IoU (grounding), accuracy (VQA); never train on it |
| **RSVQA** | Eval: single-image VQA | Benchmark VQA accuracy on held-out split; its train split can optionally add more VQA fine-tuning data if the rules permit |
| **CDVQA** | Train + eval for change-based VQA | Train the bi-temporal Siamese encoder + LLM head on its train split; evaluate change-VQA accuracy on its test split |
| **ISRO/SAC eval set** (Cartosat-2S + RISAT) | Final blind evaluation | Not available during development — the pipeline must generalize. Use GEE-fetched Sentinel-1/2 pairs as a development stand-in, but note the domain gap (different sensor resolution/spectral response) in your writeup and, if time allows, add light domain-adaptation augmentation (resolution downsampling, noise) to reduce the gap |
| **SECOND** (SEmantic Change detectiON Dataset) | Train the change-type segmentation model | Provides before/after semantic classes (building, vegetation, water, bare ground, etc.) directly, so pixel transitions map cleanly to new construction / demolition / vegetation growth / deforestation labels |
| **ESA WorldCover, JRC Global Surface Water, Google Open Buildings, OpenStreetMap** | Precomputed map layers (not trained on) | Pulled live per-ROI from GEE (WorldCover, JRC water, Open Buildings) and the OSM Overpass API (roads) to power the togglable water/vegetation/buildings/roads map layers — zero-cost, no custom model needed for these |

---

## 6. System architecture

```
Frontend (Mapbox map + ROI draw + query box)
        │
        ▼
Agentic controller  — classify task, validate inputs, route
        │
   ┌────┼────────────┬────────────────┬──────────────────┐
   ▼    ▼             ▼                ▼                  ▼
VQA/    Grounding   Change-VQA     Optical–SAR      Segmentation /
caption                            fusion            change-type
   └────┴─────────────┴────────────────┴──────────────────┘
                            │
                            ▼
       Output aggregator — evidence, confidence, audit report
                            │
                            ▼
        Map layer service — water / roads / buildings / vegetation
        (precomputed: JRC GSW, WorldCover, Open Buildings, OSM)
```

- **Frontend**: React (or Streamlit for faster iteration) + Mapbox GL JS + `mapbox-gl-draw`.
- **Agentic controller**: FastAPI service that parses the query, classifies the task, checks input compatibility (count/modality/format/dates), selects and sequences specialist tools, and logs an execution trace.
- **Specialist models**: independently callable services/functions — VQA/captioning, grounding, change-VQA, optical–SAR fusion.
- **Output aggregator**: merges tool outputs, renders evidence as GeoJSON overlays, computes/combines confidence, and produces the downloadable report bundle.

---

## 7. Detailed workflow

1. User opens the app and sees a Mapbox satellite-style map, a query box, and a date picker.
2. User draws an ROI (bounding box/polygon) on the map, or searches a place name.
3. User selects mode: single date (VQA/captioning/grounding), two dates (change analysis), or optical+SAR toggle (fusion).
4. User submits a natural-language query.
5. Backend fetches imagery for that ROI/date(s) from Google Earth Engine (Sentinel-2 optical, Sentinel-1 SAR) and clips it to the ROI.
6. Agentic controller classifies the task and checks the fetched inputs match what that task needs (e.g. two dates for change queries, both modalities for fusion queries).
7. Controller routes to the right specialist model(s) with only the permitted parameters.
8. Specialist model(s) run inference and return a text answer + spatial evidence (bbox/mask/heatmap) + confidence.
9. Aggregator merges outputs, draws the evidence overlay back onto the Mapbox map, and logs the execution trace.
10. UI shows the answer, the map overlay, the execution trace, and the multi-format download options (Section 9).

---

## 8. Map + ROI integration — Mapbox + Google Earth Engine

**Mapbox** only handles the interactive map surface — base tiles, pan/zoom, and letting the user draw a polygon/bbox (`mapbox-gl-draw` returns a GeoJSON geometry on `draw.create`/`draw.update`). It never touches the actual pixels used for inference.

**Google Earth Engine (GEE)** fetches the real analysis-ready imagery:

1. Frontend sends the drawn GeoJSON polygon + selected date(s)/modality to the backend.
2. Backend authenticates with a GEE service account (project registered as noncommercial/research — free one-time signup).
3. Query the relevant collection: `COPERNICUS/S2_SR_HARMONIZED` for optical (cloud-mask + composite over the date range), `COPERNICUS/S1_GRD` for SAR (filter orbit/polarization).
4. Clip to the ROI: `image.clip(roi_geometry)`.
5. Export the clipped patch directly to the server via `ee.data.computePixels` / `geemap.ee_export_image` (works without Drive/Cloud Storage for small ROI patches).
6. Convert to GeoTIFF/array and feed it into the model pipeline.
7. Return results with the evidence overlay as GeoJSON so Mapbox renders it on the same map.

### Cost (verified current, Sept 2026)

- **Mapbox**: free tier is 50,000 web map loads/month — more than enough for a prototype/demo. Some signups now require a card on file for identity verification even though usage stays free; that's not a charge.
- **Earth Engine**: free for noncommercial, research, and educational use — covers this project fully. Since April 2026, Google introduced **noncommercial quota tiers** (Community/Contributor/Partner) — still $0, but there's now a monthly compute-unit (EECU-hour) quota per project instead of unlimited use. Register under the correct noncommercial tier and watch usage if you run very large/frequent exports. Commercial/production GEE use is billed separately and isn't relevant for a prototype/competition submission.

**Bottom line: map interaction (Mapbox) = free, imagery fetch (GEE) = free for this use case**, with only the noncommercial compute quota worth monitoring.

---

## 9. Segmentation, change-type classification & layered map filters

### 9.1 Base map layers (precomputed, zero-cost)

These are **not** produced by a custom segmentation model — they're pulled live for the ROI from existing free datasets and rendered as togglable Mapbox layers:

| Layer | Source | Access |
|---|---|---|
| Water bodies | JRC Global Surface Water | `JRC/GSW1_4/GlobalSurfaceWater` in GEE |
| Vegetation / land cover | ESA WorldCover (10 m global) | `ESA/WorldCover/v200` in GEE |
| Buildings | Google Open Buildings | `GOOGLE/Research/open-buildings` in GEE (or OSM footprints as backup) |
| Roads | OpenStreetMap road network | Overpass API (vector, free) |

The backend fetches each layer clipped to the ROI, converts it to a raster tile or GeoJSON, and the frontend renders it as an independent Mapbox layer with its own visibility toggle — so a user can turn on "water only," "roads only," etc., regardless of what query they've asked.

### 9.2 ROI/image segmentation for the active task

When the user runs an analysis on a single image or ROI, the relevant specialist model additionally returns a segmentation mask (e.g. land-cover classes or the grounded region) so the evidence overlay is a proper segmentation, not just a bounding box, wherever the task supports it.

### 9.3 Bi-temporal change-type segmentation

For two images of the same ROI:

1. A bi-temporal segmentation/change model (Siamese U-Net or a lightweight transformer such as ChangeFormer/BIT, fine-tuned on **SECOND**) classifies each pixel's before→after class transition.
2. Transitions are grouped into the four requested categories:
   - non-built → built = **new construction**
   - built → bare/cleared = **demolition**
   - non-vegetated → vegetated = **vegetation growth**
   - vegetated → bare/non-vegetated = **deforestation / clearing**
3. The resulting class map is rendered as its own map layer (with per-category toggles) and returned as a GeoJSON/raster mask.
4. Summary statistics from the segmentation (area per category, location, spatial pattern) are passed as structured context into the fine-tuned change-VQA LLM head, which generates the natural-language causal explanation (e.g. "built-up area expanded along the northern edge, consistent with new construction; vegetation loss in the southeast is consistent with deforestation").

This two-stage design — a segmentation model that classifies *what* changed, and an LLM that explains *why it likely happened* — keeps the causal-explanation step grounded in actual pixel evidence rather than free-form guessing.

---

## 10. Exportable / downloadable outputs

The system should offer **multiple export formats**, not just a PDF:

| Format | Content | Purpose |
|---|---|---|
| **PDF report** (ReportLab/WeasyPrint) | Query, task classification, model(s) used, parameters, textual answer, confidence, evidence image with overlay, timestamp | Human-readable audit trail — the "downloadable report" requirement |
| **GeoTIFF** | Raw, geo-referenced satellite image actually used for inference | Lets the user keep the exact analysis input for their own GIS work |
| **PNG/JPEG** | Quick-view rendered version of the same image | Easy viewing/sharing without GIS tools |
| **GeoJSON** | Evidence overlay — bounding boxes, masks, or change polygons | Reusable directly in QGIS/ArcGIS or other mapping tools |
| **Segmentation/change-type mask** (GeoTIFF or GeoJSON, per category) | New construction / demolition / vegetation growth / deforestation classes, plus any base land-cover segmentation | Lets the user inspect or reuse the exact classified change map, category by category |
| **Active map layers** (GeoJSON/raster, optional) | Whichever of water/roads/buildings/vegetation layers are toggled on at export time | Bundles the map state the user was viewing, not just the model output |
| **JSON/CSV execution log** | Task, tool names, parameters, confidence, timestamps | Machine-readable version of the audit trail, complements the PDF |
| **ZIP bundle** | All of the above together | One-click "download everything" for the session |

Implementation note: generate each artifact on demand in the backend, store them (session-scoped, no paid DB needed for a prototype — local disk or a temp bucket), and expose a single `/export?format=all` endpoint that zips them.

---

## 11. Tech stack

| Layer | Choice | Why free |
|---|---|---|
| Map + ROI UI | Mapbox GL JS + `mapbox-gl-draw` | 50,000 free web map loads/month |
| Frontend framework | React (or Streamlit) | free hosting on Vercel/Netlify/Streamlit Cloud |
| Satellite data | Google Earth Engine (Python API) — Sentinel-2 L2A + Sentinel-1 GRD | free for noncommercial/research/education use |
| Backend API | FastAPI (Python) | free to self-host on HF Spaces / Render free tier |
| Base RS-VLM | GeoChat / RS-LLaVA-style open checkpoint | open weights, no license cost |
| Fine-tuning method | LoRA/QLoRA on BigEarthNet subset | fits free Colab/Kaggle GPU quota |
| Change model | Siamese encoder (Prithvi/ResNet) + LLM head, fine-tuned on CDVQA | open weights + free compute |
| Grounding | Grounding DINO or GeoChat's native grounding head | open source |
| Fusion (optical+SAR) | Late-fusion CNN/transformer + classical indices (NDVI/NDWI + SAR backscatter threshold) as explainability fallback | no paid tools needed |
| Change-type segmentation | Siamese U-Net / ChangeFormer / BIT fine-tuned on SECOND | open source + free GPU quota |
| Base map layers | ESA WorldCover, JRC Global Surface Water, Google Open Buildings (via GEE); OSM roads via Overpass API | all free, precomputed — no custom model needed |
| Backend hosting | Hugging Face Spaces (Gradio/FastAPI) or Render free tier | free |
| Frontend hosting | Vercel / Netlify / Streamlit Community Cloud | free |
| Report generation | ReportLab / WeasyPrint (PDF) | open source |
| Raster/vector export | `rasterio` (GeoTIFF), Pillow (PNG/JPEG), `geopandas`/native JSON (GeoJSON) | open source |
| Logging/audit trail | JSON log file or free-tier Supabase | free |

---

## 12. Zero-cost build strategy — summary

- **Compute**: Google Colab (free T4) / Kaggle Notebooks (free P100/T4, ~30h GPU/week) for LoRA fine-tuning.
- **Models**: start from open-weight checkpoints, don't pretrain from scratch.
- **Hosting**: Hugging Face Spaces + Vercel/Netlify/Streamlit Cloud free tiers.
- **Storage**: local/session storage or free-tier Supabase — no paid DB.
- **Satellite data**: GEE noncommercial tier.
- **Map**: Mapbox free tier.

This comfortably covers a hackathon-scale prototype and a live demo; it stops being free only under heavy sustained production traffic, which is out of scope for a submission.

---

## 13. Suggested build order

1. Get single-image VQA working on VRSBench/RSVQA first — validates the fine-tuning pipeline cheaply.
2. Add captioning or grounding (whichever is faster with the chosen checkpoint).
3. Build the agentic controller as a thin router around these two tools — get execution-trace logging right early since it's explicitly graded.
4. Add change-VQA using CDVQA.
5. Add optical–SAR fusion (start with the classical-index fallback, layer in the learned fusion model if time allows).
6. Wire in Mapbox ROI drawing + GEE fetch — it's UI/plumbing, not model risk, so it's safe to build after the model pipeline works on static files.
7. Wire in the precomputed base map layers (water/roads/buildings/vegetation) — this is pure integration work against free datasets, no training needed, and can be done in parallel with step 6.
8. Train and integrate the change-type segmentation model (Section 9.3) once basic change-VQA works, then connect its output to the causal-explanation LLM step.
9. Add the multi-format export bundle (PDF, GeoTIFF/PNG, GeoJSON, segmentation masks, JSON log, ZIP) and confidence UI as the final polish pass.
