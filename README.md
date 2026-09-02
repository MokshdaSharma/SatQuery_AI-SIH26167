# SatQuery AI

**Agentic vision-language assistant for remote-sensing image analysis.**

Draw a region of interest on a satellite map → ask a natural-language question → receive a grounded text answer with visual evidence overlaid on the map.

Supports:
- **Single-image VQA & captioning** — question answering and free-form scene description
- **Visual grounding** — localise objects/regions and overlay bounding-polygon evidence
- **Bi-temporal change analysis** — compare two dates, classify change into *new construction / demolition / vegetation growth / deforestation*
- **Optical-SAR fusion** — joint analysis of Sentinel-2 (optical) and Sentinel-1 (SAR) imagery

---

## Project Structure

```
SatQueryAI/
├── env/                        ← Python venv (created by you — do not commit)
├── backend/
│   ├── main.py                 ← FastAPI app (all endpoints)
│   ├── requirements.txt
│   ├── .env.example
│   ├── controller/
│   │   ├── task_classifier.py  ← classify query → task type
│   │   ├── input_validator.py  ← validate images / modality / dates
│   │   ├── router.py           ← dispatch to specialist models
│   │   └── aggregator.py       ← merge outputs, build execution trace
│   ├── models/
│   │   ├── base_model.py       ← abstract SpecialistModel interface
│   │   ├── vqa_caption_model.py
│   │   ├── grounding_model.py
│   │   ├── change_vqa_model.py
│   │   ├── fusion_model.py
│   │   └── change_segmentation_model.py
│   ├── services/
│   │   ├── gee_service.py      ← Sentinel-1/2 via Google Earth Engine
│   │   ├── map_layers_service.py ← water/vegetation/buildings/roads
│   │   └── export_service.py   ← PDF, GeoTIFF, GeoJSON, ZIP
│   └── schemas/
│       ├── requests.py
│       └── responses.py
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── index.css           ← dark glassmorphism design system
│   │   └── components/
│   │       ├── MapView.jsx     ← Mapbox GL JS + ROI draw + layer overlays
│   │       ├── QueryPanel.jsx  ← query input, dates, modality toggle
│   │       └── ResultPanel.jsx ← answer, confidence, trace, export
│   ├── .env.example
│   └── vite.config.js
└── README.md
```

---

## Environment Variables

### Backend — `backend/.env`

Copy `backend/.env.example` → `backend/.env` and fill in:

| Variable | Description |
|---|---|
| `MAPBOX_TOKEN` | Your Mapbox public access token |
| `GEE_SERVICE_ACCOUNT_EMAIL` | GEE service account email |
| `GEE_SERVICE_ACCOUNT_KEY_PATH` | Absolute path to the JSON key file |
| `GEE_PROJECT_ID` | Google Cloud project registered with Earth Engine |
| `SESSIONS_DIR` | Directory for session logs/exports (default `./sessions`) |
| `MODELS_WEIGHTS_DIR` | Directory for model weight checkpoints (default `./models/weights`) |
| `CORS_ORIGINS` | Comma-separated allowed origins |

### Frontend — `frontend/.env`

Copy `frontend/.env.example` → `frontend/.env` and fill in:

| Variable | Description |
|---|---|
| `VITE_MAPBOX_TOKEN` | Your Mapbox public access token |
| `VITE_API_BASE_URL` | FastAPI backend URL (default `http://localhost:8000`) |

> **Never commit `.env` files to source control.**

---

## Setup & Installation

### Prerequisites

- Python 3.10+ with the `env` virtual environment already created
- Node.js 18+

### 1 — Mapbox Token

