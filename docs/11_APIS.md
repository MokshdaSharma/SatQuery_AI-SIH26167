# 11 — API Reference Manual

## API Overview
Base URL: `http://localhost:8000` (configurable via `VITE_API_BASE_URL`)
Interactive OpenAPI Documentation: `http://localhost:8000/api/docs`

---

## Endpoint Reference

### 1. `GET /healthz`
* **Purpose:** Service health and readiness probe.
* **Authentication:** None.
* **Request:** None.
* **Response (HTTP 200):**
  ```json
  {
    "status": "ok",
    "timestamp": "2026-09-17T00:15:30.123456Z"
  }
  ```

---

### 2. `POST /api/roi/fetch-imagery`
* **Purpose:** Queries Google Earth Engine for Sentinel-1 (SAR) or Sentinel-2 (Optical) imagery clipped to the given ROI.
* **Authentication:** None (Backend authenticates with GEE via Service Account).
* **Request Headers:** `Content-Type: application/json`
* **Request Body:**
  ```json
  {
    "roi_geojson": {
      "type": "Polygon",
      "coordinates": [[[75.80, 26.90], [75.82, 26.90], [75.82, 26.92], [75.80, 26.92], [75.80, 26.90]]]
    },
    "date_start": "2024-01-01",
    "date_end": "2024-03-31",
    "modality": "optical"
  }
  ```
* **Response (HTTP 200):**
  ```json
  {
    "session_id": "c3d4e5f6-7890-4abc-def1-234567890abc",
    "roi_geojson": { "type": "Polygon", "coordinates": [...] },
    "images": [
      {
        "image_id": "s2_20240215_opt",
        "modality": "optical",
        "date_acquired": "2024-02-15",
        "preview_url": "/api/download/c3d4e5f6-7890-4abc-def1-234567890abc/preview_s2.png",
        "local_path": "./sessions/c3d4e5f6-7890-4abc-def1-234567890abc/s2_patch.tif",
        "cloud_cover": 4.2
      }
    ],
    "warnings": []
  }
  ```

---

### 3. `POST /api/query`
* **Purpose:** Primary analysis endpoint executing task classification, input validation, specialist model dispatch, and evidence aggregation.
* **Authentication:** None.
* **Request Body:**
  ```json
  {
    "roi_geojson": {
      "type": "Polygon",
      "coordinates": [[[75.80, 26.90], [75.82, 26.90], [75.82, 26.92], [75.80, 26.92], [75.80, 26.90]]]
    },
    "query": "Where are the agricultural crop fields located?",
    "image_refs": [],
    "modality": "optical",
    "date_start": "2024-01-01",
    "date_end": "2024-03-31"
  }
  ```
* **Response (HTTP 200):**
  ```json
  {
    "session_id": "e4f5a6b7-8901-4cde-f123-4567890abcde",
    "task_type": "grounding",
    "answer": "Agricultural crop fields were identified in the southern quadrant characterized by high NDVI spectral reflection...",
    "confidence": 0.85,
    "evidence_geojson": {
      "type": "FeatureCollection",
      "features": [
        {
          "type": "Feature",
          "geometry": {
            "type": "Polygon",
            "coordinates": [[[75.805, 26.902], [75.815, 26.902], [75.815, 26.912], [75.805, 26.912], [75.805, 26.902]]]
          },
          "properties": {
            "label": "Grounded: agricultural plot",
            "confidence": 0.85,
            "color": "#38bdf8"
          }
        }
      ]
    },
    "change_types": null,
    "execution_trace": [
      {
        "step": "task_classification",
        "detail": {
          "task_type": "grounding",
          "classifier_confidence": 0.8,
          "matched_keywords": ["where", "located"]
        }
      },
      {
        "step": "input_validation",
        "detail": {
          "task_type": "grounding",
          "n_image_refs": 1,
          "roi_type": "Polygon"
        }
      },
      {
        "step": "model_dispatch",
        "detail": {
          "models_called": ["grounding"]
        }
      },
      {
        "step": "aggregation",
        "detail": {
          "final_confidence": 0.85,
          "n_evidence_features": 1
        }
      }
    ],
    "warnings": []
  }
  ```

---

### 4. `GET /api/layers/{layer_name}`
* **Path Parameter:** `layer_name` (`water` | `vegetation` | `buildings` | `roads`)
* **Query Parameter:** `roi` (URL-encoded GeoJSON geometry string)
* **Response (HTTP 200):**
  ```json
  {
    "layer_name": "buildings",
    "geojson": {
      "type": "FeatureCollection",
      "features": [
        {
          "type": "Feature",
          "geometry": { "type": "Polygon", "coordinates": [...] },
          "properties": { "area_in_meters": 142.5, "confidence": 0.89 }
        }
      ]
    },
    "tile_url": null,
    "legend": null
  }
  ```

---

### 5. `POST /api/upload-image`
* **Request:** `multipart/form-data` with key `file` (GeoTIFF / PNG / JPEG).
* **Response (HTTP 200):**
  ```json
  {
    "image_id": "8f9a0b1c-2d3e-4f5a-6b7c-8d9e0f1a2b3c",
    "session_id": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
    "filename": "upload_8f9a0b1c.tif",
    "modality": "uploaded_optical",
    "preview_url": "/api/download/1a2b3c4d.../preview_8f9a0b1c.png",
    "local_path": "./sessions/1a2b3c4d.../upload_8f9a0b1c.tif",
    "has_georef": true,
    "geo_bounds": [75.75, 26.85, 75.85, 26.95],
    "map_corners": [[75.75, 26.95], [75.85, 26.95], [75.85, 26.85], [75.75, 26.85]],
    "warnings": []
  }
  ```

---

### 6. `POST /api/export`
* **Request Body:**
  ```json
  {
    "session_id": "e4f5a6b7-8901-4cde-f123-4567890abcde",
    "formats": ["pdf", "geojson", "log", "zip"]
  }
  ```
* **Response (HTTP 200):**
  ```json
  {
    "session_id": "e4f5a6b7-8901-4cde-f123-4567890abcde",
    "files": [
      {
        "format": "pdf",
        "filename": "report_e4f5a6b7.pdf",
        "download_url": "/api/download/e4f5a6b7/report_e4f5a6b7.pdf"
      },
      {
        "format": "zip",
        "filename": "bundle_e4f5a6b7.zip",
        "download_url": "/api/download/e4f5a6b7/bundle_e4f5a6b7.zip"
      }
    ]
  }
  ```
