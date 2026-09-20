/**
 * ChangeStudio.jsx — Tab 2: Multitemporal & Change Analytics Studio.
 *
 * Features:
 *   - Bi-temporal date epoch selectors (T1 vs T2)
 *   - Interactive Before-vs-After image slider
 *   - Change percentage calculation & land-cover shift breakdown
 *   - Change severity estimation & risk scoring
 *   - Temporal sequence & milestone change timeline
 *   - Major change inflection point detection
 *   - Interactive change trend multi-line chart (Built-up vs Vegetation vs Rate)
 *   - Change-focused VQA interrogation console
 */

import { useState } from "react";
import BeforeAfterSlider from "./BeforeAfterSlider";

export default function ChangeStudio({
  onRunChangeAnalysis,
  isLoading,
  queryResult,
  error,
}) {
  const [dateT1, setDateT1] = useState("2022-01-15");
  const [dateT2, setDateT2] = useState("2024-03-20");
  const [activeCategory, setActiveCategory] = useState("all");
  const [changeQuery, setChangeQuery] = useState("");

  const analytics = queryResult?.change_analytics || {
    change_percentage: 14.8,
    breakdown: {
      increased: "8.4% (New Construction & Built-Up)",
      decreased: "6.4% (Vegetation Clearing / Water Siltation)",
      unchanged: "85.2% (Stable Matrix)",
    },
    severity: {
      level: "moderate",
      score: 62,
      label: "Moderate / Significant Expansion",
      rationale: "Noticeable urban expansion with 8.4% newly paved built-up surface across transport corridors.",
    },
    temporal_sequence: [
      { date: "2022-01-15", event: "Baseline pre-change reference capture (Dense vegetation, low density)", type: "baseline" },
      { date: "2022-11-04", event: "Earthwork & ground clearance initiated along northern corridor", type: "inflection" },
      { date: "2023-07-19", event: "Structural foundation laid; road network paved", type: "inflection" },
      { date: "2024-03-20", event: "Structural completion & infrastructure consolidation", type: "post_event" },
    ],
    major_change_event: {
      date: "2023-07-19",
      description: "Primary urban footprint expansion and road network consolidation",
      category: "Urban Development",
      area_sq_m: 12840.0,
      impact: "High structural permanence",
    },
    trend_points: [
      { date: "Q1 2022", built_up_index: 0.22, vegetation_index: 0.68, change_rate: 0.0 },
      { date: "Q3 2022", built_up_index: 0.26, vegetation_index: 0.64, change_rate: 3.1 },
      { date: "Q1 2023", built_up_index: 0.31, vegetation_index: 0.59, change_rate: 6.8 },
      { date: "Q3 2023", built_up_index: 0.35, vegetation_index: 0.54, change_rate: 10.4 },
      { date: "Q1 2024", built_up_index: 0.40, vegetation_index: 0.51, change_rate: 14.8 },
    ],
  };

  const handleRunAnalysis = (e) => {
    e?.preventDefault();
    const q = changeQuery.trim() || `Compare change between ${dateT1} and ${dateT2}, detect what changed and calculate change percentage`;
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
  const currentSev = severityColors[analytics.severity.level] || severityColors.moderate;

  const [showBuilt, setShowBuilt] = useState(true);
  const [showVeg, setShowVeg] = useState(true);
  const [showRate, setShowRate] = useState(true);
  const [activeMilestoneIndex, setActiveMilestoneIndex] = useState(0);

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
      {/* Top Banner & Date Selector */}
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

      {/* Main Grid: Visual Diff + Quantitative Analytics */}
      <div className="change-studio-grid">
        {/* Left Column: Interactive Slider & Timeline */}
        <div className="change-studio-left">
          {/* Interactive Before-vs-After Slider */}
          <BeforeAfterSlider
            beforeDate={dateT1}
            afterDate={dateT2}
            beforeLabel="Pre-Event"
            afterLabel="Post-Event"
          />

          {/* Temporal Sequence & Milestone Timeline */}
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
                    <div className="timeline-item__dot" style={activeMilestoneIndex === idx ? { transform: "scale(1.3)", boxShadow: "0 0 10px #38bdf8" } : {}} />
                    {idx < analytics.temporal_sequence.length - 1 && <div className="timeline-item__line" />}
                  </div>
                  <div className="timeline-item__content">
                    <div className="timeline-item__date" style={{ fontWeight: activeMilestoneIndex === idx ? 800 : 600, color: activeMilestoneIndex === idx ? "#38bdf8" : "inherit" }}>
                      {step.date} {activeMilestoneIndex === idx && "⭐ [Active Epoch]"}
                    </div>
                    <div className="timeline-item__event">{step.event}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
                  style={{ width: `${Math.min(100, analytics.change_percentage * 3)}%` }}
                />
              </div>
            </div>

            {/* Severity Estimation Card */}
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
          </div>

          {/* Land Cover Shift Breakdown */}
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
                <div className="major-change-row">
                  <span className="major-change-key">Footprint Area:</span>
                  <span className="major-change-val">{analytics.major_change_event.area_sq_m.toLocaleString()} m²</span>
                </div>
              </div>
            </div>
          )}

          {/* Change Trends Multi-Line Chart (SVG) */}
          <div className="card change-chart-card">
            <div className="card-header-flex">
              <h3 className="section-title">📈 Temporal Change Trends & Spectral Trajectory</h3>
              <div className="chart-legend-flex" style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setShowBuilt(!showBuilt)}
                  className="filter-pill"
                  style={{ background: showBuilt ? "rgba(249,115,22,0.2)" : "transparent", color: showBuilt ? "#f97316" : "#64748b", border: "1px solid rgba(249,115,22,0.4)" }}
                >
                  {showBuilt ? "✓" : "○"} Built-up (NDBI)
                </button>
                <button
                  type="button"
                  onClick={() => setShowVeg(!showVeg)}
                  className="filter-pill"
                  style={{ background: showVeg ? "rgba(16,185,129,0.2)" : "transparent", color: showVeg ? "#10b981" : "#64748b", border: "1px solid rgba(16,185,129,0.4)" }}
                >
                  {showVeg ? "✓" : "○"} Veg (NDVI)
                </button>
                <button
                  type="button"
                  onClick={() => setShowRate(!showRate)}
                  className="filter-pill"
                  style={{ background: showRate ? "rgba(56,189,248,0.2)" : "transparent", color: showRate ? "#38bdf8" : "#64748b", border: "1px solid rgba(56,189,248,0.4)" }}
                >
                  {showRate ? "✓" : "○"} Rate %
                </button>
              </div>
            </div>

            <div className="change-trend-chart-wrapper">
              <svg viewBox="0 0 500 180" className="change-trend-svg">
                <defs>
                  <linearGradient id="builtGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="vegGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid lines */}
                <line x1="40" y1="20" x2="480" y2="20" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <line x1="40" y1="70" x2="480" y2="70" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <line x1="40" y1="120" x2="480" y2="120" stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <line x1="40" y1="150" x2="480" y2="150" stroke="rgba(255,255,255,0.15)" />

                {/* Axis Labels */}
                <text x="35" y="25" fill="#64748b" fontSize="10" textAnchor="end">1.0</text>
                <text x="35" y="75" fill="#64748b" fontSize="10" textAnchor="end">0.5</text>
                <text x="35" y="125" fill="#64748b" fontSize="10" textAnchor="end">0.2</text>
                <text x="35" y="153" fill="#64748b" fontSize="10" textAnchor="end">0.0</text>

                {/* Plot points & path */}
                {(() => {
                  const pts = analytics.trend_points;
                  const xStep = 440 / (pts.length - 1);
                  const getX = (i) => 40 + i * xStep;
                  const getYBuilt = (val) => 150 - val * 130;
                  const getYVeg = (val) => 150 - val * 130;
                  const getYRate = (val) => 150 - (val / 20) * 130;

                  const pathBuilt = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getYBuilt(p.built_up_index)}`).join(" ");
                  const pathVeg = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getYVeg(p.vegetation_index)}`).join(" ");
                  const pathRate = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getYRate(p.change_rate)}`).join(" ");

                  return (
                    <>
                      {/* Area fills */}
                      {showBuilt && <path d={`${pathBuilt} L ${getX(pts.length - 1)} 150 L 40 150 Z`} fill="url(#builtGrad)" />}
                      {showVeg && <path d={`${pathVeg} L ${getX(pts.length - 1)} 150 L 40 150 Z`} fill="url(#vegGrad)" />}
                      {showRate && <path d={`${pathRate} L ${getX(pts.length - 1)} 150 L 40 150 Z`} fill="url(#rateGrad)" />}

                      {/* Line paths */}
                      {showBuilt && <path d={pathBuilt} fill="none" stroke="#f97316" strokeWidth="2.5" />}
                      {showVeg && <path d={pathVeg} fill="none" stroke="#10b981" strokeWidth="2.5" />}
                      {showRate && <path d={pathRate} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="4 2" />}

                      {/* Data dots and X labels */}
                      {pts.map((p, i) => (
                        <g key={i}>
                          {showBuilt && <circle cx={getX(i)} cy={getYBuilt(p.built_up_index)} r="4" fill="#f97316" stroke="#fff" strokeWidth="1.5" />}
                          {showVeg && <circle cx={getX(i)} cy={getYVeg(p.vegetation_index)} r="4" fill="#10b981" stroke="#fff" strokeWidth="1.5" />}
                          {showRate && <circle cx={getX(i)} cy={getYRate(p.change_rate)} r="3.5" fill="#38bdf8" stroke="#fff" strokeWidth="1.5" />}
                          <text x={getX(i)} y="168" fill="#94a3b8" fontSize="10" textAnchor="middle">{p.date}</text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>

          {/* Change-Based VQA Interactive Query Input */}
          <div className="card change-vqa-input-card">
            <h3 className="section-title">💬 Ask Change-Based Question</h3>
            <div className="change-vqa-flex">
              <input
                type="text"
                className="form-input"
                placeholder="e.g., What caused the sudden vegetation drop between 2022 and 2023?"
                value={changeQuery}
                onChange={(e) => setChangeQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRunAnalysis(e)}
              />
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleRunAnalysis}
                disabled={isLoading}
              >
                {isLoading ? "Querying…" : "Ask VQA"}
              </button>
            </div>

            {queryResult?.answer && (
              <div className="change-answer-box" style={{ marginTop: 12, padding: "10px 14px", background: "rgba(56,189,248,0.08)", borderLeft: "3px solid #38bdf8", borderRadius: "0 6px 6px 0" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", marginBottom: 4 }}>
                  AI Change Analysis Answer:
                </div>
                <p style={{ margin: 0, fontSize: 12.5, color: "#f1f5f9", lineHeight: 1.5 }}>
                  {queryResult.answer}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
