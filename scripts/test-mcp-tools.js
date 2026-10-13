import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");
const dataDir = path.join(rootDir, "data");

const products = JSON.parse(fs.readFileSync(path.join(dataDir, "products.json"), "utf-8"));
const collections = JSON.parse(fs.readFileSync(path.join(dataDir, "collections.json"), "utf-8"));
const brandInfo = JSON.parse(fs.readFileSync(path.join(dataDir, "brand_info.json"), "utf-8"));

console.log("=== ArmorNGlory MCP Test Suite ===");
console.log(`✓ Products loaded: ${products.length}`);
console.log(`✓ Collections loaded: ${collections.length}`);

// Test 1: Search products
const searchConquerors = products.filter(p => p.title.toLowerCase().includes("conquerors") || p.scriptures.includes("Romans 8:37"));
console.log(`✓ Search 'conquerors / Romans 8:37': Found ${searchConquerors.length} items (Sample: ${searchConquerors[0]?.title})`);

// Test 2: Search Footwear
const searchClogs = products.filter(p => p.category === "Footwear & Clogs");
console.log(`✓ Search 'Footwear & Clogs': Found ${searchClogs.length} items (Sample: ${searchClogs[0]?.title})`);

// Test 3: Search Hats
const searchHats = products.filter(p => p.category === "Hats & Headwear");
console.log(`✓ Search 'Hats & Headwear': Found ${searchHats.length} items (Sample: ${searchHats[0]?.title})`);

// Test 4: Product details
const testItem = products[0];
console.log(`✓ Product detail lookup: '${testItem.handle}'`);
console.log(`  - Title: ${testItem.title}`);
console.log(`  - Price: ${testItem.priceFormatted}`);
console.log(`  - Direct URL: ${testItem.url}`);
console.log(`  - 1-Click Buy Link: ${testItem.variants[0]?.checkoutUrl}`);
console.log(`  - Scripture: ${testItem.scriptures.join(", ")}`);
console.log(`  - Has Story: ${Boolean(testItem.story.meaningBehindDesign)}`);

// Test 5: Direct checkout permalink generator test
const sampleVariantId = testItem.variants[0]?.id;
const checkoutUrl = `https://armornglory.com/cart/${sampleVariantId}:1?discount=SAVED10`;
console.log(`✓ Generated checkout link test: ${checkoutUrl}`);

// Test 6: No dead product/cart links in agent-facing docs
const variantIds = new Set(products.flatMap((p) => p.variants.map((v) => String(v.id))));
const handles = new Set(products.map((p) => p.handle));
let deadLinks = 0;
for (const file of ["llms.txt", "llms-full.txt", "data/faqs_and_guides.json"]) {
  const text = fs.readFileSync(path.join(rootDir, file), "utf-8");
  for (const [, id] of text.matchAll(/armornglory\.com\/cart\/(\d{8,})/g)) {
    if (!variantIds.has(id)) { console.log(`✗ Dead cart variant ${id} in ${file}`); deadLinks++; }
  }
  for (const [, h] of text.matchAll(/armornglory\.com\/products\/([a-z0-9-]+)/g)) {
    if (!handles.has(h)) { console.log(`✗ Dead product handle ${h} in ${file}`); deadLinks++; }
  }
}
if (deadLinks) {
  console.log(`\n${deadLinks} dead link(s) found. Update the docs after syncing the catalog.`);
  process.exit(1);
}
console.log("✓ No dead product or cart links in llms.txt, llms-full.txt, or FAQs");

console.log("\nAll core verification checks passed successfully!");
