# ERP Platform

> Multi-role staffing platform — full-stack SaaS connecting clients with curated tech talent through an AI-augmented hiring workflow.

![Status](https://img.shields.io/badge/status-portfolio%20showcase-orange)
![Stack](https://img.shields.io/badge/stack-React%20%C2%B7%20Vite%20%C2%B7%20Vercel%20%C2%B7%20Supabase%20%C2%B7%20Claude-blueviolet)
![License](https://img.shields.io/badge/license-source--available-blue)
![Version](https://img.shields.io/badge/version-14.0-informational)

**🔗 Live demo:** _coming soon (link will be added after deployment)_
**👤 Author:** Rafael Baez · [@Crewrafa](https://github.com/Crewrafa)

> ⚠️ **Portfolio piece.** This repository is published for technical review only. See [LICENSE](LICENSE) — viewing is welcome, deployment and commercial use are not permitted.

---

## What it is

A production-style internal SaaS coordinating **six distinct user roles** around a single staffing pipeline. Built end-to-end as an operational platform: client-facing job intake, recruiter review, soft-skills evaluation, ATS kanban, sales delivery, and finance margin analysis — all in one cohesive app.

This is not a tutorial repo. It is a working operational tool, with 8 API endpoints, 8 Postgres tables, JSONB-flexible data modeling, role-gated security, rate limiting, soft delete + audit log, signed-URL document storage, AI proxy, and a server-rendered client review page outside the SPA.

## The six roles

| Role | Module purpose |
|---|---|
| 👤 **Client** | 8-step intake wizard. Upload a JD → AI extracts the full role spec → review & submit. |
| 🔍 **Recruiter** | Review every incoming profile, write notes, generate interview questions for Ana. |
| 🧠 **Talent Discovery (Ana)** | Capture soft-skills evaluation from client meetings; AI structures notes into traits. |
| ⚡ **Admin** | Full ATS — kanban board, 11-stage candidate pipeline, document storage, user management, audit log, trash. |
| 💼 **Sales** | Invite clients, track delivery status, send candidate review links. |
| 💰 **Finance** | Per-profile pricing calculator with viability tiers (💰 / ⚠️ / 🔴). |

## Architecture

```
  ┌──────────────────────────────────────────────────────┐
  │              React 18 + Vite (SPA)                   │
  │   role-selector → routed module → fetch /api/*       │
  └────────────────────────┬─────────────────────────────┘
                           │ HTTPS
  ┌────────────────────────▼─────────────────────────────┐
  │     Vercel Functions  (9 endpoints, role-gated)      │
  │     rate-limit · sanitize · UUID-validate            │
  └─────────┬───────────────────────────────────┬────────┘
            │ service-role                      │ x-api-key
  ┌─────────▼─────────────────┐    ┌────────────▼────────┐
  │   Supabase Postgres       │    │  Anthropic Claude    │
  │   8 tables · RLS · JSONB  │    │  JD extraction,      │
  │   Storage · Auth          │    │  structured outputs  │
  └───────────────────────────┘    └─────────────────────┘
```

**Trust boundary:** the browser never holds the Supabase service key or the Anthropic key. Every external call is proxied through the API layer.

## Engineering highlights

- **JSONB-first data model.** The `profile_data` column carries the entire 8-step form output, AI-generated content, Ana's soft skills, and authorization flags. Lets the schema iterate without migrations during product evolution.
- **AI workflow integration.** Upload a JD → Claude extracts structured fields against a hard-coded schema → frontend auto-populates → user adjusts → Claude generates the role objective + responsibilities from the chosen stack.
- **Server-rendered client review.** `/api/review/[id]` returns a self-contained HTML page (no SPA dependency) where clients accept/reject candidates in one click. Gated behind an admin authorization flag.
- **Role-gated APIs.** Each endpoint validates the caller's role from the `roles` table; pricing is admin/finance only, profile authorization is admin only, decisions are admin/sales only.
- **Input safety.** UUID validation, status-whitelist validation, match-score clamping, recursive XSS-vector stripping (`<>'";\``, `javascript:`, `onXXX=`), body-size caps, length caps.
- **Soft delete + audit.** Every destructive action sets `deleted_at` and writes to `audit_log`. Trash view restores anything.
- **Rate limiting** in-memory per IP (admin: 120/min, auth: 15/min).
- **Match scoring** weighted across must-have overlap, seniority, stack overlap, English level.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite 5 | Fast HMR, no SSR needed (single user-facing public page is server-rendered separately) |
| Styling | CSS-in-JS design tokens | One design system (`DS`) shared across modules; no external CSS framework dependency |
| API | Vercel Functions (Node) | Per-route serverless, automatic scaling, no infra to manage |
| DB | Supabase Postgres + Auth + Storage | RLS-by-default; managed Postgres; integrated file storage with signed URLs |
| AI | Anthropic Claude (Sonnet) | Reliable structured-output for JD extraction & soft-skills analysis |
| Hosting | Vercel | Native fit for the functions + static frontend pattern |

## Code layout

```
src/
├── App.jsx            ~2800 LOC — single-file React SPA (intentional MVP shape)
├── data.js            AI prompts, role constants, tech catalogs
└── main.jsx           entry

api/
├── admin.js           profile/candidate/assignment CRUD, finance, audit, trash
├── auth.js            role lookup + create_user (admin-gated)
├── client.js          client profile submission + JD upload
├── ana.js             soft-skills operations
├── recruiter.js       accept/reject profiles
├── roles.js           user management (admin only)
├── claude.js          Anthropic proxy with model lock + token cap + origin check
├── pdf/[id].js        stored profile PDF (HTML)
└── review/[id].js     interactive client review page (server-rendered)

docs/
├── ARCHITECTURE.md            system design + data flow
├── API-REFERENCE.md           every endpoint documented
├── WORKFLOW.md                business process & status transitions
├── DEVELOPMENT-HISTORY.md     version-by-version changelog
├── SETUP-GUIDE.md             (kept for reference; not a clone-and-run script)
├── MIGRATION-DOTNET-AZURE.md  future migration target
└── PROMPTS-FOR-AI.md          continuity prompts for future development
```

## What to look at first (for reviewers)

If you're here to evaluate the code:

1. **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** — system overview in 60 lines
2. **[`api/admin.js`](api/admin.js)** — the core API surface; shows the role-gating, validation, and Supabase-as-data-layer pattern
3. **[`api/review/[id].js`](api/review/[id].js)** — server-rendered HTML page outside the SPA; demonstrates working without a frontend framework when it isn't useful
4. **[`src/App.jsx`](src/App.jsx)** lines 1–230 — auth boundary, design tokens, shared primitives
5. **[`src/data.js`](src/data.js)** — the AI prompts; structured-output engineering for JD extraction
6. **[`docs/WORKFLOW.md`](docs/WORKFLOW.md)** — the actual business process this encodes

## Known trade-offs (kept honest)

- **Single-file App.jsx** is intentional MVP density — see `docs/MIGRATION-DOTNET-AZURE.md` for the planned component split.
- **In-memory rate limiting** doesn't survive Vercel cold starts or scale horizontally. The DB-backed `rate_limits` table is provisioned but not yet wired.
- **Match scoring is client-side.** Production deployment would move it to the API for tamper-resistance.
- **CSS-in-JS inline** has zero bundle overhead but no static analysis. A `styled-components`/`emotion` migration is on the roadmap.

## License

**Source-available for portfolio review only.** You may read the code; you may not deploy, redistribute, modify, or use it commercially. See [LICENSE](LICENSE).

## Contact

For licensing, employment, or collaboration: **psicologorafaelbaez@gmail.com**
