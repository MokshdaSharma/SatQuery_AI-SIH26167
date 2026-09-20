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
# Result dataclass & Entity Extraction
# ---------------------------------------------------------------------------

@dataclass
class TaskClassification:
    task_type: TaskType
    confidence: float               # classifier confidence 0-1
    matched_keywords: List[str]     # which patterns fired
    reasoning: str                  # human-readable explanation for execution trace


# Known place names & common geo regions for entity matching
_COMMON_LOCATIONS = [
    "visakhapatnam", "vizag", "delhi", "new delhi", "mumbai", "bangalore", "bengaluru",
    "hyderabad", "chennai", "kolkata", "jaipur", "pune", "ahmedabad", "surat",
    "dubai", "cairo", "tokyo", "singapore", "london", "paris", "new york", "san francisco",
    "austin", "lake mead", "amazon", "sahara", "ganga", "yamuna", "godavari", "nile"
]

_COMMON_OBJECTS = [
    "building", "buildings", "structure", "structures", "house", "houses", "settlement",
    "road", "roads", "highway", "highways", "bridge", "bridges", "runway", "airport",
    "water", "water body", "reservoir", "lake", "river", "canal", "ocean", "coastline",
    "vegetation", "forest", "tree", "trees", "crop", "cropland", "farmland", "canopy",
    "solar farm", "solar panels", "industrial zone", "factory", "port", "harbor", "vessel"
]

_COMMON_CONDITIONS = [
    "cloud", "clouds", "cloud cover", "cloudy", "heavy clouds", "overcast",
    "flood", "flooding", "flooded", "inundation", "submerged",
    "drought", "dry", "arid", "wet", "monsoon", "post-monsoon", "pre-monsoon",
    "urban sprawl", "deforestation", "dense", "sparse", "high resolution", "all-weather"
]


def extract_query_entities(query: str) -> Dict[str, List[str]]:
    """
    Extract structured entities (locations, dates, objects, conditions) from user query.
    """
    text = query.strip()
    lower_text = text.lower()
    
    locations = []
    dates = []
    objects = []
    conditions = []

    # 1. Locations: Predefined + geographic sectors + coordinate patterns
    for loc in _COMMON_LOCATIONS:
        if re.search(rf"\b{re.escape(loc)}\b", lower_text):
            locations.append(loc.title())
    
    # Geographic directional sectors
    for sector in ["northern", "southern", "eastern", "western", "central", "northeastern", "northwestern", "southeastern", "southwestern"]:
        if re.search(rf"\b{sector}\s+(sector|quadrant|region|boundary|area|zone|district)\b", lower_text):
            m = re.search(rf"\b{sector}\s+(?:sector|quadrant|region|boundary|area|zone|district)\b", lower_text)
            if m:
                locations.append(m.group(0).title())
    
    # Coordinate extraction (e.g. 26.9N, 76.9E or lat/lon pairs)
    coord_match = re.findall(r"\b\d{1,3}(?:\.\d+)?\s*[°]?[NSns]?\s*,\s*\d{1,3}(?:\.\d+)?\s*[°]?[EWew]?\b", text)
    if coord_match:
        locations.extend(coord_match)

    # 2. Dates & Temporal: Years, Date patterns, Relative periods
    # Years: 1990-2030
    years = re.findall(r"\b(19\d\d|20[0-3]\d)\b", text)
    if years:
        dates.extend([f"Year {y}" for y in sorted(list(set(years)))])
    
    # Date formats (YYYY-MM-DD or Month YYYY)
    iso_dates = re.findall(r"\b\d{4}-\d{2}-\d{2}\b", text)
    if iso_dates:
        dates.extend(iso_dates)
    
    months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december",
              "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
    for m in months:
        m_match = re.findall(rf"\b{m}\s+\d{{4}}\b", lower_text)
        if m_match:
            dates.extend([dm.title() for dm in m_match])
    
    # Temporal phrases
    for t_phrase in ["before and after", "past 2 years", "last decade", "post-monsoon", "pre-event", "post-event", "recent"]:
        if t_phrase in lower_text:
            dates.append(t_phrase.title())

    # 3. Objects / Land Cover
    for obj in _COMMON_OBJECTS:
        if re.search(rf"\b{re.escape(obj)}\b", lower_text):
            obj_clean = obj.title()
            if obj_clean not in objects:
                objects.append(obj_clean)

    # 4. Conditions
    for cond in _COMMON_CONDITIONS:
        if re.search(rf"\b{re.escape(cond)}\b", lower_text):
            cond_clean = cond.title()
            if cond_clean not in conditions:
                conditions.append(cond_clean)

    # De-duplicate while preserving order
    return {
        "locations": list(dict.fromkeys(locations)),
        "dates": list(dict.fromkeys(dates)),
        "objects": list(dict.fromkeys(objects)),
        "conditions": list(dict.fromkeys(conditions)),
    }


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


