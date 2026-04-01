# AI Prompts for Continuing Development

## Context Prompt (Start every session with this)

```
I'm working on BOZ Verified Fit, an IT staffing SaaS. Stack: React+Vite on Vercel, Supabase backend, Anthropic Claude for AI. 6 modules: Client (8-step form), Recruiter (review), Ana (soft skills), Admin (full ATS+kanban), Sales (3 tabs), Finance (per-profile calculator).

Rules: 1) All data through /api/* endpoints, never direct Supabase. 2) Don't modify APIs without approval. 3) Ask questions before coding. 4) Dev mode gated by VITE_DEV_MODE. 5) Soft delete pattern. 6) Rate limiting on all APIs.

Version 13.1. Single App.jsx (~2800 lines). 9 API files.
```

## Feature Prompts

**Email Notifications:** "Add email notifications when: recruiter approves → notify Ana, Ana completes → notify Admin, Admin authorizes review → notify Sales, client decides → notify Admin. Using [EmailJS/SendGrid/Azure]."

**Outlook Integration:** "Integrate Microsoft Outlook via Graph API so Sales can send emails from the platform. Need: Azure App Registration, OAuth2, Graph API email sending."

**Real-time Updates:** "Add real-time updates (Supabase Realtime or SignalR) so pipeline changes appear live without refresh."

**Candidate Comparison:** "Add side-by-side candidate comparison in Admin ATS. Show 2-3 candidates in columns comparing skills, match %, seniority, english."

**Client Portal:** "Create a client portal where clients see their submitted profiles, candidate progress, real-time tracking, and chat with Sales."

**Bulk Import:** "Add CSV/Excel bulk import for candidates to Talent Pool. Parse, validate, and insert."

**Multi-language:** "Add EN/ES language toggle. All labels, buttons, messages, AI prompts should switch."

**SLA Tracking:** "Add SLA timers: recruiter review <24hrs, Ana <48hrs, first candidates <5 days. Show countdown and overdue alerts."

## Migration Prompts

**To .NET:** "Convert [admin.js/auth.js/client.js] to .NET 8 Web API. Give me EF Core models, controller, service layer. Keep same request/response format."

**Split Frontend:** "Split App.jsx into components: separate files per module, shared components, custom hooks, Zustand state. Keep same design. Start with [Admin/Client/Sales]."

**Add Testing:** "Add tests: unit (Vitest) for APIs, component (RTL) for key UI, E2E (Playwright) for critical paths."

## Tips for the Team
1. Start with docs/API-REFERENCE.md to understand every endpoint
2. Read docs/WORKFLOW.md for business process
3. Use dev mode (VITE_DEV_MODE=true) for testing
4. profile_data JSONB is the heart — understand its structure
5. Match scoring is client-side — move to service for production
6. AI prompts in data.js are carefully crafted — preserve structure
7. All RLS policies are permissive for service_role — this is by design
