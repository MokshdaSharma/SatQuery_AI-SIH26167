/**
 * App.jsx — Root component: SatQuery AI Satellite Vision & GIS Intelligence Platform.
 *
 * Tabs (matching reference navigation):
 *   home     — Landing & system overview
 *   mapping  — Full Mapbox GIS Mapping studio with Layers card, AOI selection, and on-demand AI analysis
 *   change   — Upload & Analysis: Bi-Temporal Change & Trajectory Studio
 *   logs     — Data Logs & Execution Trace Archive
 *   fusion   — Optical + SAR Cross-Modal Fusion Lab
 */

import { useCallback, useEffect, useState } from "react";
import NavBar from "./components/NavBar";
import LandingPage from "./components/LandingPage";
import MapView from "./components/MapView";
import QueryPanel from "./components/QueryPanel";
import ResultPanel from "./components/ResultPanel";
import ChangeStudio from "./components/ChangeStudio";
import UploadAnalysisStudio from "./components/UploadAnalysisStudio";
import DataLogsView from "./components/DataLogsView";
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
  encroachment: false,
  demolition: false,
  new_road: false,
  monthly_summary: false,
  quarterly_summary: false,
};

function AppInner() {
  // ── Active Navigation Tab: 'home' | 'mapping' | 'change' | 'logs' | 'fusion' ──
  const [activeTab, setActiveTab] = useState("mapping"); // default to mapping for direct GIS workflow

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

  // Studio Upload state
  const [uploadResult, setUploadResult] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);

  // Multi-turn conversation context history
  const [conversationHistory, setConversationHistory] = useState([]);

  // Responsive sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);

  // Mapping Studio toggleable panels (Left Query / Right Result)
  const [showQueryPanel, setShowQueryPanel] = useState(true);
  const [showResultPanel, setShowResultPanel] = useState(true);

  const { toasts, addToast, removeToast } = useToast();

  const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
  const uploadedImageOverlay =
    uploadResult?.has_georef && uploadResult?.map_corners
      ? { url: `${BASE_URL}${uploadResult.preview_url}`, corners: uploadResult.map_corners, bounds: uploadResult.geo_bounds }
      : null;

  // ── Backend health check ───────────────────────────────────────────────────
  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    fetch(`${base}/healthz`)
      .then((r) => (r.ok ? setBackendOnline(true) : setBackendOnline(false)))
      .catch(() => setBackendOnline(false));
  }, []);

  // ── Navigation Launcher ────────────────────────────────────────────────────
  const handleSelectTab = useCallback((tabId) => {
    setActiveTab(tabId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // ── ROI change ─────────────────────────────────────────────────────────────
  const handleROIChange = useCallback(
    async (geom) => {
      setRoi(geom);
      setQueryResult(null);
      setExportResult(null);
      setError(null);
      if (geom) {
        addToast({
          type: "success",
          title: "Region drawn",
          message: "Polygon ROI active. Synchronizing OSM layers...",
          duration: 3000,
        });

        // Re-fetch any currently active OSM layers for the new ROI
        const geeLayerNames = ["water", "roads", "buildings", "vegetation"];
        setLayerVisibility((currentVisibility) => {
          for (const name of geeLayerNames) {
            if (currentVisibility[name]) {
              fetchLayer(name, geom)
                .then((data) => {
                  setLayerData((prev) => ({ ...prev, [name]: data }));
                })
                .catch((err) => {
                  console.warn(`Layer re-fetch failed for ${name}:`, err.message);
                });
            }
          }
          return currentVisibility;
        });
      }
    },
    [addToast]
  );

  // ── Layer toggle ───────────────────────────────────────────────────────────
  const handleLayerToggle = useCallback(
    async (name) => {
      setLayerVisibility((prev) => {
        const newVisible = !prev[name];
        if (newVisible) {
          const geeLayerNames = ["water", "roads", "buildings", "vegetation"];
          if (geeLayerNames.includes(name)) {
            const targetROI = roi || {
              type: "Polygon",
              coordinates: [
                [
                  [80.4, 15.8],
                  [80.6, 15.8],
                  [80.6, 16.0],
                  [80.4, 16.0],
                  [80.4, 15.8],
                ],
              ],
            };
            fetchLayer(name, targetROI)
              .then((data) => {
                setLayerData((dPrev) => ({ ...dPrev, [name]: data }));
              })
              .catch((err) => {
                console.warn(`Layer fetch failed for ${name}:`, err.message);
              });
          }
        }
        return { ...prev, [name]: newVisible };
      });
    },
    [roi]
  );

  // ── Query Submit handler (ZERO fake results, strictly runs real API) ───────
  const handleSubmit = useCallback(
    async (params) => {
      const isUploadMode = params.inputMode === "upload";
      if (!isUploadMode && !roi) {
        addToast({
          type: "warning",
          title: "Region Required",
          message: "Please draw an Area of Interest (AOI) on the map before running.",
          duration: 4000,
        });
        return;
      }
      if (isUploadMode && !uploadResult) {
        addToast({
          type: "warning",
          title: "Image Required",
          message: "Please select and upload an image first.",
          duration: 4000,
        });
        return;
      }

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
            console.warn("Imagery pre-fetch failed (will proceed with query dispatch):", imgErr.message);
          }
        }

        // Standardize fallback ROI geometry for uploaded images or point ROIs
        let queryROI = roi || params.roiGeojson;
        if (!queryROI || queryROI.type === "Point") {
          queryROI = {
            type: "Polygon",
            coordinates: [
              [
                [75.7, 26.8],
                [75.9, 26.8],
                [75.9, 27.0],
                [75.7, 27.0],
                [75.7, 26.8],
              ],
            ],
          };
        }

        const dateStartClean = params.dateStart || new Date().toISOString().split("T")[0];

        const result = await submitQuery({
          roiGeojson: queryROI,
          query: params.query,
          imageRefs: params.imageRefs || (uploadResult ? [uploadResult.image_id] : []),
          modality: params.modality || "optical",
          dateStart: dateStartClean,
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
          result.change_types.forEach((ct) => {
            updates[ct] = true;
          });
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
        setError(err.message || "An unexpected error occurred during analysis.");
        addToast({ type: "error", title: "Analysis failed", message: err.message, duration: 8000 });
      } finally {
        setIsLoading(false);
      }
    },
    [roi, imageryResult, uploadResult, conversationHistory, addToast]
  );

  // ── Change Studio / Fusion Lab Submit handler ─────────────────────────────
  const handleStudioSubmit = useCallback(
    async (params) => {
      setIsLoading(true);
      setError(null);
      setQueryResult(null);
      setExportResult(null);
      setLastQueryText(params.query || "Analysis query");
      try {
        const result = await submitQuery({
          roiGeojson: roi || { type: "Polygon", coordinates: [[[80.4, 15.8], [80.6, 15.8], [80.6, 16.0], [80.4, 16.0], [80.4, 15.8]]] },
          query: params.query,
          imageRefs: params.imageRefs || [],
          modality: params.modality,
          dateStart: params.dateStart || "2022-01-15",
          dateStart2: params.dateStart2 || "2024-03-20",
        });
        setQueryResult(result);
        if (result.change_types?.length > 0) {
          const updates = {};
          result.change_types.forEach((ct) => {
            updates[ct] = true;
          });
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
        addToast({
          type: "success",
          title: "Dynamics computed",
          message: `${(result.task_type || "Analysis").replace(/_/g, " ")} — ${(result.confidence * 100).toFixed(0)}% confidence`,
          duration: 5000,
        });
      } catch (err) {
        setError(err.message || "Computation failed.");
        addToast({ type: "error", title: "Computation failed", message: err.message, duration: 8000 });
      } finally {
        setIsLoading(false);
      }
    },
    [roi, addToast]
  );

  // ── Upload handlers ────────────────────────────────────────────────────────
  const handleUploadFile = useCallback(
    async (file) => {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadError(null);
      try {
        const result = await uploadImage(file, (progress) => {
          setUploadProgress(progress);
        });
        setUploadResult(result);
        addToast({
          type: "success",
          title: "Image Uploaded",
          message: `${result.filename || "Image"} uploaded and processed successfully.`,
          duration: 4000,
        });
      } catch (err) {
        setUploadError(err.message || "Failed to upload image.");
        addToast({
          type: "error",
          title: "Upload Failed",
          message: err.message || "Failed to upload image.",
          duration: 6000,
        });
      } finally {
        setIsUploading(false);
      }
    },
    [addToast]
  );

  const handleUploadClear = useCallback(() => {
    setUploadResult(null);
    setUploadProgress(0);
    setUploadError(null);
  }, []);

  const handleMapUploadedImage = useCallback(
    (upload) => {
      if (!upload) return;
      setActiveTab("mapping");
      if (upload.geo_bounds && Array.isArray(upload.geo_bounds) && upload.geo_bounds.length === 4) {
        const [w, s, e, n] = upload.geo_bounds;
        const poly = {
          type: "Polygon",
          coordinates: [
            [
              [w, s],
              [e, s],
              [e, n],
              [w, n],
              [w, s],
            ],
          ],
        };
        setRoi(poly);
      }
      addToast({
        type: "success",
        title: "Raster Mapped",
        message: `Overlaying ${upload.filename || "satellite image"} onto interactive map canvas.`,
        duration: 4000,
      });
    },
    [addToast]
  );

  // ── Export handlers ────────────────────────────────────────────────────────
  const handleExport = useCallback(
    async (formats) => {
      const sessId = queryResult?.session_id || "sq-sess-default";
      setIsExporting(true);
      try {
        const result = await exportSession(sessId, formats);
        setExportResult(result);
        addToast({
          type: "success",
          title: "Export ready",
          message: `${result.files?.length || 1} file(s) available.`,
          duration: 5000,
        });
      } catch (err) {
        addToast({ type: "error", title: "Export failed", message: err.message, duration: 6000 });
      } finally {
        setIsExporting(false);
      }
    },
    [queryResult, addToast]
  );

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  const handleShortcutSubmit = useCallback(() => {
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
  const handleBackdropClick = useCallback(() => {
    setSidebarOpen(false);
    setResultsOpen(false);
  }, []);

  const showChangeTypes = queryResult?.change_types?.length > 0;

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
        traceData={queryResult?.execution_trace}
        queryResult={queryResult}
        queryText={lastQueryText}
      />

      {/* Mobile backdrop */}
      <div
        className={`mobile-backdrop${sidebarOpen || resultsOpen ? " mobile-backdrop--visible" : ""}`}
        onClick={handleBackdropClick}
      />

      <div className="app-shell app-shell--multitab">
        {/* ── Top Navigation Bar (Exact Screenshot 1 UI) ────────────────────── */}
        <NavBar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          backendOnline={backendOnline}
          onOpenModelRegistry={() => setIsModelRegistryOpen(true)}
          onOpenDocs={() => setIsDocsOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenTrace={() => setIsTraceOpen(true)}
        />

        {/* ── MAIN CONTENT CONTAINER (Scrollable across all tabs) ──────────── */}
        <main className="workspace-main-content">
          {/* 01 — HOME / LANDING */}
          {activeTab === "home" && (
            <LandingPage
              onLaunchWorkspace={() => handleSelectTab("mapping")}
              onSelectTab={handleSelectTab}
            />
          )}

          {/* 02 — MAPPING (Screenshot 2: GIS Map with Layers & AOI Controls + Analysis Setup) */}
          {activeTab === "mapping" && (
            <div className="tab-content tab-content--studio">
              <button className="mobile-menu-btn mobile-menu-btn--left" onClick={handleToggleLeft} aria-label="Toggle query panel">
                ☰
              </button>
              <button className="mobile-menu-btn mobile-menu-btn--right" onClick={handleToggleRight} aria-label="Toggle results">
                📊
              </button>

              {/* Left Analysis Query Panel */}
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

              {/* Center MapView (with Layers Card, 2D/3D Tilt, State/District Dropdowns & AOI Card) */}
              <MapView
                roi={roi}
                onROIChange={handleROIChange}
                evidenceGeojson={queryResult?.evidence_geojson}
                layerVisibility={layerVisibility}
                onLayerToggle={handleLayerToggle}
                layerData={layerData}
                showChangeTypes={showChangeTypes}
                uploadedImageOverlay={uploadedImageOverlay}
              />

              {/* Right Analysis Insights Panel (Zero Hardcoded Results) */}
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

          {/* 03 — UPLOAD & ANALYSIS (File Upload & Analysis Studio) */}
          {activeTab === "change" && (
            <div className="tab-content tab-content--change">
              <UploadAnalysisStudio
                uploadResult={uploadResult}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                uploadError={uploadError}
                onUploadFile={handleUploadFile}
                onUploadClear={handleUploadClear}
                onRunAnalysis={handleSubmit}
                onMapImage={handleMapUploadedImage}
                isLoading={isLoading}
                queryResult={queryResult}
                error={error}
                onExport={handleExport}
                isExporting={isExporting}
              />
            </div>
          )}

          {/* 04 — DATA LOGS */}
          {activeTab === "logs" && (
            <div className="tab-content tab-content--logs">
              <DataLogsView
                queryResult={queryResult}
                conversationHistory={conversationHistory}
                onOpenTrace={() => setIsTraceOpen(true)}
                onExport={handleExport}
                isExporting={isExporting}
              />
            </div>
          )}

          {/* Global Persistent Bottom Results Drawer */}
          {queryResult && activeTab !== "mapping" && (
            <GlobalResultsDrawer
              queryResult={queryResult}
              currentROI={roi}
              onOpenTrace={() => setIsTraceOpen(true)}
              onSelectTab={handleSelectTab}
            />
          )}
        </main>
      </div>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <AppInner />
    </ErrorBoundary>
  );
}
