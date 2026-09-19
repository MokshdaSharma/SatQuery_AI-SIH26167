/**
 * FusionLab.jsx — Tab 3: Optical + SAR Cross-Modal Fusion Lab.
 *
 * Features:
 *   - Optical (Sentinel-2) vs SAR (Sentinel-1) side-by-side & split comparison
 *   - SAR-based detection under heavy cloud cover (all-weather radar penetration)
 *   - Flood & Standing Water detection via SAR specular backscatter drop
 *   - Built-up & Urban Infrastructure detection via SAR double-bounce backscatter
 *   - Cross-modal consistency score & calibrated agreement gauge
 *   - Sensor-specific highlight breakdown (Both Sensors vs Optical Only vs SAR Only)
 *   - Joint multimodal VQA query input
 */

import { useState } from "react";

export default function FusionLab({
  onRunFusionQuery,
  isLoading,
  queryResult,
  error,
}) {
  const [viewMode, setViewMode] = useState("side_by_side"); // "side_by_side" | "optical_only" | "sar_only"
  const [fusionQuery, setFusionQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const fusionData = queryResult?.fusion_analytics || {
    cross_modal_consistency: 89.6,
    sensor_agreement: {
      both_sensors: [
        "High-Density Built Structures (Double-Bounce SAR + High NDBI)",
        "Perennial Water Channels (Specular Low-Backscatter + High NDWI)",
        "Paved Road Networks & Transport Corridors",
      ],
      optical_only: [
        "Shallow Cropland Chlorophyll Variations (High NIR Reflectance)",
        "Subtle Soil Moisture Tonal Differences",
        "Rooftop Material & Solar Panel Reflectance",
      ],
      sar_only: [
        "Structures & Landforms Penetrated Through Cloud/Haze Cover",
        "Flooded / Inundated Ground Obscured by Vegetation Canopy",
        "Metallic Infrastructure & High-Dielectric Corner Reflectors",
      ],
    },
    cloud_penetration: {
      transparency_pct: 96.5,
      status: "All-Weather Penetration Active",
      sensor_band: "Sentinel-1 C-Band (5.405 GHz) VV + VH",
    },
    flood_detection: {
      backscatter_signature: "Specular Reflection (<-18.5 dB)",
      water_inundation_confidence: 0.94,
      status: "Verified Low-Scattering Boundary",
    },
    built_up_detection: {
      backscatter_signature: "Strong Dihedral Double-Bounce (>-5.0 dB)",
      urban_density_confidence: 0.92,
      status: "Confirmed Solid Geometric Structures",
    },
  };

  const handleExecuteQuery = (e) => {
    e?.preventDefault();
    const q = fusionQuery.trim() || "Perform optical and SAR joint fusion analysis, identify cloud-obscured features and verify built-up structures";
    onRunFusionQuery?.({
      query: q,
      modality: "both",
      dateStart: "2023-08-15",
    });
  };

  // Sample Sentinel-2 Optical and Sentinel-1 SAR imagery representations
  const opticalImg = "https://images.unsplash.com/photo-1509718443690-d8e2fb3474b7?auto=format&fit=crop&w=1000&q=80";
  const sarImg = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1000&q=80";

  return (
    <div className="fusion-lab-layout">
      {/* Top Banner */}
      <div className="fusion-header card">
        <div className="fusion-header__info">
          <div className="fusion-badge">📡 Dual-Sensor Synergy</div>
          <h2 className="fusion-title">Optical + SAR Cross-Modal Fusion Lab</h2>
          <p className="fusion-desc">
            Overcome cloud obscuration, resolve surface roughness, and isolate floodwaters by fusing Sentinel-2 Multispectral reflectance with Sentinel-1 C-Band Radar backscatter.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="fusion-view-mode-toggles">
          <button
            type="button"
            className={`diff-mode-btn${viewMode === "side_by_side" ? " diff-mode-btn--active" : ""}`}
            onClick={() => setViewMode("side_by_side")}
          >
            🔲 Dual Side-by-Side
          </button>
          <button
            type="button"
            className={`diff-mode-btn${viewMode === "optical_only" ? " diff-mode-btn--active" : ""}`}
            onClick={() => setViewMode("optical_only")}
          >
            ☀️ Optical MSI
          </button>
          <button
            type="button"
            className={`diff-mode-btn${viewMode === "sar_only" ? " diff-mode-btn--active" : ""}`}
            onClick={() => setViewMode("sar_only")}
          >
            📡 SAR C-Band Radar
          </button>
        </div>
      </div>

      {error && (
        <div className="toast toast--error" role="alert">
          <strong>Fusion Error:</strong> {error}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="fusion-grid">
        {/* Left: Dual Sensor Imagery Viewer */}
        <div className="fusion-viewer-card card">
          <div className="card-header-flex">
            <h3 className="section-title">🛰 Sensor Comparison & Alignment</h3>
            <span className="badge badge--cyan">Co-Registered 10m Pixel Grid</span>
          </div>

          <div className={`fusion-viewport-container fusion-viewport-container--${viewMode}`}>
            {(viewMode === "side_by_side" || viewMode === "optical_only") && (
              <div className="fusion-pane fusion-pane--optical">
                <div className="fusion-pane__badge fusion-pane__badge--optical">
                  ☀️ Sentinel-2 Optical (RGB + NIR)
                </div>
                <img src={opticalImg} alt="Sentinel-2 Optical multispectral view" />
                <div className="fusion-pane__caption">
                  High spectral sensitivity • Visible & Chlorophyll NIR • Subject to cloud cover
                </div>
              </div>
            )}

            {(viewMode === "side_by_side" || viewMode === "sar_only") && (
              <div className="fusion-pane fusion-pane--sar">
                <div className="fusion-pane__badge fusion-pane__badge--sar">
                  📡 Sentinel-1 SAR (C-Band VV/VH)
                </div>
                <img src={sarImg} alt="Sentinel-1 SAR Radar view" />
                <div className="fusion-pane__caption">
                  Microwave Penetration • Surface Roughness & Dihedral Bounce • All-Weather
                </div>
              </div>
            )}
          </div>

          {/* Interactive Fusion Query Console */}
          <div className="fusion-query-console">
            <h4 className="fusion-query-title">💬 Multimodal Query & Joint VQA</h4>
            <div className="fusion-query-input-row">
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Identify ground structures under cloud cover using Sentinel-1 SAR"
                value={fusionQuery}
                onChange={(e) => setFusionQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleExecuteQuery(e)}
              />
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleExecuteQuery}
                disabled={isLoading}
              >
                {isLoading ? "Fusing…" : "⚡ Run Fusion VQA"}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Cross-Modal Analytics & Radar Physics Panels */}
        <div className="fusion-analytics-col">
          {/* Consistency Score Card */}
          <div className="card consistency-card">
            <div className="consistency-header">
              <div>
                <div className="consistency-label">Cross-Modal Sensor Agreement</div>
                <div className="consistency-sub">Spectral vs Radar structural correlation</div>
              </div>
              <div className="consistency-score-badge">
                {fusionData.cross_modal_consistency}%
              </div>
            </div>
            <div className="consistency-meter">
              <div
                className="consistency-meter-fill"
                style={{ width: `${fusionData.cross_modal_consistency}%` }}
              />
            </div>
          </div>

          {/* Cloud Cover Penetration Card */}
          <div className="card radar-feature-card">
            <div className="card-header-flex">
              <div className="radar-feature-title">
                <span className="radar-feature-icon">☁️</span>
                <span>SAR Cloud Cover Penetration</span>
              </div>
              <span className="badge badge--green">96.5% Transparency</span>
            </div>
            <p className="radar-feature-desc">
              Sentinel-1 5.405 GHz microwave wavelength passes unattenuated through dense stratus clouds and atmospheric haze, mapping ground coordinates invisible to optical sensors.
            </p>
          </div>

          {/* Flood / Water Inundation Detection via SAR */}
          <div className="card radar-feature-card">
            <div className="card-header-flex">
              <div className="radar-feature-title">
                <span className="radar-feature-icon">🌊</span>
                <span>SAR Flood & Water Detection</span>
              </div>
              <span className="badge badge--blue">Specular Drop</span>
            </div>
            <div className="radar-metric-pill">
              <span className="radar-metric-key">Radar Signature:</span>
              <span className="radar-metric-val">{fusionData.flood_detection.backscatter_signature}</span>
            </div>
            <p className="radar-feature-desc">
              Calm surface water reflects microwave radar pulses away from the antenna (specular reflection), creating pitch-black low-backscatter footprints ideal for rapid flood extent delineations.
            </p>
          </div>

          {/* Built-Up Area Detection via SAR */}
          <div className="card radar-feature-card">
            <div className="card-header-flex">
              <div className="radar-feature-title">
                <span className="radar-feature-icon">🏢</span>
                <span>SAR Built-Up & Urban Detection</span>
              </div>
              <span className="badge badge--orange">Double-Bounce</span>
            </div>
            <div className="radar-metric-pill">
              <span className="radar-metric-key">Dihedral Signature:</span>
              <span className="radar-metric-val">{fusionData.built_up_detection.backscatter_signature}</span>
            </div>
            <p className="radar-feature-desc">
              Right-angle intersections between ground walls and concrete streets create strong double-bounce reflections, producing glowing high-intensity radar signatures for buildings.
            </p>
          </div>

          {/* Cross-Modal Feature Attribution (Both vs Optical vs SAR) */}
          <div className="card sensor-highlights-card">
            <div className="card-header-flex">
              <h3 className="section-title">🔍 Feature Attribution by Sensor</h3>
              <div className="sensor-filter-pills">
                <button
                  type="button"
                  className={`filter-pill${activeFilter === "all" ? " filter-pill--active" : ""}`}
                  onClick={() => setActiveFilter("all")}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`filter-pill filter-pill--both${activeFilter === "both" ? " filter-pill--active" : ""}`}
                  onClick={() => setActiveFilter("both")}
                >
                  Both (3)
                </button>
                <button
                  type="button"
                  className={`filter-pill filter-pill--opt${activeFilter === "optical" ? " filter-pill--active" : ""}`}
                  onClick={() => setActiveFilter("optical")}
                >
                  Optical (3)
                </button>
                <button
                  type="button"
                  className={`filter-pill filter-pill--sar${activeFilter === "sar" ? " filter-pill--active" : ""}`}
                  onClick={() => setActiveFilter("sar")}
                >
                  SAR (3)
                </button>
              </div>
            </div>

            <div className="sensor-highlight-lists">
              {(activeFilter === "all" || activeFilter === "both") && (
                <div className="sensor-group sensor-group--both">
                  <div className="sensor-group__title">
                    <span className="sensor-group__dot sensor-group__dot--both" />
                    Detected by Both Sensors (Highest Confidence)
                  </div>
                  <ul className="sensor-list">
                    {fusionData.sensor_agreement.both_sensors.map((item, idx) => (
                      <li key={idx} className="sensor-list__item">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {(activeFilter === "all" || activeFilter === "optical") && (
                <div className="sensor-group sensor-group--optical">
                  <div className="sensor-group__title">
                    <span className="sensor-group__dot sensor-group__dot--optical" />
                    Detected by Optical Only (Spectral / Color Signatures)
                  </div>
                  <ul className="sensor-list">
                    {fusionData.sensor_agreement.optical_only.map((item, idx) => (
                      <li key={idx} className="sensor-list__item">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {(activeFilter === "all" || activeFilter === "sar") && (
                <div className="sensor-group sensor-group--sar">
                  <div className="sensor-group__title">
                    <span className="sensor-group__dot sensor-group__dot--sar" />
                    Detected by SAR Only (Cloud Penetration & Radar Bounce)
                  </div>
                  <ul className="sensor-list">
                    {fusionData.sensor_agreement.sar_only.map((item, idx) => (
                      <li key={idx} className="sensor-list__item">{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
