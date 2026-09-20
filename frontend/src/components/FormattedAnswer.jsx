/**
 * FormattedAnswer.jsx — Renders AI response text with clean typography,
 * converting markdown asterisks, bold text, bullets, and section headers
 * into structured HTML elements without showing raw '*' characters.
 */

import React from "react";

/**
 * Parses inline formatting like **bold**, *italic*, and `code`
 */
function renderInlineFormatting(text) {
  if (!text) return null;

  // Pattern matches: **bold**, *italic*, `code`
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const content = part.slice(2, -2);
      return (
        <strong key={index} style={{ color: "var(--color-text-bright, #f8fafc)", fontWeight: 600 }}>
          {content}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
      const content = part.slice(1, -1);
      return (
        <em key={index} style={{ color: "var(--color-brand-primary, #38bdf8)", fontStyle: "italic" }}>
          {content}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      const content = part.slice(1, -1);
      return (
        <code
          key={index}
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            padding: "2px 6px",
            borderRadius: 4,
            fontSize: "0.9em",
            fontFamily: "monospace",
          }}
        >
          {content}
        </code>
      );
    }
    // Clean any remaining lone asterisks that shouldn't be visible
    const cleaned = part.replace(/\*/g, "");
    return <span key={index}>{cleaned}</span>;
  });
}

export default function FormattedAnswer({ text, className = "", style = {} }) {
  if (!text) return null;

  // Split lines
  const lines = text.split("\n");
  const elements = [];
  let currentList = [];

  function flushList() {
    if (currentList.length > 0) {
      elements.push(
        <ul
          key={`list-${elements.length}`}
          style={{
            margin: "8px 0 12px 0",
            paddingLeft: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {currentList.map((item, idx) => (
            <li
              key={idx}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                lineHeight: 1.55,
              }}
            >
              <span
                style={{
                  color: "var(--color-brand-primary, #38bdf8)",
                  fontSize: 14,
                  lineHeight: 1.4,
                  userSelect: "none",
                }}
              >
                ▸
              </span>
              <div style={{ flex: 1 }}>{renderInlineFormatting(item)}</div>
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  }

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    // Check if line is a bullet item (*, -, •, or 1.)
    const bulletMatch = trimmed.match(/^([*•\-–]|\d+\.)\s+(.+)$/);
    if (bulletMatch) {
      currentList.push(bulletMatch[2]);
      return;
    }

    // If it's not a bullet, flush any existing list
    flushList();

    // Check if line is a heading / section header (**Header:** or # Header)
    const headerMatch = trimmed.match(/^(?:#+\s+|\*\*)([^*#]+)(?:\*\*|:)?$/);
    if (headerMatch && (trimmed.startsWith("#") || trimmed.startsWith("**"))) {
      const headerTitle = headerMatch[1].replace(/[:*#]/g, "").trim();
      elements.push(
        <div
          key={`heading-${idx}`}
          style={{
            fontWeight: 700,
            fontSize: "1.05em",
            color: "var(--color-brand-primary, #38bdf8)",
            margin: idx === 0 ? "0 0 8px 0" : "12px 0 6px 0",
            letterSpacing: 0.2,
          }}
        >
          {headerTitle}
        </div>
      );
      return;
    }

    // Regular paragraph
    elements.push(
      <p
        key={`p-${idx}`}
        style={{
          margin: "0 0 8px 0",
          lineHeight: 1.6,
        }}
      >
        {renderInlineFormatting(trimmed)}
      </p>
    );
  });

  flushList();

  return (
    <div
      className={`formatted-answer ${className}`}
      style={{
        color: "var(--color-text-normal, #cbd5e1)",
        fontSize: 13.5,
        ...style,
      }}
    >
      {elements}
    </div>
  );
}
