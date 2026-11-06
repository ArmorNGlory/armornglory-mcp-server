/**
 * Shared Shopify Catalog Sync & Enrichment Engine
 *
 * Used both at runtime inside `src/index.ts` (for zero-touch background live catalog sync)
 * and at build/CI time via `scripts/sync-store-data.js`.
 *
 * Security standard:
 *  - Mandatory HTTPS enforcement (`isSafeAndSecureUrl`)
 *  - Domain & TLD blocklist + no raw IP/localhost
 *  - Strict 5-second timeout (`AbortSignal.timeout(5000)`)
 *  - Redirects blocked (`redirect: "error"`)
 *  - Strict `application/json` Content-Type verification
 */

export interface ProductVariant {
  id: number;
  title: string;
  price: number;
  priceFormatted: string;
  available: boolean;
  sku?: string | null;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  imageUrl?: string | null;
  checkoutUrl: string;
}

export interface ProductStory {
  summary: string;
  meaningBehindDesign?: string | null;
  whyYouWillLoveIt?: string | null;
  fitGuidance?: string | null;
  specifications?: string | null;
  careInstructions?: string | null;
  shippingInfo?: string | null;
}

export interface Product {
  id: number;
  title: string;
  handle: string;
  url: string;
  productType?: string;
  category: string;
  aesthetics: string[];
  occasions: string[];
  scriptures: string[];
  minPrice: number;
  maxPrice: number;
  priceFormatted: string;
  vendor?: string;
  tags: string[];
  publishedAt?: string;
  createdAt?: string;
  featuredImage?: string | null;
  images: string[];
  options: { name: string; position: number; values: string[] }[];
  availableColors: string[];
  availableSizes: string[];
  variants: ProductVariant[];
  story: ProductStory;
  rawBody: string;
}

export interface Collection {
  id: number;
  title: string;
  handle: string;
  url: string;
  description: string;
  productsCount: number;
  productHandles?: string[];
  imageUrl?: string | null;
  publishedAt?: string;
  updatedAt?: string;
}

export interface BrandInfo {
  brandName: string;
  legalName: string;
  storeUrl: string;
  tagline: string;
  mission: string;
  nameMeaning: {
    armor: string;
    glory: string;
  };
  designEthos: {
    philosophy: string;
    principles: string[];
  };
  sizingGuides: Record<string, string>;
}

export interface CatalogSnapshot {
  products: Product[];
  collections: Collection[];
  brandInfo: BrandInfo;
  syncedAt: string;
}

// ---------------------------------------------------------------------------
// 1. Pre-Flight Security Sanitizer & Safe JSON Fetcher
// ---------------------------------------------------------------------------

export function isSafeAndSecureUrl(urlStr: string): string | null {
  if (!urlStr || typeof urlStr !== "string") return null;
  try {
    let clean = urlStr.trim();
    if (clean.startsWith("http://")) {
      clean = clean.replace("http://", "https://");
    }
    const parsed = new URL(clean);
    if (parsed.protocol !== "https:") return null;

    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || /^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes(":")) return null;
    if (/\.(xyz|top|work|click|link|cc|to|gq|cf|tk|ml|zip|exe|apk)$/i.test(host)) return null;

    const blacklist = ["stlcatholic.org"];
    if (blacklist.some((b) => host.includes(b))) return null;

    return parsed.toString();
  } catch {
    return null;
  }
}

const ALLOWED_SYNC_HOSTS = new Set(["armornglory.com", "www.armornglory.com"]);

