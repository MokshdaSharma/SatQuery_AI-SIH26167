"""
Image Upload Service — handles user-uploaded satellite images.

Supported formats:  GeoTIFF (.tif/.tiff), GeoTIFF + world file,
                    PNG, JPEG, JPEG2000

For GeoTIFF files with embedded CRS/georeferencing:
  - Extracts bounding box (EPSG:4326) for map overlay
  - Reprojects corners to WGS-84 for Mapbox image source
  - Generates a web-viewable PNG preview

For plain PNG/JPEG images without georeferencing:
  - Generates a preview only; no map overlay coords

Returns a descriptor dict compatible with the imagery pipeline.
"""
from __future__ import annotations

import logging
import os
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from PIL import Image as PILImage

logger = logging.getLogger(__name__)

_SESSIONS_DIR = Path(os.getenv("SESSIONS_DIR", "./sessions"))

# Try rasterio for GeoTIFF handling
try:
    import rasterio
    from rasterio.warp import transform_bounds
    from rasterio.enums import Resampling
    import numpy as np
    _RASTERIO_AVAILABLE = True
except ImportError:
    logger.warning("rasterio not available — GeoTIFF georeferencing extraction disabled.")
    _RASTERIO_AVAILABLE = False

ALLOWED_EXTENSIONS = {".tif", ".tiff", ".png", ".jpg", ".jpeg", ".jp2"}
MAX_FILE_SIZE_MB = 200


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

class UploadError(ValueError):
    """Raised on invalid file uploads; message is safe to surface to users."""


