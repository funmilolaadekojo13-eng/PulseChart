/* PulseChart v2 — main app: auth · patients · visits · labs · collapsed vitals trend · clinic settings */

function msg(text, type = "error") {
  const b = $("banner");
  if (!text) { b.className = "banner"; b.textContent = ""; return; }
  b.textContent = text;
  b.className = "banner show " + type;
}

/* ---------- state ---------- */
let ME = null;
let allPatients = [];
let currentPatient = null;
let patientVisits = [];
let patientLabs = [];
let drugFavs = [];
let rxLines = [];
let trendMetric = "bp";
let trendOpen = false;

const PREVIEW_COUNT = 2;

/* ---------- date trio ---------- */
function buildDateTrio(id, { pastYears = 0, futureYears = 0 } = {}) {
  const now = new Date().getFullYear();
  const yLo = now - pastYears, yHi = now + futureYears;
  const descending = pastYears > 0 && futureYears === 0;
  const years = descending ? range(yLo, yHi).reverse() : range(yLo, yHi);
  $(id).innerHTML = `
    <select id="${id}-d"><option value="">Day</option>${range(1, 31).map(d => `<option value="${d}">${d}</option>`).join("")}</select>
    <select id="${id}-m"><option value="">Month</option>${MONTHS.map((m, i) => `<option value="${String(i + 1).padStart(2, "0")}">${m}</option>`).join("")}</select>
    <select id="${id}-y"><option value="">Year</option>${years.map(y => `<option value="${y}">${y}</option>`).join("")}</select>`;
}
function trioISO(id) {
  const box = $(id);
  const d = $(id + "-d").value, m = $(id + "-m").value, y = $(id + "-y").value;
  box.classList.remove("trio-bad");
  if (!d && !m && !y) return null;
  if (!d || !m || !y) { box.classList.add("trio-bad"); return null; }
  const dt = new Date(+y, +m - 1, +d);
  if (dt.getFullYear() !== +y || dt.getMonth() !== +m - 1 || dt.getDate() !== +d) {
    box.classList.add("trio-bad"); return null;
  }
  return `${y}-${m}-${String(d).padStart(2, "0")}`;
}
const trioBad = id => $(id).classList.contains("trio-bad");
function setTrio(id, iso) {
  if (!iso) { $(id + "-d").value = ""; $(id + "-m").value = ""; $(id + "-y").value = ""; return; }
  const [y, m, d] = iso.split("-");
  $(id + "-d").value = String(+d);
  $(id + "-m").value = m;
  $(id + "-y").value = y;
}

buildDateTrio("pf-dob",   { pastYears: 110 });
buildDateTrio("ed-dob",   { pastYears: 110 });
buildDateTrio("vf-follow",{ pastYears: 1, futureYears: 3 });
buildDateTrio("lf-date",  { pastYears: 30, futureYears: 1 });

autoCapitalize($("pf-name"));
autoCapitalize($("ed-name"));
autoCapitalize($("rg-name"));

/* ---------- misc ---------- */
const metaLine = p => {
  const bits = [];
  if (p.sex) bits.push(p.sex === "female" ? "Female" : "Male");
  const a = ageOf(p.dob);
  if (a !== null) bits.push(a + " yrs");
  if (p.phone) bits.push(p.phone);
  return bits.join(" · ");
};
const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };

/* ---------- view toggling ---------- */
function showPatientsView() {
  $("viewPatient").hidden = true;
  $("viewPatients").hidden = false;
  $("topSearch").hidden = false;
  $("topCrumb").hidden = true;
}
function showPatientView() {
  $("viewPatients").hidden = true;
  $("viewPatient").hidden = false;
  $("topSearch").hidden = true;
  $("topCrumb").hidden = false;
  $("crumbName").textContent = currentPatient.full_name;
  const fromFollowups = urlParam("from") === "followups";
  $("btnBack").innerHTML = icon("chevleft", 13) + (fromFollowups ? " Back to follow-ups" : " All patients");
}

/* ================= AUTH ================= */

