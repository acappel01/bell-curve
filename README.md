# Frontend — prx-backend consumer

Fresh Next.js (App Router) skeleton wired to a [prx-backend](../prx-backend) instance via its versioned REST API (`/api/v1`). All branding, theme, content, catalog, and tracking configuration comes from the backend admin — nothing brand-specific lives in this codebase.

Full implementation guide for new companies: `prx-backend/docs/frontend/dev.md`.

## Quick start

```bash
cp .env.example .env.local   # set API_BASE_URL (and API_TOKEN if issued)
npm install
npm run dev
```

## Structure

| Path | Purpose |
|---|---|
| `lib/api.js` | Server-side API client: envelope unwrapping, optional bearer token, ISR caching |
| `app/layout.js` | Shell driven by `/api/v1/config` — theme CSS variables, custom CSS, tracking scripts, brand chrome |
| `app/page.jsx` | Home — renders the CMS page with slug `home` |
| `app/[...slug]/page.jsx` | Catch-all CMS page renderer (title banner + sections) |
| `components/SectionRenderer.jsx` | Envelope dispatcher — register one component per backend section type; unregistered types render as visible placeholders |

## Next steps

- Build real components for the backend's section types and register them in `SectionRenderer`.
- Add a generic renderer for flexible sections keyed on their `schema` field-kind map.
- Wire catalog routes (`/api/v1/catalog/products`, `/packages`), blog, cart (`X-Cart-Token`), lead capture, and checkout.

## Design reference

The original static theme (Figma-based "Atlas" implementation) is preserved complete on the **`theme-reference`** branch — check out any component there to see what it should look like. [`docs/component-map.md`](docs/component-map.md) maps every reference component to the backend section type / dataset that drives it, with field mappings and known gaps.
