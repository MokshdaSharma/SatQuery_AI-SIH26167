"""
SatQuery AI — FastAPI backend entrypoint.

Endpoints
─────────
  POST /api/roi/fetch-imagery   — Fetch satellite imagery for an ROI via GEE
  POST /api/upload-image        — Upload a local satellite image (GeoTIFF/PNG/JPEG)
  POST /api/query               — Run agentic VLM analysis pipeline
  GET  /api/layers/{layer_name} — Fetch a thematic map layer
  POST /api/export              — Export session results in one or more formats
  GET  /api/download/{session_id}/{filename} — Serve an exported file
  GET  /healthz                 — Health check

Start the server:
  uvicorn backend.main:app --reload --port 8000
"""
from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from dotenv import load_dotenv

# Load .env before anything else
load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .controller.aggregator import aggregate
from .controller.input_validator import InputValidationError, validate_inputs
from .controller.router import dispatch, warm_up_all_models
from .controller.task_classifier import classify_task
from .schemas.requests import ExportRequest, FetchImageryRequest, QueryRequest
from .schemas.responses import (
    ExecutionStep,
    ExportFile,
    ExportResponse,
    ImageryItem,
    ImageryResponse,
    LayerResponse,
    QueryResponse,
    UploadResponse,
)
from .services import export_service, gee_service, image_upload_service, map_layers_service

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

_SESSIONS_DIR = Path(os.getenv("SESSIONS_DIR", "./sessions"))
_SESSIONS_DIR.mkdir(parents=True, exist_ok=True)

_CORS_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000,http://localhost:4173",
    ).split(",")
    if o.strip()
]

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="SatQuery AI",
    description=(
        "Agentic vision-language assistant for remote-sensing image analysis. "
        "Draw an ROI, ask a question, get a grounded answer."
    ),
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def on_startup() -> None:
    logger.info("SatQuery AI starting up …")
    warm_up_all_models()
    logger.info("All specialist models warmed up.")


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/healthz", tags=["Meta"])
def health_check():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


# ---------------------------------------------------------------------------
# POST /api/roi/fetch-imagery
# ---------------------------------------------------------------------------

@app.post("/api/roi/fetch-imagery", response_model=ImageryResponse, tags=["Imagery"])
async def fetch_imagery(req: FetchImageryRequest):
    """
    Fetch Sentinel-1/2 imagery for the given ROI and date range.

    Returns image descriptors including preview thumbnail URLs and server-side
    GeoTIFF paths that can be passed as image_refs to /api/query.
    """
    session_id = str(uuid.uuid4())
    date_end = req.date_end or (
        datetime.strptime(req.date_start, "%Y-%m-%d") + timedelta(days=90)
    ).strftime("%Y-%m-%d")

    try:
        raw_images = gee_service.fetch_imagery(
            roi_geojson=req.roi_geojson,
            date_start=req.date_start,
            date_end=date_end,
            modality=req.modality,
            session_id=session_id,
        )
    except gee_service.GEEError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.exception("Unexpected error in fetch-imagery.")
        raise HTTPException(status_code=500, detail=f"Internal error: {exc}")

    images = [ImageryItem(**img) for img in raw_images]
    warnings: list[str] = []
    if any(img.preview_url is None for img in images):
        warnings.append(
            "Preview thumbnails unavailable (GEE not configured or export failed). "
            "Image references are still valid for /api/query."
        )

    # Persist session imagery manifest
    _save_session_manifest(session_id, {"imagery": raw_images, "request": req.model_dump()})

    return ImageryResponse(
        session_id=session_id,
        roi_geojson=req.roi_geojson,
        images=images,
        warnings=warnings,
    )


# ---------------------------------------------------------------------------
# POST /api/query
# ---------------------------------------------------------------------------

