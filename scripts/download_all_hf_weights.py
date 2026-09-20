"""
download_all_hf_weights.py — Pre-downloads and caches all Hugging Face model weights
into backend/models/weights/ so they are saved locally and never re-downloaded.
"""

import os
import sys
from pathlib import Path

# Force UTF-8 output on Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

from huggingface_hub import snapshot_download

# Load token from backend/.env
backend_env = Path(__file__).parent.parent / "backend" / ".env"
hf_token = os.environ.get("HF_TOKEN")
if not hf_token and backend_env.exists():
    for line in backend_env.read_text(encoding="utf-8").splitlines():
        if line.startswith("HF_TOKEN="):
            hf_token = line.split("=", 1)[1].strip()
            break

print("=" * 60)
print("SatQuery AI -- Hugging Face Weights Local Caching")
print("=" * 60)

weights_root = Path(__file__).parent.parent / "backend" / "models" / "weights"
weights_root.mkdir(parents=True, exist_ok=True)

REPOS = {
    "vqa_lora": {
        "repo_id": "mokshda/satquery-ai-vqa-lora",
        "target_dir": weights_root / "vqa_lora",
    },
    "change_vqa_lora": {
        "repo_id": "mokshda/satquery-ai-change-vqa-lora",
        "target_dir": weights_root / "change_vqa_lora",
    },
    "change_segmentation": {
        "repo_id": "mokshda/satquery-ai-change-segmentation",
        "target_dir": weights_root / "change_segmentation",
    },
}

for name, cfg in REPOS.items():
    print(f"\n[+] Caching {name} from {cfg['repo_id']}...")
    target_dir = cfg["target_dir"]
    target_dir.mkdir(parents=True, exist_ok=True)
    try:
        path = snapshot_download(
            repo_id=cfg["repo_id"],
            local_dir=str(target_dir),
            token=hf_token,
        )
        print(f"    [OK] Successfully saved to: {target_dir}")
    except Exception as e:
        print(f"    [FAIL] Download failed: {e}")

print("\n" + "=" * 60)
print("ALL WEIGHTS CACHED LOCALLY IN backend/models/weights/")
print("=" * 60)
