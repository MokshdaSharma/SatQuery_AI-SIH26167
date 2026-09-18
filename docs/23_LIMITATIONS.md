# 23 — Limitations & Constraints

## Confirmed Project Limitations

| # | Limitation | Codebase Evidence | Operational Impact | Recommended Future Enhancement |
|---|---|---|---|---|
| **1** | **No User Authentication / RBAC** | `backend/main.py` has no JWT or OAuth middleware | API is unauthenticated; any client on the network can query endpoints | Add OAuth2 with JWT session tokens and user rate limiting |
| **2** | **Ephemeral Local Storage** | Sessions saved to `./sessions/` on host disk (`backend/main.py:68`) | Cannot scale horizontally across multi-instance clusters without shared volume | Migrate storage adapter to AWS S3, MinIO, or Google Cloud Storage |
| **3** | **No Asynchronous Task Queue** | Analysis queries run synchronously in the HTTP request lifecycle | Long-running queries ($>30\text{s}$) can trigger browser client timeouts | Integrate Redis + Celery / ARQ with WebSocket progress streaming |
| **4** | **Spatial Resolution Boundary** | GEE Sentinel-2 optical is $10\text{m/pixel}$; Sentinel-1 SAR is $10\text{m/pixel}$ | Sub-meter objects (e.g. individual cars, small solar panels) cannot be resolved | Integrate high-resolution commercial APIs (PlanetScope 3m, WorldView 0.3m, or Cartosat-2S) |
| **5** | **Cloud Cover in Optical Data** | Extreme cloud cover ($>80\%$) blocks Sentinel-2 surface reflectance | Optical VQA answers may note cloud obstruction | Prompt user to switch to SAR radar modality (`modality='sar'`) to penetrate clouds |
