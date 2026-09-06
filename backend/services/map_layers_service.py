"""
Map Layers Service — fetches thematic overlay layers for display on the map.

Layers supported
────────────────
  water       — OSM water bodies (natural=water, waterway=riverbank, etc.)
                via Overpass API → GeoJSON filled polygons. No GEE needed.
  vegetation  — OSM vegetation areas (natural=wood, landuse=forest, leisure=park, etc.)
                via Overpass API → GeoJSON filled polygons. No GEE needed.
  buildings   — Google Open Buildings v3 (GEE) with OSM Overpass fallback.
  roads       — OpenStreetMap highway ways via Overpass API → GeoJSON LineStrings.

All layers use Overpass as the primary source (zero credentials needed).
GEE is attempted for buildings only, with automatic OSM fallback on any error.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional, Tuple

import requests as http_requests

logger = logging.getLogger(__name__)

try:
    import ee
    _GEE_AVAILABLE = True
except ImportError:
    _GEE_AVAILABLE = False

from .gee_service import _init_gee, _parse_roi

_OVERPASS_URL    = "https://overpass-api.de/api/interpreter"
_OVERPASS_TIMEOUT = 30


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
        layer_name:  "water" | "vegetation" | "buildings" | "roads"
        roi_geojson: GeoJSON Polygon/Feature describing the clipping ROI.

    Returns:
        { layer_name, geojson, tile_url, legend }

    Raises:
        ValueError for unknown layer names.
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
# Water — OSM water bodies via Overpass → GeoJSON polygons
# ---------------------------------------------------------------------------

def _fetch_water(roi_geojson: Dict[str, Any]) -> Dict[str, Any]:
    """Fetch water bodies from OSM Overpass as filled GeoJSON polygons."""
    bbox = _geojson_to_bbox(roi_geojson)
    if bbox is None:
        return _mock_layer("water", "vector")

    south, west, north, east = bbox
    query = f"""
[out:json][timeout:{_OVERPASS_TIMEOUT}];
(
  way["natural"="water"]({south},{west},{north},{east});
  way["waterway"="riverbank"]({south},{west},{north},{east});
  way["landuse"="reservoir"]({south},{west},{north},{east});
  way["landuse"="basin"]({south},{west},{north},{east});
  way["natural"="wetland"]({south},{west},{north},{east});
  relation["natural"="water"]({south},{west},{north},{east});
);
out geom;
"""
    try:
        resp = http_requests.post(
            _OVERPASS_URL, data={"data": query}, timeout=_OVERPASS_TIMEOUT
        )
        resp.raise_for_status()
        geojson = _osm_to_geojson_polygons(resp.json())
        logger.info("[MapLayers] water: %d features", len(geojson["features"]))
    except Exception as exc:
        logger.error("[MapLayers] water Overpass failed: %s", exc)
        return _mock_layer("water", "vector")

    return {
        "layer_name": "water",
        "geojson":    geojson,
        "tile_url":   None,
        "legend": {
            "type":  "solid",
            "label": "Water bodies (OSM)",
            "color": "#38bdf8",
        },
    }


# ---------------------------------------------------------------------------
# Vegetation — OSM forest/park/heath polygons via Overpass → GeoJSON polygons
# ---------------------------------------------------------------------------

def _fetch_vegetation(roi_geojson: Dict[str, Any]) -> Dict[str, Any]:
    """Fetch vegetation areas from OSM Overpass as filled GeoJSON polygons."""
    bbox = _geojson_to_bbox(roi_geojson)
    if bbox is None:
        return _mock_layer("vegetation", "vector")

    south, west, north, east = bbox
    query = f"""
