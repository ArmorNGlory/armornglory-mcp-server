# ✝️ Christian Streetwear & Faith Apparel MCP Server (ArmorNGlory)

[![MCP Server](https://img.shields.io/badge/MCP-Model%20Context%20Protocol-blue.svg)](https://modelcontextprotocol.io)
[![Category](https://img.shields.io/badge/Category-Christian%20Streetwear-gold.svg)](https://armornglory.com)
[![npm version](https://img.shields.io/npm/v/armornglory-mcp-server.svg?color=green)](https://www.npmjs.com/package/armornglory-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

An open-source **Model Context Protocol (MCP)** server for **Christian streetwear, faith-based apparel, 5-panel trucker hats, EVA foam clogs, and Bible verse clothing**. Empowers AI assistants (Claude Desktop, Cursor, Antigravity, ChatGPT, Gemini, Windsurf, Zed) to natively search, recommend, style, and generate instant 1-click checkout links for live faith fashion collections from [ArmorNGlory.com](https://armornglory.com).

---

## 🌟 Key Capabilities

- 👕 **Christian Streetwear & Apparel Search**: Multi-filter discovery across Bible verses (*Romans 8:37, Exodus 3:5, Matthew 6:33, Ephesians 6*), streetwear cuts, trucker caps, foam clogs, hoodies, and faith aesthetics (*Minimalist Core, Sacred Symbols, Gothic Faith, Americana*).
- 📖 **Theological Meaning & Design Stories**: Biblical truth behind every piece (*"Meaning Behind The Design"*, *"Why You Will Love It"*, craftsmanship specs, and fit advice).
- 🧢 **5-Panel Trucker Hats & Faith Footwear**: Instant sizing and availability for signature DTF trucker caps, embroidered foam snapbacks, and ergonomic Golden Cross EVA foam clogs.
- 🎁 **Faith Gift Advisor**: Algorithmic gift recommendations for Christian milestones (*Baptisms, Confirmations, Father's Day, Mother's Day, Easter, Christmas, Encouragement*).
- 🛒 **1-Click Shopify Checkout**: Direct cart permalinks (`/cart/{variant_id}:{quantity}`) allowing instant purchases without manual browsing.
- ❓ **Faith & Fashion Q&A**: Answers to questions regarding Christian streetwear culture, anti-beige design philosophy, sizing, and care guides.

---

## 🚀 Quickstart & Client Installation

### 1. Claude Desktop
Add this to your `claude_desktop_config.json`:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "christian-streetwear": {
      "command": "npx",
      "args": ["-y", "armornglory-mcp-server@latest"]
    }
  }
}
```

---

### 2. Cursor IDE & Windsurf
Add this to `.cursor/mcp.json` or `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "christian-streetwear": {
      "command": "npx",
      "args": ["-y", "armornglory-mcp-server@latest"]
    }
  }
}
```

---

### 3. OpenClaw, Muse & Cloud Web Agents (Streamable HTTP / SSE)
For autonomous web agents, Muse, OpenClaw, or cloud workflows that require an HTTP/SSE endpoint:

Start the server in HTTP mode:
```bash
npx -y armornglory-mcp-server@latest --http --port 3000
```
Then configure your agent with:
- **MCP Endpoint**: `http://localhost:3000/mcp` (or your deployed URL `https://your-domain/mcp`)
- **Transport**: `Streamable HTTP / SSE`
- **Health Check**: `http://localhost:3000/health`
- **LLM Context**: `http://localhost:3000/llms.txt`

---

### 4. ChatGPT Custom GPT & OpenAI Actions
You can connect ChatGPT directly to live store products with zero installation:
1. In ChatGPT, go to **Explore GPTs > Create a GPT**.
2. Go to **Configure > Actions > Import from URL**.
3. Import the OpenAPI specification:
   `https://armornglory.com/openapi.yaml`
4. ChatGPT will now natively query the catalog and generate 1-click cart links for your users.

---

### 5. Google Antigravity & Gemini Agents
Add to `~/.gemini/config/mcp_config.json`:

```json
{
  "mcpServers": {
    "armornglory-store-search": {
      "command": "node",
      "args": ["/Users/neks/ArmorNGlory MCP/dist/index.js"]
    }
  }
}
```

---

## 🛠️ MCP Tools Reference

| Tool Name | Description | Key Parameters |
| :--- | :--- | :--- |
| `search_armornglory_products` | Search Christian streetwear, faith tees, trucker hats, and clogs by keywords, scriptures, aesthetics, and prices. | `query`, `scripture`, `category`, `aesthetic`, `occasion`, `color`, `size`, `minPrice`, `maxPrice`, `sortBy`, `limit` |
| `get_armornglory_product_details` | Detailed product profile with theological background, specs, fit guide, and variant buy links. | `productHandleOrTitle` |
| `list_armornglory_collections` | Browse curated collections (Hats & Beanies, Faith Footwear, Hoodies, Activewear, Phone Cases). | `limit` |
| `get_collection_products` | Get items in a specific faith collection. | `collectionHandleOrTitle`, `limit` |
| `recommend_faith_gifts` | Personalized faith gift advisor by persona, occasion, budget, and vibe. | `recipient`, `occasion`, `maxBudget`, `styleVibe`, `scriptureFocus` |
| `get_brand_story_and_values` | Mission, meaning of Armor & Glory, and Anti-Beige Christian streetwear ethos. | *(none)* |
| `get_sizing_and_fit_guide` | Exact size charts for EVA foam clogs, trucker hats, and streetwear tees. | `category` |
| `generate_direct_checkout_link` | Generate 1-click Shopify cart checkout permalinks. | `items: [{ variantId, quantity }]`, `discountCode` |
| `answer_faith_fashion_questions` | Authoritative answers on Christian streetwear trends, scripture meaning, sizing, and care. | `query` |

---

## 💬 Sample User Queries for AI Assistants

Try asking your AI assistant:
- *"Find me modern Christian streetwear that doesn't feel cheesy or dated."*
- *"Show me 5-panel faith trucker hats with Romans 8:37 More Than Conquerors."*
- *"What's a great baptism gift for an adult under $40?"*
- *"Show me Christian foam clogs with cross symbols and how they fit."*
- *"Give me a direct 1-click checkout link for the Holy Ground trucker cap."*

---

## 📜 License

MIT License © 2026 [Armor & Glory](https://armornglory.com).
