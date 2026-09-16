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

export default function ResultPanel({ result, isLoading, error, onExport, isExporting, exportResult }) {
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
      <div className="results-panel">
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: "0 20px" }}>
          {/* Pulsing satellite icon */}
          <div style={{ position: "relative", width: 70, height: 70 }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(56,189,248,0.3)", animation: "spin 3s linear infinite" }} />
            <div style={{ position: "absolute", inset: 8, borderRadius: "50%", border: "2px solid rgba(56,189,248,0.6)", animation: "spin 2s linear infinite reverse" }} />
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🛰️</div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 6 }}>Analysing satellite data</div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>This may take a few seconds…</div>
          </div>

          {/* Steps */}
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
            {LOADING_STEPS.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, opacity: i <= loadingStep + 1 ? 1 : 0.3, transition: "opacity 0.5s" }}>
                <div className={i <= loadingStep ? "" : "skeleton"} style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, background: i <= loadingStep ? "rgba(56,189,248,0.12)" : undefined, border: i <= loadingStep ? "1px solid rgba(56,189,248,0.25)" : undefined, flexShrink: 0 }}>
                  {i <= loadingStep ? s.icon : ""}
                </div>
                <div className={i <= loadingStep ? "" : "skeleton"} style={{ flex: 1, height: 12, borderRadius: 4, ...(i <= loadingStep ? { background: "none", color: "var(--color-text-secondary)", fontSize: 11.5 } : {}) }}>
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
      <div className="results-panel">
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 20px", gap: 16 }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-brand-danger)", marginBottom: 8 }}>Analysis Failed</div>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{error}</div>
          </div>
          <div style={{ padding: "12px 16px", borderRadius: 10, background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.2)", fontSize: 11, color: "var(--color-text-muted)", lineHeight: 1.6, width: "100%" }}>
            <strong style={{ color: "var(--color-text-secondary)" }}>Troubleshooting:</strong><br />
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
      <div className="results-panel">
        <div style={{ padding: "20px 20px 14px", borderBottom: "1px solid var(--color-border)", background: "rgba(129,140,248,0.03)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, background: "linear-gradient(90deg, var(--color-brand-secondary), var(--color-brand-primary))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>📊 Analysis Results</div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", gap: 20, textAlign: "center" }}>
          <div style={{ fontSize: 52, opacity: 0.4 }}>🛰️</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 8 }}>Ready to analyse</div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.7 }}>
              Results will appear here after you run an analysis.<br />
              Start by <strong style={{ color: "var(--color-brand-primary)" }}>drawing a region</strong> on the map.
            </div>
          </div>
          {/* Mini guide */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", marginTop: 8 }}>
            {[["📐", "Draw a polygon region on the map"], ["💬", "Type a question about the region"], ["🔍", "Click Run AI Analysis"]].map(([icon, text], i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(56,189,248,0.04)", border: "1px solid var(--color-border)" }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{icon}</span>
                <span style={{ fontSize: 11.5, color: "var(--color-text-secondary)" }}>{text}</span>
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
    <div className="results-panel animate-in">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--color-border)", background: `rgba(${hexToRgb(taskMeta.color)}, 0.04)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: `rgba(${hexToRgb(taskMeta.color)}, 0.15)`, border: `1px solid rgba(${hexToRgb(taskMeta.color)}, 0.3)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>
            {taskMeta.icon}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: taskMeta.color }}>{taskMeta.label}</div>
            <div style={{ fontSize: 10.5, color: "var(--color-text-muted)" }}>Session {result.session_id?.slice(0, 8)}…</div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 2 }}>Confidence</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: confColor }}>{(result.confidence * 100).toFixed(0)}%</div>
          </div>
        </div>
        <div style={{ fontSize: 10.5, color: "var(--color-text-muted)", fontStyle: "italic" }}>{taskMeta.desc}</div>
        <div style={{ height: 3, borderRadius: 3, background: "var(--color-border)", marginTop: 8, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${result.confidence * 100}%`, borderRadius: 3, background: confColor, transition: "width 0.8s ease" }} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* ── Answer ──────────────────────────────────────────────────────────── */}
        <div className="panel-section" style={{ paddingTop: 16 }}>
          <div className="section-title"><span>💡</span> AI Answer</div>
          <div style={{ fontSize: 13, lineHeight: 1.75, color: "var(--color-text-primary)", padding: "14px 16px", borderRadius: 10, background: "rgba(56,189,248,0.04)", border: "1px solid var(--color-border)" }}>
            {result.answer}
          </div>
        </div>

        {/* ── Change type chips ──────────────────────────────────────────────── */}
        {result.change_types?.length > 0 && (
          <div className="panel-section" style={{ paddingTop: 0 }}>
            <div className="section-title"><span>🔄</span> Detected Changes</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {result.change_types.map((ct) => (
                <span key={ct} className={`change-chip ${ct}`} style={{ padding: "4px 10px" }}>
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
              <div key={i} className="warning-banner" style={{ fontSize: 11.5, marginBottom: i < result.warnings.length - 1 ? 6 : 0 }}>
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
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(56,189,248,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>📍</div>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--color-brand-primary)", fontSize: 15 }}>
                    {result.evidence_geojson.features?.length ?? 0} features
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--color-text-muted)", marginTop: 1 }}>Highlighted on the map in blue</div>
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
              style={{ width: "100%", justifyContent: "space-between" }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className={`collapsible__chevron${traceOpen ? " open" : ""}`}>▶</span>
                <span>🔬 How the AI reached this answer</span>
              </span>
              <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>{result.execution_trace.length} steps</span>
            </button>
            {traceOpen && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
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
                    <div key={i} style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(56,189,248,0.04)", border: "1px solid var(--color-border)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                        <span style={{ fontSize: 14 }}>{meta.icon}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "capitalize" }}>{meta.label}</span>
                        <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--color-text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>step {i + 1}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--color-text-primary)", lineHeight: 1.6 }}>{text}</div>
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
                style={{
                  display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                  padding: "8px 10px", borderRadius: 8,
                  border: `1px solid ${selectedFormats.includes(key) ? "rgba(56,189,248,0.4)" : "var(--color-border)"}`,
                  background: selectedFormats.includes(key) ? "rgba(56,189,248,0.08)" : "transparent",
                  transition: "all 0.15s",
                }}
              >
                <input
                  type="checkbox"
                  id={`export-${key}`}
                  checked={selectedFormats.includes(key)}
                  onChange={() => toggleFormat(key)}
                  style={{ accentColor: "var(--color-brand-primary)" }}
                />
                <span style={{ flex: 1 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 500 }}>{label}</span>
                  <span style={{ display: "block", fontSize: 10.5, color: "var(--color-text-muted)", marginTop: 1 }}>{desc}</span>
                </span>
              </label>
            ))}
          </div>

          <button
            id="export-button"
            className="btn btn-primary"
            onClick={handleExport}
            disabled={isExporting || selectedFormats.length === 0}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {isExporting ? (
              <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Exporting…</>
            ) : (
              <>⬇ Download Selected ({selectedFormats.length})</>
            )}
          </button>

          {exportResult?.files?.length > 0 && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ fontSize: 11, color: "var(--color-brand-accent)", marginBottom: 2 }}>✅ Ready to download:</div>
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
