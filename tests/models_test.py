"""Tests for Entry, Content, EntryParagraph, EntryImage, and EntryVideo models."""

from datetime import datetime
from unittest.mock import patch

import pytest

from tests.mocks import create_mock_entry


@pytest.mark.django_db
def test_create_entry():
    """Creating an Entry should persist it in the database."""
    from main.models import Entry

    entry = Entry.objects.create(
        name="2025-06-15",
        date=datetime(2025, 6, 15),
        first_created=datetime(2025, 6, 15),
        last_edited=datetime(2025, 6, 15),
    )
    assert Entry.objects.filter(name="2025-06-15").exists()
    assert entry.pk == "2025-06-15"


@pytest.mark.django_db
def test_entry_content_many_to_many():
    """An Entry can have multiple Content objects linked via M2M."""
    from main.models import Content

    entry = create_mock_entry()

    c1 = Content.objects.create(content_type="paragraph", content_id=1)
    c2 = Content.objects.create(content_type="image", content_id=2)

    entry.content.add(c1, c2)

    assert entry.content.count() == 2


@pytest.mark.django_db
def test_create_content():
    """A Content record stores a content_type and content_id."""
    from main.models import Content

    content = Content.objects.create(content_type="paragraph", content_id=42)
    assert content.content_type == "paragraph"
    assert content.content_id == 42


@pytest.mark.django_db
def test_content_str():
    """__str__ should combine content_type and content_id."""
    from main.models import Content

    content = Content.objects.create(content_type="image", content_id=7)
    assert str(content) == "image7"


@pytest.mark.django_db
def test_create_paragraph():
    """EntryParagraph stores HTML text and a height tied to an Entry."""
    from main.models import EntryParagraph

    entry = create_mock_entry()
    para = EntryParagraph.objects.create(
        entry=entry,
        text="<p>Test paragraph</p>",
        height=150,
    )
    assert para.text == "<p>Test paragraph</p>"
    assert para.height == 150
    assert para.entry == entry


@pytest.mark.django_db
def test_paragraph_view_method():
    """view() should return a dict with text and height keys."""
    from main.models import EntryParagraph

    entry = create_mock_entry()
    para = EntryParagraph.objects.create(
        entry=entry,
        text="<h1>Title</h1>",
        height=300,
    )
    result = para.view()

    assert result == {"text": "<h1>Title</h1>", "height": 300}


@pytest.mark.django_db
def test_paragraph_str():
    """__str__ should return the raw text content."""
    from main.models import EntryParagraph

    entry = create_mock_entry()
    para = EntryParagraph.objects.create(
        entry=entry,
        text="Hello",
        height=100,
    )
    assert str(para) == "Hello"


@pytest.mark.django_db
def test_create_image():
    """EntryImage stores a file_path and original flag tied to an Entry."""
    from main.models import EntryImage

    entry = create_mock_entry()
    img = EntryImage.objects.create(
        entry=entry,
        file_path="2025-02-12/photo.jpg",
        original=True,
    )
    assert img.file_path == "2025-02-12/photo.jpg"
    assert img.original is True


@pytest.mark.django_db
def test_image_str():
    """__str__ should return the file_path."""
    from main.models import EntryImage

    entry = create_mock_entry()
    img = EntryImage.objects.create(
        entry=entry,
        file_path="some/path.jpg",
        original=False,
    )
    assert str(img) == "some/path.jpg"


@pytest.mark.django_db
def test_image_view_method():
    """view() should return image_id, file_name, and original flag for async loading."""
    from main.models import EntryImage

    entry = create_mock_entry()
    img = EntryImage.objects.create(
        entry=entry,
        file_path="2025-02-12/photo.jpg",
        original=True,
    )

    result = img.view()

    assert result["image_id"] == img.pk
    assert result["file_name"] == "photo.jpg"
    assert result["original"] == 1


@pytest.mark.django_db
def test_image_view_non_original():
    """When original=False, view() dict should have original=0."""
    from main.models import EntryImage

    entry = create_mock_entry()
    img = EntryImage.objects.create(
        entry=entry,
        file_path="2025-02-12/resized.jpg",
        original=False,
    )

    result = img.view()

    assert result["original"] == 0


@pytest.mark.django_db
def test_create_video():
    """EntryVideo stores a file_path and original flag."""
    from main.models import EntryVideo

    entry = create_mock_entry()
    vid = EntryVideo.objects.create(
        entry=entry,
        file_path="2025-02-12/clip.mp4",
        original=True,
    )
    assert vid.file_path == "2025-02-12/clip.mp4"
    assert vid.original is True


@pytest.mark.django_db
def test_video_view_method():
    """view() should return video_id, file_name, and original flag for async loading."""
    from main.models import EntryVideo

    entry = create_mock_entry()
    vid = EntryVideo.objects.create(
        entry=entry,
        file_path="2025-02-12/clip.mp4",
        original=True,
    )

    result = vid.view()

    assert result["video_id"] == vid.pk
    assert result["file_name"] == "clip.mp4"
    assert result["original"] == 1


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
