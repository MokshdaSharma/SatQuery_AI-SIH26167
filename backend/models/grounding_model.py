"""
Grounding / visual-localization specialist model stub.

Task handled:
  - grounding — localise the queried object/region and return a bounding-box or
                polygon as GeoJSON evidence overlaid on the map.

Weights location (to be filled in):
  /models/weights/grounding/
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List

from .base_model import SpecialistModel

logger = logging.getLogger(__name__)

WEIGHTS_DIR = Path(__file__).parent / "weights" / "grounding"


class GroundingModel(SpecialistModel):
    name = "grounding"

    def __init__(self) -> None:
        self._model = None

    # ------------------------------------------------------------------
    # SpecialistModel interface
    # ------------------------------------------------------------------

    def validate_input(self, images: List[Any], metadata: Dict[str, Any]) -> bool:
        if not images:
            raise ValueError("GroundingModel requires at least one image.")
        return True

    def run(
        self,
        images: List[Any],
        query: str,
        metadata: Dict[str, Any],
    ) -> Dict[str, Any]:
        logger.info("[GroundingModel] run() called — returning stub response.")

        # TODO: load fine-tuned checkpoint from /models/weights/grounding and run inference here
        # Example pattern:
        #
        #   predictions = self._model.predict(image=images[0], text=query)
        #   # predictions["boxes"] is [[xmin, ymin, xmax, ymax], ...] in pixel coords
        #   # Convert to geographic coords using the image's affine transform / CRS info
        #   evidence_geojson = pixel_boxes_to_geojson(predictions["boxes"], metadata["transform"])

        # ── Stub: return a tiny placeholder polygon centred on the ROI ──────
        roi = metadata.get("roi_geojson", {})
        coords = roi.get("coordinates", [[[0, 0], [0.01, 0], [0.01, 0.01], [0, 0.01], [0, 0]]])
        stub_evidence = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": coords if isinstance(coords[0][0], list) else [coords],
                    },
                    "properties": {
                        "label": f"Stub grounding result for: {query}",
                        "confidence": 0.60,
                    },
                }
            ],
        }

        return {
            "answer": (
                f"Stub grounding result: the queried object ('{query}') was tentatively "
                "located at the highlighted polygon. "
                "(Replace with real model output once weights are loaded.)"
            ),
            "confidence": 0.60,
            "evidence": stub_evidence,
            "segmentation_mask": None,
        }

    def warm_up(self) -> None:
        logger.info(
            "[GroundingModel] warm_up() — weights dir: %s (stub, not loaded)", WEIGHTS_DIR
        )
        # TODO: pre-load checkpoint here
