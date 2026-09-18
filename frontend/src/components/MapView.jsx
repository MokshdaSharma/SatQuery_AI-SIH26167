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
  // Base thematic layers
  water: {
    type: "fill",
    paint: {
      "fill-color":   "#38bdf8",
      "fill-opacity": 0.45,
    },
  },
  water_outline: {
    type: "line",
    paint: {
      "line-color":   "#0ea5e9",
      "line-width":   1,
    },
  },
  vegetation: {
    type: "fill",
    paint: {
      "fill-color":   "#34d399",
      "fill-opacity": 0.4,
    },
  },
  vegetation_outline: {
    type: "line",
    paint: {
      "line-color":   "#10b981",
      "line-width":   0.8,
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

const LAYER_SOURCE = {
  water:      "GEE / JRC 10m",
  roads:      "OSM",
  buildings:  "Google Open Buildings",
  vegetation: "GEE / ESA WorldCover",
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
  const [cursorCoords, setCursorCoords] = useState(null);

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

    // Cursor coordinates
    map.on("mousemove", (e) => {
      setCursorCoords({ lng: e.lngLat.lng.toFixed(5), lat: e.lngLat.lat.toFixed(5) });
    });
    map.on("mouseout", () => setCursorCoords(null));

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

  // ── Thematic layer overlays (all GeoJSON vector) ───────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    const vectorLayers = [
      "water", "vegetation",
      "roads", "buildings",
      "new_construction", "demolition",
      "vegetation_growth", "deforestation",
    ];

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

        const outlineConfig = LAYER_CONFIGS[`${name}_outline`];
        if (outlineConfig) {
          map.addLayer({ id: `${layerId}-outline`, source: srcId, ...outlineConfig });
        }
      } else {
        map.getSource(srcId).setData(data);
      }

      const vis = visible ? "visible" : "none";
      map.setLayoutProperty(layerId, "visibility", vis);
      if (map.getLayer(`${layerId}-outline`)) {
        map.setLayoutProperty(`${layerId}-outline`, "visibility", vis);
      }
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
    <div className="map-area" role="application" aria-label="Satellite map">
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

      {/* Layer toggle panel */}
      <div className="map-overlay-panel">
        <div className="card layer-panel">
          <div className="layer-panel__title">
            <span>🗂</span> Map Layers
          </div>
          <div className="layer-panel__list">
            {baseToggles.map((name) => {
              const isActive = layerVisibility?.[name];
              const hasData = !!(layerData?.[name]?.geojson?.features?.length);
              return (
                <button
                  key={name}
                  id={`layer-toggle-${name}`}
                  className={`layer-toggle-btn${isActive ? " layer-toggle-btn--active" : ""}`}
                  onClick={() => onLayerToggle?.(name)}
                  aria-pressed={isActive}
                >
                  <span className="layer-toggle-btn__icon">{LAYER_LABELS[name].split(" ")[0]}</span>
                  <div className="layer-toggle-btn__info">
                    <div className="layer-toggle-btn__name">{LAYER_LABELS[name].split(" ").slice(1).join(" ")}</div>
                    {LAYER_SOURCE[name] && (
                      <div className="layer-toggle-btn__source">{LAYER_SOURCE[name]}</div>
                    )}
                  </div>
                  {isActive && hasData && (
                    <div className="layer-toggle-btn__dot layer-toggle-btn__dot--loaded" />
                  )}
                  {isActive && !hasData && (
                    <div className="layer-toggle-btn__dot layer-toggle-btn__dot--loading" />
                  )}
                </button>
              );
            })}

            {showChangeTypes && (
              <>
                <div className="layer-panel__separator">Detected Changes</div>
                {changeToggles.map((name) => (
                  <button
                    key={name}
                    id={`layer-toggle-${name}`}
                    className={`layer-toggle-btn${layerVisibility?.[name] ? " layer-toggle-btn--active" : ""}`}
                    onClick={() => onLayerToggle?.(name)}
                    aria-pressed={layerVisibility?.[name]}
                  >
                    <span className="layer-toggle-btn__icon">{LAYER_LABELS[name].split(" ")[0]}</span>
                    <div className="layer-toggle-btn__info">
                      <div className="layer-toggle-btn__name">{LAYER_LABELS[name].split(" ").slice(1).join(" ")}</div>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Legend */}
          <div className="layer-panel__legend">
            <span style={{ color: "var(--color-brand-accent)" }}>●</span> = loaded &nbsp;
            <span style={{ color: "var(--color-brand-warning)" }}>●</span> = loading
          </div>
        </div>
      </div>

      {/* Coordinates overlay */}
      {cursorCoords && (
        <div className="map-coords" aria-live="polite">
          {cursorCoords.lat}°N, {cursorCoords.lng}°E
        </div>
      )}

      {/* Drawing hint */}
      {!mapReady && (
        <div className="map-hint">Initialising map…</div>
      )}
      {mapReady && !hasUploadOverlay && (
        <div className="map-hint">
          🖊 Use the <strong>polygon tool</strong> (top-right of map) to draw your region of interest
        </div>
      )}
      {mapReady && hasUploadOverlay && (
        <div className="map-hint" style={{ color: "var(--color-brand-accent)" }}>
          ✔ Uploaded image pinned on map — draw an ROI or ask a question
        </div>
      )}
    </div>
  );
}
