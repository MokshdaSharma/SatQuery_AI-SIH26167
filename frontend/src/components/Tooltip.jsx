/**
 * Tooltip.jsx — CSS-only tooltip wrapper.
 *
 * Props:
 *   text     — tooltip text
 *   children — the element to wrap
 */

export default function Tooltip({ text, children }) {
  if (!text) return children;

  return (
    <span className="tooltip-wrapper">
      {children}
      <span className="tooltip-content" role="tooltip">{text}</span>
    </span>
  );
}