[out:json][timeout:{_OVERPASS_TIMEOUT}];
(
  way["natural"="wood"]({south},{west},{north},{east});
  way["landuse"="forest"]({south},{west},{north},{east});
  way["natural"="scrub"]({south},{west},{north},{east});
  way["natural"="heath"]({south},{west},{north},{east});
  way["landuse"="meadow"]({south},{west},{north},{east});
  way["leisure"="park"]({south},{west},{north},{east});
  way["landuse"="grass"]({south},{west},{north},{east});
  way["landuse"="orchard"]({south},{west},{north},{east});
  way["landuse"="vineyard"]({south},{west},{north},{east});
);
out geom;
"""
    try:
        resp = http_requests.post(
            _OVERPASS_URL, data={"data": query}, timeout=_OVERPASS_TIMEOUT
        )
        resp.raise_for_status()
        geojson = _osm_to_geojson_polygons(resp.json(), tag_key="landuse")
        logger.info("[MapLayers] vegetation: %d features", len(geojson["features"]))
    except Exception as exc:
        logger.error("[MapLayers] vegetation Overpass failed: %s", exc)
        return _mock_layer("vegetation", "vector")

    return {
        "layer_name": "vegetation",
        "geojson":    geojson,
        "tile_url":   None,
        "legend": {
            "type":  "solid",
            "label": "Vegetation / green areas (OSM)",
            "color": "#34d399",
        },
    }


# ---------------------------------------------------------------------------
# Buildings — GEE Open Buildings v3, with OSM Overpass fallback
# ---------------------------------------------------------------------------

def _fetch_buildings(roi_geojson: Dict[str, Any]) -> Dict[str, Any]:
    """Google Open Buildings via GEE; falls back to OSM building footprints."""
    gee_ok = _init_gee()
    if gee_ok and _GEE_AVAILABLE:
        try:
            roi = _parse_roi(roi_geojson)
            buildings = (
                ee.FeatureCollection("GOOGLE/Research/open-buildings/v3/polygons")
                .filterBounds(roi)
                .limit(2000)
            )
            geojson = buildings.getInfo()
            logger.info(
                "[MapLayers] buildings from GEE: %d features",
                len(geojson.get("features", [])),
            )
            return {
                "layer_name": "buildings",
                "geojson":    geojson,
                "tile_url":   None,
                "legend":     None,
            }
        except Exception as exc:
            logger.warning(
                "[MapLayers] GEE buildings failed, falling back to OSM: %s", exc
            )

    return _fetch_buildings_osm(roi_geojson)


def _fetch_buildings_osm(roi_geojson: Dict[str, Any]) -> Dict[str, Any]:
    """OSM building footprints via Overpass as GeoJSON polygons."""
    bbox = _geojson_to_bbox(roi_geojson)
    if bbox is None:
        return _mock_layer("buildings", "vector")

    south, west, north, east = bbox
    query = f"""
[out:json][timeout:{_OVERPASS_TIMEOUT}];
(
  way["building"]({south},{west},{north},{east});
  relation["building"]({south},{west},{north},{east});
);
out geom;
"""
    try:
        resp = http_requests.post(
            _OVERPASS_URL, data={"data": query}, timeout=_OVERPASS_TIMEOUT
        )
        resp.raise_for_status()
        geojson = _osm_to_geojson_polygons(resp.json(), tag_key="building")
        logger.info("[MapLayers] buildings from OSM: %d features", len(geojson["features"]))
        return {
            "layer_name": "buildings",
            "geojson":    geojson,
            "tile_url":   None,
            "legend":     None,
        }
    except Exception as exc:
        logger.error("[MapLayers] OSM buildings failed: %s", exc)
        return _mock_layer("buildings", "vector")


# ---------------------------------------------------------------------------
# Roads — OSM highway ways via Overpass → GeoJSON LineStrings
# ---------------------------------------------------------------------------

def _fetch_roads(roi_geojson: Dict[str, Any]) -> Dict[str, Any]:
    """OSM roads via Overpass — highway ways within the ROI bbox."""
    bbox = _geojson_to_bbox(roi_geojson)
    if bbox is None:
        return _mock_layer("roads", "vector")

    south, west, north, east = bbox
    query = f"""
