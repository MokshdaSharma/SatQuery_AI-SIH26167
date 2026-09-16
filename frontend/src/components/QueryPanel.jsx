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
  { value: "optical", label: "🛰 Optical", desc: "Sentinel-2 RGB" },
  { value: "sar",     label: "📡 SAR",     desc: "Sentinel-1 Radar" },
  { value: "both",    label: "🔀 Both",    desc: "Fused analysis" },
];

const QUERY_EXAMPLES = [
  { label: "🌿 Land cover",    text: "Describe the land cover in this region." },
  { label: "🏢 Find buildings", text: "Where are the buildings in this area?" },
  { label: "🪓 Deforestation",  text: "Has there been any deforestation since 2022?" },
  { label: "🏗 Urban change",   text: "How has the urban extent changed between the two dates?" },
  { label: "🌊 Flood mapping",  text: "Detect flooded areas using SAR and optical data." },
  { label: "🌾 Vegetation",     text: "What is the dominant vegetation type here?" },
];

// Step-by-step workflow guide shown to new users
const HOW_IT_WORKS = [
  { step: "1", icon: "📐", title: "Draw Region", desc: "Use the polygon tool (top-right of map) to outline your area of interest." },
  { step: "2", icon: "📅", title: "Set Dates",   desc: "Pick the date range you want to analyse." },
  { step: "3", icon: "💬", title: "Ask a Question", desc: "Type or select a question about the region." },
  { step: "4", icon: "🔍", title: "Run Analysis", desc: "Click Run Analysis — AI will answer using satellite data." },
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
  const [guideOpen, setGuideOpen] = useState(false);

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
      imageRefs: uploadResult ? [uploadResult.image_id] : (dateStart2 ? [] : (imageryResult?.images?.map((img) => img.image_id) || [])),
      inputMode,
    });
  }

  function applyExample(text) {
    setQuery(text);
    setExampleOpen(false);
    if (text.toLowerCase().includes("since") || text.toLowerCase().includes("change") ||
        text.toLowerCase().includes("between")) {
      setShowSecondDate(true);
      if (!dateStart2) setDateStart2("2023-01-01");
    }
  }

  const currentStep = !roi && inputMode === "roi" ? 1 : (!query.trim() ? 2 : 3);

  return (
    <div className="sidebar">

      {/* ── Branding header ─────────────────────────────────────────────────── */}
      <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--color-border)", background: "rgba(56,189,248,0.03)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 22 }}>🛰️</span>
            <span style={{ fontWeight: 700, fontSize: 15, background: "linear-gradient(90deg, var(--color-brand-primary), var(--color-brand-secondary))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Analysis Setup</span>
          </div>
          <button
            type="button"
            onClick={() => setGuideOpen(v => !v)}
            style={{ fontSize: 11, color: "var(--color-brand-primary)", background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: 20, padding: "3px 10px", cursor: "pointer", transition: "all 0.2s" }}
          >
            {guideOpen ? "✕ Close Guide" : "❓ How it works"}
          </button>
        </div>
        <p style={{ fontSize: 11.5, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
          Ask questions about any location on Earth using real satellite data.
        </p>
      </div>

      {/* ── How it works guide ──────────────────────────────────────────────── */}
      {guideOpen && (
        <div style={{ padding: "14px 16px", background: "rgba(56,189,248,0.04)", borderBottom: "1px solid var(--color-border)" }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--color-brand-primary)", marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>Quick Start Guide</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {HOW_IT_WORKS.map(({ step, icon, title, desc }) => (
              <div key={step} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg, var(--color-brand-primary), var(--color-brand-secondary))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0, marginTop: 1 }}>{step}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 1 }}>{icon} {title}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", lineHeight: 1.45 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Progress indicator ──────────────────────────────────────────────── */}
      {!guideOpen && (
        <div style={{ padding: "10px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", gap: 6, alignItems: "center" }}>
          {["Draw ROI", "Set Query", "Run"].map((label, i) => {
            const done = i + 1 < currentStep;
            const active = i + 1 === currentStep;
            return (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, flex: i < 2 ? 1 : 0 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700, flexShrink: 0,
                  background: done ? "var(--color-brand-accent)" : active ? "var(--color-brand-primary)" : "rgba(56,189,248,0.1)",
                  color: done || active ? "#fff" : "var(--color-text-muted)",
                  border: active ? "2px solid var(--color-brand-primary)" : done ? "none" : "1px solid var(--color-border)",
                  boxShadow: active ? "0 0 8px rgba(56,189,248,0.4)" : "none",
                  transition: "all 0.3s",
                }}>
                  {done ? "✓" : i + 1}
                </div>
                <span style={{ fontSize: 10, color: active ? "var(--color-brand-primary)" : done ? "var(--color-brand-accent)" : "var(--color-text-muted)", fontWeight: active ? 600 : 400, transition: "color 0.3s" }}>{label}</span>
                {i < 2 && <div style={{ flex: 1, height: 1, background: done ? "var(--color-brand-accent)" : "var(--color-border)", transition: "background 0.3s" }} />}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto" }}>

        {/* ── Input mode toggle ─────────────────────────────────────────────── */}
        <div className="panel-section">
          <div className="section-title">
            <span>📥</span> Input Source
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <button
              type="button"
              id="input-mode-roi"
              onClick={() => setInputMode("roi")}
              style={{
                padding: "9px 10px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 500,
                background: inputMode === "roi" ? "rgba(56,189,248,0.18)" : "rgba(56,189,248,0.05)",
                border: inputMode === "roi" ? "1px solid rgba(56,189,248,0.5)" : "1px solid var(--color-border)",
                color: inputMode === "roi" ? "var(--color-brand-primary)" : "var(--color-text-secondary)",
                transition: "all 0.2s",
              }}
            >
              🗺 Draw on Map
            </button>
            <button
              type="button"
              id="input-mode-upload"
              onClick={() => setInputMode("upload")}
              style={{
                padding: "9px 10px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 500,
                background: inputMode === "upload" ? "rgba(56,189,248,0.18)" : "rgba(56,189,248,0.05)",
                border: inputMode === "upload" ? "1px solid rgba(56,189,248,0.5)" : "1px solid var(--color-border)",
                color: inputMode === "upload" ? "var(--color-brand-primary)" : "var(--color-text-secondary)",
                transition: "all 0.2s",
              }}
            >
              📤 Upload Image
            </button>
          </div>
        </div>

        {/* ── ROI status ──────────────────────────────────────────────────────── */}
        {inputMode === "roi" && (
          <div className="panel-section">
            <div className="section-title"><span>📐</span> Step 1: Draw Your Region</div>
            {roi ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.3)" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--color-brand-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>✓</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-brand-accent)" }}>Region drawn!</div>
                  <div style={{ fontSize: 10.5, color: "var(--color-text-muted)", marginTop: 1 }}>Polygon ROI is ready for analysis</div>
                </div>
              </div>
            ) : (
              <div style={{ padding: "14px 14px", borderRadius: 8, border: "1px dashed rgba(56,189,248,0.3)", background: "rgba(56,189,248,0.04)", textAlign: "center" }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>🖊</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4 }}>No region drawn yet</div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)", lineHeight: 1.5 }}>Click the <strong style={{ color: "var(--color-brand-primary)" }}>polygon icon</strong> in the top-right corner of the map, then click to draw your area.</div>
              </div>
            )}
          </div>
        )}

        {/* ── Upload mode ──────────────────────────────────────────────────────── */}
        {inputMode === "upload" && (
          <div className="panel-section">
            <div className="section-title"><span>📤</span> Step 1: Upload Image</div>
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

        {/* ── Imagery Modality ─────────────────────────────────────────────────── */}
        <div className="panel-section">
          <div className="section-title"><span>📡</span> Imagery Type</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 5 }}>
            {MODALITIES.map(({ value, label, desc }) => (
              <button
                key={value}
                id={`modality-${value}`}
                onClick={() => setModality(value)}
                type="button"
                style={{
                  padding: "8px 6px", borderRadius: 8, cursor: "pointer", textAlign: "center",
                  background: modality === value ? "rgba(56,189,248,0.18)" : "rgba(56,189,248,0.04)",
                  border: modality === value ? "1px solid rgba(56,189,248,0.5)" : "1px solid var(--color-border)",
                  color: modality === value ? "var(--color-brand-primary)" : "var(--color-text-secondary)",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 9.5, color: modality === value ? "rgba(56,189,248,0.7)" : "var(--color-text-muted)", marginTop: 2 }}>{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Date Range ─────────────────────────────────────────────────────────── */}
        <div className="panel-section">
          <div className="section-title"><span>📅</span> Step 2: Date Range</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="date-start">From</label>
              <input id="date-start" className="form-input" type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="date-end">To <span style={{ color: "var(--color-text-muted)", fontSize: 10 }}>(optional)</span></label>
              <input id="date-end" className="form-input" type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── Change Detection toggle ─────────────────────────────────────────── */}
        <div className="panel-section">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: showSecondDate ? 10 : 0 }}>
            <div>
              <div className="section-title" style={{ marginBottom: 2 }}><span>🔄</span> Change Detection</div>
              <div style={{ fontSize: 10.5, color: "var(--color-text-muted)" }}>Compare two time periods</div>
            </div>
            <div
              role="checkbox"
              aria-checked={showSecondDate}
              tabIndex={0}
              onClick={() => setShowSecondDate(v => !v)}
              onKeyDown={(e) => e.key === "Enter" && setShowSecondDate(v => !v)}
              style={{
                width: 38, height: 20, borderRadius: 10, cursor: "pointer", flexShrink: 0,
                background: showSecondDate ? "var(--color-brand-primary)" : "var(--color-border)",
                transition: "background 0.2s", position: "relative",
              }}
            >
              <div style={{ position: "absolute", top: 3, left: showSecondDate ? 20 : 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
            </div>
          </div>

          {showSecondDate && (
            <div style={{ padding: "12px", borderRadius: 8, background: "rgba(56,189,248,0.05)", border: "1px solid rgba(56,189,248,0.2)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-brand-primary)", marginBottom: 8 }}>📅 Second Time Period (After)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="date-start-2">From</label>
                  <input id="date-start-2" className="form-input" type="date" value={dateStart2} onChange={(e) => setDateStart2(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="date-end-2">To <span style={{ color: "var(--color-text-muted)", fontSize: 10 }}>(optional)</span></label>
                  <input id="date-end-2" className="form-input" type="date" value={dateEnd2} onChange={(e) => setDateEnd2(e.target.value)} />
                </div>
              </div>
              <div style={{ marginTop: 8, fontSize: 10.5, color: "var(--color-brand-accent)" }}>💡 Try: "What changed?" or "Detect new construction."</div>
            </div>
          )}
        </div>

        {/* ── Query ─────────────────────────────────────────────────────────────── */}
        <div className="panel-section">
          <div className="section-title"><span>💬</span> Step 3: Ask a Question</div>

          {/* Example queries */}
          <div style={{ marginBottom: 8 }}>
            <button
              type="button"
              className="collapsible__trigger"
              id="toggle-examples"
              onClick={() => setExampleOpen(v => !v)}
            >
              <span className={`collapsible__chevron${exampleOpen ? " open" : ""}`}>▶</span>
              {exampleOpen ? "Hide example questions" : "✨ Show example questions"}
            </button>
            {exampleOpen && (
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                {QUERY_EXAMPLES.map(({ label, text }, i) => (
                  <button
                    key={i}
                    type="button"
                    id={`example-query-${i}`}
                    onClick={() => applyExample(text)}
                    style={{
                      background: "rgba(56,189,248,0.05)", border: "1px solid var(--color-border)", borderRadius: 7,
                      color: "var(--color-text-secondary)", cursor: "pointer", fontSize: 11.5,
                      padding: "7px 10px", textAlign: "left", transition: "all 0.15s", display: "flex", alignItems: "center", gap: 8,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(56,189,248,0.4)"; e.currentTarget.style.background = "rgba(56,189,248,0.1)"; e.currentTarget.style.color = "var(--color-text-primary)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.background = "rgba(56,189,248,0.05)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
                  >
                    <span style={{ fontSize: 13 }}>{label.split(" ")[0]}</span>
                    <span>{label.split(" ").slice(1).join(" ")}: {text}</span>
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
                placeholder="e.g. Describe the land cover in this region… or Where are the buildings?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ minHeight: 90, resize: "vertical" }}
              />
              {query.trim().length > 0 && query.trim().length < 3 && (
                <div style={{ fontSize: 10.5, color: "var(--color-brand-warning)", marginTop: 4 }}>Type at least 3 characters</div>
              )}
            </div>

            {!hasInput && (
              <div className="warning-banner" style={{ marginBottom: 12, fontSize: 12 }}>
                <span>⚠️</span>
                <span>
                  {inputMode === "roi"
                    ? "First draw a region on the map using the polygon tool (top-right corner)."
                    : "Please upload a satellite image first."}
                </span>
              </div>
            )}

            <button
              id="submit-query"
              type="submit"
              className="btn btn-primary"
              disabled={!canSubmit}
              style={{ width: "100%", justifyContent: "center", gap: 8, padding: "10px 16px", fontSize: 13 }}
            >
              {isLoading ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Analysing satellite data…
                </>
              ) : (
                <>🔍 Run AI Analysis</>
              )}
            </button>
          </form>
        </div>

        {/* ── Imagery fetch status ───────────────────────────────────────────── */}
        {imageryResult && (
          <div className="panel-section" style={{ paddingBottom: 20 }}>
            <div className="section-title"><span>🖼</span> Retrieved Imagery</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {imageryResult.images.map((img) => (
                <div key={img.image_id} className="card" style={{ padding: "8px 12px", fontSize: 11.5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>
                      {img.modality === "optical" ? "🛰 Optical" : "📡 SAR"}
                    </span>
                    <span style={{ color: "var(--color-text-muted)", fontSize: 11 }}>{img.date_acquired}</span>
                  </div>
                  {img.cloud_cover != null && (
                    <div style={{ fontSize: 10.5, color: "var(--color-text-muted)", marginTop: 3 }}>
                      ☁ {img.cloud_cover.toFixed(1)}% cloud cover
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
