import React, { useState } from "react";

export default function SettingsModal({ isOpen, onClose }) {
  const [apiKeyOpenAI, setApiKeyOpenAI] = useState("");
  const [apiKeyAnthropic, setApiKeyAnthropic] = useState("");
  const [apiKeyHF, setApiKeyHF] = useState("");
  const [mapboxToken, setMapboxToken] = useState("");
  const [defaultBasemap, setDefaultBasemap] = useState("satellite");
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="modal-backdrop-overlay" onClick={onClose}>
      <div className="modal-container-card settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <span className="modal-icon">⚙️</span>
            <div>
              <h3 className="modal-title">Platform & Workspace Settings</h3>
              <p className="modal-subtitle">Configure AI API providers, Mapbox styling, and geospatial preferences</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="settings-modal-body">
          {saved && (
            <div className="settings-saved-banner">
              ✓ Preferences updated and cached for this session!
            </div>
          )}

          <div className="settings-group">
            <h4 className="settings-group-title">🔑 Vision-Language AI Providers</h4>
            <p className="settings-group-desc">
              SatQuery AI uses local open models with resilient fallbacks to Claude 3.5 Sonnet and GPT-4o-mini Vision.
            </p>

            <div className="settings-input-row">
              <label className="settings-label">OpenAI API Key (GPT-4o Vision):</label>
              <input
                type="password"
                className="settings-input"
                placeholder="sk-proj-..."
                value={apiKeyOpenAI}
                onChange={(e) => setApiKeyOpenAI(e.target.value)}
              />
            </div>

            <div className="settings-input-row">
              <label className="settings-label">Anthropic API Key (Claude 3.5 Sonnet):</label>
              <input
                type="password"
                className="settings-input"
                placeholder="sk-ant-..."
                value={apiKeyAnthropic}
                onChange={(e) => setApiKeyAnthropic(e.target.value)}
              />
            </div>

            <div className="settings-input-row">
              <label className="settings-label">HuggingFace Hub Token:</label>
              <input
                type="password"
                className="settings-input"
                placeholder="hf_..."
                value={apiKeyHF}
                onChange={(e) => setApiKeyHF(e.target.value)}
              />
            </div>
          </div>

          <div className="settings-group mt-4">
            <h4 className="settings-group-title">🗺️ GIS & Map Customization</h4>
            <div className="settings-input-row">
              <label className="settings-label">Custom Mapbox Access Token:</label>
              <input
                type="password"
                className="settings-input"
                placeholder="pk.eyJ1..."
                value={mapboxToken}
                onChange={(e) => setMapboxToken(e.target.value)}
              />
            </div>

            <div className="settings-input-row">
              <label className="settings-label">Default Basemap Mode:</label>
              <select
                className="settings-select"
                value={defaultBasemap}
                onChange={(e) => setDefaultBasemap(e.target.value)}
              >
                <option value="satellite">Satellite HD (Esri / Mapbox)</option>
                <option value="dark">CartoDB Dark Matter</option>
                <option value="light">CartoDB Positron Light</option>
                <option value="osm">OpenStreetMap Standard</option>
                <option value="topo">OpenTopoMap Topographic</option>
              </select>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary-modal" onClick={onClose}>Cancel</button>
          <button className="btn-primary-hero" onClick={handleSave}>Save Preferences</button>
        </div>
      </div>
    </div>
  );
}
