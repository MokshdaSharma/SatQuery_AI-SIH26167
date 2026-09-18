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
 *   className             — additional CSS classes (for responsive open state)
 */

import { useState } from "react";
import ImageUploadPanel from "./ImageUploadPanel";

const MODALITIES = [
  { value: "optical", label: "🛰 Optical", desc: "Sentinel-2 RGB" },
  { value: "sar",     label: "📡 SAR",     desc: "Sentinel-1 Radar" },
  { value: "both",    label: "🔀 Both",    desc: "Fused analysis" },
];

const QUERY_EXAMPLES = [
  { icon: "🌿", label: "Land cover",    text: "Describe the land cover in this region." },
  { icon: "🏢", label: "Find buildings", text: "Where are the buildings in this area?" },
  { icon: "🪓", label: "Deforestation",  text: "Has there been any deforestation since 2022?" },
  { icon: "🏗", label: "Urban change",   text: "How has the urban extent changed between the two dates?" },
  { icon: "🌊", label: "Flood mapping",  text: "Detect flooded areas using SAR and optical data." },
  { icon: "🌾", label: "Vegetation",     text: "What is the dominant vegetation type here?" },
];

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
  className = "",
}) {
  const [query, setQuery]         = useState("");
  const [modality, setModality]   = useState("optical");
  const [dateStart, setDateStart] = useState("2024-01-01");
  const [dateEnd, setDateEnd]     = useState("");
  const [dateStart2, setDateStart2] = useState("");
  const [dateEnd2, setDateEnd2]   = useState("");
  const [showSecondDate, setShowSecondDate] = useState(false);
  const [exampleOpen, setExampleOpen] = useState(false);
  const [inputMode, setInputMode] = useState("roi");
  const [guideOpen, setGuideOpen] = useState(false);

  const hasInput = inputMode === "roi" ? !!roi : !!uploadResult;
  const canSubmit = hasInput && query.trim().length >= 3 && !isLoading;
  const currentStep = !roi && inputMode === "roi" ? 1 : (!query.trim() ? 2 : 3);

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

  return (
    <div className={`sidebar ${className}`} role="complementary" aria-label="Analysis setup panel">

      {/* ── Panel header ──────────────────────────────────────────────────── */}
      <div className="panel-header">
        <div className="panel-header__top">
          <div className="panel-header__title-group">
            <span className="panel-header__icon">🛰️</span>
            <span className="panel-header__title">Analysis Setup</span>
          </div>
          <button
            type="button"
            className="guide-btn"
            onClick={() => setGuideOpen(v => !v)}
            aria-expanded={guideOpen}
            aria-controls="guide-panel"
          >
            {guideOpen ? "✕ Close Guide" : "❓ How it works"}
          </button>
        </div>
        <p className="panel-header__desc">
          Ask questions about any location on Earth using real satellite data.
        </p>
      </div>

      {/* ── How it works guide ──────────────────────────────────────────────── */}
      {guideOpen && (
        <div className="guide-panel" id="guide-panel" role="region" aria-label="Quick start guide">
          <div className="guide-panel__title">Quick Start Guide</div>
          {HOW_IT_WORKS.map(({ step, icon, title, desc }) => (
            <div key={step} className="guide-step">
              <div className="guide-step__number">{step}</div>
              <div>
                <div className="guide-step__title">{icon} {title}</div>
                <div className="guide-step__desc">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Progress indicator ──────────────────────────────────────────────── */}
      {!guideOpen && (
        <div className="step-progress" aria-label="Workflow progress">
          {["Draw ROI", "Set Query", "Run"].map((label, i) => {
            const done = i + 1 < currentStep;
            const active = i + 1 === currentStep;
            const stateClass = done ? "done" : active ? "active" : "pending";
            return (
              <div key={label} className={`step-progress__item${i < 2 ? " step-progress__item--grow" : ""}`}>
                <div className={`step-progress__circle step-progress__circle--${stateClass}`}>
                  {done ? "✓" : i + 1}
                </div>
                <span className={`step-progress__label step-progress__label--${stateClass}`}>
                  {label}
                </span>
                {i < 2 && (
                  <div className={`step-progress__line step-progress__line--${done ? "done" : "pending"}`} />
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="panel-body">

        {/* ── Input mode toggle ─────────────────────────────────────────────── */}
        <div className="panel-section">
          <div className="section-title"><span>📥</span> Input Source</div>
          <div className="input-mode-grid">
            <button
              type="button"
              id="input-mode-roi"
              className={`input-mode-btn${inputMode === "roi" ? " input-mode-btn--active" : ""}`}
              onClick={() => setInputMode("roi")}
            >
              🗺 Draw on Map
            </button>
            <button
              type="button"
              id="input-mode-upload"
              className={`input-mode-btn${inputMode === "upload" ? " input-mode-btn--active" : ""}`}
              onClick={() => setInputMode("upload")}
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
              <div className="roi-status--ready">
                <div className="roi-status__icon">✓</div>
                <div>
                  <div className="roi-status__title">Region drawn!</div>
                  <div className="roi-status__desc">Polygon ROI is ready for analysis</div>
                </div>
              </div>
            ) : (
              <div className="roi-status--empty">
                <div className="roi-status__empty-icon">🖊</div>
                <div className="roi-status__empty-title">No region drawn yet</div>
                <div className="roi-status__empty-desc">
                  Click the <strong style={{ color: "var(--color-brand-primary)" }}>polygon icon</strong> in
                  the top-right corner of the map, then click to draw your area.
                </div>
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
          <div className="modality-grid" role="radiogroup" aria-label="Imagery modality">
            {MODALITIES.map(({ value, label, desc }) => (
              <button
                key={value}
                id={`modality-${value}`}
                className={`modality-card${modality === value ? " modality-card--active" : ""}`}
                onClick={() => setModality(value)}
                type="button"
                role="radio"
                aria-checked={modality === value}
              >
                <div className="modality-card__label">{label}</div>
                <div className="modality-card__desc">{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Date Range ─────────────────────────────────────────────────────────── */}
        <div className="panel-section">
          <div className="section-title"><span>📅</span> Step 2: Date Range</div>
          <div className="date-grid">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="date-start">From</label>
              <input id="date-start" className="form-input" type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="date-end">
                To <span className="form-label__hint">(optional)</span>
              </label>
              <input id="date-end" className="form-input" type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── Change Detection toggle ─────────────────────────────────────────── */}
        <div className="panel-section">
          <div className="change-detect-header" style={{ marginBottom: showSecondDate ? 0 : 0 }}>
            <div className="change-detect-info">
              <div className="section-title" style={{ marginBottom: 2 }}><span>🔄</span> Change Detection</div>
              <div className="change-detect-info__subtitle">Compare two time periods</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showSecondDate}
              aria-label="Toggle change detection"
              className={`toggle-switch toggle-switch--${showSecondDate ? "on" : "off"}`}
              onClick={() => setShowSecondDate(v => !v)}
            >
              <div className="toggle-switch__thumb" />
            </button>
          </div>

          {showSecondDate && (
            <div className="second-date-panel">
              <div className="second-date-panel__title">📅 Second Time Period (After)</div>
              <div className="date-grid">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="date-start-2">From</label>
                  <input id="date-start-2" className="form-input" type="date" value={dateStart2} onChange={(e) => setDateStart2(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="date-end-2">
                    To <span className="form-label__hint">(optional)</span>
                  </label>
                  <input id="date-end-2" className="form-input" type="date" value={dateEnd2} onChange={(e) => setDateEnd2(e.target.value)} />
                </div>
              </div>
              <div className="second-date-panel__hint">💡 Try: "What changed?" or "Detect new construction."</div>
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
              aria-expanded={exampleOpen}
            >
              <span className={`collapsible__chevron${exampleOpen ? " open" : ""}`}>▶</span>
              {exampleOpen ? "Hide example questions" : "✨ Show example questions"}
            </button>
            {exampleOpen && (
              <div className="example-list" role="list">
                {QUERY_EXAMPLES.map(({ icon, label, text }, i) => (
                  <button
                    key={i}
                    type="button"
                    id={`example-query-${i}`}
                    className="example-chip"
                    onClick={() => applyExample(text)}
                    role="listitem"
                  >
                    <span className="example-chip__icon">{icon}</span>
                    <span>{label}: {text}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <textarea
                id="query-input"
                className="form-textarea form-textarea--query"
                placeholder="e.g. Describe the land cover in this region… or Where are the buildings?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Analysis query"
              />
              {query.trim().length > 0 && query.trim().length < 3 && (
                <div className="form-hint">Type at least 3 characters</div>
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
              className={`btn btn-primary${canSubmit && !isLoading ? " btn-primary--ready" : ""}`}
              disabled={!canSubmit}
              style={{ gap: 8, padding: "11px 16px", fontSize: 13 }}
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
                <div key={img.image_id} className="card imagery-card">
                  <div className="imagery-card__top">
                    <span className="imagery-card__modality">
                      {img.modality === "optical" ? "🛰 Optical" : "📡 SAR"}
                    </span>
                    <span className="imagery-card__date">{img.date_acquired}</span>
                  </div>
                  {img.cloud_cover != null && (
                    <div className="imagery-card__cloud">
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