/* boot: check who you are BEFORE revealing anything, so the login card never flashes */
(async () => {
  if (!sb) {
    $("boot").hidden = true;
    $("auth").hidden = false;
    msg("Open config.js and paste your Supabase Project URL first (Settings, then API).");
    return;
  }
  const { data: { session } } = await sb.auth.getSession();
  if (session) await enterApp(session.user);
  else { $("boot").hidden = true; $("auth").hidden = false; }
})();

 $("tabLogin").onclick = () => switchTab(true);
 $("tabReg").onclick   = () => switchTab(false);
function switchTab(login) {
  $("tabLogin").classList.toggle("on", login);
  $("tabReg").classList.toggle("on", !login);
  $("loginForm").hidden = !login;
  $("regForm").hidden = login;
  msg("");
}

 $("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (!sb) return;
  msg("Signing in…", "info");
  const { data, error } = await sb.auth.signInWithPassword({
    email: $("li-email").value.trim(),
    password: $("li-pass").value,
  });
  if (error) return msg("Wrong email or password.");
  const { data: staff } = await sb.from("staff").select("*").eq("id", data.user.id).maybeSingle();
  if (!staff) { await sb.auth.signOut(); return msg("This account is not registered as clinic staff."); }
  await enterApp(data.user, staff);
});

 $("regForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (!sb) return;
  if ($("rg-invite").value.trim() !== CONFIG.INVITE_CODE) return msg("Wrong invite code.");
  msg("Creating account…", "info");
  const { data, error } = await sb.auth.signUp({
    email: $("rg-email").value.trim(),
    password: $("rg-pass").value,
  });
  if (error) return msg(error.message);
  if (!data.session) {
    msg("Account created. Check your email, click the confirmation link, then sign in here.", "success");
    $("li-email").value = $("rg-email").value.trim();
    switchTab(true);
    return;
  }
  const { error: sErr } = await sb.from("staff").insert({
    id: data.user.id,
    name: $("rg-name").value.trim(),
    role: $("rg-role").value,
  });
  if (sErr) return msg(sErr.message);
  await enterApp(data.user, { name: $("rg-name").value.trim(), role: $("rg-role").value });
});

async function enterApp(user, staffRow) {
  if (!staffRow) {
    const { data } = await sb.from("staff").select("*").eq("id", user.id).maybeSingle();
    if (!data) {
      await sb.auth.signOut();
      $("boot").hidden = true;
      $("app").hidden = true;
      $("auth").hidden = false;
      msg("This account is not registered as clinic staff.");
      return;
    }
    staffRow = data;
  }
  $("boot").hidden = true;
  $("auth").hidden = true;
  $("app").hidden = false;
  ME = user.id;
  await loadClinic();
  paintUser(staffRow);
  showPatientsView();
  await loadPatients();
  loadFavs();
  renderComplaintChips();
  const pid = urlParam("p");
  if (pid && allPatients.some(p => p.id === pid)) openPatient(pid);
}

 $("btnOut").onclick = async () => {
  await sb.auth.signOut();
  $("app").hidden = true;
  $("auth").hidden = false;
  $("searchBox").value = "";
  $("showArchived").checked = false;
  msg("Signed out.", "info");
};

/* ================= PATIENTS ================= */

async function loadPatients() {
  const { data, error } = await sb.from("patients").select("*").order("full_name");
  if (error) return toast("Could not load patients: " + error.message);
  allPatients = data || [];
  renderPatients();
}

