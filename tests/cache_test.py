"""Tests for cache utilities."""

import pytest

from main.utils.cache import cache_string


def test_cache_string_stores_value():
    """A non-blank result should be cached so the wrapped function is only called once."""
    call_count = 0

    @cache_string
    def get_value(_key):
        nonlocal call_count
        call_count += 1
        return "result"

    assert get_value("key") == "result"
    assert get_value("key") == "result"
    assert call_count == 1


def test_cache_string_does_not_store_blank_string():
    """A blank result should not be cached so the wrapped function is called every time."""
    call_count = 0

    @cache_string
    def get_value(_key):
        nonlocal call_count
        call_count += 1
        return ""

    assert get_value("key") == ""
    assert get_value("key") == ""
    assert call_count == 2


if __name__ == "__main__":
    pytest.main([__file__, "-x", "--verbose"])
