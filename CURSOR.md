# Cursor IDE Rules & AI Instructions (ArmorNGlory MCP)

This file defines Cursor rules and code context when developing or using the ArmorNGlory MCP Server and client integrations.

---

## 1. Project Context

- **Repository**: `armornglory-mcp-server`
- **Protocol**: Model Context Protocol (MCP) by Anthropic over `stdio` transport.
- **Tech Stack**: TypeScript, Node.js (`ES2022`, `NodeNext`), `@modelcontextprotocol/sdk`, `zod`.
- **E-Commerce Target**: [ArmorNGlory.com](https://armornglory.com) (Shopify Storefront).
- **Data Bundle**: 249 enriched products in `data/products.json`, 21 collections in `data/collections.json`, and brand identity in `data/brand_info.json`.

---

## 2. Cursor Workflow Rules

1. **Keep Schemas in Sync**:
   - When modifying tools in `src/index.ts`, run `npm run build` immediately to refresh `dist/index.js`.
2. **Strict Type Safety**:
   - Ensure all input arguments are typed with `zod` schemas.
   - Use `z.describe(...)` on every property to give LLMs clear guidance on argument expectations.
3. **Never Strip Direct Links**:
   - Maintain full product URLs and variant checkout links in all tool responses.
4. **Data Sync Protocol**:
   - Run `npm run sync-data` to pull fresh catalog updates from `armornglory.com`.

---

## 3. Cursor MCP Config (`.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "armornglory": {
      "command": "node",
      "args": ["/Users/neks/ArmorNGlory MCP/dist/index.js"]
    }
  }
}
```
