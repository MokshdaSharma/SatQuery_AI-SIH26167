/**
 * MapView.jsx — Mapbox GL JS Satellite & GIS Map with 2-Row Horizontal GIS Toolbox
 * and Interactive OSM & Change Highlighting Vector Layers.
 *
 * Features:
 *   - Clean 2-Row toolbar directly below header (Basemaps, 2D/3D, State/District, AOI Tools)
 *   - Comprehensive all-India states + auto-filtering districts with FlyTo
 *   - Basemaps: Dark, Satellite, Streets, Light, Outdoors with persistent layer restoration
 *   - 2D View and 3D Tilt (60°)
 *   - AOI Draw, Upload, and Clear tools with active drawing indicator
 *   - Interactive OSM & Thematic Layers Card:
 *       • 💧 Water Bodies (JRC Surface Water 10m / OSM polygons)
 *       • 🛣️ Roads & Highways (OSM Highway Network LineStrings)
 *       • 🏢 Building Footprints (Google Open Buildings v3 / OSM polygons + 3D Extrusion)
 *       • 🌳 Vegetation & Canopy (ESA WorldCover 10m / OSM Greens)
 *   - Interactive Change Detection & Evidence Highlighting Layers:
 *       • 🏗️ New Construction (Rose/Red fill & outline)
 *       • ⚠️ Demolition / Encroachment (Amber/Orange highlight)
 *       • 🌲 Vegetation Growth (Mint/Green canopy expansion)
 *       • 🪓 Deforestation / Loss (Crimson/Red clearing)
 *       • 🛣️ Road Expansion / New Road (Cyan line highlight)
 *       • 🛰️ Grounded AI Evidence Overlay (Sky blue polygon mask)
 *   - Interactive Mapbox Popups for clicked features (OSM attributes, areas, types, confidence)
 *   - Quick "Enable All OSM" / "Clear Overlays" controls
 *   - 3D Building Extrusion toggle & Opacity slider
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

// Layer color & styling definitions
const LAYER_STYLES = {
  water: {
    color: "#38bdf8",
    fillColor: "#38bdf8",
    fillOpacity: 0.4,
    strokeColor: "#0284c7",
    strokeWidth: 1.8,
    icon: "💧",
    label: "Water Bodies",
    sublabel: "JRC 10m & OSM Surface Water",
  },
  roads: {
    color: "#f59e0b",
    strokeColor: "#f59e0b",
    casingColor: "#0f172a",
    strokeWidth: 2.8,
    icon: "🛣️",
    label: "Roads & Highways",
    sublabel: "OSM Street & Arterial Network",
  },
  buildings: {
    color: "#fbbf24",
    fillColor: "#fbbf24",
    fillOpacity: 0.5,
    strokeColor: "#d97706",
    strokeWidth: 1.6,
    icon: "🏢",
    label: "Building Footprints",
    sublabel: "Google Open Buildings v3 & OSM",
  },
  vegetation: {
    color: "#10b981",
    fillColor: "#10b981",
    fillOpacity: 0.35,
    strokeColor: "#059669",
    strokeWidth: 1.5,
    icon: "🌳",
    label: "Vegetation & Canopy",
    sublabel: "ESA WorldCover 10m & Greens",
  },
  new_construction: {
    color: "#f43f5e",
    fillColor: "#f43f5e",
    fillOpacity: 0.55,
    strokeColor: "#be123c",
    strokeWidth: 2.2,
    icon: "🏗️",
    label: "New Construction",
    sublabel: "Detected Built-up Additions",
  },
  demolition: {
    color: "#f97316",
    fillColor: "#f97316",
    fillOpacity: 0.55,
    strokeColor: "#c2410c",
    strokeWidth: 2.0,
    icon: "⚠️",
    label: "Demolition / Clearing",
    sublabel: "Removed / Cleared Structures",
  },
  encroachment: {
    color: "#ea580c",
    fillColor: "#ea580c",
    fillOpacity: 0.55,
    strokeColor: "#9a3412",
    strokeWidth: 2.0,
    icon: "🚨",
    label: "Encroachment Alert",
    sublabel: "Unauthorized Zone Expansion",
  },
  vegetation_growth: {
    color: "#22c55e",
    fillColor: "#22c55e",
    fillOpacity: 0.5,
    strokeColor: "#15803d",
    strokeWidth: 2.0,
    icon: "🌲",
    label: "Vegetation Growth",
    sublabel: "Green Canopy Expansion",
  },
  deforestation: {
    color: "#ef4444",
    fillColor: "#ef4444",
    fillOpacity: 0.6,
    strokeColor: "#b91c1c",
    strokeWidth: 2.2,
    icon: "🪓",
    label: "Deforestation / Loss",
    sublabel: "Vegetation Loss & Clearing",
  },
  new_road: {
    color: "#06b6d4",
    strokeColor: "#06b6d4",
    casingColor: "#083344",
    strokeWidth: 3.0,
    icon: "🛣️",
    label: "Road Expansion",
    sublabel: "New Pavements & Corridors",
  },
};

export default function MapView({
  roi,
  onROIChange,
  evidenceGeojson,
  layerVisibility = {},
  onLayerToggle,
  layerData = {},
  showChangeTypes = false,
  uploadedImageOverlay,
}) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const draw = useRef(null);
  const fileInputRef = useRef(null);
  const popupRef = useRef(null);
  const onROIChangeRef = useRef(onROIChange);

  useEffect(() => {
    onROIChangeRef.current = onROIChange;
  });

  const [activeBasemap, setActiveBasemap] = useState("dark");
  const [is3D, setIs3D] = useState(false);
  const [enable3DExtrusion, setEnable3DExtrusion] = useState(true);
  const [layerOpacity, setLayerOpacity] = useState(0.8);
  const [isLayersCardOpen, setIsLayersCardOpen] = useState(true);
  const [activeTabLayerCard, setActiveTabLayerCard] = useState("osm"); // 'osm' | 'change'
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

  // Active layer counts
  const activeOSMCount = useMemo(() => {
    return ["water", "roads", "buildings", "vegetation"].filter(
      (k) => layerVisibility[k]
    ).length;
  }, [layerVisibility]);

  const activeChangeCount = useMemo(() => {
    return [
      "new_construction",
      "demolition",
      "encroachment",
      "vegetation_growth",
      "deforestation",
      "new_road",
    ].filter((k) => layerVisibility[k]).length;
  }, [layerVisibility]);

  // ── Sync ROI state with MapboxDraw ──────────────────────────────────────────
  useEffect(() => {
    if (roi) {
      setHasROI(true);
      if (draw.current && typeof draw.current.getAll === "function") {
        try {
          const existing = draw.current.getAll();
          if (existing && existing.features && existing.features.length === 0) {
            draw.current.add(roi);
          }
        } catch (e) {
          // ignore
        }
      }
    } else {
      setHasROI(false);
      if (draw.current && typeof draw.current.getAll === "function") {
        try {
          const existing = draw.current.getAll();
          if (existing && existing.features && existing.features.length > 0) {
            draw.current.deleteAll();
          }
        } catch (e) {
          // ignore
        }
      }
    }
  }, [roi]);

  // ── Initialize Mapbox ───────────────────────────────────────────────────────
  useEffect(() => {
    if (map.current) return;

    try {
      mapboxgl.accessToken = DEFAULT_MAPBOX_TOKEN;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [80.5, 15.9], // Andhra Pradesh region
        zoom: 7.2,
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
      map.current.addControl(
        new mapboxgl.NavigationControl({ showCompass: true }),
        "bottom-right"
      );

      const updateROI = () => {
        if (!draw.current || typeof draw.current.getAll !== "function") return;
        try {
          const data = draw.current.getAll();
          if (data && data.features && data.features.length > 0) {
            const geom = data.features[data.features.length - 1].geometry;
            onROIChangeRef.current?.(geom);
            setIsDrawing(false);
            setHasROI(true);
          } else {
            onROIChangeRef.current?.(null);
            setHasROI(false);
          }
        } catch (e) {
          // ignore
        }
      };

      map.current.on("draw.create", updateROI);
      map.current.on("draw.update", updateROI);
      map.current.on("draw.delete", updateROI);

      map.current.on("load", () => {
        syncLayersOnMap();
      });

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
  }, []);

  // ── Render / Sync Mapbox Vector & Thematic Layers ──────────────────────────
  const syncLayersOnMap = useCallback(() => {
    if (!map.current || !map.current.isStyleLoaded()) return;
    const m = map.current;

    // Helper to safely add or update GeoJSON layer
    const renderVectorLayer = (layerKey, geojson, config) => {
      const sourceId = `src-satquery-${layerKey}`;
      const fillLayerId = `layer-satquery-${layerKey}-fill`;
      const lineLayerId = `layer-satquery-${layerKey}-line`;
      const casingLayerId = `layer-satquery-${layerKey}-casing`;
      const extrudeLayerId = `layer-satquery-${layerKey}-3d`;

      const isVisible = !!layerVisibility[layerKey];
      const hasFeatures = geojson && geojson.features && geojson.features.length > 0;

      if (isVisible && hasFeatures) {
        // Source
        if (m.getSource(sourceId)) {
          m.getSource(sourceId).setData(geojson);
        } else {
          m.addSource(sourceId, { type: "geojson", data: geojson });
        }

        // 1. Roads (Dual Stroke LineStrings)
        if (layerKey === "roads" || layerKey === "new_road") {
          if (!m.getLayer(casingLayerId)) {
            m.addLayer({
              id: casingLayerId,
              type: "line",
              source: sourceId,
              paint: {
                "line-color": config.casingColor || "#0f172a",
                "line-width": (config.strokeWidth || 2.8) + 2,
                "line-opacity": layerOpacity,
              },
            });
          } else {
            m.setPaintProperty(casingLayerId, "line-opacity", layerOpacity);
          }

          if (!m.getLayer(lineLayerId)) {
            m.addLayer({
              id: lineLayerId,
              type: "line",
              source: sourceId,
              paint: {
                "line-color": config.strokeColor || "#f59e0b",
                "line-width": config.strokeWidth || 2.8,
                "line-opacity": layerOpacity,
              },
            });
          } else {
            m.setPaintProperty(lineLayerId, "line-opacity", layerOpacity);
          }
        }
        // 2. Buildings (with optional 3D extrusion)
        else if (layerKey === "buildings" && enable3DExtrusion && is3D) {
          // Remove 2D fill if switching to 3D
          if (m.getLayer(fillLayerId)) m.removeLayer(fillLayerId);

          if (!m.getLayer(extrudeLayerId)) {
            m.addLayer({
              id: extrudeLayerId,
              type: "fill-extrusion",
              source: sourceId,
              paint: {
                "fill-extrusion-color": config.fillColor || "#fbbf24",
                "fill-extrusion-height": [
                  "coalesce",
                  ["get", "height"],
                  ["*", ["get", "levels"], 3.5],
                  18,
                ],
                "fill-extrusion-base": 0,
                "fill-extrusion-opacity": layerOpacity * 0.9,
              },
            });
          } else {
            m.setPaintProperty(extrudeLayerId, "fill-extrusion-opacity", layerOpacity * 0.9);
          }
        }
        // 3. Polygons (Water, Vegetation, Buildings 2D, Change categories)
        else {
          if (m.getLayer(extrudeLayerId)) m.removeLayer(extrudeLayerId);

          if (!m.getLayer(fillLayerId)) {
            m.addLayer({
              id: fillLayerId,
              type: "fill",
              source: sourceId,
              paint: {
                "fill-color": config.fillColor || "#38bdf8",
                "fill-opacity": (config.fillOpacity || 0.4) * layerOpacity,
              },
            });
          } else {
            m.setPaintProperty(
              fillLayerId,
              "fill-opacity",
              (config.fillOpacity || 0.4) * layerOpacity
            );
          }

          if (!m.getLayer(lineLayerId)) {
            m.addLayer({
              id: lineLayerId,
              type: "line",
              source: sourceId,
              paint: {
                "line-color": config.strokeColor || "#0284c7",
                "line-width": config.strokeWidth || 1.8,
                "line-opacity": layerOpacity,
              },
            });
          } else {
            m.setPaintProperty(lineLayerId, "line-opacity", layerOpacity);
          }
        }

        // Attach popup & hover listeners for this layer
        const clickableLayer =
          m.getLayer(fillLayerId) || m.getLayer(lineLayerId) || m.getLayer(extrudeLayerId);
        if (clickableLayer) {
          const targetId = clickableLayer.id;
          m.off("click", targetId, handleFeatureClick);
          m.on("click", targetId, handleFeatureClick);

          m.on("mouseenter", targetId, () => {
            m.getCanvas().style.cursor = "pointer";
          });
          m.on("mouseleave", targetId, () => {
            m.getCanvas().style.cursor = "";
          });
        }
      } else {
        // Clean up when toggled off
        if (m.getLayer(extrudeLayerId)) m.removeLayer(extrudeLayerId);
        if (m.getLayer(fillLayerId)) m.removeLayer(fillLayerId);
        if (m.getLayer(lineLayerId)) m.removeLayer(lineLayerId);
        if (m.getLayer(casingLayerId)) m.removeLayer(casingLayerId);
        if (m.getSource(sourceId)) m.removeSource(sourceId);
      }
    };

    // Render all thematic OSM and Change layers
    Object.entries(LAYER_STYLES).forEach(([key, cfg]) => {
      const gData = layerData[key]?.geojson;
      renderVectorLayer(key, gData, cfg);
    });

    // Render Grounded Evidence Overlay
    const evidenceSourceId = "src-satquery-grounded-evidence";
    const evidenceFillId = "layer-satquery-grounded-evidence-fill";
    const evidenceLineId = "layer-satquery-grounded-evidence-line";

    if (evidenceGeojson && evidenceGeojson.features?.length > 0) {
      if (m.getSource(evidenceSourceId)) {
        m.getSource(evidenceSourceId).setData(evidenceGeojson);
      } else {
        m.addSource(evidenceSourceId, { type: "geojson", data: evidenceGeojson });
        m.addLayer({
          id: evidenceFillId,
          type: "fill",
          source: evidenceSourceId,
          paint: { "fill-color": "#38bdf8", "fill-opacity": 0.28 * layerOpacity },
        });
        m.addLayer({
          id: evidenceLineId,
          type: "line",
          source: evidenceSourceId,
          paint: { "line-color": "#38bdf8", "line-width": 2, "line-opacity": layerOpacity },
        });

        m.on("click", evidenceFillId, handleFeatureClick);
        m.on("mouseenter", evidenceFillId, () => {
          m.getCanvas().style.cursor = "pointer";
        });
        m.on("mouseleave", evidenceFillId, () => {
          m.getCanvas().style.cursor = "";
        });
      }
    } else {
      if (m.getLayer(evidenceFillId)) m.removeLayer(evidenceFillId);
      if (m.getLayer(evidenceLineId)) m.removeLayer(evidenceLineId);
      if (m.getSource(evidenceSourceId)) m.removeSource(evidenceSourceId);
    }

    // Render Uploaded Image Overlay (GeoTIFF / preview)
    const uploadSourceId = "src-satquery-uploaded-raster";
    const uploadLayerId = "layer-satquery-uploaded-raster";

    if (uploadedImageOverlay && uploadedImageOverlay.url && uploadedImageOverlay.corners) {
      if (!m.getSource(uploadSourceId)) {
        m.addSource(uploadSourceId, {
          type: "image",
          url: uploadedImageOverlay.url,
          coordinates: uploadedImageOverlay.corners,
        });
        m.addLayer({
          id: uploadLayerId,
          type: "raster",
          source: uploadSourceId,
          paint: { "raster-opacity": layerOpacity },
        });
      } else {
        if (m.getLayer(uploadLayerId)) {
          m.setPaintProperty(uploadLayerId, "raster-opacity", layerOpacity);
        }
      }
    } else {
      if (m.getLayer(uploadLayerId)) m.removeLayer(uploadLayerId);
      if (m.getSource(uploadSourceId)) m.removeSource(uploadSourceId);
    }
  }, [layerVisibility, layerData, evidenceGeojson, uploadedImageOverlay, is3D, enable3DExtrusion, layerOpacity]);

  // Click feature popup handler
  const handleFeatureClick = useCallback((e) => {
    if (!e.features || e.features.length === 0 || !map.current) return;
    const feat = e.features[0];
    const props = feat.properties || {};

    const name = props.name || props.title || props.osm_id || "Spatial Feature";
    const highway = props.highway;
    const building = props.building;
    const natural = props.natural;
    const landuse = props.landuse;
    const changeType = props.change_type;
    const areaSqM = props.area_sq_m || props.area;
    const confidence = props.confidence ? `${(props.confidence * 100).toFixed(0)}%` : null;

    let catBadge = "OSM Vector";
    let catColor = "#38bdf8";
    if (highway) {
      catBadge = `Highway (${highway})`;
      catColor = "#f59e0b";
    } else if (building) {
      catBadge = `Building (${building})`;
      catColor = "#fbbf24";
    } else if (natural || landuse) {
      catBadge = `Land Cover (${natural || landuse})`;
      catColor = "#10b981";
    } else if (changeType) {
      catBadge = `Change: ${changeType.replace(/_/g, " ")}`;
      catColor = "#f43f5e";
    }

    const popupHtml = `
      <div class="gis-feature-popup-card">
        <div class="gis-popup-header">
          <span class="gis-popup-badge" style="background: ${catColor}20; color: ${catColor}; border: 1px solid ${catColor}50;">
            ${catBadge}
          </span>
          <span class="gis-popup-coords">${e.lngLat.lat.toFixed(4)}°N, ${e.lngLat.lng.toFixed(4)}°E</span>
        </div>
        <div class="gis-popup-title">${name}</div>
        <div class="gis-popup-body">
          ${props.osm_id ? `<div class="gis-popup-row"><span>OSM ID:</span><strong>#${props.osm_id}</strong></div>` : ""}
          ${props.lanes ? `<div class="gis-popup-row"><span>Lanes:</span><strong>${props.lanes}</strong></div>` : ""}
          ${props.levels ? `<div class="gis-popup-row"><span>Stories:</span><strong>${props.levels} floors</strong></div>` : ""}
          ${props.height ? `<div class="gis-popup-row"><span>Height:</span><strong>${props.height} m</strong></div>` : ""}
          ${areaSqM ? `<div class="gis-popup-row"><span>Area:</span><strong>${Number(areaSqM).toLocaleString()} m²</strong></div>` : ""}
          ${confidence ? `<div class="gis-popup-row"><span>AI Confidence:</span><strong style="color: #34d399;">${confidence}</strong></div>` : ""}
          ${props.description ? `<div class="gis-popup-desc">${props.description}</div>` : ""}
        </div>
      </div>
    `;

    if (popupRef.current) popupRef.current.remove();

    popupRef.current = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: "320px",
      className: "gis-custom-dark-popup",
    })
      .setLngLat(e.lngLat)
      .setHTML(popupHtml)
      .addTo(map.current);
  }, []);

  // Sync layers when data or visibility changes
  useEffect(() => {
    syncLayersOnMap();
  }, [syncLayersOnMap]);

  // Auto-fit map viewport to uploaded satellite image when provided
  useEffect(() => {
    if (uploadedImageOverlay && uploadedImageOverlay.bounds && map.current) {
      const [w, s, e, n] = uploadedImageOverlay.bounds;
      try {
        map.current.fitBounds(
          [
            [w, s],
            [e, n],
          ],
          { padding: 60, duration: 1500, maxZoom: 16 }
        );
      } catch (err) {
        console.warn("fitBounds failed for uploaded image overlay:", err);
      }
    }
  }, [uploadedImageOverlay]);

  // Handle Basemap Change
  const handleBasemapSelect = (bm) => {
    setActiveBasemap(bm.id);
    if (map.current) {
      map.current.setStyle(bm.style);
      map.current.once("style.load", () => {
        syncLayersOnMap();
        if (draw.current && roi) {
          try {
            draw.current.deleteAll();
            draw.current.add(roi);
          } catch (e) {
            // ignore
          }
        }
      });
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

  // Enable/Disable All OSM Layers shortcut
  const handleToggleAllOSM = (enable) => {
    ["water", "roads", "buildings", "vegetation"].forEach((layerName) => {
      if (!!layerVisibility[layerName] !== enable) {
        onLayerToggle?.(layerName);
      }
    });
  };

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

      {/* ── FLOATING GIS & OSM VECTOR LAYERS CONTROL CARD ─────────────────── */}
      <div className={`gis-overlay-card gis-layers-card ${!isLayersCardOpen ? "gis-layers-card--minimized" : ""}`}>
        <div className="gis-card-header" onClick={() => setIsLayersCardOpen(!isLayersCardOpen)}>
          <div className="gis-card-header-left">
            <span className="gis-card-icon">🗂️</span>
            <div>
              <div className="gis-card-title">GIS & OSM Overlays</div>
              <div className="gis-card-subtitle">
                {activeOSMCount + activeChangeCount > 0
                  ? `${activeOSMCount + activeChangeCount} Active Vector Layers`
                  : "Toggle Map Features & Highlights"}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="gis-card-toggle-btn"
            aria-label={isLayersCardOpen ? "Collapse Layers" : "Expand Layers"}
          >
            {isLayersCardOpen ? "▲" : "▼"}
          </button>
        </div>

        {isLayersCardOpen && (
          <div className="gis-layers-card-body">
            {/* Quick Action Navigation Tabs */}
            <div className="gis-layer-tabs">
              <button
                type="button"
                className={`gis-layer-tab ${activeTabLayerCard === "osm" ? "active" : ""}`}
                onClick={() => setActiveTabLayerCard("osm")}
              >
                🌐 OSM & Thematic ({activeOSMCount})
              </button>
              <button
                type="button"
                className={`gis-layer-tab ${activeTabLayerCard === "change" ? "active" : ""}`}
                onClick={() => setActiveTabLayerCard("change")}
              >
                ⚡ Change Highlights ({activeChangeCount})
              </button>
            </div>

            {/* TAB 1: OSM & THEMATIC VECTOR LAYERS */}
            {activeTabLayerCard === "osm" && (
              <div className="gis-layer-section">
                <div className="gis-layer-section-actions">
                  <span className="gis-section-label">THEMATIC VECTOR LAYERS</span>
                  <div className="gis-quick-btns">
                    <button
                      type="button"
                      className="gis-mini-btn"
                      onClick={() => handleToggleAllOSM(true)}
                      title="Enable all 4 OSM thematic layers"
                    >
                      All On
                    </button>
                    <button
                      type="button"
                      className="gis-mini-btn"
                      onClick={() => handleToggleAllOSM(false)}
                      title="Turn off all OSM layers"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="gis-semantic-list">
                  {/* WATER */}
                  <div className={`gis-semantic-row ${layerVisibility.water ? "active" : ""}`}>
                    <div className="gis-semantic-meta">
                      <span className="gis-color-bullet" style={{ background: LAYER_STYLES.water.color }} />
                      <div className="gis-layer-info">
                        <div className="gis-layer-txt">
                          <span className="gis-layer-icon">{LAYER_STYLES.water.icon}</span>
                          <strong>{LAYER_STYLES.water.label}</strong>
                          {layerData.water?.geojson?.features?.length > 0 && (
                            <span className="gis-feature-badge">
                              {layerData.water.geojson.features.length} bodies
                            </span>
                          )}
                        </div>
                        <div className="gis-layer-sub">{LAYER_STYLES.water.sublabel}</div>
                      </div>
                    </div>
                    <label className="semantic-switch" title="Toggle Water layer">
                      <input
                        type="checkbox"
                        checked={!!layerVisibility.water}
                        onChange={() => onLayerToggle?.("water")}
                      />
                      <span className="switch-slider" />
                    </label>
                  </div>

                  {/* ROADS */}
                  <div className={`gis-semantic-row ${layerVisibility.roads ? "active" : ""}`}>
                    <div className="gis-semantic-meta">
                      <span className="gis-color-bullet" style={{ background: LAYER_STYLES.roads.color }} />
                      <div className="gis-layer-info">
                        <div className="gis-layer-txt">
                          <span className="gis-layer-icon">{LAYER_STYLES.roads.icon}</span>
                          <strong>{LAYER_STYLES.roads.label}</strong>
                          {layerData.roads?.geojson?.features?.length > 0 && (
                            <span className="gis-feature-badge">
                              {layerData.roads.geojson.features.length} ways
                            </span>
                          )}
                        </div>
                        <div className="gis-layer-sub">{LAYER_STYLES.roads.sublabel}</div>
                      </div>
                    </div>
                    <label className="semantic-switch" title="Toggle Roads layer">
                      <input
                        type="checkbox"
                        checked={!!layerVisibility.roads}
                        onChange={() => onLayerToggle?.("roads")}
                      />
                      <span className="switch-slider" />
                    </label>
                  </div>

                  {/* BUILDINGS */}
                  <div className={`gis-semantic-row ${layerVisibility.buildings ? "active" : ""}`}>
                    <div className="gis-semantic-meta">
                      <span className="gis-color-bullet" style={{ background: LAYER_STYLES.buildings.color }} />
                      <div className="gis-layer-info">
                        <div className="gis-layer-txt">
                          <span className="gis-layer-icon">{LAYER_STYLES.buildings.icon}</span>
                          <strong>{LAYER_STYLES.buildings.label}</strong>
                          {layerData.buildings?.geojson?.features?.length > 0 && (
                            <span className="gis-feature-badge">
                              {layerData.buildings.geojson.features.length} footprint
                            </span>
                          )}
                        </div>
                        <div className="gis-layer-sub">{LAYER_STYLES.buildings.sublabel}</div>
                      </div>
                    </div>
                    <label className="semantic-switch" title="Toggle Buildings layer">
                      <input
                        type="checkbox"
                        checked={!!layerVisibility.buildings}
                        onChange={() => onLayerToggle?.("buildings")}
                      />
                      <span className="switch-slider" />
                    </label>
                  </div>

                  {/* VEGETATION */}
                  <div className={`gis-semantic-row ${layerVisibility.vegetation ? "active" : ""}`}>
                    <div className="gis-semantic-meta">
                      <span className="gis-color-bullet" style={{ background: LAYER_STYLES.vegetation.color }} />
                      <div className="gis-layer-info">
                        <div className="gis-layer-txt">
                          <span className="gis-layer-icon">{LAYER_STYLES.vegetation.icon}</span>
                          <strong>{LAYER_STYLES.vegetation.label}</strong>
                          {layerData.vegetation?.geojson?.features?.length > 0 && (
                            <span className="gis-feature-badge">
                              {layerData.vegetation.geojson.features.length} zones
                            </span>
                          )}
                        </div>
                        <div className="gis-layer-sub">{LAYER_STYLES.vegetation.sublabel}</div>
                      </div>
                    </div>
                    <label className="semantic-switch" title="Toggle Vegetation layer">
                      <input
                        type="checkbox"
                        checked={!!layerVisibility.vegetation}
                        onChange={() => onLayerToggle?.("vegetation")}
                      />
                      <span className="switch-slider" />
                    </label>
                  </div>
                </div>

                {/* 3D Extrusion & Layer Controls */}
                <div className="gis-layer-aux-controls">
                  <div className="gis-aux-row">
                    <span className="gis-aux-label">🏢 3D Building Extrusion</span>
                    <input
                      type="checkbox"
                      checked={enable3DExtrusion}
                      onChange={(e) => setEnable3DExtrusion(e.target.checked)}
                      className="gis-checkbox"
                    />
                  </div>
                  <div className="gis-aux-row">
                    <span className="gis-aux-label">Overlay Opacity ({Math.round(layerOpacity * 100)}%)</span>
                    <input
                      type="range"
                      min="0.2"
                      max="1.0"
                      step="0.05"
                      value={layerOpacity}
                      onChange={(e) => setLayerOpacity(parseFloat(e.target.value))}
                      className="gis-range-slider"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CHANGE HIGHLIGHTS & DETECTION */}
            {activeTabLayerCard === "change" && (
              <div className="gis-layer-section">
                <div className="gis-section-label">CHANGE DETECTION VECTORS</div>
                <div className="gis-semantic-list">
                  {/* NEW CONSTRUCTION */}
                  <div className={`gis-semantic-row ${layerVisibility.new_construction ? "active" : ""}`}>
                    <div className="gis-semantic-meta">
                      <span className="gis-color-bullet" style={{ background: LAYER_STYLES.new_construction.color }} />
                      <div className="gis-layer-info">
                        <div className="gis-layer-txt">
                          <span className="gis-layer-icon">{LAYER_STYLES.new_construction.icon}</span>
                          <strong>{LAYER_STYLES.new_construction.label}</strong>
                          {layerData.new_construction?.geojson?.features?.length > 0 && (
                            <span className="gis-feature-badge gis-feature-badge--danger">
                              {layerData.new_construction.geojson.features.length} spots
                            </span>
                          )}
                        </div>
                        <div className="gis-layer-sub">{LAYER_STYLES.new_construction.sublabel}</div>
                      </div>
                    </div>
                    <label className="semantic-switch" title="Toggle New Construction highlight">
                      <input
                        type="checkbox"
                        checked={!!layerVisibility.new_construction}
                        onChange={() => onLayerToggle?.("new_construction")}
                      />
                      <span className="switch-slider" />
                    </label>
                  </div>

                  {/* DEMOLITION */}
                  <div className={`gis-semantic-row ${layerVisibility.demolition ? "active" : ""}`}>
                    <div className="gis-semantic-meta">
                      <span className="gis-color-bullet" style={{ background: LAYER_STYLES.demolition.color }} />
                      <div className="gis-layer-info">
                        <div className="gis-layer-txt">
                          <span className="gis-layer-icon">{LAYER_STYLES.demolition.icon}</span>
                          <strong>{LAYER_STYLES.demolition.label}</strong>
                          {layerData.demolition?.geojson?.features?.length > 0 && (
                            <span className="gis-feature-badge gis-feature-badge--warn">
                              {layerData.demolition.geojson.features.length} areas
                            </span>
                          )}
                        </div>
                        <div className="gis-layer-sub">{LAYER_STYLES.demolition.sublabel}</div>
                      </div>
                    </div>
                    <label className="semantic-switch" title="Toggle Demolition highlight">
                      <input
                        type="checkbox"
                        checked={!!layerVisibility.demolition}
                        onChange={() => onLayerToggle?.("demolition")}
                      />
                      <span className="switch-slider" />
                    </label>
                  </div>

                  {/* VEGETATION GROWTH */}
                  <div className={`gis-semantic-row ${layerVisibility.vegetation_growth ? "active" : ""}`}>
                    <div className="gis-semantic-meta">
                      <span className="gis-color-bullet" style={{ background: LAYER_STYLES.vegetation_growth.color }} />
                      <div className="gis-layer-info">
                        <div className="gis-layer-txt">
                          <span className="gis-layer-icon">{LAYER_STYLES.vegetation_growth.icon}</span>
                          <strong>{LAYER_STYLES.vegetation_growth.label}</strong>
                          {layerData.vegetation_growth?.geojson?.features?.length > 0 && (
                            <span className="gis-feature-badge gis-feature-badge--success">
                              {layerData.vegetation_growth.geojson.features.length} areas
                            </span>
                          )}
                        </div>
                        <div className="gis-layer-sub">{LAYER_STYLES.vegetation_growth.sublabel}</div>
                      </div>
                    </div>
                    <label className="semantic-switch" title="Toggle Vegetation Growth">
                      <input
                        type="checkbox"
                        checked={!!layerVisibility.vegetation_growth}
                        onChange={() => onLayerToggle?.("vegetation_growth")}
                      />
                      <span className="switch-slider" />
                    </label>
                  </div>

                  {/* DEFORESTATION */}
                  <div className={`gis-semantic-row ${layerVisibility.deforestation ? "active" : ""}`}>
                    <div className="gis-semantic-meta">
                      <span className="gis-color-bullet" style={{ background: LAYER_STYLES.deforestation.color }} />
                      <div className="gis-layer-info">
                        <div className="gis-layer-txt">
                          <span className="gis-layer-icon">{LAYER_STYLES.deforestation.icon}</span>
                          <strong>{LAYER_STYLES.deforestation.label}</strong>
                          {layerData.deforestation?.geojson?.features?.length > 0 && (
                            <span className="gis-feature-badge gis-feature-badge--danger">
                              {layerData.deforestation.geojson.features.length} zones
                            </span>
                          )}
                        </div>
                        <div className="gis-layer-sub">{LAYER_STYLES.deforestation.sublabel}</div>
                      </div>
                    </div>
                    <label className="semantic-switch" title="Toggle Deforestation">
                      <input
                        type="checkbox"
                        checked={!!layerVisibility.deforestation}
                        onChange={() => onLayerToggle?.("deforestation")}
                      />
                      <span className="switch-slider" />
                    </label>
                  </div>

                  {/* ROAD EXPANSION */}
                  <div className={`gis-semantic-row ${layerVisibility.new_road ? "active" : ""}`}>
                    <div className="gis-semantic-meta">
                      <span className="gis-color-bullet" style={{ background: LAYER_STYLES.new_road.color }} />
                      <div className="gis-layer-info">
                        <div className="gis-layer-txt">
                          <span className="gis-layer-icon">{LAYER_STYLES.new_road.icon}</span>
                          <strong>{LAYER_STYLES.new_road.label}</strong>
                          {layerData.new_road?.geojson?.features?.length > 0 && (
                            <span className="gis-feature-badge">
                              {layerData.new_road.geojson.features.length} corridors
                            </span>
                          )}
                        </div>
                        <div className="gis-layer-sub">{LAYER_STYLES.new_road.sublabel}</div>
                      </div>
                    </div>
                    <label className="semantic-switch" title="Toggle Road Expansion">
                      <input
                        type="checkbox"
                        checked={!!layerVisibility.new_road}
                        onChange={() => onLayerToggle?.("new_road")}
                      />
                      <span className="switch-slider" />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
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
