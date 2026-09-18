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
 *   className     — additional CSS classes (for responsive open state)
 */

import { useState } from "react";
import { downloadFile } from "../api";
import ConfidenceGauge from "./ConfidenceGauge";

const EXPORT_OPTIONS = [
  { key: "pdf",     label: "📄 PDF Report",  desc: "Formatted analysis report" },
  { key: "geotiff", label: "🗺 GeoTIFF",     desc: "Satellite imagery patch" },
  { key: "geojson", label: "📍 GeoJSON",     desc: "Evidence vector layer" },
  { key: "log",     label: "📋 JSON Log",    desc: "Structured execution log" },
  { key: "zip",     label: "📦 ZIP Bundle",  desc: "All formats in one archive" },
];

const TASK_META = {
  vqa:        { icon: "❓", label: "Visual Q&A",         color: "#38bdf8", desc: "AI answered your question about this scene." },
  caption:    { icon: "📝", label: "Scene Caption",      color: "#818cf8", desc: "AI described what it sees in the imagery." },
  grounding:  { icon: "📍", label: "Object Grounding",   color: "#34d399", desc: "AI located specific features on the map." },
  change_vqa: { icon: "🔄", label: "Change Detection",   color: "#fbbf24", desc: "AI compared two time periods to find changes." },
  fusion:     { icon: "🔀", label: "Sensor Fusion",      color: "#a78bfa", desc: "AI combined optical + SAR radar data." },
};

const TRACE_STEP_LABELS = {
  task_classification: { icon: "🧠", label: "Intent Classification" },
  input_validation:    { icon: "✅", label: "Input Validation" },
  model_dispatch:      { icon: "🚀", label: "Model Dispatch" },
  aggregation:         { icon: "📊", label: "Result Aggregation" },
};

const LOADING_STEPS = [
  { icon: "🛰", text: "Fetching satellite imagery from GEE…" },
  { icon: "🧠", text: "Classifying your query…" },
  { icon: "🔬", text: "Running AI analysis models…" },
  { icon: "📊", text: "Aggregating results…" },
];

