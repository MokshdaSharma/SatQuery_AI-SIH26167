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
import { fetchImagery, submitQuery, fetchLayer, exportSession } from "./api";

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

export default function App() {
  const [roi,             setRoi]             = useState(null);
  const [imageryResult,   setImageryResult]   = useState(null);
  const [queryResult,     setQueryResult]     = useState(null);
  const [exportResult,    setExportResult]    = useState(null);
  const [isLoading,       setIsLoading]       = useState(false);
  const [isExporting,     setIsExporting]     = useState(false);
  const [error,           setError]           = useState(null);
  const [backendOnline,   setBackendOnline]   = useState(null); // null = checking
  const [layerVisibility, setLayerVisibility] = useState(INITIAL_LAYER_VISIBILITY);
  const [layerData,       setLayerData]       = useState({});

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
    // Reset results when ROI changes
    setQueryResult(null);
    setExportResult(null);
    setError(null);
    setLayerData({});
    setLayerVisibility(INITIAL_LAYER_VISIBILITY);
  }, []);

  // ── Layer toggle ───────────────────────────────────────────────────────────
  const handleLayerToggle = useCallback(async (name) => {
    const newVisible = !layerVisibility[name];
    setLayerVisibility((prev) => ({ ...prev, [name]: newVisible }));

    if (!newVisible) return; // just hiding — no fetch needed

    // Fetch layer data if not already loaded and it's a GEE/OSM layer
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

  // ── Main submit handler ────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (params) => {
    if (!roi) return;
    setIsLoading(true);
    setError(null);
    setQueryResult(null);
    setExportResult(null);

    try {
      // Step 1: Fetch imagery (if not already done)
      let imagery = imageryResult;
      if (!imagery) {
        try {
          imagery = await fetchImagery(
            roi,
            params.dateStart,
            params.dateEnd,
            params.modality,
          );
          setImageryResult(imagery);
        } catch (imgErr) {
          // Non-fatal: proceed with query anyway (backend will auto-fetch)
          console.warn("Imagery pre-fetch failed (will retry in query):", imgErr.message);
        }
      }

      // Step 2: Run query
      const result = await submitQuery({
        roiGeojson:  roi,
        query:       params.query,
        imageRefs:   params.imageRefs,
        modality:    params.modality,
        dateStart:   params.dateStart,
        dateEnd:     params.dateEnd,
        dateStart2:  params.dateStart2,
        dateEnd2:    params.dateEnd2,
      });

      setQueryResult(result);

      // Auto-enable change-type layers if detected
      if (result.change_types?.length > 0) {
        const updates = {};
        result.change_types.forEach((ct) => { updates[ct] = true; });
        setLayerVisibility((prev) => ({ ...prev, ...updates }));

        // If evidence has change_type features, push them to layerData
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
    } finally {
      setIsLoading(false);
    }
  }, [roi, imageryResult]);

  // ── Export handler ─────────────────────────────────────────────────────────
  const handleExport = useCallback(async (formats) => {
    if (!queryResult?.session_id) return;
    setIsExporting(true);
    try {
      const result = await exportSession(queryResult.session_id, formats);
      setExportResult(result);
    } catch (err) {
      console.error("Export failed:", err.message);
    } finally {
      setIsExporting(false);
    }
  }, [queryResult]);

  // ── Show change-type toggles only after a change query ────────────────────
  const showChangeTypes = queryResult?.change_types?.length > 0;

  return (
    <div className="app-shell">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="app-header">
        <div className="app-header__logo">
          <div className="app-header__logo-icon">🛰</div>
          <span className="app-header__logo-text">SatQuery AI</span>
        </div>
        <span className="app-header__badge">Beta</span>

        {queryResult && (
          <span style={{
            marginLeft: 12,
            fontSize: 12,
            color: "var(--color-text-secondary)",
            background: "rgba(56,189,248,0.06)",
            border: "1px solid var(--color-border)",
            borderRadius: 20,
            padding: "2px 10px",
          }}>
            {queryResult.task_type.replace("_", " ")} · {(queryResult.confidence * 100).toFixed(0)}% conf.
          </span>
        )}

        <div className="app-header__status">
          <div className={`status-dot${backendOnline === false ? " offline" : ""}`} />
          <span>
            {backendOnline === null  ? "Connecting…"
             : backendOnline        ? "Backend online"
             :                        "Backend offline"}
          </span>
        </div>
      </header>

      {/* ── Left sidebar ───────────────────────────────────────────────────── */}
      <QueryPanel
        roi={roi}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        imageryResult={imageryResult}
      />

      {/* ── Map ────────────────────────────────────────────────────────────── */}
      <MapView
        onROIChange={handleROIChange}
        evidenceGeojson={queryResult?.evidence_geojson}
        layerVisibility={layerVisibility}
        onLayerToggle={handleLayerToggle}
        layerData={layerData}
        showChangeTypes={showChangeTypes}
      />

      {/* ── Right results panel ─────────────────────────────────────────────── */}
      <ResultPanel
        result={queryResult}
        isLoading={isLoading}
        error={error}
        onExport={handleExport}
        isExporting={isExporting}
        exportResult={exportResult}
      />
    </div>
  );
}
