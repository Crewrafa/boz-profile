// Client Review — Interactive candidate view for client decision
// GET /api/review/[profile_id] → serves interactive HTML page
// POST /api/review/[profile_id] → handles accept/reject decisions
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id || !uuidRe.test(id)) return res.status(400).send("Invalid ID");

  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return res.status(500).send("DB not configured");
  const H = { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" };

  // POST: Handle client decision
  if (req.method === "POST") {
    const { assignment_id, decision } = req.body;
    if (!assignment_id || !["accepted", "rejected", "pending"].includes(decision)) {
      return res.status(400).json({ error: "Invalid decision" });
    }
    const vR = await fetch(`${url}/rest/v1/profile_candidates?id=eq.${assignment_id}&profile_id=eq.${id}`, { headers: H });
    const vD = await vR.json();
    if (!vD.length) return res.status(404).json({ error: "Assignment not found" });
    await fetch(`${url}/rest/v1/profile_candidates?id=eq.${assignment_id}`, {
      method: "PATCH", headers: { ...H, "Prefer": "return=minimal" },
      body: JSON.stringify({ client_decision: decision })
    });
    return res.status(200).json({ ok: true });
  }

  if (req.method !== "GET") return res.status(405).send("Method not allowed");

  try {
    const [pR, aR] = await Promise.all([
      fetch(`${url}/rest/v1/profiles?id=eq.${id}&select=*`, { headers: H }),
      fetch(`${url}/rest/v1/profile_candidates?profile_id=eq.${id}&deleted_at=is.null&select=*,candidates(*)&order=match_score.desc`, { headers: H }),
    ]);
    const profile = (await pR.json())[0];
    if (!profile) return res.status(404).send("Profile not found");
    const pd = profile.profile_data || {};
    
    // Check if review is authorized
    if (!pd.reviewAuthorized) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>BOZ — Not Ready</title><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'DM Sans',sans-serif;background:#f1f5f9;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}</style></head><body><div style="text-align:center;max-width:420px"><div style="font-size:28px;font-weight:800;color:#0D2550;font-family:'Plus Jakarta Sans',sans-serif;letter-spacing:1.5px;margin-bottom:8px">BOZ<span style="color:#22d3ee">.</span></div><div style="font-size:10px;color:#94a3b8;letter-spacing:3px;text-transform:uppercase;margin-bottom:32px">Verified Fit</div><div style="font-size:48px;margin-bottom:16px">🔒</div><div style="font-size:20px;font-weight:700;color:#0D2550;font-family:'Plus Jakarta Sans',sans-serif">Candidates Not Ready Yet</div><div style="font-size:14px;color:#64748b;margin-top:8px;line-height:1.6">Our team is still working on finding the best candidates for this position. You'll receive a notification when they're ready for your review.</div><div style="margin-top:24px;font-size:12px;color:#94a3b8">BOZ IT Staffing · Confidential</div></div></body></html>`);
    }
    
    const assignments = await aR.json();

    const candIds = assignments.map(a => a.candidate_id).filter(Boolean);
    let docs = [];
    if (candIds.length) {
      const dR = await fetch(`${url}/rest/v1/candidate_documents?candidate_id=in.(${candIds.join(",")})&profile_id=eq.${id}`, { headers: H });
      docs = await dR.json();
    }
    for (const doc of docs) {
      try {
        const sR = await fetch(`${url}/storage/v1/object/sign/documents/${doc.file_path}`, {
          method: "POST", headers: H, body: JSON.stringify({ expiresIn: 7200 })
        });
        const sD = await sR.json();
        doc.signed_url = sD.signedURL ? `${url}/storage/v1${sD.signedURL}` : null;
      } catch { doc.signed_url = null; }
    }

    const e = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const html = buildReviewHTML(profile, assignments, docs, pd, e, id);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "private, no-cache");
    return res.send(html);
  } catch (err) {
    return res.status(500).send("Server error: " + err.message);
  }
}

