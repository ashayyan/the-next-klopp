"""Versioned, immutable dataset output and the shippable-only publish step (synthetic bytes only)."""

from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path

import pytest

from klopp_pipeline.manifest import (
    MANIFEST_NAME,
    MAX_SHIPPABLE_FILE_BYTES,
    ImmutableVersionError,
    ManifestError,
    VersionMeta,
    inside,
    read_version,
    version_id,
    write_version,
)
from klopp_pipeline.publish import build_catalog, publish
from klopp_pipeline.sources import AllowListFile

SCENE = (json.dumps({"id": "demo-scene", "label": "Demo scene"}) + "\n").encode("utf-8")
FILES = {"scene-demo-scene.json": SCENE, "scene-other.json": b'{"id": "other", "label": "Other"}\n'}
URL = "https://ndownloader.figshare.com/files/1"


def meta(*, shippable: bool = True, source_id: str = "demo") -> VersionMeta:
    return VersionMeta(
        source_id=source_id,
        recipe="demo-recipe",
        license="CC-BY-4.0",
        licence_url="https://creativecommons.org/licenses/by/4.0/",
        attribution="Data: demo",
        shippable=shippable,
        row_counts={"scenes": 2},
        inputs={"raw.json": "a" * 64},
    )


def allow(*, shippable: bool = True) -> AllowListFile:
    return AllowListFile.model_validate(
        {
            "schemaVersion": 1,
            "sources": [
                {
                    "id": "demo",
                    "licence": "CC-BY-4.0",
                    "licenceUrl": "https://creativecommons.org/licenses/by/4.0/",
                    "shippable": shippable,
                    "attribution": "Data: demo",
                    "files": [{"name": "raw.json", "url": URL, "maxBytes": 10, "sha256": "a" * 64}],
                }
            ],
        }
    )


# --- version ids -------------------------------------------------------------------------------


def test_version_id_has_the_v1_hash_shape() -> None:
    assert len(version_id(FILES)) == len("v1-") + 12
    lines = "".join(f"{p}:{hashlib.sha256(b).hexdigest()}\n" for p, b in sorted(FILES.items()))
    assert version_id(FILES) == "v1-" + hashlib.sha256(lines.encode()).hexdigest()[:12]


def test_version_id_ignores_insertion_order_and_changes_with_one_byte() -> None:
    reordered = dict(reversed(list(FILES.items())))
    assert version_id(reordered) == version_id(FILES)
    changed = {**FILES, "scene-other.json": FILES["scene-other.json"].replace(b"Other", b"Othes")}
    assert version_id(changed) != version_id(FILES)


# --- the writer --------------------------------------------------------------------------------


def test_a_version_is_written_with_a_complete_manifest(tmp_path: Path) -> None:
    result = write_version("demo", FILES, meta(), data_root=tmp_path, now="2026-01-01T00:00:00Z")
    assert result.created and result.path == (tmp_path / "demo" / version_id(FILES)).resolve()
    manifest, files = read_version(result.path)
    assert files == FILES
    assert (manifest.dataset, manifest.version) == ("demo", version_id(FILES))
    assert manifest.sourceId == "demo" and manifest.recipe == "demo-recipe"
    assert manifest.license == "CC-BY-4.0" and manifest.shippable is True
    assert manifest.generatedAt == "2026-01-01T00:00:00Z"
    assert manifest.rowCounts == {"scenes": 2}
    assert [f.path for f in manifest.files] == sorted(FILES)
    assert manifest.inputs[0].name == "raw.json"
    raw = (result.path / MANIFEST_NAME).read_bytes()
    assert raw.endswith(b"\n") and b"\r" not in raw


def test_writing_the_same_files_again_is_a_no_op_and_keeps_generated_at(tmp_path: Path) -> None:
    first = write_version("demo", FILES, meta(), data_root=tmp_path, now="2026-01-01T00:00:00Z")
    before = (first.path / MANIFEST_NAME).read_bytes()
    second = write_version("demo", FILES, meta(), data_root=tmp_path, now="2030-12-31T23:59:59Z")
    assert second.created is False and second.path == first.path
    assert (first.path / MANIFEST_NAME).read_bytes() == before


