"""
evaluate_benchmarks.py — SatQuery AI automated benchmark evaluation runner.

Evaluates the backend's analysis pipeline against public remote-sensing test sets:
  - BigEarthNet-S1 / S2 (VQA & Captioning)
  - CDVQA (Change-VQA)
  - SECOND (Change Segmentation)

Usage:
  python scripts/evaluate_benchmarks.py                 # Full evaluation
  python scripts/evaluate_benchmarks.py --quick-eval    # 5 samples per dataset
  python scripts/evaluate_benchmarks.py --dataset bigearthnet
  python scripts/evaluate_benchmarks.py --port 8001

Output:
  outputs/benchmark_results.json   — JSON report with per-sample scores
"""

import argparse
import json
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

import requests

# ─── Configuration ─────────────────────────────────────────────────────────────

ROOT_DIR    = Path(__file__).parent.parent
OUTPUTS_DIR = ROOT_DIR / "outputs"
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_PORT    = 8000
DEFAULT_API_URL = f"http://localhost:{DEFAULT_PORT}"

# ─── Sample evaluation datasets ─────────────────────────────────────────────────
# In production, replace with actual paths to test images and ground-truth labels.
# These are representative sample queries for demonstrating the system.

BIGEARTHNET_SAMPLES = [
    {
        "id": "ben_001",
        "description": "Agricultural field — Sentinel-2 optical",
        "query": "Describe the land cover type and identify any agricultural patterns in this satellite image.",
        "task": "caption",
        "modality": "optical",
        "roi_geojson": {"type": "Polygon", "coordinates": [[[76.5,26.5],[76.7,26.5],[76.7,26.7],[76.5,26.7],[76.5,26.5]]]},
        "date_start": "2023-06-01",
        "expected_keywords": ["agriculture", "crop", "vegetation", "field"],
    },
    {
        "id": "ben_002",
        "description": "Urban area — Sentinel-2 optical",
        "query": "What is the dominant land use in this area? Are there any built-up regions?",
        "task": "vqa",
        "modality": "optical",
        "roi_geojson": {"type": "Polygon", "coordinates": [[[77.0,28.5],[77.2,28.5],[77.2,28.7],[77.0,28.7],[77.0,28.5]]]},
        "date_start": "2023-07-01",
        "expected_keywords": ["urban", "built", "building", "infrastructure", "residential"],
    },
    {
        "id": "ben_003",
        "description": "Water body — Sentinel-2",
        "query": "Identify any water bodies and describe their extent in this image.",
        "task": "vqa",
        "modality": "optical",
        "roi_geojson": {"type": "Polygon", "coordinates": [[[73.0,25.0],[73.5,25.0],[73.5,25.5],[73.0,25.5],[73.0,25.0]]]},
        "date_start": "2023-03-01",
        "expected_keywords": ["water", "lake", "river", "reservoir", "wetland"],
    },
    {
        "id": "ben_004",
        "description": "Forest — Sentinel-1 SAR",
        "query": "Describe the vegetation type from this SAR image. Is there evidence of deforestation?",
        "task": "vqa",
        "modality": "sar",
        "roi_geojson": {"type": "Polygon", "coordinates": [[[80.0,22.0],[80.5,22.0],[80.5,22.5],[80.0,22.5],[80.0,22.0]]]},
        "date_start": "2023-04-01",
        "expected_keywords": ["forest", "vegetation", "dense", "canopy"],
    },
    {
        "id": "ben_005",
        "description": "Coastal zone — optical",
        "query": "What types of land cover are present near the coastline? Identify any coastal features.",
        "task": "caption",
        "modality": "optical",
        "roi_geojson": {"type": "Polygon", "coordinates": [[[72.5,21.0],[72.8,21.0],[72.8,21.3],[72.5,21.3],[72.5,21.0]]]},
        "date_start": "2023-01-01",
        "expected_keywords": ["coast", "water", "shore", "beach", "mangrove", "wetland"],
    },
]

