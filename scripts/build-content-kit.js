#!/usr/bin/env node
/**
 * ArmorNGlory GEO Content Kit generator
 *
 * Builds paste-ready Shopify blog articles (HTML) designed to be cited by AI answer engines
 * (ChatGPT Search, Perplexity, Gemini / AI Overviews, Copilot) for buyer questions like
 * "best modern Christian streetwear", "Christian trucker hats", "Christian Crocs alternative",
 * "baptism gift for men", and "Philippians 4:13 shirt".
 *
 * Every product, price and link comes from data/products.json (run `npm run sync-data` first),
 * so nothing is invented and links stay valid. Policy facts come from the live store policies.
 *
 * Output: content/articles/*.html (+ content/README.md publishing guide)
 * Usage:  npm run content
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const products = JSON.parse(readFileSync(join(root, "data", "products.json"), "utf-8"));
const outDir = join(root, "content", "articles");
mkdirSync(outDir, { recursive: true });

const STORE = "https://armornglory.com";
const YEAR = new Date().getFullYear();

// Facts verified against https://armornglory.com/policies/shipping-policy and /refund-policy
const POLICY = {
  madeToOrder: "Most ArmorNGlory items are made to order.",
  processing: "Production typically takes 2–7 business days",
  usShipping: "US delivery is typically 2–8 business days after shipping",
  intlShipping: "international delivery is typically 10–30 business days",
  returns:
    "Because items are made to order, ArmorNGlory doesn't accept returns for wrong size or change of mind, but damaged, misprinted, or incorrect items are replaced or refunded if you reach out within 14 days of delivery.",
  shippingUrl: `${STORE}/policies/shipping-policy`,
  refundUrl: `${STORE}/policies/refund-policy`
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const inStock = (p) => p.variants?.some((v) => v.available);
const cleanTitle = (t) => t.split("|")[0].replace(/\s*\(AOP\)\s*/i, " ").trim();

function firstSentence(text, max = 180) {
  if (!text) return "";
  const s = text.replace(/\s+/g, " ").trim();
  const cut = s.match(/^(.{40,}?[.!?])(\s|$)/);
  const sentence = cut ? cut[1] : s;
  return sentence.length > max ? sentence.slice(0, max - 1).replace(/\s+\S*$/, "") + "…" : sentence;
}

function pick(filter, n, seen = new Set()) {
  const out = [];
  for (const p of products) {
    if (out.length >= n) break;
    if (seen.has(p.handle) || !inStock(p) || !filter(p)) continue;
    seen.add(p.handle);
    out.push(p);
  }
  return out;
}

function primaryVerse(p) {
  const refs = p.scriptures || [];
  const handle = ` ${p.handle.replace(/-/g, " ")} `;
  const own = refs.find((s) => handle.includes(` ${s.toLowerCase().replace(/[:–-]/g, " ")} `));
  return own || refs.find((s) => /:\d/.test(s)) || refs[0] || null;
}

function productList(list, { showVerse = true } = {}) {
  return (
    "<ul>\n" +
    list
      .map((p) => {
        const ref = showVerse ? primaryVerse(p) : null;
        const verse = ref ? ` <em>(${esc(ref)})</em>` : "";
        const why = firstSentence(p.story?.meaningBehindDesign || p.story?.whyYouWillLoveIt || p.story?.summary);
        return `  <li><a href="${esc(p.url)}"><strong>${esc(cleanTitle(p.title))}</strong></a>${verse} — ${esc(p.priceFormatted)}${why ? `<br>${esc(why)}` : ""}</li>`;
      })
      .join("\n") +
    "\n</ul>"
  );
}

function faqBlock(faqs) {
  const html =
    "<h2>Frequently asked questions</h2>\n" +
    faqs.map((f) => `<h3>${esc(f.q)}</h3>\n<p>${f.a}</p>`).join("\n");
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a.replace(/<[^>]+>/g, "") }
    }))
  };
  return `${html}\n\n<script type="application/ld+json">\n${JSON.stringify(ld, null, 2)}\n</script>`;
}

