// BOZ Admin API — profiles, candidates, assignments
// Accessible by: admin + recruiter roles
// Security: rate limiting, input sanitization, auth verification

// ═══ RATE LIMITING (in-memory per instance) ═══
const rateLimitStore = {};
function checkRateLimit(ip, endpoint, maxReq = 60, windowMs = 60000) {
  const key = `${ip}:${endpoint}`;
  const now = Date.now();
  if (!rateLimitStore[key] || now - rateLimitStore[key].start > windowMs) {
    rateLimitStore[key] = { count: 1, start: now };
    return true;
  }
  rateLimitStore[key].count++;
  return rateLimitStore[key].count <= maxReq;
}

// ═══ INPUT SANITIZATION ═══
function sanitize(str) {
  if (typeof str !== "string") return str;
  return str.replace(/[<>'"`;\\]/g, "").replace(/javascript:/gi, "").replace(/on\w+=/gi, "").trim().substring(0, 5000);
}
function sanitizeObj(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "string") clean[k] = sanitize(v);
    else if (Array.isArray(v)) clean[k] = v.map(i => typeof i === "string" ? sanitize(i) : i);
    else if (typeof v === "object" && v !== null) clean[k] = sanitizeObj(v);
    else clean[k] = v;
  }
  return clean;
}

async function verifyAccess(req, url, key) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return null;
  const isProduction = process.env.VERCEL === "1" && process.env.VITE_DEV_MODE !== "true";
  // Dev tokens
  const devMap = { "dev": { email: "psicologorafaelbaez@gmail.com", role: "admin" }, "dev-recruiter": { email: "recruiter@bozusa.com", role: "recruiter" }, "dev-sales": { email: "sales@bozusa.com", role: "sales" } };
  if (devMap[token] && !isProduction) return devMap[token];
  if (devMap[token]) return null;
  try {
    const r = await fetch(`${url}/auth/v1/user`, { headers: { "Authorization": `Bearer ${token}`, "apikey": key } });
    if (!r.ok) return null;
    const user = await r.json();
    // Check roles table
    const rr = await fetch(`${url}/rest/v1/roles?email=eq.${encodeURIComponent(user.email)}&active=eq.true&select=role`, { headers: { "apikey": key, "Authorization": `Bearer ${key}` } });
    if (!rr.ok) return null;
    const roles = await rr.json();
    if (!roles.length || !["admin", "recruiter", "sales"].includes(roles[0].role)) return null;
    return { ...user, role: roles[0].role };
  } catch { return null; }
}

