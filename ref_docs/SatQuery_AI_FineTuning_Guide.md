# SatQuery AI — Fine-Tuning Guide (Kaggle + QLoRA)

Companion to `SatQuery_AI_Solution_Design.md` and `SatQuery_AI_Prompts_and_Integration_Guide.md`. This is the step-by-step process for the fine-tuning pipeline referenced there, using **Kaggle Notebooks** and **QLoRA**.

> **Important — this is not one LoRA trained on everything.** Each specialist model needs its own separate adapter, trained on the dataset that actually matches its task:
>
> | Specialist model | Trained on | Evaluated on |
> |---|---|---|
> | VQA / Captioning / Grounding (base RS-adapted VLM) | BigEarthNet | VRSBench, RSVQA (test splits, not trained on) |
> | Change-VQA | CDVQA train split | CDVQA test split |
> | Change-type segmentation | SECOND train split | SECOND test split |
> | Optical–SAR fusion | BigEarthNet's paired Sentinel-1/Sentinel-2 patches | Manual/hand-labeled validation |
>
> The walkthrough below shows the process once (for the BigEarthNet → VQA/captioning model). Repeat the same steps — swap the dataset in Step 2 and the base checkpoint/task in Steps 4–7 — for the change-VQA (CDVQA) and change-segmentation (SECOND) adapters. Each run produces its own adapter, pushed to its own Hugging Face repo, loaded by its own model stub file in the backend.

---

## Step 1 — Set up the Kaggle notebook

1. Go to kaggle.com → **Code** → **New Notebook**.
2. In the right sidebar: **Accelerator → GPU T4 x2** (or P100 if offered) → **Internet → On**.
3. Under **Add-ons → Secrets**, add your Hugging Face token as a secret named `HF_TOKEN` (get it from huggingface.co/settings/tokens) — this is needed later to push the trained adapter.

## Step 2 — Attach your dataset

**Important context first:** BigEarthNet ships with **land-cover class labels only** (e.g. "Coniferous forest", "Pastures", "Water bodies") — it has no free-text captions or Q&A pairs. To fine-tune a VLM for captioning/VQA, you have to first turn those labels into synthetic text using templates. This sub-section covers that end-to-end.

### 2.1 — Get a manageable subset

BigEarthNet-S2 has ~590,000 patches — far too much for a free-tier prototype. Sample a small, class-balanced subset instead.

```python
import json
import random
from collections import defaultdict

# metadata.parquet / labels csv shipped with BigEarthNet maps patch_id -> list of BigEarthNet-19 labels
import pandas as pd

labels_df = pd.read_csv("bigearthnet_labels.csv")  # columns: patch_id, labels (list-like string)
labels_df["labels"] = labels_df["labels"].apply(eval)  # parse stringified list if needed

TARGET_PER_CLASS = 150  # tune based on how much compute/time you have

by_class = defaultdict(list)
for _, row in labels_df.iterrows():
    for label in row["labels"]:
        by_class[label].append(row["patch_id"])

selected = set()
for label, patch_ids in by_class.items():
    random.shuffle(patch_ids)
    selected.update(patch_ids[:TARGET_PER_CLASS])

print(f"Selected {len(selected)} patches across {len(by_class)} classes")
subset_df = labels_df[labels_df["patch_id"].isin(selected)]
```

### 2.2 — Convert multi-band GeoTIFFs to viewable RGB images

Each BigEarthNet-S2 patch is a folder of separate band GeoTIFFs (B01–B12). For a captioning/VQA VLM you need a standard RGB image, built from the red/green/blue bands (B04/B03/B02) with a reflectance stretch.

```python
import rasterio
import numpy as np
from PIL import Image
import os

def bigearthnet_patch_to_rgb(patch_folder, patch_id, out_path):
    def read_band(band):
        with rasterio.open(f"{patch_folder}/{patch_id}_{band}.tif") as src:
            return src.read(1).astype(np.float32)

    red, green, blue = read_band("B04"), read_band("B03"), read_band("B02")
    rgb = np.stack([red, green, blue], axis=-1)

    # simple percentile stretch so the image isn't washed out/too dark
    p2, p98 = np.percentile(rgb, (2, 98))
    rgb = np.clip((rgb - p2) / (p98 - p2), 0, 1)
    rgb_uint8 = (rgb * 255).astype(np.uint8)

    Image.fromarray(rgb_uint8).save(out_path)

os.makedirs("dataset/images", exist_ok=True)
for patch_id in subset_df["patch_id"]:
    patch_folder = f"BigEarthNet-S2/{patch_id}"
    bigearthnet_patch_to_rgb(patch_folder, patch_id, f"dataset/images/{patch_id}.jpg")
```

