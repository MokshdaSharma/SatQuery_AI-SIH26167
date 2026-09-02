"""
Aggregator — merges raw model outputs from the router into a single
structured result suitable for the API response and session log.

When multiple models contribute (e.g. change_vqa + change_segmentation),
the aggregator:
  - Picks the primary textual answer from the highest-confidence output.
  - Merges GeoJSON evidence features into a single FeatureCollection.
  - Averages confidence scores, weighted by model priority.
  - Combines change_types lists (de-duplicated).
  - Builds a structured execution_trace list for transparency.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public function
# ---------------------------------------------------------------------------

def aggregate(
    task_type: str,
    classification_confidence: float,
    model_outputs: List[Dict[str, Any]],
    metadata: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Merge raw model outputs into a unified result.

    Args:
        task_type:                  Classified task type string.
        classification_confidence:  Classifier confidence (0-1).
        model_outputs:              List of dicts from router.dispatch().
        metadata:                   Full request metadata (for trace enrichment).

    Returns:
        {
            "answer":               str,
            "confidence":           float,
            "evidence_geojson":     dict | None,
            "segmentation_mask_url": str | None,
            "change_types":         list | None,
            "execution_trace":      list,
            "warnings":             list,
        }
    """
    if not model_outputs:
        return _empty_result(task_type, metadata)

    # ── Answer: pick from highest-confidence output ───────────────────────────
    primary = max(model_outputs, key=lambda o: o.get("confidence", 0.0))
    answer: str = primary.get("answer", "No answer returned by the model.")

    # ── Confidence: weighted average (classifier × model) ───────────────────
    model_conf = _weighted_confidence(model_outputs)
    final_conf = round(classification_confidence * 0.3 + model_conf * 0.7, 3)

    # ── Evidence: merge all GeoJSON FeatureCollections ───────────────────────
    evidence_geojson = _merge_geojson([o.get("evidence") for o in model_outputs])

    # ── Segmentation mask: take first non-None ────────────────────────────────
    seg_mask_url: Optional[str] = None
    for o in model_outputs:
        mask = o.get("segmentation_mask")
        if mask is not None:
            seg_mask_url = str(mask)
            break

    # ── Change types: union across all outputs ────────────────────────────────
    change_types: Optional[List[str]] = None
    all_change_types = []
    for o in model_outputs:
        ct = o.get("change_types")
        if ct:
            all_change_types.extend(ct)
    if all_change_types:
        change_types = list(dict.fromkeys(all_change_types))   # de-duplicate preserving order

    # ── Execution trace ───────────────────────────────────────────────────────
    trace = _build_trace(task_type, classification_confidence, model_outputs, metadata)

    warnings: List[str] = []
    if final_conf < 0.4:
        warnings.append(
            f"Low overall confidence ({final_conf:.2f}). "
            "Results may be unreliable — model weights have not been loaded yet."
        )

    logger.info(
        "[Aggregator] task=%s final_conf=%.3f evidence_features=%d",
        task_type,
        final_conf,
        len(evidence_geojson.get("features", [])) if evidence_geojson else 0,
    )

    return {
        "answer": answer,
        "confidence": final_conf,
        "evidence_geojson": evidence_geojson,
        "segmentation_mask_url": seg_mask_url,
        "change_types": change_types,
        "execution_trace": trace,
        "warnings": warnings,
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _weighted_confidence(outputs: List[Dict[str, Any]]) -> float:
    if not outputs:
        return 0.0
    total = sum(o.get("confidence", 0.0) for o in outputs)
    return round(total / len(outputs), 3)


def _merge_geojson(evidence_list: List[Optional[Dict]]) -> Optional[Dict]:
    features = []
    for ev in evidence_list:
        if ev is None:
            continue
        if ev.get("type") == "FeatureCollection":
            features.extend(ev.get("features", []))
        elif ev.get("type") == "Feature":
            features.append(ev)
    if not features:
        return None
    return {"type": "FeatureCollection", "features": features}


def _build_trace(
    task_type: str,
    cls_conf: float,
    outputs: List[Dict[str, Any]],
    metadata: Dict[str, Any],
) -> List[Dict[str, Any]]:
    trace = [
        {
            "step": "task_classification",
            "detail": {
                "task_type": task_type,
                "classifier_confidence": cls_conf,
                "query": metadata.get("query", ""),
                "modality": metadata.get("modality", "optical"),
                "has_second_date": bool(metadata.get("date_start_2")),
            },
        },
        {
            "step": "input_validation",
            "detail": {
                "n_image_refs": len(metadata.get("image_refs", [])),
                "roi_type": metadata.get("roi_geojson", {}).get("type"),
            },
        },
        {
            "step": "model_dispatch",
            "detail": {
                "models_called": [
                    o.get("model_name", f"model_{i}") for i, o in enumerate(outputs)
                ],
                "task_type": task_type,
            },
        },
    ]

    for i, output in enumerate(outputs):
        trace.append(
            {
                "step": f"model_output_{i}",
                "detail": {
                    "model_name": output.get("model_name", f"model_{i}"),
                    "confidence": output.get("confidence"),
                    "has_evidence": output.get("evidence") is not None,
                    "has_segmentation_mask": output.get("segmentation_mask") is not None,
                    "change_types": output.get("change_types"),
                },
            }
        )

    trace.append(
        {
            "step": "aggregation",
            "detail": {
                "final_confidence": round(cls_conf * 0.3 + _weighted_confidence(outputs) * 0.7, 3),
                "n_evidence_features": 0,  # updated by caller if needed
            },
        }
    )

    return trace


def _empty_result(task_type: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "answer": "No model output was produced. Please check your inputs and try again.",
        "confidence": 0.0,
        "evidence_geojson": None,
        "segmentation_mask_url": None,
        "change_types": None,
        "execution_trace": _build_trace(task_type, 0.0, [], metadata),
        "warnings": ["Model dispatch returned no outputs."],
    }
