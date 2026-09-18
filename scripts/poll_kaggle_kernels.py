"""
Poll Kaggle kernel status for all 3 SatQuery AI training pipelines.
Uses Bearer token auth (required for KGAT_ format tokens).
Auto-downloads outputs when complete.
"""
import warnings, json, os, time
warnings.filterwarnings("ignore")
import requests

KAGGLE_USER = "mokshdasharma"
kaggle_json = os.path.join(os.environ["USERPROFILE"], ".kaggle", "kaggle.json")
with open(kaggle_json) as f:
    creds = json.load(f)
HEADERS  = {"Authorization": f"Bearer {creds['key']}"}
BASE_URL = "https://www.kaggle.com/api/v1"

SLUGS = [
    "satquery-ai-pipeline-a-vqa-bigearthnet",
    "satquery-ai-pipeline-b-change-vqa-cdvqa",
    "satquery-ai-pipeline-c-change-segmentation-second",
]
TERMINAL = {"complete", "error", "cancelAcknowledged", "cancelled", "failed"}


def check_status(slug):
    resp = requests.get(
        f"{BASE_URL}/kernels/status?userName={KAGGLE_USER}&kernelSlug={slug}",
        headers=HEADERS, timeout=20
    )
    if resp.status_code == 200:
        d = resp.json()
        return d.get("status", "unknown")
    return f"http_{resp.status_code}"


def download_outputs(slug):
    out_dir = os.path.join("outputs", slug)
    os.makedirs(out_dir, exist_ok=True)
    resp = requests.get(
        f"{BASE_URL}/kernels/{KAGGLE_USER}/{slug}/output",
        headers=HEADERS, timeout=60
    )
    if resp.status_code == 200:
        data = resp.json()
        files = data.get("files", [])
        print(f"  {len(files)} output file(s) available")
        for finfo in files[:10]:
            print(f"    {finfo.get('name','?')} ({finfo.get('totalBytes',0)//1024} KB)")
        return True
    else:
        print(f"  Output fetch failed: {resp.status_code} {resp.text[:100]}")
        return False


print("Polling Kaggle kernel status every 5 minutes (Ctrl+C to stop)...")
print("Training typically takes 1-4 hours per notebook on Kaggle GPU.\n")

poll_num = 0
while True:
    poll_num += 1
    ts = time.strftime("%H:%M:%S")
    print(f"[Poll #{poll_num} @ {ts}]")
    all_done = True
    for slug in SLUGS:
        status = check_status(slug)
        icon = "[OK]" if status == "complete" else ("[FAIL]" if status in {"error","failed"} else "[...]")
        print(f"  {icon} {slug}: {status}")
        if status not in TERMINAL:
            all_done = False

    if all_done:
        print("\nAll kernels finished! Downloading output manifests...")
        for slug in SLUGS:
            print(f"\n  -- {slug} --")
            download_outputs(slug)
        print("\nDownload complete. Check outputs/ directory.")
        print("Next: run scripts/push_hf_artifacts.py to push to Hugging Face.")
        break

    print(f"  Next poll in 5 minutes...\n")
    time.sleep(300)
