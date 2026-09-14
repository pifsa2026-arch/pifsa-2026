# PIFSA — Landing Page + Portal

A combined React/Vite app for the Philippine Investigation and Forensic Science Academy:

- **Public landing page** (`/`) — marketing site with an enrollment form that writes leads to Supabase.
- **Login** (`/login`) — Supabase email/password auth.
- **Portal** (`/portal`) — enrollment CRM (six-stage funnel), enrollment reports dashboard, and marketing calendar. Auth-guarded.

Built on the same stack as the PNTC marketing portal: React/Vite + Supabase, deployed on Netlify.

## Local setup

```bash
npm install
cp .env.example .env        # then fill in your Supabase URL + anon key
npm run dev
```

The app runs without Supabase configured (the form and portal fall back to sample data),
so you can preview the UI before wiring the backend.

## Supabase

1. Create a project at https://supabase.com.
2. In the SQL Editor, run `supabase-schema.sql` (creates the `leads` and `calendar_events` tables with row-level security).
3. Create at least one portal user: Authentication → Users → Add user (email + password).
4. Copy Project Settings → API values into `.env` (local) and Netlify env vars (production):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## Deploy to Netlify

1. Push this folder to a GitHub repo.
2. In Netlify: Add new site → Import an existing project → pick the repo.
   Build settings are auto-detected from `netlify.toml` (build `npm run build`, publish `dist`).
3. Add the two environment variables above: Site configuration → Environment variables.
4. Deploy. `netlify.toml` (and `public/_redirects`) handle SPA routing so `/login` and
   `/portal` deep-links resolve to `index.html`.

You can also deploy without GitHub by dragging the `dist/` folder (after `npm run build`)
into Netlify's manual deploy — but env vars and the redirects file make the GitHub route smoother.

## Funnel stages

Prospect → Lead → Valid Lead → Applicant → Admitted → Enrollee