### 2.3 — Generate synthetic captions and Q&A pairs from the labels

Use simple templates so every image gets a caption, a "what land cover is visible" VQA pair, and a couple of yes/no questions. This is the standard workaround for turning a classification dataset into VLM training data.

```python
import random

QUESTION_TEMPLATES = [
    "What land cover types are visible in this image?",
    "Describe the land cover in this satellite image.",
]

def make_caption(labels):
    if len(labels) == 1:
        return f"This satellite image shows an area of {labels[0].lower()}."
    return f"This satellite image shows a mix of {', '.join(l.lower() for l in labels[:-1])} and {labels[-1].lower()}."

def make_samples(patch_id, labels):
    samples = []
    caption = make_caption(labels)

    # captioning pair
    samples.append({
        "image": f"{patch_id}.jpg",
        "question": random.choice(QUESTION_TEMPLATES),
        "answer": caption,
    })

    # yes/no VQA pair for a random present class
    present = random.choice(labels)
    samples.append({
        "image": f"{patch_id}.jpg",
        "question": f"Is {present.lower()} present in this image?",
        "answer": "Yes.",
    })

    # yes/no VQA pair for a random absent class (helps the model learn to say no too)
    all_classes = list(by_class.keys())
    absent_candidates = [c for c in all_classes if c not in labels]
    if absent_candidates:
        absent = random.choice(absent_candidates)
        samples.append({
            "image": f"{patch_id}.jpg",
            "question": f"Is {absent.lower()} present in this image?",
            "answer": "No.",
        })

    return samples

all_samples = []
for _, row in subset_df.iterrows():
    all_samples.extend(make_samples(row["patch_id"], row["labels"]))

with open("dataset/train_annotations.json", "w") as f:
    json.dump(all_samples, f, indent=2)

print(f"Generated {len(all_samples)} question-answer pairs")
```

You should end up with a `dataset/` folder shaped like:
```
dataset/
  images/
    S2A_MSIL2A_...patch1.jpg
    S2A_MSIL2A_...patch2.jpg
    ...
  train_annotations.json
```

*Optional improvement: if you have time, replace the templates with an LLM-generated paraphrase pass (e.g. run each templated caption through a free open LLM to add natural variety) — this reduces the repetitive-phrasing bias that pure templates introduce, and is worth doing if your fine-tuned model starts sounding robotic.*

### 2.4 — Upload it as a Kaggle Dataset

1. Zip the `dataset/` folder locally: `zip -r bigearthnet_subset.zip dataset/`
2. Go to kaggle.com → **Datasets → New Dataset**.
3. Drag in `bigearthnet_subset.zip` (or the unzipped folder), give it a title (e.g. "BigEarthNet VQA Subset"), set visibility (private is fine for a prototype), and click **Create**.
4. Alternative — script it with the Kaggle CLI instead of the web UI:
   ```bash
   pip install kaggle
   # place your kaggle.json API token in ~/.kaggle/kaggle.json first
   kaggle datasets init -p dataset/
   # edit the generated dataset-metadata.json (title, id) then:
   kaggle datasets create -p dataset/
   ```
5. **Skip 2.1–2.4 entirely** if a public BigEarthNet-derived dataset already on Kaggle happens to match your target format — search Kaggle Datasets for "BigEarthNet" first before doing this preprocessing yourself.

### 2.5 — Attach it to your training notebook

1. Open your training notebook → right sidebar → **Add Input**.
2. Search for the dataset name you just created (or the public one you chose) → click **Add**.
3. It mounts read-only at `/kaggle/input/<dataset-name>/`. Confirm the paths line up with what your `RSImageTextDataset` class expects (Step 6 below):
   ```python
   import os
   print(os.listdir("/kaggle/input/bigearthnet-vqa-subset/"))
   print(os.listdir("/kaggle/input/bigearthnet-vqa-subset/dataset/images")[:5])
   ```

## Step 3 — Install dependencies

```python
!pip install -q -U transformers accelerate peft bitsandbytes datasets pillow huggingface_hub
```

## Step 4 — Load the base model in 4-bit (QLoRA setup)

```python
import torch
from transformers import AutoModelForCausalLM, AutoProcessor, BitsAndBytesConfig

BASE_MODEL = "liuhaotian/llava-v1.5-7b"  # swap for your chosen RS-adapted checkpoint (e.g. a GeoChat weights repo)

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,
)

processor = AutoProcessor.from_pretrained(BASE_MODEL)

model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL,
    quantization_config=bnb_config,
    device_map="auto",
    torch_dtype=torch.bfloat16,
)
```

