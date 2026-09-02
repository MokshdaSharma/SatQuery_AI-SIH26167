/**
 * QueryPanel.jsx — Left sidebar for query input, date selection, and modality toggle.
 *
 * Props:
 *   roi               — GeoJSON geometry (null if not drawn yet)
 *   onSubmit(params)  — called on form submit with query params
 *   isLoading         — show loading state on submit button
 *   imageryResult     — result of fetch-imagery call (or null)
 */

import { useState } from "react";

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

export default function QueryPanel({ roi, onSubmit, isLoading, imageryResult }) {
  const [query, setQuery]         = useState("");
  const [modality, setModality]   = useState("optical");
  const [dateStart, setDateStart] = useState("2024-01-01");
  const [dateEnd, setDateEnd]     = useState("");
  const [dateStart2, setDateStart2] = useState("");
  const [dateEnd2, setDateEnd2]   = useState("");
  const [showSecondDate, setShowSecondDate] = useState(false);
  const [exampleOpen, setExampleOpen] = useState(false);

  const canSubmit = roi && query.trim().length >= 3 && !isLoading;

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
      imageRefs: imageryResult?.images?.map((img) => img.image_id) || [],
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
          Draw an ROI on the map, then configure and submit your query.
        </p>
      </div>

      {/* ── ROI Status ──────────────────────────────────────────────────────── */}
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

        {/* Change analysis second epoch */}
        <div style={{ marginTop:4 }}>
          <button
            type="button"
            className="collapsible__trigger"
            id="toggle-second-date"
            onClick={() => setShowSecondDate((v) => !v)}
          >
            <span className={`collapsible__chevron${showSecondDate ? " open" : ""}`}>▶</span>
            Change analysis — second epoch
          </button>
          {showSecondDate && (
            <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:12 }}>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label" htmlFor="date-start-2">Second start date</label>
                <input
                  id="date-start-2"
                  className="form-input"
                  type="date"
                  value={dateStart2}
                  onChange={(e) => setDateStart2(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label" htmlFor="date-end-2">Second end date (optional)</label>
                <input
                  id="date-end-2"
                  className="form-input"
                  type="date"
                  value={dateEnd2}
                  onChange={(e) => setDateEnd2(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
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

          {!roi && (
            <div className="warning-banner" style={{ marginBottom:12 }}>
              <span>⚠️</span>
              <span>Draw a region of interest on the map first.</span>
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