def process_upload(
    file_bytes: bytes,
    original_filename: str,
    session_id: str,
) -> Dict[str, Any]:
    """
    Save the uploaded file, extract georeferencing (if any), generate preview PNG.

    Args:
        file_bytes:        Raw bytes of the uploaded file.
        original_filename: Original file name from the upload (used for extension check).
        session_id:        Session ID to store the file under.

    Returns:
        {
            "image_id":     str,
            "filename":     str,        # saved filename on server
            "modality":     str,        # "uploaded_optical" | "uploaded_sar" | "uploaded"
            "date_acquired": "unknown",
            "preview_url":  str | None, # /api/download/{session_id}/preview_{image_id}.png
            "local_path":   str,        # absolute path to saved original
            "cloud_cover":  None,
            # Georeferencing (None if not available)
            "geo_bounds":   list | None,  # [west, south, east, north] WGS-84
            "map_corners":  list | None,  # [[NW], [NE], [SE], [SW]] lon/lat for Mapbox
            "has_georef":   bool,
        }

    Raises:
        UploadError on bad extension, file too large, or corrupted data.
    """
    suffix = Path(original_filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise UploadError(
            f"Unsupported file type '{suffix}'. "
            f"Accepted: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise UploadError(
            f"File too large ({size_mb:.1f} MB). Maximum allowed size is {MAX_FILE_SIZE_MB} MB."
        )

    image_id = str(uuid.uuid4())
    session_dir = _SESSIONS_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    saved_name = f"upload_{image_id}{suffix}"
    saved_path = session_dir / saved_name
    with open(saved_path, "wb") as f:
        f.write(file_bytes)

    logger.info("[ImageUpload] Saved %s (%.1f MB) → %s", original_filename, size_mb, saved_path)

    # ── Try georeferenced extraction (GeoTIFF) ─────────────────────────────
    geo_bounds: Optional[List[float]] = None
    map_corners: Optional[List[List[float]]] = None
    has_georef = False
    preview_path: Optional[Path] = None
    width: Optional[int] = None
    height: Optional[int] = None
    bands: Optional[int] = 3

    if suffix in {".tif", ".tiff"} and _RASTERIO_AVAILABLE:
        geo_bounds, map_corners, has_georef, preview_path, width, height, bands = _extract_geotiff(
            saved_path, session_dir, image_id
        )

    # ── Generate preview for non-GeoTIFF or if rasterio preview failed ────
    if preview_path is None or width is None:
        p_path, p_w, p_h, p_b = _generate_preview(saved_path, session_dir, image_id)
        if preview_path is None:
            preview_path = p_path
        if width is None:
            width = p_w
            height = p_h
            bands = p_b

    preview_url = (
        f"/api/download/{session_id}/preview_{image_id}.png"
        if preview_path and preview_path.exists()
        else None
    )

    # Guess modality from filename
    name_lower = original_filename.lower()
    if any(kw in name_lower for kw in ["s1", "sar", "sentinel1", "grd", "vv", "vh"]):
        modality = "uploaded_sar"
    elif any(kw in name_lower for kw in ["s2", "sentinel2", "optical", "rgb", "ms"]):
        modality = "uploaded_optical"
    else:
        modality = "uploaded"

    return {
        "image_id":     image_id,
        "filename":     saved_name,
        "modality":     modality,
        "date_acquired": "unknown",
        "preview_url":  preview_url,
        "local_path":   str(saved_path),
        "cloud_cover":  None,
        "geo_bounds":   geo_bounds,
        "map_corners":  map_corners,
        "has_georef":   has_georef,
        "width":        width or 1024,
        "height":       height or 1024,
        "bands":        bands or 3,
        "file_size_bytes": len(file_bytes),
    }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _extract_geotiff(
    tiff_path: Path,
    session_dir: Path,
    image_id: str,
) -> Tuple[Optional[List[float]], Optional[List[List[float]]], bool, Optional[Path], Optional[int], Optional[int], Optional[int]]:
    """
    Extract geo bounds + generate RGB preview PNG from a GeoTIFF.

    Returns:
        (geo_bounds, map_corners, has_georef, preview_path, width, height, bands)
    """
    geo_bounds = None
    map_corners = None
    has_georef = False
    preview_path = None
    width = None
    height = None
    bands = None

    try:
        with rasterio.open(tiff_path) as src:
            width = src.width
            height = src.height
            bands = src.count
            crs = src.crs
            bounds = src.bounds  # in src CRS

            if crs is not None:
                # Reproject bounds to WGS-84
                wgs_bounds = transform_bounds(crs, "EPSG:4326", *bounds)
                west, south, east, north = wgs_bounds
                geo_bounds = [west, south, east, north]
                has_georef = True

                # Mapbox image source expects corners: [NW, NE, SE, SW] as [lon, lat]
                map_corners = [
                    [west, north],   # NW
                    [east, north],   # NE
                    [east, south],   # SE
                    [west, south],   # SW
                ]

                logger.info(
                    "[ImageUpload] GeoTIFF bounds (WGS-84): W=%.4f S=%.4f E=%.4f N=%.4f (%dx%d, %d bands)",
                    west, south, east, north, width, height, bands
                )

            # ── Generate preview PNG ───────────────────────────────────────────
            preview_path = session_dir / f"preview_{image_id}.png"
            _geotiff_to_preview_png(src, preview_path)

    except Exception as exc:
        logger.warning("[ImageUpload] GeoTIFF processing failed (non-fatal): %s", exc)

    return geo_bounds, map_corners, has_georef, preview_path, width, height, bands


from PIL import Image as PILImage, ImageFile
ImageFile.LOAD_TRUNCATED_IMAGES = True


def _geotiff_to_preview_png(src, out_path: Path, max_dim: int = 1024) -> None:
    """Read a GeoTIFF and save a normalised RGB PNG preview."""
    import numpy as np

    n_bands = src.count

    # Choose RGB bands — try common band orderings
    if n_bands >= 3:
        band_idxs = [1, 2, 3]   # R, G, B (1-indexed)
    else:
        band_idxs = [1, 1, 1]   # grayscale → RGB

    scale = min(1.0, max_dim / max(src.width, src.height))
    out_w = max(1, int(src.width * scale))
    out_h = max(1, int(src.height * scale))

    rgb = []
    for bi in band_idxs:
        try:
            band = src.read(
                bi,
                out_shape=(1, out_h, out_w),
                resampling=Resampling.lanczos,
            )[0].astype(np.float32)
        except Exception:
            try:
                raw = src.read(bi).astype(np.float32)
                if raw.shape != (out_h, out_w):
                    # Resize via PIL
                    p_img = PILImage.fromarray(raw)
                    p_img = p_img.resize((out_w, out_h), PILImage.BILINEAR)
                    band = np.array(p_img, dtype=np.float32)
                else:
                    band = raw
            except Exception:
                band = np.zeros((out_h, out_w), dtype=np.float32)

        # Percentile stretch
        valid = band[~np.isnan(band)]
        if len(valid) > 0:
            p2, p98 = np.percentile(valid, [2, 98])
            if p98 > p2:
                band = np.clip((band - p2) / (p98 - p2), 0, 1)
            else:
                band = np.clip(band / (np.max(band) or 1.0), 0, 1)
        else:
            band = np.zeros_like(band)
        rgb.append((band * 255).astype(np.uint8))

    arr = np.stack(rgb, axis=-1)
    PILImage.fromarray(arr, "RGB").save(str(out_path), "PNG")
    logger.info("[ImageUpload] Preview written → %s", out_path)


def _generate_preview(src_path: Path, session_dir: Path, image_id: str) -> Tuple[Optional[Path], Optional[int], Optional[int], Optional[int]]:
    """Generate a preview PNG for non-GeoTIFF images using Pillow."""
    out_path = session_dir / f"preview_{image_id}.png"
    try:
        with PILImage.open(src_path) as img:
            w, h = img.width, img.height
            bands = len(img.getbands())
            preview_img = img.copy()
            preview_img.thumbnail((1024, 1024), PILImage.LANCZOS)
            preview_img.convert("RGB").save(str(out_path), "PNG")
        logger.info("[ImageUpload] Pillow preview → %s (%dx%d, %d bands)", out_path, w, h, bands)
        return out_path, w, h, bands
    except Exception as exc:
        logger.warning("[ImageUpload] Preview generation failed: %s", exc)
        return None, None, None, None
