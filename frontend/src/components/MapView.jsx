/**
 * MapView.jsx — Mapbox GL JS Satellite & GIS Map with 2-Row Horizontal GIS Toolbox.
 * Features:
 *   - Clean 2-Row toolbar directly below the header (no horizontal scrollbar needed)
 *   - Comprehensive all-India states + auto-filtering districts with FlyTo
 *   - Basemaps: Dark, Satellite, Streets, Light, Outdoors
 *   - 2D View and 3D Tilt (60°)
 *   - AOI Draw, Upload, and Clear tools with active drawing indicator
 *   - Reliable Mapbox token resolution & error resilience
 */

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { INDIA_STATES } from "../data/indiaGeoData";

const BASEMAPS = [
  { id: "dark", label: "Dark", icon: "🌙", style: "mapbox://styles/mapbox/dark-v11" },
  { id: "satellite", label: "Satellite", icon: "🛰️", style: "mapbox://styles/mapbox/satellite-streets-v12" },
  { id: "streets", label: "Streets", icon: "🗺️", style: "mapbox://styles/mapbox/streets-v12" },
  { id: "light", label: "Light", icon: "☀️", style: "mapbox://styles/mapbox/light-v11" },
  { id: "outdoors", label: "Outdoors", icon: "🏔️", style: "mapbox://styles/mapbox/outdoors-v12" },
];

const DEFAULT_MAPBOX_TOKEN =
  import.meta.env.VITE_MAPBOX_TOKEN ||
  import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ||
  "";

