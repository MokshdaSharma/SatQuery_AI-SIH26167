# 10 — Database & Session Storage Architecture

## Storage Architecture Overview
SatQuery AI does **not** use a traditional relational database (such as PostgreSQL or MySQL) or a dedicated NoSQL database (such as MongoDB). 

Instead, the system employs an **ephemeral, decoupled filesystem session cache** keyed by UUIDs (`./sessions/{session_id}/`).

```text
sessions/
└── {session_id}/
    ├── session.json                   # Structured session manifest & audit log
    ├── upload_{image_id}.tif          # Uploaded original GeoTIFF
    ├── preview_{image_id}.png         # Downsampled web preview PNG
    ├── report_{session_id}.pdf        # Generated PDF executive report
    ├── evidence_{session_id}.geojson  # Exported spatial vector evidence
    ├── log_{session_id}.json          # Exported execution log
    └── bundle_{session_id}.zip        # Exported ZIP archive
```

---

## Session Manifest Schema (`session.json`)

| Field | Type | Required | Purpose |
|---|---|---|---|
| `session_id` | `string (UUID4)` | **Yes** | Unique identifier for the analysis session |
| `task_type` | `string` | **Yes** | Classified task category (`vqa`, `caption`, `grounding`, `change_vqa`, `fusion`) |
| `query` | `string` | **Yes** | Original user prompt or question |
| `roi_geojson` | `object` | **Yes** | GeoJSON Polygon or MultiPolygon describing the geographic boundary |
| `modality` | `string` | **Yes** | Requested sensor modality (`optical`, `sar`, `both`) |
| `date_start` | `string (YYYY-MM-DD)` | **Yes** | Primary epoch start date |
| `date_end` | `string (YYYY-MM-DD)` | No | Primary epoch end date |
| `date_start_2` | `string (YYYY-MM-DD)` | No | Secondary epoch start date (for bi-temporal change) |
| `date_end_2` | `string (YYYY-MM-DD)` | No | Secondary epoch end date |
| `image_refs` | `array of strings` | **Yes** | References to fetched or uploaded image descriptors |
| `answer` | `string` | **Yes** | Final AI text answer |
| `confidence` | `float (0.0 - 1.0)` | **Yes** | Calibrated confidence score |
| `change_types` | `array of strings` | No | Detected change categories (e.g. `["new_construction", "vegetation_growth"]`) |
| `evidence_geojson` | `object` | No | GeoJSON `FeatureCollection` of highlighted spatial bounding boxes/masks |
| `execution_trace` | `array of objects` | **Yes** | Step-by-step audit trail of decisions made by the agentic controller |
| `warnings` | `array of strings` | **Yes** | Non-fatal execution warnings (cloud cover, missing CRS, quota fallbacks) |

---

## Technical Rationale & Trade-offs

### Why Filesystem Sessions Were Chosen
* **Stateless Geospatial Processing:** Satellite image analysis queries are independent, self-contained sessions. Persisting large multi-megabyte GeoTIFF arrays, GeoJSON features, and PDF reports directly in the filesystem avoids database BLOB serialization bottlenecks.
* **Zero Infrastructure Overhead:** Developers can run the entire platform locally without spinning up a Docker container for PostgreSQL/PostGIS.
* **One-Click Bundling:** Exporting a session as a ZIP bundle simply requires packaging the contents of `./sessions/{session_id}/` into a `.zip` archive via Python's standard `zipfile` module.

### Trade-offs & Production Considerations
* **Horizontal Scaling:** When scaling across multiple server instances or Kubernetes pods, local filesystem storage requires a shared Network File System (NFS), AWS S3 bucket, or Google Cloud Storage bucket.
* **TTL / Cleanup:** Old sessions currently persist indefinitely unless manually cleared. A production deployment should implement a TTL cron job to prune directories older than 24-48 hours.