CDVQA_SAMPLES = [
    {
        "id": "cdvqa_001",
        "description": "Urban expansion 2020 → 2023",
        "query": "What areas have expanded or been newly developed between these two dates?",
        "task": "change_vqa",
        "modality": "optical",
        "roi_geojson": {"type": "Polygon", "coordinates": [[[77.1,28.6],[77.3,28.6],[77.3,28.8],[77.1,28.8],[77.1,28.6]]]},
        "date_start": "2020-01-01",
        "date_start_2": "2023-01-01",
        "expected_keywords": ["construction", "built", "expand", "new", "urban", "change"],
    },
    {
        "id": "cdvqa_002",
        "description": "Deforestation detection",
        "query": "Has there been any loss of forest cover between these two dates? Where did it occur?",
        "task": "change_vqa",
        "modality": "optical",
        "roi_geojson": {"type": "Polygon", "coordinates": [[[80.2,22.1],[80.6,22.1],[80.6,22.5],[80.2,22.5],[80.2,22.1]]]},
        "date_start": "2021-01-01",
        "date_start_2": "2024-01-01",
        "expected_keywords": ["deforestation", "forest loss", "vegetation", "clear", "bare"],
    },
    {
        "id": "cdvqa_003",
        "description": "Flood event detection",
        "query": "Identify areas that were flooded in the after image but not in the before image.",
        "task": "change_vqa",
        "modality": "both",
        "roi_geojson": {"type": "Polygon", "coordinates": [[[75.0,25.5],[75.5,25.5],[75.5,26.0],[75.0,26.0],[75.0,25.5]]]},
        "date_start": "2023-06-01",
        "date_start_2": "2023-08-15",
        "expected_keywords": ["flood", "water", "inundated", "submerged", "change"],
    },
]

SECOND_SAMPLES = [
    {
        "id": "second_001",
        "description": "Change segmentation — construction zone",
        "query": "Generate a pixel-level change map and identify the types of changes detected.",
        "task": "change_segmentation",
        "modality": "optical",
        "roi_geojson": {"type": "Polygon", "coordinates": [[[77.0,28.5],[77.2,28.5],[77.2,28.7],[77.0,28.7],[77.0,28.5]]]},
        "date_start": "2020-01-01",
        "date_start_2": "2023-06-01",
        "expected_keywords": ["construction", "change", "segmentation", "new"],
    },
]

ALL_DATASETS = {
    "bigearthnet": {"name": "BigEarthNet-S1/S2 (VQA & Captioning)", "samples": BIGEARTHNET_SAMPLES},
    "cdvqa":       {"name": "CDVQA (Change-VQA)",                    "samples": CDVQA_SAMPLES},
    "second":      {"name": "SECOND (Change Segmentation)",          "samples": SECOND_SAMPLES},
}

# ─── Metrics ─────────────────────────────────────────────────────────────────────

def keyword_accuracy(answer: str, expected_keywords: List[str]) -> float:
    """Simple keyword hit-rate as a proxy for answer correctness."""
    if not expected_keywords:
        return 1.0
    answer_lower = answer.lower()
    hits = sum(1 for kw in expected_keywords if kw.lower() in answer_lower)
    return round(hits / len(expected_keywords), 3)

def estimate_answer_quality(answer: str) -> Dict[str, Any]:
    """Heuristic answer quality signals."""
    words = answer.split()
    return {
        "word_count": len(words),
        "has_quantification": any(c.isdigit() for c in answer),
        "has_spatial_reference": any(w in answer.lower() for w in
            ["north", "south", "east", "west", "center", "left", "right",
             "top", "bottom", "corner", "boundary", "region", "area"]),
    }

# ─── API caller ──────────────────────────────────────────────────────────────────

def run_query(base_url: str, sample: Dict) -> Dict:
    """Call /api/query and return the response + latency."""
    payload = {
        "roi_geojson":  sample["roi_geojson"],
        "query":        sample["query"],
        "image_refs":   [],
        "modality":     sample.get("modality", "optical"),
        "date_start":   sample.get("date_start", "2023-01-01"),
        "date_end":     sample.get("date_end"),
        "date_start_2": sample.get("date_start_2"),
        "date_end_2":   sample.get("date_end_2"),
    }
    t0 = time.time()
    resp = requests.post(f"{base_url}/api/query", json=payload, timeout=120)
    latency = round(time.time() - t0, 2)
    resp.raise_for_status()
    return {**resp.json(), "_latency_s": latency}

# ─── Evaluator ───────────────────────────────────────────────────────────────────

