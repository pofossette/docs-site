# docs-site

Personal interactive technical documentation and study notes site built with **Astro + Starlight + React + Cytoscape.js**.

Each section under `src/content/docs/<section>/` is configured in `courses.mjs` and built into its own isolated static sub-path (`dist/<section>/`) with an independent sidebar and search index.

## Local Development

```bash
pnpm install --frozen-lockfile
pnpm dev:compiler   # preview /compiler/
pnpm dev:se-req     # preview /se-req/
pnpm build          # build all isolated sub-sites into dist/
pnpm preview        # preview merged dist/ locally
```

## Deployment

Deployed manually to Cloudflare Pages via GitHub Actions (`workflow_dispatch`).
