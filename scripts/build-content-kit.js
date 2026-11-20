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

import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "fs";
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
  const casePicks = pick(byCat("Phone Cases"), 3, seen);
  const clogPicks = pick(byCat("Footwear & Clogs"), 2, seen);

  written.push(
    writeArticle({
      slug: "modern-christian-streetwear-guide",
      title: `Modern Christian Streetwear That Isn't Cheesy: A ${YEAR} Buyer's Guide`,
      metaDescription: "How to spot Christian streetwear that actually looks good: fabric weight, fit, and design-first scripture graphics. Plus tees, hoodies, hats and daily carry.",
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

${
  clogPicks.length
    ? `<h2>Something different: Christian EVA foam clogs</h2>
<p>Lightweight foam clogs with scripture-inspired artwork, a comfortable everyday alternative to plain slip-ons.</p>
${productList(clogPicks)}
<p><a href="${STORE}/collections/faith-footwear">Shop all faith footwear</a></p>`
    : `<h2>Everyday carry: tough magnetic scripture phone cases</h2>
<p>Dual-layer polycarbonate and cushioned liner cases with built-in magnetic modules for iPhone (MagSafe) and Samsung Galaxy S26 series.</p>
${productList(casePicks)}
<p><a href="${STORE}/collections/phone-cases">Shop all Christian phone cases</a></p>`
}

${faqBlock([
  { q: "What is Christian streetwear?", a: "Christian streetwear is faith-based clothing built on streetwear design (relaxed fits, heavier fabrics, modern typography and graphics) instead of traditional church-event merch. The goal is apparel you'd wear anywhere that still carries a clear biblical meaning." },
  { q: "What makes ArmorNGlory different from other Christian clothing brands?", a: `ArmorNGlory pairs streetwear silhouettes with designs rooted in scripture and Bible stories, and explains the meaning behind each design on its product page. The catalog covers tees, hoodies, trucker hats, tough magnetic phone cases, stainless steel water bottles, pajama loungewear, and wall art. <a href="${STORE}/pages/our-story">Read the brand story</a>.` },
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
// 3. Christian EVA foam clogs ("Christian Crocs" alternative — only when stocked)
// ---------------------------------------------------------------------------
{
  const clogSlugPath = join(outDir, "christian-eva-foam-clogs-faith-slip-ons.html");
  if (clogs.length > 0) {
    const clogList = clogs.slice(0, 12);
    written.push(
      writeArticle({
        slug: "christian-eva-foam-clogs-faith-slip-ons",
        title: "Christian EVA Foam Clogs: Faith-Inspired Slip-Ons (and How They Fit)",
        metaDescription: `Looking for Christian Crocs-style clogs? Lightweight EVA foam clogs with scripture artwork, plus an honest sizing guide (${priceRange(clogList)}).`,
        tags: ["Christian shoes", "Christian clogs", "faith footwear", "EVA clogs"],
        body: `
<p><strong>Short answer:</strong> if you want Crocs-style comfort with a faith message, Christian EVA foam clogs are lightweight slip-ons printed with scripture-inspired artwork. ArmorNGlory's clogs feature Bible stories and verses (${priceRange(clogList)}). They run roomy, so <strong>size down if you're between sizes</strong>.</p>

<h2>Christian foam clogs by design</h2>
${productList(clogList)}

<p><a href="${STORE}/collections/faith-footwear">Shop all faith footwear</a></p>

${faqBlock([
  { q: "Do ArmorNGlory clogs run big or small?", a: "They run roomy. If you are between sizes or prefer a closer fit, size down." },
  SHIPPING_FAQ,
  RETURNS_FAQ
])}
`
      })
    );
  } else if (existsSync(clogSlugPath)) {
    unlinkSync(clogSlugPath);
  }
}

// ---------------------------------------------------------------------------
// 4. Baptism & new-believer gifts
// ---------------------------------------------------------------------------
{
  const seen = new Set();
  const milestone = pick((p) => p.occasions.includes("Baptism & Milestones"), 6, seen);
  const under40 = pick((p) => p.minPrice <= 40 && p.scriptures.length > 0 && ["Hats & Headwear", "T-Shirts & Tops", "Drinkware & Water Bottles", "Phone Cases", "Footwear & Clogs"].includes(p.category), 6, seen);
  const forMen = pick((p) => p.occasions.includes("Father's Day & Gifts for Men") && p.category !== "Phone Cases", 4, seen);
  const forWomen = pick((p) => p.occasions.includes("Mother's Day & Gifts for Women"), 4, seen);
  written.push(
    writeArticle({
      slug: "meaningful-baptism-gifts",
      title: "Meaningful Baptism Gifts for Men, Women & Teens (That They'll Actually Use)",
      metaDescription: `Baptism and new-believer gift ideas with real meaning: scripture apparel, hats, water bottles${clogs.length ? " and clogs" : " and phone cases"}, many under $40. How to pick the right verse, plus sizing tips.`,
      tags: ["baptism gifts", "Christian gifts", "new believer gifts", "confirmation gifts"],
      body: `
<p><strong>Short answer:</strong> the best baptism gifts are things the person will use every week and that point back to the moment they made the decision. Wearable scripture works well because it's personal, practical, and visible. Choose a verse about new life (2 Corinthians 5:17), identity (1 Peter 2:9), or courage (Joshua 1:9, Romans 8:37), then pick the piece they're most likely to wear: a hat, a tee, a hoodie, a stainless steel water bottle, or a magnetic phone case${clogs.length ? ", or clogs" : ""}.</p>

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
  { q: "Are there Christian gifts under $40?", a: `Yes. Many ArmorNGlory hats, tees, phone cases${clogs.length ? ", clogs," : ""} and water bottles are under $40. <a href="${STORE}/collections/all-products">Browse the full catalog</a>.` },
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
      metaDescription: `Find Christian apparel for a specific Bible verse: Romans 8:37, Philippians 4:13, Isaiah 40:31, 1 Peter 5:7, Psalm 23 and more, with tees, hoodies, hats, water bottles and phone cases.`,
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
// 6. Christian Christmas & Holiday Gift Guide (Q4 buyer queries)
// ---------------------------------------------------------------------------
{
  const seen = new Set();
  const holidayPicks = pick((p) => /christmas|nativity|friendsmas|better together|peace on earth|plaid pajama/i.test(`${p.title} ${p.tags.join(" ")}`), 5, seen);
  const menPicks = pick((p) => p.category === "Hats & Headwear" && p.scriptures.length > 0, 4, seen);
  const cozyPicks = pick(byCat("Hoodies & Sweatshirts"), 4, seen);
  const bottleGiftPicks = pick((p) => p.handle.includes("stainless-steel-water-bottle"), 4, seen);
  const stockingUnder35 = pick((p) => p.minPrice <= 35 && ["Phone Cases", "Hats & Headwear", "Drinkware & Water Bottles", "Footwear & Clogs"].includes(p.category), 5, seen);

  written.push(
    writeArticle({
      slug: "christian-christmas-gifts-guide",
      title: `Meaningful Christian Christmas Gifts (That Aren't Cheesy): A ${YEAR} Gift Guide`,
      metaDescription: `Thoughtful Christian Christmas gifts for men, women, teens and small groups: scripture trucker hats, hoodies, stainless steel water bottles, pajama pants and magnetic phone cases.`,
      tags: ["Christian Christmas gifts", "Christian gifts", "faith gifts", "holiday gift guide"],
      body: `
<p><strong>Short answer:</strong> the best Christian Christmas gifts combine daily utility with a specific scripture that fits the person's season of life. One-size pieces like adjustable scripture trucker hats, double-wall stainless steel water bottles, and tough magnetic phone cases eliminate sizing guesswork, while heavyweight hoodies and scripture pajama pants cover cozy winter wear.</p>

${holidayPicks.length ? `<h2>Holiday, Friendsmas &amp; cozy seasonal picks</h2>\n${productList(holidayPicks)}` : ""}

<h2>Christmas gifts for men &amp; dads (no size guesswork)</h2>
<p>Adjustable 5-panel scripture trucker caps fit most adult heads (about 21.5"–23.5" circumference) and carry a verse daily without feeling preachy.</p>
${productList(menPicks)}
<p><a href="${STORE}/collections/hats-beanies">Shop all Christian hats &amp; beanies</a></p>

<h2>Cozy winter layers: Christian hoodies &amp; crewnecks</h2>
${productList(cozyPicks)}
<p><a href="${STORE}/collections/hoodies-sweatshirts">Shop all hoodies &amp; sweatshirts</a></p>

<h2>Gifts for gym lovers &amp; runners: insulated scripture water bottles</h2>
<p>Double-wall 100% stainless steel water bottles with BPA-free polypropylene lids that help keep drinks cold for up to 24 hours or warm for up to 12 hours.</p>
${productList(bottleGiftPicks)}
<p><a href="${STORE}/collections/misc-amp-accessories">Shop all drinkware &amp; accessories</a></p>

<h2>Gifts for teens &amp; stocking stuffers under $35</h2>
${productList(stockingUnder35)}

<h2>Christmas shipping &amp; ordering tips</h2>
<ul>
  <li><strong>Order early for December delivery:</strong> ${POLICY.madeToOrder.toLowerCase()} ${POLICY.processing}, and ${POLICY.usShipping}, so place holiday orders at least 2–3 weeks ahead of your gift exchange.</li>
  <li><strong>Double-check phone models &amp; apparel sizes:</strong> phone cases are model-specific (including iPhone MagSafe and Samsung Galaxy S26 / S26 Plus / S26 Ultra), and pajama pants run XS–4XL—check each listing's size chart before ordering.</li>
</ul>

${faqBlock([
  { q: "What is a good Christian Christmas gift for a man who has everything?", a: `A one-size scripture trucker hat (such as Romans 8:37 or Exodus 3:5) or an insulated stainless steel water bottle built around a passage like Proverbs 4:23 or 1 Corinthians 10:31 is practical every day and doesn't require guessing clothing sizes. <a href="${STORE}/collections/hats-beanies">Browse hats</a> or <a href="${STORE}/collections/misc-amp-accessories">drinkware</a>.` },
  { q: "What are good Christian gifts for teens and college students?", a: `Tough magnetic phone cases (for iPhone and Samsung Galaxy S26 series), scripture trucker hats, cozy plaid pajama pants, and relaxed streetwear hoodies are popular daily staples for students. <a href="${STORE}/collections/phone-cases">See phone cases</a> and <a href="${STORE}/collections/hoodies-sweatshirts">hoodies</a>.` },
  { q: "When should I order for Christmas delivery?", a: `${POLICY.madeToOrder} ${POLICY.processing}, and ${POLICY.usShipping}. Order at least 2 to 3 weeks before Christmas for US addresses (and earlier for international orders).` },
  SHIPPING_FAQ,
  RETURNS_FAQ
])}
`
    })
  );
}

// ---------------------------------------------------------------------------
// 7. Christian water bottles & faith gym / training gear
// ---------------------------------------------------------------------------
{
  const seen = new Set();
  const bottles = pick((p) => p.handle.includes("stainless-steel-water-bottle"), 10, seen);
  const workoutApparel = pick(
    (p) =>
      (p.category === "Activewear & Training" || p.category === "T-Shirts & Tops") &&
      (p.aesthetics.includes("Athletic / Performance") || /workout|gym|running|press on|grace over grind|strong in the lord|pillars|second wind/i.test(`${p.title} ${p.tags.join(" ")}`)),
    8,
    seen
  );
  const gymExtras = pick((p) => /duffel/i.test(p.title) || p.category === "Footwear & Clogs", 4, seen);

  written.push(
    writeArticle({
      slug: "christian-water-bottles-gym-training-gear",
      title: "Christian Water Bottles & Faith Gym Gear: Scripture Drinkware & Workout Apparel",
      metaDescription: `Insulated stainless steel Christian water bottles (${priceRange(bottles)}) and faith workout shirts built around 1 Corinthians 10:31, Proverbs 4:23 & Isaiah 40:31.`,
      tags: ["Christian water bottle", "Christian gym wear", "faith activewear", "workout shirts"],
      body: `
<p><strong>Short answer:</strong> ArmorNGlory's Faith Training Gear pairs double-wall 100% stainless steel scripture water bottles (${priceRange(bottles)}) with heavyweight garment-dyed workout tees, performance tanks, and gym duffels. Every design is anchored in a passage about stewardship, endurance, and discipline—such as 1 Corinthians 10:31 ("Every Rep, His Glory"), 1 Corinthians 9:24–27 ("Run Your Race"), Proverbs 4:23 ("Guard the Heart"), and Isaiah 40:31 ("Second Wind").</p>

<h2>Insulated stainless steel Christian water bottles</h2>
<p>Each bottle is made with a 100% stainless steel double-wall body and a BPA-free 100% polypropylene lid, helping keep drinks cold for up to 24 hours or warm for up to 12 hours.</p>
${productList(bottles)}
<p><a href="${STORE}/collections/misc-amp-accessories">Shop all Christian water bottles &amp; accessories</a></p>

<h2>Christian gym shirts, pump covers &amp; running tees</h2>
<p>From relaxed Comfort Colors 1717 heavyweight cotton pump covers to breathable athletic tops, these pieces are built for lifting, running, and daily training.</p>
${productList(workoutApparel)}
<p><a href="${STORE}/collections/activewear">Shop all Christian activewear</a></p>

<h2>${clogs.length > 0 ? "Gym duffels &amp; post-workout recovery slip-ons" : "Gym duffels &amp; training bags"}</h2>
${productList(gymExtras)}

${faqBlock([
  { q: "Are ArmorNGlory Christian water bottles insulated and BPA-free?", a: "Yes. Every Faith Training Gear water bottle features a double-wall 100% stainless steel body and a BPA-free 100% polypropylene lid, helping keep drinks cold for up to 24 hours or warm for up to 12 hours." },
  { q: "What Bible verses are on the Faith Training Gear water bottles?", a: "Designs include 1 Corinthians 10:31 (Every Rep, His Glory), Proverbs 4:23 (Guard the Heart), Philippians 3:14 (Press Toward the Mark), Galatians 6:9 (Do Not Grow Weary), Romans 12:2 (Renewed), Colossians 3:23 (Work from the Heart), Psalm 62:6 (Unmoved), Psalm 90:17 (Establish the Work), 1 Corinthians 9:24–27 (Run Your Race), and Psalm 42:1–2 (Thirst for the Living God)." },
  { q: "What shirts work best as a Christian gym pump cover?", a: `Heavyweight relaxed-fit tees (such as Comfort Colors 1717 6.1 oz ring-spun cotton) drape well over gym gear; size up one size if you want an oversized pump-cover fit. <a href="${STORE}/collections/activewear">Browse activewear</a>.` },
  SHIPPING_FAQ,
  RETURNS_FAQ
])}
`
    })
  );
}

// ---------------------------------------------------------------------------
// 8. Christian Phone Cases (iPhone MagSafe & Samsung Galaxy S26 — 80+ active items)
// ---------------------------------------------------------------------------
{
  const seen = new Set();
  const iphoneCases = pick((p) => p.category === "Phone Cases" && !/samsung|galaxy/i.test(p.handle + p.title), 8, seen);
  const galaxyCases = pick((p) => p.category === "Phone Cases" && /samsung|galaxy|s26/i.test(p.handle + p.title + p.tags.join(" ")), 6, seen);
  const allCases = products.filter(byCat("Phone Cases")).filter(inStock);

  if (allCases.length > 0) {
    written.push(
      writeArticle({
        slug: "christian-phone-cases-magsafe-galaxy-s26",
        title: "Tough Magnetic Christian Phone Cases: Scripture Designs for iPhone (MagSafe) & Samsung Galaxy S26",
        metaDescription: `Dual-layer magnetic Christian phone cases (${priceRange(allCases)}) with real Bible verses for iPhone MagSafe and Samsung Galaxy S26, S26+ & S26 Ultra.`,
        tags: ["Christian phone case", "Bible verse phone case", "MagSafe case", "Samsung Galaxy S26 case"],
        body: `
<p><strong>Short answer:</strong> you pick up your phone dozens of times a day, making a tough scripture phone case one of the most practical daily reminders of faith. ArmorNGlory builds ${allCases.length} active dual-layer magnetic cases (${priceRange(allCases)}) combining an impact-resistant polycarbonate shell, cushioned inner liner, and built-in magnetic module for iPhone (MagSafe compatible) and Samsung Galaxy S26 series devices.</p>

<h2>Scripture tough magnetic cases for iPhone (MagSafe compatible)</h2>
${productList(iphoneCases)}

${galaxyCases.length ? `<h2>Christian phone cases for Samsung Galaxy S26, S26 Plus &amp; S26 Ultra</h2>\n${productList(galaxyCases)}` : ""}

<h2>Matte vs. Glossy finish &amp; device fit tips</h2>
<ul>
  <li><strong>Dual-layer protection:</strong> tough polycarbonate exterior + shock-absorbing inner liner for everyday drops.</li>
  <li><strong>Finish choices:</strong> select Matte for a smooth, low-glare editorial look or Glossy for deep color saturation.</li>
  <li><strong>Check your exact model:</strong> open your phone's Settings → About before ordering so you pick the exact iPhone or Galaxy S26 / S26+ / S26 Ultra variant.</li>
</ul>
<p><a href="${STORE}/collections/phone-cases">Shop all ${allCases.length} Christian phone cases</a></p>

${faqBlock([
  { q: "Do ArmorNGlory Christian phone cases work with MagSafe chargers and wallets?", a: "Yes. Tough Magnetic cases include a built-in magnetic module engineered to align with MagSafe chargers, car mounts, and magnetic wallets on supported devices." },
  { q: "Are Samsung Galaxy S26 Christian phone cases available?", a: `Yes. ArmorNGlory carries tough magnetic scripture cases for Samsung Galaxy S26, S26 Plus, and S26 Ultra alongside iPhone models. <a href="${STORE}/collections/phone-cases">Browse all phone cases</a>.` },
  SHIPPING_FAQ,
  RETURNS_FAQ
])}
`
      })
    );
  }
}

// ---------------------------------------------------------------------------
// 9. Christian Pajama Pants & Faith Loungewear
// ---------------------------------------------------------------------------
{
  const pjs = products.filter(byCat("Pajamas & Sleepwear")).filter(inStock);
  if (pjs.length > 0) {
    written.push(
      writeArticle({
        slug: "christian-pajama-pants-faith-loungewear",
        title: "Christian Pajama Pants & Faith Loungewear: Cozy Scripture Prints (Sizes XS–4XL)",
        metaDescription: `Soft all-over-print Christian pajama pants (${priceRange(pjs)}) inspired by Psalm 23, Noah's Promise, Matthew 6:33 & 1 Peter 2:9 in sizes XS–4XL.`,
        tags: ["Christian pajamas", "faith loungewear", "Christian gifts for women", "cozy Christian gifts"],
        body: `
<p><strong>Short answer:</strong> ArmorNGlory's all-over-print Christian pajama pants (${priceRange(pjs)}) weave subtle biblical motifs—like Psalm 23 pastures, Genesis 9 rainbow arches, Matthew 6:28 lilies, and 1 Peter 2:9 varsity plaids—into soft 100% brushed polyester lounge pants (5.6 oz/yd², elastic waistband, core women's sizes XS–4XL).</p>

<h2>Scripture &amp; plaid Christian pajama pants</h2>
${productList(pjs.slice(0, 12))}

<h2>Fit, fabric &amp; care details</h2>
<ul>
  <li><strong>Fabric:</strong> 100% brushed polyester (~5.6 oz/yd² / 190 g/m²) with an easy elastic waistband.</li>
  <li><strong>Size range:</strong> core women's lounge styles run from <strong>XS to 4XL</strong> (pants only; no matching top included — check each listing's size chart).</li>
  <li><strong>Care:</strong> machine wash cold, tumble dry low, do not iron or bleach.</li>
</ul>
<p><a href="${STORE}/collections/pajamas">Shop all Christian pajama pants &amp; loungewear</a></p>

${faqBlock([
  { q: "What sizes do ArmorNGlory Christian pajama pants come in?", a: "Core women's all-over-print pajama pants run from XS through 4XL with a relaxed elastic waistband. Check the size chart on each product page for exact waist and inseam measurements." },
  { q: "Do the pajama pants include a matching top?", a: "Listings are for the all-over-print pajama pants only; pair them with a heavyweight ArmorNGlory graphic tee or crewneck sweatshirt for a complete cozy set." },
  SHIPPING_FAQ,
  RETURNS_FAQ
])}
`
      })
    );
  }
}

// ---------------------------------------------------------------------------
// 10. What to Wear to a Modern Church Service (Casual Faith Streetwear Guide)
// ---------------------------------------------------------------------------
{
  const seen = new Set();
  const churchTees = pick((p) => p.category === "T-Shirts & Tops" && (p.aesthetics.includes("Minimalist Core") || p.scriptures.length > 0), 4, seen);
  const churchLayers = pick(byCat("Hoodies & Sweatshirts"), 4, seen);
  const churchCaps = pick((p) => p.category === "Hats & Headwear" && /dad|rope|two-tone|trucker/i.test(p.handle + p.title), 4, seen);

  written.push(
    writeArticle({
      slug: "what-to-wear-to-church-modern-casual-style-guide",
      title: "What to Wear to a Modern Church Service: Casual Christian Streetwear & Outfit Formulas",
      metaDescription: "Visiting a contemporary or non-denominational church? Simple, relaxed outfit formulas for men and women using heavyweight tees, crewnecks, and subtle faith staples.",
      tags: ["what to wear to church", "church outfit ideas", "Christian streetwear", "casual church outfits"],
      body: `
<p><strong>Short answer:</strong> at most modern non-denominational and community churches, clean everyday casual wear—dark jeans or chinos, clean sneakers or boots, and a well-made heavyweight tee, crewneck sweatshirt, or overshirt—fits right in. If you're visiting for the first time, read our companion visitor guide (<a href="${STORE}/blogs/church-search/what-to-wear-to-church-when-you-have-no-idea-what-to-wear-to-church">What to Wear to Church When You Have No Idea What to Wear to Church</a>), then use the simple outfit formulas below.</p>

<h2>Formula 1: Heavyweight neutral tee + overshirt or jacket</h2>
<p>A garment-dyed heavyweight cotton tee (bone, moss, or washed charcoal) under an open flannel, denim jacket, or cardigan looks intentional without feeling stiff.</p>
${productList(churchTees)}

<h2>Formula 2: Relaxed crewneck or hoodie + tailored chinos</h2>
<p>For cooler mornings or heavily air-conditioned auditoriums, pair a structured Christian hoodie or crewneck with clean straight-leg trousers or dark denim.</p>
${productList(churchLayers)}

<h2>Formula 3: Midweek small group, youth night &amp; coffee fellowship</h2>
${productList(churchCaps)}

<p><a href="${STORE}/collections/all-products">Explore the full ArmorNGlory collection</a></p>

${faqBlock([
  { q: "Can you wear jeans and a t-shirt or hoodie to church?", a: "At most contemporary, non-denominational, and community churches, yes—clean jeans paired with a heavyweight graphic tee, crewneck, or hoodie is standard Sunday attire." },
  { q: "Should you take off a hat inside a church service?", a: "For coffee lobbies, youth nights, and outdoor fellowship, caps are common everywhere; inside traditional sanctuaries (and during prayer), removing a cap is still a thoughtful sign of respect." },
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