export default function ResultPanel({ result, isLoading, error, onExport, isExporting, exportResult, className = "" }) {
  const [traceOpen, setTraceOpen] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState(["zip"]);
  const [loadingStep] = useState(0);

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

  const confColor =
    confLevel === "high"   ? "var(--color-brand-accent)"
    : confLevel === "medium" ? "var(--color-brand-warning)"
    :                          "var(--color-brand-danger)";

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={`results-panel ${className}`} role="complementary" aria-label="Analysis results">
        <div className="loading-container">
          {/* Orbital satellite animation */}
          <div className="loading-orbit" aria-hidden="true">
            <div className="loading-orbit__ring loading-orbit__ring--outer" />
            <div className="loading-orbit__ring loading-orbit__ring--inner" />
            <div className="loading-orbit__ring loading-orbit__ring--core" />
            <div className="loading-orbit__icon">🛰️</div>
          </div>

          <div>
            <div className="loading-title">Analysing satellite data</div>
            <div className="loading-subtitle">This may take a few seconds…</div>
          </div>

          {/* Steps */}
          <div className="loading-steps" aria-label="Analysis progress">
            {LOADING_STEPS.map((s, i) => (
              <div key={i} className={`loading-step ${i <= loadingStep + 1 ? "loading-step--active" : "loading-step--dim"}`}>
                <div className={`loading-step__icon-box ${i <= loadingStep ? "loading-step__icon-box--active" : "skeleton"}`}>
                  {i <= loadingStep ? s.icon : ""}
                </div>
                <div className={i <= loadingStep ? "loading-step__text" : "skeleton"} style={i > loadingStep ? { flex: 1, height: 12, borderRadius: 4 } : {}}>
                  {i <= loadingStep ? s.text : ""}
                </div>
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
      <div className={`results-panel ${className}`} role="complementary" aria-label="Analysis results">
        <div className="error-container" role="alert">
          <div className="error-icon">⚠️</div>
          <div className="error-title">Analysis Failed</div>
          <div className="error-message">{error}</div>
          <div className="error-troubleshoot">
            <strong className="error-troubleshoot__title">Troubleshooting:</strong><br />
            • Make sure you drew a region on the map<br />
            • Check that the backend server is running<br />
            • Try a smaller region or different date range
          </div>
        </div>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!result) {
    return (
      <div className={`results-panel ${className}`} role="complementary" aria-label="Analysis results">
        <div className="panel-header" style={{ background: "rgba(129,140,248,0.03)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, background: "linear-gradient(90deg, var(--color-brand-secondary), var(--color-brand-primary))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            📊 Analysis Results
          </div>
        </div>
        <div className="empty-state">
          <div className="empty-state__icon">🛰️</div>
          <div>
            <div className="empty-state__title">Ready to analyse</div>
            <div className="empty-state__desc">
              Results will appear here after you run an analysis.
              Start by <strong style={{ color: "var(--color-brand-primary)" }}>drawing a region</strong> on the map.
            </div>
          </div>
          <div className="empty-state__steps">
            {[
              ["📐", "Draw a polygon region on the map"],
              ["💬", "Type a question about the region"],
              ["🔍", "Click Run AI Analysis"],
            ].map(([icon, text], i) => (
              <div key={i} className="empty-state__step">
                <span className="empty-state__step-icon">{icon}</span>
                <span className="empty-state__step-text">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Result ─────────────────────────────────────────────────────────────────
  const taskMeta = TASK_META[result.task_type] || { icon: "❓", label: result.task_type, color: "#38bdf8", desc: "" };

  return (
    <div className={`results-panel animate-in ${className}`} role="complementary" aria-label="Analysis results">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="result-header" style={{ background: `rgba(${hexToRgb(taskMeta.color)}, 0.04)` }}>
        <div className="result-header__top">
          <div
            className="result-header__icon-box"
            style={{
              background: `rgba(${hexToRgb(taskMeta.color)}, 0.12)`,
              border: `1px solid rgba(${hexToRgb(taskMeta.color)}, 0.25)`,
            }}
          >
            {taskMeta.icon}
          </div>
          <div>
            <div className="result-header__task-label" style={{ color: taskMeta.color }}>{taskMeta.label}</div>
            <div className="result-header__session-id">Session {result.session_id?.slice(0, 8)}…</div>
          </div>
          <div className="result-header__confidence">
            <ConfidenceGauge value={result.confidence} size={68} />
          </div>
        </div>
        <div className="result-header__desc">{taskMeta.desc}</div>
        <div className="result-header__bar">
          <div
            className="result-header__bar-fill"
            style={{ width: `${result.confidence * 100}%`, background: confColor }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* ── Answer ──────────────────────────────────────────────────────────── */}
        <div className="panel-section" style={{ paddingTop: 16 }}>
          <div className="section-title"><span>💡</span> AI Answer</div>
          <div className="result-answer">
            {result.answer}
          </div>
        </div>

        {/* ── Change type chips ──────────────────────────────────────────────── */}
        {result.change_types?.length > 0 && (
          <div className="panel-section" style={{ paddingTop: 0 }}>
            <div className="section-title"><span>🔄</span> Detected Changes</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {result.change_types.map((ct) => (
                <span key={ct} className={`change-chip ${ct}`}>
                  {ct.replace(/_/g, " ")}
                </span>
              ))}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--color-text-muted)", marginTop: 6 }}>
              💡 Toggle these layers on the map using the layer panel (bottom-left of map).
            </div>
          </div>
        )}

        {/* ── Warnings ────────────────────────────────────────────────────────── */}
        {result.warnings?.length > 0 && (
          <div className="panel-section" style={{ paddingTop: 0 }}>
            {result.warnings.map((w, i) => (
              <div key={i} className="warning-banner" style={{ marginBottom: i < result.warnings.length - 1 ? 6 : 0 }}>
                <span>⚠️</span><span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Evidence summary ─────────────────────────────────────────────────── */}
        {result.evidence_geojson && (
          <div className="panel-section" style={{ paddingTop: 0 }}>
            <div className="section-title"><span>🗺</span> Map Evidence</div>
            <div className="card" style={{ padding: "10px 14px", fontSize: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: "var(--radius-md)",
                  background: "rgba(56,189,248,0.1)", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 18, flexShrink: 0,
                  border: "1px solid rgba(56,189,248,0.2)"
                }}>📍</div>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--color-brand-primary)", fontSize: 16 }}>
                    {result.evidence_geojson.features?.length ?? 0} features
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--color-text-muted)", marginTop: 1 }}>
                    Highlighted on the map in blue
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Execution trace ───────────────────────────────────────────────────── */}
        {result.execution_trace?.length > 0 && (
          <div className="panel-section" style={{ paddingTop: 0 }}>
            <button
              id="toggle-trace"
              className="collapsible__trigger"
              type="button"
              onClick={() => setTraceOpen(v => !v)}
              aria-expanded={traceOpen}
              style={{ width: "100%", justifyContent: "space-between" }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className={`collapsible__chevron${traceOpen ? " open" : ""}`}>▶</span>
                <span>🔬 How the AI reached this answer</span>
              </span>
              <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>
                {result.execution_trace.length} steps
              </span>
            </button>
            {traceOpen && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }} className="animate-in">
                {result.execution_trace.map((step, i) => {
                  const d = step.detail || {};
                  const meta = TRACE_STEP_LABELS[step.step] || { icon: "⚙", label: step.step.replace(/_/g, " ") };
                  let text = "";
                  switch (step.step) {
                    case "task_classification":
                      text = `Your query was understood as a "${d.task_type?.replace(/_/g, " ")}" task with ${(d.classifier_confidence * 100)?.toFixed(0)}% confidence. Keywords matched: ${d.matched_keywords?.join(", ") || "none"}.`;
                      break;
                    case "input_validation":
                      text = `Inputs were validated: ${d.n_image_refs} satellite image(s) found for a ${d.roi_type} region.`;
                      break;
                    case "model_dispatch":
                      text = `Dispatched to AI models: ${d.models_called?.join(", ")}. These specialist models processed the satellite imagery.`;
                      break;
                    case "aggregation":
                      text = `All model outputs were combined. Final confidence score: ${(d.final_confidence * 100)?.toFixed(0)}%. ${d.n_evidence_features ?? 0} map evidence features generated.`;
                      break;
                    default:
                      if (step.step.startsWith("model_output_")) {
                        text = `${d.model_name} completed analysis with ${(d.confidence * 100)?.toFixed(0)}% confidence.`;
                      } else {
                        text = `Step completed.`;
                      }
                  }
                  return (
                    <div key={i} className="trace-step">
                      <div className="trace-step__header">
                        <span className="trace-step__icon">{meta.icon}</span>
                        <span className="trace-step__label">{meta.label}</span>
                        <span className="trace-step__number">step {i + 1}</span>
                      </div>
                      <div className="trace-step__body">{text}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Export ───────────────────────────────────────────────────────────── */}
        <div className="panel-section" style={{ paddingBottom: 24 }}>
          <div className="section-title"><span>⬇</span> Export Results</div>
          <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 10 }}>
            Download your analysis results in any format:
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 12 }}>
            {EXPORT_OPTIONS.map(({ key, label, desc }) => (
              <label
                key={key}
                htmlFor={`export-${key}`}
                className={`export-option${selectedFormats.includes(key) ? " export-option--selected" : ""}`}
              >
                <input
                  type="checkbox"
                  id={`export-${key}`}
                  className="export-option__checkbox"
                  checked={selectedFormats.includes(key)}
                  onChange={() => toggleFormat(key)}
                />
                <span style={{ flex: 1 }}>
                  <span className="export-option__label">{label}</span>
                  <span className="export-option__desc">{desc}</span>
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
              <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Exporting…</>
            ) : (
              <>⬇ Download Selected ({selectedFormats.length})</>
            )}
          </button>

          {exportResult?.files?.length > 0 && (
            <div className="export-ready">
              <div className="export-ready__label">✅ Ready to download:</div>
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
    </div>
  );
}

// Helper to convert hex color to "r, g, b" for rgba()
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : "56, 189, 248";
}
