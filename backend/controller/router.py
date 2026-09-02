"""
Router — dispatches the validated request to the appropriate specialist
model(s) and returns their raw output(s).

Concretely:
  - Instantiates all specialist models once (at import time).
  - Selects which model(s) to call based on the classified task type.
  - Passes the image references and metadata through.

Adding a new model:
  1. Create a concrete subclass of SpecialistModel in /models/.
  2. Instantiate it in _MODEL_REGISTRY below.
  3. Add a routing case in dispatch().
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List

from ..models.change_segmentation_model import ChangeSegmentationModel
from ..models.change_vqa_model import ChangeVQAModel
from ..models.fusion_model import FusionModel
from ..models.grounding_model import GroundingModel
from ..models.vqa_caption_model import VQACaptionModel
from .task_classifier import (
    CAPTION, CHANGE_VQA, FUSION, GROUNDING, TaskType, VQA,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model registry — instantiated once at module load time
# ---------------------------------------------------------------------------

_vqa_caption        = VQACaptionModel()
_grounding          = GroundingModel()
_change_vqa         = ChangeVQAModel()
_fusion             = FusionModel()
_change_seg         = ChangeSegmentationModel()


def warm_up_all_models() -> None:
    """Call warm_up() on every registered model (invoke at FastAPI startup)."""
    for m in [_vqa_caption, _grounding, _change_vqa, _fusion, _change_seg]:
        try:
            m.warm_up()
        except Exception as exc:
            logger.warning("[Router] warm_up failed for %s: %s", m.name, exc)


# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------

def dispatch(
    task_type: TaskType,
    image_refs: List[str],
    query: str,
    metadata: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """
    Route the request to the correct specialist model(s).

    Args:
        task_type:  Classified task.
        image_refs: Image paths / IDs (may be empty if GEE fetch is pending).
        query:      Natural-language query.
        metadata:   Full request metadata.

    Returns:
        List of raw model output dicts — each conforming to
        { answer, confidence, evidence, segmentation_mask }.
        Most tasks return a single-element list; change analysis may return two
        (the change-VQA answer + the segmentation result).
    """
    logger.info("[Router] dispatching task_type=%s to model(s)", task_type)

    # Resolve image_refs to something the model stubs can accept.
    # Real implementation: load GeoTIFFs from disk into numpy arrays here.
    images = _resolve_images(image_refs, metadata)

    if task_type in (VQA, CAPTION):
        _vqa_caption.validate_input(images, {**metadata, "task_type": task_type})
        result = _vqa_caption.run(images, query, {**metadata, "task_type": task_type})
        return [result]

    elif task_type == GROUNDING:
        _grounding.validate_input(images, metadata)
        result = _grounding.run(images, query, metadata)
        return [result]

    elif task_type == CHANGE_VQA:
        # Run both the change-VQA model and the segmentation model in sequence.
        _change_vqa.validate_input(images, metadata)
        vqa_result = _change_vqa.run(images, query, metadata)

        try:
            _change_seg.validate_input(images, metadata)
            seg_result = _change_seg.run(images, query, metadata)
        except Exception as exc:
            logger.warning("[Router] ChangeSegmentation skipped: %s", exc)
            seg_result = None

        outputs = [vqa_result]
        if seg_result is not None:
            outputs.append(seg_result)
        return outputs

    elif task_type == FUSION:
        _fusion.validate_input(images, metadata)
        result = _fusion.run(images, query, metadata)
        return [result]

    else:
        raise ValueError(f"[Router] Unrecognised task_type: '{task_type}'")


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _resolve_images(image_refs: List[str], metadata: Dict[str, Any]) -> List[Any]:
    """
    Convert image_refs (strings) into objects the model stubs can accept.

    In the stub implementation we just pass the ref strings through so the
    models can log them. In a real deployment, load the GeoTIFFs with rasterio
    and return numpy arrays (or PIL Images) here.
    """
    if not image_refs:
        # Return a placeholder so validate_input in stubs doesn't hard-fail
        return [{"ref": "placeholder", "modality": metadata.get("modality", "optical")}]

    return [
        {"ref": ref, "modality": metadata.get("modality", "optical")}
        for ref in image_refs
    ]
