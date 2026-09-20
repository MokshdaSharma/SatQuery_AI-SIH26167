import React, { useState } from "react";

export default function LandingPage({ onLaunchWorkspace, onSelectTab }) {
  const [activePreviewLayer, setActivePreviewLayer] = useState("optical"); // optical, sar, change, evidence
  const [selectedPreset, setSelectedPreset] = useState("dubai");

  const PRESETS = {
    dubai: {
      title: "Dubai Waterfront Expansion",
      tag: "Urban Growth & Infill",
      opticalImg: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80",
      sarImg: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
      stats: { change: "+18.4%", buildings: 142, vegDelta: "-4.2%", confidence: "92%" },
      summary: "High-density coastal land reclamation and structural infill detected across maritime sectors.",
      entities: { location: "Dubai Maritime Sector", date: "2022 - 2024", object: "Built-up & Ports", condition: "Clear Sky" }
    },
    kerala: {
      title: "Kerala Monsoonal Inundation",
      tag: "Disaster • SAR Flood",
      opticalImg: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80",
      sarImg: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
      stats: { change: "+34.1%", buildings: 28, waterExtent: "41.8 km²", confidence: "94%" },
      summary: "SAR C-band radar reveals extensive surface water backscatter beneath 95% monsoonal cloud canopy.",
      entities: { location: "Alappuzha Basin, Kerala", date: "August 2023", object: "Inundation Polygons", condition: "Heavy Rain / Cloud" }
    },
    amazon: {
      title: "Amazon Canopy Transition",
      tag: "Forestry & Ecology",
      opticalImg: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1200&q=80",
      sarImg: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1200&q=80",
      stats: { change: "-12.7%", canopyLoss: "840 ha", regrowth: "2.1%", confidence: "89%" },
      summary: "Multitemporal spectral index ΔNDVI reflects primary canopy clearing along logging corridors.",
      entities: { location: "Pará Region, Amazon Basin", date: "2021 - 2024", object: "Deforestation Clustered", condition: "Scattered Cloud" }
    }
  };

  const curr = PRESETS[selectedPreset];

  return (
    <div className="landing-page-root">
      {/* ── TOP HERO SECTION ────────────────────────────────────────────── */}
      <section className="landing-hero-section">
        <div className="hero-background-glow"></div>
        <div className="hero-grid-lines"></div>

        <div className="landing-hero-container">
          {/* Left Column: Hero Pitch & CTAs */}
          <div className="landing-hero-left">
            <div className="hero-badge-pill">
              <span className="pulsing-status-dot"></span>
              <span className="badge-text">Agentic Vision-Language Earth Intelligence</span>
            </div>

            <h1 className="hero-title">
              Ask questions. <br />
              <span className="hero-gradient-text">Analyze Earth.</span> <br />
              Understand change.
            </h1>

            <p className="hero-subtitle">
              Analyze satellite imagery using natural language. Query optical, SAR radar, and multitemporal observations through specialized AI models with visual evidence grounding.
            </p>

            <div className="hero-actions-row">
              <button
                className="btn-primary-hero"
                onClick={() => onLaunchWorkspace("studio")}
              >
                <span>Launch SatQuery Studio</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>

              <button
                className="btn-secondary-hero"
                onClick={() => {
                  const el = document.getElementById("landing-capabilities-section");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <span>Explore Capabilities</span>
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="hero-metrics-grid">
              <div className="hero-metric-item">
                <span className="metric-val">100%</span>
                <span className="metric-label">All-Weather SAR Radar</span>
              </div>
              <div className="hero-metric-divider"></div>
              <div className="hero-metric-item">
                <span className="metric-val">5+</span>
                <span className="metric-label">Specialist AI Models</span>
              </div>
              <div className="hero-metric-divider"></div>
              <div className="hero-metric-item">
                <span className="metric-val">&lt; 1.2s</span>
                <span className="metric-label">Query Resolution</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Satellite AI Preview */}
          <div className="landing-hero-right">
            <div className="hero-satellite-card">
              {/* Card Header with Preset Selector */}
              <div className="hero-card-header">
                <div className="preset-selector-group">
                  {Object.keys(PRESETS).map((k) => (
                    <button
                      key={k}
                      className={`preset-btn ${selectedPreset === k ? "active" : ""}`}
                      onClick={() => setSelectedPreset(k)}
                    >
                      {PRESETS[k].title.split(" ")[0]}
                    </button>
                  ))}
                </div>
                <div className="hero-card-tag">{curr.tag}</div>
              </div>

              {/* Satellite Visualization Screen */}
              <div className="hero-map-viewport">
                <img
                  src={activePreviewLayer === "sar" ? curr.sarImg : curr.opticalImg}
                  alt={curr.title}
                  className="hero-sat-image"
                />

                {/* Simulated GIS Evidence Overlays */}
                <div className="hero-gis-overlay">
                  {/* Bounding Box 1 */}
                  <div className="sim-bbox bbox-1">
                    <span className="bbox-label">Target Zone: +18.4% Built-Up</span>
                  </div>
                  {/* Bounding Box 2 */}
                  <div className="sim-bbox bbox-2">
                    <span className="bbox-label">SAR Backscatter Confirmed</span>
                  </div>
                </div>

                {/* Layer Switcher Toolbar Overlay */}
                <div className="hero-layer-toolbar">
                  <button
                    className={`layer-tool-btn ${activePreviewLayer === "optical" ? "active" : ""}`}
                    onClick={() => setActivePreviewLayer("optical")}
                  >
                    🛰️ Optical RGB
                  </button>
                  <button
                    className={`layer-tool-btn ${activePreviewLayer === "sar" ? "active" : ""}`}
                    onClick={() => setActivePreviewLayer("sar")}
                  >
                    📡 Sentinel-1 SAR
                  </button>
                  <button
                    className={`layer-tool-btn ${activePreviewLayer === "change" ? "active" : ""}`}
                    onClick={() => setActivePreviewLayer("change")}
                  >
                    🔄 Change Delta
                  </button>
                </div>

                {/* Floating AI Analysis Card on Map */}
                <div className="hero-floating-insight-card">
                  <div className="floating-card-header">
                    <span className="ai-dot"></span>
                    <span className="title">AI Scene Grounding</span>
                    <span className="conf-badge">{curr.stats.confidence} Conf</span>
                  </div>
                  <p className="floating-card-text">{curr.summary}</p>
                  <div className="floating-card-chips">
                    <span className="chip loc">📍 {curr.entities.location}</span>
                    <span className="chip obj">🏢 {curr.entities.object}</span>
                    <span className="chip cond">🌧️ {curr.entities.condition}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Card Footer with Live KPI Stats */}
              <div className="hero-card-footer-stats">
                <div className="footer-stat">
                  <span className="f-label">Change Delta</span>
                  <span className="f-val highlight">{curr.stats.change}</span>
                </div>
                <div className="footer-stat">
                  <span className="f-label">Features Resolved</span>
                  <span className="f-val">{curr.stats.buildings || curr.stats.waterExtent}</span>
                </div>
                <div className="footer-stat">
                  <span className="f-label">Cross-Modal Score</span>
                  <span className="f-val text-green">{curr.stats.confidence}</span>
                </div>
                <button
                  className="btn-open-workspace-mini"
                  onClick={() => onLaunchWorkspace("studio")}
                >
                  Analyze in Studio →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CORE CAPABILITIES SECTION ────────────────────────────────────── */}
      <section id="landing-capabilities-section" className="landing-capabilities-section">
        <div className="section-header-centered">
          <span className="section-sub-badge">Agentic Multimodal Pipeline</span>
          <h2 className="section-main-title">Five Core Earth Observation Pillars</h2>
          <p className="section-desc">
            An end-to-end intelligence platform uniting satellite remote sensing with state-of-the-art vision-language reasoning.
          </p>
        </div>

        <div className="capabilities-grid-cards">
          {/* Card 1: Earth Studio & VQA */}
          <div className="capability-card" onClick={() => onSelectTab("studio")}>
            <div className="cap-icon-box">🛰️</div>
            <div className="cap-number">01</div>
            <h3>Earth Studio & VQA</h3>
            <p>
              Ask any natural language question about an area or uploaded image. Auto-extracts entities, detects objects, and visually grounds evidence.
            </p>
            <ul className="cap-features-list">
              <li>Visual Question Answering (VQA)</li>
              <li>Bounding Box & Polygon Grounding</li>
              <li>Multi-Turn Conversational Memory</li>
            </ul>
            <div className="cap-card-footer">
              <span>Open Earth Studio</span>
              <span className="arrow">→</span>
            </div>
          </div>

          {/* Card 2: Temporal Change Studio */}
          <div className="capability-card" onClick={() => onSelectTab("change")}>
            <div className="cap-icon-box">🔄</div>
            <div className="cap-number">02</div>
            <h3>Temporal Change Studio</h3>
            <p>
              Bi-temporal image comparison with swipe/opacity sliders, automated change %, severity estimation, milestone timelines, and trend charts.
            </p>
            <ul className="cap-features-list">
              <li>Interactive Before/After Slider</li>
              <li>Severity Estimation (0-100 Gauge)</li>
              <li>Multitemporal Sequence & Trend Line</li>
            </ul>
            <div className="cap-card-footer">
              <span>Explore Change Studio</span>
              <span className="arrow">→</span>
            </div>
          </div>

          {/* Card 3: Optical + SAR Fusion */}
          <div className="capability-card" onClick={() => onSelectTab("fusion")}>
            <div className="cap-icon-box">📡</div>
            <div className="cap-number">03</div>
            <h3>Optical + SAR Radar Fusion</h3>
            <p>
              Simultaneous cross-modal verification combining Sentinel-2 optical spectral bands with Sentinel-1 SAR C-band microwave backscatter.
            </p>
            <ul className="cap-features-list">
              <li>All-Weather Cloud Penetration</li>
              <li>SAR Flood / Water Specular Isolation</li>
              <li>Double-Bounce Built-Up Confirmation</li>
            </ul>
            <div className="cap-card-footer">
              <span>Open Fusion Lab</span>
              <span className="arrow">→</span>
            </div>
          </div>

          {/* Card 4: Upload & Data Ingestion Lab */}
          <div className="capability-card" onClick={() => onSelectTab("lab")}>
            <div className="cap-icon-box">🧪</div>
            <div className="cap-number">04</div>
            <h3>Upload & Data Validation Lab</h3>
            <p>
              Ingest GeoTIFFs, TIFFs, PNGs, and JPEGs with automated spatial compatibility checks, CRS validation, and instant preset scene loading.
            </p>
            <ul className="cap-features-list">
              <li>GeoTIFF Georeferencing & CRS Check</li>
              <li>Single, Temporal & Pair Uploads</li>
              <li>1-Click Preset Demo Scenarios</li>
            </ul>
            <div className="cap-card-footer">
              <span>Open Upload Lab</span>
              <span className="arrow">→</span>
            </div>
          </div>

          {/* Card 5: Intelligence Reports */}
          <div className="capability-card" onClick={() => onSelectTab("reports")}>
            <div className="cap-icon-box">📑</div>
            <div className="cap-number">05</div>
            <h3>Intelligence Report Generator</h3>
            <p>
              Compile structured Geospatial Intelligence Reports including AI findings, detected object statistics, change indices, and downloadable exports.
            </p>
            <ul className="cap-features-list">
              <li>Downloadable PDF & JSON Formats</li>
              <li>Evidence Map Snapshots & Statistics</li>
              <li>Verifiable Model Execution Traces</li>
            </ul>
            <div className="cap-card-footer">
              <span>Generate Reports</span>
              <span className="arrow">→</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── WORKFLOW / AGENTIC ARCHITECTURE PREVIEW ────────────────────────── */}
      <section className="landing-workflow-section">
        <div className="landing-workflow-container">
          <div className="workflow-left">
            <span className="section-sub-badge">Agentic Execution Pipeline</span>
            <h2>How SatQuery AI Resolves Earth Queries</h2>
            <p>
              From arbitrary natural language to multi-sensor evidence grounding, our router orchestrates specialist models with explainable confidence.
            </p>

            <div className="workflow-steps-vertical">
              <div className="wf-step">
                <div className="wf-step-num">1</div>
                <div className="wf-step-content">
                  <h4>Natural Language Query & Entity Parsing</h4>
                  <p>Extracts target locations, dates, objects, and weather conditions automatically.</p>
                </div>
              </div>
              <div className="wf-step">
                <div className="wf-step-num">2</div>
                <div className="wf-step-content">
                  <h4>Autonomous Model Dispatch & GEE Fusion</h4>
                  <p>Routes to RS-VQA, Grounding, Change-Segmentation, or SAR Radar Fusion models.</p>
                </div>
              </div>
              <div className="wf-step">
                <div className="wf-step-num">3</div>
                <div className="wf-step-content">
                  <h4>Visual Evidence Grounding & Report Synthesis</h4>
                  <p>Merges GeoJSON vectors, computes change percentages, and renders explainable results.</p>
                </div>
              </div>
            </div>

            <button
              className="btn-primary-hero mt-4"
              onClick={() => onLaunchWorkspace("studio")}
            >
              Start Analyzing Now →
            </button>
          </div>

          <div className="workflow-right">
            <div className="terminal-trace-card">
              <div className="terminal-header">
                <div className="dots">
                  <span className="dot red"></span>
                  <span className="dot yellow"></span>
                  <span className="dot green"></span>
                </div>
                <span className="terminal-title">agent_trace.json — SatQuery Orchestrator</span>
              </div>
              <pre className="terminal-code">
{`{
  "task": "multimodal_change_vqa",
  "query": "Detect urban expansion and flood boundary under cloud cover",
  "entities": {
    "location": "Visakhapatnam Northern Sector",
    "dates": ["2022-01-01", "2024-01-01"],
    "objects": ["Buildings", "Roads", "Inundation"],
    "condition": "Heavy Clouds"
  },
  "execution_pipeline": [
    { "step": "task_classifier", "confidence": 0.88, "status": "COMPLETED" },
    { "step": "gee_imagery_fetch", "sensor": "Sentinel-2 + Sentinel-1", "status": "COMPLETED" },
    { "step": "sar_backscatter_eval", "specular_water": "12 regions", "double_bounce": "42 bldgs" },
    { "step": "change_segmentation", "delta_percent": 14.8, "severity": "MODERATE" },
    { "step": "aggregator", "cross_modal_agreement": "91.4%", "status": "SUCCESS" }
  ],
  "final_confidence": 0.91
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="footer-container" style={{ justifyContent: "center", textAlign: "center" }}>
          <div className="footer-left" style={{ alignItems: "center" }}>
            <div className="footer-brand" style={{ justifyContent: "center" }}>
              <span className="brand-icon">🛰️</span>
              <span className="brand-name">SatQuery AI</span>
            </div>
            <p className="footer-tagline">Agentic Vision-Language Intelligence for Earth Observation</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
