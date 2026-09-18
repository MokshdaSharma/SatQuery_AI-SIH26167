/**
 * ConfidenceGauge.jsx — SVG-based animated arc gauge for confidence display.
 *
 * Props:
 *   value    — 0..1 confidence score
 *   size     — pixel diameter (default 80)
 *   label    — text label below the number (default "confidence")
 */

import { useEffect, useState } from "react";

const COLORS = {
  high:   "#34d399",
  medium: "#fbbf24",
  low:    "#f87171",
};

export default function ConfidenceGauge({ value = 0, size = 80, label = "confidence" }) {
  const [animatedValue, setAnimatedValue] = useState(0);

  // Animate on mount / value change
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  const level = value >= 0.65 ? "high" : value >= 0.45 ? "medium" : "low";
  const color = COLORS[level];

  const strokeWidth = 4;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - animatedValue * circumference;
  const center = size / 2;

  return (
    <div className="confidence-gauge" style={{ width: size, height: size }}>
      <svg
        className="confidence-gauge__svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Track */}
        <circle
          className="confidence-gauge__track"
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Fill */}
        <circle
          className="confidence-gauge__fill"
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="confidence-gauge__label">
        <span className="confidence-gauge__value" style={{ color }}>
          {(value * 100).toFixed(0)}%
        </span>
        <span className="confidence-gauge__text">{label}</span>
      </div>
    </div>
  );
}
