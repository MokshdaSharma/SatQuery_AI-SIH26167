"""
GEE Service — fetches Sentinel-1 (SAR) and Sentinel-2 (optical) imagery
for an ROI + date range, clips, and optionally exports to GeoTIFF.

All GEE calls are wrapped in try/except to surface clear user-facing errors
instead of raw stack traces (quota exceeded, invalid geometry, no imagery, etc.)

Authentication
──────────────
Set GEE_SERVICE_ACCOUNT_KEY_PATH and GEE_SERVICE_ACCOUNT_EMAIL in .env.
If the env vars are absent the module initialises in MOCK mode and returns
synthetic placeholder data — useful for frontend development without a GEE key.
"""
from __future__ import annotations

import io
import logging
import os
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# ── Try to import earthengine-api ────────────────────────────────────────────
try:
    import ee
    import geemap
    _GEE_AVAILABLE = True
except ImportError:
    logger.warning("earthengine-api / geemap not installed — GEE service in MOCK mode.")
    _GEE_AVAILABLE = False

# ── Settings ─────────────────────────────────────────────────────────────────
_GEE_SERVICE_ACCOUNT  = os.getenv("GEE_SERVICE_ACCOUNT_EMAIL", "")
_GEE_KEY_PATH         = os.getenv("GEE_SERVICE_ACCOUNT_KEY_PATH", "")
_GEE_PROJECT          = os.getenv("GEE_PROJECT_ID", "")
_SESSIONS_DIR         = Path(os.getenv("SESSIONS_DIR", "./sessions"))

_gee_initialised = False


# ---------------------------------------------------------------------------
# Initialisation
# ---------------------------------------------------------------------------

def _init_gee() -> bool:
    """Initialise GEE once.  Returns True on success."""
    global _gee_initialised
    if _gee_initialised:
        return True
    if not _GEE_AVAILABLE:
        return False
    if not _GEE_SERVICE_ACCOUNT or not _GEE_KEY_PATH:
        logger.warning(
            "GEE_SERVICE_ACCOUNT_EMAIL or GEE_SERVICE_ACCOUNT_KEY_PATH not set. "
            "Running in MOCK mode."
        )
        return False
    try:
        creds = ee.ServiceAccountCredentials(_GEE_SERVICE_ACCOUNT, _GEE_KEY_PATH)
        ee.Initialize(creds, project=_GEE_PROJECT or None)
        _gee_initialised = True
        logger.info("Google Earth Engine initialised (project=%s).", _GEE_PROJECT)
        return True
    except Exception as exc:
        logger.error("GEE initialisation failed: %s", exc)
        return False


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

class GEEError(RuntimeError):
    """Raised when a GEE operation fails; message is safe to surface to the user."""


def fetch_imagery(
    roi_geojson: Dict[str, Any],
    date_start: str,
    date_end: str,
    modality: str,
    session_id: str,
    max_cloud_pct: float = 20.0,
) -> List[Dict[str, Any]]:
    """
    Fetch imagery for the ROI and return a list of image descriptor dicts.

    Each dict contains:
      { image_id, modality, date_acquired, preview_url, local_path, cloud_cover }

    Raises GEEError on unrecoverable failures (quota, no imagery, bad geometry).
    Returns mock data when GEE is unavailable.
    """
    gee_ok = _init_gee()
    if not gee_ok:
        return _mock_imagery(modality, date_start, session_id)

    results: List[Dict[str, Any]] = []

    try:
        geometry = _parse_roi(roi_geojson)
    except Exception as exc:
        raise GEEError(f"Invalid ROI geometry: {exc}") from exc

    if modality in ("optical", "both"):
        try:
            imgs = _fetch_sentinel2(geometry, date_start, date_end, max_cloud_pct, session_id)
            results.extend(imgs)
        except GEEError:
            raise
        except Exception as exc:
            raise GEEError(f"Sentinel-2 fetch failed: {exc}") from exc

    if modality in ("sar", "both"):
        try:
            imgs = _fetch_sentinel1(geometry, date_start, date_end, session_id)
            results.extend(imgs)
        except GEEError:
            raise
        except Exception as exc:
            raise GEEError(f"Sentinel-1 fetch failed: {exc}") from exc

    if not results:
        raise GEEError(
            f"No imagery found for the selected ROI between {date_start} and {date_end}. "
            "Try expanding the date range or choosing a different area."
        )

    return results


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _parse_roi(roi_geojson: Dict[str, Any]):
    """Convert GeoJSON dict to an ee.Geometry."""
    geo_type = roi_geojson.get("type", "")
    if geo_type == "Feature":
        geom = roi_geojson["geometry"]
    else:
        geom = roi_geojson
    return ee.Geometry(geom)


