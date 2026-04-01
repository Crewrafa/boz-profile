# BOZ Verified Fit — IT Staffing SaaS Platform

**Version:** 13.1 (v4 beta) | **Stack:** React+Vite · Supabase · Anthropic Claude · Vercel  
**Status:** Functional prototype — all 6 modules active

## What is this?

BOZ Verified Fit is an IT staffing platform for BOZ USA connecting 6 roles through a structured hiring workflow:

1. **Client** → Submits job descriptions (JD upload + AI analysis + manual form)
2. **Recruiter** → Reviews profiles, adds notes/questions, passes to Ana
3. **Ana (Talent Discovery)** → Soft skills evaluation, personality assessment
4. **Admin** → Full pipeline management (kanban board, candidate assignment, ATS)
5. **Sales** → Client management, invite links, candidate delivery control
6. **Finance** → Revenue calculator per profile, viability analysis per client

## Quick Start

```bash
npm install
cp .env.example .env   # Fill in your Supabase + Anthropic keys
npm run dev             # http://localhost:5173
```

## Project Structure

```
boz-verified-fit/
├── api/                           # Vercel serverless API (9 endpoints)
│   ├── admin.js                   # Profiles, candidates, ATS, finance pricing, rate limit
│   ├── ana.js                     # Soft skills operations
│   ├── auth.js                    # Password login + user creation + role lookup
│   ├── claude.js                  # Anthropic AI proxy
│   ├── client.js                  # Client profile submission + JD storage
│   ├── recruiter.js               # Recruiter operations
│   ├── roles.js                   # User/role CRUD
│   ├── pdf/[id].js                # Dynamic PDF generation
│   └── review/[id].js             # Interactive client review page
├── docs/                          # Complete documentation
│   ├── ARCHITECTURE.md            # System design & data flow
│   ├── API-REFERENCE.md           # All endpoints documented
│   ├── SETUP-GUIDE.md             # Setup from zero
│   ├── DEVELOPMENT-HISTORY.md     # Version history & decisions
│   ├── WORKFLOW.md                # Business logic & user flows
│   ├── MIGRATION-DOTNET-AZURE.md  # .NET + Azure migration guide
│   └── PROMPTS-FOR-AI.md         # AI prompts for continuing development
├── src/
│   ├── App.jsx                    # Single-file React app (~2800 lines)
│   ├── data.js                    # Constants, AI prompts, tech catalogs
│   └── main.jsx                   # Entry point
├── .env.example                   # Environment variables template
├── package.json                   # Dependencies (React 18 + Vite 5)
├── vercel.json                    # API routing config
└── vite.config.js                 # Build config
```

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Vercel + .env | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Vercel + .env | Supabase anon key |
| `SUPABASE_SERVICE_KEY` | Vercel ONLY | Service role key (never expose) |
| `ANTHROPIC_API_KEY` | Vercel ONLY | Claude API key |
| `VITE_DEV_MODE` | Optional | `"true"` enables dev login buttons. REMOVE for production. |

## Key Security Features

- **Password authentication** (email + password via Supabase Auth)
- **Rate limiting** (120 req/min admin, 15 req/min auth per IP)
- **Input sanitization** (strips XSS vectors from all text inputs)
- **Row Level Security** on all Supabase tables
- **Review link authorization** (locked until Admin approves)
- **Soft delete** with audit trail
- **Service-side only keys** (Supabase service key + Anthropic key never reach client)

## Documentation

Start with `docs/SETUP-GUIDE.md` for initial setup, then `docs/ARCHITECTURE.md` for system understanding. For migration to .NET + Azure, see `docs/MIGRATION-DOTNET-AZURE.md`.

## License

Proprietary — BOZ USA. All rights reserved.
