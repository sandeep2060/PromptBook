# PromptBook QA Report

## Scope
This build was reviewed as a front-end React/Vite project with Supabase integration points.

## Checks completed
- Reviewed every source file in `src/`.
- Fixed Vite `ImportMeta.env` typing with `src/vite-env.d.ts`.
- Added Vercel SPA rewrite in `vercel.json`.
- Reworked the interface into a human-designed editorial/product UI: no AI-generated visual treatment, no decorative gradients, no neon/glow effects, restrained motion and clear information hierarchy.
- Verified every `className` used by React has a corresponding CSS selector or intentional structural hook.
- Verified CSS brace balance.
- Verified TypeScript source with a temporary local type shim for unavailable third-party packages; the shim was removed before packaging.
- Verified the application source passes TypeScript checking under the project compiler settings that do not require installed package declarations in this offline environment.
- Checked that the package does not contain `node_modules` or temporary compiler stubs.
- Reviewed Supabase client usage to ensure the service-role key is not referenced in frontend code.
- Reviewed the SQL migration for tables, indexes, triggers, RLS policies and storage policies.
- Added working CSV export to the analytics screen.
- Added working Google/GitHub OAuth handlers when Supabase is configured, with a clear demo-mode message otherwise.
- Added working Web Share API/fallback link sharing on post details.
- Added negative-prompt state to the create workflow so it is actually saved with local posts and sent to Supabase.

## Environment limitation
A full `npm install` / Vite production build could not be executed in this packaging environment because package registry access was unavailable. The previous Vercel log showed that Vercel itself can install the project dependencies successfully. Therefore no claim of a cloud production build is made here.

## First local/cloud verification
After extracting the ZIP:

```bash
npm install
npm run build
```

For Vercel, add:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

Then deploy.
