# Migration Guide: .NET + Azure

## Target Architecture
- **Frontend:** Azure Static Web Apps (React or Next.js)
- **Backend:** .NET 8 Web API on Azure App Service
- **Database:** Azure SQL Database
- **Storage:** Azure Blob Storage (documents bucket)
- **Auth:** Azure AD B2C (external clients) or ASP.NET Identity (simpler)
- **Email:** Azure Communication Services or SendGrid
- **AI:** Anthropic Claude API (same, called from .NET HttpClient)
- **Rate Limiting:** Azure API Management (built-in policies)

## Service Mapping
| Current | Azure |
|---------|-------|
| Supabase PostgreSQL | Azure SQL Database (Standard S1) |
| Supabase Auth | Azure AD B2C or ASP.NET Identity |
| Supabase Storage | Azure Blob Storage |
| Vercel Serverless | Azure App Service (.NET 8) |
| In-memory rate limit | Azure API Management |
| mailto: | SendGrid / Azure Comm Services |

## Controller Structure (replace /api/*.js)
```
Controllers/
├── AuthController.cs          → api/auth.js
├── ProfilesController.cs      → api/admin.js (profiles)
├── CandidatesController.cs    → api/admin.js (candidates)
├── AssignmentsController.cs   → api/admin.js (assignments)
├── DocumentsController.cs     → api/admin.js (documents)
├── FinanceController.cs       → api/admin.js (pricing)
├── RolesController.cs         → api/roles.js
├── ClientController.cs        → api/client.js
├── AnaController.cs           → api/ana.js
├── AIController.cs            → api/claude.js
├── PdfController.cs           → api/pdf/[id].js
└── ReviewController.cs        → api/review/[id].js
```

## Phase Plan
1. **Database** (1-2 wks): EF Core models. Keep `profile_data` as `NVARCHAR(MAX)` JSON first, normalize later.
2. **Auth** (1 wk): ASP.NET Identity for simplicity, or AD B2C for enterprise SSO.
3. **API Controllers** (2-3 wks): Each admin.js action → controller method with `[Authorize(Roles="admin")]`.
4. **Storage** (1 wk): Azure Blob with signed URLs (SAS tokens).
5. **AI** (1 wk): HttpClient → Anthropic API from .NET.
6. **Email** (1 wk): Replace mailto with SendGrid/Azure Comm.
7. **Frontend refactor** (2-3 wks): Split App.jsx into components, add Tailwind, React Router.

## Frontend Split Recommendation
```
src/components/common/     → Spinner, Pill, Modal, etc.
src/components/admin/      → Board, Pipeline, Users, TalentPool
src/components/client/     → Form steps 0-7
src/components/recruiter/  → Review detail
src/components/ana/        → Soft skills form
src/components/sales/      → 3 tab views
src/components/finance/    → Per-profile calculator
src/services/              → API call functions
src/stores/                → Zustand state management
```

## Azure Monthly Cost Estimate
App Service B1 ($13-55) + SQL S1 ($25-30) + Blob ($5-10) + Anthropic ($10-50) = **~$53-145/mo**

## Key Decisions
1. Start with JSON column, normalize when you need SQL queries on tech stacks
2. Start monolith, split to microservices only if team grows
3. Add SignalR for real-time pipeline updates
4. Use QuestPDF or Puppeteer for proper PDF generation