1. Sign up at [mapbox.com](https://mapbox.com) (free, no credit card for the default token)
2. Copy your default public access token from the [account page](https://account.mapbox.com/)
3. Paste it into `frontend/.env` as `VITE_MAPBOX_TOKEN`

### 2 — Google Earth Engine

1. Sign up at [earthengine.google.com](https://earthengine.google.com)
2. Create or select a Google Cloud project and [register it with Earth Engine](https://code.earthengine.google.com/register) (Community tier — free)
3. In Google Cloud Console, create a service account, grant it the **Earth Engine Resource Viewer** role, and download the JSON key
4. Set `GEE_SERVICE_ACCOUNT_EMAIL`, `GEE_SERVICE_ACCOUNT_KEY_PATH`, and `GEE_PROJECT_ID` in `backend/.env`

> **Without GEE credentials**, the backend runs in **mock mode** — all GEE calls return placeholder data so you can develop the frontend without a GEE key.

### 3 — Backend

```powershell
# Activate the venv (Windows PowerShell)
.\env\Scripts\activate

# Install dependencies
pip install -r backend\requirements.txt

# Copy and fill in env vars
copy backend\.env.example backend\.env
# … edit backend\.env …

# Start the API server
uvicorn backend.main:app --reload --port 8000
```

The interactive API docs are then available at: http://localhost:8000/api/docs

### 4 — Frontend

```powershell
cd frontend

# Copy and fill in env vars
copy .env.example .env
# … edit frontend\.env — set VITE_MAPBOX_TOKEN …

# Install dependencies (already done during scaffold)
npm install

# Start the dev server
npm run dev
```

Open http://localhost:5173 in your browser.

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/roi/fetch-imagery` | Fetch Sentinel-1/2 imagery for ROI + date range |
| `POST` | `/api/query` | Run full agentic analysis pipeline |
| `GET` | `/api/layers/{layer_name}` | Fetch thematic layer (water/roads/buildings/vegetation) |
| `POST` | `/api/export` | Export session as PDF/GeoTIFF/GeoJSON/log/ZIP |
| `GET` | `/api/download/{session_id}/{filename}` | Download an exported file |
| `GET` | `/healthz` | Backend health check |

Full interactive docs: http://localhost:8000/api/docs

---

## Plugging in Real Model Weights

Each model stub in `backend/models/` has a clearly marked `TODO` block:

```python
# TODO: load fine-tuned checkpoint from /models/weights/<name> and run inference here
```

To plug in weights:

1. **Fine-tune** in a Colab/Kaggle notebook using LoRA/QLoRA
2. **Push** the adapter to a private/public Hugging Face Hub repo
3. **Edit** the relevant model file — replace the TODO block with:
   ```python
   from transformers import AutoProcessor, AutoModelForVision2Seq
   self._processor = AutoProcessor.from_pretrained("your-hf-org/your-model")
   self._model     = AutoModelForVision2Seq.from_pretrained("your-hf-org/your-model")
   ```
4. No changes to `controller/`, `router.py`, or `aggregator.py` are needed

---

## Deployment (Free Tier)

| Component | Platform |
|---|---|
| Backend | [Hugging Face Spaces](https://huggingface.co/spaces) (Docker SDK) or [Render](https://render.com) free web service |
| Frontend | [Vercel](https://vercel.com) or [Netlify](https://netlify.com) |
| Model weights | Hugging Face Hub (free public/private repos) |

Store secrets (`MAPBOX_TOKEN`, GEE key) as HF Spaces secrets or Render environment variables — **never in the repo**.

---

## Agentic Controller Flow

```
User query
    │
    ▼
task_classifier.classify_task()
    │  → vqa | caption | grounding | change_vqa | fusion
    ▼
input_validator.validate_inputs()
    │  → raises InputValidationError on failure
    ▼
gee_service.fetch_imagery()  ← (if no image_refs provided)
    ▼
router.dispatch()
    │  → selects specialist model(s), runs inference
    ▼
aggregator.aggregate()
    │  → merges outputs, computes confidence, builds trace
    ▼
QueryResponse (answer + evidence_geojson + execution_trace)
```

---

## License

MIT
