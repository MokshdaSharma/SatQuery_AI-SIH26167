import React from "react";

export default function NavBar({
  activeTab,
  onSelectTab,
  backendOnline,
  currentView, // "landing" or "workspace"
  onToggleView,
  onOpenModelRegistry,
  onOpenDocs,
  onOpenSettings,
  onOpenTrace
}) {
  const TABS = [
    { id: "studio", label: "01 — Earth Studio", icon: "🛰️" },
    { id: "change", label: "02 — Temporal Change", icon: "🔄" },
    { id: "fusion", label: "03 — Optical + SAR", icon: "📡" },
    { id: "lab", label: "04 — Upload Lab", icon: "🧪" },
    { id: "reports", label: "05 — Reports", icon: "📑" }
  ];

  return (
    <header className="navbar-root">
      {/* ── LEFT: Logo & Brand ────────────────────────────────────────── */}
      <div className="navbar-brand-section" onClick={() => onToggleView("landing")}>
        <div className="brand-logo-glow">
          <span className="brand-logo-icon">🛰️</span>
        </div>
        <div className="brand-text-col">
          <div className="brand-name-row">
            <span className="brand-title">SatQuery AI</span>
            <span className="brand-version-badge">v2.0</span>
          </div>
          <span className="brand-subtitle">Agentic Earth Intelligence</span>
        </div>
      </div>

      {/* ── CENTER: Primary 5 Workspace Tabs ───────────────────────────── */}
      <nav className="navbar-center-tabs">
        {TABS.map((tab) => {
          const isActive = currentView === "workspace" && activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`nav-tab-pill ${isActive ? "active" : ""}`}
              onClick={() => {
                if (currentView !== "workspace") onToggleView("workspace");
                onSelectTab(tab.id);
              }}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── RIGHT: Secondary Actions & AI Engine Status ────────────────── */}
      <div className="navbar-right-section">
        {/* AI Engine Status Indicator */}
        <div
          className="ai-engine-pill"
          onClick={onOpenModelRegistry}
          title="Click to view AI Model Registry"
        >
          <span className={`engine-dot ${backendOnline === false ? "offline" : "online"}`}></span>
          <span className="engine-text">
            {backendOnline === false ? "Backend Offline" : "AI Engine Online"}
          </span>
        </div>

        {/* Action Buttons */}
        <button className="nav-icon-btn" onClick={onOpenDocs} title="Documentation & User Guide">
          📖 <span>Docs</span>
        </button>

        <button className="nav-icon-btn" onClick={onOpenModelRegistry} title="Model Status & Registry">
          🤖 <span>Models</span>
        </button>

        <button className="nav-icon-btn" onClick={onOpenSettings} title="Settings & API Keys">
          ⚙️ <span>Settings</span>
        </button>

        {/* View Toggle (Home / Workspace) */}
        {currentView === "landing" ? (
          <button
            className="btn-launch-workspace"
            onClick={() => onToggleView("workspace")}
          >
            <span>Launch Studio →</span>
          </button>
        ) : (
          <button
            className="btn-home-toggle"
            onClick={() => onToggleView("landing")}
            title="Return to Home Overview"
          >
            <span>🏠 Home</span>
          </button>
        )}
      </div>
    </header>
  );
}
