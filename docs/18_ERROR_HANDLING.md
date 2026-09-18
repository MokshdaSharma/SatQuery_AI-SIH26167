# 18 — Error Handling & Resilience Matrix

## Error Handling Architecture
SatQuery AI implements a tiered, defensive error-handling strategy designed to ensure that network timeouts, missing satellite scenes, missing API keys, or GPU VRAM limits never crash the application or leave the UI in an unhandled state.

---

## Error Handling Matrix

| Error Scenario | Root Cause | Trigger Location | HTTP Code / Internal Handling | User Impact | Resilience & Fallback Mechanism |
|---|---|---|---|---|---|
| **Malformed GeoJSON** | User sends unclosed or non-polygon GeoJSON geometry | `backend/controller/input_validator.py` | `HTTP 422 Unprocessable Entity` | UI displays red validation alert | Request rejected immediately before calling GEE |
| **GEE Export Failure / Quota Exceeded** | Cloud masking fails or GEE computation exceeds limit | `backend/services/gee_service.py` | `GEEError` caught, logged as warning | User receives answer but preview thumbnail is omitted | Non-fatal; execution continues and surfaces warning banner in `QueryResponse.warnings` |
| **GPU / PyTorch VRAM Unavailable** | Missing CUDA driver or insufficient VRAM for 7B VLM | `backend/models/*.py` | Catches `RuntimeError` / `ImportError` | Seamless; response generated in ~1-2s | Automatically switches to multimodal LLM vision prompt or domain knowledge heuristics |
| **OpenAI Quota Limit Exceeded (429)** | No credits remaining on OpenAI billing account | `backend/models/*.py` | Catches `openai.APIError` (429) | No crash; high-quality remote sensing answer returned | Generates deterministic land-cover report and calculated spectral index statistics |
| **OSM Overpass API Timeout** | Public Overpass server is busy or ROI is too large | `backend/services/map_layers_service.py` | Catches `requests.RequestException` | Roads layer displays warning dot | Returns empty GeoJSON with warning; does not block other layers |
| **Corrupted GeoTIFF Upload** | User uploads truncated or non-geospatial image | `backend/services/image_upload_service.py` | `UploadError` $\rightarrow$ `HTTP 422` | Error banner on upload card | Explains accepted file formats (`.tif`, `.png`, `.jpg`, `.jp2`) |
| **Directory Traversal Attack** | Malicious user passes `../../etc/passwd` to download route | `backend/main.py:393` | `HTTP 403 Forbidden` | Access Denied | Path resolution checks that requested file is strictly inside `_SESSIONS_DIR` |
| **Mapbox Token Missing** | Developer forgot to set `VITE_MAPBOX_TOKEN` in `frontend/.env` | `frontend/src/components/MapView.jsx` | Handled in React state | Map area displays clear instructions | Replaces map with setup guide explaining how to add the token |
