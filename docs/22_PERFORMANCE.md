# 22 — Performance & Scalability Analysis

## Performance Characteristics & Bottlenecks

| Pipeline Stage | Typical Latency | Primary Bottleneck | Optimization Mechanism in Place | Further Scalability Strategy |
|---|---|---|---|---|
| **Task Classification & Validation** | $1 - 5 \text{ ms}$ | CPU (Python dictionary & regex parsing) | In-memory lookup tables | Negligible; sub-millisecond |
| **GEE Imagery Query & Cloud Masking** | $1.5 - 4.0 \text{ s}$ | Network / Google Earth Engine computation | QA60 bitmask expressions computed server-side on GEE infrastructure | Cache tile thumbnail URLs by ROI spatial hash |
| **Specialist Inference (4-bit GPU)** | $0.8 - 2.5 \text{ s}$ | GPU VRAM bandwidth during autoregressive token generation | 4-bit `nf4` quantization + `flash-attention` | Deploy vLLM or TensorRT-LLM inference server |
| **Spectral Index Engine** | $10 - 50 \text{ ms}$ | CPU NumPy array operations | Vectorized array arithmetic (`(NIR-Red)/(NIR+Red)`) | Use Numba JIT or PyTorch GPU tensors for $>10k \times 10k$ rasters |
| **Thematic Layer Vectorization** | $0.5 - 2.0 \text{ s}$ | GEE `reduceToVectors` polygon conversion | Bounding box spatial clipping | Pre-generate vector tiles for static regions |
| **PDF Report Generation** | $150 - 350 \text{ ms}$ | Disk I/O & ReportLab canvas layout | In-memory table drawing | Async background task via Celery / Redis |

---

## Memory & Hardware Footprint
* **CPU Mode (Lightweight Gateway):** Consumes ~250MB - 400MB system RAM.
* **Full Local GPU Mode (4-bit LLaVA-1.5-7B):** Consumes ~5.5GB GPU VRAM per active model worker.
* **Browser Client:** Consumes ~120MB - 250MB browser RAM (WebGL Mapbox context handles thousands of vector polygons at 60 FPS).
