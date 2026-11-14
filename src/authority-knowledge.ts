/**
 * ArmorNGlory Authority Knowledge Base — Scripture Concordance, Christian Symbolism & Editorial Style Guides
 *
 * Positions the MCP server not just as a store catalog, but as an authoritative reference ("Source of Truth")
 * for Scripture-rooted streetwear, Christian visual symbolism, faith milestone gifting, and garment craftsmanship.
 * All store policy and product claims strictly match verified live data from armornglory.com.
 */

import type { Product } from "./catalog-sync.js";

export interface ConcordanceEntry {
  id: string;
  reference: string;
  title: string;
  themes: string[];
  lifeSeasons: string[];
  theologicalMeaning: string;
  streetwearContext: string;
}

export interface AuthorityGuide {
  id: string;
  slug: string;
  title: string;
  canonicalUrl: string;
  summary: string;
  keywords: string[];
  bodyMarkdown: string;
  matchCategory?: string;
  matchQuery?: string;
}

export const SCRIPTURE_AND_SYMBOL_CONCORDANCE: ConcordanceEntry[] = [
  {
    id: "romans-8-37",
    reference: "Romans 8:37",
    title: "More Than Conquerors (Hypernikomen)",
    themes: ["victory", "perseverance", "courage", "strength", "hardship", "athletes", "overcoming"],
    lifeSeasons: ["Facing adversity or trial", "Athletic training & competition", "Baptism & Men's gifts"],
    theologicalMeaning:
      "Paul uses the Greek compound verb 'hypernikomen' ('to be overwhelmingly victorious') in Romans 8:37 — teaching that Christian victory is not the absence of suffering, pressure, or grief, but the unbreakable grip of Christ's love holding believers through every trial.",
    streetwearContext:
      "Often paired with classical victory laurels and cross iconography on structured 5-panel trucker caps, heavyweight hoodies, and dual-layer phone cases."
  },
  {
    id: "exodus-3-5",
    reference: "Exodus 3:5",
    title: "Holy Ground & The Burning Bush",
    themes: ["reverence", "presence", "calling", "sacred spaces", "burning bush", "worship"],
    lifeSeasons: ["Discerning a new calling", "Everyday work as worship", "Creative & ministry leadership"],
    theologicalMeaning:
      "At Mount Horeb, God tells Moses from the unconsumed burning bush to remove his sandals because the ground is holy — not because the desert soil changed, but because God's presence was there. In Christian theology, every ordinary space becomes sacred ground when lived before God.",
    streetwearContext:
      "Rendered with richly textured flame, desert botanical, and bold editorial typography across 5-panel DTF caps and graphic tees."
  },
  {
    id: "ephesians-6-10-18",
    reference: "Ephesians 6:10-18",
    title: "The Whole Armor of God",
    themes: ["spiritual warfare", "conviction", "truth", "faith", "shield of faith", "stand firm", "armor"],
    lifeSeasons: ["Standing firm under pressure", "Youth & college transition", "Daily spiritual discipline"],
    theologicalMeaning:
      "The namesake passage of ArmorNGlory ('Armor & Glory'). Paul calls believers to be strengthened in the Lord and put on truth, righteousness, the gospel of peace, the shield of faith, salvation, and the word of God — standing firm with quiet, grounded conviction rather than hostility.",
    streetwearContext:
      "Inspires the 'Urban Sacred' and 'Gothic Faith' aesthetic lines: heraldic shield marks, architectural linework, and structured heavyweight silhouettes."
  },
  {
    id: "matthew-6-33",
    reference: "Matthew 6:33",
    title: "Kingdom First (Seek First the Kingdom)",
    themes: ["priorities", "focus", "peace", "anti-anxiety", "stewardship", "kingdom over culture"],
    lifeSeasons: ["Overcoming worry about the future", "Career & graduation milestones", "New year reset"],
    theologicalMeaning:
      "In the Sermon on the Mount, Jesus answers human anxiety about food, clothing, and tomorrow not by dismissing real needs, but by reordering priorities: seeking God's reign and righteousness first rather than chasing temporary cultural approval.",
    streetwearContext:
      "Minimalist typographic crests and 'Kingdom Over Culture' snapbacks built for daily wear in work, campus, and city settings."
  },
  {
    id: "isaiah-40-31",
    reference: "Isaiah 40:31",
    title: "Second Wind (Renewed Strength)",
    themes: ["endurance", "running", "gym", "burnout", "fatigue", "waiting on god", "eagles"],
    lifeSeasons: ["Marathon & gym training", "Recovering from burnout", "Long seasons of waiting"],
    theologicalMeaning:
      "Spoken to weary exiles, Isaiah 40:31 promises supernatural endurance — soaring, running without growing weary, and walking without fainting — to those who wait upon the Lord rather than relying solely on self-generated grit.",
    streetwearContext:
      "Anchors the 'Second Wind' Activewear & Faith Training collection alongside breathable athletic tops and heavyweight gym pump covers."
  },
  {
    id: "est-33-ad",
    reference: "Est 33 AD",
    title: "Est. 33 AD — The Empty Tomb & Resurrection",
    themes: ["resurrection", "easter", "gospel", "history", "empty tomb", "cross", "subtle faith"],
    lifeSeasons: ["Easter & Holy Week", "Baptism & new believers", "Subtle everyday conversation starters"],
    theologicalMeaning:
      "33 AD marks the traditional historical year of Jesus Christ's crucifixion, burial, and bodily resurrection in Jerusalem — grounding Christian hope in a real event in human history rather than abstract philosophy.",
    streetwearContext:
      "A cornerstone of 'Anti-Beige' subtle streetwear: clean collegiate/heritage 'Est. 33 AD' typography that sparks natural curiosity without a paragraph of text."
  },
  {
    id: "philippians-4-13",
    reference: "Philippians 4:13",
    title: "Through Christ Who Strengthens Me",
    themes: ["strength", "contentment", "resilience", "fitness", "perseverance"],
    lifeSeasons: ["Hard seasons & scarcity", "Athletic grit", "Graduation & new challenges"],
    theologicalMeaning:
      "Written from prison, Paul's declaration in Philippians 4:13 is not a promise of effortless success, but the secret of Christ-sustained contentment and strength in both abundance and need.",
    streetwearContext:
      "Featured across heavyweight fleece hoodies, tough magnetic phone cases, and athletic staples."
  },
  {
    id: "1-corinthians-10-31",
    reference: "1 Corinthians 10:31",
    title: "Every Rep, His Glory",
    themes: ["glory", "gym", "lifting", "work", "stewardship", "vocation", "hydration"],
    lifeSeasons: ["Daily workouts & physical stewardship", "Vocational excellence"],
    theologicalMeaning:
      "'Whether you eat or drink, or whatever you do, do all to the glory of God.' Co-anchors the 'Glory' half of ArmorNGlory — teaching that ordinary habits, training reps, and daily work matter deeply to God.",
    streetwearContext:
      "Featured prominently on double-wall stainless steel Faith Training water bottles and gym apparel."
  },
  {
    id: "1-corinthians-9-24-27",
    reference: "1 Corinthians 9:24-27",
    title: "Run Your Race",
    themes: ["running", "discipline", "endurance", "focus", "purpose", "athletics"],
    lifeSeasons: ["Race prep & run clubs", "Building disciplined habits"],
    theologicalMeaning:
      "Paul draws on ancient stadium runners to illustrate intentional self-discipline — running with clear aim rather than aimless motion, pursuing an imperishable crown.",
    streetwearContext:
      "Core motif on insulated stainless steel water bottles and performance training gear."
  },
  {
    id: "proverbs-4-23",
    reference: "Proverbs 4:23",
    title: "Guard the Heart",
    themes: ["wisdom", "integrity", "mental peace", "character", "mindset"],
    lifeSeasons: ["Guarding peace in noisy seasons", "Youth & college mentorship"],
    theologicalMeaning:
      "In Hebrew wisdom literature, the 'heart' (lev) encompasses mind, will, and affections. Proverbs 4:23 counsels guarding the inner life above all else because every outward action flows from it.",
    streetwearContext:
      "Paired with minimalist heritage typography on stainless steel drinkware, caps, and everyday tees."
  },
  {
    id: "2-corinthians-5-17",
    reference: "2 Corinthians 5:17",
    title: "Made New (New Creation)",
    themes: ["baptism", "redemption", "identity", "new beginnings", "grace", "conversion"],
    lifeSeasons: ["Adult or teen baptism", "Confirmation", "Walking out of a past season"],
    theologicalMeaning:
      "'If anyone is in Christ, he is a new creation. The old has passed away; behold, the new has come.' The classic baptismal scripture celebrating restored identity and grace.",
    streetwearContext:
      "Popular gift motif across tough magnetic phone cases, graphic tees, and milestone gifts."
  },
  {
    id: "1-peter-2-9",
    reference: "1 Peter 2:9",
    title: "Set Apart / Chosen Generation",
    themes: ["identity", "worth", "belonging", "light", "chosen", "priesthood"],
    lifeSeasons: ["Baptism & confirmation", "Encouragement for women & teens"],
    theologicalMeaning:
      "Reminds believers that their worth is anchored in God's calling — chosen, royal, and set apart to proclaim the excellencies of Him who called them out of darkness into marvelous light.",
    streetwearContext:
      "Appears on collegiate varsity-inspired apparel, plaid pajama loungewear, and everyday tops."
  },
  {
    id: "psalm-23",
    reference: "Psalm 23",
    title: "The Lord Is My Shepherd",
    themes: ["peace", "comfort", "grief", "rest", "protection", "anxiety"],
    lifeSeasons: ["Grief & loss", "Anxiety & sleeplessness", "Rest & sabbath"],
    theologicalMeaning:
      "David's shepherd psalm anchors comfort not in the absence of dark valleys, but in the Good Shepherd's personal presence ('You are with me'), provision, and goodness.",
    streetwearContext:
      "Woven into botanical, pastoral, and 'Field Club' loungewear, wall art, hoodies, and tees."
  },
  {
    id: "micah-6-8",
    reference: "Micah 6:8",
    title: "Do Justly, Love Mercy, Walk Humbly",
    themes: ["humility", "mercy", "justice", "character", "walk humbly"],
    lifeSeasons: ["Everyday public faith", "Graduation & leadership"],
    theologicalMeaning:
      "Summarizes authentic covenant faithfulness in three daily postures: acting justly toward neighbors, loving steadfast mercy (chesed), and walking humbly with God.",
    streetwearContext:
      "Featured on rope caps, dad hats, and tough magnetic phone cases."
  },
  {
    id: "matthew-5-14-16",
    reference: "Matthew 5:14-16",
    title: "Be The Light / City on a Hill",
    themes: ["witness", "light", "purpose", "workplace faith", "creativity"],
    lifeSeasons: ["Everyday witness at school or work", "Encouragement gifts"],
    theologicalMeaning:
      "Jesus calls His followers the light of the world — visible through quiet integrity and good works that point observers back to the Father's glory.",
    streetwearContext:
      "Inspires the 'Glory' pillar of ArmorNGlory across phone cases, caps, and minimalist tees."
  },
  {
    id: "john-19-30-sacred-symbols",
    reference: "Sacred Christian Symbols",
    title: "Cross, Crown, Chi-Rho, Dove & Sacred Marks",
    themes: ["symbolism", "cross", "dove", "holy spirit", "chi-rho", "ichthys", "sacred symbols", "tetelestai"],
    lifeSeasons: ["Visual/art-first streetwear", "Subtle historic Christian expression"],
    theologicalMeaning:
      "From early-church christograms and the descending Dove of the Spirit (John 1:32) to the empty Cross, lilies & thorns (Matthew 6:28 / John 19:2), and 'Tetelestai' ('It is finished', John 19:30), Christian visual symbolism communicates deep theology through timeless marks.",
    streetwearContext:
      "Central to ArmorNGlory's 'Sacred Symbols' and 'Gothic Faith' designs — art-led pieces that look like gallery streetwear first."
  }
];

