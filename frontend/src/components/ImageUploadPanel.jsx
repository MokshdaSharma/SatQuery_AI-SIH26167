/**
 * ImageUploadPanel.jsx — Drag-and-drop / file-picker for uploading satellite images.
 *
 * Props:
 *   onUploadComplete(uploadResult)  — called when upload + processing succeeds
 *   uploadResult                    — current UploadResponse (or null)
 *   isUploading                     — boolean
 *   uploadProgress                  — 0-100 integer (upload % progress)
 *   uploadError                     — error string | null
 */

import { useCallback, useRef, useState } from "react";

const ACCEPTED_TYPES = ".tif,.tiff,.png,.jpg,.jpeg,.jp2";
const ACCEPTED_LABEL = "GeoTIFF, PNG, JPEG, JPEG2000";
const MAX_MB = 200;

export default function ImageUploadPanel({
  onUploadComplete,
  uploadResult,
  isUploading,
  uploadProgress,
  uploadError,
  onClear,
}) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onUploadComplete(file);   // pass the raw File; App.jsx calls uploadImage()
    },
    [onUploadComplete]
  );

  const handleFileChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) onUploadComplete(file);
      // Reset so same file can be re-selected
      e.target.value = "";
    },
    [onUploadComplete]
  );

  // ── Derived ────────────────────────────────────────────────────────────────
  const hasResult = !!uploadResult;
  const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* ── Drop zone ──────────────────────────────────────────────────────── */}
      {!hasResult && !isUploading && (
        <div
          id="upload-drop-zone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? "var(--color-brand-primary)" : "var(--color-border)"}`,
            borderRadius: "var(--radius-lg)",
            padding: "20px 16px",
            textAlign: "center",
            cursor: "pointer",
            background: dragOver
              ? "rgba(56,189,248,0.06)"
              : "rgba(255,255,255,0.02)",
            transition: "all 0.2s ease",
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.6 }}>🛰️</div>
          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 4 }}>
            Drop image here or click to browse
          </p>
          <p style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
            {ACCEPTED_LABEL} · Max {MAX_MB} MB
          </p>
          <input
            ref={fileInputRef}
            id="upload-file-input"
            type="file"
            accept={ACCEPTED_TYPES}
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* ── Upload progress ────────────────────────────────────────────────── */}
      {isUploading && (
        <div className="card animate-in" style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
            <span style={{ fontSize: 13, fontWeight: 500 }}>
              {uploadProgress < 100 ? `Uploading… ${uploadProgress}%` : "Processing image…"}
            </span>
          </div>
          <div className="confidence-bar">
            <div
              className="confidence-bar__fill high"
              style={{ width: `${uploadProgress}%`, transition: "width 0.3s ease" }}
            />
          </div>
          {uploadProgress === 100 && (
            <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 6 }}>
              Extracting georeferencing &amp; generating preview…
            </p>
          )}
        </div>
      )}

      {/* ── Upload error ───────────────────────────────────────────────────── */}
      {uploadError && (
        <div className="error-banner">
          <span>❌</span>
          <span>{uploadError}</span>
        </div>
      )}

      {/* ── Result card ────────────────────────────────────────────────────── */}
      {hasResult && !isUploading && (
        <div className="card animate-in" style={{ padding: "12px 14px" }}>
          {/* Preview image */}
          {uploadResult.preview_url && (
            <div style={{ marginBottom: 10, borderRadius: 8, overflow: "hidden", border: "1px solid var(--color-border)" }}>
              <img
                src={`${BASE_URL}${uploadResult.preview_url}`}
                alt="Uploaded image preview"
                style={{ width: "100%", display: "block", maxHeight: 160, objectFit: "cover" }}
              />
            </div>
          )}

          {/* Filename + modality */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 16 }}>
              {uploadResult.modality === "uploaded_sar" ? "📡" : "🛰️"}
            </span>
            <span style={{ fontSize: 12, fontWeight: 500, flex: 1, wordBreak: "break-all" }}>
              {uploadResult.filename}
            </span>
          </div>

          {/* Georef badge */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            <span className={`task-badge ${uploadResult.has_georef ? "grounding" : "vqa"}`} style={{ fontSize: 10 }}>
              {uploadResult.has_georef ? "✓ Georeferenced" : "⚠ No geo-ref"}
            </span>
            <span className="task-badge caption" style={{ fontSize: 10 }}>
              {uploadResult.modality.replace("uploaded_", "").toUpperCase() || "UPLOADED"}
            </span>
          </div>

          {/* Bounds info */}
          {uploadResult.geo_bounds && (
            <p style={{ fontSize: 10, color: "var(--color-text-muted)", fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 }}>
              W:{uploadResult.geo_bounds[0].toFixed(4)} S:{uploadResult.geo_bounds[1].toFixed(4)}{" "}
              E:{uploadResult.geo_bounds[2].toFixed(4)} N:{uploadResult.geo_bounds[3].toFixed(4)}
            </p>
          )}

          {/* Warnings */}
          {uploadResult.warnings?.map((w, i) => (
            <div key={i} className="warning-banner" style={{ marginBottom: 4 }}>
              <span>⚠️</span><span style={{ fontSize: 11 }}>{w}</span>
            </div>
          ))}

          {/* Map overlay note */}
          {uploadResult.has_georef && (
            <p style={{ fontSize: 11, color: "var(--color-brand-accent)", marginBottom: 6 }}>
              ✓ Image overlaid on map
            </p>
          )}

          {/* Clear button */}
          <button
            type="button"
            id="upload-clear-btn"
            className="btn btn-ghost btn-xs"
            onClick={onClear}
            style={{ width: "100%", borderTop: "1px solid var(--color-border)", paddingTop: 8, marginTop: 4 }}
          >
            ✕ Remove &amp; upload another
          </button>
        </div>
      )}
    </div>
  );
}
