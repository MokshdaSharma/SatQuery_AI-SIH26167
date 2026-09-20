import React, { useState, useEffect } from "react";

export default function NavBar({
  activeTab,
  onSelectTab,
  backendOnline,
  onOpenModelRegistry,
  onOpenDocs,
  onOpenSettings,
  onOpenTrace,
}) {
  const [currentTime, setCurrentTime] = useState("");

  // Live IST Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const options = {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      };
      setCurrentTime(new Intl.DateTimeFormat("en-GB", options).format(now));
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const TABS = [
    { id: "home", label: "Home", icon: "🏠" },
    { id: "mapping", label: "Mapping", icon: "🌐" },
    { id: "change", label: "Upload & Analysis", icon: "📤" },
    { id: "fusion", label: "Cross-Modal Fusion", icon: "📊" },
    { id: "logs", label: "Data Logs", icon: "🗄️" },
  ];

  return (
    <header className="navbar-root satquery-topbar">
      {/* ── Center Tabs with Icons ─────────────────────────────────────── */}
      <div className="topbar-left-section">
        <div className="topbar-brand" onClick={() => onSelectTab("home")}>
          <span className="brand-dot"></span>
          <span className="brand-title-text">SatQuery AI</span>
        </div>
      </div>

      <nav className="topbar-nav-tabs">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`topbar-nav-btn ${isActive ? "active" : ""}`}
              onClick={() => onSelectTab(tab.id)}
            >
              <span className="topbar-tab-icon">{tab.icon}</span>
              <span className="topbar-tab-label">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Right Status: Online Badge & Live IST Time ─────────────────── */}
      <div className="topbar-right-section">
        <div
          className={`status-pill ${backendOnline === false ? "status-pill--offline" : "status-pill--online"}`}
          onClick={onOpenModelRegistry}
          title="Click to inspect model status"
        >
          <span className="status-indicator-dot"></span>
          <span className="status-text">
            {backendOnline === false ? "OFFLINE" : "ONLINE"}
          </span>
        </div>

        <div className="time-display-pill">
          <span className="clock-icon">🕒</span>
          <span className="time-text">{currentTime || "07:10:00"} IST</span>
        </div>
      </div>
    </header>
  );
}
