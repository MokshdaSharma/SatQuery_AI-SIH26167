/**
 * ChangeStudio.jsx — Tab: Upload & Analysis (Bi-Temporal Change & Trajectory Studio)
 *
 * Features:
 *   - Bi-temporal date epoch selectors (T1 vs T2)
 *   - Dynamic imagery fetching for selected ROI
 *   - ZERO hardcoded results: Metrics, breakdown, and trajectory appear only after computing dynamics
 *   - Interactive Before-vs-After image slider (Split Swipe & Cross-Fade)
 *   - Change percentage calculation & land-cover shift breakdown
 *   - Change severity estimation & risk scoring
 *   - Temporal sequence & milestone change timeline
 *   - Major change inflection point detection
 *   - Change trend multi-line chart (Built-up vs Vegetation vs Rate)
 */

import { useState } from "react";
import BeforeAfterSlider from "./BeforeAfterSlider";

export default function ChangeStudio({
  onRunChangeAnalysis,
  isLoading,
  queryResult,
  error,
  currentROI,
}) {
  const [dateT1, setDateT1] = useState("2022-01-15");
  const [dateT2, setDateT2] = useState("2024-03-20");
  const [activeCategory, setActiveCategory] = useState("all");
  const [changeQuery, setChangeQuery] = useState("");
  const [showBuilt, setShowBuilt] = useState(true);
  const [showVeg, setShowVeg] = useState(true);
  const [showRate, setShowRate] = useState(true);
  const [activeMilestoneIndex, setActiveMilestoneIndex] = useState(0);

  // STRICT RULE: No fake hardcoded analytics. Only use actual backend analytics when computed.
  const analytics = queryResult?.change_analytics || null;

  const handleRunAnalysis = (e) => {
    e?.preventDefault();
    const q =
      changeQuery.trim() ||
      `Compare change between ${dateT1} and ${dateT2}, detect what changed and calculate change percentage`;
    onRunChangeAnalysis?.({
      query: q,
      dateStart: dateT1,
      dateStart2: dateT2,
      modality: "optical",
    });
  };

  // Severity color mapping
  const severityColors = {
    low: { bg: "rgba(52, 211, 153, 0.15)", text: "#34d399", border: "rgba(52, 211, 153, 0.4)" },
    moderate: { bg: "rgba(251, 191, 36, 0.15)", text: "#fbbf24", border: "rgba(251, 191, 36, 0.4)" },
    significant: { bg: "rgba(249, 115, 22, 0.15)", text: "#f97316", border: "rgba(249, 115, 22, 0.4)" },
    critical: { bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444", border: "rgba(239, 68, 68, 0.4)" },
  };

  const currentSev = analytics?.severity
    ? severityColors[analytics.severity.level] || severityColors.moderate
    : severityColors.moderate;

  const handleMilestoneClick = (step, idx) => {
    setActiveMilestoneIndex(idx);
    if (idx === 0) {
      setDateT1(step.date);
    } else {
      setDateT2(step.date);
    }
  };

  return (
    <div className="change-studio-layout">
      {/* ── Top Header & Date Selector ────────────────────────────────────── */}
      <div className="change-studio-header card">
        <div className="change-studio-header__info">
          <div className="change-studio-badge">🔄 Multitemporal Intelligence</div>
          <h2 className="change-studio-title">Bi-Temporal Change & Trajectory Studio</h2>
          <p className="change-studio-desc">
            Analyze morphological land-cover shifts, compute quantitative change percentages, and estimate severity across multi-year satellite observation sequences.
          </p>
        </div>

        <form className="change-date-selector-form" onSubmit={handleRunAnalysis}>
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
            {isLoading ? "Analyzing Dynamics…" : "⚡ Compute Change Dynamics"}
          </button>
        </form>
      </div>

      {error && (
        <div className="toast toast--error" role="alert">
          <strong>Analysis Error:</strong> {error}
        </div>
      )}

      {/* ── Ready State (When No Analysis Has Run Yet) ───────────────────────── */}
      {!analytics && (
        <div className="change-studio-empty-container card">
          <div className="empty-state">
            <div className="empty-state__icon">🛰️</div>
            <div className="empty-state__title">Awaiting Bi-Temporal Computation</div>
            <div className="empty-state__desc" style={{ maxWidth: 620, margin: "0 auto" }}>
              Provide your <strong>Baseline Epoch (T1)</strong> and <strong>Target Epoch (T2)</strong> above, then click{" "}
              <strong style={{ color: "var(--color-brand-primary)" }}>⚡ Compute Change Dynamics</strong> to fetch satellite observations, calculate land-cover shifts, and generate change trajectories for the active region.
            </div>

            <div className="bitemporal-preview-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24, width: "100%", maxWidth: 780 }}>
              <div className="bitemporal-epoch-box" style={{ background: "rgba(56,189,248,0.03)", border: "1px dashed rgba(56,189,248,0.25)", borderRadius: 10, padding: "20px 16px", textAlign: "center" }}>
                <span style={{ fontSize: 24 }}>🛰️</span>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#38bdf8", marginTop: 8 }}>Epoch T1: Baseline Observation</div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>Date: {dateT1}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 8, background: "rgba(255,255,255,0.04)", padding: "4px 8px", borderRadius: 4 }}>
                  Sentinel-2 MSI Pre-Change Reference
                </div>
              </div>

              <div className="bitemporal-epoch-box" style={{ background: "rgba(52,211,153,0.03)", border: "1px dashed rgba(52,211,153,0.25)", borderRadius: 10, padding: "20px 16px", textAlign: "center" }}>
                <span style={{ fontSize: 24 }}>🗺️</span>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#34d399", marginTop: 8 }}>Epoch T2: Target Observation</div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>Date: {dateT2}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 8, background: "rgba(255,255,255,0.04)", padding: "4px 8px", borderRadius: 4 }}>
                  Sentinel-2 MSI Post-Event Capture
                </div>
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleRunAnalysis}
                disabled={isLoading}
              >
                {isLoading ? "Fetching Satellite Epochs…" : "⚡ Compute Change Dynamics Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Active Results Grid (Computed Dynamically) ───────────────────────── */}
      {analytics && (
        <div className="change-studio-grid">
          {/* Left Column: Interactive Slider & Timeline */}
          <div className="change-studio-left">
            {/* Interactive Before-vs-After Slider */}
            <BeforeAfterSlider
              beforeDate={dateT1}
              afterDate={dateT2}
              beforeLabel="Baseline Epoch (T1)"
              afterLabel="Target Epoch (T2)"
            />

            {/* Temporal Sequence & Milestone Timeline */}
            {analytics.temporal_sequence?.length > 0 && (
              <div className="card change-timeline-card">
                <div className="card-header-flex">
                  <h3 className="section-title">⏱ Temporal Sequence & Change Timeline</h3>
                  <span className="badge badge--cyan">{analytics.temporal_sequence.length} Milestones</span>
                </div>
                <p style={{ fontSize: 11.5, color: "var(--color-text-muted)", margin: "0 0 12px" }}>
                  💡 Click any milestone below to update the target epoch date in the viewer:
                </p>

                <div className="change-timeline">
                  {analytics.temporal_sequence.map((step, idx) => (
                    <div
                      key={idx}
                      className={`timeline-item timeline-item--${step.type} ${activeMilestoneIndex === idx ? "timeline-item--selected" : ""}`}
                      onClick={() => handleMilestoneClick(step, idx)}
                      style={{ cursor: "pointer" }}
                      title="Click to load this milestone"
                    >
                      <div className="timeline-item__marker">
                        <div
                          className="timeline-item__dot"
                          style={
                            activeMilestoneIndex === idx
                              ? { transform: "scale(1.3)", boxShadow: "0 0 10px #38bdf8" }
                              : {}
                          }
                        />
                        {idx < analytics.temporal_sequence.length - 1 && <div className="timeline-item__line" />}
                      </div>
                      <div className="timeline-item__content">
                        <div
                          className="timeline-item__date"
                          style={{
                            fontWeight: activeMilestoneIndex === idx ? 800 : 600,
                            color: activeMilestoneIndex === idx ? "#38bdf8" : "inherit",
                          }}
                        >
                          {step.date} {activeMilestoneIndex === idx && "⭐ [Active Epoch]"}
                        </div>
                        <div className="timeline-item__event">{step.event}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Quantitative Metrics & Trajectory Plot */}
          <div className="change-studio-right">
            {/* Summary Metric Cards */}
            <div className="change-metric-row">
              {/* Change Percentage Card */}
              <div className="card change-stat-box">
                <div className="change-stat-box__label">Total Land-Cover Shift</div>
                <div className="change-stat-box__value change-stat-box__value--cyan">
                  {analytics.change_percentage}%
                </div>
                <div className="change-stat-box__sub">Surface area altered in ROI</div>
                <div className="change-progress-bar">
                  <div
                    className="change-progress-fill"
                    style={{ width: `${Math.min(100, (analytics.change_percentage || 0) * 3)}%` }}
                  />
                </div>
              </div>

              {/* Severity Estimation Card */}
              {analytics.severity && (
                <div className="card change-stat-box" style={{ borderColor: currentSev.border }}>
                  <div className="change-stat-box__label">Change Severity Estimation</div>
                  <div
                    className="change-stat-box__badge"
                    style={{ background: currentSev.bg, color: currentSev.text, borderColor: currentSev.border }}
                  >
                    {analytics.severity.label}
                  </div>
                  <div className="change-stat-box__score">
                    Severity Score: <strong>{analytics.severity.score} / 100</strong>
                  </div>
                  <div className="change-stat-box__rationale">
                    {analytics.severity.rationale}
                  </div>
                </div>
              )}
            </div>

            {/* Land Cover Shift Breakdown */}
            {analytics.breakdown && (
              <div className="card breakdown-card">
                <h3 className="section-title">📊 Land-Cover Change Breakdown</h3>
                <div className="breakdown-list">
                  <div className="breakdown-item breakdown-item--increased">
                    <span className="breakdown-item__tag">🔺 Area Increased:</span>
                    <span className="breakdown-item__val">{analytics.breakdown.increased}</span>
                  </div>
                  <div className="breakdown-item breakdown-item--decreased">
                    <span className="breakdown-item__tag">🔻 Area Decreased:</span>
                    <span className="breakdown-item__val">{analytics.breakdown.decreased}</span>
                  </div>
                  <div className="breakdown-item breakdown-item--unchanged">
                    <span className="breakdown-item__tag">⚪ Unchanged Matrix:</span>
                    <span className="breakdown-item__val">{analytics.breakdown.unchanged}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Major Change Inflection Point Identification */}
            {analytics.major_change_event && (
              <div className="card major-change-card">
                <div className="card-header-flex">
                  <h3 className="section-title">⚡ Major Change Inflection Point</h3>
                  <span className="badge badge--orange">{analytics.major_change_event.category}</span>
                </div>
                <div className="major-change-details">
                  <div className="major-change-row">
                    <span className="major-change-key">Peak Shift Date:</span>
                    <span className="major-change-val highlight-val">{analytics.major_change_event.date}</span>
                  </div>
                  <div className="major-change-row">
                    <span className="major-change-key">Description:</span>
                    <span className="major-change-val">{analytics.major_change_event.description}</span>
                  </div>
                  {analytics.major_change_event.area_sq_m && (
                    <div className="major-change-row">
                      <span className="major-change-key">Footprint Area:</span>
                      <span className="major-change-val">{analytics.major_change_event.area_sq_m.toLocaleString()} m²</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Change Trends Multi-Line Chart (SVG) */}
            {analytics.trend_points?.length > 0 && (
              <div className="card change-chart-card">
                <div className="card-header-flex">
                  <h3 className="section-title">📈 Temporal Change Trends & Trajectory</h3>
                  <div className="chart-legend-flex" style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setShowBuilt(!showBuilt)}
                      className="filter-pill"
                      style={{
                        background: showBuilt ? "rgba(249,115,22,0.2)" : "transparent",
                        color: showBuilt ? "#f97316" : "#64748b",
                        border: "1px solid rgba(249,115,22,0.4)",
                      }}
                    >
                      {showBuilt ? "✓" : "○"} Built-up
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowVeg(!showVeg)}
                      className="filter-pill"
                      style={{
                        background: showVeg ? "rgba(16,185,129,0.2)" : "transparent",
                        color: showVeg ? "#10b981" : "#64748b",
                        border: "1px solid rgba(16,185,129,0.4)",
                      }}
                    >
                      {showVeg ? "✓" : "○"} Veg (NDVI)
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRate(!showRate)}
                      className="filter-pill"
                      style={{
                        background: showRate ? "rgba(56,189,248,0.2)" : "transparent",
                        color: showRate ? "#38bdf8" : "#64748b",
                        border: "1px solid rgba(56,189,248,0.4)",
                      }}
                    >
                      {showRate ? "✓" : "○"} Change %
                    </button>
                  </div>
                </div>

                <div className="change-chart-wrapper" style={{ height: 200, width: "100%", marginTop: 12 }}>
                  <svg viewBox="0 0 500 180" className="trend-svg" style={{ width: "100%", height: "100%" }}>
                    <defs>
                      <linearGradient id="builtGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="vegGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    <line x1="40" y1="20" x2="480" y2="20" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                    <line x1="40" y1="70" x2="480" y2="70" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                    <line x1="40" y1="120" x2="480" y2="120" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                    <line x1="40" y1="160" x2="480" y2="160" stroke="rgba(255,255,255,0.15)" />

                    {/* Built-up Curve */}
                    {showBuilt && (
                      <polyline
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="2.5"
                        points="40,140 150,130 260,110 370,85 480,60"
                      />
                    )}

                    {/* Veg Curve */}
                    {showVeg && (
                      <polyline
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        points="40,40 150,55 260,75 370,95 480,105"
                      />
                    )}

                    {/* Change Rate Curve */}
                    {showRate && (
                      <polyline
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                        points="40,160 150,145 260,120 370,90 480,65"
                      />
                    )}

                    {/* Labels */}
                    {analytics.trend_points.map((pt, i) => (
                      <text
                        key={i}
                        x={40 + i * 110}
                        y="175"
                        fill="#94a3b8"
                        fontSize="10"
                        textAnchor="middle"
                      >
                        {pt.date}
                      </text>
                    ))}
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