function renderPatients() {
  const q = $("searchBox").value.trim().toLowerCase();
  const showArch = $("showArchived").checked;
  let list = allPatients.filter(p => showArch || !p.archived);
  if (q) list = list.filter(p =>
    p.full_name.toLowerCase().includes(q) || (p.phone || "").includes(q));

  $("countLabel").textContent = q
    ? `${list.length} match${list.length === 1 ? "" : "es"} for "${q}"`
    : `${list.length} patient${list.length === 1 ? "" : "s"}`;

  $("patientList").innerHTML = list.length ? list.map(p => `
    <div class="prow ${p.archived ? "archived" : ""}" data-id="${p.id}">
      <span class="pav">${esc(initialsOf(p.full_name))}</span>
      <div style="min-width:0">
        <div class="p-name">${esc(p.full_name)}${p.archived ? '<span class="badge">Archived</span>' : ""}</div>
        <div class="p-meta">${esc(metaLine(p)) || "&nbsp;"}</div>
        ${p.conditions ? `<div class="p-cond">${esc(p.conditions)}</div>` : ""}
      </div>
    </div>`).join("")
    : `<div class="empty">${q || showArch ? "No patients match." : "No patients yet. Add your first patient."}</div>`;
}
 $("searchBox").addEventListener("input", renderPatients);
 $("showArchived").addEventListener("change", renderPatients);
 $("patientList").addEventListener("click", e => {
  const row = e.target.closest(".prow");
  if (row) openPatient(row.dataset.id);
});

function openPatient(id) {
  currentPatient = allPatients.find(p => p.id === id);
  if (!currentPatient) return;
  trendMetric = "bp";
  trendOpen = false;
  showPatientView();
  renderDetail();
  loadVisits();
  loadLabs();
}
 $("btnBack").onclick = () => {
  if (urlParam("from") === "followups") { location.href = "followups.html"; return; }
  showPatientsView();
  renderPatients();
  try { history.replaceState(null, "", "index.html"); } catch (_) {}
};

function renderDetail() {
  const p = currentPatient;
  const condTags = (p.conditions || "")
    .split(",").map(s => s.trim()).filter(Boolean)
    .map(c => `<span class="tag">${esc(c)}</span>`).join("");
  const allergyTag = p.allergies
    ? `<span class="tag warn">Allergies: ${esc(p.allergies)}</span>`
    : `<span class="tag">No allergies on file</span>`;

  $("patientDetail").innerHTML = `
    <div class="pbar">
      <span class="pav lg">${esc(initialsOf(p.full_name))}</span>
      <div style="min-width:0">
        <h1>${esc(p.full_name)}</h1>
        <div class="m">${esc(metaLine(p)) || "&nbsp;"}</div>
        <div class="tags">${condTags}${allergyTag}</div>
      </div>
      <div class="pactions">
        <button id="btnEdit" class="btn-ghost" type="button">Edit</button>
        <button id="btnArchive" class="btn-ghost" type="button">${p.archived ? "Restore patient" : "Archive"}</button>
        <button id="btnNewLab" class="btn-ghost" type="button">${icon("plus", 13)} Add lab result</button>
        <button id="btnNewVisit" class="btn-solid" type="button">${icon("plus", 13)} Record visit</button>
      </div>
    </div>`;
  $("btnEdit").onclick = openEditDialog;
  $("btnArchive").onclick = toggleArchive;
  $("btnNewVisit").onclick = openVisitDialog;
  $("btnNewLab").onclick = openLabDialog;
}

async function toggleArchive() {
  const p = currentPatient;
  if (p.archived) {
    if (!confirm(`Restore ${p.full_name} to the active patient list?`)) return;
  } else {
    if (!confirm(`Archive ${p.full_name}? Nothing is deleted. Their records are kept and you can restore them anytime.`)) return;
  }
  const { error } = await sb.from("patients").update({ archived: !p.archived }).eq("id", p.id);
  if (error) return toast("Failed: " + error.message);
  p.archived = !p.archived;
  toast(p.archived ? "Patient archived. Records kept." : "Patient restored to the active list.");
  renderDetail();
}

 $("btnAdd").onclick = () => { $("formPatient").reset(); $("dlgPatient").showModal(); };
 $("dlgClose").onclick = () => $("dlgPatient").close();

 $("formPatient").addEventListener("submit", async e => {
  e.preventDefault();
  if (trioBad("pf-dob")) return toast("Date of birth is incomplete. Pick day, month and year, or leave all three empty.");
  const payload = {
    full_name: $("pf-name").value.trim(),
    phone: $("pf-phone").value.trim() || null,
    sex: $("pf-sex").value || null,
    dob: trioISO("pf-dob"),
    conditions: $("pf-cond").value.trim() || null,
    allergies: $("pf-all").value.trim() || null,
    created_by: ME,
  };
  const { data, error } = await sb.from("patients").insert(payload).select().single();
  if (error) return toast("Could not save: " + error.message);
  allPatients.push(data);
  allPatients.sort((x, y) => x.full_name.localeCompare(y.full_name));
  $("dlgPatient").close();
  toast("Patient added.");
  openPatient(data.id);
});

