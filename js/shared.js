const SOCIAL_ICONS = {
  twitter: '<svg viewBox="0 0 24 24"><path d="M18.9 3H22l-7.6 8.7L23.4 21H16.9l-5.1-6.6L6 21H2.9l8.1-9.3L1.7 3h6.7l4.6 6.1L18.9 3zm-1.1 16.2h1.7L7.3 4.7H5.5l12.3 14.5z"/></svg>',
  telegram: '<svg viewBox="0 0 24 24"><path d="M21.9 4.7 18.7 20c-.2 1.1-.9 1.3-1.8.8l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.3-5 9.3-8.4c.4-.4-.1-.6-.6-.2L6.5 13.1 1.6 11.6c-1.1-.3-1.1-1.1.2-1.6L20.5 3.5c.9-.3 1.7.2 1.4 1.2z"/></svg>',
  discord: '<svg viewBox="0 0 24 24"><path d="M20.3 5.3A18 18 0 0 0 15.9 4l-.3.6a15 15 0 0 1 3.8 1.3 16 16 0 0 0-14.8 0A15 15 0 0 1 8.4 4.6L8.1 4a18 18 0 0 0-4.4 1.3C1.4 9.3.8 13.2 1.1 17a18 18 0 0 0 5.4 2.7l.8-1.3a12 12 0 0 1-1.9-.9l.5-.4a13 13 0 0 0 11.2 0l.5.4c-.6.3-1.2.6-1.9.9l.8 1.3a18 18 0 0 0 5.4-2.7c.4-4.4-.6-8.3-2.6-11.7zM8.6 14.6c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8zm6.8 0c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8z"/></svg>',
};

function renderSocialLinks() {
  const host = document.getElementById("socialLinks");
  if (!host) return;
  host.innerHTML = Object.entries(CONFIG.social)
    .filter(([, url]) => url)
    .map(([name, url]) => `<a href="${url}" target="_blank" rel="noopener" aria-label="${name}">${SOCIAL_ICONS[name] || ""}</a>`)
    .join("");
}

function renderTeamContact() {
  const targets = [
    { el: document.getElementById("teamContact"), html: (c) => `${SOCIAL_ICONS.telegram} ${c.label}: <strong>${c.handle}</strong>` },
    { el: document.getElementById("navContact"), html: (c) => `${SOCIAL_ICONS.telegram} <strong>${c.handle}</strong>` },
  ];
  targets.forEach(({ el, html }) => {
    if (!el) return;
    if (!CONFIG.contact || !CONFIG.contact.url) {
      el.classList.add("hidden");
      return;
    }
    el.href = CONFIG.contact.url;
    el.innerHTML = html(CONFIG.contact);
  });
}

function setConnectedChrome(connected) {
  document.querySelectorAll(".js-connect-btn").forEach((b) => b.classList.toggle("hidden", connected));
  const chip = document.getElementById("walletChip");
  if (chip) chip.classList.toggle("hidden", !connected);
}

async function refreshWalletChip() {
  const chip = document.getElementById("walletChip");
  if (!chip || !Wallet.account) return;
  const addrLabel = Wallet.shortAddress(Wallet.account);
  const balance = await Wallet.getNativeBalance().catch(() => null);
  chip.innerHTML = `
    <span class="chip-dot"></span>
    <span>${addrLabel}</span>
    <span class="chip-balance">${balance ? `${Number(balance).toFixed(3)} ${CONFIG.chain.nativeSymbol}` : ""}</span>
  `;
}

function updateNetworkBanner() {
  const banner = document.getElementById("networkBanner");
  if (!banner) return;
  if (!Wallet.account || Wallet.isCorrectChain()) {
    banner.classList.add("hidden");
  } else {
    banner.classList.remove("hidden");
  }
}

function initSharedChrome() {
  document.getElementById("bannerChainName") && (document.getElementById("bannerChainName").textContent = CONFIG.chain.name);

  const connectBtns = Array.from(document.querySelectorAll(".js-connect-btn"));
  connectBtns.forEach((btn) =>
    btn.addEventListener("click", async () => {
      connectBtns.forEach((b) => (b.disabled = true));
      try {
        await Wallet.connect();
        toast("Wallet connected", "success");
      } catch (err) {
        toast(err.message || "Couldn't connect wallet", "error");
      } finally {
        connectBtns.forEach((b) => (b.disabled = false));
      }
    })
  );
  if (!Wallet.hasProvider()) {
    connectBtns.forEach((b) => (b.textContent = "Install MetaMask"));
  }

  const switchBtn = document.getElementById("switchChainBtn");
  if (switchBtn) {
    switchBtn.addEventListener("click", async () => {
      try {
        await Wallet.switchChain();
        toast(`Switched to ${CONFIG.chain.name}`, "success");
      } catch (err) {
        toast(err.message || "Couldn't switch network", "error");
      }
    });
  }

  const chip = document.getElementById("walletChip");
  if (chip) {
    chip.addEventListener("click", () => {
      Wallet.disconnect();
      toast("Wallet disconnected", "info");
    });
  }

  renderSocialLinks();
  renderTeamContact();

  Wallet.onChange(async ({ account }) => {
    setConnectedChrome(!!account);
    updateNetworkBanner();
    if (account) {
      await refreshWalletChip();
      recordUser(account);
    }
  });

  Wallet.init();
}

document.addEventListener("DOMContentLoaded", initSharedChrome);
