"""
Change-VQA specialist model.

Fine-tuned on CDVQA using QLoRA with a bi-temporal (before/after side-by-side) approach.
Base: llava-hf/llava-1.5-7b-hf
Adapter: mokshda/satquery-ai-change-vqa-lora (Hugging Face Hub, private)

Task handled:
  - change_vqa — answer questions about what changed between two temporal images
"""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any, Dict, List

try:
    from .base_model import SpecialistModel
except ImportError:
    from models.base_model import SpecialistModel

logger = logging.getLogger(__name__)

HF_BASE_MODEL   = "llava-hf/llava-1.5-7b-hf"
HF_ADAPTER_REPO = "mokshda/satquery-ai-change-vqa-lora"
WEIGHTS_DIR     = Path(__file__).parent / "weights" / "change_vqa"


class ChangeVQAModel(SpecialistModel):
    name = "change_vqa"

    def __init__(self) -> None:
        self._model = None
        self._processor = None
        self._loaded = False

    def _load(self) -> None:
        if self._loaded:
            return
        try:
            import torch
            from transformers import LlavaForConditionalGeneration, AutoProcessor, BitsAndBytesConfig
            from peft import PeftModel

            logger.info("[ChangeVQAModel] Loading %s + %s", HF_BASE_MODEL, HF_ADAPTER_REPO)
            hf_token = os.environ.get("HF_TOKEN")
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True, bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.bfloat16, bnb_4bit_use_double_quant=True,
            )
            self._processor = AutoProcessor.from_pretrained(HF_ADAPTER_REPO, token=hf_token)
            base = LlavaForConditionalGeneration.from_pretrained(
                HF_BASE_MODEL, quantization_config=bnb_config,
                device_map="auto", torch_dtype=torch.bfloat16, token=hf_token,
            )
            self._model = PeftModel.from_pretrained(base, HF_ADAPTER_REPO, token=hf_token)
            self._model.eval()
            self._loaded = True
            logger.info("[ChangeVQAModel] Loaded successfully.")
        except Exception as exc:
            logger.warning("[ChangeVQAModel] Could not load weights (%s). Using stub.", exc)

    # ------------------------------------------------------------------

    def validate_input(self, images: List[Any], metadata: Dict[str, Any]) -> bool:
        if len(images) < 2:
            raise ValueError(
                f"ChangeVQAModel requires exactly 2 images (before/after). Got {len(images)}."
            )
        if not metadata.get("date_start") or not metadata.get("date_start_2"):
            raise ValueError(
                "ChangeVQAModel requires date_start and date_start_2 for bi-temporal analysis."
            )
        return True

    def run(
        self,
        images: List[Any],
        query: str,
        metadata: Dict[str, Any],
    ) -> Dict[str, Any]:
        self._load()

        date1 = metadata.get("date_start", "T1")
        date2 = metadata.get("date_start_2", "T2")

        if self._loaded and self._model is not None:
            try:
                import torch
                from PIL import Image as PILImage

                def to_pil(img):
                    if hasattr(img, "mode"):
                        return img
                    return PILImage.open(str(img)).convert("RGB")

                before = to_pil(images[0])
                after  = to_pil(images[1])

                # Concatenate before/after side-by-side (matches training strategy)
                combined = PILImage.new("RGB", (before.width + after.width, before.height))
                combined.paste(before, (0, 0))
                combined.paste(after, (before.width, 0))

                conversation = [
                    {
                        "role": "user",
                        "content": [
                            {"type": "image"},
                            {"type": "text", "text": f"[Before ({date1}) | After ({date2})] {query}"},
                        ],
                    }
                ]
                prompt = self._processor.apply_chat_template(conversation, add_generation_prompt=True)
                inputs = self._processor(
                    text=prompt, images=combined, return_tensors="pt"
                ).to(self._model.device)

                with torch.no_grad():
                    out = self._model.generate(**inputs, max_new_tokens=200, do_sample=False)
                answer = self._processor.decode(out[0], skip_special_tokens=True)
                answer = answer.split("ASSISTANT:")[-1].strip()

                return {
                    "answer": answer,
                    "confidence": 0.78,
                    "evidence": None,
                    "segmentation_mask": None,
                }
            except Exception as exc:
                logger.error("[ChangeVQAModel] Inference error: %s", exc)

        # ── Vision fallback: encode both images + build rich prompts ────────
        stub_answer = None

        def _img_to_b64(img) -> tuple:
            import base64, io
            from PIL import Image as PILImage
            if not hasattr(img, "mode"):
                img = PILImage.open(str(img)).convert("RGB")
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=85)
            return base64.b64encode(buf.getvalue()).decode(), "image/jpeg"

        # Encode before/after images
        before_b64, before_mime = None, "image/jpeg"
        after_b64, after_mime = None, "image/jpeg"
        try:
            if len(images) >= 1:
                before_b64, before_mime = _img_to_b64(images[0])
            if len(images) >= 2:
                after_b64, after_mime = _img_to_b64(images[1])
        except Exception as e:
            logger.warning("[ChangeVQAModel] Could not encode images: %s", e)

        # ── Build rich metadata context ──────────────────────────────────────
        sensor      = metadata.get("sensor", "Sentinel-2")
        modality    = metadata.get("modality", "optical")
        roi         = metadata.get("roi_geojson", {})
        coords      = roi.get("coordinates", [])
        ndvi_delta  = metadata.get("ndvi_delta", None)
        ndwi_delta  = metadata.get("ndwi_delta", None)
        ndbi_delta  = metadata.get("ndbi_delta", None)
        cloud1      = metadata.get("cloud_cover_pct", None)
        cloud2      = metadata.get("cloud_cover_pct_2", None)

        roi_desc = ""
        try:
            flat = [pt for ring in coords for pt in ring] if coords and isinstance(coords[0][0], list) else coords
            lons = [p[0] for p in flat]
            lats = [p[1] for p in flat]
            roi_desc = (
                f"lon [{min(lons):.4f}, {max(lons):.4f}], "
                f"lat [{min(lats):.4f}, {max(lats):.4f}]"
            )
        except Exception:
            roi_desc = "geometry provided"

        delta_block = ""
        if ndvi_delta is not None:
            direction = "increased ↑" if ndvi_delta > 0.05 else "decreased ↓" if ndvi_delta < -0.05 else "stable →"
            delta_block += f"\n  - ΔNDVI: {ndvi_delta:+.3f} ({direction}) — vegetation change indicator"
        if ndwi_delta is not None:
            direction = "wetter ↑" if ndwi_delta > 0.05 else "drier ↓" if ndwi_delta < -0.05 else "stable →"
            delta_block += f"\n  - ΔNDWI: {ndwi_delta:+.3f} ({direction}) — moisture/water change indicator"
        if ndbi_delta is not None:
            direction = "more built-up ↑" if ndbi_delta > 0.05 else "less built-up ↓" if ndbi_delta < -0.05 else "stable →"
            delta_block += f"\n  - ΔNDBI: {ndbi_delta:+.3f} ({direction}) — built-up area change indicator"

        context_block = f"""
Bi-temporal satellite imagery change analysis context:
- Sensor / Modality : {sensor} ({modality})
- Epoch 1 (BEFORE)  : {date1}{f"  [cloud cover: {cloud1:.1f}%]" if cloud1 is not None else ""}
- Epoch 2 (AFTER)   : {date2}{f"  [cloud cover: {cloud2:.1f}%]" if cloud2 is not None else ""}
- ROI               : {roi_desc}{("\\nSpectral change indices (epoch2 − epoch1):" + delta_block) if delta_block else ""}
""".strip()

        # ── System prompt ────────────────────────────────────────────────────
        SYSTEM_PROMPT = (
            "You are a senior remote-sensing change detection analyst specialising in "
            "multi-temporal satellite image analysis, land-cover transition mapping, "
            "and geospatial intelligence reporting. "
            "You are given a BEFORE image and an AFTER image of the same geographic area, "
            "along with structured metadata including spectral change indices. "
            "Rules:\n"
            "• Compare the two images pixel-by-pixel in your reasoning.\n"
            "• Identify and describe specific changed regions: location within the image, "
            "  approximate extent, and change type (new construction, deforestation, "
            "  flooding, agricultural harvest, urban sprawl, etc.).\n"
            "• Quantify where possible (e.g., '~15% of the northern sector shows new impervious surface').\n"
            "• Reference spectral delta values (ΔNDVI, ΔNDWI, ΔNDBI) if provided.\n"
            "• Distinguish between seasonal/phenological change and permanent land-use change.\n"
            "• Do NOT fabricate statistics. Ground every claim in observable evidence.\n"
            "• Write in the style of a professional geospatial intelligence report."
        )

        # ── User prompt ──────────────────────────────────────────────────────
        USER_PROMPT = (
            f"{context_block}\n\n"
            f"User question: {query}\n\n"
            "Task: Analyze both satellite images and answer the question precisely.\n\n"
            "Structure your response as:\n"
            "1. Summary of observed changes (what changed, where, how much)\n"
            "2. Change classification (land-cover type transitions detected)\n"
            "3. Spectral evidence (reference ΔNDVI/ΔNDWI/ΔNDBI if available)\n"
            "4. Direct answer to the user's question\n"
            "5. Confidence level and any caveats (cloud cover, image resolution, etc.)"
        )

        # 1) Anthropic Claude Vision
        try:
            import anthropic
            anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
            if anthropic_key and not anthropic_key.startswith("your-"):
                client = anthropic.Anthropic(api_key=anthropic_key)
                content: list = []
                if before_b64:
                    content.append({"type": "text", "text": f"[BEFORE — {date1}]"})
                    content.append({"type": "image", "source": {"type": "base64", "media_type": before_mime, "data": before_b64}})
                if after_b64:
                    content.append({"type": "text", "text": f"[AFTER — {date2}]"})
                    content.append({"type": "image", "source": {"type": "base64", "media_type": after_mime, "data": after_b64}})
                content.append({"type": "text", "text": USER_PROMPT})

                msg = client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=600,
                    system=SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": content}],
                )
                stub_answer = msg.content[0].text.strip()
                logger.info("[ChangeVQAModel] Anthropic vision fallback succeeded.")
        except Exception as e:
            logger.warning("[ChangeVQAModel] Anthropic vision fallback failed: %s", e)

        # 2) OpenAI GPT-4o-mini Vision
        if not stub_answer:
            try:
                import openai
                client = openai.OpenAI()
                content_parts: list = []
                if before_b64:
                    content_parts.append({"type": "text", "text": f"[BEFORE — {date1}]"})
                    content_parts.append({"type": "image_url", "image_url": {"url": f"data:{before_mime};base64,{before_b64}", "detail": "high"}})
                if after_b64:
                    content_parts.append({"type": "text", "text": f"[AFTER — {date2}]"})
                    content_parts.append({"type": "image_url", "image_url": {"url": f"data:{after_mime};base64,{after_b64}", "detail": "high"}})
                content_parts.append({"type": "text", "text": USER_PROMPT})

                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": content_parts},
                    ],
                    max_tokens=600,
                    temperature=0.2,
                )
                stub_answer = response.choices[0].message.content.strip()
                logger.info("[ChangeVQAModel] OpenAI vision fallback succeeded.")
            except Exception as e:
                logger.error("[ChangeVQAModel] OpenAI vision fallback failed: %s", e)

        # 3) Hardcoded final fallback
        if not stub_answer:
            stub_answer = (
                f"Bi-temporal analysis ({date1} → {date2}) for: '{query[:60]}'. "
                "Change detection is pending — please configure API keys for "
                "AI-powered vision analysis."
            )

        return {
            "answer": stub_answer,
            "confidence": 0.88 if (before_b64 and after_b64) else 0.45,
            "evidence": None,
            "segmentation_mask": None,
        }


    def warm_up(self) -> None:
        logger.info("[ChangeVQAModel] warm_up() — pre-loading from HF Hub...")
        self._load()
