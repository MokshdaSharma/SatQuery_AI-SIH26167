# SatQuery AI — Complete Kaggle Training Pipeline (All Datasets, All Models)

Companion to `SatQuery_AI_FineTuning_Guide.md`. This file contains the **full, runnable pipeline** for every specialist model, using the dataset-to-model mapping established earlier:

| Pipeline | Model | Dataset | Kaggle strategy |
|---|---|---|---|
| A | VQA / Captioning / Grounding (base RS-VLM) | BigEarthNet | **Option B** — preprocess once, upload as your own Kaggle Dataset |
| B | Change-VQA | CDVQA | Option A — fetch live from GitHub each session |
| C | Change-type segmentation | SECOND | Option A (with a manual download step — see note in Pipeline C) |
| Eval | Accuracy check on the base VLM | VRSBench, RSVQA | Option A — fetch live, inference only, never trained on |

Run Pipelines A, B, and C as **three separate Kaggle notebooks** — each is its own 30-min-to-several-hour job, and keeping them separate makes debugging and resuming much easier than one giant notebook.

---

## Pipeline A — BigEarthNet → VQA / Captioning / Grounding adapter

### A.1 — Preprocess locally or in a scratch notebook (Option B, Step 1)

*(This reproduces the full walkthrough from `SatQuery_AI_FineTuning_Guide.md` Step 2 — included here for completeness.)*

```python
import pandas as pd, random, json, os
from collections import defaultdict
import rasterio
import numpy as np
from PIL import Image

# --- 1. Sample a class-balanced subset ---
labels_df = pd.read_csv("bigearthnet_labels.csv")
labels_df["labels"] = labels_df["labels"].apply(eval)

TARGET_PER_CLASS = 150
by_class = defaultdict(list)
for _, row in labels_df.iterrows():
    for label in row["labels"]:
        by_class[label].append(row["patch_id"])

selected = set()
for label, patch_ids in by_class.items():
    random.shuffle(patch_ids)
    selected.update(patch_ids[:TARGET_PER_CLASS])

subset_df = labels_df[labels_df["patch_id"].isin(selected)]
print(f"Selected {len(subset_df)} patches across {len(by_class)} classes")

# --- 2. Convert multi-band GeoTIFFs to RGB JPEGs ---
def bigearthnet_patch_to_rgb(patch_folder, patch_id, out_path):
    def read_band(band):
        with rasterio.open(f"{patch_folder}/{patch_id}_{band}.tif") as src:
            return src.read(1).astype(np.float32)
    red, green, blue = read_band("B04"), read_band("B03"), read_band("B02")
    rgb = np.stack([red, green, blue], axis=-1)
    p2, p98 = np.percentile(rgb, (2, 98))
    rgb = np.clip((rgb - p2) / (p98 - p2), 0, 1)
    Image.fromarray((rgb * 255).astype(np.uint8)).save(out_path)

os.makedirs("dataset/images", exist_ok=True)
for patch_id in subset_df["patch_id"]:
    bigearthnet_patch_to_rgb(f"BigEarthNet-S2/{patch_id}", patch_id, f"dataset/images/{patch_id}.jpg")

# --- 3. Generate synthetic captions + Q&A pairs ---
QUESTION_TEMPLATES = [
    "What land cover types are visible in this image?",
    "Describe the land cover in this satellite image.",
]

def make_caption(labels):
    if len(labels) == 1:
        return f"This satellite image shows an area of {labels[0].lower()}."
    return f"This satellite image shows a mix of {', '.join(l.lower() for l in labels[:-1])} and {labels[-1].lower()}."

def make_samples(patch_id, labels):
    samples = [{
        "image": f"{patch_id}.jpg",
        "question": random.choice(QUESTION_TEMPLATES),
        "answer": make_caption(labels),
    }]
    present = random.choice(labels)
    samples.append({"image": f"{patch_id}.jpg", "question": f"Is {present.lower()} present in this image?", "answer": "Yes."})
    absent_candidates = [c for c in by_class if c not in labels]
    if absent_candidates:
        absent = random.choice(absent_candidates)
        samples.append({"image": f"{patch_id}.jpg", "question": f"Is {absent.lower()} present in this image?", "answer": "No."})
    return samples

all_samples = []
for _, row in subset_df.iterrows():
    all_samples.extend(make_samples(row["patch_id"], row["labels"]))

with open("dataset/train_annotations.json", "w") as f:
    json.dump(all_samples, f, indent=2)

print(f"Generated {len(all_samples)} question-answer pairs")
```

### A.2 — Upload as a Kaggle Dataset

