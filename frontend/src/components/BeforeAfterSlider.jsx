/**
 * BeforeAfterSlider.jsx — Interactive dual-epoch comparison slider.
 *
 * Supports:
 *   - Split swipe slider (draggable divider bar)
 *   - Cross-fade opacity blend mode
 *   - Before (T1) and After (T2) image previews with date badges
 */

import { useState, useRef, useEffect, useCallback } from "react";

export default function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  beforeDate = "Pre-Event (T1)",
  afterDate = "Post-Event (T2)",
  beforeLabel = "Before",
  afterLabel = "After",
}) {
  const [sliderPos, setSliderPos] = useState(50); // percentage 0-100
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState("split"); // "split" | "blend"
  const [blendOpacity, setBlendOpacity] = useState(50);
  const containerRef = useRef(null);

  const handleMove = useCallback(
    (clientX) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPos(pct);
    },
    []
  );

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

  // Fallback satellite placeholders if no images uploaded yet
  const defaultBefore = beforeUrl || "https://images.unsplash.com/photo-1509718443690-d8e2fb3474b7?auto=format&fit=crop&w=1200&q=80";
  const defaultAfter = afterUrl || "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80";

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
            {/* After Image (Background) */}
            <div className="ba-layer ba-layer--after">
              <img src={defaultAfter} alt="Post-event satellite observation" />
              <div className="ba-badge ba-badge--after">
                <span className="ba-badge__dot" />
                {afterLabel}: {afterDate}
              </div>
            </div>

            {/* Before Image (Clipped Foreground) */}
            <div
              className="ba-layer ba-layer--before"
              style={{ clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)` }}
            >
              <img src={defaultBefore} alt="Pre-event satellite observation" />
              <div className="ba-badge ba-badge--before">
                <span className="ba-badge__dot" />
                {beforeLabel}: {beforeDate}
              </div>
            </div>

            {/* Draggable Divider Handle */}
            <div
              className="ba-handle"
              style={{ left: `${sliderPos}%` }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsDragging(true);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                setIsDragging(true);
              }}
            >
              <div className="ba-handle__line" />
              <div className="ba-handle__button">
                <span>◀</span>
                <span>▶</span>
              </div>
            </div>
          </>
        ) : (
          /* Cross-fade Blend Mode */
          <div className="ba-blend-viewport">
            <div className="ba-blend-base">
              <img src={defaultBefore} alt="Pre-event baseline" />
              <div className="ba-badge ba-badge--before">Before ({beforeDate})</div>
            </div>
            <div
              className="ba-blend-overlay"
              style={{ opacity: blendOpacity / 100 }}
            >
              <img src={defaultAfter} alt="Post-event overlay" />
              <div className="ba-badge ba-badge--after">After ({afterDate})</div>
            </div>
          </div>
        )}
      </div>

      {/* Blend Slider Bar (if in blend mode) */}
      {viewMode === "blend" && (
        <div className="ba-blend-control">
          <span className="ba-blend-label">Before (0%)</span>
          <input
            type="range"
            min="0"
            max="100"
            value={blendOpacity}
            onChange={(e) => setBlendOpacity(Number(e.target.value))}
            className="ba-blend-slider"
          />
          <span className="ba-blend-label">After (100%)</span>
          <span className="ba-blend-val">{blendOpacity}% After</span>
        </div>
      )}

      {/* Footer Info */}
      <div className="before-after-footer">
        <div className="ba-stat-pill">
          <span className="ba-stat-pill__key">Baseline Epoch:</span>
          <span className="ba-stat-pill__val">{beforeDate}</span>
        </div>
        <div className="ba-stat-pill">
          <span className="ba-stat-pill__key">Target Epoch:</span>
          <span className="ba-stat-pill__val">{afterDate}</span>
        </div>
        <div className="ba-stat-pill ba-stat-pill--active">
          <span className="ba-stat-pill__key">Registration:</span>
          <span className="ba-stat-pill__val">Co-registered (0.1px RMS)</span>
        </div>
      </div>
    </div>
  );
}
