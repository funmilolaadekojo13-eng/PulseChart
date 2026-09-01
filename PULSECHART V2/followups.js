/* PulseChart v2 — follow-up dashboard with WhatsApp reminders */

const localISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const todayISO = localISO(new Date());

let rows = [];

 $("btnBackHist").onclick = () => {
  if (history.length > 1) history.back();
  else location.href = "index.html";
};

(async () => {
  const ctx = await requireStaff();
  if (!ctx) return;
  await load();
  render();
})();

async function load() {
  const cut = new Date();
  cut.setDate(cut.getDate() - 30);
  const { data, error } = await sb.from("visits")
    .select("id, follow_up_date, created_at, patient_id, patients(full_name, phone, sex, archived)")
    .not("follow_up_date", "is", null)
    .gte("follow_up_date", localISO(cut))
    .order("follow_up_date");
  if (error) return toast("Could not load follow-ups: " + error.message);

  const byPatient = new Map();
  for (const r of data || []) {
    if (!r.patients || r.patients.archived) continue;
    const prev = byPatient.get(r.patient_id);
    if (!prev || new Date(r.created_at) > new Date(prev.created_at)) byPatient.set(r.patient_id, r);
  }
  rows = [...byPatient.values()];
}

const diffDays = d => Math.round((new Date(d + "T00:00") - new Date(todayISO + "T00:00")) / 86400000);
const dueLabel = d => {
  const n = diffDays(d);
  if (n === 0) return "Due today";
  if (n === 1) return "Due tomorrow";
  if (n > 1 && n <= 7) return `Due in ${n} days`;
  return "Due " + fmtDate(d);
};

function waLink(r) {
  const p = r.patients;
  const digits = String(p.phone || "").replace(/\D/g, "");
  let intl = digits;
  if (intl.startsWith("0")) intl = "234" + intl.slice(1);
  else if (intl.length === 10) intl = "234" + intl;
  const honor = p.sex === "male" ? "Mr " : p.sex === "female" ? "Ms " : "";
  const when = new Date(r.follow_up_date + "T00:00")
    .toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
  const text = encodeURIComponent(
    `Good day ${honor}${p.full_name}, this is a reminder from ${CONFIG.PRACTICE_NAME} about your follow-up visit on ${when}. Kindly reply if you need to reschedule. Thank you.`
  );
  return `https://wa.me/${intl}?text=${text}`;
}

function rowHTML(r) {
  const p = r.patients;
  const overdue = r.follow_up_date < todayISO;
  const stat = overdue
    ? `<span class="dstat overdue">Overdue, was due ${fmtDate(r.follow_up_date)}</span>`
    : `<span class="dstat ${r.follow_up_date === todayISO ? "today" : "upcoming"}">${dueLabel(r.follow_up_date)}</span>`;
  const wa = p.phone
    ? `<button type="button" class="btn-solid" data-wa="${r.patient_id}">${icon("arrow", 13)} WhatsApp reminder</button>`
    : `<span class="hint nowrap" style="margin:0">No phone on file</span>`;
  return `
  <div class="furow" data-pid="${r.patient_id}">
    <span class="pav">${esc(initialsOf(p.full_name))}</span>
    <div class="fuinfo">
      <div class="funame">${esc(p.full_name)}</div>
      <div class="fumeta">Set at visit ${fmtStamp(r.created_at)}${p.phone ? " · " + esc(p.phone) : ""}</div>
    </div>
    ${stat}
    <div class="fuactions">${wa}</div>
  </div>`;
}

function groupHTML(title, list) {
  if (!list.length) return "";
  return `
  <div class="fugroup">
    <h2>${title} <span class="cnt">${list.length}</span></h2>
    ${list.map(rowHTML).join("")}
  </div>`;
}

function render() {
  const box = $("groups");
  if (!rows.length) {
    box.innerHTML = `<div class="empty">No follow-ups on the books. Set a follow-up date while recording a visit and it will appear here.</div>`;
    return;
  }
  const overdue = rows.filter(r => r.follow_up_date < todayISO).sort((a, b) => b.follow_up_date.localeCompare(a.follow_up_date));
  const today = rows.filter(r => r.follow_up_date === todayISO);
  const upcoming = rows.filter(r => r.follow_up_date > todayISO).sort((a, b) => a.follow_up_date.localeCompare(b.follow_up_date));
  box.innerHTML =
    groupHTML("Overdue", overdue) +
    groupHTML("Due today", today) +
    groupHTML("Upcoming", upcoming);
}

 $("groups").addEventListener("click", e => {
  const waBtn = e.target.closest("[data-wa]");
  if (waBtn) {
    e.stopPropagation();
    const r = rows.find(x => x.patient_id === waBtn.dataset.wa);
    if (!r) return;
    window.open(waLink(r), "_blank");
    return;
  }
  const row = e.target.closest(".furow");
  if (row) location.href = `index.html?p=${row.dataset.pid}&from=followups`;
});