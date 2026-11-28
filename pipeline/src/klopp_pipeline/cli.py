"""Command line entry point: ``uv run --project pipeline klopp-pipeline <command>``."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated

import typer

from klopp_pipeline import landmarks as landmarks_mod
from klopp_pipeline import net, standardise
from klopp_pipeline import publish as publish_mod
from klopp_pipeline.coverage import PROVIDERS, run_coverage, write_outputs
from klopp_pipeline.fetch import RAW_ROOT, fetch_source
from klopp_pipeline.manifest import ManifestError, write_scene_version
from klopp_pipeline.net import FetchError
from klopp_pipeline.recipes import RECIPES
from klopp_pipeline.scene import dump_scene
from klopp_pipeline.sources import get_source, load_allow_list

app = typer.Typer(help="Open-data pipeline for The Next Klopp.", no_args_is_help=True)

# pipeline/src/klopp_pipeline/cli.py -> parents[3] is the repository root
REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_OUT = REPO_ROOT / "research" / "pl-data-sources"
DEFAULT_LANDMARKS = REPO_ROOT / "src" / "pitch" / "fixtures" / "landmarks.json"
DEFAULT_DATA = REPO_ROOT / "data"
DEFAULT_PUBLIC = REPO_ROOT / "public" / "data"


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
DATA_DIR_HELP = "Folder for immutable dataset versions (data/<dataset>/<version>/)."
PUBLIC_DIR_HELP = "Folder served by the app (shippable versions and catalog.json)."
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
    out: Annotated[Path | None, typer.Option(help="Also write the scene JSON here (a preview).")] = None,
    offline: Annotated[bool, typer.Option(help=OFFLINE_HELP)] = False,
    raw_dir: Annotated[Path, typer.Option(help=RAW_DIR_HELP)] = RAW_ROOT,
    data_dir: Annotated[Path, typer.Option(help=DATA_DIR_HELP)] = DEFAULT_DATA,
) -> None:
    """Build one scene from a registered recipe and write it as an immutable version."""
    if name not in RECIPES:
        raise typer.BadParameter(f"unknown recipe {name!r}; choose from {list(RECIPES)}")
    chosen = RECIPES[name]
    allow = load_allow_list()
    try:
        scene = chosen.build(raw_dir, offline)
        result = write_scene_version(
            scene,
            source=get_source(allow, chosen.source_id),
            recipe=chosen.name,
            dataset=chosen.dataset,
            raw_root=raw_dir,
            data_root=data_dir,
        )
    except (FetchError, standardise.StandardiseError, ManifestError) as exc:
        typer.echo(f"recipe failed: {exc}")
        raise typer.Exit(code=1) from exc
    state = "wrote" if result.created else "already present"
    typer.echo(f"{state} {result.path} ({scene.id}, {len(scene.events)} events, {scene.frames[-1].t:.1f} s)")
    if out is not None:
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(dump_scene(scene))
        typer.echo(f"preview {out}")


@app.command("publish")
def publish_cmd(
    data_dir: Annotated[Path, typer.Option(help=DATA_DIR_HELP)] = DEFAULT_DATA,
    public_dir: Annotated[Path, typer.Option(help=PUBLIC_DIR_HELP)] = DEFAULT_PUBLIC,
) -> None:
    """Copy shippable versions into public/data and refresh catalog.json."""
    try:
        result = publish_mod.publish(data_root=data_dir, public_root=public_dir, allow=load_allow_list())
    except ManifestError as exc:
        typer.echo(f"publish failed: {exc}")
        raise typer.Exit(code=1) from exc
    for path in result.copied:
        typer.echo(f"published {path}")
    for label in result.skipped:
        typer.echo(f"not shippable, kept local: {label}")
    typer.echo(f"catalog {'written' if result.catalog_written else 'unchanged'}: {result.catalog}")


@app.command("run-all")
def run_all(
    sources: Annotated[
        Path | None, typer.Option(help="Source allow-list file (default: pipeline/sources.allow.json).")
    ] = None,
    offline: Annotated[bool, typer.Option(help=OFFLINE_HELP)] = False,
    raw_dir: Annotated[Path, typer.Option(help=RAW_DIR_HELP)] = RAW_ROOT,
    data_dir: Annotated[Path, typer.Option(help=DATA_DIR_HELP)] = DEFAULT_DATA,
    public_dir: Annotated[Path, typer.Option(help=PUBLIC_DIR_HELP)] = DEFAULT_PUBLIC,
) -> None:
    """Fetch the sources the recipes need, run every recipe, then publish. Safe to run twice."""
    new_files = 0
    try:
        allow = load_allow_list(sources) if sources is not None else load_allow_list()
        needed = sorted({r.source_id for r in RECIPES.values()})
        for source in allow.sources:
            if source.id in needed and source.files:
                paths = fetch_source(source.id, allow=allow, raw_root=raw_dir, offline=offline)
                typer.echo(f"{source.id}: {len(paths)} file(s) verified")
        for chosen in RECIPES.values():
            scene = chosen.build(raw_dir, offline)
            result = write_scene_version(
                scene,
                source=get_source(allow, chosen.source_id),
                recipe=chosen.name,
                dataset=chosen.dataset,
                raw_root=raw_dir,
                data_root=data_dir,
            )
            if result.created:
                new_files += len(list(result.path.iterdir()))
            typer.echo(f"{chosen.name}: {'wrote' if result.created else 'already present'} {result.path.name}")
        outcome = publish_mod.publish(data_root=data_dir, public_root=public_dir, allow=allow)
    except (FetchError, standardise.StandardiseError, ManifestError) as exc:
        typer.echo(f"run-all failed: {exc}")
        raise typer.Exit(code=1) from exc
    for path in outcome.copied:
        new_files += len(list(path.iterdir()))
        typer.echo(f"published {path.parent.name}/{path.name}")
    for label in outcome.skipped:
        typer.echo(f"not shippable, kept local: {label}")
    if outcome.catalog_written:
        new_files += 1
        typer.echo(f"catalog written: {outcome.catalog.name}")
    typer.echo(f"done: {new_files} new file(s)" if new_files else "done: no new files")