```bash
zip -r bigearthnet_subset.zip dataset/
pip install kaggle
# place kaggle.json API token in ~/.kaggle/kaggle.json first
kaggle datasets init -p dataset/
# edit the generated dataset-metadata.json (set title/id), then:
kaggle datasets create -p dataset/
```

### A.3 — Training notebook (Kaggle, GPU T4x2/P100, Internet ON)

```python
# --- install ---
!pip install -q -U transformers accelerate peft bitsandbytes datasets pillow huggingface_hub

# --- attach dataset via "Add Input" first, then confirm the mount ---
import os
print(os.listdir("/kaggle/input/bigearthnet-vqa-subset/dataset/images")[:5])

# --- load base model in 4-bit ---
import torch
from transformers import AutoModelForCausalLM, AutoProcessor, BitsAndBytesConfig

BASE_MODEL = "liuhaotian/llava-v1.5-7b"  # swap for your chosen RS-adapted checkpoint
bnb_config = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4",
                                 bnb_4bit_compute_dtype=torch.bfloat16, bnb_4bit_use_double_quant=True)
processor = AutoProcessor.from_pretrained(BASE_MODEL)
model = AutoModelForCausalLM.from_pretrained(BASE_MODEL, quantization_config=bnb_config,
                                              device_map="auto", torch_dtype=torch.bfloat16)

# --- attach LoRA ---
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
model = prepare_model_for_kbit_training(model)
lora_config = LoraConfig(r=16, lora_alpha=32, target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
                          lora_dropout=0.05, bias="none", task_type="CAUSAL_LM")
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()

# --- dataset ---
import json
from PIL import Image
from torch.utils.data import Dataset

class RSImageTextDataset(Dataset):
    def __init__(self, json_path, image_root, processor, max_length=512):
        with open(json_path) as f:
            self.samples = json.load(f)
        self.image_root, self.processor, self.max_length = image_root, processor, max_length

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        item = self.samples[idx]
        image = Image.open(f"{self.image_root}/{item['image']}").convert("RGB")
        prompt = f"USER: <image>\n{item['question']}\nASSISTANT: {item['answer']}"
        encoded = self.processor(text=prompt, images=image, return_tensors="pt",
                                  padding="max_length", truncation=True, max_length=self.max_length)
        encoded = {k: v.squeeze(0) for k, v in encoded.items()}
        encoded["labels"] = encoded["input_ids"].clone()
        return encoded

train_dataset = RSImageTextDataset(
    json_path="/kaggle/input/bigearthnet-vqa-subset/dataset/train_annotations.json",
    image_root="/kaggle/input/bigearthnet-vqa-subset/dataset/images",
    processor=processor,
)

# --- train ---
from transformers import TrainingArguments, Trainer
training_args = TrainingArguments(
    output_dir="/kaggle/working/satquery-vqa-lora", per_device_train_batch_size=2,
    gradient_accumulation_steps=8, num_train_epochs=3, learning_rate=2e-4, bf16=True,
    logging_steps=10, save_strategy="epoch", save_total_limit=2,
    gradient_checkpointing=True, report_to="none",
)
trainer = Trainer(model=model, args=training_args, train_dataset=train_dataset)
trainer.train()

# --- push to Hugging Face ---
from huggingface_hub import login
from kaggle_secrets import UserSecretsClient
hf_token = UserSecretsClient().get_secret("HF_TOKEN")
login(token=hf_token)
model.save_pretrained("/kaggle/working/satquery-vqa-lora-final")
processor.save_pretrained("/kaggle/working/satquery-vqa-lora-final")
model.push_to_hub("your-username/satquery-ai-vqa-lora", token=hf_token)
processor.push_to_hub("your-username/satquery-ai-vqa-lora", token=hf_token)
```

---

## Pipeline B — CDVQA → Change-VQA adapter

CDVQA's question/answer JSONs live directly in the GitHub repo; the underlying bi-temporal images are referenced by filename and come from CDVQA's paired base change-detection image set — check the repo's `README.md` at clone time to confirm the current image source, since this can change.

### B.1 — Fetch (Option A, live)

```python
!git clone https://github.com/YZHJessica/CDVQA.git /kaggle/working/CDVQA
import json
with open("/kaggle/working/CDVQA/Train_questions.json") as f:
    train_questions = json.load(f)
with open("/kaggle/working/CDVQA/Train_answers.json") as f:
    train_answers = json.load(f)
with open("/kaggle/working/CDVQA/Train_images.json") as f:
    train_images = json.load(f)
# inspect structure before building the dataset class — field names vary by release
print(train_questions[:2], train_answers[:2], train_images[:2])
```

### B.2 — Bi-temporal model wrapper

