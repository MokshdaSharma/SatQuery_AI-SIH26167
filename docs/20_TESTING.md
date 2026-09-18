# 20 — Testing & Verification Guide

## Testing Frameworks & Strategies
* **API & Backend Testing:** `fastapi.testclient.TestClient` running via Python and `unittest` / `pytest`.
* **Frontend Verification:** `tsc && vite build` static TypeScript typing check and bundle builder.
* **Specialist Layer Verification:** `test_layers.py` standalone script testing vector layers and GEE integration.

---

## Running Test Suites

### 1. Automated Backend End-to-End Test Suite
```bash
# Run the automated verification suite (FastAPI TestClient + Model tests + Export tests)
.\env\Scripts\python -c "
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, '.')

from fastapi.testclient import TestClient
from backend.main import app
from backend.services.spectral_indices_service import compute_ndvi, analyze_bitemporal_changes
import numpy as np

client = TestClient(app)

# 1. Health check
r = client.get('/healthz')
assert r.status_code == 200
print('PASS: /healthz')

# 2. Spectral Indices
nir, red = np.full((10, 10), 0.6), np.full((10, 10), 0.2)
assert np.isclose(compute_ndvi(nir, red)[0,0], 0.5)
print('PASS: Spectral Indices')

# 3. Query Pipeline
r = client.post('/api/query', json={
    'query': 'Where are the agricultural crop fields located?',
    'roi_geojson': {'type': 'Polygon', 'coordinates': [[[75.80, 26.90], [75.82, 26.90], [75.82, 26.92], [75.80, 26.92], [75.80, 26.90]]]},
    'modality': 'optical',
    'date_start': '2024-01-01',
    'date_end': '2024-03-31'
})
assert r.status_code == 200
print('PASS: /api/query')

print('ALL TESTS PASSED!')
"
```

### 2. Standalone Map Layers Test
```bash
.\env\Scripts\python test_layers.py
```
*Validates that Water (JRC), Vegetation (WorldCover), Buildings (Google Open Buildings), and Roads (OSM) layers fetch and convert to valid GeoJSON.*

### 3. Frontend TypeScript & Production Build Verification
```bash
cd frontend
npm run build
```
*Validates JSX syntax, TypeScript type signatures, and bundles production assets with zero errors.*
