# 29 — Technical Glossary

## Geospatial, Remote Sensing & AI Terminology

| Term / Acronym | Definition | Context in SatQuery AI |
|---|---|---|
| **ROI** | Region of Interest | The spatial bounding box or polygon drawn by the user on the map defining the geographic boundary of the analysis. |
| **SAR** | Synthetic Aperture Radar | Active microwave radar imaging (Sentinel-1) that illuminates the Earth's surface and records backscatter intensity; penetrates clouds, smoke, and operates day or night. |
| **Optical Imagery** | Passive multispectral imagery (Sentinel-2) recording solar reflectance across visible, near-infrared, and shortwave-infrared bands. |
| **NDVI** | Normalized Difference Vegetation Index | Computed as $(NIR - Red) / (NIR + Red)$. Quantifies live green vegetation density and vigour. |
| **NDWI** | Normalized Difference Water Index | Computed as $(Green - NIR) / (Green + NIR)$. Highlights open water bodies and surface moisture. |
| **NDBI** | Normalized Difference Built-up Index | Computed as $(SWIR - NIR) / (SWIR + NIR)$. Emphasizes built-up urban infrastructure and concrete surfaces. |
| **VV / VH Polarization** | Vertical-Transmit Vertical-Receive ($VV$) and Vertical-Transmit Horizontal-Receive ($VH$) radar backscatter. | $VV$ highlights surface roughness and double-bounce scattering off buildings; $VH$ captures volume scattering within tree canopies. |
| **QLoRA** | Quantized Low-Rank Adaptation | Parameter-efficient fine-tuning method that keeps base 7B LLM weights frozen in 4-bit NormalFloat precision while training lightweight adapter matrices on attention layers. |
| **VLM** | Vision-Language Model | Multimodal neural network (e.g. LLaVA-1.5-7B) combining a vision encoder (CLIP ViT) with an LLM decoder to reason over image-text inputs. |
| **Bi-Temporal Analysis** | Two-epoch comparison ($T_1$ vs. $T_2$) | Compares satellite observations across two distinct dates to isolate temporal changes. |
| **CRS** | Coordinate Reference System | Mathematical framework defining spatial positions on Earth (e.g. EPSG:4326 for WGS-84 longitude/latitude). |
| **GeoTIFF** | Geospatial Tagged Image File Format | Standard raster image format with embedded spatial metadata, map projection, and coordinate bounding boxes. |
| **GeoJSON** | Geospatial JavaScript Object Notation | Open standard JSON format representing spatial features (`Polygon`, `LineString`, `Point`, `FeatureCollection`). |
| **GEE** | Google Earth Engine | Cloud computing platform hosting petabytes of Earth observation data collections. |
| **Overpass API** | Read-only API serving custom OpenStreetMap vector geometries on demand. |