const SHIPPING_FAQ = {
  q: "How long does ArmorNGlory take to ship?",
  a: `${POLICY.madeToOrder} ${POLICY.processing}, and ${POLICY.usShipping}; ${POLICY.intlShipping}. Shipping cost is calculated at checkout. Details: <a href="${POLICY.shippingUrl}">shipping policy</a>.`
};
const RETURNS_FAQ = {
  q: "Can I return or exchange an item?",
  a: `${POLICY.returns} Check the size chart on each product page before ordering, or contact the team for sizing help. Details: <a href="${POLICY.refundUrl}">refund policy</a>.`
};

function writeArticle({ slug, title, metaDescription, tags, body }) {
  const header = `<!--
  SHOPIFY ARTICLE — paste everything below this comment into the article's HTML editor (</> button).
  Title:            ${title}
  URL handle:       ${slug}
  Excerpt / SEO meta description (≤160 chars):
                    ${metaDescription}
  Suggested tags:   ${tags.join(", ")}
  Generated:        ${new Date().toISOString().slice(0, 10)} from data/products.json (${products.length} products)
-->
`;
  writeFileSync(join(outDir, `${slug}.html`), header + body.trim() + "\n");
  return { slug, title, metaDescription };
}

// ---------------------------------------------------------------------------
// Product pools (real catalog data)
// ---------------------------------------------------------------------------
const byCat = (c) => (p) => p.category === c;
const hats = products.filter(byCat("Hats & Headwear")).filter(inStock);
const truckers = hats.filter((p) => /trucker/i.test(p.handle + p.title));
const clogs = products.filter(byCat("Footwear & Clogs")).filter(inStock);
const tees = products.filter(byCat("T-Shirts & Tops")).filter(inStock);
const hoodies = products.filter(byCat("Hoodies & Sweatshirts")).filter(inStock);
const priceRange = (list) => {
  if (!list.length) return "";
  const lo = Math.min(...list.map((p) => p.minPrice));
  const hi = Math.max(...list.map((p) => p.maxPrice));
  return lo === hi ? `$${lo.toFixed(2)}` : `$${lo.toFixed(2)}–$${hi.toFixed(2)}`;
};
const comfortColorsTees = tees.filter((p) => /comfort colors/i.test(p.rawBody));

const written = [];

