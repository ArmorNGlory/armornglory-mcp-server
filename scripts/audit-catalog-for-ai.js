#!/usr/bin/env node
/**
 * ArmorNGlory Catalog AI-Readiness Audit
 *
 * Reads the PUBLIC Shopify catalog (https://armornglory.com/products.json) and flags product data
 * that weakens matching in AI shopping surfaces (ChatGPT, Gemini / Google AI Mode, Copilot, Perplexity),
 * which mostly rank on title, product type, description, variants (color/size), and images.
 *
 * Outputs:
 *   reports/catalog-ai-audit.csv   one row per product with issues + a suggested AI-friendly title
 *   reports/catalog-ai-audit.md    summary with counts and the worst offenders
 *
 * Free / local: no API keys, no paid endpoints. HTTPS-only with a 5s timeout and content-type check.
 *
 * Usage: npm run audit:catalog
 */

import { mkdirSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const reportsDir = join(rootDir, "reports");
const STORE = "https://armornglory.com";

// ---------------------------------------------------------------------------
// Safe network fetching (global security standard)
// ---------------------------------------------------------------------------
export function isSafeAndSecureUrl(urlStr) {
  if (!urlStr || typeof urlStr !== "string") return null;
  try {
    let clean = urlStr.trim();
    if (clean.startsWith("http://")) clean = clean.replace("http://", "https://");
    const parsed = new URL(clean);
    if (parsed.protocol !== "https:") return null;
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || /^(\d{1,3}\.){3}\d{1,3}$/.test(host)) return null;
    if (/\.(xyz|top|work|click|link|cc|to|gq|cf|tk|ml|zip|exe|apk)$/i.test(host)) return null;
    const blacklist = ["stlcatholic.org"];
    if (blacklist.some((b) => host.includes(b))) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

async function safeJsonFetch(url) {
  const secure = isSafeAndSecureUrl(url);
  if (!secure) throw new Error(`Blocked unsafe URL: ${url}`);
  const res = await fetch(secure, {
    signal: AbortSignal.timeout(5000),
    redirect: "error",
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ArmorNGloryCatalogAudit/1.0; +https://armornglory.com)" }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${secure}`);
  const type = res.headers.get("content-type") || "";
  if (!type.includes("application/json")) throw new Error(`Unexpected content-type "${type}" from ${secure}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Heuristics
// ---------------------------------------------------------------------------
const BIBLE_BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "Samuel", "Kings", "Chronicles",
  "Ezra", "Nehemiah", "Esther", "Job", "Psalms?", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah",
  "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
  "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "Corinthians",
  "Galatians", "Ephesians", "Philippians", "Colossians", "Thessalonians", "Timothy", "Titus", "Philemon", "Hebrews",
  "James", "Peter", "Jude", "Revelation"
];
const VERSE_RE = new RegExp(`\\b(?:[1-3]\\s)?(?:${BIBLE_BOOKS.join("|")})\\s\\d{1,3}:\\d{1,3}(?:\\s?[–-]\\s?\\d{1,3})?`, "i");
const HANDLE_VERSE_RE = new RegExp(`(?:^|-)((?:[1-3]-)?(?:${BIBLE_BOOKS.map((b) => b.toLowerCase().replace(/\s/g, "-").replace("?", "")).join("|")})s?)-(\\d{1,3})-(\\d{1,3})(?:-(\\d{1,3}))?(?:-|$)`, "i");

// Ordered: first match wins. [regex tested against handle + product_type + title, garment noun for the title]
const GARMENT_RULES = [
  [/beanie/i, "Christian Beanie"],
  [/bucket-?hat/i, "Christian Bucket Hat"],
  [/dad-?cap|dad hat/i, "Christian Dad Hat"],
  [/trucker/i, "Christian Trucker Hat"],
  [/two-tone-cap|rope-cap|ponytail|baseball|snapback|\bcap\b/i, "Christian Baseball Cap"],
  [/clog|slip-?on|foam-?shoe|\bshoes\b/i, "Christian EVA Foam Clogs"],
  [/hoodie/i, "Christian Hoodie"],
  [/crewneck|sweatshirt/i, "Christian Crewneck Sweatshirt"],
  [/tank/i, "Christian Tank Top"],
  [/pajama/i, "Christian Pajama Pants"],
  [/jogger|sweatpant/i, "Christian Joggers"],
  [/t-?shirt|\btee\b/i, "Christian T-Shirt"],
  [/phone|iphone|magsafe/i, "Christian Phone Case"],
  [/blanket/i, "Christian Throw Blanket"],
  [/gaiter/i, "Christian Neck Gaiter"],
  [/duffel/i, "Christian Gym Duffel Bag"],
  [/tote|backpack|\bbag\b/i, "Christian Bag"],
  [/mug|tumbler|bottle/i, "Christian Drinkware"],
  [/canvas|poster|wall-?art|art-print|framed/i, "Christian Wall Art"]
];
const PRODUCT_NOUNS = /\b(hats?|caps?|beanies?|tees?|t-shirts?|shirts?|hoodies?|sweatshirts?|crewnecks?|clogs?|shoes?|slip-?ons?|cases?|tanks?|canvas|posters?|prints?|mugs?|tumblers?|bags?|totes?|duffels?|blankets?|pants|joggers?|shorts|leggings|kits?|socks|jerseys?|jackets?|gaiters?)\b/i;
const APPAREL_TYPES = /(t-shirt|hoodie|sweatshirt|tank|crewneck|shirt|apparel|all over prints)/i;

function stripHtml(html) {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

function titleCaseWords(s) {
  return s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

function findVerse(product) {
  const fromTitle = product.title.match(VERSE_RE);
  if (fromTitle) return { verse: fromTitle[0], inTitle: true };
  const h = product.handle.match(HANDLE_VERSE_RE);
  if (h) {
    const book = titleCaseWords(h[1].replace(/-/g, " "));
    return { verse: `${book} ${h[2]}:${h[3]}${h[4] ? `–${h[4]}` : ""}`, inTitle: false };
  }
  const fromBody = stripHtml(product.body_html).match(VERSE_RE);
  return fromBody ? { verse: fromBody[0], inTitle: false } : { verse: null, inTitle: false };
}

function garmentFor(product) {
  const blob = `${product.handle} ${product.product_type} ${product.title}`;
  for (const [re, noun] of GARMENT_RULES) if (re.test(blob)) return noun;
  return null;
}

const BOOK_ONLY_RE = new RegExp(`^(?:[1-3]\\s)?(?:${BIBLE_BOOKS.join("|")})$`, "i");

function suggestTitle(product, verseInfo, garment) {
  // Keep the design name (part before " | " or the whole title).
  let design = product.title.split("|")[0].trim().replace(/\s*\(AOP\)\s*/gi, " ").replace(/\s+/g, " ").trim();
  if (design === design.toUpperCase() && design.length > 3) design = titleCaseWords(design);
  // "Romans 8 28" -> "Romans 8:28"
  design = design.replace(/\b((?:[1-3]\s)?[A-Z][a-z]+)\s(\d{1,3})\s(\d{1,3})\b/g, (m, book, ch, v) =>
    BOOK_ONLY_RE.test(book) ? `${book} ${ch}:${v}` : m
  );

  const hasChristianWord = /christian|faith|bible|scripture|jesus|god|cross/i.test(design);
  const nounMatch = design.match(PRODUCT_NOUNS);
  let title = design;
  if (!nounMatch && garment) {
    title = `${design} ${hasChristianWord ? garment.replace("Christian ", "") : garment}`;
  } else if (nounMatch && !hasChristianWord) {
    // Walk back over compound modifiers so we get "Christian Phone Case", not "Phone Christian Case".
    const before = design.slice(0, nounMatch.index).trimEnd().split(" ");
    const after = design.slice(nounMatch.index);
    const MODIFIERS = /^(phone|pajama|eva|foam|trucker|dad|gym|throw|baseball|bucket|graphic|lounge|knit|cuff|tough|magnetic|snapback|rope|two-tone|athletic|training|tank|crewneck|neck|tote|duffel|picnic|pickleball)$/i;
    let cut = before.length;
    while (cut > 0 && MODIFIERS.test(before[cut - 1])) cut--;
    title = [...before.slice(0, cut), "Christian", ...before.slice(cut)].filter(Boolean).join(" ") + " " + after;
  }

  const verseAlreadyThere = verseInfo.verse && title.replace(/[–-]/g, "-").toLowerCase().includes(verseInfo.verse.replace(/[–-]/g, "-").toLowerCase().split(/[–-]/)[0]);
  if (verseInfo.verse && !verseAlreadyThere) title += ` | ${verseInfo.verse}`;
  return title.length > 150 ? title.slice(0, 147) + "..." : title;
}

function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const all = [];
  for (let page = 1; page <= 40; page++) {
    const data = await safeJsonFetch(`${STORE}/products.json?limit=250&page=${page}`);
    if (!data.products?.length) break;
    all.push(...data.products);
    if (data.products.length < 250) break;
  }
  console.log(`[Audit] Loaded ${all.length} products from ${STORE}`);

  const titleCounts = all.reduce((m, p) => m.set(p.title.toLowerCase(), (m.get(p.title.toLowerCase()) || 0) + 1), new Map());
  const issueTotals = {};
  const rows = [];

  for (const p of all) {
    const issues = [];
    const text = stripHtml(p.body_html);
    const verseInfo = findVerse(p);
    const garment = garmentFor(p);
    const optionNames = (p.options || []).map((o) => o.name.toLowerCase());

    if (!PRODUCT_NOUNS.test(p.title)) issues.push("title_missing_product_type_word");
    if (verseInfo.verse && !verseInfo.inTitle) issues.push("verse_not_in_title");
    const words = p.title.trim().split(/\s+/);
    if (words.length <= 4 && p.title === p.title.toUpperCase()) issues.push("title_short_all_caps");
    if (p.title.length > 150) issues.push("title_over_150_chars");
    if (!/christian|faith|bible|scripture|jesus|god|cross/i.test(p.title)) issues.push("title_missing_christian_keyword");
    if (!p.product_type) issues.push("missing_product_type");
    if ((p.tags || []).length < 5) issues.push("fewer_than_5_tags");
    if (text.length < 600) issues.push("thin_description");
    if (APPAREL_TYPES.test(p.product_type || "") && !optionNames.includes("color")) issues.push("apparel_without_color_option");
    if ((p.images || []).length < 3) issues.push("fewer_than_3_images");
    if ((p.variants || []).some((v) => !v.sku)) issues.push("variant_missing_sku");
    if (titleCounts.get(p.title.toLowerCase()) > 1) issues.push("duplicate_title");

    for (const i of issues) issueTotals[i] = (issueTotals[i] || 0) + 1;

    const needsTitle = issues.some((i) => i.startsWith("title_") || i === "verse_not_in_title");
    rows.push({
      handle: p.handle,
      title: p.title,
      product_type: p.product_type || "",
      issues,
      suggested_title: needsTitle ? suggestTitle(p, verseInfo, garment) : "",
      url: `${STORE}/products/${p.handle}`
    });
  }

  rows.sort((a, b) => b.issues.length - a.issues.length);
  mkdirSync(reportsDir, { recursive: true });

  const header = ["handle", "current_title", "suggested_title", "product_type", "issue_count", "issues", "url"];
  const csv = [header.join(",")]
    .concat(rows.map((r) => [r.handle, r.title, r.suggested_title, r.product_type, r.issues.length, r.issues.join("; "), r.url].map(csvCell).join(",")))
    .join("\n");
  writeFileSync(join(reportsDir, "catalog-ai-audit.csv"), csv + "\n");

  const clean = rows.filter((r) => r.issues.length === 0).length;
  const titleFixes = rows.filter((r) => r.suggested_title);
  const describe = {
    title_missing_product_type_word: "Title has no product word (hat, tee, hoodie, clogs…). AI shopping matches on this first.",
    verse_not_in_title: "A Bible verse is in the handle/description but not the title. Verse searches (\"Romans 8:37 shirt\") miss it.",
    title_short_all_caps: "Title is a short ALL-CAPS slogan with no context.",
    title_over_150_chars: "Title exceeds Google Merchant's 150-character limit.",
    title_missing_christian_keyword: "Title lacks a faith keyword (Christian, Bible, scripture, faith…).",
    missing_product_type: "Shopify product type is empty.",
    fewer_than_5_tags: "Fewer than 5 tags.",
    thin_description: "Description under ~600 characters of text.",
    apparel_without_color_option: "Apparel without a Color option (color is a required Google/AI shopping attribute for apparel).",
    fewer_than_3_images: "Fewer than 3 images.",
    variant_missing_sku: "One or more variants have no SKU.",
    duplicate_title: "Title is duplicated across products."
  };

  const md = [
    "# ArmorNGlory Catalog AI-Readiness Audit",
    "",
    `Generated ${new Date().toISOString()} from ${STORE}/products.json`,
    "",
    `- **Products audited:** ${rows.length}`,
    `- **No issues:** ${clean}`,
    `- **Suggested title rewrites:** ${titleFixes.length}`,
    "",
    "## Issues by type",
    "",
    "| Issue | Products | Why it matters |",
    "|---|---|---|",
    ...Object.entries(issueTotals).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| \`${k}\` | ${v} | ${describe[k] || ""} |`),
    "",
    "## Top title rewrites",
    "",
    "| Current | Suggested |",
    "|---|---|",
    ...titleFixes.slice(0, 40).map((r) => `| [${r.title.replace(/\|/g, "\\|")}](${r.url}) | ${r.suggested_title.replace(/\|/g, "\\|")} |`),
    "",
    "> Review every suggestion before applying it in Shopify Admin (Products → bulk edit). Keep the design name you love; the goal is adding the product word and verse buyers actually search for.",
    "",
    "Full list: `reports/catalog-ai-audit.csv`"
  ].join("\n");
  writeFileSync(join(reportsDir, "catalog-ai-audit.md"), md + "\n");

  console.log(`[Audit] ${clean}/${rows.length} products have no issues; ${titleFixes.length} title rewrites suggested.`);
  for (const [k, v] of Object.entries(issueTotals).sort((a, b) => b[1] - a[1])) console.log(`  - ${k}: ${v}`);
  console.log(`[Audit] Wrote reports/catalog-ai-audit.csv and reports/catalog-ai-audit.md`);
}

main().catch((err) => {
  console.error("[Audit] Failed:", err.message);
  process.exit(1);
});
