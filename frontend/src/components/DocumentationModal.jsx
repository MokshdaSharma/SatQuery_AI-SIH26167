import React, { useState } from "react";

export default function DocumentationModal({ isOpen, onClose }) {
  const [activeDocTab, setActiveDocTab] = useState("overview");

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop-overlay" onClick={onClose}>
      <div className="modal-container-card doc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <span className="modal-icon">📖</span>
            <div>
              <h3 className="modal-title">SatQuery AI Platform Documentation</h3>
              <p className="modal-subtitle">User guide, query syntax reference, and sensor capabilities</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="doc-modal-nav">
          <button className={`doc-nav-btn ${activeDocTab === "overview" ? "active" : ""}`} onClick={() => setActiveDocTab("overview")}>Overview</button>
          <button className={`doc-nav-btn ${activeDocTab === "query" ? "active" : ""}`} onClick={() => setActiveDocTab("query")}>Query Syntax & Entities</button>
          <button className={`doc-nav-btn ${activeDocTab === "sensors" ? "active" : ""}`} onClick={() => setActiveDocTab("sensors")}>Sensors & Bands</button>
          <button className={`doc-nav-btn ${activeDocTab === "fusion" ? "active" : ""}`} onClick={() => setActiveDocTab("fusion")}>Optical-SAR Fusion</button>
        </div>

        <div className="doc-modal-body">
          {activeDocTab === "overview" && (
            <div className="doc-content-pane">
              <h4>What is SatQuery AI?</h4>
              <p>
                SatQuery AI is an agentic vision-language platform designed for interactive Earth observation. It bridges natural language queries with specialized remote-sensing AI models, Google Earth Engine satellite streams, and multitemporal change detection algorithms.
              </p>
              <h4>Key Capabilities</h4>
              <ul>
                <li><strong>Earth Studio & VQA:</strong> Ask open-ended natural language questions about any location or uploaded satellite scene.</li>
                <li><strong>Temporal Change Studio:</strong> Compare bi-temporal images, calculate change percentages, evaluate change severity, and track timeline progressions.</li>
                <li><strong>Optical + SAR Fusion:</strong> Jointly analyze Sentinel-2 optical spectral bands and Sentinel-1 C-band SAR radar backscatter for all-weather intelligence.</li>
                <li><strong>Upload Lab:</strong> Ingest GeoTIFFs, PNGs, and JPEGs with automated spatial compatibility and CRS checks.</li>
                <li><strong>Intelligence Reports:</strong> Generate audit-ready geospatial dossiers in PDF, JSON, and GeoJSON formats.</li>
              </ul>
            </div>
          )}

          {activeDocTab === "query" && (
            <div className="doc-content-pane">
              <h4>Natural Language Entity Extraction</h4>
              <p>The system automatically parses queries into structured entities:</p>
              <div className="entity-doc-grid">
                <div className="entity-doc-card">
                  <span className="e-badge loc">📍 Location</span>
                  <p>Resolves geographic places, cities, sectors, or quadrants (e.g. <em>"Visakhapatnam Northern Sector"</em>).</p>
                </div>
                <div className="entity-doc-card">
                  <span className="e-badge date">📅 Dates / Epochs</span>
                  <p>Extracts observation dates, years, and comparison intervals (e.g. <em>"between 2022 and 2024"</em>).</p>
                </div>
                <div className="entity-doc-card">
                  <span className="e-badge obj">🏢 Target Objects</span>
                  <p>Identifies target land-cover classes: buildings, roads, vegetation, water bodies, or crop fields.</p>
                </div>
                <div className="entity-doc-card">
                  <span className="e-badge cond">🌧️ Weather / Conditions</span>
                  <p>Recognizes atmospheric constraints like cloud cover, monsoons, haze, or night-time conditions.</p>
                </div>
              </div>

              <h4 className="mt-4">Example Query Formats</h4>
              <div className="example-query-box">
                <code>"Identify newly constructed residential buildings and road networks in this image."</code>
              </div>
              <div className="example-query-box">
                <code>"Compare land cover between 2022 and 2024 to detect urban expansion."</code>
              </div>
              <div className="example-query-box">
                <code>"Detect flooded areas and verify building footprints under heavy cloud cover using SAR."</code>
              </div>
            </div>
          )}

          {activeDocTab === "sensors" && (
            <div className="doc-content-pane">
              <h4>Supported Remote Sensing Modalities</h4>
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Sensor</th>
                    <th>Type</th>
                    <th>Resolution</th>
                    <th>Spectral Indices / Channels</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Sentinel-2 MSI</strong></td>
                    <td>Optical / Multispectral</td>
                    <td>10m / 20m</td>
                    <td>RGB, Red-Edge, NIR, SWIR (NDVI, NDWI, NDBI)</td>
                  </tr>
                  <tr>
                    <td><strong>Sentinel-1 SAR</strong></td>
                    <td>C-Band Microwave Radar</td>
                    <td>10m GRD</td>
                    <td>VV (Co-pol), VH (Cross-pol), VV/VH Ratio</td>
                  </tr>
                  <tr>
                    <td><strong>Landsat 8/9 OLI</strong></td>
                    <td>Optical Multispectral</td>
                    <td>15m / 30m</td>
                    <td>Visible, NIR, Thermal IR (TIRS)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {activeDocTab === "fusion" && (
            <div className="doc-content-pane">
              <h4>Understanding Optical + SAR Fusion</h4>
              <p>
                While optical imagery captures solar reflectance (useful for vegetation health and color differentiation), it is blocked by clouds and darkness.
                Sentinel-1 SAR radar sends active microwave pulses that penetrate clouds, rain, and haze.
              </p>
              <ul>
                <li><strong>Specular Reflection (Water):</strong> Flat water bodies reflect radar pulses away, appearing very dark (&lt; -18.5 dB).</li>
                <li><strong>Dihedral Double-Bounce (Buildings):</strong> Vertical wall-ground corners create strong right-angle reflections back to the satellite, appearing bright (&gt; -5.0 dB).</li>
                <li><strong>Volume Scattering (Forests):</strong> Tree canopies scatter microwave energy in all directions, yielding moderate cross-polarization (VH).</li>
              </ul>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary-modal" onClick={onClose}>Close Guide</button>
        </div>
      </div>
    </div>
  );
}