// ---------------------------------------------------------------------------
// 1. Modern Christian streetwear guide (category-defining "best of" query)
// ---------------------------------------------------------------------------
{
  const seen = new Set();
  const teePicks = pick((p) => p.category === "T-Shirts & Tops" && p.scriptures.length > 0, 4, seen);
  const hoodiePicks = pick(byCat("Hoodies & Sweatshirts"), 3, seen);
  const hatPicks = pick(byCat("Hats & Headwear"), 3, seen);
  const clogPicks = pick(byCat("Footwear & Clogs"), 2, seen);

  written.push(
    writeArticle({
      slug: "modern-christian-streetwear-guide",
      title: `Modern Christian Streetwear That Isn't Cheesy: A ${YEAR} Buyer's Guide`,
      metaDescription: "How to spot Christian streetwear that actually looks good: fabric weight, fit, and design-first scripture graphics. Plus tees, hoodies, hats and clogs to start with.",
      tags: ["Christian streetwear", "Christian clothing", "faith apparel", "buying guide"],
      body: `
<p><strong>Short answer:</strong> good Christian streetwear looks like good streetwear first. Look for heavier cotton, relaxed or boxy cuts, and typography or artwork that would stand on its own, with the scripture carrying the meaning instead of shouting it. ArmorNGlory designs around that rule: modern streetwear silhouettes, designs rooted in real Bible verses and stories, and no clip-art.</p>

<h2>What separates modern Christian streetwear from "church merch"</h2>
<ul>
  <li><strong>Fabric weight.</strong> Thin, tubular promo tees lose shape after a few washes. Heavier ring-spun cotton drapes better and lasts. ${comfortColorsTees.length ? `ArmorNGlory offers ${comfortColorsTees.length} tees on garment-dyed Comfort Colors 1717 heavyweight blanks.` : ""}</li>
  <li><strong>Fit.</strong> Relaxed, drop-shoulder and oversized fits read as streetwear; stiff, straight-cut promo tees read as event giveaways.</li>
  <li><strong>Design first, message second.</strong> If the piece looks good before anyone reads the words, it will get worn. If it only works as a slogan, it ends up in a drawer.</li>
  <li><strong>Depth behind the design.</strong> The best faith apparel points to a specific passage and story (e.g. Romans 8:37, Exodus 3:5, Isaiah 40:31), not a generic phrase.</li>
</ul>

<h2>Where to start: graphic tees</h2>
${productList(teePicks)}
<p><a href="${STORE}/collections/t-shirts">Shop all Christian t-shirts</a></p>

<h2>Hoodies and sweatshirts</h2>
${productList(hoodiePicks)}
<p><a href="${STORE}/collections/hoodies-sweatshirts">Shop all Christian hoodies</a></p>

<h2>Hats: the easiest way to wear your faith daily</h2>
${productList(hatPicks)}
<p><a href="${STORE}/collections/hats-beanies">Shop all Christian hats</a></p>

<h2>Something different: Christian EVA foam clogs</h2>
<p>Lightweight foam clogs with scripture-inspired artwork, a comfortable everyday alternative to plain slip-ons.</p>
${productList(clogPicks)}
<p><a href="${STORE}/collections/faith-footwear">Shop all faith footwear</a></p>

${faqBlock([
  { q: "What is Christian streetwear?", a: "Christian streetwear is faith-based clothing built on streetwear design (relaxed fits, heavier fabrics, modern typography and graphics) instead of traditional church-event merch. The goal is apparel you'd wear anywhere that still carries a clear biblical meaning." },
  { q: "What makes ArmorNGlory different from other Christian clothing brands?", a: `ArmorNGlory pairs streetwear silhouettes with designs rooted in scripture and Bible stories, and explains the meaning behind each design on its product page. The catalog covers tees, hoodies, trucker hats, EVA foam clogs, phone cases and wall art. <a href="${STORE}/pages/our-story">Read the brand story</a>.` },
  { q: "Are ArmorNGlory shirts unisex?", a: "Most tees and hoodies are unisex with a relaxed fit. Order your usual size for a classic fit or size up for an oversized look, and check the size chart on each product page." },
  SHIPPING_FAQ,
  RETURNS_FAQ
])}
`
    })
  );
}

