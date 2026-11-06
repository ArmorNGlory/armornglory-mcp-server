// End-to-end MCP protocol smoke test against the built server over stdio.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [join(root, "dist", "index.js")],
  env: { ...process.env, ARMORNGLORY_LIVE_SYNC: "false" },
  stderr: "ignore"
});
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

const bottle = await client.callTool({ name: "search_armornglory_products", arguments: { query: "stainless steel water bottle" } });
check("water bottle search returns drinkware", /Stainless Steel Water Bottle/i.test(textOf(bottle)));

const s26 = await client.callTool({ name: "search_armornglory_products", arguments: { query: "Samsung Galaxy S26 phone case" } });
check("Samsung Galaxy S26 case search", /Samsung Galaxy S26/i.test(textOf(s26)));

const holidayCol = await client.callTool({ name: "get_collection_products", arguments: { collectionHandleOrTitle: "christmas-collection", limit: 5 } });
check("christmas-collection lookup returns items", /https:\/\/armornglory\.com\/products\//i.test(textOf(holidayCol)));

const topSellersCol = await client.callTool({ name: "get_collection_products", arguments: { collectionHandleOrTitle: "top-sellers", limit: 5 } });
check("top-sellers exact collection membership returns items", /https:\/\/armornglory\.com\/products\//i.test(textOf(topSellersCol)));

const accCol = await client.callTool({ name: "get_collection_products", arguments: { collectionHandleOrTitle: "misc-amp-accessories", limit: 5 } });
check("accessories collection lookup returns items", /https:\/\/armornglory\.com\/products\//i.test(textOf(accCol)));

const s = await client.callTool({ name: "search", arguments: { query: "trucker hat" } });
const parsed = JSON.parse(textOf(s));
check("connector search shape", Array.isArray(parsed.results) && parsed.results.length > 0 && parsed.results.every((r) => r.id && r.title && r.url));

const f = await client.callTool({ name: "fetch", arguments: { id: parsed.results[0].id } });
const doc = JSON.parse(textOf(f));
check("connector fetch shape", Boolean(doc.id && doc.title && doc.text && doc.url && doc.metadata?.price), doc.title);

const gift = await client.callTool({ name: "recommend_faith_gifts", arguments: { recipient: "Men / Husband / Dad", occasion: "Baptism", maxBudget: 40 } });
check("gift advisor", /Option 1/.test(textOf(gift)));

const badCart = await client.callTool({ name: "generate_direct_checkout_link", arguments: { items: [{ variantId: "123/../../evil", quantity: 1 }] } });
check("checkout rejects non-numeric variant IDs", /Invalid item/.test(textOf(badCart)) && !/armornglory\.com\/cart\/123/.test(textOf(badCart)));

const goodCart = await client.callTool({ name: "generate_direct_checkout_link", arguments: { items: [{ variantId: parsed.results.length ? JSON.parse(textOf(f)).metadata.checkoutUrl.match(/cart\/(\d+)/)[1] : "0", quantity: 2 }] } });
check("checkout builds cart permalink", /https:\/\/armornglory\.com\/cart\/\d+:2\?/.test(textOf(goodCart)));

const emptyLookup = await client.callTool({ name: "get_armornglory_product_details", arguments: { productHandleOrTitle: "   " } });
check("empty product lookup returns not-found", /not found/i.test(textOf(emptyLookup)));

const footer = textOf(nl);
check("no unverified free-shipping claim", !/free shipping/i.test(footer));

await client.close();
console.log(failures ? `\n${failures} check(s) failed` : "\nAll MCP protocol checks passed.");
process.exit(failures ? 1 : 0);
