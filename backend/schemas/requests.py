"""
Pydantic request models for the SatQuery AI API.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Shared sub-models
# ---------------------------------------------------------------------------

class GeoJSONGeometry(BaseModel):
    """Minimal GeoJSON geometry (Polygon or MultiPolygon)."""
    type: str
    coordinates: Any

    @field_validator("type")
    @classmethod
    def must_be_polygon(cls, v: str) -> str:
        if v not in {"Polygon", "MultiPolygon", "Feature"}:
            raise ValueError("roi_geojson must be a Polygon, MultiPolygon, or Feature geometry")
        return v


# ---------------------------------------------------------------------------
# POST /api/roi/fetch-imagery
# ---------------------------------------------------------------------------

class FetchImageryRequest(BaseModel):
    roi_geojson: Dict[str, Any] = Field(
        ...,
        description="GeoJSON geometry (Polygon/MultiPolygon) or Feature describing the ROI",
    )
    date_start: str = Field(
        ...,
        pattern=r"^\d{4}-\d{2}-\d{2}$",
        description="Start date in YYYY-MM-DD format",
    )
    date_end: Optional[str] = Field(
        None,
        pattern=r"^\d{4}-\d{2}-\d{2}$",
        description="End date in YYYY-MM-DD format (defaults to date_start + 90 days)",
    )
    modality: str = Field(
        "optical",
        description="Imagery modality: 'optical', 'sar', or 'both'",
    )

    @field_validator("modality")
    @classmethod
    def valid_modality(cls, v: str) -> str:
        if v not in {"optical", "sar", "both"}:
            raise ValueError("modality must be one of: optical, sar, both")
        return v


# ---------------------------------------------------------------------------
# POST /api/query
# ---------------------------------------------------------------------------

class QueryRequest(BaseModel):
    roi_geojson: Dict[str, Any] = Field(
        ...,
        description="GeoJSON geometry or Feature describing the ROI",
    )
    query: str = Field(
        ...,
        min_length=3,
        max_length=2000,
        description="Natural-language question or instruction",
    )
    image_refs: List[str] = Field(
        default_factory=list,
        description="List of image IDs / paths returned by /api/roi/fetch-imagery",
    )
    modality: str = Field(
        "optical",
        description="Imagery modality: 'optical', 'sar', or 'both'",
    )
    date_start: str = Field(
        ...,
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    )
    date_end: Optional[str] = Field(
        None,
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    )
    # Optional second date for change-analysis queries
    date_start_2: Optional[str] = Field(
        None,
        pattern=r"^\d{4}-\d{2}-\d{2}$",
        description="Second (more-recent) epoch start date for bi-temporal analysis",
    )
    date_end_2: Optional[str] = Field(
        None,
        pattern=r"^\d{4}-\d{2}-\d{2}$",
    )

    @field_validator("modality")
    @classmethod
    def valid_modality(cls, v: str) -> str:
        if v not in {"optical", "sar", "both"}:
            raise ValueError("modality must be one of: optical, sar, both")
        return v


# ---------------------------------------------------------------------------
# POST /api/export
# ---------------------------------------------------------------------------

VALID_FORMATS = {"pdf", "geotiff", "geojson", "log", "zip"}


class ExportRequest(BaseModel):
    session_id: str = Field(
        ...,
        description="Session ID returned by /api/query",
    )
    formats: List[str] = Field(
        default_factory=lambda: ["zip"],
        description="List of export formats: pdf, geotiff, geojson, log, zip",
    )

    @field_validator("formats")
    @classmethod
    def valid_formats(cls, v: List[str]) -> List[str]:
        bad = set(v) - VALID_FORMATS
        if bad:
            raise ValueError(f"Unknown format(s): {bad}. Valid: {VALID_FORMATS}")
        return v
