/* PulseChart v2 — shared helpers, icons, wordmark, sidebar, clinic settings. Loaded on every page. */

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

/* ---------- icon set ---------- */
const ICONS = {
  users:'<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6"/><circle cx="16.5" cy="9" r="2.6"/><path d="M15.5 14.6c2.3.2 4.2 1.6 4.9 4.4"/>',
  file:'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h5"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  camera:'<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  paperclip:'<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="m9.5 15.5 2 2 3.5-3.5"/>',
  pill:'<rect x="3" y="8" width="18" height="8" rx="4"/><path d="M12 8v8"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  activity:'<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  scan:'<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M7 12h10"/>',
  chevdown:'<path d="m6 9 6 6 6-6"/>',
  chevup:'<path d="m18 15-6-6-6 6"/>',
  chevleft:'<path d="m15 18-6-6 6-6"/>',
  chevright:'<path d="m9 18 6-6-6-6"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  trash:'<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6M14 11v6"/>',
  sliders:'<path d="M4 7h10M18 7h2M4 12h4M12 12h8M4 17h13"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="19" cy="17" r="2"/>',
  userplus:'<circle cx="10" cy="8" r="3.4"/><path d="M4 19.5c.7-3.2 3-5 6-5s5.3 1.8 6 5"/><path d="M19 7v6M16 10h6"/>',
};
const icon = (name, size = 15) =>
  `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;

document.querySelectorAll("[data-ic]").forEach(el => {
  el.insertAdjacentHTML("afterbegin", icon(el.dataset.ic, el.dataset.size || 15));
});

/* ---------- wordmark (Option H: Pulse, Chart, accent dot) ---------- */
const WORDMARK_DARK = `<span class="wordmark wm-dark"><b>Pulse</b><span class="lw">Chart</span><i class="dot"></i></span>`;
const WORDMARK_LIGHT = `<span class="wordmark wm-light"><b>Pulse</b><span class="lw">Chart</span><i class="dot"></i></span>`;

/* sidebar wordmark on every page */
document.querySelectorAll(".slogo").forEach(el => {
  if (el.dataset.logo) return;
  el.dataset.logo = "1";
  el.innerHTML = `<span class="slogotext">${WORDMARK_DARK}<small class="practice"></small></span>`;
});

/* login card wordmark */
const brandLogo = document.querySelector(".brand .logo");
if (brandLogo && !brandLogo.dataset.logo) {
  brandLogo.dataset.logo = "1";
  brandLogo.innerHTML = WORDMARK_LIGHT;
}

/* favicon: functional letter tile (a wordmark cannot render at 16px in a browser tab) */
const FAV_RAW = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 52 48'><path d='M3 33H14L17.5 24L21.5 41L25 27.5L27.5 33H33L44 13' stroke='#2E8B66' stroke-width='6.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/><circle cx='44' cy='13' r='5.5' fill='#3FA47A'/></svg>`;
  `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,${encodeURIComponent(FAV_RAW)}">`);

/* ---------- sidebar navigation ---------- */
const NAV_LINKS = {
  "Patients": "index.html",
  "Follow-ups": "followups.html",
  "Drug favorites": "favorites.html",
  "Staff": "staff.html",
  "Settings": "settings.html",
};
{
  const here = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav span").forEach(el => {
    const label = (el.textContent || "").replace(/soon/i, "").trim();
    const href = NAV_LINKS[label];
    if (!href) return;
    const chip = el.querySelector(".soon");
    if (chip) chip.remove();
    el.title = label;
    if (here !== href) {
      el.style.cursor = "pointer";
      el.onclick = () => location.href = href;
    }
  });
}

/* ---------- collapsible sidebar ---------- */
{
  const side = document.querySelector(".side");
  if (side) {
    let saved = null;
    try { saved = localStorage.getItem("pc-side"); } catch (_) {}
    if (saved === "collapsed") document.body.classList.add("side-collapsed");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "side-toggle";
    btn.title = "Toggle sidebar";
    side.insertBefore(btn, side.querySelector(".suser"));
    const paint = () => {
      const c = document.body.classList.contains("side-collapsed");
      btn.innerHTML = icon(c ? "chevright" : "chevleft", 14) + `<span>${c ? "" : "Collapse"}</span>`;
    };
    paint();
    btn.onclick = () => {
      document.body.classList.toggle("side-collapsed");
      try { localStorage.setItem("pc-side", document.body.classList.contains("side-collapsed") ? "collapsed" : "expanded"); } catch (_) {}
      paint();
    };
  }
}

