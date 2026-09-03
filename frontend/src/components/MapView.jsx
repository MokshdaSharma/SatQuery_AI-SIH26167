/**
 * MapView.jsx — Mapbox GL JS satellite map with ROI drawing and layer overlays.
 *
 * Props:
 *   onROIChange(geojson)       — called when user draws/updates an ROI polygon
 *   evidenceGeojson            — GeoJSON FeatureCollection to overlay as evidence
 *   layerVisibility            — { water, roads, buildings, vegetation,
 *                                 new_construction, demolition,
 *                                 vegetation_growth, deforestation }
 *   onLayerToggle(name)        — called when a layer toggle is clicked
 *   layerData                  — { [layerName]: LayerResponse }
 *   showChangeTypes            — boolean: show change-type toggles
 *   uploadedImageOverlay       — { url, corners, bounds } | null — georef image to pin on map
 */

import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const UPLOADED_IMG_SRC = "satquery-uploaded-image";
const UPLOADED_IMG_LAYER = "satquery-uploaded-image-layer";

// Source IDs used for overlays
const SRC = {
  evidence:          "satquery-evidence",
  water:             "satquery-water",
  roads:             "satquery-roads",
  buildings:         "satquery-buildings",
  vegetation:        "satquery-vegetation",
  new_construction:  "satquery-new_construction",
  demolition:        "satquery-demolition",
  vegetation_growth: "satquery-vegetation_growth",
  deforestation:     "satquery-deforestation",
};

const LAYER_CONFIGS = {
  evidence: {
    type: "fill",
    paint: {
      "fill-color":   "#38bdf8",
      "fill-opacity": 0.25,
    },
  },
  evidence_outline: {
    type: "line",
    paint: {
      "line-color":   "#38bdf8",
      "line-width":   2,
    },
  },
  roads: {
    type: "line",
    paint: {
      "line-color":   "#fbbf24",
      "line-width":   1.5,
    },
  },
  buildings: {
    type: "fill",
    paint: {
      "fill-color":   "#818cf8",
      "fill-opacity": 0.4,
    },
  },
  new_construction: {
    type: "fill",
    paint: {
      "fill-color":   "#60a5fa",
      "fill-opacity": 0.45,
    },
  },
  demolition: {
    type: "fill",
    paint: {
      "fill-color":   "#f87171",
      "fill-opacity": 0.45,
    },
  },
  vegetation_growth: {
    type: "fill",
    paint: {
      "fill-color":   "#34d399",
      "fill-opacity": 0.45,
    },
  },
  deforestation: {
    type: "fill",
    paint: {
      "fill-color":   "#fbbf24",
      "fill-opacity": 0.45,
    },
  },
};

const LAYER_LABELS = {
  water:             "💧 Water",
  roads:             "🛣 Roads",
  buildings:         "🏢 Buildings",
  vegetation:        "🌿 Vegetation",
  new_construction:  "🏗 New Construction",
  demolition:        "🔴 Demolition",
  vegetation_growth: "🌱 Veg. Growth",
  deforestation:     "🪓 Deforestation",
};

