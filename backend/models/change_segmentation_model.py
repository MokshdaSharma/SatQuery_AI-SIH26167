"""
Change-type segmentation specialist model stub.

Task handled:
  - change_segmentation — given two temporal images, produce a per-pixel
    segmentation mask labelling change into one of four categories:
      new_construction | demolition | vegetation_growth | deforestation

Weights location (to be filled in):
  /models/weights/change_segmentation/
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List

from .base_model import SpecialistModel

logger = logging.getLogger(__name__)

WEIGHTS_DIR = Path(__file__).parent / "weights" / "change_segmentation"

CHANGE_CLASSES = [
    "no_change",
    "new_construction",
    "demolition",
    "vegetation_growth",
    "deforestation",
]


class ChangeSegmentationModel(SpecialistModel):
    name = "change_segmentation"

    def __init__(self) -> None:
        self._model = None

    # ------------------------------------------------------------------
    # SpecialistModel interface
    # ------------------------------------------------------------------

    def validate_input(self, images: List[Any], metadata: Dict[str, Any]) -> bool:
        if len(images) < 2:
            raise ValueError(
                "ChangeSegmentationModel requires exactly 2 images (before/after). "
                f"Received {len(images)}."
            )
        return True

    def run(
        self,
        images: List[Any],
        query: str,
        metadata: Dict[str, Any],
    ) -> Dict[str, Any]:
        logger.info("[ChangeSegmentationModel] run() called — returning stub response.")

        # TODO: load fine-tuned checkpoint from /models/weights/change_segmentation and run inference here
        # Example pattern for a semantic change-segmentation model:
        #
        #   before_img, after_img = images[0], images[1]
        #   mask = self._model.predict(before=before_img, after=after_img)
        #   # mask shape: (H, W) with integer class IDs matching CHANGE_CLASSES
        #   detected = [CHANGE_CLASSES[i] for i in np.unique(mask) if i != 0]
        #   mask_path = save_mask_to_png(mask, metadata["session_id"])

        stub_change_types = ["new_construction", "vegetation_growth"]
        stub_answer = (
            "Stub segmentation result: change-type analysis detected "
            f"{', '.join(stub_change_types)} in the region of interest between the two dates. "
            "(Replace with real model output once weights are loaded.)"
        )

        # Return a stub GeoJSON evidence polygon for each detected class
        roi = metadata.get("roi_geojson", {})
        raw_coords = roi.get("coordinates", [[[0, 0], [0.01, 0], [0.01, 0.01], [0, 0.01], [0, 0]]])
        coords = raw_coords if isinstance(raw_coords[0][0], list) else [raw_coords]

        stub_evidence = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {"type": "Polygon", "coordinates": coords},
                    "properties": {
                        "change_type": ct,
                        "area_sqm": 12500.0,  # stub value
                    },
                }
                for ct in stub_change_types
            ],
        }

        return {
            "answer": stub_answer,
            "confidence": 0.48,
            "evidence": stub_evidence,
            "segmentation_mask": None,   # TODO: return actual mask PNG path
            "change_types": stub_change_types,
        }

    def warm_up(self) -> None:
        logger.info(
            "[ChangeSegmentationModel] warm_up() — weights dir: %s (stub, not loaded)", WEIGHTS_DIR
        )
        # TODO: pre-load checkpoint here
