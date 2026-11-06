#!/usr/bin/env node
/**
 * 100% Free, Local-Only macOS LaunchAgent Auto-Sync Installer ($0 Cost Guarantee)
 *
 * Uses macOS's built-in `launchd` scheduler on this Mac — ZERO cloud servers,
 * ZERO GitHub Actions cron minutes, ZERO AI/LLM tokens, ZERO API keys, and
 * ZERO accounts capable of billing.
 *
 * Commands:
 *   npm run autosync:install     # Installs & loads ~/Library/LaunchAgents/com.armornglory.mcp-sync.plist (daily 9:00 AM local)
 *   npm run autosync:status      # Prints current LaunchAgent status & last sync log
 *   npm run autosync:uninstall   # Unloads & removes the LaunchAgent cleanly
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LABEL = "com.armornglory.mcp-sync";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");
const logsDir = path.join(rootDir, "logs");
const plistPath = path.join(os.homedir(), "Library", "LaunchAgents", `${LABEL}.plist`);
const outLogPath = path.join(logsDir, "autosync.log");
const errLogPath = path.join(logsDir, "autosync.err.log");

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildPlistXml() {
  const nodeBin = process.execPath;
  const nodeDir = path.dirname(nodeBin);
  const syncScript = path.join(rootDir, "scripts", "sync-all.js");
  const envPath = `${nodeDir}:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${escapeXml(LABEL)}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${escapeXml(nodeBin)}</string>
    <string>${escapeXml(syncScript)}</string>
    <string>--commit-and-push</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${escapeXml(rootDir)}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${escapeXml(envPath)}</string>
  </dict>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>9</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>${escapeXml(outLogPath)}</string>
  <key>StandardErrorPath</key>
  <string>${escapeXml(errLogPath)}</string>
  <key>ProcessType</key>
  <string>Background</string>
</dict>
</plist>
`;
}

const mode = process.argv[2] || "status";
const uid = typeof process.getuid === "function" ? process.getuid() : 501;

if (mode === "install") {
  fs.mkdirSync(path.dirname(plistPath), { recursive: true });
  fs.mkdirSync(logsDir, { recursive: true });
  fs.writeFileSync(plistPath, buildPlistXml(), "utf-8");

  try {
    execFileSync("launchctl", ["bootout", `gui/${uid}`, plistPath], { stdio: "ignore" });
  } catch {
    // Not previously loaded
  }
  execFileSync("launchctl", ["bootstrap", `gui/${uid}`, plistPath], { stdio: "inherit" });
  console.log(`✅ Installed local zero-cost macOS LaunchAgent: ${plistPath}`);
  console.log(`   Schedule: Daily at 9:00 AM local time (runs on next wake if Mac was asleep)`);
  console.log(`   Logs:     ${outLogPath}`);
} else if (mode === "uninstall") {
  try {
    execFileSync("launchctl", ["bootout", `gui/${uid}`, plistPath], { stdio: "ignore" });
  } catch {
    // Ignore if already unloaded
  }
  if (fs.existsSync(plistPath)) {
    fs.unlinkSync(plistPath);
  }
  console.log(`✅ Uninstalled LaunchAgent (${LABEL}).`);
} else {
  const installed = fs.existsSync(plistPath);
  console.log(`LaunchAgent plist: ${installed ? `Installed (${plistPath})` : "Not installed yet (run: npm run autosync:install)"}`);
  if (installed) {
    try {
      const info = execFileSync("launchctl", ["print", `gui/${uid}/${LABEL}`], { encoding: "utf-8" });
      const stateLine = info.split("\n").find((l) => l.includes("state =")) || "";
      console.log(`launchd state:   ${stateLine.trim()}`);
    } catch {
      console.log("launchd state:   Not currently loaded");
    }
  }
  if (fs.existsSync(outLogPath)) {
    const tail = fs.readFileSync(outLogPath, "utf-8").trim().split("\n").slice(-10).join("\n");
    console.log(`\nRecent autosync.log:\n${tail}`);
  }
}
