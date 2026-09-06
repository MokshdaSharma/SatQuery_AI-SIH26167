/**
 * QueryPanel.jsx — Left sidebar for query input, date selection, and modality toggle.
 *
 * Props:
 *   roi                   — GeoJSON geometry (null if not drawn yet)
 *   onSubmit(params)      — called on form submit with query params
 *   isLoading             — show loading state on submit button
 *   imageryResult         — result of fetch-imagery call (or null)
 *   onUploadFile(file)    — called when user selects a file to upload
 *   uploadResult          — UploadResponse from /api/upload-image (or null)
 *   isUploading           — upload in progress
 *   uploadProgress        — 0-100
 *   uploadError           — error string | null
 *   onUploadClear()       — called when user clears the upload
 */

import { useState } from "react";
import ImageUploadPanel from "./ImageUploadPanel";

const MODALITIES = [
  { value: "optical", label: "Optical" },
  { value: "sar",     label: "SAR" },
  { value: "both",    label: "Both" },
];

const QUERY_EXAMPLES = [
  "Describe the land cover in this region.",
  "Where are the buildings in this area?",
  "Has there been any deforestation since 2022?",
  "How has the urban extent changed between the two dates?",
  "Detect flooded areas using SAR and optical data.",
  "What is the dominant vegetation type here?",
];

