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
    roi_geojson: Optional[Dict[str, Any]] = Field(
        default=None,
        description="GeoJSON geometry or Feature describing the ROI",
    )
    query: str = Field(
        default="Describe land cover and key features in this satellite scene.",
        description="Natural-language question or instruction",
    )
    image_refs: List[str] = Field(
        default_factory=list,
        description="List of image IDs / paths returned by /api/roi/fetch-imagery or upload",
    )
    modality: str = Field(
        "optical",
        description="Imagery modality: 'optical', 'sar', or 'both'",
    )
    date_start: Optional[str] = Field(
        default=None,
        description="Start date in YYYY-MM-DD format (defaults to today if omitted)",
    )
    date_end: Optional[str] = Field(
        default=None,
        description="End date in YYYY-MM-DD format",
    )
    # Optional second date for change-analysis queries
    date_start_2: Optional[str] = Field(
        default=None,
        description="Second (more-recent) epoch start date for bi-temporal analysis",
    )
    date_end_2: Optional[str] = Field(
        default=None,
        description="Second epoch end date",
    )
    conversation_history: Optional[List[Dict[str, str]]] = Field(
        default=None,
        description="Optional list of prior chat turns: [{'query': str, 'answer': str}] for multi-turn context",
    )

    @field_validator("query", mode="before")
    @classmethod
    def clean_query(cls, v: Any) -> str:
        if not v or not isinstance(v, str) or not v.strip():
            return "Describe land cover and key features in this satellite scene."
        return str(v).strip()

    @field_validator("date_start", "date_end", "date_start_2", "date_end_2", mode="before")
    @classmethod
    def clean_empty_dates(cls, v: Any) -> Optional[str]:
        if not v or not isinstance(v, str) or not v.strip():
            return None
        return v.strip()

    @field_validator("image_refs", mode="before")
    @classmethod
    def clean_image_refs(cls, v: Any) -> List[str]:
        if not v:
            return []
        if isinstance(v, str):
            return [v] if v.strip() else []
        if isinstance(v, (list, tuple)):
            return [str(x) for x in v if x is not None and str(x).strip()]
        return []

    @field_validator("roi_geojson", mode="before")
    @classmethod
    def clean_roi_geojson(cls, v: Any) -> Optional[Dict[str, Any]]:
        if not v or not isinstance(v, dict):
            return None
        return v

    @field_validator("modality")
    @classmethod
    def valid_modality(cls, v: str) -> str:
        if not v or v not in {"optical", "sar", "both"}:
            return "optical"
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
