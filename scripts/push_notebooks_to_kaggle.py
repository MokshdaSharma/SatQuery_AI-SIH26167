"""
Push all 3 training notebooks to Kaggle as kernels using Bearer token auth.
(KGAT_ tokens require Bearer auth, not Basic auth used by the old kaggle library.)
"""
import warnings, json, os, sys, tempfile, zipfile
warnings.filterwarnings("ignore")

import requests

# ── Load credentials ──────────────────────────────────────────────────────────
KAGGLE_USER = "mokshdasharma"
kaggle_json = os.path.join(os.environ["USERPROFILE"], ".kaggle", "kaggle.json")
with open(kaggle_json) as f:
    creds = json.load(f)

API_KEY  = creds["key"]
HEADERS  = {"Authorization": f"Bearer {API_KEY}"}
BASE_URL = "https://www.kaggle.com/api/v1"

def kaggle_post(endpoint, data=None, files=None):
    url = f"{BASE_URL}{endpoint}"
    if files:
        resp = requests.post(url, headers=HEADERS, data=data, files=files, timeout=120)
    else:
        resp = requests.post(url, headers=HEADERS, json=data, timeout=120)
    return resp

# ── Notebook definitions ──────────────────────────────────────────────────────
NOTEBOOKS = [
    {
        "slug":            "pipeline-a-vqa-bigearthnet",
        "title":           "SatQuery AI Pipeline A VQA BigEarthNet",
        "nb_path":         "notebooks/pipeline_a_vqa_bigearthnet.ipynb",
        "dataset_sources": ["javidtheimmortal/bigearthnetsentinel1"],
    },
    {
        "slug":            "pipeline-b-change-vqa-cdvqa",
        "title":           "SatQuery AI Pipeline B Change VQA CDVQA",
        "nb_path":         "notebooks/pipeline_b_change_vqa_cdvqa.ipynb",
        "dataset_sources": [],
    },
    {
        "slug":            "pipeline-c-change-segmentation-second",
        "title":           "SatQuery AI Pipeline C Change Segmentation SECOND",
        "nb_path":         "notebooks/pipeline_c_change_segmentation_second.ipynb",
        "dataset_sources": [],
    },
]

print("=== Pushing notebooks to Kaggle (Bearer auth) ===\n")

for nb in NOTEBOOKS:
    slug    = nb["slug"]
    title   = nb["title"]
    nb_path = nb["nb_path"]

    print(f"--- {slug} ---")

    # Read notebook JSON
    with open(nb_path) as f:
        nb_content = json.load(f)

    # Build kernel push payload
    payload = {
        "newTitle":           title,
        "text":               json.dumps(nb_content),
        "language":           "python",
        "kernelType":         "notebook",
        "isPrivate":          True,
        "enableGpu":          True,
        "enableTpu":          False,
        "enableInternet":     True,
        "categoryIds":        [],
        "datasetDataSources": nb["dataset_sources"],
        "kernelDataSources":  [],
        "competitionDataSources": [],
    }

    # Check if kernel already exists (to decide create vs update)
    check = requests.get(
        f"{BASE_URL}/kernels/{KAGGLE_USER}/{slug}",
        headers=HEADERS, timeout=15
    )

    if check.status_code == 200:
        print(f"  Kernel exists — pushing new version...")
        # For updates, include the existing slug
        payload["id"] = f"{KAGGLE_USER}/{slug}"
        resp = kaggle_post("/kernels/push", data=payload)
    else:
        print(f"  Creating new kernel...")
        resp = kaggle_post("/kernels/push", data=payload)

    if resp.status_code in (200, 201):
        result = resp.json()
        print(f"  SUCCESS! ref={result.get('ref', slug)}")
        print(f"  URL: https://www.kaggle.com/code/{KAGGLE_USER}/{slug}")
    else:
        print(f"  FAILED: {resp.status_code}")
        print(f"  Response: {resp.text[:400]}")
    print()

print("Done. Run scripts/poll_kaggle_kernels.py to monitor training progress.")