/* ---------- clinic settings (loaded from the settings table) ---------- */
let CLINIC = {
  loaded: false,
  practice_name: CONFIG.PRACTICE_NAME,
  practice_phone: "",
  practice_address: "",
  complaint_chips: null,
  reminder_template: null,
};
async function loadClinic() {
  if (!sb) return;
  const { data } = await sb.from("settings").select("*").eq("id", 1).maybeSingle();
  if (data) {
    CLINIC.loaded = true;
    if (data.practice_name) CLINIC.practice_name = data.practice_name;
    CLINIC.practice_phone = data.practice_phone || "";
    CLINIC.practice_address = data.practice_address || "";
    CLINIC.complaint_chips = Array.isArray(data.complaint_chips) ? data.complaint_chips : null;
    CLINIC.reminder_template = data.reminder_template || null;
  }
}
const DEFAULT_COMPLAINTS = ["Malaria", "Typhoid", "Hypertension review", "Diabetes review", "Fever", "Cough & catarrh", "Headache", "Body pain", "Abdominal pain"];
const DEFAULT_REMINDER = "Good day {name}, this is a reminder from {practice} about your follow-up visit on {date}. Kindly reply if you need to reschedule. Thank you.";

/* ---------- auto-capitalization ---------- */
function autoCapitalize(el) {
  if (!el) return;
  el.addEventListener("input", () => {
    const pos = el.selectionStart;
    const fixed = el.value.replace(/(^|\s)[a-z]/g, m => m.toUpperCase());
    if (fixed !== el.value) {
      el.value = fixed;
      try { el.setSelectionRange(pos, pos); } catch (_) {}
    }
  });
}

/* ---------- shared constants + helpers ---------- */
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : "";

const initialsOf = name => {
  const w = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!w.length) return "?";
  return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : w[0][1] || "")).toUpperCase();
};

/* ---------- Supabase client ---------- */
let sb = null;
if (!CONFIG.SUPABASE_URL.includes("PASTE-YOUR-PROJECT-URL")) {
  sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
}

