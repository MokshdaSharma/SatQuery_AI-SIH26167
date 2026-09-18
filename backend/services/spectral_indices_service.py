"""
Spectral & SAR Indices Service — provides explainable, deterministic remote-sensing
metric calculations (NDVI, NDWI, NDBI, and SAR VV/VH ratios) for single and bi-temporal scenes.

Used by the specialist models and change segmentation pipeline to provide quantitative,
auditable statistics alongside deep learning predictions.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


def compute_ndvi(nir: np.ndarray, red: np.ndarray) -> np.ndarray:
    """Normalized Difference Vegetation Index: (NIR - Red) / (NIR + Red)"""
    nir = nir.astype(np.float32)
    red = red.astype(np.float32)
    denom = nir + red
    with np.errstate(divide="ignore", invalid="ignore"):
        ndvi = np.where(denom != 0, (nir - red) / denom, 0.0)
    return np.clip(ndvi, -1.0, 1.0)


def compute_ndwi(green: np.ndarray, nir: np.ndarray) -> np.ndarray:
    """Normalized Difference Water Index (McFeeters): (Green - NIR) / (Green + NIR)"""
    green = green.astype(np.float32)
    nir = nir.astype(np.float32)
    denom = green + nir
    with np.errstate(divide="ignore", invalid="ignore"):
        ndwi = np.where(denom != 0, (green - nir) / denom, 0.0)
    return np.clip(ndwi, -1.0, 1.0)


def compute_ndbi(swir: np.ndarray, nir: np.ndarray) -> np.ndarray:
    """Normalized Difference Built-up Index: (SWIR - NIR) / (SWIR + NIR)"""
    swir = swir.astype(np.float32)
    nir = nir.astype(np.float32)
    denom = swir + nir
    with np.errstate(divide="ignore", invalid="ignore"):
        ndbi = np.where(denom != 0, (swir - nir) / denom, 0.0)
    return np.clip(ndbi, -1.0, 1.0)


def compute_sar_ratio(vv_db: np.ndarray, vh_db: np.ndarray) -> np.ndarray:
    """SAR Polarization Ratio in dB: VV - VH (indicates dominance of surface vs volume scattering)"""
    return vv_db.astype(np.float32) - vh_db.astype(np.float32)


def analyze_bitemporal_changes(
    before_rgb: np.ndarray,
    after_rgb: np.ndarray,
    threshold: float = 0.18,
) -> Dict[str, Any]:
    """
    Compute explainable pixel-level change metrics from before and after image arrays.
    
    Returns structured change classes, percentage areas, and descriptive statistics.
    """
    b_arr = before_rgb.astype(np.float32) / 255.0 if before_rgb.max() > 1.0 else before_rgb.astype(np.float32)
    a_arr = after_rgb.astype(np.float32) / 255.0 if after_rgb.max() > 1.0 else after_rgb.astype(np.float32)

    # Approximate spectral bands from RGB (standard visible green/red proxies)
    # Green index: (G - R) / (G + R)
    b_green = (b_arr[..., 1] - b_arr[..., 0]) / (b_arr[..., 1] + b_arr[..., 0] + 1e-6)
    a_green = (a_arr[..., 1] - a_arr[..., 0]) / (a_arr[..., 1] + a_arr[..., 0] + 1e-6)
    delta_green = a_green - b_green

    # Brightness / Built-up proxy: average intensity
    b_lum = b_arr.mean(axis=-1)
    a_lum = a_arr.mean(axis=-1)
    delta_lum = a_lum - b_lum

    # Absolute difference
    diff_mag = np.linalg.norm(a_arr - b_arr, axis=-1)
    is_changed = diff_mag > threshold

    total_px = is_changed.size
    veg_growth_mask = (delta_green > 0.12) & is_changed
    deforest_mask = (delta_green < -0.12) & is_changed
    construction_mask = (delta_lum > 0.15) & is_changed & ~veg_growth_mask
    demolition_mask = (delta_lum < -0.15) & is_changed & ~deforest_mask

    stats = {
        "vegetation_growth": {
            "percent": round(float(veg_growth_mask.sum()) / total_px * 100, 2),
            "pixels": int(veg_growth_mask.sum()),
        },
        "deforestation": {
            "percent": round(float(deforest_mask.sum()) / total_px * 100, 2),
            "pixels": int(deforest_mask.sum()),
        },
        "new_construction": {
            "percent": round(float(construction_mask.sum()) / total_px * 100, 2),
            "pixels": int(construction_mask.sum()),
        },
        "demolition": {
            "percent": round(float(demolition_mask.sum()) / total_px * 100, 2),
            "pixels": int(demolition_mask.sum()),
        },
        "total_change_percent": round(float(is_changed.sum()) / total_px * 100, 2),
    }

    # Filter detected change types above minimum 0.5% threshold
    active_types = [k for k, v in stats.items() if k != "total_change_percent" and v["percent"] >= 0.5]

    return {
        "stats": stats,
        "active_change_types": active_types,
        "mean_diff_magnitude": round(float(diff_mag.mean()), 4),
    }
