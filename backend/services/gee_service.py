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
    _GEE_AVAILABLE = True
    try:
        import geemap
    except ImportError:
        geemap = None
except ImportError:
    logger.warning("earthengine-api not installed — GEE service in MOCK mode.")
    _GEE_AVAILABLE = False

from dotenv import load_dotenv

# Load environment variables from backend/.env if not already set
_env_file = Path(__file__).resolve().parent.parent / ".env"
if _env_file.exists():
    load_dotenv(_env_file)
else:
    load_dotenv()

# ── Settings ─────────────────────────────────────────────────────────────────
_GEE_SERVICE_ACCOUNT  = os.getenv("GEE_SERVICE_ACCOUNT_EMAIL", "")
_GEE_KEY_PATH         = os.getenv("GEE_SERVICE_ACCOUNT_KEY_PATH", "")
_GEE_KEY_JSON         = os.getenv("GEE_SERVICE_ACCOUNT_KEY_JSON", "")
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

    # Option 1: Direct JSON string in environment variable (best for cloud platforms like Render)
    if _GEE_KEY_JSON:
        try:
            creds = ee.ServiceAccountCredentials(_GEE_SERVICE_ACCOUNT or None, key_data=_GEE_KEY_JSON)
            ee.Initialize(creds, project=_GEE_PROJECT or None)
            _gee_initialised = True
            logger.info("Google Earth Engine initialised via GEE_SERVICE_ACCOUNT_KEY_JSON (project=%s).", _GEE_PROJECT)
            return True
        except Exception as exc:
            logger.warning("GEE initialisation via GEE_SERVICE_ACCOUNT_KEY_JSON failed: %s. Falling back to MOCK mode.", exc)
            return False

    # Option 2: JSON key file on disk
    if _GEE_SERVICE_ACCOUNT and _GEE_KEY_PATH:
        try:
            # Resolve key path if relative
            key_path = Path(_GEE_KEY_PATH)
            if not key_path.is_absolute():
                if not key_path.exists():
                    candidate = Path(__file__).resolve().parent.parent / key_path.name
                    if candidate.exists():
                        key_path = candidate
            if key_path.exists():
                creds = ee.ServiceAccountCredentials(_GEE_SERVICE_ACCOUNT, str(key_path))
                ee.Initialize(creds, project=_GEE_PROJECT or None)
                _gee_initialised = True
                logger.info("Google Earth Engine initialised (project=%s).", _GEE_PROJECT)
                return True
            else:
                logger.warning("GEE key file '%s' not found. Falling back to MOCK mode.", key_path)
                return False
        except Exception as exc:
            logger.warning("GEE initialisation failed: %s. Falling back to MOCK mode.", exc)
            return False

    logger.info(
        "GEE credentials not provided. Running in MOCK mode (synthetic Sentinel tiles for testing)."
    )
    return False


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

class GEEError(RuntimeError):
    """Raised when a GEE operation fails; message is safe to surface to the user."""


from datetime import datetime, timedelta

def fetch_imagery(
    roi_geojson: Dict[str, Any],
    date_start: Optional[str] = None,
    date_end: Optional[str] = None,
    modality: str = "optical",
    session_id: Optional[str] = None,
    max_cloud_pct: float = 20.0,
) -> List[Dict[str, Any]]:
    """
    Fetch imagery for the ROI and return a list of image descriptor dicts.
    Always retrieves the latest available satellite acquisitions when no date is specified.

    Each dict contains:
      { image_id, modality, date_acquired, preview_url, local_path, cloud_cover }

    Raises GEEError on unrecoverable failures (quota, no imagery, bad geometry).
    Returns mock data when GEE is unavailable.
    """
    session_id = session_id or f"sess_{uuid.uuid4().hex[:8]}"

    # Default to latest recent observation if dates not provided
    if not date_end or date_end.strip() == "":
        date_end = datetime.utcnow().strftime("%Y-%m-%d")
    if not date_start or date_start.strip() == "":
        # Look back 90 days from date_end to find the most recent cloud-free pass
        try:
            end_dt = datetime.strptime(date_end, "%Y-%m-%d")
            date_start = (end_dt - timedelta(days=90)).strftime("%Y-%m-%d")
        except Exception:
            date_start = (datetime.utcnow() - timedelta(days=90)).strftime("%Y-%m-%d")

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
            .sort("system:time_start", False)  # Ensure latest acquisition is first
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

    # Use the latest acquisition in the window
    first_image = collection.first()
    acquired_date = date_start
    cloud_cover = None
    try:
        time_ms = first_image.get("system:time_start").getInfo()
        if time_ms:
            acquired_date = datetime.utcfromtimestamp(time_ms / 1000).strftime("%Y-%m-%d")
        cloud_cover = first_image.get("CLOUDY_PIXEL_PERCENTAGE").getInfo()
    except Exception:
        pass

    image = first_image.clip(roi).select(["B4", "B3", "B2"])  # RGB

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
            "date_acquired": acquired_date,
            "preview_url": preview_url,
            "local_path": tiff_path,
            "cloud_cover": cloud_cover,
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
            .sort("system:time_start", False)  # Ensure latest acquisition is first
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
