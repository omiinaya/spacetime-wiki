"""
SpacetimeWiki MCP Server — modelcontextprotocol server.

Exposes wiki pages, collections, and search as AI-accessible tools and resources
so that AI agents can read, search, and navigate the wiki knowledge base.

Transport: stdio (suitable for Hermes native MCP client integration)
"""

import sys
import json
from mcp.server import Server
from mcp.types import (
    Tool,
    TextContent,
    Resource,
    ResourceTemplate,
)
from stdb_client import (
    search_pages,
    get_page,
    get_page_by_slug,
    list_collections,
    list_pages,
    get_backlinks,
    list_page_tags,
    get_linked_pages,
    map_page,
)
from config import MCP_SERVER_NAME


app = Server(MCP_SERVER_NAME)


# ─── Resources ─────────────────────────────────────────────────────────────────


@app.list_resources()
async def list_resources() -> list[Resource]:
    """List all wiki pages as resources."""
    pages = await list_pages(limit=100)
    return [
        Resource(
            uri=f"wiki://pages/{p['id']}",  # type: ignore[arg-type]
            name=p["title"],
            description=f"Wiki page: {p['title']} ({p['status']})",
            mimeType="application/json",
        )
        for p in pages
    ]


@app.read_resource()
async def read_resource(uri: str) -> str | bytes:  # type: ignore[override, arg-type]
    """Read a wiki page resource by URI."""
    if uri.startswith("wiki://pages/"):
        page_id = uri.removeprefix("wiki://pages/").split("?")[0]
        page = await get_page(page_id)
        if not page:
            raise ValueError(f"Page not found: {page_id}")
        # Fetch associated tags
        try:
            tags = await list_page_tags(page_id)
            page["tags"] = tags
        except Exception:
            page["tags"] = []
        return json.dumps(page, indent=2)
    raise ValueError(f"Unknown resource: {uri}")


@app.list_resource_templates()
async def list_resource_templates() -> list[ResourceTemplate]:
    return [
        ResourceTemplate(
            uriTemplate="wiki://pages/{id}",
            name="Wiki Page",
            description="A wiki page by ID",
            mimeType="application/json",
        ),
        ResourceTemplate(
            uriTemplate="wiki://collections/{id}",
            name="Wiki Collection",
            description="A collection by ID",
            mimeType="application/json",
        ),
    ]


# ─── Tools ─────────────────────────────────────────────────────────────────────


