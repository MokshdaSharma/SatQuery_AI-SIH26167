/**
 * FusionLab.jsx — Tab: Cross-Modal Fusion / DSS
 * Optical + SAR Cross-Modal Fusion Lab.
 *
 * Features:
 *   - Optical (Sentinel-2) vs SAR (Sentinel-1) side-by-side & split comparison
 *   - ZERO hardcoded results: Metrics & radar signatures appear only after query execution
 *   - Clean sensor placeholders (no random stock photos)
 *   - SAR-based detection under heavy cloud cover (all-weather radar penetration)
 *   - Flood & Standing Water detection via SAR specular backscatter drop
 *   - Built-up & Urban Infrastructure detection via SAR double-bounce backscatter
 *   - Cross-modal consistency score & calibrated agreement gauge
 *   - Sensor-specific highlight breakdown (Both Sensors vs Optical Only vs SAR Only)
 */

import { useState } from "react";

export default function FusionLab({
  onRunFusionQuery,
  isLoading,
  queryResult,
  error,
  currentROI,
  opticalUrl: propOpticalUrl = null,
  sarUrl: propSarUrl = null,
}) {
  const [viewMode, setViewMode] = useState("side_by_side"); // "side_by_side" | "optical_only" | "sar_only"
  const [fusionQuery, setFusionQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  const opticalUrl =
    propOpticalUrl ||
    queryResult?.optical_url ||
    queryResult?.images?.find((img) => img.modality === "optical" || img.type === "optical")?.url ||
    null;
  const sarUrl =
    propSarUrl ||
    queryResult?.sar_url ||
    queryResult?.images?.find((img) => img.modality === "sar" || img.type === "sar")?.url ||
    null;

  // STRICT RULE: No fake hardcoded analytics. Only use actual backend analytics when computed.
  const fusionData = queryResult?.fusion_analytics || null;

  const handleExecuteQuery = (e) => {
    e?.preventDefault();
    const q =
      fusionQuery.trim() ||
      "Perform optical and SAR joint fusion analysis, identify cloud-obscured features and verify built-up structures";
    onRunFusionQuery?.({
      query: q,
      modality: "both",
      dateStart: "2023-08-15",
    });
  };

  return (
    <div className="fusion-lab-layout">
      {/* ── Top Header ────────────────────────────────────────────────────── */}
      <div className="fusion-header card">
        <div className="fusion-header__info">
          <div className="fusion-badge">📡 Dual-Sensor Synergy</div>
          <h2 className="fusion-title">Cross-Modal Fusion Lab</h2>
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

      {/* ── Main Content Grid ─────────────────────────────────────────────── */}
      <div className="fusion-grid">
        {/* Left: Dual Sensor Imagery Viewer (Clean Sensor Placeholders) */}
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
                {opticalUrl ? (
                  <img src={opticalUrl} alt="Sentinel-2 Optical multispectral view" style={{ width: "100%", height: 240, objectFit: "cover", borderRadius: 8 }} />
                ) : (
                  <div className="sensor-raster-placeholder sensor-raster--optical">
                    <div className="sensor-raster-grid"></div>
                    <div className="sensor-raster-content">
                      <span className="sensor-icon">🛰️</span>
                      <div className="sensor-title">Sentinel-2 Multispectral (MSI)</div>
                      <div className="sensor-meta">Bands: B4 (Red), B3 (Green), B2 (Blue), B8 (NIR)</div>
                      <div className="sensor-coords">{currentROI ? "Active Polygon ROI Co-Registered" : "Coordinates: 17.6868° N, 83.2185° E"}</div>
                    </div>
                  </div>
                )}
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
                {sarUrl ? (
                  <img src={sarUrl} alt="Sentinel-1 SAR Radar view" style={{ width: "100%", height: 240, objectFit: "cover", borderRadius: 8 }} />
                ) : (
                  <div className="sensor-raster-placeholder sensor-raster--sar">
                    <div className="sensor-raster-grid radar-grid"></div>
                    <div className="sensor-raster-content">
                      <span className="sensor-icon">📡</span>
                      <div className="sensor-title">Sentinel-1 C-Band SAR Radar</div>
                      <div className="sensor-meta">Polarization: VV + VH | Frequency: 5.405 GHz</div>
                      <div className="sensor-coords">{currentROI ? "Active Polygon ROI Co-Registered" : "Coordinates: 17.6868° N, 83.2185° E"}</div>
                    </div>
                  </div>
                )}
                <div className="fusion-pane__caption">
                  Microwave Penetration • Surface Roughness & Dihedral Bounce • All-Weather
                </div>
              </div>
            )}
          </div>

          {/* Fusion Query Bar */}
          <form className="fusion-query-bar" onSubmit={handleExecuteQuery}>
            <input
              type="text"
              className="form-input fusion-query-input"
              placeholder="e.g. Detect urban expansion through clouds and verify standing water..."
              value={fusionQuery}
              onChange={(e) => setFusionQuery(e.target.value)}
            />
            <button
              type="submit"
              className="btn btn--primary fusion-submit-btn"
              disabled={isLoading}
            >
              {isLoading ? "Fusing Sensors…" : "⚡ Run Cross-Modal Fusion"}
            </button>
          </form>
        </div>

        {/* Right: Cross-Modal Intelligence Analytics (Only when computed) */}
        <div className="fusion-analytics-col">
          {!fusionData ? (
            <div className="card empty-fusion-card" style={{ padding: "32px 24px", textAlign: "center" }}>
              <div className="empty-state__icon">🔀</div>
              <div className="empty-state__title" style={{ fontSize: 16, fontWeight: 700, marginTop: 8 }}>
                Ready for Cross-Modal Fusion
              </div>
              <div className="empty-state__desc" style={{ fontSize: 12.5, color: "var(--color-text-muted)", marginTop: 8, lineHeight: 1.6 }}>
                Submit a joint query above to align Sentinel-2 Optical and Sentinel-1 SAR backscatter, calculate radar cloud penetration, and compute multi-sensor agreement.
              </div>
              <div style={{ marginTop: 20 }}>
                <button
                  type="button"
                  className="btn btn--primary btn-sm"
                  onClick={handleExecuteQuery}
                  disabled={isLoading}
                >
                  {isLoading ? "Processing Fusion…" : "⚡ Run Cross-Modal Fusion"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Cross-Modal Agreement Score */}
              <div className="card fusion-stat-card">
                <div className="card-header-flex">
                  <div>
                    <div className="fusion-stat-label">Cross-Modal Sensor Agreement</div>
                    <div className="fusion-stat-sub">Spectral vs Radar structural correlation</div>
                  </div>
                  <div className="fusion-stat-number">{fusionData.cross_modal_consistency}%</div>
                </div>
                <div className="fusion-meter-bar">
                  <div
                    className="fusion-meter-fill"
                    style={{ width: `${fusionData.cross_modal_consistency}%` }}
                  />
                </div>
              </div>

              {/* SAR Cloud Penetration Capability */}
              {fusionData.cloud_penetration && (
                <div className="card fusion-feature-card">
                  <div className="feature-card-header">
                    <span className="feature-icon">☁️</span>
                    <div>
                      <div className="feature-title">SAR Cloud Cover Penetration</div>
                      <div className="feature-sub">{fusionData.cloud_penetration.transparency_pct}% Transparency</div>
                    </div>
                  </div>
                  <p className="feature-desc">
                    Sentinel-1 5.405 GHz microwave wavelength passes unattenuated through dense stratus clouds and atmospheric haze, mapping ground coordinates invisible to optical sensors.
                  </p>
                </div>
              )}

              {/* SAR Flood & Water Inundation Detection */}
              {fusionData.flood_detection && (
                <div className="card fusion-feature-card">
                  <div className="feature-card-header">
                    <span className="feature-icon">🌊</span>
                    <div>
                      <div className="feature-title">SAR Flood & Water Detection</div>
                      <div className="feature-sub">Specular Drop</div>
                    </div>
                  </div>
                  <div className="radar-sig-badge">
                    Radar Signature: <code>{fusionData.flood_detection.backscatter_signature}</code>
                  </div>
                  <p className="feature-desc">
                    Calm surface water reflects microwave radar pulses away from the antenna (specular reflection), creating pitch-black low-backscatter footprints ideal for rapid flood extent delineations.
                  </p>
                </div>
              )}

              {/* SAR Built-up & Structural Double-Bounce */}
              {fusionData.built_up_detection && (
                <div className="card fusion-feature-card">
                  <div className="feature-card-header">
                    <span className="feature-icon">🏢</span>
                    <div>
                      <div className="feature-title">SAR Built-Up Area Detection</div>
                      <div className="feature-sub">Double-Bounce Return</div>
                    </div>
                  </div>
                  <div className="radar-sig-badge">
                    Radar Signature: <code>{fusionData.built_up_detection.backscatter_signature}</code>
                  </div>
                  <p className="feature-desc">
                    Right-angle ground-to-wall geometries cause dihedral corner reflection, bouncing intense microwave energy directly back to the sensor for high-confidence structural detection.
                  </p>
                </div>
              )}

              {/* Sensor-Specific Highlight Breakdown */}
              {fusionData.sensor_agreement && (
                <div className="card fusion-agreement-card">
                  <div className="card-header-flex">
                    <h3 className="section-title">🔍 Information Identified by Sensor</h3>
                    <div className="filter-chips">
                      {["all", "both", "optical", "sar"].map((f) => (
                        <button
                          key={f}
                          type="button"
                          className={`filter-pill ${activeFilter === f ? "filter-pill--active" : ""}`}
                          onClick={() => setActiveFilter(f)}
                        >
                          {f.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sensor-features-list">
                    {(activeFilter === "all" || activeFilter === "both") &&
                      fusionData.sensor_agreement.both_sensors?.map((item, idx) => (
                        <div key={`b-${idx}`} className="sensor-feature-item sensor-feature-item--both">
                          <span className="sensor-tag sensor-tag--both">🟣 Both Sensors</span>
                          <span className="sensor-text">{item}</span>
                        </div>
                      ))}

                    {(activeFilter === "all" || activeFilter === "optical") &&
                      fusionData.sensor_agreement.optical_only?.map((item, idx) => (
                        <div key={`o-${idx}`} className="sensor-feature-item sensor-feature-item--optical">
                          <span className="sensor-tag sensor-tag--optical">☀️ Optical Only</span>
                          <span className="sensor-text">{item}</span>
                        </div>
                      ))}

                    {(activeFilter === "all" || activeFilter === "sar") &&
                      fusionData.sensor_agreement.sar_only?.map((item, idx) => (
                        <div key={`s-${idx}`} className="sensor-feature-item sensor-feature-item--sar">
                          <span className="sensor-tag sensor-tag--sar">📡 SAR Only</span>
                          <span className="sensor-text">{item}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