_BI_TEMPORAL_PATTERNS = [
    r"\bbefore (and|&) after\b", r"\btemporal\b",
    r"\bcompare\b", r"\bdifference\b",
    r"\bbetween \d{4} and \d{4}\b",
    r"\bover (the )?(past|last)\b", r"\bsince \d{4}\b",
    r"\bbetween the two\b", r"\bhow has (the )?.* changed\b",
]

_BI_TEMPORAL_RE = _compile(_BI_TEMPORAL_PATTERNS)


def classify_task(
    query: str,
    modality: str = "optical",
    has_second_date: bool = False,
    metadata: Optional[Dict] = None,
) -> TaskClassification:
    """
    Classify *query* into one of the five task types.

    Priority order (highest to lowest):
      1. fusion      — explicit SAR / fusion keywords OR modality == "both"
      2. change_vqa  — second date provided OR explicit bi-temporal comparative keywords
      3. grounding   — spatial localisation keywords ("where", "locate", "find", "highlight")
      4. caption     — description / overview keywords ("describe", "overview", "what is in")
      5. vqa / change — if single date + change keywords (e.g. deforestation, vegetation loss),
                       handle as single-scene visual QA (or default fallback VQA).

    Args:
        query:           The raw natural-language query.
        modality:        "optical" | "sar" | "both"
        has_second_date: True when the user provided a second epoch date.
        metadata:        Optional extra metadata (currently unused).

    Returns:
        TaskClassification dataclass.
    """
    text = query.strip()

    fusion_kw      = _match_patterns(text, _FUSION_RE)
    bi_temporal_kw = _match_patterns(text, _BI_TEMPORAL_RE)
    change_kw      = _match_patterns(text, _CHANGE_RE)
    grounding_kw   = _match_patterns(text, _GROUNDING_RE)
    caption_kw     = _match_patterns(text, _CAPTION_RE)

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

    # ── Priority 2: Bi-temporal Change VQA ──────────────────────────────────
    if has_second_date:
        return TaskClassification(
            task_type=CHANGE_VQA,
            confidence=0.88 if change_kw else 0.75,
            matched_keywords=change_kw or ["second_date_provided"],
            reasoning=(
                "Classified as CHANGE_VQA because a second observation epoch was provided."
                + (f" (keywords: {change_kw})" if change_kw else "")
            ),
        )

    if bi_temporal_kw:
        return TaskClassification(
            task_type=CHANGE_VQA,
            confidence=0.82,
            matched_keywords=bi_temporal_kw,
            reasoning=f"Classified as CHANGE_VQA — explicit bi-temporal comparative phrasing detected: {bi_temporal_kw}",
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

    # ── Priority 5: Single-date change / condition queries → VQA ─────────────
    if change_kw:
        return TaskClassification(
            task_type=VQA,
            confidence=0.76,
            matched_keywords=change_kw,
            reasoning=f"Classified as VQA — single-epoch visual assessment for environmental/structural state: {change_kw}",
        )

    # ── Priority 6: VQA (default) ───────────────────────────────────────────
    return TaskClassification(
        task_type=VQA,
        confidence=0.60,
        matched_keywords=[],
        reasoning="No specific pattern matched; defaulting to VQA.",
    )
