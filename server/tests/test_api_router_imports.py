"""Tests for API server imports router — HTML → ProseMirror, Markdown → ProseMirror."""

from __future__ import annotations

import json
import sys
from unittest.mock import patch

import pytest

sys.path.insert(0, "api-server")

from routers.imports import (
    convert_html_to_prosemirror,
    HtmlToProseMirror,
    _markdown_to_prosemirror,
    _make_id,
)


class TestHtmlToProseMirror:
    def test_empty_html(self):
        doc = convert_html_to_prosemirror("")
        assert doc["type"] == "doc"
        assert len(doc["content"]) == 1
        assert doc["content"][0]["type"] == "paragraph"

    def test_paragraph(self):
        doc = convert_html_to_prosemirror("<p>Hello world</p>")
        assert doc["type"] == "doc"
        assert doc["content"][0]["type"] == "paragraph"

    def test_headings(self):
        doc = convert_html_to_prosemirror("<h1>Title</h1><h2>Subtitle</h2>")
        assert doc["content"][0]["type"] == "heading"
        assert doc["content"][0]["attrs"]["level"] == 1
        assert doc["content"][1]["type"] == "heading"
        assert doc["content"][1]["attrs"]["level"] == 2

    def test_lists(self):
        doc = convert_html_to_prosemirror("<ul><li>Item</li></ul>")
        assert doc["content"][0]["type"] == "bulletList"

    def test_ordered_list(self):
        doc = convert_html_to_prosemirror("<ol><li>First</li></ol>")
        assert doc["content"][0]["type"] == "orderedList"

    def test_blockquote(self):
        doc = convert_html_to_prosemirror("<blockquote>Quote</blockquote>")
        assert doc["content"][0]["type"] == "blockquote"

    def test_code_block(self):
        doc = convert_html_to_prosemirror("<pre><code>print(1)</code></pre>")
        assert doc["content"][0]["type"] == "codeBlock"

    def test_horizontal_rule(self):
        doc = convert_html_to_prosemirror("<hr>")
        assert doc["content"][0]["type"] == "horizontalRule"

    def test_image(self):
        doc = convert_html_to_prosemirror('<img src="pic.png" alt="Photo">')
        assert doc["content"][0]["type"] == "image"
        assert doc["content"][0]["attrs"]["src"] == "pic.png"

    def test_text_formatting_bold(self):
        doc = convert_html_to_prosemirror("<p><strong>Bold</strong></p>")
        assert doc["type"] == "doc"

    def test_text_formatting_italic(self):
        doc = convert_html_to_prosemirror("<p><em>Italic</em></p>")
        assert doc["type"] == "doc"

    def test_nested_content(self):
        doc = convert_html_to_prosemirror("<div><p>Para</p></div>")
        assert doc["content"][0]["type"] == "paragraph"

    def test_mixed_content(self):
        html = "<h1>Title</h1><p>Body text</p><ul><li>Item</li></ul>"
        doc = convert_html_to_prosemirror(html)
        assert len(doc["content"]) >= 3

    def test_parser_class_direct(self):
        parser = HtmlToProseMirror()
        parser.feed("<p>Test</p>")
        doc = parser.get_doc()
        assert doc["type"] == "doc"


class TestMarkdownToProseMirror:
    def test_plain_text(self):
        doc = _markdown_to_prosemirror("Hello world")
        assert doc["type"] == "doc"
        assert any(c["type"] == "paragraph" for c in doc["content"])

    def test_headings(self):
        doc = _markdown_to_prosemirror("# Title\n\n## Subtitle")
        assert doc["type"] == "doc"
        heading_types = [c.get("attrs", {}).get("level") for c in doc["content"] if c["type"] == "heading"]
        assert heading_types == [1, 2]

    def test_multiline(self):
        doc = _markdown_to_prosemirror("Line 1\n\nLine 2")
        paragraphs = [c for c in doc["content"] if c["type"] == "paragraph"]
        assert len(paragraphs) >= 1

    def test_code_block(self):
        doc = _markdown_to_prosemirror("```python\nprint(1)\n```")
        code_blocks = [c for c in doc["content"] if c["type"] == "codeBlock"]
        assert len(code_blocks) >= 1


class TestMakeId:
    def test_prefix(self):
        pid = _make_id("page")
        assert pid.startswith("page_")

    def test_unique(self):
        with patch("routers.imports.time.time", side_effect=range(1000, 1010)):
            ids = {_make_id("page") for _ in range(10)}
            assert len(ids) == 10

    def test_default_prefix(self):
        pid = _make_id()
        assert pid.startswith("page_")
