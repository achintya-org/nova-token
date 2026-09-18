function toast(message, type = "info", ms = 4000) {
  const host = document.getElementById("toastHost");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 250);
  }, ms);
}

async function copyText(text, successMessage = "Copied") {
  try {
    await navigator.clipboard.writeText(text);
    toast(successMessage, "success");
  } catch {
    toast("Couldn't copy — copy it manually", "error");
  }
}

function initMobileNav() {
  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("navMenu");
  if (!toggle || !menu) return;
  toggle.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  menu.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      menu.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    })
  );
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function initCountdown() {
  const wrap = document.getElementById("countdown");
  const tba = document.getElementById("countdownTba");
  if (!wrap || !tba) return;
  if (!CONFIG.presale.endsAt) {
    wrap.classList.add("hidden");
    tba.classList.remove("hidden");
    return;
  }
  const target = new Date(CONFIG.presale.endsAt);
  const els = {
    d: document.getElementById("cd-d"),
    h: document.getElementById("cd-h"),
    m: document.getElementById("cd-m"),
    s: document.getElementById("cd-s"),
  };
  const pad = (n) => String(Math.max(0, n)).padStart(2, "0");
  function tick() {
    const diff = Math.max(0, target - new Date());
    els.d.textContent = pad(Math.floor(diff / 86400000));
    els.h.textContent = pad(Math.floor((diff % 86400000) / 3600000));
    els.m.textContent = pad(Math.floor((diff % 3600000) / 60000));
    els.s.textContent = pad(Math.floor((diff % 60000) / 1000));
  }
  tick();
  setInterval(tick, 1000);
}

document.addEventListener("DOMContentLoaded", async () => {
  initMobileNav();
  initSmoothScroll();
  await window.__configReady;
  initCountdown();
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});
