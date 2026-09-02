"""
Input validator — checks that the images / metadata supplied by the caller
are compatible with the classified task before the router dispatches.

Raises InputValidationError (a subclass of ValueError) with a user-facing
message when validation fails so the API layer can return a 422 response.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from .task_classifier import (
    CAPTION, CHANGE_VQA, FUSION, GROUNDING, TaskType, VQA,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Custom exception
# ---------------------------------------------------------------------------

class InputValidationError(ValueError):
    """Raised when a request cannot be serviced by the classified task."""


# ---------------------------------------------------------------------------
# Validation rules per task type
# ---------------------------------------------------------------------------

_RULES: Dict[TaskType, Dict[str, Any]] = {
    VQA: {
        "min_images": 1,
        "max_images": 1,
        "allowed_modalities": {"optical", "sar"},
        "requires_second_date": False,
    },
    CAPTION: {
        "min_images": 1,
        "max_images": 1,
        "allowed_modalities": {"optical"},
        "requires_second_date": False,
    },
    GROUNDING: {
        "min_images": 1,
        "max_images": 1,
        "allowed_modalities": {"optical"},
        "requires_second_date": False,
    },
    CHANGE_VQA: {
        "min_images": 2,
        "max_images": 4,          # allow more images for multi-temporal
        "allowed_modalities": {"optical", "sar", "both"},
        "requires_second_date": True,
    },
    FUSION: {
        "min_images": 2,          # at least one optical + one SAR
        "max_images": 8,
        "allowed_modalities": {"both"},
        "requires_second_date": False,
    },
}


# ---------------------------------------------------------------------------
# Public function
# ---------------------------------------------------------------------------

def validate_inputs(
    task_type: TaskType,
    image_refs: List[str],
    modality: str,
    metadata: Dict[str, Any],
) -> List[str]:
    """
    Validate request inputs against the requirements of *task_type*.

    Args:
        task_type:  Classified task (from task_classifier.classify_task).
        image_refs: List of image IDs / paths provided by the caller.
        modality:   "optical" | "sar" | "both"
        metadata:   Full request metadata dict (must contain at least date_start).

    Returns:
        A list of warning strings (non-fatal issues). Empty list = fully valid.

    Raises:
        InputValidationError: On hard validation failures.
    """
    rules = _RULES.get(task_type)
    if rules is None:
        raise InputValidationError(f"Unknown task type: '{task_type}'.")

    warnings: List[str] = []
    n_images = len(image_refs)

    # ── Image count ─────────────────────────────────────────────────────────
    min_img: int = rules["min_images"]
    max_img: int = rules["max_images"]

    if n_images < min_img:
        if n_images == 0:
            # No images provided — the router will fetch them; emit a warning only
            warnings.append(
                f"No image_refs provided for task '{task_type}'. "
                "The router will attempt to fetch imagery automatically from GEE."
            )
        else:
            raise InputValidationError(
                f"Task '{task_type}' requires at least {min_img} image(s); "
                f"{n_images} provided."
            )

    if n_images > max_img:
        warnings.append(
            f"Task '{task_type}' expects at most {max_img} image(s); "
            f"{n_images} provided. Only the first {max_img} will be used."
        )

    # ── Modality ─────────────────────────────────────────────────────────────
    allowed: set = rules["allowed_modalities"]
    if modality not in allowed:
        raise InputValidationError(
            f"Task '{task_type}' requires modality in {allowed}; got '{modality}'."
        )

    # ── Second date requirement ───────────────────────────────────────────────
    if rules["requires_second_date"]:
        if not metadata.get("date_start_2"):
            raise InputValidationError(
                f"Task '{task_type}' requires a second epoch date (date_start_2) "
                "for bi-temporal analysis. Please provide it in the query panel."
            )

    # ── ROI ──────────────────────────────────────────────────────────────────
    roi = metadata.get("roi_geojson")
    if not roi:
        raise InputValidationError("roi_geojson is required but was not provided.")

    roi_type = roi.get("type", "")
    if roi_type == "Feature":
        geom_type = roi.get("geometry", {}).get("type", "")
    else:
        geom_type = roi_type

    if geom_type not in {"Polygon", "MultiPolygon"}:
        raise InputValidationError(
            f"roi_geojson must be a Polygon or MultiPolygon geometry (got '{geom_type}')."
        )

    logger.info(
        "[InputValidator] task=%s modality=%s n_images=%d → VALID (warnings=%d)",
        task_type, modality, n_images, len(warnings),
    )

    return warnings
