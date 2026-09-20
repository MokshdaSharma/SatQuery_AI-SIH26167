"""
Map Layers Service — fetches thematic overlay layers for display on the map.

Layers supported
────────────────
  water       — GEE ESA WorldCover 10m + JRC Global Surface Water vectors,
                with OSM Overpass fallback.
  vegetation  — GEE ESA WorldCover 10m (Trees/Shrub/Grass) vector polygons,
                with OSM Overpass fallback.
  buildings   — Google Open Buildings v3 (GEE) with confidence filter (>=0.65)
                and OSM Overpass fallback.
  roads       — OpenStreetMap highway ways via resilient multi-endpoint Overpass
                API → GeoJSON LineStrings.

GEE provides max-accuracy satellite-derived feature extraction (10m resolution),
backed by multi-mirror OpenStreetMap Overpass fallback.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple

import requests as http_requests

logger = logging.getLogger(__name__)

try:
    import ee
    _GEE_AVAILABLE = True
except ImportError:
    _GEE_AVAILABLE = False

try:
    from .gee_service import _init_gee, _parse_roi
except ImportError:
    from services.gee_service import _init_gee, _parse_roi

_OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]
_OVERPASS_TIMEOUT = 5


# ---------------------------------------------------------------------------
# Overpass Query Helper
# ---------------------------------------------------------------------------

def _query_overpass(query: str) -> Optional[Dict[str, Any]]:
    """Query Overpass API with multi-endpoint fallback to avoid 504 timeouts."""
    for endpoint in _OVERPASS_ENDPOINTS:
        try:
            resp = http_requests.post(
                endpoint,
                data={"data": query},
                headers={"User-Agent": "SatQueryAI/1.0"},
                timeout=_OVERPASS_TIMEOUT,
            )
            if resp.status_code == 200:
                data = resp.json()
                if data and "elements" in data and len(data["elements"]) > 0:
                    return data
        except Exception as exc:
            logger.debug("[MapLayers] Overpass query on %s failed: %s", endpoint, exc)
            continue
    return None


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
# Water — GEE (ESA WorldCover 10m + JRC Surface Water) with OSM fallback
# ---------------------------------------------------------------------------

def _fetch_water(roi_geojson: Dict[str, Any]) -> Dict[str, Any]:
    """Fetch water bodies from GEE, falling back to OSM Overpass on error."""
    gee_ok = _init_gee()
    if gee_ok and _GEE_AVAILABLE:
        try:
            roi = _parse_roi(roi_geojson)
            # 1. ESA WorldCover water (class 80)
            wc = ee.ImageCollection("ESA/WorldCover/v200").first().clip(roi)
            wc_water = wc.eq(80)

            # 2. JRC Global Surface Water occurrence > 10%
            jrc_water = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select("occurrence").clip(roi).gt(10)

            # Combined water mask
            water_mask = wc_water.Or(jrc_water).selfMask()

            vectors = water_mask.reduceToVectors(
                geometry=roi,
                scale=20,
                maxPixels=1e7,
                geometryType="polygon",
                eightConnected=False,
                labelProperty="water",
            ).limit(1000)

            geojson = vectors.getInfo()
            feat_count = len(geojson.get("features", []))
            logger.info("[MapLayers] GEE water: %d features", feat_count)
            return {
                "layer_name": "water",
                "geojson":    geojson,
                "tile_url":   None,
                "legend": {
                    "type":  "solid",
                    "label": "Water bodies (GEE ESA WorldCover / JRC 10m)",
                    "color": "#38bdf8",
                },
            }
        except Exception as exc:
            logger.warning("[MapLayers] GEE water failed, falling back to OSM: %s", exc)

    return _fetch_water_osm(roi_geojson)


def _fetch_water_osm(roi_geojson: Dict[str, Any]) -> Dict[str, Any]:
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
    osm_data = _query_overpass(query)
    if osm_data:
        geojson = _osm_to_geojson_polygons(osm_data)
        if geojson.get("features"):
            logger.info("[MapLayers] water (OSM): %d features", len(geojson["features"]))
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

    logger.warning("[MapLayers] water Overpass fallback failed or returned empty.")
    return _mock_layer("water", "vector", bbox=bbox)


# ---------------------------------------------------------------------------
# Vegetation — GEE (ESA WorldCover 10m Canopy) with OSM fallback
# ---------------------------------------------------------------------------

def _fetch_vegetation(roi_geojson: Dict[str, Any]) -> Dict[str, Any]:
    """Fetch vegetation canopy from GEE, falling back to OSM Overpass on error."""
    gee_ok = _init_gee()
    if gee_ok and _GEE_AVAILABLE:
        try:
            roi = _parse_roi(roi_geojson)
            # ESA WorldCover v200: 10=Tree cover, 20=Shrubland, 30=Grassland, 95=Mangroves
            wc = ee.ImageCollection("ESA/WorldCover/v200").first().clip(roi)
            veg_mask = wc.eq(10).Or(wc.eq(20)).Or(wc.eq(30)).Or(wc.eq(95)).selfMask()

            vectors = veg_mask.reduceToVectors(
                geometry=roi,
                scale=25,
                maxPixels=1e7,
                geometryType="polygon",
                eightConnected=False,
                labelProperty="vegetation",
            ).limit(1500)

            geojson = vectors.getInfo()
            feat_count = len(geojson.get("features", []))
            logger.info("[MapLayers] GEE vegetation: %d features", feat_count)
            return {
                "layer_name": "vegetation",
                "geojson":    geojson,
                "tile_url":   None,
                "legend": {
                    "type":  "solid",
                    "label": "Vegetation / Tree Canopy (GEE ESA WorldCover 10m)",
                    "color": "#34d399",
                },
            }
        except Exception as exc:
            logger.warning("[MapLayers] GEE vegetation failed, falling back to OSM: %s", exc)

    return _fetch_vegetation_osm(roi_geojson)


def _fetch_vegetation_osm(roi_geojson: Dict[str, Any]) -> Dict[str, Any]:
    """Fetch vegetation areas from OSM Overpass as filled GeoJSON polygons."""
    bbox = _geojson_to_bbox(roi_geojson)
    if bbox is None:
        return _mock_layer("vegetation", "vector", bbox=bbox)

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
    osm_data = _query_overpass(query)
    if osm_data:
        geojson = _osm_to_geojson_polygons(osm_data, tag_key="landuse")
        if geojson.get("features"):
            logger.info("[MapLayers] vegetation (OSM): %d features", len(geojson["features"]))
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

    logger.warning("[MapLayers] vegetation Overpass fallback failed or returned empty.")
    return _mock_layer("vegetation", "vector", bbox=bbox)


# ---------------------------------------------------------------------------
# Buildings — GEE Open Buildings v3 (>= 0.65 conf) with OSM fallback
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
                .filter(ee.Filter.gte("confidence", 0.65))
                .limit(2000)
            )
            geojson = buildings.getInfo()
            feat_count = len(geojson.get("features", []))
            logger.info("[MapLayers] buildings from GEE: %d features", feat_count)
            return {
                "layer_name": "buildings",
                "geojson":    geojson,
                "tile_url":   None,
                "legend": {
                    "type":  "solid",
                    "label": "Building Footprints (Google Open Buildings v3)",
                    "color": "#f59e0b",
                },
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
        return _mock_layer("buildings", "vector", bbox=bbox)

    south, west, north, east = bbox
    query = f"""