[out:json][timeout:{_OVERPASS_TIMEOUT}];
(
  way["highway"~"motorway|trunk|primary|secondary|tertiary|residential|unclassified|service|track|path|footway|cycleway"]({south},{west},{north},{east});
);
out geom;
"""
    try:
        resp = http_requests.post(
            _OVERPASS_URL, data={"data": query}, timeout=_OVERPASS_TIMEOUT
        )
        resp.raise_for_status()
        geojson = _osm_to_geojson_lines(resp.json())
        logger.info("[MapLayers] roads: %d features", len(geojson["features"]))
    except Exception as exc:
        logger.error("[MapLayers] OSM roads failed: %s", exc)
        return _mock_layer("roads", "vector")

    return {
        "layer_name": "roads",
        "geojson":    geojson,
        "tile_url":   None,
        "legend":     None,
    }


# ---------------------------------------------------------------------------
# Geometry converters
# ---------------------------------------------------------------------------

def _geojson_to_bbox(
    roi_geojson: Dict[str, Any],
) -> Optional[Tuple[float, float, float, float]]:
    """Return (south, west, north, east) from a GeoJSON Polygon/Feature."""
    try:
        if roi_geojson.get("type") == "Feature":
            coords_outer = roi_geojson["geometry"]["coordinates"][0]
        elif roi_geojson.get("type") == "Polygon":
            coords_outer = roi_geojson["coordinates"][0]
        else:
            return None
        lons = [c[0] for c in coords_outer]
        lats = [c[1] for c in coords_outer]
        return (min(lats), min(lons), max(lats), max(lons))
    except Exception:
        return None


def _osm_to_geojson_lines(osm_data: Dict) -> Dict[str, Any]:
    """Convert Overpass JSON ways to GeoJSON LineString FeatureCollection."""
    features = []
    for element in osm_data.get("elements", []):
        if element.get("type") != "way":
            continue
        pts = element.get("geometry", [])
        if len(pts) < 2:
            continue
        tags = element.get("tags", {})
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [[pt["lon"], pt["lat"]] for pt in pts],
            },
            "properties": {
                "highway": tags.get("highway", "unknown"),
                "name":    tags.get("name", ""),
                "osm_id":  element.get("id"),
            },
        })
    return {"type": "FeatureCollection", "features": features}


def _osm_to_geojson_polygons(
    osm_data: Dict,
    tag_key: str = "natural",
) -> Dict[str, Any]:
    """Convert Overpass JSON ways/relations to GeoJSON Polygon FeatureCollection."""
    features = []
    for element in osm_data.get("elements", []):
        etype = element.get("type")
        tags  = element.get("tags", {})

        if etype == "way":
            pts = element.get("geometry", [])
            if len(pts) < 3:
                continue
            coords = [[pt["lon"], pt["lat"]] for pt in pts]
            if coords[0] != coords[-1]:
                coords.append(coords[0])
            features.append({
                "type": "Feature",
                "geometry": {"type": "Polygon", "coordinates": [coords]},
                "properties": {
                    tag_key: tags.get(
                        tag_key, tags.get("natural", tags.get("landuse", "unknown"))
                    ),
                    "name":   tags.get("name", ""),
                    "osm_id": element.get("id"),
                },
            })

        elif etype == "relation":
            for m in element.get("members", []):
                if m.get("role") != "outer":
                    continue
                pts = m.get("geometry", [])
                if len(pts) < 3:
                    continue
                coords = [[pt["lon"], pt["lat"]] for pt in pts]
                if coords[0] != coords[-1]:
                    coords.append(coords[0])
                features.append({
                    "type": "Feature",
                    "geometry": {"type": "Polygon", "coordinates": [coords]},
                    "properties": {
                        tag_key: tags.get(tag_key, tags.get("natural", "unknown")),
                        "name":   tags.get("name", ""),
                        "osm_id": element.get("id"),
                    },
                })
                break  # only first outer ring per relation

    return {"type": "FeatureCollection", "features": features}


def _mock_layer(layer_name: str, layer_type: str) -> Dict[str, Any]:
    """Return an empty stub layer when fetch fails."""
    logger.info("[MapLayers] MOCK layer for '%s'.", layer_name)
    return {
        "layer_name": layer_name,
        "geojson":    {"type": "FeatureCollection", "features": []}
                      if layer_type == "vector" else None,
        "tile_url":   None,
        "legend":     None,
    }