export const AUTHORITY_STYLE_AND_BUYER_GUIDES: AuthorityGuide[] = [
  {
    id: "anti-beige-streetwear",
    slug: "modern-christian-streetwear-guide",
    title: "What Makes Modern Christian Streetwear 'Anti-Beige' (Fabric Weight, Fit & Theology)",
    canonicalUrl: "https://armornglory.com/pages/our-story",
    summary:
      "How to distinguish authentic, design-first Christian streetwear from thin promotional church merch: GSM fabric weight, Comfort Colors 1717 blanks, 5-panel DTF caps, and scripture in context.",
    keywords: ["anti-beige", "cheesy", "streetwear", "comfort colors", "gsm", "heavyweight", "quality", "brands", "modern"],
    matchCategory: "T-Shirts & Tops",
    bodyMarkdown: `### 1. Design First, Message Rooted
Great Christian streetwear looks like great contemporary streetwear from twenty feet away — before anyone reads a single word. Instead of loud puns or parody logos, ArmorNGlory builds around editorial typography, woodcut/engraving illustration, and cohesive color palettes (*Urban Sacred*, *Minimalist Core*, *Gothic Faith*, *Vintage Americana*).

### 2. Blanks, GSM & Construction That Hold Their Drape
- **Heavyweight Tees**: Many core ArmorNGlory graphic tees use garment-dyed **Comfort Colors 1717** blanks (100% ring-spun cotton, ~6.1 oz/yd² / 207 GSM) with double-needle collars that hold structure wash after wash, avoiding thin, see-through promotional blanks.
- **Structured 5-Panel Trucker Caps**: A seamless foam/structured front panel gives full-color DTF artwork room to breathe, paired with breathable mesh and an adjustable 7-hole snapback (approx. 21.5"–23.5").
- **Heavyweight Hoodies & Crewnecks**: Warm fleece with relaxed unisex proportions built for layering.

### 3. Theological Depth Over Cliches
Every piece anchors to a concrete biblical text or symbol (*Romans 8:37*, *Exodus 3:5*, *Ephesians 6*, *Isaiah 40:31*, *Est. 33 AD*) with its design story documented on the product page.`
  },
  {
    id: "what-to-wear-to-church",
    slug: "what-to-wear-to-church-modern-casual-guide",
    title: "What to Wear to a Modern Church Service (Men's & Women's Casual Faith Style Guide)",
    canonicalUrl: "https://armornglory.com/blogs/church-search/what-to-wear-to-church-when-you-have-no-idea-what-to-wear-to-church",
    summary:
      "Practical, zero-stress outfit formulas for visiting a contemporary, non-denominational, or traditional church service — pairing clean streetwear silhouettes with subtle faith details.",
    keywords: ["church", "sunday", "outfit", "wear to church", "service", "casual", "dress code", "men", "women", "visiting"],
    matchCategory: "Hoodies & Sweatshirts",
    bodyMarkdown: `### Quick Rule for First-Time Church Visitors
At most modern non-denominational, Baptist, charismatic, and community churches, clean everyday casual wear (dark jeans or chinos, clean sneakers or boots, and a structured tee, crewneck, or overshirt) fits right in without looking under- or over-dressed.

### 3 Effortless Outfit Formulas
1. **Clean Smart-Casual (Works Almost Everywhere)**: A heavyweight garment-dyed neutral tee (bone, moss, or washed black) layered under an unbuttoned overshirt or cardigan, dark straight-leg denim, and clean sneakers.
2. **Fall / Winter Relaxed Layering**: A structured Christian crewneck sweatshirt or hoodie paired with tailored chinos or relaxed trousers and boots.
3. **Coffee Fellowship / Youth / Midweek Gathering**: A 5-panel scripture trucker cap or dad hat (*Walk Humbly Micah 6:8*, *Be A Doer James 1:22*), heavyweight tee, and everyday layers.

*Also read on ArmorNGlory:* [What to Wear to Church When You Have No Idea What to Wear to Church](https://armornglory.com/blogs/church-search/what-to-wear-to-church-when-you-have-no-idea-what-to-wear-to-church).`
  },
  {
    id: "baptism-and-milestone-gifts",
    slug: "meaningful-baptism-gifts",
    title: "How to Choose a Meaningful Baptism, Confirmation, or New-Believer Gift",
    canonicalUrl: "https://armornglory.com/collections/all-products",
    summary:
      "A practical framework for picking a baptism or confirmation gift by scripture theme (new creation, chosen identity, courage) and zero-size-guesswork categories.",
    keywords: ["baptism", "confirmation", "new believer", "milestone", "gift", "men", "women", "teen", "pastor", "graduation"],
    matchQuery: "baptism",
    bodyMarkdown: `### The 3-Step Baptism Gift Framework
1. **Match the Scripture to Their Story**:
   - *New Life & Identity*: **2 Corinthians 5:17** (*Made New*), **1 Peter 2:9** (*Set Apart / Chosen*), **Est. 33 AD** (*Empty Tomb*).
   - *Courage for What's Ahead*: **Romans 8:37** (*More Than Conquerors*), **Joshua 1:9** (*Strong & Courageous*), **Exodus 3:5** (*Holy Ground*).
   - *Peace & Rest*: **Psalm 23**, **Matthew 6:33** (*Kingdom First*), **1 Peter 5:7**.
2. **Eliminate Sizing Guesswork When Unsure**:
   - **Adjustable 5-Panel Trucker Caps & Dad Hats** fit standard adult heads (21.5"–23.5").
   - **Insulated Stainless Steel Water Bottles** (double-wall 100% stainless steel, BPA-free lid) are daily staples for work, campus, or gym.
   - **Tough Magnetic Phone Cases** work great when you know their exact iPhone or Samsung Galaxy S26 model.
3. **Plan for Made-to-Order Timing**:
   - Most ArmorNGlory items are made to order: typical production is **2–7 business days**, followed by **2–8 business days** US transit (order ~2 weeks ahead of the baptism date).`
  },
  {
    id: "faith-gym-and-run-club",
    slug: "christian-water-bottles-gym-training-gear",
    title: "Christian Gym Wear, Pump Covers & Insulated Scripture Water Bottles Guide",
    canonicalUrl: "https://armornglory.com/collections/activewear",
    summary:
      "Combining physical stewardship with functional training gear: heavyweight cotton pump covers, breathable tanks, and double-wall stainless steel scripture bottles.",
    keywords: ["gym", "workout", "fitness", "running", "pump cover", "water bottle", "drinkware", "training", "athletic", "lifting"],
    matchQuery: "stainless steel water bottle",
    bodyMarkdown: `### Physical Stewardship Meets Daily Discipline
ArmorNGlory's **Faith Training Gear** and **Second Wind** activewear lines center on passages about endurance, discipline, and honoring God with the body:
- **1 Corinthians 10:31** (*Every Rep, His Glory*)
- **1 Corinthians 9:24–27** (*Run Your Race*)
- **Isaiah 40:31** (*Second Wind*)
- **Philippians 3:14** (*Press Toward the Mark*)
- **Proverbs 4:23** (*Guard the Heart*) & **Galatians 6:9** (*Do Not Grow Weary*)

### Gear Specs
- **Insulated Scripture Water Bottles**: 100% stainless steel double-wall construction with BPA-free polypropylene lids, engineered to help keep drinks cold up to 24 hours or warm up to 12 hours.
- **Gym Pump Covers**: Size up one size in any Comfort Colors 1717 heavyweight ring-spun cotton tee for a boxy, breathable gym pump cover over training shorts.`
  },
  {
    id: "christian-phone-cases-guide",
    slug: "christian-phone-cases-magsafe-galaxy-s26",
    title: "Tough Magnetic Christian Phone Cases (iPhone MagSafe & Samsung Galaxy S26 Guide)",
    canonicalUrl: "https://armornglory.com/collections/phone-cases",
    summary:
      "Dual-layer impact protection, built-in magnetic rings, Matte vs. Glossy finishes, and compatibility across iPhone and Samsung Galaxy S26 / S26+ / S26 Ultra.",
    keywords: ["phone case", "iphone", "magsafe", "samsung", "galaxy", "s26", "tough case", "magnetic", "matte", "glossy"],
    matchCategory: "Phone Cases",
    bodyMarkdown: `### Dual-Layer Protection Built for Daily Carry
Your phone is picked up dozens of times a day — making a scripture-anchored case one of the highest-utility quiet reminders of faith.
- **Construction**: Impact-resistant polycarbonate outer shell paired with a cushioned shock-absorbing inner TPU liner.
- **Magnetic Compatibility**: Built-in magnetic module compatible with MagSafe chargers, car mounts, and wallets on supported iPhone and magnetic Galaxy models.
- **Finish Options**: Offered in **Matte** (low-glare, smooth editorial feel) and **Glossy** (rich color contrast) on select designs.
- **Device Coverage**: Covers major iPhone generations plus **Samsung Galaxy S26, S26 Plus, and S26 Ultra** listings — always select the exact device model variant before checkout.`
  },
  {
    id: "materials-sizing-and-care",
    slug: "materials-sizing-and-care-guide",
    title: "Materials, Sizing, Washing Care & Store Policies Reference",
    canonicalUrl: "https://armornglory.com/pages/christian-streetwear-faq",
    summary:
      "Complete reference for washing DTF graphic tees & caps, pajama loungewear sizing (XS–4XL), production timelines (2–7 business days), and return policy.",
    keywords: ["care", "wash", "washing", "dtf", "pajama", "sleepwear", "shipping", "return", "refund", "policy", "made to order"],
    matchCategory: "Pajamas & Sleepwear",
    bodyMarkdown: `### Care & Longevity by Garment Type
- **DTF Graphic Tees & Hoodies**: Turn inside out, machine wash cold with mild detergent, tumble dry low or hang dry. Do not iron directly over printed graphics.
- **5-Panel Trucker Caps & Dad Hats**: Spot clean gently with cool water and a soft cloth to preserve front-panel structure and print crispness.
- **All-Over-Print Pajama Pants**: 100% brushed polyester (light 5.6 oz/yd² / 190 g/m²), elastic waistband, women's sizes **XS–4XL** on core lounge prints (pants only; check individual listing for cut and size chart). Machine wash cold, tumble dry low.

### Verified Store Policies
- **Production & Shipping**: Most items are made to order. Production typically takes **2–7 business days**, plus **2–8 business days** US delivery (**10–30 business days** international). Shipping cost is calculated at checkout ([Shipping Policy](https://armornglory.com/policies/shipping-policy)).
- **Returns & Replacements**: Because items are made to order, returns aren't accepted for wrong size or change of mind, so check the product size chart before ordering. Damaged, misprinted, or incorrect items are replaced or refunded within **14 days of delivery** ([Refund Policy](https://armornglory.com/policies/refund-policy)).`
  }
];