export async function safeJsonFetch<T = unknown>(urlStr: string): Promise<T> {
  const secureUrl = isSafeAndSecureUrl(urlStr);
  if (!secureUrl) {
    throw new Error(`Insecure or blocked URL rejected: ${urlStr}`);
  }
  const host = new URL(secureUrl).hostname.toLowerCase();
  if (!ALLOWED_SYNC_HOSTS.has(host)) {
    throw new Error(`Zero-cost host lock: outbound requests are strictly restricted to armornglory.com (rejected ${host})`);
  }

  const res = await fetch(secureUrl, {
    signal: AbortSignal.timeout(5000),
    redirect: "error",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ArmorNGloryMCPSync/1.2; +https://armornglory.com)",
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

  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// 2. HTML Cleaning & Scripture / Category / Aesthetic Enrichment
// ---------------------------------------------------------------------------

export function cleanHtml(html?: string | null): string {
  if (!html) return "";
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*[/]?>/gi, "\n")
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

function extractSection(text: string, heading: string): string | null {
  const regex = new RegExp(
    `(?:${heading})[:\\s]*([\\s\\S]*?)(?=(?:Why You Will Love It|Product Details|Specifications|Fit Guidance|Meaning Behind the Design|Shipping Information|Care Instructions|Important Notes|Sizing Information|Size Chart|$))`,
    "i"
  );
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
  { ref: "Galatians 6:9", keywords: ["galatians 6:9", "do not grow weary"] },
  { ref: "Hebrews 11:1", keywords: ["hebrews 11:1", "faith is confidence", "assurance"] },
  { ref: "Hebrews 12:1", keywords: ["hebrews 12:1", "run with endurance"] },
  { ref: "Colossians 1:17", keywords: ["colossians 1:17", "before all things"] },
  { ref: "Isaiah 6:8", keywords: ["isaiah 6:8", "send me", "here am i send me"] },
  { ref: "1 Corinthians 9:24-27", keywords: ["1 corinthians 9:24", "run your race"] },
  { ref: "1 Corinthians 10:31", keywords: ["1 corinthians 10:31", "every rep, his glory", "every rep his glory"] },
  { ref: "2 Corinthians 5:7", keywords: ["2 corinthians 5:7", "walk by faith"] },
  { ref: "Philippians 3:14", keywords: ["philippians 3:14", "press toward the mark", "press on toward the goal"] },
  { ref: "Colossians 3:23", keywords: ["colossians 3:23", "work from the heart"] },
  { ref: "Proverbs 4:23", keywords: ["proverbs 4:23", "guard the heart", "guard your heart"] },
  { ref: "Romans 12:2", keywords: ["romans 12:2"] },
  { ref: "Psalm 42:1-2", keywords: ["psalm 42:1", "psalm 42:2", "thirst for the living god"] },
  { ref: "Psalm 46:10", keywords: ["psalm 46:10", "be still and know", "be still, i'm trying", "be still i'm trying"] },
  { ref: "Psalm 62:6", keywords: ["psalm 62:6"] },
  { ref: "Psalm 90:17", keywords: ["psalm 90:17", "establish the work"] },
  { ref: "Mark 12:31", keywords: ["mark 12:31", "love your neighbor"] },
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
const REF_RE = new RegExp(`\\b(${BOOK_ALT})\\s(\\d{1,3})(?:[:\\s](\\d{1,3})(?:\\s?[-–]\\s?(\\d{1,3}))?)?\\b`, "gi");

function canonicalBook(raw: string): string {
  const lower = raw.toLowerCase().replace(/\s+/g, " ");
  return BOOKS.find((b) => b.toLowerCase() === lower) || raw;
}

function normalizeRefs(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(REF_RE)) {
    const [, book, ch, v, vEnd] = m;
    if (Number(ch) > 150) continue;
    out.push(`${canonicalBook(book)} ${ch}${v ? `:${v}${vEnd ? `-${vEnd}` : ""}` : ""}`);
  }
  return out;
}

export function extractScriptures(title: string, bodyText: string, tags: string[]): string[] {
  const combined = `${title} ${bodyText} ${tags.join(" ")}`.toLowerCase();
  const matched = new Set<string>();

  for (const item of SCRIPTURE_PATTERNS) {
    if (item.keywords.some((k) => combined.includes(k))) {
      matched.add(item.ref);
    }
  }

  for (const ref of normalizeRefs(`${tags.join(" | ")} | ${title}`)) matched.add(ref);
  for (const ref of normalizeRefs(bodyText)) if (ref.includes(":")) matched.add(ref);

  const list = Array.from(matched);
  return list.filter(
    (r) =>
      !list.some((o) => o !== r && (o.startsWith(`${r}:`) || o.startsWith(`${r}-`)))
  );
}

export function categorizeProduct(type: string | undefined, title: string, tags: string[]): string {
  const t = (type || "").toLowerCase();
  const titleLower = title.toLowerCase();
  const tagsJoined = tags.join(" ").toLowerCase();
  const has = (re: RegExp) => re.test(titleLower);

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
  if (
    t.includes("accessory") ||
    t.includes("accessories") ||
    t.includes("bag") ||
    t.includes("mug") ||
    t.includes("bottle") ||
    t.includes("tumbler") ||
    t.includes("drinkware") ||
    has(/\b(totes?|mugs?|tumblers?|water bottles?|bottles?|drinkware|bags?|blankets?|gaiters?|scarf|bandana|pickleball)\b/)
  ) {
    return "Accessories";
  }
  return "Apparel & Accessories";
}

export function determineAesthetic(title: string, bodyText: string, tags: string[]): string[] {
  const combined = `${title} ${bodyText} ${tags.join(" ")}`.toLowerCase();
  const aesthetics: string[] = [];

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
  if (combined.includes("activewear") || combined.includes("second wind") || combined.includes("athletic") || combined.includes("gym") || combined.includes("training gear")) {
    aesthetics.push("Athletic / Performance");
  }

  if (aesthetics.length === 0) {
    aesthetics.push("Modern Faith");
  }
  return aesthetics;
}

export function mapOccasions(category: string, title: string, bodyText: string, tags: string[]): string[] {
  const intent = `${title} ${tags.join(" ")}`.toLowerCase();
  const body = (bodyText || "").toLowerCase();
  const occasions = ["Everyday Wear"];
  const any = (text: string, words: string[]) => words.some((w) => new RegExp(`\\b${w}\\b`, "i").test(text));

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
  if (any(`${intent} ${body}`, ["conquerors", "courage", "courageous", "overcome", "overcomer", "second wind", "endure", "endurance", "strength", "fear not", "anxiety"])) {
    occasions.push("Encouragement & Overcoming");
  }

  return occasions;
}

// ---------------------------------------------------------------------------
// 3. Raw Shopify Payload Interfaces & Enrichment
// ---------------------------------------------------------------------------

interface RawShopifyVariant {
  id: number;
  title: string;
  price: string;
  available?: boolean;
  sku?: string | null;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  featured_image?: { src?: string | null } | null;
}

interface RawShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html?: string | null;
  product_type?: string;
  vendor?: string;
  tags?: string[] | string;
  published_at?: string | null;
  created_at?: string;
  images?: { src: string }[];
  options?: { name: string; position: number; values: string[] }[];
  variants?: RawShopifyVariant[];
}

interface RawShopifyCollection {
  id: number;
  title: string;
  handle: string;
  description?: string | null;
  products_count?: number;
  image?: { src?: string | null } | null;
  published_at?: string;
  updated_at?: string;
}

export function enrichRawProduct(p: RawShopifyProduct, storeUrl = "https://armornglory.com"): Product {
  const tags = Array.isArray(p.tags)
    ? p.tags
    : typeof p.tags === "string"
      ? p.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];
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

  const category = categorizeProduct(p.product_type, p.title, tags);
  const scriptures = extractScriptures(p.title, bodyClean, tags);
  const aesthetics = determineAesthetic(p.title, bodyClean, tags);
  const occasions = mapOccasions(category, p.title, bodyClean, tags);

  const variants: ProductVariant[] = (p.variants || []).map((v) => ({
    id: v.id,
    title: v.title,
    price: parseFloat(v.price),
    priceFormatted: `$${parseFloat(v.price).toFixed(2)}`,
    available: Boolean(v.available),
    sku: v.sku || null,
    option1: v.option1 || null,
    option2: v.option2 || null,
    option3: v.option3 || null,
    imageUrl: v.featured_image ? v.featured_image.src || null : null,
    checkoutUrl: `${storeUrl}/cart/${v.id}:1?utm_source=ai_agent&utm_medium=mcp&utm_campaign=store_recommendation`
  }));

  const colors = Array.from(new Set(variants.map((v) => v.option1 || v.option2).filter((v): v is string => Boolean(v))));
  const sizes = Array.from(new Set(variants.map((v) => v.option2 || v.option1).filter((v): v is string => Boolean(v))));

  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    url: `${storeUrl}/products/${p.handle}`,
    productType: p.product_type,
    category,
    aesthetics,
    occasions,
    scriptures,
    minPrice,
    maxPrice,
    priceFormatted,
    vendor: p.vendor,
    tags,
    publishedAt: p.published_at || undefined,
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
}

export function buildBrandInfo(storeUrl = "https://armornglory.com"): BrandInfo {
  return {
    brandName: "ArmorNGlory",
    legalName: "Armor & Glory",
    storeUrl,
    tagline: "Strengthened for the Journey Ahead",
    mission:
      "ArmorNGlory exists to create faith based apparel for people who love Jesus and modern life. We design Christian streetwear and creative content that helps people carry their faith into everyday spaces with confidence, style, and authenticity. We believe what you wear can be a conversation starter, a reminder of who you belong to, and a quiet expression of faith in the middle of real life.",
    nameMeaning: {
      armor: "Spiritual strength, conviction, and standing firm in faith (Ephesians 6:10-18 Armor of God).",
      glory: "Points to God, His goodness, and the purpose behind everything we create (Matthew 5:14-16, 1 Corinthians 10:31)."
    },
    designEthos: {
      philosophy: "Anti-Beige / Anti-Cheesy Christian Streetwear",
      principles: [
        "Modern and Intentional: High aesthetic standards, typography-led, distressed textures, contemporary streetwear silhouettes.",
        "Subtle Strength: Bold faith without cheesy cliches, loud slogans, or dated church graphics.",
        "Everyday Wearability: Premium heavyweight cotton (e.g. Comfort Colors 1717 blanks), structured 5-panel trucker caps, insulated stainless steel drinkware, and dual-layer magnetic phone cases.",
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
}

async function fetchCollectionHandles(storeUrl: string, collectionHandle: string, activeHandles: Set<string>): Promise<string[] | null> {
  try {
    const handles: string[] = [];
    for (let page = 1; page <= 4; page++) {
      const data = await safeJsonFetch<{ products?: { handle?: string; published_at?: string | null }[] }>(
        `${storeUrl}/collections/${encodeURIComponent(collectionHandle)}/products.json?limit=250&page=${page}`
      );
      const batch = data.products || [];
      if (batch.length === 0) break;
      for (const item of batch) {
        if (item.handle && item.published_at && activeHandles.has(item.handle)) {
          handles.push(item.handle);
        }
      }
      if (batch.length < 250) break;
    }
    return Array.from(new Set(handles));
  } catch {
    return null;
  }
}

export interface FetchLiveCatalogOptions {
  storeUrl?: string;
  includeCollectionMemberships?: boolean;
  onProgress?: (msg: string) => void;
}

export async function fetchLiveCatalog(options: FetchLiveCatalogOptions = {}): Promise<CatalogSnapshot> {
  const storeUrl = (options.storeUrl || "https://armornglory.com").replace(/\/+$/, "");
  const includeCollectionMemberships = options.includeCollectionMemberships !== false;
  const log = options.onProgress || (() => {});

  log(`[Sync] Fetching live products from ${storeUrl}...`);
  const rawProducts: RawShopifyProduct[] = [];
  for (let page = 1; page <= 25; page++) {
    const pData = await safeJsonFetch<{ products?: RawShopifyProduct[] }>(
      `${storeUrl}/products.json?limit=250&page=${page}`
    );
    const batch = pData.products || [];
    if (batch.length === 0) break;
    for (const p of batch) {
      // Strictly exclude Draft / unpublished items so MCP never serves 404 URLs
      if (p.handle && p.published_at) {
        rawProducts.push(p);
      }
    }
    log(`[Sync] Page ${page}: fetched ${batch.length} products (active total: ${rawProducts.length})`);
    if (batch.length < 250) break;
  }

  if (rawProducts.length === 0) {
    throw new Error("Live Shopify catalog returned 0 active products; refusing to overwrite catalog.");
  }

  const enrichedProducts = rawProducts.map((p) => enrichRawProduct(p, storeUrl));
  const activeHandles = new Set(enrichedProducts.map((p) => p.handle));

  log(`[Sync] Fetching live collections from ${storeUrl}...`);
  const cData = await safeJsonFetch<{ collections?: RawShopifyCollection[] }>(`${storeUrl}/collections.json`);
  const rawCollections = cData.collections || [];

  const enrichedCollections: Collection[] = [];

  if (includeCollectionMemberships) {
    // Bounded concurrency = 4 to stay polite and fast (~1s total)
    const concurrency = 4;
    const results = new Array<string[] | null>(rawCollections.length).fill(null);
    let cursor = 0;
    const workers = Array.from({ length: Math.min(concurrency, rawCollections.length) }, async () => {
      while (cursor < rawCollections.length) {
        const idx = cursor++;
        results[idx] = await fetchCollectionHandles(storeUrl, rawCollections[idx].handle, activeHandles);
      }
    });
    await Promise.all(workers);

    for (let i = 0; i < rawCollections.length; i++) {
      const c = rawCollections[i];
      const memberHandles = results[i];
      // If membership check succeeded and has 0 published products, omit empty collection so agents never link to empty pages
      if (memberHandles !== null && memberHandles.length === 0) {
        continue;
      }
      if (memberHandles === null && (c.products_count || 0) === 0) {
        continue;
      }
      enrichedCollections.push({
        id: c.id,
        title: c.title,
        handle: c.handle,
        url: `${storeUrl}/collections/${c.handle}`,
        description: cleanHtml(c.description || ""),
        productsCount: memberHandles !== null ? memberHandles.length : c.products_count || 0,
        ...(memberHandles !== null ? { productHandles: memberHandles } : {}),
        imageUrl: c.image ? c.image.src || null : null,
        publishedAt: c.published_at,
        updatedAt: c.updated_at
      });
    }
  } else {
    for (const c of rawCollections) {
      if ((c.products_count || 0) === 0) continue;
      enrichedCollections.push({
        id: c.id,
        title: c.title,
        handle: c.handle,
        url: `${storeUrl}/collections/${c.handle}`,
        description: cleanHtml(c.description || ""),
        productsCount: c.products_count || 0,
        imageUrl: c.image ? c.image.src || null : null,
        publishedAt: c.published_at,
        updatedAt: c.updated_at
      });
    }
  }

  return {
    products: enrichedProducts,
    collections: enrichedCollections,
    brandInfo: buildBrandInfo(storeUrl),
    syncedAt: new Date().toISOString()
  };
}