@app.post("/api/query", response_model=QueryResponse, tags=["Analysis"])
async def run_query(req: QueryRequest):
    """
    Run the agentic VLM analysis pipeline:
      1. Classify the query → task type
      2. Validate inputs
      3. Dispatch to specialist model(s)
      4. Aggregate results
      5. Return answer + evidence + execution trace
    """
    session_id = str(uuid.uuid4())

    has_second_date = bool(req.date_start_2)

    # ── Step 1: Task classification ──────────────────────────────────────────
    classification = classify_task(
        query=req.query,
        modality=req.modality,
        has_second_date=has_second_date,
    )
    logger.info(
        "[Query %s] classified as %s (confidence=%.2f)",
        session_id, classification.task_type, classification.confidence,
    )

    # ── Step 2: Input validation ─────────────────────────────────────────────
    metadata: Dict[str, Any] = {
        "roi_geojson": req.roi_geojson,
        "modality": req.modality,
        "date_start": req.date_start,
        "date_end": req.date_end,
        "date_start_2": req.date_start_2,
        "date_end_2": req.date_end_2,
        "image_refs": req.image_refs,
        "query": req.query,
        "session_id": session_id,
        "task_type": classification.task_type,
    }

    try:
        val_warnings = validate_inputs(
            task_type=classification.task_type,
            image_refs=req.image_refs,
            modality=req.modality,
            metadata=metadata,
        )
    except InputValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # ── Step 3: Auto-fetch imagery if no image_refs provided ─────────────────
    image_refs = list(req.image_refs)
    if not image_refs:
        date_end = req.date_end or (
            datetime.strptime(req.date_start, "%Y-%m-%d") + timedelta(days=90)
        ).strftime("%Y-%m-%d")
        try:
            raw_images = gee_service.fetch_imagery(
                roi_geojson=req.roi_geojson,
                date_start=req.date_start,
                date_end=date_end,
                modality=req.modality,
                session_id=session_id,
            )
            image_refs = [img["image_id"] for img in raw_images]
            metadata["image_refs"] = image_refs
        except gee_service.GEEError as exc:
            val_warnings.append(f"Auto-fetch imagery warning: {exc}")

    # ── Step 4: Router dispatch ───────────────────────────────────────────────
    try:
        model_outputs = dispatch(
            task_type=classification.task_type,
            image_refs=image_refs,
            query=req.query,
            metadata=metadata,
        )
    except Exception as exc:
        logger.exception("Router dispatch failed.")
        raise HTTPException(status_code=500, detail=f"Model dispatch error: {exc}")

    # ── Step 5: Aggregation ───────────────────────────────────────────────────
    result = aggregate(
        task_type=classification.task_type,
        classification_confidence=classification.confidence,
        model_outputs=model_outputs,
        metadata=metadata,
    )
    result["warnings"].extend(val_warnings)

    # ── Persist session log ───────────────────────────────────────────────────
    session_log = {
        **metadata,
        "answer": result["answer"],
        "confidence": result["confidence"],
        "change_types": result.get("change_types"),
        "execution_trace": result["execution_trace"],
        "warnings": result["warnings"],
        "evidence_geojson": result["evidence_geojson"],
    }
    _save_session_manifest(session_id, session_log)

    # ── Build response ────────────────────────────────────────────────────────
    return QueryResponse(
        session_id=session_id,
        task_type=classification.task_type,
        answer=result["answer"],
        confidence=result["confidence"],
        evidence_geojson=result.get("evidence_geojson"),
        segmentation_mask_url=result.get("segmentation_mask_url"),
        change_types=result.get("change_types"),
        execution_trace=[ExecutionStep(**s) for s in result["execution_trace"]],
        warnings=result["warnings"],
    )


# ---------------------------------------------------------------------------
# GET /api/layers/{layer_name}
# ---------------------------------------------------------------------------

@app.get("/api/layers/{layer_name}", response_model=LayerResponse, tags=["Layers"])
async def get_layer(
    layer_name: str,
    roi: str = Query(
        ...,
        description="URL-encoded GeoJSON geometry string for the ROI",
    ),
):
    """
    Fetch a thematic map layer clipped to the given ROI.

    layer_name: water | vegetation | buildings | roads
    roi:        URL-encoded GeoJSON geometry (Polygon/MultiPolygon)
    """
    try:
        roi_geojson = json.loads(roi)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid roi parameter — must be valid JSON: {exc}",
        )

    try:
        layer_data = map_layers_service.fetch_layer(
            layer_name=layer_name,
            roi_geojson=roi_geojson,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        logger.exception("Layer fetch failed for '%s'.", layer_name)
        raise HTTPException(status_code=500, detail=f"Layer fetch error: {exc}")

    return LayerResponse(**layer_data)


# ---------------------------------------------------------------------------
# POST /api/export
# ---------------------------------------------------------------------------

@app.post("/api/export", response_model=ExportResponse, tags=["Export"])
async def export_session(req: ExportRequest):
    """
    Export session results as PDF, GeoTIFF, GeoJSON, structured log, or ZIP.
    Returns download URLs for each requested format.
    """
    session_dir = _SESSIONS_DIR / req.session_id
    if not session_dir.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Session '{req.session_id}' not found. Run /api/query first.",
        )

    # Load stored session data for the PDF / log content
    session_data = _load_session_manifest(req.session_id) or {}

    try:
        file_descriptors = export_service.export_session(
            session_id=req.session_id,
            formats=req.formats,
            session_data=session_data,
        )
    except Exception as exc:
        logger.exception("Export failed for session %s.", req.session_id)
        raise HTTPException(status_code=500, detail=f"Export error: {exc}")

    return ExportResponse(
        session_id=req.session_id,
        files=[ExportFile(**f) for f in file_descriptors],
    )


