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

  // ═══ POST: Handle client decision ═══
  if (req.method === "POST") {
    const { assignment_id, decision } = req.body;
    if (!assignment_id || !["accepted", "rejected", "pending"].includes(decision)) {
      return res.status(400).json({ error: "Invalid decision" });
    }
    // Verify assignment belongs to this profile
    const vR = await fetch(`${url}/rest/v1/profile_candidates?id=eq.${assignment_id}&profile_id=eq.${id}`, { headers: H });
    const vD = await vR.json();
    if (!vD.length) return res.status(404).json({ error: "Assignment not found" });
    await fetch(`${url}/rest/v1/profile_candidates?id=eq.${assignment_id}`, {
      method: "PATCH", headers: { ...H, "Prefer": "return=minimal" },
      body: JSON.stringify({ client_decision: decision })
    });
    return res.status(200).json({ ok: true });
  }

  // ═══ GET: Serve interactive review page ═══
  if (req.method !== "GET") return res.status(405).send("Method not allowed");

  try {
    const [pR, aR] = await Promise.all([
      fetch(`${url}/rest/v1/profiles?id=eq.${id}&select=*`, { headers: H }),
      fetch(`${url}/rest/v1/profile_candidates?profile_id=eq.${id}&select=*,candidates(*)&order=match_score.desc`, { headers: H }),
    ]);
    const profile = (await pR.json())[0];
    if (!profile) return res.status(404).send("Profile not found");
    const assignments = await aR.json();

    // Get documents
    const candIds = assignments.map(a => a.candidate_id).filter(Boolean);
    let docs = [];
    if (candIds.length) {
      const dR = await fetch(`${url}/rest/v1/candidate_documents?candidate_id=in.(${candIds.join(",")})&profile_id=eq.${id}`, { headers: H });
      docs = await dR.json();
    }

    // Get signed URLs for documents
    for (const doc of docs) {
      try {
        const sR = await fetch(`${url}/storage/v1/object/sign/documents/${doc.file_path}`, {
          method: "POST", headers: H, body: JSON.stringify({ expiresIn: 7200 })
        });
        const sD = await sR.json();
        doc.signed_url = sD.signedURL ? `${url}/storage/v1${sD.signedURL}` : null;
      } catch { doc.signed_url = null; }
    }

    const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const pd = profile.profile_data || {};

    const html = buildReviewHTML(profile, assignments, docs, pd, esc, id);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "private, no-cache");
    return res.send(html);
  } catch (e) {
    return res.status(500).send("Server error: " + e.message);
  }
}

