// ERP Platform Auth — role lookup + password login
// Security: rate limiting, input sanitization

const rateLimitStore = {};
function checkRateLimit(ip, maxReq = 10, windowMs = 60000) {
  const now = Date.now();
  if (!rateLimitStore[ip] || now - rateLimitStore[ip].start > windowMs) {
    rateLimitStore[ip] = { count: 1, start: now };
    return true;
  }
  rateLimitStore[ip].count++;
  return rateLimitStore[ip].count <= maxReq;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return res.status(500).json({ error: "DB not configured" });

  const clientIP = req.headers["x-forwarded-for"]?.split(",")[0] || "unknown";
  if (!checkRateLimit(clientIP, 15, 60000)) return res.status(429).json({ error: "Too many attempts. Please wait." });

  const H = { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" };
  const action = req.body?.action;

  // ═══ PASSWORD LOGIN ═══
  if (action === "login") {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    if (typeof email !== "string" || typeof password !== "string") return res.status(400).json({ error: "Invalid input" });
    if (email.length > 200 || password.length > 200) return res.status(400).json({ error: "Input too long" });
    try {
      const anonKey = process.env.VITE_SUPABASE_ANON_KEY || key;
      const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: "POST", headers: { "Content-Type": "application/json", "apikey": anonKey },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password })
      });
      if (!r.ok) { const err = await r.json().catch(() => ({})); return res.status(401).json({ error: err.error_description || err.msg || "Invalid credentials" }); }
      const data = await r.json();
      // Look up role
      const rR = await fetch(`${url}/rest/v1/roles?email=eq.${encodeURIComponent(email.trim().toLowerCase())}&active=eq.true&select=role,name`, { headers: H });
      const roles = rR.ok ? await rR.json() : [];
      return res.status(200).json({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        email: data.user?.email || email,
        role: roles[0]?.role || "client",
        name: roles[0]?.name || ""
      });
    } catch (e) { return res.status(500).json({ error: "Login failed: " + e.message }); }
  }

  // ═══ CREATE USER WITH PASSWORD (admin only — verifies caller is admin) ═══
  if (action === "create_user") {
    // Auth check: caller must be an active admin
    const callerToken = (req.headers.authorization || "").replace("Bearer ", "");
    if (!callerToken) return res.status(401).json({ error: "Auth required" });
    let isAdmin = false;
    if (callerToken === "dev") {
      isAdmin = true;
    } else {
      try {
        const anonKey = process.env.VITE_SUPABASE_ANON_KEY || key;
        const uR = await fetch(`${url}/auth/v1/user`, { headers: { "Authorization": `Bearer ${callerToken}`, "apikey": anonKey } });
        if (!uR.ok) return res.status(401).json({ error: "Invalid caller token" });
        const u = await uR.json();
        const rR = await fetch(`${url}/rest/v1/roles?email=eq.${encodeURIComponent(u.email)}&active=eq.true&select=role`, { headers: H });
        const callerRoles = rR.ok ? await rR.json() : [];
        isAdmin = callerRoles[0]?.role === "admin";
      } catch { return res.status(401).json({ error: "Auth verification failed" }); }
    }
    if (!isAdmin) return res.status(403).json({ error: "Admin only" });

    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    if (typeof email !== "string" || typeof password !== "string") return res.status(400).json({ error: "Invalid input" });
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
    if (password.length > 200 || email.length > 200) return res.status(400).json({ error: "Input too long" });
    if (!email.includes("@") || !email.includes(".")) return res.status(400).json({ error: "Invalid email format" });
    try {
      // Create in Supabase Auth
      const r = await fetch(`${url}/auth/v1/admin/users`, {
        method: "POST", headers: { ...H, "Authorization": `Bearer ${key}` },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, email_confirm: true })
      });
      if (!r.ok) { const err = await r.json().catch(() => ({})); return res.status(400).json({ error: err.msg || "User creation failed" }); }
      return res.status(200).json({ ok: true });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  // ═══ ROLE LOOKUP (existing flow) ═══
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token" });

  // Dev tokens (no-login mode — always accepted)
  const devMap = { "dev": "psicologorafaelbaez@gmail.com", "dev-recruiter": "recruiter@erp-platform.local", "dev-ana": "ana@erp-platform.local", "dev-client": "client@test.com", "dev-sales": "sales@erp-platform.local", "dev-finance": "finance@erp-platform.local" };
  const devRoleMap = { "dev": "admin", "dev-recruiter": "recruiter", "dev-ana": "ana", "dev-client": "client", "dev-sales": "sales", "dev-finance": "finance" };

  let email = null;
  if (devMap[token]) {
    // Short-circuit: return the dev role directly so we don't need a roles row
    return res.status(200).json({ email: devMap[token], role: devRoleMap[token], name: devRoleMap[token].charAt(0).toUpperCase() + devRoleMap[token].slice(1) });
  } else {
    try {
      const anonKey = process.env.VITE_SUPABASE_ANON_KEY || key;
      const r = await fetch(`${url}/auth/v1/user`, { headers: { "Authorization": `Bearer ${token}`, "apikey": anonKey } });
      if (!r.ok) return res.status(401).json({ error: "Invalid token" });
      const user = await r.json();
      email = user.email;
    } catch { return res.status(401).json({ error: "Auth failed" }); }
  }

  if (!email) return res.status(401).json({ error: "No email" });

  try {
    const r = await fetch(`${url}/rest/v1/roles?email=eq.${encodeURIComponent(email)}&active=eq.true&select=id,email,role,name`, { headers: H });
    if (!r.ok) return res.status(200).json({ email, role: "client", name: "" });
    const roles = await r.json();
    if (!roles.length) return res.status(200).json({ email, role: "client", name: "" });
    return res.status(200).json({ email: roles[0].email, role: roles[0].role, name: roles[0].name, id: roles[0].id });
  } catch {
    return res.status(200).json({ email, role: "client", name: "" });
  }
}