export default function MapView({
  onROIChange,
  evidenceGeojson,
  layerVisibility = {},
  onLayerToggle,
  layerData = {},
  uploadedImageOverlay,
}) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const draw = useRef(null);
  const fileInputRef = useRef(null);

  const [activeBasemap, setActiveBasemap] = useState("dark");
  const [is3D, setIs3D] = useState(false);
  const [selectedState, setSelectedState] = useState("Andhra Pradesh");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [coordsDisplay, setCoordsDisplay] = useState("15.44074°N, 83.75996°E");
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasROI, setHasROI] = useState(false);
  const [mapError, setMapError] = useState(null);

  // Available districts for the selected state
  const availableDistricts = useMemo(() => {
    const st = INDIA_STATES.find((s) => s.name === selectedState);
    return st?.districts || [];
  }, [selectedState]);

  // Initialize Mapbox
  useEffect(() => {
    if (map.current) return;

    try {
      mapboxgl.accessToken = DEFAULT_MAPBOX_TOKEN;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [80.5, 15.9], // Andhra Pradesh region
        zoom: 6.8,
        pitch: 0,
        bearing: 0,
      });

      // Add Mapbox Draw
      draw.current = new MapboxDraw({
        displayControlsDefault: false,
        controls: { polygon: false, trash: true },
        defaultMode: "simple_select",
        styles: [
          {
            id: "gl-draw-polygon-fill",
            type: "fill",
            paint: { "fill-color": "#14b8a6", "fill-opacity": 0.25 },
          },
          {
            id: "gl-draw-polygon-stroke",
            type: "line",
            paint: { "line-color": "#14b8a6", "line-width": 2.5 },
          },
          {
            id: "gl-draw-point",
            type: "circle",
            paint: { "circle-radius": 6, "circle-color": "#2dd4bf" },
          },
        ],
      });

      map.current.addControl(draw.current, "top-right");
      map.current.addControl(new mapboxgl.NavigationControl({ showCompass: true }), "bottom-right");

      const updateROI = () => {
        const data = draw.current.getAll();
        if (data.features.length > 0) {
          const geom = data.features[data.features.length - 1].geometry;
          onROIChange?.(geom);
          setIsDrawing(false);
          setHasROI(true);
        } else {
          onROIChange?.(null);
          setHasROI(false);
        }
      };

      map.current.on("draw.create", updateROI);
      map.current.on("draw.update", updateROI);
      map.current.on("draw.delete", updateROI);

      map.current.on("mousemove", (e) => {
        const lng = e.lngLat.lng.toFixed(5);
        const lat = e.lngLat.lat.toFixed(5);
        const latDir = lat >= 0 ? "°N" : "°S";
        const lngDir = lng >= 0 ? "°E" : "°W";
        setCoordsDisplay(`${Math.abs(lat)}${latDir}, ${Math.abs(lng)}${lngDir}`);
      });
    } catch (err) {
      console.error("Mapbox init failed:", err);
      setMapError(err.message || "Failed to initialize Mapbox GL.");
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [onROIChange]);

  // Handle Basemap Change
  const handleBasemapSelect = (bm) => {
    setActiveBasemap(bm.id);
    if (map.current) {
      map.current.setStyle(bm.style);
    }
  };

  // Handle 2D / 3D Tilt Toggle
  const handleToggle3D = (tilt3D) => {
    setIs3D(tilt3D);
    if (map.current) {
      map.current.easeTo({
        pitch: tilt3D ? 60 : 0,
        bearing: tilt3D ? -20 : 0,
        duration: 1000,
      });
    }
  };

  // State / District FlyTo
  const handleStateChange = (e) => {
    const sName = e.target.value;
    setSelectedState(sName);
    setSelectedDistrict("");
    const st = INDIA_STATES.find((s) => s.name === sName);
    if (st && map.current) {
      map.current.flyTo({ center: st.center, zoom: st.zoom, duration: 1500 });
    }
  };

  const handleDistrictChange = (e) => {
    const dName = e.target.value;
    setSelectedDistrict(dName);
    const dt = availableDistricts.find((d) => d.name === dName);
    if (dt && map.current) {
      map.current.flyTo({ center: dt.center, zoom: dt.zoom, duration: 1500 });
    }
  };

  // Draw AOI trigger
  const handleDrawAOI = () => {
    if (draw.current) {
      draw.current.deleteAll();
      draw.current.changeMode("draw_polygon");
      setIsDrawing(true);
      setHasROI(false);
    }
  };

  // Clear AOI trigger
  const handleClearAOI = () => {
    if (draw.current) {
      draw.current.deleteAll();
      onROIChange?.(null);
      setIsDrawing(false);
      setHasROI(false);
    }
  };

  // Upload Boundary File trigger
  const handleUploadBoundary = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        const parsed = JSON.parse(text);
        if (draw.current && map.current) {
          draw.current.deleteAll();
          draw.current.add(parsed);
          const geom =
            parsed.type === "FeatureCollection"
              ? parsed.features[0].geometry
              : parsed.geometry || parsed;
          onROIChange?.(geom);
          setHasROI(true);

          // Fit bounds
          const coords = geom.coordinates.flat(geom.type === "MultiPolygon" ? 2 : 1);
          const bounds = coords.reduce(
            (b, c) => b.extend(c),
            new mapboxgl.LngLatBounds(coords[0], coords[0])
          );
          map.current.fitBounds(bounds, { padding: 50, duration: 1000 });
        }
      } catch (err) {
        alert("Failed to parse file. Please upload a valid GeoJSON boundary file.");
      }
    };
    reader.readAsText(file);
  };

  // Grounded GeoJSON Evidence Overlays
  useEffect(() => {
    if (!map.current) return;
    const m = map.current;

    const sourceId = "grounded-evidence-src";
    const layerFillId = "grounded-evidence-fill";
    const layerLineId = "grounded-evidence-line";

    const updateEvidence = () => {
      if (evidenceGeojson && evidenceGeojson.features?.length > 0) {
        if (m.getSource(sourceId)) {
          m.getSource(sourceId).setData(evidenceGeojson);
        } else {
          m.addSource(sourceId, { type: "geojson", data: evidenceGeojson });
          m.addLayer({
            id: layerFillId,
            type: "fill",
            source: sourceId,
            paint: { "fill-color": "#38bdf8", "fill-opacity": 0.3 },
          });
          m.addLayer({
            id: layerLineId,
            type: "line",
            source: sourceId,
            paint: { "line-color": "#38bdf8", "line-width": 2 },
          });
        }
      } else {
        if (m.getLayer(layerFillId)) m.removeLayer(layerFillId);
        if (m.getLayer(layerLineId)) m.removeLayer(layerLineId);
        if (m.getSource(sourceId)) m.removeSource(sourceId);
      }
    };

    if (m.isStyleLoaded()) {
      updateEvidence();
    } else {
      m.once("style.load", updateEvidence);
    }
  }, [evidenceGeojson]);

  return (
    <div className="gis-map-viewport-wrapper">
      {/* ── 2-ROW TOP HORIZONTAL GIS TOOLBOX ─────────────────────────────── */}
      <div className="gis-top-horizontal-toolbox-2row">
        {/* ROW 1: Base Maps, Perspective & Coordinates */}
        <div className="gis-tb-row gis-tb-row--top">
          <div className="gis-tb-subgroup">
            <span className="gis-tb-label">BASE MAP:</span>
            <div className="gis-tb-btn-row">
              {BASEMAPS.map((bm) => (
                <button
                  key={bm.id}
                  type="button"
                  className={`gis-tb-btn ${activeBasemap === bm.id ? "active" : ""}`}
                  onClick={() => handleBasemapSelect(bm)}
                  title={`Switch to ${bm.label} basemap`}
                >
                  <span className="tb-icon">{bm.icon}</span>
                  <span className="tb-label">{bm.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="gis-tb-divider" />

          <div className="gis-tb-subgroup">
            <span className="gis-tb-label">VIEW:</span>
            <div className="gis-tb-btn-row">
              <button
                type="button"
                className={`gis-tb-btn ${!is3D ? "active" : ""}`}
                onClick={() => handleToggle3D(false)}
              >
                🗺️ 2D View
              </button>
              <button
                type="button"
                className={`gis-tb-btn ${is3D ? "active" : ""}`}
                onClick={() => handleToggle3D(true)}
              >
                🏔️ 3D Tilt (60°)
              </button>
            </div>
          </div>

          <div className="gis-tb-coords">
            <span className="coords-icon">📍</span>
            <span className="coords-text">{coordsDisplay}</span>
          </div>
        </div>

        {/* ROW 2: State, District & AOI Selection Tools */}
        <div className="gis-tb-row gis-tb-row--bottom">
          <div className="gis-tb-subgroup">
            <label className="gis-tb-field-label">STATE:</label>
            <select
              className="gis-tb-select"
              value={selectedState}
              onChange={handleStateChange}
            >
              {INDIA_STATES.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="gis-tb-subgroup">
            <label className="gis-tb-field-label">DISTRICT:</label>
            <select
              className="gis-tb-select"
              value={selectedDistrict}
              onChange={handleDistrictChange}
            >
              <option value="">Select District...</option>
              {availableDistricts.map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="gis-tb-divider" />

          <div className="gis-tb-subgroup">
            <span className="gis-tb-label">AOI TOOLS:</span>
            <button
              type="button"
              className={`gis-tb-action-btn ${isDrawing ? "drawing-active" : ""} ${hasROI ? "has-roi" : ""}`}
              onClick={handleDrawAOI}
              title="Click to draw a polygon Region of Interest on the map"
            >
              <span className="tb-action-icon">✏️</span>
              <span>{isDrawing ? "Click Map to Draw…" : hasROI ? "Redraw AOI" : "Draw AOI"}</span>
            </button>

            <button
              type="button"
              className="gis-tb-action-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Upload GeoJSON boundary file"
            >
              <span className="tb-action-icon">📤</span>
              <span>Upload AOI</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".geojson,.json,.kml,.zip"
              style={{ display: "none" }}
              onChange={handleUploadBoundary}
            />

            {hasROI && (
              <button
                type="button"
                className="gis-tb-action-btn gis-tb-action-btn--clear"
                onClick={handleClearAOI}
                title="Clear active AOI polygon"
              >
                <span>✕ Clear</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mapbox Canvas */}
      <div ref={mapContainer} className="gis-map-container" />

      {/* Error Notice If Mapbox fails */}
      {mapError && (
        <div className="map-error-overlay">
          <div className="map-error-card">
            <span>⚠️</span>
            <div style={{ fontWeight: 700 }}>Mapbox Notice</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>{mapError}</div>
          </div>
        </div>
      )}
    </div>
  );
}
