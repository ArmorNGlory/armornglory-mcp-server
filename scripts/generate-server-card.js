// Regenerates .well-known/mcp/server-card.json from the built server's real tools/prompts/resources,
// so directory listings (Smithery etc.) never drift from what the server actually exposes.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const transport = new StdioClientTransport({ command: process.execPath, args: [join(root, "dist", "index.js")], stderr: "ignore" });
const client = new Client({ name: "server-card-generator", version: "1.0.0" });
await client.connect(transport);

const info = client.getServerVersion();
const [{ tools }, { prompts }, { resources }] = await Promise.all([client.listTools(), client.listPrompts(), client.listResources()]);

const card = {
  $schema: "https://modelcontextprotocol.io/schema/server-card.json",
  serverInfo: {
    name: info.name,
    title: info.title,
    version: info.version,
    websiteUrl: info.websiteUrl,
    description:
      "Shop modern Christian streetwear and faith apparel from ArmorNGlory.com inside any AI assistant: scripture trucker hats and dad caps, " +
      "Bible verse t-shirts, Christian hoodies, EVA foam clogs, Christian gym wear, phone cases, and Christian gifts (baptism, Father's Day, " +
      "new believer). Search by verse, style, occasion, size, or price; get the meaning behind each design, fit advice, and 1-click Shopify checkout links."
  },
  instructions: client.getInstructions(),
  authentication: { required: false },
  install: { command: "npx", args: ["-y", "armornglory-mcp-server@latest"] },
  tools: tools.map(({ name, title, description, inputSchema, annotations }) => ({ name, title, description, inputSchema, annotations })),
  prompts: prompts.map(({ name, description, arguments: args }) => ({ name, description, arguments: args })),
  resources: resources.map(({ name, uri, description, mimeType }) => ({ name, uri, description, mimeType }))
};

writeFileSync(join(root, ".well-known", "mcp", "server-card.json"), JSON.stringify(card, null, 2) + "\n");
await client.close();
console.log(`[server-card] Wrote ${tools.length} tools, ${prompts.length} prompts, ${resources.length} resources (v${info.version}).`);
