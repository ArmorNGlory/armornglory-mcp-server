#!/usr/bin/env node
/**
 * One-Command Lockstep Release Publisher (npm + GitHub Tag + Official MCP Registry via OIDC)
 *
 * Usage:
 *   npm run release                # Publishes current version in package.json (if not yet on npm)
 *   npm run release -- patch       # Bumps patch version (e.g. 1.2.0 -> 1.2.1), syncs, publishes & tags
 *   npm run release -- minor       # Bumps minor version
 *   npm run release -- 1.3.0       # Sets explicit version
 *
 * Authentication:
 *   Uses `npm publish --auth-type=web` (interactive browser Touch ID passkey — zero stored tokens).
 *   Pushing tag `vX.Y.Z` automatically triggers `.github/workflows/publish-mcp-registry.yml` (GitHub OIDC).
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

function bumpSemver(current, bumpArg) {
  if (!bumpArg) return current;
  if (/^\d+\.\d+\.\d+$/.test(bumpArg)) return bumpArg;
  const [maj, min, pat] = current.split(".").map(Number);
  if (bumpArg === "major") return `${maj + 1}.0.0`;
  if (bumpArg === "minor") return `${maj}.${min + 1}.0`;
  if (bumpArg === "patch") return `${maj}.${min}.${pat + 1}`;
  throw new Error(`Invalid version argument '${bumpArg}'. Expected patch, minor, major, or X.Y.Z.`);
}

const arg = process.argv[2];
const pkgPath = path.join(rootDir, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
const nextVersion = bumpSemver(pkg.version, arg);

if (nextVersion !== pkg.version) {
  pkg.version = nextVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
  console.log(`[Release] Bumped package.json to v${nextVersion}`);
}

// Sync live catalog, discovery files, server.json, .well-known/mcp.json, server-card.json, tests & audit
run(process.execPath, ["scripts/sync-all.js"]);

// Commit release state if dirty
const dirty = execFileSync("git", ["status", "--porcelain"], { cwd: rootDir, encoding: "utf-8" }).trim();
if (dirty) {
  run("git", ["config", "user.email", "232076454+neksjones-coder@users.noreply.github.com"]);
  run("git", ["add", "-A"]);
  run("git", ["commit", "-m", `chore(release): v${nextVersion}`]);
}

console.log(`\n=== Publishing armornglory-mcp-server@${nextVersion} to npm (Touch ID Web Auth) ===`);
run("npm", ["publish", "--auth-type=web"]);

const tagName = `v${nextVersion}`;
const existingTag = execFileSync("git", ["tag", "-l", tagName], { cwd: rootDir, encoding: "utf-8" }).trim();
if (!existingTag) {
  run("git", ["tag", tagName]);
}

console.log(`\n=== Pushing main & ${tagName} to GitHub (triggers OIDC MCP Registry publish) ===`);
run("git", ["push", "origin", "main", tagName]);
console.log(`\n🎉 Released ${tagName} across npm, GitHub, and Official MCP Registry!`);
