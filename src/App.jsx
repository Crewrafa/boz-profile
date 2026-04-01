import { useState, useEffect, useRef, useCallback } from "react";
import { ADMIN_EMAIL,ANA_EMAIL,RECRUITER_EMAIL,APP_VERSION,PROCESS_PHASES,AI_PROMPTS,CATEGORIES,ROLES_MAP,ROLE_TYPE,ALL_LANGS,ALL_FW,FW_FILTER,FW_V,CLOUD_SERVICES,DBS,DB_V,DEVOPS,DEVOPS_V,ERP_T,ERP_V,QA_TOOLS,AI_TOOLS,SENIORITY,EXP_RANGES,ENGLISH,LOCATIONS,TIMEZONES,METHODOLOGIES,ACADEMIA,INDUSTRIES,ENGAGEMENT_TYPES,HOUR_OPTIONS,HOLIDAY_COUNTRIES,STEPS,STEP_INFO,STATUS_LABELS,STATUS_COLORS,toggle,esc,formatVersions,calcEndTime,getFilteredLangs,getFilteredFW,showDBs,showDevOps,showQATools,getTechWarnings,DOC_TYPES,DOC_ICONS,MAX_DOC_SIZE,PRIVACY_CONTENT,TERMS_CONTENT,PROF_TOOLS,PROF_TOOL_CATEGORIES,usesProfTools,VALID_ROLES,ROLE_LABELS,ROLE_COLORS,ROLE_ICONS } from "./data.js";

const SB=()=>import.meta.env.VITE_SUPABASE_URL;
const SK=()=>import.meta.env.VITE_SUPABASE_ANON_KEY;
// ═══ DOMAIN CONFIG — change this when you get your custom domain ═══
const BASE_URL=import.meta.env.VITE_BASE_URL||window.location.origin;

// ═══ DESIGN SYSTEM TOKENS ═══
const DS={
  font:{heading:"'Plus Jakarta Sans',sans-serif",body:"'DM Sans',sans-serif"},
  text:{h1:"#0F172A",h2:"#1E293B",body:"#334155",muted:"#64748B",faint:"#94A3B8",placeholder:"#CBD5E1"},
  brand:{navy900:"#0D2550",navy800:"#153572",blue700:"#1B6FE8",blue600:"#3D85EC",blue100:"#E2EEFE",blue50:"#F0F6FF",cyan600:"#22D3EE",cyan100:"#E0FAFD"},
  surface:{page:"#F8FAFC",card:"#FFFFFF",sunken:"#F1F5F9",border:"#E2E8F0",borderLight:"#F1F5F9"},
  radius:{xs:4,sm:6,md:8,lg:12,xl:16,xxl:20,pill:9999},
  shadow:{sm:"0 1px 2px rgba(0,0,0,0.04),0 1px 4px rgba(0,0,0,0.04)",md:"0 2px 4px rgba(0,0,0,0.04),0 4px 8px rgba(0,0,0,0.04),0 8px 16px rgba(0,0,0,0.03)",lg:"0 4px 8px rgba(0,0,0,0.04),0 8px 16px rgba(0,0,0,0.04),0 16px 32px rgba(0,0,0,0.03),0 24px 48px rgba(0,0,0,0.02)",blue:"0 4px 14px rgba(27,111,232,0.25)",glow:"0 0 0 3px rgba(27,111,232,0.1)"},
  ease:{default:"cubic-bezier(0.25,0.46,0.45,0.94)",snap:"cubic-bezier(0.23,1,0.32,1)",smooth:"cubic-bezier(0.4,0,0.2,1)"},
};

const useW=()=>{const[w,s]=useState(typeof window!=="undefined"?window.innerWidth:1024);useEffect(()=>{const h=()=>s(window.innerWidth);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h)},[]);return w};

// ═══════════ AUTH ═══════════
async function magicLink(email){const r=await fetch(`${SB()}/auth/v1/magiclink`,{method:"POST",headers:{"Content-Type":"application/json","apikey":SK()},body:JSON.stringify({email})});if(!r.ok)throw new Error(await r.text())}
async function getSess(){const t=localStorage.getItem("sb-access-token");if(!t)return null;try{const r=await fetch(`${SB()}/auth/v1/user`,{headers:{"Authorization":`Bearer ${t}`,"apikey":SK()}});if(!r.ok){localStorage.removeItem("sb-access-token");localStorage.removeItem("sb-refresh-token");return null}return{user:await r.json(),token:t}}catch{return null}}
async function refresh(){const rt=localStorage.getItem("sb-refresh-token");if(!rt)return null;try{const r=await fetch(`${SB()}/auth/v1/token?grant_type=refresh_token`,{method:"POST",headers:{"Content-Type":"application/json","apikey":SK()},body:JSON.stringify({refresh_token:rt})});if(!r.ok)return null;const d=await r.json();localStorage.setItem("sb-access-token",d.access_token);localStorage.setItem("sb-refresh-token",d.refresh_token);return{user:d.user,token:d.access_token}}catch{return null}}
function signOut(){localStorage.removeItem("sb-access-token");localStorage.removeItem("sb-refresh-token");window.location.reload()}

// ═══════════ API ═══════════
async function callClaude(m,sys){const b={model:"claude-sonnet-4-20250514",max_tokens:2000,messages:m};if(sys)b.system=sys;const r=await fetch("/api/claude",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)});if(!r.ok)throw new Error(await r.text()||`Err ${r.status}`);const d=await r.json();if(d.error)throw new Error(typeof d.error==="string"?d.error:d.error?.message||JSON.stringify(d.error));return d.content?.map(c=>c.text||"").join("")||""}
async function analyzeDoc(b64,mt){const c=[];if(mt==="application/pdf")c.push({type:"document",source:{type:"base64",media_type:"application/pdf",data:b64}});else if(mt.startsWith("image/"))c.push({type:"image",source:{type:"base64",media_type:mt,data:b64}});c.push({type:"text",text:"Analyze this job description thoroughly. "+AI_PROMPTS.analyze_jd});return callClaude([{role:"user",content:c}],"Expert IT recruiter. Extract every possible detail. JSON only.")}
async function sendEmail(p,cl){const sid=import.meta.env.VITE_EMAILJS_SERVICE_ID,tid=import.meta.env.VITE_EMAILJS_TEMPLATE_ID,pk=import.meta.env.VITE_EMAILJS_PUBLIC_KEY;if(!sid||!tid||!pk)return;const vL=formatVersions(p.versions);const s=`ROLE: ${p.seniority} ${p.role} (${p.category})\nEXP: ${p.experience}\nENGAGEMENT: ${p.engagement} ${p.schedule}\nLOCATION: ${p.location} | TZ: ${p.timezone} | ENGLISH: ${p.englishLevel}\nMETHOD: ${p.methodology} | INDUSTRY: ${p.industry}\nLANGS: ${p.techStack?.languages?.join(", ")||"—"}\nVERSIONS: ${vL.join(" | ")||"—"}\nFW: ${p.techStack?.frameworks?.join(", ")||"—"}\nCLOUD: ${p.techStack?.clouds?.join(", ")} (${p.techStack?.cloudServices?.join(", ")||"—"})\nDB: ${p.techStack?.databases?.join(", ")||"—"}\nDEVOPS: ${p.techStack?.devopsTools?.join(", ")||"—"}\nMUST: ${p.mustHave?.join(", ")||"—"}\nNICE: ${p.niceToHave?.join(", ")||"—"}\nHOLIDAYS: ${p.holidayCountry||"—"}\nSTART: ${p.startDate||"—"}\nNOTES: ${p.additionalNotes||"—"}`;await fetch("https://api.emailjs.com/api/v1.0/email/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({service_id:sid,template_id:tid,user_id:pk,template_params:{client_name:cl.name,client_company:cl.company,client_email:cl.email,start_date:p.startDate||"TBD",role:`${p.seniority} ${p.role}`,category:p.category,profile_summary:s}})})}
async function saveToDB(p,cl,html){const r=await fetch("/api/client",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${localStorage.getItem("sb-access-token")}`},body:JSON.stringify({action:"save_profile",profile_data:{client_name:cl.name,client_company:cl.company,client_email:cl.email,start_date:p.startDate||null,role:p.role,category:p.category,seniority:p.seniority,experience:p.experience,headcount:p.headcount,profile_data:p,pdf_html:html}})});if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.error||"DB error")}return await r.json()}
async function getMyProfiles(){try{const r=await fetch("/api/client",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${localStorage.getItem("sb-access-token")}`},body:JSON.stringify({action:"list_profiles"})});if(!r.ok)return[];const d=await r.json();return Array.isArray(d)?d:[]}catch{return[]}}

// ═══════════ PDF (BOZ style — no KPIs, no desirable, no success, includes notes) ═══════════
async function buildPDF(p,cl){
  const e=esc;let ai={objective:"",responsibilities:[]};
  try{const raw=await callClaude([{role:"user",content:`Generate a role profile for a ${e(p.seniority)} ${e(p.role)} position. The objective and responsibilities MUST specifically reference the technologies chosen.

TECH CONTEXT:
- Languages: ${p.techStack?.languages?.join(", ")||"Not specified"}
- Frameworks: ${p.techStack?.frameworks?.join(", ")||"Not specified"}
- Cloud: ${p.techStack?.clouds?.join(", ")||"Not specified"} (Services: ${p.techStack?.cloudServices?.join(", ")||"—"})
- Must Have: ${p.mustHave?.join(", ")||"None"}
- Nice to Have: ${p.niceToHave?.join(", ")||"None"}
- Databases: ${p.techStack?.databases?.join(", ")||"Not specified"}
- DevOps: ${p.techStack?.devopsTools?.join(", ")||"Not specified"}
- Industry: ${p.industry||"General"}
- Location: ${p.location||"Remote"}
- English: ${p.englishLevel||"Not specified"}
- Methodology: ${p.methodology||"Agile"}
- Experience: ${p.experience||"Not specified"}

IMPORTANT: The objective paragraph MUST mention the key technologies (e.g. "build scalable microservices using Spring Boot and PostgreSQL on AWS"). The responsibilities MUST be technology-specific (e.g. "Design and implement RESTful APIs using FastAPI" NOT just "Design APIs").

Return ONLY valid JSON: {"objective":"3-4 sentence paragraph referencing specific technologies","responsibilities":["8-10 tech-specific responsibilities"],"softSkills":["5 relevant soft skills"]}`}],"Expert IT recruiter writing detailed technical role profiles. JSON only, no markdown.");ai=JSON.parse(raw.replace(/```json|```/g,"").trim())}
  catch{ai={objective:`Seeking a ${p.seniority} ${p.role} with ${p.experience}.`,responsibilities:["Deliver solutions","Collaborate","Follow best practices","Document","Review code"],softSkills:["Communication","Teamwork","Problem solving","Adaptability","Proactivity"]}}
  const vL=formatVersions(p.versions);const tags=[...(p.techStack?.languages||[]),...(p.techStack?.clouds||[]),p.industry,p.location].filter(Boolean).map(e).join(" · ");
  const mh=(p.mustHave||[]).map(t=>`<tr><td style="padding:4px 12px;color:#c0392b;font-size:12px;font-weight:500">${e(t)}</td></tr>`).join("");
  const nh=(p.niceToHave||[]).map(t=>`<tr><td style="padding:4px 12px;color:#475569;font-size:12px">${e(t)}</td></tr>`).join("");
  const resp=(ai.responsibilities||[]).map(r=>`<li style="margin-bottom:6px;font-size:12px;color:#334155;line-height:1.6">${e(r)}</li>`).join("");
  const ss=(ai.softSkills||[]).map(s=>`<li style="margin-bottom:6px;font-size:12px;color:#334155;line-height:1.6">${e(s)}</li>`).join("");
  const tr=[];const aR=(l,v)=>{if(v&&(typeof v==="string"?v:v.length))tr.push(`<tr><td style="padding:6px 12px;font-weight:600;color:#1B6FE8;font-size:11px;text-transform:uppercase;width:160px;vertical-align:top">${l}</td><td style="padding:6px 12px;font-size:12px;color:#334155">${Array.isArray(v)?v.map(e).join(", "):e(v)}</td></tr>`)};
  aR("Language",p.techStack?.languages);aR("Frameworks",p.techStack?.frameworks);aR("Versions",vL);aR("Database",p.techStack?.databases);aR("Cloud",p.techStack?.clouds);aR("Cloud Services",p.techStack?.cloudServices);aR("DevOps",p.techStack?.devopsTools);if(p.techStack?.qaTools?.length)aR("QA Tools",p.techStack.qaTools);if(p.techStack?.erpTech?.length)aR("ERP",p.techStack.erpTech);aR("AI Tools",p.aiTools);aR("Methodology",p.methodology);aR("Industry",p.industry);aR("English",p.englishLevel);if(p.techStack?.otherTech)aR("Other",p.techStack.otherTech);
  const ec=[["Seniority",p.seniority],["Experience",p.experience],["Degree",p.academia],["Industry",p.industry],["Method.",p.methodology],["English",p.englishLevel],["Location",p.location],["Engagement",p.engagement],["Visa",p.visaUsa],["Travel",p.travelAvailability]].filter(([_,v])=>v);
  const eg=ec.map(([l,v])=>`<td style="padding:8px;text-align:center;border:1px solid #ddd"><div style="font-size:9px;color:#1B6FE8;font-weight:700;text-transform:uppercase;letter-spacing:.5px">${l}</div><div style="font-size:12px;font-weight:600;color:#0D2550;margin-top:4px">${e(v)}</div></td>`).join("");
  return`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>BOZ - ${e(p.role)}</title><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{margin:10mm}.hdr{background:linear-gradient(135deg,#0D2550,#1B3A70,#1B6FE8);padding:32px 48px 24px;color:#fff}.logo{font-size:24px;font-weight:800;letter-spacing:2px}.logo span{color:#22d3ee}.sub{font-size:10px;color:rgba(255,255,255,.5);letter-spacing:2px;text-transform:uppercase;margin-top:2px}.bb{background:#1B6FE8;padding:12px 48px;color:#fff;font-size:12px}.cnt{padding:0 48px 32px}.st{background:#0D2550;color:#fff;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:8px 16px;margin:24px 0 12px;border-radius:2px}.stb{background:#1B6FE8}table{width:100%;border-collapse:collapse}.ft{text-align:center;padding:16px;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;margin-top:24px}.ft strong{color:#0D2550}@media print{.np{display:none!important}}</style></head><body><div class="hdr"><div class="logo">BOZ<span>.</span></div><div class="sub">IT Staffing · Verified Fit</div></div><div class="bb">${tags}</div><div style="padding:32px 48px 0"><div style="font-size:22px;font-weight:700;color:#0D2550">${e(p.role)} ${e(p.seniority)}</div><div style="font-size:12px;color:#64748b;margin-top:4px">${e(p.category)} · ${e(p.experience)} · ${e(p.location||"")} · Headcount: ${p.headcount}</div></div>${cl?`<div style="padding:16px 48px 0"><table style="font-size:12px;color:#64748b"><tr><td style="padding-right:24px"><strong>Client:</strong> ${e(cl.name)} (${e(cl.company)})</td><td><strong>Start:</strong> ${e(p.startDate||"TBD")}</td></tr></table></div>`:""}<div class="cnt"><div class="st">ROLE OBJECTIVE</div><p style="font-size:12px;line-height:1.7;color:#334155">${e(ai.objective||"")}</p><div class="st">EXPERIENCE PROFILE</div><table style="margin-bottom:8px"><tr>${eg}</tr></table><div class="st">MUST HAVE VS NICE TO HAVE</div><table><tr><td style="width:50%;vertical-align:top;padding-right:12px"><div style="font-size:11px;font-weight:700;color:#c0392b;margin-bottom:6px">● MUST HAVE — Non-negotiable</div><table>${mh||'<tr><td style="color:#94a3b8;font-size:12px;padding:4px 12px">None</td></tr>'}</table></td><td style="width:50%;vertical-align:top;padding-left:12px"><div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:6px">■ NICE TO HAVE — Desirable</div><table>${nh||'<tr><td style="color:#94a3b8;font-size:12px;padding:4px 12px">None</td></tr>'}</table></td></tr></table><div class="st">TECHNICAL STACK</div><table>${tr.join("")}</table><div class="st">KEY RESPONSIBILITIES</div><ul style="padding-left:20px;margin-top:8px">${resp}</ul><div class="st stb">SOFT SKILLS</div><ul style="padding-left:20px;margin-top:8px">${ss}</ul>${p.additionalNotes?`<div class="st stb">NOTES</div><p style="font-size:12px;line-height:1.6;color:#334155;margin-top:8px">${e(p.additionalNotes)}</p>`:""}</div><div class="ft"><strong>BOZ IT Staffing</strong> · Confidential · ${new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</div><div class="np" style="text-align:center;padding:20px;background:#f8fafc"><button onclick="window.print()" style="background:linear-gradient(135deg,#0D2550,#1B6FE8);color:#fff;border:none;padding:14px 36px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer">📄 Download as PDF</button></div></body></html>`}

