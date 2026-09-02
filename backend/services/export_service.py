"""
Export Service — builds downloadable artefacts for a completed analysis session.

Supported formats
─────────────────
  pdf      — Human-readable PDF report (reportlab)
  geotiff  — The GeoTIFF exported by gee_service (already on disk)
  geojson  — Evidence GeoJSON FeatureCollection
  log      — Structured JSON execution log
  zip      — ZIP bundle of all of the above

Each artefact is saved under SESSIONS_DIR/<session_id>/ and a
relative URL is returned so the API can serve it as a static file.
"""
from __future__ import annotations

import io
import json
import logging
import os
import shutil
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
    )
    _REPORTLAB_AVAILABLE = True
except ImportError:
    logger.warning("reportlab not installed — PDF export unavailable.")
    _REPORTLAB_AVAILABLE = False

_SESSIONS_DIR = Path(os.getenv("SESSIONS_DIR", "./sessions"))


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def export_session(
    session_id: str,
    formats: List[str],
    session_data: Dict[str, Any],
) -> List[Dict[str, str]]:
    """
    Generate export files for *session_id*.

    Args:
        session_id:   Unique session identifier.
        formats:      List of format strings: "pdf", "geotiff", "geojson", "log", "zip"
        session_data: Full session result dict (answer, confidence, evidence, trace…).

    Returns:
        List of { "format": str, "filename": str, "download_url": str }
    """
    session_dir = _SESSIONS_DIR / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    files: List[Dict[str, str]] = []

    if "pdf" in formats:
        path = _export_pdf(session_id, session_dir, session_data)
        if path:
            files.append(_descriptor("pdf", path, session_id))

    if "geotiff" in formats:
        path = _locate_geotiff(session_dir)
        if path:
            files.append(_descriptor("geotiff", path, session_id))
        else:
            logger.warning("[Export] No GeoTIFF found for session %s.", session_id)

    if "geojson" in formats:
        path = _export_geojson(session_id, session_dir, session_data)
        if path:
            files.append(_descriptor("geojson", path, session_id))

    if "log" in formats:
        path = _export_log(session_id, session_dir, session_data)
        files.append(_descriptor("log", path, session_id))

    if "zip" in formats:
        # Ensure all individual files exist first
        all_paths = _collect_all(session_dir)
        zip_path = _export_zip(session_id, session_dir, all_paths)
        files.append(_descriptor("zip", zip_path, session_id))

    return files


# ---------------------------------------------------------------------------
# Individual exporters
# ---------------------------------------------------------------------------

def _export_pdf(
    session_id: str,
    session_dir: Path,
    data: Dict[str, Any],
) -> Optional[Path]:
    if not _REPORTLAB_AVAILABLE:
        logger.warning("[Export] reportlab unavailable — skipping PDF.")
        return None

    out_path = session_dir / f"report_{session_id}.pdf"
    styles = getSampleStyleSheet()

    doc = SimpleDocTemplate(
        str(out_path),
        pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm,
    )

    story = []

    # ── Title ─────────────────────────────────────────────────────────────
    story.append(Paragraph("SatQuery AI — Analysis Report", styles["Title"]))
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph(
        f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}  |  "
        f"Session: {session_id}",
        styles["Normal"],
    ))
    story.append(Spacer(1, 0.6 * cm))

    # ── Query ─────────────────────────────────────────────────────────────
    story.append(Paragraph("Query", styles["Heading2"]))
    story.append(Paragraph(data.get("query", "—"), styles["Normal"]))
    story.append(Spacer(1, 0.4 * cm))

    # ── Task Classification ───────────────────────────────────────────────
    story.append(Paragraph("Task Classification", styles["Heading2"]))
    meta_table_data = [
        ["Task Type",  data.get("task_type", "—")],
        ["Confidence", f"{data.get('confidence', 0):.1%}"],
        ["Modality",   data.get("modality", "—")],
        ["Date start", data.get("date_start", "—")],
        ["Date end",   data.get("date_end", "—") or "—"],
    ]
    meta_table = Table(meta_table_data, colWidths=[5 * cm, 12 * cm])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#1e293b")),
        ("TEXTCOLOR",  (0, 0), (0, -1), colors.white),
        ("FONTNAME",   (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE",   (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (1, 0), (-1, -1), [colors.HexColor("#f8fafc"), colors.HexColor("#e2e8f0")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 0.4 * cm))

    # ── Answer ────────────────────────────────────────────────────────────
    story.append(Paragraph("Answer", styles["Heading2"]))
    story.append(Paragraph(data.get("answer", "—"), styles["Normal"]))
    story.append(Spacer(1, 0.4 * cm))

    # ── Change Types ──────────────────────────────────────────────────────
    ct = data.get("change_types")
    if ct:
        story.append(Paragraph("Detected Change Types", styles["Heading2"]))
        story.append(Paragraph(", ".join(ct), styles["Normal"]))
        story.append(Spacer(1, 0.4 * cm))

    # ── Execution Trace ───────────────────────────────────────────────────
    trace = data.get("execution_trace", [])
    if trace:
        story.append(Paragraph("Execution Trace", styles["Heading2"]))
        for step in trace:
            story.append(Paragraph(
                f"<b>{step.get('step', '?')}</b>: "
                f"{json.dumps(step.get('detail', {}), indent=2)}",
                styles["Code"],
            ))
        story.append(Spacer(1, 0.4 * cm))

    # ── Warnings ─────────────────────────────────────────────────────────
    warnings = data.get("warnings", [])
    if warnings:
        story.append(Paragraph("Warnings", styles["Heading2"]))
        for w in warnings:
            story.append(Paragraph(f"⚠ {w}", styles["Normal"]))

    doc.build(story)
    logger.info("[Export] PDF written to %s", out_path)
    return out_path


def _export_geojson(
    session_id: str,
    session_dir: Path,
    data: Dict[str, Any],
) -> Optional[Path]:
    evidence = data.get("evidence_geojson")
    if not evidence:
        evidence = {"type": "FeatureCollection", "features": []}
    out_path = session_dir / f"evidence_{session_id}.geojson"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(evidence, f, indent=2)
    return out_path


def _export_log(
    session_id: str,
    session_dir: Path,
    data: Dict[str, Any],
) -> Path:
    log = {
        "session_id": session_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "query": data.get("query"),
        "task_type": data.get("task_type"),
        "modality": data.get("modality"),
        "date_start": data.get("date_start"),
        "date_end": data.get("date_end"),
        "date_start_2": data.get("date_start_2"),
        "confidence": data.get("confidence"),
        "answer": data.get("answer"),
        "change_types": data.get("change_types"),
        "warnings": data.get("warnings", []),
        "execution_trace": data.get("execution_trace", []),
    }
    out_path = session_dir / f"log_{session_id}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(log, f, indent=2)
    return out_path


def _locate_geotiff(session_dir: Path) -> Optional[Path]:
    for tif in session_dir.glob("*.tif"):
        return tif
    return None


def _collect_all(session_dir: Path) -> List[Path]:
    return list(session_dir.iterdir())


def _export_zip(session_id: str, session_dir: Path, paths: List[Path]) -> Path:
    zip_path = session_dir / f"export_{session_id}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for p in paths:
            if p.suffix != ".zip" and p.is_file():
                zf.write(p, arcname=p.name)
    logger.info("[Export] ZIP written to %s (%d files)", zip_path, len(paths))
    return zip_path


def _descriptor(fmt: str, path: Path, session_id: str) -> Dict[str, str]:
    return {
        "format": fmt,
        "filename": path.name,
        "download_url": f"/api/download/{session_id}/{path.name}",
    }
