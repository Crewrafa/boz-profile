# Architecture — BOZ Verified Fit

## System Overview

```
  Frontend (React+Vite on Vercel)
         │ HTTPS
  Vercel Serverless APIs (/api/*)
         │ service_role key
  Supabase (PostgreSQL + Auth + Storage)
         │
  Anthropic Claude API (via /api/claude.js)
```

**CRITICAL RULE:** Client NEVER talks directly to Supabase. All requests go through `/api/*` endpoints using the service_role key. This is the security model.

## Database Schema (9 tables)

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| `profiles` | Job requests | id, role, seniority, status, profile_data (JSONB), client_name, client_company, deleted_at |
| `candidates` | Talent pool | id, name, skills[], seniority, location, english_level, deleted_at |
| `profile_candidates` | Assignments | id, profile_id, candidate_id, status (pipeline stage), match_score, client_decision |
| `candidate_documents` | File metadata | id, candidate_id, doc_type (cv/soft_eval/hard_eval), file_path |
| `roles` | Platform users | id, email, name, role (admin/recruiter/ana/sales/finance/client), active |
| `audit_log` | Action tracking | id, action, performed_by, record_id, created_at |
| `finance_pricing` | Revenue/profile | id, profile_id, client_rate, rockstar_salary, resources, contract_months |
| `rate_limits` | API throttling | id, ip_address, endpoint, request_count, window_start |
| `profile_shares` | (Legacy) | Sharing metadata |

## Status Flows

**Profile:** `new → pending_review → pending_soft → in_progress → sourcing → filled (Ready for Client) → closed`

**Candidate stages:** `data_verification → schedule_ts → ready_ts → schedule_technical → ready_technical → schedule_client → ready_client → client_approval → hired | waiting | discarded`

## Security

- **Auth:** Supabase Auth (email+password). Tokens verified server-side on every request.
- **Rate limit:** In-memory per IP. admin.js: 120/min. auth.js: 15/min.
- **Input sanitization:** `sanitizeObj()` strips `<>'";\`, `javascript:`, `onXXX=` from all inputs.
- **RLS:** Enabled on ALL tables with permissive policies for service_role.
- **Dev mode:** Gated by `VITE_DEV_MODE` env var. Disabled when absent.
- **Soft delete:** `deleted_at` timestamp, never hard delete. Restorable from Trash view.
- **Review lock:** Review links blocked until Admin clicks "Authorize".

## JSONB: profile_data

The `profile_data` column stores ALL structured data from the client form:
```json
{
  "role": "Backend Developer", "category": "Technical",
  "techStack": { "languages": ["Java"], "frameworks": ["Spring Boot"], "clouds": ["AWS"], "databases": ["PostgreSQL"], "devopsTools": ["Docker"] },
  "mustHave": ["Java", "PostgreSQL"], "niceToHave": ["Python"],
  "aiObjective": "AI-generated...", "aiResponsibilities": ["..."],
  "jdFilePath": "jd/uuid/file.pdf", "jdFileName": "job-desc.pdf",
  "reviewAuthorized": true, "reviewAuthorizedBy": "admin@boz.com",
  "softSkills": { "personality": ["Analytical"], "keyStrengths": ["Problem solving"], "softSkillsSummary": "..." }
}
```

## File Storage

Supabase Storage bucket `documents/`:
- `{candidate_id}/{doc_type}_{timestamp}_{filename}` → CVs, evaluations
- `jd/{profile_id}/{timestamp}_{filename}` → Client JD uploads
- Download via signed URLs (1hr expiry) generated server-side