export default function QueryPanel({
  roi,
  onSubmit,
  isLoading,
  imageryResult,
  onUploadFile,
  uploadResult,
  isUploading,
  uploadProgress,
  uploadError,
  onUploadClear,
}) {
  const [query, setQuery]         = useState("");
  const [modality, setModality]   = useState("optical");
  const [dateStart, setDateStart] = useState("2024-01-01");
  const [dateEnd, setDateEnd]     = useState("");
  const [dateStart2, setDateStart2] = useState("");
  const [dateEnd2, setDateEnd2]   = useState("");
  const [showSecondDate, setShowSecondDate] = useState(false);
  const [exampleOpen, setExampleOpen] = useState(false);
  const [inputMode, setInputMode] = useState("roi"); // "roi" | "upload"

  // Can submit if query is long enough AND (roi is drawn OR an image was uploaded)
  const hasInput = inputMode === "roi" ? !!roi : !!uploadResult;
  const canSubmit = hasInput && query.trim().length >= 3 && !isLoading;

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      query: query.trim(),
      modality,
      dateStart,
      dateEnd: dateEnd || undefined,
      dateStart2: dateStart2 || undefined,
      dateEnd2: dateEnd2 || undefined,
      // Provide uploaded image_refs if in upload mode
      imageRefs: uploadResult ? [uploadResult.image_id] : (imageryResult?.images?.map((img) => img.image_id) || []),
      inputMode,
    });
  }

  function applyExample(ex) {
    setQuery(ex);
    setExampleOpen(false);
    // Auto-enable second date for change queries
    if (ex.toLowerCase().includes("since") || ex.toLowerCase().includes("change") ||
        ex.toLowerCase().includes("between")) {
      setShowSecondDate(true);
      setDateStart2("2023-01-01");
    }
  }

  return (
    <div className="sidebar">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="panel-section" style={{ paddingTop: 20, paddingBottom: 16, borderBottom: "1px solid var(--color-border)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
          <span style={{ fontSize:20 }}>🛰️</span>
          <span style={{ fontWeight:600, fontSize:14 }}>Analysis Setup</span>
        </div>
        <p style={{ fontSize:12, color:"var(--color-text-muted)", lineHeight:1.6 }}>
          Draw an ROI on the map or upload a satellite image, then ask your question.
        </p>
      </div>

      {/* ── Input mode toggle ─────────────────────────────────────────────── */}
      <div className="panel-section">
        <div className="section-title">Input Source</div>
        <div className="modality-toggle">
          <button
            type="button"
            id="input-mode-roi"
            className={`modality-option${inputMode === "roi" ? " active" : ""}`}
            onClick={() => setInputMode("roi")}
          >
            🗺 Draw ROI
          </button>
          <button
            type="button"
            id="input-mode-upload"
            className={`modality-option${inputMode === "upload" ? " active" : ""}`}
            onClick={() => setInputMode("upload")}
          >
            📤 Upload Image
          </button>
        </div>
      </div>

      {/* ── ROI mode: show ROI status ──────────────────────────────────────── */}
      {inputMode === "roi" && (
        <div className="panel-section">
          <div className="section-title">Region of Interest</div>
          <div className={`card ${roi ? "animate-in" : ""}`}
            style={{ borderColor: roi ? "rgba(52,211,153,0.3)" : "var(--color-border)", padding:"10px 14px" }}>
            {roi ? (
              <div style={{ display:"flex", alignItems:"center", gap:8, color:"var(--color-brand-accent)" }}>
                <span>✓</span>
                <span style={{ fontSize:12, fontWeight:500 }}>ROI drawn</span>
                <span style={{ fontSize:11, color:"var(--color-text-muted)", marginLeft:"auto" }}>
                  {roi.type}
                </span>
              </div>
            ) : (
              <div style={{ display:"flex", alignItems:"center", gap:8, color:"var(--color-text-muted)" }}>
                <span style={{ fontSize:16 }}>📐</span>
                <span style={{ fontSize:12 }}>Use the polygon tool on the map</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Upload mode: show upload panel ───────────────────────────────── */}
      {inputMode === "upload" && (
        <div className="panel-section">
          <div className="section-title">Upload Satellite Image</div>
          <ImageUploadPanel
            onUploadComplete={onUploadFile}
            uploadResult={uploadResult}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            uploadError={uploadError}
            onClear={onUploadClear}
          />
        </div>
      )}

      {/* ── Modality ────────────────────────────────────────────────────────── */}
      <div className="panel-section">
        <div className="section-title">Imagery Modality</div>
        <div className="modality-toggle">
          {MODALITIES.map(({ value, label }) => (
            <button
              key={value}
              id={`modality-${value}`}
              className={`modality-option${modality === value ? " active" : ""}`}
              onClick={() => setModality(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Dates ───────────────────────────────────────────────────────────── */}
      <div className="panel-section">
        <div className="section-title">Date Range</div>
        <div className="form-group">
          <label className="form-label" htmlFor="date-start">Start date</label>
          <input
            id="date-start"
            className="form-input"
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="date-end">End date (optional)</label>
          <input
            id="date-end"
            className="form-input"
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
          />
        </div>
      </div>

      {/* ── Change Detection ─────────────────────────────────────────────────── */}
      <div className="panel-section">
        <div className="section-title" style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span>🔄</span> Change Detection
        </div>
        <p style={{ fontSize:11, color:"var(--color-text-muted)", lineHeight:1.5, marginBottom:10 }}>
          Compare two time periods. Add a second date range to enable bi-temporal analysis
          (new construction, demolition, vegetation change).
        </p>

        {/* Toggle */}
        <label
          htmlFor="toggle-second-date"
          style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", marginBottom:10 }}
        >
          <div
            id="toggle-second-date"
            role="checkbox"
            aria-checked={showSecondDate}
            tabIndex={0}
            onClick={() => setShowSecondDate((v) => !v)}
            onKeyDown={(e) => e.key === "Enter" && setShowSecondDate((v) => !v)}
            style={{
              width:34, height:18, borderRadius:9,
              background: showSecondDate ? "var(--color-brand-primary)" : "var(--color-border)",
              transition: "background 0.2s",
              position:"relative", flexShrink:0, cursor:"pointer",
            }}
          >
            <div style={{
              position:"absolute", top:2, left: showSecondDate ? 18 : 2,
              width:14, height:14, borderRadius:"50%", background:"#fff",
              transition: "left 0.2s",
              boxShadow:"0 1px 3px rgba(0,0,0,0.3)",
            }} />
          </div>
          <span style={{ fontSize:12, fontWeight:500 }}>
            {showSecondDate ? "Second epoch enabled" : "Enable change detection"}
          </span>
        </label>

        {showSecondDate && (
          <div style={{ display:"flex", flexDirection:"column", gap:10, paddingLeft:4, borderLeft:"2px solid var(--color-brand-primary)" }}>
            <div className="task-badge grounding" style={{ fontSize:10, display:"inline-flex", marginBottom:2 }}>
              📅 Second time period
            </div>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label" htmlFor="date-start-2">Start date</label>
              <input
                id="date-start-2"
                className="form-input"
                type="date"
                value={dateStart2}
                onChange={(e) => setDateStart2(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label" htmlFor="date-end-2">End date (optional)</label>
              <input
                id="date-end-2"
                className="form-input"
                type="date"
                value={dateEnd2}
                onChange={(e) => setDateEnd2(e.target.value)}
              />
            </div>
            <p style={{ fontSize:10, color:"var(--color-brand-primary)", marginTop:2 }}>
              ✓ Ask questions like "What changed between these dates?" or "Detect new construction."
            </p>
          </div>
        )}
      </div>


      {/* ── Query ───────────────────────────────────────────────────────────── */}
      <div className="panel-section" style={{ flex:1 }}>
        <div className="section-title">Query</div>

        {/* Example queries */}
        <div style={{ marginBottom:8 }}>
          <button
            type="button"
            className="collapsible__trigger"
            id="toggle-examples"
            onClick={() => setExampleOpen((v) => !v)}
          >
            <span className={`collapsible__chevron${exampleOpen ? " open" : ""}`}>▶</span>
            Example queries
          </button>
          {exampleOpen && (
            <div style={{ marginTop:6, display:"flex", flexDirection:"column", gap:4 }}>
              {QUERY_EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  type="button"
                  id={`example-query-${i}`}
                  onClick={() => applyExample(ex)}
                  style={{
                    background:"rgba(56,189,248,0.05)",
                    border:"1px solid var(--color-border)",
                    borderRadius:6,
                    color:"var(--color-text-secondary)",
                    cursor:"pointer",
                    fontSize:11,
                    padding:"6px 10px",
                    textAlign:"left",
                    transition:"all 0.15s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-brand-primary)"; e.currentTarget.style.color = "var(--color-text-primary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <textarea
              id="query-input"
              className="form-textarea"
              placeholder="Ask a question about the region…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ minHeight:100 }}
            />
          </div>

          {!hasInput && (
            <div className="warning-banner" style={{ marginBottom:12 }}>
              <span>⚠️</span>
              <span>
                {inputMode === "roi"
                  ? "Draw a region of interest on the map first."
                  : "Upload a satellite image first."}
              </span>
            </div>
          )}

          <button
            id="submit-query"
            type="submit"
            className="btn btn-primary"
            disabled={!canSubmit}
          >
            {isLoading ? (
              <>
                <span className="spinner" style={{ width:16, height:16, borderWidth:2 }} />
                Analysing…
              </>
            ) : (
              <>🔍 Run Analysis</>
            )}
          </button>
        </form>
      </div>

      {/* ── Imagery fetch status ────────────────────────────────────────────── */}
      {imageryResult && (
        <div className="panel-section" style={{ paddingBottom:20 }}>
          <div className="section-title">Imagery</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {imageryResult.images.map((img) => (
              <div key={img.image_id} className="card" style={{ padding:"8px 12px", fontSize:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ color:"var(--color-text-secondary)" }}>
                    {img.modality === "optical" ? "🛰 Optical" : "📡 SAR"}
                  </span>
                  <span style={{ color:"var(--color-text-muted)" }}>{img.date_acquired}</span>
                </div>
                {img.cloud_cover != null && (
                  <div style={{ fontSize:11, color:"var(--color-text-muted)", marginTop:2 }}>
                    ☁ {img.cloud_cover.toFixed(1)}% cloud cover
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
