# Cursor IDE Rules & AI Instructions (ArmorNGlory MCP)

This file defines Cursor rules and code context when developing or using the ArmorNGlory MCP Server and client integrations.

---

## 1. Project Context

- **Repository**: `armornglory-mcp-server`
- **Protocol**: Model Context Protocol (MCP) over `stdio` (default) or Streamable HTTP / SSE (`--http`).
- **Tech Stack**: TypeScript, Node.js (`ES2022`, `NodeNext`), `@modelcontextprotocol/sdk`, `zod`.
- **E-Commerce Target**: [ArmorNGlory.com](https://armornglory.com) (Shopify Storefront).
- **Data Bundle**: 345+ enriched products (synced via `npm run sync:all` and live background sync) in `data/products.json`, 19+ active collections in `data/collections.json`, and brand identity in `data/brand_info.json`.

---

## 2. Cursor Workflow Rules

1. **Keep Schemas in Sync**:
   - When modifying tools in `src/index.ts`, run `npm run build && npm run card && npm test` to refresh `dist/index.js` and `.well-known/mcp/server-card.json`.
2. **Strict Type Safety**:
   - Ensure all input arguments are typed with `zod` schemas.
   - Use `.describe(...)` on every property to give LLMs clear guidance on argument expectations.
3. **Never Strip Direct Links**:
   - Maintain full product URLs and variant checkout links in all tool responses.
4. **Data Sync Protocol**:
   - Run `npm run sync:all` to pull fresh catalog updates from `armornglory.com`, regenerate discovery files, and run verification checks.

---

## 3. Cursor MCP Config (`.cursor/mcp.json`)

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