/* ---- edit patient ---- */
function openEditDialog() {
  const p = currentPatient;
  $("dlgEditWho").textContent = p.full_name;
  $("ed-name").value = p.full_name || "";
  $("ed-phone").value = p.phone || "";
  $("ed-sex").value = p.sex || "";
  setTrio("ed-dob", p.dob);
  $("ed-cond").value = p.conditions || "";
  $("ed-all").value = p.allergies || "";
  $("dlgEdit").showModal();
}
 $("edlgClose").onclick = () => $("dlgEdit").close();

 $("formEdit").addEventListener("submit", async e => {
  e.preventDefault();
  if (trioBad("ed-dob")) return toast("Date of birth is incomplete. Pick day, month and year, or leave all three empty.");
  const p = currentPatient;
  const payload = {
    full_name: $("ed-name").value.trim(),
    phone: $("ed-phone").value.trim() || null,
    sex: $("ed-sex").value || null,
    dob: trioISO("ed-dob"),
    conditions: $("ed-cond").value.trim() || null,
    allergies: $("ed-all").value.trim() || null,
  };
  const { data, error } = await sb.from("patients").update(payload).eq("id", p.id).select().single();
  if (error) return toast("Could not save changes: " + error.message);
  const i = allPatients.findIndex(x => x.id === p.id);
  if (i > -1) allPatients[i] = data;
  allPatients.sort((x, y) => x.full_name.localeCompare(y.full_name));
  currentPatient = data;
  $("crumbName").textContent = data.full_name;
  renderPatients();
  renderDetail();
  $("dlgEdit").close();
  toast("Patient updated.");
});

/* ================= VITALS TREND (collapsed by default) ================= */

const TREND_METRICS = {
  bp:    { label: "Blood pressure", valid: p => p.bp_sys != null && p.bp_dia != null,
           series: [ { label: "Systolic",  value: p => p.bp_sys, color: "var(--acc-d)" },
                     { label: "Diastolic", value: p => p.bp_dia, color: "#8FBFA8" } ] },
  pulse: { label: "Pulse", valid: p => p.pulse != null,
           series: [ { label: "Pulse", value: p => p.pulse, color: "var(--acc-d)" } ] },
  temp:  { label: "Temperature", valid: p => p.temp_c != null,
           series: [ { label: "Temp", value: p => p.temp_c, color: "var(--acc-d)" } ] },
  weight:{ label: "Weight", valid: p => p.weight_kg != null,
           series: [ { label: "Weight kg", value: p => p.weight_kg, color: "var(--acc-d)" } ] },
};
const fmtTick = v => String(Math.round(v * 10) / 10);

function vitalPoints() {
  const pts = [];
  patientVisits.forEach(v => (v.vitals || []).forEach(vt => {
    pts.push({ ts: vt.recorded_at || v.created_at, ...vt });
  }));
  pts.sort((a, b) => new Date(a.ts) - new Date(b.ts));
  return pts;
}

function latestSummary(pts) {
  const last = pts[pts.length - 1];
  const bits = [];
  if (last.bp_sys != null && last.bp_dia != null) bits.push(`BP ${last.bp_sys}/${last.bp_dia}`);
  if (last.pulse != null) bits.push(`Pulse ${last.pulse}`);
  if (last.temp_c != null) bits.push(`Temp ${last.temp_c}`);
  if (last.weight_kg != null) bits.push(`Wt ${last.weight_kg} kg`);
  return bits.length ? `Latest: ${bits.join(" · ")} · ${fmtStamp(last.ts)}` : "";
}