export interface LiveConcordanceSummaryItem {
  reference: string;
  title: string | null;
  themes: string[];
  theologicalMeaning: string | null;
  productCount: number;
  categories: string[];
  sampleProducts: { title: string; handle: string; price: string; url: string }[];
}

export function buildLiveScriptureConcordance(products: Product[]): LiveConcordanceSummaryItem[] {
  const byRef = new Map<string, Product[]>();
  for (const p of products) {
    for (const ref of p.scriptures || []) {
      if (!byRef.has(ref)) byRef.set(ref, []);
      byRef.get(ref)!.push(p);
    }
  }

  const curatedByRef = new Map(
    SCRIPTURE_AND_SYMBOL_CONCORDANCE.map((c) => [c.reference.toLowerCase(), c])
  );

  const allRefs = new Set<string>([
    ...byRef.keys(),
    ...SCRIPTURE_AND_SYMBOL_CONCORDANCE.map((c) => c.reference)
  ]);

  const items: LiveConcordanceSummaryItem[] = [];
  for (const ref of allRefs) {
    const matched = byRef.get(ref) || [];
    const curated = curatedByRef.get(ref.toLowerCase());
    if (matched.length === 0 && !curated) continue;
    items.push({
      reference: ref,
      title: curated?.title || null,
      themes: curated?.themes || [],
      theologicalMeaning: curated?.theologicalMeaning || null,
      productCount: matched.length,
      categories: Array.from(new Set(matched.map((p) => p.category))),
      sampleProducts: matched.slice(0, 4).map((p) => ({
        title: p.title,
        handle: p.handle,
        price: p.priceFormatted,
        url: p.url
      }))
    });
  }

  items.sort((a, b) => {
    if (Boolean(a.theologicalMeaning) !== Boolean(b.theologicalMeaning)) {
      return a.theologicalMeaning ? -1 : 1;
    }
    return b.productCount - a.productCount || a.reference.localeCompare(b.reference);
  });

  return items;
}
