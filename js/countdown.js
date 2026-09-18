// Placeholder countdown target — update once a real presale date is set.
const TARGET = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

function tick() {
  const now = new Date();
  const diff = Math.max(0, TARGET - now);

  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  const pad = (n) => String(n).padStart(2, "0");
  document.getElementById("d").textContent = pad(d);
  document.getElementById("h").textContent = pad(h);
  document.getElementById("m").textContent = pad(m);
  document.getElementById("s").textContent = pad(s);
}

tick();
setInterval(tick, 1000);
