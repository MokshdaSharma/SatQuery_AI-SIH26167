# 27 — Change Impact & Blast Radius Analysis

## Dependency & Modification Impact Chains

### 1. Modifying Request/Response Schemas (`backend/schemas/`)
```mermaid
flowchart TD
    SchemaChange[Edit backend/schemas/requests.py or responses.py] --> Main[backend/main.py route handlers]
    Main --> ClientAPI[frontend/src/api.js]
    ClientAPI --> AppState[frontend/src/App.jsx]
    AppState --> UIComp[QueryPanel.jsx / ResultPanel.jsx / MapView.jsx]
```
* **Blast Radius:** High.
* **Compatibility Rule:** Adding optional fields with default values is backward-compatible. Renaming or removing fields breaks frontend parsing in `api.js` and `App.jsx`.

---

### 2. Adding or Replacing a Specialist Model (`backend/models/`)
```mermaid
flowchart TD
    NewModel[Create new model in backend/models/new_model.py] --> Router[Register in backend/controller/router.py _MODEL_REGISTRY]
    Router --> Classifier[Add classification rule in backend/controller/task_classifier.py]
    Classifier --> Aggregator[Update aggregation logic in backend/controller/aggregator.py]
```
* **Blast Radius:** Low / Contained.
* **Compatibility Rule:** As long as the new model subclasses `SpecialistModel` (`base_model.py`) and returns `{answer: str, confidence: float, evidence: dict, segmentation_mask: Any}`, `backend/main.py` and the frontend require zero code changes.

---

### 3. Modifying Spectral Indices or Map Layers (`backend/services/`)
* **Blast Radius:** Low.
* **Details:** `spectral_indices_service.py` is called internally by `change_segmentation_model.py`. Any new index added (e.g. Bare Soil Index) can be surfaced by adding a new return metric to the stats dictionary.
