# PromptBook

PromptBook is a polished React + TypeScript + Supabase-ready visual AI prompt community.

## Run locally

```bash
npm install
npm run dev
```

Open the URL shown by Vite (normally http://localhost:5173).

## Supabase

1. Create a Supabase project.
2. Copy `.env.example` to `.env`.
3. Add your project URL and publishable key.
4. Open Supabase SQL Editor and run `supabase/promptbook.sql` completely.
5. Create the Storage buckets/policies described in that SQL file.
6. Restart `npm run dev`.

Without Supabase environment variables, the app intentionally runs in **local demo mode** so you can review the full UI and interactions before connecting your database.

## Build verification

```bash
npm run build
```

## Product UX

PromptBook is designed around one loop: discover → compare before/after → read prompt → copy → remix → publish.

The UI includes responsive masonry discovery, before/after slider, prompt viewer, copy metrics, favorites, likes, creator profiles, collections, create/edit flow, notifications, analytics dashboard and settings.
