/**
 * KeyboardShortcuts.jsx — Global keyboard shortcut handler and help modal.
 *
 * Props:
 *   onSubmit()     — Ctrl+Enter handler
 *   onToggleLeft() — toggle left sidebar
 *   onToggleRight()— toggle right sidebar
 */

import { useEffect, useState, useCallback } from "react";

const SHORTCUTS = [
  { keys: "Ctrl + Enter", action: "Run AI Analysis" },
  { keys: "Ctrl + 1", action: "Toggle Query Panel" },
  { keys: "Ctrl + 2", action: "Toggle Results Panel" },
  { keys: "Escape", action: "Close panels / modals" },
  { keys: "?", action: "Show this help" },
];

export default function KeyboardShortcuts({ onSubmit, onToggleLeft, onToggleRight }) {
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = useCallback((e) => {
    // Don't trigger when typing in inputs
    const tag = e.target.tagName;
    const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

    // Ctrl+Enter: submit (always, even in textarea)
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onSubmit?.();
      return;
    }

    // Skip other shortcuts if in an input
    if (isInput) return;

    // ? key: show help
    if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      setShowHelp((v) => !v);
      return;
    }

    // Escape: close help or panels
    if (e.key === "Escape") {
      if (showHelp) {
        setShowHelp(false);
      } else {
        onToggleLeft?.();
        onToggleRight?.();
      }
      return;
    }

    // Ctrl+1: toggle left panel
    if ((e.ctrlKey || e.metaKey) && e.key === "1") {
      e.preventDefault();
      onToggleLeft?.();
      return;
    }

    // Ctrl+2: toggle right panel
    if ((e.ctrlKey || e.metaKey) && e.key === "2") {
      e.preventDefault();
      onToggleRight?.();
      return;
    }
  }, [onSubmit, onToggleLeft, onToggleRight, showHelp]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!showHelp) return null;

  return (
    <div
      className="shortcuts-overlay"
      onClick={(e) => e.target === e.currentTarget && setShowHelp(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div className="shortcuts-modal">
        <div className="shortcuts-modal__title">
          ⌨️ Keyboard Shortcuts
        </div>
        {SHORTCUTS.map(({ keys, action }) => (
          <div key={keys} className="shortcuts-modal__row">
            <span className="shortcuts-modal__action">{action}</span>
            <span className="kbd">{keys}</span>
          </div>
        ))}
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowHelp(false)}
          >
            Press <span className="kbd" style={{ marginLeft: 4 }}>Esc</span> to close
          </button>
        </div>
      </div>
    </div>
  );
}
