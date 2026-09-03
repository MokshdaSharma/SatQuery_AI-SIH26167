"""
Pydantic response models for the SatQuery AI API.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# POST /api/roi/fetch-imagery
# ---------------------------------------------------------------------------

class ImageryItem(BaseModel):
    image_id: str
    modality: str  # "optical" | "sar"
    date_acquired: str
    preview_url: Optional[str] = None   # URL to a PNG thumbnail
    local_path: Optional[str] = None    # server-side GeoTIFF path
    cloud_cover: Optional[float] = None


class ImageryResponse(BaseModel):
    session_id: str
    roi_geojson: Dict[str, Any]
    images: List[ImageryItem]
    warnings: List[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# POST /api/query
# ---------------------------------------------------------------------------

class ExecutionStep(BaseModel):
    step: str
    detail: Any


class QueryResponse(BaseModel):
    session_id: str
    task_type: str          # vqa | caption | grounding | change_vqa | fusion
    answer: str
    confidence: float       # 0.0 – 1.0
    evidence_geojson: Optional[Dict[str, Any]] = None   # GeoJSON FeatureCollection
    segmentation_mask_url: Optional[str] = None          # URL to PNG mask overlay
    change_types: Optional[List[str]] = None             # detected change categories
    execution_trace: List[ExecutionStep] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# GET /api/layers/{layer_name}
# ---------------------------------------------------------------------------

class LayerResponse(BaseModel):
    layer_name: str
    geojson: Optional[Dict[str, Any]] = None    # for vector layers (roads, buildings)
    tile_url: Optional[str] = None               # for raster tile layers
    legend: Optional[Dict[str, Any]] = None      # optional colormap / class legend


# ---------------------------------------------------------------------------
# POST /api/export
# ---------------------------------------------------------------------------

class ExportFile(BaseModel):
    format: str
    filename: str
    download_url: str


class ExportResponse(BaseModel):
    session_id: str
    files: List[ExportFile]


# ---------------------------------------------------------------------------
# POST /api/upload-image
# ---------------------------------------------------------------------------

class UploadResponse(BaseModel):
    image_id: str
    session_id: str
    filename: str
    modality: str                           # "uploaded_optical" | "uploaded_sar" | "uploaded"
    preview_url: Optional[str] = None       # /api/download/{session_id}/preview_{image_id}.png
    local_path: Optional[str] = None
    has_georef: bool = False
    geo_bounds: Optional[List[float]] = None    # [west, south, east, north] WGS-84
    map_corners: Optional[List[List[float]]] = None  # [[NW],[NE],[SE],[SW]] lon/lat for Mapbox
    warnings: List[str] = Field(default_factory=list)