*Note: the exact model/processor classes depend on the specific checkpoint you choose (LLaVA-style vs a different VLM architecture) — check that checkpoint's model card on Hugging Face for the correct `AutoModel...` class if it differs from a standard causal LM wrapper.*

## Step 5 — Attach LoRA adapters

```python
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training

model = prepare_model_for_kbit_training(model)

lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],  # attention projections; add "gate_proj","up_proj","down_proj" for MLP too if VRAM allows
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()  # sanity check — should show a small % of total params
```

## Step 6 — Build the dataset

```python
import json
from PIL import Image
from torch.utils.data import Dataset

class RSImageTextDataset(Dataset):
    def __init__(self, json_path, image_root, processor, max_length=512):
        with open(json_path) as f:
            self.samples = json.load(f)  # list of {"image": "...", "question": "...", "answer": "..."}
        self.image_root = image_root
        self.processor = processor
        self.max_length = max_length

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        item = self.samples[idx]
        image = Image.open(f"{self.image_root}/{item['image']}").convert("RGB")
        prompt = f"USER: <image>\n{item['question']}\nASSISTANT: {item['answer']}"
        encoded = self.processor(
            text=prompt,
            images=image,
            return_tensors="pt",
            padding="max_length",
            truncation=True,
            max_length=self.max_length,
        )
        encoded = {k: v.squeeze(0) for k, v in encoded.items()}
        encoded["labels"] = encoded["input_ids"].clone()
        return encoded

train_dataset = RSImageTextDataset(
    json_path="/kaggle/input/<dataset-name>/train_annotations.json",
    image_root="/kaggle/input/<dataset-name>/images",
    processor=processor,
)
```

## Step 7 — Train

```python
from transformers import TrainingArguments, Trainer

training_args = TrainingArguments(
    output_dir="/kaggle/working/satquery-lora",
    per_device_train_batch_size=2,
    gradient_accumulation_steps=8,   # effective batch size 16, keeps VRAM low
    num_train_epochs=3,
    learning_rate=2e-4,
    fp16=False,
    bf16=True,
    logging_steps=10,
    save_strategy="epoch",
    save_total_limit=2,
    gradient_checkpointing=True,
    report_to="none",
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
)

trainer.train()
```

*If a session times out mid-training, Kaggle keeps your `/kaggle/working` output — reload the last checkpoint with `model = PeftModel.from_pretrained(base_model, "/kaggle/working/satquery-lora/checkpoint-XXXX")` and resume in a new session.*

## Step 8 — Save and push the adapter to Hugging Face

```python
from huggingface_hub import login
from kaggle_secrets import UserSecretsClient

hf_token = UserSecretsClient().get_secret("HF_TOKEN")
login(token=hf_token)

model.save_pretrained("/kaggle/working/satquery-lora-final")
processor.save_pretrained("/kaggle/working/satquery-lora-final")

model.push_to_hub("your-username/satquery-ai-vqa-lora", token=hf_token)
processor.push_to_hub("your-username/satquery-ai-vqa-lora", token=hf_token)
```

## Step 9 — Load it in the backend (this is the piece from the earlier guide)

```python
# backend/models/vqa_caption_model.py
import torch
from transformers import AutoModelForCausalLM, AutoProcessor, BitsAndBytesConfig
from peft import PeftModel

BASE_MODEL = "liuhaotian/llava-v1.5-7b"
ADAPTER_REPO = "your-username/satquery-ai-vqa-lora"

bnb_config = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_compute_dtype=torch.bfloat16)

processor = AutoProcessor.from_pretrained(ADAPTER_REPO)
base_model = AutoModelForCausalLM.from_pretrained(BASE_MODEL, quantization_config=bnb_config, device_map="auto")
model = PeftModel.from_pretrained(base_model, ADAPTER_REPO)
model.eval()
```

Repeat steps 1–9 separately for each specialist model (change-VQA on CDVQA, change-type segmentation on SECOND, etc.) — each gets its own dataset, its own LoRA adapter, and its own Hugging Face repo, all loaded independently by their respective model stub files.

## Step 10 — Track what's been trained

Keep a simple table (in your report or README) of: dataset used, base checkpoint, adapter repo URL, training date, and eval metric — this becomes both your audit trail and your PPT evidence that each component was properly RS-adapted.
