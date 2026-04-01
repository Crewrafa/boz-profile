# BOZ Verified Fit v10.0

IT Staffing Profile Builder — Define your ideal tech talent with precision.

## Quick Start (Local)

```bash
cp .env.example .env    # Fill in your keys
npm install
npm run dev
```

## Environment Variables

| Variable | Where | Required | Description |
|----------|-------|----------|-------------|
| `VITE_DEV_MODE` | Vercel + .env | No | Set `true` for dev buttons, omit for production |
| `VITE_SUPABASE_URL` | Vercel + .env | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Vercel + .env | Yes | Supabase anon (public) key |
| `SUPABASE_SERVICE_KEY` | Vercel only | Yes | Supabase service_role key (secret) |
| `ANTHROPIC_API_KEY` | Vercel only | Yes | Claude API key for AI features |
| `VITE_EMAILJS_SERVICE_ID` | Vercel + .env | No | EmailJS service ID |
| `VITE_EMAILJS_TEMPLATE_ID` | Vercel + .env | No | EmailJS template ID |
| `VITE_EMAILJS_PUBLIC_KEY` | Vercel + .env | No | EmailJS public key |
| `VITE_BASE_URL` | Vercel + .env | No | Custom domain (defaults to window.location.origin) |

## Deploy to Vercel

1. Push to GitHub
2. Connect repo in Vercel
3. Add environment variables (above)
4. **Do NOT set `VITE_DEV_MODE`** in production — this disables dev login buttons

## Architecture

```
api/
  admin.js      — Admin ATS endpoints (auth-gated to ADMIN_EMAIL)
  client.js     — Client profile operations (auth-gated to any user)
  claude.js     — Claude API proxy (model-locked, token-capped)
  pdf/[id].js   — Serves PDF HTML by profile UUID
  review/[id].js — Interactive candidate review page
src/
  App.jsx       — React SPA (Login, Admin ATS, Client Form)
  data.js       — Constants, categories, roles, tools
  main.jsx      — Entry point
```

## Security

- All data operations go through server APIs (never direct Supabase from client)
- Admin endpoints require `verifyAdmin()` — checks email matches `ADMIN_EMAIL`
- Client endpoints verify JWT token with Supabase Auth
- Dev mode tokens (`dev`, `dev-client`) only accepted when `VITE_DEV_MODE=true`
- Claude proxy: model locked to `claude-sonnet-4-20250514`, max 2000 tokens, origin check
- Input sanitization on all API endpoints
- UUID validation on all ID parameters
- Body size limits on all endpoints
