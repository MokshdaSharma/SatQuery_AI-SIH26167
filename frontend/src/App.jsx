/**
 * App.jsx — Root component orchestrating the SatQuery AI three-panel layout.
 *
 * State:
 *   roi             — GeoJSON geometry drawn on the map
 *   imageryResult   — result from /api/roi/fetch-imagery
 *   queryResult     — result from /api/query
 *   exportResult    — result from /api/export
 *   isLoading       — query pipeline in progress
 *   isExporting     — export in progress
 *   error           — error message string
 *   layerVisibility — which thematic layers are toggled on
 *   layerData       — fetched layer GeoJSON / tile URLs
 */

import { useCallback, useEffect, useState } from "react";
import MapView     from "./components/MapView";
import QueryPanel  from "./components/QueryPanel";
import ResultPanel from "./components/ResultPanel";
import ErrorBoundary from "./components/ErrorBoundary";
import ToastContainer, { useToast } from "./components/Toast";
import KeyboardShortcuts from "./components/KeyboardShortcuts";
import { fetchImagery, submitQuery, fetchLayer, exportSession, uploadImage } from "./api";

const INITIAL_LAYER_VISIBILITY = {
  water:             false,
  roads:             false,
  buildings:         false,
  vegetation:        false,
  new_construction:  false,
  demolition:        false,
  vegetation_growth: false,
  deforestation:     false,
};

