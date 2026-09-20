/**
 * ExecutionTraceViewer.jsx — Interactive auditable agent execution trace modal.
 *
 * Props:
 *   result      — QueryResponse object containing execution_trace
 *   onClose()   — close callback
 */

import { useEffect, useRef } from "react";
import FormattedAnswer from "./FormattedAnswer";

const TASK_META = {
  vqa:                { icon: "💬", label: "Visual Q&A",         color: "#818cf8" },
  caption:            { icon: "📝", label: "Scene Captioning",   color: "#34d399" },
  grounding:          { icon: "📍", label: "Region Grounding",   color: "#f59e0b" },
  change_vqa:         { icon: "🔄", label: "Change VQA",         color: "#fb923c" },
  change_segmentation:{ icon: "🗺", label: "Change Segmentation", color: "#e879f9" },
  fusion:             { icon: "🛰️", label: "Optical–SAR Fusion", color: "#38bdf8" },
};

const MODEL_META = {
  VQACaptionModel:        { icon: "🤖", hf: "mokshda/satquery-ai-vqa-lora",           base: "LLaVA-1.5-7B + LoRA" },
  ChangeVQAModel:         { icon: "🔄", hf: "mokshda/satquery-ai-change-vqa-lora",    base: "LLaVA-1.5-7B + LoRA" },
  ChangeSegmentationModel:{ icon: "🗺", hf: "mokshda/satquery-ai-change-segmentation", base: "ResNet34 U-Net" },
  GroundingModel:         { icon: "📍", hf: "Custom shapely grounding",               base: "Shapely GeoJSON" },
  FusionModel:            { icon: "📡", hf: "GPT-4o / Claude 3.5 Sonnet fallback",    base: "Vision + Spectral fusion" },
};

function StepIcon({ step }) {
  if (step.includes("classify") || step.includes("task"))     return <span>🧠</span>;
  if (step.includes("validate") || step.includes("input"))    return <span>✅</span>;
  if (step.includes("imagery") || step.includes("fetch"))     return <span>🛰️</span>;
  if (step.includes("dispatch") || step.includes("model"))    return <span>⚡</span>;
  if (step.includes("aggregate") || step.includes("result"))  return <span>📊</span>;
  if (step.includes("export"))                                 return <span>📄</span>;
  return <span>🔷</span>;
}

function ConfidenceBar({ value }) {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 65 ? "#34d399" : pct >= 45 ? "#f59e0b" : "#f87171";
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-text-muted)", marginBottom: 4 }}>
        <span>Model Confidence</span>
        <span style={{ color, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div className="confidence-bar">
        <div className="confidence-bar__fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function ExecutionTraceViewer({ result, onClose }) {
  const dialogRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Trap focus
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  if (!result) return null;

  const taskMeta = TASK_META[result.task_type] || { icon: "❓", label: result.task_type, color: "#38bdf8" };
  const steps = result.execution_trace || [];

  // Try to extract model name from trace
  const dispatchStep = steps.find(s => s.step?.includes("dispatch") || s.step?.includes("model"));
  const modelName = dispatchStep?.detail?.model || dispatchStep?.detail?.specialist || null;
  const modelInfo = modelName ? MODEL_META[modelName] : null;

  return (
    <div
      className="trace-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Agent Execution Trace"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="trace-modal" ref={dialogRef} tabIndex={-1}>
        {/* Header */}
        <div className="trace-modal__header" style={{ borderBottom: `2px solid ${taskMeta.color}` }}>
          <div className="trace-modal__title">
            <span style={{ fontSize: 22 }}>⚡</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Agent Execution Trace</div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Session {result.session_id?.slice(0, 12)}…</div>
            </div>
          </div>
          <button className="trace-modal__close" onClick={onClose} aria-label="Close trace viewer">✕</button>
        </div>

        <div className="trace-modal__body">
          {/* ── Task Summary ─────────────────────────────────────────────── */}
          <div className="trace-section">
            <div className="trace-section__title">1. Task Classification</div>
            <div className="trace-card" style={{ borderColor: taskMeta.color }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: `rgba(${parseInt(taskMeta.color.slice(1,3),16)},${parseInt(taskMeta.color.slice(3,5),16)},${parseInt(taskMeta.color.slice(5,7),16)},0.12)`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                  border: `1px solid ${taskMeta.color}40`,
                }}>
                  {taskMeta.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: taskMeta.color, fontSize: 14 }}>{taskMeta.label}</div>
                  <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 2 }}>
                    Task Type: <code style={{ color: "var(--color-text-primary)" }}>{result.task_type}</code>
                  </div>
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <ConfidenceBar value={result.confidence} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Model Selected ───────────────────────────────────────────── */}
          {modelInfo && (
            <div className="trace-section">
              <div className="trace-section__title">2. Specialist Model Selected</div>
              <div className="trace-card">
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 26 }}>{modelInfo.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--color-text-primary)" }}>{modelName}</div>
                    <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 3 }}>
                      Architecture: <span style={{ color: "var(--color-brand-primary)" }}>{modelInfo.base}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                      🤗 {modelInfo.hf}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step-by-step timeline ─────────────────────────────────────── */}
          <div className="trace-section">
            <div className="trace-section__title">3. Execution Steps</div>
            <div className="trace-timeline">
              {steps.map((step, i) => (
                <div key={i} className="trace-step">
                  <div className="trace-step__connector">
                    <div className="trace-step__dot" />
                    {i < steps.length - 1 && <div className="trace-step__line" />}
                  </div>
                  <div className="trace-step__content">
                    <div className="trace-step__header">
                      <StepIcon step={step.step || ""} />
                      <span className="trace-step__name">{step.step}</span>
                      <span className="trace-step__index">Step {i + 1}</span>
                    </div>
                    {step.detail && (
                      <div className="trace-step__detail">
                        {typeof step.detail === "string" ? (
                          <span>{step.detail}</span>
                        ) : (
                          <pre style={{ fontSize: 11, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                            {JSON.stringify(step.detail, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {steps.length === 0 && (
                <div style={{ fontSize: 12.5, color: "var(--color-text-muted)", padding: "12px 0" }}>
                  No detailed trace steps available for this session.
                </div>
              )}
            </div>
          </div>

          {/* ── Answer summary ────────────────────────────────────────────── */}
          <div className="trace-section">
            <div className="trace-section__title">4. Final Output</div>
            <div className="trace-card">
              <div style={{ fontWeight: 600, fontSize: 12, color: "var(--color-brand-primary)", marginBottom: 8 }}>
                💡 AI Answer
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.65, color: "var(--color-text-primary)" }}>
                <FormattedAnswer text={result.answer} />
              </div>
              {result.evidence_geojson?.features?.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--color-text-muted)" }}>
                  📍 {result.evidence_geojson.features.length} evidence feature(s) generated and overlaid on the map.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
