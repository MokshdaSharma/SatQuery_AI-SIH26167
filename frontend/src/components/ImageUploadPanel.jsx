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
          className={`upload-zone${dragOver ? " upload-zone--drag-over" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload satellite image"
          onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
        >
          <div className="upload-zone__icon">🛰️</div>
          <p className="upload-zone__title">
            Drop image here or click to browse
          </p>
          <p className="upload-zone__subtitle">
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
        <div className="card animate-in upload-progress">
          <div className="upload-progress__header">
            <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
            <span className="upload-progress__text">
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
            <p className="upload-progress__sub">
              Extracting georeferencing &amp; generating preview…
            </p>
          )}
        </div>
      )}

      {/* ── Upload error ───────────────────────────────────────────────────── */}
      {uploadError && (
        <div className="error-banner" role="alert">
          <span>❌</span>
          <span>{uploadError}</span>
        </div>
      )}

      {/* ── Result card ────────────────────────────────────────────────────── */}
      {hasResult && !isUploading && (
        <div className="card animate-in upload-result">
          {/* Preview image */}
          {uploadResult.preview_url && (
            <div className="upload-result__preview">
              <img
                src={`${BASE_URL}${uploadResult.preview_url}`}
                alt="Uploaded image preview"
              />
            </div>
          )}

          {/* Filename + modality */}
          <div className="upload-result__file-row">
            <span className="upload-result__file-icon">
              {uploadResult.modality === "uploaded_sar" ? "📡" : "🛰️"}
            </span>
            <span className="upload-result__filename">
              {uploadResult.filename}
            </span>
          </div>

          {/* Georef badge */}
          <div className="upload-result__badges">
            <span className={`task-badge ${uploadResult.has_georef ? "grounding" : "vqa"}`}>
              {uploadResult.has_georef ? "✓ Georeferenced" : "⚠ No geo-ref"}
            </span>
            <span className="task-badge caption">
              {uploadResult.modality.replace("uploaded_", "").toUpperCase() || "UPLOADED"}
            </span>
          </div>

          {/* Bounds info */}
          {uploadResult.geo_bounds && (
            <p className="upload-result__bounds">
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
            <p className="upload-result__overlay-note">
              ✓ Image overlaid on map
            </p>
          )}

          {/* Clear button */}
          <button
            type="button"
            id="upload-clear-btn"
            className="btn btn-ghost btn-xs upload-result__clear-btn"
            onClick={onClear}
          >
            ✕ Remove &amp; upload another
          </button>
        </div>
      )}
    </div>
  );
}
