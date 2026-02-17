"""Tests for the edit_entry_page view (URLs: /edit/... and /show/...) and load_all_content_from_entry."""

from unittest.mock import patch

import pytest

from tests.mocks import (
    create_mock_client,
    create_mock_entry,
    create_mock_entry_with_paragraph,
)


@pytest.mark.django_db
def test_edit_page_returns_200_for_valid_date():
    """GET /edit/2025/February/12/ should return 200 when an entry exists."""
    client = create_mock_client()
    create_mock_entry()

    with patch(
        "main.database_layer.get_context.load_all_content_from_entry",
        return_value={"entry_exists": True, "saved_content": {}},
    ):
        response = client.get("/edit/2025/February/12/")

    assert response.status_code == 200
    assert "day.html" in [t.name for t in response.templates]


@pytest.mark.django_db
def test_edit_page_includes_tinymce_form():
    """The edit page context must include 'tiny_mce' for the TinyMCE editor."""
    client = create_mock_client()
    create_mock_entry()

    with patch(
        "main.database_layer.get_context.load_all_content_from_entry",
        return_value={"entry_exists": True, "saved_content": {}},
    ):
        response = client.get("/edit/2025/February/12/")

    assert "tiny_mce" in response.context


@pytest.mark.django_db
def test_show_page_uses_same_view_as_edit():
    """/show/ maps to the same view function as /edit/."""
    client = create_mock_client()
    create_mock_entry()

    with patch(
        "main.database_layer.get_context.load_all_content_from_entry",
        return_value={"entry_exists": True, "saved_content": {}},
    ):
        response = client.get("/show/2025/February/12/")

    assert response.status_code == 200
    assert "day.html" in [t.name for t in response.templates]


@pytest.mark.django_db
def test_edit_page_redirects_for_invalid_month():
    """GET /edit/2025/Smarch/12/ should redirect to /date-not-found."""
    client = create_mock_client()
    response = client.get("/edit/2025/Smarch/12/")

    assert response.status_code == 302
    assert response["Location"] == "/date-not-found"


@pytest.mark.django_db
def test_edit_page_redirects_for_impossible_date():
    """GET /edit/2025/February/31/ should redirect (Feb 31 doesn't exist)."""
    client = create_mock_client()
    create_mock_entry()
    response = client.get("/edit/2025/February/31/")

    assert response.status_code == 302
    assert response["Location"] == "/date-not-found"


@pytest.mark.django_db
def test_edit_page_redirects_when_context_is_none():
    """If put_day_and_month_names_into_context returns None, redirect."""
    client = create_mock_client()
    with patch("main.views.put_day_and_month_names_into_context", return_value=None):
        response = client.get("/edit/2025/February/12/")

    assert response.status_code == 302
    assert response["Location"] == "/date-not-found"


@pytest.mark.django_db
def test_edit_page_loads_paragraph_content():
    """When an entry has paragraph content, it should appear in the template context."""
    client = create_mock_client()
    create_mock_entry_with_paragraph()

    paragraph_data = {"paragraph1": {"text": "<p>Hello World</p>", "height": 200}}
    with patch(
        "main.database_layer.get_context.load_all_content_from_entry",
        return_value={
            "entry_exists": True,
            "saved_content": paragraph_data,
        },
    ):
        response = client.get("/edit/2025/February/12/")

    assert response.status_code == 200
    assert response.context["saved_content"] == paragraph_data


@pytest.mark.django_db
def test_edit_page_for_date_without_entry():
    """Visiting an edit page for a valid date with no entry should still render."""
    client = create_mock_client()
    create_mock_entry()

    with patch(
        "main.database_layer.get_context.load_all_content_from_entry",
        return_value={"entry_exists": False, "saved_content": {}},
    ):
        response = client.get("/edit/2025/February/11/")

    assert response.status_code == 200


@pytest.mark.django_db
def test_load_nonexistent_entry():
    """Loading content for a slug with no Entry should return entry_exists=False."""
    from main.content_generation.load_entry import load_all_content_from_entry

    result = load_all_content_from_entry("1999-01-01")

    assert result["entry_exists"] is False
    assert not result["saved_content"]


@pytest.mark.django_db
def test_load_entry_with_paragraph():
    """Loading content for an entry with a paragraph should return entry_exists=True."""
    from main.content_generation.load_entry import load_all_content_from_entry

    create_mock_entry_with_paragraph()

    with patch(
        "main.models.EntryParagraph.view",
        return_value={"text": "<p>Hello World</p>", "height": 200},
    ):
        result = load_all_content_from_entry("2025-02-12")

    assert result["entry_exists"] is True
    assert len(result["saved_content"]) == 1


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
