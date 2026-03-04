#!/usr/bin/env python3
"""
CLI script for generating evaluation reports.

Usage:
    python eval_report.py --input results.json --format markdown
    python eval_report.py --input results.json --format json --output report.json
    python eval_report.py --compare baseline.json new.json
"""

import argparse
import json
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.app.eval.metrics.aggregator import MetricsAggregator


def load_results(filepath: str) -> dict:
    """Load results from JSON file."""
    with open(filepath, 'r') as f:
        return json.load(f)


def generate_markdown_report(results: dict) -> str:
    """Generate markdown report from results."""
    lines = [
        "# RAG Evaluation Report",
        "",
        f"**Benchmark:** {results.get('benchmark', 'N/A')}",
        "",
        "## Summary",
        "",
    ]
    
    for result in results.get('results', []):
        lines.extend([
            f"### {result.get('dataset_name', 'Unknown')}",
            "",
            f"- **Runner:** {result.get('runner_name', 'N/A')}",
            f"- **Status:** {result.get('status', 'N/A')}",
            f"- **Success Rate:** {result.get('summary', {}).get('success_rate', 0):.2%}",
            f"- **Samples:** {result.get('summary', {}).get('successful_samples', 0)}/{result.get('summary', {}).get('total_samples', 0)}",
            "",
        ])
        
        # Add metrics
        metrics = result.get('aggregated_metrics', {})
        if metrics:
            lines.append("#### Metrics",)
            lines.append("")
            
            for category, category_metrics in metrics.items():
                lines.append(f"**{category.title()}:**")
                for metric_name, values in category_metrics.items():
                    if isinstance(values, dict) and 'mean' in values:
                        lines.append(f"  - {metric_name}: {values['mean']:.4f}")
                lines.append("")
    
    return "\n".join(lines)


def compare_results(baseline_path: str, new_path: str) -> str:
    """Compare two result files."""
    baseline = load_results(baseline_path)
    new = load_results(new_path)
    
    lines = [
        "# Evaluation Comparison Report",
        "",
        f"**Baseline:** {baseline_path}",
        f"**New:** {new_path}",
        "",
    ]
    
    # Compare metrics
    baseline_results = baseline.get('results', [])
    new_results = new.get('results', [])
    
    if len(baseline_results) != len(new_results):
        lines.append("*Warning: Different number of datasets evaluated*")
        lines.append("")
    
    for i, (base, new_res) in enumerate(zip(baseline_results, new_results)):
        dataset = base.get('dataset_name', f'Dataset {i+1}')
        lines.extend([
            f"## {dataset}",
            "",
        ])
        
        base_metrics = base.get('aggregated_metrics', {})
        new_metrics = new_res.get('aggregated_metrics', {})
        
        for category in set(base_metrics.keys()) | set(new_metrics.keys()):
            lines.append(f"### {category.title()}")
            lines.append("")
            lines.append("| Metric | Baseline | New | Change |")
            lines.append("|--------|----------|-----|--------|")
            
            base_cat = base_metrics.get(category, {})
            new_cat = new_metrics.get(category, {})
            
            for metric in set(base_cat.keys()) | set(new_cat.keys()):
                base_val = base_cat.get(metric, {}).get('mean', 'N/A')
                new_val = new_cat.get(metric, {}).get('mean', 'N/A')
                
                if base_val != 'N/A' and new_val != 'N/A':
                    change = new_val - base_val
                    change_pct = (change / base_val * 100) if base_val != 0 else 0
                    change_str = f"{change:+.4f} ({change_pct:+.1f}%)"
                else:
                    change_str = "N/A"
                
                base_str = f"{base_val:.4f}" if base_val != 'N/A' else 'N/A'
                new_str = f"{new_val:.4f}" if new_val != 'N/A' else 'N/A'
                
                lines.append(f"| {metric} | {base_str} | {new_str} | {change_str} |")
            
            lines.append("")
    
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Generate evaluation reports"
    )
    parser.add_argument(
        "--input",
        type=str,
        help="Input results file (JSON)"
    )
    parser.add_argument(
        "--format",
        type=str,
        choices=["markdown", "json"],
        default="markdown",
        help="Output format"
    )
    parser.add_argument(
        "--output",
        type=str,
        help="Output file (default: stdout)"
    )
    parser.add_argument(
        "--compare",
        nargs=2,
        metavar=("BASELINE", "NEW"),
        help="Compare two result files"
    )
    
    args = parser.parse_args()
    
    if args.compare:
        report = compare_results(args.compare[0], args.compare[1])
    elif args.input:
        results = load_results(args.input)
        
        if args.format == "markdown":
            report = generate_markdown_report(results)
        else:
            report = json.dumps(results, indent=2)
    else:
        parser.print_help()
        return 1
    
    if args.output:
        with open(args.output, 'w') as f:
            f.write(report)
        print(f"Report saved to: {args.output}")
    else:
        print(report)
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
