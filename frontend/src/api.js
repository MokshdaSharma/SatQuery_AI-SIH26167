/**
 * api.js — Axios-based client for the SatQuery AI FastAPI backend.
 *
 * All functions throw on HTTP errors with a `{ message }` payload derived
 * from the server's error detail, so the UI can display user-facing messages.
 */

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const client = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 120_000, // GEE calls can take up to 2 minutes
});

// ─── Error normaliser ─────────────────────────────────────────────────────────
function normaliseError(err) {
  if (err.response) {
    const detail = err.response.data?.detail;
    if (typeof detail === "string") return new Error(detail);
    if (Array.isArray(detail)) return new Error(detail.map((d) => d.msg).join("; "));
    return new Error(JSON.stringify(detail));
  }
  if (err.request) return new Error("No response from the server. Is the backend running?");
  return new Error(err.message);
}

// ─── POST /api/roi/fetch-imagery ─────────────────────────────────────────────
/**
 * Fetch satellite imagery for the given ROI and date range.
 *
 * @param {object} roiGeojson  GeoJSON geometry (Polygon/Feature)
 * @param {string} dateStart   YYYY-MM-DD
 * @param {string|null} dateEnd YYYY-MM-DD (optional)
 * @param {string} modality    "optical" | "sar" | "both"
 * @returns {Promise<import('./types').ImageryResponse>}
 */
export async function fetchImagery(roiGeojson, dateStart, dateEnd, modality) {
  try {
    const { data } = await client.post("/api/roi/fetch-imagery", {
      roi_geojson: roiGeojson,
      date_start: dateStart,
      date_end: dateEnd || undefined,
      modality,
    });
    return data;
  } catch (err) {
    throw normaliseError(err);
  }
}

// ─── POST /api/query ──────────────────────────────────────────────────────────
/**
 * Run the agentic VLM analysis pipeline.
 *
 * @param {object} params
 * @returns {Promise<import('./types').QueryResponse>}
 */
export async function submitQuery({
  roiGeojson,
  query,
  imageRefs,
  modality,
  dateStart,
  dateEnd,
  dateStart2,
  dateEnd2,
}) {
  try {
    const { data } = await client.post("/api/query", {
      roi_geojson: roiGeojson,
      query,
      image_refs: imageRefs || [],
      modality,
      date_start: dateStart,
      date_end: dateEnd || undefined,
      date_start_2: dateStart2 || undefined,
      date_end_2: dateEnd2 || undefined,
    });
    return data;
  } catch (err) {
    throw normaliseError(err);
  }
}

// ─── GET /api/layers/{layer_name} ────────────────────────────────────────────
/**
 * Fetch a thematic map layer for the ROI.
 *
 * @param {string} layerName  "water" | "vegetation" | "buildings" | "roads"
 * @param {object} roiGeojson GeoJSON geometry
 * @returns {Promise<import('./types').LayerResponse>}
 */
export async function fetchLayer(layerName, roiGeojson) {
  try {
    const { data } = await client.get(`/api/layers/${layerName}`, {
      params: { roi: JSON.stringify(roiGeojson) },
    });
    return data;
  } catch (err) {
    throw normaliseError(err);
  }
}

// ─── POST /api/export ─────────────────────────────────────────────────────────
/**
 * Export session results.
 *
 * @param {string} sessionId
 * @param {string[]} formats  e.g. ["pdf","zip"]
 * @returns {Promise<import('./types').ExportResponse>}
 */
export async function exportSession(sessionId, formats) {
  try {
    const { data } = await client.post("/api/export", {
      session_id: sessionId,
      formats,
    });
    return data;
  } catch (err) {
    throw normaliseError(err);
  }
}

// ─── Download helper ──────────────────────────────────────────────────────────
/**
 * Trigger a browser file download for an exported file.
 *
 * @param {string} sessionId
 * @param {string} filename
 */
export function downloadFile(sessionId, filename) {
  window.open(`${BASE_URL}/api/download/${sessionId}/${filename}`, "_blank");
}