// ═══════════ UI ═══════════
function Pill({label,selected,onClick,color,small}){const[h,setH]=useState(false);return(<button onClick={onClick} type="button" onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{display:"inline-flex",alignItems:"center",gap:6,padding:small?"5px 12px":"9px 18px",fontSize:small?11:13,fontWeight:selected?600:500,fontFamily:DS.font.body,borderRadius:DS.radius.pill,border:selected?"1.5px solid transparent":`1.5px solid ${h?DS.surface.border:"#edf0f4"}`,cursor:"pointer",transition:`all .25s ${DS.ease.snap}`,background:selected?(color||DS.brand.navy900):h?"#f8fafc":"#fff",color:selected?"#fff":DS.text.body,transform:selected?"scale(1.02)":"scale(1)",boxShadow:selected?`0 2px 8px ${(color||DS.brand.navy900)}30`:h?DS.shadow.sm:"none",letterSpacing:"-0.005em"}}>{label}</button>)}
function Section({title,sub,children,delay=0}){return(<div style={{marginBottom:32,animation:`fadeUp .4s ${delay}s both`}}><div style={{fontSize:13,fontWeight:600,color:DS.text.h2,marginBottom:sub?3:12,fontFamily:DS.font.heading,letterSpacing:"-0.01em"}}>{title}</div>{sub&&<div style={{fontSize:11.5,color:DS.text.faint,marginBottom:12,fontFamily:DS.font.body}}>{sub}</div>}{children}</div>)}
function InfoBox({text}){const spIdx=(text||"").indexOf(" ");const emoji=spIdx>0?text.substring(0,spIdx):"💡";const rest=spIdx>0?text.substring(spIdx+1):text;return(<div style={{background:`linear-gradient(135deg,${DS.brand.blue50},#fff)`,borderRadius:DS.radius.lg,padding:"18px 22px",marginBottom:28,border:`1px solid rgba(27,111,232,0.08)`,display:"flex",gap:14,alignItems:"flex-start",boxShadow:"0 1px 4px rgba(27,111,232,0.03)"}}><div style={{width:38,height:38,borderRadius:DS.radius.md,background:`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0,boxShadow:DS.shadow.blue,color:"#fff"}}>{emoji}</div><div style={{fontSize:13,color:DS.text.body,lineHeight:1.7,fontFamily:DS.font.body,paddingTop:3}}>{rest}</div></div>)}
function Spinner({text}){return(<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14,padding:40}}><div style={{width:40,height:40,border:`3px solid ${DS.surface.border}`,borderTop:`3px solid ${DS.brand.blue700}`,borderRadius:"50%",animation:"spin 1s linear infinite"}}/><div style={{fontSize:13,color:DS.text.muted,fontFamily:DS.font.body}}>{text}</div></div>)}
// Animated background effect (reused from Login)
function HeaderBG(){return(<div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>
  <div style={{position:"absolute",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(27,111,232,0.12),transparent 70%)",top:"-40%",right:"-8%",animation:"float 20s ease-in-out infinite"}}/>
  <div style={{position:"absolute",width:350,height:350,borderRadius:"50%",background:"radial-gradient(circle,rgba(79,106,255,0.08),transparent 70%)",bottom:"-30%",left:"-5%",animation:"float 25s ease-in-out infinite reverse"}}/>
  <div style={{position:"absolute",width:180,height:180,borderRadius:"50%",background:"radial-gradient(circle,rgba(34,211,238,0.06),transparent 70%)",top:"20%",left:"30%",animation:"float 18s ease-in-out infinite"}}/>
  <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)",backgroundSize:"50px 50px"}}/>
</div>)}
// Stagger wrapper — children animate in sequence
function StaggerIn({children,base=0.05}){return(<div>{Array.isArray(children)?children.map((child,i)=>child?<div key={i} style={{animation:`staggerReveal .5s ${i*base}s both`}}>{child}</div>:null):children}</div>)}
function VersionPicker({items,vMap,versions,setVersions}){const wV=items.filter(t=>vMap[t]);if(!wV.length)return null;const tV=(tech,ver)=>{setVersions(p=>{const c=p[tech]||[];if(ver==="any")return{...p,[tech]:c.includes("any")?[]:["any"]};const w=c.filter(v=>v!=="any");return{...p,[tech]:w.includes(ver)?w.filter(v=>v!==ver):[...w,ver]}})};return(<div style={{marginTop:12,padding:"14px 16px",background:"rgba(255,255,255,0.6)",borderRadius:12,border:"1px solid #e2e8f0"}}><div style={{fontSize:11,fontWeight:600,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>📌 Select versions</div>{wV.map(t=>{const c=versions[t]||[];return(<div key={t} style={{marginBottom:10}}><div style={{fontSize:11,fontWeight:600,color:"#475569",marginBottom:5}}>{t}</div><div style={{display:"flex",flexWrap:"wrap",gap:5}}><Pill label="Any version" selected={c.includes("any")} onClick={()=>tV(t,"any")} color="#94a3b8" small/>{vMap[t].map(v=><Pill key={v} label={v} selected={c.includes(v)&&!c.includes("any")} onClick={()=>tV(t,v)} color="#64748b" small/>)}</div></div>)})}</div>)}

// ═══════════ SECTION SCORING (clickable) ═══════════
function SectionScore({profile,goStep}){
  const secs=[
    {name:"Category & Role",done:!!(profile.category&&profile.role),step:2},
    {name:"Experience",done:!!(profile.seniority&&profile.experience),step:3},
    {name:"Tech Stack",done:profile.languages?.length>0,step:4},
    {name:"Priorities",done:profile.mustHave?.length>0,step:5},
    {name:"English",done:!!profile.englishLevel,step:6},
    {name:"Location",done:!!profile.location,step:6},
    {name:"Methodology",done:profile.methodology?.length>0,step:6},
    {name:"Industry",done:profile.industry?.length>0,step:6},
  ];
  const done=secs.filter(s=>s.done).length;const pct=Math.round((done/secs.length)*100);
  return(<div style={{background:"linear-gradient(135deg,rgba(255,255,255,0.9),rgba(255,255,255,0.7))",borderRadius:20,padding:"22px 26px",marginBottom:12,border:"1.5px solid #e2e8f0",backdropFilter:"blur(8px)"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:15}}>📋</span><span style={{fontSize:13,fontWeight:600,color:"#0D2550"}}>Profile Completeness</span></div><span style={{fontSize:24,fontWeight:800,color:pct>=80?"#059669":pct>=50?"#f59e0b":"#dc2626"}}>{pct}%</span></div>
    <div style={{height:6,background:"#e2e8f0",borderRadius:6,overflow:"hidden",marginBottom:14}}><div style={{height:"100%",width:`${pct}%`,background:pct>=80?"linear-gradient(90deg,#059669,#10b981)":pct>=50?"linear-gradient(90deg,#f59e0b,#fbbf24)":"linear-gradient(90deg,#dc2626,#f87171)",borderRadius:6,transition:"width .8s"}}/></div>
    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{secs.map(s=>(<button key={s.name} type="button" onClick={()=>!s.done&&goStep(s.step)} style={{fontSize:11,display:"inline-flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:20,border:"none",cursor:s.done?"default":"pointer",fontFamily:"inherit",fontWeight:500,transition:"all .2s",background:s.done?"#f0fdf4":"rgba(220,38,38,0.06)",color:s.done?"#059669":"#94a3b8"}}><span style={{width:16,height:16,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,background:s.done?"#059669":"#e2e8f0",color:s.done?"#fff":"#94a3b8"}}>{s.done?"✓":"—"}</span>{s.name}</button>))}</div>
  </div>);
}

// Skills balance bar (adjustable 0-100)
function SkillsBar({hard,setHard}){const soft=100-hard;
  const hardLabel=hard>=80?"Tech-heavy":hard>=60?"Hard-leaning":hard>=40?"Balanced":hard>=20?"Soft-leaning":"People-focused";
  const hardColor=hard>=60?"#1B6FE8":"#8b5cf6";
  return(<div style={{background:"linear-gradient(135deg,rgba(13,37,80,0.03),rgba(27,111,232,0.04))",borderRadius:20,padding:"24px 28px",marginBottom:12,border:"1.5px solid #e2e8f0",backdropFilter:"blur(8px)"}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
    <div><div style={{fontSize:14,fontWeight:700,color:"#0D2550",display:"flex",alignItems:"center",gap:8}}>⚖️ Skills Balance <span style={{fontSize:11,fontWeight:500,color:hardColor,background:`${hardColor}15`,padding:"2px 10px",borderRadius:20}}>{hardLabel}</span></div><div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>How should we weigh technical expertise vs interpersonal abilities?</div></div>
    <div style={{display:"flex",gap:4,alignItems:"baseline"}}><span style={{fontSize:28,fontWeight:800,color:hardColor}}>{hard}</span><span style={{fontSize:11,color:"#94a3b8"}}>/</span><span style={{fontSize:16,fontWeight:600,color:"#a78bfa"}}>{soft}</span></div>
  </div>
  <div style={{position:"relative",height:48,marginBottom:8}}>
    <div style={{display:"flex",height:48,borderRadius:24,overflow:"hidden",boxShadow:"inset 0 2px 8px rgba(0,0,0,0.06),0 1px 4px rgba(0,0,0,0.04)"}}>
      <div style={{width:`${hard}%`,background:"linear-gradient(135deg,#0D2550,#1B3A70,#1B6FE8)",display:"flex",alignItems:"center",justifyContent:"center",transition:"width .2s ease",minWidth:hard>12?60:0,position:"relative",overflow:"hidden"}}>
        {hard>12&&<><div style={{position:"absolute",inset:0,background:"repeating-linear-gradient(135deg,transparent,transparent 10px,rgba(255,255,255,0.03) 10px,rgba(255,255,255,0.03) 20px)"}}/><span style={{fontSize:12,color:"#fff",fontWeight:700,zIndex:1,display:"flex",alignItems:"center",gap:4}}>🔧 Hard {hard}%</span></>}
      </div>
      <div style={{width:`${soft}%`,background:"linear-gradient(135deg,#7c3aed,#8b5cf6,#a78bfa)",display:"flex",alignItems:"center",justifyContent:"center",transition:"width .2s ease",minWidth:soft>12?60:0,position:"relative",overflow:"hidden"}}>
        {soft>12&&<><div style={{position:"absolute",inset:0,background:"repeating-linear-gradient(-135deg,transparent,transparent 10px,rgba(255,255,255,0.03) 10px,rgba(255,255,255,0.03) 20px)"}}/><span style={{fontSize:12,color:"#fff",fontWeight:700,zIndex:1,display:"flex",alignItems:"center",gap:4}}>🧠 Soft {soft}%</span></>}
      </div>
    </div>
  </div>
  <input type="range" min={0} max={100} value={hard} onChange={e=>setHard(+e.target.value)} style={{width:"100%",accentColor:"#1B6FE8",cursor:"pointer",height:6,marginTop:4}}/>
  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#94a3b8",marginTop:8}}><span>🧠 People & Communication</span><span>Technical Expertise 🔧</span></div>
</div>)}

// Footer
const SITE_LINKS=[{label:"Home",url:"https://www.bozusa.com/home"},{label:"Our Talent",url:"https://www.bozusa.com/our-talent"},{label:"Our Service",url:"https://www.bozusa.com/our-service"},{label:"About Us",url:"https://www.bozusa.com/about-us"},{label:"Contact Us",url:"https://www.bozusa.com/contact-us"}];
const SOCIALS=[
  {name:"Facebook",url:"https://www.facebook.com/BozUSA",svg:'<path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>'},
  {name:"X",url:"https://x.com/Boz_Development",svg:'<path d="M4 4l6.5 8L4 20h2l5.5-6.8L16 20h4l-6.8-8.4L19.5 4h-2l-5.2 6.4L8 4H4z"/>'},
  {name:"LinkedIn",url:"https://www.linkedin.com/company/boz/posts/?feedView=all",svg:'<path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 100-4 2 2 0 000 4z"/>'},
  {name:"Instagram",url:"https://www.instagram.com/boz.usa/profilecard/",svg:'<rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>'},
];
// Legal modal
function LegalModal({type,onClose}){
  const content=type==="privacy"?PRIVACY_CONTENT:TERMS_CONTENT;
  return(<div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(15,23,42,0.6)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:DS.radius.xxl,maxWidth:640,width:"100%",maxHeight:"85vh",overflow:"hidden",animation:"fadeUp .3s both",display:"flex",flexDirection:"column",boxShadow:DS.shadow.lg}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"22px 28px",borderBottom:`1px solid ${DS.surface.borderLight}`,flexShrink:0}}>
        <div style={{fontSize:17,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading,letterSpacing:"-0.02em"}}>{type==="privacy"?"Privacy Policy":"Terms and Conditions"}</div>
        <button type="button" onClick={onClose} style={{background:DS.surface.sunken,border:"none",width:32,height:32,borderRadius:DS.radius.md,fontSize:16,cursor:"pointer",color:DS.text.faint,display:"flex",alignItems:"center",justifyContent:"center",transition:`all .2s ${DS.ease.default}`}} onMouseEnter={e=>{e.currentTarget.style.background=DS.surface.border}} onMouseLeave={e=>{e.currentTarget.style.background=DS.surface.sunken}}>✕</button>
      </div>
      <div style={{padding:"24px 28px",overflowY:"auto",flex:1,fontSize:13.5,color:DS.text.body,lineHeight:1.8,fontFamily:DS.font.body}} dangerouslySetInnerHTML={{__html:content}}/>
      <div style={{padding:"16px 28px",background:DS.surface.page,textAlign:"center",flexShrink:0}}>
        <div style={{fontSize:11,color:DS.text.faint,fontFamily:DS.font.body}}>© 2024 BOZ, Empowering IT Solutions</div>
      </div>
    </div>
  </div>);
}

// Footer (responsive)
function Footer(){
  const[modal,setModal]=useState(null);
  const w=useW();const mob=w<640;
  return(<><footer style={{background:DS.brand.navy900,padding:mob?"28px 16px 20px":"44px 24px 28px",position:"relative",overflow:"hidden"}}>
  <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(rgba(255,255,255,0.03) 1px,transparent 1px)",backgroundSize:"24px 24px",pointerEvents:"none"}}/>
  <div style={{maxWidth:1100,margin:"0 auto",position:"relative"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",flexWrap:"wrap",gap:mob?16:24,marginBottom:mob?16:28}}>
      <div><div style={{fontSize:mob?20:24,fontWeight:800,color:"#fff",letterSpacing:2,fontFamily:DS.font.heading}}>B<span style={{color:"#4F6AFF"}}>O</span>Z<span style={{color:DS.brand.cyan600}}>.</span></div><div style={{fontSize:9.5,color:"rgba(255,255,255,0.3)",letterSpacing:3.5,textTransform:"uppercase",marginTop:5,fontFamily:DS.font.body}}>Empowering IT Solutions</div></div>
      {!mob&&<div style={{display:"flex",gap:28,flexWrap:"wrap",alignItems:"center"}}>{SITE_LINKS.map(l=><a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" style={{fontSize:13,color:"rgba(255,255,255,0.5)",textDecoration:"none",transition:`color .2s ${DS.ease.default}`,fontFamily:DS.font.body,fontWeight:500}} onMouseEnter={e=>{e.target.style.color="#fff"}} onMouseLeave={e=>{e.target.style.color="rgba(255,255,255,0.5)"}}>{l.label}</a>)}</div>}
      <div style={{display:"flex",gap:8}}>{SOCIALS.map(s=><a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" title={s.name} style={{width:34,height:34,borderRadius:"50%",border:"1px solid rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",transition:`all .25s ${DS.ease.snap}`}} onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(27,111,232,0.5)";e.currentTarget.style.background="rgba(27,111,232,0.12)"}} onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.1)";e.currentTarget.style.background="transparent"}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{__html:s.svg}}/></a>)}</div>
    </div>
    {mob&&<div style={{display:"flex",gap:16,flexWrap:"wrap",marginBottom:16}}>{SITE_LINKS.map(l=><a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:"rgba(255,255,255,0.4)",textDecoration:"none",fontFamily:DS.font.body}}>{l.label}</a>)}</div>}
    <div style={{height:1,background:"linear-gradient(to right,transparent,rgba(255,255,255,0.06),transparent)",marginBottom:16}}/>
    <div style={{display:"flex",flexDirection:mob?"column":"row",justifyContent:"space-between",alignItems:mob?"flex-start":"center",gap:8}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{fontSize:10,color:"rgba(255,255,255,0.22)",fontFamily:DS.font.body}}>© 2024 BOZ, Empowering IT Solutions. All Rights Reserved.</div>
        <span style={{fontSize:9,color:"rgba(255,255,255,0.18)",background:"rgba(255,255,255,0.04)",padding:"2px 8px",borderRadius:DS.radius.xs,fontFamily:"monospace",letterSpacing:.5,border:"1px solid rgba(255,255,255,0.04)"}}>v{APP_VERSION} beta</span>
      </div>
      <div style={{display:"flex",gap:16,flexShrink:0}}><button type="button" onClick={()=>setModal("privacy")} style={{fontSize:11,color:"rgba(255,255,255,0.3)",background:"none",border:"none",cursor:"pointer",fontFamily:DS.font.body,textDecoration:"underline",textUnderlineOffset:3,transition:`color .2s ${DS.ease.default}`}} onMouseEnter={e=>{e.target.style.color="rgba(255,255,255,0.6)"}} onMouseLeave={e=>{e.target.style.color="rgba(255,255,255,0.3)"}}>Privacy Policy</button><button type="button" onClick={()=>setModal("terms")} style={{fontSize:11,color:"rgba(255,255,255,0.3)",background:"none",border:"none",cursor:"pointer",fontFamily:DS.font.body,textDecoration:"underline",textUnderlineOffset:3,transition:`color .2s ${DS.ease.default}`}} onMouseEnter={e=>{e.target.style.color="rgba(255,255,255,0.6)"}} onMouseLeave={e=>{e.target.style.color="rgba(255,255,255,0.3)"}}>Terms &amp; Conditions</button></div>
    </div>
  </div>
</footer>{modal&&<LegalModal type={modal} onClose={()=>setModal(null)}/>}</>);
}

// ═══════════ DEV MODE — change to false for production ═══════════
const DEV_MODE=import.meta.env.VITE_DEV_MODE==="true";
const DEV_USER={email:"psicologorafaelbaez@gmail.com",id:"00000000-0000-0000-0000-000000000001"};
const DEV_CLIENT={email:"client@test.com",id:"00000000-0000-0000-0000-000000000002"};
const DEV_ANA={email:ANA_EMAIL,id:"00000000-0000-0000-0000-000000000003"};
const DEV_RECRUITER={email:RECRUITER_EMAIL,id:"00000000-0000-0000-0000-000000000004"};

// ═══════════ LOGIN (professional dark tech) ═══════════
function Login(){const[email,setEmail]=useState("");const[sent,setSent]=useState(false);const[err,setErr]=useState("");const[ld,setLd]=useState(false);
  const go=async()=>{if(!email.includes("@"))return;setLd(true);setErr("");try{await magicLink(email);setSent(true)}catch(e){setErr(e.message)}finally{setLd(false)}};
  return(<div style={{minHeight:"100vh",background:"#060F22",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:DS.font.body,padding:16,position:"relative",overflow:"hidden"}}>
    {/* Animated background particles */}
    <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>
      <div style={{position:"absolute",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(27,111,232,0.15),transparent 70%)",top:"-20%",right:"-10%"}}/>
      <div style={{position:"absolute",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(79,106,255,0.1),transparent 70%)",bottom:"-10%",left:"-5%"}}/>
      <div style={{position:"absolute",width:200,height:200,borderRadius:"50%",background:"radial-gradient(circle,rgba(34,211,238,0.08),transparent 70%)",top:"30%",left:"20%"}}/>
      {/* Grid lines */}
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(27,111,232,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(27,111,232,0.03) 1px,transparent 1px)",backgroundSize:"60px 60px"}}/>
    </div>
    <div style={{maxWidth:440,width:"100%",animation:"fadeUp .5s both",position:"relative",zIndex:1}}>
      <div style={{textAlign:"center",marginBottom:36}}>
        <div style={{fontSize:40,fontWeight:800,color:"#fff",letterSpacing:3,marginBottom:6}}>B<span style={{color:"#4F6AFF"}}>O</span>Z</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.35)",letterSpacing:4,textTransform:"uppercase"}}>Empowering IT Solutions</div>
        <div style={{width:60,height:2,background:"linear-gradient(90deg,transparent,#4F6AFF,transparent)",margin:"16px auto 0"}}/>
      </div>
      <div style={{background:"rgba(255,255,255,0.03)",backdropFilter:"blur(24px)",borderRadius:DS.radius.xxl,padding:36,border:"1px solid rgba(255,255,255,0.07)",boxShadow:"0 8px 40px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.03)"}}>
        <div style={{fontSize:22,fontWeight:700,color:"#fff",marginBottom:4,fontFamily:DS.font.heading,letterSpacing:"-0.02em"}}>Verified Fit</div>
        <div style={{fontSize:13.5,color:"rgba(255,255,255,0.45)",marginBottom:28,fontFamily:DS.font.body}}>Sign in to access your IT talent profile builder.</div>
        {!sent?<>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.5)",marginBottom:6,fontWeight:500,fontFamily:DS.font.body,letterSpacing:"0.05em",textTransform:"uppercase"}}>Email Address</div>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")go()}} placeholder="your@company.com" style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:DS.radius.md,padding:"13px 16px",fontSize:14,fontFamily:DS.font.body,outline:"none",color:"#fff",marginBottom:14,transition:`border-color .25s ${DS.ease.default},box-shadow .25s ${DS.ease.default}`}} onFocus={e=>{e.target.style.borderColor="rgba(27,111,232,0.5)";e.target.style.boxShadow="0 0 0 3px rgba(27,111,232,0.1)"}} onBlur={e=>{e.target.style.borderColor="rgba(255,255,255,0.1)";e.target.style.boxShadow="none"}}/>
          {err&&<div style={{fontSize:12,color:"#f87171",marginBottom:10,padding:"8px 12px",background:"rgba(248,113,113,0.1)",borderRadius:DS.radius.md,fontFamily:DS.font.body}}>{err}</div>}
          <button onClick={go} disabled={ld||!email.includes("@")} type="button" style={{width:"100%",background:email.includes("@")?`linear-gradient(135deg,${DS.brand.navy800},${DS.brand.blue700})`:"rgba(255,255,255,0.05)",color:email.includes("@")?"#fff":"rgba(255,255,255,0.3)",border:"none",borderRadius:DS.radius.md,padding:14,fontSize:14,fontWeight:600,cursor:email.includes("@")?"pointer":"default",fontFamily:DS.font.heading,boxShadow:email.includes("@")?DS.shadow.blue:"none",transition:`all .25s ${DS.ease.snap}`,letterSpacing:"-0.005em"}}>{ld?"Sending...":"Send Magic Link →"}</button>
          {DEV_MODE&&<div style={{marginTop:16,paddingTop:16,borderTop:"1px solid rgba(255,255,255,0.08)"}}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginBottom:8,textAlign:"center",textTransform:"uppercase",letterSpacing:2}}>Dev Mode</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              <button type="button" onClick={()=>{localStorage.setItem("sb-access-token","dev");window.location.reload()}} style={{flex:"1 1 28%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:"8px",fontSize:10,color:"rgba(255,255,255,0.5)",cursor:"pointer",fontFamily:"inherit"}}>⚡ Admin</button>
              <button type="button" onClick={()=>{localStorage.setItem("sb-access-token","dev-sales");window.location.reload()}} style={{flex:"1 1 28%",background:"rgba(5,150,105,0.12)",border:"1px solid rgba(5,150,105,0.25)",borderRadius:8,padding:"8px",fontSize:10,color:"rgba(52,211,153,0.8)",cursor:"pointer",fontFamily:"inherit"}}>💼 Sales</button>
              <button type="button" onClick={()=>{localStorage.setItem("sb-access-token","dev-recruiter");window.location.reload()}} style={{flex:"1 1 28%",background:"rgba(249,115,22,0.12)",border:"1px solid rgba(249,115,22,0.25)",borderRadius:8,padding:"8px",fontSize:10,color:"rgba(251,146,60,0.8)",cursor:"pointer",fontFamily:"inherit"}}>🔍 Recruiter</button>
              <button type="button" onClick={()=>{localStorage.setItem("sb-access-token","dev-ana");window.location.reload()}} style={{flex:"1 1 28%",background:"rgba(124,58,237,0.15)",border:"1px solid rgba(124,58,237,0.3)",borderRadius:8,padding:"8px",fontSize:10,color:"rgba(167,139,250,0.8)",cursor:"pointer",fontFamily:"inherit"}}>🧠 Ana</button>
              <button type="button" onClick={()=>{localStorage.setItem("sb-access-token","dev-finance");window.location.reload()}} style={{flex:"1 1 28%",background:"rgba(3,105,161,0.12)",border:"1px solid rgba(3,105,161,0.25)",borderRadius:8,padding:"8px",fontSize:10,color:"rgba(56,189,248,0.8)",cursor:"pointer",fontFamily:"inherit"}}>💰 Finance</button>
              <button type="button" onClick={()=>{localStorage.setItem("sb-access-token","dev-client");window.location.reload()}} style={{flex:"1 1 28%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:"8px",fontSize:10,color:"rgba(255,255,255,0.5)",cursor:"pointer",fontFamily:"inherit"}}>👤 Client</button>
            </div>
          </div>}
        </>:<div style={{textAlign:"center"}}><div style={{width:56,height:56,borderRadius:"50%",background:"rgba(79,106,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:24}}>✉️</div><div style={{fontSize:17,fontWeight:600,color:"#fff"}}>Check your inbox</div><div style={{fontSize:13,color:"rgba(255,255,255,0.45)",marginTop:6}}>We sent a secure login link to<br/><strong style={{color:"#4F6AFF"}}>{email}</strong></div><button onClick={()=>setSent(false)} type="button" style={{marginTop:20,fontSize:13,color:"#4F6AFF",background:"none",border:"1px solid rgba(79,106,255,0.3)",borderRadius:8,padding:"8px 20px",cursor:"pointer",fontFamily:"inherit"}}>Use different email</button></div>}
      </div>
      <div style={{textAlign:"center",marginTop:24,fontSize:11,color:"rgba(255,255,255,0.2)"}}>© 2024 BOZ, Empowering IT Solutions. All Rights Reserved.</div>
    </div>
    <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}::placeholder{color:rgba(255,255,255,0.25)!important}`}</style>
  </div>)}

// ═══════════ ADMIN ═══════════
// ═══════════ ADMIN ATS ═══════════
const ADM_AUTH=()=>({"Authorization":`Bearer ${localStorage.getItem("sb-access-token")}`,"Content-Type":"application/json"});
const CAND_STAGES=["data_verification","schedule_ts","ready_ts","schedule_technical","ready_technical","schedule_client","ready_client","client_approval","hired","waiting","discarded"];
const CAND_STAGE_LABELS={data_verification:"Data Verification",schedule_ts:"Schedule TS Interview",ready_ts:"Ready TS Interview",schedule_technical:"Schedule Technical",ready_technical:"Ready Technical",schedule_client:"Schedule Client Interview",ready_client:"Ready Client Interview",client_approval:"Client Approval to Hire",hired:"Hired",waiting:"Waiting",discarded:"Discarded"};
const CAND_STAGE_COLORS={data_verification:"#3b82f6",schedule_ts:"#6366f1",ready_ts:"#8b5cf6",schedule_technical:"#a855f7",ready_technical:"#d946ef",schedule_client:"#f59e0b",ready_client:"#f97316",client_approval:"#10b981",hired:"#059669",waiting:"#64748b",discarded:"#ef4444"};
const CLIENT_VISIBLE_STAGES=["ready_client","client_approval","hired"];

function Admin({user}){
  const isAdmin=user.role==="admin";
  const isRecruiter=user.role==="recruiter";
  const[view,setView]=useState(isRecruiter?"review":"users");
  const[sideOpen,setSideOpen]=useState(true);
  const[ps,setPs]=useState([]);const[cands,setCands]=useState([]);const[assigns,setAssigns]=useState([]);
  const[ld,setLd]=useState(true);const[selP,setSelP]=useState(null);const[dragId,setDragId]=useState(null);
  const[showAddCand,setShowAddCand]=useState(false);
  const[newCand,setNewCand]=useState({name:"",email:"",phone:"",seniority:"",experience:"",location:"",english_level:"",notes:"",languages:[],frameworks:[],skills:[]});
  const[skillInput,setSkillInput]=useState("");
  const[editCand,setEditCand]=useState(null);
  const[editSkillInput,setEditSkillInput]=useState("");
  const[assignDocs,setAssignDocs]=useState({});
  const[uploadingDoc,setUploadingDoc]=useState(null);
  const[copyToast,setCopyToast]=useState("");
  const show=(m)=>{setCopyToast(m);setTimeout(()=>setCopyToast(""),3500)};
  const[allAssigns,setAllAssigns]=useState([]);
  const[pipeFilter,setPipeFilter]=useState("all");
  const[candDetail,setCandDetail]=useState(null);
  const[scoreOverrides,setScoreOverrides]=useState({});
  // Review state (for recruiter approve/reject)
  const[revNotes,setRevNotes]=useState("");const[revQuestions,setRevQuestions]=useState([]);
  const[revGenerating,setRevGenerating]=useState(false);const[revSubmitting,setRevSubmitting]=useState(false);
  // Users state (for admin user management)
  const[users,setUsers]=useState([]);const[showAddUser,setShowAddUser]=useState(false);
  const[newUser,setNewUser]=useState({email:"",role:"recruiter",name:""});
  const isMob=useW()<640;
  // Phase 3: Admin alerts
  const[adminAlerts,setAdminAlerts]=useState([]);const[alertsLoading,setAlertsLoading]=useState(false);
  // Trash (soft delete)
  const[trashData,setTrashData]=useState({profiles:[],candidates:[]});const[trashLoading,setTrashLoading]=useState(false);
  // Auto-match
  const[autoMatches,setAutoMatches]=useState([]);const[matchLoading,setMatchLoading]=useState(false);

  // Load data
  const load=useCallback(async()=>{
    try{
      const[pR,cR,aR]=await Promise.all([
        fetch("/api/admin",{headers:ADM_AUTH()}),
        fetch("/api/admin",{method:"POST",headers:ADM_AUTH(),body:JSON.stringify({action:"list_candidates"})}),
        fetch("/api/admin",{method:"POST",headers:ADM_AUTH(),body:JSON.stringify({action:"list_assignments"})})
      ]);
      if(pR.ok){const pData=await pR.json();if(Array.isArray(pData))setPs(pData)}
      if(cR.ok){const cData=await cR.json();if(Array.isArray(cData))setCands(cData)}
      if(aR.ok){const aData=await aR.json();if(Array.isArray(aData))setAllAssigns(aData)}
      // Load users for admin
      if(isAdmin){try{const uR=await fetch("/api/roles",{method:"POST",headers:ADM_AUTH(),body:JSON.stringify({action:"list"})});if(uR.ok){const uD=await uR.json();if(Array.isArray(uD))setUsers(uD)}}catch{}}
    }catch(e){console.warn("Load:",e.message)}finally{setLd(false)}
  },[isAdmin]);
  useEffect(()=>{load()},[load]);

  // ═══ REVIEW FUNCTIONS (recruiter approve/reject) ═══
  const generateRevQuestions=async()=>{
    if(!selP)return;setRevGenerating(true);
    try{const pd=selP.profile_data||{};
      const ctx=`Role: ${selP.role} (${selP.category}, ${selP.seniority}, ${selP.experience})\nMust Have: ${pd.mustHave?.join(", ")||"—"}\nNice to Have: ${pd.niceToHave?.join(", ")||"—"}\nLanguages: ${pd.techStack?.languages?.join(", ")||"—"}\nFrameworks: ${pd.techStack?.frameworks?.join(", ")||"—"}\nIndustry: ${pd.industry||"—"}`;
      const raw=await callClaude([{role:"user",content:ctx}],AI_PROMPTS.recruiter_questions);
      const parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());
      if(Array.isArray(parsed))setRevQuestions(parsed);show("✅ Questions generated");
    }catch(e){show("⚠️ "+e.message)}finally{setRevGenerating(false)}
  };
  const acceptProfile=async()=>{
    if(!selP)return;if(!revNotes.trim()&&!revQuestions.filter(q=>q.trim()).length)return show("⚠️ Add at least a note or question for Ana");
    setRevSubmitting(true);const cleanQ=revQuestions.filter(q=>q.trim());
    try{await fetch("/api/recruiter",{method:"POST",headers:ADM_AUTH(),body:JSON.stringify({action:"accept_profile",id:selP.id,notes:revNotes,questions:cleanQ})});
      setPs(p=>p.map(x=>x.id===selP.id?{...x,status:"pending_soft"}:x));show("✅ Sent to Ana");setView("review");setSelP(null);setRevNotes("");setRevQuestions([]);
    }catch(e){show("⚠️ "+e.message)}finally{setRevSubmitting(false)}
  };
  const rejectProfile=async()=>{
    if(!selP||!revNotes.trim())return show("⚠️ Add a rejection note");setRevSubmitting(true);
    try{await fetch("/api/recruiter",{method:"POST",headers:ADM_AUTH(),body:JSON.stringify({action:"reject_profile",id:selP.id,notes:revNotes})});
      setPs(p=>p.map(x=>x.id===selP.id?{...x,status:"closed"}:x));show("Rejected");setView("review");setSelP(null);setRevNotes("");setRevQuestions([]);
    }catch(e){show("⚠️ "+e.message)}finally{setRevSubmitting(false)}
  };
  // ═══ USER MANAGEMENT FUNCTIONS (admin only) ═══
  const addUser=async()=>{
    if(!newUser.email.includes("@")||!newUser.role)return show("⚠️ Email and role required");
    try{const r=await fetch("/api/roles",{method:"POST",headers:ADM_AUTH(),body:JSON.stringify({action:"add",...newUser})});
      const d=await r.json();if(d.error)return show("⚠️ "+d.error);setUsers(p=>[d,...p]);setNewUser({email:"",role:"recruiter",name:""});setShowAddUser(false);show("✅ User added");
    }catch(e){show("⚠️ "+e.message)}
  };
  const updateUserRole=async(id,role)=>{
    try{await fetch("/api/roles",{method:"POST",headers:ADM_AUTH(),body:JSON.stringify({action:"update",id,role})});
      setUsers(p=>p.map(u=>u.id===id?{...u,role}:u));show("✅ Role updated");
    }catch(e){show("⚠️ "+e.message)}
  };
  const toggleUserActive=async(id,active)=>{
    try{await fetch("/api/roles",{method:"POST",headers:ADM_AUTH(),body:JSON.stringify({action:"update",id,active})});
      setUsers(p=>p.map(u=>u.id===id?{...u,active}:u));show(active?"✅ User activated":"User deactivated");
    }catch(e){show("⚠️ "+e.message)}
  };
  const deleteUser=async(id)=>{
    if(!confirm("Delete this user permanently?"))return;
    try{await fetch("/api/roles",{method:"POST",headers:ADM_AUTH(),body:JSON.stringify({action:"delete",id})});
      setUsers(p=>p.filter(u=>u.id!==id));show("User deleted");
    }catch(e){show("⚠️ "+e.message)}
  };

  // Load assignments for selected profile
  const loadAssigns=async(pid)=>{
    try{const r=await fetch("/api/admin",{method:"POST",headers:ADM_AUTH(),body:JSON.stringify({action:"list_assignments",profile_id:pid})});
      if(r.ok)setAssigns(await r.json());}catch(e){console.warn("loadAssigns:",e.message)}
    loadDocs(pid);
  };

  // Update profile status (drag & drop or dropdown)
  const updStatus=async(id,st)=>{
    try{await fetch("/api/admin",{method:"PATCH",headers:ADM_AUTH(),body:JSON.stringify({id,status:st})});
      setPs(p=>p.map(x=>x.id===id?{...x,status:st}:x))}catch(e){setCopyToast("⚠️ Status update failed");setTimeout(()=>setCopyToast(""),3000)}
  };

  // Add candidate — clean data to only send valid DB columns
  const addCandidate=async()=>{
    if(!newCand.name.trim())return;
    const clean={name:newCand.name.trim()};
    if(newCand.email)clean.email=newCand.email;
    if(newCand.phone)clean.phone=newCand.phone;
    if(newCand.seniority)clean.seniority=newCand.seniority;
    if(newCand.experience)clean.experience=newCand.experience;
    if(newCand.location)clean.location=newCand.location;
    if(newCand.english_level)clean.english_level=newCand.english_level;
    if(newCand.notes)clean.notes=newCand.notes;
    if(newCand.skills?.length)clean.skills=newCand.skills;
    try{const r=await fetch("/api/admin",{method:"POST",headers:ADM_AUTH(),body:JSON.stringify({action:"add_candidate",candidate:clean})});
      const d=await r.json();
      if(!r.ok){setCopyToast("⚠️ "+(d.error||"Error saving"));setTimeout(()=>setCopyToast(""),3000);return}
      setCands(p=>[d,...p]);setNewCand({name:"",email:"",phone:"",seniority:"",experience:"",location:"",english_level:"",notes:"",languages:[],frameworks:[],skills:[]});setShowAddCand(false);
      setCopyToast("✅ Talent added!");setTimeout(()=>setCopyToast(""),2500)}catch(e){setCopyToast("⚠️ "+e.message);setTimeout(()=>setCopyToast(""),3000)}
  };

  // Reload global assignments
  const reloadAllAssigns=async()=>{
    try{const r=await fetch("/api/admin",{method:"POST",headers:ADM_AUTH(),body:JSON.stringify({action:"list_assignments"})});
      if(r.ok){const d=await r.json();if(Array.isArray(d))setAllAssigns(d)}}catch(e){console.warn("reloadAllAssigns:",e.message)}
  };

  // Assign candidate to profile
  const assignCand=async(candId,score)=>{
    if(!selP)return;
    try{const r=await fetch("/api/admin",{method:"POST",headers:ADM_AUTH(),body:JSON.stringify({action:"assign_candidate",profile_id:selP.id,candidate_id:candId,match_score:score||0})});
      if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.error||"Assign failed")}
      await loadAssigns(selP.id);await reloadAllAssigns();setCopyToast("✅ Candidate assigned");setTimeout(()=>setCopyToast(""),2500)}catch(e){setCopyToast("⚠️ "+e.message);setTimeout(()=>setCopyToast(""),3000)}
  };

  // Update assignment status
  const updAssign=async(aId,st)=>{
    try{await fetch("/api/admin",{method:"POST",headers:ADM_AUTH(),body:JSON.stringify({action:"update_assignment",id:aId,status:st})});
      setAssigns(p=>p.map(a=>a.id===aId?{...a,status:st}:a));
      setAllAssigns(p=>p.map(a=>a.id===aId?{...a,status:st}:a));
      setCopyToast("✅ Stage updated");setTimeout(()=>setCopyToast(""),2000)}catch(e){setCopyToast("⚠️ Stage update failed");setTimeout(()=>setCopyToast(""),3000)}
  };

  // Update candidate data — clean before sending
  const updateCandidate=async(id,data)=>{
    const clean={};
    if(data.name)clean.name=data.name.trim();
    if(data.email!==undefined)clean.email=data.email;
    if(data.phone!==undefined)clean.phone=data.phone;
    if(data.seniority)clean.seniority=data.seniority;
    if(data.experience)clean.experience=data.experience;
    if(data.location)clean.location=data.location;
    if(data.english_level)clean.english_level=data.english_level;
    if(data.notes!==undefined)clean.notes=data.notes;
    if(data.skills)clean.skills=data.skills;
    try{const r=await fetch("/api/admin",{method:"POST",headers:ADM_AUTH(),body:JSON.stringify({action:"update_candidate",id,data:clean})});
      const d=await r.json();
      if(!r.ok){setCopyToast("⚠️ "+(d.error||"Error updating"));setTimeout(()=>setCopyToast(""),3000);return}
      setCands(p=>p.map(c=>c.id===id?{...c,...d}:c));setEditCand(null);
      setCopyToast("✅ Talent updated!");setTimeout(()=>setCopyToast(""),2500)}catch(e){setCopyToast("⚠️ "+e.message);setTimeout(()=>setCopyToast(""),3000)}
  };

  // Upload document for candidate in a process
  const uploadDoc=async(candidateId,profileId,docType,file)=>{
    if(!file||file.size>MAX_DOC_SIZE){if(file?.size>MAX_DOC_SIZE)setCopyToast("⚠️ File too large (max 10MB)");return}
    setUploadingDoc(docType);
    try{
      const b64=await new Promise((r,j)=>{const f=new FileReader();f.onload=()=>r(f.result.split(",")[1]);f.onerror=j;f.readAsDataURL(file)});
      const r=await fetch("/api/admin",{method:"POST",headers:ADM_AUTH(),body:JSON.stringify({
        action:"upload_document",candidate_id:candidateId,profile_id:profileId,doc_type:docType,
        file_base64:b64,file_name:file.name,mime_type:file.type
      })});
      if(r.ok){await loadDocs(profileId);setCopyToast("✅ Document uploaded");setTimeout(()=>setCopyToast(""),2500)}
      else{const d=await r.json().catch(()=>({}));setCopyToast("⚠️ "+(d.error||"Upload failed"));setTimeout(()=>setCopyToast(""),3000)}
    }catch(e){setCopyToast("⚠️ Upload error");setTimeout(()=>setCopyToast(""),3000)}finally{setUploadingDoc(null)}
  };

  // Load documents for a profile
  const loadDocs=async(profileId)=>{
    try{const r=await fetch("/api/admin",{method:"POST",headers:ADM_AUTH(),body:JSON.stringify({action:"list_documents",profile_id:profileId})});
      if(r.ok){const docs=await r.json();if(Array.isArray(docs)){const byCandidate={};docs.forEach(d=>{if(!byCandidate[d.candidate_id])byCandidate[d.candidate_id]=[];byCandidate[d.candidate_id].push(d)});setAssignDocs(byCandidate)}}}catch(e){console.warn("loadDocs:",e.message)}
  };

  // Delete document
  const deleteDoc=async(docId,filePath,profileId)=>{
    try{await fetch("/api/admin",{method:"POST",headers:ADM_AUTH(),body:JSON.stringify({action:"delete_document",id:docId,file_path:filePath})});
      if(profileId)await loadDocs(profileId);setCopyToast("✅ Document removed");setTimeout(()=>setCopyToast(""),2500)}catch(e){setCopyToast("⚠️ Delete failed");setTimeout(()=>setCopyToast(""),3000)}
  };

  // ═══ SOFT DELETE ═══
  const softDeleteProfile=async(id)=>{
    if(!confirm("Move this profile to trash?"))return;
    try{await fetch("/api/admin",{method:"POST",headers:ADM_AUTH(),body:JSON.stringify({action:"soft_delete_profile",id})});
      setPs(p=>p.filter(x=>x.id!==id));if(selP?.id===id){setSelP(null);setView("kanban")}
      show("✅ Profile moved to trash");
    }catch(e){show("⚠️ "+e.message)}
  };
  const softDeleteCandidate=async(id)=>{
    if(!confirm("Move this candidate to trash?"))return;
    try{await fetch("/api/admin",{method:"POST",headers:ADM_AUTH(),body:JSON.stringify({action:"delete_candidate",id})});
      setCands(p=>p.filter(x=>x.id!==id));show("✅ Candidate moved to trash");
    }catch(e){show("⚠️ "+e.message)}
  };
  const loadTrash=async()=>{
    setTrashLoading(true);
    try{const r=await fetch("/api/admin",{method:"POST",headers:ADM_AUTH(),body:JSON.stringify({action:"list_deleted"})});
      if(r.ok)setTrashData(await r.json());
    }catch(e){console.warn("Trash load:",e.message)}finally{setTrashLoading(false)}
  };
  const restoreItem=async(id,tableName)=>{
    try{await fetch("/api/admin",{method:"POST",headers:ADM_AUTH(),body:JSON.stringify({action:"restore",id,table_name:tableName})});
      show("✅ Restored");await loadTrash();await load();
    }catch(e){show("⚠️ "+e.message)}
  };

  // ═══ AUTO-MATCH ═══
  const runAutoMatch=(profile)=>{
    if(!profile||!cands.length){setAutoMatches([]);return}
    const scored=cands.map(c=>{const ms=calcMatch(c,profile);return{candidate:c,score:ms}}).filter(x=>x.score>20).sort((a,b)=>b.score-a.score).slice(0,5);
    setAutoMatches(scored);
  };

  // Copy review link
  const copyReviewLink=(profileId)=>{
    const link=`${BASE_URL}/api/review/${profileId}`;
    navigator.clipboard.writeText(link).then(()=>{setCopyToast("✅ Review link copied!");setTimeout(()=>setCopyToast(""),2500)}).catch(()=>{
      window.prompt("Copy this link:",link);
    });
  };

  // Update client decision
  const updClientDecision=async(assignId,decision)=>{
    try{await fetch("/api/admin",{method:"POST",headers:ADM_AUTH(),body:JSON.stringify({action:"update_client_decision",assignment_id:assignId,decision})});
      setAssigns(p=>p.map(a=>a.id===assignId?{...a,client_decision:decision}:a))}catch(e){setCopyToast("⚠️ Decision update failed");setTimeout(()=>setCopyToast(""),3000)}
  };

  // Calculate match score
  const calcMatch=(cand,prof)=>{
    if(!prof?.profile_data)return 0;
    const pd=prof.profile_data;const mh=pd.mustHave||[];const nh=pd.niceToHave||[];
    const cSkills=[...(cand.languages||[]),...(cand.frameworks||[]),...(cand.skills||[])];
    let score=0,total=0;
    mh.forEach(t=>{total+=10;if(cSkills.some(s=>s.toLowerCase().includes(t.toLowerCase())))score+=10});
    nh.forEach(t=>{total+=5;if(cSkills.some(s=>s.toLowerCase().includes(t.toLowerCase())))score+=5});
    if(cand.seniority&&pd.seniority&&cand.seniority===pd.seniority){score+=10;total+=10}else total+=10;
    if(cand.english_level&&pd.englishLevel&&cand.english_level===pd.englishLevel){score+=5;total+=5}else total+=5;
    return total?Math.round((score/total)*100):0;
  };

  // Detailed score breakdown for candidate detail view
  const calcScoreBreakdown=(cand,prof)=>{
    if(!prof?.profile_data)return{total:0,technical:0,seniority:0,stack:0,english:0,timezone:0,availability:0};
    const pd=prof.profile_data;const mh=pd.mustHave||[];const nh=pd.niceToHave||[];
    const cSkills=[...(cand.languages||[]),...(cand.frameworks||[]),...(cand.skills||[])];
    // Technical: must-have match
    const mhMatch=mh.length?Math.round((mh.filter(t=>cSkills.some(s=>s.toLowerCase().includes(t.toLowerCase()))).length/mh.length)*100):50;
    // Stack overlap: nice-to-have
    const nhMatch=nh.length?Math.round((nh.filter(t=>cSkills.some(s=>s.toLowerCase().includes(t.toLowerCase()))).length/nh.length)*100):50;
    // Seniority
    const senMatch=(cand.seniority&&pd.seniority&&cand.seniority===pd.seniority)?100:cand.seniority?50:0;
    // English
    const engMatch=(cand.english_level&&pd.englishLevel&&cand.english_level===pd.englishLevel)?100:cand.english_level?60:0;
    // Timezone (simplified)
    const tzMatch=cand.location?80:50;
    // Availability
    const availMatch=100;
    const total=Math.round((mhMatch*0.35+nhMatch*0.15+senMatch*0.2+engMatch*0.15+tzMatch*0.1+availMatch*0.05));
    return{total,technical:mhMatch,seniority:senMatch,stack:nhMatch,english:engMatch,timezone:tzMatch,availability:availMatch};
  };

  // Skills comparison: must, nice, missing
  const getSkillsComparison=(cand,prof)=>{
    if(!prof?.profile_data)return{matched:[],nice:[],missing:[]};
    const pd=prof.profile_data;const mh=pd.mustHave||[];const nh=pd.niceToHave||[];
    const cSkills=[...(cand.languages||[]),...(cand.frameworks||[]),...(cand.skills||[])];
    const matched=mh.filter(t=>cSkills.some(s=>s.toLowerCase().includes(t.toLowerCase())));
    const niceMatched=nh.filter(t=>cSkills.some(s=>s.toLowerCase().includes(t.toLowerCase())));
    const missing=mh.filter(t=>!cSkills.some(s=>s.toLowerCase().includes(t.toLowerCase())));
    return{matched,nice:niceMatched,missing};
  };

  const cn={};Object.keys(STATUS_LABELS).forEach(s=>{cn[s]=ps.filter(p=>p.status===s).length});
  const catCn={};ps.forEach(p=>{catCn[p.category]=(catCn[p.category]||0)+1});
  const IS={width:"100%",border:`1.5px solid ${DS.surface.border}`,borderRadius:DS.radius.sm,padding:"11px 14px",fontSize:13.5,fontFamily:DS.font.body,outline:"none",background:"#fff",color:DS.text.body,transition:`border-color .2s ${DS.ease.default},box-shadow .2s ${DS.ease.default}`,letterSpacing:"-0.006em"};

  // Drag handlers for Kanban
  const onDragStart=(e,id)=>{setDragId(id);e.dataTransfer.effectAllowed="move"};
  const onDragOver=(e)=>{e.preventDefault();e.dataTransfer.dropEffect="move"};
  const onDrop=(e,status)=>{e.preventDefault();if(dragId)updStatus(dragId,status);setDragId(null)};

  // Drag handlers for Pipeline (assignment stage)
  const onPipeDragStart=(e,aId)=>{e.dataTransfer.setData("assignId",aId);e.dataTransfer.effectAllowed="move"};
  const onPipeDrop=(e,stage)=>{e.preventDefault();const aId=e.dataTransfer.getData("assignId");if(aId)updAssign(aId,stage)};

  // ─── Candidate Card (dark navy header style) ───
  const CandCard=({a,prof,onClick})=>{
    const c=a.candidates||{};const ms=a.match_score||0;
    const msColor=ms>=80?"#059669":ms>=60?"#f59e0b":"#dc2626";
    const cSkills=[...(c.skills||[])].slice(0,5);
    const isClient=CLIENT_VISIBLE_STAGES.includes(a.status);
    return(<div draggable onDragStart={e=>onPipeDragStart(e,a.id)} onClick={onClick}
      style={{background:"#fff",borderRadius:DS.radius.lg,overflow:"hidden",cursor:"grab",transition:`all .25s ${DS.ease.snap}`,boxShadow:DS.shadow.sm,minWidth:220,animation:"fadeUp .3s both"}}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow=DS.shadow.md;e.currentTarget.style.transform="translateY(-2px)"}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow=DS.shadow.sm;e.currentTarget.style.transform="none"}}>
      {/* Dark header */}
      <div style={{background:`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.navy800})`,padding:"14px 16px",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${CAND_STAGE_COLORS[a.status]||DS.brand.blue700},${DS.brand.blue700})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:700,fontFamily:DS.font.heading,flexShrink:0}}>{(c.name||"?").split(" ").map(w=>w[0]).join("").substring(0,2)}</div>
        <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600,color:"#fff",fontFamily:DS.font.heading,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name||"Unknown"}</div><div style={{fontSize:11,color:DS.brand.cyan600,fontFamily:DS.font.body}}>{c.seniority||""} {prof?.role?`· ${prof.role.substring(0,20)}`:""}</div></div>
      </div>
      {/* Body */}
      <div style={{padding:"12px 16px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:11,color:DS.text.muted,fontFamily:DS.font.body,fontWeight:500}}>Profile Match</span>
          <span style={{fontSize:16,fontWeight:800,color:msColor,fontFamily:DS.font.heading}}>{ms}%</span>
        </div>
        <div style={{height:4,background:DS.surface.sunken,borderRadius:2,overflow:"hidden",marginBottom:10}}>
          <div style={{height:"100%",width:`${ms}%`,background:msColor,borderRadius:2,transition:"width .5s"}}/>
        </div>
        {cSkills.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>{cSkills.map(s=><span key={s} style={{padding:"2px 8px",borderRadius:DS.radius.xs,fontSize:10,background:DS.brand.blue50,color:DS.brand.blue700,fontFamily:DS.font.body,fontWeight:500,border:`1px solid ${DS.brand.blue100}`}}>{s}</span>)}</div>}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:10.5,color:DS.text.faint,fontFamily:DS.font.body}}>{c.experience||"—"} · {c.location||"—"}</span>
          {isClient&&<button type="button" onClick={e=>{e.stopPropagation();setCandDetail({assignment:a,candidate:c,profile:prof})}} style={{fontSize:10,background:`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`,color:"#fff",border:"none",borderRadius:DS.radius.sm,padding:"4px 10px",cursor:"pointer",fontFamily:DS.font.heading,fontWeight:600}}>View</button>}
        </div>
      </div>
    </div>);
  };

  // ─── Pipeline View (global candidate tracking) ───
  const renderPipeline=()=>{
    const filteredAssigns=pipeFilter==="all"?allAssigns:allAssigns.filter(a=>a.profile_id===pipeFilter);
    return(<div>
      {/* Filter bar */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,flexWrap:"wrap"}}>
        <span style={{fontSize:12,color:DS.text.muted,fontFamily:DS.font.body,fontWeight:500}}>Filter by vacancy:</span>
        <select value={pipeFilter} onChange={e=>setPipeFilter(e.target.value)} style={{fontSize:12,border:`1.5px solid ${DS.surface.border}`,borderRadius:DS.radius.sm,padding:"6px 12px",fontFamily:DS.font.body,color:DS.text.body,background:"#fff",cursor:"pointer"}}>
          <option value="all">All vacancies ({allAssigns.length})</option>
          {ps.map(p=><option key={p.id} value={p.id}>{p.role} — {p.client_name} ({allAssigns.filter(a=>a.profile_id===p.id).length})</option>)}
        </select>
      </div>
      {/* Pipeline columns */}
      <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:16,minHeight:400}}>
        {CAND_STAGES.map(stage=>{
          const items=filteredAssigns.filter(a=>(a.status||"data_verification")===stage);
          const prof=items[0]?ps.find(p=>p.id===items[0]?.profile_id):null;
          return(<div key={stage} onDragOver={onDragOver} onDrop={e=>onPipeDrop(e,stage)}
            style={{minWidth:230,maxWidth:260,flex:"0 0 240px",background:DS.surface.page,borderRadius:DS.radius.xl,padding:12,border:`2px solid ${dragId?DS.brand.blue700:"transparent"}`,transition:`border-color .2s ${DS.ease.default}`}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:CAND_STAGE_COLORS[stage]}}/>
                <span style={{fontSize:10.5,fontWeight:600,color:DS.text.h2,fontFamily:DS.font.heading,whiteSpace:"nowrap"}}>{CAND_STAGE_LABELS[stage]}</span>
              </div>
              <span style={{fontSize:9,background:`${CAND_STAGE_COLORS[stage]}15`,color:CAND_STAGE_COLORS[stage],padding:"2px 8px",borderRadius:DS.radius.pill,fontWeight:600}}>{items.length}</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {items.map(a=>{const p=ps.find(pr=>pr.id===a.profile_id);return<CandCard key={a.id} a={a} prof={p} onClick={()=>{if(CLIENT_VISIBLE_STAGES.includes(a.status))setCandDetail({assignment:a,candidate:a.candidates||{},profile:p})}}/>})}
              {!items.length&&<div style={{textAlign:"center",padding:20,color:DS.text.placeholder,fontSize:11,border:`2px dashed ${DS.surface.border}`,borderRadius:DS.radius.lg,fontFamily:DS.font.body}}>Drop here</div>}
            </div>
          </div>);
        })}
      </div>
    </div>);
  };

  // ─── Candidate Detail Modal (Score Breakdown) ───
  const renderCandDetailModal=()=>{
    if(!candDetail)return null;
    const{assignment:a,candidate:c,profile:prof}=candDetail;
    const bd=calcScoreBreakdown(c,prof);
    const sc=getSkillsComparison(c,prof);
    const overrides=scoreOverrides[a.id]||{};
    const bars=[
      {label:"Technical Skills",key:"technical",color:DS.brand.blue700},
      {label:"Seniority",key:"seniority",color:"#10b981"},
      {label:"Stack Overlap",key:"stack",color:"#8b5cf6"},
      {label:"Years of Experience",key:"seniority",color:"#f59e0b"},
      {label:"English Proficiency",key:"english",color:"#f97316"},
      {label:"Timezone Alignment",key:"timezone",color:"#06b6d4"},
    ];
    return(<div style={{position:"fixed",inset:0,zIndex:60,background:"rgba(15,23,42,0.7)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setCandDetail(null)}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:DS.radius.xxl,maxWidth:800,width:"100%",maxHeight:"90vh",overflowY:"auto",animation:"fadeUp .3s both",boxShadow:DS.shadow.lg}}>
        {/* Dark header */}
        <div style={{background:`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.navy800},${DS.brand.blue700})`,borderRadius:`${DS.radius.xxl}px ${DS.radius.xxl}px 0 0`,padding:"28px 32px",display:"flex",gap:24,flexWrap:"wrap",position:"relative",overflow:"hidden"}}>
          <HeaderBG/>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,position:"relative",zIndex:1}}>
            <div style={{width:90,height:90,borderRadius:DS.radius.xl,background:`linear-gradient(135deg,${DS.brand.blue700},${DS.brand.cyan600})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:32,fontWeight:800,fontFamily:DS.font.heading,boxShadow:"0 4px 20px rgba(27,111,232,0.3)"}}>{(c.name||"?").split(" ").map(w=>w[0]).join("").substring(0,2)}</div>
            <div style={{textAlign:"center"}}><div style={{fontSize:12,color:"rgba(255,255,255,0.7)",fontFamily:DS.font.body}}>{c.name}</div><div style={{fontSize:10,color:DS.brand.cyan600}}>{c.seniority} Developer</div></div>
            <div style={{width:44,height:44,borderRadius:"50%",background:"rgba(27,111,232,0.3)",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:18}}>▶</span>
            </div>
          </div>
          <div style={{flex:1,minWidth:200,position:"relative",zIndex:1}}>
            <div style={{fontSize:24,fontWeight:700,color:"#fff",fontFamily:DS.font.heading,letterSpacing:"-0.02em"}}>{c.name}</div>
            <div style={{fontSize:14,color:DS.brand.cyan600,marginTop:4,fontFamily:DS.font.body}}>{c.seniority} {prof?.role||"Developer"} · {c.experience||"—"}</div>
            <div style={{fontSize:12,color:"rgba(255,255,255,0.6)",marginTop:6,fontFamily:DS.font.body}}>📍 {c.location||"—"} · 🗣️ {c.english_level||"—"}</div>
            {/* Score breakdown mini */}
            <div style={{marginTop:16}}>
              <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.5)",letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:8,fontFamily:DS.font.body}}>Score Breakdown</div>
              {bars.slice(0,4).map(b=>{const val=overrides[b.key]!==undefined?overrides[b.key]:(bd[b.key]||0);return(
                <div key={b.label} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                  <span style={{fontSize:10,color:"rgba(255,255,255,0.7)",width:100,fontFamily:DS.font.body}}>{b.label}</span>
                  <div style={{flex:1,height:6,background:"rgba(255,255,255,0.1)",borderRadius:3}}><div style={{height:"100%",width:`${val}%`,background:b.color,borderRadius:3,transition:"width .5s"}}/></div>
                  <span style={{fontSize:10,color:"#fff",fontWeight:600,width:32,textAlign:"right",fontFamily:DS.font.heading}}>{val}%</span>
                </div>)})}
            </div>
          </div>
          <div style={{position:"absolute",top:16,right:24,zIndex:2}}><div style={{display:"flex",alignItems:"baseline",gap:4}}><span style={{fontSize:40,fontWeight:800,color:bd.total>=80?"#10b981":bd.total>=60?"#f59e0b":"#ef4444",fontFamily:DS.font.heading}}>{overrides.total!==undefined?overrides.total:bd.total}%</span><span style={{fontSize:12,color:"rgba(255,255,255,0.5)",fontFamily:DS.font.body}}>MATCH</span></div></div>
          <button type="button" onClick={()=>setCandDetail(null)} style={{position:"absolute",top:12,right:12,background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",width:28,height:28,borderRadius:"50%",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",zIndex:2}}>✕</button>
        </div>
        {/* Skills comparison */}
        <div style={{padding:"24px 32px",borderBottom:`1px solid ${DS.surface.borderLight}`}}>
          <div style={{fontSize:10,fontWeight:700,color:DS.text.faint,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:12,fontFamily:DS.font.body}}>Skills vs. Profile Requirements</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {sc.matched.map(s=><span key={s} style={{padding:"4px 12px",borderRadius:DS.radius.sm,fontSize:11,background:"#dcfce7",color:"#059669",fontWeight:600,fontFamily:DS.font.body,border:"1px solid #bbf7d0"}}>✓ {s}</span>)}
            {sc.nice.map(s=><span key={s} style={{padding:"4px 12px",borderRadius:DS.radius.sm,fontSize:11,background:DS.brand.blue50,color:DS.brand.blue700,fontWeight:500,fontFamily:DS.font.body,border:`1px solid ${DS.brand.blue100}`}}>~ {s}</span>)}
            {sc.missing.map(s=><span key={s} style={{padding:"4px 12px",borderRadius:DS.radius.sm,fontSize:11,background:DS.surface.sunken,color:DS.text.faint,fontFamily:DS.font.body,border:`1px solid ${DS.surface.border}`}}>○ {s}</span>)}
          </div>
        </div>
        {/* Profile Compliance Score */}
        <div style={{padding:"24px 32px"}}>
          <div style={{fontFamily:DS.font.heading,fontWeight:700,fontSize:16,color:DS.text.h1,marginBottom:4}}>Profile Compliance Score</div>
          <div style={{fontSize:12,color:DS.text.muted,fontFamily:DS.font.body,marginBottom:16}}>How well this candidate fulfills your defined requirements (0–100)</div>
          <div style={{height:12,borderRadius:6,overflow:"hidden",background:`linear-gradient(90deg,#dc2626,#f59e0b,#10b981)`,marginBottom:8}}>
            <div style={{height:"100%",width:`${100-(overrides.total!==undefined?overrides.total:bd.total)}%`,background:DS.surface.sunken,marginLeft:"auto",transition:"width .5s"}}/>
          </div>
          <div style={{fontSize:13,color:DS.text.body,fontFamily:DS.font.body,marginBottom:20}}>Overall compliance: <strong>{overrides.total!==undefined?overrides.total:bd.total}%</strong> of your defined profile</div>
          {/* Adjustable bars */}
          <div style={{fontSize:10,fontWeight:700,color:DS.text.faint,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:12,fontFamily:DS.font.body}}>Adjust Scores (Manual Override)</div>
          <div style={{display:"grid",gridTemplateColumns:isMob?"1fr":"1fr 1fr",gap:"12px 24px"}}>
            {bars.map(b=>{const val=overrides[b.key]!==undefined?overrides[b.key]:(bd[b.key]||0);return(
              <div key={b.label}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,color:DS.text.body,fontFamily:DS.font.body}}>{b.label}</span><span style={{fontSize:12,fontWeight:700,color:b.color,fontFamily:DS.font.heading}}>{val}%</span></div>
                <input type="range" min={0} max={100} value={val} onChange={e=>{const v=+e.target.value;setScoreOverrides(p=>({...p,[a.id]:{...(p[a.id]||{}),[b.key]:v,total:Math.round(bars.reduce((acc,br)=>{const bv=br.key===b.key?v:(p[a.id]?.[br.key]!==undefined?p[a.id][br.key]:(bd[br.key]||0));return acc+bv},0)/bars.length)}}))}} style={{width:"100%",accentColor:b.color,cursor:"pointer",height:5}}/>
              </div>)})}
          </div>
          {/* Actions */}
          <div style={{display:"flex",gap:12,marginTop:24,justifyContent:"flex-end"}}>
            <button type="button" onClick={()=>setCandDetail(null)} style={{padding:"10px 24px",fontSize:13,borderRadius:DS.radius.md,border:`1.5px solid ${DS.surface.border}`,background:"#fff",color:DS.text.body,cursor:"pointer",fontFamily:DS.font.heading,fontWeight:500}}>← Back</button>
            <button type="button" onClick={()=>{setCopyToast("✅ Candidate confirmed!");setTimeout(()=>setCopyToast(""),2500);setCandDetail(null)}} style={{padding:"10px 28px",fontSize:13,borderRadius:DS.radius.md,border:"none",background:`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`,color:"#fff",cursor:"pointer",fontFamily:DS.font.heading,fontWeight:600,boxShadow:DS.shadow.blue}}>✓ Confirm & Request This Talent</button>
          </div>
        </div>
      </div>
    </div>);
  };

  // ─── Kanban View ───
  const renderKanban=()=>{
    const cols=Object.entries(STATUS_LABELS);
    return(<div style={{display:"grid",gridTemplateColumns:`repeat(${cols.length},1fr)`,gap:14,minHeight:400,overflowX:"auto"}}>
      {cols.map(([st,label])=>{
        const items=ps.filter(p=>p.status===st);
        return(<div key={st} onDragOver={onDragOver} onDrop={e=>onDrop(e,st)}
          style={{background:DS.surface.page,borderRadius:DS.radius.xl,padding:14,border:`2px solid ${dragId?DS.brand.blue700:"transparent"}`,transition:`border-color .25s ${DS.ease.default}`,minWidth:200}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:STATUS_COLORS[st]}}/>
              <span style={{fontSize:12,fontWeight:600,color:DS.text.h2,fontFamily:DS.font.heading}}>{label}</span>
            </div>
            <span style={{fontSize:10,background:`${STATUS_COLORS[st]}12`,color:STATUS_COLORS[st],padding:"3px 10px",borderRadius:DS.radius.pill,fontWeight:600,fontFamily:DS.font.body}}>{items.length}</span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {items.map((p,idx)=>(
              <div key={p.id} draggable onDragStart={e=>onDragStart(e,p.id)}
                onClick={()=>{setSelP(p);loadAssigns(p.id);setView("detail");runAutoMatch(p)}}
                style={{background:"#fff",borderRadius:DS.radius.lg,padding:"14px 16px",border:`1px solid ${DS.surface.border}`,cursor:"grab",transition:`all .25s ${DS.ease.snap}`,boxShadow:DS.shadow.sm,animation:`fadeUp .4s ${idx*0.06}s both`}}
                onMouseEnter={e=>{e.currentTarget.style.boxShadow=DS.shadow.md;e.currentTarget.style.transform="translateY(-2px)"}}
                onMouseLeave={e=>{e.currentTarget.style.boxShadow=DS.shadow.sm;e.currentTarget.style.transform="none"}}>
                <div style={{fontSize:13,fontWeight:600,color:DS.text.h1,fontFamily:DS.font.heading,letterSpacing:"-0.01em"}}>{p.role}</div>
                <div style={{fontSize:11.5,color:DS.text.muted,marginTop:3,fontFamily:DS.font.body}}>{p.client_name} · {p.seniority}</div>
                <div style={{fontSize:10,color:DS.text.faint,marginTop:5}}>{new Date(p.created_at).toLocaleDateString()}</div>
              </div>
            ))}
            {!items.length&&<div style={{textAlign:"center",padding:24,color:DS.text.placeholder,fontSize:12,border:`2px dashed ${DS.surface.border}`,borderRadius:DS.radius.lg,fontFamily:DS.font.body}}>Drop here</div>}
          </div>
        </div>);
      })}
    </div>);
  };

  // ─── Profile Detail ───
  const renderDetail=()=>{
    if(!selP)return null;
    const pd=selP.profile_data||{};const mh=pd.mustHave||[];const nh=pd.niceToHave||[];
    return(<div style={{animation:"fadeUp .3s both"}}>
      <button type="button" onClick={()=>setView("kanban")} style={{fontSize:12,color:DS.brand.blue700,background:"none",border:"none",cursor:"pointer",fontFamily:DS.font.heading,fontWeight:600,marginBottom:16,display:"flex",alignItems:"center",gap:4}} onMouseEnter={e=>{e.currentTarget.style.opacity=".7"}} onMouseLeave={e=>{e.currentTarget.style.opacity="1"}}>← Back to Board</button>
      <div style={{display:"grid",gridTemplateColumns:isMob?"1fr":"1fr 1fr",gap:20}}>
        {/* Left: Profile info */}
        <div>
          <div style={{background:`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.navy800},${DS.brand.blue700})`,borderRadius:DS.radius.xxl,padding:"28px",color:"#fff",marginBottom:16,position:"relative",overflow:"hidden",boxShadow:DS.shadow.lg}}>
            <HeaderBG/>
            <div style={{position:"relative",zIndex:1}}>
              <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:3,opacity:.35,fontFamily:DS.font.body}}>Profile Request</div>
              <div style={{fontSize:22,fontWeight:800,marginTop:6,fontFamily:DS.font.heading,letterSpacing:"-0.02em"}}>{selP.role}</div>
              <div style={{fontSize:13,opacity:.65,marginTop:4,fontFamily:DS.font.body}}>{selP.category} · {selP.seniority} · {selP.experience}</div>
              <div style={{fontSize:12,opacity:.45,marginTop:8,fontFamily:DS.font.body}}>{selP.client_name} ({selP.client_company})</div>
              <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
                <select value={selP.status} onChange={e=>{updStatus(selP.id,e.target.value);setSelP({...selP,status:e.target.value})}} style={{fontSize:11,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:DS.radius.sm,padding:"6px 12px",color:"#fff",cursor:"pointer",fontFamily:DS.font.body}}>
                  {Object.entries(STATUS_LABELS).map(([k,v])=><option key={k} value={k} style={{color:"#000"}}>{v}</option>)}
                </select>
                <a href={`/api/pdf/${selP.id}`} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:"#fff",border:"1px solid rgba(255,255,255,0.15)",borderRadius:DS.radius.sm,padding:"6px 14px",textDecoration:"none",fontFamily:DS.font.body,transition:`all .2s ${DS.ease.default}`}}>📄 PDF</a>
                <button type="button" onClick={()=>copyReviewLink(selP.id)} style={{fontSize:11,color:"#fff",border:"1px solid rgba(255,255,255,0.15)",borderRadius:DS.radius.sm,padding:"6px 14px",background:"none",cursor:"pointer",fontFamily:DS.font.body}}>🔗 Share</button>
                {isAdmin&&<button type="button" onClick={()=>softDeleteProfile(selP.id)} style={{fontSize:11,color:"#fca5a5",border:"1px solid rgba(252,165,165,0.25)",borderRadius:DS.radius.sm,padding:"6px 14px",background:"rgba(239,68,68,0.08)",cursor:"pointer",fontFamily:DS.font.body}}>🗑️</button>}
              </div>
            </div>
          </div>
          {/* Must Have / Nice to Have */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div style={{background:"#fff",borderRadius:DS.radius.lg,padding:"14px 16px",border:`1px solid ${DS.surface.border}`,boxShadow:DS.shadow.sm}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}><div style={{width:6,height:6,borderRadius:"50%",background:"#dc2626"}}/><span style={{fontSize:10,fontWeight:700,color:"#dc2626",textTransform:"uppercase",letterSpacing:"0.04em",fontFamily:DS.font.heading}}>Must Have ({mh.length})</span></div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{mh.length?mh.map(t=><span key={t} style={{background:"#fef2f2",color:"#dc2626",padding:"3px 10px",borderRadius:DS.radius.pill,fontSize:10,fontFamily:DS.font.body,border:"1px solid #fecaca"}}>{t}</span>):<span style={{fontSize:11,color:DS.text.faint,fontFamily:DS.font.body}}>—</span>}</div>
            </div>
            <div style={{background:"#fff",borderRadius:DS.radius.lg,padding:"14px 16px",border:`1px solid ${DS.surface.border}`,boxShadow:DS.shadow.sm}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}><div style={{width:6,height:6,borderRadius:"50%",background:"#059669"}}/><span style={{fontSize:10,fontWeight:700,color:"#059669",textTransform:"uppercase",letterSpacing:"0.04em",fontFamily:DS.font.heading}}>Nice to Have ({nh.length})</span></div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{nh.length?nh.map(t=><span key={t} style={{background:"#f0fdf4",color:"#059669",padding:"3px 10px",borderRadius:DS.radius.pill,fontSize:10,fontFamily:DS.font.body,border:"1px solid #bbf7d0"}}>{t}</span>):<span style={{fontSize:11,color:DS.text.faint,fontFamily:DS.font.body}}>—</span>}</div>
            </div>
          </div>
          {/* Tech stack */}
          <div style={{background:"#fff",borderRadius:DS.radius.lg,padding:"18px 20px",border:`1px solid ${DS.surface.border}`,fontSize:12,color:DS.text.body,boxShadow:DS.shadow.sm}}>
            <div style={{fontWeight:700,color:DS.text.h1,marginBottom:10,fontFamily:DS.font.heading,fontSize:12}}>Technical Stack</div>
            {pd.techStack?.languages?.length>0&&<div style={{marginBottom:6,fontFamily:DS.font.body}}><span style={{color:DS.text.faint,fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.03em"}}>Languages:</span> {pd.techStack.languages.join(", ")}</div>}
            {pd.techStack?.frameworks?.length>0&&<div style={{marginBottom:6,fontFamily:DS.font.body}}><span style={{color:DS.text.faint,fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.03em"}}>Frameworks:</span> {pd.techStack.frameworks.join(", ")}</div>}
            {pd.techStack?.clouds?.length>0&&<div style={{marginBottom:6,fontFamily:DS.font.body}}><span style={{color:DS.text.faint,fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.03em"}}>Cloud:</span> {pd.techStack.clouds.join(", ")}</div>}
            {pd.techStack?.databases?.length>0&&<div style={{marginBottom:6,fontFamily:DS.font.body}}><span style={{color:DS.text.faint,fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.03em"}}>Databases:</span> {pd.techStack.databases.join(", ")}</div>}
            {pd.techStack?.devopsTools?.length>0&&<div style={{fontFamily:DS.font.body}}><span style={{color:DS.text.faint,fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.03em"}}>DevOps:</span> {pd.techStack.devopsTools.join(", ")}</div>}
            {pd.techStack?.profTools?.length>0&&<div style={{marginTop:6,fontFamily:DS.font.body}}><span style={{color:DS.text.faint,fontSize:10,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.03em"}}>Tools:</span> {pd.techStack.profTools.join(", ")}</div>}
          </div>
        </div>
        {/* Right: Candidates */}
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
            <div style={{fontSize:14,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading}}>Assigned Candidates ({assigns.length})</div>
            <div style={{display:"flex",gap:6}}>
              <button type="button" onClick={()=>copyReviewLink(selP.id)} style={{fontSize:11,background:"#fff",color:DS.brand.blue700,border:`1.5px solid ${DS.brand.blue700}`,borderRadius:DS.radius.md,padding:"7px 14px",cursor:"pointer",fontFamily:DS.font.heading,fontWeight:600,transition:`all .2s ${DS.ease.snap}`,boxShadow:DS.shadow.sm}} onMouseEnter={e=>{e.currentTarget.style.background=DS.brand.blue700;e.currentTarget.style.color="#fff"}} onMouseLeave={e=>{e.currentTarget.style.background="#fff";e.currentTarget.style.color=DS.brand.blue700}}>🔗 Review Link</button>
              <button type="button" onClick={()=>setShowAddCand(true)} style={{fontSize:12,background:`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`,color:"#fff",border:"none",borderRadius:DS.radius.md,padding:"8px 18px",cursor:"pointer",fontFamily:DS.font.heading,fontWeight:600,boxShadow:DS.shadow.blue,transition:`all .2s ${DS.ease.snap}`}}>+ Assign</button>
            </div>
          </div>
          {/* Auto-match suggestions */}
          {autoMatches.length>0&&!assigns.length&&(<div style={{background:`linear-gradient(135deg,${DS.brand.blue50},#fff)`,borderRadius:DS.radius.xl,padding:"16px 18px",marginBottom:14,border:`1px solid rgba(27,111,232,0.08)`}}>
            <div style={{fontSize:11,fontWeight:700,color:DS.brand.blue700,textTransform:"uppercase",letterSpacing:"0.04em",fontFamily:DS.font.heading,marginBottom:10}}>🎯 Suggested Matches from Talent Pool</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {autoMatches.slice(0,3).map(({candidate:c,score})=>{const col=score>=80?"#059669":score>=60?"#f59e0b":"#dc2626";return(
                <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"#fff",borderRadius:DS.radius.lg,border:`1px solid ${DS.surface.border}`,boxShadow:DS.shadow.sm}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,fontWeight:700,fontFamily:DS.font.heading}}>{(c.name||"?").split(" ").map(w=>w[0]).join("").substring(0,2)}</div><div><div style={{fontSize:12,fontWeight:600,color:DS.text.h1,fontFamily:DS.font.heading}}>{c.name}</div><div style={{fontSize:10,color:DS.text.muted,fontFamily:DS.font.body}}>{c.seniority} · {(c.skills||[]).slice(0,3).join(", ")}</div></div></div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16,fontWeight:800,color:col,fontFamily:DS.font.heading}}>{score}%</span><button type="button" onClick={()=>{assignCand(c.id,score);setAutoMatches(p=>p.filter(x=>x.candidate.id!==c.id))}} style={{fontSize:10,background:`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`,color:"#fff",border:"none",borderRadius:DS.radius.sm,padding:"5px 12px",cursor:"pointer",fontFamily:DS.font.heading,fontWeight:600}}>Assign</button></div>
                </div>
              )})}
            </div>
          </div>)}
          {/* Assigned candidates — dark navy card style */}
          {assigns.map((a,idx)=>{
            const c=a.candidates||{};const ms=a.match_score||0;
            const msColor=ms>=80?"#059669":ms>=60?"#f59e0b":"#dc2626";
            const cDocs=assignDocs[c.id]||[];
            const cSkills=[...(c.skills||[])].slice(0,5);
            return(<div key={a.id} style={{borderRadius:DS.radius.lg,overflow:"hidden",marginBottom:12,boxShadow:a.client_decision==="accepted"?`0 0 0 2px #059669,${DS.shadow.md}`:DS.shadow.sm,transition:`all .25s ${DS.ease.snap}`,animation:`fadeUp .4s ${idx*0.06}s both`,opacity:a.client_decision==="discarded"?.5:1}}>
              {/* Dark header */}
              <div style={{background:`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.navy800})`,padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${CAND_STAGE_COLORS[a.status]||DS.brand.blue700},${DS.brand.blue700})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:700,fontFamily:DS.font.heading}}>{(c.name||"?").split(" ").map(w=>w[0]).join("").substring(0,2)}</div>
                  <div><div style={{fontSize:13,fontWeight:600,color:"#fff",fontFamily:DS.font.heading}}>{c.name||"Unknown"}</div><div style={{fontSize:11,color:DS.brand.cyan600,fontFamily:DS.font.body}}>{c.seniority} · {c.location}</div></div>
                </div>
                <div style={{textAlign:"right"}}><div style={{fontSize:22,fontWeight:800,color:msColor,fontFamily:DS.font.heading}}>{ms}%</div><div style={{fontSize:9,color:"rgba(255,255,255,0.4)",fontFamily:DS.font.body,textTransform:"uppercase",letterSpacing:"0.05em"}}>match</div></div>
              </div>
              {/* Body */}
              <div style={{background:"#fff",padding:"14px 18px"}}>
                {/* Match bar */}
                <div style={{height:4,background:DS.surface.sunken,borderRadius:2,overflow:"hidden",marginBottom:10}}><div style={{height:"100%",width:`${ms}%`,background:msColor,borderRadius:2,transition:"width .5s"}}/></div>
                {/* Skills */}
                {cSkills.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>{cSkills.map(s=>{const isMust=mh.some(m=>m.toLowerCase()===s.toLowerCase());return<span key={s} style={{padding:"2px 9px",borderRadius:DS.radius.xs,fontSize:10,background:isMust?"#dcfce7":DS.brand.blue50,color:isMust?"#059669":DS.brand.blue700,fontFamily:DS.font.body,fontWeight:500,border:`1px solid ${isMust?"#bbf7d0":DS.brand.blue100}`}}>{isMust?"✓ ":""}{s}</span>})}</div>}
                {/* Documents */}
                <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                  {["cv","soft_eval","hard_eval"].map(dt=>{
                    const doc=cDocs.find(d=>d.doc_type===dt);
                    return(<div key={dt} style={{flex:"1 1 90px"}}>
                      {doc?<div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"#059669",background:"#f0fdf4",padding:"5px 9px",borderRadius:DS.radius.sm,border:"1px solid #bbf7d0",fontFamily:DS.font.body}}><span>{DOC_ICONS[dt]}</span><span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{doc.file_name}</span><button type="button" onClick={()=>deleteDoc(doc.id,doc.file_path,selP.id)} style={{background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:9,flexShrink:0}}>✕</button></div>
                      :<label style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:DS.text.faint,background:DS.surface.page,padding:"5px 9px",borderRadius:DS.radius.sm,border:`1px dashed ${DS.surface.border}`,cursor:"pointer",fontFamily:DS.font.body,transition:`all .2s ${DS.ease.default}`}}><span>{DOC_ICONS[dt]}</span><span>{uploadingDoc===dt?"Uploading...":DOC_TYPES[dt]}</span><input type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" style={{display:"none"}} onChange={e=>{if(e.target.files[0])uploadDoc(c.id,selP.id,dt,e.target.files[0])}}/></label>}
                    </div>);
                  })}
                </div>
                {/* Stage + Decision */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6,paddingTop:8,borderTop:`1px solid ${DS.surface.borderLight}`}}>
                  <select value={a.status||"data_verification"} onChange={e=>updAssign(a.id,e.target.value)} style={{fontSize:10.5,border:`1.5px solid ${DS.surface.border}`,borderRadius:DS.radius.sm,padding:"5px 10px",color:CAND_STAGE_COLORS[a.status]||DS.text.muted,fontWeight:600,fontFamily:DS.font.body,cursor:"pointer",background:"#fff"}}>
                    {CAND_STAGES.map(s=><option key={s} value={s}>{CAND_STAGE_LABELS[s]}</option>)}
                  </select>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:10,color:a.client_decision==="accepted"?"#059669":a.client_decision==="rejected"?"#dc2626":DS.text.faint,fontWeight:600,fontFamily:DS.font.body}}>{a.client_decision==="accepted"?"✅ Accepted":a.client_decision==="rejected"?"❌ Rejected":"⏳ Pending"}</span>
                    <button type="button" onClick={()=>updClientDecision(a.id,a.client_decision==="accepted"?"pending":"accepted")} style={{width:30,height:30,borderRadius:"50%",border:`2px solid ${a.client_decision==="accepted"?"#059669":DS.surface.border}`,background:a.client_decision==="accepted"?"#059669":"#fff",color:a.client_decision==="accepted"?"#fff":"#059669",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:`all .2s ${DS.ease.snap}`}}>♥</button>
                    <button type="button" onClick={()=>updClientDecision(a.id,a.client_decision==="rejected"?"pending":"rejected")} style={{width:30,height:30,borderRadius:"50%",border:`2px solid ${a.client_decision==="rejected"?"#dc2626":DS.surface.border}`,background:a.client_decision==="rejected"?"#dc2626":"#fff",color:a.client_decision==="rejected"?"#fff":"#dc2626",fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:`all .2s ${DS.ease.snap}`}}>✕</button>
                  </div>
                </div>
              </div>
            </div>);
          })}
          {!assigns.length&&<div style={{textAlign:"center",padding:40,color:DS.text.faint,borderRadius:DS.radius.xl,border:`2px dashed ${DS.surface.border}`,background:"#fff"}}><div style={{fontSize:36,marginBottom:10}}>👤</div><div style={{fontSize:13,fontFamily:DS.font.body,marginBottom:4}}>No candidates assigned yet</div><div style={{fontSize:11,color:DS.text.placeholder,fontFamily:DS.font.body}}>Click "+ Assign" to add from Talent Pool</div></div>}
        </div>
      </div>
      {/* Assign modal — premium glassmorphism */}
      {showAddCand&&(<div style={{position:"fixed",inset:0,zIndex:50,background:"rgba(15,23,42,0.6)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
        <div style={{background:"#fff",borderRadius:DS.radius.xxl,padding:28,maxWidth:520,width:"100%",maxHeight:"80vh",overflowY:"auto",animation:"fadeUp .25s both",boxShadow:DS.shadow.lg}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
            <div><div style={{fontSize:17,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading}}>Assign from Talent Pool</div><div style={{fontSize:12,color:DS.text.muted,fontFamily:DS.font.body,marginTop:2}}>Select a candidate to assign to this vacancy</div></div>
            <button type="button" onClick={()=>setShowAddCand(false)} style={{background:DS.surface.sunken,border:"none",width:32,height:32,borderRadius:DS.radius.md,fontSize:16,cursor:"pointer",color:DS.text.faint,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          </div>
          {cands.length>0?<div>{cands.map(c=>{const ms=calcMatch(c,selP);const msColor=ms>=80?"#059669":ms>=60?"#f59e0b":"#dc2626";const alreadyAssigned=assigns.some(a=>a.candidate_id===c.id);return(<div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 16px",border:`1.5px solid ${alreadyAssigned?DS.surface.border:DS.surface.border}`,borderRadius:DS.radius.lg,marginBottom:8,cursor:alreadyAssigned?"default":"pointer",opacity:alreadyAssigned?.45:1,background:alreadyAssigned?DS.surface.sunken:"#fff",transition:`all .2s ${DS.ease.snap}`,boxShadow:alreadyAssigned?"none":DS.shadow.sm}} onClick={()=>{if(!alreadyAssigned){assignCand(c.id,ms);setShowAddCand(false)}}} onMouseEnter={e=>{if(!alreadyAssigned){e.currentTarget.style.boxShadow=DS.shadow.md;e.currentTarget.style.transform="translateY(-1px)"}}} onMouseLeave={e=>{e.currentTarget.style.boxShadow=alreadyAssigned?"none":DS.shadow.sm;e.currentTarget.style.transform="none"}}><div style={{display:"flex",alignItems:"center",gap:12}}><div style={{width:40,height:40,borderRadius:"50%",background:`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:700,fontFamily:DS.font.heading,flexShrink:0}}>{(c.name||"?").split(" ").map(w=>w[0]).join("").substring(0,2)}</div><div><div style={{fontSize:13,fontWeight:600,color:DS.text.h1,fontFamily:DS.font.heading}}>{c.name}{alreadyAssigned&&<span style={{fontSize:10,color:DS.text.faint,marginLeft:6,fontFamily:DS.font.body}}>already assigned</span>}</div><div style={{fontSize:11,color:DS.text.muted,fontFamily:DS.font.body}}>{c.seniority} · {(c.skills||[]).slice(0,3).join(", ")}</div></div></div><div style={{fontSize:20,fontWeight:800,color:msColor,fontFamily:DS.font.heading}}>{ms}%</div></div>)})}</div>
          :<div style={{textAlign:"center",padding:40,color:DS.text.faint}}><div style={{fontSize:44,marginBottom:10}}>👤</div><div style={{fontSize:14,fontFamily:DS.font.heading,fontWeight:600,color:DS.text.h2,marginBottom:6}}>Talent Pool is empty</div><div style={{fontSize:12,fontFamily:DS.font.body,marginBottom:16}}>Add candidates first, then assign them here.</div><button type="button" onClick={()=>{setShowAddCand(false);setView("talent_pool")}} style={{fontSize:13,color:DS.brand.blue700,background:"none",border:`1.5px solid ${DS.brand.blue700}`,borderRadius:DS.radius.md,padding:"9px 22px",cursor:"pointer",fontFamily:DS.font.heading,fontWeight:600}}>Go to Talent Pool →</button></div>}
        </div>
      </div>)}
    </div>);
  };

  // ─── Metrics bar chart ───
  const maxCat=Math.max(...Object.values(catCn),1);

  if(ld)return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:DS.surface.sunken,flexDirection:"column",gap:16}}>
    <div style={{width:48,height:48,borderRadius:"50%",border:`3px solid ${DS.surface.border}`,borderTop:`3px solid ${DS.brand.blue700}`,animation:"spin 1s linear infinite"}}/>
    <div style={{fontSize:14,color:DS.text.muted,fontFamily:DS.font.body}}>Loading your workspace...</div>
    <div style={{display:"flex",gap:8,marginTop:8}}>{[0,1,2,3,4].map(i=><div key={i} style={{width:60,height:8,borderRadius:4,background:DS.surface.border,animation:`shimmer 1.5s ${i*0.2}s infinite linear`,backgroundImage:`linear-gradient(90deg,${DS.surface.border} 25%,${DS.surface.sunken} 50%,${DS.surface.border} 75%)`,backgroundSize:"200% 100%"}}/>)}</div>
  </div>;

  const greeting=new Date().getHours()<12?"Good morning":new Date().getHours()<18?"Good afternoon":"Good evening";

  return(<div style={{minHeight:"100vh",background:`linear-gradient(180deg,${DS.surface.sunken} 0%,#EEF2F7 100%)`,fontFamily:DS.font.body,display:"flex"}}>
    {/* Sidebar */}
    <div style={{width:sideOpen?230:68,minHeight:"100vh",background:`linear-gradient(180deg,${DS.brand.navy900} 0%,#132B5E 50%,#1B3A70 100%)`,transition:`width .3s cubic-bezier(0.4,0,0.2,1)`,display:"flex",flexDirection:"column",flexShrink:0,position:isMob?"fixed":"sticky",top:0,left:0,zIndex:isMob?50:20,boxShadow:`${isMob?"0 0 40px rgba(0,0,0,0.4)":"1px 0 0 rgba(255,255,255,0.04)"}`,overflow:"hidden"}}>
      {/* Logo */}
      <div style={{padding:sideOpen?"22px 20px":"22px 0",display:"flex",alignItems:"center",justifyContent:sideOpen?"flex-start":"center",gap:10,borderBottom:"1px solid rgba(255,255,255,0.05)",minHeight:68}}>
        <div style={{width:36,height:36,borderRadius:DS.radius.md,background:`linear-gradient(135deg,${DS.brand.blue700},${DS.brand.cyan600})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 2px 8px rgba(27,111,232,0.3)"}}>
          <span style={{fontSize:14,fontWeight:800,color:"#fff",fontFamily:DS.font.heading}}>B</span>
        </div>
        {sideOpen&&<div><div style={{fontSize:16,fontWeight:800,color:"#fff",letterSpacing:1,fontFamily:DS.font.heading}}>BOZ<span style={{color:DS.brand.cyan600}}>.</span></div><div style={{fontSize:8,color:"rgba(255,255,255,0.3)",letterSpacing:2.5,textTransform:"uppercase",fontFamily:DS.font.body}}>{isAdmin?"Admin":"Recruiter"}</div></div>}
      </div>
      {/* Nav items */}
      <div style={{flex:1,padding:"16px 10px",display:"flex",flexDirection:"column",gap:2}}>
        {[
          ...(isAdmin?[{id:"users",icon:"👥",label:"Users"}]:[]),
          {id:"review",icon:"✅",label:"Review"},
          {id:"kanban",icon:"📋",label:"Board"},
          {id:"pipeline",icon:"🔄",label:"Pipeline"},
          {id:"process",icon:"📍",label:"Process"},
          {id:"list",icon:"📊",label:"Dashboard"},
          {id:"talent_pool",icon:"👤",label:"Talent Pool"},
          ...(isAdmin?[
            {id:"alerts",icon:"🔔",label:"Alerts"},
            {id:"ana_view",icon:"🧠",label:"Ana View"},
            {id:"sales_view",icon:"💼",label:"Sales View"},
            {id:"client_view",icon:"👁️",label:"Client View"},
            {id:"trash",icon:"🗑️",label:"Trash"},
          ]:[]),
        ].map(nav=>{
          const active=view===nav.id;
          return(<button key={nav.id} type="button" onClick={()=>setView(nav.id)} style={{display:"flex",alignItems:"center",gap:sideOpen?12:0,padding:sideOpen?"11px 14px":"11px 0",borderRadius:DS.radius.md,border:"none",cursor:"pointer",background:active?"rgba(27,111,232,0.15)":"transparent",color:active?"#fff":"rgba(255,255,255,0.5)",transition:`all .2s cubic-bezier(0.4,0,0.2,1)`,fontFamily:DS.font.heading,fontSize:sideOpen?13:18,fontWeight:active?600:500,justifyContent:sideOpen?"flex-start":"center",width:"100%",textAlign:"left",letterSpacing:"-0.005em",borderLeft:active?`3px solid ${DS.brand.cyan600}`:"3px solid transparent",position:"relative"}} onMouseEnter={e=>{if(!active){e.currentTarget.style.background="rgba(255,255,255,0.04)";e.currentTarget.style.color="rgba(255,255,255,0.8)"}}} onMouseLeave={e=>{if(!active){e.currentTarget.style.background="transparent";e.currentTarget.style.color="rgba(255,255,255,0.5)"}}}>
            <span style={{fontSize:sideOpen?16:18,width:sideOpen?24:48,textAlign:"center",flexShrink:0}}>{nav.icon}</span>
            {sideOpen&&<span>{nav.label}</span>}
          </button>);
        })}
      </div>
      {/* Toggle + User */}
      <div style={{padding:sideOpen?"14px 14px":"14px 10px",borderTop:"1px solid rgba(255,255,255,0.05)"}}>
        {sideOpen&&<div style={{fontSize:10,color:"rgba(255,255,255,0.3)",fontFamily:DS.font.body,marginBottom:2}}>{greeting}</div>}
        {sideOpen&&<div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.7)",fontFamily:DS.font.heading,marginBottom:10,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.email?.split("@")[0]}</div>}
        <div style={{display:"flex",gap:6}}>
          <button type="button" onClick={()=>setSideOpen(p=>!p)} style={{flex:sideOpen?0:1,width:sideOpen?34:"100%",height:34,borderRadius:DS.radius.sm,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.4)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,transition:`all .25s cubic-bezier(0.4,0,0.2,1)`,flexShrink:0}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.1)";e.currentTarget.style.color="#fff"}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.05)";e.currentTarget.style.color="rgba(255,255,255,0.4)"}}>{sideOpen?"◀":"▶"}</button>
          {sideOpen&&<button onClick={signOut} type="button" style={{flex:1,fontSize:11,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:DS.radius.sm,padding:"8px",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontFamily:DS.font.body,transition:`all .2s`}} onMouseEnter={e=>{e.currentTarget.style.background="rgba(239,68,68,0.12)";e.currentTarget.style.color="#fca5a5"}} onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.05)";e.currentTarget.style.color="rgba(255,255,255,0.4)"}}>Sign Out</button>}
        </div>
      </div>
    </div>
    {isMob&&sideOpen&&<div onClick={()=>setSideOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:45,backdropFilter:"blur(2px)"}}/>}

    {/* Main content */}
    <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
    <div style={{padding:isMob?"16px":"24px",flex:1,width:"100%",maxWidth:1400,margin:"0 auto"}}>
      {/* Status metrics */}
      <div style={{display:"grid",gridTemplateColumns:isMob?"repeat(2,1fr)":"repeat(5,1fr)",gap:12,marginBottom:24}}>
        {Object.entries(STATUS_LABELS).map(([k,v],idx)=>(<div key={k} style={{background:"#fff",borderRadius:DS.radius.lg,padding:"20px 22px",border:`1px solid ${DS.surface.border}`,cursor:"pointer",transition:`all .25s ${DS.ease.snap}`,boxShadow:DS.shadow.sm,position:"relative",overflow:"hidden",animation:`fadeUp .4s ${idx*0.06}s both`}} onClick={()=>{if(view!=="kanban")setView("kanban")}} onMouseEnter={e=>{e.currentTarget.style.boxShadow=DS.shadow.md;e.currentTarget.style.transform="translateY(-3px)"}} onMouseLeave={e=>{e.currentTarget.style.boxShadow=DS.shadow.sm;e.currentTarget.style.transform="none"}}>
          <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:STATUS_COLORS[k]}}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
            <div><div style={{fontSize:32,fontWeight:800,color:DS.text.h1,fontFamily:DS.font.heading,letterSpacing:"-0.03em",lineHeight:1}}>{cn[k]||0}</div><div style={{fontSize:11.5,color:DS.text.muted,fontWeight:500,fontFamily:DS.font.body,marginTop:6}}>{v}</div></div>
            <div style={{width:32,height:32,borderRadius:DS.radius.md,background:`${STATUS_COLORS[k]}10`,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:8,height:8,borderRadius:"50%",background:STATUS_COLORS[k]}}/>
            </div>
          </div>
        </div>))}
      </div>

      {/* Views */}
      {/* ═══ USERS VIEW (Admin only) ═══ */}
      {view==="users"&&isAdmin&&(<div style={{animation:"fadeUp .3s both"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div><div style={{fontSize:20,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading}}>User Management</div><div style={{fontSize:13,color:DS.text.muted,fontFamily:DS.font.body,marginTop:4}}>Add, edit, and manage platform access for your team</div></div>
          <button type="button" onClick={()=>setShowAddUser(true)} style={{fontSize:13,background:`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`,color:"#fff",border:"none",borderRadius:DS.radius.md,padding:"11px 22px",cursor:"pointer",fontFamily:DS.font.heading,fontWeight:600,boxShadow:DS.shadow.blue}}>+ Add User</button>
        </div>
        {/* Role summary cards */}
        <div style={{display:"grid",gridTemplateColumns:isMob?"repeat(2,1fr)":"repeat(5,1fr)",gap:10,marginBottom:20}}>
          {VALID_ROLES.map(r=>{const cnt=users.filter(u=>u.role===r&&u.active).length;return(<div key={r} style={{background:"#fff",borderRadius:DS.radius.lg,padding:"16px 18px",border:`1px solid ${DS.surface.border}`,boxShadow:DS.shadow.sm,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:ROLE_COLORS[r]}}/>
            <div style={{fontSize:24,fontWeight:800,color:DS.text.h1,fontFamily:DS.font.heading}}>{cnt}</div>
            <div style={{fontSize:11,color:DS.text.muted,fontFamily:DS.font.body,marginTop:2}}>{ROLE_LABELS[r]}</div>
          </div>)})}
        </div>
        {/* Users table */}
        <div style={{background:"#fff",borderRadius:DS.radius.xl,border:`1px solid ${DS.surface.border}`,overflow:"hidden",boxShadow:DS.shadow.sm}}>
          <div style={{padding:"16px 22px",borderBottom:`1px solid ${DS.surface.borderLight}`,fontSize:14,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading}}>All Users ({users.length})</div>
          {users.map((u,i)=>(<div key={u.id} style={{padding:"14px 22px",borderBottom:`1px solid ${DS.surface.borderLight}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,opacity:u.active?1:.5,animation:`fadeUp .3s ${i*0.03}s both`}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:36,height:36,borderRadius:DS.radius.md,background:`${ROLE_COLORS[u.role]}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{ROLE_ICONS[u.role]||"👤"}</div>
              <div><div style={{fontSize:13,fontWeight:600,color:DS.text.h1,fontFamily:DS.font.heading}}>{u.name||u.email.split("@")[0]}</div><div style={{fontSize:12,color:DS.text.muted,fontFamily:DS.font.body}}>{u.email}</div></div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <select value={u.role} onChange={e=>updateUserRole(u.id,e.target.value)} style={{fontSize:11,border:`1px solid ${DS.surface.border}`,borderRadius:DS.radius.sm,padding:"5px 8px",fontFamily:DS.font.body,color:ROLE_COLORS[u.role],fontWeight:600,background:"#fff",cursor:"pointer"}}>
                {VALID_ROLES.map(r=><option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
              <button type="button" onClick={()=>toggleUserActive(u.id,!u.active)} style={{fontSize:10,background:u.active?"#dcfce7":"#fef2f2",color:u.active?"#059669":"#dc2626",border:"none",borderRadius:DS.radius.sm,padding:"5px 10px",cursor:"pointer",fontFamily:DS.font.heading,fontWeight:600}}>{u.active?"Active":"Disabled"}</button>
              <button type="button" onClick={()=>deleteUser(u.id)} style={{fontSize:12,background:"none",border:"none",color:"#dc2626",cursor:"pointer",opacity:.5}}>🗑</button>
            </div>
          </div>))}
        </div>
        {/* Add user modal */}
        {showAddUser&&(<div style={{position:"fixed",inset:0,zIndex:50,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:DS.radius.xxl,padding:28,maxWidth:440,width:"100%",animation:"fadeUp .25s both",boxShadow:DS.shadow.lg}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}><div style={{fontSize:18,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading}}>Add User</div><button type="button" onClick={()=>setShowAddUser(false)} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:DS.text.faint}}>✕</button></div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div><div style={{fontSize:11,fontWeight:600,color:DS.text.muted,marginBottom:4}}>Email *</div><input type="email" value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})} placeholder="user@company.com" style={{width:"100%",border:`1.5px solid ${DS.surface.border}`,borderRadius:DS.radius.sm,padding:"10px 14px",fontSize:13,fontFamily:DS.font.body}}/></div>
              <div><div style={{fontSize:11,fontWeight:600,color:DS.text.muted,marginBottom:4}}>Name</div><input type="text" value={newUser.name} onChange={e=>setNewUser({...newUser,name:e.target.value})} placeholder="Full name" style={{width:"100%",border:`1.5px solid ${DS.surface.border}`,borderRadius:DS.radius.sm,padding:"10px 14px",fontSize:13,fontFamily:DS.font.body}}/></div>
              <div><div style={{fontSize:11,fontWeight:600,color:DS.text.muted,marginBottom:4}}>Role *</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{VALID_ROLES.map(r=><Pill key={r} label={`${ROLE_ICONS[r]} ${ROLE_LABELS[r]}`} selected={newUser.role===r} onClick={()=>setNewUser({...newUser,role:r})} color={ROLE_COLORS[r]} small/>)}</div></div>
              <button type="button" onClick={addUser} disabled={!newUser.email.includes("@")} style={{width:"100%",marginTop:8,background:newUser.email.includes("@")?`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`:"#e2e8f0",color:newUser.email.includes("@")?"#fff":DS.text.faint,border:"none",borderRadius:DS.radius.md,padding:14,fontSize:14,fontWeight:600,fontFamily:DS.font.heading,cursor:newUser.email.includes("@")?"pointer":"default",boxShadow:newUser.email.includes("@")?DS.shadow.blue:"none"}}>Add User</button>
            </div>
          </div>
        </div>)}
      </div>)}

      {/* ═══ REVIEW VIEW (approve/reject before Ana) ═══ */}
      {view==="review"&&(<div style={{animation:"fadeUp .3s both"}}>
        {!selP?(<>
          <div style={{fontSize:20,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading,marginBottom:4}}>Profile Review</div>
          <div style={{fontSize:13,color:DS.text.muted,fontFamily:DS.font.body,marginBottom:20}}>Approve or reject client profiles before passing to Ana</div>
          {ps.filter(p=>["new","pending_review"].includes(p.status)).length===0&&<div style={{textAlign:"center",padding:48,color:DS.text.faint}}><div style={{fontSize:44,marginBottom:10}}>✅</div><div style={{fontSize:14,fontFamily:DS.font.heading,fontWeight:600}}>All profiles reviewed</div></div>}
          {ps.filter(p=>["new","pending_review"].includes(p.status)).map((p,idx)=>(
            <div key={p.id} onClick={()=>{setSelP(p);setRevNotes("");setRevQuestions([])}}
              style={{background:"#fff",borderRadius:DS.radius.lg,padding:"18px 22px",marginBottom:10,border:`1px solid ${DS.surface.border}`,cursor:"pointer",transition:`all .25s ${DS.ease.snap}`,boxShadow:DS.shadow.sm,animation:`fadeUp .3s ${idx*0.04}s both`,display:"flex",justifyContent:"space-between",alignItems:"center"}}
              onMouseEnter={e=>{e.currentTarget.style.boxShadow=DS.shadow.md;e.currentTarget.style.transform="translateY(-2px)"}}
              onMouseLeave={e=>{e.currentTarget.style.boxShadow=DS.shadow.sm;e.currentTarget.style.transform="none"}}>
              <div><div style={{fontSize:15,fontWeight:600,color:DS.text.h1,fontFamily:DS.font.heading}}>{p.role} — {p.seniority}</div><div style={{fontSize:12,color:DS.text.muted,fontFamily:DS.font.body,marginTop:2}}>{p.client_name} ({p.client_company}) · {p.category}</div></div>
              <span style={{fontSize:10,fontWeight:600,color:STATUS_COLORS[p.status],background:`${STATUS_COLORS[p.status]}15`,padding:"3px 10px",borderRadius:DS.radius.pill}}>{STATUS_LABELS[p.status]}</span>
            </div>
          ))}
          {/* Also show recently reviewed */}
          {ps.filter(p=>!["new","pending_review"].includes(p.status)).length>0&&(<>
            <div style={{fontSize:14,fontWeight:600,color:DS.text.muted,fontFamily:DS.font.heading,marginTop:24,marginBottom:10}}>Previously Reviewed</div>
            {ps.filter(p=>!["new","pending_review"].includes(p.status)).slice(0,10).map(p=>(
              <div key={p.id} style={{background:"#fff",borderRadius:DS.radius.lg,padding:"14px 18px",marginBottom:6,border:`1px solid ${DS.surface.borderLight}`,opacity:.6,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><div style={{fontSize:13,fontWeight:600,color:DS.text.h2,fontFamily:DS.font.heading}}>{p.role} — {p.seniority}</div><div style={{fontSize:11,color:DS.text.faint,fontFamily:DS.font.body}}>{p.client_name}</div></div>
                <span style={{fontSize:10,fontWeight:600,color:STATUS_COLORS[p.status],background:`${STATUS_COLORS[p.status]}15`,padding:"3px 10px",borderRadius:DS.radius.pill}}>{STATUS_LABELS[p.status]}</span>
              </div>
            ))}
          </>)}
        </>):(<>
          {/* Review detail */}
          <button type="button" onClick={()=>setSelP(null)} style={{fontSize:12,color:DS.brand.blue700,background:"none",border:"none",cursor:"pointer",fontFamily:DS.font.heading,fontWeight:600,marginBottom:16}}>← Back to Review</button>
          <div style={{background:`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`,borderRadius:DS.radius.xxl,padding:"24px 28px",color:"#fff",marginBottom:20,position:"relative",overflow:"hidden",boxShadow:DS.shadow.lg}}>
            <HeaderBG/><div style={{position:"relative",zIndex:1}}>
              <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:3,opacity:.4}}>Technical Review</div>
              <div style={{fontSize:22,fontWeight:800,marginTop:6,fontFamily:DS.font.heading}}>{selP.role} — {selP.seniority}</div>
              <div style={{fontSize:13,opacity:.65,marginTop:4}}>{selP.category} · {selP.experience} · {selP.client_name}</div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMob?"1fr":"1fr 1fr",gap:20}}>
            <div>
              <div style={{background:"#fff",borderRadius:DS.radius.lg,padding:"18px 22px",border:`1px solid ${DS.surface.border}`,boxShadow:DS.shadow.sm,fontSize:12,color:DS.text.body,fontFamily:DS.font.body}}>
                <div style={{fontWeight:700,color:DS.text.h1,marginBottom:10,fontFamily:DS.font.heading}}>Technical Stack</div>
                {selP.profile_data?.techStack?.languages?.length>0&&<div style={{marginBottom:6}}><strong>Languages:</strong> {selP.profile_data.techStack.languages.join(", ")}</div>}
                {selP.profile_data?.techStack?.frameworks?.length>0&&<div style={{marginBottom:6}}><strong>Frameworks:</strong> {selP.profile_data.techStack.frameworks.join(", ")}</div>}
                {selP.profile_data?.techStack?.clouds?.length>0&&<div style={{marginBottom:6}}><strong>Cloud:</strong> {selP.profile_data.techStack.clouds.join(", ")}</div>}
                {selP.profile_data?.techStack?.databases?.length>0&&<div style={{marginBottom:6}}><strong>DBs:</strong> {selP.profile_data.techStack.databases.join(", ")}</div>}
                {selP.profile_data?.techStack?.devopsTools?.length>0&&<div><strong>DevOps:</strong> {selP.profile_data.techStack.devopsTools.join(", ")}</div>}
              </div>
            </div>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading,marginBottom:12}}>Your Review</div>
              <textarea value={revNotes} onChange={e=>setRevNotes(e.target.value)} rows={3} placeholder="Notes (required for rejection)..." style={{width:"100%",border:`1.5px solid ${DS.surface.border}`,borderRadius:DS.radius.lg,padding:"12px 14px",fontSize:13,fontFamily:DS.font.body,outline:"none",resize:"vertical",color:DS.text.body,lineHeight:1.5,background:"#fff",marginBottom:12}}/>
              <div style={{fontSize:12,fontWeight:600,color:DS.text.h2,fontFamily:DS.font.heading,marginBottom:8}}>Questions for Ana</div>
              <button type="button" onClick={generateRevQuestions} disabled={revGenerating} style={{width:"100%",background:revGenerating?"#f1f5f9":`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`,color:revGenerating?DS.text.muted:"#fff",border:"none",borderRadius:DS.radius.md,padding:"10px",fontSize:12,fontWeight:600,fontFamily:DS.font.heading,cursor:revGenerating?"wait":"pointer",marginBottom:10,boxShadow:revGenerating?"none":DS.shadow.blue}}>{revGenerating?"🧠 Generating...":"🧠 AI Suggest Questions"}</button>
              {revQuestions.map((q,i)=>(<div key={i} style={{display:"flex",gap:6,marginBottom:6}}><span style={{fontSize:11,color:DS.brand.blue700,paddingTop:8,fontWeight:700}}>{i+1}.</span><textarea value={q} onChange={e=>{const n=[...revQuestions];n[i]=e.target.value;setRevQuestions(n)}} rows={2} style={{flex:1,border:`1px solid ${DS.surface.border}`,borderRadius:DS.radius.sm,padding:"8px 10px",fontSize:12,fontFamily:DS.font.body,outline:"none",resize:"vertical"}}/><button type="button" onClick={()=>setRevQuestions(p=>p.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:14,paddingTop:6}}>✕</button></div>))}
              <button type="button" onClick={()=>setRevQuestions(p=>[...p,""])} style={{fontSize:11,color:DS.brand.blue700,background:"none",border:`1px dashed ${DS.surface.border}`,borderRadius:DS.radius.sm,padding:"5px 12px",cursor:"pointer",fontFamily:DS.font.body,marginBottom:16}}>+ Add question</button>
              <div style={{display:"flex",gap:10}}>
                <button type="button" onClick={acceptProfile} disabled={revSubmitting} style={{flex:2,background:"linear-gradient(135deg,#059669,#10b981)",color:"#fff",border:"none",borderRadius:DS.radius.md,padding:"13px",fontSize:14,fontWeight:700,fontFamily:DS.font.heading,cursor:revSubmitting?"wait":"pointer",boxShadow:"0 4px 16px rgba(16,185,129,0.2)",opacity:revSubmitting?.7:1}}>✓ Accept → Ana</button>
                <button type="button" onClick={rejectProfile} disabled={revSubmitting} style={{flex:1,background:"#fff",color:"#dc2626",border:"2px solid #dc2626",borderRadius:DS.radius.md,padding:"13px",fontSize:13,fontWeight:600,fontFamily:DS.font.heading,cursor:revSubmitting?"wait":"pointer"}}>✕ Reject</button>
              </div>
            </div>
          </div>
        </>)}
      </div>)}

      {view==="kanban"&&renderKanban()}
      {view==="pipeline"&&renderPipeline()}
      {view==="detail"&&renderDetail()}

      {/* Process Tracker — global view of Client→Recruiter→Ana→Admin */}
      {view==="process"&&(<div style={{animation:"fadeUp .3s both"}}>
        <div style={{fontSize:16,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading,marginBottom:4}}>Process Tracker</div>
        <div style={{fontSize:12,color:DS.text.muted,fontFamily:DS.font.body,marginBottom:20}}>Track each profile through Client → Recruiter → Ana → Admin</div>

        {/* Phase columns */}
        <div style={{display:"grid",gridTemplateColumns:`repeat(${PROCESS_PHASES.length},1fr)`,gap:12,marginBottom:24,minHeight:400}}>
          {PROCESS_PHASES.map(phase=>{
            const phaseStatusMap={client_submitted:["new"],recruiter_review:["pending_review"],ana_assessment:["pending_soft"],admin_pipeline:["in_progress","sourcing","filled"]};
            const items=ps.filter(p=>(phaseStatusMap[phase.id]||[]).includes(p.status));
            return(<div key={phase.id} style={{background:DS.surface.page,borderRadius:DS.radius.xl,padding:14,border:`1px solid ${DS.surface.border}`}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:28,height:28,borderRadius:DS.radius.md,background:`${phase.color}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>{phase.icon}</div>
                  <div><div style={{fontSize:11,fontWeight:700,color:DS.text.h2,fontFamily:DS.font.heading}}>{phase.label}</div></div>
                </div>
                <span style={{fontSize:10,background:`${phase.color}15`,color:phase.color,padding:"2px 8px",borderRadius:DS.radius.pill,fontWeight:700}}>{items.length}</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {items.map(p=>{
                  const pd=p.profile_data||{};const rr=pd.recruiterReview;const hasSoft=!!pd.softSkills;
                  return(<div key={p.id} onClick={()=>{setSelP(p);loadAssigns(p.id);setView("detail")}}
                    style={{background:"#fff",borderRadius:DS.radius.lg,padding:"12px 14px",border:`1px solid ${DS.surface.border}`,cursor:"pointer",transition:`all .2s ${DS.ease.snap}`,boxShadow:DS.shadow.sm}}
                    onMouseEnter={e=>{e.currentTarget.style.boxShadow=DS.shadow.md;e.currentTarget.style.transform="translateY(-1px)"}}
                    onMouseLeave={e=>{e.currentTarget.style.boxShadow=DS.shadow.sm;e.currentTarget.style.transform="none"}}>
                    <div style={{fontSize:12,fontWeight:600,color:DS.text.h1,fontFamily:DS.font.heading}}>{p.role}</div>
                    <div style={{fontSize:10,color:DS.text.muted,fontFamily:DS.font.body,marginTop:2}}>{p.client_name} · {p.seniority}</div>
                    {/* Phase progress dots */}
                    <div style={{display:"flex",gap:4,marginTop:8}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:"#3b82f6"}} title="Client submitted"/>
                      <div style={{width:8,height:8,borderRadius:"50%",background:rr?"#f97316":"#e2e8f0"}} title={rr?"Recruiter reviewed":"Pending recruiter"}/>
                      <div style={{width:8,height:8,borderRadius:"50%",background:hasSoft?"#8b5cf6":"#e2e8f0"}} title={hasSoft?"Soft skills done":"Pending soft skills"}/>
                      <div style={{width:8,height:8,borderRadius:"50%",background:["in_progress","sourcing","filled"].includes(p.status)?"#10b981":"#e2e8f0"}} title="Admin pipeline"/>
                    </div>
                    {/* Notes preview */}
                    {rr?.notes&&<div style={{fontSize:10,color:DS.text.faint,fontFamily:DS.font.body,marginTop:6,padding:"4px 8px",background:DS.surface.sunken,borderRadius:DS.radius.sm,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📝 {rr.notes.substring(0,60)}{rr.notes.length>60?"...":""}</div>}
                  </div>);
                })}
                {!items.length&&<div style={{textAlign:"center",padding:20,color:DS.text.placeholder,fontSize:11,border:`2px dashed ${DS.surface.border}`,borderRadius:DS.radius.lg}}>No profiles</div>}
              </div>
            </div>);
          })}
        </div>

        {/* Timeline detail — click any profile from above */}
        <div style={{fontSize:14,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading,marginBottom:12}}>All Profiles — Timeline View</div>
        {ps.map((p,idx)=>{
          const pd=p.profile_data||{};const rr=pd.recruiterReview;const ss=pd.softSkills;
          const phases=[
            {done:true,label:"Client Submitted",date:p.created_at,color:"#3b82f6",note:`${p.role} · ${p.seniority} · ${pd.mustHave?.join(", ")||"—"}`},
            {done:!!rr,label:"Recruiter Review",date:rr?.reviewedAt,color:"#f97316",note:rr?`${rr.status==="accepted"?"✅ Accepted":"❌ Rejected"}${rr.notes?` — ${rr.notes}`:""}`:"Pending"},
            {done:!!ss,label:"Talent Discovery",date:null,color:"#8b5cf6",note:ss?`${ss.softSkillsSummary||"Completed"}`:"Pending"},
            {done:["in_progress","sourcing","filled","closed"].includes(p.status),label:"Admin Pipeline",date:null,color:"#10b981",note:STATUS_LABELS[p.status]||"—"},
          ];
          return(<div key={p.id} style={{background:"#fff",borderRadius:DS.radius.lg,padding:"18px 22px",marginBottom:12,border:`1px solid ${DS.surface.border}`,boxShadow:DS.shadow.sm,animation:`fadeUp .3s ${idx*0.03}s both`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div><div style={{fontSize:14,fontWeight:600,color:DS.text.h1,fontFamily:DS.font.heading}}>{p.role} — {p.seniority}</div><div style={{fontSize:11,color:DS.text.muted,fontFamily:DS.font.body}}>{p.client_name} ({p.client_company})</div></div>
              <span style={{fontSize:10,fontWeight:600,color:STATUS_COLORS[p.status],background:`${STATUS_COLORS[p.status]}15`,padding:"3px 10px",borderRadius:DS.radius.pill}}>{STATUS_LABELS[p.status]}</span>
            </div>
            {/* Timeline bar */}
            <div style={{display:"flex",alignItems:"flex-start",gap:0}}>
              {phases.map((ph,i)=>(
                <div key={i} style={{flex:1,display:"flex",alignItems:"flex-start"}}>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:"100%"}}>
                    <div style={{width:20,height:20,borderRadius:"50%",background:ph.done?ph.color:DS.surface.border,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,zIndex:1}}>
                      {ph.done&&<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <div style={{fontSize:9.5,fontWeight:600,color:ph.done?ph.color:DS.text.faint,fontFamily:DS.font.heading,marginTop:6,textAlign:"center"}}>{ph.label}</div>
                    <div style={{fontSize:9,color:DS.text.faint,fontFamily:DS.font.body,marginTop:2,textAlign:"center",maxWidth:150,lineHeight:1.4}}>{ph.note?.substring(0,50)}</div>
                    {ph.date&&<div style={{fontSize:8,color:DS.text.placeholder,fontFamily:DS.font.body,marginTop:2}}>{new Date(ph.date).toLocaleDateString()}</div>}
                  </div>
                  {i<phases.length-1&&<div style={{height:2,flex:1,background:ph.done?ph.color:DS.surface.border,marginTop:9,minWidth:20}}/>}
                </div>
              ))}
            </div>
          </div>);
        })}
      </div>)}

      {view==="list"&&(<div style={{animation:"fadeUp .3s both"}}>
        {/* KPI Time Metrics */}
        <div style={{display:"grid",gridTemplateColumns:isMob?"repeat(2,1fr)":"repeat(4,1fr)",gap:12,marginBottom:20}}>
          {(()=>{
            const now=Date.now();
            const avgAge=ps.length?Math.round(ps.reduce((s,p)=>(now-new Date(p.created_at).getTime())/86400000+s,0)/ps.length):0;
            const reviewed=ps.filter(p=>p.profile_data?.recruiterReview);
            const avgReview=reviewed.length?Math.round(reviewed.reduce((s,p)=>{const cr=new Date(p.created_at);const rv=new Date(p.profile_data.recruiterReview.reviewedAt||cr);return(rv-cr)/86400000+s},0)/reviewed.length):0;
            const filled=ps.filter(p=>p.status==="filled");
            const avgFill=filled.length?Math.round(filled.reduce((s,p)=>(now-new Date(p.created_at).getTime())/86400000+s,0)/filled.length):0;
            const fillRate=ps.length?Math.round((filled.length/ps.length)*100):0;
            return[
              {label:"Avg. Profile Age",value:`${avgAge}d`,sub:"days since created",color:"#3b82f6",icon:"⏱️"},
              {label:"Avg. Recruiter Response",value:`${avgReview}d`,sub:"days to first review",color:"#f97316",icon:"🔍"},
              {label:"Avg. Time to Fill",value:`${avgFill}d`,sub:"days to fill position",color:"#10b981",icon:"✅"},
              {label:"Fill Rate",value:`${fillRate}%`,sub:`${filled.length} of ${ps.length} filled`,color:"#8b5cf6",icon:"📈"},
            ].map((kpi,i)=>(<div key={i} style={{background:"#fff",borderRadius:DS.radius.lg,padding:"18px 20px",border:`1px solid ${DS.surface.border}`,boxShadow:DS.shadow.sm,animation:`fadeUp .3s ${i*0.06}s both`,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:kpi.color}}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div><div style={{fontSize:10,color:DS.text.faint,fontFamily:DS.font.body,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:4}}>{kpi.label}</div><div style={{fontSize:28,fontWeight:800,color:DS.text.h1,fontFamily:DS.font.heading,lineHeight:1}}>{kpi.value}</div><div style={{fontSize:10,color:DS.text.muted,fontFamily:DS.font.body,marginTop:4}}>{kpi.sub}</div></div>
                <div style={{fontSize:20,opacity:.5}}>{kpi.icon}</div>
              </div>
            </div>));
          })()}
        </div>
        {/* Charts row */}
        <div style={{display:"grid",gridTemplateColumns:isMob?"1fr":"1fr 1fr",gap:16,marginBottom:20}}>
          {/* By Status */}
          <div style={{background:"#fff",borderRadius:DS.radius.xl,padding:"22px 24px",border:`1px solid ${DS.surface.border}`,boxShadow:DS.shadow.sm}}>
            <div style={{fontSize:13,fontWeight:700,color:DS.text.h1,marginBottom:16,fontFamily:DS.font.heading}}>Profiles by Status</div>
            {Object.entries(STATUS_LABELS).map(([k,v])=>(<div key={k} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <div style={{width:80,fontSize:11,color:DS.text.muted,flexShrink:0,fontFamily:DS.font.body}}>{v}</div>
              <div style={{flex:1,height:20,background:DS.surface.sunken,borderRadius:DS.radius.sm,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${((cn[k]||0)/Math.max(ps.length,1))*100}%`,background:`linear-gradient(90deg,${STATUS_COLORS[k]},${STATUS_COLORS[k]}cc)`,borderRadius:DS.radius.sm,transition:`width .6s ${DS.ease.smooth}`,display:"flex",alignItems:"center",paddingLeft:8}}>
                  {(cn[k]||0)>0&&<span style={{fontSize:10,color:"#fff",fontWeight:600,fontFamily:DS.font.heading}}>{cn[k]}</span>}
                </div>
              </div>
            </div>))}
          </div>
          {/* By Category */}
          <div style={{background:"#fff",borderRadius:DS.radius.xl,padding:"22px 24px",border:`1px solid ${DS.surface.border}`,boxShadow:DS.shadow.sm}}>
            <div style={{fontSize:13,fontWeight:700,color:DS.text.h1,marginBottom:16,fontFamily:DS.font.heading}}>Profiles by Category</div>
            {Object.entries(catCn).sort((a,b)=>b[1]-a[1]).map(([cat,n])=>(<div key={cat} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <div style={{width:80,fontSize:11,color:DS.text.muted,flexShrink:0,fontFamily:DS.font.body}}>{cat}</div>
              <div style={{flex:1,height:20,background:DS.surface.sunken,borderRadius:DS.radius.sm,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${(n/maxCat)*100}%`,background:`linear-gradient(90deg,${DS.brand.blue700},${DS.brand.cyan600})`,borderRadius:DS.radius.sm,transition:`width .6s ${DS.ease.smooth}`,display:"flex",alignItems:"center",paddingLeft:8}}>
                  <span style={{fontSize:10,color:"#fff",fontWeight:600,fontFamily:DS.font.heading}}>{n}</span>
                </div>
              </div>
            </div>))}
          </div>
        </div>
        {/* ═══ 3 INSIGHT DIAGRAMS ═══ */}
        <div style={{display:"grid",gridTemplateColumns:isMob?"1fr":"repeat(3,1fr)",gap:16,marginBottom:20}}>
          {/* Insight 1: Candidates per vacancy */}
          <div style={{background:"#fff",borderRadius:DS.radius.xl,padding:"22px 24px",border:`1px solid ${DS.surface.border}`,boxShadow:DS.shadow.sm}}>
            <div style={{fontSize:12,fontWeight:700,color:DS.text.h1,marginBottom:4,fontFamily:DS.font.heading}}>📊 Candidates per Vacancy</div>
            <div style={{fontSize:10,color:DS.text.faint,marginBottom:14,fontFamily:DS.font.body}}>Headcount needed vs candidates assigned</div>
            {(()=>{
              const items=ps.slice(0,8).map(p=>{const assigned=allAssigns.filter(a=>a.profile_id===p.id).length;return{role:p.role?.substring(0,18),hc:p.headcount||1,assigned}});
              const maxH=Math.max(...items.map(i=>Math.max(i.hc,i.assigned)),1);
              return items.map((it,i)=>(<div key={i} style={{marginBottom:8}}><div style={{fontSize:10,color:DS.text.body,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:DS.font.body}}>{it.role}</div><div style={{display:"flex",gap:4,alignItems:"center"}}><div style={{flex:1,height:14,background:DS.surface.sunken,borderRadius:DS.radius.xs,overflow:"hidden",position:"relative"}}><div style={{position:"absolute",height:"100%",width:`${(it.hc/maxH)*100}%`,background:DS.brand.blue700,borderRadius:DS.radius.xs,opacity:.2}}/><div style={{position:"absolute",height:"100%",width:`${(it.assigned/maxH)*100}%`,background:`linear-gradient(90deg,${DS.brand.blue700},${DS.brand.cyan600})`,borderRadius:DS.radius.xs}}/></div><div style={{fontSize:9,color:DS.text.muted,minWidth:36,textAlign:"right",fontFamily:DS.font.heading,fontWeight:600}}>{it.assigned}/{it.hc}</div></div></div>));
            })()}
            <div style={{display:"flex",gap:12,marginTop:10,fontSize:9,color:DS.text.faint,fontFamily:DS.font.body}}><span><span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:`linear-gradient(90deg,${DS.brand.blue700},${DS.brand.cyan600})`,marginRight:4}}/>Assigned</span><span><span style={{display:"inline-block",width:8,height:8,borderRadius:2,background:DS.brand.blue700,opacity:.2,marginRight:4}}/>Headcount</span></div>
          </div>
          {/* Insight 2: Pipeline funnel */}
          <div style={{background:"#fff",borderRadius:DS.radius.xl,padding:"22px 24px",border:`1px solid ${DS.surface.border}`,boxShadow:DS.shadow.sm}}>
            <div style={{fontSize:12,fontWeight:700,color:DS.text.h1,marginBottom:4,fontFamily:DS.font.heading}}>🔄 Pipeline Funnel</div>
            <div style={{fontSize:10,color:DS.text.faint,marginBottom:14,fontFamily:DS.font.body}}>Candidates by stage across all profiles</div>
            {(()=>{
              const stages=[{k:"data_verification",l:"Data Verif.",c:"#3b82f6"},{k:"schedule_ts",l:"Sched. TS",c:"#6366f1"},{k:"ready_technical",l:"Ready Tech",c:"#d946ef"},{k:"ready_client",l:"Ready Client",c:"#f97316"},{k:"client_approval",l:"Approval",c:"#10b981"},{k:"hired",l:"Hired",c:"#059669"},{k:"discarded",l:"Discarded",c:"#ef4444"}];
              const total=Math.max(allAssigns.length||1,1);
              return stages.map(s=>{const n=allAssigns.filter(a=>(a.status||"data_verification")===s.k).length;const pct=Math.round((n/total)*100);return(<div key={s.k} style={{marginBottom:6}}><div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:2}}><span style={{color:DS.text.body,fontFamily:DS.font.body}}>{s.l}</span><span style={{color:s.c,fontWeight:600,fontFamily:DS.font.heading}}>{n}</span></div><div style={{height:10,background:DS.surface.sunken,borderRadius:DS.radius.xs,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.max(pct,3)}%`,background:`linear-gradient(90deg,${s.c},${s.c}aa)`,borderRadius:DS.radius.xs,transition:`width .6s ${DS.ease.smooth}`}}/></div></div>)});
            })()}
          </div>
          {/* Insight 3: Talent Pool distribution */}
          <div style={{background:"#fff",borderRadius:DS.radius.xl,padding:"22px 24px",border:`1px solid ${DS.surface.border}`,boxShadow:DS.shadow.sm}}>
            <div style={{fontSize:12,fontWeight:700,color:DS.text.h1,marginBottom:4,fontFamily:DS.font.heading}}>👤 Talent Pool Breakdown</div>
            <div style={{fontSize:10,color:DS.text.faint,marginBottom:14,fontFamily:DS.font.body}}>By seniority level</div>
            {(()=>{
              const senCn={};cands.forEach(c=>{const s=c.seniority||"Unset";senCn[s]=(senCn[s]||0)+1});
              const senColors={Junior:"#22d3ee",Mid:"#3b82f6",Senior:DS.brand.blue700,Lead:"#8b5cf6",Director:"#6d28d9",VP:"#4c1d95","C-Level":DS.brand.navy900,Unset:DS.surface.border};
              const total=Math.max(cands.length,1);const entries=Object.entries(senCn).sort((a,b)=>b[1]-a[1]);
              if(!entries.length)return<div style={{textAlign:"center",padding:28,color:DS.text.placeholder,fontSize:12,fontFamily:DS.font.body}}><div style={{fontSize:32,marginBottom:8}}>👤</div>No talent data yet.<br/>Add candidates in the Talent Pool.</div>;
              return(<>
                <div style={{display:"flex",height:16,borderRadius:DS.radius.md,overflow:"hidden",marginBottom:14}}>
                  {entries.map(([s,n])=><div key={s} title={`${s}: ${n}`} style={{width:`${(n/total)*100}%`,background:senColors[s]||DS.text.faint,minWidth:n>0?4:0,transition:`width .5s ${DS.ease.smooth}`}}/>)}
                </div>
                {entries.map(([s,n])=>(<div key={s} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:10,height:10,borderRadius:3,background:senColors[s]||DS.text.faint}}/><span style={{fontSize:11,color:DS.text.body,fontFamily:DS.font.body}}>{s}</span></div><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:12,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading}}>{n}</span><span style={{fontSize:10,color:DS.text.faint,fontFamily:DS.font.body}}>({Math.round((n/total)*100)}%)</span></div></div>))}
              </>);
            })()}
          </div>
        </div>
        {/* All Profiles List */}
        <div style={{background:"#fff",borderRadius:DS.radius.xl,border:`1px solid ${DS.surface.border}`,overflow:"hidden",boxShadow:DS.shadow.sm}}>
          <div style={{padding:"18px 24px",borderBottom:`1px solid ${DS.surface.borderLight}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:14,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading}}>All Profiles ({ps.length})</div>
            <div style={{fontSize:10,color:DS.text.faint,fontFamily:DS.font.body,letterSpacing:"0.05em",textTransform:"uppercase"}}>Role · Client · Status</div>
          </div>
          {ps.map((p,idx)=>(<div key={p.id} onClick={()=>{setSelP(p);loadAssigns(p.id);setView("detail")}} style={{padding:"14px 24px",borderBottom:`1px solid ${DS.surface.borderLight}`,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",transition:`all .2s ${DS.ease.default}`,animation:`fadeUp .3s ${idx*0.03}s both`}} onMouseEnter={e=>{e.currentTarget.style.background=DS.surface.page}} onMouseLeave={e=>{e.currentTarget.style.background="transparent"}}>
            <div><div style={{fontSize:13,fontWeight:600,color:DS.text.h1,fontFamily:DS.font.heading,letterSpacing:"-0.01em"}}>{p.role} — {p.seniority}</div><div style={{fontSize:12,color:DS.text.muted,marginTop:2,fontFamily:DS.font.body}}>{p.client_name} ({p.client_company}) · {p.category}</div></div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:10,fontWeight:600,color:STATUS_COLORS[p.status],background:`${STATUS_COLORS[p.status]}10`,padding:"4px 12px",borderRadius:DS.radius.pill,fontFamily:DS.font.heading}}>{STATUS_LABELS[p.status]}</span>
              <a href={`/api/pdf/${p.id}`} target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} style={{fontSize:10,color:DS.brand.blue700,border:`1px solid ${DS.brand.blue700}`,borderRadius:DS.radius.sm,padding:"4px 10px",textDecoration:"none",fontFamily:DS.font.heading,fontWeight:500,transition:`all .2s ${DS.ease.default}`}}>PDF</a>
            </div>
          </div>))}
          {!ps.length&&<div style={{textAlign:"center",padding:48,color:DS.text.faint,fontFamily:DS.font.body}}><div style={{fontSize:36,marginBottom:10}}>📋</div>No profiles yet. Clients will create them through the form.</div>}
        </div>
      </div>)}

      {view==="talent_pool"&&(<div style={{animation:"fadeUp .3s both"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10}}>
          <div><div style={{fontSize:18,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading,letterSpacing:"-0.02em"}}>Talent Pool</div><div style={{fontSize:12,color:DS.text.muted,fontFamily:DS.font.body,marginTop:2}}>{cands.length} candidate{cands.length!==1?"s":""} in your network</div></div>
          <button type="button" onClick={()=>{setEditCand(null);setNewCand({name:"",email:"",phone:"",seniority:"",experience:"",location:"",english_level:"",notes:"",languages:[],frameworks:[],skills:[]});setShowAddCand(true)}} style={{fontSize:13,background:`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`,color:"#fff",border:"none",borderRadius:DS.radius.md,padding:"11px 24px",cursor:"pointer",fontFamily:DS.font.heading,fontWeight:600,boxShadow:DS.shadow.blue,transition:`all .25s ${DS.ease.snap}`,letterSpacing:"-0.005em"}}>+ Add Talent</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMob?"1fr":"repeat(2,1fr)",gap:14}}>
          {cands.map((c,idx)=>(<div key={c.id} style={{borderRadius:DS.radius.lg,overflow:"hidden",border:`1px solid ${DS.surface.border}`,transition:`all .25s ${DS.ease.snap}`,boxShadow:DS.shadow.sm,animation:`fadeUp .4s ${idx*0.05}s both`}} onMouseEnter={e=>{e.currentTarget.style.boxShadow=DS.shadow.md;e.currentTarget.style.transform="translateY(-2px)"}} onMouseLeave={e=>{e.currentTarget.style.boxShadow=DS.shadow.sm;e.currentTarget.style.transform="none"}}>
            {/* Dark header */}
            <div style={{background:`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.navy800})`,padding:"14px 18px",display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:42,height:42,borderRadius:"50%",background:`linear-gradient(135deg,${DS.brand.blue700},${DS.brand.cyan600})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:15,fontWeight:700,fontFamily:DS.font.heading,flexShrink:0}}>{(c.name||"?").split(" ").map(w=>w[0]).join("").substring(0,2)}</div>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:600,color:"#fff",fontFamily:DS.font.heading,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</div><div style={{fontSize:11,color:DS.brand.cyan600,fontFamily:DS.font.body}}>{c.seniority||"—"} · {c.experience||"—"}</div></div>
              <button type="button" onClick={()=>{setEditCand({...c});setEditSkillInput("")}} style={{fontSize:10,color:"rgba(255,255,255,0.7)",background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:DS.radius.sm,padding:"5px 12px",cursor:"pointer",fontFamily:DS.font.heading,fontWeight:500,flexShrink:0,transition:`all .2s ${DS.ease.default}`}}>✏️ Edit</button>
            </div>
            {/* Light body */}
            <div style={{background:"#fff",padding:"14px 18px"}}>
              <div style={{display:"flex",gap:12,flexWrap:"wrap",fontSize:11.5,color:DS.text.muted,fontFamily:DS.font.body,marginBottom:10}}>
                {c.location&&<span>📍 {c.location}</span>}
                {c.english_level&&<span>🗣️ {c.english_level}</span>}
                {c.email&&<span>📧 {c.email}</span>}
              </div>
              {(c.skills||[]).length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4}}>{c.skills.map((s,i)=><span key={i} style={{background:DS.brand.blue50,color:DS.brand.blue700,padding:"3px 10px",borderRadius:DS.radius.xs,fontSize:10,fontFamily:DS.font.body,fontWeight:500,border:`1px solid ${DS.brand.blue100}`}}>{s}</span>)}</div>}
              {c.notes&&<div style={{fontSize:11,color:DS.text.faint,marginTop:10,fontStyle:"italic",fontFamily:DS.font.body,lineHeight:1.5}}>{c.notes}</div>}
            </div>
          </div>))}
          {!cands.length&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:56,background:"#fff",borderRadius:DS.radius.xl,border:`1px solid ${DS.surface.border}`}}>
            <div style={{width:64,height:64,borderRadius:"50%",background:`linear-gradient(135deg,${DS.brand.blue50},${DS.brand.cyan100})`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:28}}>👤</div>
            <div style={{fontSize:16,fontWeight:600,color:DS.text.h2,fontFamily:DS.font.heading,marginBottom:6}}>Your talent pool is empty</div>
            <div style={{fontSize:13,color:DS.text.muted,fontFamily:DS.font.body,marginBottom:20}}>Start building your candidate network by adding your first talent.</div>
            <button type="button" onClick={()=>{setNewCand({name:"",email:"",phone:"",seniority:"",experience:"",location:"",english_level:"",notes:"",languages:[],frameworks:[],skills:[]});setShowAddCand(true)}} style={{fontSize:13,background:`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`,color:"#fff",border:"none",borderRadius:DS.radius.md,padding:"11px 24px",cursor:"pointer",fontFamily:DS.font.heading,fontWeight:600,boxShadow:DS.shadow.blue}}>+ Add First Talent</button>
          </div>}
        </div>
        {/* Add talent modal */}
        {showAddCand&&(<div style={{position:"fixed",inset:0,zIndex:50,background:"rgba(15,23,42,0.6)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:DS.radius.xxl,maxWidth:520,width:"100%",maxHeight:"85vh",overflowY:"auto",animation:"fadeUp .3s both",boxShadow:DS.shadow.lg}}>
            <div style={{background:`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`,borderRadius:`${DS.radius.xxl}px ${DS.radius.xxl}px 0 0`,padding:"22px 28px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:16,fontWeight:700,color:"#fff",fontFamily:DS.font.heading}}>Add New Talent</div>
              <button type="button" onClick={()=>setShowAddCand(false)} style={{background:"rgba(255,255,255,0.1)",border:"none",width:30,height:30,borderRadius:"50%",fontSize:14,cursor:"pointer",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
            <div style={{padding:"24px 28px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <input type="text" value={newCand.name} onChange={e=>setNewCand({...newCand,name:e.target.value})} placeholder="Full name *" style={IS}/>
                <input type="email" value={newCand.email} onChange={e=>setNewCand({...newCand,email:e.target.value})} placeholder="Email" style={IS}/>
                <select value={newCand.seniority} onChange={e=>setNewCand({...newCand,seniority:e.target.value})} style={{...IS,cursor:"pointer"}}><option value="">Seniority</option>{SENIORITY.map(s=><option key={s}>{s}</option>)}</select>
                <input type="text" value={newCand.location} onChange={e=>setNewCand({...newCand,location:e.target.value})} placeholder="Location" style={IS}/>
                <select value={newCand.english_level} onChange={e=>setNewCand({...newCand,english_level:e.target.value})} style={{...IS,cursor:"pointer"}}><option value="">English level</option>{ENGLISH.map(e=><option key={e}>{e}</option>)}</select>
                <input type="text" value={newCand.experience} onChange={e=>setNewCand({...newCand,experience:e.target.value})} placeholder="Experience" style={IS}/>
              </div>
              <div style={{marginTop:10,display:"flex",gap:6}}><input type="text" value={skillInput} onChange={e=>setSkillInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&skillInput.trim()){setNewCand({...newCand,skills:[...newCand.skills,skillInput.trim()]});setSkillInput("")}}} placeholder="Type a skill and press Enter" style={{...IS,flex:1}}/></div>
              {newCand.skills.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:8}}>{newCand.skills.map((s,i)=><span key={i} onClick={()=>setNewCand({...newCand,skills:newCand.skills.filter((_,j)=>j!==i)})} style={{background:DS.brand.blue50,color:DS.brand.blue700,padding:"4px 12px",borderRadius:DS.radius.pill,fontSize:11,cursor:"pointer",fontFamily:DS.font.body,border:`1px solid ${DS.brand.blue100}`}}>{s} ✕</span>)}</div>}
              <textarea value={newCand.notes} onChange={e=>setNewCand({...newCand,notes:e.target.value})} placeholder="Notes about this candidate..." rows={2} style={{...IS,marginTop:10,resize:"none"}}/>
              <button type="button" onClick={async()=>{await addCandidate()}} disabled={!newCand.name.trim()} style={{width:"100%",marginTop:16,background:newCand.name.trim()?`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`:DS.surface.border,color:newCand.name.trim()?"#fff":DS.text.faint,border:"none",borderRadius:DS.radius.md,padding:14,fontSize:14,fontWeight:600,cursor:newCand.name.trim()?"pointer":"default",fontFamily:DS.font.heading,boxShadow:newCand.name.trim()?DS.shadow.blue:"none",transition:`all .25s ${DS.ease.snap}`}}>Add to Talent Pool</button>
            </div>
          </div>
        </div>)}
        {/* Edit talent modal */}
        {editCand&&(<div style={{position:"fixed",inset:0,zIndex:50,background:"rgba(15,23,42,0.6)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:DS.radius.xxl,maxWidth:520,width:"100%",maxHeight:"85vh",overflowY:"auto",animation:"fadeUp .3s both",boxShadow:DS.shadow.lg}}>
            <div style={{background:`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`,borderRadius:`${DS.radius.xxl}px ${DS.radius.xxl}px 0 0`,padding:"22px 28px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontSize:16,fontWeight:700,color:"#fff",fontFamily:DS.font.heading}}>Edit Talent</div>
              <button type="button" onClick={()=>setEditCand(null)} style={{background:"rgba(255,255,255,0.1)",border:"none",width:30,height:30,borderRadius:"50%",fontSize:14,cursor:"pointer",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
            <div style={{padding:"24px 28px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <input type="text" value={editCand.name||""} onChange={e=>setEditCand({...editCand,name:e.target.value})} placeholder="Full name *" style={IS}/>
                <input type="email" value={editCand.email||""} onChange={e=>setEditCand({...editCand,email:e.target.value})} placeholder="Email" style={IS}/>
                <select value={editCand.seniority||""} onChange={e=>setEditCand({...editCand,seniority:e.target.value})} style={{...IS,cursor:"pointer"}}><option value="">Seniority</option>{SENIORITY.map(s=><option key={s}>{s}</option>)}</select>
                <input type="text" value={editCand.location||""} onChange={e=>setEditCand({...editCand,location:e.target.value})} placeholder="Location" style={IS}/>
                <select value={editCand.english_level||""} onChange={e=>setEditCand({...editCand,english_level:e.target.value})} style={{...IS,cursor:"pointer"}}><option value="">English level</option>{ENGLISH.map(e=><option key={e}>{e}</option>)}</select>
                <input type="text" value={editCand.experience||""} onChange={e=>setEditCand({...editCand,experience:e.target.value})} placeholder="Experience" style={IS}/>
              </div>
              <div style={{marginTop:10,display:"flex",gap:6}}><input type="text" value={editSkillInput} onChange={e=>setEditSkillInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&editSkillInput.trim()){setEditCand({...editCand,skills:[...(editCand.skills||[]),editSkillInput.trim()]});setEditSkillInput("")}}} placeholder="Type a skill and press Enter" style={{...IS,flex:1}}/></div>
              {(editCand.skills||[]).length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:8}}>{editCand.skills.map((s,i)=><span key={i} onClick={()=>setEditCand({...editCand,skills:editCand.skills.filter((_,j)=>j!==i)})} style={{background:DS.brand.blue50,color:DS.brand.blue700,padding:"4px 12px",borderRadius:DS.radius.pill,fontSize:11,cursor:"pointer",fontFamily:DS.font.body,border:`1px solid ${DS.brand.blue100}`}}>{s} ✕</span>)}</div>}
              <textarea value={editCand.notes||""} onChange={e=>setEditCand({...editCand,notes:e.target.value})} placeholder="Notes..." rows={2} style={{...IS,marginTop:10,resize:"none"}}/>
              <button type="button" onClick={()=>updateCandidate(editCand.id,editCand)} disabled={!editCand.name?.trim()} style={{width:"100%",marginTop:16,background:editCand.name?.trim()?`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`:DS.surface.border,color:editCand.name?.trim()?"#fff":DS.text.faint,border:"none",borderRadius:DS.radius.md,padding:14,fontSize:14,fontWeight:600,cursor:editCand.name?.trim()?"pointer":"default",fontFamily:DS.font.heading,boxShadow:editCand.name?.trim()?DS.shadow.blue:"none",transition:`all .25s ${DS.ease.snap}`}}>Save Changes</button>
            </div>
          </div>
        </div>)}
      </div>)}
    </div>
    {renderCandDetailModal()}

    {/* ═══ PHASE 3: ADMIN OMNISCIENT VIEWS ═══ */}

    {/* ALERTS VIEW */}
    {view==="alerts"&&isAdmin&&(<div style={{position:"fixed",inset:0,zIndex:55,background:"rgba(15,23,42,0.5)",backdropFilter:"blur(3px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setView("kanban")}>
      <div style={{background:"#fff",borderRadius:DS.radius.xxl,padding:28,maxWidth:700,width:"100%",maxHeight:"85vh",overflowY:"auto",animation:"fadeUp .25s both",boxShadow:DS.shadow.lg}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div><div style={{fontSize:18,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading}}>🔔 Alerts & Insights</div><div style={{fontSize:12,color:DS.text.muted,fontFamily:DS.font.body,marginTop:2}}>AI-powered profile analysis across all requests</div></div>
          <button type="button" onClick={()=>setView("kanban")} style={{background:DS.surface.sunken,border:"none",width:32,height:32,borderRadius:DS.radius.md,fontSize:14,cursor:"pointer",color:DS.text.faint}}>✕</button>
        </div>
        {!alertsLoading&&!adminAlerts.length&&<button type="button" onClick={async()=>{
          setAlertsLoading(true);setAdminAlerts([]);
          const alerts=[];
          for(const p of ps.slice(0,20)){
            const pd=p.profile_data||{};
            // Rule-based alerts (fast, no API needed)
            if(p.seniority==="Senior"&&pd.experience&&pd.experience.includes("1"))alerts.push({type:"warning",title:`${p.role}: Seniority mismatch`,detail:`Profile says Senior but experience is "${pd.experience}". Verify with client.`,profileId:p.id});
            if(p.seniority==="Lead"&&pd.experience&&(pd.experience.includes("1")||pd.experience.includes("2")))alerts.push({type:"warning",title:`${p.role}: Lead with low experience`,detail:`Lead role but only "${pd.experience}" experience.`,profileId:p.id});
            if(!pd.mustHave?.length)alerts.push({type:"info",title:`${p.role}: No must-haves`,detail:`Profile has no must-have requirements defined. This may cause poor candidate matching.`,profileId:p.id});
            if(!pd.techStack?.languages?.length&&!pd.techStack?.profTools?.length)alerts.push({type:"error",title:`${p.role}: No tech stack`,detail:`No languages or tools specified. Profile is essentially empty technically.`,profileId:p.id});
            const roleT=ROLE_TYPE[p.role];if(["backend","fullstack","dba","data"].includes(roleT)&&!pd.techStack?.databases?.length)alerts.push({type:"warning",title:`${p.role}: No databases`,detail:`${roleT} role without any databases specified.`,profileId:p.id});
            if(p.status==="new"&&(Date.now()-new Date(p.created_at).getTime())>7*86400000)alerts.push({type:"warning",title:`${p.role}: Aging request`,detail:`Profile has been in "New" status for ${Math.round((Date.now()-new Date(p.created_at).getTime())/86400000)} days without review.`,profileId:p.id});
          }
          if(!alerts.length)alerts.push({type:"info",title:"All clear",detail:"No alerts found across current profiles."});
          setAdminAlerts(alerts);setAlertsLoading(false);
        }} style={{width:"100%",background:`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`,color:"#fff",border:"none",borderRadius:DS.radius.md,padding:14,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:DS.font.heading,boxShadow:DS.shadow.blue}}>🔍 Scan All Profiles for Issues</button>}
        {alertsLoading&&<Spinner text="Scanning profiles..."/>}
        {adminAlerts.length>0&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
          {adminAlerts.map((a,i)=>(
            <div key={i} style={{display:"flex",gap:12,padding:"12px 16px",borderRadius:DS.radius.lg,border:`1px solid ${a.type==="error"?"#fecaca":a.type==="warning"?"#fed7aa":"#e0e7ff"}`,background:a.type==="error"?"#fef2f2":a.type==="warning"?"#fff7ed":"#f0f6ff",animation:`fadeUp .3s ${i*0.05}s both`}}>
              <span style={{fontSize:16,flexShrink:0,marginTop:1}}>{a.type==="error"?"🔴":a.type==="warning"?"🟡":"🔵"}</span>
              <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:DS.text.h1,fontFamily:DS.font.heading}}>{a.title}</div><div style={{fontSize:12,color:DS.text.muted,fontFamily:DS.font.body,marginTop:2}}>{a.detail}</div></div>
              {a.profileId&&<button type="button" onClick={()=>{const p=ps.find(x=>x.id===a.profileId);if(p){setSelP(p);loadAssigns(p.id);setView("detail")}}} style={{fontSize:11,color:DS.brand.blue700,background:"none",border:`1px solid ${DS.brand.blue700}`,borderRadius:DS.radius.sm,padding:"4px 12px",cursor:"pointer",fontFamily:DS.font.heading,fontWeight:600,flexShrink:0,alignSelf:"center"}}>View</button>}
            </div>
          ))}
          <button type="button" onClick={()=>{setAdminAlerts([]);setAlertsLoading(false)}} style={{marginTop:8,fontSize:12,color:DS.text.muted,background:"none",border:"none",cursor:"pointer",fontFamily:DS.font.body,textDecoration:"underline"}}>Clear & Rescan</button>
        </div>}
      </div>
    </div>)}

    {/* ANA VIEW — see what Ana sees */}
    {view==="ana_view"&&isAdmin&&(<div style={{position:"fixed",inset:0,zIndex:55,background:"rgba(15,23,42,0.5)",backdropFilter:"blur(3px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setView("kanban")}>
      <div style={{background:"#fff",borderRadius:DS.radius.xxl,padding:28,maxWidth:800,width:"100%",maxHeight:"85vh",overflowY:"auto",animation:"fadeUp .25s both",boxShadow:DS.shadow.lg}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div><div style={{fontSize:18,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading}}>🧠 Ana View — Soft Skills</div><div style={{fontSize:12,color:DS.text.muted,fontFamily:DS.font.body,marginTop:2}}>See what Ana (Talent Discovery) sees for each profile</div></div>
          <button type="button" onClick={()=>setView("kanban")} style={{background:DS.surface.sunken,border:"none",width:32,height:32,borderRadius:DS.radius.md,fontSize:14,cursor:"pointer",color:DS.text.faint}}>✕</button>
        </div>
        {ps.filter(p=>["pending_soft","in_progress","sourcing","filled"].includes(p.status)).map((p,i)=>{
          const pd=p.profile_data||{};const ss=pd.softSkills||pd.recruiterReview;
          return(<div key={p.id} style={{padding:"16px 18px",borderRadius:DS.radius.lg,border:`1px solid ${DS.surface.border}`,marginBottom:10,background:DS.surface.page,animation:`fadeUp .3s ${i*0.04}s both`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div><div style={{fontSize:14,fontWeight:600,color:DS.text.h1,fontFamily:DS.font.heading}}>{p.role} — {p.seniority}</div><div style={{fontSize:11,color:DS.text.muted,fontFamily:DS.font.body}}>{p.client_name} ({p.client_company})</div></div>
              <span style={{fontSize:10,fontWeight:600,color:STATUS_COLORS[p.status],background:`${STATUS_COLORS[p.status]}15`,padding:"3px 10px",borderRadius:DS.radius.pill}}>{STATUS_LABELS[p.status]}</span>
            </div>
            {pd.recruiterReview&&<div style={{fontSize:12,color:"#C2410C",background:"#FFF7ED",padding:"8px 12px",borderRadius:DS.radius.sm,marginBottom:6,border:"1px solid #FDBA74"}}><strong>Recruiter:</strong> {pd.recruiterReview.notes||"Accepted"}{pd.recruiterReview.questionsForAna?.length?` · ${pd.recruiterReview.questionsForAna.length} questions`:""}</div>}
            {ss?.personality&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>{ss.personality.map(t=><span key={t} style={{padding:"2px 8px",borderRadius:DS.radius.pill,fontSize:10,background:"#F3F0FF",color:"#5B21B6",fontFamily:DS.font.body}}>{t}</span>)}</div>}
            {ss?.softSkillsSummary&&<div style={{fontSize:11,color:DS.text.body,marginTop:6,lineHeight:1.5,fontFamily:DS.font.body}}>{ss.softSkillsSummary}</div>}
            {!ss&&!pd.recruiterReview&&<div style={{fontSize:11,color:DS.text.faint,fontStyle:"italic"}}>No soft skills data yet</div>}
          </div>);
        })}
        {ps.filter(p=>["pending_soft","in_progress","sourcing","filled"].includes(p.status)).length===0&&<div style={{textAlign:"center",padding:40,color:DS.text.faint}}><div style={{fontSize:36,marginBottom:8}}>🧠</div>No profiles have reached Ana yet</div>}
      </div>
    </div>)}

    {/* SALES VIEW — see what Sales sees */}
    {view==="sales_view"&&isAdmin&&(<div style={{position:"fixed",inset:0,zIndex:55,background:"rgba(15,23,42,0.5)",backdropFilter:"blur(3px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setView("kanban")}>
      <div style={{background:"#fff",borderRadius:DS.radius.xxl,padding:28,maxWidth:800,width:"100%",maxHeight:"85vh",overflowY:"auto",animation:"fadeUp .25s both",boxShadow:DS.shadow.lg}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div><div style={{fontSize:18,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading}}>💼 Sales View</div><div style={{fontSize:12,color:DS.text.muted,fontFamily:DS.font.body,marginTop:2}}>Pipeline overview as Sales team sees it</div></div>
          <button type="button" onClick={()=>setView("kanban")} style={{background:DS.surface.sunken,border:"none",width:32,height:32,borderRadius:DS.radius.md,fontSize:14,cursor:"pointer",color:DS.text.faint}}>✕</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
          {[["new","New"],["pending_review","Review"],["pending_soft","Discovery"],["filled","Filled"]].map(([s,l])=>(
            <div key={s} style={{background:DS.surface.page,borderRadius:DS.radius.lg,padding:"14px",textAlign:"center",border:`1px solid ${DS.surface.border}`}}>
              <div style={{fontSize:24,fontWeight:800,color:DS.text.h1,fontFamily:DS.font.heading}}>{ps.filter(p=>p.status===s).length}</div>
              <div style={{fontSize:10,color:DS.text.muted,fontFamily:DS.font.body,marginTop:2}}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{fontSize:13,fontWeight:600,color:DS.text.h2,fontFamily:DS.font.heading,marginBottom:10}}>By Client</div>
        {[...new Set(ps.map(p=>p.client_company).filter(Boolean))].map(company=>{
          const cps=ps.filter(p=>p.client_company===company);
          return(<div key={company} style={{padding:"12px 16px",borderRadius:DS.radius.lg,border:`1px solid ${DS.surface.border}`,marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontSize:13,fontWeight:600,color:DS.text.h1,fontFamily:DS.font.heading}}>{company}</div><div style={{fontSize:11,color:DS.text.muted,fontFamily:DS.font.body}}>{cps.length} profile{cps.length>1?"s":""}</div></div>
            <div style={{display:"flex",gap:6}}>{Object.entries(STATUS_LABELS).filter(([k])=>cps.some(p=>p.status===k)).map(([k])=><div key={k} style={{width:8,height:8,borderRadius:"50%",background:STATUS_COLORS[k]}} title={STATUS_LABELS[k]}/>)}</div>
          </div>);
        })}
      </div>
    </div>)}

    {/* CLIENT VIEW — see what client form looks like */}
    {view==="client_view"&&isAdmin&&(<div style={{position:"fixed",inset:0,zIndex:55,background:"rgba(15,23,42,0.5)",backdropFilter:"blur(3px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setView("kanban")}>
      <div style={{background:"#fff",borderRadius:DS.radius.xxl,padding:28,maxWidth:800,width:"100%",maxHeight:"85vh",overflowY:"auto",animation:"fadeUp .25s both",boxShadow:DS.shadow.lg}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div><div style={{fontSize:18,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading}}>👁️ Client Submissions</div><div style={{fontSize:12,color:DS.text.muted,fontFamily:DS.font.body,marginTop:2}}>Raw data as submitted by clients</div></div>
          <button type="button" onClick={()=>setView("kanban")} style={{background:DS.surface.sunken,border:"none",width:32,height:32,borderRadius:DS.radius.md,fontSize:14,cursor:"pointer",color:DS.text.faint}}>✕</button>
        </div>
        {ps.slice(0,15).map((p,i)=>{
          const pd=p.profile_data||{};
          return(<div key={p.id} style={{padding:"16px 18px",borderRadius:DS.radius.lg,border:`1px solid ${DS.surface.border}`,marginBottom:8,animation:`fadeUp .3s ${i*0.03}s both`}} onClick={()=>{setSelP(p);loadAssigns(p.id);setView("detail")}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,cursor:"pointer"}}>
              <div><div style={{fontSize:14,fontWeight:600,color:DS.text.h1,fontFamily:DS.font.heading}}>{p.role} — {p.seniority}</div><div style={{fontSize:11,color:DS.text.muted,fontFamily:DS.font.body,marginTop:2}}>{p.client_name} ({p.client_company}) · {p.client_email}</div></div>
              <span style={{fontSize:10,fontWeight:600,color:STATUS_COLORS[p.status],background:`${STATUS_COLORS[p.status]}15`,padding:"3px 10px",borderRadius:DS.radius.pill}}>{STATUS_LABELS[p.status]}</span>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {[...(pd.techStack?.languages||[]),...(pd.techStack?.frameworks||[])].slice(0,8).map(t=><span key={t} style={{padding:"2px 8px",borderRadius:DS.radius.pill,fontSize:10,background:DS.brand.blue50,color:DS.brand.blue700,fontFamily:DS.font.body,border:`1px solid ${DS.brand.blue100}`}}>{t}</span>)}
              {pd.mustHave?.slice(0,3).map(t=><span key={t} style={{padding:"2px 8px",borderRadius:DS.radius.pill,fontSize:10,background:"#fef2f2",color:"#dc2626",fontFamily:DS.font.body,border:"1px solid #fecaca"}}>Must: {t}</span>)}
            </div>
            <div style={{fontSize:10,color:DS.text.faint,marginTop:6,fontFamily:DS.font.body}}>{pd.experience} · {pd.englishLevel||"—"} · {pd.location||"—"} · Submitted {new Date(p.created_at).toLocaleDateString()}</div>
          </div>);
        })}
      </div>
    </div>)}
    {/* TRASH VIEW */}
    {view==="trash"&&isAdmin&&(<div style={{position:"fixed",inset:0,zIndex:55,background:"rgba(15,23,42,0.5)",backdropFilter:"blur(3px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setView("kanban")}>
      <div style={{background:"#fff",borderRadius:DS.radius.xxl,padding:28,maxWidth:700,width:"100%",maxHeight:"85vh",overflowY:"auto",animation:"fadeUp .25s both",boxShadow:DS.shadow.lg}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div><div style={{fontSize:18,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading}}>🗑️ Trash</div><div style={{fontSize:12,color:DS.text.muted,fontFamily:DS.font.body,marginTop:2}}>Deleted profiles and candidates — restore anytime</div></div>
          <button type="button" onClick={()=>setView("kanban")} style={{background:DS.surface.sunken,border:"none",width:32,height:32,borderRadius:DS.radius.md,fontSize:14,cursor:"pointer",color:DS.text.faint}}>✕</button>
        </div>
        {!trashData.profiles.length&&!trashData.candidates.length&&!trashLoading&&<button type="button" onClick={loadTrash} style={{width:"100%",background:`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`,color:"#fff",border:"none",borderRadius:DS.radius.md,padding:14,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:DS.font.heading,boxShadow:DS.shadow.blue}}>Load Trash</button>}
        {trashLoading&&<Spinner text="Loading trash..."/>}
        {trashData.profiles.length>0&&<div style={{marginBottom:16}}>
          <div style={{fontSize:12,fontWeight:700,color:DS.text.muted,textTransform:"uppercase",letterSpacing:"0.04em",fontFamily:DS.font.heading,marginBottom:8}}>Profiles ({trashData.profiles.length})</div>
          {trashData.profiles.map(p=>(
            <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderRadius:DS.radius.lg,border:`1px solid ${DS.surface.border}`,marginBottom:6,background:DS.surface.page}}>
              <div><div style={{fontSize:13,fontWeight:600,color:DS.text.h1,fontFamily:DS.font.heading}}>{p.role} — {p.seniority}</div><div style={{fontSize:11,color:DS.text.muted,fontFamily:DS.font.body}}>{p.client_name} ({p.client_company}) · Deleted {new Date(p.deleted_at).toLocaleDateString()}</div></div>
              <button type="button" onClick={()=>restoreItem(p.id,"profiles")} style={{fontSize:11,background:"#059669",color:"#fff",border:"none",borderRadius:DS.radius.sm,padding:"6px 14px",cursor:"pointer",fontFamily:DS.font.heading,fontWeight:600}}>↩ Restore</button>
            </div>
          ))}
        </div>}
        {trashData.candidates.length>0&&<div>
          <div style={{fontSize:12,fontWeight:700,color:DS.text.muted,textTransform:"uppercase",letterSpacing:"0.04em",fontFamily:DS.font.heading,marginBottom:8}}>Candidates ({trashData.candidates.length})</div>
          {trashData.candidates.map(c=>(
            <div key={c.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderRadius:DS.radius.lg,border:`1px solid ${DS.surface.border}`,marginBottom:6,background:DS.surface.page}}>
              <div><div style={{fontSize:13,fontWeight:600,color:DS.text.h1,fontFamily:DS.font.heading}}>{c.name}</div><div style={{fontSize:11,color:DS.text.muted,fontFamily:DS.font.body}}>{c.email||"—"} · {c.seniority||"—"} · Deleted {new Date(c.deleted_at).toLocaleDateString()}</div></div>
              <button type="button" onClick={()=>restoreItem(c.id,"candidates")} style={{fontSize:11,background:"#059669",color:"#fff",border:"none",borderRadius:DS.radius.sm,padding:"6px 14px",cursor:"pointer",fontFamily:DS.font.heading,fontWeight:600}}>↩ Restore</button>
            </div>
          ))}
        </div>}
        {(trashData.profiles.length>0||trashData.candidates.length>0)&&<button type="button" onClick={loadTrash} style={{marginTop:12,fontSize:12,color:DS.text.muted,background:"none",border:`1px solid ${DS.surface.border}`,borderRadius:DS.radius.md,padding:"8px 16px",cursor:"pointer",fontFamily:DS.font.body,width:"100%"}}>↻ Refresh</button>}
      </div>
    </div>)}

    {copyToast&&<div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",zIndex:100,background:copyToast.includes("⚠️")?"#dc2626":"#0D2550",color:"#fff",padding:"12px 28px",borderRadius:12,fontSize:13,fontWeight:500,boxShadow:"0 8px 32px rgba(13,37,80,0.3)",animation:"fadeUp .3s both",maxWidth:"90vw",textAlign:"center"}}>{copyToast}</div>}
    <Footer/>
    </div>
    <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes float{0%,100%{transform:translate(0,0)}50%{transform:translate(20px,-15px)}}@keyframes shimmer{to{background-position:-200% 0}}input:focus,select:focus,textarea:focus{border-color:#1B6FE8!important;box-shadow:0 0 0 3px rgba(27,111,232,0.1)!important;outline:none}::placeholder{color:#CBD5E1!important}`}</style>
  </div>);
}

// ═══════════ AI CHAT (restricted, reusable) ═══════════
function AIChat({systemPrompt,placeholder,onExtract}){
  const[msgs,setMsgs]=useState([]);const[input,setInput]=useState("");const[loading,setLoading]=useState(false);const endRef=useRef(null);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:"smooth"})},[msgs]);

  const send=async()=>{
    if(!input.trim()||loading)return;
    const userMsg={role:"user",content:input.trim()};
    const newMsgs=[...msgs,userMsg];setMsgs(newMsgs);setInput("");setLoading(true);
    try{
      const reply=await callClaude(newMsgs,systemPrompt);
      setMsgs([...newMsgs,{role:"assistant",content:reply}]);
      if(onExtract)onExtract(reply);
    }catch(e){setMsgs([...newMsgs,{role:"assistant",content:"⚠️ "+e.message}])}finally{setLoading(false)}
  };

  return(<div style={{border:`1.5px solid ${DS.surface.border}`,borderRadius:DS.radius.xl,overflow:"hidden",background:"#fff",boxShadow:DS.shadow.sm}}>
    {/* Messages */}
    <div style={{maxHeight:300,overflowY:"auto",padding:"16px 18px",display:"flex",flexDirection:"column",gap:10,background:DS.surface.page}}>
      {!msgs.length&&<div style={{textAlign:"center",padding:20,color:DS.text.faint,fontSize:12,fontFamily:DS.font.body}}>Start typing to chat with AI assistant</div>}
      {msgs.map((m,i)=>(
        <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
          <div style={{maxWidth:"80%",padding:"10px 14px",borderRadius:m.role==="user"?`${DS.radius.lg}px ${DS.radius.lg}px 4px ${DS.radius.lg}px`:`${DS.radius.lg}px ${DS.radius.lg}px ${DS.radius.lg}px 4px`,background:m.role==="user"?`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`:"#fff",color:m.role==="user"?"#fff":DS.text.body,fontSize:13,fontFamily:DS.font.body,lineHeight:1.6,boxShadow:m.role==="user"?"none":DS.shadow.sm,border:m.role==="user"?"none":`1px solid ${DS.surface.border}`,whiteSpace:"pre-wrap"}}>{m.content}</div>
        </div>
      ))}
      {loading&&<div style={{display:"flex",gap:4,padding:"8px 14px"}}><div style={{width:6,height:6,borderRadius:"50%",background:DS.brand.blue700,animation:"pulseGlow 1s infinite"}}/>
        <div style={{width:6,height:6,borderRadius:"50%",background:DS.brand.blue700,animation:"pulseGlow 1s .2s infinite"}}/>
        <div style={{width:6,height:6,borderRadius:"50%",background:DS.brand.blue700,animation:"pulseGlow 1s .4s infinite"}}/></div>}
      <div ref={endRef}/>
    </div>
    {/* Input */}
    <div style={{display:"flex",gap:8,padding:"12px 16px",borderTop:`1px solid ${DS.surface.borderLight}`,background:"#fff"}}>
      <input type="text" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")send()}} placeholder={placeholder||"Type a message..."} style={{flex:1,border:`1.5px solid ${DS.surface.border}`,borderRadius:DS.radius.md,padding:"10px 14px",fontSize:13,fontFamily:DS.font.body,outline:"none",color:DS.text.body}}/>
      <button type="button" onClick={send} disabled={loading||!input.trim()} style={{background:input.trim()?`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`:DS.surface.sunken,color:input.trim()?"#fff":DS.text.faint,border:"none",borderRadius:DS.radius.md,padding:"10px 18px",fontSize:13,fontWeight:600,fontFamily:DS.font.heading,cursor:input.trim()?"pointer":"default",boxShadow:input.trim()?DS.shadow.blue:"none",transition:`all .2s ${DS.ease.snap}`}}>Send</button>
    </div>
  </div>);
}

// ═══════════ ANA MODULE ═══════════
const ANA_AUTH=()=>({"Authorization":`Bearer ${localStorage.getItem("sb-access-token")}`,"Content-Type":"application/json"});

function AnaModule({user}){
  const[ps,setPs]=useState([]);const[ld,setLd]=useState(true);const[selP,setSelP]=useState(null);
  const[view,setView]=useState("list");
  const[notes,setNotes]=useState("");const[softData,setSoftData]=useState(null);
  const[structuring,setStructuring]=useState(false);const[toast,setToast]=useState("");
  const[submitting,setSubmitting]=useState(false);
  const[sortBy,setSortBy]=useState("priority");const[filterClient,setFilterClient]=useState("all");
  const isMob=useW()<640;
  const show=(m)=>{setToast(m);setTimeout(()=>setToast(""),3500)};

  const filteredPs=ps.filter(p=>filterClient==="all"||p.client_company===filterClient).sort((a,b)=>{
    if(sortBy==="priority"){const pri=["new","pending_review","pending_soft","in_progress","sourcing","filled","closed"];return pri.indexOf(a.status)-pri.indexOf(b.status)}
    if(sortBy==="date")return new Date(b.created_at)-new Date(a.created_at);
    if(sortBy==="client")return(a.client_company||"").localeCompare(b.client_company||"");
    return 0;
  });
  const clients=[...new Set(ps.map(p=>p.client_company).filter(Boolean))];

  // Load profiles
  useEffect(()=>{
    (async()=>{try{const r=await fetch("/api/ana",{method:"POST",headers:ANA_AUTH(),body:JSON.stringify({action:"list_profiles"})});
      if(r.ok){const d=await r.json();if(Array.isArray(d))setPs(d)}}catch(e){console.warn("Ana load:",e)}finally{setLd(false)}})();
  },[]);

  // Structure soft skills with AI
  const structureSoftSkills=async()=>{
    if(!notes.trim())return;setStructuring(true);
    try{
      const pd=selP.profile_data||{};
      const context=`Role: ${selP.role} (${selP.category}, ${selP.seniority})\nMust Have: ${pd.mustHave?.join(", ")||"—"}\nMeeting notes:\n${notes}`;
      const raw=await callClaude([{role:"user",content:context}],AI_PROMPTS.ana_structure);
      console.log("Ana AI raw:",raw.substring(0,300));
      const parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());
      setSoftData(parsed);show("✅ Soft skills structured");
    }catch(e){console.error("Ana AI error:",e);show("⚠️ "+e.message)}finally{setStructuring(false)}
  };

  // Save soft skills
  const saveSoftSkills=async()=>{
    if(!softData||!selP)return;
    try{await fetch("/api/ana",{method:"POST",headers:ANA_AUTH(),body:JSON.stringify({action:"save_soft_skills",id:selP.id,soft_skills:{...softData,rawNotes:notes}})});
      show("✅ Soft skills saved")}catch(e){show("⚠️ Save failed")}
  };

  // Submit to admin
  const submitToAdmin=async()=>{
    if(!selP)return;setSubmitting(true);
    try{
      // Save soft skills first
      if(softData)await fetch("/api/ana",{method:"POST",headers:ANA_AUTH(),body:JSON.stringify({action:"save_soft_skills",id:selP.id,soft_skills:{...softData,rawNotes:notes}})});
      // Regenerate PDF with soft skills
      const pd=selP.profile_data||{};const fullP={...pd,softSkills:softData};
      const html=await buildPDF(fullP,{name:selP.client_name,company:selP.client_company,email:selP.client_email});
      // Submit
      await fetch("/api/ana",{method:"POST",headers:ANA_AUTH(),body:JSON.stringify({action:"submit_to_admin",id:selP.id,pdf_html:html})});
      setPs(p=>p.map(x=>x.id===selP.id?{...x,status:"in_progress"}:x));
      show("✅ Submitted to Admin!");setView("list");setSelP(null);setSoftData(null);setNotes("");
    }catch(e){show("⚠️ Submit failed: "+e.message)}finally{setSubmitting(false)}
  };

  const statusBadge=(s)=>{const c=STATUS_COLORS[s]||"#64748b";return{fontSize:10,fontWeight:600,color:c,background:`${c}15`,padding:"3px 10px",borderRadius:DS.radius.pill,fontFamily:DS.font.body}};

  if(ld)return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:DS.surface.sunken}}><Spinner text="Loading profiles..."/></div>;

  return(<div style={{minHeight:"100vh",background:`linear-gradient(160deg,#F3F0FF,#EDE9FE 30%,${DS.surface.page})`,fontFamily:DS.font.body,display:"flex",flexDirection:"column"}}>
    {toast&&<div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",zIndex:100,background:toast.includes("⚠️")?"#dc2626":DS.brand.navy900,color:"#fff",padding:"12px 28px",borderRadius:DS.radius.lg,fontSize:13,fontWeight:500,boxShadow:DS.shadow.lg,animation:"fadeUp .3s both",maxWidth:"90vw",textAlign:"center",zIndex:100}}>{toast}</div>}
    {/* Header — purple accent for Ana */}
    <div style={{background:"linear-gradient(135deg,#2E1065,#5B21B6,#7C3AED)",padding:"0",position:"relative",overflow:"hidden"}}>
      <HeaderBG/>
      <div style={{maxWidth:900,margin:"0 auto",padding:"18px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"relative",zIndex:1}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <span style={{fontSize:22,fontWeight:800,color:"#fff",letterSpacing:1.5,fontFamily:DS.font.heading}}>BOZ<span style={{color:"#c084fc"}}>.</span></span>
          <div style={{height:20,width:1,background:"rgba(255,255,255,0.15)"}}/>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:34,height:34,borderRadius:DS.radius.md,background:"rgba(255,255,255,0.1)",display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid rgba(255,255,255,0.15)",position:"relative"}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="7" r="4"/>
                <path d="M5.5 21v-2a5.5 5.5 0 0111 0v2"/>
                <text x="18" y="18" fill="rgba(192,132,252,0.9)" fontSize="10" fontWeight="700" fontFamily="serif" stroke="none">Ψ</text>
              </svg>
            </div>
            <div><div style={{fontSize:12,fontWeight:600,color:"#fff",fontFamily:DS.font.heading}}>Talent Discovery</div><div style={{fontSize:9,color:"rgba(192,132,252,0.7)",fontFamily:DS.font.body,letterSpacing:1}}>Soft Skills Analyst</div></div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:12,color:"rgba(255,255,255,0.7)",fontFamily:DS.font.body}}>{user.email}</span>
          <button onClick={signOut} type="button" style={{fontSize:11,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:DS.radius.md,padding:"7px 14px",color:"rgba(255,255,255,0.7)",cursor:"pointer",fontFamily:DS.font.body}}>Sign Out</button>
        </div>
      </div>
    </div>

    <div style={{maxWidth:900,margin:"0 auto",padding:"24px",flex:1,width:"100%"}}>
      {view==="list"&&(<div style={{animation:"fadeUp .3s both"}}>
        <div style={{fontSize:20,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading,marginBottom:4}}>Profile Requests</div>
        <div style={{fontSize:13,color:DS.text.muted,fontFamily:DS.font.body,marginBottom:16}}>Select a profile to add soft skills from your client meeting</div>
        {/* Sort & Filter */}
        <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{fontSize:12,border:`1.5px solid ${DS.surface.border}`,borderRadius:DS.radius.sm,padding:"7px 12px",fontFamily:DS.font.body,color:DS.text.body,background:"#fff",cursor:"pointer"}}>
            <option value="priority">Sort: Priority</option><option value="date">Sort: Newest</option><option value="client">Sort: Client</option>
          </select>
          <select value={filterClient} onChange={e=>setFilterClient(e.target.value)} style={{fontSize:12,border:`1.5px solid ${DS.surface.border}`,borderRadius:DS.radius.sm,padding:"7px 12px",fontFamily:DS.font.body,color:DS.text.body,background:"#fff",cursor:"pointer"}}>
            <option value="all">All clients ({ps.length})</option>
            {clients.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {!filteredPs.length?<div style={{textAlign:"center",padding:48,color:DS.text.faint}}><div style={{fontSize:44,marginBottom:10}}>📋</div><div style={{fontSize:14,fontFamily:DS.font.heading,fontWeight:600}}>No profiles yet</div></div>
        :filteredPs.map((p,idx)=>{
          const hasSoft=!!p.profile_data?.softSkills;
          return(<div key={p.id} onClick={()=>{setSelP(p);setSoftData(p.profile_data?.softSkills||null);setNotes(p.profile_data?.softSkills?.rawNotes||"");setView("detail")}}
            style={{background:"#fff",borderRadius:DS.radius.lg,padding:"18px 22px",marginBottom:10,border:`1px solid ${DS.surface.border}`,cursor:"pointer",transition:`all .25s ${DS.ease.snap}`,boxShadow:DS.shadow.sm,animation:`fadeUp .3s ${idx*0.04}s both`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}
            onMouseEnter={e=>{e.currentTarget.style.boxShadow=DS.shadow.md;e.currentTarget.style.transform="translateY(-2px)"}}
            onMouseLeave={e=>{e.currentTarget.style.boxShadow=DS.shadow.sm;e.currentTarget.style.transform="none"}}>
            <div>
              <div style={{fontSize:15,fontWeight:600,color:DS.text.h1,fontFamily:DS.font.heading}}>{p.role} — {p.seniority}</div>
              <div style={{fontSize:12,color:DS.text.muted,fontFamily:DS.font.body,marginTop:2}}>{p.client_name} ({p.client_company}) · {p.category}</div>
              <div style={{fontSize:11,color:DS.text.faint,fontFamily:DS.font.body,marginTop:4}}>{new Date(p.created_at).toLocaleDateString()}</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {hasSoft&&<span style={{fontSize:10,background:"#dcfce7",color:"#059669",padding:"3px 10px",borderRadius:DS.radius.pill,fontWeight:600,fontFamily:DS.font.body}}>✓ Soft skills</span>}
              <span style={statusBadge(p.status)}>{STATUS_LABELS[p.status]||"New"}</span>
            </div>
          </div>)})
        }
      </div>)}

      {view==="detail"&&selP&&(<div style={{animation:"fadeUp .3s both"}}>
        <button type="button" onClick={()=>{setView("list");setSelP(null)}} style={{fontSize:12,color:"#7C3AED",background:"none",border:"none",cursor:"pointer",fontFamily:DS.font.heading,fontWeight:600,marginBottom:16}}>← Back to Profiles</button>

        {/* BLOCKED: Waiting for recruiter */}
        {["new","pending_review"].includes(selP.status)&&(
          <div style={{background:"linear-gradient(135deg,#FFF7ED,#FFEDD5)",borderRadius:DS.radius.xl,padding:"32px",textAlign:"center",border:"1.5px solid #FDBA74",marginBottom:20}}>
            <div style={{fontSize:40,marginBottom:12}}>⏳</div>
            <div style={{fontSize:16,fontWeight:700,color:"#C2410C",fontFamily:DS.font.heading}}>Waiting for Recruiter Approval</div>
            <div style={{fontSize:13,color:"#9A3412",fontFamily:DS.font.body,marginTop:8,lineHeight:1.6}}>This profile has not been reviewed by the Recruiter yet.<br/>You will be able to add soft skills once the Recruiter approves it.</div>
            <div style={{display:"inline-flex",alignItems:"center",gap:6,marginTop:16,background:"#fff",padding:"8px 16px",borderRadius:DS.radius.pill,fontSize:12,color:"#9A3412",fontFamily:DS.font.body,border:"1px solid #FED7AA"}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:"#f97316",animation:"pulseGlow 2s infinite"}}/>
              Status: {STATUS_LABELS[selP.status]||"Pending"}
            </div>
          </div>
        )}

        {/* ACTIVE: Recruiter has approved */}
        {!["new","pending_review"].includes(selP.status)&&(<>
        {/* Profile header */}
        <div style={{background:"linear-gradient(135deg,#2E1065,#5B21B6,#7C3AED)",borderRadius:DS.radius.xxl,padding:"24px 28px",color:"#fff",marginBottom:20,position:"relative",overflow:"hidden",boxShadow:DS.shadow.lg}}>
          <HeaderBG/>
          <div style={{position:"relative",zIndex:1}}>
            <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:3,opacity:.4,fontFamily:DS.font.body}}>Profile Review</div>
            <div style={{fontSize:22,fontWeight:800,marginTop:6,fontFamily:DS.font.heading,letterSpacing:"-0.02em"}}>{selP.role} — {selP.seniority}</div>
            <div style={{fontSize:13,opacity:.65,marginTop:4,fontFamily:DS.font.body}}>{selP.category} · {selP.experience} · {selP.client_name}</div>
            <div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}>
              {(selP.profile_data?.mustHave||[]).map(t=><span key={t} style={{background:"rgba(255,255,255,0.12)",padding:"4px 12px",borderRadius:DS.radius.pill,fontSize:10,border:"1px solid rgba(255,255,255,0.1)"}}>{t}</span>)}
            </div>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:isMob?"1fr":"1fr 1fr",gap:20}}>
          {/* Left: Hard skills summary */}
          <div>
            <div style={{fontSize:13,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading,marginBottom:12}}>Technical Profile (Hard Skills)</div>
            <div style={{background:"#fff",borderRadius:DS.radius.lg,padding:"16px 20px",border:`1px solid ${DS.surface.border}`,boxShadow:DS.shadow.sm,fontSize:12,color:DS.text.body,fontFamily:DS.font.body}}>
              {selP.profile_data?.techStack?.languages?.length>0&&<div style={{marginBottom:6}}><strong>Languages:</strong> {selP.profile_data.techStack.languages.join(", ")}</div>}
              {selP.profile_data?.techStack?.frameworks?.length>0&&<div style={{marginBottom:6}}><strong>Frameworks:</strong> {selP.profile_data.techStack.frameworks.join(", ")}</div>}
              {selP.profile_data?.techStack?.clouds?.length>0&&<div style={{marginBottom:6}}><strong>Cloud:</strong> {selP.profile_data.techStack.clouds.join(", ")}</div>}
              {selP.profile_data?.techStack?.databases?.length>0&&<div style={{marginBottom:6}}><strong>DBs:</strong> {selP.profile_data.techStack.databases.join(", ")}</div>}
              {selP.profile_data?.techStack?.devopsTools?.length>0&&<div style={{marginBottom:6}}><strong>DevOps:</strong> {selP.profile_data.techStack.devopsTools.join(", ")}</div>}
              {selP.profile_data?.techStack?.profTools?.length>0&&<div><strong>Tools:</strong> {selP.profile_data.techStack.profTools.join(", ")}</div>}
              {selP.profile_data?.aiObjective&&<div style={{marginTop:12,paddingTop:10,borderTop:`1px solid ${DS.surface.borderLight}`}}><strong>Role Objective:</strong><p style={{marginTop:4,lineHeight:1.6,color:DS.text.muted}}>{selP.profile_data.aiObjective}</p></div>}
            </div>
          </div>

          {/* Right: Soft skills input */}
          <div>
            {/* Recruiter's review — ALWAYS shown if exists */}
            {selP.profile_data?.recruiterReview&&(
              <div style={{background:"#FFF7ED",borderRadius:DS.radius.lg,padding:"16px 18px",marginBottom:16,border:"1.5px solid #FDBA74",boxShadow:"0 2px 8px rgba(249,115,22,0.08)"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <div style={{width:28,height:28,borderRadius:DS.radius.sm,background:"#EA580C",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🔍</div>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:"#C2410C",fontFamily:DS.font.heading}}>Recruiter Review</div>
                    <div style={{fontSize:10,color:"#9A3412",fontFamily:DS.font.body}}>
                      {selP.profile_data.recruiterReview.reviewedBy||"Recruiter"} · {selP.profile_data.recruiterReview.reviewedAt?new Date(selP.profile_data.recruiterReview.reviewedAt).toLocaleDateString():""}
                    </div>
                  </div>
                </div>
                {/* Notes */}
                {selP.profile_data.recruiterReview.notes&&(
                  <div style={{padding:"10px 12px",background:"rgba(255,255,255,0.7)",borderRadius:DS.radius.sm,fontSize:12,color:"#7C2D12",fontFamily:DS.font.body,lineHeight:1.6,marginBottom:selP.profile_data.recruiterReview.questionsForAna?.length?10:0}}>
                    <strong style={{color:"#EA580C"}}>Notes:</strong> {selP.profile_data.recruiterReview.notes}
                  </div>
                )}
                {/* Questions */}
                {selP.profile_data.recruiterReview.questionsForAna?.length>0&&(
                  <div>
                    <div style={{fontSize:11,fontWeight:600,color:"#C2410C",marginBottom:6,fontFamily:DS.font.heading}}>Questions to ask the client:</div>
                    {selP.profile_data.recruiterReview.questionsForAna.map((q,i)=>(
                      <div key={i} style={{fontSize:12,color:"#7C2D12",fontFamily:DS.font.body,padding:"6px 0",borderBottom:i<selP.profile_data.recruiterReview.questionsForAna.length-1?"1px solid #FED7AA":"none",lineHeight:1.5}}>
                        <span style={{fontWeight:700,color:"#EA580C",marginRight:6}}>{i+1}.</span>{q}
                      </div>
                    ))}
                  </div>
                )}
                {/* If no notes and no questions */}
                {!selP.profile_data.recruiterReview.notes&&!selP.profile_data.recruiterReview.questionsForAna?.length&&(
                  <div style={{fontSize:12,color:"#9A3412",fontFamily:DS.font.body,fontStyle:"italic"}}>Recruiter accepted without additional notes.</div>
                )}
              </div>
            )}
            {/* If pending_soft but no recruiter review yet */}
            {selP.status==="pending_soft"&&!selP.profile_data?.recruiterReview&&(
              <div style={{background:"#FFF7ED",borderRadius:DS.radius.lg,padding:"14px 16px",marginBottom:16,border:"1px dashed #FDBA74",fontSize:12,color:"#9A3412",fontFamily:DS.font.body}}>
                ⓘ This profile was sent to you without recruiter review notes.
              </div>
            )}

            <div style={{fontSize:13,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading,marginBottom:12}}>Soft Skills (Meeting Notes)</div>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={6} placeholder="Paste your meeting notes here... Describe the candidate's personality, work style, communication skills, leadership traits, cultural fit, and any behavioral observations from the client meeting." style={{width:"100%",border:`1.5px solid ${DS.surface.border}`,borderRadius:DS.radius.lg,padding:"14px 16px",fontSize:13,fontFamily:DS.font.body,outline:"none",resize:"vertical",color:DS.text.body,lineHeight:1.6,background:"#fff"}}/>
            <button type="button" onClick={structureSoftSkills} disabled={structuring||!notes.trim()} style={{marginTop:10,width:"100%",background:notes.trim()?"linear-gradient(135deg,#5B21B6,#7C3AED)":DS.surface.sunken,color:notes.trim()?"#fff":DS.text.faint,border:"none",borderRadius:DS.radius.md,padding:"12px",fontSize:13,fontWeight:600,fontFamily:DS.font.heading,cursor:notes.trim()?"pointer":"default",boxShadow:notes.trim()?"0 4px 16px rgba(124,58,237,0.25)":"none",transition:`all .2s ${DS.ease.snap}`}}>{structuring?"🧠 Structuring with AI...":"🧠 Structure with AI"}</button>

            {/* AI Chat for follow-up questions */}
            <div style={{marginTop:16}}>
              <div style={{fontSize:11,fontWeight:600,color:DS.text.muted,fontFamily:DS.font.body,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.04em"}}>AI Assistant (Soft Skills)</div>
              <AIChat systemPrompt={AI_PROMPTS.ana_chat} placeholder="Ask about soft skills structuring..."/>
            </div>
          </div>
        </div>

        {/* Structured soft skills preview */}
        {softData&&(<div style={{marginTop:24,background:"#fff",borderRadius:DS.radius.xl,padding:"24px 28px",border:`1px solid ${DS.surface.border}`,boxShadow:DS.shadow.sm,animation:"fadeUp .3s both"}}>
          <div style={{fontSize:14,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading,marginBottom:16}}>Structured Soft Skills</div>
          <div style={{display:"grid",gridTemplateColumns:isMob?"1fr":"1fr 1fr",gap:16}}>
            {softData.personality?.length>0&&<div><div style={{fontSize:10,fontWeight:700,color:"#7C3AED",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:6,fontFamily:DS.font.heading}}>Personality</div><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{softData.personality.map(t=><span key={t} style={{background:"#F3F0FF",color:"#5B21B6",padding:"3px 10px",borderRadius:DS.radius.pill,fontSize:11,fontFamily:DS.font.body}}>{t}</span>)}</div></div>}
            {softData.workStyle?.length>0&&<div><div style={{fontSize:10,fontWeight:700,color:"#0369a1",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:6,fontFamily:DS.font.heading}}>Work Style</div><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{softData.workStyle.map(t=><span key={t} style={{background:DS.brand.blue50,color:DS.brand.blue700,padding:"3px 10px",borderRadius:DS.radius.pill,fontSize:11,fontFamily:DS.font.body}}>{t}</span>)}</div></div>}
            {softData.keyStrengths?.length>0&&<div><div style={{fontSize:10,fontWeight:700,color:"#059669",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:6,fontFamily:DS.font.heading}}>Key Strengths</div><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{softData.keyStrengths.map(t=><span key={t} style={{background:"#f0fdf4",color:"#059669",padding:"3px 10px",borderRadius:DS.radius.pill,fontSize:11,fontFamily:DS.font.body}}>{t}</span>)}</div></div>}
            {softData.cultureFit?.length>0&&<div><div style={{fontSize:10,fontWeight:700,color:"#d97706",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:6,fontFamily:DS.font.heading}}>Culture Fit</div><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{softData.cultureFit.map(t=><span key={t} style={{background:"#FEFCE8",color:"#92400E",padding:"3px 10px",borderRadius:DS.radius.pill,fontSize:11,fontFamily:DS.font.body}}>{t}</span>)}</div></div>}
          </div>
          {softData.softSkillsSummary&&<div style={{marginTop:16,padding:"14px 18px",background:DS.surface.page,borderRadius:DS.radius.lg,fontSize:13,color:DS.text.body,fontFamily:DS.font.body,lineHeight:1.6}}><strong>Summary:</strong> {softData.softSkillsSummary}</div>}

          <div style={{display:"flex",gap:12,marginTop:20}}>
            <button type="button" onClick={saveSoftSkills} style={{flex:1,background:"#fff",color:DS.text.h2,border:`1.5px solid ${DS.surface.border}`,borderRadius:DS.radius.md,padding:"12px",fontSize:13,fontWeight:600,fontFamily:DS.font.heading,cursor:"pointer",boxShadow:DS.shadow.sm}}>💾 Save Draft</button>
            <button type="button" onClick={submitToAdmin} disabled={submitting} style={{flex:2,background:"linear-gradient(135deg,#2E1065,#7C3AED)",color:"#fff",border:"none",borderRadius:DS.radius.md,padding:"12px",fontSize:14,fontWeight:700,fontFamily:DS.font.heading,cursor:submitting?"wait":"pointer",boxShadow:"0 4px 20px rgba(124,58,237,0.3)",opacity:submitting?.7:1}}>{submitting?"⏳ Submitting...":"🚀 Submit to Admin"}</button>
          </div>
        </div>)}
        </>)}{/* end recruiter-approved content */}
      </div>)}
    </div>
    <Footer/>
    <FloatingAssistant context={{module:"Ana - Soft Skills",profile:selP?`${selP.role} ${selP.seniority}`:"none"}}/>
    <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes pulseGlow{0%,100%{box-shadow:0 0 0 0 rgba(124,58,237,0.4)}50%{box-shadow:0 0 0 6px rgba(124,58,237,0)}}`}</style>
  </div>);
}
export default function App(){
  const[auth,setAuth]=useState(null);const[userRole,setUserRole]=useState(null);const[aLd,setALd]=useState(true);
  useEffect(()=>{
    const h=window.location.hash;if(h.includes("access_token")){const p=new URLSearchParams(h.substring(1));const at=p.get("access_token"),rt=p.get("refresh_token");if(at){localStorage.setItem("sb-access-token",at);if(rt)localStorage.setItem("sb-refresh-token",rt);window.location.hash=""}}
    const token=localStorage.getItem("sb-access-token");
    if(!token){setALd(false);return}
    // Resolve role via API
    (async()=>{
      try{
        const r=await fetch("/api/auth",{method:"POST",headers:{"Authorization":`Bearer ${token}`,"Content-Type":"application/json"}});
        if(r.ok){const d=await r.json();setAuth({user:{email:d.email,id:d.id},token});setUserRole(d.role)}
        else{localStorage.removeItem("sb-access-token");localStorage.removeItem("sb-refresh-token")}
      }catch{
        // Fallback: try session directly
        let s=await getSess();if(!s)s=await refresh();
        if(s){setAuth(s);setUserRole("client")}
      }
      setALd(false);
    })();
  },[]);
  if(aLd)return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#070B14"}}><Spinner text="Loading..."/></div>;
  if(!auth)return<Login/>;
  // Route by role
  if(userRole==="admin")return<Admin user={{...auth.user,role:"admin"}}/>;
  if(userRole==="recruiter")return<Admin user={{...auth.user,role:"recruiter"}}/>;
  if(userRole==="ana")return<AnaModule user={{...auth.user,role:"ana"}}/>;
  if(userRole==="sales")return<SalesModule user={{...auth.user,role:"sales"}}/>;
  if(userRole==="finance")return<FinanceModule user={{...auth.user,role:"finance"}}/>;
  return<ClientForm user={auth.user}/>;
}

// ═══════════ CLIENT FORM ═══════════
function ClientForm({user}){
  const width=useW();const isMob=width<640;const isTab=width<900;
  const[step,setStep]=useState(0);const[dir,setDir]=useState(1);const[ak,setAk]=useState(0);
  const[toast,setToast]=useState("");const[myPs,setMyPs]=useState([]);const[showH,setShowH]=useState(false);

  const[cName,setCName]=useState("");const[cComp,setCComp]=useState("");const cEmail=user.email;
  const[upFile,setUpFile]=useState(null);const[anzing,setAnzing]=useState(false);const[anl,setAnl]=useState(null);const[upErr,setUpErr]=useState("");const fRef=useRef(null);
  const[missingFields,setMissingFields]=useState([]); // fields AI couldn't extract
  const[cat,setCat]=useState("");const[role,setRole]=useState("");const[cRole,setCRole]=useState("");const[rSrch,setRSrch]=useState("");
  const[sen,setSen]=useState("");const[exp,setExp]=useState("");const[hc,setHc]=useState(1);
  const[eng,setEng]=useState("");const[sTime,setSTime]=useState("9:00");const[eTime,setETime]=useState("17:00");const[wHrs,setWHrs]=useState(40);const[tz,setTz]=useState("");
  const[langs,setLangs]=useState([]);const[vers,setVers]=useState({});const[fws,setFws]=useState([]);const[fwVers,setFwVers]=useState({});
  const[clds,setClds]=useState([]);const[cldSvcs,setCldSvcs]=useState([]);const[otherCloud,setOtherCloud]=useState("");
  const[dbs,setDbs]=useState([]);const[dbVers,setDbVers]=useState({});const[dvps,setDvps]=useState([]);const[dvpVers,setDvpVers]=useState({});
  const[erps,setErps]=useState([]);const[erpVers,setErpVers]=useState({});const[qas,setQas]=useState([]);const[oTech,setOTech]=useState("");
  const[mh,setMh]=useState([]);const[nh,setNh]=useState([]);const[showAll,setShowAll]=useState(false);
  const[engl,setEngl]=useState("");const[loc,setLoc]=useState("");const[acad,setAcad]=useState("");const[certs,setCerts]=useState("");
  const[meths,setMeths]=useState([]);const[inds,setInds]=useState([]);
  const[aiTs,setAiTs]=useState([]);const[otherAI,setOtherAI]=useState("");
  const[profTools,setProfTools]=useState([]); // professional tools for non-tech categories
  const[visa,setVisa]=useState("");const[travel,setTravel]=useState("");const[notes,setNotes]=useState("");
  const[sDate,setSDate]=useState("");const[holCo,setHolCo]=useState("");
  const[subm,setSubm]=useState(false);const[done,setDone]=useState(false);const[pdfL,setPdfL]=useState("");
  const[hardPct,setHardPct]=useState(70);
  const[aiObjective,setAiObjective]=useState("");const[aiResponsibilities,setAiResponsibilities]=useState([]);const[aiSoftSkills,setAiSoftSkills]=useState([]);
  const[aiGenerating,setAiGenerating]=useState(false);const[aiGenerated,setAiGenerated]=useState(false);
  const[aiSuggestions,setAiSuggestions]=useState([]);const[suggestLoading,setSuggestLoading]=useState(false);const[dismissedSugg,setDismissedSugg]=useState([]);

  useEffect(()=>{getMyProfiles().then(setMyPs).catch(()=>{})},[user.id]);
  const show=(m)=>{setToast(m);setTimeout(()=>setToast(""),3500)};
  const allT=[...langs,...fws,...clds,...dbs,...dvps,...erps,...qas,...profTools];
  const fRole=role==="__custom"?cRole:role;
  const catO=CATEGORIES.find(c=>c.id===cat);
  const go=(n)=>{setDir(n>step?1:-1);setStep(n);setAk(k=>k+1);window.scrollTo({top:0,behavior:"smooth"});
    if(n===7&&!aiGenerated&&!aiGenerating&&fRole){setTimeout(()=>generateAI(),300)}
  };
  const allV={...vers,...fwVers,...dbVers,...dvpVers,...erpVers};
  const cl={name:cName,company:cComp,email:cEmail};
  const schedStr=eng==="By Hours"?`${wHrs}h/week`:eng?`${eng} · ${sTime} - ${eTime} (${tz})`:"";

  const buildP=()=>({category:catO?.label||cat,role:fRole,seniority:sen,experience:exp,headcount:hc,
    engagement:eng,schedule:schedStr,timezone:tz,startDate:sDate,
    techStack:{languages:langs,frameworks:fws,clouds:clds,cloudServices:cldSvcs,databases:dbs,devopsTools:dvps,erpTech:erps,qaTools:qas,profTools:profTools,otherTech:oTech},
    versions:allV,mustHave:mh,niceToHave:nh,englishLevel:engl,location:loc,academia:acad,certifications:certs,
    methodology:meths.join(", "),industry:inds.join(", "),aiTools:[...aiTs,...(otherAI?[otherAI]:[])],visaUsa:visa,
    travelAvailability:travel,additionalNotes:notes,holidayCountry:holCo,
    aiObjective,aiResponsibilities,aiSoftSkills,
    client:cl,createdAt:new Date().toISOString()});

  // Auto-generate Role Objective + Responsibilities with AI
  const generateAI=async()=>{
    if(aiGenerating)return;setAiGenerating(true);show("🧠 Generating...");
    try{
      const isProfCat=usesProfTools(cat);
      const stackInfo=isProfCat
        ?`Professional Tools: ${profTools.join(", ")||"none selected"}`
        :`Languages: ${langs.join(", ")||"none"}. Frameworks: ${fws.join(", ")||"none"}. Cloud: ${clds.join(", ")||"none"}. DB: ${dbs.join(", ")||"none"}. DevOps: ${dvps.join(", ")||"none"}.`;
      const prompt=`Role: ${sen} ${fRole} (${catO?.label||cat})\nExperience: ${exp}\n${stackInfo}\nMust Have: ${mh.join(", ")||"none"}\nNice to Have: ${nh.join(", ")||"none"}\nIndustry: ${inds.join(", ")||"any"}. Location: ${loc||"any"}. English: ${engl||"any"}. Methodology: ${meths.join(", ")||"any"}.`;
      console.log("AI Generate prompt:",prompt.substring(0,200));
      const raw=await callClaude([{role:"user",content:prompt}],AI_PROMPTS.auto_responsibilities);
      console.log("AI raw response:",raw.substring(0,200));
      const parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());
      if(parsed.objective)setAiObjective(parsed.objective);
      if(parsed.responsibilities?.length)setAiResponsibilities(parsed.responsibilities);
      if(parsed.softSkills?.length)setAiSoftSkills(parsed.softSkills);
      setAiGenerated(true);show("✅ AI generated successfully!");
    }catch(e){console.error("AI generation error:",e);show("⚠️ AI generation failed: "+e.message)}finally{setAiGenerating(false)}
  };

  // Re-generate with AI
  const regenerateAI=()=>{setAiGenerated(false);generateAI()};

  // ═══ PHASE 2: INTELLIGENT SUGGESTIONS ═══
  const fetchSuggestions=async(extracted)=>{
    setSuggestLoading(true);setAiSuggestions([]);setDismissedSugg([]);
    try{
      const ctx=JSON.stringify({role:extracted.role,category:extracted.category,seniority:extracted.seniority,
        languages:extracted.languages,frameworks:extracted.frameworks,clouds:extracted.clouds,
        cloudServices:extracted.cloudServices,databases:extracted.databases,devops:extracted.devops,
        mustHave:extracted.mustHave,niceToHave:extracted.niceToHave,methodology:extracted.methodology,
        industry:extracted.industry});
      const raw=await callClaude([{role:"user",content:`Extracted profile:\n${ctx}\n\nAnalyze gaps and suggest completions.`}],AI_PROMPTS.suggest_completions);
      const parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());
      if(parsed.suggestions?.length)setAiSuggestions(parsed.suggestions);
    }catch(e){console.warn("Suggestions error:",e.message)}finally{setSuggestLoading(false)}
  };
  const acceptSuggestion=(sugg)=>{
    const items=sugg.items||[];
    switch(sugg.category){
      case"databases":setDbs(p=>[...new Set([...p,...items])]);break;
      case"devops":setDvps(p=>[...new Set([...p,...items])]);break;
      case"frameworks":setFws(p=>[...new Set([...p,...items])]);break;
      case"clouds":setClds(p=>[...new Set([...p,...items])]);break;
      case"cloudServices":setCldSvcs(p=>[...new Set([...p,...items])]);break;
      case"languages":setLangs(p=>[...new Set([...p,...items])]);break;
      case"qaTools":setQas(p=>[...new Set([...p,...items])]);break;
      case"methodology":setMeths(p=>[...new Set([...p,...items])]);break;
      default:break;
    }
    setNh(p=>[...new Set([...p,...items])]);
    setDismissedSugg(p=>[...p,sugg.category+items.join(",")]);
    show(`✅ Added: ${items.join(", ")}`);
  };
  const dismissSuggestion=(sugg)=>{setDismissedSugg(p=>[...p,sugg.category+(sugg.items||[]).join(",")]);};

  const tMH=(i)=>{if(mh.includes(i)){setMh(p=>p.filter(x=>x!==i));return}setNh(p=>p.filter(x=>x!==i));setMh(p=>[...p,i])};
  const tNH=(i)=>{if(nh.includes(i)){setNh(p=>p.filter(x=>x!==i));return}setMh(p=>p.filter(x=>x!==i));setNh(p=>[...p,i])};

  const handleSubmit=async()=>{setSubm(true);const p=buildP();try{const html=await buildPDF(p,cl);const r=await saveToDB(p,cl,html);setPdfL(`${BASE_URL}/api/pdf/${r.id}`);setDone(true);try{await sendEmail(p,cl)}catch{};show("✅ Submitted!")}catch(e){show("⚠️ "+e.message)}finally{setSubm(false)}};
  const handlePreview=async()=>{show("⏳ Generating...");try{const h=await buildPDF(buildP(),cl);const w=window.open("");if(w){w.document.write(h);w.document.close()}}catch(e){show("⚠️ "+e.message)}};

  const handleUpload=async(file)=>{if(!file)return;if(file.size>10*1024*1024){setUpErr("Max 10MB.");return}if(!["application/pdf","image/png","image/jpeg","image/webp"].includes(file.type)){setUpErr("PDF, PNG, or JPG.");return}setUpFile(file);setUpErr("");setAnzing(true);setAnl(null);try{const b=await new Promise((r,j)=>{const f=new FileReader();f.onload=()=>r(f.result.split(",")[1]);f.onerror=j;f.readAsDataURL(file)});setAnl(JSON.parse((await analyzeDoc(b,file.type)).replace(/```json|```/g,"").trim()))}catch(e){setUpErr("Error: "+e.message)}finally{setAnzing(false)}};
  const applyAnl=(a)=>{
    // Apply all extracted fields
    if(a.category){setCat(a.category);if(a.role)setRole(a.role)}
    if(a.seniority)setSen(a.seniority);
    if(a.experience)setExp(a.experience);
    if(a.languages?.length)setLangs(a.languages.filter(l=>ALL_LANGS[l]||true));
    if(a.frameworks?.length)setFws(a.frameworks);
    if(a.clouds?.length)setClds(a.clouds.filter(c=>Object.keys(CLOUD_SERVICES).includes(c)));
    if(a.databases?.length)setDbs(a.databases.filter(d=>DBS.includes(d)));
    if(a.devops?.length)setDvps(a.devops.filter(d=>DEVOPS.includes(d)));
    if(a.mustHave?.length)setMh(a.mustHave);
    if(a.niceToHave?.length)setNh(a.niceToHave);
    if(a.englishLevel)setEngl(a.englishLevel);
    if(a.methodology?.length)setMeths(a.methodology.filter(m=>METHODOLOGIES.includes(m)));
    if(a.industry?.length)setInds(a.industry.filter(i=>INDUSTRIES.includes(i)));
    if(a.location)setLoc(a.location);
    if(a.engagement)setEng(a.engagement);
    if(a.headcount)setHc(parseInt(a.headcount)||1);
    if(a.certifications)setCerts(a.certifications);
    if(a.cloudServices?.length)setCldSvcs(a.cloudServices);
    if(a.extractedDetails?.timezone)setTz(a.extractedDetails.timezone);
    if(a.extractedDetails?.startDate)setSDate(a.extractedDetails.startDate);
    if(a.extractedDetails?.academia)setAcad(a.extractedDetails.academia);
    if(a.extractedDetails?.visa)setVisa(a.extractedDetails.visa);
    if(a.extractedDetails?.travel)setTravel(a.extractedDetails.travel);
    if(a.extractedDetails?.holidayCountry)setHolCo(a.extractedDetails.holidayCountry);
    if(a.responsibilities?.length){setAiResponsibilities(a.responsibilities);setAiGenerated(true)}
    if(a.roleObjective){setAiObjective(a.roleObjective);setAiGenerated(true)}

    // ═══ INTELLIGENT MISSING FIELD DETECTION ═══
    const missing=[];
    if(!a.seniority)missing.push("seniority");
    if(!a.experience)missing.push("experience");
    if(!a.englishLevel)missing.push("englishLevel");
    if(!a.location)missing.push("location");
    if(!a.engagement)missing.push("engagement");
    if(!a.extractedDetails?.timezone)missing.push("timezone");
    if(!a.headcount||a.headcount<=0)missing.push("headcount");
    if(!a.methodology?.length)missing.push("methodology");
    if(!a.extractedDetails?.startDate)missing.push("startDate");
    if(!a.industry?.length)missing.push("industry");
    if(!a.extractedDetails?.visa)missing.push("visa");
    if(!a.extractedDetails?.travel)missing.push("travel");
    if(!a.extractedDetails?.holidayCountry)missing.push("holiday");

    // Technical fields — context-aware
    const roleType=ROLE_TYPE[a.role];
    const isBackend=["backend","fullstack","dba","data","data_science"].includes(roleType);
    const isDevOps=["devops","backend","fullstack"].includes(roleType);
    const needsDB=isBackend&&(!a.databases||!a.databases.length);
    const needsDevOps=isDevOps&&(!a.devops||!a.devops.length);
    const needsCloud=!a.clouds?.length;

    // Version detection — if languages found, ask for versions
    const langsWithVersions=(a.languages||[]).filter(l=>ALL_LANGS[l]);
    const needsVersions=langsWithVersions.length>0;

    if(needsDB)missing.push("databases");
    if(needsDevOps)missing.push("devops");
    if(needsCloud)missing.push("cloud");
    if(needsVersions)missing.push("versions");

    if(missing.length>0){
      setMissingFields(missing);show(`✅ Extracted! ${missing.length} fields need your input`);
      fetchSuggestions(a);
    }else{
      show("✅ Profile auto-filled! Review and submit.");
      fetchSuggestions(a);
      go(7);
    }
  };

  const handleReset=()=>{setStep(0);setDir(1);setCName("");setCComp("");setUpFile(null);setAnl(null);setUpErr("");setMissingFields([]);setAiSuggestions([]);setSuggestLoading(false);setDismissedSugg([]);setCat("");setRole("");setCRole("");setRSrch("");setSen("");setExp("");setHc(1);setEng("");setSTime("9:00");setETime("17:00");setWHrs(40);setTz("");setLangs([]);setVers({});setFws([]);setFwVers({});setClds([]);setCldSvcs([]);setOtherCloud("");setDbs([]);setDbVers({});setDvps([]);setDvpVers({});setErps([]);setErpVers({});setQas([]);setOTech("");setMh([]);setNh([]);setShowAll(false);setEngl("");setLoc("");setAcad("");setCerts("");setMeths([]);setInds([]);setAiTs([]);setOtherAI("");setProfTools([]);setAiObjective("");setAiResponsibilities([]);setAiSoftSkills([]);setAiGenerated(false);setVisa("");setTravel("");setNotes("");setSDate("");setHolCo("");setHardPct(70);setAk(k=>k+1);setDone(false);setPdfL("")};

  const canN=()=>{if(step===0)return cName.trim()&&cComp.trim();if(step===1)return true;if(step===2)return cat&&(role&&role!=="__custom"||cRole.trim());if(step===3)return sen&&exp;return true};

  const IS={width:"100%",border:`1.5px solid ${DS.surface.border}`,borderRadius:DS.radius.sm,padding:"11px 14px",fontSize:13.5,fontFamily:DS.font.body,outline:"none",background:"rgba(255,255,255,0.9)",color:DS.text.body,transition:`border-color .2s ${DS.ease.default},box-shadow .2s ${DS.ease.default}`,letterSpacing:"-0.006em"};
  const PRow=({l,v})=>{if(!v||(Array.isArray(v)&&!v.length))return null;const val=Array.isArray(v)?v.join(", "):v;return(<div style={{display:"flex",padding:"10px 0",borderBottom:`1px solid ${DS.surface.borderLight}`,flexWrap:"wrap",alignItems:"baseline"}}><div style={{width:isMob?110:150,flexShrink:0,fontSize:10.5,fontWeight:600,color:DS.text.muted,textTransform:"uppercase",letterSpacing:"0.04em",fontFamily:DS.font.body}}>{l}</div><div style={{fontSize:13.5,color:DS.text.h2,flex:1,fontFamily:DS.font.body,letterSpacing:"-0.006em"}}>{val}</div></div>)};

  // Tech coherence warning
  const roleType=ROLE_TYPE[fRole];
  const techWarn=getTechWarnings(roleType,fws);

  // ═══════════ STEPS ═══════════
  const s0=()=>(<StaggerIn base={0.08}><div style={{textAlign:"center",marginBottom:32}}><div style={{width:72,height:72,borderRadius:"50%",background:`linear-gradient(135deg,${DS.brand.blue50},#e0f2fe)`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:36,boxShadow:"0 4px 16px rgba(27,111,232,0.1)"}}>👋</div><div style={{fontSize:24,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading,letterSpacing:"-0.025em"}}>Welcome to BOZ Verified Fit</div><div style={{fontSize:14,color:DS.text.muted,marginTop:8,fontFamily:DS.font.body}}>Signed in as <span style={{color:DS.brand.blue700,fontWeight:500}}>{cEmail}</span></div></div><InfoBox text={STEP_INFO.Client}/><div style={{maxWidth:480,margin:"0 auto"}}><Section title="Your Name *" delay={0}><input type="text" value={cName} onChange={e=>setCName(e.target.value)} placeholder="John Smith" style={IS} onFocus={e=>{e.target.style.borderColor=DS.brand.blue700;e.target.style.boxShadow=DS.shadow.glow}} onBlur={e=>{e.target.style.borderColor=DS.surface.border;e.target.style.boxShadow="none"}}/></Section><Section title="Company *" delay={0}><input type="text" value={cComp} onChange={e=>setCComp(e.target.value)} placeholder="Acme Corp" style={IS} onFocus={e=>{e.target.style.borderColor=DS.brand.blue700;e.target.style.boxShadow=DS.shadow.glow}} onBlur={e=>{e.target.style.borderColor=DS.surface.border;e.target.style.boxShadow="none"}}/></Section></div></StaggerIn>);

  const s1=()=>(<div style={{animation:"fadeUp .4s both"}}><div style={{textAlign:"center",marginBottom:24}}><div style={{fontSize:20,fontWeight:700,color:"#0D2550"}}>Got a Job Description?</div></div><InfoBox text={STEP_INFO.Upload}/>
    {!anzing&&!anl&&(<><div style={{padding:isMob?32:48,textAlign:"center",borderRadius:16,border:"2px dashed #cbd5e1",background:"rgba(255,255,255,0.6)",cursor:"pointer"}} onClick={()=>fRef.current?.click()} onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor="#1B6FE8"}} onDragLeave={e=>{e.currentTarget.style.borderColor="#cbd5e1"}} onDrop={e=>{e.preventDefault();handleUpload(e.dataTransfer.files[0])}}><div style={{fontSize:48,marginBottom:12}}>📄</div><div style={{fontSize:15,fontWeight:600,color:"#0D2550"}}>Drop file or click</div><div style={{fontSize:12,color:"#94a3b8"}}>PDF, PNG, JPG · Max 10MB</div>{upFile&&<div style={{marginTop:8,fontSize:12,color:"#1B6FE8"}}>{upFile.name}</div>}<input ref={fRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" style={{display:"none"}} onChange={e=>handleUpload(e.target.files[0])}/></div><div style={{textAlign:"center",marginTop:20}}><button type="button" onClick={()=>go(2)} style={{fontSize:14,color:"#fff",background:"linear-gradient(135deg,#64748b,#475569)",border:"none",borderRadius:12,padding:"12px 32px",cursor:"pointer",fontFamily:"inherit",fontWeight:600,boxShadow:"0 2px 8px rgba(0,0,0,0.1)"}}>Skip → Fill Manually</button></div></>)}
    {anzing&&<Spinner text="🧠 Analyzing..."/>}
    {upErr&&<div style={{textAlign:"center",padding:16,color:"#dc2626",background:"#fef2f2",borderRadius:12,marginTop:12}}>{upErr}<br/><button type="button" onClick={()=>{setUpErr("");setUpFile(null)}} style={{marginTop:8,fontSize:12,color:"#1B6FE8",background:"none",border:"none",cursor:"pointer",textDecoration:"underline",fontFamily:"inherit"}}>Retry</button></div>}
    {anl&&!missingFields.length&&(<div style={{animation:"fadeUp .3s both"}}><div style={{background:"linear-gradient(135deg,#059669,#10b981)",borderRadius:16,padding:"20px 24px",color:"#fff",marginBottom:16}}><div style={{fontSize:14,fontWeight:600}}>✅ Analyzed</div><div style={{fontSize:12,opacity:.85}}>{anl.summary}</div></div><div style={{display:"flex",gap:10}}><button type="button" onClick={()=>applyAnl(anl)} style={{flex:1,background:"linear-gradient(135deg,#0D2550,#1B6FE8)",color:"#fff",border:"none",borderRadius:12,padding:14,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>✨ Apply & Continue</button><button type="button" onClick={()=>{setAnl(null);go(2)}} style={{padding:"14px 20px",background:"#fff",color:"#64748b",border:"1.5px solid #e2e8f0",borderRadius:12,cursor:"pointer",fontFamily:"inherit"}}>Skip</button></div></div>)}
    {/* Smart form for missing fields */}
    {missingFields.length>0&&(<div style={{animation:"fadeUp .3s both"}}>
      <div style={{background:"linear-gradient(135deg,#059669,#10b981)",borderRadius:DS.radius.xl,padding:"20px 24px",color:"#fff",marginBottom:16}}>
        <div style={{fontSize:14,fontWeight:600}}>✅ Extracted! Complete {missingFields.length} missing fields</div>
        <div style={{fontSize:12,opacity:.85}}>{anl?.summary}</div>
      </div>
      <div style={{background:"#fff",borderRadius:DS.radius.xl,padding:"24px",border:`1px solid ${DS.surface.border}`,boxShadow:DS.shadow.sm,marginBottom:16}}>
        <div style={{fontSize:13,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading,marginBottom:16}}>Complete Missing Information</div>
        <div style={{display:"grid",gridTemplateColumns:isMob?"1fr":"1fr 1fr",gap:14}}>
          {missingFields.includes("seniority")&&<div><div style={{fontSize:11,fontWeight:600,color:DS.text.muted,marginBottom:6,fontFamily:DS.font.body}}>Seniority *</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{SENIORITY.map(s=><Pill key={s} label={s} selected={sen===s} onClick={()=>setSen(s)} color="#0D2550" small/>)}</div></div>}
          {missingFields.includes("experience")&&<div><div style={{fontSize:11,fontWeight:600,color:DS.text.muted,marginBottom:6,fontFamily:DS.font.body}}>Experience *</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{EXP_RANGES.map(e=><Pill key={e} label={e} selected={exp===e} onClick={()=>setExp(e)} color="#1B6FE8" small/>)}</div></div>}
          {missingFields.includes("englishLevel")&&<div><div style={{fontSize:11,fontWeight:600,color:DS.text.muted,marginBottom:6,fontFamily:DS.font.body}}>English Level</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{ENGLISH.map(e=><Pill key={e} label={e} selected={engl===e} onClick={()=>setEngl(e)} color="#0D2550" small/>)}</div></div>}
          {missingFields.includes("location")&&<div><div style={{fontSize:11,fontWeight:600,color:DS.text.muted,marginBottom:6,fontFamily:DS.font.body}}>Location</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{LOCATIONS.map(l=><Pill key={l} label={l} selected={loc===l} onClick={()=>setLoc(l)} color="#1B6FE8" small/>)}</div></div>}
          {missingFields.includes("engagement")&&<div><div style={{fontSize:11,fontWeight:600,color:DS.text.muted,marginBottom:6,fontFamily:DS.font.body}}>Engagement</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{ENGAGEMENT_TYPES.map(e=><Pill key={e} label={e} selected={eng===e} onClick={()=>setEng(e)} color="#0D2550" small/>)}</div></div>}
          {missingFields.includes("headcount")&&<div><div style={{fontSize:11,fontWeight:600,color:DS.text.muted,marginBottom:6,fontFamily:DS.font.body}}>Headcount</div><div style={{display:"flex",alignItems:"center",gap:10}}><button type="button" onClick={()=>setHc(Math.max(1,hc-1))} style={{width:32,height:32,borderRadius:"50%",border:`1px solid ${DS.surface.border}`,background:"#fff",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>−</button><span style={{fontSize:20,fontWeight:700,color:DS.text.h1}}>{hc}</span><button type="button" onClick={()=>setHc(hc+1)} style={{width:32,height:32,borderRadius:"50%",border:`1px solid ${DS.surface.border}`,background:"#fff",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button></div></div>}
          {missingFields.includes("timezone")&&<div><div style={{fontSize:11,fontWeight:600,color:DS.text.muted,marginBottom:6,fontFamily:DS.font.body}}>Timezone</div><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{TIMEZONES.map(t=><Pill key={t} label={t} selected={tz===t} onClick={()=>setTz(t)} color="#64748b" small/>)}</div></div>}
          {missingFields.includes("methodology")&&<div><div style={{fontSize:11,fontWeight:600,color:DS.text.muted,marginBottom:6,fontFamily:DS.font.body}}>Methodology</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{METHODOLOGIES.map(m=><Pill key={m} label={m} selected={meths.includes(m)} onClick={()=>setMeths(p=>toggle(p,m))} color="#0D2550" small/>)}</div></div>}
          {missingFields.includes("startDate")&&<div><div style={{fontSize:11,fontWeight:600,color:DS.text.muted,marginBottom:6,fontFamily:DS.font.body}}>Start Date</div><input type="date" value={sDate} onChange={e=>setSDate(e.target.value)} style={{...IS,maxWidth:200}}/></div>}
          {missingFields.includes("industry")&&<div style={{gridColumn:"1/-1"}}><div style={{fontSize:11,fontWeight:600,color:DS.text.muted,marginBottom:6,fontFamily:DS.font.body}}>Industry</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{INDUSTRIES.map(i=><Pill key={i} label={i} selected={inds.includes(i)} onClick={()=>setInds(p=>toggle(p,i))} color="#1B6FE8" small/>)}</div></div>}
          {missingFields.includes("visa")&&<div><div style={{fontSize:11,fontWeight:600,color:DS.text.muted,marginBottom:6,fontFamily:DS.font.body}}>US Visa Required?</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{["Yes","No","Not required"].map(v=><Pill key={v} label={v} selected={visa===v} onClick={()=>setVisa(v)} color="#0D2550" small/>)}</div></div>}
          {missingFields.includes("travel")&&<div><div style={{fontSize:11,fontWeight:600,color:DS.text.muted,marginBottom:6,fontFamily:DS.font.body}}>Travel Availability</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{["Yes","Occasionally","No"].map(t=><Pill key={t} label={t} selected={travel===t} onClick={()=>setTravel(t)} color="#0D2550" small/>)}</div></div>}
          {missingFields.includes("holiday")&&<div><div style={{fontSize:11,fontWeight:600,color:DS.text.muted,marginBottom:6,fontFamily:DS.font.body}}>Holiday Country</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{HOLIDAY_COUNTRIES.map(c=><Pill key={c} label={c} selected={holCo===c} onClick={()=>setHolCo(c)} color="#0D2550" small/>)}</div></div>}
        </div>

        {/* Technical missing fields */}
        {(missingFields.includes("databases")||missingFields.includes("devops")||missingFields.includes("cloud")||missingFields.includes("versions"))&&(
          <div style={{marginTop:16,paddingTop:16,borderTop:`1px solid ${DS.surface.borderLight}`}}>
            <div style={{fontSize:13,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading,marginBottom:14}}>Technical Details</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr",gap:14}}>
              {missingFields.includes("versions")&&langs.length>0&&(
                <div><div style={{fontSize:11,fontWeight:600,color:DS.text.muted,marginBottom:6,fontFamily:DS.font.body}}>Technology Versions <span style={{color:"#f59e0b"}}>(important for matching)</span></div>
                  {langs.filter(l=>ALL_LANGS[l]).map(l=>(
                    <div key={l} style={{marginBottom:10}}>
                      <div style={{fontSize:12,fontWeight:600,color:DS.text.body,marginBottom:4,fontFamily:DS.font.heading}}>{l}</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                        <Pill label="Any version" selected={(vers[l]||[]).includes("any")} onClick={()=>setVers(p=>{const c=p[l]||[];return{...p,[l]:c.includes("any")?[]:["any"]}})} color="#94a3b8" small/>
                        {(ALL_LANGS[l]||[]).map(v=><Pill key={v} label={v} selected={(vers[l]||[]).includes(v)&&!(vers[l]||[]).includes("any")} onClick={()=>setVers(p=>{const c=(p[l]||[]).filter(x=>x!=="any");return{...p,[l]:c.includes(v)?c.filter(x=>x!==v):[...c,v]}})} color="#64748b" small/>)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {missingFields.includes("databases")&&(
                <div><div style={{fontSize:11,fontWeight:600,color:DS.text.muted,marginBottom:6,fontFamily:DS.font.body}}>Databases <span style={{color:"#ef4444"}}>(required for this role type)</span></div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{DBS.map(d=><Pill key={d} label={d} selected={dbs.includes(d)} onClick={()=>setDbs(p=>toggle(p,d))} color="#10b981" small/>)}</div>
                </div>
              )}
              {missingFields.includes("devops")&&(
                <div><div style={{fontSize:11,fontWeight:600,color:DS.text.muted,marginBottom:6,fontFamily:DS.font.body}}>DevOps Tools <span style={{color:"#ef4444"}}>(recommended for this role)</span></div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{DEVOPS.map(d=><Pill key={d} label={d} selected={dvps.includes(d)} onClick={()=>setDvps(p=>toggle(p,d))} color="#ef4444" small/>)}</div>
                </div>
              )}
              {missingFields.includes("cloud")&&(
                <div><div style={{fontSize:11,fontWeight:600,color:DS.text.muted,marginBottom:6,fontFamily:DS.font.body}}>Cloud Providers</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{Object.keys(CLOUD_SERVICES).map(c=><Pill key={c} label={c} selected={clds.includes(c)} onClick={()=>setClds(p=>toggle(p,c))} color="#f59e0b" small/>)}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* ═══ AI INTELLIGENT SUGGESTIONS (Phase 2) ═══ */}
      {(suggestLoading||aiSuggestions.filter(s=>!dismissedSugg.includes(s.category+(s.items||[]).join(","))).length>0)&&(
        <div style={{background:"#fff",borderRadius:DS.radius.xl,padding:"20px 24px",border:`1px solid ${DS.surface.border}`,boxShadow:DS.shadow.sm,marginBottom:16,animation:"fadeUp .3s both"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <div style={{width:32,height:32,borderRadius:DS.radius.md,background:`linear-gradient(135deg,${DS.brand.blue50},#e0f2fe)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>💡</div>
            <div><div style={{fontSize:13,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading}}>AI Suggestions</div><div style={{fontSize:11,color:DS.text.faint,fontFamily:DS.font.body}}>Optional — technologies you may need based on role analysis</div></div>
          </div>
          {suggestLoading&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 0"}}><div style={{width:18,height:18,border:`2.5px solid ${DS.surface.border}`,borderTop:`2.5px solid ${DS.brand.blue700}`,borderRadius:"50%",animation:"spin 1s linear infinite"}}/><span style={{fontSize:12,color:DS.text.muted,fontFamily:DS.font.body}}>Analyzing profile for technical gaps...</span></div>}
          {!suggestLoading&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
            {aiSuggestions.filter(s=>!dismissedSugg.includes(s.category+(s.items||[]).join(","))).map((s,i)=>(
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:14,padding:"14px 16px",background:`linear-gradient(135deg,${DS.brand.blue50},#fff)`,borderRadius:DS.radius.lg,border:`1px solid rgba(27,111,232,0.08)`,transition:`all .2s ${DS.ease.snap}`}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:10,fontWeight:700,color:DS.brand.blue700,textTransform:"uppercase",letterSpacing:"0.05em",fontFamily:DS.font.body,marginBottom:5}}>{s.category}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>{(s.items||[]).map(item=>(
                    <span key={item} style={{padding:"3px 10px",borderRadius:DS.radius.pill,fontSize:11,background:"#fff",color:DS.brand.blue700,fontFamily:DS.font.body,fontWeight:600,border:`1px solid ${DS.brand.blue100}`,boxShadow:"0 1px 2px rgba(0,0,0,0.03)"}}>{item}</span>
                  ))}</div>
                  <div style={{fontSize:11,color:DS.text.muted,fontFamily:DS.font.body,lineHeight:1.5}}>{s.reason}</div>
                </div>
                <div style={{display:"flex",gap:5,flexShrink:0,paddingTop:2}}>
                  <button type="button" onClick={()=>acceptSuggestion(s)} style={{padding:"7px 14px",fontSize:11,fontWeight:600,background:`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`,color:"#fff",border:"none",borderRadius:DS.radius.md,cursor:"pointer",fontFamily:DS.font.heading,boxShadow:DS.shadow.blue,transition:`all .2s ${DS.ease.snap}`}}>+ Add</button>
                  <button type="button" onClick={()=>dismissSuggestion(s)} style={{padding:"7px 12px",fontSize:11,fontWeight:500,background:"#fff",color:DS.text.faint,border:`1.5px solid ${DS.surface.border}`,borderRadius:DS.radius.md,cursor:"pointer",fontFamily:DS.font.body,transition:`all .2s ${DS.ease.snap}`}}>Skip</button>
                </div>
              </div>
            ))}
          </div>}
        </div>
      )}
      <button type="button" onClick={()=>{setMissingFields([]);go(7)}} style={{width:"100%",background:`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`,color:"#fff",border:"none",borderRadius:DS.radius.md,padding:16,fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:DS.font.heading,boxShadow:DS.shadow.blue}}>Continue to Review →</button>
    </div>)}
  </div>);

  const s2=()=>{const rs=(ROLES_MAP[cat]||[]).filter(r=>!rSrch||r.toLowerCase().includes(rSrch.toLowerCase()));return(<><InfoBox text={STEP_INFO.Category}/><Section title="Profile Category" delay={0}><div style={{display:"grid",gridTemplateColumns:isMob?"1fr":isTab?"repeat(2,1fr)":"repeat(3,1fr)",gap:12}}>{CATEGORIES.map((c,i)=>(<button key={c.id} type="button" onClick={()=>{setCat(c.id);setRole("");setRSrch("");setShowAll(false)}} style={{textAlign:"left",padding:"16px 18px",borderRadius:DS.radius.lg,border:cat===c.id?`2px solid ${c.color}`:`1.5px solid ${DS.surface.border}`,background:cat===c.id?`${c.color}08`:"#fff",cursor:"pointer",transition:`all .3s ${DS.ease.snap}`,fontFamily:DS.font.body,animation:`fadeUp .4s ${i*0.04}s both`,boxShadow:cat===c.id?`0 4px 16px ${c.color}18`:DS.shadow.sm}}><div style={{display:"flex",alignItems:"center",gap:12}}><span style={{fontSize:20,width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",borderRadius:DS.radius.md,background:cat===c.id?`${c.color}15`:`${DS.surface.sunken}`,flexShrink:0,transition:`all .2s ${DS.ease.default}`}}>{c.icon}</span><div><div style={{fontSize:13,fontWeight:600,color:DS.text.h1,fontFamily:DS.font.heading,letterSpacing:"-0.01em"}}>{c.label}</div><div style={{fontSize:11,color:DS.text.faint,marginTop:1}}>{c.desc}</div></div></div></button>))}</div></Section>{cat&&(<Section title="Role" delay={0.1}><input type="text" value={rSrch} onChange={e=>setRSrch(e.target.value)} placeholder="🔍 Search roles..." style={{...IS,marginBottom:14}}/><div style={{display:"flex",flexWrap:"wrap",gap:8,maxHeight:280,overflowY:"auto"}}>{rs.map(r=><Pill key={r} label={r} selected={role===r} onClick={()=>{setRole(r);setCRole("");setShowAll(false)}} color={catO?.color}/>)}{!rSrch&&<Pill label="+ Custom" selected={role==="__custom"} onClick={()=>setRole("__custom")} color="#64748b"/>}{!rs.length&&rSrch&&<div style={{color:DS.text.faint,fontSize:13,padding:16,fontFamily:DS.font.body}}>No match found.</div>}</div>{role==="__custom"&&<input type="text" value={cRole} onChange={e=>setCRole(e.target.value)} placeholder="Custom role..." style={{...IS,marginTop:12}}/>}</Section>)}</>)};

  const s3=()=>(<><InfoBox text={STEP_INFO.Experience}/>
    <Section title="Seniority" delay={0}><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{SENIORITY.map(s=><Pill key={s} label={s} selected={sen===s} onClick={()=>setSen(s)} color="#0D2550"/>)}</div></Section>
    <Section title="Years of Experience" delay={0.05}><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{EXP_RANGES.map(e=><Pill key={e} label={e} selected={exp===e} onClick={()=>setExp(e)} color="#1B6FE8"/>)}</div></Section>
    <Section title="Engagement" delay={0.1}><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{ENGAGEMENT_TYPES.map(e=><Pill key={e} label={e} selected={eng===e} onClick={()=>{setEng(e);if(e==="Full-time (40h/week)")setETime(calcEndTime(sTime,8));if(e==="Part-time (20h/week)")setETime(calcEndTime(sTime,4))}} color="#0D2550"/>)}</div></Section>
    <Section title="Time Zone" delay={0.13}><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{TIMEZONES.map(t=><Pill key={t} label={t} selected={tz===t} onClick={()=>setTz(t)} color="#0D2550" small/>)}</div></Section>
    {(eng==="Full-time (40h/week)"||eng==="Part-time (20h/week)")&&(<Section title="Working Hours" sub="Set start and end time" delay={0.15}><div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}><div><div style={{fontSize:11,color:"#64748b",marginBottom:4}}>Start</div><select value={sTime} onChange={e=>{setSTime(e.target.value);const h=eng==="Full-time (40h/week)"?8:4;setETime(calcEndTime(e.target.value,h))}} style={{...IS,width:120,cursor:"pointer"}}>{HOUR_OPTIONS.map(h=><option key={h}>{h}</option>)}</select></div><div style={{fontSize:20,color:"#94a3b8",paddingTop:16}}>→</div><div><div style={{fontSize:11,color:"#64748b",marginBottom:4}}>End</div><select value={eTime} onChange={e=>setETime(e.target.value)} style={{...IS,width:120,cursor:"pointer"}}>{HOUR_OPTIONS.map(h=><option key={h}>{h}</option>)}</select></div></div></Section>)}
    {eng==="By Hours"&&(<Section title="Hours per Week" delay={0.15}><div style={{display:"flex",alignItems:"center",gap:12}}><input type="number" min={1} max={80} value={wHrs} onChange={e=>setWHrs(Math.max(1,Math.min(80,+e.target.value)))} style={{...IS,width:100,textAlign:"center"}}/><span style={{color:"#64748b",fontSize:13}}>h/week</span></div></Section>)}
    <Section title="Headcount" delay={0.2}><div style={{display:"flex",alignItems:"center",gap:16}}><button type="button" onClick={()=>setHc(Math.max(1,hc-1))} style={{width:40,height:40,borderRadius:"50%",border:"1.5px solid #e2e8f0",background:"#fff",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit",color:"#475569"}}>−</button><span style={{fontSize:32,fontWeight:700,color:"#0D2550",minWidth:40,textAlign:"center"}}>{hc}</span><button type="button" onClick={()=>setHc(hc+1)} style={{width:40,height:40,borderRadius:"50%",border:"1.5px solid #e2e8f0",background:"#fff",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit",color:"#475569"}}>+</button></div></Section>
  </>);

  const s4=()=>{
    const isProfCat=usesProfTools(cat);
    const profToolsForCat=PROF_TOOLS[cat]||{};
    // Professional tools view for non-technical categories
    if(isProfCat){
      const toolColors=["#1B6FE8","#8b5cf6","#f59e0b","#10b981","#ef4444","#06b6d4","#d946ef"];
      return(<><InfoBox text={STEP_INFO.Stack}/>
        <div style={{background:`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`,borderRadius:DS.radius.xl,padding:"20px 24px",marginBottom:24,color:"#fff"}}>
          <div style={{fontSize:14,fontWeight:700,fontFamily:DS.font.heading}}>🧰 Professional Tools & Platforms</div>
          <div style={{fontSize:12,opacity:.7,marginTop:4,fontFamily:DS.font.body}}>Select the tools and platforms required for this {fRole||"role"}. These will be used to match candidates.</div>
        </div>
        {Object.entries(profToolsForCat).map(([group,tools],gi)=>(
          <Section key={group} title={group} delay={gi*0.05}>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{tools.map(t=><Pill key={t} label={t} selected={profTools.includes(t)} onClick={()=>setProfTools(p=>toggle(p,t))} color={toolColors[gi%toolColors.length]}/>)}</div>
          </Section>
        ))}
        <Section title="Cloud Platforms" sub="If applicable" delay={0.3}><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{Object.keys(CLOUD_SERVICES).map(c=><Pill key={c} label={c} selected={clds.includes(c)} onClick={()=>setClds(p=>toggle(p,c))} color="#f59e0b"/>)}</div></Section>
        <Section title="Other Tools or Skills" delay={0.35}><input type="text" value={oTech} onChange={e=>setOTech(e.target.value)} placeholder="Specify any additional tools..." style={IS}/></Section>
      </>);
    }
    // Technical stack view (existing)
    const fl=getFilteredLangs(cat,fRole);const extra=Object.keys(ALL_LANGS).filter(l=>!fl.includes(l));return(<><InfoBox text={STEP_INFO.Stack}/>
    {techWarn&&<div style={{background:"#fef2f2",border:`1.5px solid #fecaca`,borderRadius:DS.radius.lg,padding:"14px 18px",marginBottom:20,display:"flex",gap:10}}><span style={{fontSize:16}}>⚠️</span><div><div style={{fontSize:12,fontWeight:600,color:"#dc2626",marginBottom:2,fontFamily:DS.font.heading}}>Tech Mismatch Warning</div><div style={{fontSize:12,color:"#991b1b",fontFamily:DS.font.body}}>{techWarn.message}</div><div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>{techWarn.frameworks.map(f=><span key={f} style={{background:"#fecaca",padding:"2px 8px",borderRadius:DS.radius.xs,fontSize:10,color:"#991b1b"}}>{f}</span>)}</div></div></div>}
    <Section title="Programming Languages" sub={`Recommended for ${fRole||"this role"}`} delay={0}><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{fl.map(l=><Pill key={l} label={l} selected={langs.includes(l)} onClick={()=>setLangs(p=>toggle(p,l))} color="#1B6FE8"/>)}</div>{extra.length>0&&<div style={{marginTop:12}}>{!showAll?<button type="button" onClick={()=>setShowAll(true)} style={{fontSize:13,color:"#fff",background:"linear-gradient(135deg,#64748b,#475569)",border:"none",borderRadius:DS.radius.md,padding:"10px 20px",cursor:"pointer",fontFamily:DS.font.heading,fontWeight:500,boxShadow:DS.shadow.sm}}>🔓 Show all {extra.length} languages</button>:<div style={{marginTop:8}}><div style={{fontSize:11,color:"#f59e0b",fontWeight:600,marginBottom:6,fontFamily:DS.font.body}}>⚡ Additional languages (not typical for {fRole})</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{extra.map(l=><Pill key={l} label={l} selected={langs.includes(l)} onClick={()=>setLangs(p=>toggle(p,l))} color="#94a3b8" small/>)}</div></div>}</div>}{langs.length>0&&<VersionPicker items={langs} vMap={ALL_LANGS} versions={vers} setVersions={setVers}/>}</Section>
    {langs.length>0&&langs.some(l=>getFilteredFW(cat,fRole,l).length>0)&&(<Section title="Frameworks & Libraries" delay={0.05}>{langs.map(l=>{const fw=getFilteredFW(cat,fRole,l);if(!fw.length)return null;return(<div key={l} style={{marginBottom:16}}><div style={{fontSize:12,fontWeight:600,color:DS.text.h2,marginBottom:8,fontFamily:DS.font.heading}}><span style={{width:6,height:6,borderRadius:"50%",background:catO?.color||DS.brand.blue700,display:"inline-block",marginRight:6}}/>{l}</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{fw.map(f=><Pill key={f} label={f} selected={fws.includes(f)} onClick={()=>setFws(p=>toggle(p,f))} color="#8b5cf6" small/>)}</div></div>)})}{fws.length>0&&<VersionPicker items={fws} vMap={FW_V} versions={fwVers} setVersions={setFwVers}/>}</Section>)}
    {showQATools(fRole)&&(<Section title="QA & Testing Tools" delay={0.08}><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{QA_TOOLS.map(t=><Pill key={t} label={t} selected={qas.includes(t)} onClick={()=>setQas(p=>toggle(p,t))} color="#f97316"/>)}</div></Section>)}
    <Section title="Cloud Providers" delay={0.1}><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{Object.keys(CLOUD_SERVICES).map(c=><Pill key={c} label={c} selected={clds.includes(c)} onClick={()=>setClds(p=>toggle(p,c))} color="#f59e0b"/>)}</div>{clds.length>0&&(<div style={{marginTop:12,padding:"14px 16px",background:"rgba(255,255,255,0.6)",borderRadius:DS.radius.lg,border:`1px solid ${DS.surface.border}`}}><div style={{fontSize:11,fontWeight:600,color:DS.text.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:10,fontFamily:DS.font.body}}>☁️ Select cloud services</div>{clds.map(c=>(<div key={c} style={{marginBottom:12}}><div style={{fontSize:11,fontWeight:600,color:DS.text.body,marginBottom:5,fontFamily:DS.font.heading}}>{c}</div><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{(CLOUD_SERVICES[c]||[]).map(s=><Pill key={s} label={s} selected={cldSvcs.includes(s)} onClick={()=>setCldSvcs(p=>toggle(p,s))} color="#d97706" small/>)}</div></div>))}<div style={{marginTop:8}}><input type="text" value={otherCloud} onChange={e=>setOtherCloud(e.target.value)} placeholder="Other services..." style={{...IS,maxWidth:300}}/></div></div>)}</Section>
    {showDBs(cat,fRole)&&(<Section title="Databases" delay={0.15}><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{DBS.map(d=><Pill key={d} label={d} selected={dbs.includes(d)} onClick={()=>setDbs(p=>toggle(p,d))} color="#10b981"/>)}</div>{dbs.length>0&&<VersionPicker items={dbs} vMap={DB_V} versions={dbVers} setVersions={setDbVers}/>}</Section>)}
    {showDevOps(cat,fRole)&&(<Section title="DevOps" delay={0.2}><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{DEVOPS.map(d=><Pill key={d} label={d} selected={dvps.includes(d)} onClick={()=>setDvps(p=>toggle(p,d))} color="#ef4444"/>)}</div>{dvps.length>0&&<VersionPicker items={dvps} vMap={DEVOPS_V} versions={dvpVers} setVersions={setDvpVers}/>}</Section>)}
    {cat==="erp"&&(<Section title="ERP" delay={0.25}><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{ERP_T.map(e=><Pill key={e} label={e} selected={erps.includes(e)} onClick={()=>setErps(p=>toggle(p,e))} color="#d946ef"/>)}</div>{erps.length>0&&<VersionPicker items={erps} vMap={ERP_V} versions={erpVers} setVersions={setErpVers}/>}</Section>)}
    <Section title="Other Technologies" delay={0.3}><input type="text" value={oTech} onChange={e=>setOTech(e.target.value)} placeholder="Kafka, RabbitMQ, GraphQL..." style={IS}/></Section>
    <Section title="Methodology" sub="Select one or more" delay={0.32}><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{METHODOLOGIES.map(m=><Pill key={m} label={m} selected={meths.includes(m)} onClick={()=>setMeths(p=>toggle(p,m))} color="#0D2550"/>)}</div></Section>
    <Section title="AI Tools" sub="Select tools used by the team" delay={0.34}><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{AI_TOOLS.map(t=><Pill key={t} label={t} selected={aiTs.includes(t)} onClick={()=>setAiTs(p=>toggle(p,t))} color="#06b6d4" small/>)}</div><input type="text" value={otherAI} onChange={e=>setOtherAI(e.target.value)} placeholder="Other AI tools..." style={{...IS,marginTop:10,maxWidth:300}}/></Section>
    <Section title="Certifications" sub="Optional" delay={0.36}><input type="text" value={certs} onChange={e=>setCerts(e.target.value)} placeholder="AWS SA, PMP, CISSP..." style={IS}/></Section>
  </>)};

  const s5=()=>{if(!allT.length)return(<Section title="No tech selected"><div style={{padding:48,textAlign:"center",color:"#94a3b8",borderRadius:16,border:"2px dashed #e2e8f0",background:"rgba(255,255,255,0.5)"}}><div style={{fontSize:40,marginBottom:12}}>🔧</div>Go back to Stack.</div></Section>);return(<><InfoBox text={STEP_INFO.Priorities}/><div style={{background:"linear-gradient(135deg,#0D2550,#1B6FE8)",borderRadius:16,padding:"20px 24px",marginBottom:24,color:"#fff"}}><div style={{fontSize:14,fontWeight:600}}>Classify {allT.length} technologies</div><div style={{fontSize:12,opacity:.8}}><span style={{color:"#fca5a5"}}>Red</span> = Must · <span style={{color:"#86efac"}}>Green</span> = Nice</div></div>
    <Section title={`Must Have (${mh.length})`} delay={0}><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{allT.map(t=><Pill key={t} label={t} selected={mh.includes(t)} onClick={()=>tMH(t)} color="#dc2626"/>)}</div></Section>
    <Section title={`Nice to Have (${nh.length})`} delay={0.1}><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{allT.map(t=><Pill key={t} label={t} selected={nh.includes(t)} onClick={()=>tNH(t)} color="#059669"/>)}</div></Section>
  </>)};

  const s6=()=>(<><InfoBox text={STEP_INFO.Details}/>
    <div style={{display:"grid",gridTemplateColumns:isMob?"1fr":"1fr 1fr",gap:"0 24px"}}>
      <Section title="English Level" delay={0}><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{ENGLISH.map(e=><Pill key={e} label={e} selected={engl===e} onClick={()=>setEngl(e)} color="#0D2550" small/>)}</div></Section>
      <Section title="Location" delay={0.03}><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{LOCATIONS.map(l=><Pill key={l} label={l} selected={loc===l} onClick={()=>setLoc(l)} color="#1B6FE8"/>)}</div></Section>
      <Section title="Academia" delay={0.06}><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{ACADEMIA.map(a=><Pill key={a} label={a} selected={acad===a} onClick={()=>setAcad(a)} color="#64748b" small/>)}</div></Section>
      <Section title="Holiday Country" sub="Where will holidays be observed?" delay={0.09}><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{HOLIDAY_COUNTRIES.map(c=><Pill key={c} label={c} selected={holCo===c} onClick={()=>setHolCo(c)} color="#0D2550" small/>)}</div></Section>
    </div>
    <Section title="Industry" sub="Select one or more" delay={0.18}><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{INDUSTRIES.map(i=><Pill key={i} label={i} selected={inds.includes(i)} onClick={()=>setInds(p=>toggle(p,i))} color="#1B6FE8"/>)}</div></Section>
    <div style={{display:"grid",gridTemplateColumns:isMob?"1fr":"1fr 1fr",gap:"0 24px"}}>
      <Section title="US Visa" delay={0.24}><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{["Yes","No","Not required"].map(v=><Pill key={v} label={v} selected={visa===v} onClick={()=>setVisa(v)} color="#0D2550"/>)}</div></Section>
      <Section title="Travel" delay={0.27}><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{["Yes","Occasionally","No"].map(t=><Pill key={t} label={t} selected={travel===t} onClick={()=>setTravel(t)} color="#0D2550"/>)}</div></Section>
    </div>
    <Section title="Ideal Start Date" delay={0.3}><input type="date" value={sDate} onChange={e=>setSDate(e.target.value)} style={{...IS,maxWidth:220}}/></Section>
    <Section title="Additional Notes" delay={0.33}><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="Extra context..." style={{...IS,resize:"vertical"}}/></Section>
  </>);

  // Review
  const s7=()=>{const vL=formatVersions(allV);const isProfCat=usesProfTools(cat);
    if(done)return(<StaggerIn base={0.08}><div style={{textAlign:"center",padding:isMob?32:56}}>
      <div style={{width:80,height:80,borderRadius:"50%",background:`linear-gradient(135deg,#059669,#10b981)`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:36,boxShadow:"0 8px 32px rgba(5,150,105,0.3)"}}>✓</div>
      <div style={{fontSize:24,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading,letterSpacing:"-0.02em"}}>Profile Submitted!</div>
      <div style={{fontSize:14,color:DS.text.muted,marginTop:8,fontFamily:DS.font.body}}>Your request for <strong style={{color:DS.text.h2}}>{fRole}</strong> has been received.<br/>Our team will start sourcing immediately.</div>
      {pdfL&&<div style={{marginTop:28}}><a href={pdfL} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:8,background:`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`,color:"#fff",padding:"14px 32px",borderRadius:DS.radius.md,fontSize:14,fontWeight:600,textDecoration:"none",fontFamily:DS.font.heading,boxShadow:DS.shadow.blue,transition:`all .25s ${DS.ease.snap}`}}>📄 View Profile Document</a></div>}
      <div style={{marginTop:20}}><button type="button" onClick={handleReset} style={{fontSize:13,color:DS.brand.blue700,background:"none",border:`1.5px solid ${DS.brand.blue700}`,borderRadius:DS.radius.md,padding:"10px 24px",cursor:"pointer",fontFamily:DS.font.heading,fontWeight:600,transition:`all .2s ${DS.ease.snap}`}}>+ Create New Request</button></div>
    </div></StaggerIn>);
    return(<StaggerIn base={0.06}>
      <InfoBox text={STEP_INFO.Review}/>
      {/* Executive header card */}
      <div style={{background:`linear-gradient(135deg,${DS.brand.navy900},#1B3A70,${DS.brand.blue700})`,borderRadius:DS.radius.xxl,padding:isMob?"24px":"32px 36px",marginBottom:16,color:"#fff",position:"relative",overflow:"hidden"}}>
        <HeaderBG/>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",flexWrap:"wrap",gap:16}}>
            <div>
              <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:3,opacity:.4,fontFamily:DS.font.body,marginBottom:8}}>Profile Request</div>
              <div style={{fontSize:isMob?22:28,fontWeight:800,fontFamily:DS.font.heading,letterSpacing:"-0.03em",lineHeight:1.1}}>{fRole}</div>
              <div style={{fontSize:14,opacity:.7,marginTop:6,fontFamily:DS.font.body}}>{catO?.label} · {sen} · {exp}</div>
              <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
                {eng&&<span style={{background:"rgba(255,255,255,0.1)",padding:"5px 14px",borderRadius:DS.radius.pill,fontSize:11,fontFamily:DS.font.body,border:"1px solid rgba(255,255,255,0.08)"}}>{schedStr}</span>}
                {hc>1&&<span style={{background:"rgba(255,255,255,0.1)",padding:"5px 14px",borderRadius:DS.radius.pill,fontSize:11,fontFamily:DS.font.body,border:"1px solid rgba(255,255,255,0.08)"}}>{hc} positions</span>}
                {loc&&<span style={{background:"rgba(255,255,255,0.1)",padding:"5px 14px",borderRadius:DS.radius.pill,fontSize:11,fontFamily:DS.font.body,border:"1px solid rgba(255,255,255,0.08)}"}}>📍 {loc}</span>}
              </div>
            </div>
            <div style={{textAlign:"right"}}><div style={{fontSize:11,opacity:.4,fontFamily:DS.font.body}}>Prepared for</div><div style={{fontSize:16,fontWeight:700,fontFamily:DS.font.heading,marginTop:2}}>{cName}</div><div style={{fontSize:12,opacity:.6,fontFamily:DS.font.body}}>{cComp}</div><div style={{fontSize:11,opacity:.4,marginTop:4,fontFamily:DS.font.body}}>{cEmail}</div></div>
          </div>
        </div>
      </div>

      {/* Completeness + Skills Balance row */}
      <div style={{display:"grid",gridTemplateColumns:isMob?"1fr":"1fr 1fr",gap:14,marginBottom:16}}>
        <SectionScore profile={{category:cat,role:fRole,seniority:sen,experience:exp,languages:langs,mustHave:mh,englishLevel:engl,location:loc,methodology:meths,industry:inds}} goStep={go}/>
        <SkillsBar hard={hardPct} setHard={setHardPct}/>
      </div>

      {/* Must Have vs Nice to Have */}
      <div style={{display:"grid",gridTemplateColumns:isMob?"1fr":"1fr 1fr",gap:14,marginBottom:16}}>
        <div style={{background:"#fff",borderRadius:DS.radius.xl,padding:"20px 24px",border:`1px solid ${DS.surface.border}`,boxShadow:DS.shadow.sm}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><div style={{width:8,height:8,borderRadius:"50%",background:"#dc2626"}}/><div style={{fontSize:11,fontWeight:700,color:"#dc2626",textTransform:"uppercase",letterSpacing:"0.05em",fontFamily:DS.font.heading}}>Must Have ({mh.length})</div></div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{mh.length?mh.map(t=><span key={t} style={{background:"#fef2f2",color:"#dc2626",padding:"4px 12px",borderRadius:DS.radius.pill,fontSize:11,fontWeight:500,fontFamily:DS.font.body,border:"1px solid #fecaca"}}>{t}</span>):<span style={{fontSize:12,color:DS.text.faint,fontFamily:DS.font.body}}>None selected</span>}</div>
        </div>
        <div style={{background:"#fff",borderRadius:DS.radius.xl,padding:"20px 24px",border:`1px solid ${DS.surface.border}`,boxShadow:DS.shadow.sm}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><div style={{width:8,height:8,borderRadius:"50%",background:"#059669"}}/><div style={{fontSize:11,fontWeight:700,color:"#059669",textTransform:"uppercase",letterSpacing:"0.05em",fontFamily:DS.font.heading}}>Nice to Have ({nh.length})</div></div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{nh.length?nh.map(t=><span key={t} style={{background:"#f0fdf4",color:"#059669",padding:"4px 12px",borderRadius:DS.radius.pill,fontSize:11,fontWeight:500,fontFamily:DS.font.body,border:"1px solid #bbf7d0"}}>{t}</span>):<span style={{fontSize:12,color:DS.text.faint,fontFamily:DS.font.body}}>None selected</span>}</div>
        </div>
      </div>

      {/* AI-Generated Role Objective & Responsibilities (editable) */}
      <div style={{background:"#fff",borderRadius:DS.radius.xl,padding:"24px 28px",marginBottom:16,border:`1px solid ${DS.surface.border}`,boxShadow:DS.shadow.sm}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:700,color:DS.brand.blue700,textTransform:"uppercase",letterSpacing:"0.05em",fontFamily:DS.font.heading}}>Role Objective & Responsibilities</div>
          <div style={{display:"flex",gap:6}}>
            {!aiGenerated&&!aiGenerating&&<button type="button" onClick={generateAI} style={{fontSize:11,background:`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`,color:"#fff",border:"none",borderRadius:DS.radius.sm,padding:"6px 14px",cursor:"pointer",fontFamily:DS.font.heading,fontWeight:600,boxShadow:DS.shadow.blue}}>🧠 Generate with AI</button>}
            {aiGenerated&&<button type="button" onClick={regenerateAI} disabled={aiGenerating} style={{fontSize:11,background:DS.surface.page,color:DS.brand.blue700,border:`1px solid ${DS.surface.border}`,borderRadius:DS.radius.sm,padding:"5px 12px",cursor:aiGenerating?"wait":"pointer",fontFamily:DS.font.heading,fontWeight:600}}>🔄 Regenerate</button>}
          </div>
        </div>
        {aiGenerating?<div style={{textAlign:"center",padding:32}}><Spinner text="🧠 AI is generating role objective and responsibilities..."/></div>
        :!aiGenerated&&!aiObjective?<div style={{textAlign:"center",padding:32,color:DS.text.faint,border:`2px dashed ${DS.surface.border}`,borderRadius:DS.radius.lg}}>
          <div style={{fontSize:32,marginBottom:8}}>🧠</div>
          <div style={{fontSize:13,fontFamily:DS.font.body,marginBottom:4}}>Click "Generate with AI" to auto-create the role objective and responsibilities</div>
          <div style={{fontSize:11,color:DS.text.placeholder,fontFamily:DS.font.body}}>Based on your selected role, stack, and requirements</div>
        </div>
        :<>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:600,color:DS.text.h2,marginBottom:6,fontFamily:DS.font.heading}}>Role Objective</div>
            <textarea value={aiObjective} onChange={e=>setAiObjective(e.target.value)} rows={3} style={{width:"100%",border:`1.5px solid ${DS.surface.border}`,borderRadius:DS.radius.md,padding:"12px 14px",fontSize:13,fontFamily:DS.font.body,outline:"none",resize:"vertical",color:DS.text.body,lineHeight:1.6,background:DS.surface.page}}/>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:600,color:DS.text.h2,marginBottom:8,fontFamily:DS.font.heading}}>Key Responsibilities</div>
            {aiResponsibilities.map((r,i)=>(
              <div key={i} style={{display:"flex",gap:8,marginBottom:10,alignItems:"flex-start"}}>
                <span style={{fontSize:12,color:DS.brand.blue700,paddingTop:12,flexShrink:0,fontFamily:DS.font.heading,fontWeight:700}}>{i+1}.</span>
                <textarea value={r} onChange={e=>{const n=[...aiResponsibilities];n[i]=e.target.value;setAiResponsibilities(n)}} rows={3} style={{flex:1,border:`1.5px solid ${DS.surface.border}`,borderRadius:DS.radius.md,padding:"12px 14px",fontSize:13,fontFamily:DS.font.body,outline:"none",color:DS.text.body,background:DS.surface.page,lineHeight:1.6,resize:"vertical"}}/>
                <button type="button" onClick={()=>setAiResponsibilities(p=>p.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:"#dc2626",cursor:"pointer",fontSize:16,paddingTop:10,flexShrink:0}}>✕</button>
              </div>
            ))}
            <div style={{display:"flex",gap:8,marginTop:6}}>
              <button type="button" onClick={()=>setAiResponsibilities(p=>[...p,""])} style={{fontSize:11,color:DS.brand.blue700,background:"none",border:`1px dashed ${DS.surface.border}`,borderRadius:DS.radius.sm,padding:"7px 16px",cursor:"pointer",fontFamily:DS.font.body}}>+ Add</button>
              {aiGenerated&&<button type="button" onClick={()=>show("✅ Responsibilities saved")} style={{fontSize:11,color:"#fff",background:"#059669",border:"none",borderRadius:DS.radius.sm,padding:"7px 16px",cursor:"pointer",fontFamily:DS.font.heading,fontWeight:600}}>✓ Save</button>}
            </div>
          </div>
        </>}
      </div>

      {/* Technical Stack or Professional Tools */}
      <div style={{background:"#fff",borderRadius:DS.radius.xl,padding:"24px 28px",marginBottom:16,border:`1px solid ${DS.surface.border}`,boxShadow:DS.shadow.sm}}>
        <div style={{fontSize:11,fontWeight:700,color:DS.brand.blue700,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:16,fontFamily:DS.font.heading}}>{isProfCat?"Professional Tools":"Technical Stack"}</div>
        {isProfCat?<PRow l="Tools" v={profTools}/>:null}
        <PRow l="Languages" v={langs}/><PRow l="Versions" v={vL}/><PRow l="Frameworks" v={fws}/><PRow l="Cloud" v={clds}/><PRow l="Services" v={cldSvcs}/><PRow l="Databases" v={dbs}/><PRow l="DevOps" v={dvps}/>{qas.length>0&&<PRow l="QA Tools" v={qas}/>}<PRow l="ERP" v={erps}/><PRow l="Other" v={oTech}/>
      </div>

      {/* Details */}
      <div style={{background:"#fff",borderRadius:DS.radius.xl,padding:"24px 28px",marginBottom:24,border:`1px solid ${DS.surface.border}`,boxShadow:DS.shadow.sm}}>
        <div style={{fontSize:11,fontWeight:700,color:DS.brand.blue700,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:16,fontFamily:DS.font.heading}}>Details & Requirements</div>
        <PRow l="English" v={engl}/><PRow l="Location" v={loc}/><PRow l="Time Zone" v={tz}/><PRow l="Academia" v={acad}/><PRow l="Certs" v={certs}/><PRow l="Methodology" v={meths}/><PRow l="Industry" v={inds}/><PRow l="AI Tools" v={[...aiTs,...(otherAI?[otherAI]:[])].filter(Boolean)}/><PRow l="Visa" v={visa}/><PRow l="Travel" v={travel}/><PRow l="Holidays" v={holCo}/><PRow l="Start" v={sDate}/>{notes&&<PRow l="Notes" v={notes}/>}
      </div>

      {/* Talent Discovery Shop notice */}
      <div style={{background:"linear-gradient(135deg,#F3F0FF,#EDE9FE)",borderRadius:DS.radius.xl,padding:"24px 28px",marginBottom:24,border:"1px solid #DDD6FE",display:"flex",gap:16,alignItems:"center"}}>
        <div style={{width:56,height:56,borderRadius:DS.radius.lg,background:"linear-gradient(135deg,#5B21B6,#7C3AED)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 4px 16px rgba(124,58,237,0.2)",fontSize:28}}>🧑‍⚕️</div>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{fontSize:14,fontWeight:700,color:"#5B21B6",fontFamily:DS.font.heading}}>Soft Skills — Talent Discovery Shop</div><span style={{fontSize:16,fontWeight:800,color:"#7C3AED",fontFamily:"serif"}}>Ψ</span></div>
          <div style={{fontSize:12,color:"#7C3AED",fontFamily:DS.font.body,marginTop:4,lineHeight:1.5}}>Behavioral analysis, personality assessment, and cultural fit evaluation will be completed by our psychologist during the Talent Discovery phase. This ensures a comprehensive candidate profile beyond technical skills.</div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <button type="button" onClick={handleSubmit} disabled={subm} style={{flex:"1 1 260px",background:`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`,color:"#fff",border:"none",borderRadius:DS.radius.md,padding:"18px 24px",fontSize:16,fontWeight:700,cursor:subm?"wait":"pointer",fontFamily:DS.font.heading,boxShadow:DS.shadow.blue,opacity:subm?.7:1,transition:`all .25s ${DS.ease.snap}`,letterSpacing:"-0.01em",animation:subm?"none":"pulseGlow 2s infinite"}}>{subm?"⏳ Submitting...":"🚀 Submit Profile Request"}</button>
        <button type="button" onClick={handlePreview} style={{flex:"0 0 auto",background:"#fff",color:DS.text.h2,border:`1.5px solid ${DS.surface.border}`,borderRadius:DS.radius.md,padding:"16px 24px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:DS.font.heading,boxShadow:DS.shadow.sm,transition:`all .2s ${DS.ease.snap}`}}>📄 Preview PDF</button>
      </div>
      <div style={{textAlign:"center",marginTop:20}}><button type="button" onClick={handleReset} style={{fontSize:12,color:DS.text.faint,background:"none",border:"none",cursor:"pointer",fontFamily:DS.font.body,textDecoration:"underline",textUnderlineOffset:3}}>Start over</button></div>
    </StaggerIn>)};

  const steps=[s0,s1,s2,s3,s4,s5,s6,s7];

  const renderH=()=>(<div style={{animation:"fadeUp .3s both"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}><h2 style={{fontSize:18,fontWeight:700,color:"#0D2550"}}>My Requests ({myPs.length})</h2><button type="button" onClick={()=>setShowH(false)} style={{fontSize:13,color:"#1B6FE8",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:500}}>← Back</button></div>{!myPs.length?<div style={{textAlign:"center",padding:48,color:"#94a3b8"}}><div style={{fontSize:40,marginBottom:8}}>📂</div>No requests yet.</div>:myPs.map(p=>(<div key={p.id} style={{background:"rgba(255,255,255,0.85)",border:"1.5px solid #e2e8f0",borderRadius:14,padding:16,marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}><div><div style={{fontSize:14,fontWeight:600,color:"#0D2550"}}>{p.role} — {p.seniority}</div><div style={{fontSize:12,color:"#64748b"}}>{p.category} · {p.client_company}</div><div style={{fontSize:11,color:"#94a3b8"}}>{new Date(p.created_at).toLocaleDateString()}</div></div><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:11,fontWeight:600,color:STATUS_COLORS[p.status],background:`${STATUS_COLORS[p.status]}15`,padding:"4px 10px",borderRadius:20}}>{STATUS_LABELS[p.status]||"New"}</span><a href={`/api/pdf/${p.id}`} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:"#1B6FE8",border:"1px solid #1B6FE8",borderRadius:6,padding:"4px 10px",textDecoration:"none"}}>PDF</a></div></div></div>))}</div>);

  return(<div style={{minHeight:"100vh",background:"linear-gradient(160deg,#EEF2F7 0%,#E8EEF6 30%,#F8FAFC 100%)",fontFamily:DS.font.body,display:"flex",flexDirection:"column"}}>
    {toast&&<div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",zIndex:100,background:"#0D2550",color:"#fff",padding:"12px 28px",borderRadius:12,fontSize:13,fontWeight:500,boxShadow:"0 8px 32px rgba(13,37,80,0.3)",animation:"fadeUp .3s both",whiteSpace:"nowrap",maxWidth:"90vw",overflow:"hidden",textOverflow:"ellipsis"}}>{toast}</div>}
    <div style={{background:`linear-gradient(135deg,${DS.brand.navy900},#1B3A70 60%,${DS.brand.blue700})`,padding:isMob?"16px 0 12px":"20px 0 28px",position:"sticky",top:0,zIndex:30,boxShadow:"0 4px 24px rgba(13,37,80,0.2)",overflow:"hidden"}}>
      <HeaderBG/>
      <div style={{maxWidth:880,margin:"0 auto",padding:"0 16px",position:"relative",zIndex:1}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}><div style={{fontSize:isMob?18:22,fontWeight:800,color:"#fff",letterSpacing:1.5,fontFamily:DS.font.heading}}>BOZ<span style={{color:DS.brand.cyan600}}>.</span>{!isMob&&<span style={{fontSize:13,fontWeight:400,marginLeft:10,opacity:.6,fontFamily:DS.font.body}}>{cComp?`for ${cComp}`:"Verified Fit"}</span>}</div><div style={{display:"flex",gap:6}}><button type="button" onClick={()=>setShowH(!showH)} style={{fontSize:isMob?11:12,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:DS.radius.md,padding:isMob?"5px 10px":"7px 14px",color:"rgba(255,255,255,0.85)",cursor:"pointer",fontFamily:DS.font.body,display:"flex",alignItems:"center",gap:5,fontWeight:500}}>📂{!isMob&&" History"}<span style={{background:"rgba(255,255,255,0.15)",padding:"1px 7px",borderRadius:DS.radius.pill,fontSize:10}}>{myPs.length}</span></button><button type="button" onClick={handleReset} style={{fontSize:isMob?11:12,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:DS.radius.md,padding:isMob?"5px 10px":"7px 14px",color:"rgba(255,255,255,0.85)",cursor:"pointer",fontFamily:DS.font.body}}>↺</button><button type="button" onClick={signOut} style={{fontSize:isMob?11:12,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:DS.radius.md,padding:isMob?"5px 10px":"7px 14px",color:"rgba(255,255,255,0.55)",cursor:"pointer",fontFamily:DS.font.body}}>Out</button></div></div>
      {!showH&&<div style={{padding:"8px 0 0"}}>
        {/* Progress dots + lines */}
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"center",gap:0}}>
          {STEPS.map((s,i)=>{
            const isActive=i===step;const isDone=i<step;const isClickable=i<=step;
            return(<div key={s} style={{display:"flex",alignItems:"flex-start",flex:i<STEPS.length-1?1:"none"}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,minWidth:isMob?22:0}}>
                {/* Dot */}
                <button type="button" onClick={()=>isClickable&&go(i)} style={{width:isActive?28:isDone?22:18,height:isActive?28:isDone?22:18,borderRadius:"50%",border:"none",cursor:isClickable?"pointer":"default",transition:`all .3s ${DS.ease.snap}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,background:isActive?"#fff":isDone?`linear-gradient(135deg,${DS.brand.blue700},${DS.brand.cyan600})`:"rgba(255,255,255,0.08)",color:isActive?DS.brand.navy900:isDone?"#fff":"rgba(255,255,255,0.25)",fontSize:isActive?10:isDone?9:8,fontWeight:700,fontFamily:DS.font.heading,boxShadow:isActive?`0 0 0 3px rgba(255,255,255,0.12)`:isDone?"0 0 0 2px rgba(27,111,232,0.2)":"none"}}>
                  {isDone?"✓":(i+1)}
                </button>
                {/* Label */}
                {!isMob&&<div style={{fontSize:8.5,fontWeight:isActive?600:500,color:isActive?"rgba(255,255,255,0.85)":isDone?"rgba(255,255,255,0.5)":"rgba(255,255,255,0.18)",fontFamily:DS.font.body,letterSpacing:"0.03em",textTransform:"uppercase",transition:`all .3s ${DS.ease.default}`,whiteSpace:"nowrap"}}>{s}</div>}
              </div>
              {/* Connecting line */}
              {i<STEPS.length-1&&<div style={{flex:1,height:2,marginTop:isActive?13:isDone?10:8,marginLeft:isMob?2:4,marginRight:isMob?2:4,position:"relative",background:"rgba(255,255,255,0.06)",borderRadius:1,overflow:"hidden"}}>
                <div style={{position:"absolute",left:0,top:0,height:"100%",width:isDone?"100%":isActive?"50%":"0%",background:`linear-gradient(90deg,${DS.brand.blue700},${DS.brand.cyan600})`,borderRadius:1,transition:`width .6s ${DS.ease.smooth}`}}/>
              </div>}
            </div>);
          })}
        </div>
        {isMob&&<div style={{textAlign:"center",marginTop:8,fontSize:10,color:"rgba(255,255,255,0.5)",fontFamily:DS.font.body,fontWeight:500}}>{STEPS[step]} <span style={{color:"rgba(255,255,255,0.25)"}}>({step+1}/{STEPS.length})</span></div>}
      </div>}</div>
    </div>
    <div style={{maxWidth:880,margin:"0 auto",padding:isMob?"16px 12px 80px":"24px 20px 80px",flex:1,width:"100%"}}>
      {showH?renderH():(
        <div key={ak} style={{animation:`slide${dir>0?"In":"Back"} .35s both`}}>
          {steps[step]()}
          {step!==1&&step<7&&!done&&(<div style={{display:"flex",justifyContent:"space-between",marginTop:36,paddingTop:20,borderTop:"none",background:"linear-gradient(to right,transparent,rgba(0,0,0,0.04),transparent)",height:1,marginBottom:20}}></div>)}
          {step!==1&&step<7&&!done&&(<div style={{display:"flex",justifyContent:"space-between"}}><button type="button" onClick={()=>go(Math.max(0,step-1))} disabled={step===0} style={{padding:"12px 24px",fontSize:13,borderRadius:DS.radius.md,border:`1.5px solid ${DS.surface.border}`,background:"#fff",color:DS.text.body,cursor:step===0?"not-allowed":"pointer",fontFamily:DS.font.heading,fontWeight:500,opacity:step===0?.3:1,transition:`all .2s ${DS.ease.snap}`,boxShadow:DS.shadow.sm}}>← Back</button><button type="button" onClick={()=>go(step+1)} disabled={!canN()} style={{padding:"12px 30px",fontSize:13.5,borderRadius:DS.radius.md,border:"none",fontWeight:600,fontFamily:DS.font.heading,background:canN()?`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`:"#e2e8f0",color:canN()?"#fff":DS.text.faint,cursor:canN()?"pointer":"not-allowed",boxShadow:canN()?DS.shadow.blue:"none",transition:`all .25s ${DS.ease.snap}`,letterSpacing:"-0.005em"}}>{step===6?"Review →":"Next →"}</button></div>)}
        </div>
      )}
    </div>
    <Footer/>
    {/* Floating AI Assistant */}
    <FloatingAssistant context={{step:STEPS[step],role:fRole,category:cat,seniority:sen,experience:exp,languages:langs,frameworks:fws,mustHave:mh,niceToHave:nh,englishLevel:engl,location:loc}}/>
    <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}@keyframes slideBack{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:translateX(0)}}@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes staggerReveal{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes float{0%,100%{transform:translate(0,0)}50%{transform:translate(20px,-15px)}}@keyframes shimmer{to{background-position:-200% 0}}@keyframes pulseGlow{0%,100%{box-shadow:0 0 0 0 rgba(27,111,232,0.4)}50%{box-shadow:0 0 0 8px rgba(27,111,232,0)}}*{box-sizing:border-box}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:3px}::-webkit-scrollbar-thumb:hover{background:#94A3B8}input:focus,select:focus,textarea:focus{border-color:#1B6FE8!important;box-shadow:0 0 0 3px rgba(27,111,232,0.1)!important;outline:none}::placeholder{color:#CBD5E1!important}`}</style>
  </div>);
}

// ═══════════ FLOATING AI ASSISTANT ═══════════
function FloatingAssistant({context}){
  const[open,setOpen]=useState(false);
  const ctxStr=context?`\n\nCURRENT FORM STATE:\n${JSON.stringify(context,null,0).substring(0,800)}`:"";
  return(<>
    {!open&&<button type="button" onClick={()=>setOpen(true)} style={{position:"fixed",bottom:24,right:24,width:56,height:56,borderRadius:"50%",background:`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`,border:"none",cursor:"pointer",boxShadow:`0 4px 20px rgba(13,37,80,0.3)`,display:"flex",alignItems:"center",justifyContent:"center",zIndex:40,transition:`all .3s ${DS.ease.snap}`,animation:"pulseGlow 3s infinite"}} onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.1)"}} onMouseLeave={e=>{e.currentTarget.style.transform="scale(1)"}}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
    </button>}
    {open&&<div style={{position:"fixed",bottom:24,right:24,width:380,maxHeight:520,borderRadius:DS.radius.xxl,overflow:"hidden",boxShadow:DS.shadow.lg,zIndex:50,animation:"fadeUp .25s both",display:"flex",flexDirection:"column",background:"#fff",border:`1px solid ${DS.surface.border}`}}>
      <div style={{background:`linear-gradient(135deg,${DS.brand.navy900},${DS.brand.blue700})`,padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 2a10 10 0 0110 10 10 10 0 01-10 10A10 10 0 012 12 10 10 0 0112 2z"/><path d="M12 16v-4M12 8h.01"/></svg></div>
          <div><div style={{fontSize:13,fontWeight:600,color:"#fff",fontFamily:DS.font.heading}}>BOZ Assistant</div><div style={{fontSize:10,color:"rgba(255,255,255,0.5)"}}>Smart staffing help</div></div>
        </div>
        <button type="button" onClick={()=>setOpen(false)} style={{background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",width:28,height:28,borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>✕</button>
      </div>
      <div style={{flex:1,overflow:"hidden"}}><AIChat systemPrompt={AI_PROMPTS.platform_help+ctxStr} placeholder="Ask me anything about the platform..."/></div>
    </div>}
  </>);
}

// ═══════════ SALES MODULE ═══════════
function SalesModule({user}){
  const[ps,setPs]=useState([]);const[ld,setLd]=useState(true);
  const[toast,setToast]=useState("");const[linkCopied,setLinkCopied]=useState(false);
  const[inviteEmail,setInviteEmail]=useState("");const[filterSales,setFilterSales]=useState("all");
  const isMob=useW()<640;
  const show=(m)=>{setToast(m);setTimeout(()=>setToast(""),3500)};
  const clientLink=`${window.location.origin}`;

  useEffect(()=>{
    (async()=>{try{
      // Sales uses client API to see all profiles
      const r=await fetch("/api/admin",{headers:{"Authorization":`Bearer ${localStorage.getItem("sb-access-token")}`,"Content-Type":"application/json"}});
      if(r.ok){const d=await r.json();if(Array.isArray(d))setPs(d)}
    }catch(e){console.warn("Sales load:",e)}finally{setLd(false)}})();
  },[]);

  const copyLink=()=>{navigator.clipboard.writeText(clientLink).then(()=>{setLinkCopied(true);setTimeout(()=>setLinkCopied(false),2000);show("✅ Link copied!")}).catch(()=>show("⚠️ Copy failed"))};
  const sendInvite=()=>{if(!inviteEmail.includes("@"))return show("⚠️ Enter valid email");
    // For now, just copy link — real email sending would use EmailJS or similar
    navigator.clipboard.writeText(`${clientLink}`);show(`✅ Link copied for ${inviteEmail}`);setInviteEmail("")};

  const clients=[...new Set(ps.map(p=>p.client_company).filter(Boolean))];
  const filtered=filterSales==="all"?ps:ps.filter(p=>p.client_company===filterSales);
  const byStatus={};Object.keys(STATUS_LABELS).forEach(s=>{byStatus[s]=filtered.filter(p=>p.status===s).length});

  if(ld)return<div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:DS.surface.page}}><Spinner text="Loading..."/></div>;

  return(<div style={{minHeight:"100vh",background:`linear-gradient(160deg,#ECFDF5,#D1FAE5 30%,${DS.surface.page})`,fontFamily:DS.font.body,display:"flex",flexDirection:"column"}}>
    {toast&&<div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",zIndex:100,background:toast.includes("⚠️")?"#dc2626":"#059669",color:"#fff",padding:"12px 28px",borderRadius:DS.radius.lg,fontSize:13,fontWeight:500,boxShadow:DS.shadow.lg,animation:"fadeUp .3s both"}}>{toast}</div>}
    <div style={{background:"linear-gradient(135deg,#064E3B,#059669,#10b981)",padding:"0",position:"relative",overflow:"hidden"}}>
      <HeaderBG/>
      <div style={{maxWidth:1000,margin:"0 auto",padding:"18px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"relative",zIndex:1}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <span style={{fontSize:22,fontWeight:800,color:"#fff",letterSpacing:1.5,fontFamily:DS.font.heading}}>BOZ<span style={{color:"#6EE7B7"}}>.</span></span>
          <div style={{height:20,width:1,background:"rgba(255,255,255,0.15)"}}/>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:30,height:30,borderRadius:DS.radius.md,background:"rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>💼</div>
            <span style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.8)",fontFamily:DS.font.heading}}>Sales</span>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:12,color:"rgba(255,255,255,0.7)",fontFamily:DS.font.body}}>{user.email}</span>
          <button onClick={signOut} type="button" style={{fontSize:11,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:DS.radius.md,padding:"7px 14px",color:"rgba(255,255,255,0.7)",cursor:"pointer",fontFamily:DS.font.body}}>Sign Out</button>
        </div>
      </div>
    </div>
    <div style={{maxWidth:1000,margin:"0 auto",padding:"24px",flex:1,width:"100%"}}>
      {/* Send link card */}
      <div style={{background:"#fff",borderRadius:DS.radius.xl,padding:"24px 28px",marginBottom:20,border:`1px solid ${DS.surface.border}`,boxShadow:DS.shadow.sm}}>
        <div style={{fontSize:16,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading,marginBottom:4}}>Send Profile Request to Client</div>
        <div style={{fontSize:12,color:DS.text.muted,fontFamily:DS.font.body,marginBottom:16}}>Share this link so clients can fill out their staffing requirements</div>
        <div style={{display:"flex",gap:10,marginBottom:12,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:200,background:DS.surface.sunken,borderRadius:DS.radius.md,padding:"12px 16px",fontSize:13,color:DS.text.body,fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",border:`1px solid ${DS.surface.border}`}}>{clientLink}</div>
          <button type="button" onClick={copyLink} style={{background:linkCopied?"#059669":`linear-gradient(135deg,#064E3B,#059669)`,color:"#fff",border:"none",borderRadius:DS.radius.md,padding:"12px 24px",fontSize:13,fontWeight:600,fontFamily:DS.font.heading,cursor:"pointer",transition:"all .2s",boxShadow:"0 4px 12px rgba(5,150,105,0.2)"}}>{linkCopied?"✓ Copied!":"📋 Copy Link"}</button>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <input type="email" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="client@company.com" style={{flex:1,border:`1.5px solid ${DS.surface.border}`,borderRadius:DS.radius.sm,padding:"10px 14px",fontSize:13,fontFamily:DS.font.body,outline:"none"}}/>
          <button type="button" onClick={sendInvite} style={{background:"#fff",color:"#059669",border:"1.5px solid #059669",borderRadius:DS.radius.md,padding:"10px 20px",fontSize:12,fontWeight:600,fontFamily:DS.font.heading,cursor:"pointer"}}>📧 Send Invite</button>
        </div>
      </div>

      {/* Status overview */}
      <div style={{display:"grid",gridTemplateColumns:isMob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:20}}>
        {[["new","New Requests"],["pending_review","In Review"],["pending_soft","Talent Discovery"],["filled","Filled"]].map(([s,label])=>(
          <div key={s} style={{background:"#fff",borderRadius:DS.radius.lg,padding:"16px 18px",border:`1px solid ${DS.surface.border}`,boxShadow:DS.shadow.sm,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:STATUS_COLORS[s]}}/>
            <div style={{fontSize:28,fontWeight:800,color:DS.text.h1,fontFamily:DS.font.heading,lineHeight:1}}>{byStatus[s]||0}</div>
            <div style={{fontSize:11,color:DS.text.muted,fontFamily:DS.font.body,marginTop:4}}>{label}</div>
          </div>
        ))}
      </div>

      {/* Real metrics dashboard */}
      {ps.length>0&&(<div style={{background:"#fff",borderRadius:DS.radius.xl,padding:"20px 24px",marginBottom:20,border:`1px solid ${DS.surface.border}`,boxShadow:DS.shadow.sm}}>
        <div style={{fontSize:14,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading,marginBottom:14}}>📊 Pipeline Metrics</div>
        <div style={{display:"grid",gridTemplateColumns:isMob?"repeat(2,1fr)":"repeat(3,1fr)",gap:16}}>
          {(()=>{
            const now=Date.now();
            const totalProfiles=ps.length;
            const activeProfiles=ps.filter(p=>!["closed","filled"].includes(p.status)).length;
            const filledCount=ps.filter(p=>p.status==="filled").length;
            const conversionRate=totalProfiles?Math.round((filledCount/totalProfiles)*100):0;
            const avgAgeDays=ps.length?Math.round(ps.reduce((s,p)=>(now-new Date(p.created_at).getTime())/86400000+s,0)/ps.length):0;
            const uniqueClients=[...new Set(ps.map(p=>p.client_company).filter(Boolean))].length;
            const topCategories={};ps.forEach(p=>{topCategories[p.category]=(topCategories[p.category]||0)+1});
            const topCat=Object.entries(topCategories).sort((a,b)=>b[1]-a[1])[0];
            const thisMonth=ps.filter(p=>{const d=new Date(p.created_at);const n=new Date();return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear()}).length;
            const lastMonth=ps.filter(p=>{const d=new Date(p.created_at);const n=new Date();n.setMonth(n.getMonth()-1);return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear()}).length;
            const growth=lastMonth?Math.round(((thisMonth-lastMonth)/lastMonth)*100):thisMonth>0?100:0;
            return[
              {label:"Total Profiles",value:totalProfiles,sub:`${activeProfiles} active`},
              {label:"Conversion Rate",value:`${conversionRate}%`,sub:`${filledCount} filled`},
              {label:"Unique Clients",value:uniqueClients,sub:topCat?`Top: ${topCat[0]}`:"—"},
              {label:"Avg. Age",value:`${avgAgeDays}d`,sub:"days in pipeline"},
              {label:"This Month",value:thisMonth,sub:growth>0?`↑ ${growth}% vs last`:growth<0?`↓ ${Math.abs(growth)}% vs last`:"same as last"},
              {label:"Categories",value:Object.keys(topCategories).length,sub:`${totalProfiles} across all`},
            ].map((m,i)=>(<div key={i} style={{padding:"12px 0",borderBottom:i<5?`1px solid ${DS.surface.borderLight}`:"none"}}>
              <div style={{fontSize:10,color:DS.text.faint,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em",fontFamily:DS.font.body,marginBottom:3}}>{m.label}</div>
              <div style={{fontSize:22,fontWeight:800,color:DS.text.h1,fontFamily:DS.font.heading,lineHeight:1}}>{m.value}</div>
              <div style={{fontSize:10,color:DS.text.muted,fontFamily:DS.font.body,marginTop:2}}>{m.sub}</div>
            </div>));
          })()}
        </div>
      </div>)}

      {/* Filter */}
      <div style={{display:"flex",gap:10,marginBottom:16}}>
        <select value={filterSales} onChange={e=>setFilterSales(e.target.value)} style={{fontSize:12,border:`1.5px solid ${DS.surface.border}`,borderRadius:DS.radius.sm,padding:"8px 12px",fontFamily:DS.font.body,background:"#fff",cursor:"pointer"}}>
          <option value="all">All clients ({ps.length})</option>
          {clients.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Profiles list */}
      <div style={{background:"#fff",borderRadius:DS.radius.xl,border:`1px solid ${DS.surface.border}`,overflow:"hidden",boxShadow:DS.shadow.sm}}>
        <div style={{padding:"16px 22px",borderBottom:`1px solid ${DS.surface.borderLight}`,fontSize:14,fontWeight:700,color:DS.text.h1,fontFamily:DS.font.heading}}>Recruitment Pipeline ({filtered.length})</div>
        {filtered.map((p,i)=>(
          <div key={p.id} style={{padding:"14px 22px",borderBottom:`1px solid ${DS.surface.borderLight}`,display:"flex",justifyContent:"space-between",alignItems:"center",animation:`fadeUp .3s ${i*0.03}s both`}}>
            <div><div style={{fontSize:13,fontWeight:600,color:DS.text.h1,fontFamily:DS.font.heading}}>{p.role} — {p.seniority}</div><div style={{fontSize:12,color:DS.text.muted,fontFamily:DS.font.body,marginTop:2}}>{p.client_name} ({p.client_company})</div></div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:10,fontWeight:600,color:STATUS_COLORS[p.status],background:`${STATUS_COLORS[p.status]}15`,padding:"4px 12px",borderRadius:DS.radius.pill}}>{STATUS_LABELS[p.status]}</span>
              <div style={{fontSize:10,color:DS.text.faint}}>{new Date(p.created_at).toLocaleDateString()}</div>
            </div>
          </div>
        ))}
        {!filtered.length&&<div style={{textAlign:"center",padding:48,color:DS.text.faint,fontFamily:DS.font.body}}><div style={{fontSize:36,marginBottom:10}}>📋</div>No profiles yet. Send the link to your first client!</div>}
      </div>
    </div>
    <Footer/>
    <FloatingAssistant context={{module:"Sales"}}/>
    <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes pulseGlow{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0.4)}50%{box-shadow:0 0 0 6px rgba(16,185,129,0)}}`}</style>
  </div>);
}

// ═══════════ FINANCE MODULE ═══════════
function FinanceModule({user}){
  return(<div style={{minHeight:"100vh",background:`linear-gradient(160deg,#F0F9FF,#E0F2FE 30%,${DS.surface.page})`,fontFamily:DS.font.body,display:"flex",flexDirection:"column"}}>
    <div style={{background:"linear-gradient(135deg,#0C4A6E,#0369A1,#0EA5E9)",padding:"0",position:"relative",overflow:"hidden"}}>
      <HeaderBG/>
      <div style={{maxWidth:900,margin:"0 auto",padding:"18px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"relative",zIndex:1}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <span style={{fontSize:22,fontWeight:800,color:"#fff",letterSpacing:1.5,fontFamily:DS.font.heading}}>BOZ<span style={{color:"#7DD3FC"}}>.</span></span>
          <div style={{height:20,width:1,background:"rgba(255,255,255,0.15)"}}/>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:30,height:30,borderRadius:DS.radius.md,background:"rgba(255,255,255,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>💰</div>
            <span style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.8)",fontFamily:DS.font.heading}}>Finance</span>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:12,color:"rgba(255,255,255,0.7)",fontFamily:DS.font.body}}>{user.email}</span>
          <button onClick={signOut} type="button" style={{fontSize:11,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:DS.radius.md,padding:"7px 14px",color:"rgba(255,255,255,0.7)",cursor:"pointer",fontFamily:DS.font.body}}>Sign Out</button>
        </div>
      </div>
    </div>
    <div style={{maxWidth:900,margin:"0 auto",padding:"48px 24px",flex:1,width:"100%",textAlign:"center"}}>
      <div style={{width:80,height:80,borderRadius:"50%",background:"linear-gradient(135deg,#0369A1,#0EA5E9)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px",fontSize:36,boxShadow:"0 8px 32px rgba(14,165,233,0.2)"}}>💰</div>
      <div style={{fontSize:28,fontWeight:800,color:DS.text.h1,fontFamily:DS.font.heading,letterSpacing:"-0.02em"}}>Finance Module</div>
      <div style={{fontSize:14,color:DS.text.muted,fontFamily:DS.font.body,marginTop:12,maxWidth:500,margin:"12px auto 0",lineHeight:1.6}}>Budget approvals, cost tracking, and financial oversight for the recruitment pipeline. This module is coming in a future update.</div>
      <div style={{display:"inline-flex",alignItems:"center",gap:8,marginTop:24,background:"#fff",padding:"12px 24px",borderRadius:DS.radius.pill,fontSize:13,color:"#0369A1",fontFamily:DS.font.heading,fontWeight:600,border:"1.5px solid #BAE6FD",boxShadow:DS.shadow.sm}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:"#0EA5E9",animation:"pulseGlow 2s infinite"}}/>
        Coming Soon
      </div>
    </div>
    <Footer/>
    <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes pulseGlow{0%,100%{box-shadow:0 0 0 0 rgba(14,165,233,0.4)}50%{box-shadow:0 0 0 6px rgba(14,165,233,0)}}`}</style>
  </div>);
}
