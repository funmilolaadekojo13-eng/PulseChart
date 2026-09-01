/* PulseChart v2 — staff roster */

(async () => {
  const ctx = await requireStaff();
  if (!ctx) return;
  const { data, error } = await sb.from("staff").select("*").order("created_at");
  if (error) return toast("Could not load staff: " + error.message);
  const list = data || [];
  $("staffCount").textContent = `${list.length} staff account${list.length === 1 ? "" : "s"} · everyone here can see every patient file`;
  $("staffList").innerHTML = list.map(s => `
    <div class="labrow">
      <span class="pav">${esc(initialsOf(s.name))}</span>
      <div style="min-width:0">
        <div class="lab-title">${esc(s.name)}</div>
        <div class="lab-meta">${cap(s.role)} · joined ${fmtStamp(s.created_at)}</div>
      </div>
    </div>`).join("");
})();