export default function MapView({
  onROIChange,
  evidenceGeojson,
  layerVisibility,
  onLayerToggle,
  layerData,
  showChangeTypes,
  uploadedImageOverlay,   // { url, corners, bounds } | null
}) {
  const mapContainerRef = useRef(null);
  const mapRef          = useRef(null);
  const drawRef         = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [tokenMissing, setTokenMissing] = useState(false);
  const [hasUploadOverlay, setHasUploadOverlay] = useState(false);

  // ── Initialise map ─────────────────────────────────────────────────────────
  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) {
      setTokenMissing(true);
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style:     "mapbox://styles/mapbox/satellite-streets-v12",
      center:    [76.9, 26.9],
      zoom:      10,
    });

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls:               { polygon: true, trash: true },
      styles: [
        // Active polygon fill
        {
          id:     "gl-draw-polygon-fill",
          type:   "fill",
          filter: ["all", ["==", "$type", "Polygon"]],
          paint:  { "fill-color": "#38bdf8", "fill-opacity": 0.15 },
        },
        // Active polygon outline
        {
          id:     "gl-draw-polygon-stroke",
          type:   "line",
          filter: ["all", ["==", "$type", "Polygon"]],
          paint:  { "line-color": "#38bdf8", "line-width": 2.5, "line-dasharray": [2, 2] },
        },
        // Vertices
        {
          id:     "gl-draw-polygon-midpoint",
          type:   "circle",
          filter: ["all", ["==", "$type", "Point"], ["==", "meta", "midpoint"]],
          paint:  { "circle-radius": 4, "circle-color": "#38bdf8" },
        },
        {
          id:     "gl-draw-polygon-vertex",
          type:   "circle",
          filter: ["all", ["==", "$type", "Point"], ["==", "meta", "vertex"]],
          paint:  { "circle-radius": 5, "circle-color": "#fff", "circle-stroke-width": 2, "circle-stroke-color": "#38bdf8" },
        },
      ],
    });

    map.addControl(draw, "top-right");
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.addControl(new mapboxgl.ScaleControl(), "bottom-right");

    const handleDraw = () => {
      const data = draw.getAll();
      const geom = data.features[0]?.geometry;
      if (geom) onROIChange?.(geom);
    };

    map.on("draw.create", handleDraw);
    map.on("draw.update", handleDraw);
    map.on("draw.delete", () => onROIChange?.(null));

    map.on("load", () => {
      mapRef.current  = map;
      drawRef.current = draw;
      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current  = null;
      drawRef.current = null;
    };
  }, []);

  // ── Uploaded image overlay ──────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    // Remove previous overlay
    if (map.getLayer(UPLOADED_IMG_LAYER)) map.removeLayer(UPLOADED_IMG_LAYER);
    if (map.getSource(UPLOADED_IMG_SRC))  map.removeSource(UPLOADED_IMG_SRC);
    setHasUploadOverlay(false);

    if (!uploadedImageOverlay?.url || !uploadedImageOverlay?.corners) return;

    const { url, corners, bounds } = uploadedImageOverlay;
    // corners: [[NW lon,lat],[NE],[SE],[SW]]
    // Mapbox image source expects: [tl, tr, br, bl] as [lon, lat]
    try {
      map.addSource(UPLOADED_IMG_SRC, {
        type: "image",
        url,
        coordinates: [
          corners[0],  // NW (top-left)
          corners[1],  // NE (top-right)
          corners[2],  // SE (bottom-right)
          corners[3],  // SW (bottom-left)
        ],
      });
      map.addLayer({
        id:   UPLOADED_IMG_LAYER,
        type: "raster",
        source: UPLOADED_IMG_SRC,
        paint: { "raster-opacity": 0.85 },
      });
      setHasUploadOverlay(true);

      // Fly to image bounds whenever a georef image is loaded
      if (bounds) {
        map.fitBounds(
          [[bounds[0], bounds[1]], [bounds[2], bounds[3]]],
          { padding: 40, duration: 1200 }
        );
      }
    } catch (err) {
      console.warn("[MapView] Failed to add uploaded image overlay:", err.message);
    }
  }, [uploadedImageOverlay, mapReady]);

  // ── Evidence overlay ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    // Remove old evidence layers
    ["evidence_outline", "evidence"].forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource(SRC.evidence)) map.removeSource(SRC.evidence);

    if (!evidenceGeojson) return;

    map.addSource(SRC.evidence, { type: "geojson", data: evidenceGeojson });
    map.addLayer({ id: "evidence", source: SRC.evidence, ...LAYER_CONFIGS.evidence });
    map.addLayer({ id: "evidence_outline", source: SRC.evidence, ...LAYER_CONFIGS.evidence_outline });
  }, [evidenceGeojson, mapReady]);

  // ── Thematic layer overlays ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    const vectorLayers = ["roads", "buildings", "new_construction", "demolition",
                          "vegetation_growth", "deforestation"];

    vectorLayers.forEach((name) => {
      const layerId  = `layer-${name}`;
      const srcId    = SRC[name] || `satquery-${name}`;
      const data     = layerData?.[name]?.geojson;
      const visible  = layerVisibility?.[name];
      const config   = LAYER_CONFIGS[name];
      if (!config) return;

      if (!data) {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
        }
        return;
      }

      if (!map.getSource(srcId)) {
        map.addSource(srcId, { type: "geojson", data });
        map.addLayer({ id: layerId, source: srcId, ...config });
      } else {
        (map.getSource(srcId)).setData(data);
      }

      map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
    });
  }, [layerData, layerVisibility, mapReady]);

  // Tile-based layer visibility (water, vegetation)
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    ["water", "vegetation"].forEach((name) => {
      const layerId = `layer-${name}-raster`;
      const map     = mapRef.current;
      const tileUrl = layerData?.[name]?.tile_url;
      const visible = layerVisibility?.[name];

      if (!tileUrl) return;

      if (!map.getSource(`satquery-${name}`)) {
        map.addSource(`satquery-${name}`, { type: "raster", tiles: [tileUrl], tileSize: 256 });
        map.addLayer({
          id:     layerId,
          type:   "raster",
          source: `satquery-${name}`,
          paint:  { "raster-opacity": 0.65 },
        });
      }

      map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
    });
  }, [layerData, layerVisibility, mapReady]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (tokenMissing) {
    return (
      <div className="map-area" style={{ display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16, background:"#050c1a" }}>
        <div style={{ fontSize:48, opacity:0.4 }}>🗺️</div>
        <p style={{ color:"var(--color-text-secondary)", fontSize:14, textAlign:"center", maxWidth:320 }}>
          <strong style={{ color:"var(--color-brand-danger)" }}>Mapbox token not set.</strong><br />
          Add <code style={{ color:"var(--color-text-code)" }}>VITE_MAPBOX_TOKEN</code> to{" "}
          <code style={{ color:"var(--color-text-code)" }}>frontend/.env</code> and restart the dev server.
        </p>
      </div>
    );
  }

  const baseToggles = ["water", "roads", "buildings", "vegetation"];
  const changeToggles = ["new_construction", "demolition", "vegetation_growth", "deforestation"];

  return (
    <div className="map-area">
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

      {/* Layer toggle panel */}
      <div className="map-overlay-panel">
        <div className="card" style={{ padding:"10px 12px" }}>
          <div className="section-title" style={{ marginBottom:8, fontSize:10 }}>Map Layers</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {baseToggles.map((name) => (
              <button
                key={name}
                id={`layer-toggle-${name}`}
                className={`toggle-btn${layerVisibility?.[name] ? " active" : ""}`}
                onClick={() => onLayerToggle?.(name)}
                style={{ justifyContent:"flex-start" }}
              >
                <span className="dot" />
                {LAYER_LABELS[name]}
              </button>
            ))}

            {showChangeTypes && (
              <>
                <div className="section-title" style={{ marginTop:6, marginBottom:4, fontSize:9 }}>Change Types</div>
                {changeToggles.map((name) => (
                  <button
                    key={name}
                    id={`layer-toggle-${name}`}
                    className={`toggle-btn${layerVisibility?.[name] ? " active" : ""}`}
                    onClick={() => onLayerToggle?.(name)}
                    style={{ justifyContent:"flex-start" }}
                  >
                    <span className="dot" />
                    {LAYER_LABELS[name]}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Drawing hint */}
      {!mapReady && (
        <div className="map-hint">Initialising map…</div>
      )}
      {mapReady && !hasUploadOverlay && (
        <div className="map-hint">
          Use the polygon tool ▶ to draw an ROI, or upload a satellite image from the sidebar
        </div>
      )}
      {mapReady && hasUploadOverlay && (
        <div className="map-hint" style={{ color:"var(--color-brand-accent)" }}>
          ✔ Uploaded image pinned on map — draw an ROI or ask a question
        </div>
      )}
    </div>
  );
}
