# Christian Streetwear & Faith Apparel MCP Server — Universal Directory Submissions Kit

Use this launch kit to submit, index, and promote the MCP Server across AI developer catalogs, directories, e-commerce agent registries, and community forums.

## Status (updated 2026-11-19)

| Channel | Status | Action |
|---|---|---|
| npm `armornglory-mcp-server` | Live at **v1.3.0** ✅ | 13 tools, Scripture Concordance, 345 live-synced products, 0 high/critical vulns |
| Official MCP Registry | Live at **v1.3.0** ✅ | Published via GitHub Actions OIDC (`io.github.ArmorNGlory/armornglory-mcp-server`) |
| GitHub repo | Public ✅ | Add repo topics + website URL (`https://armornglory.com`) + publish Release |
| Glama | Listed ✅ | Click **Claim** and re-sync (`glama.json` lists the maintainer) |
| Smithery | Ready to submit | Section 2 (`smithery.yaml`, `Dockerfile`, and `server-card.json` are ready) |
| PulseMCP | Auto-ingests from MCP Registry | Verify listing in ~3–7 days or submit at https://www.pulsemcp.com/submit |
| awesome-mcp-servers | Ready to PR | Section 1 (exact `### 🛒 E-Commerce` entry format below) |
| mcp.so | Ready to submit | https://mcp.so/submit: use the Smithery copy below |
| Cline MCP Marketplace | Optional | Issue at https://github.com/cline/mcp-marketplace (needs a 400×400 PNG logo) |

---

## 0. Official MCP Registry (feeds VS Code, GitHub Copilot, PulseMCP and others)

`server.json`, `mcpName` in `package.json`, and `.github/workflows/publish-mcp-registry.yml` are already wired for zero-secret GitHub Actions OIDC publishing. Publish to npm first (`npm publish --auth-type=web`), then push the matching version tag (`git tag vX.Y.Z && git push origin vX.Y.Z`) to trigger the registry workflow automatically.

Verify live listing:
```bash
curl "https://registry.modelcontextprotocol.io/v0/servers?search=ArmorNGlory"
```

---

## 1. Submission to `awesome-mcp-servers` (GitHub)

**Target Repository:** [https://github.com/punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers)

### Exact PR Line to Add (Matches Official Legend & Alphabetical Order):
Under `### 🛒 <a name="e-commerce"></a>E-Commerce` in `README.md` (place alphabetically with `A1-x-Tech/...` at the top of the section):

```markdown
- [ArmorNGlory/armornglory-mcp-server](https://github.com/ArmorNGlory/armornglory-mcp-server) [![ArmorNGlory/armornglory-mcp-server MCP server](https://glama.ai/mcp/servers/ArmorNGlory/armornglory-mcp-server/badges/score.svg)](https://glama.ai/mcp/servers/ArmorNGlory/armornglory-mcp-server) 🎖️ 📇 ☁️ 🍎 🪟 🐧 - Official ArmorNGlory Shopify store MCP: search 345+ Christian streetwear pieces, scripture trucker hats, heavyweight tees, hoodies, insulated water bottles, magnetic phone cases, and pajama loungewear by Bible verse, with sizing advice and 1-click checkout links.
```

### PR Title & Description:
* **Title:** `Add ArmorNGlory/armornglory-mcp-server to E-Commerce 🤖🤖🤖` *(note: `🤖🤖🤖` opts into their fast-track merge queue per `CONTRIBUTING.md`)*
* **Description:**
  ```markdown
  ### Description
  Adds the official `ArmorNGlory/armornglory-mcp-server` under **E-Commerce**, enabling AI assistants (Claude, Cursor, ChatGPT, Gemini, Windsurf, VS Code) to search 345+ Christian streetwear items by Bible verse, aesthetic, occasion, size, or budget, explore the Bible verse concordance and style guides, and build 1-click Shopify checkout links.

  - **Repo:** https://github.com/ArmorNGlory/armornglory-mcp-server
  - **npm:** https://www.npmjs.com/package/armornglory-mcp-server
  - **MCP Registry:** `io.github.ArmorNGlory/armornglory-mcp-server`
  - **Website:** https://armornglory.com
  - **License:** MIT
  ```

---

## 2. Smithery.ai Submission

**Listing Page:** [https://smithery.ai/new](https://smithery.ai/new)

* **Repository URL:** `https://github.com/ArmorNGlory/armornglory-mcp-server`
* **Package Name:** `armornglory-mcp-server`
* **Display Name:** Christian Streetwear & Faith Apparel MCP
* **Short Description:** Discover, style, and shop Christian streetwear, Bible verse tees, trucker hats, hoodies, stainless steel water bottles, and magnetic phone cases with 1-click checkout.
* **Tags:** `christian-streetwear`, `faith-apparel`, `christian-clothing`, `streetwear`, `faith`, `shopping`, `shopify`

---

## 3. Glama.ai Submission

**Listing Page:** [https://glama.ai/mcp/servers](https://glama.ai/mcp/servers)

* **Configuration:** Included in root `glama.json`.
* **Display Name:** Christian Streetwear & Faith Apparel Discovery MCP
* **Category:** E-Commerce & Retail

---

## 4. PulseMCP Submission

**Submit URL:** [https://www.pulsemcp.com/submit](https://www.pulsemcp.com/submit)

* **Server Name:** Christian Streetwear & Faith Apparel MCP Server
* **Source Code:** `https://github.com/ArmorNGlory/armornglory-mcp-server`
* **Package:** `https://www.npmjs.com/package/armornglory-mcp-server`
* **Author / Org:** Armor & Glory
* **Summary:** Connects AI agents directly to Christian streetwear, scripture apparel, trucker caps, stainless steel drinkware, magnetic phone cases, and pajama loungewear with multi-filter search, Bible verse concordance, gift advisor, and 1-click cart checkout URLs.

---

## 5. Reddit Community Launch Post

**Suggested Subreddits:**
- `r/ClaudeAI`, `r/ChatGPT`, `r/SideProject`, `r/Christianity`, `r/streetwear`

### Post Title:
> I built an open-source MCP Server for Claude & Cursor to discover & style Christian streetwear (with 1-click checkout)

### Post Body:
```markdown
Hey everyone!

I wanted to share an open-source Model Context Protocol (MCP) server for discovering modern **Christian streetwear & faith apparel**: **`armornglory-mcp-server`**.

### What It Does:
It allows Claude Desktop, Cursor, Antigravity, and any MCP client to natively search, recommend, and style 345+ scripture-led pieces (5-panel trucker caps, heavyweight Comfort Colors tees, fleece hoodies, insulated stainless steel water bottles, magnetic phone cases, and scripture pajama loungewear).

Instead of hallucinating products, your AI assistant can:
1. Search by specific Bible verse (e.g. *"Find a trucker hat with Romans 8:37 More Than Conquerors"* or *"Show me Holy Ground Exodus 3:5 gear"*).
2. Act as a Faith Gift Advisor (e.g. *"What's a great baptism gift for an adult under $40?"*).
3. Generate direct 1-click Shopify checkout permalinks so you can buy in one tap.
4. Give exact size guidance for footwear and streetwear cuts.

### How to use with Claude Desktop:
Add this to your `claude_desktop_config.json`:
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

- **GitHub:** https://github.com/ArmorNGlory/armornglory-mcp-server
- **npm:** https://www.npmjs.com/package/armornglory-mcp-server
- **Live Store:** https://armornglory.com

Would love any feedback or thoughts from the community!
```
