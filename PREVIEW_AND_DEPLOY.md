# Preview Mode & Deploying (avoiding wasted Netlify builds)

## Why preview locally?
Every push to your GitHub repo triggers a Netlify build (uses build minutes).
To avoid burning those while you're still tweaking, preview EVERYTHING locally
first — it's instant and free — then push only when you're happy.

## Local preview (recommended — zero Netlify cost)
```bash
npm install      # first time only
npm run dev
```
Open the local URL Vite prints (usually http://localhost:5173).

- Landing page: http://localhost:5173/
- Portal WITHOUT logging in: http://localhost:5173/portal?preview=1
  (This "preview mode" shows the portal with sample data — a gold striped banner
   appears so you know it's not live. Works only in local dev.)
- Real login flow: http://localhost:5173/login  (needs Supabase configured in .env)

You can click through all 3 dashboards, drag Kanban cards, open lead details,
log expenses — all on sample data, no Supabase needed.

## Preview the production build locally (optional, still free)
```bash
npm run build
npm run preview
```
This serves the exact files Netlify would, so you catch build-only issues.

## When you're ready to go live
Push to GitHub → Netlify auto-builds. To be economical:
- Batch your changes and push once, rather than many small pushes.
- Use `npm run dev` for iteration; only push when a change is confirmed good.

### Optional: Netlify Deploy Previews (per-branch, doesn't touch production)
If you push to a branch (not `main`), Netlify builds a separate preview URL you
can check before merging to `main` (which is what your live site serves). This
still uses build minutes but keeps the live site untouched until you merge.

## Preview mode on the LIVE site (optional)
By default `?preview=1` only works in local dev. If you ever want it on the
deployed site too, set a Netlify env var `VITE_ALLOW_PREVIEW=true` and redeploy.
Leave it OFF for a public launch so nobody can bypass login.
