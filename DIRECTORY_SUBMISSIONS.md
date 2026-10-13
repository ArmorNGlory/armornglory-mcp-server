# Christian Streetwear & Faith Apparel MCP Server — Universal Directory Submissions Kit

Use this launch kit to submit, index, and promote the MCP Server across AI developer catalogs, directories, e-commerce agent registries, and community forums.

## Status (audited 2026-10-13)

| Channel | Status | Action |
|---|---|---|
| npm `armornglory-mcp-server` | Was stuck on 1.0.4 | Publish 1.1.0 (`npm publish`) |
| Official MCP Registry | Not listed | `mcp-publisher publish` (section 0) |
| GitHub repo | Public ✅ | Push latest |
| Glama | Listed ✅ | Click **Claim** and re-sync after pushing (`glama.json` lists the maintainer) |
| Smithery | Not listed | Section 2 (`smithery.yaml` + `Dockerfile` are ready) |
| PulseMCP | Unknown | Auto-ingests from the MCP Registry; submit manually if missing after a week |
| awesome-mcp-servers | Not listed | Section 1 PR |
| mcp.so | Not listed | https://mcp.so/submit: use the Smithery copy below |
| Cline MCP Marketplace | Not listed | Issue at https://github.com/cline/mcp-marketplace (needs a 400×400 PNG logo) |

---

## 0. Official MCP Registry (feeds VS Code, GitHub Copilot, PulseMCP and others)

`server.json` and `mcpName` in `package.json` are already set up. The registry verifies that the npm package's `mcpName` matches, so **publish to npm first**.

```bash
npm publish                                   # 1.1.0 must be live on npm first
brew install mcp-publisher                    # or download from github.com/modelcontextprotocol/registry/releases
mcp-publisher login github                    # sign in as an owner/member of the ArmorNGlory GitHub org
mcp-publisher publish                         # reads server.json
curl "https://registry.modelcontextprotocol.io/v0/servers?search=armornglory"   # verify
```

> If your GitHub account can't publish under `io.github.ArmorNGlory`, change `mcpName` (package.json) and `name` (server.json) to `io.github.<your-username>/armornglory-mcp-server`, bump the patch version, and re-publish to npm before `mcp-publisher publish`.

---

## 1. Submission to `awesome-mcp-servers` (GitHub)

**Target Repository:** [https://github.com/punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers)

### PR Line to Add:
Under the **E-Commerce & Shopping** or **Lifestyle & Search** category in `README.md`:

```markdown
- [Christian Streetwear & Faith Apparel](https://github.com/ArmorNGlory/armornglory-mcp-server) 🛍️ - Discover, search, style, and generate 1-click Shopify checkout links for Christian streetwear, 5-panel trucker hats, EVA foam clogs, and Bible verse clothing from ArmorNGlory.
```

### PR Title & Description:
* **Title:** `Add Christian Streetwear & Faith Apparel MCP Server`
* **Description:**
  ```markdown
  ### Description
  Adds the Christian Streetwear & Faith Apparel MCP server, allowing LLMs (Claude, Cursor, ChatGPT, Gemini, Windsurf) to natively discover, search, style, and generate instant 1-click checkout permalinks for Christian streetwear, graphic tees, trucker caps, EVA foam clogs, and faith gifts.

  - **Repo:** https://github.com/ArmorNGlory/armornglory-mcp-server
  - **npm:** https://www.npmjs.com/package/armornglory-mcp-server
  - **Website:** https://armornglory.com
  - **License:** MIT
  ```

---

## 2. Smithery.ai Submission

**Listing Page:** [https://smithery.ai/new](https://smithery.ai/new)

* **Repository URL:** `https://github.com/ArmorNGlory/armornglory-mcp-server`
* **Package Name:** `armornglory-mcp-server`
* **Display Name:** Christian Streetwear & Faith Apparel MCP
* **Short Description:** Discover, style, and shop Christian streetwear, Bible verse tees, trucker hats, and EVA foam clogs with 1-click checkout.
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
* **Summary:** Connects AI agents directly to Christian streetwear, scripture apparel, trucker caps, and foam clogs with multi-filter search, gift advisor, and 1-click cart checkout URLs.

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
It allows Claude Desktop, Cursor, Antigravity, and any MCP client to natively search, recommend, and style scripture-led streetwear (5-panel trucker caps, heavyweight graphic tees, EVA foam clogs, fleece hoodies, and faith phone cases).

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
