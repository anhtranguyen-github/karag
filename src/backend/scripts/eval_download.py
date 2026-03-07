#!/usr/bin/env python3
"""
CLI script for downloading RAG evaluation datasets.

Usage:
    python eval_download.py --dataset ms_marco
    python eval_download.py --dataset-group english_qa
    python eval_download.py --all
    python eval_download.py --list
"""

import argparse
import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import structlog
from src.backend.app.eval.config.loader import get_config_loader
from src.backend.app.eval.datasets.definitions import register_all_datasets
from src.backend.app.eval.datasets.download_manager import DownloadManager

# Register datasets explicitly (removed from import-time side effects)
register_all_datasets()

logger = structlog.get_logger(__name__)


def list_datasets():
    """List all available datasets."""
    config = get_config_loader().load("datasets.yaml")

    print("\n=== Available Datasets ===\n")

    print("English Datasets:")
    for name, info in config["datasets"].items():
        if info.get("language") == "en":
            print(f"  - {name}: {info.get('description', 'N/A')}")
            print(f"    Samples: {info.get('num_samples', 'N/A')}")

    print("\nVietnamese Datasets:")
    for name, info in config["datasets"].items():
        if info.get("language") == "vi":
            print(f"  - {name}: {info.get('description', 'N/A')}")
            print(f"    Samples: {info.get('num_samples', 'N/A')}")

    print("\nDataset Groups:")
    for group, datasets in config.get("groups", {}).items():
        print(f"  - {group}: {', '.join(datasets)}")

    print()


async def download_dataset(dataset_name: str, force: bool = False):
    """Download a single dataset."""
    manager = DownloadManager()

    try:
        print(f"Downloading {dataset_name}...")
        path = await manager.download(dataset_name, force=force)
        print(f"✓ Downloaded to: {path}")
        return True
    except Exception as e:
        print(f"✗ Failed to download {dataset_name}: {e}")
        return False


async def download_datasets(dataset_names: list, force: bool = False):
    """Download multiple datasets."""
    results = await DownloadManager().download_batch(dataset_names, force=force)

    success = 0
    failed = 0

    for name, result in results.items():
        if isinstance(result, Exception):
            print(f"✗ {name}: Failed - {result}")
            failed += 1
        else:
            print(f"✓ {name}: Downloaded to {result}")
            success += 1

    print(f"\nSummary: {success} succeeded, {failed} failed")
    return failed == 0


async def main():
    parser = argparse.ArgumentParser(description="Download RAG evaluation datasets")
    parser.add_argument("--dataset", type=str, help="Name of dataset to download")
    parser.add_argument("--dataset-group", type=str, help="Name of dataset group to download")
    parser.add_argument("--all", action="store_true", help="Download all datasets")
    parser.add_argument("--list", action="store_true", help="List available datasets")
    parser.add_argument("--force", action="store_true", help="Force re-download even if cached")

    args = parser.parse_args()

    if args.list:
        list_datasets()
        return 0

    if args.all:
        config = get_config_loader().load("datasets.yaml")
        datasets = list(config["datasets"].keys())
        print(f"Downloading all {len(datasets)} datasets...")
        success = await download_datasets(datasets, force=args.force)
        return 0 if success else 1

    if args.dataset_group:
        config = get_config_loader().load("datasets.yaml")
        if args.dataset_group not in config.get("groups", {}):
            print(f"Unknown dataset group: {args.dataset_group}")
            return 1
        datasets = config["groups"][args.dataset_group]
        print(f"Downloading dataset group '{args.dataset_group}': {', '.join(datasets)}")
        success = await download_datasets(datasets, force=args.force)
        return 0 if success else 1

    if args.dataset:
        success = await download_dataset(args.dataset, force=args.force)
        return 0 if success else 1

    parser.print_help()
    return 1


if __name__ == "__main__":
    asyncio.run(main())
