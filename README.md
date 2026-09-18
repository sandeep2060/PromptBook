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

Supabase is required for authentication, publishing, private workspace features, and user activity. Without the environment variables, the public shell remains available but account actions show a clear configuration message instead of simulating a successful login.

## Build verification

```bash
npm run build
```

## Product UX

PromptBook is designed around one loop: discover → compare before/after → read prompt → copy → remix → publish.

The UI includes responsive discovery, before/after comparison, prompt viewing, copy metrics, favorites, likes, creator profiles, notifications, analytics foundation and settings. The bundled demo dataset and demo image assets have been removed; public content comes from Supabase.

## Environment variables

Create a local `.env` file from `.env.example`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Only the publishable Supabase key belongs in the browser. Never expose a service-role key.

## Deployment

For Vercel, configure the two `VITE_SUPABASE_*` variables in the project settings, deploy the repository, and run `npm run build` locally before publishing. The included `vercel.json` handles SPA fallback routing.
