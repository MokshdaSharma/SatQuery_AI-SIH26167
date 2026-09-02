"""
Task classifier — determines which specialist task a user query maps to.

Task taxonomy
─────────────
  vqa          Natural-language question about a single image.
  caption      Request for a free-form description of the scene.
  grounding    Request to locate / identify a specific object in the image.
  change_vqa   Question about temporal change between two dates.
  fusion       Query that explicitly requires both optical and SAR modalities.

Classification strategy
───────────────────────
Rule-based keyword matching is used for the scaffold. Replace with a fine-tuned
text classifier (e.g. a small BERT / sentence-transformer) to improve accuracy.

The classifier returns a TaskClassification dataclass so the execution trace
captures exactly which keywords triggered the decision.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Task type literals
# ---------------------------------------------------------------------------

TaskType = str

VQA         = "vqa"
CAPTION     = "caption"
GROUNDING   = "grounding"
CHANGE_VQA  = "change_vqa"
FUSION      = "fusion"

ALL_TASKS: List[TaskType] = [VQA, CAPTION, GROUNDING, CHANGE_VQA, FUSION]

# ---------------------------------------------------------------------------
# Keyword patterns (compiled once)
# ---------------------------------------------------------------------------

_CAPTION_PATTERNS = [
    r"\bdescribe\b", r"\bcaption\b", r"\bwhat (does|is in|can you see in)\b",
    r"\bsummar(ize|ise)\b", r"\boverview\b", r"\bwhat does (this|the) (area|region|image|scene) (look like|show)\b",
]

_GROUNDING_PATTERNS = [
    r"\bwhere (is|are)\b", r"\blocate\b", r"\bfind\b", r"\bidentify (the location|where)\b",
    r"\bshow me (where|the location)\b", r"\bpoint (to|out)\b", r"\bhighlight\b",
    r"\bbounding box\b", r"\bdetect\b",
]

_CHANGE_PATTERNS = [
    r"\bchange[ds]?\b", r"\bbefore (and|&) after\b", r"\btemporal\b",
    r"\bcompare\b", r"\bdifference\b", r"\bgrowth\b", r"\bexpansion\b",
    r"\bnew construction\b", r"\bdemolition\b", r"\bdeforestation\b",
    r"\bvegetation (loss|gain|change)\b", r"\bbetween \d{4} and \d{4}\b",
    r"\bover (the )?(past|last)\b", r"\bsince \d{4}\b",
]

_FUSION_PATTERNS = [
    r"\bsar\b", r"\bsar (and|&|plus|with) optical\b", r"\boptical (and|&|plus|with) sar\b",
    r"\bsentinel.?1\b", r"\bfusion\b", r"\bsynergy\b",
    r"\bunder cloud(s|y)?\b", r"\bcloud-free\b",
]


def _compile(patterns: List[str]):
    return [re.compile(p, re.IGNORECASE) for p in patterns]


_CAPTION_RE  = _compile(_CAPTION_PATTERNS)
_GROUNDING_RE = _compile(_GROUNDING_PATTERNS)
_CHANGE_RE   = _compile(_CHANGE_PATTERNS)
_FUSION_RE   = _compile(_FUSION_PATTERNS)

# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------

@dataclass
class TaskClassification:
    task_type: TaskType
    confidence: float               # classifier confidence 0-1
    matched_keywords: List[str]     # which patterns fired
    reasoning: str                  # human-readable explanation for execution trace


# ---------------------------------------------------------------------------
# Classifier
# ---------------------------------------------------------------------------

def _match_patterns(text: str, compiled_patterns) -> List[str]:
    """Return list of pattern strings that matched."""
    matches = []
    for pat in compiled_patterns:
        m = pat.search(text)
        if m:
            matches.append(m.group(0))
    return matches


def classify_task(
    query: str,
    modality: str = "optical",
    has_second_date: bool = False,
    metadata: Optional[Dict] = None,
) -> TaskClassification:
    """
    Classify *query* into one of the five task types.

    Priority order (highest to lowest):
      1. fusion    — explicit SAR / fusion keywords OR modality == "both"
      2. change_vqa — temporal change keywords OR second date provided
      3. grounding  — spatial localisation keywords
      4. caption    — description / overview keywords
      5. vqa        — default fallback

    Args:
        query:           The raw natural-language query.
        modality:        "optical" | "sar" | "both"
        has_second_date: True when the user provided a second epoch date.
        metadata:        Optional extra metadata (currently unused).

    Returns:
        TaskClassification dataclass.
    """
    text = query.strip()

    fusion_kw   = _match_patterns(text, _FUSION_RE)
    change_kw   = _match_patterns(text, _CHANGE_RE)
    grounding_kw = _match_patterns(text, _GROUNDING_RE)
    caption_kw  = _match_patterns(text, _CAPTION_RE)

    # ── Priority 1: Fusion ──────────────────────────────────────────────────
    if fusion_kw or modality == "both":
        return TaskClassification(
            task_type=FUSION,
            confidence=0.85 if fusion_kw else 0.75,
            matched_keywords=fusion_kw or ["modality=both"],
            reasoning=(
                "Classified as FUSION because "
                + (f"fusion/SAR keywords were detected: {fusion_kw}" if fusion_kw
                   else "modality is set to 'both' (optical+SAR).")
            ),
        )

    # ── Priority 2: Change VQA ──────────────────────────────────────────────
    if change_kw or has_second_date:
        return TaskClassification(
            task_type=CHANGE_VQA,
            confidence=0.82 if change_kw else 0.70,
            matched_keywords=change_kw or ["second_date_provided"],
            reasoning=(
                "Classified as CHANGE_VQA because "
                + (f"temporal change keywords detected: {change_kw}" if change_kw
                   else "a second epoch date was supplied.")
            ),
        )

    # ── Priority 3: Grounding ───────────────────────────────────────────────
    if grounding_kw:
        return TaskClassification(
            task_type=GROUNDING,
            confidence=0.80,
            matched_keywords=grounding_kw,
            reasoning=f"Classified as GROUNDING — spatial localisation keywords: {grounding_kw}",
        )

    # ── Priority 4: Caption ─────────────────────────────────────────────────
    if caption_kw:
        return TaskClassification(
            task_type=CAPTION,
            confidence=0.78,
            matched_keywords=caption_kw,
            reasoning=f"Classified as CAPTION — description keywords: {caption_kw}",
        )

    # ── Priority 5: VQA (default) ───────────────────────────────────────────
    return TaskClassification(
        task_type=VQA,
        confidence=0.60,
        matched_keywords=[],
        reasoning="No specific pattern matched; defaulting to VQA.",
    )
