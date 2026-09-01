/* PulseChart v2 — settings page */

let ROLE = "nurse";
let CHIPS = [];

(async () => {
  const ctx = await requireStaff();
  if (!ctx) return;
  ROLE = ctx.staff.role;
  applyLock();
  if (!CLINIC.loaded) { $("sqlWarn").hidden = false; }
  fillForm();
  renderChips();
  renderTpl();
  bind();
})();

function applyLock() {
  const isDoctor = ROLE === "doctor";
  ["setPractice", "setChips", "setTpl"].forEach(id => {
    const sec = $(id), veil = sec.querySelector(".lockveil");
    if (veil) veil.hidden = isDoctor;
    sec.querySelectorAll("input,textarea,button").forEach(el => el.disabled = !isDoctor);
  });
}

function flash(id) {
  const s = $(id);
  s.classList.add("show");
  setTimeout(() => s.classList.remove("show"), 2400);
}

function fillForm() {
  $("s-name").value = CLINIC.practice_name || "";
  $("s-phone").value = CLINIC.practice_phone || "";
  $("s-addr").value = CLINIC.practice_address || "";
  CHIPS = Array.isArray(CLINIC.complaint_chips) ? CLINIC.complaint_chips.slice() : [];
  $("tplText").value = CLINIC.reminder_template || DEFAULT_REMINDER;
}

/* ---- chips editor ---- */
function renderChips() {
  $("chipBox").innerHTML = CHIPS.length
    ? CHIPS.map((c, i) => `<span class="chip">${esc(c)}<button type="button" data-i="${i}" title="Remove">${icon("x", 12)}</button></span>`).join("")
    : `<span class="sub">No chips. The visit form falls back to the standard list.</span>`;
}
function addChip() {
  const v = $("newChip").value.trim();
  if (!v) return;
  if (CHIPS.some(c => c.toLowerCase() === v.toLowerCase())) return toast("That chip already exists.");
  CHIPS.push(v);
  $("newChip").value = "";
  renderChips();
}

/* ---- template preview ---- */
function renderTpl() {
  const name = "Ms Adekojo Bidemi";
  const date = new Date();
  date.setDate(date.getDate() + 2);
  const when = date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
  const practice = $("s-name").value || CLINIC.practice_name || CONFIG.PRACTICE_NAME;
  $("tplPreview").textContent = $("tplText").value
    .replaceAll("{name}", name).replaceAll("{date}", when).replaceAll("{practice}", practice);
}

/* ---- CSV export ---- */
async function exportCSV(table) {
  const { data, error } = await sb.from(table).select("*");
  if (error) { toast("Could not export " + table + ": " + error.message); return; }
  const rows = data || [];
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const q = v => {
    if (v == null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = [cols.join(","), ...rows.map(r => cols.map(c => q(r[c])).join(","))].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = `${table}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---- wiring ---- */
function bind() {
  $("savePractice").onclick = async () => {
    const name = $("s-name").value.trim();
    if (!name) return toast("Practice name is required.");
    const { error } = await sb.from("settings").update({
      practice_name: name,
      practice_phone: $("s-phone").value.trim() || null,
      practice_address: $("s-addr").value.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq("id", 1);
    if (error) return toast("Could not save: " + error.message);
    CLINIC.practice_name = name;
    CLINIC.practice_phone = $("s-phone").value.trim();
    CLINIC.practice_address = $("s-addr").value.trim();
    document.querySelectorAll(".practice").forEach(el => el.textContent = name);
    renderTpl();
    flash("savedPractice"); toast("Practice details saved.");
  };

  $("addChipBtn").onclick = addChip;
  $("newChip").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); addChip(); } });
  $("chipBox").addEventListener("click", e => {
    const b = e.target.closest("button[data-i]");
    if (!b) return;
    CHIPS.splice(+b.dataset.i, 1);
    renderChips();
  });
  $("saveChips").onclick = async () => {
    const { error } = await sb.from("settings").update({
      complaint_chips: CHIPS,
      updated_at: new Date().toISOString(),
    }).eq("id", 1);
    if (error) return toast("Could not save: " + error.message);
    CLINIC.complaint_chips = CHIPS.slice();
    flash("savedChips"); toast("Quick chips saved.");
  };

  $("tplText").addEventListener("input", renderTpl);
  document.querySelectorAll(".ph button").forEach(b => b.onclick = () => {
    const el = $("tplText");
    const pos = el.selectionStart ?? el.value.length;
    el.value = el.value.slice(0, pos) + b.dataset.ph + el.value.slice(pos);
    renderTpl(); el.focus();
  });
  $("saveTpl").onclick = async () => {
    const { error } = await sb.from("settings").update({
      reminder_template: $("tplText").value,
      updated_at: new Date().toISOString(),
    }).eq("id", 1);
    if (error) return toast("Could not save: " + error.message);
    CLINIC.reminder_template = $("tplText").value;
    flash("savedTpl"); toast("Reminder message saved.");
  };

  $("btnExport").onclick = async () => {
    const tables = [...document.querySelectorAll(".exp input:checked")].map(i => i.dataset.table);
    if (!tables.length) return toast("Select at least one table.");
    $("btnExport").disabled = true;
    toast("Exporting…");
    for (const t of tables) await exportCSV(t);
    $("btnExport").disabled = false;
    toast("Export complete.");
  };
}