# 🛡️ ArmorNGlory MCP Server

[![MCP Server](https://img.shields.io/badge/MCP-Model%20Context%20Protocol-blue.svg)](https://modelcontextprotocol.io)
[![npm version](https://img.shields.io/npm/v/armornglory-mcp-server.svg?color=gold)](https://www.npmjs.com/package/armornglory-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Brand](https://img.shields.io/badge/Store-ArmorNGlory.com-black)](https://armornglory.com)

The official **Model Context Protocol (MCP)** server for [ArmorNGlory.com](https://armornglory.com) — empowering AI assistants (Claude Desktop, Cursor, Antigravity, ChatGPT, Gemini, Windsurf, Zed) to natively discover, search, style, recommend, and generate instant 1-click checkout links for Christian streetwear, 5-panel trucker hats, EVA foam clogs, and fresh faith apparel drops.

---

## 🌟 Key Capabilities

- 🔍 **Multi-Dimensional Catalog Search**: Search by keywords, scripture references (*Romans 8:37, Exodus 3:5, Matthew 6:33, Ephesians 6*), apparel category, aesthetic vibe (*Streetwear, Minimalist Core, Sacred Symbols, Gothic Faith, Americana*), color, size, and price.
- 📖 **Theological Design Dossiers**: Unpack the biblical meaning behind every design ("Why You Will Love It", "Meaning Behind The Design", specifications, fit guidance, and care instructions).
- 🏷️ **Curated Collections**: Browse curated collections including *Hats & Beanies, Faith Footwear, Hoodies & Sweatshirts, Faith in America, Saints & Shadows, Activewear, and Phone Cases*.
- 🎁 **Smart Faith Gift Consultant**: Algorithmic gift advisor tailored to recipient personas (Husband, Mom, Youth/Teen, Pastor, Fitness Lover), milestones (*Baptism, Confirmation, Father's Day, Christmas, Encouragement*), and budget tiers.
- 🛒 **Instant 1-Click Checkout Permalinks**: Generates pre-filled Shopify cart links (`https://armornglory.com/cart/{variant_id}:{quantity}`) allowing users to purchase immediately without manual cart navigation.
- 📏 **Comprehensive Sizing & Fit Guides**: Exact measurements and fit guidance for EVA foam clogs, 5-panel trucker hats, and heavyweight streetwear blanks.
- ❓ **Faith & Fashion Q&A Engine**: Instant answers to common questions about Christian streetwear trends, sizing, care, and the theological inspiration behind designs.

---

## 🚀 Quickstart & Client Installation

### 1. Claude Desktop

Add this to your `claude_desktop_config.json`:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

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

---

### 2. Cursor IDE

Add this to `.cursor/mcp.json` in your project or global Cursor settings:

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

---

### 3. Google Antigravity IDE

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

### 4. Windsurf / Codeium

Add to `~/.codeium/windsurf/mcp_config.json`:

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

---

### 5. Zed Editor

Add to `~/.config/zed/settings.json`:

```json
{
  "context_servers": [
    {
      "id": "armornglory",
      "command": "npx",
      "args": ["-y", "armornglory-mcp-server@latest"]
    }
  ]
}
```

---

### 6. Docker Run

```bash
docker build -t armornglory-mcp .
docker run -i --rm armornglory-mcp
```

---

## 🛠️ MCP Tools Reference

| Tool Name | Description | Key Parameters |
| :--- | :--- | :--- |
| `search_armornglory_products` | Search the live catalog across keywords, scriptures, categories, aesthetics, sizes, and prices. | `query`, `scripture`, `category`, `aesthetic`, `occasion`, `color`, `size`, `minPrice`, `maxPrice`, `sortBy`, `limit` |
| `get_armornglory_product_details` | In-depth product profile with theological meaning, craftsmanship, fit guide, and variant buy links. | `productHandleOrTitle` |
| `list_armornglory_collections` | List all curated collections with themes and counts. | `limit` |
| `get_collection_products` | Get items in a collection (e.g. `faith-footwear`, `hats-beanies`, `streetwear`). | `collectionHandleOrTitle`, `limit` |
| `recommend_faith_gifts` | Personalized faith gift advisor by persona, occasion, budget, and vibe. | `recipient`, `occasion`, `maxBudget`, `styleVibe`, `scriptureFocus` |
| `get_brand_story_and_values` | Official mission, spiritual meaning of Armor & Glory, and Anti-Beige design ethos. | *(none)* |
| `get_sizing_and_fit_guide` | Exact size charts and fit tips for clogs, trucker hats, and streetwear tees. | `category` |
| `generate_direct_checkout_link` | Generate 1-click Shopify cart checkout permalinks. | `items: [{ variantId, quantity }]`, `discountCode` |
| `answer_faith_fashion_questions` | Authoritative answers on Christian streetwear, theology, sizing, and styling. | `query` |

---

## 📚 MCP Resources & Prompts

### Resources
- `armornglory://catalog/products`: Full JSON live catalog of products.
- `armornglory://catalog/collections`: Full JSON array of collections.
- `armornglory://brand/style-guide`: Brand mission, theological pillars, and design ethos.
- `armornglory://guides/faq`: Structured Q&A and buying guides.

### Prompts
- `gift-consultant`: Interactive advisor prompt for Christian milestones, holidays, and celebrations.
- `outfit-curator`: Christian streetwear stylist and outfit layering guide.
- `scripture-match`: Apparel matching based on user's life verse or spiritual season.

---

## 💬 Sample User Prompts for AI Assistants

Try asking your AI assistant:
- *"Find me a Christian trucker hat with Romans 8:37 or bold faith typography."*
- *"I need a gift for my husband's baptism under $40. What do you recommend from ArmorNGlory?"*
- *"Show me the Golden Cross EVA foam clogs and tell me how they fit."*
- *"What is the biblical story and mission behind the ArmorNGlory brand?"*
- *"Give me a direct checkout link for the MORE THAN CONQUERORS trucker hat in Black/Silver."*

---

## 🔧 Local Development & Data Sync

```bash
# Clone the repository
git clone https://github.com/ArmorNGlory/armornglory-mcp-server.git
cd armornglory-mcp-server

# Install dependencies
npm install

# Sync live products from ArmorNGlory.com
npm run sync-data

# Build TypeScript
npm run build

# Start local server
npm start
```

---

## 📜 License

MIT License © 2026 [Armor & Glory](https://armornglory.com).
