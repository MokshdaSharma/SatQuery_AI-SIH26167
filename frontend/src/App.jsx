/**
 * App.jsx — Root component: SatQuery AI Polish GIS & Vision-Language Workspace.
 *
 * Views:
 *   landing   — Hero & capabilities landing overview
 *   workspace — Polished GIS Workspace with 5 primary tabs:
 *     01: studio   — Earth Studio (3-column GIS workspace: Query / Map / AI Insights)
 *     02: change   — Temporal Change Studio (Before/After slider, severity, timeline, trend)
 *     03: fusion   — Optical + SAR Fusion Lab (Dual-sensor viewer, cloud penetration, radar flood/built-up)
 *     04: lab      — Upload & Data Validation Lab (GeoTIFF/TIFF/PNG/JPEG, compatibility checks, presets)
 *     05: reports  — Geospatial Intelligence Report Generator (PDF / JSON / GeoJSON dossiers)
 */

import { useCallback, useEffect, useState } from "react";
import NavBar from "./components/NavBar";
import LandingPage from "./components/LandingPage";
import MapView from "./components/MapView";
import QueryPanel from "./components/QueryPanel";
import ResultPanel from "./components/ResultPanel";
import UploadLab from "./components/UploadLab";
import ChangeStudio from "./components/ChangeStudio";
import FusionLab from "./components/FusionLab";
import ReportsStudio from "./components/ReportsStudio";
import ModelRegistryModal from "./components/ModelRegistryModal";
import AgentExecutionDrawer from "./components/AgentExecutionDrawer";
import DocumentationModal from "./components/DocumentationModal";
import SettingsModal from "./components/SettingsModal";
import GlobalResultsDrawer from "./components/GlobalResultsDrawer";
import ErrorBoundary from "./components/ErrorBoundary";
import ToastContainer, { useToast } from "./components/Toast";
import KeyboardShortcuts from "./components/KeyboardShortcuts";
import { fetchImagery, submitQuery, fetchLayer, exportSession, uploadImage } from "./api";

const INITIAL_LAYER_VISIBILITY = {
  water: false,
  roads: false,
  buildings: false,
  vegetation: false,
  new_construction: false,
  demolition: false,
  vegetation_growth: false,
  deforestation: false,
};

