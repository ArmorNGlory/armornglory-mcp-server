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

function extractScriptures(title, bodyText, tags) {
  const combined = `${title} ${bodyText} ${tags.join(" ")}`.toLowerCase();
  const matched = new Set();

  for (const item of SCRIPTURE_PATTERNS) {
    if (item.keywords.some((k) => combined.includes(k))) {
      matched.add(item.ref);
    }
  }

  // Also check tag regex for references like "ROMANS 8:37" or "EXODUS 3:5"
  for (const tag of tags) {
    const bookRegex = /^(GENESIS|EXODUS|LEVITICUS|NUMBERS|DEUTERONOMY|JOSHUA|JUDGES|RUTH|1 SAMUEL|2 SAMUEL|1 KINGS|2 KINGS|PSALM|PSALMS|PROVERBS|ECCLESIASTES|ISAIAH|JEREMIAH|LAMENTATIONS|EZEKIEL|DANIEL|MATTHEW|MARK|LUKE|JOHN|ACTS|ROMANS|1 CORINTHIANS|2 CORINTHIANS|GALATIANS|EPHESIANS|PHILIPPIANS|COLOSSIANS|1 THESSALONIANS|2 THESSALONIANS|1 TIMOTHY|2 TIMOTHY|TITUS|HEBREWS|JAMES|1 PETER|2 PETER|1 JOHN|2 JOHN|3 JOHN|JUDE|REVELATION)\s+\d+[:\d\-]*/i;
    if (bookRegex.test(tag)) {
      matched.add(tag.toUpperCase());
    }
  }

  return Array.from(matched);
}

function categorizeProduct(type, title, tags) {
  const t = (type || "").toLowerCase();
  const titleLower = title.toLowerCase();
  const tagsJoined = tags.join(" ").toLowerCase();

  if (t.includes("hat") || titleLower.includes("hat") || titleLower.includes("cap") || titleLower.includes("beanie") || tagsJoined.includes("trucker")) {
    return "Hats & Headwear";
  }
  if (t.includes("shoe") || titleLower.includes("clog") || titleLower.includes("shoe") || tagsJoined.includes("footwear") || tagsJoined.includes("eva clogs")) {
    return "Footwear & Clogs";
  }
  if (t.includes("hoodie") || t.includes("sweatshirt") || titleLower.includes("hoodie") || titleLower.includes("sweatshirt") || titleLower.includes("crewneck")) {
    return "Hoodies & Sweatshirts";
  }
  if (t.includes("t-shirt") || t.includes("tank") || titleLower.includes("tee") || titleLower.includes("shirt") || titleLower.includes("tank")) {
    return "T-Shirts & Tops";
  }
  if (t.includes("phone case") || titleLower.includes("phone case") || tagsJoined.includes("phone case")) {
    return "Phone Cases";
  }
  if (t.includes("activewear") || tagsJoined.includes("activewear") || titleLower.includes("training") || titleLower.includes("gym")) {
    return "Activewear & Training";
  }
  if (t.includes("canvas") || t.includes("poster") || t.includes("home decor") || titleLower.includes("wall art") || titleLower.includes("poster")) {
    return "Wall Art & Decor";
  }
  if (t.includes("kids") || titleLower.includes("youth") || titleLower.includes("kids")) {
    return "Kids & Youth";
  }
  if (t.includes("pajama") || titleLower.includes("pajama")) {
    return "Pajamas & Sleepwear";
  }
  if (t.includes("bag") || t.includes("mug") || titleLower.includes("tote") || titleLower.includes("mug")) {
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
  const combined = `${title} ${bodyText} ${tags.join(" ")}`.toLowerCase();
  const occasions = ["Everyday Wear", "Church & Fellowship"];

  if (combined.includes("gift") || combined.includes("easter") || combined.includes("christmas") || combined.includes("holiday")) {
    occasions.push("Holiday & Easter Gift");
  }
  if (combined.includes("america") || combined.includes("fourth of july") || combined.includes("memorial day") || combined.includes("veterans day")) {
    occasions.push("Patriotic / 4th of July");
  }
  if (combined.includes("activewear") || combined.includes("training") || combined.includes("gym") || combined.includes("lifting") || combined.includes("running")) {
    occasions.push("Workout & Fitness");
  }
  if (combined.includes("baptism") || combined.includes("confirmation") || combined.includes("resurrection") || combined.includes("33 ad")) {
    occasions.push("Baptism & Milestones");
  }
  if (combined.includes("father") || combined.includes("dad") || combined.includes("men")) {
    occasions.push("Father's Day & Gifts for Men");
  }
  if (combined.includes("mother") || combined.includes("mom") || combined.includes("women")) {
    occasions.push("Mother's Day & Gifts for Women");
  }
  if (combined.includes("conquerors") || combined.includes("courage") || combined.includes("strong") || combined.includes("second wind")) {
    occasions.push("Encouragement & Overcoming");
  }

  return occasions;
}

async function sync() {
  console.log("[Sync] Fetching live products from armornglory.com...");
  let page = 1;
  const rawProducts = [];

  while (true) {
    const pUrl = `https://armornglory.com/products.json?limit=250&page=${page}`;
    const pRes = await fetch(pUrl);
    if (!pRes.ok) {
      throw new Error(`Failed to fetch products page ${page}: ${pRes.statusText}`);
    }
    const pData = await pRes.json();
    if (!pData.products || pData.products.length === 0) break;
    rawProducts.push(...pData.products);
    console.log(`[Sync] Page ${page}: fetched ${pData.products.length} products (total so far: ${rawProducts.length})`);
    if (pData.products.length < 250) break;
    page++;
  }

  console.log(`[Sync] Successfully retrieved ${rawProducts.length} total products.`);

  console.log("[Sync] Fetching live collections...");
  const cRes = await fetch("https://armornglory.com/collections.json");
  const cData = await cRes.json();
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
      checkoutUrl: `https://armornglory.com/cart/${v.id}:1`
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
