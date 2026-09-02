"""
Abstract base class that every specialist model must implement.

The controller/router will call these methods without knowing which concrete
model it is talking to, so swapping in real fine-tuned weights later requires
only changes inside the concrete model file — never in controller/router/aggregator.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class SpecialistModel(ABC):
    """
    Common interface for all SatQuery AI specialist models.

    Concrete implementations live in the sibling files:
      vqa_caption_model.py
      grounding_model.py
      change_vqa_model.py
      fusion_model.py
      change_segmentation_model.py

    Each concrete model is responsible for loading its own checkpoint in
    __init__(); the router instantiates them once at startup and reuses them.
    """

    # Human-readable name, used in execution traces.
    name: str = "base"

    # ---------------------------------------------------------------------------
    # Abstract interface
    # ---------------------------------------------------------------------------

    @abstractmethod
    def validate_input(self, images: List[Any], metadata: Dict[str, Any]) -> bool:
        """
        Return True if the provided images and metadata are sufficient for this
        model to run inference.  Raise ValueError with a human-readable message
        when validation fails.

        Args:
            images:   List of image objects/paths/arrays passed by the router.
            metadata: Contextual metadata (roi_geojson, modality, dates, query, …).

        Returns:
            True on success.
        """
        ...

    @abstractmethod
    def run(
        self,
        images: List[Any],
        query: str,
        metadata: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Run inference and return a standardised result dictionary.

        Args:
            images:   List of image objects/paths/arrays.
            query:    Natural-language question or instruction.
            metadata: Contextual metadata dict.

        Returns:
            {
                "answer":            str,
                "confidence":        float,           # 0.0 – 1.0
                "evidence":          dict | None,     # GeoJSON FeatureCollection
                "segmentation_mask": Any  | None,     # raw raster (ndarray / path)
            }
        """
        ...

    # ---------------------------------------------------------------------------
    # Optional hook — subclasses may override
    # ---------------------------------------------------------------------------

    def warm_up(self) -> None:
        """
        Called once by the router at startup to pre-load model weights into memory.
        Default implementation is a no-op; override when loading checkpoints.
        """
        pass
