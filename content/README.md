# ArmorNGlory GEO Content Kit

Generated 2026-10-13 from `data/products.json` (324 products). Regenerate any time with:

```bash
npm run sync-data && npm run content
```

These articles target the questions shoppers ask AI assistants. Today those answers cite "best Christian streetwear" listicles, not ArmorNGlory, because armornglory.com has no apparel-focused articles yet (the current blogs cover home decor and church visits).

| File | Target questions |
|---|---|
| `articles/modern-christian-streetwear-guide.html` | Modern Christian Streetwear That Isn't Cheesy: A 2026 Buyer's Guide |
| `articles/christian-trucker-hats-scripture-caps.html` | Christian Trucker Hats & Scripture Caps: The Meaning Behind Each Design |
| `articles/christian-eva-foam-clogs-faith-slip-ons.html` | Christian EVA Foam Clogs: Faith-Inspired Slip-Ons (and How They Fit) |
| `articles/meaningful-baptism-gifts.html` | Meaningful Baptism Gifts for Men, Women & Teens (That They'll Actually Use) |
| `articles/bible-verse-clothing-by-scripture.html` | Bible Verse Clothing by Scripture: Shirts, Hoodies & Hats for Your Favorite Verse |

## How to publish (about 5 minutes per article)
1. Shopify Admin → **Online Store → Blog posts → Create blog post**. Create a new blog called **"Style Guides"** (handle `style-guides`) the first time.
2. Copy the **Title** from the comment at the top of the file.
3. Click the **`</>` (Show HTML)** button in the editor and paste everything *below* the comment.
4. Under **Search engine listing**: paste the **meta description** and set the **URL handle** shown in the comment.
5. Add the suggested tags, a featured image (a product lifestyle shot), and publish.
6. Link the "Style Guides" blog from the main menu or footer so crawlers find it.

> [!NOTE]
> Each article ends with a `<script type="application/ld+json">` FAQ block. If Shopify's editor strips it, the visible FAQ section still works for AI engines; you can add FAQ schema later via the theme snippet in `content/theme/`.

## After publishing
- Bing Webmaster Tools → URL Submission: submit each article URL (ChatGPT Search and Copilot use Bing's index).
- Google Search Console → URL Inspection → Request indexing.
- Re-run `npm run content` after big catalog changes and update the articles so prices and products stay current.
