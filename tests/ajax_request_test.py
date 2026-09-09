"""Tests for the @ajax_request decorator and ajax_request.py helper functions."""

from unittest.mock import MagicMock

import pytest
from django.core.exceptions import ValidationError
from django.http import QueryDict

from main.database_layer.ajax_request import (
    ajax_request,
    convert_query_into_nested_dict,
)
from tests.mocks import create_mock_client, create_ajax_headers

FORM_CONTENT_TYPE = "application/x-www-form-urlencoded"


@pytest.mark.django_db
def test_non_ajax_get_returns_404():
    """A normal browser GET to an AJAX endpoint should return 404."""
    client = create_mock_client()
    response = client.get("/ajax/save-entry/")
    assert response.status_code == 404


@pytest.mark.django_db
def test_non_ajax_post_returns_404():
    """A POST without the XMLHttpRequest header should return 404."""
    client = create_mock_client()
    response = client.post(
        "/ajax/save-entry/",
        data="name=test",
        content_type=FORM_CONTENT_TYPE,
    )
    assert response.status_code == 404


@pytest.mark.django_db
def test_ajax_get_without_post_data_returns_404():
    """An AJAX GET request (no POST body) returns 404."""
    client = create_mock_client()
    response = client.get("/ajax/save-entry/", **create_ajax_headers())
    assert response.status_code == 404


@pytest.mark.django_db
def test_ajax_post_without_data_returns_404():
    """An AJAX POST with an empty body should return 404."""
    client = create_mock_client()
    response = client.post("/ajax/save-entry/", **create_ajax_headers())
    assert response.status_code == 404


# --- Helper functions in ajax_request.py ---


def test_extract_nested_key_simple():
    """A key with no brackets should return a single-element list."""
    from main.database_layer.ajax_request import extract_nested_key

    assert extract_nested_key("name") == ["name"]


def test_extract_nested_key_nested():
    """Keys like 'content[image1][file_path]' should split into parts."""
    from main.database_layer.ajax_request import extract_nested_key

    result = extract_nested_key("content[image1][file_path]")
    assert result == ["content", "image1", "file_path"]


def test_convert_query_into_nested_dict():
    """A flat QueryDict with bracket-notation keys should become a nested dict."""
    from main.database_layer.ajax_request import convert_query_into_nested_dict

    q = QueryDict(mutable=True)
    q["name"] = "2025-02-12"
    q["content[paragraph1][text]"] = "<p>Hello</p>"
    q["content[paragraph1][height]"] = "200"

    result = convert_query_into_nested_dict(q)

    assert result["name"] == "2025-02-12"
    assert result["content"]["paragraph1"]["text"] == "<p>Hello</p>"
    assert result["content"]["paragraph1"]["height"] == "200"


def test_convert_query_tolerates_unclosed_bracket():
    """An unclosed bracket must not raise IndexError."""
    result = convert_query_into_nested_dict(QueryDict("content[=1"))

    assert list(result) == ["content"]


def test_convert_query_rejects_scalar_used_as_parent():
    """A key used as both a value and a nest parent is rejected."""
    with pytest.raises(ValidationError):
        convert_query_into_nested_dict(QueryDict("content=1&content[x]=2"))


def test_ajax_request_returns_error_for_scalar_parent_conflict():
    """Malformed nested keys must not 500; the decorator returns a JSON error."""

    @ajax_request
    def view(_post_data):
        raise AssertionError("view should not run for a malformed body")

    request = MagicMock()
    request.META = {"HTTP_X_REQUESTED_WITH": "XMLHttpRequest"}
    request.POST = QueryDict("content=1&content[x]=2")

    response = view(request)

    assert response.status_code == 200
    assert b"error" in response.content


def test_is_ajax_with_correct_header():
    """is_ajax should return True when the XMLHttpRequest header is set."""
    from main.database_layer.ajax_request import is_ajax

    request = MagicMock()
    request.META = {"HTTP_X_REQUESTED_WITH": "XMLHttpRequest"}
    assert is_ajax(request) is True


def test_is_ajax_without_header():
    """is_ajax should return False when the header is missing."""
    from main.database_layer.ajax_request import is_ajax

    request = MagicMock()
    request.META = {}
    assert is_ajax(request) is False


def test_is_ajax_no_meta():
    """is_ajax should return False when request has no META attr."""
    from main.database_layer.ajax_request import is_ajax

    request = MagicMock(spec=[])
    assert is_ajax(request) is False


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
