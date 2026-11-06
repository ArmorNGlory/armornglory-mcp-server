#!/usr/bin/env node
/**
 * End-to-End Self-Healing Catalog & Discovery Sync Pipeline
 *
 * Usage:
 *   npm run sync:all                     # Sync live store -> heal docs -> rebuild card -> test & audit
 *   node scripts/sync-all.js --commit-and-push   # Also commit & push to origin/main if catalog changed
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

function run(cmd, args, envExtra = {}) {
  execFileSync(cmd, args, {
    cwd: rootDir,
    stdio: "inherit",
    env: { ...process.env, ...envExtra }
  });
}

function gitOutput(args) {
  return execFileSync("git", args, { cwd: rootDir, encoding: "utf-8" }).trim();
}

async function main() {
  const shouldCommitAndPush = process.argv.includes("--commit-and-push");

  console.log("=== [1/5] Building TypeScript sync & server engine ===");
  run("npm", ["run", "build"]);

  console.log("\n=== [2/5] Syncing live Shopify catalog & collection memberships ===");
  run(process.execPath, ["scripts/sync-store-data.js"]);

  console.log("\n=== [3/5] Self-healing llms.txt, llms-full.txt, FAQs & version manifests ===");
  run(process.execPath, ["scripts/sync-discovery-files.js"]);

  console.log("\n=== [4/5] Regenerating MCP server-card.json ===");
  run(process.execPath, ["scripts/generate-server-card.js"], { ARMORNGLORY_LIVE_SYNC: "false" });

  console.log("\n=== [5/5] Running verification suite & production vulnerability audit ===");
  run("npm", ["test"], { ARMORNGLORY_LIVE_SYNC: "false" });
  run("npm", ["run", "audit:deps"]);

  const products = JSON.parse(fs.readFileSync(path.join(rootDir, "data", "products.json"), "utf-8"));
  const collections = JSON.parse(fs.readFileSync(path.join(rootDir, "data", "collections.json"), "utf-8"));
  console.log(
    `\n✅ Sync complete and verified: ${products.length} active products, ${collections.length} active collections, 0 broken links, 0 high/critical vulnerabilities.`
  );

  if (shouldCommitAndPush) {
    const syncPaths = [
      "data/products.json",
      "data/collections.json",
      "data/brand_info.json",
      "data/faqs_and_guides.json",
      "llms.txt",
      "llms-full.txt",
      ".well-known/llms.txt",
      ".well-known/mcp/server-card.json"
    ];
    const status = gitOutput(["status", "--porcelain", "--", ...syncPaths]);
    if (!status) {
      console.log("[Auto-Sync] No catalog or discovery changes detected; skipping commit.");
      return;
    }

    // Strictly enforce GitHub no-reply privacy email
    run("git", ["config", "user.name", "ArmorNGlory Sync"]);
    run("git", ["config", "user.email", "232076454+neksjones-coder@users.noreply.github.com"]);
    run("git", ["add", "--", ...syncPaths]);
    run("git", [
      "commit",
      "-m",
      `chore(sync): auto-sync live Shopify catalog (${products.length} products, ${collections.length} collections)`
    ]);
    run("git", ["push", "origin", "HEAD:main"]);
    console.log("[Auto-Sync] Committed and pushed catalog updates to origin/main.");
  }
}

main().catch((err) => {
  console.error("[Sync-All] Pipeline failed:", err.message || err);
  process.exit(1);
});
