# Security Policy

## Supported versions
Only the latest published version of `armornglory-mcp-server` on npm receives security fixes.

## Reporting a vulnerability
Please email **customersupport@armornglory.com** with the subject "Security: armornglory-mcp-server". Do not open a public issue. We aim to respond within 5 business days.

## What this server does (and doesn't) do
- All MCP tools are **read-only**: they search a bundled product catalog and build Shopify cart links. No orders are placed and no customer data is stored.
- No API keys or credentials are required or stored.
- The catalog sync script only fetches public `https://armornglory.com/*.json` endpoints over HTTPS, with a 5-second timeout and content-type checks.
- Self-hosted HTTP mode rejects request bodies over 1 MB.

## Dependency security
- `npm audit --omit=dev --audit-level=high` runs automatically before every publish (`prepublishOnly`); publishing fails on high or critical issues.
- Dependabot opens weekly update PRs (`.github/dependabot.yml`).
