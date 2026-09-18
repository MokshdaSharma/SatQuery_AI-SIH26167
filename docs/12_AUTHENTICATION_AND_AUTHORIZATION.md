# 12 — Authentication & Authorization

## Current State of Authentication
In the current version of SatQuery AI:
* **End-User Authentication:** There is **no user login, user accounts, JWT tokens, or session cookies** for end-users accessing the web interface or `/api/*` endpoints. The system is designed as an open research and operational prototype.
* **Service-to-Service Authentication:**
  - **Google Earth Engine (GEE):** The backend authenticates to the Google Cloud Earth Engine API using a Google Service Account Private Key (`satquery-ai-*.json`) via `google.oauth2.service_account.Credentials` and `ee.Initialize()`.
  - **OpenAI API:** Authenticated via the `OPENAI_API_KEY` header for vision fallback prompts.
  - **Hugging Face Hub:** Authenticated via Bearer token in the `HF_TOKEN` environment variable for downloading private model checkpoints or uploading trained LoRA adapters.
  - **Kaggle API:** Authenticated via Bearer token in `~/.kaggle/kaggle.json` (`creds["key"]`) for remote GPU kernel pushing.

---

## Access Control & Network Security Mechanisms
1. **CORS Restrictions (`backend/main.py:71-101`):**
   - The FastAPI backend configures `CORSMiddleware`.
   - By default, cross-origin browser requests are restricted to whitelist origins (`http://localhost:5173`, `http://localhost:3000`, `http://localhost:4173`).
2. **Path Traversal Protection (`backend/main.py:393-397`):**
   - The file download endpoint `/api/download/{session_id}/{filename}` validates that resolved file paths cannot escape the `_SESSIONS_DIR` root directory:
     ```python
     try:
         file_path.resolve().relative_to(_SESSIONS_DIR.resolve())
     except ValueError:
         raise HTTPException(status_code=403, detail="Access denied.")
     ```

---

## Recommended Roadmap for Production Authentication
If deploying SatQuery AI for enterprise or government use:
1. **API Key & JWT Auth:** Integrate `OAuth2PasswordBearer` or Auth0 / Clerk to authenticate users, rate-limit queries per organization, and isolate session directories by tenant ID (`./sessions/{tenant_id}/{session_id}/`).
2. **Role-Based Access Control (RBAC):**
   - `Viewer`: Can inspect public map layers and run standard single-image queries.
   - `Analyst`: Can upload private GeoTIFFs and export high-resolution PDF/GeoJSON audit packages.
   - `Admin`: Can manage GEE service credentials and trigger remote model fine-tuning jobs.