/* ---------- toast ---------- */
let toastTimer = null;
function toast(text) {
  const t = $("toast");
  if (!t) return;
  t.textContent = text;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

/* ---------- formatters ---------- */
const fmtDate = iso => iso ? new Date(iso + "T00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
const fmtStamp = ts => new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const ageOf = dob => {
  if (!dob) return null;
  const d = new Date(dob), t = new Date();
  let a = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--;
  return a;
};

/* ---------- URL + auth ---------- */
const urlParam = k => new URLSearchParams(location.search).get(k);

function paintUser(staff) {
  document.querySelectorAll(".practice").forEach(el => el.textContent = CLINIC.practice_name || CONFIG.PRACTICE_NAME);
  const role = cap(staff.role);
  const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
  set("who", `${staff.name} · ${role}`);
  set("sideName", staff.name);
  set("sideRole", role);
  const av = $("whoAv"); if (av) av.textContent = initialsOf(staff.name);
}

async function requireStaff() {
  if (!sb) { location.href = "index.html"; return null; }
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { location.href = "index.html"; return null; }
  const { data: staff } = await sb.from("staff").select("*").eq("id", session.user.id).maybeSingle();
  if (!staff) { await sb.auth.signOut(); location.href = "index.html"; return null; }
  await loadClinic();
  paintUser(staff);
  return { user: session.user, staff };
}

/* default sign-out for sub-pages (the main page binds its own) */
{
  const bo = $("btnOut");
  if (bo) bo.onclick = async () => { if (sb) await sb.auth.signOut(); location.href = "index.html"; };
}

/* ---------- month/year range filters ---------- */
function buildMYFilter(prefix, { backYears = 5, fwdYears = 1 } = {}) {
  const now = new Date().getFullYear();
  const years = range(now - backYears, now + fwdYears).reverse();
  for (const which of ["from", "to"]) {
    $(`${prefix}-${which}-m`).innerHTML = `<option value="">Month</option>` +
      MONTHS.map((m, i) => `<option value="${String(i + 1).padStart(2, "0")}">${m}</option>`).join("");
    $(`${prefix}-${which}-y`).innerHTML = `<option value="">Year</option>` +
      years.map(y => `<option value="${y}">${y}</option>`).join("");
  }
}
const myValue = p => {
  const m = $(p + "-m").value, y = $(p + "-y").value;
  return (m && y) ? `${y}-${m}` : "";
};
const myClear = p => {
  $(p + "-from-m").value = ""; $(p + "-from-y").value = "";
  $(p + "-to-m").value = "";   $(p + "-to-y").value = "";
};
const ymOf = iso => (iso || "").slice(0, 7);
const inYMRange = (ym, from, to) => (!from || ym >= from) && (!to || ym <= to);

/* ---------- shared renderers ---------- */
function vitalsChips(v) {
  const chips = [];
  if (v.bp_sys != null && v.bp_dia != null) chips.push(`<span class="vc">BP ${v.bp_sys}/${v.bp_dia}</span>`);
  if (v.pulse != null) chips.push(`<span class="vc">Pulse ${v.pulse}</span>`);
  if (v.temp_c != null) chips.push(`<span class="vc">Temp ${v.temp_c}</span>`);
  if (v.weight_kg != null) chips.push(`<span class="vc">Wt ${v.weight_kg} kg</span>`);
  return chips.join("");
}

function visitCardHTML(v, labs) {
  const vits = v.vitals || [], rxs = v.prescriptions || [];
  const linked = (labs || []).filter(l => l.visit_id === v.id);
  return `
  <div class="vcard">
    <div class="vtop">
      <span class="vdate">${fmtStamp(v.created_at)}</span>
      ${v.follow_up_date ? `<span class="fubadge">Follow-up ${fmtDate(v.follow_up_date)}</span>` : ""}
    </div>
    <div class="v-cols">
      <div class="block">
        <h5>Consultation</h5>
        <div class="comp">${esc(v.complaint)}</div>
        ${v.diagnosis ? `<div class="dx">${esc(v.diagnosis)}</div>` : ""}
        ${v.notes ? `<div class="notes">${esc(v.notes)}</div>` : ""}
      </div>
      ${vits.length ? `
      <div class="block">
        <h5>Clinic vitals</h5>
        <div class="vitals">${vits.map(vitalsChips).join("")}</div>
      </div>` : ""}
    </div>
    ${linked.length ? `
    <div class="block" style="margin-top:12px">
      <h5>Lab results</h5>
      <div class="labchips">${linked.map(l => `
        <button type="button" class="labchip" data-open="${l.id}">${icon("file", 12)} ${esc(l.title)} ${icon("arrow", 11)}</button>`).join("")}</div>
    </div>` : ""}
    ${rxs.length ? `
    <div class="block" style="margin-top:12px">
      <h5>Prescriptions</h5>
      <div class="rxlist">${rxs.map(r => `
        <div class="rx">
          <div>
            <span class="rx-name">${esc(r.drug)}</span>
            <span class="rx-meta">${esc([r.dose, r.frequency, r.duration].filter(Boolean).join(" · "))}</span>
          </div>
          <button type="button" class="btn-tiny ${r.dispensed ? "done" : ""}" data-rx="${r.id}">
            ${r.dispensed ? icon("check", 11) + " Dispensed" : "Mark dispensed"}
          </button>
        </div>`).join("")}</div>
    </div>` : ""}
  </div>`;
}

function labRowHTML(l, linkedVisit) {
  return `
  <div class="labrow">
    <span class="lico">${icon(l.file_path.toLowerCase().endsWith(".pdf") ? "file" : "image", 15)}</span>
    <div style="min-width:0">
      <div class="lab-title">${esc(l.title)}</div>
      <div class="lab-meta">${l.result_date ? "Report " + fmtDate(l.result_date) + " · " : ""}added ${fmtStamp(l.created_at)}${linkedVisit ? ` · from visit ${fmtStamp(linkedVisit.created_at)}` : " · not linked"}</div>
    </div>
    <div class="lab-actions">
      <button type="button" class="btn-tiny" data-open="${l.id}">Open</button>
      <button type="button" class="btn-tiny" data-del="${l.id}" title="Delete permanently">${icon("trash", 13)}</button>
    </div>
  </div>`;
}

async function openLabFile(labs, labId) {
  const lab = (labs || []).find(l => l.id === labId);
  if (!lab) return;
  const { data, error } = await sb.storage.from("lab-files").createSignedUrl(lab.file_path, 3600);
  if (error || !data) return toast("Could not open file: " + (error ? error.message : "unknown error"));
  window.open(data.signedUrl, "_blank");
}