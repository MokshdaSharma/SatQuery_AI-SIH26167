# 24 — Troubleshooting Guide

## Practical Problem Resolution

### 1. Mapbox Basemap Fails to Load ("Mapbox token not set")
* **Symptom:** UI displays dark screen with `Mapbox token not set` error message.
* **Likely Cause:** `VITE_MAPBOX_TOKEN` is missing or empty in `frontend/.env`.
* **Verification:** Check `frontend/.env` file.
* **Solution:**
  1. Register for a free token at [mapbox.com](https://account.mapbox.com/).
  2. Open `frontend/.env` and insert:
     ```ini
     VITE_MAPBOX_TOKEN=pk.your_token_here
     ```
  3. Restart the Vite dev server (`npm run dev`).

---

### 2. Google Earth Engine Authentication Error (`ee.EEException`)
* **Symptom:** Backend logs: `ee.EEException: Please authorize access to Earth Engine...`
* **Likely Cause:** GEE service account JSON key is missing or project ID is misconfigured.
* **Solution:**
  1. Ensure a valid service account JSON file is placed in `backend/` (e.g., `satquery-ai-*.json`).
  2. Ensure `GEE_PROJECT=satquery-ai-507419` is set in `backend/.env`.
  3. Or run `earthengine authenticate` in the command line for local user credentials.

---

### 3. PyTorch CUDA / `c10_cuda.dll` Missing Warning
* **Symptom:** Backend logs: `[WinError 127] The specified procedure could not be found. Error loading torch\lib\c10_cuda.dll`.
* **Likely Cause:** PyTorch CPU-only or CUDA version mismatch on Windows.
* **Impact:** Non-fatal. The backend automatically catches the exception and falls back to vision prompts and deterministic spectral models.
* **Solution (To enable full GPU inference):**
  Reinstall PyTorch with matching CUDA 12.1 binaries:
  ```bash
  pip install --upgrade --force-reinstall torch torchvision --index-url https://download.pytorch.org/whl/cu121
  ```

---

### 4. OpenAI Quota Exhausted (`429 credit_balance_exhausted`)
* **Symptom:** Backend logs: `OpenAI fallback failed: 429 - credit_balance_exhausted`.
* **Impact:** Zero application crash. The system returns deterministic remote sensing answers, calibrated spectral indices, and spatial GeoJSON evidence.
* **Solution:** Add billing credits at [platform.openai.com/account/billing](https://platform.openai.com/settings/organization/billing/) if you wish to use OpenAI vision fallbacks.