def _fetch_sentinel2(
    roi,
    date_start: str,
    date_end: str,
    max_cloud_pct: float,
    session_id: str,
) -> List[Dict[str, Any]]:
    """Fetch Sentinel-2 SR harmonised mosaic, export thumbnail + GeoTIFF."""
    try:
        collection = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterBounds(roi)
            .filterDate(date_start, date_end)
            .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", max_cloud_pct))
        )
        size = collection.size().getInfo()
    except Exception as exc:
        if "quota" in str(exc).lower() or "rate" in str(exc).lower():
            raise GEEError(
                "Google Earth Engine quota exceeded. Please wait a few minutes and try again."
            ) from exc
        raise GEEError(str(exc)) from exc

    if size == 0:
        raise GEEError(
            f"No Sentinel-2 imagery with cloud cover < {max_cloud_pct}% found "
            f"between {date_start} and {date_end} for this ROI. "
            "Try relaxing the cloud cover threshold or widening the date range."
        )

    image = collection.median().clip(roi).select(["B4", "B3", "B2"])  # RGB

    # Export thumbnail
    session_dir = _SESSIONS_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    image_id = f"s2_{session_id}"
    tiff_path = str(session_dir / f"{image_id}.tif")

    try:
        geemap.ee_export_image(
            image,
            filename=tiff_path,
            scale=10,
            region=roi,
            file_per_band=False,
        )
    except Exception as exc:
        logger.warning("GeoTIFF export failed (non-fatal): %s", exc)
        tiff_path = None

    # Thumbnail URL via getThumbURL
    try:
        preview_url = image.getThumbURL(
            {"min": 0, "max": 3000, "bands": ["B4", "B3", "B2"], "dimensions": 512}
        )
    except Exception:
        preview_url = None

    return [
        {
            "image_id": image_id,
            "modality": "optical",
            "date_acquired": date_start,
            "preview_url": preview_url,
            "local_path": tiff_path,
            "cloud_cover": None,
        }
    ]


def _fetch_sentinel1(
    roi,
    date_start: str,
    date_end: str,
    session_id: str,
) -> List[Dict[str, Any]]:
    """Fetch Sentinel-1 GRD IW mosaic."""
    try:
        collection = (
            ee.ImageCollection("COPERNICUS/S1_GRD")
            .filterBounds(roi)
            .filterDate(date_start, date_end)
            .filter(ee.Filter.eq("instrumentMode", "IW"))
            .select(["VV", "VH"])
        )
        size = collection.size().getInfo()
    except Exception as exc:
        if "quota" in str(exc).lower():
            raise GEEError("Google Earth Engine quota exceeded. Please try again later.") from exc
        raise GEEError(str(exc)) from exc

    if size == 0:
        raise GEEError(
            f"No Sentinel-1 IW imagery found between {date_start} and {date_end} for this ROI."
        )

    image = collection.mosaic().clip(roi)

    session_dir = _SESSIONS_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    image_id = f"s1_{session_id}"
    tiff_path = str(session_dir / f"{image_id}.tif")

    try:
        geemap.ee_export_image(
            image,
            filename=tiff_path,
            scale=10,
            region=roi,
            file_per_band=False,
        )
    except Exception as exc:
        logger.warning("SAR GeoTIFF export failed (non-fatal): %s", exc)
        tiff_path = None

    try:
        preview_url = image.getThumbURL(
            {"min": -25, "max": 0, "bands": ["VV"], "dimensions": 512}
        )
    except Exception:
        preview_url = None

    return [
        {
            "image_id": image_id,
            "modality": "sar",
            "date_acquired": date_start,
            "preview_url": preview_url,
            "local_path": tiff_path,
            "cloud_cover": None,
        }
    ]


def _mock_imagery(modality: str, date_start: str, session_id: str) -> List[Dict[str, Any]]:
    """Return synthetic placeholder imagery descriptors when GEE is unavailable."""
    logger.info("[GEEService] MOCK MODE — returning placeholder imagery.")
    results = []
    if modality in ("optical", "both"):
        results.append(
            {
                "image_id": f"mock_s2_{session_id}",
                "modality": "optical",
                "date_acquired": date_start,
                "preview_url": None,
                "local_path": None,
                "cloud_cover": 5.0,
            }
        )
    if modality in ("sar", "both"):
        results.append(
            {
                "image_id": f"mock_s1_{session_id}",
                "modality": "sar",
                "date_acquired": date_start,
                "preview_url": None,
                "local_path": None,
                "cloud_cover": None,
            }
        )
    return results
