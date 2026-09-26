#!/usr/bin/env node

/**
 * ArmorNGlory MCP Server
 * 
 * Official Model Context Protocol server for ArmorNGlory.com —
 * allowing external AI assistants (Claude Desktop, Cursor, Antigravity, ChatGPT, Gemini, Windsurf)
 * to natively discover, recommend, style, answer FAQs, and generate instant checkout links
 * for 249+ Christian streetwear apparel, hats, EVA foam clogs, and accessories.
 * 
 * Transport: stdio
 * Tools:
 *  - search_armornglory_products
 *  - get_armornglory_product_details
 *  - list_armornglory_collections
 *  - get_collection_products
 *  - recommend_faith_gifts
 *  - get_brand_story_and_values
 *  - get_sizing_and_fit_guide
 *  - generate_direct_checkout_link
 *  - answer_faith_fashion_questions
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import http from "node:http";
import { z } from "zod";
import { readFileSync, appendFileSync, existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// ---------------------------------------------------------------------------
// 1. Types & Data Loading
// ---------------------------------------------------------------------------

export interface ProductVariant {
  id: number;
  title: string;
  price: number;
  priceFormatted: string;
  available: boolean;
  sku?: string | null;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  imageUrl?: string | null;
  checkoutUrl: string;
}

export interface ProductStory {
  summary: string;
  meaningBehindDesign?: string | null;
  whyYouWillLoveIt?: string | null;
  fitGuidance?: string | null;
  specifications?: string | null;
  careInstructions?: string | null;
  shippingInfo?: string | null;
}

export interface Product {
  id: number;
  title: string;
  handle: string;
  url: string;
  productType?: string;
  category: string;
  aesthetics: string[];
  occasions: string[];
  scriptures: string[];
  minPrice: number;
  maxPrice: number;
  priceFormatted: string;
  vendor?: string;
  tags: string[];
  publishedAt?: string;
  createdAt?: string;
  featuredImage?: string | null;
  images: string[];
  options: { name: string; position: number; values: string[] }[];
  availableColors: string[];
  availableSizes: string[];
  variants: ProductVariant[];
  story: ProductStory;
  rawBody: string;
}

export interface Collection {
  id: number;
  title: string;
  handle: string;
  url: string;
  description: string;
  productsCount: number;
  imageUrl?: string | null;
  publishedAt?: string;
  updatedAt?: string;
}

export interface BrandInfo {
  brandName: string;
  legalName: string;
  storeUrl: string;
  tagline: string;
  mission: string;
  nameMeaning: {
    armor: string;
    glory: string;
  };
  designEthos: {
    philosophy: string;
    principles: string[];
  };
  sizingGuides: Record<string, string>;
}

export interface FAQItem {
  id: string;
  question: string;
  category: string;
  keywords: string[];
  answer: string;
  relatedProductHandles: string[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataDir = join(__dirname, "..", "data");

let products: Product[] = [];
let collections: Collection[] = [];
let brandInfo: BrandInfo;
let faqs: FAQItem[] = [];

try {
  const productsRaw = readFileSync(join(dataDir, "products.json"), "utf-8");
  products = JSON.parse(productsRaw) as Product[];

  const collectionsRaw = readFileSync(join(dataDir, "collections.json"), "utf-8");
  collections = JSON.parse(collectionsRaw) as Collection[];

  const brandRaw = readFileSync(join(dataDir, "brand_info.json"), "utf-8");
  brandInfo = JSON.parse(brandRaw) as BrandInfo;

  try {
    const faqRaw = readFileSync(join(dataDir, "faqs_and_guides.json"), "utf-8");
    faqs = JSON.parse(faqRaw) as FAQItem[];
  } catch {
    faqs = [];
  }

  console.error(`[ArmorNGlory MCP] Loaded ${products.length} products, ${collections.length} collections, ${faqs.length} FAQs.`);
} catch (err) {
  console.error("[ArmorNGlory MCP] ERROR: Could not load data files from " + dataDir, err);
  process.exit(1);
}

const logsDir = join(__dirname, "..", "logs");

function logAgentActivity(toolName: string, args: Record<string, unknown>, resultSummary: string | number) {
  try {
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }
    const entry = {
      timestamp: new Date().toISOString(),
      tool: toolName,
      args,
      result: resultSummary,
      ppid: process.ppid || process.pid
    };
    appendFileSync(join(logsDir, "agent_activity.jsonl"), JSON.stringify(entry) + "\n", "utf-8");
  } catch {
    // Non-blocking logger
  }
}

// ---------------------------------------------------------------------------
// 2. Search & Filtering Engine
// ---------------------------------------------------------------------------

interface ProductSearchFilters {
  query?: string;
  scripture?: string;
  category?: string;
  aesthetic?: string;
  occasion?: string;
  color?: string;
  size?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: "relevance" | "price-low" | "price-high" | "newest";
  limit?: number;
}

function searchProducts(filters: ProductSearchFilters): Product[] {
  const {
    query,
    scripture,
    category,
    aesthetic,
    occasion,
    color,
    size,
    minPrice,
    maxPrice,
    sortBy = "relevance",
    limit = 5
  } = filters;

  let pool = products;

  // Category filter
  if (category) {
    const catLower = category.toLowerCase().trim();
    pool = pool.filter(
      (p) =>
        p.category.toLowerCase().includes(catLower) ||
        (p.productType && p.productType.toLowerCase().includes(catLower))
    );
  }

  // Scripture filter
  if (scripture) {
    const scripLower = scripture.toLowerCase().trim();
    pool = pool.filter(
      (p) =>
        p.scriptures.some((s) => s.toLowerCase().includes(scripLower)) ||
        p.tags.some((t) => t.toLowerCase().includes(scripLower)) ||
        p.title.toLowerCase().includes(scripLower) ||
        p.rawBody.toLowerCase().includes(scripLower)
    );
  }

  // Aesthetic filter
  if (aesthetic) {
    const aesLower = aesthetic.toLowerCase().trim();
    pool = pool.filter(
      (p) =>
        p.aesthetics.some((a) => a.toLowerCase().includes(aesLower)) ||
        p.tags.some((t) => t.toLowerCase().includes(aesLower))
    );
  }

  // Occasion filter
  if (occasion) {
    const occLower = occasion.toLowerCase().trim();
    pool = pool.filter((p) =>
      p.occasions.some((o) => o.toLowerCase().includes(occLower))
    );
  }

  // Color filter
  if (color) {
    const colorLower = color.toLowerCase().trim();
    pool = pool.filter((p) =>
      p.availableColors.some((c) => c.toLowerCase().includes(colorLower))
    );
  }

  // Size filter
  if (size) {
    const sizeLower = size.toLowerCase().trim();
    pool = pool.filter((p) =>
      p.availableSizes.some((s) => s.toLowerCase().includes(sizeLower))
    );
  }

  // Price filters
  if (typeof minPrice === "number") {
    pool = pool.filter((p) => p.maxPrice >= minPrice);
  }
  if (typeof maxPrice === "number") {
    pool = pool.filter((p) => p.minPrice <= maxPrice);
  }

  // Text Query Ranking
  const terms = query ? query.toLowerCase().trim().split(/\s+/).filter(Boolean) : [];

  let scored = pool.map((product) => {
    let score = 0;
    if (terms.length > 0) {
      const titleLower = product.title.toLowerCase();
      const bodyLower = product.rawBody.toLowerCase();
      const tagsBlob = product.tags.join(" ").toLowerCase();
      const scriptBlob = product.scriptures.join(" ").toLowerCase();

      for (const term of terms) {
        if (titleLower.includes(term)) score += 20;
        if (scriptBlob.includes(term)) score += 15;
        if (tagsBlob.includes(term)) score += 10;
        if (product.category.toLowerCase().includes(term)) score += 8;
        if (bodyLower.includes(term)) score += 3;

        // Semantic synonym & intent expansion
        if ((term === "croc" || term === "crocs" || term === "clog" || term === "clogs" || term === "slide" || term === "slides" || term === "shoes" || term === "footwear") && product.category === "Footwear & Clogs") score += 18;
        if ((term === "hat" || term === "hats" || term === "cap" || term === "caps" || term === "snapback" || term === "trucker" || term === "beanie") && product.category === "Hats & Headwear") score += 18;
        if ((term === "tee" || term === "tees" || term === "tshirt" || term === "t-shirt" || term === "shirt" || term === "shirts") && product.category === "T-Shirts & Tops") score += 18;
        if ((term === "hoodie" || term === "hoodies" || term === "sweatshirt" || term === "sweatshirts" || term === "fleece") && product.category === "Hoodies & Sweatshirts") score += 18;
        if ((term === "case" || term === "iphone" || term === "magsafe") && product.category === "Phone Cases") score += 18;
        if ((term === "gym" || term === "workout" || term === "fitness" || term === "lifting" || term === "training") && (product.category === "Activewear & Training" || product.aesthetics.includes("Athletic / Performance"))) score += 18;
        if ((term === "conqueror" || term === "conquerors") && product.scriptures.some((s) => s.includes("Romans 8:37"))) score += 20;
        if ((term === "holy" || term === "bush") && product.scriptures.some((s) => s.includes("Exodus 3:5"))) score += 20;
        if ((term === "kingdom" || term === "first") && product.scriptures.some((s) => s.includes("Matthew 6:33"))) score += 20;
      }
    } else {
      score = 1;
    }
    return { product, score };
  });

  if (terms.length > 0) {
    scored = scored.filter((item) => item.score > 0);
  }

  // Sorting
  if (sortBy === "price-low") {
    scored.sort((a, b) => a.product.minPrice - b.product.minPrice);
  } else if (sortBy === "price-high") {
    scored.sort((a, b) => b.product.maxPrice - a.product.maxPrice);
  } else if (sortBy === "newest") {
    scored.sort((a, b) => (b.product.publishedAt || "").localeCompare(a.product.publishedAt || ""));
  } else {
    // Relevance
    scored.sort((a, b) => b.score - a.score);
  }

  return scored.slice(0, limit).map((s) => s.product);
}

function findProduct(identifier: string): Product | undefined {
  const clean = identifier.toLowerCase().trim();
  return products.find(
    (p) =>
      p.handle.toLowerCase() === clean ||
      p.title.toLowerCase() === clean ||
      String(p.id) === clean ||
      p.title.toLowerCase().includes(clean)
  );
}

// ---------------------------------------------------------------------------
// 3. Formatting Helpers
// ---------------------------------------------------------------------------

function attachUtm(url: string, campaign = "store_recommendation"): string {
  if (!url) return url;
  if (url.includes("utm_source=")) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}utm_source=ai_agent&utm_medium=mcp&utm_campaign=${campaign}`;
}

function formatProductSummary(p: Product): string {
  const scriptText = p.scriptures.length > 0 ? `\n- **Scripture / Theme**: ${p.scriptures.join(", ")}` : "";
  const aestheticText = p.aesthetics.length > 0 ? `\n- **Style / Aesthetic**: ${p.aesthetics.join(", ")}` : "";
  const meaningSnippet = p.story.meaningBehindDesign ? `\n- **Design Meaning**: ${p.story.meaningBehindDesign}` : "";
  const buyUrl = attachUtm(p.variants[0]?.checkoutUrl || p.url, "product_search");
  const imgMarkdown = p.featuredImage ? `[![${p.title}](${p.featuredImage})](${p.url})\n` : "";

  return `### [${p.title}](${p.url})
${imgMarkdown}- **Category**: ${p.category} | **Price**: ${p.priceFormatted}${scriptText}${aestheticText}${meaningSnippet}
- **Colors**: ${p.availableColors.slice(0, 5).join(", ") || "Standard"}
- **Product Link**: ${p.url}
- **🛒 Direct 1-Click Buy**: [Add to Cart & Checkout](${buyUrl})`;
}

function formatProductDetail(p: Product): string {
  const scriptures = p.scriptures.length > 0 ? p.scriptures.join(", ") : "Faith-inspired Christian Streetwear";
  const aesthetics = p.aesthetics.join(", ");
  const occasions = p.occasions.join(", ");

  let variantsList = p.variants
    .slice(0, 10)
    .map(
      (v) =>
        `  - **${v.title}**: ${v.priceFormatted} ${v.available ? "✅ In Stock" : "❌ Out of Stock"} — [Instant Buy Link](${attachUtm(v.checkoutUrl, "product_detail")})`
    )
    .join("\n");

  if (p.variants.length > 10) {
    variantsList += `\n  - *(+ ${p.variants.length - 10} more color/size variants available on site)*`;
  }

  let storySections = "";
  if (p.story.meaningBehindDesign) {
    storySections += `\n\n#### 🕊️ Meaning Behind The Design\n${p.story.meaningBehindDesign}`;
  }
  if (p.story.whyYouWillLoveIt) {
    storySections += `\n\n#### ✨ Why You Will Love It\n${p.story.whyYouWillLoveIt}`;
  }
  if (p.story.specifications) {
    storySections += `\n\n#### 🧵 Specifications & Craftsmanship\n${p.story.specifications}`;
  }
  if (p.story.fitGuidance) {
    storySections += `\n\n#### 📏 Sizing & Fit Guidance\n${p.story.fitGuidance}`;
  }
  if (p.story.careInstructions) {
    storySections += `\n\n#### 🧼 Care Instructions\n${p.story.careInstructions}`;
  }

  // Cross-sell companion product for AOV boost
  let companionSection = "";
  let companionCategory = "";
  if (p.category === "Hats & Headwear") companionCategory = "Footwear & Clogs";
  else if (p.category === "Footwear & Clogs") companionCategory = "Hats & Headwear";
  else if (p.category.includes("T-Shirts") || p.category.includes("Hoodies")) companionCategory = "Hats & Headwear";

  if (companionCategory) {
    const companion = products.find((c) => c.category === companionCategory && c.id !== p.id);
    if (companion && companion.variants[0] && p.variants[0]) {
      const bundleUrl = attachUtm(
        `https://armornglory.com/cart/${p.variants[0].id}:1,${companion.variants[0].id}:1`,
        "complete_the_look_bundle"
      );
      companionSection = `\n\n### 🔥 Complete The Streetwear Look (Bundle & Save)\nPair this with **[${companion.title}](${companion.url})** (${companion.priceFormatted}) for a head-to-toe faith streetwear fit.\n👉 **[1-Click Bundle Both Items to Checkout](${bundleUrl})**`;
    }
  }

  const imgMarkdown = p.featuredImage ? `![${p.title}](${p.featuredImage})\n\n` : "";

  return `## [${p.title}](${p.url})
${imgMarkdown}**Price:** ${p.priceFormatted} | **Category:** ${p.category} | **SKU / ID:** ${p.id}
**Scriptural Reference:** ${scriptures}
**Aesthetic:** ${aesthetics} | **Ideal Occasions:** ${occasions}

${storySections}

### 🛒 Available Options & 1-Click Checkout
${variantsList}${companionSection}

🔗 **Direct Product URL:** ${p.url}`;
}

// ---------------------------------------------------------------------------
// 4. Initialize MCP Server
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "armornglory-store-search",
  version: "1.0.0"
});

// ---------------------------------------------------------------------------
// 5. Tool 1: search_armornglory_products
// ---------------------------------------------------------------------------

server.tool(
  "search_armornglory_products",
  "Search the complete ArmorNGlory Christian streetwear catalog by keywords, scripture verses (e.g. Romans 8:37, Exodus 3:5, Matthew 6:33), apparel category, aesthetic vibe, color, size, or price range. Returns product details, prices, images, and direct 1-click checkout links.",
  {
    query: z
      .string()
      .optional()
      .describe("Keyword query (e.g. 'trucker hat', 'conquerors', 'holy ground', 'clogs', 'hoodie', 'cross', 'vintage americana', 'sweatshirt')"),
    scripture: z
      .string()
      .optional()
      .describe("Bible verse or book filter (e.g. 'Romans 8:37', 'Exodus 3:5', 'Matthew 6:33', 'Ephesians 6', 'Philippians 4:13', 'Isaiah 40:31', '33 AD')"),
    category: z
      .string()
      .optional()
      .describe("Category filter (e.g. 'Hats & Headwear', 'Footwear & Clogs', 'T-Shirts & Tops', 'Hoodies & Sweatshirts', 'Phone Cases', 'Activewear & Training', 'Wall Art & Decor', 'Accessories')"),
    aesthetic: z
      .string()
      .optional()
      .describe("Style vibe filter (e.g. 'Streetwear', 'Minimalist Core', 'Sacred Symbols', 'Gothic Faith', 'Vintage Americana', 'Athletic')"),
    occasion: z
      .string()
      .optional()
      .describe("Occasion filter (e.g. 'Baptism & Milestones', 'Father\\'s Day & Gifts for Men', 'Mother\\'s Day & Gifts for Women', 'Workout & Fitness', 'Encouragement & Overcoming', 'Everyday Wear')"),
    color: z
      .string()
      .optional()
      .describe("Color filter (e.g. 'Black', 'White', 'Navy', 'Charcoal', 'Gold')"),
    size: z
      .string()
      .optional()
      .describe("Size filter (e.g. 'S', 'M', 'L', 'XL', '2XL', 'US 9 Men\\'s', 'US 8 Women\\'s', 'One size')"),
    minPrice: z
      .number()
      .optional()
      .describe("Minimum price in USD (e.g. 20)"),
    maxPrice: z
      .number()
      .optional()
      .describe("Maximum price in USD (e.g. 50)"),
    sortBy: z
      .enum(["relevance", "price-low", "price-high", "newest"])
      .optional()
      .describe("Sort order: 'relevance' (default), 'price-low', 'price-high', 'newest'"),
    limit: z
      .number()
      .min(1)
      .max(25)
      .optional()
      .describe("Maximum number of products to return (default: 5, max: 25)")
  },
  async (args) => {
    const results = searchProducts(args);
    logAgentActivity("search_armornglory_products", args as Record<string, unknown>, results.length);

    if (results.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No ArmorNGlory products matched your search criteria. Try broadening your query (e.g. searching for 'hats', 'hoodies', 'cross', or 'clogs') or browse all items at https://armornglory.com/collections/all-products.`
          }
        ]
      };
    }

    const header = `### 🛡️ ArmorNGlory Product Search Results (${results.length} items)\n*Everyday Christian streetwear rooted in spiritual conviction and high aesthetic design.*\n\n`;
    const body = results.map(formatProductSummary).join("\n\n---\n\n");
    const footer = `\n\n---\n*Browse the full collection at [ArmorNGlory.com](https://armornglory.com) | Free shipping & made-to-order quality.*`;

    return {
      content: [
        {
          type: "text",
          text: header + body + footer
        }
      ]
    };
  }
);

// ---------------------------------------------------------------------------
// 6. Tool 2: get_armornglory_product_details
// ---------------------------------------------------------------------------

server.tool(
  "get_armornglory_product_details",
  "Get complete in-depth product details for a specific ArmorNGlory item by handle, title, or ID. Returns theological meaning, why you will love it, craftsmanship specifications, fit guidance, care instructions, and 1-click checkout links.",
  {
    productHandleOrTitle: z
      .string()
      .describe("Product handle (e.g. 'more-than-conquerors-printed-christian-5-panel-trucker-cap', 'golden-cross-eva-foam-clogs-aop'), product title, or ID")
  },
  async ({ productHandleOrTitle }) => {
    const product = findProduct(productHandleOrTitle);
    logAgentActivity("get_armornglory_product_details", { productHandleOrTitle }, product ? product.title : "not_found");

    if (!product) {
      return {
        content: [
          {
            type: "text",
            text: `Product '${productHandleOrTitle}' not found in the ArmorNGlory database. Use 'search_armornglory_products' to look up available items.`
          }
        ]
      };
    }

    return {
      content: [
        {
          type: "text",
          text: formatProductDetail(product)
        }
      ]
    };
  }
);

// ---------------------------------------------------------------------------
// 7. Tool 3: list_armornglory_collections
// ---------------------------------------------------------------------------

server.tool(
  "list_armornglory_collections",
  "List all curated collections on ArmorNGlory.com (e.g. Hats & Beanies, Faith Footwear, Faith in America, Hoodies & Sweatshirts, Saints and Shadows, Minimalist Core, Activewear, Phone Cases) with descriptions and product counts.",
  {
    limit: z
      .number()
      .min(1)
      .max(50)
      .optional()
      .describe("Max collections to return (default: 25)")
  },
  async ({ limit = 25 }) => {
    const cols = collections.slice(0, limit);
    logAgentActivity("list_armornglory_collections", { limit }, cols.length);

    const formatted = cols
      .map((c) => {
        const desc = c.description ? `\n  - *${c.description.slice(0, 140)}...*` : "";
        return `- **[${c.title}](${c.url})** (\`${c.handle}\`): ${c.productsCount} items${desc}`;
      })
      .join("\n\n");

    return {
      content: [
        {
          type: "text",
          text: `## 🏷️ ArmorNGlory Curated Collections\n\n${formatted}\n\n*Use \`get_collection_products\` with any collection handle to see all products in that collection.*`
        }
      ]
    };
  }
);

// ---------------------------------------------------------------------------
// 8. Tool 4: get_collection_products
// ---------------------------------------------------------------------------

server.tool(
  "get_collection_products",
  "Retrieve all products belonging to a specific ArmorNGlory collection (e.g. 'faith-footwear', 'hats-beanies', 'streetwear', 'faith-in-america-collection', 'hoodies-sweatshirts', 'gothic-faith', 'heavyweight-essentials').",
  {
    collectionHandleOrTitle: z
      .string()
      .describe("Collection handle (e.g. 'faith-footwear', 'hats-beanies', 'streetwear', 'heavyweight-essentials') or title"),
    limit: z
      .number()
      .min(1)
      .max(25)
      .optional()
      .describe("Number of products to return (default: 10)")
  },
  async ({ collectionHandleOrTitle, limit = 10 }) => {
    const clean = collectionHandleOrTitle.toLowerCase().trim();
    const collection = collections.find(
      (c) => c.handle.toLowerCase() === clean || c.title.toLowerCase() === clean
    );

    let matched: Product[] = [];

    if (collection) {
      const handleSlug = collection.handle.toLowerCase();
      if (handleSlug === "faith-footwear") {
        matched = products.filter((p) => p.category === "Footwear & Clogs");
      } else if (handleSlug === "hats-beanies") {
        matched = products.filter((p) => p.category === "Hats & Headwear");
      } else if (handleSlug === "hoodies-sweatshirts") {
        matched = products.filter((p) => p.category === "Hoodies & Sweatshirts");
      } else if (handleSlug === "t-shirts") {
        matched = products.filter((p) => p.category === "T-Shirts & Tops");
      } else if (handleSlug === "phone-cases") {
        matched = products.filter((p) => p.category === "Phone Cases");
      } else if (handleSlug === "activewear") {
        matched = products.filter((p) => p.aesthetics.includes("Athletic / Performance") || p.rawBody.toLowerCase().includes("activewear"));
      } else if (handleSlug === "faith-in-america-collection") {
        matched = products.filter((p) => p.aesthetics.includes("Vintage Americana") || p.tags.some((t) => t.toLowerCase().includes("america")));
      } else if (handleSlug === "gothic-faith") {
        matched = products.filter((p) => p.aesthetics.includes("Gothic Faith") || p.tags.some((t) => t.toLowerCase().includes("gothic")));
      } else if (handleSlug === "heavyweight-essentials") {
        matched = products.filter((p) => p.aesthetics.includes("Minimalist Core"));
      } else {
        matched = products.filter(
          (p) =>
            p.tags.some((t) => t.toLowerCase().includes(handleSlug)) ||
            p.rawBody.toLowerCase().includes(collection.title.toLowerCase())
        );
      }
    }

    if (matched.length === 0) {
      matched = searchProducts({ query: collectionHandleOrTitle, limit });
    }

    logAgentActivity("get_collection_products", { collectionHandleOrTitle, limit }, matched.length);

    const title = collection ? collection.title : collectionHandleOrTitle;
    const url = collection ? collection.url : `https://armornglory.com/collections/${collectionHandleOrTitle}`;
    const header = `## 🏷️ Collection: [${title}](${url})\n${collection?.description || ""}\n\n`;
    const items = matched.slice(0, limit).map(formatProductSummary).join("\n\n---\n\n");

    return {
      content: [
        {
          type: "text",
          text: `${header}${items}\n\n*View entire collection online at ${url}*`
        }
      ]
    };
  }
);

// ---------------------------------------------------------------------------
// 9. Tool 5: recommend_faith_gifts
// ---------------------------------------------------------------------------

server.tool(
  "recommend_faith_gifts",
  "Smart faith gift consultant that recommends personalized Christian streetwear, hats, EVA foam clogs, and accessories based on recipient profile, occasion (baptism, birthday, Father's Day, Christmas, encouragement), budget, style vibe, and scripture theme.",
  {
    recipient: z
      .string()
      .optional()
      .describe("Who the gift is for (e.g. 'Men / Husband / Dad', 'Women / Wife / Mom', 'Youth / Teen / College', 'Pastor / Church Leader', 'Gym & Fitness Lover', 'New Believer')"),
    occasion: z
      .string()
      .optional()
      .describe("The gifting occasion (e.g. 'Baptism & Milestones', 'Father\\'s Day', 'Mother\\'s Day', 'Christmas & Easter', 'Encouragement & Overcoming', 'Birthday', 'Workout & Fitness', 'Everyday Encouragement')"),
    maxBudget: z
      .number()
      .optional()
      .describe("Maximum budget in USD (e.g. 35, 50, 100)"),
    styleVibe: z
      .string()
      .optional()
      .describe("Aesthetic preference (e.g. 'Subtle & Minimalist', 'Bold Streetwear', 'Sacred Symbols & Cross', 'Athletic / Gym', 'Vintage Americana')"),
    scriptureFocus: z
      .string()
      .optional()
      .describe("Desired scripture theme (e.g. 'Romans 8:37 More Than Conquerors', 'Exodus 3:5 Holy Ground', 'Matthew 6:33 Kingdom First', 'Ephesians 6 Armor of God', 'Isaiah 40:31 Second Wind')")
  },
  async (args) => {
    const { recipient, occasion, maxBudget, styleVibe, scriptureFocus } = args;

    let filtered = products;

    if (maxBudget) {
      filtered = filtered.filter((p) => p.minPrice <= maxBudget);
    }

    const scored = filtered.map((product) => {
      let score = 0;
      if (scriptureFocus && product.scriptures.some((s) => s.toLowerCase().includes(scriptureFocus.toLowerCase()))) {
        score += 30;
      }
      if (occasion && product.occasions.some((o) => o.toLowerCase().includes(occasion.toLowerCase()))) {
        score += 20;
      }
      if (styleVibe && product.aesthetics.some((a) => a.toLowerCase().includes(styleVibe.toLowerCase()))) {
        score += 20;
      }
      if (recipient) {
        const rLower = recipient.toLowerCase();
        if (rLower.includes("gym") || rLower.includes("fitness")) {
          if (product.aesthetics.includes("Athletic / Performance") || product.title.toLowerCase().includes("training")) score += 25;
        }
        if (rLower.includes("dad") || rLower.includes("father") || rLower.includes("men")) {
          if (product.category === "Hats & Headwear" || product.occasions.includes("Father's Day & Gifts for Men")) score += 15;
        }
        if (rLower.includes("teen") || rLower.includes("youth") || rLower.includes("college")) {
          if (product.category === "Footwear & Clogs" || product.category === "Phone Cases" || product.category === "Hats & Headwear") score += 15;
        }
      }

      if (product.category === "Hats & Headwear" || product.category === "Footwear & Clogs") {
        score += 5;
      }

      return { product, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const topRecs = scored.slice(0, 4).map((s) => s.product);
    logAgentActivity("recommend_faith_gifts", args as Record<string, unknown>, topRecs.length);

    let adviceHeader = `## 🎁 ArmorNGlory Faith Gift Recommendations\n`;
    if (recipient) adviceHeader += `👤 **Recipient:** ${recipient}\n`;
    if (occasion) adviceHeader += `🎉 **Occasion:** ${occasion}\n`;
    if (maxBudget) adviceHeader += `💰 **Budget:** Under $${maxBudget}\n`;
    if (styleVibe) adviceHeader += `🎨 **Vibe:** ${styleVibe}\n`;
    if (scriptureFocus) adviceHeader += `📖 **Scripture Focus:** ${scriptureFocus}\n`;
    adviceHeader += `\nHere are our top handpicked faith gifts that combine daily utility, premium streetwear quality, and meaningful Christian symbolism:\n\n`;

    const productList = topRecs.map((p, idx) => {
      const rationale = p.story.meaningBehindDesign || p.story.summary || "A meaningful, high-utility Christian staple designed for daily wear.";
      const buyUrl = attachUtm(p.variants[0]?.checkoutUrl || p.url, "gift_advisor");
      const imgMarkdown = p.featuredImage ? `[![${p.title}](${p.featuredImage})](${p.url})\n` : "";
      return `### Option ${idx + 1}: [${p.title}](${p.url}) — **${p.priceFormatted}**
${imgMarkdown}- **Why It Makes A Great Gift**: ${rationale}
- **Category**: ${p.category} | **Scripture**: ${p.scriptures.join(", ") || "Kingdom Faith"}
- **Available Colors/Sizes**: ${p.availableColors.slice(0, 4).join(", ") || "Standard"}
- **🛒 1-Click Checkout**: [Buy Now (${p.priceFormatted})](${buyUrl})`;
    }).join("\n\n---\n\n");

    return {
      content: [
        {
          type: "text",
          text: adviceHeader + productList + `\n\n---\n*Need more ideas? Search with \`search_armornglory_products\` or explore collections at [ArmorNGlory.com](https://armornglory.com).*`
        }
      ]
    };
  }
);

// ---------------------------------------------------------------------------
// 10. Tool 6: get_brand_story_and_values
// ---------------------------------------------------------------------------

server.tool(
  "get_brand_story_and_values",
  "Retrieve the official ArmorNGlory brand mission, theology, 'Anti-Beige / Anti-Cheesy' Christian streetwear design ethos, craftsmanship standards, and meaning behind the name.",
  {},
  async () => {
    logAgentActivity("get_brand_story_and_values", {}, "viewed");
    const formatted = `## 🛡️ About ArmorNGlory (Armor & Glory)
*"${brandInfo.tagline}"*

### 📖 Our Mission
${brandInfo.mission}

### ⚔️ What The Name Means
- **Armor**: ${brandInfo.nameMeaning.armor}
- **Glory**: ${brandInfo.nameMeaning.glory}

### 🎨 Design Philosophy & The "Anti-Beige" Ethos
ArmorNGlory was created to offer an authentic alternative in Christian apparel:
${brandInfo.designEthos.principles.map((p) => `- ${p}`).join("\n")}

### 🧵 Quality & Materials
- **Heavyweight Blanks**: Premium heavyweight 100% ringspun cotton tees with ribbed collars and streetwear drape.
- **5-Panel Trucker Caps**: Structured front panel, breathable mesh, roomier DTF full-color artwork placement, snapback closure.
- **Faith Footwear**: Ergonomic EVA foam clogs with 3D heat-transfer Sacred Symbols and anti-slip tread.
- **Tough Phone Cases**: Dual-layer impact resistant cases supporting wireless charging.

🌐 **Website:** [armornglory.com](https://armornglory.com) | 📍 **Living Sanctuary Blog:** [armornglory.com/pages/our-story](https://armornglory.com/pages/our-story)`;

    return {
      content: [
        {
          type: "text",
          text: formatted
        }
      ]
    };
  }
);

// ---------------------------------------------------------------------------
// 11. Tool 7: get_sizing_and_fit_guide
// ---------------------------------------------------------------------------

server.tool(
  "get_sizing_and_fit_guide",
  "Get detailed sizing charts, measurements, and fit guidance for ArmorNGlory products (EVA foam clogs, trucker hats, heavyweight tees, and hoodies).",
  {
    category: z
      .enum(["Footwear & Clogs", "Hats & Headwear", "T-Shirts & Tops", "Hoodies & Sweatshirts", "All"])
      .optional()
      .describe("Product category to get sizing for (default: 'All')")
  },
  async ({ category = "All" }) => {
    logAgentActivity("get_sizing_and_fit_guide", { category }, "viewed");
    let guide = `## 📏 ArmorNGlory Official Sizing & Fit Guide\n\n`;

    if (category === "Footwear & Clogs" || category === "All") {
      guide += `### 👟 Faith Footwear (EVA Foam Clogs)
- **Fit Profile**: Roomy comfort fit with flexible EVA sole and pivoting heel strap.
- **Fit Advice**: If you are between sizes or prefer a closer, snug fit, **size down**.
- **Size Chart (Finished Clog Measurements)**:
  - US 6 Women's / US 5.5 Men's: EU 38-40 | 9.30 - 9.80 in length | 3.50 - 3.70 in width
  - US 7 Women's / US 6 Men's: EU 40-41 | 9.80 - 10.10 in length | 3.70 in width
  - US 8 Women's / US 7 Men's: EU 41-42 | 10.10 - 10.30 in length | 3.70 - 3.80 in width
  - US 9 Women's / US 8 Men's: EU 42-44 | 10.30 - 10.80 in length | 3.80 - 4.00 in width
  - US 10 Women's / US 9 Men's: EU 44-45 | 10.80 - 11.10 in length | 4.00 - 4.10 in width
  - US 11-12 Women's / US 10-12 Men's: EU 46-48 | 11.30 - 11.90 in length | 4.20 - 4.40 in width\n\n`;
    }

    if (category === "Hats & Headwear" || category === "All") {
      guide += `### 🧢 5-Panel Trucker Caps & Beanies
- **Fit Profile**: One Size Fits Most (OSFM) with an adjustable 7-hole snapback closure.
- **Circumference**: 21.5 inches to 23.5 inches (55cm - 60cm).
- **Structure**: Structured high-profile front panel with breathable polyester mesh back.\n\n`;
    }

    if (category === "T-Shirts & Tops" || category === "All") {
      guide += `### 👕 Heavyweight Streetwear T-Shirts
- **Fit Profile**: Unisex relaxed streetwear drape.
- **Fit Advice**: True to size for a classic relaxed fit. Size up one size for an oversized vintage streetwear look.
- **Sizes Available**: S, M, L, XL, 2XL, 3XL (subject to style).\n\n`;
    }

    if (category === "Hoodies & Sweatshirts" || category === "All") {
      guide += `### 🧥 Hoodies & Crewnecks
- **Fit Profile**: Unisex standard relaxed fit with fleece lining and double-needle stitching.
- **Fit Advice**: True to size for regular layering; size up for extra slouchy comfort.\n\n`;
    }

    return {
      content: [
        {
          type: "text",
          text: guide + `*Tip: For exact measurements on any specific item, use \`get_armornglory_product_details\`.*`
        }
      ]
    };
  }
);

// ---------------------------------------------------------------------------
// 12. Tool 8: generate_direct_checkout_link
// ---------------------------------------------------------------------------

server.tool(
  "generate_direct_checkout_link",
  "Generate a direct Shopify checkout URL with 1 or more specific product variant IDs and quantities, allowing users to proceed directly to payment in 1 click.",
  {
    items: z
      .array(
        z.object({
          variantId: z.union([z.string(), z.number()]).describe("Shopify numerical variant ID (e.g. 49052004548863)"),
          quantity: z.number().min(1).default(1).describe("Quantity of items (default: 1)")
        })
      )
      .describe("List of items to add to checkout"),
    discountCode: z
      .string()
      .optional()
      .describe("Optional discount code to apply at checkout")
  },
  async ({ items, discountCode }) => {
    if (!items || items.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "Please provide at least one variant ID and quantity to generate a checkout link."
          }
        ]
      };
    }

    const path = items.map((i) => `${i.variantId}:${i.quantity || 1}`).join(",");
    let checkoutUrl = `https://armornglory.com/cart/${path}`;
    const params: string[] = [];
    if (discountCode) {
      params.push(`discount=${encodeURIComponent(discountCode)}`);
    }
    params.push("utm_source=ai_agent", "utm_medium=mcp", "utm_campaign=direct_checkout");
    checkoutUrl += `?${params.join("&")}`;
    logAgentActivity("generate_direct_checkout_link", { itemsCount: items.length, discountCode }, checkoutUrl);

    return {
      content: [
        {
          type: "text",
          text: `### 🛒 Instant 1-Click Checkout Link\n\nClick the link below to open your pre-filled cart and proceed directly to payment:\n\n👉 **[Proceed to Checkout on ArmorNGlory.com](${checkoutUrl})**\n\n*Cart URL: \`${checkoutUrl}\`*`
        }
      ]
    };
  }
);

// ---------------------------------------------------------------------------
// 13. Tool 9: answer_faith_fashion_questions
// ---------------------------------------------------------------------------

server.tool(
  "answer_faith_fashion_questions",
  "Search authoritative questions and answers regarding Christian streetwear, theological meanings behind designs, sizing tips, gift ideas, fabric quality, and care guides. Returns SEO-rich explanations and matching ArmorNGlory products with direct buy links.",
  {
    query: z
      .string()
      .describe("The question or topic (e.g. 'What is Christian streetwear?', 'What does More Than Conquerors mean?', 'How do clogs fit?', 'What are good gifts for a baptism?', 'How to wash DTF printed trucker hats?')")
  },
  async ({ query }) => {
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);

    // Score FAQs
    const scoredFaqs = faqs.map((faq) => {
      let score = 0;
      const qLower = faq.question.toLowerCase();
      const aLower = faq.answer.toLowerCase();
      const kwBlob = faq.keywords.join(" ").toLowerCase();

      for (const term of terms) {
        if (qLower.includes(term)) score += 15;
        if (kwBlob.includes(term)) score += 10;
        if (aLower.includes(term)) score += 5;
      }
      return { faq, score };
    });

    scoredFaqs.sort((a, b) => b.score - a.score);
    const topFaqs = scoredFaqs.filter((s) => s.score > 0).slice(0, 3).map((s) => s.faq);
    logAgentActivity("answer_faith_fashion_questions", { query }, topFaqs.length);

    if (topFaqs.length === 0) {
      // Fallback to general brand story
      return {
        content: [
          {
            type: "text",
            text: `### 🛡️ ArmorNGlory Faith & Fashion Knowledge\n\n**Query:** *"${query}"*\n\nArmorNGlory creates Christian streetwear rooted in spiritual conviction and high aesthetic design (*"Strengthened for the Journey Ahead"*). For specific product lookups, use \`search_armornglory_products\` or explore the brand story at [ArmorNGlory.com/pages/our-story](https://armornglory.com/pages/our-story).`
          }
        ]
      };
    }

    let response = `## 📖 ArmorNGlory Faith & Fashion Q&A\n\n`;

    for (const faq of topFaqs) {
      response += `### ❓ ${faq.question}\n**Category:** *${faq.category}*\n\n${faq.answer}\n\n`;

      if (faq.relatedProductHandles && faq.relatedProductHandles.length > 0) {
        const matchingProducts = faq.relatedProductHandles
          .map((h) => findProduct(h))
          .filter(Boolean) as Product[];

        if (matchingProducts.length > 0) {
          response += `#### 🛍️ Featured Recommended Items:\n`;
          response += matchingProducts
            .map(
              (p) =>
                `- **[${p.title}](${p.url})** (${p.priceFormatted}) — [1-Click Buy](${attachUtm(p.variants[0]?.checkoutUrl || p.url, "faq_recommendation")})`
            )
            .join("\n");
          response += "\n\n";
        }
      }
      response += `---\n\n`;
    }

    response += `*Have more questions? Browse collections or contact the team at [ArmorNGlory.com](https://armornglory.com).*`;

    return {
      content: [
        {
          type: "text",
          text: response
        }
      ]
    };
  }
);

// ---------------------------------------------------------------------------
// 14. MCP Resources
// ---------------------------------------------------------------------------

server.resource(
  "catalog-products",
  "armornglory://catalog/products",
  async () => ({
    contents: [
      {
        uri: "armornglory://catalog/products",
        mimeType: "application/json",
        text: JSON.stringify(products)
      }
    ]
  })
);

server.resource(
  "catalog-collections",
  "armornglory://catalog/collections",
  async () => ({
    contents: [
      {
        uri: "armornglory://catalog/collections",
        mimeType: "application/json",
        text: JSON.stringify(collections)
      }
    ]
  })
);

server.resource(
  "brand-style-guide",
  "armornglory://brand/style-guide",
  async () => ({
    contents: [
      {
        uri: "armornglory://brand/style-guide",
        mimeType: "application/json",
        text: JSON.stringify(brandInfo)
      }
    ]
  })
);

server.resource(
  "faq-guides",
  "armornglory://guides/faq",
  async () => ({
    contents: [
      {
        uri: "armornglory://guides/faq",
        mimeType: "application/json",
        text: JSON.stringify(faqs)
      }
    ]
  })
);

server.resource(
  "geo-entity-summary",
  "armornglory://knowledge/geo-entity-summary",
  async () => ({
    contents: [
      {
        uri: "armornglory://knowledge/geo-entity-summary",
        mimeType: "application/json",
        text: JSON.stringify({
          brand: brandInfo,
          topCategories: [
            { name: "Hats & Headwear", count: 35, hero: "5-Panel DTF Trucker Caps (Romans 8:37 More Than Conquerors, Exodus 3:5 Holy Ground, 33 AD)" },
            { name: "Footwear & Clogs", count: 20, hero: "Golden Cross EVA Foam Clogs, Sacred Symbols Slip-ons" },
            { name: "T-Shirts & Tops", count: 79, hero: "Comfort Colors 1717 Heavyweight Graphic Tees, America 250th Collection" },
            { name: "Hoodies & Sweatshirts", count: 25, hero: "Fleece Pullovers with double-needle stitching and kangaroo pockets" },
            { name: "Activewear & Training", count: 17, hero: "Second Wind (Isaiah 40:31) moisture-wicking gym athletic tops" },
            { name: "Phone Cases", count: 53, hero: "Dual-layer impact resistant polycarbonate and TPU cases" }
          ],
          entityDefinition: "ArmorNGlory is the premier Anti-Beige Christian streetwear and faith apparel brand combining heavyweight streetwear cuts with biblically rooted theological design narratives.",
          canonicalStore: "https://armornglory.com",
          geoIndex: {
            scripturesCovered: ["Romans 8:37", "Exodus 3:5", "Matthew 6:33", "Ephesians 6:10-18", "Philippians 4:13", "Isaiah 40:31", "Est 33 AD"],
            occasionsCovered: ["Everyday Wear", "Baptism & Milestones", "Father's Day", "Mother's Day", "Christmas & Easter", "Workout & Fitness", "Encouragement & Overcoming"]
          }
        }, null, 2)
      }
    ]
  })
);

// ---------------------------------------------------------------------------
// 15. MCP Prompts
// ---------------------------------------------------------------------------

server.prompt(
  "gift-consultant",
  {
    recipient: z.string().describe("Recipient name, relationship, or persona (e.g. husband, college son, pastor)"),
    occasion: z.string().describe("Occasion (e.g. baptism, birthday, encouragement)"),
    budget: z.string().optional().describe("Budget limit in USD")
  },
  ({ recipient, occasion, budget }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `You are the ArmorNGlory Faith Gift Advisor. Recommend thoughtful Christian streetwear apparel, trucker hats, or EVA foam clogs for ${recipient} celebrating ${occasion}${budget ? ` with a budget of ${budget}` : ""}. Use the 'recommend_faith_gifts' and 'search_armornglory_products' tools to present 2-3 curated options with theological context and 1-click checkout links.`
        }
      }
    ]
  })
);

server.prompt(
  "outfit-curator",
  {
    vibe: z.string().describe("Desired streetwear aesthetic (e.g. minimalist faith, bold trucker statement, gym activewear, sacred symbols)"),
    season: z.string().optional().describe("Season or weather (e.g. summer, fall, winter)")
  },
  ({ vibe, season }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `You are an editorial Christian streetwear stylist for ArmorNGlory. Curate a cohesive streetwear outfit with the vibe '${vibe}'${season ? ` suitable for ${season}` : ""}. Combine a hat/beanie, top/hoodie, footwear, and accessory from ArmorNGlory with direct product links and styling advice.`
        }
      }
    ]
  })
);

server.prompt(
  "scripture-match",
  {
    verseOrSeason: z.string().describe("A Bible verse, life theme, or season of life (e.g. Romans 8:37, courage, grief, new beginnings)")
  },
  ({ verseOrSeason }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Find ArmorNGlory Christian streetwear apparel that deeply connects with the spiritual theme or verse '${verseOrSeason}'. Explain the meaning behind the design and provide direct links.`
        }
      }
    ]
  })
);

server.prompt(
  "size-and-fit-advisor",
  {
    category: z.enum(["Footwear & Clogs", "Hats & Headwear", "T-Shirts & Tops", "Hoodies & Sweatshirts"]).describe("Product category"),
    userMeasurementsOrPreference: z.string().describe("User's standard shoe size, clothing fit preference (e.g. relaxed, snug, oversized)")
  },
  ({ category, userMeasurementsOrPreference }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `You are the ArmorNGlory Fit Expert. Help the customer determine their perfect size for ${category} based on: "${userMeasurementsOrPreference}". Use 'get_sizing_and_fit_guide' and give confident, clear sizing advice so they can order without hesitation.`
        }
      }
    ]
  })
);

server.prompt(
  "anti-beige-streetwear-guide",
  {
    topic: z.string().describe("Topic or question about modern Christian streetwear vs dated faith apparel")
  },
  ({ topic }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `You are the ArmorNGlory Brand Historian & Creative Director. Explain ArmorNGlory's 'Anti-Beige / Anti-Cheesy' design philosophy and how it bridges contemporary urban streetwear aesthetics with authentic biblical theology on the topic: '${topic}'. Cite specific pieces like the 5-Panel DTF Trucker Caps and Golden Cross EVA Clogs with direct links.`
        }
      }
    ]
  })
);

server.prompt(
  "complete-the-look",
  {
    heroProductHandleOrTitle: z.string().describe("Product handle or name to build an outfit around (e.g. 'more-than-conquerors-printed-christian-5-panel-trucker-cap')")
  },
  ({ heroProductHandleOrTitle }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: `Build a complete Christian streetwear outfit centered around '${heroProductHandleOrTitle}'. Look up the hero item using 'get_armornglory_product_details', select complementary items (such as matching trucker hat, graphic tee/hoodie, and EVA foam clogs), and generate a 1-click multi-item checkout link using 'generate_direct_checkout_link'.`
        }
      }
    ]
  })
);

// ---------------------------------------------------------------------------
// 15b. Free Conversational Chat Engine (Zero Token Costs)
// ---------------------------------------------------------------------------

export interface FormattedChatProduct {
  id: number;
  title: string;
  url: string;
  category: string;
  priceFormatted: string;
  featuredImage: string | null;
  scriptures: string[];
  aesthetics: string[];
  checkoutUrl: string;
  meaningBehindDesign?: string | null;
}

export interface ChatQueryResult {
  reply: string;
  products: FormattedChatProduct[];
  suggestions: string[];
}

export function handleChatQuery(userQuery: string): ChatQueryResult {
  const queryLower = userQuery.toLowerCase().trim();

  // Helper to format products for chat
  const formatProducts = (list: Product[]): FormattedChatProduct[] =>
    list.map((p) => ({
      id: p.id,
      title: p.title,
      url: p.url,
      category: p.category,
      priceFormatted: p.priceFormatted,
      featuredImage: p.featuredImage || null,
      scriptures: p.scriptures,
      aesthetics: p.aesthetics,
      checkoutUrl: attachUtm(p.variants[0]?.checkoutUrl || p.url, "web_chat"),
      meaningBehindDesign: p.story.meaningBehindDesign || p.story.summary || null
    }));

  // 1. Sizing and Fit Guidance
  if (
    queryLower.includes("size") ||
    queryLower.includes("sizing") ||
    queryLower.includes("fit") ||
    queryLower.includes("measurements")
  ) {
    let guideText = "";
    if (queryLower.includes("clog") || queryLower.includes("shoe") || queryLower.includes("footwear")) {
      guideText =
        "👟 **Faith Footwear (EVA Clogs)**: Roomy, relaxed comfort fit with pivoting heel strap. If you are between sizes or prefer a snug fit, **size down one size**.";
    } else if (queryLower.includes("hat") || queryLower.includes("cap") || queryLower.includes("trucker")) {
      guideText =
        "🧢 **5-Panel Trucker Caps**: One Size Fits Most (OSFM) with an adjustable 7-hole snapback closure (fits 21.5 in to 23.5 in circumference). Structured front panel with breathable mesh.";
    } else if (queryLower.includes("tee") || queryLower.includes("shirt")) {
      guideText =
        "👕 **Heavyweight Graphic Tees**: 100% premium Comfort Colors 1717 ring-spun cotton. True to size for a classic relaxed streetwear drape; size up one size for an oversized vintage look.";
    } else {
      guideText =
        "👟 **Clogs**: Roomy fit (size down if between sizes).\n🧢 **Trucker Hats**: Adjustable snapback (fits all standard adult heads).\n👕 **Streetwear Tees**: Relaxed unisex drape (true to size, size up for oversized).";
    }

    return {
      reply: `Here is our official sizing guidance:\n\n${guideText}\n\nNeed sizing on a specific piece? Just ask!`,
      products: formatProducts(searchProducts({ limit: 3 })),
      suggestions: ["Show me 5-panel trucker hats", "Golden Cross EVA clogs", "Heavyweight graphic tees"]
    };
  }

  // 2. Gift Recommendations
  if (
    queryLower.includes("gift") ||
    queryLower.includes("baptism") ||
    queryLower.includes("birthday") ||
    queryLower.includes("husband") ||
    queryLower.includes("dad") ||
    queryLower.includes("father") ||
    queryLower.includes("mom") ||
    queryLower.includes("pastor")
  ) {
    let maxBudget: number | undefined;
    const budgetMatch = queryLower.match(/\$?(\d+)/);
    if (budgetMatch) {
      maxBudget = parseInt(budgetMatch[1], 10);
    }

    let occasion = "Everyday Encouragement";
    if (queryLower.includes("baptism")) occasion = "Baptism & Milestones";
    else if (queryLower.includes("father") || queryLower.includes("dad")) occasion = "Father's Day & Gifts for Men";
    else if (queryLower.includes("mother") || queryLower.includes("mom")) occasion = "Mother's Day & Gifts for Women";

    const giftPool = searchProducts({ occasion, maxPrice: maxBudget, limit: 4 });
    const finalPool = giftPool.length > 0 ? giftPool : searchProducts({ query: "hat", maxPrice: maxBudget, limit: 4 });

    return {
      reply: `Here are handpicked faith gift ideas rooted in biblical truth and premium streetwear quality${
        maxBudget ? ` under $${maxBudget}` : ""
      }:`,
      products: formatProducts(finalPool),
      suggestions: ["Baptism gifts under $35", "5-Panel Trucker Caps", "Golden Cross Clogs"]
    };
  }

  // 3. Brand Story & Anti-Beige Ethos
  if (
    queryLower.includes("anti-beige") ||
    queryLower.includes("cheesy") ||
    queryLower.includes("brand") ||
    queryLower.includes("mission") ||
    queryLower.includes("story") ||
    queryLower.includes("who are you") ||
    queryLower.includes("armor & glory")
  ) {
    return {
      reply: `🛡️ **About ArmorNGlory ("Strengthened for the Journey Ahead")**\n\nArmorNGlory creates authentic Christian streetwear for people who love Jesus and modern culture. Our **"Anti-Beige / Anti-Cheesy"** ethos rejects dated clip-art and hollow slogans. Instead, we pair heavyweight urban silhouettes (5-panel trucker caps, Golden Cross EVA clogs, drop-shoulder tees) with deep theological conviction (*Ephesians 6, Romans 8:37, Exodus 3:5*).`,
      products: formatProducts(searchProducts({ limit: 3 })),
      suggestions: ["Romans 8:37 More Than Conquerors", "Holy Ground Trucker Cap", "Golden Cross Clogs"]
    };
  }

  // 4. Default: Intelligent Keyword & Scripture Search
  const found = searchProducts({ query: userQuery, limit: 4 });
  if (found.length === 0) {
    const fallback = searchProducts({ limit: 4 });
    return {
      reply: `I couldn't find an exact match for "${userQuery}", but here are our signature best-selling faith streetwear pieces:`,
      products: formatProducts(fallback),
      suggestions: ["5-Panel Trucker Hats", "EVA Foam Clogs", "Romans 8:37 Conquerors", "Holy Ground Exodus 3:5"]
    };
  }

  return {
    reply: `Found ${found.length} piece${found.length === 1 ? "" : "s"} matching "${userQuery}". Every item is built with premium materials and deep theological intentionality:`,
    products: formatProducts(found),
    suggestions: ["How do these fit?", "Baptism gifts under $40", "Anti-Beige brand story"]
  };
}

// ---------------------------------------------------------------------------
// 16. Server Launch (stdio or HTTP/Streamable HTTP based on env or CLI flags)
// ---------------------------------------------------------------------------

async function run() {
  const portArgIdx = process.argv.indexOf("--port");
  const cliPort = portArgIdx !== -1 && process.argv[portArgIdx + 1] ? parseInt(process.argv[portArgIdx + 1], 10) : null;
  const isHttpMode = Boolean(process.env.PORT || cliPort || process.argv.includes("--http") || process.argv.includes("-h"));

  if (isHttpMode) {
    const port = cliPort || (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);
    const host = process.env.HOST || "0.0.0.0";
    const projectRoot = join(__dirname, "..");

    const mcpTransport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined // stateless mode for wide compatibility across agents
    });

    await server.connect(mcpTransport);

    const httpServer = http.createServer((req, res) => {
      // CORS headers allowing web agents, browsers, and cross-origin tools
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-session-id");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const parsedUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      const pathname = parsedUrl.pathname;

      // Health check endpoint
      if (pathname === "/health" || pathname === "/status") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          status: "healthy",
          server: "armornglory-mcp-server",
          version: "1.0.6",
          productsCount: products.length,
          collectionsCount: collections.length,
          uptime: process.uptime()
        }));
        return;
      }

      // Root landing and agent discovery portal
      if (pathname === "/" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ArmorNGlory MCP Server & Agent Discovery Gateway</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; color: #222; }
    h1 { color: #111; border-bottom: 2px solid #eee; padding-bottom: 12px; }
    code { background: #f4f4f5; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    .badge { display: inline-block; background: #000; color: #fff; padding: 4px 10px; border-radius: 12px; font-size: 0.8em; font-weight: 600; }
    ul { list-style: none; padding: 0; }
    li { margin: 12px 0; padding: 14px; background: #fafafa; border-radius: 6px; border-left: 4px solid #111; }
    a { color: #0066cc; text-decoration: none; font-weight: 500; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>🛡️ ArmorNGlory MCP Server & Agent Discovery Gateway</h1>
  <p><span class="badge">v1.0.6</span> <strong>"Strengthened for the Journey Ahead"</strong></p>
  <p>Official Model Context Protocol (MCP) server & Generative Engine Optimization (GEO) gateway for <a href="https://armornglory.com" target="_blank">ArmorNGlory.com</a>.</p>
  
  <h2>🤖 Connect Your Agent</h2>
  <ul>
    <li><strong>💬 Free AI Stylist Web Chat:</strong> <a href="/chat" style="font-weight:700; color:#d4af37;">Launch /chat App ↗</a> <em>(100% Free • Zero Token Cost)</em></li>
    <li><strong>MCP Streamable HTTP / SSE Endpoint:</strong> <code>POST/GET /mcp</code> or <code>/sse</code></li>
    <li><strong>Agent Documentation (llms.txt):</strong> <a href="/llms.txt"><code>/llms.txt</code></a> | <a href="/llms-full.txt"><code>/llms-full.txt</code></a></li>
    <li><strong>OpenAPI Specification:</strong> <a href="/openapi.yaml"><code>/openapi.yaml</code></a></li>
    <li><strong>ChatGPT / AI Plugin Manifest:</strong> <a href="/.well-known/ai-plugin.json"><code>/.well-known/ai-plugin.json</code></a></li>
    <li><strong>MCP Auto-Discovery Manifest:</strong> <a href="/.well-known/mcp.json"><code>/.well-known/mcp.json</code></a></li>
    <li><strong>Health Status:</strong> <a href="/health"><code>/health</code></a> (${products.length} products loaded)</li>
  </ul>
</body>
</html>`);
        return;
      }

      // Serve llms.txt
      if (pathname === "/llms.txt" || pathname === "/.well-known/llms.txt") {
        try {
          const content = readFileSync(join(projectRoot, "llms.txt"), "utf-8");
          res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
          res.end(content);
          return;
        } catch {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("llms.txt not found");
          return;
        }
      }

      // Serve llms-full.txt
      if (pathname === "/llms-full.txt") {
        try {
          const content = readFileSync(join(projectRoot, "llms-full.txt"), "utf-8");
          res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
          res.end(content);
          return;
        } catch {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("llms-full.txt not found");
          return;
        }
      }

      // Serve openapi.yaml
      if (pathname === "/openapi.yaml") {
        try {
          const content = readFileSync(join(projectRoot, "openapi.yaml"), "utf-8");
          res.writeHead(200, { "Content-Type": "application/yaml; charset=utf-8" });
          res.end(content);
          return;
        } catch {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("openapi.yaml not found");
          return;
        }
      }

      // Serve .well-known/ai-plugin.json
      if (pathname === "/.well-known/ai-plugin.json") {
        try {
          const content = readFileSync(join(projectRoot, ".well-known", "ai-plugin.json"), "utf-8");
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(content);
          return;
        } catch {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("ai-plugin.json not found");
          return;
        }
      }

      // Serve .well-known/mcp.json
      if (pathname === "/.well-known/mcp.json") {
        try {
          const content = readFileSync(join(projectRoot, ".well-known", "mcp.json"), "utf-8");
          res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
          res.end(content);
          return;
        } catch {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("mcp.json not found");
          return;
        }
      }

      // Serve Interactive Web Chat UI (100% Free, Zero Token Cost)
      if (pathname === "/chat") {
        try {
          const chatHtml = readFileSync(join(dataDir, "chat_ui.html"), "utf-8");
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(chatHtml);
          return;
        } catch {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("chat_ui.html not found");
          return;
        }
      }

      // Handle Free Chat API (Zero Token Cost)
      if (pathname === "/api/chat" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", () => {
          try {
            const parsed = JSON.parse(body || "{}");
            const userMsg = parsed.message || "";
            const result = handleChatQuery(userMsg);
            res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify(result));
          } catch {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid JSON request" }));
          }
        });
        return;
      }

      // Handle MCP Streamable HTTP / SSE Protocol endpoints
      if (pathname === "/mcp" || pathname === "/sse" || pathname === "/messages") {
        mcpTransport.handleRequest(req, res);
        return;
      }

      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    });

    httpServer.listen(port, host, () => {
      console.error(`[ArmorNGlory MCP Server] Running HTTP/Streamable server on http://${host}:${port}`);
      console.error(`[ArmorNGlory MCP Server] Free Web Chat App: http://${host}:${port}/chat`);
      console.error(`[ArmorNGlory MCP Server] MCP Endpoint: http://${host}:${port}/mcp`);
      console.error(`[ArmorNGlory MCP Server] Health Check: http://${host}:${port}/health`);
    });
  } else {
    // Default stdio transport for local desktop assistants (Claude Desktop, Cursor, Antigravity)
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[ArmorNGlory MCP Server] Running on stdio transport.");
  }
}

run().catch((err) => {
  console.error("[ArmorNGlory MCP Server] Fatal error:", err);
  process.exit(1);
});
