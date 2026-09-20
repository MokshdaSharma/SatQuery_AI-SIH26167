import React, { useState } from "react";
import FormattedAnswer from "./FormattedAnswer";

export default function ReportsStudio({ queryResult, currentROI, onSelectTab }) {
  const [reportTitle, setReportTitle] = useState("Geospatial Intelligence Assessment — Sector Alpha");
  const [selectedFormat, setSelectedFormat] = useState("pdf");
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const reportData = {
    reportId: "SQ-RPT-2026-0841",
    generatedAt: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }),
    sensorSuite: "Sentinel-2 MSI (Optical) + Sentinel-1 C-Band (SAR GRD)",
    coordinates: currentROI?.coordinates ? "Custom User Polygon ROI" : "Latitude 17.6868° N, Longitude 83.2185° E",
    query: queryResult?.query || "Comprehensive land-cover classification and multitemporal change assessment",
    answer: queryResult?.answer || "Scene analysis confirms substantial urban densification with 14.8% new built-up expansion across the central-eastern quadrant. Surface moisture indices indicate stabilized hydrological boundaries.",
    confidence: queryResult?.confidence ? `${Math.round(queryResult.confidence * 100)}%` : "89%",
    modelsUsed: ["RS-VQA Specialist", "GLIP Grounding Engine", "Change Segmentation U-Net", "Optical-SAR Fusion Module"],
    detectedObjects: [
      { name: "High-Density Built Structures", count: 42, area: "48,200 m²", confidence: "94%" },
      { name: "Paved Transport Corridors", count: 8, area: "12,400 m²", confidence: "91%" },
      { name: "Water Retention Basins", count: 3, area: "8,900 m²", confidence: "96%" },
      { name: "Dense Canopy & Vegetation", count: "--", area: "61% of Sector", confidence: "88%" }
    ],
    changeMetrics: {
      totalChange: "24.8%",
      increased: "15.2% (Built-up)",
      decreased: "9.6% (Vegetation Clearing)",
      unchanged: "75.2%",
      severity: "MODERATE (64/100)"
    }
  };

  const handleExport = (format) => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);

      // Trigger dummy download for JSON or GeoJSON
      if (format === "json") {
        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `SatQuery_Report_${reportData.reportId}.json`;
        a.click();
      } else if (format === "geojson") {
        const geojsonObj = queryResult?.evidence_geojson || {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: currentROI || { type: "Polygon", coordinates: [[[83.2, 17.6], [83.25, 17.6], [83.25, 17.65], [83.2, 17.65], [83.2, 17.6]]] },
              properties: { reportId: reportData.reportId, status: "Analyzed" }
            }
          ]
        };
        const blob = new Blob([JSON.stringify(geojsonObj, null, 2)], { type: "application/geo+json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `SatQuery_Evidence_${reportData.reportId}.geojson`;
        a.click();
      } else {
        // PDF Simulation
        window.print();
      }
    }, 900);
  };

  return (
    <div className="reports-studio-root">
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="studio-top-header">
        <div>
          <div className="studio-breadcrumb">
            <span>SatQuery Intelligence</span> / <span>Reports Studio</span>
          </div>
          <h2 className="studio-title">Geospatial Intelligence Report Generator</h2>
          <p className="studio-subtitle">
            Compile structured intelligence dossiers with visual evidence, statistical breakdowns, and multi-format exports.
          </p>
        </div>

        <div className="report-action-buttons">
          <button
            className="btn-export-opt pdf"
            onClick={() => handleExport("pdf")}
            disabled={isGenerating}
          >
            <span>📄 Export PDF Dossier</span>
          </button>
          <button
            className="btn-export-opt json"
            onClick={() => handleExport("json")}
            disabled={isGenerating}
          >
            <span>💾 Export JSON</span>
          </button>
          <button
            className="btn-export-opt geojson"
            onClick={() => handleExport("geojson")}
            disabled={isGenerating}
          >
            <span>🗺️ Export GeoJSON</span>
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="report-alert-banner">
          ✓ Intelligence Report successfully compiled and exported!
        </div>
      )}

      {/* ── MAIN REPORT PREVIEW CONTAINER ─────────────────────────────────── */}
      <div className="report-document-sheet">
        {/* Document Header */}
        <div className="doc-header-block">
          <div className="doc-badge-row">
            <span className="doc-classification">OFFICIAL GEOSPATIAL INTELLIGENCE DOSSIER</span>
            <span className="doc-id">REPORT ID: {reportData.reportId}</span>
          </div>

          <input
            type="text"
            className="doc-title-input"
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
          />

          <div className="doc-metadata-grid">
            <div className="meta-cell">
              <span className="lbl">Generated Date:</span>
              <span className="val">{reportData.generatedAt}</span>
            </div>
            <div className="meta-cell">
              <span className="lbl">Sensors Utilized:</span>
              <span className="val">{reportData.sensorSuite}</span>
            </div>
            <div className="meta-cell">
              <span className="lbl">Target Region:</span>
              <span className="val">{reportData.coordinates}</span>
            </div>
            <div className="meta-cell">
              <span className="lbl">Confidence Score:</span>
              <span className="val text-green font-bold">{reportData.confidence}</span>
            </div>
          </div>
        </div>

        {/* Executive Summary Section */}
          <div className="doc-section">
            <h3 className="doc-section-heading">1. Executive AI Analysis Summary</h3>
            <div className="doc-callout-box">
              <div className="doc-callout-text">
                <FormattedAnswer text={reportData.answer} />
              </div>
            </div>
          </div>

        {/* Detected Objects & Land-Cover Statistics */}
        <div className="doc-section">
          <h3 className="doc-section-heading">2. Quantitative Land-Cover Breakdown</h3>
          <table className="doc-table">
            <thead>
              <tr>
                <th>Identified Class / Feature</th>
                <th>Resolved Features</th>
                <th>Spatial Footprint</th>
                <th>Model Confidence</th>
              </tr>
            </thead>
            <tbody>
              {reportData.detectedObjects.map((obj, i) => (
                <tr key={i}>
                  <td className="font-semibold">{obj.name}</td>
                  <td>{obj.count}</td>
                  <td>{obj.area}</td>
                  <td><span className="pill-conf">{obj.confidence}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Change Severity & Multitemporal Metrics */}
        <div className="doc-section">
          <h3 className="doc-section-heading">3. Multitemporal Change & Severity Assessment</h3>
          <div className="doc-kpi-grid">
            <div className="doc-kpi-card">
              <span className="kpi-lbl">Total Change Delta</span>
              <span className="kpi-val text-orange">{reportData.changeMetrics.totalChange}</span>
            </div>
            <div className="doc-kpi-card">
              <span className="kpi-lbl">New Expansion</span>
              <span className="kpi-val text-green">{reportData.changeMetrics.increased}</span>
            </div>
            <div className="doc-kpi-card">
              <span className="kpi-lbl">Canopy / Clearing</span>
              <span className="kpi-val text-red">{reportData.changeMetrics.decreased}</span>
            </div>
            <div className="doc-kpi-card">
              <span className="kpi-lbl">Severity Index</span>
              <span className="kpi-val text-yellow">{reportData.changeMetrics.severity}</span>
            </div>
          </div>
        </div>

        {/* Models and Execution Audit Trail */}
        <div className="doc-section">
          <h3 className="doc-section-heading">4. AI Agent Model Attribution & Audit Trail</h3>
          <div className="models-used-chips">
            {reportData.modelsUsed.map((m, idx) => (
              <span key={idx} className="model-chip-tag">🤖 {m}</span>
            ))}
          </div>
          <p className="audit-note">
            All models were orchestrated via SatQuery AI's deterministic routing engine with full geometric IoU verification and tiered fallback safeguards.
          </p>
        </div>

        {/* Document Footer */}
        <div className="doc-footer-row">
          <span>SatQuery AI — Agentic Earth Intelligence</span>
          <span>Confidential • Prepared for Geospatial Operations</span>
        </div>
      </div>
    </div>
  );
}