def test_a_changed_byte_under_an_existing_version_is_refused_and_nothing_changes(tmp_path: Path) -> None:
    path = write_version("demo", FILES, meta(), data_root=tmp_path).path
    victim = path / "scene-demo-scene.json"
    victim.write_bytes(SCENE.replace(b"Demo", b"Dumb"))
    snapshot = {p.name: p.read_bytes() for p in path.iterdir()}
    with pytest.raises(ImmutableVersionError):
        write_version("demo", FILES, meta(), data_root=tmp_path)
    assert {p.name: p.read_bytes() for p in path.iterdir()} == snapshot
    assert [p.name for p in (tmp_path / "demo").iterdir()] == [path.name]  # no staging leftovers


def test_an_extra_file_in_an_existing_version_is_refused(tmp_path: Path) -> None:
    path = write_version("demo", FILES, meta(), data_root=tmp_path).path
    (path / "scene-sneaky.json").write_bytes(b"{}\n")
    with pytest.raises(ImmutableVersionError):
        write_version("demo", FILES, meta(), data_root=tmp_path)


@pytest.mark.parametrize("dataset", ["../x", "A", "x/y", ".hidden", "", "x\\y", "a..b"])
def test_bad_dataset_names_are_rejected(tmp_path: Path, dataset: str) -> None:
    with pytest.raises(ManifestError):
        write_version(dataset, FILES, meta(), data_root=tmp_path)
    assert list(tmp_path.iterdir()) == []


@pytest.mark.parametrize("name", ["../x.json", "manifest.json", "A.json", "a.txt", "a/b.json", ".json"])
def test_bad_file_names_are_rejected(tmp_path: Path, name: str) -> None:
    with pytest.raises(ManifestError):
        write_version("demo", {name: b"{}\n"}, meta(), data_root=tmp_path)
    assert list(tmp_path.iterdir()) == []


def test_a_path_outside_the_data_root_is_rejected(tmp_path: Path) -> None:
    with pytest.raises(ManifestError, match="outside"):
        inside(tmp_path / "root", tmp_path / "root" / ".." / "elsewhere")
    assert inside(tmp_path, tmp_path / "a" / "b") == (tmp_path / "a" / "b").resolve()


def test_a_shippable_file_over_one_megabyte_is_refused(tmp_path: Path) -> None:
    big = {"scene-big.json": b"x" * (MAX_SHIPPABLE_FILE_BYTES + 1)}
    with pytest.raises(ManifestError, match="cap"):
        write_version("demo", big, meta(shippable=True), data_root=tmp_path)
    assert write_version("demo", big, meta(shippable=False), data_root=tmp_path).created


def test_read_version_detects_a_tampered_file(tmp_path: Path) -> None:
    path = write_version("demo", FILES, meta(), data_root=tmp_path).path
    (path / "scene-other.json").write_bytes(b"{}\n")
    with pytest.raises(ManifestError, match="manifest"):
        read_version(path)


# --- publish -----------------------------------------------------------------------------------


def test_publish_copies_shippable_versions_and_writes_a_catalog(tmp_path: Path) -> None:
    data, public = tmp_path / "data", tmp_path / "public"
    version = write_version("demo", FILES, meta(), data_root=data).path
    result = publish(data_root=data, public_root=public, allow=allow())
    copied = public / "demo" / version.name
    assert result.copied == [copied.resolve()] and result.catalog_written
    assert {p.name: p.read_bytes() for p in copied.iterdir()} == {
        p.name: p.read_bytes() for p in version.iterdir()
    }
    catalog = json.loads((public / "catalog.json").read_bytes())
    entry = catalog["datasets"][0]
    assert (entry["dataset"], entry["version"]) == ("demo", version.name)
    assert entry["manifest"] == f"demo/{version.name}/manifest.json"
    assert {f["path"] for f in entry["files"]} == {
        f"demo/{version.name}/{n}" for n in [*FILES, MANIFEST_NAME]
    }
    for f in entry["files"]:
        data_bytes = (public / f["path"]).read_bytes()
        assert f["sha256"] == hashlib.sha256(data_bytes).hexdigest() and f["bytes"] == len(data_bytes)
    assert [s["id"] for s in entry["scenes"]] == ["demo-scene", "other"]
    # The only time in the catalog is the manifest's stored generatedAt, never the current time.
    manifest = json.loads((public / "demo" / version.name / MANIFEST_NAME).read_bytes())
    assert entry["generatedAt"] == manifest["generatedAt"]
    assert json.dumps(catalog).count("generatedAt") == 1


