"""Tests for paragraph HTML sanitization on save."""

import json

import pytest
from django.apps import apps

from main.content_generation.save_entry import update_or_generate_from_request
from main.forms import ParagraphForm
from main.utils.html_sanitize import sanitize_paragraph_html
from tests.mocks import create_mock_entry

GENERATED_HTML = """<!DOCTYPE html>
<html>
<head>
  <style>h1 { color: navy; }</style>
</head>
<body>
  <h2>Example title</h2>
  <p>Example text with list</p>
  <ul>
    <li>list item 1</li>
    <li>list item 2</li>
    <li><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo><mi>π</mi></math></li>
  </ul>
  <pre><code class="language-python">print('Hello dude')</code></pre>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80">
    <clipPath id="clip"><rect width="120" height="80"/></clipPath>
    <linearGradient id="grad"><stop offset="0" stop-color="#fff"/></linearGradient>
    <g class="mermaid">
      <foreignObject width="80" height="20"><div>A</div></foreignObject>
      <path d="M10 10 C20 20, 40 20, 50 10" fill="none" stroke="#000"/>
      <polygon points="60,10 70,30 50,30"/>
    </g>
  </svg>
  <span class="katex"><span class="katex-html"><span class="base">x</span></span></span>
</body>
</html>"""


def test_sanitize_removes_script_tags_and_contents():
    """Script elements are dropped, including the JavaScript inside them."""
    html = "<p>Hi</p><script>SANITIZE_PROBE()</script>"

    cleaned = sanitize_paragraph_html(html)

    assert cleaned == "<p>Hi</p>"
    assert "SANITIZE_PROBE" not in cleaned
    assert "<script" not in cleaned.lower()


def test_sanitize_leaves_generated_html_including_svg_untouched():
    """Imported pages with SVG, MathML, and code blocks must round-trip."""
    assert sanitize_paragraph_html(GENERATED_HTML) == GENERATED_HTML


def test_sanitize_strips_scripts_inside_svg_without_rewriting_svg():
    """A script nested in SVG is removed; camelCase SVG tags stay as written."""
    html = (
        '<svg xmlns="http://www.w3.org/2000/svg">'
        '<clipPath id="c"><rect width="10" height="10"/></clipPath>'
        "<script>SANITIZE_PROBE()</script>"
        '<path d="M0 0 L10 10"/>'
        "</svg>"
    )

    cleaned = sanitize_paragraph_html(html)

    assert cleaned == (
        '<svg xmlns="http://www.w3.org/2000/svg">'
        '<clipPath id="c"><rect width="10" height="10"/></clipPath>'
        '<path d="M0 0 L10 10"/>'
        "</svg>"
    )
    assert "SANITIZE_PROBE" not in cleaned


def test_sanitize_does_not_touch_scripture_or_event_markup():
    """Only script elements are removed, not similar names or other attributes."""
    html = (
        "<p class='scripture' onclick='return false'>"
        "<a href='javascript:void(0)'>x</a>"
        "</p>"
    )

    assert sanitize_paragraph_html(html) == html


def test_sanitize_keeps_imported_document_and_drops_only_scripts():
    """Raw HTML documents keep doctype, CSS, and body markup."""
    html = (
        "<!DOCTYPE html><html><head><style>h1{color:red}</style></head>"
        "<body><h1>Imported</h1><script>SANITIZE_PROBE()</script></body></html>"
    )

    cleaned = sanitize_paragraph_html(html)

    assert cleaned == (
        "<!DOCTYPE html><html><head><style>h1{color:red}</style></head>"
        "<body><h1>Imported</h1></body></html>"
    )


@pytest.mark.django_db
def test_paragraph_form_sanitizes_text():
    """ParagraphForm cleans HTML before the model is saved."""
    entry = create_mock_entry()
    form = ParagraphForm(
        {
            "entry": entry.pk,
            "text": "<p>Hi</p><script>SANITIZE_PROBE()</script>",
            "height": 200,
            "allow_ai_synthesis": 1,
        }
    )

    assert form.is_valid(), form.errors
    assert form.cleaned_data["text"] == "<p>Hi</p>"
    assert "SANITIZE_PROBE" not in form.cleaned_data["text"]


@pytest.mark.django_db
def test_save_entry_stores_sanitized_paragraph_html():
    """Saving a paragraph persists sanitized HTML, not script tags."""
    Entry = apps.get_model("main", "Entry")
    EntryParagraph = apps.get_model("main", "EntryParagraph")

    response = update_or_generate_from_request(
        {
            "name": "2025-03-01",
            "content": {
                "paragraph1": {
                    "entry": "2025-03-01",
                    "text": "<p>Hi</p><script>SANITIZE_PROBE()</script>",
                    "height": 200,
                    "allow_ai_synthesis": 1,
                }
            },
        }
    )

    data = json.loads(response.content)
    assert "success" in data

    entry = Entry.objects.get(name="2025-03-01")
    content = entry.content.first()
    assert content is not None
    paragraph = EntryParagraph.objects.get(pk=content.content_id)
    assert paragraph.text == "<p>Hi</p>"
    assert "SANITIZE_PROBE" not in paragraph.text
