# ArmorNGlory AI Discoverability Checklist

**Goal:** when someone asks ChatGPT, Gemini, Copilot, Perplexity or Claude for Christian clothing, ArmorNGlory products show up as shopping results *and* get cited in the written answer.

Products reach AI chat engines through three paths. Work them in this order:

| # | Path | What feeds it | Owner |
|---|---|---|---|
| 1 | **Shopping results inside the chat** (product cards, in-chat checkout) | Shopify Catalog → **Agentic Storefronts**; Google Merchant Center (Gemini, AI Mode); Microsoft Merchant Center (Copilot) | Shopify Admin |
| 2 | **Citations in the written answer** ("best modern Christian streetwear brands") | Articles and pages on armornglory.com, plus third-party lists, Reddit, and press that engines crawl | Content + outreach |
| 3 | **MCP tools** (Claude Desktop, Cursor, VS Code, agents) | npm, official MCP Registry, directories | This repo |

---

## Path 1: Shopping results (biggest impact, ~1 hour in Shopify Admin)

### 1.1 Agentic Storefronts
- [ ] Shopify Admin → **Sales channels → Agentic** (on some plans: **Settings → Apps and sales channels**). Confirm every available AI channel is **on**: ChatGPT, Microsoft Copilot, Google AI Mode / Gemini, Perplexity.
- [ ] Make sure products are **published to those channels** (Products → select all → *Manage sales channels*).
- [ ] Turn on **direct checkout** wherever it's offered.

> Shopify already serves agent instructions at `armornglory.com/llms.txt` and a live UCP MCP endpoint at `armornglory.com/api/ucp/mcp`, so the store is wired for agents. This step makes sure the catalog is actually syndicated.

### 1.2 Google Merchant Center (Gemini, Google AI Mode, Shopping tab)
- [ ] Install or open the **Google & YouTube** sales channel and connect Merchant Center.
- [ ] Merchant Center → **Products → Needs attention**: fix disapprovals (missing color, age group, gender, size, GTIN exemption).
  - These are print-on-demand / custom items, so set **"This product doesn't have a GTIN"** (identifier exists = no) where Shopify asks.
- [ ] Merchant Center → **Shipping & returns**: add shipping (made to order: 2–7 business days handling, 2–8 business days US transit) and your return policy (no change-of-mind returns; defects replaced within 14 days).
- [ ] Enable **free listings**.

### 1.3 Microsoft Merchant Center (Copilot; Bing also powers ChatGPT web search)
- [ ] Sign up at https://ads.microsoft.com → Tools → **Microsoft Merchant Center**, verify armornglory.com, and **import from Google Merchant Center** (daily schedule).
- [ ] Enable **free product listings** on Bing/Copilot.

### 1.4 Product data quality (what AI shopping actually ranks on)
Run `npm run audit:catalog` → open `reports/catalog-ai-audit.md` and `reports/catalog-ai-audit.csv`.
- [ ] **Fix weak titles first.** The audit found short all-caps cap titles with no product word, e.g. `BE A DOER` → *Be A Doer Christian Dad Hat | James 1:22*. Use Products → bulk editor, and review every suggestion.
- [ ] **Put the verse in the title** where it's only in the handle or description (52 products). Buyers search "Philippians 4:13 shirt".
- [ ] Add a **Color** option to apparel that's missing one (24 products).
- [ ] Set the **Shopify Standard Product Category** on every product (Product → Category). It maps to Google's product taxonomy.
- [ ] Bring products with fewer than 3 images or 5 tags up to standard.

### 1.5 Reviews
- [ ] Install a reviews app that outputs Product rating schema and syndicates to Google (Judge.me free plan or Shopify Product Reviews). AI shopping surfaces heavily favor products with ratings.
- [ ] Turn on post-purchase review request emails.

### 1.6 Theme structured data (5 minutes)
- [ ] Install `content/theme/armornglory-organization-schema.liquid` (steps in the file). It replaces the homepage's name-only Organization schema with description, `sameAs` (Instagram, Pinterest, X, GitHub, npm), and site search.
- [ ] Validate: https://search.google.com/test/rich-results → `https://armornglory.com/`

---

## Path 2: Get cited in AI answers

### 2.1 Publish the article kit (`content/articles/`)
armornglory.com has **no apparel articles yet**: the blogs cover home decor and church visits. AI answers for "Christian streetwear" currently cite listicles from other sites.
- [ ] Publish the 5 generated articles (see `content/README.md`) in a new **Style Guides** blog, and link it from the header or footer.
- [ ] Cross-link: add a line to the existing *"What to wear to church when you have no idea what to wear to church"* article pointing to the streetwear guide.

### 2.2 Indexing
- [ ] **Bing Webmaster Tools** (https://www.bing.com/webmasters): add armornglory.com (import from Google Search Console), submit `https://armornglory.com/sitemap.xml`, enable **IndexNow** (Shopify supports it natively in recent versions; otherwise use an IndexNow app). This matters most for ChatGPT Search and Copilot.
- [ ] **Google Search Console**: submit the sitemap; *Request indexing* for the new articles and the top collections.

### 2.3 Off-site mentions (what AI engines trust)
Engines triangulate from third-party sources. The current "best Christian streetwear brands" answers cite pages like `kingdometernal.com` and `igitapparel.com` blog posts.
- [ ] Pitch inclusion to authors of "best Christian clothing brands" roundups (offer a sample piece or a discount code you actually create).
- [ ] Create genuine, helpful presence on Reddit (r/Christianity has strict self-promo rules; r/TrueChristian, r/ChristianDating style threads, r/streetwear "faith fits" threads). Answer questions, and don't spam links.
- [ ] Faith creators and church youth leaders: gift product for honest reviews (TikTok/Instagram/YouTube); ask them to mention "ArmorNGlory" by name.
- [ ] Get listed on Christian business directories and gift guides (Father's Day, baptism, Easter roundups).
- [ ] Keep the brand name consistent everywhere: **ArmorNGlory** (alternate: Armor & Glory).

### 2.4 Monthly spot-check
Ask each engine (logged out) and note whether ArmorNGlory appears:
- "best modern Christian streetwear brands that aren't cheesy"
- "Christian trucker hat with a Bible verse"
- "are there Christian Crocs"
- "baptism gift for a man under $40"
- "Philippians 4:13 hoodie"

---

## Path 3: MCP distribution (this repo)

Done in v1.1.0:
- [x] Server `instructions`, title, icon and website, so assistants know *when* to use it
- [x] Buyer-language tool descriptions and read-only `annotations` on all tools
- [x] ChatGPT connector-compatible `search` + `fetch` tools
- [x] Removed the dead `mcp.armornglory.com` endpoint and `armornglory.com/openapi.yaml` references; now pointing to Shopify's real UCP endpoint and the GitHub-hosted OpenAPI spec
- [x] Catalog sync fixes: normalized verse references; occasions no longer tag every product as "Father's Day"; category word boundaries
- [x] `server.json` + `mcpName` for the official MCP Registry
- [x] Protocol smoke test + dead-link test (`npm test`), auto-generated server card (`npm run card`)

To do:
- [ ] Push to GitHub, `npm publish` (1.1.0), `mcp-publisher publish`. See `DIRECTORY_SUBMISSIONS.md` section 0.
- [ ] Directory submissions: Smithery, awesome-mcp-servers PR, mcp.so, Cline marketplace; claim Glama.

---

## Keep it fresh (whenever products change)
```bash
npm run audit:deps && npm run sync-data && npm run build && npm test && npm run card && npm run audit:catalog && npm run content
npm version patch && npm publish && mcp-publisher publish
```