def test_catalog_orders_versions_of_a_dataset_by_generated_at_not_by_hash(tmp_path: Path) -> None:
    other = {"scene-other.json": b'{"id": "other", "label": "Other", "n": 2}\n'}
    for older, newer in ((FILES, other), (other, FILES)):
        root = tmp_path / f"run-{len(list(tmp_path.iterdir()))}"
        data, public = root / "data", root / "public"
        first = write_version("demo", older, meta(), data_root=data, now="2026-01-01T00:00:00Z").path
        second = write_version("demo", newer, meta(), data_root=data, now="2026-02-01T00:00:00Z").path
        publish(data_root=data, public_root=public, allow=allow())
        catalog = json.loads((public / "catalog.json").read_bytes())
        assert [d["version"] for d in catalog["datasets"]] == [first.name, second.name]


def test_a_leftover_staging_folder_does_not_break_publish_or_the_catalog(tmp_path: Path) -> None:
    data, public = tmp_path / "data", tmp_path / "public"
    version = write_version("demo", FILES, meta(), data_root=data).path
    # What a hard crash leaves behind: a staging copy that already holds its manifest.
    shutil.copytree(version, version.parent / f".{version.name}.tmp")
    publish(data_root=data, public_root=public, allow=allow())
    shutil.copytree(version, public / "demo" / f".{version.name}.tmp")
    catalog = json.loads(build_catalog(public))
    assert [d["version"] for d in catalog["datasets"]] == [version.name]


def test_publish_skips_a_version_whose_manifest_says_not_shippable(tmp_path: Path) -> None:
    data, public = tmp_path / "data", tmp_path / "public"
    version = write_version("demo", FILES, meta(shippable=False), data_root=data).path
    result = publish(data_root=data, public_root=public, allow=allow())
    assert result.copied == [] and result.skipped == [f"demo/{version.name}"]
    assert not (public / "demo").exists()
    assert json.loads((public / "catalog.json").read_bytes())["datasets"] == []


def test_publish_skips_a_version_when_the_allow_list_says_not_shippable(tmp_path: Path) -> None:
    data, public = tmp_path / "data", tmp_path / "public"
    write_version("demo", FILES, meta(shippable=True), data_root=data)
    result = publish(data_root=data, public_root=public, allow=allow(shippable=False))
    assert result.copied == [] and len(result.skipped) == 1
    assert not (public / "demo").exists()


def test_publish_twice_changes_nothing_and_does_not_rewrite_the_catalog(tmp_path: Path) -> None:
    data, public = tmp_path / "data", tmp_path / "public"
    write_version("demo", FILES, meta(), data_root=data)
    publish(data_root=data, public_root=public, allow=allow())
    before = (public / "catalog.json").read_bytes()
    again = publish(data_root=data, public_root=public, allow=allow())
    assert again.copied == [] and again.catalog_written is False
    assert (public / "catalog.json").read_bytes() == before == build_catalog(public)


def test_publish_refuses_to_change_an_existing_public_version(tmp_path: Path) -> None:
    data, public = tmp_path / "data", tmp_path / "public"
    version = write_version("demo", FILES, meta(), data_root=data).path
    publish(data_root=data, public_root=public, allow=allow())
    (public / "demo" / version.name / "scene-other.json").write_bytes(b"{}\n")
    with pytest.raises(ImmutableVersionError):
        publish(data_root=data, public_root=public, allow=allow())


def test_publish_refuses_a_data_version_that_no_longer_matches_its_manifest(tmp_path: Path) -> None:
    data, public = tmp_path / "data", tmp_path / "public"
    version = write_version("demo", FILES, meta(), data_root=data).path
    (version / "scene-other.json").write_bytes(b"{}\n")
    with pytest.raises(ManifestError):
        publish(data_root=data, public_root=public, allow=allow())
    assert not (public / "demo").exists()
