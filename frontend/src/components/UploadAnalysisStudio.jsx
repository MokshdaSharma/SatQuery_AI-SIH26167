/**
 * UploadAnalysisStudio.jsx — Tab: Upload & Analysis
 *
 * Comprehensive Satellite Vision & File Analysis Studio:
 *   1. Direct File Ingestion: Drag & Drop / File Picker (GeoTIFF, PNG, JPEG, JP2)
 *   2. Spatial Metadata & Band Inspector (Bands, Dimensions, File Size, Georeferencing)
 *   3. Interactive Vision AI Querying (VQA, Grounding, Feature Classification)
 *   4. Instant Results & Evidence View with Export capabilities
 *   5. Seamless switch between Single Image Analysis and Bi-Temporal Multi-Epoch Comparison
 */

import { useState } from "react";
import ImageUploadPanel from "./ImageUploadPanel";
import BeforeAfterSlider from "./BeforeAfterSlider";
import FormattedAnswer from "./FormattedAnswer";

const ANALYSIS_PRESETS = [
  {
    icon: "🏢",
    label: "Building & Urban Footprint",
    query: "Identify all building structures, built-up areas, and estimate construction density across this satellite scene.",
  },
  {
    icon: "🌳",
    label: "Vegetation & Canopy Health",
    query: "Analyze vegetation coverage, canopy density, and highlight any signs of clearing, stress, or deforestation.",
  },
  {
    icon: "💧",
    label: "Water Bodies & Moisture (NDWI)",
    query: "Detect and outline all water bodies, canals, standing water, and moisture indicators in this image.",
  },
  {
    icon: "🛣️",
    label: "Roads & Transportation Corridors",
    query: "Trace the primary transport corridors, paved roads, and accessibility networks visible in this scene.",
  },
  {
    icon: "🚨",
    label: "Encroachment & Land Use Anomaly",
    query: "Check for unauthorized land encroachment, boundary violations, or unexpected structural alterations.",
  },
  {
    icon: "🛰️",
    label: "Comprehensive Scene Intelligence",
    query: "Generate a detailed geospatial intelligence report describing overall land cover, key features, and notable objects.",
  },
];