@app.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="wiki_search",
            description="Full-text search across all wiki pages. Searches both title and body content.",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query (case-insensitive)",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum results (default 20, max 50)",
                        "default": 20,
                    },
                },
                "required": ["query"],
            },
        ),
        Tool(
            name="wiki_read_page",
            description="Get the full content of a wiki page by ID. Returns title, content, tags, and metadata.",
            inputSchema={
                "type": "object",
                "properties": {
                    "id": {
                        "type": "string",
                        "description": "Page ID (or slug to look up by slug)",
                    },
                },
                "required": ["id"],
            },
        ),
        Tool(
            name="wiki_list_collections",
            description="List all collections (folders/categories). Returns name, icon, description, and hierarchy.",
            inputSchema={
                "type": "object",
                "properties": {},
            },
        ),
        Tool(
            name="wiki_list_pages",
            description="List wiki pages, optionally filtered by collection.",
            inputSchema={
                "type": "object",
                "properties": {
                    "collection_id": {
                        "type": "string",
                        "description": "Optional: filter by collection ID",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum results (default 50)",
                        "default": 50,
                    },
                },
            },
        ),
        Tool(
            name="wiki_get_backlinks",
            description="Find pages that link (refer) to a specific page. Useful for understanding cross-references.",
            inputSchema={
                "type": "object",
                "properties": {
                    "page_id": {
                        "type": "string",
                        "description": "Page ID to find backlinks for",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum results (default 20)",
                        "default": 20,
                    },
                },
                "required": ["page_id"],
            },
        ),
        Tool(
            name="wiki_get_linked_pages",
            description="Find pages linked from a given page via internal wiki links.",
            inputSchema={
                "type": "object",
                "properties": {
                    "page_id": {
                        "type": "string",
                        "description": "Page ID to find linked pages from",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum results (default 20)",
                        "default": 20,
                    },
                },
                "required": ["page_id"],
            },
        ),
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    if name == "wiki_search":
        query = arguments["query"]
        limit = min(arguments.get("limit", 20), 50)
        results = await search_pages(query, limit)
        if not results:
            return [TextContent(type="text", text=f"No pages found matching '{query}'")]
        lines = [f"# Search results for '{query}'\n"]
        for p in results:
            status_tag = f"[{p['status']}]" if p['status'] != 'published' else ""
            col = f" in {p['collection_id']}" if p['collection_id'] else ""
            lines.append(f"## {p['title']} {status_tag}")
            lines.append(f"  ID: {p['id']}")
            lines.append(f"  Slug: {p['slug']}")
            lines.append(f"  Updated: {p['updated_at']}{col}")
            # Show preview snippet
            snippet = p.get('text_content', '')[:200].strip()
            if snippet:
                lines.append(f"  Preview: {snippet}...")
            lines.append("")
        return [TextContent(type="text", text="\n".join(lines))]

    elif name == "wiki_read_page":
        page_id = arguments["id"]
        # Try as ID first, then slug
        page = await get_page(page_id)
        if not page:
            page = await get_page_by_slug(page_id)
        if not page:
            return [TextContent(type="text", text=f"Page not found: {page_id}")]
        # Fetch tags
        try:
            tags = await list_page_tags(page["id"])
            page["tags"] = tags
        except Exception:
            page["tags"] = []
        # Fetch backlinks count
        try:
            backlinks = await get_backlinks(page["id"], limit=5)
            page["backlink_count"] = len(backlinks)
            page["backlinks_preview"] = [b["title"] for b in backlinks]
        except Exception:
            pass
        return [TextContent(type="text", text=json.dumps(page, indent=2))]

    elif name == "wiki_list_collections":
        cols = await list_collections()
        if not cols:
            return [TextContent(type="text", text="No collections found")]
        lines = [f"# Collections ({len(cols)})\n"]
        for c in cols:
            parent = f" (child of {c['parent_id']})" if c['parent_id'] else ""
            icon = c.get('icon', '📁')
            lines.append(f"- {icon} **{c['name']}**{parent}")
            lines.append(f"  ID: {c['id']} | Slug: {c['slug']}")
            if c.get('description'):
                lines.append(f"  {c['description']}")
            lines.append("")
        return [TextContent(type="text", text="\n".join(lines))]

    elif name == "wiki_list_pages":
        collection_id = arguments.get("collection_id")
        limit = min(arguments.get("limit", 50), 100)
        results = await list_pages(collection_id, limit)
        if not results:
            return [TextContent(type="text", text="No pages found")]
        title = f" in collection {collection_id}" if collection_id else ""
        lines = [f"# Pages{title} ({len(results)})\n"]
        for p in results:
            col = f" [{p['collection_id']}]" if p['collection_id'] else ""
            tpl = " [TEMPLATE]" if p.get('is_template') else ""
            lines.append(f"- {p['icon'] or '📄'} **{p['title']}**{tpl}{col}")
            lines.append(f"  ID: {p['id']} | Status: {p['status']} | Updated: {p['updated_at']}")
            lines.append("")
        return [TextContent(type="text", text="\n".join(lines))]

    elif name == "wiki_get_backlinks":
        page_id = arguments["page_id"]
        limit = min(arguments.get("limit", 20), 50)
        results = await get_backlinks(page_id, limit)
        if not results:
            return [TextContent(type="text", text=f"No pages link to {page_id}")]
        lines = [f"# Pages linking to {page_id} ({len(results)})\n"]
        for p in results:
            lines.append(f"- **{p['title']}**")
            lines.append(f"  ID: {p['id']} | Updated: {p['updated_at']}")
            lines.append("")
        return [TextContent(type="text", text="\n".join(lines))]

    elif name == "wiki_get_linked_pages":
        page_id = arguments["page_id"]
        limit = min(arguments.get("limit", 20), 50)
        results = await get_linked_pages(page_id, limit)
        if not results:
            return [TextContent(type="text", text=f"No linked pages found from {page_id}")]
        lines = [f"# Pages linked from {page_id} ({len(results)})\n"]
        for p in results:
            lines.append(f"- **{p['title']}**")
            lines.append(f"  ID: {p['id']} | Updated: {p['updated_at']}")
            lines.append("")
        return [TextContent(type="text", text="\n".join(lines))]

    else:
        raise ValueError(f"Unknown tool: {name}")


# ─── Entry point ────────────────────────────────────────────────────────────────

def main():
    """Run the MCP server on stdio transport."""
    from mcp.server.stdio import stdio_server

    async def run():
        async with stdio_server() as (read_stream, write_stream):
            await app.run(
                read_stream,
                write_stream,
                app.create_initialization_options(),
            )

    import asyncio
    asyncio.run(run())


if __name__ == "__main__":
    main()