function AppInner() {
  // ── High-level View: "landing" or "workspace" ──────────────────────────────
  const [currentView, setCurrentView] = useState("workspace"); // default to workspace for immediate analysis or toggleable
  const [activeTab, setActiveTab] = useState("studio");

  // ── Modals & Drawers ───────────────────────────────────────────────────────
  const [isModelRegistryOpen, setIsModelRegistryOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTraceOpen, setIsTraceOpen] = useState(false);

  // ── Core analysis state ────────────────────────────────────────────────────
  const [roi, setRoi] = useState(null);
  const [imageryResult, setImageryResult] = useState(null);
  const [queryResult, setQueryResult] = useState(null);
  const [lastQueryText, setLastQueryText] = useState("");
  const [exportResult, setExportResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);
  const [backendOnline, setBackendOnline] = useState(null);
  const [layerVisibility, setLayerVisibility] = useState(INITIAL_LAYER_VISIBILITY);
  const [layerData, setLayerData] = useState({});

  // Upload state (for studio tab)
  const [uploadResult, setUploadResult] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);

  // Multi-turn conversation context history
  const [conversationHistory, setConversationHistory] = useState([]);

  // Responsive sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);

  // Upload Lab tab results (separate state)
  const [labQueryResult, setLabQueryResult] = useState(null);
  const [labExportResult, setLabExportResult] = useState(null);
  const [labIsLoading, setLabIsLoading] = useState(false);
  const [labError, setLabError] = useState(null);
  const [labIsExporting, setLabIsExporting] = useState(false);

  const { toasts, addToast, removeToast } = useToast();

  const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  const uploadedImageOverlay = (uploadResult?.has_georef && uploadResult?.map_corners)
    ? { url: `${BASE_URL}${uploadResult.preview_url}`, corners: uploadResult.map_corners, bounds: uploadResult.geo_bounds }
    : null;

  // ── Backend health check ───────────────────────────────────────────────────
  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    fetch(`${base}/healthz`)
      .then((r) => r.ok ? setBackendOnline(true) : setBackendOnline(false))
      .catch(() => setBackendOnline(false));
  }, []);

  // ── Navigation Launchers ───────────────────────────────────────────────────
  const handleLaunchWorkspace = useCallback((tab = "studio") => {
    setCurrentView("workspace");
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleSelectTab = useCallback((tab) => {
    setCurrentView("workspace");
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  // ── Studio upload handlers ─────────────────────────────────────────────────
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

  // ── Studio submit handler ──────────────────────────────────────────────────
  const handleSubmit = useCallback(async (params) => {
    const isUploadMode = params.inputMode === "upload";
    if (!isUploadMode && !roi) return;
    if (isUploadMode && !uploadResult) return;
    setIsLoading(true);
    setError(null);
    setQueryResult(null);
    setExportResult(null);
    setLastQueryText(params.query);

    try {
      let imagery = imageryResult;
      if (!isUploadMode && !imagery) {
        try {
          imagery = await fetchImagery(roi, params.dateStart, params.dateEnd, params.modality);
          setImageryResult(imagery);
        } catch (imgErr) {
          console.warn("Imagery pre-fetch failed (will retry in query):", imgErr.message);
        }
      }

      const result = await submitQuery({
        roiGeojson: roi || { type: "Point", coordinates: [0, 0] },
        query: params.query,
        imageRefs: params.imageRefs,
        modality: params.modality,
        dateStart: params.dateStart,
        dateEnd: params.dateEnd,
        dateStart2: params.dateStart2,
        dateEnd2: params.dateEnd2,
        conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
      });

      setQueryResult(result);
      setResultsOpen(true);
      setConversationHistory((prev) => [
        ...prev,
        { query: params.query, answer: result.answer, timestamp: Date.now() },
      ]);
      addToast({
        type: "success",
        title: "Analysis complete",
        message: `${(result.task_type || "Analysis").replace(/_/g, " ")} — ${(result.confidence * 100).toFixed(0)}% confidence`,
        duration: 5000,
      });

      // Auto-enable change-type layers
      if (result.change_types?.length > 0) {
        const updates = {};
        result.change_types.forEach((ct) => { updates[ct] = true; });
        setLayerVisibility((prev) => ({ ...prev, ...updates }));
        if (result.evidence_geojson) {
          const byType = {};
          result.evidence_geojson.features?.forEach((f) => {
            const ct = f.properties?.change_type;
            if (ct) {
              byType[ct] = byType[ct] || { type: "FeatureCollection", features: [] };
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
  }, [roi, imageryResult, uploadResult, conversationHistory, addToast]);

  // ── Upload Lab & Change Studio submit handler ──────────────────────────────
  const handleLabSubmit = useCallback(async (params) => {
    setLabIsLoading(true);
    setLabError(null);
    setLabQueryResult(null);
    setLabExportResult(null);
    setLastQueryText(params.query || "Analysis query");
    try {
      const result = await submitQuery({
        roiGeojson: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
        query: params.query,
        imageRefs: params.imageRefs || [],
        modality: params.modality,
        dateStart: params.dateStart || "2023-01-01",
        dateStart2: params.dateStart2,
      });
      setLabQueryResult(result);
      setQueryResult(result);
      addToast({
        type: "success",
        title: "Analysis complete",
        message: `${(result.task_type || "Analysis").replace(/_/g, " ")} — ${(result.confidence * 100).toFixed(0)}% confidence`,
        duration: 5000,
      });
    } catch (err) {
      setLabError(err.message || "Analysis failed.");
      addToast({ type: "error", title: "Analysis failed", message: err.message, duration: 8000 });
    } finally {
      setLabIsLoading(false);
    }
  }, [addToast]);

  // ── Export handlers ────────────────────────────────────────────────────────
  const handleExport = useCallback(async (formats) => {
    if (!queryResult?.session_id) return;
    setIsExporting(true);
    try {
      const result = await exportSession(queryResult.session_id, formats);
      setExportResult(result);
      addToast({ type: "success", title: "Export ready", message: `${result.files?.length} file(s) available.`, duration: 5000 });
    } catch (err) {
      addToast({ type: "error", title: "Export failed", message: err.message, duration: 6000 });
    } finally {
      setIsExporting(false);
    }
  }, [queryResult, addToast]);

  const handleLabExport = useCallback(async (formats) => {
    if (!labQueryResult?.session_id) return;
    setLabIsExporting(true);
    try {
      const result = await exportSession(labQueryResult.session_id, formats);
      setLabExportResult(result);
      addToast({ type: "success", title: "Export ready", message: `${result.files?.length} file(s) available.`, duration: 5000 });
    } catch (err) {
      addToast({ type: "error", title: "Export failed", message: err.message, duration: 6000 });
    } finally {
      setLabIsExporting(false);
    }
  }, [labQueryResult, addToast]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  const handleShortcutSubmit = useCallback(() => {
    document.getElementById("submit-query")?.click() || document.getElementById("upload-lab-submit")?.click();
  }, []);
  const handleToggleLeft = useCallback(() => { setSidebarOpen(v => !v); setResultsOpen(false); }, []);
  const handleToggleRight = useCallback(() => { setResultsOpen(v => !v); setSidebarOpen(false); }, []);
  const handleBackdropClick = useCallback(() => { setSidebarOpen(false); setResultsOpen(false); }, []);

  const showChangeTypes = queryResult?.change_types?.length > 0;
  const activeResult = queryResult || labQueryResult;

  return (
    <>
      <KeyboardShortcuts onSubmit={handleShortcutSubmit} onToggleLeft={handleToggleLeft} onToggleRight={handleToggleRight} />
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Global Modals & Drawers */}
      <ModelRegistryModal isOpen={isModelRegistryOpen} onClose={() => setIsModelRegistryOpen(false)} />
      <DocumentationModal isOpen={isDocsOpen} onClose={() => setIsDocsOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <AgentExecutionDrawer
        isOpen={isTraceOpen}
        onClose={() => setIsTraceOpen(false)}
        traceData={activeResult?.execution_trace}
        queryResult={activeResult}
        queryText={lastQueryText}
      />

      {/* Mobile backdrop */}
      <div
        className={`mobile-backdrop${sidebarOpen || resultsOpen ? " mobile-backdrop--visible" : ""}`}
        onClick={handleBackdropClick}
      />

      <div className="app-shell app-shell--multitab">
        {/* ── Navigation Bar ────────────────────────────────────────────────── */}
        <NavBar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          backendOnline={backendOnline}
          currentView={currentView}
          onToggleView={setCurrentView}
          onOpenModelRegistry={() => setIsModelRegistryOpen(true)}
          onOpenDocs={() => setIsDocsOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenTrace={() => setIsTraceOpen(true)}
        />

        {/* ── LANDING VIEW ──────────────────────────────────────────────────── */}
        {currentView === "landing" && (
          <LandingPage
            onLaunchWorkspace={handleLaunchWorkspace}
            onSelectTab={handleSelectTab}
          />
        )}

        {/* ── WORKSPACE VIEW ────────────────────────────────────────────────── */}
        {currentView === "workspace" && (
          <main className="workspace-main-content">
            {/* 01 — EARTH STUDIO */}
            {activeTab === "studio" && (
              <div className="tab-content tab-content--studio">
                <button className="mobile-menu-btn mobile-menu-btn--left" onClick={handleToggleLeft} aria-label="Toggle query panel">☰</button>
                <button className="mobile-menu-btn mobile-menu-btn--right" onClick={handleToggleRight} aria-label="Toggle results">📊</button>

                {/* Left Column: Query Panel */}
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
                  conversationHistory={conversationHistory}
                  onClearHistory={() => setConversationHistory([])}
                  className={sidebarOpen ? "sidebar--open" : ""}
                />

                {/* Center Column: Main Earth Map */}
                <MapView
                  onROIChange={handleROIChange}
                  evidenceGeojson={queryResult?.evidence_geojson}
                  layerVisibility={layerVisibility}
                  onLayerToggle={handleLayerToggle}
                  layerData={layerData}
                  showChangeTypes={showChangeTypes}
                  uploadedImageOverlay={uploadedImageOverlay}
                />

                {/* Right Column: AI Insights Panel */}
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
            )}

            {/* 02 — TEMPORAL CHANGE STUDIO */}
            {activeTab === "change" && (
              <div className="tab-content tab-content--change">
                <ChangeStudio
                  onRunChangeAnalysis={handleLabSubmit}
                  isLoading={labIsLoading}
                  queryResult={labQueryResult || queryResult}
                  error={labError}
                />
              </div>
            )}

            {/* 03 — OPTICAL + SAR FUSION */}
            {activeTab === "fusion" && (
              <div className="tab-content tab-content--fusion">
                <FusionLab
                  onRunFusionQuery={handleLabSubmit}
                  isLoading={labIsLoading}
                  queryResult={labQueryResult || queryResult}
                  error={labError}
                />
              </div>
            )}

            {/* 04 — UPLOAD & VALIDATION LAB */}
            {activeTab === "lab" && (
              <div className="tab-content tab-content--lab">
                <UploadLab
                  onSubmit={handleLabSubmit}
                  isLoading={labIsLoading}
                  queryResult={labQueryResult}
                  error={labError}
                  onExport={handleLabExport}
                  isExporting={labIsExporting}
                  exportResult={labExportResult}
                />
              </div>
            )}

            {/* 05 — REPORTS STUDIO */}
            {activeTab === "reports" && (
              <div className="tab-content tab-content--reports">
                <ReportsStudio
                  queryResult={queryResult || labQueryResult}
                  currentROI={roi}
                  onSelectTab={handleSelectTab}
                />
              </div>
            )}

            {/* Global Persistent Bottom Results Drawer */}
            {activeResult && activeTab !== "reports" && (
              <GlobalResultsDrawer
                queryResult={activeResult}
                currentROI={roi}
                onOpenTrace={() => setIsTraceOpen(true)}
                onSelectTab={handleSelectTab}
              />
            )}
          </main>
        )}
      </div>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <AppInner />
    </ErrorBoundary>
  );
}
