"""
Map Layers Service — fetches thematic overlay layers for display on the map.

Layers supported
────────────────
  water       — JRC Global Surface Water occurrence (GEE raster → tile URL)
  vegetation  — ESA WorldCover v200 vegetation classes (GEE raster → tile URL)
  buildings   — Google Open Buildings v3 polygons (GEE → GeoJSON)
  roads       — OpenStreetMap highway ways via Overpass API (→ GeoJSON)

Returns GeoJSON for vector layers and a Mapbox-compatible tile URL for rasters.
All GEE calls fall back to MOCK data when credentials are not configured.
"""
from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional, Tuple

import requests as http_requests

logger = logging.getLogger(__name__)

try:
    import ee
    _GEE_AVAILABLE = True
except ImportError:
    _GEE_AVAILABLE = False

from .gee_service import _init_gee, GEEError, _parse_roi

_OVERPASS_URL = "https://overpass-api.de/api/interpreter"


# ---------------------------------------------------------------------------
# Public dispatcher
# ---------------------------------------------------------------------------

def fetch_layer(
    layer_name: str,
    roi_geojson: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Fetch a thematic layer for the given ROI.

    Args:
        layer_name: "water" | "vegetation" | "buildings" | "roads"
        roi_geojson: GeoJSON Polygon/Feature describing the clipping ROI.

    Returns:
        { "layer_name": ..., "geojson": ... | None, "tile_url": ... | None, "legend": ... | None }

    Raises:
        ValueError for unknown layer names.
        GEEError / RuntimeError for fetch failures.
    """
    layer_name = layer_name.lower()

    dispatch = {
        "water":      _fetch_water,
        "vegetation": _fetch_vegetation,
        "buildings":  _fetch_buildings,
        "roads":      _fetch_roads,
    }

    fn = dispatch.get(layer_name)
    if fn is None:
        raise ValueError(
            f"Unknown layer '{layer_name}'. Valid layers: {list(dispatch.keys())}"
        )

    return fn(roi_geojson)


# ---------------------------------------------------------------------------
# Individual layer fetchers
# ---------------------------------------------------------------------------

def _fetch_water(roi_geojson: Dict[str, Any]) -> Dict[str, Any]:
    """JRC Global Surface Water — occurrence band, clipped to ROI."""
    gee_ok = _init_gee()
    if not gee_ok or not _GEE_AVAILABLE:
        return _mock_layer("water", "raster")

    try:
        roi = _parse_roi(roi_geojson)
        water = (
            ee.Image("JRC/GSW1_4/GlobalSurfaceWater")
            .select("occurrence")
            .clip(roi)
        )
        tile_url = water.getMapId({"min": 0, "max": 100, "palette": ["white", "00aaff"]})["tile_fetcher"].url_format
    except Exception as exc:
        logger.error("[MapLayers] water layer failed: %s", exc)
        return _mock_layer("water", "raster")

    return {
        "layer_name": "water",
        "geojson": None,
        "tile_url": tile_url,
        "legend": {
            "type": "gradient",
            "label": "Surface water occurrence (%)",
            "min": 0, "max": 100,
            "colors": ["#ffffff", "#00aaff"],
        },
    }


def _fetch_vegetation(roi_geojson: Dict[str, Any]) -> Dict[str, Any]:
    """ESA WorldCover v200 — vegetation classes, clipped to ROI."""
    gee_ok = _init_gee()
    if not gee_ok or not _GEE_AVAILABLE:
        return _mock_layer("vegetation", "raster")

    try:
        roi = _parse_roi(roi_geojson)
        worldcover = (
            ee.ImageCollection("ESA/WorldCover/v200")
            .first()
            .clip(roi)
        )
        palette = [
            "006400",  # 10 Tree cover
            "ffbb22",  # 20 Shrubland
            "ffff4c",  # 30 Grassland
            "f096ff",  # 40 Cropland
            "fa0000",  # 50 Built-up
            "b4b4b4",  # 60 Bare/sparse veg
            "f0f0f0",  # 70 Snow/ice
            "0064c8",  # 80 Permanent water
            "0096a0",  # 90 Herbaceous wetland
            "00cf75",  # 95 Mangroves
            "fae6a0",  # 100 Moss/lichen
        ]
        tile_url = worldcover.getMapId({"min": 10, "max": 100, "palette": palette})["tile_fetcher"].url_format
    except Exception as exc:
        logger.error("[MapLayers] vegetation layer failed: %s", exc)
        return _mock_layer("vegetation", "raster")

    return {
        "layer_name": "vegetation",
        "geojson": None,
        "tile_url": tile_url,
        "legend": {
            "type": "categorical",
            "label": "ESA WorldCover 2021",
            "classes": [
                {"value": 10, "label": "Tree cover", "color": "#006400"},
                {"value": 20, "label": "Shrubland",  "color": "#ffbb22"},
                {"value": 30, "label": "Grassland",  "color": "#ffff4c"},
                {"value": 40, "label": "Cropland",   "color": "#f096ff"},
                {"value": 50, "label": "Built-up",   "color": "#fa0000"},
                {"value": 80, "label": "Water body",  "color": "#0064c8"},
            ],
        },
    }


def _fetch_buildings(roi_geojson: Dict[str, Any]) -> Dict[str, Any]:
    """Google Open Buildings v3 — polygon footprints clipped to ROI."""
    gee_ok = _init_gee()
    if not gee_ok or not _GEE_AVAILABLE:
        return _mock_layer("buildings", "vector")

    try:
        roi = _parse_roi(roi_geojson)
        buildings = (
            ee.FeatureCollection("GOOGLE/Research/open-buildings/v3/polygons")
            .filterBounds(roi)
            .limit(2000)   # cap to avoid huge payloads
        )
        geojson = buildings.getInfo()
    except Exception as exc:
        logger.error("[MapLayers] buildings layer failed: %s", exc)
        return _mock_layer("buildings", "vector")

    return {
        "layer_name": "buildings",
        "geojson": geojson,
        "tile_url": None,
        "legend": None,
    }


def _fetch_roads(roi_geojson: Dict[str, Any]) -> Dict[str, Any]:
    """OSM roads via Overpass API — highway ways clipped to the ROI bbox."""
    bbox = _geojson_to_bbox(roi_geojson)
    if bbox is None:
        return _mock_layer("roads", "vector")

    south, west, north, east = bbox
    query = f"""
[out:json][timeout:25];
(
  way["highway"]({south},{west},{north},{east});
);
out geom;
"""
    try:
        resp = http_requests.post(
            _OVERPASS_URL,
            data={"data": query},
            timeout=30,
        )
        resp.raise_for_status()
        osm_data = resp.json()
    except Exception as exc:
        logger.error("[MapLayers] OSM roads fetch failed: %s", exc)
        return _mock_layer("roads", "vector")

    geojson = _osm_to_geojson(osm_data)
    return {
        "layer_name": "roads",
        "geojson": geojson,
        "tile_url": None,
        "legend": None,
    }


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def _geojson_to_bbox(
    roi_geojson: Dict[str, Any],
) -> Optional[Tuple[float, float, float, float]]:
    """Return (south, west, north, east) from a GeoJSON geometry."""
    try:
        if roi_geojson.get("type") == "Feature":
            coords_outer = roi_geojson["geometry"]["coordinates"][0]
        else:
            coords_outer = roi_geojson["coordinates"][0]

        lons = [c[0] for c in coords_outer]
        lats = [c[1] for c in coords_outer]
        return (min(lats), min(lons), max(lats), max(lons))
    except Exception:
        return None


def _osm_to_geojson(osm_data: Dict) -> Dict[str, Any]:
    """Convert Overpass API JSON to GeoJSON FeatureCollection."""
    features = []
    for element in osm_data.get("elements", []):
        if element.get("type") != "way":
            continue
        geometry_coords = element.get("geometry", [])
        if len(geometry_coords) < 2:
            continue
        line_coords = [[pt["lon"], pt["lat"]] for pt in geometry_coords]
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": line_coords},
                "properties": {
                    "highway": element.get("tags", {}).get("highway", "unknown"),
                    "name": element.get("tags", {}).get("name", ""),
                    "osm_id": element.get("id"),
                },
            }
        )
    return {"type": "FeatureCollection", "features": features}


def _mock_layer(layer_name: str, layer_type: str) -> Dict[str, Any]:
    """Return a stub layer when GEE / OSM is unavailable."""
    logger.info("[MapLayers] MOCK layer for '%s'.", layer_name)
    return {
        "layer_name": layer_name,
        "geojson": {"type": "FeatureCollection", "features": []} if layer_type == "vector" else None,
        "tile_url": None,
        "legend": None,
    }