function trendSVG(pts, cfg) {
  const series = cfg.series;
  const W = 720, H = 170, PL = 44, PR = 14, PT = 10, PB = 26;
  const iw = W - PL - PR, ih = H - PT - PB;
  let lo = Infinity, hi = -Infinity;
  pts.forEach(p => series.forEach(s => {
    const v = s.value(p);
    if (v != null) { if (v < lo) lo = v; if (v > hi) hi = v; }
  }));
  if (lo === Infinity) return "";
  if (hi === lo) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.15;
  lo -= pad; hi += pad;
  const X = i => PL + (pts.length > 1 ? iw * i / (pts.length - 1) : iw / 2);
  const Y = v => PT + ih * (1 - (v - lo) / (hi - lo));
  let out = "";
  for (let g = 0; g <= 3; g++) {
    const v = lo + (hi - lo) * g / 3, y = Y(v).toFixed(1);
    out += `<line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="var(--line)"/>`;
    out += `<text class="ax-lab" x="${PL - 6}" y="${+y + 3}" text-anchor="end">${fmtTick(v)}</text>`;
  }
  out += `<line x1="${PL}" y1="${PT + ih}" x2="${W - PR}" y2="${PT + ih}" stroke="var(--field)"/>`;
  const idxs = pts.length > 2 ? [0, Math.floor((pts.length - 1) / 2), pts.length - 1] : pts.map((_, i) => i);
  const seen = new Set();
  idxs.forEach((i, k) => {
    if (seen.has(i)) return;
    seen.add(i);
    const anchor = k === 0 ? "start" : (k === idxs.length - 1 && i === pts.length - 1 ? "end" : "middle");
    const dx = anchor === "start" ? -14 : (anchor === "end" ? 14 : 0);
    out += `<text class="ax-lab" x="${(X(i) + dx).toFixed(1)}" y="${H - 8}" text-anchor="${anchor}">${fmtStamp(pts[i].ts)}</text>`;
  });
  series.forEach(s => {
    let seg = [];
    const flush = () => {
      if (seg.length > 1) out += `<polyline fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${seg.join(" ")}"/>`;
      seg = [];
    };
    pts.forEach((p, i) => {
      const v = s.value(p);
      if (v == null) { flush(); return; }
      const x = X(i).toFixed(1), y = Y(v).toFixed(1);
      seg.push(`${x},${y}`);
      out += `<circle cx="${x}" cy="${y}" r="3.2" fill="#fff" stroke="${s.color}" stroke-width="2"><title>${esc(s.label)} ${v} · ${fmtStamp(p.ts)}</title></circle>`;
    });
    flush();
  });
  const legend = series.length > 1
    ? `<div class="lgrow">${series.map(s => `<span class="lg"><i style="background:${s.color}"></i>${s.label}</span>`).join("")}</div>`
    : "";
  return `<svg class="trend-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${cfg.label} trend">${out}</svg>${legend}`;
}

function renderTrend() {
  const card = $("trendCard"), body = $("trendBody"), chips = $("metricChips"), chart = $("trendChart");
  const pts = vitalPoints();
  if (!pts.length) { card.hidden = true; return; }
  card.hidden = false;
  $("trendLatest").textContent = latestSummary(pts);
  $("trendCaret").innerHTML = icon(trendOpen ? "chevup" : "chevdown", 12) + (trendOpen ? " Hide chart" : " Show chart");
  body.hidden = !trendOpen;
  if (!trendOpen) { chart.innerHTML = ""; return; }
  chips.innerHTML = Object.entries(TREND_METRICS).map(([k, m]) =>
    `<button type="button" class="mchip ${k === trendMetric ? "on" : ""}" data-m="${k}">${m.label}</button>`).join("");
  const cfg = TREND_METRICS[trendMetric];
  const ok = pts.filter(cfg.valid);
  chart.innerHTML = ok.length >= 2
    ? trendSVG(ok, cfg)
    : `<div class="trend-empty">Not enough readings for this metric yet. The line appears from the second recorded value.</div>`;
}
 $("trendToggle").onclick = () => { trendOpen = !trendOpen; renderTrend(); };
 $("metricChips").addEventListener("click", e => {
  const b = e.target.closest(".mchip");
  if (!b) return;
  trendMetric = b.dataset.m;
  renderTrend();
});

