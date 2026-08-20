#!/usr/bin/env node

/**
 * ArmorNGlory MCP Server
 * 
 * Official Model Context Protocol server for ArmorNGlory.com —
 * allowing external AI assistants (Claude Desktop, Cursor, Antigravity, ChatGPT, Gemini, Windsurf)
 * to natively discover, recommend, style, and generate instant checkout links
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
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync } from "fs";
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataDir = join(__dirname, "..", "data");

let products: Product[] = [];
let collections: Collection[] = [];
let brandInfo: BrandInfo;

try {
  const productsRaw = readFileSync(join(dataDir, "products.json"), "utf-8");
  products = JSON.parse(productsRaw) as Product[];

  const collectionsRaw = readFileSync(join(dataDir, "collections.json"), "utf-8");
  collections = JSON.parse(collectionsRaw) as Collection[];

  const brandRaw = readFileSync(join(dataDir, "brand_info.json"), "utf-8");
  brandInfo = JSON.parse(brandRaw) as BrandInfo;

  console.error(`[ArmorNGlory MCP] Loaded ${products.length} products, ${collections.length} collections.`);
} catch (err) {
  console.error("[ArmorNGlory MCP] ERROR: Could not load data files from " + dataDir, err);
  process.exit(1);
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

function formatProductSummary(p: Product): string {
  const scriptText = p.scriptures.length > 0 ? `\n- **Scripture / Theme**: ${p.scriptures.join(", ")}` : "";
  const aestheticText = p.aesthetics.length > 0 ? `\n- **Style / Aesthetic**: ${p.aesthetics.join(", ")}` : "";
  const meaningSnippet = p.story.meaningBehindDesign ? `\n- **Design Meaning**: ${p.story.meaningBehindDesign}` : "";
  const buyUrl = p.variants[0]?.checkoutUrl || p.url;

  return `### [${p.title}](${p.url})
- **Category**: ${p.category} | **Price**: ${p.priceFormatted}${scriptText}${aestheticText}${meaningSnippet}
- **Colors**: ${p.availableColors.slice(0, 5).join(", ") || "Standard"}
- **Product Link**: ${p.url}
- **Direct 1-Click Buy**: [Add to Cart & Checkout](${buyUrl})`;
}

function formatProductDetail(p: Product): string {
  const scriptures = p.scriptures.length > 0 ? p.scriptures.join(", ") : "Faith-inspired Christian Streetwear";
  const aesthetics = p.aesthetics.join(", ");
  const occasions = p.occasions.join(", ");

  let variantsList = p.variants
    .slice(0, 10)
    .map(
      (v) =>
        `  - **${v.title}**: ${v.priceFormatted} ${v.available ? "✅ In Stock" : "❌ Out of Stock"} — [Instant Buy Link](${v.checkoutUrl})`
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

  return `## [${p.title}](${p.url})
**Price:** ${p.priceFormatted} | **Category:** ${p.category} | **SKU / ID:** ${p.id}
**Scriptural Reference:** ${scriptures}
**Aesthetic:** ${aesthetics} | **Ideal Occasions:** ${occasions}

${storySections}

### 🛒 Available Options & 1-Click Checkout
${variantsList}

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

    // Filter products matching collection tags or category
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

    // Search with combined intent
    let filtered = products;

    if (maxBudget) {
      filtered = filtered.filter((p) => p.minPrice <= maxBudget);
    }

    // Score products based on matching criteria
    const scored = filtered.map((product) => {
      let score = 0;
      const combined = `${product.title} ${product.rawBody} ${product.tags.join(" ")} ${product.aesthetics.join(" ")} ${product.occasions.join(" ")}`.toLowerCase();

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

      // Base popularity boost for signature categories (Trucker Caps & Clogs)
      if (product.category === "Hats & Headwear" || product.category === "Footwear & Clogs") {
        score += 5;
      }

      return { product, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const topRecs = scored.slice(0, 4).map((s) => s.product);

    let adviceHeader = `## 🎁 ArmorNGlory Faith Gift Recommendations\n`;
    if (recipient) adviceHeader += `👤 **Recipient:** ${recipient}\n`;
    if (occasion) adviceHeader += `🎉 **Occasion:** ${occasion}\n`;
    if (maxBudget) adviceHeader += `💰 **Budget:** Under $${maxBudget}\n`;
    if (styleVibe) adviceHeader += `🎨 **Vibe:** ${styleVibe}\n`;
    if (scriptureFocus) adviceHeader += `📖 **Scripture Focus:** ${scriptureFocus}\n`;
    adviceHeader += `\nHere are our top handpicked faith gifts that combine daily utility, premium streetwear quality, and meaningful Christian symbolism:\n\n`;

    const productList = topRecs.map((p, idx) => {
      const rationale = p.story.meaningBehindDesign || p.story.summary || "A meaningful, high-utility Christian staple designed for daily wear.";
      return `### Option ${idx + 1}: [${p.title}](${p.url}) — **${p.priceFormatted}**
- **Why It Makes A Great Gift**: ${rationale}
- **Category**: ${p.category} | **Scripture**: ${p.scriptures.join(", ") || "Kingdom Faith"}
- **Available Colors/Sizes**: ${p.availableColors.slice(0, 4).join(", ") || "Standard"}
- **1-Click Checkout**: [Buy Now (${p.priceFormatted})](${p.variants[0]?.checkoutUrl || p.url})`;
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
    if (discountCode) {
      checkoutUrl += `?discount=${encodeURIComponent(discountCode)}`;
    }

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
// 13. MCP Resources
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

// ---------------------------------------------------------------------------
// 14. MCP Prompts
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

// ---------------------------------------------------------------------------
// 15. Start stdio Transport
// ---------------------------------------------------------------------------

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[ArmorNGlory MCP Server] Running on stdio transport.");
}

run().catch((err) => {
  console.error("[ArmorNGlory MCP Server] Fatal error:", err);
  process.exit(1);
});
