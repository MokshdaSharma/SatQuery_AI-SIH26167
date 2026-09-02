/**
 * ResultPanel.jsx — Right sidebar showing analysis results.
 *
 * Props:
 *   result        — QueryResponse from /api/query (or null)
 *   isLoading     — boolean
 *   error         — error message string (or null)
 *   onExport(formats) — called when user clicks an export button
 *   isExporting   — boolean
 *   exportResult  — ExportResponse (or null)
 */

import { useState } from "react";
import { downloadFile } from "../api";

const EXPORT_OPTIONS = [
  { key: "pdf",     label: "📄 PDF Report", desc: "Formatted analysis report" },
  { key: "geotiff", label: "🗺 GeoTIFF",    desc: "Satellite imagery patch" },
  { key: "geojson", label: "📍 GeoJSON",    desc: "Evidence vector layer" },
  { key: "log",     label: "📋 JSON Log",   desc: "Structured execution log" },
  { key: "zip",     label: "📦 ZIP Bundle", desc: "All formats in one archive" },
];

const TASK_ICONS = {
  vqa:         "❓",
  caption:     "📝",
  grounding:   "📍",
  change_vqa:  "🔄",
  fusion:      "🔀",
};

export default function ResultPanel({ result, isLoading, error, onExport, isExporting, exportResult }) {
  const [traceOpen, setTraceOpen] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState(["zip"]);

  function toggleFormat(key) {
    setSelectedFormats((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function handleExport() {
    if (selectedFormats.length > 0) onExport(selectedFormats);
  }

  const confLevel =
    !result ? "low"
    : result.confidence >= 0.65 ? "high"
    : result.confidence >= 0.45 ? "medium"
    : "low";

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="results-panel">
        <div className="loading-state" style={{ flex:1 }}>
          <div className="spinner" />
          <p style={{ fontWeight:500 }}>Running analysis…</p>
          <p style={{ fontSize:12 }}>
            Fetching imagery, classifying query, and running models.
          </p>
          <div style={{ display:"flex", flexDirection:"column", gap:8, width:"100%" }}>
            {["Fetching imagery","Classifying query","Dispatching to model","Aggregating results"].map((step, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div className="skeleton" style={{ width:16, height:16, borderRadius:"50%", flexShrink:0 }} />
                <div className="skeleton" style={{ flex:1, height:12 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="results-panel">
        <div className="panel-section" style={{ paddingTop:20 }}>
          <div className="section-title">Result</div>
          <div className="error-banner" style={{ flexDirection:"column", gap:6 }}>
            <strong>Analysis failed</strong>
            <span style={{ fontSize:12, opacity:0.85 }}>{error}</span>
          </div>
        </div>
        <div className="empty-state">
          <div className="empty-state__icon">⚠️</div>
          <div className="empty-state__title">Something went wrong</div>
          <div className="empty-state__desc">
            Check your ROI, date range, and that the backend server is running.
          </div>
        </div>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!result) {
    return (
      <div className="results-panel">
        <div className="empty-state">
          <div className="empty-state__icon">🛰️</div>
          <div className="empty-state__title">No analysis yet</div>
          <div className="empty-state__desc">
            Draw a region of interest on the map, enter your question, and click
            "Run Analysis" to see results here.
          </div>
        </div>
      </div>
    );
  }

  // ── Result ─────────────────────────────────────────────────────────────────
  return (
    <div className="results-panel animate-in">

      {/* ── Task type + confidence ──────────────────────────────────────────── */}
      <div className="panel-section" style={{ paddingTop:20 }}>
        <div className="section-title">Analysis Result</div>
        <div className="card" style={{ marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
            <span className={`task-badge ${result.task_type}`}>
              {TASK_ICONS[result.task_type]} {result.task_type.replace("_", " ")}
            </span>
            <span style={{ marginLeft:"auto", fontSize:12, color:"var(--color-text-secondary)" }}>
              Session: {result.session_id?.slice(0, 8)}…
            </span>
          </div>

          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6, fontSize:12 }}>
            <span style={{ color:"var(--color-text-secondary)" }}>Confidence</span>
            <span style={{ fontWeight:600, color:
              confLevel === "high"   ? "var(--color-brand-accent)"
              : confLevel === "medium" ? "var(--color-brand-warning)"
              :                         "var(--color-brand-danger)" }}>
              {(result.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <div className="confidence-bar">
            <div
              className={`confidence-bar__fill ${confLevel}`}
              style={{ width: `${result.confidence * 100}%` }}
            />
          </div>
        </div>

        {/* Change type chips */}
        {result.change_types?.length > 0 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
            {result.change_types.map((ct) => (
              <span key={ct} className={`change-chip ${ct}`}>
                {ct.replace("_", " ")}
              </span>
            ))}
          </div>
        )}

        {/* Answer */}
        <div className="answer-text">{result.answer}</div>
      </div>

      {/* ── Warnings ───────────────────────────────────────────────────────── */}
      {result.warnings?.length > 0 && (
        <div className="panel-section">
          {result.warnings.map((w, i) => (
            <div key={i} className="warning-banner">
              <span>⚠️</span><span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Evidence summary ────────────────────────────────────────────────── */}
      {result.evidence_geojson && (
        <div className="panel-section">
          <div className="section-title">Evidence</div>
          <div className="card" style={{ fontSize:12, padding:"10px 14px" }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <span style={{ color:"var(--color-text-secondary)" }}>GeoJSON features</span>
              <span style={{ fontWeight:600, color:"var(--color-brand-primary)" }}>
                {result.evidence_geojson.features?.length ?? 0}
              </span>
            </div>
            <p style={{ fontSize:11, color:"var(--color-text-muted)", marginTop:4 }}>
              Evidence is overlaid on the map.
            </p>
          </div>
        </div>
      )}

      {/* ── Execution trace ─────────────────────────────────────────────────── */}
      {result.execution_trace?.length > 0 && (
        <div className="panel-section">
          <div className="section-title">Execution Trace</div>
          <button
            id="toggle-trace"
            className="collapsible__trigger"
            type="button"
            onClick={() => setTraceOpen((v) => !v)}
          >
            <span className={`collapsible__chevron${traceOpen ? " open" : ""}`}>▶</span>
            {traceOpen ? "Hide" : "Show"} trace ({result.execution_trace.length} steps)
          </button>
          {traceOpen && (
            <div className="trace-viewer animate-in" style={{ marginTop:8 }}>
              {result.execution_trace.map((step, i) => (
                <div key={i} className="trace-step">
                  <div className="trace-step__label">{step.step}</div>
                  <pre style={{ whiteSpace:"pre-wrap", wordBreak:"break-word", fontSize:10 }}>
                    {JSON.stringify(step.detail, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Export ─────────────────────────────────────────────────────────── */}
      <div className="panel-section" style={{ paddingBottom:24 }}>
        <div className="section-title">Export</div>

        <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:12 }}>
          {EXPORT_OPTIONS.map(({ key, label, desc }) => (
            <label
              key={key}
              htmlFor={`export-${key}`}
              style={{
                display:"flex",
                alignItems:"center",
                gap:10,
                cursor:"pointer",
                padding:"8px 10px",
                borderRadius:8,
                border:`1px solid ${selectedFormats.includes(key) ? "var(--color-border-strong)" : "var(--color-border)"}`,
                background: selectedFormats.includes(key) ? "rgba(56,189,248,0.06)" : "transparent",
                transition:"all 0.15s",
              }}
            >
              <input
                type="checkbox"
                id={`export-${key}`}
                checked={selectedFormats.includes(key)}
                onChange={() => toggleFormat(key)}
                style={{ accentColor:"var(--color-brand-primary)" }}
              />
              <span style={{ flex:1 }}>
                <span style={{ fontSize:13, fontWeight:500 }}>{label}</span>
                <span style={{ display:"block", fontSize:11, color:"var(--color-text-muted)", marginTop:1 }}>{desc}</span>
              </span>
            </label>
          ))}
        </div>

        <button
          id="export-button"
          className="btn btn-primary"
          onClick={handleExport}
          disabled={isExporting || selectedFormats.length === 0}
        >
          {isExporting ? (
            <><span className="spinner" style={{ width:16, height:16, borderWidth:2 }} /> Exporting…</>
          ) : (
            <>⬇ Export Selected</>
          )}
        </button>

        {/* Download links */}
        {exportResult?.files?.length > 0 && (
          <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:6 }}>
            {exportResult.files.map((f) => (
              <button
                key={f.filename}
                type="button"
                id={`download-${f.format}`}
                className="btn btn-secondary btn-sm"
                onClick={() => downloadFile(result.session_id, f.filename)}
              >
                ⬇ {f.filename}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
