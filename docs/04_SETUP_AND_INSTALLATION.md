# 04 — Setup and Installation

## System Prerequisites
* **Operating System:** Windows 10/11, macOS, or Linux.
* **Python Runtime:** Python `3.10.x` or `3.11.x` (Note: Python 3.10 is currently used in the environment).
* **Node.js Runtime:** Node.js `v18.x` or `v20.x` with `npm` `v9.x+`.
* **Hardware:**
  - *Minimal (API / Development Mode):* 8GB RAM, CPU-only.
  - *Recommended (Local 4-bit GPU Inference):* 16GB+ RAM, NVIDIA GPU with 16GB+ VRAM and CUDA 12.x installed.
* **External Accounts & API Keys:**
  - Mapbox Access Token (for frontend satellite basemaps).
  - Google Earth Engine Service Account Key JSON (for satellite data fetching).
  - OpenAI API Key (optional, for LLM vision fallback).
  - Kaggle API Token & Hugging Face Write Token (for model training pipelines).

---

## Step-by-Step Installation

### 1. Repository Setup
```bash
# Clone the repository
git clone https://github.com/MokshdaSharma/SatQuery_AI-SIH26167.git
cd SatQueryAI
```

### 2. Backend Environment Setup
```bash
# Create Python virtual environment
python -m venv env

# Activate virtual environment
# Windows PowerShell:
.\env\Scripts\Activate.ps1
# Windows Command Prompt:
.\env\Scripts\activate.bat
# Linux / macOS:
source env/bin/activate

# Upgrade pip and install wheel
python -m pip install --upgrade pip setuptools wheel

# Install backend dependencies
pip install -r backend/requirements.txt
```

*What `pip install -r backend/requirements.txt` does:*
Installs FastAPI, Uvicorn, Pydantic, Rasterio, Shapely, PyTorch, Hugging Face Hub, Earth Engine API, Pillow, ReportLab, and supporting geospatial libraries into the local `env/` virtual environment.

### 3. Frontend Environment Setup
```bash
# Navigate to the frontend directory
cd frontend

# Install Node modules
npm install

# Return to root directory
cd ..
```

*What `npm install` does:*
Reads `frontend/package.json`, downloads React 19, Vite 6, Mapbox GL JS, Mapbox Draw, Lucide React, and Canvas Confetti into `frontend/node_modules/`, creating a resolved `package-lock.json`.

---

## Running the Application

### Development Mode (Concurrent Servers)

#### Terminal 1 — Backend Server
```bash
# From the repository root (with virtual environment active):
uvicorn backend.main:app --reload --port 8000
```
* **Host:** `http://127.0.0.1:8000`
* **Swagger Documentation:** `http://127.0.0.1:8000/api/docs`
* **Health Check:** `http://127.0.0.1:8000/healthz`

#### Terminal 2 — Frontend Client
```bash
# From the frontend directory:
cd frontend
npm run dev
```
* **Local Web Interface:** `http://localhost:5173`

---

## Production Build

### Building the Frontend Bundle
```bash
cd frontend
npm run build
```
*Outputs compiled, minified HTML/CSS/JS assets into `frontend/dist/`.*

### Running the Production Backend
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 4
```
