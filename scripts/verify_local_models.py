import os
import sys
from pathlib import Path

# Add workspace root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

print("=" * 60)
print("Verifying Local Model Weights Loading")
print("=" * 60)

# 1. ChangeSegmentationModel
print("\n[1] Testing ChangeSegmentationModel...")
try:
    from backend.models.change_segmentation_model import ChangeSegmentationModel
    seg_model = ChangeSegmentationModel()
    seg_model._load()
    print(f"    Loaded: {seg_model._loaded}")
    print(f"    Config: {seg_model._model_config}")
except Exception as e:
    print(f"    Failed: {e}")

# 2. VQACaptionModel Check
print("\n[2] Testing VQACaptionModel weight discovery...")
try:
    from backend.models.vqa_caption_model import VQACaptionModel, WEIGHTS_DIR
    vqa = VQACaptionModel()
    print(f"    Local weights directory: {WEIGHTS_DIR}")
    print(f"    adapter_config exists: {(WEIGHTS_DIR / 'adapter_config.json').exists()}")
    print(f"    adapter_model exists: {(WEIGHTS_DIR / 'adapter_model.safetensors').exists()}")
except Exception as e:
    print(f"    Failed: {e}")

# 3. ChangeVQAModel Check
print("\n[3] Testing ChangeVQAModel weight discovery...")
try:
    from backend.models.change_vqa_model import ChangeVQAModel, WEIGHTS_DIR as CVQA_DIR
    cvqa = ChangeVQAModel()
    print(f"    Local weights directory: {CVQA_DIR}")
    print(f"    adapter_config exists: {(CVQA_DIR / 'adapter_config.json').exists()}")
    print(f"    adapter_model exists: {(CVQA_DIR / 'adapter_model.safetensors').exists()}")
except Exception as e:
    print(f"    Failed: {e}")

print("\n" + "=" * 60)
print("Verification complete.")
print("=" * 60)