function buildReviewHTML(profile, assignments, docs, pd, e, profileId) {
  const mh = pd.mustHave || [];
  const nh = pd.niceToHave || [];
  const clientName = e(profile.client_name || "Client");
  const clientCompany = e(profile.client_company || "");
  const clientInitials = clientCompany ? clientCompany.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase() : "CL";
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const cards = assignments.map((a, idx) => {
    const c = a.candidates || {};
    const ms = a.match_score || 0;
    const msCol = ms >= 80 ? "#059669" : ms >= 50 ? "#f59e0b" : "#dc2626";
    const cSkills = [...(c.skills || []), ...(c.languages || []), ...(c.frameworks || [])];
    const cDocs = docs.filter(d => d.candidate_id === c.id);
    const cvDoc = cDocs.find(d => d.doc_type === "cv");
    const softDoc = cDocs.find(d => d.doc_type === "soft_eval");
    const hardDoc = cDocs.find(d => d.doc_type === "hard_eval");
    const decision = a.client_decision || "pending";
    const initials = (c.name || "?").split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase();

    const mustMatch = cSkills.filter(s => mh.some(m => m.toLowerCase() === s.toLowerCase()));
    const niceMatch = cSkills.filter(s => nh.some(n => n.toLowerCase() === s.toLowerCase()));
    const missing = mh.filter(m => !cSkills.some(s => s.toLowerCase() === m.toLowerCase()));

    // Score breakdown
    const techScore = mh.length ? Math.round((mustMatch.length / mh.length) * 100) : 50;
    const senMatch = (c.seniority && pd.seniority && c.seniority === pd.seniority) ? 100 : c.seniority ? 60 : 0;
    const stackScore = nh.length ? Math.round((niceMatch.length / nh.length) * 100) : 50;
    const engScore = c.english_level ? 80 : 50;

    const softSkills = pd.softSkills || null; // Only Ana's structured soft skills, never recruiter notes

    // Score bar helper
    const bar = (label, val, color) => `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="font-size:11px;color:#475569">${label}</span><span style="font-size:12px;font-weight:700;color:${color}">${val}%</span></div><div style="height:6px;background:#e2e8f0;border-radius:3px;overflow:hidden"><div style="height:100%;width:${val}%;background:${color};border-radius:3px"></div></div></div>`;

    return `<div class="card" id="card-${a.id}" data-decision="${decision}">
      <div class="card-hdr">
        <div class="card-left">
          <div class="avatar">${c.photo_url ? `<img src="${e(c.photo_url)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:14px"/>` : `<span class="avatar-txt">${initials}</span>`}</div>
          <div class="video-box"><div style="font-size:20px;opacity:.5">▶</div><div style="font-size:9px;color:rgba(255,255,255,.4);margin-top:4px">Video Profile</div></div>
        </div>
        <div class="card-right">
          <div class="c-id">ID ${e(c.id?.substring(0, 13) || "—")}</div>
          <div class="c-name">${e(c.name)}</div>
          <div class="c-role">${e(c.seniority || "")} · ${e(c.experience || "")} experience</div>
          <div class="c-loc">📍 ${e(c.location || "—")} · ${e(c.english_level || "—")}</div>
          <div class="score-area">
            <div class="score-ring"><div class="score-num" style="color:${msCol}">${ms}%</div><div class="score-label">MATCH</div></div>
            <div class="score-bars">
              <div style="font-size:10px;font-weight:700;color:#64748b;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">Score Breakdown</div>
              ${bar("Technical Skills", techScore, "#1B6FE8")}
              ${bar("Seniority", senMatch, "#059669")}
              ${bar("Stack Overlap", stackScore, "#8b5cf6")}
              ${bar("English", engScore, "#f59e0b")}
            </div>
          </div>
          <div class="skills-vs">
            <div style="font-size:10px;font-weight:700;color:#64748b;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">Skills vs. Profile Requirements</div>
            <div class="tags-wrap">
              ${mustMatch.map(s => `<span class="sk matched">✓ ${e(s)}</span>`).join("")}
              ${niceMatch.map(s => `<span class="sk nice">~ ${e(s)}</span>`).join("")}
              ${missing.map(s => `<span class="sk miss">○ ${e(s)}</span>`).join("")}
              ${!mustMatch.length && !niceMatch.length && !missing.length ? `<span style="font-size:11px;color:#94a3b8">No skills data</span>` : ""}
            </div>
          </div>
        </div>
      </div>

      ${softSkills ? `<div class="soft-section">
        <div style="font-size:10px;font-weight:700;color:#7C3AED;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px">🧠 Soft Skills Profile</div>
        ${softSkills.personality?.length ? `<div class="soft-row"><span class="soft-label">Personality</span><div class="tags-wrap">${softSkills.personality.map(t => `<span class="sk soft">${e(t)}</span>`).join("")}</div></div>` : ""}
        ${softSkills.keyStrengths?.length ? `<div class="soft-row"><span class="soft-label">Strengths</span><div class="tags-wrap">${softSkills.keyStrengths.map(t => `<span class="sk str">${e(t)}</span>`).join("")}</div></div>` : ""}
        ${softSkills.softSkillsSummary ? `<div style="font-size:12px;color:#475569;line-height:1.6;margin-top:8px;padding:10px 14px;background:#f8fafc;border-radius:8px">${e(softSkills.softSkillsSummary)}</div>` : ""}
      </div>` : ""}

      <div class="compliance">
        <div style="font-weight:700;color:#0F172A;margin-bottom:2px">Profile Compliance Score</div>
        <div style="font-size:12px;color:#64748b;margin-bottom:12px">How well this candidate fulfills your defined requirements (0–100)</div>
        <div style="height:10px;border-radius:5px;overflow:hidden;background:linear-gradient(90deg,#dc2626,#f59e0b,#10b981);margin-bottom:4px"><div style="height:100%;width:${100 - ms}%;background:#e2e8f0;margin-left:auto"></div></div>
        <div style="font-size:13px;color:#334155">Overall compliance: <strong>${ms}%</strong></div>
      </div>

      <div class="docs-row">
        ${cvDoc ? `<a href="${cvDoc.signed_url || "#"}" target="_blank" class="doc-btn">📄 CV</a>` : `<span class="doc-pending">📄 CV pending</span>`}
        ${softDoc ? `<a href="${softDoc.signed_url || "#"}" target="_blank" class="doc-btn">🧠 Soft Skills</a>` : `<span class="doc-pending">🧠 Soft eval pending</span>`}
        ${hardDoc ? `<a href="${hardDoc.signed_url || "#"}" target="_blank" class="doc-btn">⚙️ Hard Skills</a>` : `<span class="doc-pending">⚙️ Hard eval pending</span>`}
      </div>

      <div class="decision">
        <div class="dec-status" id="status-${a.id}" style="color:${decision === "accepted" ? "#059669" : decision === "rejected" ? "#dc2626" : "#94a3b8"}">
          ${decision === "accepted" ? "✅ Accepted" : decision === "rejected" ? "❌ Rejected" : "⏳ Pending your decision"}
        </div>
        <div class="dec-btns">
          <button class="btn-no ${decision === "rejected" ? "on" : ""}" onclick="decide('${a.id}','rejected')" title="Reject">✕</button>
          <button class="btn-yes ${decision === "accepted" ? "on" : ""}" onclick="decide('${a.id}','accepted')" title="Accept">✓</button>
        </div>
      </div>
    </div>`;
  }).join("");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${clientCompany || "BOZ"} — Candidate Review</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=DM+Sans:ital,wght@0,400;0,500;0,600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',system-ui,sans-serif;background:#f1f5f9;color:#1e293b;-webkit-font-smoothing:antialiased}
h1,h2,h3,.c-name,.score-num{font-family:'Plus Jakarta Sans',sans-serif}
.top-bar{background:#0D2550;padding:16px 28px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px}
.logo{font-size:22px;font-weight:800;color:#fff;letter-spacing:1.5px}.logo span{color:#22d3ee}
.client-brand{display:flex;align-items:center;gap:10px}
.client-init{width:36px;height:36px;border-radius:8px;background:linear-gradient(135deg,#1B6FE8,#22D3EE);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff}
.client-info{text-align:right}
.client-co{font-size:14px;font-weight:700;color:#fff}
.client-date{font-size:10px;color:rgba(255,255,255,.4)}
.profile-bar{background:linear-gradient(90deg,#1B6FE8,#0D2550);padding:18px 28px;color:#fff}
.profile-title{font-size:20px;font-weight:700;font-family:'Plus Jakarta Sans',sans-serif;letter-spacing:-.02em}
.profile-meta{font-size:12px;opacity:.7;margin-top:4px}
.tags-bar{padding:10px 28px;background:#fff;border-bottom:1px solid #e2e8f0;display:flex;flex-wrap:wrap;gap:5px}
.tag-pill{background:#f0f4ff;color:#1B6FE8;padding:3px 10px;border-radius:6px;font-size:10px;font-weight:600}
.wrap{max-width:940px;margin:0 auto;padding:20px 16px 60px}
.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px}
.sum{background:#fff;border-radius:10px;padding:14px;text-align:center;border:1px solid #e2e8f0}
.sum b{font-size:26px;font-weight:800;display:block;font-family:'Plus Jakarta Sans',sans-serif}
.sum small{font-size:10px;color:#64748b}
.card{background:#fff;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:16px;overflow:hidden;transition:all .3s}
.card[data-decision="accepted"]{border-color:#059669;box-shadow:0 0 0 2px rgba(5,150,105,.12)}
.card[data-decision="rejected"]{opacity:.5}
.card-hdr{display:flex;gap:20px;padding:22px 24px;flex-wrap:wrap}
.card-left{display:flex;flex-direction:column;gap:10px;align-items:center;width:150px;flex-shrink:0}
.avatar{width:150px;height:150px;border-radius:14px;overflow:hidden;background:linear-gradient(135deg,#0D2550 0%,#1B3A70 100%);display:flex;align-items:center;justify-content:center}
.avatar-txt{font-size:48px;font-weight:800;color:rgba(255,255,255,.6);font-family:'Plus Jakarta Sans',sans-serif}
.video-box{width:150px;height:80px;background:#0D2550;border-radius:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff}
.card-right{flex:1;min-width:240px}
.c-id{font-size:10px;color:#94a3b8;letter-spacing:.5px}
.c-name{font-size:22px;font-weight:700;color:#0D2550;margin:4px 0 2px;letter-spacing:-.02em}
.c-role{font-size:13px;color:#475569}.c-loc{font-size:12px;color:#64748b;margin-top:2px}
.score-area{display:flex;gap:20px;margin-top:16px;align-items:flex-start;flex-wrap:wrap}
.score-ring{min-width:80px;text-align:center;padding:12px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0}
.score-num{font-size:32px;font-weight:800;line-height:1}
.score-label{font-size:9px;color:#64748b;letter-spacing:2px;text-transform:uppercase;margin-top:2px}
.score-bars{flex:1;min-width:200px}
.skills-vs{margin-top:16px;padding-top:14px;border-top:1px solid #f1f5f9}
.tags-wrap{display:flex;flex-wrap:wrap;gap:5px}
.sk{padding:3px 10px;border-radius:6px;font-size:11px;font-weight:500}
.sk.matched{background:#dcfce7;color:#059669;border:1px solid #bbf7d0}
.sk.nice{background:#f0f9ff;color:#0369a1;border:1px solid #bae6fd}
.sk.miss{background:#f1f5f9;color:#94a3b8;border:1px solid #e2e8f0}
.sk.soft{background:#f3f0ff;color:#5B21B6;border:1px solid #ddd6fe}
.sk.str{background:#f0fdf4;color:#059669;border:1px solid #bbf7d0}
.soft-section{padding:16px 24px;border-top:1px solid #f1f5f9}
.soft-row{display:flex;gap:10px;align-items:flex-start;margin-bottom:8px;flex-wrap:wrap}
.soft-label{font-size:10px;font-weight:600;color:#7C3AED;min-width:80px;padding-top:4px}
.compliance{padding:18px 24px;border-top:1px solid #f1f5f9}
.docs-row{display:flex;gap:8px;padding:14px 24px;border-top:1px solid #f1f5f9;flex-wrap:wrap}
.doc-btn{font-size:11px;color:#1B6FE8;text-decoration:none;padding:5px 12px;border:1px solid #1B6FE8;border-radius:6px;transition:all .2s;font-weight:500}
.doc-btn:hover{background:#1B6FE8;color:#fff}
.doc-pending{font-size:11px;color:#cbd5e1;padding:5px 12px;border:1px dashed #e2e8f0;border-radius:6px}
.decision{display:flex;justify-content:space-between;align-items:center;padding:14px 24px;background:#f8fafc;border-top:1px solid #e2e8f0}
.dec-status{font-size:14px;font-weight:600}
.dec-btns{display:flex;gap:10px}
.btn-no,.btn-yes{width:50px;height:50px;border-radius:50%;border:2.5px solid;font-size:20px;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;background:#fff;font-weight:700}
.btn-no{border-color:#fca5a5;color:#dc2626}.btn-no:hover,.btn-no.on{background:#dc2626;color:#fff;transform:scale(1.08);box-shadow:0 4px 16px rgba(220,38,38,.25)}
.btn-yes{border-color:#86efac;color:#059669}.btn-yes:hover,.btn-yes.on{background:#059669;color:#fff;transform:scale(1.08);box-shadow:0 4px 16px rgba(5,150,105,.25)}
.ft{text-align:center;padding:20px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;margin-top:24px}.ft strong{color:#0D2550}
.toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#0D2550;color:#fff;padding:10px 24px;border-radius:10px;font-size:13px;z-index:100;display:none}
@keyframes fadeUp{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
@media(max-width:640px){
  .card-hdr{flex-direction:column;align-items:center;text-align:center}
  .card-left{width:120px}.avatar{width:120px;height:120px}.video-box{width:120px;height:60px}
  .score-area{flex-direction:column;align-items:stretch}
  .summary{grid-template-columns:repeat(2,1fr)}
  .top-bar,.profile-bar,.tags-bar{padding-left:16px;padding-right:16px}
}
</style></head><body>
<div class="top-bar">
  <div><div class="logo">BOZ<span>.</span></div></div>
  <div class="client-brand">
    <div class="client-info"><div class="client-co">${clientCompany}</div><div class="client-date">${dateStr}</div></div>
    <div class="client-init">${clientInitials}</div>
  </div>
</div>
<div class="profile-bar">
  <div class="profile-title">${e(pd.role || profile.role)} — ${e(pd.seniority || profile.seniority)}</div>
  <div class="profile-meta">${e(pd.category || profile.category)} · ${e(pd.experience || "")} · ${e(pd.location || "")} · Headcount: ${profile.headcount || 1} · Prepared for ${clientName}</div>
</div>
<div class="tags-bar">${[...(pd.techStack?.languages || []), ...(pd.techStack?.frameworks || []), ...(pd.techStack?.clouds || []), pd.industry, pd.location].filter(Boolean).map(t => `<span class="tag-pill">${e(t)}</span>`).join("")}</div>
<div class="wrap">
<div class="summary">
  <div class="sum"><b style="color:#1B6FE8">${assignments.length}</b><small>Candidates</small></div>
  <div class="sum"><b style="color:#059669">${assignments.filter(a => a.client_decision === "accepted").length}</b><small>Accepted</small></div>
  <div class="sum"><b style="color:#dc2626">${assignments.filter(a => a.client_decision === "rejected").length}</b><small>Rejected</small></div>
  <div class="sum"><b style="color:#f59e0b">${assignments.filter(a => !a.client_decision || a.client_decision === "pending").length}</b><small>Pending</small></div>
</div>
${cards || `<div style="text-align:center;padding:60px;color:#94a3b8"><div style="font-size:40px;margin-bottom:10px">📋</div>No candidates assigned to this profile yet.</div>`}
</div>
<div class="ft"><strong>BOZ IT Staffing</strong> · Verified Fit · Confidential · ${dateStr}</div>
<div class="toast" id="toast"></div>
<script>
async function decide(aid, dec) {
  try {
    const r = await fetch(window.location.pathname, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({assignment_id:aid,decision:dec}) });
    if (!r.ok) throw new Error("Failed");
    const card = document.getElementById("card-"+aid);
    const st = document.getElementById("status-"+aid);
    card.dataset.decision = dec;
    if (dec === "accepted") { st.style.color="#059669"; st.textContent="✅ Accepted"; card.querySelector(".btn-yes").classList.add("on"); card.querySelector(".btn-no").classList.remove("on"); }
    else { st.style.color="#dc2626"; st.textContent="❌ Rejected"; card.querySelector(".btn-no").classList.add("on"); card.querySelector(".btn-yes").classList.remove("on"); }
    const all = document.querySelectorAll(".card"); let ac=0,re=0,pe=0;
    all.forEach(c=>{ const d=c.dataset.decision; if(d==="accepted")ac++; else if(d==="rejected")re++; else pe++; });
    const nums = document.querySelectorAll(".sum b"); nums[1].textContent=ac; nums[2].textContent=re; nums[3].textContent=pe;
    showToast(dec==="accepted"?"✅ Candidate accepted":"❌ Candidate rejected");
  } catch(e) { showToast("⚠️ "+e.message); }
}
function showToast(m) { const t=document.getElementById("toast"); t.textContent=m; t.style.display="block"; setTimeout(()=>{t.style.display="none"},2500); }
</script></body></html>`;
}
