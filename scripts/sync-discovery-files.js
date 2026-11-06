#!/usr/bin/env node
/**
 * Self-Healing Discovery & Metadata Synchronizer
 *
 * Keeps agent-facing discovery files (`llms.txt`, `.well-known/llms.txt`, `llms-full.txt`,
 * `data/faqs_and_guides.json`, `server.json`, and `.well-known/mcp.json`) strictly aligned
 * with the live catalog in `data/products.json` and `data/collections.json`:
 *
 *  1. Prunes or replaces any Draft/removed `relatedProductHandles` in `data/faqs_and_guides.json`
 *     so FAQs never recommend 404 URLs.
 *  2. Generates `llms.txt`, `.well-known/llms.txt`, and `llms-full.txt` using verified active
 *     products, variant IDs, price corridors, and non-empty collections. If a preferred hero item
 *     ever moves to Draft on Shopify, a live in-stock replacement from the same category is chosen
 *     automatically.
 *  3. Locks `server.json` and `.well-known/mcp.json` version strings to `package.json`.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");
const dataDir = path.join(rootDir, "data");

function writeIfChanged(filePath, nextContent) {
  const normalized = nextContent.endsWith("\n") ? nextContent : nextContent + "\n";
  const prev = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : null;
  if (prev === normalized) return false;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, normalized, "utf-8");
  return true;
}

export function syncDiscoveryFiles() {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf-8"));
  const products = JSON.parse(fs.readFileSync(path.join(dataDir, "products.json"), "utf-8"));
  const collections = JSON.parse(fs.readFileSync(path.join(dataDir, "collections.json"), "utf-8"));
  const faqsPath = path.join(dataDir, "faqs_and_guides.json");
  const faqs = JSON.parse(fs.readFileSync(faqsPath, "utf-8"));

  const byHandle = new Map(products.map((p) => [p.handle, p]));
  const activeColHandles = new Set(collections.map((c) => c.handle));

  const pickProducts = (preferredHandles, predicate, count = 3) => {
    const picked = [];
    const seen = new Set();
    for (const h of preferredHandles) {
      const found = byHandle.get(h);
      if (found && found.variants?.length && !seen.has(found.handle)) {
        picked.push(found);
        seen.add(found.handle);
        if (picked.length >= count) return picked;
      }
    }
    for (const p of products) {
      if (!seen.has(p.handle) && p.variants?.length && predicate(p)) {
        picked.push(p);
        seen.add(p.handle);
        if (picked.length >= count) return picked;
      }
    }
    return picked;
  };

  const priceRangeFor = (predicate, fallback) => {
    const items = products.filter(predicate);
    if (items.length === 0) return fallback;
    const min = Math.min(...items.map((p) => p.minPrice).filter((n) => n > 0));
    const max = Math.max(...items.map((p) => p.maxPrice).filter((n) => n > 0));
    if (!Number.isFinite(min) || !Number.isFinite(max)) return fallback;
    return min === max ? `$${min.toFixed(2)}` : `$${min.toFixed(2)} - $${max.toFixed(2)}`;
  };

  const hats = pickProducts(
    [
      "more-than-conquerors-printed-christian-5-panel-trucker-cap",
      "holy-ground-printed-christian-5-panel-trucker-cap",
      "kingdom-over-culture-trucker-hat-christian-snapback-cap-faith-based-streetwear-christian-hat-jesus-apparel"
    ],
    (p) => p.category === "Hats & Headwear",
    3
  );

  const clogs = pickProducts(
    [
      "golden-cross-eva-foam-clogs-aop",
      "god-is-good-eva-foam-clogs-aop",
      "chosen-heart-eva-foam-clogs-aop"
    ],
    (p) => p.category === "Footwear & Clogs",
    3
  );

  const tees = pickProducts(
    [
      "tl-dr-loved-moss-christian-t-shirt",
      "made-for-good-work-christian-t-shirt",
      "tl-dr-won-christian-t-shirt"
    ],
    (p) => p.category === "T-Shirts & Tops",
    3
  );

  const hoodies = pickProducts(
    [
      "more-than-conquerors-hoodie-romans-8-37-scripture-sweatshirt-christian-faith-hoodie-unisex-cozy-pullover-gift-for-him-her",
      "fearfully-and-wonderfully-made-hoodie-psalm-139-14-faith-sweatshirt",
      "ephesians-3-20-hoodie-christian-hoodie-faith-based-sweatshirt-god-is-able-hoodie-christian-streetwear-bible-verse-hoodie-unisex"
    ],
    (p) => p.category === "Hoodies & Sweatshirts",
    2
  );

  const bottles = pickProducts(
    [
      "every-rep-his-glory-stainless-steel-water-bottle",
      "guard-the-heart-stainless-steel-water-bottle",
      "run-your-race-stainless-steel-water-bottle"
    ],
    (p) => p.category === "Accessories" && /water bottle/i.test(p.title),
    3
  );

  const cases = pickProducts(
    [
      "press-on-toward-the-goal-philippians-3-14-tough-magnetic-phone-case",
      "jesus-is-king-christian-phone-case-for-samsung-galaxy-s26-series",
      "be-the-light-christian-phone-case-for-samsung-galaxy-s26-series-matthew-5-14"
    ],
    (p) => p.category === "Phone Cases",
    3
  );

  // 1. Heal FAQ relatedProductHandles so 0 dead handles ever remain
  const fallbackHeroHandles = [hats[0]?.handle, tees[0]?.handle, bottles[0]?.handle, cases[0]?.handle].filter(Boolean);
  let healedFaqHandles = 0;
  for (const faq of faqs) {
    const before = faq.relatedProductHandles || [];
    const valid = before.filter((h) => byHandle.has(h));
    if (valid.length !== before.length) {
      healedFaqHandles += before.length - valid.length;
    }
    // If a non-footwear FAQ lost all handles due to Draft transitions, attach a verified flagship handle
    if (valid.length === 0 && !/clog|footwear/i.test(faq.question) && fallbackHeroHandles.length > 0) {
      faq.relatedProductHandles = [fallbackHeroHandles[0]];
    } else {
      faq.relatedProductHandles = valid;
    }
  }
  const faqChanged = writeIfChanged(faqsPath, JSON.stringify(faqs, null, 2));

  // 2. Build dynamic collection lines for llms.txt (only linking collections that are live & non-empty)
  const colLines = [];
  const addCol = (handle, label, detail) => {
    if (activeColHandles.has(handle)) {
      colLines.push(`- [${label}](https://armornglory.com/collections/${handle}): ${detail}`);
    }
  };
  addCol("all-products", "Shop All Products", `Browse Christian streetwear and faith apparel (${products.length} active items across the store).`);
  addCol("hats-beanies", "5-Panel Trucker Hats & Beanies", `Structured high-profile front panel, breathable mesh back, snapback closure (${priceRangeFor((p) => p.category === "Hats & Headwear", "$34.99")}).`);
  if (clogs.length > 0) {
    addCol("faith-footwear", "Faith Footwear & EVA Foam Clogs", `Lightweight EVA foam clogs featuring 3D heat-transfer Sacred Symbols artwork (${priceRangeFor((p) => p.category === "Footwear & Clogs", "$29.99")}).`);
  }
  addCol("t-shirts", "Heavyweight Graphic Tees", `Premium 100% ring-spun cotton (Comfort Colors 1717 blanks), durable DTF prints, unisex streetwear drape (${priceRangeFor((p) => p.category === "T-Shirts & Tops", "$28 - $39")}).`);
  addCol("hoodies-sweatshirts", "Hoodies & Sweatshirts", `Heavyweight warm fleece, relaxed unisex cut, kangaroo pockets (${priceRangeFor((p) => p.category === "Hoodies & Sweatshirts", "$49.99 - $69.99")}).`);
  addCol("faith-in-america-collection", "Faith in America Collection", `Celebrating faith, liberty, and America's 250th milestone (${priceRangeFor((p) => p.aesthetics?.includes("Vintage Americana"), "$21.99 - $39.99")}).`);
  addCol("activewear", "Activewear & Training", "Second Wind (Isaiah 40:31) athletic tees, tanks, and gym gear built for movement and physical stewardship.");
  addCol("misc-amp-accessories", "Insulated Drinkware & Accessories", "Double-wall 100% stainless steel water bottles with BPA-free polypropylene lids that keep drinks cold up to 24 hours or warm up to 12 hours ($39.99 - $49.99), plus tumblers, mugs, pickleball kits, and bags.");
  addCol("phone-cases", "Tough Phone Cases", `Dual-layer impact-resistant magnetic cases with polycarbonate outer shell and cushioned liner for iPhone (MagSafe) and Samsung Galaxy S26 / S26 Plus / S26 Ultra (${priceRangeFor((p) => p.category === "Phone Cases", "$25.00 - $45.99")}).`);
  addCol("pajamas", "Christian Pajama Pants & Loungewear", `Relaxed all-over-print scripture loungewear and pajama pants (${priceRangeFor((p) => p.category === "Pajamas & Sleepwear", "$64.99")}).`);
  addCol("posters", "Scripture Wall Art, Canvas & Throws", "Archival framed posters, gallery canvas prints, and woven scripture blankets.");

  const coreGarments = [
    "5-Panel DTF Trucker Caps",
    ...(clogs.length > 0 ? ["Golden Cross EVA Foam Clogs"] : []),
    "Heavyweight Ringspun Tees",
    "Warm Fleece Hoodies",
    "Stainless Steel Water Bottles",
    "Tough Magnetic Phone Cases"
  ].join(", ");

  const llmsTxt = `# ArmorNGlory — Christian Streetwear & Faith Apparel

> ArmorNGlory exists to create faith-based apparel for people who love Jesus and modern life. We design Christian streetwear and creative content that helps people carry their faith into everyday spaces with confidence, style, and authenticity. *"Strengthened for the Journey Ahead."*

- **Website**: https://armornglory.com
- **Brand Ethos**: Anti-Beige / Anti-Cheesy Christian Streetwear
- **Core Garments**: ${coreGarments}
- **Active Catalog**: ${products.length} verified active products across ${collections.length} collections
- **MCP Server**: https://github.com/ArmorNGlory/armornglory-mcp-server
- **npm Package**: \`armornglory-mcp-server\`

---

## 🛡️ Core Brand Identity & Entity Positioning

ArmorNGlory (Armor & Glory) combines contemporary urban streetwear aesthetics with deep theological conviction.
- **Armor**: Spiritual strength, conviction, and standing firm in faith (*Ephesians 6:10-18 Armor of God*).
- **Glory**: Directing purpose, honor, and creativity to God (*Matthew 5:14-16 City on a Hill, 1 Corinthians 10:31*).

---

## 🏷️ Curated Collections & Key Categories

${colLines.join("\n")}

---

## 📖 Scripture & Theological Themes

- **Romans 8:37** — *"More Than Conquerors"* (Victory in Christ over anxiety, trial, and adversity).
- **Exodus 3:5** — *"Holy Ground"* (Living in reverence wherever God places you).
- **Matthew 6:33** — *"Kingdom First"* (Prioritizing the kingdom of God over temporary culture).
- **Isaiah 40:31** — *"Second Wind"* (Renewed strength to run and not grow weary).
- **Philippians 3:14** — *"Press On Toward the Goal"* (Steadfast endurance and upward calling in Christ).
- **Est 33 AD** — *"Resurrection / Empty Tomb"* (The historical reality of Christ's resurrection).
- **Ephesians 6:10-18** — *"The Armor of God"* (Truth, righteousness, faith, salvation, and the spirit).

---

## 📏 Sizing & Fit Guidance

- **Trucker Caps**: One Size Fits Most (OSFM) with 7-hole adjustable snapback (fits circumferences 21.5 in to 23.5 in).
- **Heavyweight Streetwear Tees**: Unisex relaxed fit. True to size for standard fit; size up for oversized vintage drape.
- **Hoodies**: Unisex classic fit with fleece lining. True to size.
- **EVA Foam Clogs** *(reference fit for footwear drops)*: Roomy comfort fit with pivoting heel strap. If between sizes or prefer a snug fit, **size down one size**.

---

## 🛒 1-Click Purchase & Direct Checkout

ArmorNGlory supports direct 1-click cart checkout permalinks. Any combination of product variants can be instantly pre-loaded into a checkout session:
- **Format**: \`https://armornglory.com/cart/{variant_id}:{quantity}?utm_source=ai_agent&utm_medium=mcp&utm_campaign=store_recommendation\`
- **Multi-Item Bundle Format**: \`https://armornglory.com/cart/{variant_id_1}:1,{variant_id_2}:1\`

---

## 🤖 AI Assistant & MCP Protocol Integration

AI assistants can query the live catalog (auto-synced directly with Shopify), check sizes, recommend gifts, and build checkout links.

1. **ArmorNGlory MCP server** (live Shopify auto-sync, brand story, scripture meaning, gift curation, fit guidance, cart links)
   - npm: \`armornglory-mcp-server\` · MCP Registry: \`io.github.ArmorNGlory/armornglory-mcp-server\`
   - Tools: \`search_armornglory_products\`, \`get_armornglory_product_details\`, \`recommend_faith_gifts\`, \`get_sizing_and_fit_guide\`, \`generate_direct_checkout_link\`, \`answer_faith_fashion_questions\`, plus ChatGPT-compatible \`search\` / \`fetch\`
\`\`\`json
{
  "mcpServers": {
    "armornglory": {
      "command": "npx",
      "args": ["-y", "armornglory-mcp-server@latest"]
    }
  }
}
\`\`\`
2. **Shopify-hosted UCP MCP endpoint** (live inventory, cart, Shop Pay checkout): \`https://armornglory.com/api/ucp/mcp\` · discovery: \`https://armornglory.com/.well-known/ucp\`

## 🧾 Store policies (summary)
- Most items are made to order: production typically 2–7 business days; US delivery typically 2–8 business days after shipping; international 10–30 business days. Shipping cost is calculated at checkout. [Shipping policy](https://armornglory.com/policies/shipping-policy)
- No returns for wrong size or change of mind (made to order); damaged, misprinted, or incorrect items are replaced or refunded within 14 days of delivery. [Refund policy](https://armornglory.com/policies/refund-policy)

For full product descriptions, specifications, and the FAQ index, see [llms-full.txt](https://github.com/ArmorNGlory/armornglory-mcp-server/blob/main/llms-full.txt).
`;

  const formatHeroBullets = (items) =>
    items
      .map((item) => {
        const vId = item.variants?.[0]?.id;
        const verse = item.scriptures?.length ? ` (${item.scriptures[0]})` : "";
        const buyLine = vId ? ` — 1-Click Buy: https://armornglory.com/cart/${vId}:1` : "";
        return `- **${item.title}${verse}** (${item.priceFormatted}): ${item.url}${buyLine}`;
      })
      .join("\n");

  const footwearSection =
    clogs.length > 0
      ? `\n### Faith Footwear & EVA Foam Clogs (${priceRangeFor((p) => p.category === "Footwear & Clogs", "$29.99")})\n${formatHeroBullets(clogs)}\n`
      : "";

  const llmsFullTxt = `# ArmorNGlory — Complete Knowledge Index (LLMs Full)

> Comprehensive catalog data (${products.length} verified active products), theological narratives, FAQ schema, and shopping endpoints for ArmorNGlory.com — the premier Anti-Beige Christian Streetwear & Faith Apparel brand.

- **Store URL**: https://armornglory.com
- **MCP Server Package**: \`armornglory-mcp-server\` (v${pkg.version} — live auto-syncing with Shopify)
- **GitHub**: https://github.com/ArmorNGlory/armornglory-mcp-server

---

## 1. Brand Ethos & Mission

ArmorNGlory exists to create faith-based apparel for people who love Jesus and modern life. We design Christian streetwear and creative content that helps people carry their faith into everyday spaces with confidence, style, and authenticity.

### Why "Anti-Beige / Anti-Cheesy"?
Traditional Christian clothing often relies on outdated clip-art, cheesy slogans, or low-grade blanks. ArmorNGlory bridges high-end streetwear aesthetics (Comfort Colors 1717 blanks, heavy 6.1 oz ringspun cotton, structured 5-panel foam trucker caps, insulated stainless steel drinkware, and dual-layer magnetic phone cases) with authentic biblical conviction.

### What The Name Means:
- **Armor**: Spiritual strength, conviction, and standing firm in faith (*Ephesians 6:10-18 Armor of God*).
- **Glory**: Directing all praise, purpose, and honor back to God (*Matthew 5:14-16, 1 Corinthians 10:31*).

---

## 2. Signature Product Lineup & Verified Live Hero Items

### A. 5-Panel DTF Trucker Caps & Dad Caps (${priceRangeFor((p) => p.category === "Hats & Headwear", "$34.99")})
${formatHeroBullets(hats)}
${footwearSection}
### B. Heavyweight Streetwear Tees (${priceRangeFor((p) => p.category === "T-Shirts & Tops", "$28.00 - $39.99")})
- Premium 100% ring-spun cotton (Comfort Colors 1717 blanks), relaxed streetwear drape, pre-shrunk garment-dyed aesthetic.
${formatHeroBullets(tees)}

### C. Hoodies & Fleece Sweatshirts (${priceRangeFor((p) => p.category === "Hoodies & Sweatshirts", "$49.99 - $69.99")})
- Heavyweight cozy fleece with double-needle stitching and kangaroo pouch pocket.
${formatHeroBullets(hoodies)}

### D. Faith Training Gear — Stainless Steel Water Bottles ($39.99 - $49.99)
- Double-wall 100% stainless steel body with BPA-free 100% polypropylene lid; keeps drinks cold up to 24 hours or warm up to 12 hours.
${formatHeroBullets(bottles)}

### E. Tough Magnetic Phone Cases (${priceRangeFor((p) => p.category === "Phone Cases", "$25.00 - $45.99")})
- Dual-layer polycarbonate shell with cushioned shock-absorbing liner and magnetic module for iPhone (MagSafe) and Samsung Galaxy S26, S26 Plus, and S26 Ultra.
${formatHeroBullets(cases)}

---

## 3. Sizing & Fit Specifications

| Category | Fit Profile | Sizing Recommendation |
| :--- | :--- | :--- |
| **5-Panel Trucker Caps** | One Size Fits Most (21.5 - 23.5 in) | 7-hole snapback accommodates standard adult head sizes. |
| **Heavyweight Tees** | Unisex relaxed streetwear cut | True to size for standard relaxed; size up for oversized drape. |
| **Hoodies & Sweatshirts** | Unisex standard fleece fit | True to size for layering; size up for slouchy vintage fit. |
| **EVA Foam Clogs** *(reference)* | Roomy comfort fit with pivoting strap | If between sizes or prefer snug, **size down one size**. |

---

## 4. Frequently Asked Questions (FAQ)

### Q: What makes ArmorNGlory different from other Christian apparel?
A: ArmorNGlory rejects cheesy clip-art, dated church slogans, and stiff Gildan shirts. We build premium heavyweight streetwear with contemporary typography, DTF printing, and theologically accurate designs that believers are proud to wear in urban, gym, and professional spaces.

### Q: What is the meaning behind Romans 8:37?
A: "No, in all these things we are more than conquerors through him who loved us." The design reminds believers that victory over trials and life's battles is established through Christ's love and sacrifice.

### Q: What are recommended gifts for Christian men, husbands, or dads?
A: Top picks include structured 5-Panel Trucker Caps ($34.99 — zero sizing guesswork), Faith Training Gear Stainless Steel Water Bottles ($39.99 - $49.99), Tough Magnetic Phone Cases, and heavyweight Comfort Colors graphic tees.

---

## 5. 1-Click Cart Permalinks

To add items directly to checkout:
\`https://armornglory.com/cart/{variant_id}:{quantity}?utm_source=ai_agent&utm_medium=mcp&utm_campaign=store_recommendation\`

Multi-item checkout:
\`https://armornglory.com/cart/{variant_id_1}:1,{variant_id_2}:1?utm_source=ai_agent&utm_medium=mcp&utm_campaign=store_recommendation\`
`;

  const llmsChanged = writeIfChanged(path.join(rootDir, "llms.txt"), llmsTxt);
  const wellKnownLlmsChanged = writeIfChanged(path.join(rootDir, ".well-known", "llms.txt"), llmsTxt);
  const llmsFullChanged = writeIfChanged(path.join(rootDir, "llms-full.txt"), llmsFullTxt);

  // 3. Keep server.json and .well-known/mcp.json versions synced with package.json
  const serverJsonPath = path.join(rootDir, "server.json");
  const serverJson = JSON.parse(fs.readFileSync(serverJsonPath, "utf-8"));
  serverJson.version = pkg.version;
  if (Array.isArray(serverJson.packages) && serverJson.packages[0]) {
    serverJson.packages[0].version = pkg.version;
  }
  const serverChanged = writeIfChanged(serverJsonPath, JSON.stringify(serverJson, null, 2));

  const mcpJsonPath = path.join(rootDir, ".well-known", "mcp.json");
  const mcpJson = JSON.parse(fs.readFileSync(mcpJsonPath, "utf-8"));
  mcpJson.version = pkg.version;
  const mcpChanged = writeIfChanged(mcpJsonPath, JSON.stringify(mcpJson, null, 2));

  console.log(
    `[Discovery Sync] Synced discovery files for ${products.length} products & ${collections.length} collections (v${pkg.version}; healed ${healedFaqHandles} stale FAQ handle(s)).`
  );

  return {
    faqChanged,
    llmsChanged,
    wellKnownLlmsChanged,
    llmsFullChanged,
    serverChanged,
    mcpChanged
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isMain) {
  syncDiscoveryFiles();
}