/* ================= VISITS ================= */

async function loadFavs() {
  const { data } = await sb.from("drug_favorites").select("*").order("name");
  drugFavs = data || [];
  renderFavGrid();
}
function renderFavGrid() {
  $("favGrid").innerHTML = drugFavs.length
    ? drugFavs.map((f, i) => `<button type="button" class="fav" data-i="${i}">+ ${esc(f.name)}</button>`).join("")
    : `<span class="hint">No favorites yet. Add drugs below and tick "Also save to favorites", or manage them from the sidebar.</span>`;
}
 $("favGrid").addEventListener("click", e => {
  const b = e.target.closest(".fav");
  if (!b) return;
  const f = drugFavs[+b.dataset.i];
  addRxLine({ drug: f.name, dose: f.dose || "", frequency: f.frequency || "", duration: "" });
});

/* complaint chips come from Settings (with a built-in fallback list) */
function renderComplaintChips() {
  const chips = (CLINIC.complaint_chips && CLINIC.complaint_chips.length) ? CLINIC.complaint_chips : DEFAULT_COMPLAINTS;
  $("complaintChips").innerHTML = chips.map(c => `<button type="button" class="qchip">${esc(c)}</button>`).join("");
}
 $("complaintChips").addEventListener("click", e => {
  const b = e.target.closest(".qchip");
  if (!b) return;
  const el = $("vf-complaint");
  el.value = el.value ? el.value + ", " + b.textContent : b.textContent;
  el.focus();
});

function addRxLine(l) {
  rxLines.push({ drug: l.drug, dose: l.dose, frequency: l.frequency, duration: l.duration });
  renderRxLines();
}
function renderRxLines() {
  $("rxLines").innerHTML = rxLines.map((l, i) => `
    <div class="line">
      <input data-i="${i}" data-k="drug" value="${esc(l.drug)}" placeholder="Drug">
      <input data-i="${i}" data-k="dose" value="${esc(l.dose)}" placeholder="Dose">
      <input data-i="${i}" data-k="frequency" value="${esc(l.frequency)}" placeholder="Frequency">
      <input data-i="${i}" data-k="duration" value="${esc(l.duration)}" placeholder="Duration">
      <button type="button" class="rm" data-i="${i}" title="Remove">${icon("x", 15)}</button>
    </div>`).join("");
}
 $("rxLines").addEventListener("input", e => {
  const { i, k } = e.target.dataset;
  if (k !== undefined && rxLines[i]) rxLines[i][k] = e.target.value;
});
 $("rxLines").addEventListener("click", e => {
  const b = e.target.closest(".rm");
  if (!b) return;
  rxLines.splice(+b.dataset.i, 1);
  renderRxLines();
});

 $("btnAddRx").onclick = async () => {
  const name = $("cd-name").value.trim();
  if (!name) return toast("Type the drug name first.");
  addRxLine({ drug: name, dose: $("cd-dose").value.trim(), frequency: $("cd-freq").value.trim(), duration: $("cd-dur").value.trim() });
  if ($("cd-fav").checked) {
    const { error } = await sb.from("drug_favorites").insert({ name, dose: $("cd-dose").value.trim() || null, frequency: $("cd-freq").value.trim() || null });
    if (!error) { await loadFavs(); toast(`Saved ${name} to favorites.`); }
  }
  $("cd-name").value = ""; $("cd-dose").value = ""; $("cd-freq").value = ""; $("cd-dur").value = "";
  $("cd-fav").checked = false;
};

