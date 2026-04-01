# Development History — BOZ Verified Fit

## v12.0 — Clean project organization, .gitignore, env vars
## v12.1 — AI JD suggestions, Admin omniscient views (Alerts, Ana, Sales, Client), Sales KPIs
## v12.2 — Soft delete + trash + audit_log, auto-match candidates, review link redesign (score bars, compliance), client branding
## v12.3 — Custom confirm modal (no browser confirm), removed duplicate Review Link button, metrics only in relevant tabs, Sales two-column redesign, mailto: email integration
## v13.0 — Tab-specific metrics (per view), Talent Pool filters/search, review link authorization (lock/unlock), interactive AI suggestions (toggle+bulk add), Sales 3 tabs (Clients/Dashboard/Delivery), Recruiter orange theming, Finance revenue calculator
## v13.0 Hotfix — Fixed review crash (duplicate const pd), pipeline stage metrics, AI suggestion toggle UX
## v13.1 — Password login (replaced magic link), rate limiting (admin 120/min, auth 15/min), input sanitization, Finance per-profile with Supabase persistence, Sales dashboard fixed (sales-only metrics), AI prompt expanded (monitoring, queues, versions), PDF + JD download links in Recruiter/Ana, JD stored in Supabase Storage, "Filled" renamed to "Ready for Client"

## APIs Modified: admin.js (v12.2, v13.0, v13.1), auth.js (v13.1 rewrite), client.js (v13.1), review/[id].js (v12.2, v13.0). Unchanged: ana.js, claude.js, recruiter.js, roles.js, pdf/[id].js
## Supabase Migrations: v12.2 (deleted_at, audit_log), v13.1 (finance_pricing, rate_limits, RLS on all tables)