# ---------------------------------------------------------------------------
# GET /api/download/{session_id}/{filename}
# ---------------------------------------------------------------------------

@app.get("/api/download/{session_id}/{filename}", tags=["Export"])
async def download_file(session_id: str, filename: str):
    """Serve an exported file from the session directory."""
    file_path = _SESSIONS_DIR / session_id / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found.")
    # Basic path traversal guard
    try:
        file_path.resolve().relative_to(_SESSIONS_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied.")
    return FileResponse(path=str(file_path), filename=filename)


# ---------------------------------------------------------------------------
# POST /api/upload-image
# ---------------------------------------------------------------------------

@app.post("/api/upload-image", response_model=UploadResponse, tags=["Imagery"])
async def upload_image(
    file: UploadFile = File(..., description="Satellite image file: GeoTIFF, PNG, JPEG"),
):
    """
    Upload a local satellite image for analysis.

    Supported formats: .tif, .tiff, .png, .jpg, .jpeg, .jp2

    For GeoTIFF files with embedded CRS:
      - Extracts bounding box (WGS-84) and 4-corner coordinates for Mapbox image overlay
      - Returns has_georef=True and map_corners for the frontend to display on the map

    For plain PNG/JPEG:
      - Generates a preview thumbnail
      - Returns has_georef=False (no map overlay, shown in the sidebar instead)

    The returned image_id can be passed as an entry in image_refs when calling /api/query.
    """
    session_id = str(uuid.uuid4())

    try:
        file_bytes = await file.read()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read uploaded file: {exc}")

    try:
        descriptor = image_upload_service.process_upload(
            file_bytes=file_bytes,
            original_filename=file.filename or "upload",
            session_id=session_id,
        )
    except image_upload_service.UploadError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.exception("Unexpected error processing image upload.")
        raise HTTPException(status_code=500, detail=f"Upload processing error: {exc}")

    warnings: list[str] = []
    if not descriptor["has_georef"] and file.filename and file.filename.lower().endswith((".tif", ".tiff")):
        warnings.append(
            "This GeoTIFF does not contain recognisable CRS/georeferencing information. "
            "The image cannot be overlaid on the map, but can still be used for analysis."
        )
    elif not descriptor["has_georef"]:
        warnings.append(
            "No georeferencing found — image will be shown as a preview only, not on the map. "
            "Upload a GeoTIFF with embedded CRS to enable map overlay."
        )

    # Save session manifest so the image ref is queryable
    _save_session_manifest(session_id, {
        "source": "upload",
        "original_filename": file.filename,
        "image_id": descriptor["image_id"],
        "local_path": descriptor["local_path"],
        "has_georef": descriptor["has_georef"],
        "geo_bounds": descriptor["geo_bounds"],
    })

    return UploadResponse(
        image_id=descriptor["image_id"],
        session_id=session_id,
        filename=descriptor["filename"],
        modality=descriptor["modality"],
        preview_url=descriptor["preview_url"],
        local_path=descriptor["local_path"],
        has_georef=descriptor["has_georef"],
        geo_bounds=descriptor["geo_bounds"],
        map_corners=descriptor["map_corners"],
        warnings=warnings,
    )


# ---------------------------------------------------------------------------
# Session helpers
# ---------------------------------------------------------------------------

def _session_manifest_path(session_id: str) -> Path:
    return _SESSIONS_DIR / session_id / "session.json"


def _save_session_manifest(session_id: str, data: Dict[str, Any]) -> None:
    path = _session_manifest_path(session_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)


def _load_session_manifest(session_id: str) -> Optional[Dict[str, Any]]:
    path = _session_manifest_path(session_id)
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)