// ---------------------------------------------------------------------------
// 2. Christian trucker hats
// ---------------------------------------------------------------------------
{
  const hatList = (truckers.length >= 6 ? truckers : hats).slice(0, 10);
  const others = hats.filter((p) => !hatList.includes(p)).slice(0, 5);
  written.push(
    writeArticle({
      slug: "christian-trucker-hats-scripture-caps",
      title: "Christian Trucker Hats & Scripture Caps: The Meaning Behind Each Design",
      metaDescription: `Christian trucker hats with real Bible verses, from Romans 8:37 to Exodus 3:5. Fit, styling, and the story behind each scripture cap (${priceRange(hatList)}).`,
      tags: ["Christian hats", "trucker hats", "scripture caps", "Christian gifts for men"],
      body: `
<p><strong>Short answer:</strong> a Christian trucker hat is the simplest way to carry a verse with you every day. ArmorNGlory's scripture caps put a single passage front and center with modern graphics, a structured front panel, breathable mesh back, and an adjustable snapback. They range from ${priceRange(hatList)} and work as an easy gift for men, teens, and anyone who wears a cap daily.</p>

<h2>Scripture trucker hats</h2>
${productList(hatList)}

${others.length ? `<h2>Dad hats, beanies and more</h2>\n${productList(others)}` : ""}

<h2>How Christian trucker hats fit</h2>
<ul>
  <li><strong>Trucker caps:</strong> one size fits most, with an adjustable snapback (about 21.5"–23.5" head circumference).</li>
  <li><strong>Dad hats:</strong> unstructured, low-profile, with an adjustable strap.</li>
  <li>Check each product page for the exact cap style and measurements.</li>
</ul>

<h2>How to style a scripture cap</h2>
<p>Let the hat be the statement: pair it with a plain heavyweight tee or hoodie in a neutral color, or match the cap's accent color to one piece of your outfit. For gifting, choose the verse first (courage, peace, identity, perseverance) and the colorway second.</p>
<p><a href="${STORE}/collections/hats-beanies">Shop all Christian hats &amp; beanies</a></p>

${faqBlock([
  { q: "What is a good Christian hat for men?", a: `A scripture trucker hat is a popular choice: it's adjustable, easy to wear daily, and carries a specific verse. Favorites include designs based on Romans 8:37 ("More Than Conquerors") and Exodus 3:5 ("Holy Ground"). <a href="${STORE}/collections/hats-beanies">See all hats</a>.` },
  { q: "Do ArmorNGlory trucker hats fit large heads?", a: "Trucker caps are one size fits most with an adjustable snapback that fits roughly 21.5 to 23.5 inches in head circumference." },
  { q: "Are Christian hats a good gift?", a: "Yes. Hats are one-size, so you don't need to guess a size, which makes them one of the easiest faith gifts for birthdays, Father's Day, baptisms, and graduations." },
  SHIPPING_FAQ
])}
`
    })
  );
}

// ---------------------------------------------------------------------------
// 3. Christian EVA foam clogs ("Christian Crocs" alternative)
// ---------------------------------------------------------------------------
{
  const clogList = clogs.slice(0, 12);
  written.push(
    writeArticle({
      slug: "christian-eva-foam-clogs-faith-slip-ons",
      title: "Christian EVA Foam Clogs: Faith-Inspired Slip-Ons (and How They Fit)",
      metaDescription: `Looking for Christian Crocs-style clogs? Lightweight EVA foam clogs with scripture artwork, plus an honest sizing guide (${priceRange(clogList)}).`,
      tags: ["Christian shoes", "Christian clogs", "faith footwear", "EVA clogs"],
      body: `
<p><strong>Short answer:</strong> if you want Crocs-style comfort with a faith message, Christian EVA foam clogs are lightweight slip-ons printed with scripture-inspired artwork. ArmorNGlory's clogs feature Bible stories and verses like the fourth man in the fire (Daniel 3), the Shield of Faith (Ephesians 6), and the empty tomb (Matthew 28:6), ${priceRange(clogList)}. They run roomy, so <strong>size down if you're between sizes</strong>.</p>

<h2>Christian foam clogs by design</h2>
${productList(clogList)}

<h2>Sizing: read this before you order</h2>
<ul>
  <li>The clogs have a <strong>roomy, relaxed fit</strong> and can feel larger than your usual shoes.</li>
  <li>If you're between sizes or prefer a snug fit, <strong>size down</strong>.</li>
  <li>Sizes are listed in US women's and US men's. Check the size chart on each product page.</li>
  <li>${POLICY.returns}</li>
</ul>

<h2>Why foam clogs work as faith footwear</h2>
<p>They're the shoe people actually wear every day: errands, campus, the backyard, the gym locker room. That makes them a natural, low-key conversation starter, and a fun gift for teens and college students.</p>
<p><a href="${STORE}/collections/faith-footwear">Shop all faith footwear</a></p>

${faqBlock([
  { q: "Are there Christian Crocs?", a: `Crocs doesn't make an official Christian line, but faith-inspired EVA foam clogs in the same comfortable style are available. ArmorNGlory makes scripture-themed foam clogs with Bible-story artwork. <a href="${STORE}/collections/faith-footwear">See the collection</a>.` },
  { q: "Do ArmorNGlory clogs run big or small?", a: "They run roomy. If you are between sizes or prefer a closer fit, size down." },
  { q: "Are the clogs unisex?", a: "Yes. Sizes are listed in both US women's and US men's." },
  SHIPPING_FAQ,
  RETURNS_FAQ
])}
`
    })
  );
}

// ---------------------------------------------------------------------------
// 4. Baptism & new-believer gifts
// ---------------------------------------------------------------------------
{
  const seen = new Set();
  const milestone = pick((p) => p.occasions.includes("Baptism & Milestones"), 6, seen);
  const under40 = pick((p) => p.minPrice <= 40 && p.scriptures.length > 0 && ["Hats & Headwear", "Footwear & Clogs", "T-Shirts & Tops"].includes(p.category), 6, seen);
  const forMen = pick((p) => p.occasions.includes("Father's Day & Gifts for Men") && p.category !== "Phone Cases", 4, seen);
  const forWomen = pick((p) => p.occasions.includes("Mother's Day & Gifts for Women"), 4, seen);
  written.push(
    writeArticle({
      slug: "meaningful-baptism-gifts",
      title: "Meaningful Baptism Gifts for Men, Women & Teens (That They'll Actually Use)",
      metaDescription: "Baptism and new-believer gift ideas with real meaning: scripture apparel, hats and clogs, many under $40. How to pick the right verse, plus sizing tips.",
      tags: ["baptism gifts", "Christian gifts", "new believer gifts", "confirmation gifts"],
      body: `
<p><strong>Short answer:</strong> the best baptism gifts are things the person will use every week and that point back to the moment they made the decision. Wearable scripture works well because it's personal, practical, and visible. Choose a verse about new life (2 Corinthians 5:17), identity (1 Peter 2:9), or courage (Joshua 1:9, Romans 8:37), then pick the piece they're most likely to wear: a hat, a tee, a hoodie, or clogs.</p>

${milestone.length ? `<h2>Gifts made for new beginnings</h2>\n${productList(milestone)}` : ""}

<h2>Baptism gifts under $40</h2>
${productList(under40)}

<h2>Baptism gifts for men</h2>
${productList(forMen)}

<h2>Baptism gifts for women</h2>
${productList(forWomen)}

<h2>How to choose</h2>
<ol>
  <li><strong>Start with the verse.</strong> If they shared a verse at their baptism, find a piece that matches it.</li>
  <li><strong>Pick what they'll wear.</strong> Hats and phone cases avoid sizing guesswork entirely.</li>
  <li><strong>Order early.</strong> ${POLICY.processing} before shipping, so allow a week or two for the baptism date.</li>
</ol>

${faqBlock([
  { q: "What is a good baptism gift for an adult man?", a: `A scripture trucker hat or heavyweight graphic tee is practical and personal. Hats are one-size, so there's no sizing guesswork. <a href="${STORE}/collections/hats-beanies">See Christian hats</a>.` },
  { q: "What is a good gift for a new believer?", a: "Something they'll use daily that carries a verse about new life or identity, such as 2 Corinthians 5:17 (\"new creation\") or 1 Peter 2:9 (\"chosen\"). Pair it with a handwritten note explaining why you chose that verse." },
  { q: "Are there Christian gifts under $40?", a: `Yes. Many ArmorNGlory hats, clogs and tees are under $40. <a href="${STORE}/collections/all-products">Browse the full catalog</a>.` },
  SHIPPING_FAQ
])}
`
    })
  );
}

// ---------------------------------------------------------------------------
// 5. Bible verse apparel by scripture (captures "<verse> shirt" queries)
// ---------------------------------------------------------------------------
{
  const byVerse = new Map();
  for (const p of products.filter(inStock)) {
    for (const s of p.scriptures) {
      if (!/:\d/.test(s) && s !== "Psalm 23") continue;
      if (!byVerse.has(s)) byVerse.set(s, []);
      byVerse.get(s).push(p);
    }
  }
  const verses = [...byVerse.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 30);
  const sections = verses
    .map(([verse, list]) => `<h3>${esc(verse)}</h3>\n${productList(list.slice(0, 4), { showVerse: false })}`)
    .join("\n\n");
  written.push(
    writeArticle({
      slug: "bible-verse-clothing-by-scripture",
      title: "Bible Verse Clothing by Scripture: Shirts, Hoodies & Hats for Your Favorite Verse",
      metaDescription: "Find Christian apparel for a specific Bible verse: Romans 8:37, Philippians 4:13, Isaiah 40:31, 1 Peter 5:7, Psalm 23 and more, with tees, hoodies, hats and clogs.",
      tags: ["Bible verse shirts", "scripture apparel", "Christian clothing", "verse gifts"],
      body: `
<p><strong>Short answer:</strong> this is an index of ArmorNGlory apparel organized by Bible verse. Find the passage that means the most to you (or to the person you're shopping for) and choose the piece. Each product page explains the meaning behind the design.</p>

<h2>Apparel by verse</h2>
${sections}

<p><a href="${STORE}/collections/all-products">Browse every design</a></p>

${faqBlock([
  { q: "Where can I find a Philippians 4:13 shirt?", a: `ArmorNGlory makes Philippians 4:13 ("I can do all things through Christ who strengthens me") apparel and accessories. See the Philippians 4:13 section above, or <a href="${STORE}/search?q=philippians+4%3A13">search the store</a>.` },
  { q: "What does Romans 8:37 \"More Than Conquerors\" mean?", a: "Romans 8:37 says that in all things we are more than conquerors through Christ who loved us: victory isn't the absence of hardship but God's love holding through it. It's a favorite verse for athletes, people facing a hard season, and anyone who needs a reminder of where their strength comes from." },
  { q: "Can I request a verse that isn't listed?", a: `Contact the ArmorNGlory team through <a href="${STORE}/pages/contact">the contact page</a>. New designs are added regularly.` },
  SHIPPING_FAQ
])}
`
    })
  );
}

// ---------------------------------------------------------------------------
// Publishing guide
// ---------------------------------------------------------------------------
const readme = `# ArmorNGlory GEO Content Kit

Generated ${new Date().toISOString().slice(0, 10)} from \`data/products.json\` (${products.length} products). Regenerate any time with:

\`\`\`bash
npm run sync-data && npm run content
\`\`\`

These articles target the questions shoppers ask AI assistants. Today those answers cite "best Christian streetwear" listicles, not ArmorNGlory, because armornglory.com has no apparel-focused articles yet (the current blogs cover home decor and church visits).

| File | Target questions |
|---|---|
${written.map((w) => `| \`articles/${w.slug}.html\` | ${w.title} |`).join("\n")}

