# BOZ Verified Fit v12.0

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
  admin.js       — Admin + Recruiter endpoints (profiles, candidates, assignments)
  ana.js         — Ana/psychologist soft skills endpoints
  auth.js        — Role lookup from Supabase roles table
  claude.js      — Claude API proxy (model-locked, token-capped)
  client.js      — Client profile CRUD operations
  recruiter.js   — Recruiter review, accept/reject, questions
  roles.js       — User/role management (admin only)
  pdf/[id].js    — Serves PDF HTML by profile UUID
  review/[id].js — Interactive candidate review page
src/
  App.jsx        — React SPA (Login, Admin ATS, Recruiter, Ana, Client Form, Sales, Finance)
  data.js        — Constants, categories, roles, tools
  main.jsx       — Entry point
```

## Modules

| Module | Role | Color | Description |
|--------|------|-------|-------------|
| Admin | admin | Navy #0D2550 | Pipeline, candidates, users, full oversight |
| Recruiter | recruiter | Orange #f97316 | Review profiles, approve/reject, add notes |
| Ana | ana | Purple #7C3AED | Soft skills evaluation (blocked until recruiter approves) |
| Sales | sales | Green #059669 | Links dashboard, quick access |
| Finance | finance | Blue #0369a1 | Placeholder — coming soon |
| Client | (public) | White | 8-step profile form + AI job description |

## Security

- All data operations go through server APIs (never direct Supabase from client)
- Admin endpoints require role verification via roles table
- Client endpoints verify JWT token with Supabase Auth
- Dev mode tokens only accepted when VITE_DEV_MODE=true
- Claude proxy: model locked, max 2000 tokens, origin check
- Input sanitization on all API endpoints
- UUID validation on all ID parameters
- Body size limits on all endpoints
