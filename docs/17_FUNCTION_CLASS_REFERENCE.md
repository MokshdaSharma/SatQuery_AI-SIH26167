# 17 — Function & Class Technical Reference

## Controller Layer Functions

### `classify_task()`
* **Location:** [`backend/controller/task_classifier.py`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/controller/task_classifier.py)
* **Signature:**
  ```python
  def classify_task(query: str, modality: str, has_second_date: bool) -> ClassificationResult:
  ```
* **Parameters:**
  - `query` (`str`): The natural language query string from the user.
  - `modality` (`str`): Sensor modality (`optical`, `sar`, `both`).
  - `has_second_date` (`bool`): True if a second temporal epoch was supplied in the request.
* **Return Value:** `ClassificationResult(task_type: TaskType, confidence: float, matched_keywords: List[str])`
* **Internal Logic:**
  1. Checks if `has_second_date` is True $\rightarrow$ immediately classifies as `change_vqa` ($confidence = 0.82$).
  2. Checks if `modality == "both"` $\rightarrow$ classifies as `fusion` ($confidence = 0.85$).
  3. Scans normalized query against keyword dictionaries (`_GROUNDING_KW`, `_CAPTION_KW`, `_CHANGE_KW`).
  4. Falls back to `vqa` ($confidence = 0.60$) if no specific keywords match.

---

### `validate_inputs()`
* **Location:** [`backend/controller/input_validator.py`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/controller/input_validator.py)
* **Signature:**
  ```python
  def validate_inputs(task_type: TaskType, image_refs: List[str], modality: str, metadata: Dict[str, Any]) -> List[str]:
  ```
* **Parameters:**
  - `task_type` (`TaskType`): The classified task.
  - `image_refs` (`List[str]`): List of image IDs/paths.
  - `modality` (`str`): Sensor modality.
  - `metadata` (`Dict[str, Any]`): Complete request context including `roi_geojson`.
* **Return Value:** `List[str]` of non-fatal warnings.
* **Exceptions:** Raises `InputValidationError` (HTTP 422) on malformed GeoJSON or invalid parameters.

---

### `dispatch()`
* **Location:** [`backend/controller/router.py`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/controller/router.py)
* **Signature:**
  ```python
  def dispatch(task_type: TaskType, image_refs: List[str], query: str, metadata: Dict[str, Any]) -> List[Dict[str, Any]]:
  ```
* **Parameters:**
  - `task_type` (`TaskType`): Target task type.
  - `image_refs` (`List[str]`): Resolved image references.
  - `query` (`str`): Natural language prompt.
  - `metadata` (`Dict[str, Any]`): Request context.
* **Return Value:** `List[Dict[str, Any]]` of raw specialist outputs conforming to `{answer, confidence, evidence, segmentation_mask}`.

---

### `aggregate()`
* **Location:** [`backend/controller/aggregator.py`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/controller/aggregator.py)
* **Signature:**
  ```python
  def aggregate(task_type: TaskType, classification_confidence: float, model_outputs: List[Dict[str, Any]], metadata: Dict[str, Any]) -> Dict[str, Any]:
  ```
* **Internal Logic:** Combines multiple specialist outputs (e.g. `ChangeVQAModel` text answer + `ChangeSegmentationModel` change types and GeoJSON polygons), calculates calibrated confidence:
  $$\text{Confidence}_{\text{final}} = \text{Model Confidence} \times (0.7 + 0.3 \times \text{Classification Confidence})$$

---

## Services Layer Functions

### `fetch_layer()`
* **Location:** [`backend/services/map_layers_service.py`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/services/map_layers_service.py)
* **Signature:**
  ```python
  def fetch_layer(layer_name: str, roi_geojson: Dict[str, Any]) -> Dict[str, Any]:
  ```
* **Supported Layers:**
  - `water`: Vectorizes JRC Surface Water 10m extent above 50% occurrence.
  - `vegetation`: Vectorizes ESA WorldCover 10m Tree & Grassland classes.
  - `buildings`: Fetches Google Open Buildings v3 vector polygons.
  - `roads`: Queries OSM Overpass API and converts highway ways into GeoJSON LineStrings.
