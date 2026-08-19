from __future__ import annotations

import argparse
from datetime import datetime, timezone
from typing import Optional

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.prompt import Prompt

from ai.query_parser import QueryParser
from config import settings
from engine.search_engine import SearchEngine
from exporters.excel import export_excel
from exporters.pdf import export_pdf
from utils.logging import setup_logging

console = Console()


def print_plan(plan):
    console.print(Panel.fit(
        f"[bold]Category:[/bold] {plan.category}\n"
        f"[bold]Location:[/bold] {plan.location.display_name()}\n"
        f"[bold]Location Type:[/bold] {plan.location.location_type or 'N/A'}\n"
        f"[bold]Preposition:[/bold] {plan.location.preposition.value}\n"
        f"[bold]Coordinates:[/bold] "
        f"{f'{plan.location.latitude:.4f}, {plan.location.longitude:.4f}' if plan.location.has_coordinates() else 'Not resolved'}\n"
        f"[bold]Confidence:[/bold] {plan.location.confidence:.2f}\n"
        f"[bold]Search Radius:[/bold] {plan.location.effective_radius()}m\n"
        f"[bold]Filters:[/bold] {', '.join(f'{k}={v}' for k, v in plan.filters.items()) or 'None'}\n"
        f"[bold]Fields:[/bold] {', '.join(plan.fields)}\n"
        f"[bold]Requested count:[/bold] {plan.requested_result_count or 'No limit'}\n"
        f"[bold]Export:[/bold] {plan.export_format or 'Ask after search'}",
        title="Structured Search Plan",
        border_style="cyan",
    ))


def show_results(records, stats):
    console.print()
    console.print(f"[bold green]{len(records)} unique places found.[/bold green]")
    console.print(
        f"Phone: {stats['with_phone']}  |  Website: {stats['with_website']}  |  "
        f"Address: {stats['with_address']}  |  Completeness: {stats['completeness']:.0f}%"
    )

    if not records:
        return

    table = Table(show_lines=False, expand=True)
    table.add_column("#", width=4)
    table.add_column("Business", max_width=30)
    table.add_column("Category", max_width=18)
    table.add_column("Area", max_width=18)
    table.add_column("Phone", max_width=18)
    table.add_column("Website", max_width=28)
    table.add_column("Dist(km)", max_width=8)
    table.add_column("Score", max_width=6)

    limit = 30
    for i, r in enumerate(records[:limit], 1):
        dist = f"{r.distance_km:.1f}" if r.distance_km is not None else "—"
        score = f"{r.location_match_score:.2f}" if r.location_match_score is not None else "—"
        table.add_row(
            str(i), r.business_name or "N/A", r.category or "N/A",
            r.area or "N/A", r.phone or "Not publicly available",
            r.website or "Not publicly available",
            dist, score,
        )
    console.print(table)
    if len(records) > limit:
        console.print(f"[dim]Showing first {limit}; export contains all {len(records)} records.[/dim]")


def choose_export(plan, records):
    export_format = plan.export_format
    if not export_format:
        export_format = Prompt.ask(
            "Export", choices=["excel", "pdf", "both", "none"], default="excel"
        )

    if export_format in ("excel", "both"):
        path = export_excel(records, plan)
        console.print(f"[green]Excel saved:[/green] {path}")
    if export_format in ("pdf", "both"):
        path = export_pdf(records, plan)
        console.print(f"[green]PDF saved:[/green] {path}")


def run(query: str):
    parser = QueryParser()
    resolver = parser.location_resolver

    console.print(Panel.fit(
        "🇵🇰 [bold cyan]PAKISTAN DATA ENGINE[/bold cyan]\n"
        "[dim]Natural language → Search plan → Google Places → Clean data → Export[/dim]",
        border_style="cyan",
    ))

    console.print("\n[bold]Understanding request...[/bold]")
    plan = parser.parse(query)
    print_plan(plan)

    if not plan.location.confident:
        answer = Prompt.ask(
            "[yellow]Location is ambiguous. Please provide the city/district[/yellow]"
        )
        plan = parser.parse(f"{query} {answer}")

    console.print("\n[bold]Searching Google Places...[/bold]")
    engine = SearchEngine()
    records, stats = engine.search(plan)

    # Show debug info.
    if plan.debug_info and settings.debug:
        debug = plan.debug_info
        gf = debug.get("geographic_filtering", {})
        console.print(Panel.fit(
            f"[bold]Location:[/bold] {debug['location']['name']} "
            f"(type: {debug['location']['type'] or 'N/A'})\n"
            f"[bold]Parent Geography:[/bold] "
            f"Province: {debug['location']['province'] or '—'}, "
            f"District: {debug['location']['district'] or '—'}, "
            f"City: {debug['location']['city'] or '—'}\n"
            f"[bold]Coordinates:[/bold] "
            f"{debug['location']['coordinates'] or 'Not resolved'}\n"
            f"[bold]Confidence:[/bold] {debug['location']['confidence']:.2f}\n"
            f"[bold]Search Radius:[/bold] {debug['location']['search_radius_m']}m\n"
            f"[bold]Search Queries:[/bold]\n  " +
            "\n  ".join(debug.get('search_queries', [])) +
            f"\n[bold]Geographic Filtering:[/bold]\n"
            f"  Exact matches: {gf.get('exact_matches', 0)}\n"
            f"  Nearby matches: {gf.get('nearby_matches', 0)}\n"
            f"  Rejected results: {gf.get('rejected_results', 0)}",
            title="Debug Info",
            border_style="dim",
        ))

    console.print("\n[bold]Cleaning data...[/bold]")
    console.print(
        f"Raw results: {stats['raw_results']}\n"
        f"Duplicates removed: {stats['duplicates_removed']}\n"
        f"Unique places: {stats['unique_records']}"
    )
    show_results(records, stats)

    if records:
        choose_export(plan, records)


def main():
    setup_logging()
    ap = argparse.ArgumentParser(description="Pakistan-focused AI data intelligence engine")
    ap.add_argument("query", nargs="*", help="Natural-language search request")
    args = ap.parse_args()

    query = " ".join(args.query).strip()
    if not query:
        console.print("\n[bold]What are you looking for?[/bold]")
        query = Prompt.ask("> ").strip()

    try:
        run(query)
    except KeyboardInterrupt:
        console.print("\n[yellow]Cancelled.[/yellow]")
    except Exception as exc:
        console.print(f"\n[bold red]Error:[/bold red] {exc}")
        if settings.debug:
            raise


if __name__ == "__main__":
    main()
