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

const QUERY_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "urban", label: "🏢 Urban" },
  { id: "water", label: "🌊 Water / Flood" },
  { id: "eco", label: "🌿 Forestry" },
  { id: "sar", label: "📡 SAR Radar" },
  { id: "change", label: "🔄 Change" },
];

const QUERY_EXAMPLES = [
  { cat: "urban", icon: "🏢", label: "Building Footprints", text: "Where are the buildings and built-up structures in this area?" },
  { cat: "urban", icon: "🛣", label: "Road Network", text: "Highlight the primary road network and transport corridors." },
  { cat: "water", icon: "🌊", label: "Flood Mapping", text: "Detect flooded areas and standing water using SAR backscatter drop." },
  { cat: "water", icon: "💧", label: "Water Reservoir", text: "Analyze the water body surface area and moisture levels using NDWI." },
  { cat: "eco", icon: "🌿", label: "Land Cover Overview", text: "Describe the overall land cover and vegetation patterns in this scene." },
  { cat: "eco", icon: "🪓", label: "Deforestation", text: "Has there been any vegetation loss or clearing in the northern sector?" },
  { cat: "sar", icon: "☁️", label: "Cloud Penetration", text: "Analyze ground infrastructure under cloud cover using Sentinel-1 SAR." },
  { cat: "sar", icon: "📡", label: "Radar Roughness", text: "Highlight areas with high double-bounce radar backscatter and metal towers." },
  { cat: "change", icon: "🏗", label: "Urban Expansion", text: "How has the built-up area increased between the two observation dates?" },
  { cat: "change", icon: "📊", label: "Percentage Shift", text: "Calculate percentage change in vegetation and built-up areas since 2022." },
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
  conversationHistory = [],
  onClearHistory,
  className = "",
}) {
  const [query, setQuery]         = useState("");
  const [modality, setModality]   = useState("optical");
  const [dateStart, setDateStart] = useState("2024-01-01");
  const [dateEnd, setDateEnd]     = useState("");
  const [dateStart2, setDateStart2] = useState("");
  const [dateEnd2, setDateEnd2]   = useState("");
  const [showSecondDate, setShowSecondDate] = useState(false);
  const [exampleOpen, setExampleOpen] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
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
      conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
    });
    setQuery("");
  }

  function applyExample(text) {
    setQuery(text);
    if (text.toLowerCase().includes("since") || text.toLowerCase().includes("change") ||
        text.toLowerCase().includes("between") || text.toLowerCase().includes("increased")) {
      setShowSecondDate(true);
      if (!dateStart2) setDateStart2("2023-01-01");
    }
    if (text.toLowerCase().includes("sar") || text.toLowerCase().includes("radar") || text.toLowerCase().includes("cloud")) {
      setModality("both");
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

        {/* ── Query & Conversation Thread ───────────────────────────────────── */}
        <div className="panel-section">
          <div className="card-header-flex" style={{ marginBottom: 8 }}>
            <div className="section-title" style={{ marginBottom: 0 }}><span>💬</span> {conversationHistory.length > 0 ? "Follow-Up Query" : "Ask a Question"}</div>
            {conversationHistory.length > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={onClearHistory}
                title="Clear conversation history"
                style={{ fontSize: 11, color: "var(--color-text-muted)" }}
              >
                🧹 Clear Chat
              </button>
            )}
          </div>

          {/* Previous Conversation Turns Thread */}
          {conversationHistory.length > 0 && (
            <div className="conversation-thread" style={{ marginBottom: 12 }}>
              {conversationHistory.map((item, idx) => (
                <div key={idx} className="conversation-bubble-group">
                  <div className="chat-bubble chat-bubble--user">
                    <span className="chat-bubble__icon">👤</span>
                    <span className="chat-bubble__text">{item.query}</span>
                  </div>
                  {item.answer && (
                    <div className="chat-bubble chat-bubble--assistant">
                      <span className="chat-bubble__icon">🛰️</span>
                      <span className="chat-bubble__text">{item.answer.length > 120 ? item.answer.slice(0, 120) + "…" : item.answer}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Quick suggestion chips */}
          <div style={{ marginBottom: 12 }}>
            <div className="quick-chips-header" style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
              ⚡ Quick Query Suggestions
            </div>
            <div className="quick-query-chips-row" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {[
                { label: "Describe this scene", query: "Describe the overall land cover and terrain features in this scene." },
                { label: "Find buildings", query: "Identify and highlight all major buildings and built-up structures." },
                { label: "Find water bodies", query: "Detect water bodies, lakes, and moisture zones using NDWI." },
                { label: "Identify vegetation", query: "Analyze vegetation health, canopy coverage, and agricultural vigour." },
                { label: "Highlight roads", query: "Highlight the primary road network and transport corridors." },
                { label: "Analyze urban area", query: "Identify the major built-up areas and impervious surfaces in this image." },
              ].map((item, i) => (
                <button
                  key={i}
                  type="button"
                  className="quick-chip-btn"
                  onClick={() => applyExample(item.query)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="example-category-pills">
              {QUERY_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`example-cat-btn${selectedCategory === cat.id ? " example-cat-btn--active" : ""}`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="example-list" role="list">
              {QUERY_EXAMPLES.filter(q => selectedCategory === "all" || q.cat === selectedCategory).slice(0, 3).map(({ icon, label, text }, i) => (
                <button
                  key={i}
                  type="button"
                  id={`example-query-${i}`}
                  className="example-chip"
                  onClick={() => applyExample(text)}
                  role="listitem"
                >
                  <span className="example-chip__icon">{icon}</span>
                  <span><strong>{label}:</strong> {text}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <textarea
                id="query-input"
                className="form-textarea form-textarea--query"
                placeholder={conversationHistory.length > 0 ? "Ask a follow-up question using context from previous answer…" : "e.g. Describe the land cover in this region… or Where are the buildings?"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Analysis query"
                rows={3}
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
              style={{ gap: 8, padding: "11px 16px", fontSize: 13, width: "100%" }}
            >
              {isLoading ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Analysing satellite data…
                </>
              ) : conversationHistory.length > 0 ? (
                <>💬 Send Follow-Up Question</>
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
