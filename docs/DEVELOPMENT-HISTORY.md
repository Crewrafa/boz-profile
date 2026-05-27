# Development History — ERP Platform

## v12.0 — Clean project organization, .gitignore, env vars
## v12.1 — AI JD suggestions, Admin omniscient views (Alerts, Ana, Sales, Client), Sales KPIs
## v12.2 — Soft delete + trash + audit_log, auto-match candidates, review link redesign (score bars, compliance), client branding
## v12.3 — Custom confirm modal (no browser confirm), removed duplicate Review Link button, metrics only in relevant tabs, Sales two-column redesign, mailto: email integration
## v13.0 — Tab-specific metrics (per view), Talent Pool filters/search, review link authorization (lock/unlock), interactive AI suggestions (toggle+bulk add), Sales 3 tabs (Clients/Dashboard/Delivery), Recruiter orange theming, Finance revenue calculator
## v13.0 Hotfix — Fixed review crash (duplicate const pd), pipeline stage metrics, AI suggestion toggle UX
## v13.1 — Password login (replaced magic link), rate limiting (admin 120/min, auth 15/min), input sanitization, Finance per-profile with Supabase persistence, Sales dashboard fixed (sales-only metrics), AI prompt expanded (monitoring, queues, versions), PDF + JD download links in Recruiter/Ana, JD stored in Supabase Storage, "Filled" renamed to "Ready for Client"
## v14.0 — **Portfolio release.** Full bug audit + security hardening: Finance role unblocked across /api/admin, Ana role uses roles table (no more hardcoded email), create_user gated to admin caller, save_pricing/update_assignment/update_client_decision role-gated, UUID validation across all endpoints, match_score clamping, review revocation re-checked at decision time, soft-deleted profiles blocked from review page, signed-URL errors render as "pending" instead of broken links. Replaced password login with role selector (no-auth entry suitable for portfolio demo). Added LICENSE (source-available portfolio license), .env.example, .gitignore. Removed dead `sbFetch` helper. Fixed duplicate zIndex key warning in build.

## APIs Modified: admin.js (v12.2, v13.0, v13.1, v14.0), auth.js (v13.1 rewrite, v14.0 gate), client.js (v13.1, v14.0), ana.js (v14.0 role lookup), recruiter.js (v14.0), roles.js (v14.0 validation), review/[id].js (v12.2, v13.0, v14.0). Unchanged: claude.js, pdf/[id].js
## Supabase Migrations: v12.2 (deleted_at, audit_log), v13.1 (finance_pricing, rate_limits, RLS on all tables)
