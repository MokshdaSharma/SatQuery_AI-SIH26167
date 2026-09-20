/**
 * DataLogsView.jsx — Tab: Data Logs
 * Provides full visibility into geospatial execution logs, GEE requests, model traces, and dossier exports.
 */

import React, { useState } from "react";

export default function DataLogsView({
  queryResult,
  conversationHistory = [],
  onOpenTrace,
  onExport,
  isExporting,
}) {
  const [selectedFormat, setSelectedFormat] = useState("zip");
  const [copiedId, setCopiedId] = useState(null);

  const logsList = [
    {
      id: queryResult?.session_id || "sq-sess-9481a",
      timestamp: new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata" }) + " IST",
      task: (queryResult?.task_type || "landcover_classification").replace(/_/g, " "),
      status: queryResult ? "SUCCESS" : "READY",
      confidence: queryResult?.confidence ? `${Math.round(queryResult.confidence * 100)}%` : "92%",
      latency: "1.42s",
      modality: queryResult?.modality || "Optical (Sentinel-2) + SAR (Sentinel-1)",
      entitiesFound: queryResult?.entities?.objects?.length || 4,
    },
  ];

  const handleCopy = (text, id) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="data-logs-layout" style={{ maxWidth: 1300, margin: "0 auto", padding: "24px", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top Banner */}
      <div className="card" style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#38bdf8", marginBottom: 4 }}>
            🗄️ Geospatial Intelligence Audit & Telemetry
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--color-text-primary)" }}>
            Data Logs & Execution Trace Archive
          </h2>
          <p style={{ fontSize: 12.5, color: "var(--color-text-muted)", marginTop: 4 }}>
            Real-time audit log of all Earth Engine queries, model dispatch pipelines, and exported GIS dossiers.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => onExport?.([selectedFormat])}
            disabled={isExporting}
          >
            {isExporting ? "Exporting Bundle…" : "📦 Export Session Bundle (ZIP)"}
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>
            📋 Recent Pipeline Executions
          </h3>
          <span className="badge badge--cyan">Active Session Telemetry</span>
        </div>

        <div className="table-responsive" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", textAlign: "left", color: "var(--color-text-muted)" }}>
                <th style={{ padding: "10px 12px" }}>SESSION ID</th>
                <th style={{ padding: "10px 12px" }}>TIMESTAMP (IST)</th>
                <th style={{ padding: "10px 12px" }}>TASK / PIPELINE</th>
                <th style={{ padding: "10px 12px" }}>MODALITY</th>
                <th style={{ padding: "10px 12px" }}>CONFIDENCE</th>
                <th style={{ padding: "10px 12px" }}>STATUS</th>
                <th style={{ padding: "10px 12px" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {logsList.map((log) => (
                <tr key={log.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={{ padding: "12px", fontFamily: "monospace", color: "#38bdf8" }}>
                    {log.id}
                  </td>
                  <td style={{ padding: "12px", color: "var(--color-text-secondary)" }}>
                    {log.timestamp}
                  </td>
                  <td style={{ padding: "12px", textTransform: "capitalize", fontWeight: 600 }}>
                    {log.task}
                  </td>
                  <td style={{ padding: "12px", color: "var(--color-text-muted)" }}>
                    {log.modality}
                  </td>
                  <td style={{ padding: "12px", color: "#34d399", fontWeight: 700 }}>
                    {log.confidence}
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span style={{ background: "rgba(52,211,153,0.15)", color: "#34d399", border: "1px solid rgba(52,211,153,0.4)", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                      {log.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={onOpenTrace}
                        style={{ fontSize: 11 }}
                      >
                        ⚡ Trace
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={() => handleCopy(JSON.stringify(queryResult || log, null, 2), log.id)}
                        style={{ fontSize: 11 }}
                      >
                        {copiedId === log.id ? "✓ Copied" : "📋 JSON"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw JSON Inspect */}
      {queryResult && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>
              🔍 Raw Execution Payload Response
            </h3>
            <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>application/json</span>
          </div>
          <pre style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 16, fontSize: 12, color: "#93c5fd", overflowX: "auto", maxHeight: 300 }}>
            {JSON.stringify(queryResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
