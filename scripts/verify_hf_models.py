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
import urllib.request
import json
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
print("SatQuery AI — HuggingFace Model Verification")
print("=" * 60)

# ── Verify token ──────────────────────────────────────────────────────────────
print("\n[1] Validating HF token...")
token_valid = False
if hf_token:
    req = urllib.request.Request(
        "https://huggingface.co/api/whoami",
        headers={"Authorization": "Bearer " + hf_token},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            whoami = json.loads(r.read())
        print("    OK Token valid — logged in as: " + whoami.get("name", "?"))
        token_valid = True
    except urllib.error.HTTPError as e:
        print("    FAIL Token INVALID (HTTP " + str(e.code) + ")")
        print()
        print("    ACTION REQUIRED: Update your HF_TOKEN in backend/.env")
        print("       1. Go to: https://huggingface.co/settings/tokens")
        print("       2. Create a new token with 'Read' scope")
        print("       3. Replace HF_TOKEN=<value> in backend/.env")
        print()
    except Exception as e:
        print("    FAIL Could not connect: " + str(e))
else:
    print("    FAIL No HF_TOKEN found in backend/.env or environment")

# ── Check model repos ─────────────────────────────────────────────────────────
REPOS = {
    "mokshda/satquery-ai-vqa-lora": {
        "model": "VQACaptionModel (Pipeline A)",
        "expected_files": ["adapter_config.json", "adapter_model.safetensors"],
    },
    "mokshda/satquery-ai-change-vqa-lora": {
        "model": "ChangeVQAModel (Pipeline B)",
        "expected_files": ["adapter_config.json", "adapter_model.safetensors"],
    },
    "mokshda/satquery-ai-change-segmentation": {
        "model": "ChangeSegmentationModel (Pipeline C)",
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

    url = "https://huggingface.co/api/models/" + repo_id
    req = urllib.request.Request(
        url, headers={"Authorization": "Bearer " + hf_token}
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            data = json.loads(r.read())
        siblings = data.get("siblings", [])
        filenames = [s.get("rfilename", "?") for s in siblings]
        print("    Files in repo (" + str(len(filenames)) + " total):")
        for fname in filenames:
            size = next((s.get("size", "?") for s in siblings if s.get("rfilename") == fname), "?")
            mb = (str(round(size / 1_000_000, 1)) + " MB") if isinstance(size, int) else "?"
            tick = "[OK]" if fname in info["expected_files"] else "    "
            print("      " + tick + " " + fname.ljust(50) + " " + mb)

        missing = [f for f in info["expected_files"] if f not in filenames]
        if missing:
            print("    WARNING Missing expected files: " + str(missing))
            all_ok = False
        else:
            print("    OK All expected files present.")

    except urllib.error.HTTPError as e:
        print("    FAIL HTTP " + str(e.code) + ": Cannot access repo")
        all_ok = False
    except Exception as e:
        print("    FAIL Error: " + str(e))
        all_ok = False

# ── Summary ───────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
if not token_valid:
    print("STATUS: FAILED — HF token needs to be refreshed")
    print()
    print("Steps to fix:")
    print("  1. Visit https://huggingface.co/settings/tokens")
    print("  2. Click 'New token' -> Name it 'satquery-read' -> Role: Read")
    print("  3. Copy the token (starts with hf_...)")
    print("  4. Open backend/.env and replace the HF_TOKEN line with:")
    print("     HF_TOKEN=hf_<your-new-token>")
    print("  5. Re-run this script to confirm everything works")
elif all_ok:
    print("STATUS: ALL OK — Models are accessible and ready to load")
    print()
    print("The backend will load real fine-tuned weights when it starts.")
    print("Models load lazily on first inference request (not at startup).")
else:
    print("STATUS: PARTIAL — Some repos missing expected files")
    print("        Models will fall back to GPT-4o-mini stub responses.")

print("=" * 60)
