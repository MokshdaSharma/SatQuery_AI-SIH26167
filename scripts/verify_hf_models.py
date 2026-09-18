"""
SatQuery AI — HuggingFace Model Verification Script
====================================================
Run this before starting the backend to verify that:
  1. Your HF_TOKEN in backend/.env is valid
  2. All 3 model repos are accessible
  3. The expected weight filenames are present

Usage:
    cd SatQueryAI
    python scripts/verify_hf_models.py
"""
import os
import sys
import warnings
warnings.filterwarnings("ignore")

from pathlib import Path

# ── Load token from backend/.env ─────────────────────────────────────────────
env_path = Path(__file__).parent.parent / "backend" / ".env"
hf_token = None

if env_path.exists():
    for line in env_path.read_text().splitlines():
        if line.startswith("HF_TOKEN="):
            hf_token = line.split("=", 1)[1].strip()
            break

if not hf_token:
    hf_token = os.environ.get("HF_TOKEN", "")

print("=" * 60)
print("SatQuery AI - HuggingFace Model Verification")
print("=" * 60)

# ── Verify token via huggingface_hub ─────────────────────────────────────────
print("\n[1] Validating HF token...")
token_valid = False

try:
    from huggingface_hub import whoami, list_repo_files
    if not hf_token:
        raise ValueError("No HF_TOKEN found in backend/.env")
    info = whoami(token=hf_token)
    print("    OK Token valid - logged in as: " + info.get("name", "?"))
    token_valid = True
except ImportError:
    print("    ERROR: huggingface_hub not installed. Run: pip install huggingface_hub")
    sys.exit(1)
except Exception as e:
    print("    FAIL Token INVALID: " + str(e))
    print()
    print("    ACTION REQUIRED: Update your HF_TOKEN in backend/.env")
    print("       1. Go to: https://huggingface.co/settings/tokens")
    print("       2. Create a new token with 'Read' scope")
    print("       3. Replace HF_TOKEN=<value> in backend/.env")
    print()

# ── Check model repos ─────────────────────────────────────────────────────────
REPOS = {
    "mokshda/satquery-ai-vqa-lora": {
        "model": "VQACaptionModel (Pipeline A - VQA & Captioning)",
        "expected_files": ["adapter_config.json", "adapter_model.safetensors"],
    },
    "mokshda/satquery-ai-change-vqa-lora": {
        "model": "ChangeVQAModel (Pipeline B - Change VQA)",
        "expected_files": ["adapter_config.json", "adapter_model.safetensors"],
    },
    "mokshda/satquery-ai-change-segmentation": {
        "model": "ChangeSegmentationModel (Pipeline C - Segmentation)",
        "expected_files": ["change_segmentation_model.pt", "config.json"],
    },
}

print("\n[2] Checking model repositories...")
all_ok = True
for repo_id, info in REPOS.items():
    print("\n    Repository: " + repo_id)
    print("    Model:      " + info["model"])
    if not token_valid:
        print("    SKIP (fix HF_TOKEN first)")
        all_ok = False
        continue

    try:
        files = list(list_repo_files(repo_id, token=hf_token))
        print("    Files in repo (" + str(len(files)) + " total):")
        for fname in files:
            tick = "[OK]" if fname in info["expected_files"] else "    "
            print("      " + tick + " " + fname)

        missing = [f for f in info["expected_files"] if f not in files]
        if missing:
            print("    WARNING Missing expected files: " + str(missing))
            all_ok = False
        else:
            print("    OK All expected weight files present.")

    except Exception as e:
        print("    FAIL Error accessing repo: " + str(e))
        all_ok = False

# ── Summary ───────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
if not token_valid:
    print("STATUS: FAILED - HF token needs to be refreshed")
    print()
    print("Steps to fix:")
    print("  1. Visit https://huggingface.co/settings/tokens")
    print("  2. Click 'New token' -> Name it 'satquery-read' -> Role: Read")
    print("  3. Copy the token (starts with hf_...)")
    print("  4. Open backend/.env and replace the HF_TOKEN line with:")
    print("     HF_TOKEN=hf_<your-new-token>")
    print("  5. Re-run this script to confirm everything works")
elif all_ok:
    print("STATUS: ALL OK - Models are accessible and ready to load")
    print()
    print("Repo summary:")
    print("  Pipeline A (VQA)          -> adapter_model.safetensors (LLaVA-1.5 LoRA)")
    print("  Pipeline B (Change VQA)   -> adapter_model.safetensors (LLaVA-1.5 LoRA)")
    print("  Pipeline C (Segmentation) -> change_segmentation_model.pt (ResNet34 U-Net)")
    print()
    print("The backend loads weights lazily on first inference request.")
else:
    print("STATUS: PARTIAL - Some repos missing expected files")
    print("        Models will fall back to GPT-4o-mini stub responses.")

print("=" * 60)