function buildReviewHTML(profile, assignments, docs, pd, esc, profileId) {
  const mh = pd.mustHave || [];
  const nh = pd.niceToHave || [];
  const tags = [...(pd.techStack?.languages || []), ...(pd.techStack?.clouds || []), pd.industry, pd.location].filter(Boolean);

  const candidateCards = assignments.map(a => {
    const c = a.candidates || {};
    const ms = a.match_score || 0;
    const msColor = ms >= 80 ? "#059669" : ms >= 50 ? "#f59e0b" : "#dc2626";
    const cSkills = [...(c.skills || []), ...(c.languages || []), ...(c.frameworks || [])];
    const cDocs = docs.filter(d => d.candidate_id === c.id);
    const cvDoc = cDocs.find(d => d.doc_type === "cv");
    const softDoc = cDocs.find(d => d.doc_type === "soft_eval");
    const hardDoc = cDocs.find(d => d.doc_type === "hard_eval");
    const decision = a.client_decision || "pending";
    const decColor = decision === "accepted" ? "#059669" : decision === "rejected" ? "#dc2626" : "#94a3b8";

    const mustMatch = cSkills.filter(s => mh.some(m => m.toLowerCase() === s.toLowerCase()));
    const niceMatch = cSkills.filter(s => nh.some(n => n.toLowerCase() === s.toLowerCase()));
    const otherSkills = cSkills.filter(s => !mh.some(m => m.toLowerCase() === s.toLowerCase()) && !nh.some(n => n.toLowerCase() === s.toLowerCase()));

    return `
    <div class="cand-card" id="card-${a.id}" data-decision="${decision}">
      <div class="cand-header">
        <div class="cand-left">
          <div class="cand-photo">
            ${c.photo_url ? `<img src="${esc(c.photo_url)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:16px"/>` : `<div class="photo-placeholder">${esc((c.name || "?")[0])}</div>`}
          </div>
          <div class="cand-video-placeholder">
            <div class="video-icon">▶</div>
            <div class="video-text">Video Profile</div>
            <div class="video-sub">Coming soon</div>
          </div>
        </div>
        <div class="cand-right">
          <div class="cand-id">ID ${esc(c.id?.substring(0, 13) || "—")}</div>
          <div class="cand-name">${esc(c.name)}</div>
          <div class="cand-role">${esc(c.seniority || "")} · ${esc(c.location || "")}</div>
          <div class="cand-fit" style="color:${msColor}">Fit <span class="fit-num">${ms}%</span></div>
          <div class="cand-meta">
            ${c.english_level ? `<span class="meta-tag">🗣️ ${esc(c.english_level)}</span>` : ""}
            ${c.experience ? `<span class="meta-tag">💼 ${esc(c.experience)}</span>` : ""}
          </div>
        </div>
      </div>

      <div class="skills-grid">
        <div class="skill-section">
          <div class="skill-title hard">🔧 HARD SKILLS</div>
          ${mustMatch.length ? `<div class="skill-group"><div class="sg-label must">✓ Must Have Match</div><div class="tags">${mustMatch.map(s => `<span class="tag must">${esc(s)}</span>`).join("")}</div></div>` : ""}
          ${niceMatch.length ? `<div class="skill-group"><div class="sg-label nice">■ Nice to Have Match</div><div class="tags">${niceMatch.map(s => `<span class="tag nice">${esc(s)}</span>`).join("")}</div></div>` : ""}
          ${otherSkills.length ? `<div class="skill-group"><div class="sg-label">Other Skills</div><div class="tags">${otherSkills.map(s => `<span class="tag">${esc(s)}</span>`).join("")}</div></div>` : ""}
          ${!cSkills.length ? `<div class="no-data">No skills registered</div>` : ""}
        </div>
        <div class="skill-section">
          <div class="skill-title soft">🧠 SOFT SKILLS</div>
          ${c.notes ? `<div class="notes-text">${esc(c.notes)}</div>` : `<div class="no-data">Evaluation pending</div>`}
        </div>
      </div>

      <div class="docs-row">
        ${cvDoc ? `<a href="${cvDoc.signed_url || "#"}" target="_blank" class="doc-link">📄 CV</a>` : `<span class="doc-missing">📄 CV pending</span>`}
        ${softDoc ? `<a href="${softDoc.signed_url || "#"}" target="_blank" class="doc-link">🧠 Soft Skills Eval</a>` : `<span class="doc-missing">🧠 Soft eval pending</span>`}
        ${hardDoc ? `<a href="${hardDoc.signed_url || "#"}" target="_blank" class="doc-link">⚙️ Hard Skills Eval</a>` : `<span class="doc-missing">⚙️ Hard eval pending</span>`}
      </div>

      <div class="decision-row">
        <div class="decision-status" id="status-${a.id}" style="color:${decColor}">
          ${decision === "accepted" ? "✅ Accepted" : decision === "rejected" ? "❌ Rejected" : "⏳ Pending"}
        </div>
        <div class="decision-btns">
          <button class="btn-reject ${decision === "rejected" ? "active" : ""}" onclick="decide('${a.id}','rejected')" title="Reject">✕</button>
          <button class="btn-accept ${decision === "accepted" ? "active" : ""}" onclick="decide('${a.id}','accepted')" title="Accept">♥</button>
        </div>
      </div>
    </div>`;
  }).join("");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>BOZ Review — ${esc(pd.role || profile.role)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',system-ui,sans-serif;background:#f1f5f9;color:#1e293b;-webkit-font-smoothing:antialiased}
.hdr{background:linear-gradient(135deg,#0D2550,#1B3A70,#1B6FE8);padding:28px 32px 20px;color:#fff}
.hdr-top{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
.logo{font-size:26px;font-weight:800;letter-spacing:2px}.logo span{color:#22d3ee}
.hdr-sub{font-size:10px;color:rgba(255,255,255,.4);letter-spacing:3px;text-transform:uppercase;margin-top:2px}
.profile-bar{background:#1B6FE8;padding:16px 32px;color:#fff}
.profile-title{font-size:20px;font-weight:700}.profile-meta{font-size:12px;opacity:.8;margin-top:4px}
.tags-bar{padding:12px 32px;background:#fff;border-bottom:1px solid #e2e8f0;display:flex;flex-wrap:wrap;gap:6px}
.tag-pill{background:#f0f4ff;color:#1B6FE8;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:500}
.container{max-width:900px;margin:0 auto;padding:24px 16px 60px}
.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:24px}
.sum-card{background:#fff;border-radius:12px;padding:16px;text-align:center;border:1px solid #e2e8f0}
.sum-num{font-size:28px;font-weight:800}.sum-label{font-size:11px;color:#64748b;margin-top:2px}
.cand-card{background:#fff;border-radius:20px;border:1px solid #e2e8f0;margin-bottom:20px;overflow:hidden;transition:all .3s}
.cand-card[data-decision="accepted"]{border-color:#059669;box-shadow:0 0 0 2px rgba(5,150,105,.15)}
.cand-card[data-decision="rejected"]{opacity:.55}
.cand-header{display:flex;gap:20px;padding:24px;flex-wrap:wrap}
.cand-left{display:flex;flex-direction:column;gap:12px;align-items:center;min-width:160px}
.cand-photo{width:160px;height:160px;border-radius:16px;overflow:hidden;background:linear-gradient(135deg,#0D2550,#1B6FE8);flex-shrink:0}
.photo-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:56px;font-weight:800;color:#fff}
.cand-video-placeholder{width:160px;height:90px;background:#0D2550;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:default}
.video-icon{font-size:24px;color:#fff;opacity:.6}.video-text{font-size:11px;color:#fff;opacity:.5;margin-top:4px}.video-sub{font-size:9px;color:#fff;opacity:.3}
.cand-right{flex:1;min-width:200px}
.cand-id{font-size:10px;color:#94a3b8;letter-spacing:1px;text-transform:uppercase}
.cand-name{font-size:22px;font-weight:700;color:#0D2550;margin-top:4px}
.cand-role{font-size:13px;color:#64748b;margin-top:2px}
.cand-fit{font-size:14px;font-weight:600;margin-top:12px}.fit-num{font-size:32px;font-weight:800}
.cand-meta{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.meta-tag{background:#f1f5f9;padding:4px 10px;border-radius:8px;font-size:11px;color:#475569}
.skills-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;border-top:1px solid #f1f5f9}
.skill-section{padding:20px 24px}
.skill-section:first-child{border-right:1px solid #f1f5f9}
.skill-title{font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid #e2e8f0}
.skill-title.hard{color:#1B6FE8;border-color:#1B6FE8}.skill-title.soft{color:#8b5cf6;border-color:#8b5cf6}
.skill-group{margin-bottom:10px}
.sg-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;color:#64748b}
.sg-label.must{color:#dc2626}.sg-label.nice{color:#059669}
.tags{display:flex;flex-wrap:wrap;gap:4px}
.tag{padding:3px 10px;border-radius:12px;font-size:11px;background:#f1f5f9;color:#475569}
.tag.must{background:#dcfce7;color:#059669;border:1px solid #bbf7d0}
.tag.nice{background:#f0f9ff;color:#0369a1;border:1px solid #bae6fd}
.notes-text{font-size:12px;color:#475569;line-height:1.7}
.no-data{font-size:12px;color:#cbd5e1;font-style:italic}
.docs-row{display:flex;gap:10px;padding:16px 24px;border-top:1px solid #f1f5f9;flex-wrap:wrap}
.doc-link{font-size:12px;color:#1B6FE8;text-decoration:none;padding:6px 14px;border:1px solid #1B6FE8;border-radius:8px;transition:all .2s}
.doc-link:hover{background:#1B6FE8;color:#fff}
.doc-missing{font-size:12px;color:#cbd5e1;padding:6px 14px;border:1px dashed #e2e8f0;border-radius:8px}
.decision-row{display:flex;justify-content:space-between;align-items:center;padding:16px 24px;background:#f8fafc;border-top:1px solid #e2e8f0}
.decision-status{font-size:14px;font-weight:600}
.decision-btns{display:flex;gap:12px}
.btn-reject,.btn-accept{width:56px;height:56px;border-radius:50%;border:3px solid;font-size:22px;cursor:pointer;transition:all .25s;display:flex;align-items:center;justify-content:center;background:#fff}
.btn-reject{border-color:#fca5a5;color:#dc2626}.btn-reject:hover,.btn-reject.active{background:#dc2626;color:#fff;transform:scale(1.1);box-shadow:0 4px 20px rgba(220,38,38,.3)}
.btn-accept{border-color:#86efac;color:#059669}.btn-accept:hover,.btn-accept.active{background:#059669;color:#fff;transform:scale(1.1);box-shadow:0 4px 20px rgba(5,150,105,.3)}
.ft{text-align:center;padding:24px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;margin-top:32px}
.ft strong{color:#0D2550}
.toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#0D2550;color:#fff;padding:12px 28px;border-radius:12px;font-size:13px;z-index:100;display:none;animation:fadeUp .3s both}
@keyframes fadeUp{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
@media(max-width:640px){
  .cand-header{flex-direction:column;align-items:center;text-align:center}
  .cand-left{flex-direction:row;gap:12px;min-width:auto}.cand-photo{width:100px;height:100px}
  .cand-video-placeholder{width:100px;height:60px}
  .skills-grid{grid-template-columns:1fr}.skill-section:first-child{border-right:none;border-bottom:1px solid #f1f5f9}
  .hdr,.profile-bar,.tags-bar{padding-left:16px;padding-right:16px}
}
</style></head><body>
<div class="hdr"><div class="hdr-top"><div><div class="logo">BOZ<span>.</span></div><div class="hdr-sub">IT Staffing · Verified Fit</div></div><div style="text-align:right"><div style="font-size:12px;opacity:.6">${esc(profile.client_company || "")}</div><div style="font-size:11px;opacity:.4">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div></div></div></div>
<div class="profile-bar"><div class="profile-title">${esc(pd.role || profile.role)} — ${esc(pd.seniority || profile.seniority)}</div><div class="profile-meta">${esc(pd.category || profile.category)} · ${esc(pd.experience || "")} · ${esc(pd.location || "")} · Headcount: ${profile.headcount || 1}</div></div>
<div class="tags-bar">${tags.map(t => `<span class="tag-pill">${esc(t)}</span>`).join("")}</div>
<div class="container">
<div class="summary">
  <div class="sum-card"><div class="sum-num" style="color:#1B6FE8">${assignments.length}</div><div class="sum-label">Candidates</div></div>
  <div class="sum-card"><div class="sum-num" style="color:#059669">${assignments.filter(a => a.client_decision === "accepted").length}</div><div class="sum-label">Accepted</div></div>
  <div class="sum-card"><div class="sum-num" style="color:#dc2626">${assignments.filter(a => a.client_decision === "rejected").length}</div><div class="sum-label">Rejected</div></div>
  <div class="sum-card"><div class="sum-num" style="color:#f59e0b">${assignments.filter(a => !a.client_decision || a.client_decision === "pending").length}</div><div class="sum-label">Pending</div></div>
</div>
${candidateCards || `<div style="text-align:center;padding:60px;color:#94a3b8"><div style="font-size:48px;margin-bottom:12px">📋</div>No candidates assigned yet.</div>`}
</div>
<div class="ft"><strong>BOZ IT Staffing</strong> · Confidential · ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
<div class="toast" id="toast"></div>
<script>
async function decide(assignId, decision) {
  try {
    const r = await fetch(window.location.pathname, {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ assignment_id: assignId, decision })
    });
    if (!r.ok) throw new Error("Failed");
    // Update UI
    const card = document.getElementById("card-" + assignId);
    const status = document.getElementById("status-" + assignId);
    card.dataset.decision = decision;
    if (decision === "accepted") {
      status.style.color = "#059669";
      status.textContent = "✅ Accepted";
      card.querySelector(".btn-accept").classList.add("active");
      card.querySelector(".btn-reject").classList.remove("active");
    } else {
      status.style.color = "#dc2626";
      status.textContent = "❌ Rejected";
      card.querySelector(".btn-reject").classList.add("active");
      card.querySelector(".btn-accept").classList.remove("active");
    }
    // Update summary counts
    const cards = document.querySelectorAll(".cand-card");
    let acc=0,rej=0,pen=0;
    cards.forEach(c => { const d=c.dataset.decision; if(d==="accepted")acc++; else if(d==="rejected")rej++; else pen++; });
    const nums = document.querySelectorAll(".sum-num");
    nums[1].textContent = acc; nums[2].textContent = rej; nums[3].textContent = pen;
    showToast(decision === "accepted" ? "✅ Candidate accepted" : "❌ Candidate rejected");
  } catch(e) { showToast("⚠️ Error: " + e.message); }
}
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.style.display = "block";
  setTimeout(() => { t.style.display = "none"; }, 2500);
}
</script></body></html>`;
}