export default function UploadAnalysisStudio({
  uploadResult,
  isUploading,
  uploadProgress,
  uploadError,
  onUploadFile,
  onUploadClear,
  onRunAnalysis,
  onMapImage,
  isLoading,
  queryResult,
  error,
  onExport,
  isExporting,
}) {
  const [studioMode, setStudioMode] = useState("upload"); // "upload" | "bitemporal"
  const [customQuery, setCustomQuery] = useState("");
  const [selectedPreset, setSelectedPreset] = useState(null);

  // Bi-temporal state
  const [dateT1, setDateT1] = useState("2022-01-15");
  const [dateT2, setDateT2] = useState("2024-03-20");

  const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset.label);
    setCustomQuery(preset.query);
  };

  const handleExecuteUploadQuery = (e) => {
    e?.preventDefault();
    if (!uploadResult) return;
    const q = customQuery.trim() || "Analyze the uploaded satellite image and provide detailed geospatial feature interpretation.";
    
    // Generate valid ROI geometry from bounds if available
    let roiGeom = undefined;
    if (uploadResult.geo_bounds && Array.isArray(uploadResult.geo_bounds) && uploadResult.geo_bounds.length === 4) {
      const [w, s, eCoord, n] = uploadResult.geo_bounds;
      roiGeom = {
        type: "Polygon",
        coordinates: [
          [
            [w, s],
            [eCoord, s],
            [eCoord, n],
            [w, n],
            [w, s],
          ],
        ],
      };
    }

    onRunAnalysis?.({
      query: q,
      modality: uploadResult.modality?.includes("sar") ? "sar" : "optical",
      imageRefs: [uploadResult.image_id],
      inputMode: "upload",
      dateStart: new Date().toISOString().split("T")[0],
      roiGeojson: roiGeom,
    });
  };

  const handleExecuteBiTemporal = (e) => {
    e?.preventDefault();
    const q = customQuery.trim() || `Compare change between ${dateT1} and ${dateT2}, detect what changed and calculate change percentage`;
    onRunAnalysis?.({
      query: q,
      dateStart: dateT1,
      dateStart2: dateT2,
      modality: "optical",
    });
  };

  return (
    <div className="upload-analysis-studio-layout" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Top Header & Mode Switcher ────────────────────────────────────── */}
      <div className="card" style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div className="badge badge--cyan" style={{ marginBottom: 8 }}>
              📤 Satellite File & Vision Intelligence
            </div>
            <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, color: "var(--color-text-bright, #f8fafc)" }}>
              {studioMode === "upload" ? "Satellite Image Upload & Analysis Studio" : "Bi-Temporal Change & Multi-Epoch Comparison"}
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted, #94a3b8)", maxWidth: 720, lineHeight: 1.5 }}>
              {studioMode === "upload"
                ? "Upload high-resolution GeoTIFF, Sentinel/Landsat rasters, or drone captures to run on-demand vision AI, detect structures, and inspect spatial attributes."
                : "Analyze multi-year satellite acquisitions, compute quantitative land-cover shifts, and evaluate change severity."}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="fusion-view-mode-toggles">
            <button
              type="button"
              className={`diff-mode-btn ${studioMode === "upload" ? "diff-mode-btn--active" : ""}`}
              onClick={() => setStudioMode("upload")}
            >
              📤 Single File Analysis
            </button>
            <button
              type="button"
              className={`diff-mode-btn ${studioMode === "bitemporal" ? "diff-mode-btn--active" : ""}`}
              onClick={() => setStudioMode("bitemporal")}
            >
              🔄 Bi-Temporal Comparison
            </button>
          </div>
        </div>
      </div>

      {/* ── MODE 1: SINGLE IMAGE UPLOAD & VISION ANALYSIS ─────────────────── */}
      {studioMode === "upload" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Left Column: Upload Dropzone & Metadata Inspector */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card" style={{ padding: 20 }}>
              <h3 className="section-title" style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>
                1. Upload Satellite Image / GeoTIFF
              </h3>
              <ImageUploadPanel
                onUploadComplete={onUploadFile}
                uploadResult={uploadResult}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                uploadError={uploadError}
                onClear={onUploadClear}
              />
            </div>

            {/* Uploaded File Metadata & Band Details */}
            {uploadResult && (
              <div className="card" style={{ padding: 20 }}>
                <div className="card-header-flex" style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 className="section-title" style={{ margin: 0, fontSize: 14 }}>
                    🛰️ Spatial Metadata & Georeferencing
                  </h3>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className="badge badge--cyan">
                      {uploadResult.has_georef ? "Georeferenced (WGS84)" : "Raw Raster"}
                    </span>
                    {onMapImage && (
                      <button
                        type="button"
                        className="btn btn--primary btn-sm"
                        onClick={() => onMapImage(uploadResult)}
                        style={{ padding: "4px 10px", fontSize: 11.5, display: "flex", alignItems: "center", gap: 4 }}
                        title="Overlay this uploaded satellite image onto the GIS map"
                      >
                        🗺️ View on Map
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
                  <div style={{ background: "rgba(255,255,255,0.03)", padding: "8px 12px", borderRadius: 6 }}>
                    <span style={{ color: "var(--color-text-muted)" }}>File Name:</span>
                    <div style={{ fontWeight: 600, color: "var(--color-text-bright)", marginTop: 2, wordBreak: "break-all" }}>
                      {uploadResult.filename}
                    </div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", padding: "8px 12px", borderRadius: 6 }}>
                    <span style={{ color: "var(--color-text-muted)" }}>Dimensions:</span>
                    <div style={{ fontWeight: 600, color: "var(--color-text-bright)", marginTop: 2 }}>
                      {uploadResult.width || 1024} × {uploadResult.height || 1024} px
                    </div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", padding: "8px 12px", borderRadius: 6 }}>
                    <span style={{ color: "var(--color-text-muted)" }}>Bands / Channels:</span>
                    <div style={{ fontWeight: 600, color: "var(--color-text-bright)", marginTop: 2 }}>
                      {uploadResult.bands || 3} Channels
                    </div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", padding: "8px 12px", borderRadius: 6 }}>
                    <span style={{ color: "var(--color-text-muted)" }}>File Size:</span>
                    <div style={{ fontWeight: 600, color: "var(--color-text-bright)", marginTop: 2 }}>
                      {uploadResult.file_size_bytes ? `${(uploadResult.file_size_bytes / 1024 / 1024).toFixed(2)} MB` : "Ready"}
                    </div>
                  </div>
                </div>

                {/* Map Overlay Quick Banner */}
                {uploadResult.has_georef && (
                  <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11.5, color: "#38bdf8" }}>
                      ✓ WGS84 GeoTIFF bounds detected ({uploadResult.geo_bounds?.map(b => b.toFixed(3)).join(", ")})
                    </span>
                    {onMapImage && (
                      <button
                        type="button"
                        className="btn btn--outline btn-sm"
                        onClick={() => onMapImage(uploadResult)}
                        style={{ fontSize: 11, padding: "3px 8px" }}
                      >
                        Map on Canvas →
                      </button>
                    )}
                  </div>
                )}

                {uploadResult.preview_url && (
                  <div style={{ marginTop: 14 }}>
                    <span style={{ fontSize: 12, color: "var(--color-text-muted)", display: "block", marginBottom: 6 }}>
                      High-Resolution Preview:
                    </span>
                    <div style={{ width: "100%", height: 220, borderRadius: 8, overflow: "hidden", background: "#090d16" }}>
                      <img
                        src={`${BASE_URL}${uploadResult.preview_url}`}
                        alt="Uploaded satellite raster preview"
                        style={{ width: "100%", height: "100%", objectFit: "contain" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: AI Analysis Formulation & Live Results */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="card" style={{ padding: 20 }}>
              <h3 className="section-title" style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}>
                2. Formulate AI Analysis
              </h3>

              {/* Preset Chips */}
              <div style={{ marginBottom: 14 }}>
                <span style={{ fontSize: 12, color: "var(--color-text-muted)", display: "block", marginBottom: 8 }}>
                  💡 Select a Quick Preset Goal:
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {ANALYSIS_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      className={`preset-btn ${selectedPreset === p.label ? "preset-btn--active" : ""}`}
                      onClick={() => handleSelectPreset(p)}
                      style={{
                        textAlign: "left",
                        padding: "8px 10px",
                        fontSize: 12,
                        background: selectedPreset === p.label ? "rgba(56,189,248,0.15)" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${selectedPreset === p.label ? "var(--color-brand-primary, #38bdf8)" : "rgba(255,255,255,0.08)"}`,
                        borderRadius: 6,
                        color: selectedPreset === p.label ? "#38bdf8" : "var(--color-text-normal, #cbd5e1)",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ marginRight: 6 }}>{p.icon}</span>
                      <strong>{p.label}</strong>
                    </button>
                  ))}
                </div>
              </div>

              {/* Query Form */}
              <form onSubmit={handleExecuteUploadQuery}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", display: "block", marginBottom: 6 }}>
                  Custom Vision AI Query:
                </label>
                <textarea
                  className="form-input"
                  rows={4}
                  style={{ width: "100%", resize: "vertical", fontFamily: "inherit", fontSize: 13, padding: 10, borderRadius: 6 }}
                  placeholder="e.g. Describe land cover, locate any roads or industrial buildings, and highlight anomalies..."
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                />

                <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="submit"
                    className="btn btn--primary"
                    disabled={!uploadResult || isLoading}
                    style={{ minWidth: 180 }}
                  >
                    {isLoading ? "⚡ Analyzing Raster…" : "⚡ Run Satellite AI Analysis"}
                  </button>
                </div>
              </form>
            </div>

            {/* Error Message */}
            {error && (
              <div className="toast toast--error" role="alert" style={{ width: "100%" }}>
                <strong>Analysis Error:</strong> {error}
              </div>
            )}

            {/* AI Results Output */}
            {queryResult && (
              <div className="card" style={{ padding: 20 }}>
                <div className="card-header-flex" style={{ marginBottom: 12 }}>
                  <h3 className="section-title" style={{ margin: 0, fontSize: 15, color: "#38bdf8" }}>
                    🤖 AI Analysis Output
                  </h3>
                  <span className="badge badge--success">
                    {(queryResult.confidence * 100).toFixed(0)}% Confidence
                  </span>
                </div>

                <div style={{ background: "rgba(0,0,0,0.25)", padding: "14px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <FormattedAnswer text={queryResult.answer} />
                </div>

                {/* Detected Entities */}
                {queryResult.entities && (
                  <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {Object.entries(queryResult.entities).map(([k, vals]) =>
                      vals?.map((v, i) => (
                        <span key={`${k}-${i}`} className="badge badge--cyan" style={{ fontSize: 11 }}>
                          {k}: {v}
                        </span>
                      ))
                    )}
                  </div>
                )}

                {/* Export Options */}
                {onExport && (
                  <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="btn btn--outline btn-sm"
                      onClick={() => onExport(["pdf"])}
                      disabled={isExporting}
                    >
                      📄 Export PDF
                    </button>
                    <button
                      type="button"
                      className="btn btn--outline btn-sm"
                      onClick={() => onExport(["geojson"])}
                      disabled={isExporting}
                    >
                      🗺️ Export GeoJSON
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODE 2: BI-TEMPORAL COMPARISON ───────────────────────────────── */}
      {studioMode === "bitemporal" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <form className="change-date-selector-form" onSubmit={handleExecuteBiTemporal}>
              <div className="change-date-group">
                <label className="form-label">📅 Baseline Epoch (T1)</label>
                <input
                  type="date"
                  className="form-input change-date-input"
                  value={dateT1}
                  onChange={(e) => setDateT1(e.target.value)}
                  required
                />
              </div>

              <div className="change-date-arrow">➔</div>

              <div className="change-date-group">
                <label className="form-label">📅 Target Epoch (T2)</label>
                <input
                  type="date"
                  className="form-input change-date-input"
                  value={dateT2}
                  onChange={(e) => setDateT2(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn--primary change-run-btn"
                disabled={isLoading}
              >
                {isLoading ? "Analyzing Dynamics…" : "⚡ Compute Multi-Epoch Change"}
              </button>
            </form>
          </div>

          <BeforeAfterSlider
            beforeDate={dateT1}
            afterDate={dateT2}
            beforeLabel="Baseline Epoch (T1)"
            afterLabel="Target Epoch (T2)"
          />
        </div>
      )}
    </div>
  );
}