export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return res.status(500).json({ error: "DB not configured" });

  const admin = await verifyAccess(req, url, key);
  if (!admin) return res.status(403).json({ error: "Unauthorized" });

  // Rate limit check
  const clientIP = req.headers["x-forwarded-for"]?.split(",")[0] || req.headers["x-real-ip"] || "unknown";
  if (!checkRateLimit(clientIP, "admin", 120, 60000)) return res.status(429).json({ error: "Too many requests. Please wait." });

  // Sanitize body
  if (req.body && typeof req.body === "object") req.body = sanitizeObj(req.body);

  const H = { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" };
  const action = req.query.action || req.body?.action;

  // Helper: fetch from Supabase with error check
  async function sbFetch(path, opts = {}) {
    const r = await fetch(`${url}${path}`, { headers: H, ...opts, headers: { ...H, ...(opts.headers || {}) } });
    if (!r.ok) {
      const errText = await r.text().catch(() => "Unknown error");
      const err = new Error(errText);
      err.status = r.status;
      throw err;
    }
    const text = await r.text();
    if (!text) return null;
    return JSON.parse(text);
  }

  try {
    // ═══ HEALTH CHECK ═══
    if (req.method === "GET" && action === "health") {
      const keyPreview = key ? `${key.substring(0,10)}...${key.substring(key.length-5)}` : "NOT SET";
      const keyParts = key ? key.split(".").length : 0;
      try {
        const r = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, { headers: H });
        const ok = r.ok;
        return res.status(200).json({ db: ok ? "connected" : "error", keyParts, keyPreview, urlSet: !!url });
      } catch(e) {
        return res.status(200).json({ db: "error", error: e.message, keyParts, keyPreview, urlSet: !!url });
      }
    }

    // ═══ PROFILES ═══
    if (req.method === "GET" && !action) {
      const r = await fetch(`${url}/rest/v1/profiles?deleted_at=is.null&order=created_at.desc&select=id,created_at,client_name,client_company,client_email,role,category,seniority,experience,headcount,status,start_date,profile_data`, { headers: H });
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      return res.status(200).json(await r.json());
    }

    if (req.method === "PATCH" && !action) {
      const { id, status } = req.body;
      if (!id || !status) return res.status(400).json({ error: "id and status required" });
      const valid = ["new", "pending_review", "pending_soft", "in_progress", "sourcing", "filled", "closed"];
      if (!valid.includes(status)) return res.status(400).json({ error: "Invalid status" });
      await fetch(`${url}/rest/v1/profiles?id=eq.${id}`, { method: "PATCH", headers: { ...H, "Prefer": "return=minimal" }, body: JSON.stringify({ status }) });
      return res.status(200).json({ ok: true });
    }

    // ═══ CANDIDATES ═══
    if (action === "list_candidates") {
      const r = await fetch(`${url}/rest/v1/candidates?deleted_at=is.null&order=created_at.desc`, { headers: H });
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      return res.status(200).json(await r.json());
    }

    if (action === "add_candidate") {
      const { candidate } = req.body;
      if (!candidate?.name) return res.status(400).json({ error: "Name required" });
      const r = await fetch(`${url}/rest/v1/candidates`, { method: "POST", headers: { ...H, "Prefer": "return=representation" }, body: JSON.stringify(candidate) });
      if (!r.ok) { const err = await r.text(); return res.status(r.status).json({ error: err }); }
      const d = await r.json();
      return res.status(200).json(d[0] || d);
    }

    if (action === "delete_candidate") {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "id required" });
      // Soft delete
      await fetch(`${url}/rest/v1/candidates?id=eq.${id}`, { method: "PATCH", headers: { ...H, "Prefer": "return=minimal" }, body: JSON.stringify({ deleted_at: new Date().toISOString() }) });
      // Audit log
      await fetch(`${url}/rest/v1/audit_log`, { method: "POST", headers: H, body: JSON.stringify({ action: "delete", table_name: "candidates", record_id: id, performed_by: admin.email, details: {} }) });
      return res.status(200).json({ ok: true });
    }

    // ═══ SOFT DELETE PROFILE ═══
    if (action === "soft_delete_profile") {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: "id required" });
      if (admin.role !== "admin") return res.status(403).json({ error: "Admin only" });
      await fetch(`${url}/rest/v1/profiles?id=eq.${id}`, { method: "PATCH", headers: { ...H, "Prefer": "return=minimal" }, body: JSON.stringify({ deleted_at: new Date().toISOString() }) });
      await fetch(`${url}/rest/v1/audit_log`, { method: "POST", headers: H, body: JSON.stringify({ action: "delete", table_name: "profiles", record_id: id, performed_by: admin.email, details: {} }) });
      return res.status(200).json({ ok: true });
    }

    // ═══ RESTORE ═══
    if (action === "restore") {
      const { id, table_name } = req.body;
      if (!id || !table_name) return res.status(400).json({ error: "id and table_name required" });
      if (admin.role !== "admin") return res.status(403).json({ error: "Admin only" });
      const valid = ["profiles", "candidates", "profile_candidates"];
      if (!valid.includes(table_name)) return res.status(400).json({ error: "Invalid table" });
      await fetch(`${url}/rest/v1/${table_name}?id=eq.${id}`, { method: "PATCH", headers: { ...H, "Prefer": "return=minimal" }, body: JSON.stringify({ deleted_at: null }) });
      await fetch(`${url}/rest/v1/audit_log`, { method: "POST", headers: H, body: JSON.stringify({ action: "restore", table_name, record_id: id, performed_by: admin.email, details: {} }) });
      return res.status(200).json({ ok: true });
    }

    // ═══ LIST DELETED (Trash) ═══
    if (action === "list_deleted") {
      if (admin.role !== "admin") return res.status(403).json({ error: "Admin only" });
      const [pR, cR] = await Promise.all([
        fetch(`${url}/rest/v1/profiles?deleted_at=not.is.null&select=id,role,client_name,client_company,seniority,deleted_at&order=deleted_at.desc`, { headers: H }),
        fetch(`${url}/rest/v1/candidates?deleted_at=not.is.null&select=id,name,email,seniority,deleted_at&order=deleted_at.desc`, { headers: H }),
      ]);
      const profiles = pR.ok ? await pR.json() : [];
      const candidates = cR.ok ? await cR.json() : [];
      return res.status(200).json({ profiles, candidates });
    }

    // ═══ AUDIT LOG ═══
    if (action === "get_audit_log") {
      if (admin.role !== "admin") return res.status(403).json({ error: "Admin only" });
      const r = await fetch(`${url}/rest/v1/audit_log?order=created_at.desc&limit=50`, { headers: H });
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      return res.status(200).json(await r.json());
    }

    // ═══ ASSIGNMENTS (profile ↔ candidate) ═══
    if (action === "list_assignments") {
      const { profile_id } = req.method === "GET" ? req.query : req.body;
      const q = profile_id ? `?profile_id=eq.${profile_id}&deleted_at=is.null&select=*,candidates(*)` : "?deleted_at=is.null&select=*,candidates(*)";
      const r = await fetch(`${url}/rest/v1/profile_candidates${q}&order=created_at.desc`, { headers: H });
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      return res.status(200).json(await r.json());
    }

    if (action === "assign_candidate") {
      const { profile_id, candidate_id, match_score, notes } = req.body;
      if (!profile_id || !candidate_id) return res.status(400).json({ error: "IDs required" });
      const r = await fetch(`${url}/rest/v1/profile_candidates`, { method: "POST", headers: { ...H, "Prefer": "return=representation" },
        body: JSON.stringify({ profile_id, candidate_id, match_score: match_score || 0, notes: notes || "", status: "data_verification" }) });
      if (!r.ok) { const err = await r.text(); return res.status(r.status).json({ error: err }); }
      const d = await r.json();
      return res.status(200).json(d[0] || d);
    }

    if (action === "update_assignment") {
      const { id, status, match_score, notes } = req.body;
      if (!id) return res.status(400).json({ error: "ID required" });
      const updates = {};
      if (status) updates.status = status;
      if (match_score !== undefined) updates.match_score = match_score;
      if (notes !== undefined) updates.notes = notes;
      await fetch(`${url}/rest/v1/profile_candidates?id=eq.${id}`, { method: "PATCH", headers: { ...H, "Prefer": "return=minimal" }, body: JSON.stringify(updates) });
      return res.status(200).json({ ok: true });
    }

    if (action === "remove_assignment") {
      const { id } = req.body;
      await fetch(`${url}/rest/v1/profile_candidates?id=eq.${id}`, { method: "DELETE", headers: H });
      return res.status(200).json({ ok: true });
    }

    // ═══ UPDATE CANDIDATE ═══
    if (action === "update_candidate") {
      const { id, data } = req.body;
      if (!id || !data) return res.status(400).json({ error: "id and data required" });
      // Whitelist allowed fields — only columns that exist in candidates table
      const allowed = ["name","email","phone","seniority","experience","location","english_level","notes","skills","photo_url"];
      const safe = {};
      for (const k of allowed) { if (data[k] !== undefined) safe[k] = data[k]; }
      if (!Object.keys(safe).length) return res.status(400).json({ error: "No valid fields to update" });
      const r = await fetch(`${url}/rest/v1/candidates?id=eq.${id}`, { method: "PATCH", headers: { ...H, "Prefer": "return=representation" }, body: JSON.stringify(safe) });
      if (!r.ok) { const err = await r.text(); return res.status(r.status).json({ error: err }); }
      const d = await r.json();
      return res.status(200).json(d[0] || d);
    }

    // ═══ DOCUMENTS (Supabase Storage) ═══
    if (action === "upload_document") {
      const { candidate_id, profile_id, doc_type, file_base64, file_name, mime_type } = req.body;
      if (!candidate_id || !doc_type || !file_base64 || !file_name) {
        return res.status(400).json({ error: "candidate_id, doc_type, file_base64, file_name required" });
      }
      const validTypes = ["cv", "soft_eval", "hard_eval"];
      if (!validTypes.includes(doc_type)) return res.status(400).json({ error: "Invalid doc_type" });

      // Upload to Supabase Storage
      const buffer = Buffer.from(file_base64, "base64");
      const safeName = file_name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${candidate_id}/${doc_type}_${Date.now()}_${safeName}`;
      const upRes = await fetch(`${url}/storage/v1/object/documents/${path}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${key}`, "apikey": key, "Content-Type": mime_type || "application/octet-stream", "x-upsert": "true" },
        body: buffer,
      });
      if (!upRes.ok) {
        const err = await upRes.text();
        return res.status(500).json({ error: "Storage upload failed: " + err });
      }

      // Save metadata to DB
      const meta = { candidate_id, profile_id: profile_id || null, doc_type, file_path: path, file_name: safeName, file_size: buffer.length };
      const r = await fetch(`${url}/rest/v1/candidate_documents`, { method: "POST", headers: { ...H, "Prefer": "return=representation" }, body: JSON.stringify(meta) });
      if (!r.ok) { const err = await r.text(); return res.status(r.status).json({ error: err }); }
      const d = await r.json();
      return res.status(200).json(d[0] || d);
    }

    if (action === "list_documents") {
      const { candidate_id, profile_id } = req.body || req.query;
      let q = "?order=created_at.desc";
      if (candidate_id) q += `&candidate_id=eq.${candidate_id}`;
      if (profile_id) q += `&profile_id=eq.${profile_id}`;
      const r = await fetch(`${url}/rest/v1/candidate_documents${q}`, { headers: H });
      if (!r.ok) return res.status(r.status).json({ error: await r.text() });
      return res.status(200).json(await r.json());
    }

    if (action === "delete_document") {
      const { id, file_path } = req.body;
      if (!id) return res.status(400).json({ error: "id required" });
      // Delete from storage
      if (file_path) {
        await fetch(`${url}/storage/v1/object/documents/${file_path}`, {
          method: "DELETE", headers: { "Authorization": `Bearer ${key}`, "apikey": key }
        });
      }
      // Delete metadata
      await fetch(`${url}/rest/v1/candidate_documents?id=eq.${id}`, { method: "DELETE", headers: H });
      return res.status(200).json({ ok: true });
    }

    // ═══ CLIENT DECISIONS ═══
    if (action === "update_client_decision") {
      const { assignment_id, decision } = req.body;
      if (!assignment_id || !decision) return res.status(400).json({ error: "assignment_id and decision required" });
      const validDecisions = ["pending", "accepted", "rejected"];
      if (!validDecisions.includes(decision)) return res.status(400).json({ error: "Invalid decision" });
      await fetch(`${url}/rest/v1/profile_candidates?id=eq.${assignment_id}`, {
        method: "PATCH", headers: { ...H, "Prefer": "return=minimal" },
        body: JSON.stringify({ client_decision: decision })
      });
      return res.status(200).json({ ok: true });
    }

    // ═══ REVIEW DATA (full profile + assigned candidates for client review) ═══
    if (action === "get_review_data") {
      const { profile_id } = req.body;
      if (!profile_id) return res.status(400).json({ error: "profile_id required" });
      const [pR, aR] = await Promise.all([
        fetch(`${url}/rest/v1/profiles?id=eq.${profile_id}&select=*`, { headers: H }),
        fetch(`${url}/rest/v1/profile_candidates?profile_id=eq.${profile_id}&select=*,candidates(*)&order=match_score.desc`, { headers: H }),
      ]);
      const profile = (await pR.json())[0];
      const assignments = await aR.json();
      // Get documents for all assigned candidates
      const candIds = assignments.map(a => a.candidate_id).filter(Boolean);
      let docs = [];
      if (candIds.length) {
        const dR = await fetch(`${url}/rest/v1/candidate_documents?candidate_id=in.(${candIds.join(",")})&profile_id=eq.${profile_id}`, { headers: H });
        docs = await dR.json();
      }
      return res.status(200).json({ profile, assignments, documents: docs });
    }

    // ═══ JD SIGNED URL ═══
    if (action === "get_jd_url") {
      const { file_path } = req.body;
      if (!file_path) return res.status(400).json({ error: "file_path required" });
      const r = await fetch(`${url}/storage/v1/object/sign/documents/${file_path}`, {
        method: "POST", headers: { ...H }, body: JSON.stringify({ expiresIn: 3600 })
      });
      const d = await r.json();
      return res.status(200).json({ url: d.signedURL ? `${url}/storage/v1${d.signedURL}` : null });
    }

    // ═══ STORAGE URL (signed download URL) ═══
    if (action === "get_document_url") {
      const { file_path } = req.body;
      if (!file_path) return res.status(400).json({ error: "file_path required" });
      const r = await fetch(`${url}/storage/v1/object/sign/documents/${file_path}`, {
        method: "POST", headers: { ...H }, body: JSON.stringify({ expiresIn: 3600 })
      });
      const d = await r.json();
      return res.status(200).json({ url: `${url}/storage/v1${d.signedURL}` });
    }

    // ═══ AUTHORIZE REVIEW LINK ═══
    if (action === "authorize_review") {
      const { profile_id, authorized } = req.body;
      if (!profile_id) return res.status(400).json({ error: "profile_id required" });
      // Read current profile_data, add flag
      const pR = await fetch(`${url}/rest/v1/profiles?id=eq.${profile_id}&select=profile_data`, { headers: H });
      const pD = (await pR.json())[0];
      const pd = pD?.profile_data || {};
      pd.reviewAuthorized = authorized !== false;
      pd.reviewAuthorizedAt = authorized !== false ? new Date().toISOString() : null;
      pd.reviewAuthorizedBy = admin.email;
      await fetch(`${url}/rest/v1/profiles?id=eq.${profile_id}`, { method: "PATCH", headers: { ...H, "Prefer": "return=minimal" }, body: JSON.stringify({ profile_data: pd }) });
      await fetch(`${url}/rest/v1/audit_log`, { method: "POST", headers: H, body: JSON.stringify({ action: authorized !== false ? "authorize_review" : "revoke_review", table_name: "profiles", record_id: profile_id, performed_by: admin.email, details: {} }) });
      return res.status(200).json({ ok: true });
    }

    // ═══ FINANCE PRICING ═══
    if (action === "get_pricing") {
      const { profile_id } = req.body;
      if (profile_id) {
        const r = await fetch(`${url}/rest/v1/finance_pricing?profile_id=eq.${profile_id}&order=created_at.desc&limit=1`, { headers: H });
        return res.status(200).json(r.ok ? (await r.json())[0] || null : null);
      }
      const r = await fetch(`${url}/rest/v1/finance_pricing?order=created_at.desc`, { headers: H });
      return res.status(200).json(r.ok ? await r.json() : []);
    }

    if (action === "save_pricing") {
      const { profile_id, client_rate, rockstar_salary, resources, contract_months, vacation_days, holiday_country, notes } = req.body;
      if (!profile_id) return res.status(400).json({ error: "profile_id required" });
      // Upsert: check if exists
      const eR = await fetch(`${url}/rest/v1/finance_pricing?profile_id=eq.${profile_id}&limit=1`, { headers: H });
      const existing = (await eR.json())[0];
      const data = { profile_id, client_rate: client_rate || 0, rockstar_salary: rockstar_salary || 0, resources: resources || 1, contract_months: contract_months || 12, vacation_days: vacation_days ?? 10, holiday_country: holiday_country || "Mexico", notes: notes || "", updated_at: new Date().toISOString() };
      if (existing) {
        await fetch(`${url}/rest/v1/finance_pricing?id=eq.${existing.id}`, { method: "PATCH", headers: { ...H, "Prefer": "return=minimal" }, body: JSON.stringify(data) });
      } else {
        await fetch(`${url}/rest/v1/finance_pricing`, { method: "POST", headers: { ...H, "Prefer": "return=minimal" }, body: JSON.stringify(data) });
      }
      return res.status(200).json({ ok: true });
    }

    if (action === "list_all_pricing") {
      if (admin.role !== "admin" && admin.role !== "finance") return res.status(403).json({ error: "Admin/Finance only" });
      const [pR, fR] = await Promise.all([
        fetch(`${url}/rest/v1/profiles?deleted_at=is.null&select=id,role,client_name,client_company,seniority,status&order=created_at.desc`, { headers: H }),
        fetch(`${url}/rest/v1/finance_pricing?order=created_at.desc`, { headers: H }),
      ]);
      const profiles = pR.ok ? await pR.json() : [];
      const pricing = fR.ok ? await fR.json() : [];
      return res.status(200).json({ profiles, pricing });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
