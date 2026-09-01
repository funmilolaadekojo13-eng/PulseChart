/* PulseChart v2 — full visit history page (visits.html?p=<patient id>) */

let patient = null;
let visits = [];
let labs = [];

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

  buildMYFilter("vh");
  ["vh-from-m","vh-from-y","vh-to-m","vh-to-y"].forEach(id => $(id).addEventListener("input", render));
  $("vh-clear").onclick = () => { myClear("vh"); render(); };

  await loadAll();
  render();
})();

async function loadAll() {
  const [{ data: v }, { data: l }] = await Promise.all([
    sb.from("visits").select("*, prescriptions(*), vitals(*)")
      .eq("patient_id", patient.id).order("created_at", { ascending: false }),
    sb.from("lab_results").select("*")
      .eq("patient_id", patient.id).order("created_at", { ascending: false }),
  ]);
  visits = v || [];
  labs = l || [];
}

function render() {
  const count = $("visitCount"), list = $("visitList");
  if (!visits.length) {
    count.textContent = "";
    list.innerHTML = `<div class="empty" style="padding:26px">No visits recorded yet.</div>`;
    return;
  }
  const from = myValue("vh-from"), to = myValue("vh-to");
  const searching = !!(from || to);
  const filtered = visits.filter(v => inYMRange(ymOf(v.created_at), from, to));

  count.textContent = searching
    ? `${filtered.length} of ${visits.length} visits in range`
    : `${visits.length} visit${visits.length === 1 ? "" : "s"} on record`;

  list.innerHTML = filtered.length
    ? filtered.map(v => visitCardHTML(v, labs)).join("")
    : `<div class="empty" style="padding:22px">No visits in this date range.</div>`;
}

 $("visitList").addEventListener("click", async e => {
  const labBtn = e.target.closest("[data-open]");
  if (labBtn) return openLabFile(labs, labBtn.dataset.open);
  const b = e.target.closest("[data-rx]");
  if (!b) return;
  const rx = visits.flatMap(v => v.prescriptions || []).find(r => r.id === b.dataset.rx);
  if (!rx) return;
  const { error } = await sb.from("prescriptions").update({ dispensed: !rx.dispensed }).eq("id", rx.id);
  if (error) return toast("Failed: " + error.message);
  rx.dispensed = !rx.dispensed;
  render();
});