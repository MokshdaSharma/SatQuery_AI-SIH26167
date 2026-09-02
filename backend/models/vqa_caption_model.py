"""
VQA + Captioning specialist model stub.

Tasks handled:
  - vqa     — answer a factual question about a single image
  - caption — generate a free-form description of a single image

Weights location (to be filled in):
  /models/weights/vqa_caption/
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from .base_model import SpecialistModel

logger = logging.getLogger(__name__)

WEIGHTS_DIR = Path(__file__).parent / "weights" / "vqa_caption"


class VQACaptionModel(SpecialistModel):
    name = "vqa_caption"

    def __init__(self) -> None:
        self._model = None
        self._processor = None

    # ------------------------------------------------------------------
    # SpecialistModel interface
    # ------------------------------------------------------------------

    def validate_input(self, images: List[Any], metadata: Dict[str, Any]) -> bool:
        if not images:
            raise ValueError("VQACaptionModel requires at least one image.")
        if metadata.get("modality") == "sar":
            raise ValueError(
                "VQACaptionModel operates on optical imagery; received SAR modality."
            )
        return True

    def run(
        self,
        images: List[Any],
        query: str,
        metadata: Dict[str, Any],
    ) -> Dict[str, Any]:
        logger.info("[VQACaptionModel] run() called — returning stub response.")

        # TODO: load fine-tuned checkpoint from /models/weights/vqa_caption and run inference here
        # Example loading pattern (adapt for your framework):
        #
        #   from transformers import AutoProcessor, AutoModelForVision2Seq
        #   if self._model is None:
        #       self._processor = AutoProcessor.from_pretrained(WEIGHTS_DIR)
        #       self._model = AutoModelForVision2Seq.from_pretrained(WEIGHTS_DIR)
        #
        #   inputs = self._processor(images=images[0], text=query, return_tensors="pt")
        #   outputs = self._model.generate(**inputs)
        #   answer = self._processor.decode(outputs[0], skip_special_tokens=True)

        task = metadata.get("task_type", "vqa")
        if task == "caption":
            stub_answer = (
                "This is a stub caption: the image shows a mixed urban-rural area "
                "with visible road networks and some vegetated patches. "
                "(Replace with real model output once weights are loaded.)"
            )
        else:
            stub_answer = (
                f"Stub answer to '{query}': Based on the optical imagery, "
                "the queried feature appears to be present in the region of interest. "
                "(Replace with real model output once weights are loaded.)"
            )

        return {
            "answer": stub_answer,
            "confidence": 0.55,
            "evidence": None,
            "segmentation_mask": None,
        }

    def warm_up(self) -> None:
        logger.info(
            "[VQACaptionModel] warm_up() — weights dir: %s (stub, not loaded)", WEIGHTS_DIR
        )
        # TODO: pre-load checkpoint here so first inference is fast