A standard single-image VLM processor can't take two images at once. The simplest effective approach for a prototype: encode both images separately with the frozen vision tower, concatenate their token sequences, and feed both into the LLM alongside the question — this lets the model attend across both dates without redesigning the architecture.

```python
import torch
from torch import nn

class BiTemporalVLMWrapper(nn.Module):
    """Wraps a base VLM to accept two images (before/after) instead of one."""
    def __init__(self, base_model, vision_tower, projector):
        super().__init__()
        self.base_model = base_model      # the LoRA-wrapped LLM from Pipeline A (or a fresh load)
        self.vision_tower = vision_tower  # frozen CLIP-style encoder
        self.projector = projector        # frozen or lightly-tuned projector

    def encode_image(self, pixel_values):
        with torch.no_grad():
            features = self.vision_tower(pixel_values).last_hidden_state
        return self.projector(features)

    def forward(self, pixel_values_before, pixel_values_after, input_ids, attention_mask, labels=None):
        tokens_before = self.encode_image(pixel_values_before)
        tokens_after = self.encode_image(pixel_values_after)
        image_tokens = torch.cat([tokens_before, tokens_after], dim=1)  # concat along sequence dim
        # feed image_tokens + text embeddings into base_model's forward — exact wiring
        # depends on your chosen base architecture's embedding API; consult its model card.
        return self.base_model(inputs_embeds=image_tokens, attention_mask=attention_mask, labels=labels)
```

*Note: the exact embedding-injection call (`inputs_embeds` vs a custom `multimodal_forward`) depends on which base checkpoint you picked in Pipeline A — check that model's source code for how it merges image and text embeddings, and mirror that pattern here for two images instead of one.*

### B.3 — Dataset + LoRA training (same shape as Pipeline A)

```python
from torch.utils.data import Dataset
from PIL import Image

class CDVQADataset(Dataset):
    def __init__(self, questions, answers, images, image_root, processor):
        self.questions, self.answers, self.images = questions, answers, images
        self.image_root, self.processor = image_root, processor

    def __len__(self):
        return len(self.questions)

    def __getitem__(self, idx):
        q = self.questions[idx]
        a = self.answers[idx]
        before_path, after_path = self.images[idx]["before"], self.images[idx]["after"]  # adjust to actual keys
        before_img = Image.open(f"{self.image_root}/{before_path}").convert("RGB")
        after_img = Image.open(f"{self.image_root}/{after_path}").convert("RGB")
        before_pixels = self.processor(images=before_img, return_tensors="pt")["pixel_values"].squeeze(0)
        after_pixels = self.processor(images=after_img, return_tensors="pt")["pixel_values"].squeeze(0)
        text = self.processor.tokenizer(f"{q}\nASSISTANT: {a}", return_tensors="pt",
                                         padding="max_length", truncation=True, max_length=256)
        return {
            "pixel_values_before": before_pixels,
            "pixel_values_after": after_pixels,
            "input_ids": text["input_ids"].squeeze(0),
            "attention_mask": text["attention_mask"].squeeze(0),
            "labels": text["input_ids"].squeeze(0).clone(),
        }

# LoRA setup identical to Pipeline A.3 — reload base model + attach a NEW LoRA config here
# (this is a separate adapter from the VQA/captioning one — do not reuse the same LoRA weights)
```

Train with the same `TrainingArguments`/`Trainer` pattern as Pipeline A, then push to a **separate** Hugging Face repo, e.g. `your-username/satquery-ai-change-vqa-lora`.

---

## Pipeline C — SECOND → Change-type segmentation model

SECOND is pixel-level semantic change segmentation, not a generative VLM task — the efficient-training equivalent of LoRA here is **freezing a pretrained encoder and training only the decoder**, using `segmentation_models_pytorch`.

**Note on access**: SECOND is typically distributed via the paper's own project page (often Google Drive), which a Kaggle notebook can't authenticate against automatically. Download it once manually, then upload it as your own Kaggle Dataset (Option B, same process as Pipeline A.2) — this also matches the "package once, reuse every session" pattern.

### C.1 — Install and load

```python
!pip install -q segmentation-models-pytorch

import segmentation_models_pytorch as smp
import torch
from torch import nn

# Early-fusion Siamese U-Net: stack before/after RGB into a 6-channel input.
# Simpler than a true twin-encoder architecture, and sufficient for a prototype.
model = smp.Unet(
    encoder_name="resnet34",
    encoder_weights="imagenet",
    in_channels=6,           # 3 (before) + 3 (after)
    classes=5,                # background/no-change, new_construction, demolition, vegetation_growth, deforestation
)

# Freeze the encoder, train only the decoder + segmentation head (LoRA-equivalent efficiency)
for param in model.encoder.parameters():
    param.requires_grad = False
```

