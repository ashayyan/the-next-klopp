"""Command line entry point: ``uv run --project pipeline klopp-pipeline <command>``."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated

import typer

from klopp_pipeline import landmarks as landmarks_mod
from klopp_pipeline import net, standardise
from klopp_pipeline.coverage import PROVIDERS, run_coverage, write_outputs
from klopp_pipeline.fetch import RAW_ROOT, fetch_source
from klopp_pipeline.net import FetchError
from klopp_pipeline.recipes import RECIPES
from klopp_pipeline.scene import dump_scene
from klopp_pipeline.sources import load_allow_list

app = typer.Typer(help="Open-data pipeline for The Next Klopp.", no_args_is_help=True)

# pipeline/src/klopp_pipeline/cli.py -> parents[3] is the repository root
REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_OUT = REPO_ROOT / "research" / "pl-data-sources"
DEFAULT_LANDMARKS = REPO_ROOT / "src" / "pitch" / "fixtures" / "landmarks.json"


@app.callback()
def main() -> None:
    """Keep every command a real subcommand."""


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


@app.command()
def landmarks(
    out: Annotated[Path, typer.Option(help="Landmark parity fixture to write or check.")] = DEFAULT_LANDMARKS,
    check: Annotated[bool, typer.Option(help="Exit 1 when the committed file differs from kloppy.")] = False,
) -> None:
    """Write (or check) the kloppy-generated landmark fixture used by Vitest and pytest."""
    if check:
        problem = landmarks_mod.diff_summary(out)
        if problem is not None:
            typer.echo(f"landmarks fixture is stale: {problem}; run klopp-pipeline landmarks")
            raise typer.Exit(code=1)
        typer.echo(f"landmarks fixture matches kloppy {landmarks_mod.KLOPPY_VERSION}: {out}")
        return
    landmarks_mod.write(out)
    typer.echo(f"wrote {out}")


RAW_DIR_HELP = "Folder for downloaded raw files (git-ignored)."
OFFLINE_HELP = "Use only files already in the raw folder; never touch the network."


@app.command()
def fetch(
    source: Annotated[str | None, typer.Argument(help="Source id from pipeline/sources.allow.json.")] = None,
    all_sources: Annotated[bool, typer.Option("--all", help="Fetch every source that lists files.")] = False,
    offline: Annotated[bool, typer.Option(help=OFFLINE_HELP)] = False,
    raw_dir: Annotated[Path, typer.Option(help=RAW_DIR_HELP)] = RAW_ROOT,
) -> None:
    """Download allow-listed source files and verify their sha256 pins."""
    allow = load_allow_list()
    if all_sources == (source is not None):
        raise typer.BadParameter("give a source id or --all, not both and not neither")
    ids = [s.id for s in allow.sources if s.files] if all_sources else [source or ""]
    try:
        for source_id in ids:
            paths = fetch_source(source_id, allow=allow, raw_root=raw_dir, offline=offline)
            for name, path in paths.items():
                typer.echo(f"{source_id}/{name}: ok ({path.stat().st_size} bytes)")
    except FetchError as exc:
        typer.echo(f"fetch failed: {exc}")
        raise typer.Exit(code=1) from exc


@app.command("standardise")
def standardise_cmd(
    source: Annotated[str, typer.Argument(help="Source id; builds the extracts its recipes need.")],
    offline: Annotated[bool, typer.Option(help=OFFLINE_HELP)] = False,
    raw_dir: Annotated[Path, typer.Option(help=RAW_DIR_HELP)] = RAW_ROOT,
) -> None:
    """Build the per-match extracts that the registered recipes of a source read."""
    if source != "wyscout":
        raise typer.BadParameter(f"no standardiser for {source!r}; only 'wyscout' is wired")
    ids = sorted({i for r in RECIPES.values() if r.source_id == source for i in r.extract_ids})
    try:
        for match_id in ids:
            extract = standardise.wyscout_match_extract(match_id, raw_root=raw_dir, offline=offline)
            typer.echo(f"{source}: match {match_id} extract ok ({len(extract['events'])} events)")
    except (FetchError, standardise.StandardiseError) as exc:
        typer.echo(f"standardise failed: {exc}")
        raise typer.Exit(code=1) from exc


@app.command()
def recipe(
    name: Annotated[str, typer.Argument(help=f"Recipe name: {', '.join(RECIPES)}.")],
    out: Annotated[Path, typer.Option(help="Scene JSON file to write.")],
    offline: Annotated[bool, typer.Option(help=OFFLINE_HELP)] = False,
    raw_dir: Annotated[Path, typer.Option(help=RAW_DIR_HELP)] = RAW_ROOT,
) -> None:
    """Build one scene from a registered recipe and write it as canonical JSON."""
    if name not in RECIPES:
        raise typer.BadParameter(f"unknown recipe {name!r}; choose from {list(RECIPES)}")
    try:
        scene = RECIPES[name].build(raw_dir, offline)
    except (FetchError, standardise.StandardiseError) as exc:
        typer.echo(f"recipe failed: {exc}")
        raise typer.Exit(code=1) from exc
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(dump_scene(scene))
    typer.echo(f"wrote {out}: {scene.id} ({len(scene.events)} events, {scene.frames[-1].t:.1f} s)")