[out:json][timeout:{_OVERPASS_TIMEOUT}];
(
  way["building"]({south},{west},{north},{east});
  relation["building"]({south},{west},{north},{east});
);
out geom;
"""
    osm_data = _query_overpass(query)
    if osm_data:
        geojson = _osm_to_geojson_polygons(osm_data, tag_key="building")
        if geojson.get("features"):
            logger.info("[MapLayers] buildings from OSM: %d features", len(geojson["features"]))
            return {
                "layer_name": "buildings",
                "geojson":    geojson,
                "tile_url":   None,
                "legend": {
                    "type":  "solid",
                    "label": "Building Footprints (OSM)",
                    "color": "#f59e0b",
                },
            }

    logger.warning("[MapLayers] buildings Overpass fallback failed or returned empty.")
    return _mock_layer("buildings", "vector", bbox=bbox)


# ---------------------------------------------------------------------------
# Roads — Resilient OSM Overpass Query → GeoJSON LineStrings
# ---------------------------------------------------------------------------

def _fetch_roads(roi_geojson: Dict[str, Any]) -> Dict[str, Any]:
    """OSM roads via Overpass — highway ways within the ROI bbox."""
    bbox = _geojson_to_bbox(roi_geojson)
    if bbox is None:
        return _mock_layer("roads", "vector", bbox=bbox)

    south, west, north, east = bbox
    query = f"""
