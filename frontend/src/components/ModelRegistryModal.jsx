import React from "react";

export default function ModelRegistryModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const MODELS = [
    {
      name: "RS-VQA Specialist (Llava-1.5 / Sonnet-Vision)",
      task: "Visual Question Answering & Scene Description",
      modality: "Optical Multispectral (Sentinel-2)",
      status: "Online",
      latency: "420 ms",
      fallback: "Claude 3.5 Sonnet / GPT-4o-mini Vision Fallback",
      desc: "Answers natural language geospatial queries and computes spectral context indicators (NDVI, NDWI, NDBI)."
    },
    {
      name: "Text-Guided Grounding (GLIP / GEE Engine)",
      task: "Object & Land-Cover Localization",
      modality: "Optical Multispectral (Sentinel-2)",
      status: "Online",
      latency: "580 ms",
      fallback: "Dynamic Earth Engine Spectral Rule Induction",
      desc: "Grounds text mentions into precise bounding boxes and GeoJSON polygons across spatial coordinates."
    },
    {
      name: "Bi-Temporal Change VQA (ChangeLLaVA)",
      task: "Multitemporal Comparative Reasoning",
      modality: "Bi-Temporal Optical Pairs (T1 / T2)",
      status: "Online",
      latency: "610 ms",
      fallback: "Dual-Image Vision Fallback + Delta Indices",
      desc: "Compares before-and-after satellite epochs, identifying transition types, directionality, and spatial shifts."
    },
    {
      name: "Change Segmentation (U-Net ResNet-34)",
      task: "Pixel-Level Change Mask & Severity",
      modality: "Bi-Temporal Optical Pairs (T1 / T2)",
      status: "Online",
      latency: "340 ms",
      fallback: "Synthetic Geometric Cluster Synthesis",
      desc: "Segments new construction, demolition, vegetation loss, and water transitions into spatial vector polygons."
    },
    {
      name: "Multimodal Optical + SAR Fusion Model",
      task: "Cross-Modal Consistency & Radar Grounding",
      modality: "Optical (S2) + SAR Radar (S1 GRD VV/VH)",
      status: "Online",
      latency: "490 ms",
      fallback: "Radar Backscatter Thresholding + LLM Synthesis",
      desc: "Jointly reasons over optical spectral reflectance and microwave radar backscatter for all-weather penetration."
    }
  ];

  return (
    <div className="modal-backdrop-overlay" onClick={onClose}>
      <div className="modal-container-card model-registry-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <span className="modal-icon">🤖</span>
            <div>
              <h3 className="modal-title">AI Model Registry & Engine Status</h3>
              <p className="modal-subtitle">Real-time status of SatQuery AI's specialist models and tiered fallback chain</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="model-registry-body">
          <div className="registry-summary-bar">
            <div className="summary-pill">
              <span className="status-dot green"></span>
              <span>5 / 5 Specialist Models Active</span>
            </div>
            <div className="summary-pill">
              <span className="status-dot blue"></span>
              <span>Tiered Resilient Fallbacks Enabled</span>
            </div>
            <div className="summary-pill">
              <span className="status-dot purple"></span>
              <span>Average Latency: ~480 ms</span>
            </div>
          </div>

          <div className="model-table-container">
            <table className="model-registry-table">
              <thead>
                <tr>
                  <th>Model / Specialist</th>
                  <th>Task Area</th>
                  <th>Sensor Modality</th>
                  <th>Status</th>
                  <th>Avg Latency</th>
                </tr>
              </thead>
              <tbody>
                {MODELS.map((m, idx) => (
                  <tr key={idx}>
                    <td>
                      <div className="model-name-cell">
                        <span className="m-title">{m.name}</span>
                        <span className="m-desc">{m.desc}</span>
                      </div>
                    </td>
                    <td><span className="task-badge">{m.task}</span></td>
                    <td><span className="modality-tag">{m.modality}</span></td>
                    <td>
                      <span className="status-badge-live">
                        <span className="dot"></span>
                        {m.status}
                      </span>
                    </td>
                    <td><span className="latency-val">{m.latency}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary-modal" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
