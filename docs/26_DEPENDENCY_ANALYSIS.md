# 26 — Dependency Analysis

## Dependency Map

### Backend Python Packages (`backend/requirements.txt`)

| Package | Version | Type | Purpose | Risk / Notes |
|---|---|---|---|---|
| `fastapi` | `>=0.115` | Direct | Core web framework & routing | Stable; high velocity |
| `uvicorn[standard]`| `>=0.30` | Direct | ASGI web server | Required for async event loop |
| `pydantic` | `>=2.8` | Direct | Schema validation & DTO serialization | Strict v2 syntax used throughout |
| `python-dotenv` | `>=1.0` | Direct | `.env` variable parsing | Standard library helper |
| `earthengine-api` | `>=1.4` | Direct | Google Earth Engine Python client | Depends on Google Cloud authentication |
| `rasterio` | `>=1.3` | Direct | GeoTIFF reading & CRS projection | C-binary GDAL wrapper |
| `shapely` | `>=2.0` | Direct | 2D vector geometry operations & clipping | Modern C-optimized Shapely 2.0 |
| `numpy` | `>=1.26` | Direct | Array mathematics & spectral index math | Core numerical foundation |
| `pillow` | `>=10.3` | Direct | Image thumbnailing & format conversion | Standard imaging library |
| `reportlab` | `>=4.2` | Direct | PDF audit report generation | Pure Python PDF drawing engine |
| `torch` | `>=2.2` | Optional / Direct | Deep learning tensor computations | Heavy (~2GB); required for local GPU inference |
| `transformers` | `>=4.40` | Optional / Direct | Hugging Face transformer models | Required for LLaVA tokenizer and processor |
| `peft` | `>=0.10` | Optional / Direct | Parameter-Efficient Fine-Tuning (LoRA) | Manages adapter weight overlays |
| `openai` | `>=1.30` | Optional | Vision API fallback client | Used when local GPU weights are unavailable |

---

### Frontend NPM Packages (`frontend/package.json`)

| Package | Version | Type | Purpose | Notes |
|---|---|---|---|---|
| `react` | `^19.0.0` | Direct | Core UI library | Modern React 19 architecture |
| `react-dom` | `^19.0.0` | Direct | DOM rendering engine | Standard React DOM |
| `mapbox-gl` | `^3.10.0` | Direct | WebGL map canvas | Heavy WebGL bundle; handles thousands of polygons |
| `@mapbox/mapbox-gl-draw` | `^1.5.0` | Direct | Polygon drawing tools | Native integration with Mapbox GL |
| `lucide-react` | `^1.16.0` | Direct | UI icon library | Modern SVG icons |
| `canvas-confetti` | `^1.9.4` | Direct | Success celebration micro-animations | Visual polish |
| `vite` | `^6.2.0` | Dev | Build tool & dev server | Ultra-fast HMR and bundling |
