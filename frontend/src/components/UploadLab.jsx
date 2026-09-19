/**
 * UploadLab.jsx — Dedicated full-page studio for paired / single image uploads.
 *
 * Supports three upload modes:
 *   1. Single satellite image (VQA, Captioning, Grounding)
 *   2. Optical + SAR Pair (co-registered optical + SAR imagery)
 *   3. Bi-temporal Pair (Before / After — different dates for change analysis)
 *
 * Props:
 *   onSubmit(params)           — triggers analysis with uploaded image refs
 *   isLoading                  — analysis in progress
 *   queryResult                — last analysis result
 *   error                      — error string | null
 *   onExport                   — export handler
 *   isExporting                — export in progress
 *   exportResult               — export result
 */

import { useCallback, useRef, useState } from "react";
import ResultPanel from "./ResultPanel";
import { uploadImage } from "../api";

const ACCEPTED = ".tif,.tiff,.png,.jpg,.jpeg,.jp2";
const ACCEPTED_LABEL = "GeoTIFF · PNG · JPEG · JPEG2000";
const MAX_MB = 200;

const UPLOAD_MODES = [
  {
    id: "single",
    icon: "🛰️",
    title: "Single Image",
    desc: "Upload one satellite image for VQA, captioning, or region grounding",
    tasks: ["VQA", "Captioning", "Grounding"],
    color: "#818cf8",
  },
  {
    id: "optical_sar",
    icon: "📡",
    title: "Optical + SAR Pair",
    desc: "Upload co-registered optical (Sentinel-2) and SAR (Sentinel-1) images for joint fusion analysis",
    tasks: ["Optical–SAR Fusion", "Built-up detection", "Flood mapping"],
    color: "#34d399",
  },
  {
    id: "bitemporal",
    icon: "⏱️",
    title: "Before / After Pair",
    desc: "Upload two images from different dates for bi-temporal change detection & change VQA",
    tasks: ["Change VQA", "Change Segmentation", "Spectral delta analysis"],
    color: "#f59e0b",
  },
];

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function DropZone({ label, icon, onFile, uploadResult, isUploading, uploadError, progress, onClear, accentColor }) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(false);
  const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }, [onFile]);

  const handleChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = "";
  }, [onFile]);

  const hasResult = !!uploadResult;

  return (
    <div className="dropzone-wrapper">
      <div className="dropzone-label" style={{ color: accentColor }}>
        <span>{icon}</span> {label}
      </div>

      {!hasResult && !isUploading && (
        <div
          className={`upload-zone${drag ? " upload-zone--drag-over" : ""}`}
          style={{ borderColor: drag ? accentColor : undefined, minHeight: 140 }}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          onClick={() => ref.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && ref.current?.click()}
          aria-label={`Upload ${label}`}
        >
          <div className="upload-zone__icon" style={{ fontSize: 32 }}>📂</div>
          <p className="upload-zone__title">Drop image or click to browse</p>
          <p className="upload-zone__subtitle">{ACCEPTED_LABEL} · Max {MAX_MB} MB</p>
          <input ref={ref} type="file" accept={ACCEPTED} style={{ display: "none" }} onChange={handleChange} />
        </div>
      )}

      {isUploading && (
        <div className="card animate-in upload-progress" style={{ minHeight: 100 }}>
          <div className="upload-progress__header">
            <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            <span className="upload-progress__text">{progress < 100 ? `Uploading… ${progress}%` : "Processing…"}</span>
          </div>
          <div className="confidence-bar" style={{ marginTop: 10 }}>
            <div className="confidence-bar__fill high" style={{ width: `${progress}%`, background: accentColor }} />
          </div>
        </div>
      )}

      {uploadError && (
        <div className="error-banner" role="alert">
          <span>❌</span><span style={{ fontSize: 12 }}>{uploadError}</span>
        </div>
      )}

      {hasResult && !isUploading && (
        <div className="card animate-in upload-result" style={{ borderColor: `rgba(${hexToRgb(accentColor)},0.35)` }}>
          {uploadResult.preview_url && (
            <div className="upload-result__preview" style={{ maxHeight: 140 }}>
              <img src={`${BASE_URL}${uploadResult.preview_url}`} alt="preview" style={{ maxHeight: 140 }} />
            </div>
          )}
          <div className="upload-result__file-row">
            <span className="upload-result__file-icon">{uploadResult.modality?.includes("sar") ? "📡" : "🛰️"}</span>
            <span className="upload-result__filename">{uploadResult.filename}</span>
          </div>
          <div className="upload-result__badges">
            <span className={`task-badge ${uploadResult.has_georef ? "grounding" : "vqa"}`}>
              {uploadResult.has_georef ? "✓ Georef" : "⚠ No geo-ref"}
            </span>
            <span className="task-badge caption">{uploadResult.modality?.replace("uploaded_", "")?.toUpperCase()}</span>
          </div>
          {uploadResult.geo_bounds && (
            <p className="upload-result__bounds">
              W:{uploadResult.geo_bounds[0].toFixed(3)} S:{uploadResult.geo_bounds[1].toFixed(3)}{" "}
              E:{uploadResult.geo_bounds[2].toFixed(3)} N:{uploadResult.geo_bounds[3].toFixed(3)}
            </p>
          )}
          <button className="btn btn-ghost btn-xs upload-result__clear-btn" onClick={onClear}>✕ Remove</button>
        </div>
      )}
    </div>
  );
}

