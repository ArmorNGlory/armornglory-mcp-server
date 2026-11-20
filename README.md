# ✝️ ArmorNGlory MCP Server: Christian Streetwear & Faith Apparel

[![MCP Server](https://img.shields.io/badge/MCP-Model%20Context%20Protocol-blue.svg)](https://modelcontextprotocol.io)
[![MCP Registry](https://img.shields.io/badge/MCP%20Registry-io.github.ArmorNGlory%2Farmornglory--mcp--server-black.svg)](https://registry.modelcontextprotocol.io)
[![npm version](https://img.shields.io/npm/v/armornglory-mcp-server.svg?color=green)](https://www.npmjs.com/package/armornglory-mcp-server)
[![npm downloads](https://img.shields.io/npm/dm/armornglory-mcp-server.svg?color=brightgreen)](https://www.npmjs.com/package/armornglory-mcp-server)
[![Glama Score](https://glama.ai/mcp/servers/ArmorNGlory/armornglory-mcp-server/badges/score.svg)](https://glama.ai/mcp/servers/ArmorNGlory/armornglory-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

The official **Christian streetwear, Bible verse apparel & faith symbolism MCP server** from [ArmorNGlory.com](https://armornglory.com) for Claude, ChatGPT, Gemini, Cursor, Windsurf, VS Code, and Antigravity. Search **345+ live-synced products** (scripture 5-panel trucker hats, Comfort Colors heavyweight tees, fleece hoodies, tough magnetic iPhone MagSafe & Samsung Galaxy S26 phone cases, stainless steel water bottles, pajama loungewear, and wall art), explore the **Scripture & Christian Symbolism Concordance**, read **editorial church-style & milestone gift guides**, and generate **1-click Shopify checkout links**.

No API key. Runs locally. Free.

---

## 💬 Try asking your assistant

- *"Find me Christian streetwear that doesn't look cheesy."*
- *"Show me a Christian trucker hat with Romans 8:37."*
- *"Baptism gift for my husband under $40."*
- *"Show me insulated Christian water bottles for the gym or scripture pajama pants."*
- *"I want a Philippians 4:13 hoodie in black, size L."*

---

## 🚀 Install

### Claude Desktop · Cursor · Windsurf · VS Code · Antigravity
Add to your MCP config (`claude_desktop_config.json`, `.cursor/mcp.json`, `~/.codeium/windsurf/mcp_config.json`, `.vscode/mcp.json`, or `~/.gemini/antigravity/mcp_config.json`):

```json
{
  "mcpServers": {
    "armornglory": {
      "command": "npx",
      "args": ["-y", "armornglory-mcp-server@latest"]
    }
  }
}
```

### Claude Code
```bash
claude mcp add armornglory -- npx -y armornglory-mcp-server@latest
```

### Self-hosted HTTP (Streamable HTTP + SSE)
```bash
npx -y armornglory-mcp-server@latest --http --port 3000
# MCP: http://localhost:3000/mcp · SSE: /sse · health: /health · free web chat: /chat
```

### Live cart & checkout: Shopify's hosted endpoint
armornglory.com also runs Shopify's native **Universal Commerce Protocol (UCP)** MCP endpoint for live inventory, carts and Shop Pay checkout:
`https://armornglory.com/api/ucp/mcp` (discovery: `https://armornglory.com/.well-known/ucp`). This server complements it with brand story, scripture meaning, gift curation and fit guidance.

### ChatGPT Custom GPT (Actions)
Import the OpenAPI spec from
`https://raw.githubusercontent.com/ArmorNGlory/armornglory-mcp-server/main/openapi.yaml`.
See [CHATGPT_CUSTOM_GPT_KIT.md](CHATGPT_CUSTOM_GPT_KIT.md).

---

## 🛠️ Tools

All tools are read-only (annotated `readOnlyHint: true`).

| Tool | What it does |
|---|---|
| `search_armornglory_products` | Search 345+ live-synced items by keyword, Bible verse, category, aesthetic, occasion, color, size or price |
| `explore_scripture_and_symbolism` | **Scripture & Symbolism Concordance:** theological context + matching designs by Bible verse, Christian mark (`33 AD`, `Armor of God`, `Holy Ground`), or life season (`anxiety`, `gym`, `baptism`, `grief`) |
| `get_christian_style_and_gift_guide` | **Editorial Authority Guides:** *Anti-Beige Streetwear*, *What to Wear to Church*, *Baptism Gifts*, *Faith Gym Gear*, *MagSafe & Galaxy S26 Cases*, and *Materials & Care* |
| `get_armornglory_product_details` | Full details: meaning behind the design, materials, fit, care, per-variant checkout links |
| `recommend_faith_gifts` | Gift ideas by recipient, occasion (baptism, Father's Day…), budget, style and verse |
| `list_armornglory_collections` | All non-empty collections with descriptions and URLs |
| `get_collection_products` | Products in one collection |
| `get_sizing_and_fit_guide` | Size charts: trucker caps, Comfort Colors tees, hoodies, XS–4XL pajama pants, phone cases, and stainless steel drinkware |
| `generate_direct_checkout_link` | Shopify cart permalink for one or more variants |
| `answer_faith_fashion_questions` | Brand FAQ: verse meanings, quality, care, shipping |
| `get_brand_story_and_values` | Mission and design philosophy |
| `search` / `fetch` | ChatGPT connector & deep-research search + fetch across products, style guides, and scripture concordance |

**Prompts:** `gift-consultant`, `outfit-curator`, `scripture-match`, `size-and-fit-advisor`, `anti-beige-streetwear-guide`, `complete-the-look`, `budget-curator`
**Resources:** `armornglory://catalog/products`, `armornglory://catalog/collections`, `armornglory://knowledge/scripture-concordance`, `armornglory://guides/editorial`, `armornglory://brand/style-guide`, `armornglory://guides/faq`, `armornglory://knowledge/geo-entity-summary`

---

## 🧑‍💻 Development

```bash
npm install
npm run sync-data       # pull the live catalog from armornglory.com (public products.json)
npm run build
npm test                # data checks + full MCP protocol smoke test
npm run audit:deps      # dependency vulnerability audit (also runs automatically before publish)
npm run card            # regenerate .well-known/mcp/server-card.json from the real server
npm run audit:catalog   # AI-readiness audit of product titles/data -> reports/
npm run content         # regenerate the Shopify article kit -> content/
```

Discovery & growth docs:
- [AI_DISCOVERABILITY_CHECKLIST.md](AI_DISCOVERABILITY_CHECKLIST.md): the full checklist (Shopify admin, publishing, directories)
- [DIRECTORY_SUBMISSIONS.md](DIRECTORY_SUBMISSIONS.md): listing copy for MCP directories
- [content/README.md](content/README.md): publishing the article kit
- [SECURITY.md](SECURITY.md): security policy and vulnerability reporting

---

## 📜 License

MIT © 2026 [Armor & Glory](https://armornglory.com)