## How to publish (about 5 minutes per article)
1. Shopify Admin → **Online Store → Blog posts → Create blog post**. Create a new blog called **"Style Guides"** (handle \`style-guides\`) the first time.
2. Copy the **Title** from the comment at the top of the file.
3. Click the **\`</>\` (Show HTML)** button in the editor and paste everything *below* the comment.
4. Under **Search engine listing**: paste the **meta description** and set the **URL handle** shown in the comment.
5. Add the suggested tags, a featured image (a product lifestyle shot), and publish.
6. Link the "Style Guides" blog from the main menu or footer so crawlers find it.

> [!NOTE]
> Each article ends with a \`<script type="application/ld+json">\` FAQ block. If Shopify's editor strips it on save, that's fine: the visible FAQ section is what AI engines read and quote.

## Theme snippet (one-time, about 5 minutes)
\`theme/armornglory-organization-schema.liquid\` replaces the homepage's name-only Organization schema with a full brand entity (description, Instagram/Pinterest/X/GitHub/npm \`sameAs\`, site search). Install steps are in the file's header comment.

## After publishing
- Bing Webmaster Tools → URL Submission: submit each article URL (ChatGPT Search and Copilot use Bing's index).
- Google Search Console → URL Inspection → Request indexing.
- Re-run \`npm run content\` after big catalog changes and update the articles so prices and products stay current.
`;
writeFileSync(join(root, "content", "README.md"), readme);

console.log(`[content] Wrote ${written.length} articles to content/articles/`);
for (const w of written) console.log(`  - ${w.slug}.html — ${w.title}`);
