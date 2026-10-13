import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");
const dataDir = path.join(rootDir, "data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export function isSafeAndSecureUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return null;
  try {
    let clean = urlStr.trim();
    if (clean.startsWith('http://')) {
      clean = clean.replace('http://', 'https://');
    }
    const parsed = new URL(clean);
    if (parsed.protocol !== 'https:') return null;

    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || /^(\d{1,3}\.){3}\d{1,3}$/.test(host)) return null;
    if (/\.(xyz|top|work|click|link|cc|to|gq|cf|tk|ml|zip|exe|apk)$/i.test(host)) return null;

    const blacklist = ['stlcatholic.org'];
    if (blacklist.some(b => host.includes(b))) return null;

    return parsed.toString();
  } catch {
    return null;
  }
}

async function safeJsonFetch(urlStr) {
  const secureUrl = isSafeAndSecureUrl(urlStr);
  if (!secureUrl) {
    throw new Error(`Insecure or blocked URL rejected: ${urlStr}`);
  }

  const res = await fetch(secureUrl, {
    signal: AbortSignal.timeout(5000),
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ArmorNGloryMCPSync/1.0; +https://armornglory.com)",
      "Accept": "application/json"
    }
  });

  if (!res.ok) {
    throw new Error(`HTTP error ${res.status} (${res.statusText}) fetching ${secureUrl}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(`Unsafe Content-Type: expected application/json, got ${contentType}`);
  }

  return await res.json();
}

function cleanHtml(html) {
  if (!html) return "";
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();
}

function extractSection(text, heading) {
  const regex = new RegExp(`(?:${heading})[:\\s]*([\\s\\S]*?)(?=(?:Why You Will Love It|Product Details|Specifications|Fit Guidance|Meaning Behind the Design|Shipping Information|Care Instructions|Important Notes|Sizing Information|Size Chart|$))`, "i");
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

const SCRIPTURE_PATTERNS = [
  { ref: "Romans 8:37", keywords: ["romans 8:37", "more than conquerors"] },
  { ref: "Exodus 3:5", keywords: ["exodus 3:5", "holy ground", "burning bush"] },
  { ref: "Matthew 6:33", keywords: ["matthew 6:33", "kingdom first", "seek first the kingdom"] },
  { ref: "Ephesians 6:10-18", keywords: ["ephesians 6", "armor of god", "whole armor", "shield of faith", "sword of the spirit", "breastplate", "helmet of salvation", "belt of truth"] },
  { ref: "Philippians 4:13", keywords: ["philippians 4:13", "i can do all things", "through christ who strengthens"] },
  { ref: "Isaiah 40:31", keywords: ["isaiah 40:31", "soar on wings", "eagles", "renew their strength", "second wind"] },
  { ref: "Psalm 23", keywords: ["psalm 23", "the lord is my shepherd", "shadow of death"] },
  { ref: "Joshua 1:9", keywords: ["joshua 1:9", "strong and courageous", "do not be afraid"] },
  { ref: "Proverbs 3:5-6", keywords: ["proverbs 3:5", "trust in the lord"] },
  { ref: "1 Corinthians 16:13", keywords: ["1 corinthians 16:13", "be on your guard", "stand firm in the faith", "be courageous", "be strong"] },
  { ref: "John 3:16", keywords: ["john 3:16", "for god so loved the world"] },
  { ref: "Matthew 5:14-16", keywords: ["matthew 5:14", "light of the world", "city on a hill"] },
  { ref: "2 Timothy 1:7", keywords: ["2 timothy 1:7", "not a spirit of fear", "power and love"] },
  { ref: "Galatians 2:20", keywords: ["galatians 2:20", "crucified with christ"] },
  { ref: "Hebrews 11:1", keywords: ["hebrews 11:1", "faith is confidence", "assurance"] },
  { ref: "Isaiah 6:8", keywords: ["isaiah 6:8", "send me", "here am i send me"] },
  { ref: "Est 33 AD", keywords: ["33 ad", "est 33 ad", "resurrection"] }
];

const BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings",
  "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Psalm", "Proverbs", "Ecclesiastes", "Song of Solomon",
  "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
  "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians",
  "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus",
  "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"
];
const BOOK_ALT = BOOKS.map((b) => b.replace(/ /g, "\\s")).join("|");
// "Romans 8:37", "ROMANS 8 37", "1 Peter 5:7", "Ephesians 6:10-18", "Ephesians 6"
const REF_RE = new RegExp(`\\b(${BOOK_ALT})\\s(\\d{1,3})(?:[:\\s](\\d{1,3})(?:\\s?[-–]\\s?(\\d{1,3}))?)?\\b`, "gi");

function canonicalBook(raw) {
  const lower = raw.toLowerCase().replace(/\s+/g, " ");
  return BOOKS.find((b) => b.toLowerCase() === lower) || raw;
}

function normalizeRefs(text) {
  const out = [];
  for (const m of text.matchAll(REF_RE)) {
    const [, book, ch, v, vEnd] = m;
    if (Number(ch) > 150) continue; // e.g. "JEREMIAH 2911" — ambiguous, skip rather than guess
    out.push(`${canonicalBook(book)} ${ch}${v ? `:${v}${vEnd ? `-${vEnd}` : ""}` : ""}`);
  }
  return out;
}

function extractScriptures(title, bodyText, tags) {
  const combined = `${title} ${bodyText} ${tags.join(" ")}`.toLowerCase();
  const matched = new Set();

  for (const item of SCRIPTURE_PATTERNS) {
    if (item.keywords.some((k) => combined.includes(k))) {
      matched.add(item.ref);
    }
  }

  // Explicit references in tags and the title (normalized), e.g. "ROMANS 8 37" -> "Romans 8:37"
  for (const ref of normalizeRefs(`${tags.join(" | ")} | ${title}`)) matched.add(ref);
  // Explicit chapter:verse references in the description (only with a verse number, to avoid noise)
  for (const ref of normalizeRefs(bodyText)) if (ref.includes(":")) matched.add(ref);

  // Drop bare-chapter refs when a more specific ref for the same chapter exists ("Ephesians 6" vs "Ephesians 6:10-18")
  const list = Array.from(matched);
  return list.filter((r) => r.includes(":") || r === "Psalm 23" || r === "Est 33 AD" || !list.some((o) => o !== r && o.startsWith(`${r}:`)));
}

function categorizeProduct(type, title, tags) {
  const t = (type || "").toLowerCase();
  const titleLower = title.toLowerCase();
  const tagsJoined = tags.join(" ").toLowerCase();
  const has = (re) => re.test(titleLower);

  if (t.includes("hat") || has(/\b(hats?|caps?|beanies?|snapbacks?)\b/) || tagsJoined.includes("trucker")) {
    return "Hats & Headwear";
  }
  if (t.includes("shoe") || has(/\b(clogs?|shoes?|slip-?ons?)\b/) || tagsJoined.includes("footwear") || tagsJoined.includes("eva clogs")) {
    return "Footwear & Clogs";
  }
  if (t.includes("hoodie") || t.includes("sweatshirt") || has(/\b(hoodies?|sweatshirts?|crewnecks?)\b/)) {
    return "Hoodies & Sweatshirts";
  }
  if (t.includes("pajama") || has(/\bpajamas?\b/)) {
    return "Pajamas & Sleepwear";
  }
  if (t.includes("t-shirt") || t.includes("tank") || has(/\b(tees?|t-shirts?|shirts?|tanks?)\b/)) {
    return "T-Shirts & Tops";
  }
  if (t.includes("phone case") || has(/\bphone case\b/) || tagsJoined.includes("phone case")) {
    return "Phone Cases";
  }
  if (t.includes("activewear") || tagsJoined.includes("activewear") || has(/\b(training|gym)\b/)) {
    return "Activewear & Training";
  }
  if (t.includes("canvas") || t.includes("poster") || t.includes("home decor") || has(/\b(wall art|posters?|canvas)\b/)) {
    return "Wall Art & Decor";
  }
  if (t.includes("kids") || has(/\b(youth|kids)\b/)) {
    return "Kids & Youth";
  }
  if (t.includes("bag") || t.includes("mug") || has(/\b(totes?|mugs?|bags?|blankets?)\b/)) {
    return "Accessories";
  }
  return "Apparel & Accessories";
}

function determineAesthetic(title, bodyText, tags) {
  const combined = `${title} ${bodyText} ${tags.join(" ")}`.toLowerCase();
  const aesthetics = [];

  if (combined.includes("streetwear") || combined.includes("trucker") || combined.includes("dtf")) {
    aesthetics.push("Streetwear");
  }
  if (combined.includes("minimalist") || combined.includes("heavyweight essentials") || combined.includes("clean")) {
    aesthetics.push("Minimalist Core");
  }
  if (combined.includes("kingdom marks") || combined.includes("sacred symbols") || combined.includes("cross") || combined.includes("holy ground")) {
    aesthetics.push("Sacred Symbols");
  }
  if (combined.includes("gothic") || combined.includes("saints and shadows") || combined.includes("black gold")) {
    aesthetics.push("Gothic Faith");
  }
  if (combined.includes("america") || combined.includes("americana") || combined.includes("250th") || combined.includes("fourth of july")) {
    aesthetics.push("Vintage Americana");
  }
  if (combined.includes("activewear") || combined.includes("second wind") || combined.includes("athletic") || combined.includes("gym")) {
    aesthetics.push("Athletic / Performance");
  }

  if (aesthetics.length === 0) {
    aesthetics.push("Modern Faith");
  }
  return aesthetics;
}

function mapOccasions(category, title, bodyText, tags) {
  // Title + tags carry intent; long descriptions contain boilerplate ("great gift", "men and women")
  // that previously tagged nearly every product with every occasion.
  const intent = `${title} ${tags.join(" ")}`.toLowerCase();
  const body = (bodyText || "").toLowerCase();
  const occasions = ["Everyday Wear"];
  const any = (text, words) => words.some((w) => new RegExp(`\\b${w}\\b`, "i").test(text));

  if (any(intent, ["church", "worship", "sunday", "fellowship"]) || category === "T-Shirts & Tops" || category === "Hoodies & Sweatshirts" || category === "Hats & Headwear") {
    occasions.push("Church & Fellowship");
  }
  if (any(intent, ["gift", "gifts", "easter", "christmas", "holiday"])) {
    occasions.push("Holiday & Easter Gift");
  }
  if (any(intent, ["america", "american", "americana", "usa", "patriotic", "fourth of july", "4th of july", "1776", "250th"])) {
    occasions.push("Patriotic / 4th of July");
  }
  if (any(intent, ["activewear", "training", "gym", "lifting", "running", "workout", "athletic", "pump cover", "bodybuilding"])) {
    occasions.push("Workout & Fitness");
  }
  if (any(`${intent} ${body}`, ["baptism", "baptized", "confirmation", "new believer", "born again", "made new"])) {
    occasions.push("Baptism & Milestones");
  }
  if (any(intent, ["father", "fathers", "dad", "dads", "men", "mens", "him", "husband", "unisex"]) || category === "Hats & Headwear") {
    occasions.push("Father's Day & Gifts for Men");
  }
  if (any(intent, ["mother", "mothers", "mom", "moms", "women", "womens", "her", "wife", "ladies", "unisex"])) {
    occasions.push("Mother's Day & Gifts for Women");
  }
  if (any(`${intent} ${body}`, ["conquerors", "courage", "courageous", "overcome", "overcomer", "second wind", "endure", "strength", "fear not", "anxiety"])) {
    occasions.push("Encouragement & Overcoming");
  }

  return occasions;
}

async function sync() {
  console.log("[Sync] Fetching live products from armornglory.com...");
  let page = 1;
  const rawProducts = [];

  while (true) {
    const pUrl = `https://armornglory.com/products.json?limit=50&page=${page}`;
    const pData = await safeJsonFetch(pUrl);
    if (!pData.products || pData.products.length === 0) break;
    rawProducts.push(...pData.products);
    console.log(`[Sync] Page ${page}: fetched ${pData.products.length} products (total so far: ${rawProducts.length})`);
    if (pData.products.length < 50) break;
    page++;
  }

  console.log(`[Sync] Successfully retrieved ${rawProducts.length} total products.`);

  console.log("[Sync] Fetching live collections...");
  const cData = await safeJsonFetch("https://armornglory.com/collections.json");
  const rawCollections = cData.collections || [];
  console.log(`[Sync] Successfully retrieved ${rawCollections.length} collections.`);

  // Enrich Products
  const enrichedProducts = rawProducts.map((p) => {
    const bodyClean = cleanHtml(p.body_html || "");
    const prices = (p.variants || []).map((v) => parseFloat(v.price)).filter((n) => !isNaN(n));
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const priceFormatted = minPrice === maxPrice ? `$${minPrice.toFixed(2)}` : `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;

    const whyYouWillLoveIt = extractSection(bodyClean, "Why You Will Love It");
    const meaningBehindDesign = extractSection(bodyClean, "Meaning Behind the Design");
    const fitGuidance = extractSection(bodyClean, "Fit Guidance") || extractSection(bodyClean, "Sizing Information");
    const specifications = extractSection(bodyClean, "Specifications") || extractSection(bodyClean, "Product Details");
    const careInstructions = extractSection(bodyClean, "Care Instructions");
    const shippingInfo = extractSection(bodyClean, "Shipping Information");

    const category = categorizeProduct(p.product_type, p.title, p.tags);
    const scriptures = extractScriptures(p.title, bodyClean, p.tags);
    const aesthetics = determineAesthetic(p.title, bodyClean, p.tags);
    const occasions = mapOccasions(category, p.title, bodyClean, p.tags);

    const variants = (p.variants || []).map((v) => ({
      id: v.id,
      title: v.title,
      price: parseFloat(v.price),
      priceFormatted: `$${parseFloat(v.price).toFixed(2)}`,
      available: Boolean(v.available),
      sku: v.sku || null,
      option1: v.option1 || null,
      option2: v.option2 || null,
      option3: v.option3 || null,
      imageUrl: v.featured_image ? v.featured_image.src : null,
      checkoutUrl: `https://armornglory.com/cart/${v.id}:1?utm_source=ai_agent&utm_medium=mcp&utm_campaign=store_recommendation`
    }));

    const colors = Array.from(new Set(variants.map((v) => v.option1 || v.option2).filter(Boolean)));
    const sizes = Array.from(new Set(variants.map((v) => v.option2 || v.option1).filter(Boolean)));

    return {
      id: p.id,
      title: p.title,
      handle: p.handle,
      url: `https://armornglory.com/products/${p.handle}`,
      productType: p.product_type,
      category,
      aesthetics,
      occasions,
      scriptures,
      minPrice,
      maxPrice,
      priceFormatted,
      vendor: p.vendor,
      tags: p.tags || [],
      publishedAt: p.published_at,
      createdAt: p.created_at,
      featuredImage: p.images && p.images[0] ? p.images[0].src : null,
      images: (p.images || []).map((img) => img.src),
      options: p.options || [],
      availableColors: colors,
      availableSizes: sizes,
      variants,
      story: {
        summary: bodyClean.split("\n\n")[0] || "",
        meaningBehindDesign,
        whyYouWillLoveIt,
        fitGuidance,
        specifications,
        careInstructions,
        shippingInfo
      },
      rawBody: bodyClean
    };
  });

  // Enrich Collections
  const enrichedCollections = rawCollections.map((c) => ({
    id: c.id,
    title: c.title,
    handle: c.handle,
    url: `https://armornglory.com/collections/${c.handle}`,
    description: cleanHtml(c.description || ""),
    productsCount: c.products_count || 0,
    imageUrl: c.image ? c.image.src : null,
    publishedAt: c.published_at,
    updatedAt: c.updated_at
  }));

  // Brand Story & Guidelines
  const brandInfo = {
    brandName: "ArmorNGlory",
    legalName: "Armor & Glory",
    storeUrl: "https://armornglory.com",
    tagline: "Strengthened for the Journey Ahead",
    mission: "ArmorNGlory exists to create faith based apparel for people who love Jesus and modern life. We design Christian streetwear and creative content that helps people carry their faith into everyday spaces with confidence, style, and authenticity. We believe what you wear can be a conversation starter, a reminder of who you belong to, and a quiet expression of faith in the middle of real life.",
    nameMeaning: {
      armor: "Spiritual strength, conviction, and standing firm in faith (Ephesians 6:10-18 Armor of God).",
      glory: "Points to God, His goodness, and the purpose behind everything we create (Matthew 5:14-16, 1 Corinthians 10:31)."
    },
    designEthos: {
      philosophy: "Anti-Beige / Anti-Cheesy Christian Streetwear",
      principles: [
        "Modern and Intentional: High aesthetic standards, typography-led, distressed textures, contemporary streetwear silhouettes.",
        "Subtle Strength: Bold faith without cheesy cliches, loud slogans, or dated church graphics.",
        "Everyday Wearability: Premium heavyweight cotton (e.g. Comfort Colors 1717 blanks), structured 5-panel trucker caps, and ergonomic EVA foam clogs.",
        "Scripture in Context: Every artwork has an intentional theological root (Romans 8:37, Exodus 3:5, Matthew 6:33, Isaiah 40:31)."
      ]
    },
    sizingGuides: {
      truckerCaps: "Structured 5-panel mesh back with adjustable snap closure (One Size Fits Most, ~21.5-23.5 in circumference).",
      evaFoamClogs: "Roomy comfort fit with flexible anti-slip sole and heel strap. Refer to clog millimeter / inch charts. If between sizes or prefer a snug fit, size down.",
      heavyweightTees: "Unisex relaxed / streetwear fit. 100% ring-spun cotton. True to size for standard fit; size up for oversized streetwear look.",
      hoodies: "Comfort meets conviction. Relaxed unisex fit with fleece lining and kangaroo pocket."
    }
  };

  // Write files
  fs.writeFileSync(path.join(dataDir, "products.json"), JSON.stringify(enrichedProducts, null, 2), "utf-8");
  fs.writeFileSync(path.join(dataDir, "collections.json"), JSON.stringify(enrichedCollections, null, 2), "utf-8");
  fs.writeFileSync(path.join(dataDir, "brand_info.json"), JSON.stringify(brandInfo, null, 2), "utf-8");

  console.log(`[Sync] Saved ${enrichedProducts.length} enriched products to data/products.json`);
  console.log(`[Sync] Saved ${enrichedCollections.length} collections to data/collections.json`);
  console.log(`[Sync] Saved brand guidelines to data/brand_info.json`);
  console.log("[Sync] Data sync complete!");
}

sync().catch((err) => {
  console.error("[Sync] Error during sync:", err);
  process.exit(1);
});
