import React, { useState } from "react";
import FormattedAnswer from "./FormattedAnswer";

export default function GlobalResultsDrawer({ queryResult, currentROI, onOpenTrace, onSelectTab }) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!queryResult) return null;

  const handleExport = (format) => {
    if (format === "json") {
      const blob = new Blob([JSON.stringify(queryResult, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SatQuery_Analysis_${Date.now()}.json`;
      a.click();
    } else if (format === "geojson") {
      const geojsonObj = queryResult.evidence_geojson || {
        type: "FeatureCollection",
        features: currentROI ? [{ type: "Feature", geometry: currentROI, properties: {} }] : []
      };
      const blob = new Blob([JSON.stringify(geojsonObj, null, 2)], { type: "application/geo+json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SatQuery_Evidence_${Date.now()}.geojson`;
      a.click();
    } else if (format === "pdf") {
      if (onSelectTab) onSelectTab("reports");
    }
  };

  const featureCount = queryResult.evidence_geojson?.features?.length || 0;

  return (
    <div className={`global-results-drawer-bar ${isMinimized ? "minimized" : ""}`}>
      {/* Header bar with minimize toggle */}
      <div className="drawer-bar-header">
        <div className="drawer-bar-title-group">
          <span className="pulse-dot"></span>
          <span className="bar-title">Active AI Interpretation Layer</span>
          <span className="confidence-pill">{(queryResult.confidence * 100).toFixed(0)}% Confidence</span>
        </div>

        <div className="drawer-bar-actions">
          <button
            className="bar-action-btn trace"
            onClick={onOpenTrace}
            title="Inspect Agent Decision Graph"
          >
            ⚡ Execution Trace
          </button>
          <button
            className="bar-action-btn minimize"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? "▲ Expand" : "▼ Collapse"}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="drawer-bar-body">
          <div className="summary-col query-col">
            <span className="col-label">User Query:</span>
            <p className="query-text">"{queryResult.query || "Scene analysis query"}"</p>
          </div>

          <div className="summary-col result-col">
            <span className="col-label">AI Finding:</span>
            <div className="result-text">
              <FormattedAnswer text={queryResult.answer} />
            </div>
          </div>

          <div className="summary-col evidence-col">
            <span className="col-label">Evidence Resolved:</span>
            <div className="evidence-badge-val">
              <span className="num">{featureCount}</span>
              <span className="lbl">Grounded Regions</span>
            </div>
          </div>

          <div className="summary-col export-col">
            <span className="col-label">Export Dossier:</span>
            <div className="export-btn-group">
              <button className="btn-export-mini pdf" onClick={() => handleExport("pdf")}>PDF</button>
              <button className="btn-export-mini json" onClick={() => handleExport("json")}>JSON</button>
              <button className="btn-export-mini geojson" onClick={() => handleExport("geojson")}>GeoJSON</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
