# 28 — Developer Onboarding & Extension Guide

## Quick-Start Onboarding (First 15 Minutes)

### 1. Which files should I read first?
1. [`docs/00_PROJECT_OVERVIEW.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/00_PROJECT_OVERVIEW.md): High-level system goals.
2. [`backend/main.py`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/main.py): Entrypoint and API route definitions.
3. [`backend/controller/router.py`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/controller/router.py): How requests are routed to models.
4. [`frontend/src/App.jsx`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/frontend/src/App.jsx): Root frontend state and component wiring.

### 2. How do I start the local dev environment?
```bash
# Terminal 1: Backend
.\env\Scripts\Activate.ps1
uvicorn backend.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

---

## Common Developer Extension Tasks

### How to Add a New API Endpoint
1. Define request & response models in `backend/schemas/requests.py` and `backend/schemas/responses.py`.
2. Implement route logic in `backend/main.py`:
   ```python
   @app.post("/api/custom-endpoint", response_model=CustomResponse, tags=["Custom"])
   async def custom_endpoint(req: CustomRequest):
       ...
   ```
3. Add client caller in `frontend/src/api.js`.

---

### How to Add a New Specialist AI Model
1. Create `backend/models/my_new_model.py` subclassing `SpecialistModel` (`base_model.py`):
   ```python
   from .base_model import SpecialistModel

   class MyNewModel(SpecialistModel):
       name = "my_new_model"

       def validate_input(self, images, metadata) -> bool:
           return True

       def run(self, images, query, metadata) -> Dict[str, Any]:
           return {
               "answer": "Answer from my new model",
               "confidence": 0.90,
               "evidence": None,
               "segmentation_mask": None,
           }
   ```
2. Register the instance in `backend/controller/router.py`:
   ```python
   from ..models.my_new_model import MyNewModel
   _my_new_model = MyNewModel()
   ```
3. Add a routing rule in `dispatch()` in `router.py` and a classification keyword in `task_classifier.py`.

---

### How to Train and Push Models to Kaggle
1. Edit or inspect the notebooks in `notebooks/`.
2. Run the Kaggle push script:
   ```bash
   python scripts/push_notebooks_to_kaggle.py
   ```
3. Open the kernel URL, verify that your `HF_TOKEN` is present in Kaggle Secrets, select GPU T4 x2, and click **Run All**.
