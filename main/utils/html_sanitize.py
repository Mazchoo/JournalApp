"""Remove script elements from stored paragraph HTML."""

from typing import Optional, Tuple

_SCRIPT_OPEN = "<script"
_SCRIPT_CLOSE = "</script"


def sanitize_paragraph_html(html: str) -> str:
    """Drop script tags and their contents; leave every other byte unchanged."""
    lower = html.lower()
    pieces = []
    cursor = 0
    search_from = 0

    while True:
        start = _find_tag(lower, _SCRIPT_OPEN, search_from)
        if start is None:
            pieces.append(html[cursor:])
            break

        pieces.append(html[cursor:start])
        after_open, self_closing = _consume_start_tag(html, start)
        if self_closing:
            cursor = after_open
            search_from = after_open
            continue

        close = _find_tag(lower, _SCRIPT_CLOSE, after_open)
        if close is None:
            break

        cursor = _consume_end_tag(html, close)
        search_from = cursor

    return "".join(pieces)


def _find_tag(lower: str, tag: str, start: int) -> Optional[int]:
    """Index of `tag` when it is a real tag name, not a longer name."""
    pos = start
    while True:
        found = lower.find(tag, pos)
        if found == -1:
            return None
        after = found + len(tag)
        if after == len(lower) or not _is_name_char(lower[after]):
            return found
        pos = after


def _is_name_char(char: str) -> bool:
    """True if `char` can continue an HTML tag name."""
    return char.isalnum() or char in "-_:"


def _consume_start_tag(html: str, start: int) -> Tuple[int, bool]:
    """Return index after `>` and whether the opening tag is self-closing."""
    quote = ""
    self_closing = False
    for index in range(start, len(html)):
        char = html[index]
        if quote:
            if char == quote:
                quote = ""
            continue
        if char in "\"'":
            quote = char
            self_closing = False
        elif char == "/":
            self_closing = True
        elif char == ">":
            return index + 1, self_closing
        elif not char.isspace():
            self_closing = False
    return len(html), True


def _consume_end_tag(html: str, start: int) -> int:
    """Return index after the `>` that closes `</script`."""
    close = html.find(">", start)
    if close == -1:
        return len(html)
    return close + 1
