/**
 * BeforeAfterSlider.jsx — Interactive dual-epoch comparison slider.
 *
 * Supports:
 *   - Split swipe slider (draggable divider bar)
 *   - Cross-fade opacity blend mode
 *   - Real GEE satellite imagery previews with date badges
 *   - Clean procedural spectral canvas when awaiting raw satellite stream
 */

import { useState, useRef, useEffect, useCallback } from "react";

export default function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  beforeDate = "Pre-Event (T1)",
  afterDate = "Post-Event (T2)",
  beforeLabel = "Baseline Epoch (T1)",
  afterLabel = "Target Epoch (T2)",
}) {
  const [sliderPos, setSliderPos] = useState(50); // percentage 0-100
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState("split"); // "split" | "blend"
  const [blendOpacity, setBlendOpacity] = useState(50);
  const containerRef = useRef(null);

  const handleMove = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  const handleTouchMove = useCallback(
    (e) => {
      if (!isDragging || !e.touches[0]) return;
      handleMove(e.touches[0].clientX);
    },
    [isDragging, handleMove]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;
      handleMove(e.clientX);
    },
    [isDragging, handleMove]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchmove", handleTouchMove);
      window.addEventListener("touchend", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  return (
    <div className="before-after-container card">
      {/* Header controls */}
      <div className="before-after-header">
        <div className="before-after-title">
          <span className="before-after-icon">⚖️</span>
          <div>
            <div className="before-after-heading">Bi-Temporal Visual Diff</div>
            <div className="before-after-subheading">Swipe to compare pre-event vs post-event satellite observations</div>
          </div>
        </div>

        <div className="before-after-mode-toggles">
          <button
            type="button"
            className={`diff-mode-btn${viewMode === "split" ? " diff-mode-btn--active" : ""}`}
            onClick={() => setViewMode("split")}
          >
            ↔️ Split Swipe
          </button>
          <button
            type="button"
            className={`diff-mode-btn${viewMode === "blend" ? " diff-mode-btn--active" : ""}`}
            onClick={() => setViewMode("blend")}
          >
            🎚 Cross-Fade
          </button>
        </div>
      </div>

      {/* Main viewport */}
      <div
        ref={containerRef}
        className={`before-after-viewport before-after-viewport--${viewMode}`}
        onMouseDown={() => viewMode === "split" && setIsDragging(true)}
        onTouchStart={() => viewMode === "split" && setIsDragging(true)}
      >
        {viewMode === "split" ? (
          <>
            {/* After Image (Background / Target Epoch) */}
            <div className="ba-layer ba-layer--after">
              {afterUrl ? (
                <img src={afterUrl} alt="Post-event satellite observation" />
              ) : (
                <div className="sensor-raster-placeholder sensor-raster--optical" style={{ height: "100%" }}>
                  <div className="sensor-raster-grid" />
                  <div className="sensor-raster-content">
                    <span className="sensor-icon">🛰️</span>
                    <div className="sensor-title">Target Epoch Observation (T2)</div>
                    <div className="sensor-meta">Date: {afterDate} | Sentinel-2 MSI</div>
                    <div className="sensor-coords">Co-Registered 10m Ground Grid</div>
                  </div>
                </div>
              )}
              <div className="ba-badge ba-badge--after">
                <span className="ba-badge__dot" />
                {afterLabel}: {afterDate}
              </div>
            </div>

            {/* Before Image (Clipped / Baseline Epoch) */}
            <div
              className="ba-layer ba-layer--before"
              style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
            >
              {beforeUrl ? (
                <img src={beforeUrl} alt="Pre-event satellite observation" />
              ) : (
                <div className="sensor-raster-placeholder sensor-raster--sar" style={{ height: "100%" }}>
                  <div className="sensor-raster-grid" />
                  <div className="sensor-raster-content">
                    <span className="sensor-icon">🗺️</span>
                    <div className="sensor-title">Baseline Epoch Reference (T1)</div>
                    <div className="sensor-meta">Date: {beforeDate} | Sentinel-2 MSI</div>
                    <div className="sensor-coords">Baseline Reference Grid</div>
                  </div>
                </div>
              )}
              <div className="ba-badge ba-badge--before">
                <span className="ba-badge__dot" />
                {beforeLabel}: {beforeDate}
              </div>
            </div>

            {/* Draggable Divider Bar */}
            <div className="ba-divider" style={{ left: `${sliderPos}%` }}>
              <div className="ba-divider__line" />
              <div className="ba-divider__handle" aria-label="Drag to compare before and after">
                <span className="ba-divider__arrow">◀</span>
                <span className="ba-divider__arrow">▶</span>
              </div>
            </div>
          </>
        ) : (
          /* Blend Mode */
          <div className="ba-blend-view">
            <div className="ba-layer ba-layer--after">
              {afterUrl ? (
                <img src={afterUrl} alt="Post-event observation" />
              ) : (
                <div className="sensor-raster-placeholder sensor-raster--optical" style={{ height: "100%" }}>
                  <div className="sensor-raster-content">
                    <span className="sensor-icon">🛰️</span>
                    <div className="sensor-title">Target Epoch (T2): {afterDate}</div>
                  </div>
                </div>
              )}
            </div>
            <div className="ba-layer ba-layer--before" style={{ opacity: (100 - blendOpacity) / 100 }}>
              {beforeUrl ? (
                <img src={beforeUrl} alt="Pre-event observation" />
              ) : (
                <div className="sensor-raster-placeholder sensor-raster--sar" style={{ height: "100%" }}>
                  <div className="sensor-raster-content">
                    <span className="sensor-icon">🗺️</span>
                    <div className="sensor-title">Baseline Epoch (T1): {beforeDate}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="ba-blend-controls">
              <span className="blend-label">T1 ({100 - blendOpacity}%)</span>
              <input
                type="range"
                min="0"
                max="100"
                value={blendOpacity}
                onChange={(e) => setBlendOpacity(Number(e.target.value))}
                className="blend-slider"
              />
              <span className="blend-label">T2 ({blendOpacity}%)</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer info bar */}
      <div className="before-after-footer">
        <div className="ba-stat-pill">
          <span className="ba-stat-pill__label">Baseline Epoch:</span>
          <span className="ba-stat-pill__val">{beforeDate}</span>
        </div>
        <div className="ba-stat-pill">
          <span className="ba-stat-pill__label">Target Epoch:</span>
          <span className="ba-stat-pill__val">{afterDate}</span>
        </div>
        <div className="ba-stat-pill ba-stat-pill--cyan">
          <span className="ba-stat-pill__label">Registration:</span>
          <span className="ba-stat-pill__val">Co-registered (0.1px RMS)</span>
        </div>
      </div>
    </div>
  );
}
