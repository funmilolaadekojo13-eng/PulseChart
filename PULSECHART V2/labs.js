/* PulseChart v2 — full lab results page (labs.html?p=<patient id>) */

let patient = null;
let labs = [];
let visits = [];

(async () => {
  const ctx = await requireStaff();
  if (!ctx) return;
  const pid = urlParam("p");
  if (!pid) { location.href = "index.html"; return; }
  const { data: p } = await sb.from("patients").select("*").eq("id", pid).maybeSingle();
  if (!p) { location.href = "index.html"; return; }
  patient = p;
  const ct = $("crumbTop"); if (ct) ct.textContent = patient.full_name;
  $("backLink").href = `index.html?p=${patient.id}`;

  buildMYFilter("lh");
  ["lh-from-m","lh-from-y","lh-to-m","lh-to-y"].forEach(id => $(id).addEventListener("input", render));
  $("lh-clear").onclick = () => { myClear("lh"); render(); };

  await loadAll();
  render();
})();

async function loadAll() {
  const [{ data: l }, { data: v }] = await Promise.all([
    sb.from("lab_results").select("*")
      .eq("patient_id", patient.id).order("created_at", { ascending: false }),
    sb.from("visits").select("*")
      .eq("patient_id", patient.id).order("created_at", { ascending: false }),
  ]);
  labs = l || [];
  visits = v || [];
}

function render() {
  const count = $("labCount"), list = $("labAllList");
  if (!labs.length) {
    count.textContent = "";
    list.innerHTML = `<div class="empty" style="padding:22px">No lab results on record yet.</div>`;
    return;
  }
  const from = myValue("lh-from"), to = myValue("lh-to");
  const searching = !!(from || to);
  const filtered = labs.filter(l => inYMRange(ymOf(l.result_date || l.created_at), from, to));

  count.textContent = searching
    ? `${filtered.length} of ${labs.length} results in range`
    : `${labs.length} result${labs.length === 1 ? "" : "s"} on record`;

  list.innerHTML = filtered.length
    ? filtered.map(l => labRowHTML(l, visits.find(v => v.id === l.visit_id))).join("")
    : `<div class="empty" style="padding:22px">No lab results in this date range.</div>`;
}

 $("labAllList").addEventListener("click", async e => {
  const openBtn = e.target.closest("[data-open]");
  const delBtn = e.target.closest("[data-del]");
  if (openBtn) return openLabFile(labs, openBtn.dataset.open);
  if (delBtn) {
    const lab = labs.find(l => l.id === delBtn.dataset.del);
    if (!lab) return;
    if (!confirm(`Permanently delete ${lab.title} from this patient's file? This cannot be undone. Use only for mistaken uploads.`)) return;
    await sb.storage.from("lab-files").remove([lab.file_path]);
    const { error } = await sb.from("lab_results").delete().eq("id", lab.id);
    if (error) return toast("Failed: " + error.message);
    toast("Deleted.");
    await loadAll();
    render();
  }
});