def evaluate_dataset(base_url: str, dataset_name: str, samples: List[Dict],
                     quick: bool = False, verbose: bool = True) -> List[Dict]:
    """Evaluate all samples in a dataset and return per-sample results."""
    results = []
    eval_samples = samples[:5] if quick else samples

    print(f"\n{'='*60}")
    print(f"  Dataset : {dataset_name}")
    print(f"  Samples : {len(eval_samples)}{' (quick mode)' if quick else ''}")
    print(f"{'='*60}")

    for i, sample in enumerate(eval_samples, 1):
        print(f"\n[{i}/{len(eval_samples)}] {sample['id']} — {sample['description']}")
        print(f"  Query: {sample['query'][:80]}...")
        try:
            response = run_query(base_url, sample)
            kw_acc  = keyword_accuracy(response.get("answer", ""), sample.get("expected_keywords", []))
            quality = estimate_answer_quality(response.get("answer", ""))

            result = {
                "id":               sample["id"],
                "description":      sample["description"],
                "expected_task":    sample["task"],
                "actual_task":      response.get("task_type", "unknown"),
                "task_match":       response.get("task_type", "") == sample["task"],
                "confidence":       response.get("confidence", 0),
                "keyword_accuracy": kw_acc,
                "answer_quality":   quality,
                "latency_s":        response.get("_latency_s", 0),
                "session_id":       response.get("session_id", ""),
                "answer_preview":   response.get("answer", "")[:200],
                "status":           "ok",
            }
            print(f"  ✅ Task: {result['actual_task']} | Confidence: {result['confidence']:.0%} | Keyword Acc: {kw_acc:.0%} | {result['latency_s']}s")

        except Exception as e:
            result = {
                "id":     sample["id"],
                "status": "error",
                "error":  str(e),
            }
            print(f"  ❌ Error: {e}")

        results.append(result)

    return results

def compute_dataset_summary(results: List[Dict]) -> Dict:
    """Compute aggregate metrics over dataset results."""
    ok = [r for r in results if r.get("status") == "ok"]
    if not ok:
        return {"total": len(results), "successful": 0}

    return {
        "total":            len(results),
        "successful":       len(ok),
        "task_accuracy":    round(sum(1 for r in ok if r.get("task_match")) / len(ok), 3),
        "avg_confidence":   round(sum(r.get("confidence", 0) for r in ok) / len(ok), 3),
        "avg_keyword_acc":  round(sum(r.get("keyword_accuracy", 0) for r in ok) / len(ok), 3),
        "avg_latency_s":    round(sum(r.get("latency_s", 0) for r in ok) / len(ok), 2),
    }

# ─── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="SatQuery AI Benchmark Evaluator")
    parser.add_argument("--api-url", default=DEFAULT_API_URL, help="Backend API URL")
    parser.add_argument("--port",    type=int, default=DEFAULT_PORT, help="Backend port")
    parser.add_argument("--dataset", choices=["bigearthnet", "cdvqa", "second", "all"], default="all")
    parser.add_argument("--quick-eval", action="store_true", help="Run only 5 samples per dataset")
    parser.add_argument("--output",  default=str(OUTPUTS_DIR / "benchmark_results.json"))
    args = parser.parse_args()

    base_url = args.api_url.rstrip("/") or f"http://localhost:{args.port}"

    # Health check
    print(f"🛰  SatQuery AI Benchmark Evaluator")
    print(f"   API  : {base_url}")
    print(f"   Mode : {'Quick (5 samples)' if args.quick_eval else 'Full evaluation'}")
    try:
        r = requests.get(f"{base_url}/healthz", timeout=10)
        r.raise_for_status()
        print(f"   ✅ Backend online: {r.json()}")
    except Exception as e:
        print(f"   ❌ Backend not reachable: {e}")
        print("   Start the backend with: uvicorn backend.main:app --reload --port 8000")
        return

    # Select datasets
    datasets = ALL_DATASETS if args.dataset == "all" else {args.dataset: ALL_DATASETS[args.dataset]}

    report = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "api_url":       base_url,
        "quick_eval":    args.quick_eval,
        "datasets":      {},
        "overall":       {},
    }

    all_results = []
    for ds_key, ds_info in datasets.items():
        results = evaluate_dataset(
            base_url     = base_url,
            dataset_name = ds_info["name"],
            samples      = ds_info["samples"],
            quick        = args.quick_eval,
        )
        summary = compute_dataset_summary(results)
        report["datasets"][ds_key] = {
            "name":    ds_info["name"],
            "summary": summary,
            "samples": results,
        }
        all_results.extend([r for r in results if r.get("status") == "ok"])
        print(f"\n  📊 {ds_info['name']} Summary:")
        for k, v in summary.items():
            print(f"     {k}: {v}")

    # Overall
    if all_results:
        report["overall"] = {
            "total_evaluated": len(all_results),
            "avg_confidence":  round(sum(r["confidence"] for r in all_results) / len(all_results), 3),
            "avg_keyword_acc": round(sum(r.get("keyword_accuracy", 0) for r in all_results) / len(all_results), 3),
            "avg_latency_s":   round(sum(r.get("latency_s", 0) for r in all_results) / len(all_results), 2),
        }

    # Save report
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, default=str)

    print(f"\n{'='*60}")
    print(f"✅ Benchmark evaluation complete!")
    print(f"   Report saved to: {output_path}")
    print(f"{'='*60}")

    if report["overall"]:
        print(f"\n📈 Overall Results:")
        for k, v in report["overall"].items():
            print(f"   {k}: {v}")


if __name__ == "__main__":
    main()
