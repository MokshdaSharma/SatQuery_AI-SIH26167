# 05 — Configuration & Environment Variables

## Configuration Overview
SatQuery AI reads configuration from environment variables, `.env` files located in the `backend/` and `frontend/` folders, and local JSON credentials.

```text
SatQueryAI/
├── backend/
│   ├── .env                           # Backend environment variables
│   └── satquery-ai-*.json             # Google Earth Engine Service Account credentials
├── frontend/
│   └── .env                           # Frontend environment variables
└── ~/.kaggle/kaggle.json              # Kaggle API authentication (for training scripts)
```

---

## Environment Variables Inventory

| Variable | Scope | Required? | Purpose | Format / Example | Default Value | Used By |
|---|---|---|---|---|---|---|
| `VITE_MAPBOX_TOKEN` | Frontend | **Yes** | Authenticates Mapbox GL JS to load satellite basemap tiles | `pk.eyJ1Ijoi...` | `None` (Shows error banner if missing) | [`frontend/src/components/MapView.jsx`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/frontend/src/components/MapView.jsx) |
| `VITE_API_BASE_URL` | Frontend | No | Base URL of the FastAPI backend service | `http://localhost:8000` | `http://localhost:8000` | [`frontend/src/api.js`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/frontend/src/api.js) |
| `SESSIONS_DIR` | Backend | No | Root directory where session caches, manifests, and exports are stored | `./sessions` | `./sessions` | [`backend/main.py`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/main.py) |
| `CORS_ORIGINS` | Backend | No | Comma-separated list of permitted origin URLs for CORS headers | `http://localhost:5173,http://localhost:3000` | `http://localhost:5173,http://localhost:3000,http://localhost:4173` | [`backend/main.py`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/main.py) |
| `GEE_SERVICE_ACCOUNT_KEY` | Backend | No | Absolute or relative path to Google Earth Engine service account JSON | `backend/satquery-ai-507419-bd42e79609ce.json` | Auto-detects `satquery-ai-*.json` in `backend/` | [`backend/services/gee_service.py`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/services/gee_service.py) |
| `GEE_PROJECT` | Backend | No | Google Cloud Project ID for Earth Engine initialization | `satquery-ai-507419` | `satquery-ai-507419` | [`backend/services/gee_service.py`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/services/gee_service.py) |
| `OPENAI_API_KEY` | Backend | Optional | API key for OpenAI Vision / GPT-4o-mini multimodal reasoning fallback | `sk-proj-...` | `None` (Falls back to deterministic remote sensing responses) | [`backend/models/`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/models/) |
| `HF_TOKEN` | Backend / Kaggle | Optional | Hugging Face user write token for downloading private checkpoints or uploading trained LoRA adapters | `hf_...` | `None` (Public models only) | [`backend/models/`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/backend/models/), [`scripts/`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/scripts/) |

---

## Example Configuration Files

### `backend/.env`
```ini
# Earth Engine Credentials
GEE_SERVICE_ACCOUNT_KEY=backend/satquery-ai-507419-bd42e79609ce.json
GEE_PROJECT=satquery-ai-507419

# Optional API Keys
OPENAI_API_KEY=sk-your-openai-key-here
HF_TOKEN=hf_your-huggingface-token-here

# Server Settings
SESSIONS_DIR=./sessions
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:4173
```

### `frontend/.env`
```ini
# Mapbox public token for WebGL canvas
VITE_MAPBOX_TOKEN=pk.your_mapbox_public_token_here

# Backend endpoint
VITE_API_BASE_URL=http://localhost:8000
```
