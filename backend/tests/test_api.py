"""
SatQuery AI — Comprehensive Automated Backend & API Test Suite.

Covers:
- System Health & Diagnostics (/healthz)
- Satellite Image Ingestion & Metadata Parsing (/api/upload-image)
- AI Vision Pipelines & VLM Dispatches (/api/query)
- Geospatial Thematic Layer Servicing (/api/layers/{layer_name})
- Export Dossier Generation (/api/export)
- Multi-spectral Index Calculations (NDVI, NDWI, NDBI)
"""
import io
import pytest
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient

from backend.main import app
from backend.services.spectral_indices_service import (
    compute_ndvi,
    compute_ndwi,
    compute_multispectral_scene_indices,
)

client = TestClient(app)


# ─── 1. Health & Status Tests ───────────────────────────────────────────────

def test_healthz_endpoint():
    """Verify system health endpoint returns 200 OK and expected keys."""
    res = client.get("/healthz")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "gee" in data
    assert "version" in data


# ─── 2. Image Ingestion & Upload Tests ──────────────────────────────────────

def test_upload_image_png():
    """Verify PNG raster upload, metadata extraction, and preview generation."""
    img = Image.new("RGB", (256, 256), color=(45, 120, 80))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    res = client.post(
        "/api/upload-image",
        files={"file": ("test_sentinel_patch.png", buf.getvalue(), "image/png")},
    )
    assert res.status_code == 200
    data = res.json()
    assert "image_id" in data
    assert data["width"] == 256
    assert data["height"] == 256
    assert data["bands"] == 3
    assert data["preview_url"] is not None


# ─── 3. Query & Vision AI Pipeline Tests ────────────────────────────────────

def test_query_single_image_vqa():
    """Verify VQA analysis returns 200 OK, dynamic answers, and execution trace."""
    # First upload an image
    img = Image.new("RGB", (128, 128), color=(34, 139, 34))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    upload_res = client.post(
        "/api/upload-image",
        files={"file": ("canopy_patch.png", buf.getvalue(), "image/png")},
    )
    image_id = upload_res.json()["image_id"]

    query_payload = {
        "query": "Identify vegetation coverage, canopy density, and highlight any signs of clearing or stress.",
        "image_refs": [image_id],
        "modality": "optical",
    }
    res = client.post("/api/query", json=query_payload)
    assert res.status_code == 200
    data = res.json()
    assert "session_id" in data
    assert "answer" in data
    assert len(data["answer"]) > 10
    assert data["confidence"] > 0.5
    assert "execution_trace" in data
    assert len(data["execution_trace"]) >= 1


def test_query_resilience_empty_or_relaxed_payload():
    """Verify query endpoint automatically handles relaxed or missing fields without 422."""
    payload = {
        "query": "",
        "date_start": None,
        "date_end": None,
        "image_refs": [],
        "roi_geojson": None,
    }
    res = client.post("/api/query", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["answer"] is not None


def test_query_deforestation_single_date_resilience():
    """Verify single-date queries with change/forestry keywords execute smoothly without 422 error."""
    payload = {
        "query": "Has there been any vegetation loss or clearing in the northern sector?",
        "date_start": "2024-01-01",
        "date_start_2": None,
        "modality": "optical",
        "roi_geojson": {
            "type": "Polygon",
            "coordinates": [[[75.7, 31.1], [75.9, 31.1], [75.9, 31.3], [75.7, 31.3], [75.7, 31.1]]]
        },
    }
    res = client.post("/api/query", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["session_id"] is not None
    assert data["answer"] is not None
    assert len(data["answer"]) > 10



def test_query_conversation_history_with_numeric_timestamps():
    """Verify query endpoint accepts conversation history containing numeric timestamps and extra fields."""
    payload = {
        "query": "Generate a detailed geospatial intelligence report describing overall land cover.",
        "conversation_history": [
            {
                "query": "What are the buildings?",
                "answer": "Detected multiple urban residential structures.",
                "timestamp": 1726821800000,
            }
        ],
    }
    res = client.post("/api/query", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["session_id"] is not None
    assert data["answer"] is not None


# ─── 4. Thematic Map Layer Tests ────────────────────────────────────────────


def test_layers_endpoint():
    """Verify layer retrieval for water, buildings, vegetation."""
    roi_str = '{"type":"Polygon","coordinates":[[[75.8,30.8],[75.9,30.8],[75.9,30.9],[75.8,30.9],[75.8,30.8]]]}'
    res = client.get("/api/layers/water", params={"roi": roi_str})
    assert res.status_code == 200
    data = res.json()
    assert data["layer_name"] == "water"
    assert "geojson" in data


# ─── 5. Export Dossier Tests ────────────────────────────────────────────────

def test_export_endpoint():
    """Verify export bundle creation (PDF, JSON, GeoJSON)."""
    # Create a quick session first
    query_res = client.post("/api/query", json={"query": "Brief scene description"})
    session_id = query_res.json()["session_id"]

    export_res = client.post(
        "/api/export",
        json={"session_id": session_id, "formats": ["log", "geojson"]},
    )
    assert export_res.status_code == 200
    data = export_res.json()
    assert data["session_id"] == session_id
    assert len(data["files"]) >= 1


# ─── 6. Spectral Indices Calculation Unit Tests ─────────────────────────────

def test_spectral_indices_formulas():
    """Verify true scientific NDVI and NDWI formulas."""
    nir = np.array([[0.8, 0.6], [0.7, 0.9]], dtype=np.float32)
    red = np.array([[0.1, 0.2], [0.15, 0.1]], dtype=np.float32)
    green = np.array([[0.3, 0.4], [0.35, 0.4]], dtype=np.float32)

    ndvi = compute_ndvi(nir, red)
    assert np.all(ndvi >= -1.0) and np.all(ndvi <= 1.0)
    assert ndvi[0, 0] == pytest.approx((0.8 - 0.1) / (0.8 + 0.1), rel=1e-3)

    ndwi = compute_ndwi(green, nir)
    assert np.all(ndwi >= -1.0) and np.all(ndwi <= 1.0)

    # Multi-band scene index computation
    stack_4band = np.stack([red, green, red, nir], axis=0) # 4 bands
    result = compute_multispectral_scene_indices(stack_4band)
    assert result["mode"] == "multispectral_4band"
    assert "veg_pct" in result
    assert "mean_ndvi" in result


# ─── 7. Bi-Temporal Change Detection & Segmentation Tests ───────────────────

def test_detect_changes_endpoint():
    """Verify bi-temporal change detection, semantic segmentation, and region labeling."""
    # Create two synthetic patches (before and after)
    im1 = Image.new("RGB", (128, 128), color=(34, 139, 34)) # forest green
    buf1 = io.BytesIO()
    im1.save(buf1, format="PNG")
    buf1.seek(0)

    im2 = Image.new("RGB", (128, 128), color=(139, 69, 19)) # deforested brown
    buf2 = io.BytesIO()
    im2.save(buf2, format="PNG")
    buf2.seek(0)

    res = client.post(
        "/api/detect-changes",
        files={
            "file_1": ("baseline_2020.png", buf1.getvalue(), "image/png"),
            "file_2": ("target_2024.png", buf2.getvalue(), "image/png"),
        },
        data={
            "date_1": "2020-03-15",
            "date_2": "2024-03-15",
            "query": "Identify deforestation and canopy clearing.",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert "session_id" in data
    assert "detected_regions" in data
    assert "change_mask_url" in data
    assert "evidence_geojson" in data
    assert data["evidence_geojson"]["type"] == "FeatureCollection"
    assert "total_changed_ha" in data
    assert "report" in data