function openVisitDialog() {
  $("formVisit").reset();
  rxLines = [];
  renderRxLines();
  renderFavGrid();
  $("dlgWho").textContent = currentPatient.full_name;
  $("dlgVisit").showModal();
}
 $("vdlgClose").onclick = () => $("dlgVisit").close();

 $("formVisit").addEventListener("submit", async e => {
  e.preventDefault();
  if (trioBad("vf-follow")) return toast("Follow-up date is incomplete. Pick day, month and year, or leave all three empty.");
  const complaint = $("vf-complaint").value.trim();
  if (!complaint) return toast("Complaint is required.");

  $("formVisit").querySelector("button.btn").disabled = true;
  try {
    const { data: visit, error } = await sb.from("visits").insert({
      patient_id: currentPatient.id,
      seen_by: ME,
      complaint,
      diagnosis: $("vf-diag").value.trim() || null,
      notes: $("vf-notes").value.trim() || null,
      follow_up_date: trioISO("vf-follow"),
    }).select().single();
    if (error) throw error;

    const sys = num($("vf-sys").value), dia = num($("vf-dia").value),
          pulse = num($("vf-pulse").value), temp = num($("vf-temp").value), wt = num($("vf-wt").value);
    if (sys !== null || dia !== null || pulse !== null || temp !== null || wt !== null) {
      const { error: vErr } = await sb.from("vitals").insert({
        patient_id: currentPatient.id,
        visit_id: visit.id,
        source: "clinic",
        bp_sys: sys, bp_dia: dia, pulse, temp_c: temp, weight_kg: wt,
        recorded_by: ME,
      });
      if (vErr) throw vErr;
    }

    if (rxLines.length) {
      const lines = rxLines.filter(l => l.drug.trim()).map(l => ({
        visit_id: visit.id,
        drug: l.drug.trim(),
        dose: l.dose.trim() || null,
        frequency: l.frequency.trim() || null,
        duration: l.duration.trim() || null,
        dispensed: false,
      }));
      if (lines.length) {
        const { error: rErr } = await sb.from("prescriptions").insert(lines);
        if (rErr) throw rErr;
      }
    }

    $("dlgVisit").close();
    toast("Visit saved.");
    loadVisits();
  } catch (err) {
    toast("Could not save visit: " + err.message);
  } finally {
    $("formVisit").querySelector("button.btn").disabled = false;
  }
});

async function loadVisits() {
  if (!currentPatient) return;
  const { data, error } = await sb.from("visits")
    .select("*, prescriptions(*), vitals(*)")
    .eq("patient_id", currentPatient.id)
    .order("created_at", { ascending: false });
  if (error) return toast("Could not load visits: " + error.message);
  patientVisits = data || [];
  renderVisits();
  renderTrend();
}

function renderVisits() {
  const btn = $("btnAllVisits");
  if (!patientVisits.length) {
    btn.hidden = true;
    $("visitHistory").innerHTML = `<div class="empty" style="padding:26px">No visits yet. Record one at each consultation.</div>`;
    return;
  }
  if (patientVisits.length > PREVIEW_COUNT) {
    btn.hidden = false;
    btn.innerHTML = `View all ${patientVisits.length} ${icon("arrow", 12)}`;
  } else btn.hidden = true;
  $("visitHistory").innerHTML = patientVisits.slice(0, PREVIEW_COUNT).map(v => visitCardHTML(v, patientLabs)).join("");
}

 $("btnAllVisits").onclick = () => {
  if (currentPatient) location.href = `visits.html?p=${currentPatient.id}`;
};

 $("visitHistory").addEventListener("click", async e => {
  const labBtn = e.target.closest("[data-open]");
  if (labBtn) return openLabFile(patientLabs, labBtn.dataset.open);
  const b = e.target.closest("[data-rx]");
  if (!b) return;
  const rx = patientVisits.flatMap(v => v.prescriptions || []).find(r => r.id === b.dataset.rx);
  if (!rx) return;
  const { error } = await sb.from("prescriptions").update({ dispensed: !rx.dispensed }).eq("id", rx.id);
  if (error) return toast("Failed: " + error.message);
  rx.dispensed = !rx.dispensed;
  renderVisits();
});

/* ================= LABS ================= */

async function loadLabs() {
  if (!currentPatient) return;
  const { data, error } = await sb.from("lab_results")
    .select("*").eq("patient_id", currentPatient.id)
    .order("created_at", { ascending: false });
  if (error) return toast("Could not load labs: " + error.message);
  patientLabs = data || [];
  renderLabs();
  renderVisits();
}

