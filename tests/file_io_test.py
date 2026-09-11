"""Tests for media path helpers in file_io."""

from pathlib import Path

from main.utils.file_io import (
    extract_date_from_folder,
    get_icon_file_path,
    get_stored_media_folder,
    get_stored_media_path,
    is_media_content_file,
    move_dated_folder,
    path_has_image_reserved_suffix,
    remove_empty_parent_folders,
)


def test_is_media_content_file_accepts_image_video_and_mesh():
    """Image, video, and mesh extensions are media content."""
    assert is_media_content_file(Path("photo.jpg"))
    assert is_media_content_file(Path("photo.PNG"))
    assert is_media_content_file(Path("logo.svg"))
    assert is_media_content_file(Path("clip.mp4"))
    assert is_media_content_file(Path("scan.glb"))


def test_is_media_content_file_rejects_other_extensions():
    """Non-media files are not treated as content."""
    assert not is_media_content_file(Path("notes.txt"))
    assert not is_media_content_file(Path("tags.json"))


def test_path_has_image_reserved_suffix_requires_image_extension():
    """Reserved suffixes only apply to files that are images."""
    assert path_has_image_reserved_suffix(Path("photo_icon.jpg"))
    assert path_has_image_reserved_suffix(Path("clip_resized.jpeg"))
    assert not path_has_image_reserved_suffix(Path("scan_icon.glb"))
    assert not path_has_image_reserved_suffix(Path("clip_resized.mp4"))
    assert not path_has_image_reserved_suffix(Path("photo.jpg"))
    assert not path_has_image_reserved_suffix(Path("logo.svg"))


def test_get_icon_file_path_maps_svg_to_png(settings):
    """An SVG's calendar icon is a rasterised PNG, not another SVG."""
    icon = get_icon_file_path(Path("2025/02/12/logo.svg"))
    assert (
        icon == Path(settings.ENTRY_FOLDER) / "icons" / "2025" / "02" / "logo_icon.png"
    )


def test_get_icon_file_path_keeps_existing_extensions(settings):
    """Video, mesh, and raster image icon suffixes stay as they were."""
    icons = Path(settings.ENTRY_FOLDER) / "icons" / "2025" / "02"
    assert get_icon_file_path(Path("2025/02/12/clip.mp4")) == icons / "clip_icon.jpg"
    assert get_icon_file_path(Path("2025/02/12/scan.glb")) == icons / "scan_icon.jpg"
    assert get_icon_file_path(Path("2025/02/12/photo.jpg")) == icons / "photo_icon.jpg"


def test_extract_date_from_folder():
    """Dated folder path yields day, month, year."""
    folder = Path("/entries/2025/03/01")
    assert extract_date_from_folder(folder) == ("01", "03", "2025")


def test_get_stored_media_folder_returns_none_for_malformed_date():
    """A name that is not year-month-day does not unpack into a folder path."""
    assert get_stored_media_folder("abc") is None
    assert get_stored_media_folder("a-b-c-d") is None


def test_get_stored_media_folder_returns_path_for_date_slug(settings):
    """A YYYY-MM-DD slug maps onto the dated entry folder."""
    settings.ENTRY_FOLDER = "/entries"
    assert get_stored_media_folder("2025-02-12") == "/entries/2025/02/12"


def test_get_stored_media_path_returns_none_for_malformed_date():
    """A malformed date slug yields no file path."""
    assert get_stored_media_path("photo.jpg", "abc") is None


def test_remove_empty_parent_folders_stops_at_entry_folder(tmp_path, settings):
    """Pruning an empty dated folder must not delete the entry root."""
    entries = tmp_path / "entries"
    day_folder = entries / "2025" / "02" / "12"
    day_folder.mkdir(parents=True)
    settings.ENTRY_FOLDER = str(entries)

    remove_empty_parent_folders(day_folder)

    assert entries.exists()
    assert not (entries / "2025").exists()
    assert tmp_path.exists()


def test_remove_empty_parent_folders_does_not_remove_entry_folder(tmp_path, settings):
    """Calling the pruner on the entry root must leave it in place."""
    entries = tmp_path / "entries"
    entries.mkdir()
    settings.ENTRY_FOLDER = str(entries)

    remove_empty_parent_folders(entries)

    assert entries.exists()


def test_remove_empty_parent_folders_ignores_folders_outside_entry_folder(
    tmp_path, settings
):
    """Folders outside the entry root must not be deleted."""
    entries = tmp_path / "entries"
    entries.mkdir()
    outsider = tmp_path / "other" / "empty"
    outsider.mkdir(parents=True)
    settings.ENTRY_FOLDER = str(entries)

    remove_empty_parent_folders(outsider)

    assert outsider.exists()
    assert (tmp_path / "other").exists()


def test_move_dated_folder_moves_every_file(tmp_path):
    """A date move copies the whole folder, including previews and non-media files."""
    source = tmp_path / "2025" / "02" / "12"
    source.mkdir(parents=True)
    (source / "scan.glb").write_bytes(b"glb")
    (source / "scan_resized.jpeg").write_bytes(b"jpg")
    (source / "notes.txt").write_text("keep")
    icon_dir = tmp_path / "icons" / "2025" / "02"
    icon_dir.mkdir(parents=True)
    (icon_dir / "scan_icon.jpg").write_bytes(b"icon")

    moved = move_dated_folder("2025-02-12", "2025-03-01")

    dest = tmp_path / "2025" / "03" / "01"
    assert set(moved) == {"scan.glb", "scan_resized.jpeg", "notes.txt"}
    assert (dest / "scan.glb").read_bytes() == b"glb"
    assert (dest / "scan_resized.jpeg").read_bytes() == b"jpg"
    assert (dest / "notes.txt").read_text() == "keep"
    assert (
        tmp_path / "icons" / "2025" / "03" / "scan_icon.jpg"
    ).read_bytes() == b"icon"
    assert not (tmp_path / "icons" / "2025" / "02" / "scan_icon.jpg").exists()
    assert not list(tmp_path.rglob("*_resized_icon*"))
    assert not source.exists()


def test_move_dated_folder_moves_only_named_files(tmp_path):
    """A filtered move leaves files that were already at the destination."""
    dest = tmp_path / "2025" / "03" / "01"
    dest.mkdir(parents=True)
    (dest / "scan.glb").write_bytes(b"glb")
    (dest / "already.txt").write_bytes(b"keep")

    moved = move_dated_folder("2025-03-01", "2025-02-12", ["scan.glb"])

    source = tmp_path / "2025" / "02" / "12"
    assert moved == ["scan.glb"]
    assert (source / "scan.glb").read_bytes() == b"glb"
    assert (dest / "already.txt").read_bytes() == b"keep"
    assert not (dest / "scan.glb").exists()


def test_move_dated_folder_is_noop_when_source_missing(tmp_path):
    """A paragraph-only entry has no dated folder to move."""
    move_dated_folder("2025-02-12", "2025-03-01")

    assert not (tmp_path / "2025").exists()


def test_entry_folder_is_isolated_to_tmp_path(tmp_path, settings):
    """Every test must use pytest's temp dir, not the live journal folder."""
    assert Path(settings.ENTRY_FOLDER).resolve() == tmp_path.resolve()