export default function UploadLab({ onSubmit, isLoading, queryResult, error, onExport, isExporting, exportResult, defaultMode = "single" }) {
  const [uploadMode, setUploadMode] = useState(defaultMode);
  const [query, setQuery]           = useState("");
  const [dateStart1, setDateStart1] = useState("2023-01-01");
  const [dateStart2, setDateStart2] = useState("2024-01-01");

  // Primary image state
  const [primary,       setPrimary]       = useState(null);
  const [isPrimaryUp,   setIsPrimaryUp]   = useState(false);
  const [primaryProg,   setPrimaryProg]   = useState(0);
  const [primaryErr,    setPrimaryErr]    = useState(null);

  // Secondary image state (for paired modes)
  const [secondary,     setSecondary]     = useState(null);
  const [isSecondaryUp, setIsSecondaryUp] = useState(false);
  const [secondaryProg, setSecondaryProg] = useState(0);
  const [secondaryErr,  setSecondaryErr]  = useState(null);

  const mode = UPLOAD_MODES.find(m => m.id === uploadMode);

  const uploadFile = useCallback(async (file, setResult, setUploading, setProgress, setError) => {
    setUploading(true);
    setProgress(0);
    setError(null);
    setResult(null);
    try {
      const res = await uploadImage(file, setProgress);
      setResult(res);
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }, []);

  const handlePrimaryFile  = useCallback((f) => uploadFile(f, setPrimary,   setIsPrimaryUp,   setPrimaryProg,   setPrimaryErr),   [uploadFile]);
  const handleSecondaryFile = useCallback((f) => uploadFile(f, setSecondary, setIsSecondaryUp, setSecondaryProg, setSecondaryErr), [uploadFile]);

  const clearPrimary   = useCallback(() => { setPrimary(null);   setPrimaryErr(null);   setPrimaryProg(0);   }, []);
  const clearSecondary = useCallback(() => { setSecondary(null); setSecondaryErr(null); setSecondaryProg(0); }, []);

  const handleModeChange = (id) => {
    setUploadMode(id);
    clearPrimary();
    clearSecondary();
  };

  const isPaired = uploadMode !== "single";
  const imageRefs = [
    primary?.image_id && `upload:${primary.image_id}`,
    secondary?.image_id && `upload:${secondary.image_id}`,
  ].filter(Boolean);

  const canSubmit = primary && query.trim().length >= 3 && !isLoading && (!isPaired || secondary);

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      query: query.trim(),
      modality: uploadMode === "optical_sar" ? "both" : uploadMode === "bitemporal" ? "optical" : primary?.modality?.replace("uploaded_", "") || "optical",
      imageRefs,
      dateStart: dateStart1,
      dateStart2: uploadMode === "bitemporal" ? dateStart2 : undefined,
      inputMode: "upload",
    });
  }

  return (
    <div className="upload-lab">
      {/* ── Mode Selector ───────────────────────────────────────────────────── */}
      <section className="upload-lab__mode-selector">
        <h2 className="upload-lab__section-title">📁 Imagery Upload Laboratory</h2>
        <p className="upload-lab__section-sub">Choose your upload mode, then provide images and a natural-language query.</p>
        <div className="upload-lab__mode-cards">
          {UPLOAD_MODES.map((m) => (
            <button
              key={m.id}
              id={`upload-mode-${m.id}`}
              className={`upload-lab__mode-card${uploadMode === m.id ? " upload-lab__mode-card--active" : ""}`}
              style={uploadMode === m.id ? { borderColor: m.color, background: `rgba(${hexToRgb(m.color)},0.07)` } : {}}
              onClick={() => handleModeChange(m.id)}
            >
              <span className="upload-lab__mode-icon">{m.icon}</span>
              <div className="upload-lab__mode-title" style={uploadMode === m.id ? { color: m.color } : {}}>{m.title}</div>
              <div className="upload-lab__mode-desc">{m.desc}</div>
              <div className="upload-lab__mode-tasks">
                {m.tasks.map(t => <span key={t} className="task-badge vqa">{t}</span>)}
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="upload-lab__workspace">
        {/* ── Left column: Image upload zones + Query ────────────────────── */}
        <div className="upload-lab__left">
          {/* Drop zones */}
          <div className={`upload-lab__dropzones${isPaired ? " upload-lab__dropzones--paired" : ""}`}>
            <DropZone
              label={uploadMode === "single" ? "Satellite Image" : uploadMode === "optical_sar" ? "Optical Image (Sentinel-2)" : "Before Image (Epoch 1)"}
              icon={uploadMode === "optical_sar" ? "🛰️" : "📷"}
              onFile={handlePrimaryFile}
              uploadResult={primary}
              isUploading={isPrimaryUp}
              progress={primaryProg}
              uploadError={primaryErr}
              onClear={clearPrimary}
              accentColor={mode.color}
            />
            {isPaired && (
              <DropZone
                label={uploadMode === "optical_sar" ? "SAR Image (Sentinel-1)" : "After Image (Epoch 2)"}
                icon={uploadMode === "optical_sar" ? "📡" : "📷"}
                onFile={handleSecondaryFile}
                uploadResult={secondary}
                isUploading={isSecondaryUp}
                progress={secondaryProg}
                uploadError={secondaryErr}
                onClear={clearSecondary}
                accentColor={uploadMode === "optical_sar" ? "#34d399" : "#f59e0b"}
              />
            )}
          </div>

          {/* Date inputs for bi-temporal mode */}
          {uploadMode === "bitemporal" && (
            <div className="upload-lab__date-row">
              <div className="upload-lab__date-group">
                <label className="field-label">📅 Epoch 1 (Before Date)</label>
                <input
                  type="date" className="field-input"
                  value={dateStart1} onChange={e => setDateStart1(e.target.value)}
                />
              </div>
              <div className="upload-lab__date-group">
                <label className="field-label">📅 Epoch 2 (After Date)</label>
                <input
                  type="date" className="field-input"
                  value={dateStart2} onChange={e => setDateStart2(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Query input */}
          <form className="upload-lab__query-form" onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="lab-query-input">💬 Your Analysis Question</label>
            <textarea
              id="lab-query-input"
              className="field-textarea"
              rows={3}
              placeholder={
                uploadMode === "single"
                  ? "e.g. Describe the land cover and identify any built-up areas in this image."
                  : uploadMode === "optical_sar"
                  ? "e.g. Identify flooded areas using SAR backscatter and optical imagery together."
                  : "e.g. What areas have changed between these two dates? Describe the extent of vegetation loss."
              }
              value={query}
              onChange={e => setQuery(e.target.value)}
            />

            {/* Checklist of readiness */}
            <div className="upload-lab__checklist">
              <div className={`upload-lab__check${primary ? " upload-lab__check--done" : ""}`}>
                {primary ? "✅" : "⬜"} {uploadMode === "single" ? "Image uploaded" : "Primary image uploaded"}
              </div>
              {isPaired && (
                <div className={`upload-lab__check${secondary ? " upload-lab__check--done" : ""}`}>
                  {secondary ? "✅" : "⬜"} {uploadMode === "optical_sar" ? "SAR image uploaded" : "After image uploaded"}
                </div>
              )}
              <div className={`upload-lab__check${query.trim().length >= 3 ? " upload-lab__check--done" : ""}`}>
                {query.trim().length >= 3 ? "✅" : "⬜"} Question entered
              </div>
            </div>

            <button
              id="upload-lab-submit"
              type="submit"
              className={`btn btn-primary btn-lg upload-lab__submit${!canSubmit ? " btn-disabled" : ""}`}
              disabled={!canSubmit}
            >
              {isLoading ? (
                <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Analysing…</>
              ) : (
                <>{mode.icon} Run {mode.title} Analysis</>
              )}
            </button>
          </form>
        </div>

        {/* ── Right column: Results ──────────────────────────────────────── */}
        <div className="upload-lab__right">
          <ResultPanel
            result={queryResult}
            isLoading={isLoading}
            error={error}
            onExport={onExport}
            isExporting={isExporting}
            exportResult={exportResult}
          />
        </div>
      </div>
    </div>
  );
}
