"""Command line entry point: ``uv run --project pipeline klopp-pipeline <command>``."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated

import typer

from klopp_pipeline import net
from klopp_pipeline.coverage import PROVIDERS, run_coverage, write_outputs

app = typer.Typer(help="Open-data pipeline for The Next Klopp.", no_args_is_help=True)

# pipeline/src/klopp_pipeline/cli.py -> parents[3] is the repository root
REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_OUT = REPO_ROOT / "research" / "pl-data-sources"


@app.callback()
def main() -> None:
    """Keep ``coverage`` a real subcommand even while it is the only one."""


@app.command()
def coverage(
    out: Annotated[Path, typer.Option(help="Folder for coverage-matrix.json and .md.")] = DEFAULT_OUT,
    refresh: Annotated[bool, typer.Option(help="Ignore cached responses.")] = False,
    offline: Annotated[bool, typer.Option(help="Read only the cache; never touch the network.")] = False,
    deep: Annotated[bool, typer.Option(help="Download the Last Row CSV and recount its plays.")] = False,
    providers: Annotated[str, typer.Option(help="Comma list, or 'all'.")] = "all",
) -> None:
    """Build the provider x competition x season x data type coverage matrix."""
    names = list(PROVIDERS) if providers == "all" else [p.strip() for p in providers.split(",")]
    unknown = [n for n in names if n not in PROVIDERS]
    if unknown:
        raise typer.BadParameter(f"unknown provider(s) {unknown}; choose from {list(PROVIDERS)}")
    fetch = net.RecordingFetch(cache_dir=net.DEFAULT_CACHE_DIR, refresh=refresh, offline=offline)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    matrix = run_coverage(fetch, now, names, deep=deep)
    json_path, md_path = write_outputs(matrix, out)
    unreachable = [r.provider for r in matrix.rows if r.status == "unreachable"]
    typer.echo(f"wrote {json_path} and {md_path} ({len(matrix.rows)} rows)")
    if unreachable:
        typer.echo(f"unreachable providers: {', '.join(sorted(set(unreachable)))}")
