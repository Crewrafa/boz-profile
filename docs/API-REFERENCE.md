# API Reference — BOZ Verified Fit

All endpoints are Vercel serverless functions. Auth via `Authorization: Bearer <token>`.

## POST /api/auth
| Action | Body | Response |
|--------|------|----------|
| `login` | `{action:"login", email, password}` | `{access_token, refresh_token, email, role, name}` |
| `create_user` | `{action:"create_user", email, password, role, name}` | `{ok:true}` |
| _(role lookup)_ | Just Bearer token | `{email, role, name, id}` |

Rate limit: 15 req/min per IP.

## GET /api/admin
Returns all non-deleted profiles. Requires admin/recruiter/sales token.

## POST /api/admin
Rate limit: 120 req/min. Input sanitized. Actions:

| Action | Purpose | Key Fields |
|--------|---------|-----------|
| `update_status` | Change profile status | id, status |
| `list_candidates` | Get all candidates | — |
| `add_candidate` | Add to talent pool | name, skills[], seniority, etc. |
| `update_candidate` | Edit candidate | id + fields to update |
| `assign_candidate` | Assign to profile | profile_id, candidate_id |
| `update_assignment` | Change pipeline stage | id, status |
| `list_assignments` | All assignments + candidates | — |
| `upload_document` | Upload CV/eval to storage | candidate_id, doc_type, file_base64, file_name |
| `list_documents` | Get docs for candidate | candidate_id, profile_id |
| `delete_document` | Remove doc | doc_id, file_path |
| `soft_delete_profile` | Move to trash | id |
| `restore` | Restore from trash | id, table |
| `list_deleted` | Get trash items | — |
| `get_audit_log` | Activity log | — |
| `authorize_review` | Lock/unlock review link | profile_id, authorized (bool) |
| `get_pricing` | Get finance data | profile_id (optional) |
| `save_pricing` | Save/update pricing | profile_id, client_rate, rockstar_salary, etc. |
| `list_all_pricing` | All profiles + pricing | — |
| `get_review_data` | Profile + assignments + docs | profile_id |
| `get_jd_url` | Signed URL for JD download | file_path |
| `get_document_url` | Signed URL for doc download | file_path |
| `update_client_decision` | Client accept/reject | assignment_id, decision |

## POST /api/client
| Action | Purpose |
|--------|---------|
| `save_profile` | Submit new profile from client form |
| `list_profiles` | Get profiles by authenticated user |
| `upload_jd` | Store JD in Supabase Storage |

## POST /api/claude
AI proxy. `{prompt, content, type:"document"}` → returns Claude response text.

## GET /api/pdf/[id]
Generates HTML-based profile PDF. No auth (uses service key internally).

## GET/POST /api/review/[id]
GET: Interactive review page. Shows "Not Ready" if unauthorized.
POST: `{assignment_id, decision:"accepted"|"rejected"}` saves client decision.

## POST /api/roles
User management. `{action:"add"|"update"|"delete", ...fields}`

## POST /api/ana, /api/recruiter
Module-specific data operations.
