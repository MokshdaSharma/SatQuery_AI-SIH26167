/**
 * ChangeDetectionStudio.jsx — Dedicated Bi-Temporal Change Detection,
 * Multi-Class Semantic Segmentation, Discrete Region Labeling & Analytics Studio.
 *
 * Capabilities:
 *  - Upload two georeferenced satellite images (Epoch 1 & Epoch 2)
 *  - Multi-class change segmentation (New Construction, Demolition, Vegetation Growth, Deforestation, Water Inundation)
 *  - Interactive Curtain/Split slider, Synchronized Side-by-Side, and Transparent Mask Overlay
 *  - Discrete region extraction with coordinates, area (m², ha), confidence %, and descriptive labels
 *  - Interactive SVG polygon & bounding box hover/click inspector
 *  - 1-Click "Map to GIS" integration to overlay change polygons on Mapbox
 *  - Export GeoJSON and report dossier
 */

import React, { useState, useRef, useEffect } from "react";
import { detectBiTemporalChanges, uploadImage } from "../api";
import FormattedAnswer from "./FormattedAnswer";

const CHANGE_CATEGORIES = [
  { id: "all", label: "All Changes", icon: "🌐", color: "#38BDF8" },
  { id: "new_construction", label: "New Construction", icon: "🏗️", color: "#EF4444" },
  { id: "demolition", label: "Demolition", icon: "🏚️", color: "#F97316" },
  { id: "vegetation_growth", label: "Vegetation Growth", icon: "🌿", color: "#10B981" },
  { id: "deforestation", label: "Deforestation", icon: "🪓", color: "#B45309" },
  { id: "water_inundation", label: "Water / Flood", icon: "💧", color: "#06B6D4" },
];

