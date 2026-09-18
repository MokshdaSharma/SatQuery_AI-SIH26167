# SatQuery AI — Master Technical Blueprint & Architecture Reference

> **Complete Reverse-Engineered Technical Reference & Developer Blueprint**  
> **Repository:** `SatQueryAI` (Smart India Hackathon SIH26167 / Geospatial Multimodal Agent)  
> **Architecture Pattern:** Decoupled Controller-Specialist-Aggregator + Reactive Geospatial SPA  

---

## 🗺️ Documentation Table of Contents

| Section | Document | Summary Description |
|---|---|---|
| **00** | [`00_PROJECT_OVERVIEW.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/00_PROJECT_OVERVIEW.md) | Problem identity, target audience, technical explanation, feature matrix. |
| **01** | [`01_SYSTEM_ARCHITECTURE.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/01_SYSTEM_ARCHITECTURE.md) | High-level subsystem architecture, communication matrix, and Mermaid diagrams. |
| **02** | [`02_DIRECTORY_STRUCTURE.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/02_DIRECTORY_STRUCTURE.md) | Complete directory tree and folder responsibility inventory. |
| **03** | [`03_TECH_STACK.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/03_TECH_STACK.md) | Complete technology inventory, trade-offs, and alternative analysis. |
| **04** | [`04_SETUP_AND_INSTALLATION.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/04_SETUP_AND_INSTALLATION.md) | Step-by-step developer environment setup and execution instructions. |
| **05** | [`05_CONFIGURATION.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/05_CONFIGURATION.md) | Environment variables, `.env` templates, and credential management. |
| **06** | [`06_APPLICATION_STARTUP.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/06_APPLICATION_STARTUP.md) | Detailed startup execution trace and model pre-warm lifecycle. |
| **07** | [`07_DATA_FLOW.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/07_DATA_FLOW.md) | End-to-end data lifecycle from user prompt and map drawing to final JSON/PDF response. |
| **08** | [`08_BACKEND.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/08_BACKEND.md) | FastAPI endpoint specifications, schemas, and router dispatching. |
| **09** | [`09_FRONTEND.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/09_FRONTEND.md) | React 19 component hierarchy, Mapbox GL JS canvas, and state management. |
| **10** | [`10_DATABASE.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/10_DATABASE.md) | Ephemeral filesystem session storage architecture (`session.json`). |
| **11** | [`11_APIS.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/11_APIS.md) | Comprehensive REST API reference manual with JSON payload examples. |
| **12** | [`12_AUTHENTICATION_AND_AUTHORIZATION.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/12_AUTHENTICATION_AND_AUTHORIZATION.md) | Service authentication, security access control, and enterprise roadmap. |
| **13** | [`13_AI_ML_COMPONENTS.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/13_AI_ML_COMPONENTS.md) | Deep learning architecture, QLoRA fine-tuning, and specialist model designs. |
| **14** | [`14_EXTERNAL_SERVICES.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/14_EXTERNAL_SERVICES.md) | Google Earth Engine, Mapbox, Overpass API, and Hugging Face integration. |
| **15** | [`15_CORE_WORKFLOWS.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/15_CORE_WORKFLOWS.md) | Step-by-step execution traces for all primary user interaction flows. |
| **16** | [`16_FILE_BY_FILE_REFERENCE.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/16_FILE_BY_FILE_REFERENCE.md) | Comprehensive reference for every source file in the repository. |
| **17** | [`17_FUNCTION_CLASS_REFERENCE.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/17_FUNCTION_CLASS_REFERENCE.md) | Method signatures, parameters, return types, and internal logic. |
| **18** | [`18_ERROR_HANDLING.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/18_ERROR_HANDLING.md) | System resilience matrix and fallback strategies for network/GPU limits. |
| **19** | [`19_SECURITY.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/19_SECURITY.md) | Vulnerability analysis, secret management, and path traversal guards. |
| **20** | [`20_TESTING.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/20_TESTING.md) | Automated backend test client commands and frontend verification suites. |
| **21** | [`21_DEPLOYMENT.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/21_DEPLOYMENT.md) | Docker containerization, production Uvicorn setup, and hosting checklist. |
| **22** | [`22_PERFORMANCE.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/22_PERFORMANCE.md) | Latency breakdown, memory consumption, and optimization strategies. |
| **23** | [`23_LIMITATIONS.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/23_LIMITATIONS.md) | Confirmed platform constraints and recommended future upgrades. |
| **24** | [`24_TROUBLESHOOTING.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/24_TROUBLESHOOTING.md) | Practical issue resolution for Mapbox tokens, GEE keys, and CUDA setups. |
| **25** | [`25_DESIGN_DECISIONS.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/25_DESIGN_DECISIONS.md) | Technical rationale behind core architectural and engineering choices. |
| **26** | [`26_DEPENDENCY_ANALYSIS.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/26_DEPENDENCY_ANALYSIS.md) | Complete Python and Node.js dependency inventory and risk analysis. |
| **27** | [`27_CHANGE_IMPACT_ANALYSIS.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/27_CHANGE_IMPACT_ANALYSIS.md) | Blast radius analysis for modifying schemas, models, or service components. |
| **28** | [`28_DEVELOPER_GUIDE.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/28_DEVELOPER_GUIDE.md) | Developer onboarding guide and step-by-step instructions for extending the system. |
| **29** | [`29_GLOSSARY.md`](file:///c:/Users/Mokshda%20Sharma/Desktop/My%20Projects/SatQueryAI/SatQueryAI/docs/29_GLOSSARY.md) | Comprehensive glossary of remote sensing, GIS, and deep learning terms. |

---

## ⚡ Executive System Summary

SatQuery AI represents a complete, modular, and scientifically grounded solution to natural-language remote sensing analysis:
1. **Agentic Routing:** Non-expert natural-language questions are classified into explicit task categories and routed to domain-adapted specialist models.
2. **Earth Observation Integration:** Ingests live Sentinel-1 SAR and Sentinel-2 optical data via Google Earth Engine with automated cloud masking and on-the-fly thematic vector clipping.
3. **Scientific Explainability:** Neural model reasoning is backed by deterministic spectral index mathematics (NDVI, NDWI, NDBI, and SAR polarization ratios) and spatial GeoJSON bounding overlays.
4. **Resilience by Design:** Multi-tier fallback architecture ensures that whether running on a local development laptop without a GPU or on a high-powered cloud cluster, the platform operates seamlessly without crashing.
