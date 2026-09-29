# Applicant Portal — Build 1 (standalone)

Arabic, mobile-first job application portal for Rabbit Mart, running on local mock data (`/data/*.json`).

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — links to the Picker job page at `/jobs/picker-rabbit-mart`.

## What's wired up

- Job overview + apply form + confirmation screen, themed after rabbitmart.com
- Area → nearest active branch suggestion (`lib/matching.js`)
- Form submission writes to `data/applications.json` (stand-in for the future Applicants sheet tab)
- Floating AI chat widget (`app/api/chat`) — rule-based demo by default; set `ANTHROPIC_API_KEY`
  in a `.env.local` file to switch it to generative mode automatically (falls back to rule-based
  if the call fails)

## Connect phase — done

`lib/data.js` reads Jobs/Branches/FAQ from the real Google Sheet the moment
`GOOGLE_SERVICE_ACCOUNT_EMAIL`/`GOOGLE_SERVICE_ACCOUNT_KEY` are set (local JSON otherwise —
nothing breaks without credentials). `app/api/apply` writes new applications straight to the
**Applicants** tab and fires the WhatsApp confirmation (`lib/whatsapp.js`, dry-run until Build 4
goes live). See `../CONNECT_PHASE.md` at the repo root for the full picture and exact env vars.