export default function ChangeDetectionStudio({
  onMapChangeData,
  onNavigateToMapping,
  addToast,
}) {
  // Epoch 1 (Before) State
  const [file1, setFile1] = useState(null);
  const [imageId1, setImageId1] = useState(null);
  const [preview1, setPreview1] = useState(null);
  const [date1, setDate1] = useState("2020-03-15");
  const [name1, setName1] = useState("");
  const [isUploading1, setIsUploading1] = useState(false);

  // Epoch 2 (After) State
  const [file2, setFile2] = useState(null);
  const [imageId2, setImageId2] = useState(null);
  const [preview2, setPreview2] = useState(null);
  const [date2, setDate2] = useState("2024-03-15");
  const [name2, setName2] = useState("");
  const [isUploading2, setIsUploading2] = useState(false);

  // Analysis & Results State
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultData, setResultData] = useState(null);
  const [error, setError] = useState(null);

  // Visualization Controls
  const [viewMode, setViewMode] = useState("slider"); // "slider" | "overlay" | "side_by_side" | "diff"
  const [sliderPos, setSliderPos] = useState(50);
  const [maskOpacity, setMaskOpacity] = useState(70);
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedRegionId, setSelectedRegionId] = useState(null);
  const [hoveredRegionId, setHoveredRegionId] = useState(null);
  const [showLabelsOnImage, setShowLabelsOnImage] = useState(true);

  const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  const fileInputRef1 = useRef(null);
  const fileInputRef2 = useRef(null);

  const resolveUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:") || url.startsWith("data:")) {
      return url;
    }
    const base = BASE_URL.replace(/\/+$/, "");
    const path = url.startsWith("/") ? url : `/${url}`;
    return `${base}${path}`;
  };

  // Handle File 1 Selection & Instant GeoTIFF Preview Generation
  const handleSelectFile1 = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFile1(file);
    setName1(file.name);
    setIsUploading1(true);
    setError(null);

    // If it's a standard web image (png/jpg), show local preview immediately
    if (!file.name.toLowerCase().endsWith(".tif") && !file.name.toLowerCase().endsWith(".tiff")) {
      setPreview1(URL.createObjectURL(file));
    }

    try {
      const res = await uploadImage(file);
      if (res && res.image_id) {
        setImageId1(res.image_id);
        if (res.preview_url) {
          setPreview1(resolveUrl(res.preview_url));
        }
      }
    } catch (err) {
      console.warn("Upload preview generation warning:", err);
    } finally {
      setIsUploading1(false);
    }
  };

  // Handle File 2 Selection & Instant GeoTIFF Preview Generation
  const handleSelectFile2 = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFile2(file);
    setName2(file.name);
    setIsUploading2(true);
    setError(null);

    if (!file.name.toLowerCase().endsWith(".tif") && !file.name.toLowerCase().endsWith(".tiff")) {
      setPreview2(URL.createObjectURL(file));
    }

    try {
      const res = await uploadImage(file);
      if (res && res.image_id) {
        setImageId2(res.image_id);
        if (res.preview_url) {
          setPreview2(resolveUrl(res.preview_url));
        }
      }
    } catch (err) {
      console.warn("Upload preview generation warning:", err);
    } finally {
      setIsUploading2(false);
    }
  };

  // Quick-load demo synthetic pair
  const handleLoadDemo = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const res = await detectBiTemporalChanges({
        date1: "2020-03-15",
        date2: "2024-03-15",
        query: "Detect and segment new construction, road expansion, and forest clearing.",
      });
      setResultData(res);
      setDate1(res.date_t1 || "2020-03-15");
      setDate2(res.date_t2 || "2024-03-15");
      setName1("demo_baseline_2020.tif");
      setName2("demo_target_2024.tif");
      if (res.image_1?.preview_url) setPreview1(resolveUrl(res.image_1.preview_url));
      if (res.image_2?.preview_url) setPreview2(resolveUrl(res.image_2.preview_url));
      addToast?.("Loaded sample bi-temporal satellite dataset with detected changes.", "success");
    } catch (err) {
      setError(err.message || "Failed to load sample dataset.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Run Change Detection
  const handleRunAnalysis = async () => {
    if (!file1 && !file2 && !imageId1 && !imageId2 && !resultData) {
      await handleLoadDemo();
      return;
    }

    setIsProcessing(true);
    setProgress(10);
    setError(null);

    try {
      const res = await detectBiTemporalChanges({
        file1: imageId1 ? null : file1,
        file2: imageId2 ? null : file2,
        imageId1,
        imageId2,
        date1,
        date2,
        query: "Detect all land cover transitions, new construction, and deforestation.",
        onProgress: (pct) => setProgress(pct),
      });
      setResultData(res);
      if (res.image_1?.preview_url) setPreview1(resolveUrl(res.image_1.preview_url));
      if (res.image_2?.preview_url) setPreview2(resolveUrl(res.image_2.preview_url));
      addToast?.(
        `Analysis complete! Detected ${res.detected_regions?.length || 0} discrete change regions (${res.total_changed_ha} ha).`,
        "success"
      );
    } catch (err) {
      setError(err.message || "Change detection pipeline encountered an error.");
      addToast?.(err.message || "Change detection failed.", "error");
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleClear = () => {
    setFile1(null);
    setFile2(null);
    setPreview1(null);
    setPreview2(null);
    setName1("");
    setName2("");
    setResultData(null);
    setError(null);
    setSelectedRegionId(null);
  };

  // Map to GIS Mapbox View
  const handleMapToGIS = () => {
    if (!resultData) return;
    if (onMapChangeData) {
      onMapChangeData({
        session_id: resultData.session_id,
        date_t1: resultData.date_t1,
        date_t2: resultData.date_t2,
        geo_bounds: resultData.geo_bounds,
        map_corners: resultData.map_corners,
        change_mask_url: `${BASE_URL}${resultData.change_mask_url}`,
        evidence_geojson: resultData.evidence_geojson,
        detected_regions: resultData.detected_regions,
        total_changed_ha: resultData.total_changed_ha,
      });
    }
    if (onNavigateToMapping) {
      onNavigateToMapping();
    }
    addToast?.("Mapped bi-temporal change layers and polygons directly onto GIS Map!", "success");
  };

  // Filtered detected regions
  const filteredRegions = (resultData?.detected_regions || []).filter(
    (r) => activeCategory === "all" || r.category === activeCategory
  );

  const selectedRegion = (resultData?.detected_regions || []).find((r) => r.id === selectedRegionId);

  return (
    <div className="change-studio-root" style={{ minHeight: "calc(100vh - 56px)", background: "#0a0f1d", color: "#e2e8f0", padding: "20px 24px" }}>
      {/* ── Top Header Bar ────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>🔄</span>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#f8fafc", letterSpacing: "-0.02em" }}>
              Bi-Temporal Change Detection & Segmentation Studio
            </h1>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", borderRadius: 12, border: "1px solid rgba(56, 189, 248, 0.3)" }}>
              AI Vision & GIS
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
            Upload two georeferenced satellite images (GeoTIFF/PNG) of different timelines to detect, segment, highlight, and label structural and environmental changes.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="btn"
            onClick={handleLoadDemo}
            style={{ background: "rgba(30, 41, 59, 0.8)", border: "1px solid rgba(148, 163, 184, 0.2)", color: "#93c5fd", fontSize: 12, padding: "7px 14px", borderRadius: 6 }}
          >
            ⚡ Load Sample Demo
          </button>
          {resultData && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleMapToGIS}
              style={{ fontSize: 12, padding: "7px 14px", borderRadius: 6, display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, #0284c7, #2563eb)" }}
            >
              🗺️ Map Changes to GIS View
            </button>
          )}
          {(file1 || file2 || resultData) && (
            <button
              type="button"
              className="btn"
              onClick={handleClear}
              style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#fca5a5", fontSize: 12, padding: "7px 12px", borderRadius: 6 }}
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Main Layout Grid ───────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: resultData ? "340px 1fr 360px" : "1fr 1fr", gap: 20 }}>
        
        {/* ── COLUMN 1: Image Ingestion & Parameters ─────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          
          {/* Epoch 1 Box */}
          <div style={{ background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: 10, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13, color: "#38bdf8" }}>
                <span>📅</span> Epoch 1 (T1 — Baseline / Before)
              </div>
              <input
                type="date"
                value={date1}
                onChange={(e) => setDate1(e.target.value)}
                style={{ background: "#1e293b", border: "1px solid #334155", color: "#f1f5f9", fontSize: 11, padding: "3px 6px", borderRadius: 4 }}
              />
            </div>

            <input
              type="file"
              ref={fileInputRef1}
              style={{ display: "none" }}
              accept=".tif,.tiff,.png,.jpg,.jpeg,.jp2"
              onChange={handleSelectFile1}
            />

            {isUploading1 ? (
              <div style={{ height: 140, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(15, 23, 42, 0.9)", borderRadius: 6, gap: 8, border: "1px solid rgba(56, 189, 248, 0.3)" }}>
                <span className="spinner" style={{ width: 22, height: 22, borderWidth: 2 }} />
                <span style={{ fontSize: 11, color: "#38bdf8", fontWeight: 600 }}>Processing & Rendering GeoTIFF…</span>
              </div>
            ) : preview1 ? (
              <div style={{ position: "relative", borderRadius: 6, overflow: "hidden", border: "1px solid #334155", background: "#020617" }}>
                <img
                  src={preview1}
                  alt="Epoch 1"
                  style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(15, 23, 42, 0.85)", padding: "4px 8px", fontSize: 11, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180, color: "#f1f5f9" }}>{name1 || "Epoch 1 Image"}</span>
                  <button type="button" onClick={() => fileInputRef1.current?.click()} style={{ background: "transparent", border: "none", color: "#38bdf8", cursor: "pointer", fontSize: 11 }}>
                    Change
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef1.current?.click()}
                style={{
                  height: 120,
                  border: "1.5px dashed rgba(56, 189, 248, 0.35)",
                  borderRadius: 6,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  background: "rgba(56, 189, 248, 0.03)",
                  transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: 24 }}>📤</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginTop: 4 }}>Upload Baseline Satellite Image</span>
                <span style={{ fontSize: 10, color: "#64748b" }}>GeoTIFF (.tif) or PNG / JPEG</span>
              </div>
            )}
          </div>

          {/* Epoch 2 Box */}
          <div style={{ background: "rgba(15, 23, 42, 0.75)", border: "1px solid rgba(168, 85, 247, 0.2)", borderRadius: 10, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13, color: "#c084fc" }}>
                <span>📅</span> Epoch 2 (T2 — Target / After)
              </div>
              <input
                type="date"
                value={date2}
                onChange={(e) => setDate2(e.target.value)}
                style={{ background: "#1e293b", border: "1px solid #334155", color: "#f1f5f9", fontSize: 11, padding: "3px 6px", borderRadius: 4 }}
              />
            </div>

            <input
              type="file"
              ref={fileInputRef2}
              style={{ display: "none" }}
              accept=".tif,.tiff,.png,.jpg,.jpeg,.jp2"
              onChange={handleSelectFile2}
            />

            {isUploading2 ? (
              <div style={{ height: 140, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(15, 23, 42, 0.9)", borderRadius: 6, gap: 8, border: "1px solid rgba(168, 85, 247, 0.3)" }}>
                <span className="spinner" style={{ width: 22, height: 22, borderWidth: 2 }} />
                <span style={{ fontSize: 11, color: "#c084fc", fontWeight: 600 }}>Processing & Rendering GeoTIFF…</span>
              </div>
            ) : preview2 ? (
              <div style={{ position: "relative", borderRadius: 6, overflow: "hidden", border: "1px solid #334155", background: "#020617" }}>
                <img
                  src={preview2}
                  alt="Epoch 2"
                  style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(15, 23, 42, 0.85)", padding: "4px 8px", fontSize: 11, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180, color: "#f1f5f9" }}>{name2 || "Epoch 2 Image"}</span>
                  <button type="button" onClick={() => fileInputRef2.current?.click()} style={{ background: "transparent", border: "none", color: "#c084fc", cursor: "pointer", fontSize: 11 }}>
                    Change
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef2.current?.click()}
                style={{
                  height: 120,
                  border: "1.5px dashed rgba(168, 85, 247, 0.35)",
                  borderRadius: 6,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  background: "rgba(168, 85, 247, 0.03)",
                  transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: 24 }}>📤</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginTop: 4 }}>Upload Comparison Satellite Image</span>
                <span style={{ fontSize: 10, color: "#64748b" }}>GeoTIFF (.tif) or PNG / JPEG</span>
              </div>
            )}
          </div>

          {/* Run Button */}
          <button
            type="button"
            className="btn btn-primary"
            disabled={isProcessing}
            onClick={handleRunAnalysis}
            style={{
              padding: "12px 18px",
              fontSize: 13,
              fontWeight: 700,
              borderRadius: 8,
              background: "linear-gradient(135deg, #2563eb, #7c3aed)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
            }}
          >
            {isProcessing ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                Analyzing Bi-Temporal Changes…
              </>
            ) : (
              <>🔍 Run Change Detection & Segmentation</>
            )}
          </button>

          {error && (
            <div style={{ padding: "10px 12px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 6, color: "#fca5a5", fontSize: 12 }}>
              ⚠️ {error}
            </div>
          )}

          {/* Legend of Change Classes */}
          <div style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(148, 163, 184, 0.15)", borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#94a3b8", marginBottom: 8, letterSpacing: "0.05em" }}>
              Semantic Change Taxonomy
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {CHANGE_CATEGORIES.filter((c) => c.id !== "all").map((cat) => (
                <div key={cat.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: cat.color, display: "inline-block" }} />
                    <span style={{ color: "#cbd5e1" }}>{cat.label}</span>
                  </div>
                  {resultData?.class_stats?.[cat.id] && (
                    <span style={{ color: cat.color, fontWeight: 700 }}>
                      {resultData.class_stats[cat.id].area_hectares} ha ({resultData.class_stats[cat.id].percent_roi}%)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── COLUMN 2: Visual Comparison Stage (Center) ─────────────── */}
        {resultData ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            
            {/* View Mode Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(15, 23, 42, 0.8)", padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(148, 163, 184, 0.15)" }}>
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { id: "slider", label: "🔀 Split Curtain Slider" },
                  { id: "overlay", label: "🎨 Segmented AI Mask" },
                  { id: "side_by_side", label: "🪟 Side-by-Side" },
                  { id: "diff", label: "📈 Difference Heatmap" },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setViewMode(mode.id)}
                    style={{
                      background: viewMode === mode.id ? "rgba(56, 189, 248, 0.2)" : "transparent",
                      border: viewMode === mode.id ? "1px solid rgba(56, 189, 248, 0.5)" : "1px solid transparent",
                      color: viewMode === mode.id ? "#38bdf8" : "#94a3b8",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "5px 10px",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {viewMode === "overlay" && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#94a3b8" }}>
                  <span>Mask Opacity: {maskOpacity}%</span>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={maskOpacity}
                    onChange={(e) => setMaskOpacity(Number(e.target.value))}
                    style={{ width: 80 }}
                  />
                </div>
              )}
            </div>

            {/* Interactive Image Container */}
            <div
              style={{
                position: "relative",
                width: "100%",
                height: 480,
                background: "#020617",
                borderRadius: 10,
                overflow: "hidden",
                border: "1px solid rgba(56, 189, 248, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* ── Mode 1: Slider View ── */}
              {viewMode === "slider" && (
                <div style={{ position: "relative", width: "100%", height: "100%", userSelect: "none", overflow: "hidden" }}>
                  {/* Layer 2: Epoch 2 (Base Underneath) */}
                  <img
                    src={resolveUrl(resultData.image_2?.preview_url)}
                    alt="Epoch 2"
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "contain" }}
                  />

                  {/* Layer 1: Epoch 1 (Clipped to slider width) */}
                  <img
                    src={resolveUrl(resultData.image_1?.preview_url)}
                    alt="Epoch 1"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`,
                    }}
                  />

                  {/* Vertical Divider Line */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: `${sliderPos}%`,
                      width: 2,
                      height: "100%",
                      background: "#38bdf8",
                      boxShadow: "0 0 10px rgba(56, 189, 248, 0.8)",
                      pointerEvents: "none",
                    }}
                  />
                  {/* Handle Knob */}
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: `${sliderPos}%`,
                      transform: "translate(-50%, -50%)",
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "#0284c7",
                      border: "2px solid #ffffff",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ffffff",
                      fontSize: 12,
                      fontWeight: 700,
                      pointerEvents: "none",
                    }}
                  >
                    ↔
                  </div>

                  {/* Slider Drag Handle */}
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={sliderPos}
                    onChange={(e) => setSliderPos(Number(e.target.value))}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      opacity: 0,
                      cursor: "ew-resize",
                      zIndex: 10,
                      margin: 0,
                    }}
                  />

                  {/* Date Watermarks */}
                  <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(15, 23, 42, 0.85)", padding: "4px 8px", borderRadius: 4, fontSize: 11, color: "#38bdf8", fontWeight: 700, pointerEvents: "none" }}>
                    T1: {resultData.date_t1}
                  </div>
                  <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(15, 23, 42, 0.85)", padding: "4px 8px", borderRadius: 4, fontSize: 11, color: "#c084fc", fontWeight: 700, pointerEvents: "none" }}>
                    T2: {resultData.date_t2}
                  </div>
                </div>
              )}

              {/* ── Mode 2: Segmented AI Mask Overlay ── */}
              {viewMode === "overlay" && (
                <div style={{ position: "relative", width: "100%", height: "100%" }}>
                  {/* Base Image T2 */}
                  <img
                    src={resolveUrl(resultData.image_2?.preview_url)}
                    alt="Epoch 2 Base"
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                  {/* AI Change Mask Overlay */}
                  <img
                    src={resolveUrl(resultData.change_mask_url)}
                    alt="Change Mask"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      opacity: maskOpacity / 100,
                      pointerEvents: "none",
                    }}
                  />

                  {/* SVG Interactive Bounding Boxes & Labels */}
                  <svg
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}
                    viewBox="0 0 512 512"
                  >
                    {filteredRegions.map((region) => {
                      const [x1, y1, x2, y2] = region.pixel_bounds;
                      const isSelected = selectedRegionId === region.id;
                      const isHovered = hoveredRegionId === region.id;

                      return (
                        <g key={region.id} style={{ pointerEvents: "auto", cursor: "pointer" }} onClick={() => setSelectedRegionId(region.id)} onMouseEnter={() => setHoveredRegionId(region.id)} onMouseLeave={() => setHoveredRegionId(null)}>
                          <rect
                            x={x1}
                            y={y1}
                            width={x2 - x1}
                            height={y2 - y1}
                            fill={isSelected || isHovered ? "rgba(255,255,255,0.15)" : "transparent"}
                            stroke={region.color}
                            strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 1.5}
                            strokeDasharray={isSelected ? "none" : "4 2"}
                            rx={4}
                          />
                          {showLabelsOnImage && (
                            <g transform={`translate(${x1}, ${Math.max(14, y1 - 4)})`}>
                              <rect
                                x={0}
                                y={-12}
                                width={region.label.length * 6.5 + 16}
                                height={16}
                                fill={region.color}
                                rx={3}
                              />
                              <text x={4} y={0} fill="#ffffff" fontSize={9.5} fontWeight="bold">
                                {region.label} ({region.area_hectares} ha)
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              )}

              {/* ── Mode 3: Side-by-Side Dual View ── */}
              {viewMode === "side_by_side" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", width: "100%", height: "100%", gap: 6, padding: 6 }}>
                  <div style={{ position: "relative", height: "100%", background: "#0f172a", borderRadius: 6, overflow: "hidden" }}>
                    <img src={resolveUrl(resultData.image_1?.preview_url)} alt="Epoch 1" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(15, 23, 42, 0.8)", padding: "3px 6px", borderRadius: 4, fontSize: 10, color: "#38bdf8" }}>
                      T1: {resultData.date_t1}
                    </div>
                  </div>
                  <div style={{ position: "relative", height: "100%", background: "#0f172a", borderRadius: 6, overflow: "hidden" }}>
                    <img src={resolveUrl(resultData.image_2?.preview_url)} alt="Epoch 2" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(15, 23, 42, 0.8)", padding: "3px 6px", borderRadius: 4, fontSize: 10, color: "#c084fc" }}>
                      T2: {resultData.date_t2}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Mode 4: Difference Heatmap ── */}
              {viewMode === "diff" && (
                <div style={{ position: "relative", width: "100%", height: "100%" }}>
                  <img src={resolveUrl(resultData.diff_heatmap_url)} alt="Difference Heatmap" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  <div style={{ position: "absolute", bottom: 12, left: 12, background: "rgba(15, 23, 42, 0.85)", padding: "4px 8px", borderRadius: 4, fontSize: 11, color: "#cbd5e1" }}>
                    Spectral Difference Magnitude (Grayscale)
                  </div>
                </div>
              )}
            </div>

            {/* Quick Metrics Bar */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(148, 163, 184, 0.15)", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>Total Changed Area</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#38bdf8", marginTop: 2 }}>{resultData.total_changed_ha} ha</div>
                <div style={{ fontSize: 10, color: "#64748b" }}>{resultData.total_changed_pct}% of total ROI</div>
              </div>
              <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(148, 163, 184, 0.15)", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>Discrete Change Regions</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#f8fafc", marginTop: 2 }}>{resultData.detected_regions?.length || 0}</div>
                <div style={{ fontSize: 10, color: "#64748b" }}>Polygonized & Labeled</div>
              </div>
              <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(148, 163, 184, 0.15)", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>Vegetation Shift (ΔVARI)</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: resultData.spectral_deltas?.mean_delta_vari > 0 ? "#10b981" : "#ef4444", marginTop: 2 }}>
                  {resultData.spectral_deltas?.mean_delta_vari > 0 ? "+" : ""}{resultData.spectral_deltas?.mean_delta_vari || 0}
                </div>
                <div style={{ fontSize: 10, color: "#64748b" }}>Canopy transition metric</div>
              </div>
              <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(148, 163, 184, 0.15)", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>Urban Shift (ΔUrban)</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#f97316", marginTop: 2 }}>
                  {resultData.spectral_deltas?.mean_delta_urban > 0 ? "+" : ""}{resultData.spectral_deltas?.mean_delta_urban || 0}
                </div>
                <div style={{ fontSize: 10, color: "#64748b" }}>Impervious footprint delta</div>
              </div>
            </div>

            {/* AI Analytical Report Narrative */}
            <div style={{ background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(148, 163, 184, 0.15)", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#38bdf8", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <span>📋</span> Geospatial Intelligence Report
              </div>
              <div style={{ fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.6 }}>
                <FormattedAnswer text={resultData.report} />
              </div>
            </div>
          </div>
        ) : (
          /* Empty State Placeholder */
          <div
            style={{
              height: 480,
              background: "rgba(15, 23, 42, 0.4)",
              border: "1px dashed rgba(148, 163, 184, 0.2)",
              borderRadius: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              color: "#64748b",
            }}
          >
            <span style={{ fontSize: 42 }}>🛰️</span>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#94a3b8" }}>No Change Analysis Executed Yet</div>
              <div style={{ fontSize: 12, maxWidth: 360, marginTop: 4 }}>
                Upload two images on the left or click <strong>Load Sample Demo</strong> above to test the bi-temporal change detection & segmentation pipeline.
              </div>
            </div>
          </div>
        )}

        {/* ── COLUMN 3: Detected Change Regions & Labels List ────────── */}
        {resultData && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(148, 163, 184, 0.15)", borderRadius: 10, padding: 14, height: "100%", display: "flex", flexDirection: "column" }}>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc", display: "flex", alignItems: "center", gap: 6 }}>
                  <span>🏷️</span> Detected Change Regions ({filteredRegions.length})
                </div>
                <label style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={showLabelsOnImage}
                    onChange={(e) => setShowLabelsOnImage(e.target.checked)}
                  />
                  Show on Image
                </label>
              </div>

              {/* Category Filter Pills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                {CHANGE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: 12,
                      background: activeCategory === cat.id ? "rgba(56, 189, 248, 0.25)" : "rgba(30, 41, 59, 0.6)",
                      border: activeCategory === cat.id ? "1px solid #38bdf8" : "1px solid rgba(148, 163, 184, 0.15)",
                      color: activeCategory === cat.id ? "#38bdf8" : "#94a3b8",
                      cursor: "pointer",
                    }}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>

              {/* Regions List Scroll */}
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, maxHeight: 520 }}>
                {filteredRegions.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#64748b", fontSize: 12, padding: "20px 0" }}>
                    No regions found in this category.
                  </div>
                ) : (
                  filteredRegions.map((reg) => {
                    const isSelected = selectedRegionId === reg.id;
                    const isHovered = hoveredRegionId === reg.id;

                    return (
                      <div
                        key={reg.id}
                        onClick={() => setSelectedRegionId(reg.id)}
                        onMouseEnter={() => setHoveredRegionId(reg.id)}
                        onMouseLeave={() => setHoveredRegionId(null)}
                        style={{
                          background: isSelected ? "rgba(56, 189, 248, 0.15)" : isHovered ? "rgba(30, 41, 59, 0.9)" : "rgba(15, 23, 42, 0.6)",
                          border: isSelected ? `1.5px solid ${reg.color}` : "1px solid rgba(148, 163, 184, 0.15)",
                          borderRadius: 8,
                          padding: "10px 12px",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: reg.color, display: "inline-block" }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#f8fafc" }}>{reg.label}</span>
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", background: "rgba(255,255,255,0.08)", borderRadius: 4, color: reg.color }}>
                            {Math.round(reg.confidence * 100)}% Conf
                          </span>
                        </div>

                        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>
                          {reg.description}
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "#64748b", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 4 }}>
                          <span>Area: <strong style={{ color: "#e2e8f0" }}>{reg.area_hectares} ha</strong> ({reg.area_sq_meters.toLocaleString()} m²)</span>
                          <span>Centroid: {reg.centroid[0].toFixed(4)}°, {reg.centroid[1].toFixed(4)}°</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
