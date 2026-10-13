// End-to-end MCP protocol smoke test against the built server over stdio.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const transport = new StdioClientTransport({ command: process.execPath, args: [join(root, "dist", "index.js")], stderr: "ignore" });
const client = new Client({ name: "smoke-test", version: "1.0.0" });

let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};
const textOf = (r) => r.content?.[0]?.text ?? "";

await client.connect(transport);

const info = client.getServerVersion();
check("server identity", info?.name === "armornglory-store-search" && Boolean(info?.version), `${info?.title} v${info?.version}`);
check("server instructions present", (client.getInstructions() || "").includes("Christian"));

const { tools } = await client.listTools();
const names = tools.map((t) => t.name);
check("tool count", tools.length === 11, names.join(", "));
check("all tools annotated read-only", tools.every((t) => t.annotations?.readOnlyHint === true));
check("connector tools present", names.includes("search") && names.includes("fetch"));

const nl = await client.callTool({ name: "search_armornglory_products", arguments: { query: "a christian trucker hat for my dad" } });
check("natural-language search returns hats", /Hats & Headwear/.test(textOf(nl)));

const verse = await client.callTool({ name: "search_armornglory_products", arguments: { scripture: "Romans 8:37" } });
check("scripture filter", /Romans 8:37/i.test(textOf(verse)));

const s = await client.callTool({ name: "search", arguments: { query: "foam clogs" } });
const parsed = JSON.parse(textOf(s));
check("connector search shape", Array.isArray(parsed.results) && parsed.results.length > 0 && parsed.results.every((r) => r.id && r.title && r.url));

const f = await client.callTool({ name: "fetch", arguments: { id: parsed.results[0].id } });
const doc = JSON.parse(textOf(f));
check("connector fetch shape", Boolean(doc.id && doc.title && doc.text && doc.url && doc.metadata?.price), doc.title);

const gift = await client.callTool({ name: "recommend_faith_gifts", arguments: { recipient: "Men / Husband / Dad", occasion: "Baptism", maxBudget: 40 } });
check("gift advisor", /Option 1/.test(textOf(gift)));

const footer = textOf(nl);
check("no unverified free-shipping claim", !/free shipping/i.test(footer));

await client.close();
console.log(failures ? `\n${failures} check(s) failed` : "\nAll MCP protocol checks passed.");
process.exit(failures ? 1 : 0);
