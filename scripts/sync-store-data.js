import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchLiveCatalog, isSafeAndSecureUrl } from "../dist/catalog-sync.js";

export { isSafeAndSecureUrl };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");
const dataDir = path.join(rootDir, "data");

export async function sync() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const snapshot = await fetchLiveCatalog({
    storeUrl: "https://armornglory.com",
    includeCollectionMemberships: true,
    onProgress: (msg) => console.log(msg)
  });

  fs.writeFileSync(path.join(dataDir, "products.json"), JSON.stringify(snapshot.products, null, 2) + "\n", "utf-8");
  fs.writeFileSync(path.join(dataDir, "collections.json"), JSON.stringify(snapshot.collections, null, 2) + "\n", "utf-8");
  fs.writeFileSync(path.join(dataDir, "brand_info.json"), JSON.stringify(snapshot.brandInfo, null, 2) + "\n", "utf-8");

  console.log(`[Sync] Saved ${snapshot.products.length} active products to data/products.json`);
  console.log(`[Sync] Saved ${snapshot.collections.length} active collections to data/collections.json`);
  console.log(`[Sync] Saved brand guidelines to data/brand_info.json`);
  console.log("[Sync] Data sync complete!");
  return snapshot;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isMain) {
  sync().catch((err) => {
    console.error("[Sync] Error during sync:", err);
    process.exit(1);
  });
}