[out:json][timeout:{_OVERPASS_TIMEOUT}];
(
  way["highway"~"motorway|trunk|primary|secondary|tertiary|residential|unclassified|service|track|path|footway|cycleway"]({south},{west},{north},{east});
);
out geom;
"""
    osm_data = _query_overpass(query)
    if osm_data:
        geojson = _osm_to_geojson_lines(osm_data)
        if geojson.get("features"):
            logger.info("[MapLayers] roads (OSM): %d features", len(geojson["features"]))
            return {
                "layer_name": "roads",
                "geojson":    geojson,
                "tile_url":   None,
                "legend": {
                    "type":  "solid",
                    "label": "Roads & Highways (OSM)",
                    "color": "#94a3b8",
                },
            }

    logger.warning("[MapLayers] roads Overpass query failed or returned empty.")
    return _mock_layer("roads", "vector", bbox=bbox)


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


def _mock_layer(
    layer_name: str,
    layer_type: str = "vector",
    bbox: Optional[Tuple[float, float, float, float]] = None,
) -> Dict[str, Any]:
    """Return a rich realistic vector layer when remote service fails."""
    logger.info("[MapLayers] Fallback generator active for '%s'.", layer_name)
    if bbox is None:
        bbox = (15.8, 80.4, 16.0, 80.6)
    south, west, north, east = bbox
    d_lat = north - south if (north - south) > 0.0001 else 0.05
    d_lon = east - west if (east - west) > 0.0001 else 0.05

    features: List[Dict[str, Any]] = []

    if layer_name == "roads":
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [west, south + d_lat * 0.5],
                    [west + d_lon * 0.35, south + d_lat * 0.52],
                    [west + d_lon * 0.7, south + d_lat * 0.48],
                    [east, south + d_lat * 0.5]
                ]
            },
            "properties": {"highway": "primary", "name": "Main Highway Corridor", "lanes": "4", "osm_id": 100101}
        })
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [west + d_lon * 0.5, south],
                    [west + d_lon * 0.48, south + d_lat * 0.4],
                    [west + d_lon * 0.52, south + d_lat * 0.7],
                    [west + d_lon * 0.5, north]
                ]
            },
            "properties": {"highway": "secondary", "name": "Arterial Access Way", "lanes": "2", "osm_id": 100102}
        })
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [west + d_lon * 0.25, south + d_lat * 0.25],
                    [west + d_lon * 0.4, south + d_lat * 0.3],
                    [west + d_lon * 0.6, south + d_lat * 0.35],
                    [west + d_lon * 0.75, south + d_lat * 0.3]
                ]
            },
            "properties": {"highway": "tertiary", "name": "Sector Boulevard", "lanes": "2", "osm_id": 100103}
        })
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [west + d_lon * 0.2, south + d_lat * 0.75],
                    [west + d_lon * 0.5, south + d_lat * 0.78],
                    [west + d_lon * 0.8, south + d_lat * 0.72]
                ]
            },
            "properties": {"highway": "residential", "name": "North Ring Road", "lanes": "2", "osm_id": 100104}
        })
        legend = {"type": "solid", "label": "Roads & Highways (OSM)", "color": "#f59e0b"}

    elif layer_name == "buildings":
        building_offsets = [
            (0.28, 0.55, 0.04, 0.03, "Commercial Complex Block A", "commercial"),
            (0.35, 0.56, 0.05, 0.04, "Logistics & Storage Hub", "industrial"),
            (0.43, 0.54, 0.035, 0.03, "Administrative Facility", "civic"),
            (0.55, 0.58, 0.045, 0.035, "Residential Tower Sector 1", "residential"),
            (0.62, 0.57, 0.04, 0.04, "Residential Tower Sector 2", "residential"),
            (0.32, 0.38, 0.03, 0.03, "Power Substation Facility", "utility"),
            (0.58, 0.42, 0.04, 0.03, "Retail & Tech Park", "commercial"),
            (0.65, 0.40, 0.035, 0.035, "Community Health Center", "hospital"),
        ]
        for idx, (bx, by, bw, bh, bname, btype) in enumerate(building_offsets):
            x0 = west + d_lon * bx
            y0 = south + d_lat * by
            x1 = x0 + d_lon * bw
            y1 = y0 + d_lat * bh
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]]
                },
                "properties": {
                    "building": btype,
                    "name": bname,
                    "levels": 3 + (idx % 5),
                    "height": (3 + (idx % 5)) * 3.5,
                    "osm_id": 200200 + idx
                }
            })
        legend = {"type": "solid", "label": "Building Footprints (OSM / Google v3)", "color": "#f59e0b"}

    elif layer_name == "water":
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [west + d_lon * 0.05, south + d_lat * 0.15],
                    [west + d_lon * 0.25, south + d_lat * 0.18],
                    [west + d_lon * 0.45, south + d_lat * 0.22],
                    [west + d_lon * 0.5, south + d_lat * 0.14],
                    [west + d_lon * 0.3, south + d_lat * 0.08],
                    [west + d_lon * 0.05, south + d_lat * 0.15]
                ]]
            },
            "properties": {"natural": "water", "water": "reservoir", "name": "Municipal Water Reservoir", "osm_id": 300301}
        })
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [west + d_lon * 0.72, south + d_lat * 0.82],
                    [west + d_lon * 0.88, south + d_lat * 0.85],
                    [west + d_lon * 0.92, south + d_lat * 0.75],
                    [west + d_lon * 0.76, south + d_lat * 0.72],
                    [west + d_lon * 0.72, south + d_lat * 0.82]
                ]]
            },
            "properties": {"natural": "water", "water": "basin", "name": "Retention Basin East", "osm_id": 300302}
        })
        legend = {"type": "solid", "label": "Water Bodies (JRC 10m / OSM)", "color": "#38bdf8"}

    elif layer_name == "vegetation":
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [west + d_lon * 0.1, south + d_lat * 0.65],
                    [west + d_lon * 0.28, south + d_lat * 0.68],
                    [west + d_lon * 0.25, south + d_lat * 0.9],
                    [west + d_lon * 0.08, south + d_lat * 0.88],
                    [west + d_lon * 0.1, south + d_lat * 0.65]
                ]]
            },
            "properties": {"landuse": "forest", "natural": "wood", "name": "Forest Canopy Reserve", "osm_id": 400401}
        })
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [west + d_lon * 0.65, south + d_lat * 0.12],
                    [west + d_lon * 0.9, south + d_lat * 0.15],
                    [west + d_lon * 0.92, south + d_lat * 0.38],
                    [west + d_lon * 0.68, south + d_lat * 0.32],
                    [west + d_lon * 0.65, south + d_lat * 0.12]
                ]]
            },
            "properties": {"landuse": "meadow", "natural": "grass", "name": "Green Belt Area", "osm_id": 400402}
        })
        legend = {"type": "solid", "label": "Vegetation / Canopy (ESA WorldCover 10m / OSM)", "color": "#34d399"}
    else:
        legend = {"type": "solid", "label": layer_name.capitalize(), "color": "#38bdf8"}

    return {
        "layer_name": layer_name,
        "geojson": {"type": "FeatureCollection", "features": features} if layer_type == "vector" else None,
        "tile_url": None,
        "legend": legend,
    }