### C.2 — Dataset with class-transition mapping

```python
import numpy as np
from torch.utils.data import Dataset
from PIL import Image

# Map SECOND's per-date land-cover labels into our 4 target change categories.
BUILT = {"building"}
VEGETATION = {"tree", "low_vegetation"}
NON_BUILT_NON_VEG = {"water", "ground", "playground"}

def classify_transition(before_class, after_class):
    if before_class not in BUILT and after_class in BUILT:
        return 1  # new_construction
    if before_class in BUILT and after_class not in BUILT:
        return 2  # demolition
    if before_class not in VEGETATION and after_class in VEGETATION:
        return 3  # vegetation_growth
    if before_class in VEGETATION and after_class not in VEGETATION:
        return 4  # deforestation
    return 0  # no_change / other

class SECONDDataset(Dataset):
    def __init__(self, image_pairs, before_label_dir, after_label_dir, transform=None):
        self.image_pairs = image_pairs  # list of (before_img_path, after_img_path, before_label_path, after_label_path)
        self.transform = transform

    def __len__(self):
        return len(self.image_pairs)

    def __getitem__(self, idx):
        before_path, after_path, before_label_path, after_label_path = self.image_pairs[idx]
        before_img = np.array(Image.open(before_path).convert("RGB"))
        after_img = np.array(Image.open(after_path).convert("RGB"))
        before_label = np.array(Image.open(before_label_path))  # class-index map
        after_label = np.array(Image.open(after_label_path))

        change_mask = np.vectorize(classify_transition)(before_label, after_label)

        stacked = np.concatenate([before_img, after_img], axis=-1).astype(np.float32) / 255.0
        stacked = torch.from_numpy(stacked).permute(2, 0, 1)
        mask = torch.from_numpy(change_mask).long()
        return stacked, mask
```

### C.3 — Train

```python
from torch.utils.data import DataLoader

train_loader = DataLoader(train_dataset, batch_size=8, shuffle=True)  # train_dataset = SECONDDataset(...)

optimizer = torch.optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=1e-4)
criterion = nn.CrossEntropyLoss()

model = model.cuda()
for epoch in range(10):
    model.train()
    running_loss = 0.0
    for images, masks in train_loader:
        images, masks = images.cuda(), masks.cuda()
        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, masks)
        loss.backward()
        optimizer.step()
        running_loss += loss.item()
    print(f"Epoch {epoch+1}: loss={running_loss/len(train_loader):.4f}")

torch.save(model.state_dict(), "/kaggle/working/change_segmentation_model.pt")
```

### C.4 — Push to Hugging Face (as a plain model file, not a PEFT adapter)

```python
from huggingface_hub import HfApi, login
from kaggle_secrets import UserSecretsClient

hf_token = UserSecretsClient().get_secret("HF_TOKEN")
login(token=hf_token)

api = HfApi()
api.create_repo(repo_id="your-username/satquery-ai-change-segmentation", repo_type="model", exist_ok=True)
api.upload_file(
    path_or_fileobj="/kaggle/working/change_segmentation_model.pt",
    path_in_repo="change_segmentation_model.pt",
    repo_id="your-username/satquery-ai-change-segmentation",
)
```

---

## Evaluation — VRSBench and RSVQA (no training)

```python
from huggingface_hub import snapshot_download

vrsbench_path = snapshot_download(repo_id="xiang709/VRSBench", repo_type="dataset")
print(vrsbench_path)

import json
with open(f"{vrsbench_path}/VRSBench_EVAL_vqa.json") as f:
    vrsbench_vqa = json.load(f)

# Load your Pipeline A model + adapter (see SatQuery_AI_FineTuning_Guide.md Step 9),
# run inference over vrsbench_vqa samples, and compute accuracy against the ground-truth answers.
```

For RSVQA, get the current direct download links from `rsvqa.sylvainlobry.com`, fetch with `wget` inside the notebook, and run the same trained VQA model against its test split — never train on either benchmark's data.

---

## Summary — what you end up with

| Artifact | Hugging Face repo (example naming) |
|---|---|
| VQA/Captioning/Grounding LoRA adapter | `your-username/satquery-ai-vqa-lora` |
| Change-VQA LoRA adapter | `your-username/satquery-ai-change-vqa-lora` |
| Change-type segmentation model | `your-username/satquery-ai-change-segmentation` |

Each of these is loaded independently by its corresponding backend model stub file (`vqa_caption_model.py`, `change_vqa_model.py`, `change_segmentation_model.py`) as described in `SatQuery_AI_Prompts_and_Integration_Guide.md`.
