"""
Optical-SAR fusion specialist model stub.

Task handled:
  - fusion — combine optical (Sentinel-2) and SAR (Sentinel-1) imagery to answer
             questions or produce analyses that benefit from multi-modal data
             (e.g. flood mapping under cloud cover, building damage assessment).

Weights location (to be filled in):
  /models/weights/fusion/
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List

from .base_model import SpecialistModel

logger = logging.getLogger(__name__)

WEIGHTS_DIR = Path(__file__).parent / "weights" / "fusion"


class FusionModel(SpecialistModel):
    name = "fusion"

    def __init__(self) -> None:
        self._model = None

    # ------------------------------------------------------------------
    # SpecialistModel interface
    # ------------------------------------------------------------------

    def validate_input(self, images: List[Any], metadata: Dict[str, Any]) -> bool:
        if metadata.get("modality") != "both":
            raise ValueError(
                "FusionModel requires modality='both' (optical + SAR). "
                f"Received modality='{metadata.get('modality')}'."
            )
        if len(images) < 2:
            raise ValueError(
                "FusionModel expects at least 2 images: one optical and one SAR."
            )
        return True

    def run(
        self,
        images: List[Any],
        query: str,
        metadata: Dict[str, Any],
    ) -> Dict[str, Any]:
        logger.info("[FusionModel] run() called — returning stub response.")

        # TODO: load fine-tuned checkpoint from /models/weights/fusion and run inference here
        # Example pattern for an optical-SAR fusion model:
        #
        #   optical_img = next(img for img in images if img.get("modality") == "optical")
        #   sar_img     = next(img for img in images if img.get("modality") == "sar")
        #   fused_features = self._model.encode_fused(optical_img, sar_img)
        #   answer = self._model.decode(fused_features, query)

        stub_answer = (
            f"Stub fusion answer for '{query}': "
            "After fusing Sentinel-2 (optical) and Sentinel-1 (SAR) data, "
            "the analysis indicates the presence of the queried phenomenon with moderate confidence. "
            "SAR backscatter was consistent with optical spectral signatures. "
            "(Replace with real model output once weights are loaded.)"
        )

        return {
            "answer": stub_answer,
            "confidence": 0.52,
            "evidence": None,
            "segmentation_mask": None,
        }

    def warm_up(self) -> None:
        logger.info(
            "[FusionModel] warm_up() — weights dir: %s (stub, not loaded)", WEIGHTS_DIR
        )
        # TODO: pre-load checkpoint here