function AppInner() {
  const [roi,             setRoi]             = useState(null);
  const [imageryResult,   setImageryResult]   = useState(null);
  const [queryResult,     setQueryResult]     = useState(null);
  const [exportResult,    setExportResult]    = useState(null);
  const [isLoading,       setIsLoading]       = useState(false);
  const [isExporting,     setIsExporting]     = useState(false);
  const [error,           setError]           = useState(null);
  const [backendOnline,   setBackendOnline]   = useState(null);
  const [layerVisibility, setLayerVisibility] = useState(INITIAL_LAYER_VISIBILITY);
  const [layerData,       setLayerData]       = useState({});

  // Upload state
  const [uploadResult,   setUploadResult]   = useState(null);
  const [isUploading,    setIsUploading]    = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError,    setUploadError]    = useState(null);

  // Responsive sidebar state
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [resultsOpen,  setResultsOpen]  = useState(false);

  // Toast notifications
  const { toasts, addToast, removeToast } = useToast();

  // Build the overlay descriptor MapView expects whenever uploadResult changes
  const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  const uploadedImageOverlay = (uploadResult?.has_georef && uploadResult?.map_corners)
    ? {
        url:     `${BASE_URL}${uploadResult.preview_url}`,
        corners: uploadResult.map_corners,
        bounds:  uploadResult.geo_bounds,
      }
    : null;

  // ── Backend health check ───────────────────────────────────────────────────
  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    fetch(`${base}/healthz`)
      .then((r) => r.ok ? setBackendOnline(true) : setBackendOnline(false))
      .catch(()  => setBackendOnline(false));
  }, []);

  // ── ROI change ─────────────────────────────────────────────────────────────
  const handleROIChange = useCallback((geom) => {
    setRoi(geom);
    setQueryResult(null);
    setExportResult(null);
    setError(null);
    setLayerData({});
    setLayerVisibility(INITIAL_LAYER_VISIBILITY);
    if (geom) {
      addToast({ type: "success", title: "Region drawn", message: "Polygon ROI is ready for analysis.", duration: 3000 });
    }
  }, [addToast]);

  // ── Upload handlers ─────────────────────────────────────────────────────────
  const handleUploadFile = useCallback(async (file) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadResult(null);
    setQueryResult(null);
    setExportResult(null);
    setError(null);
    try {
      const result = await uploadImage(file, setUploadProgress);
      setUploadResult(result);
      addToast({ type: "success", title: "Image uploaded", message: `${result.filename} ready for analysis.`, duration: 4000 });
    } catch (err) {
      setUploadError(err.message || "Upload failed.");
      addToast({ type: "error", title: "Upload failed", message: err.message, duration: 6000 });
    } finally {
      setIsUploading(false);
    }
  }, [addToast]);

  const handleUploadClear = useCallback(() => {
    setUploadResult(null);
    setUploadError(null);
    setUploadProgress(0);
    setQueryResult(null);
    setExportResult(null);
    setError(null);
  }, []);

  // ── Layer toggle ───────────────────────────────────────────────────────────
  const handleLayerToggle = useCallback(async (name) => {
    const newVisible = !layerVisibility[name];
    setLayerVisibility((prev) => ({ ...prev, [name]: newVisible }));

    if (!newVisible) return;

    const geeLayerNames = ["water", "roads", "buildings", "vegetation"];
    if (geeLayerNames.includes(name) && !layerData[name] && roi) {
      try {
        const data = await fetchLayer(name, roi);
        setLayerData((prev) => ({ ...prev, [name]: data }));
      } catch (err) {
        console.warn(`Layer fetch failed for ${name}:`, err.message);
      }
    }
  }, [layerVisibility, layerData, roi]);

  // ── Main submit handler ───────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (params) => {
    const isUploadMode = params.inputMode === "upload";
    if (!isUploadMode && !roi) return;
    if (isUploadMode && !uploadResult) return;
    setIsLoading(true);
    setError(null);
    setQueryResult(null);
    setExportResult(null);

    try {
      // Step 1: Fetch imagery only in ROI mode
      let imagery = imageryResult;
      if (!isUploadMode && !imagery) {
        try {
          imagery = await fetchImagery(
            roi,
            params.dateStart,
            params.dateEnd,
            params.modality,
          );
          setImageryResult(imagery);
        } catch (imgErr) {
          console.warn("Imagery pre-fetch failed (will retry in query):", imgErr.message);
        }
      }

      // Step 2: Run query
      const result = await submitQuery({
        roiGeojson:  roi || { type: "Point", coordinates: [0, 0] },
        query:       params.query,
        imageRefs:   params.imageRefs,
        modality:    params.modality,
        dateStart:   params.dateStart,
        dateEnd:     params.dateEnd,
        dateStart2:  params.dateStart2,
        dateEnd2:    params.dateEnd2,
      });

      setQueryResult(result);

      // Auto-open results on mobile
      setResultsOpen(true);

      addToast({
        type: "success",
        title: "Analysis complete",
        message: `${result.task_type.replace("_", " ")} — ${(result.confidence * 100).toFixed(0)}% confidence`,
        duration: 5000,
      });

      // Auto-enable change-type layers if detected
      if (result.change_types?.length > 0) {
        const updates = {};
        result.change_types.forEach((ct) => { updates[ct] = true; });
        setLayerVisibility((prev) => ({ ...prev, ...updates }));

        if (result.evidence_geojson) {
          const byType = {};
          result.evidence_geojson.features?.forEach((f) => {
            const ct = f.properties?.change_type;
            if (ct) {
              byType[ct] = byType[ct] || { type:"FeatureCollection", features:[] };
              byType[ct].features.push(f);
            }
          });
          const layerUpdates = {};
          Object.entries(byType).forEach(([ct, geojson]) => {
            layerUpdates[ct] = { layer_name: ct, geojson, tile_url: null };
          });
          setLayerData((prev) => ({ ...prev, ...layerUpdates }));
        }
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
      addToast({ type: "error", title: "Analysis failed", message: err.message, duration: 8000 });
    } finally {
      setIsLoading(false);
    }
  }, [roi, imageryResult, uploadResult, addToast]);

  // ── Export handler ─────────────────────────────────────────────────────────
  const handleExport = useCallback(async (formats) => {
    if (!queryResult?.session_id) return;
    setIsExporting(true);
    try {
      const result = await exportSession(queryResult.session_id, formats);
      setExportResult(result);
      addToast({ type: "success", title: "Export ready", message: `${result.files?.length} file(s) available for download.`, duration: 5000 });
    } catch (err) {
      console.error("Export failed:", err.message);
      addToast({ type: "error", title: "Export failed", message: err.message, duration: 6000 });
    } finally {
      setIsExporting(false);
    }
  }, [queryResult, addToast]);

  // ── Keyboard shortcut handlers ─────────────────────────────────────────────
  const handleShortcutSubmit = useCallback(() => {
    // Trigger the submit button programmatically
    document.getElementById("submit-query")?.click();
  }, []);

  const handleToggleLeft = useCallback(() => {
    setSidebarOpen((v) => !v);
    setResultsOpen(false);
  }, []);

  const handleToggleRight = useCallback(() => {
    setResultsOpen((v) => !v);
    setSidebarOpen(false);
  }, []);

  // Close panels on backdrop click
  const handleBackdropClick = useCallback(() => {
    setSidebarOpen(false);
    setResultsOpen(false);
  }, []);

  const showChangeTypes = queryResult?.change_types?.length > 0;

  return (
    <>
      {/* Keyboard shortcuts handler */}
      <KeyboardShortcuts
        onSubmit={handleShortcutSubmit}
        onToggleLeft={handleToggleLeft}
        onToggleRight={handleToggleRight}
      />

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Mobile backdrop */}
      <div
        className={`mobile-backdrop${sidebarOpen || resultsOpen ? " mobile-backdrop--visible" : ""}`}
        onClick={handleBackdropClick}
      />

      <div className="app-shell">
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <header className="app-header" role="banner">
          {/* Mobile menu toggles */}
          <button
            className="mobile-menu-btn"
            onClick={handleToggleLeft}
            aria-label="Toggle query panel"
            title="Toggle query panel"
          >
            ☰
          </button>

          <div className="app-header__logo">
            <div className="app-header__logo-icon" aria-hidden="true">🛰</div>
            <div>
              <span className="app-header__logo-text">SatQuery AI</span>
              <div className="app-header__subtitle">AI-Powered Satellite Analysis</div>
            </div>
          </div>
          <span className="app-header__badge">Beta</span>

          {queryResult && (
            <span className="app-header__context-badge">
              {queryResult.task_type.replace("_", " ")} · {(queryResult.confidence * 100).toFixed(0)}% confidence
            </span>
          )}

          <div className="app-header__status">
            <div className={`status-dot${backendOnline === false ? " offline" : ""}`} />
            <span style={{ fontSize: 11.5 }}>
              {backendOnline === null  ? "Connecting…"
               : backendOnline        ? "AI Engine Online"
               :                        "Engine Offline"}
            </span>
          </div>

          {/* Mobile results toggle */}
          <button
            className="mobile-menu-btn"
            onClick={handleToggleRight}
            aria-label="Toggle results panel"
            title="Toggle results panel"
            style={{ display: "none" }} // Shown via CSS on mobile
          >
            📊
          </button>
        </header>

        {/* ── Left sidebar ─────────────────────────────────────────────── */}
        <QueryPanel
          roi={roi}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          imageryResult={imageryResult}
          onUploadFile={handleUploadFile}
          uploadResult={uploadResult}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          uploadError={uploadError}
          onUploadClear={handleUploadClear}
          className={sidebarOpen ? "sidebar--open" : ""}
        />

        {/* ── Map ───────────────────────────────────────────────────────────── */}
        <MapView
          onROIChange={handleROIChange}
          evidenceGeojson={queryResult?.evidence_geojson}
          layerVisibility={layerVisibility}
          onLayerToggle={handleLayerToggle}
          layerData={layerData}
          showChangeTypes={showChangeTypes}
          uploadedImageOverlay={uploadedImageOverlay}
        />

        {/* ── Right results panel ─────────────────────────────────────────────── */}
        <ResultPanel
          result={queryResult}
          isLoading={isLoading}
          error={error}
          onExport={handleExport}
          isExporting={isExporting}
          exportResult={exportResult}
          className={resultsOpen ? "results-panel--open" : ""}
        />
      </div>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <a href="#query-input" className="skip-link">Skip to query input</a>
      <AppInner />
    </ErrorBoundary>
  );
}
