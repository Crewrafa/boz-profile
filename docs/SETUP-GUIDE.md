# Setup Guide — BOZ Verified Fit

## 1. Supabase

1. Create project at supabase.com
2. Note: **Project URL**, **anon key**, **service_role key** (Settings → API)
3. Run SQL from `docs/ARCHITECTURE.md` database schema section or use this complete script:

```sql
-- Create all tables
CREATE TABLE IF NOT EXISTS profiles (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, client_name text, client_company text, client_email text, start_date text, role text NOT NULL, category text NOT NULL, seniority text, experience text, headcount integer DEFAULT 1, profile_data jsonb DEFAULT '{}', pdf_html text DEFAULT '', user_id text, status text DEFAULT 'new', deleted_at timestamptz, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS candidates (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, name text NOT NULL, email text, phone text, seniority text, experience text, location text, english_level text, skills text[] DEFAULT '{}', languages text[] DEFAULT '{}', frameworks text[] DEFAULT '{}', notes text DEFAULT '', photo_url text, deleted_at timestamptz, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS profile_candidates (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, profile_id uuid NOT NULL, candidate_id uuid NOT NULL, status text DEFAULT 'data_verification', match_score integer DEFAULT 0, client_decision text, notes text DEFAULT '', deleted_at timestamptz, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS candidate_documents (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, candidate_id uuid NOT NULL, profile_id uuid, doc_type text NOT NULL, file_path text NOT NULL, file_name text, file_size integer, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS roles (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, email text NOT NULL UNIQUE, name text DEFAULT '', role text NOT NULL DEFAULT 'client', active boolean DEFAULT true, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS audit_log (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, action text NOT NULL, table_name text, record_id text, performed_by text, details jsonb DEFAULT '{}', created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS finance_pricing (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, profile_id uuid NOT NULL, client_rate numeric DEFAULT 0, rockstar_salary numeric DEFAULT 0, resources integer DEFAULT 1, contract_months integer DEFAULT 12, vacation_days integer DEFAULT 10, holiday_country text DEFAULT 'Mexico', notes text DEFAULT '', created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS rate_limits (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, ip_address text NOT NULL, endpoint text NOT NULL, request_count integer DEFAULT 1, window_start timestamptz DEFAULT now());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_pc_profile ON profile_candidates(profile_id);
CREATE INDEX IF NOT EXISTS idx_finance_profile ON finance_pricing(profile_id);

-- RLS on ALL tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Policies (permissive for service_role)
CREATE POLICY "svc_all" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "svc_all" ON candidates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "svc_all" ON profile_candidates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "svc_all" ON candidate_documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "svc_all" ON roles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "svc_all" ON audit_log FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "svc_all" ON finance_pricing FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "svc_all" ON rate_limits FOR ALL USING (true) WITH CHECK (true);
```

4. **Storage:** Create bucket `documents` (private)
5. **Auth:** Go to Authentication → Providers → Email → Enable signup ON, Confirm email OFF
6. **Create admin:** Auth → Users → Add User (email+password), then INSERT INTO roles

## 2. Anthropic Key
Get from console.anthropic.com

## 3. Vercel
Push to GitHub, import in Vercel, set env vars:
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `ANTHROPIC_API_KEY`
- Do NOT add `VITE_DEV_MODE` for production

## 4. Local Dev
```bash
npm install && cp .env.example .env  # fill keys
npm run dev
```
