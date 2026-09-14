# Connecting Supabase — Step by Step

Your app is already coded to use Supabase. You just need to create the project
and provide two keys. Nothing secret goes into the code or GitHub.

## 1. Create the project
- Go to https://supabase.com → New Project
- Name: `pifsa-portal`  ·  Region: Singapore (closest to PH)  ·  set a DB password
- Wait ~2 min for it to provision

## 2. Create the tables
- Left sidebar → SQL Editor → New query
- Paste ALL of `supabase-schema.sql` (in this folder) → Run
- This makes the `leads` + `calendar_events` tables with the right security:
  the public form can INSERT leads; only logged-in staff can READ/UPDATE them.

## 3. Create your login
- Sidebar → Authentication → Users → Add user → Create new user
- Enter your email + a password. This is your portal login.

## 4. Get your keys
- Sidebar → Project Settings (gear) → API
- Copy: **Project URL**  and  **anon public** key

## 5A. Test locally (optional but recommended)
- In this folder, create a file named `.env` containing:

    VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
    VITE_SUPABASE_ANON_KEY=your-anon-public-key

- Run `npm install` then `npm run dev`, open the local URL.
- Submit the landing form → check Supabase → Table Editor → `leads` for the row.
- Log in at /login with the user from step 3 → the lead shows in the CRM.

## 5B. Set the keys on Netlify (for the live site)
- Netlify → your site → Site configuration → Environment variables → add:
    VITE_SUPABASE_URL         = your Project URL
    VITE_SUPABASE_ANON_KEY    = your anon public key
- Deploys → Trigger deploy → **Clear cache and deploy site**
  (Vite bakes these in at build time, so you MUST redeploy after adding them.)

## Done
Landing form → writes leads to Supabase → they appear in the portal CRM.
The "anon public" key is safe for the frontend; row-level security protects the data.
Never commit your real `.env` (it's already in .gitignore).
