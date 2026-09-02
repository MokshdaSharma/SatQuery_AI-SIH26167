"""
Change-VQA specialist model stub.

Task handled:
  - change_vqa — answer questions about what changed between two temporal images
                 (e.g. "Has the reservoir level changed?")

Weights location (to be filled in):
  /models/weights/change_vqa/
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List

from .base_model import SpecialistModel

logger = logging.getLogger(__name__)

WEIGHTS_DIR = Path(__file__).parent / "weights" / "change_vqa"


class ChangeVQAModel(SpecialistModel):
    name = "change_vqa"

    def __init__(self) -> None:
        self._model = None

    # ------------------------------------------------------------------
    # SpecialistModel interface
    # ------------------------------------------------------------------

    def validate_input(self, images: List[Any], metadata: Dict[str, Any]) -> bool:
        if len(images) < 2:
            raise ValueError(
                "ChangeVQAModel requires exactly 2 images (before/after). "
                f"Received {len(images)}."
            )
        if not metadata.get("date_start") or not metadata.get("date_start_2"):
            raise ValueError(
                "ChangeVQAModel requires both date_start and date_start_2 for bi-temporal analysis."
            )
        return True

    def run(
        self,
        images: List[Any],
        query: str,
        metadata: Dict[str, Any],
    ) -> Dict[str, Any]:
        logger.info("[ChangeVQAModel] run() called — returning stub response.")

        # TODO: load fine-tuned checkpoint from /models/weights/change_vqa and run inference here
        # Example pattern for a bi-temporal VQA model:
        #
        #   before_img, after_img = images[0], images[1]
        #   inputs = self._processor(
        #       images=[before_img, after_img],
        #       text=query,
        #       return_tensors="pt",
        #   )
        #   outputs = self._model.generate(**inputs)
        #   answer = self._processor.decode(outputs[0], skip_special_tokens=True)

        date1 = metadata.get("date_start", "T1")
        date2 = metadata.get("date_start_2", "T2")
        stub_answer = (
            f"Stub change-VQA answer: Comparing imagery from {date1} and {date2}, "
            f"a notable change was detected in response to '{query}'. "
            "The affected area shows moderate land-use modification. "
            "(Replace with real model output once weights are loaded.)"
        )

        return {
            "answer": stub_answer,
            "confidence": 0.50,
            "evidence": None,
            "segmentation_mask": None,
        }

    def warm_up(self) -> None:
        logger.info(
            "[ChangeVQAModel] warm_up() — weights dir: %s (stub, not loaded)", WEIGHTS_DIR
        )
        # TODO: pre-load checkpoint here
