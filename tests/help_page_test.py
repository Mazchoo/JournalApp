"""Tests for the help_page view (URL: /help)."""

import pytest

from tests.mocks import create_mock_client


@pytest.mark.django_db
def test_help_page_returns_200():
    """GET /help should return 200 with the help template."""
    client = create_mock_client()
    response = client.get("/help")

    assert response.status_code == 200
    assert "help.html" in [t.name for t in response.templates]


@pytest.mark.django_db
def test_homepage_nav_includes_help_link_on_the_right():
    """The shared top bar should link to Help after the other nav items."""
    client = create_mock_client()
    response = client.get("/")
    content = response.content.decode()

    assert 'href = "/help"' in content
    assert "[Help]" in content
    assert content.index("[Latest]") < content.index("[Help]")
    assert "ml-auto" in content


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