function renderLabs() {
  const btn = $("btnAllLabs");
  if (!patientLabs.length) {
    btn.hidden = true;
    $("labList").innerHTML = `<div class="empty" style="padding:22px">No lab results yet. Photograph the paper result to add it.</div>`;
    return;
  }
  if (patientLabs.length > PREVIEW_COUNT) {
    btn.hidden = false;
    btn.innerHTML = `View all ${patientLabs.length} ${icon("arrow", 12)}`;
  } else btn.hidden = true;
  $("labList").innerHTML = patientLabs.slice(0, PREVIEW_COUNT)
    .map(l => labRowHTML(l, patientVisits.find(v => v.id === l.visit_id))).join("");
}

 $("btnAllLabs").onclick = () => {
  if (currentPatient) location.href = `labs.html?p=${currentPatient.id}`;
};

function openLabDialog() {
  $("formLab").reset();
  $("fileLabel").innerHTML = icon("camera", 15) + " Photograph the result, or choose a file";
  $("dlgLabWho").textContent = currentPatient.full_name;
  const sel = $("lf-visit");
  if (patientVisits.length) {
    sel.innerHTML = `<option value="">Not linked</option>` +
      patientVisits.map(v => {
        const c = v.complaint.length > 42 ? v.complaint.slice(0, 42) + "…" : v.complaint;
        return `<option value="${v.id}">${fmtStamp(v.created_at)} · ${esc(c)}</option>`;
      }).join("");
    sel.value = patientVisits[0].id;
  } else {
    sel.innerHTML = `<option value="">Not linked</option>`;
    sel.value = "";
  }
  $("dlgLab").showModal();
}
 $("ldlgClose").onclick = () => $("dlgLab").close();

 $("lf-file").addEventListener("change", () => {
  const f = $("lf-file").files[0];
  if (!f) return;
  $("fileLabel").innerHTML = icon("paperclip", 14) + ` ${esc(f.name)} (${(f.size / 1024 / 1024).toFixed(1)} MB)`;
  if (!$("lf-title").value.trim()) {
    $("lf-title").value = f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
  }
});

 $("formLab").addEventListener("submit", async e => {
  e.preventDefault();
  if (trioBad("lf-date")) return toast("Report date is incomplete. Pick day, month and year, or leave all three empty.");
  const file = $("lf-file").files[0];
  if (!file) return toast("Choose a photo or file first.");
  const title = $("lf-title").value.trim() || file.name;
  const resultDate = trioISO("lf-date");
  const visitId = $("lf-visit").value || null;

  $("btnLabSave").disabled = true;
  toast("Uploading…");
  try {
    const safe = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${currentPatient.id}/${Date.now()}-${safe}`;
    const { error: upErr } = await sb.storage.from("lab-files").upload(path, file);
    if (upErr) throw upErr;
    const { error: dbErr } = await sb.from("lab_results").insert({
      patient_id: currentPatient.id,
      title,
      file_path: path,
      result_date: resultDate,
      visit_id: visitId,
    });
    if (dbErr) throw dbErr;
    $("dlgLab").close();
    toast("Lab result saved to the patient file.");
    loadLabs();
  } catch (err) {
    toast("Upload failed: " + err.message);
  } finally {
    $("btnLabSave").disabled = false;
  }
});

 $("labList").addEventListener("click", async e => {
  const openBtn = e.target.closest("[data-open]");
  const delBtn = e.target.closest("[data-del]");
  if (openBtn) return openLabFile(patientLabs, openBtn.dataset.open);
  if (delBtn) {
    const lab = patientLabs.find(l => l.id === delBtn.dataset.del);
    if (!lab) return;
    if (!confirm(`Permanently delete ${lab.title} from this patient's file? This cannot be undone. Use only for mistaken uploads.`)) return;
    await sb.storage.from("lab-files").remove([lab.file_path]);
    const { error } = await sb.from("lab_results").delete().eq("id", lab.id);
    if (error) return toast("Failed: " + error.message);
    toast("Deleted.");
    loadLabs();
  }
});