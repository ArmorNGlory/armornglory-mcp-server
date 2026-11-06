import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { isSafeAndSecureUrl, safeJsonFetch } from "../dist/catalog-sync.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");
const dataDir = path.join(rootDir, "data");

const products = JSON.parse(fs.readFileSync(path.join(dataDir, "products.json"), "utf-8"));
const collections = JSON.parse(fs.readFileSync(path.join(dataDir, "collections.json"), "utf-8"));
const faqs = JSON.parse(fs.readFileSync(path.join(dataDir, "faqs_and_guides.json"), "utf-8"));
const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf-8"));
const serverJson = JSON.parse(fs.readFileSync(path.join(rootDir, "server.json"), "utf-8"));
const mcpJson = JSON.parse(fs.readFileSync(path.join(rootDir, ".well-known", "mcp.json"), "utf-8"));

let failures = 0;
const assert = (label, ok, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? `: ${detail}` : ""}`);
  if (!ok) failures++;
};

console.log("=== ArmorNGlory MCP Test Suite ===");
assert("Products loaded", products.length > 0, `${products.length} active products`);
assert("Collections loaded (non-empty)", collections.length > 0 && collections.every((c) => c.productsCount > 0), `${collections.length} active collections`);

// Test 1: Version lockstep across manifests
assert(
  "Manifest versions locked",
  pkg.version === serverJson.version &&
    pkg.version === serverJson.packages?.[0]?.version &&
    pkg.version === mcpJson.version,
  `v${pkg.version}`
);

// Test 2: Pre-flight URL security sanitizer & zero-cost host lock
assert(
  "URL security pre-flight sanitizer",
  isSafeAndSecureUrl("http://armornglory.com/products.json") === "https://armornglory.com/products.json" &&
    isSafeAndSecureUrl("https://localhost:3000/test") === null &&
    isSafeAndSecureUrl("https://192.168.1.1/test") === null &&
    isSafeAndSecureUrl("https://evil.xyz/payload") === null &&
    isSafeAndSecureUrl("https://stlcatholic.org/page") === null
);

let blockedPaidHost = false;
try {
  await safeJsonFetch("https://api.openai.com/v1/models");
} catch (err) {
  blockedPaidHost = /Zero-cost host lock/.test(String(err.message || err));
}
assert("Zero-cost host lock rejects any non-armornglory.com endpoint", blockedPaidHost);

// Test 3: Search products by scripture
const searchConquerors = products.filter((p) => p.title.toLowerCase().includes("conquerors") || p.scriptures.includes("Romans 8:37"));
assert("Search 'conquerors / Romans 8:37'", searchConquerors.length > 0, `${searchConquerors.length} items (${searchConquerors[0]?.title})`);

// Test 4: Search Phone Cases & Hats
const searchCases = products.filter((p) => p.category === "Phone Cases");
assert("Search 'Phone Cases'", searchCases.length > 0, `${searchCases.length} items (${searchCases[0]?.title})`);

const searchHats = products.filter((p) => p.category === "Hats & Headwear");
assert("Search 'Hats & Headwear'", searchHats.length > 0, `${searchHats.length} items (${searchHats[0]?.title})`);

// Test 5: Product details & checkout permalink shape
const testItem = products[0];
assert(
  "Product detail & 1-click buy link",
  Boolean(testItem?.handle && testItem?.url && /^https:\/\/armornglory\.com\/cart\/\d+:1/.test(testItem?.variants?.[0]?.checkoutUrl || "")),
  `${testItem?.handle} (${testItem?.priceFormatted})`
);

// Test 6: Zero dead product, cart, or collection links across agent-facing docs & FAQs
const variantIds = new Set(products.flatMap((p) => p.variants.map((v) => String(v.id))));
const handles = new Set(products.map((p) => p.handle));
const collectionHandles = new Set(collections.map((c) => c.handle));

let deadLinks = 0;
for (const file of ["llms.txt", ".well-known/llms.txt", "llms-full.txt", "data/faqs_and_guides.json"]) {
  const text = fs.readFileSync(path.join(rootDir, file), "utf-8");
  for (const [, id] of text.matchAll(/armornglory\.com\/cart\/(\d{8,})/g)) {
    if (!variantIds.has(id)) {
      console.log(`✗ Dead cart variant ${id} in ${file}`);
      deadLinks++;
    }
  }
  for (const [, h] of text.matchAll(/armornglory\.com\/products\/([a-z0-9-]+)/g)) {
    if (!handles.has(h)) {
      console.log(`✗ Dead product handle ${h} in ${file}`);
      deadLinks++;
    }
  }
  for (const [, c] of text.matchAll(/armornglory\.com\/collections\/([a-z0-9-]+)/g)) {
    if (!collectionHandles.has(c)) {
      console.log(`✗ Empty or missing collection ${c} in ${file}`);
      deadLinks++;
    }
  }
}

for (const faq of faqs) {
  for (const h of faq.relatedProductHandles || []) {
    if (!handles.has(h)) {
      console.log(`✗ Dead FAQ relatedProductHandle '${h}' in ${faq.id}`);
      deadLinks++;
    }
  }
}

assert("Zero dead product, variant, or collection links in docs & FAQs", deadLinks === 0);

if (failures > 0) {
  console.error(`\n${failures} verification check(s) failed.`);
  process.exit(1);
}
console.log("\nAll core verification checks passed successfully!");
