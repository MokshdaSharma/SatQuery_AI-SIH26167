/**
 * MapView.jsx — Mapbox GL JS Satellite & GIS Map with custom Layers panel, AOI Drawing, and State/District Zoom.
 * Matches exact reference UI with Dark/Satellite/Streets/Light/Outdoors basemaps, 2D/3D tilt, and semantic change layers.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";

const BASEMAPS = [
  { id: "dark", label: "Dark", icon: "🌙", style: "mapbox://styles/mapbox/dark-v11" },
  { id: "satellite", label: "Satellite", icon: "🛰️", style: "mapbox://styles/mapbox/satellite-streets-v12" },
  { id: "streets", label: "Streets", icon: "🗺️", style: "mapbox://styles/mapbox/streets-v12" },
  { id: "light", label: "Light", icon: "☀️", style: "mapbox://styles/mapbox/light-v11" },
  { id: "outdoors", label: "Outdoors", icon: "🏔️", style: "mapbox://styles/mapbox/outdoors-v12" },
];

const STATES = [
  { name: "Andhra Pradesh", center: [80.5, 15.9], zoom: 7 },
  { name: "Telangana", center: [79.0, 17.8], zoom: 7 },
  { name: "Karnataka", center: [75.7, 15.3], zoom: 7 },
  { name: "Tamil Nadu", center: [78.6, 11.1], zoom: 7 },
  { name: "Maharashtra", center: [75.7, 19.7], zoom: 7 },
  { name: "Odisha", center: [84.4, 20.9], zoom: 7 },
  { name: "Rajasthan", center: [73.8, 27.0], zoom: 7 },
  { name: "Kerala", center: [76.2, 10.8], zoom: 7.5 },
];

const DISTRICTS_AP = [
  { name: "Visakhapatnam", center: [83.2185, 17.6868], zoom: 12 },
  { name: "Vijayawada", center: [80.6480, 16.5062], zoom: 12 },
  { name: "Guntur", center: [80.4365, 16.3067], zoom: 12 },
  { name: "Kakinada", center: [82.2475, 16.9891], zoom: 12 },
  { name: "Eluru", center: [81.1004, 16.7107], zoom: 12 },
  { name: "Nellore", center: [79.9864, 14.4426], zoom: 12 },
  { name: "Kadapa", center: [78.8242, 14.4673], zoom: 12 },
  { name: "Tirupati", center: [79.4192, 13.6288], zoom: 12 },
  { name: "Kurnool", center: [78.0373, 15.8281], zoom: 12 },
  { name: "Anantapur", center: [77.6006, 14.6819], zoom: 12 },
  { name: "Srikakulam", center: [83.8938, 18.2949], zoom: 12 },
  { name: "Vizianagaram", center: [83.4073, 18.1067], zoom: 12 },
  { name: "Machilipatnam", center: [81.1388, 16.1875], zoom: 12 },
  { name: "Ongole", center: [80.0499, 15.5057], zoom: 12 },
];

const SEMANTIC_LAYERS = [
  { id: "new_construction", label: "New Construction (Open → Building)", color: "#10b981", status: "In Progress" },
  { id: "encroachment", label: "Encroachment / Reclamation (Water → Building)", color: "#ef4444", status: "In Progress" },
  { id: "demolition", label: "Demolition / Clearing (Building → Open)", color: "#8b5cf6", status: "In Progress" },
  { id: "new_road", label: "New Road / Access (Open → Road)", color: "#f59e0b", status: "In Progress" },
  { id: "monthly_summary", label: "Monthly Change Summary Layer", color: "#3b82f6", status: "In Progress" },
  { id: "quarterly_summary", label: "Quarterly Change Summary Layer", color: "#06b6d4", status: "In Progress" },
];

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
  const [semanticToggles, setSemanticToggles] = useState({
    new_construction: false,
    encroachment: false,
    demolition: false,
    new_road: false,
    monthly_summary: false,
    quarterly_summary: false,
  });
  const [coordsDisplay, setCoordsDisplay] = useState("15.44074°N, 83.75996°E");
  const [isDrawing, setIsDrawing] = useState(false);

  // Initialize Mapbox
  useEffect(() => {
    if (map.current) return;

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "";

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [80.5, 15.9], // Centered around Andhra Pradesh
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
          paint: { "fill-color": "#14b8a6", "fill-opacity": 0.2 },
        },
        {
          id: "gl-draw-polygon-stroke",
          type: "line",
          paint: { "line-color": "#14b8a6", "line-width": 2 },
        },
        {
          id: "gl-draw-point",
          type: "circle",
          paint: { "circle-radius": 5, "circle-color": "#2dd4bf" },
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
      } else {
        onROIChange?.(null);
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
    const st = STATES.find((s) => s.name === sName);
    if (st && map.current) {
      map.current.flyTo({ center: st.center, zoom: st.zoom, duration: 1500 });
    }
  };

  const handleDistrictChange = (e) => {
    const dName = e.target.value;
    setSelectedDistrict(dName);
    const dt = DISTRICTS_AP.find((d) => d.name === dName);
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
          const geom = parsed.type === "FeatureCollection" ? parsed.features[0].geometry : (parsed.geometry || parsed);
          onROIChange?.(geom);

          // Fit bounds
          const coords = geom.coordinates.flat(geom.type === "MultiPolygon" ? 2 : 1);
          const bounds = coords.reduce((b, c) => b.extend(c), new mapboxgl.LngLatBounds(coords[0], coords[0]));
          map.current.fitBounds(bounds, { padding: 50, duration: 1000 });
        }
      } catch (err) {
        alert("Failed to parse file. Please upload a valid GeoJSON boundary file.");
      }
    };
    reader.readAsText(file);
  };

  // Semantic toggle handler
  const handleSemanticToggle = (id) => {
    setSemanticToggles((prev) => ({ ...prev, [id]: !prev[id] }));
    onLayerToggle?.(id);
  };

  return (
    <div className="gis-map-viewport-wrapper">
      <div ref={mapContainer} className="gis-map-container" />

      {/* ── LEFT OVERLAY: LAYERS CARD ────────────────────────────────────── */}
      <div className="gis-overlay-card gis-layers-card">
        <div className="gis-card-header">
          <span className="gis-card-title">LAYERS</span>
          <span className="gis-card-more">•••</span>
        </div>

        {/* Base Map Grid */}
        <div className="gis-section-block">
          <div className="gis-section-label">BASE MAP</div>
          <div className="gis-basemap-grid">
            {BASEMAPS.map((bm) => (
              <button
                key={bm.id}
                type="button"
                className={`gis-basemap-btn ${activeBasemap === bm.id ? "active" : ""}`}
                onClick={() => handleBasemapSelect(bm)}
              >
                <span className="bm-icon">{bm.icon}</span>
                <span className="bm-label">{bm.label}</span>
              </button>
            ))}
          </div>

          {/* 2D View and 3D Tilt in Layers card */}
          <div className="gis-perspective-row">
            <button
              type="button"
              className={`gis-persp-btn ${!is3D ? "active" : ""}`}
              onClick={() => handleToggle3D(false)}
            >
              🗺️ 2D View
            </button>
            <button
              type="button"
              className={`gis-persp-btn ${is3D ? "active" : ""}`}
              onClick={() => handleToggle3D(true)}
            >
              🏔️ 3D Tilt (60°)
            </button>
          </div>
        </div>

        {/* State Dropdown */}
        <div className="gis-section-block">
          <div className="gis-section-label">STATE</div>
          <select
            className="gis-select-dropdown"
            value={selectedState}
            onChange={handleStateChange}
          >
            {STATES.map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* District Dropdown */}
        <div className="gis-section-block">
          <div className="gis-section-label">DISTRICT</div>
          <select
            className="gis-select-dropdown"
            value={selectedDistrict}
            onChange={handleDistrictChange}
          >
            <option value="">Select District...</option>
            {DISTRICTS_AP.map((d) => (
              <option key={d.name} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Semantic Change Detection Toggles */}
        <div className="gis-section-block semantic-layers-block">
          <div className="gis-section-label">CHANGE DETECTION (SEMANTIC)</div>
          <div className="semantic-toggles-list">
            {SEMANTIC_LAYERS.map((layer) => (
              <div key={layer.id} className="semantic-toggle-row">
                <label className="semantic-switch">
                  <input
                    type="checkbox"
                    checked={!!semanticToggles[layer.id]}
                    onChange={() => handleSemanticToggle(layer.id)}
                  />
                  <span className="slider round"></span>
                </label>
                <div className="semantic-label-group">
                  <div className="label-with-dot">
                    <span className="semantic-color-dot" style={{ background: layer.color }}></span>
                    <span className="semantic-name">{layer.label}</span>
                  </div>
                  <span className="semantic-status">— {layer.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT OVERLAY: AREA OF INTEREST CARD ──────────────────────────── */}
      <div className="gis-overlay-card gis-aoi-card">
        <div className="gis-card-header">
          <div className="aoi-header-title">
            <span className="aoi-icon">🎯</span>
            <span className="gis-card-title">AREA OF INTEREST</span>
          </div>
        </div>

        <div className="aoi-card-body">
          <div className="aoi-action-buttons">
            <button
              type="button"
              className={`aoi-action-btn draw-btn ${isDrawing ? "drawing-active" : ""}`}
              onClick={handleDrawAOI}
            >
              <span className="btn-ico">✏️</span>
              <span>{isDrawing ? "Drawing on Map…" : "Draw AOI"}</span>
            </button>

            <button
              type="button"
              className="aoi-action-btn upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="btn-ico">📤</span>
              <span>Upload</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".geojson,.json,.kml,.gpkg,.zip"
              style={{ display: "none" }}
              onChange={handleUploadBoundary}
            />
          </div>

          <p className="aoi-guide-text">
            Draw a polygon or upload a boundary file — data is then shown for that area only.
          </p>

          <div className="aoi-formats-tag">
            GeoJSON · Shapefile (.shp/.zip) · KML · GeoPackage (.gpkg)
          </div>
        </div>
      </div>

      {/* ── BOTTOM BAR: COORDINATES DISPLAY ──────────────────────────────── */}
      <div className="gis-coords-display">
        <span className="coords-text">{coordsDisplay}</span>
      </div>
    </div>
  );
}
