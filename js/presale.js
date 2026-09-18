function formatCompact(n) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(n % 1_000_000_000 === 0 ? 0 : 1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return String(n);
}

const SOCIAL_ICONS = {
  twitter: '<svg viewBox="0 0 24 24"><path d="M18.9 3H22l-7.6 8.7L23.4 21H16.9l-5.1-6.6L6 21H2.9l8.1-9.3L1.7 3h6.7l4.6 6.1L18.9 3zm-1.1 16.2h1.7L7.3 4.7H5.5l12.3 14.5z"/></svg>',
  telegram: '<svg viewBox="0 0 24 24"><path d="M21.9 4.7 18.7 20c-.2 1.1-.9 1.3-1.8.8l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.3-5 9.3-8.4c.4-.4-.1-.6-.6-.2L6.5 13.1 1.6 11.6c-1.1-.3-1.1-1.1.2-1.6L20.5 3.5c.9-.3 1.7.2 1.4 1.2z"/></svg>',
  discord: '<svg viewBox="0 0 24 24"><path d="M20.3 5.3A18 18 0 0 0 15.9 4l-.3.6a15 15 0 0 1 3.8 1.3 16 16 0 0 0-14.8 0A15 15 0 0 1 8.4 4.6L8.1 4a18 18 0 0 0-4.4 1.3C1.4 9.3.8 13.2 1.1 17a18 18 0 0 0 5.4 2.7l.8-1.3a12 12 0 0 1-1.9-.9l.5-.4a13 13 0 0 0 11.2 0l.5.4c-.6.3-1.2.6-1.9.9l.8 1.3a18 18 0 0 0 5.4-2.7c.4-4.4-.6-8.3-2.6-11.7zM8.6 14.6c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8zm6.8 0c-.9 0-1.6-.8-1.6-1.8s.7-1.8 1.6-1.8 1.6.8 1.6 1.8-.7 1.8-1.6 1.8z"/></svg>',
};

function renderSocialLinks() {
  const host = document.getElementById("socialLinks");
  host.innerHTML = Object.entries(CONFIG.social)
    .filter(([, url]) => url)
    .map(([name, url]) => `<a href="${url}" target="_blank" rel="noopener" aria-label="${name}">${SOCIAL_ICONS[name] || ""}</a>`)
    .join("");
}

function renderTokenomics() {
  const chart = document.getElementById("tokenomicsChart");
  const legend = document.getElementById("tokenomicsLegend");
  let acc = 0;
  const stops = CONFIG.tokenomics
    .map((slice) => {
      const start = acc;
      acc += slice.pct;
      return `${slice.color} ${start}% ${acc}%`;
    })
    .join(", ");
  chart.style.background = `conic-gradient(${stops})`;

  legend.innerHTML = CONFIG.tokenomics
    .map(
      (slice) => `
      <div class="legend-row">
        <span class="swatch" style="background:${slice.color}"></span>
        <span class="legend-label">${slice.label}</span>
        <span class="legend-pct">${slice.pct}%</span>
      </div>`
    )
    .join("");

  document.getElementById("totalSupply").textContent = CONFIG.token.totalSupply.toLocaleString();
  document.getElementById("tokenSymbol").textContent = CONFIG.token.symbol;
  document.getElementById("presaleRate").textContent = `1 ${CONFIG.chain.nativeSymbol} = ${CONFIG.presale.rate.toLocaleString()} ${CONFIG.token.symbol}`;

  const tokenAddrEl = document.getElementById("tokenContractAddress");
  tokenAddrEl.textContent = CONFIG.token.address || "Not deployed yet";

  document.getElementById("chainNameCard").textContent = CONFIG.chain.name;
  document.getElementById("bannerChainName").textContent = CONFIG.chain.name;
  document.getElementById("chainSymbolLabel").textContent = CONFIG.chain.nativeSymbol;
  document.getElementById("chainNameHowTo").textContent = CONFIG.chain.name;
  document.getElementById("chainNameFaq").textContent = CONFIG.chain.name;

  document.getElementById("statSupply").textContent = formatCompact(CONFIG.token.totalSupply);
  document.getElementById("statRate").textContent = `${CONFIG.presale.rate.toLocaleString()} ${CONFIG.token.symbol}`;
  document.getElementById("statHardCap").textContent = `${CONFIG.presale.hardCapNative} ${CONFIG.chain.nativeSymbol}`;
  document.getElementById("statChain").textContent = CONFIG.chain.name;

  renderSocialLinks();

  const walletEl = document.getElementById("presaleWalletAddress");
  const explorerEl = document.getElementById("presaleWalletExplorer");
  if (CONFIG.presale.contractAddress) {
    walletEl.textContent = CONFIG.presale.contractAddress;
    explorerEl.href = `${CONFIG.chain.blockExplorerUrls[0]}/address/${CONFIG.presale.contractAddress}`;
  } else {
    walletEl.textContent = "Not published yet";
    explorerEl.classList.add("hidden");
  }
}

async function fetchRaisedNative() {
  if (!CONFIG.presale.contractAddress) return 0;
  try {
    const res = await fetch(CONFIG.chain.rpcUrls[0], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getBalance",
        params: [CONFIG.presale.contractAddress, "latest"],
      }),
    });
    const { result } = await res.json();
    return Number(Wallet.formatWei(result, 18, 6));
  } catch {
    return null;
  }
}

async function renderProgress() {
  const raised = await fetchRaisedNative();
  const raisedDisplay = raised === null ? "—" : raised;
  const pct = raised === null ? 0 : Math.min(100, (raised / CONFIG.presale.hardCapNative) * 100);
  document.getElementById("progressBar").style.width = `${pct}%`;
  document.getElementById("raisedAmount").textContent = `${raisedDisplay} ${CONFIG.chain.nativeSymbol}`;
  document.getElementById("hardCapAmount").textContent = `${CONFIG.presale.hardCapNative} ${CONFIG.chain.nativeSymbol}`;
  document.getElementById("minMaxHint").textContent =
    `Min ${CONFIG.presale.minBuyNative} · Max ${CONFIG.presale.maxBuyNative} ${CONFIG.chain.nativeSymbol}`;
}

function estimateTokens(amountNative) {
  const n = Number(amountNative);
  if (!n || n <= 0) return 0;
  return n * CONFIG.presale.rate;
}

function setConnectedUI(connected) {
  document.getElementById("connectBtn").classList.toggle("hidden", connected);
  document.getElementById("walletChip").classList.toggle("hidden", !connected);
  document.getElementById("buyForm").classList.toggle("disabled-panel", !connected);
}

async function refreshWalletChip() {
  const chip = document.getElementById("walletChip");
  if (!Wallet.account) return;
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
  if (!Wallet.account) {
    banner.classList.add("hidden");
    return;
  }
  if (Wallet.isCorrectChain()) {
    banner.classList.add("hidden");
  } else {
    banner.classList.remove("hidden");
  }
}

function initBuyWidget() {
  const amountInput = document.getElementById("buyAmount");
  const estimateOut = document.getElementById("buyEstimate");
  const buyBtn = document.getElementById("buyBtn");
  const connectBtn = document.getElementById("connectBtn");
  const switchBtn = document.getElementById("switchChainBtn");
  const addTokenBtn = document.getElementById("addTokenBtn");

  amountInput.addEventListener("input", () => {
    estimateOut.textContent = `${estimateTokens(amountInput.value).toLocaleString()} ${CONFIG.token.symbol}`;
  });

  connectBtn.addEventListener("click", async () => {
    connectBtn.disabled = true;
    try {
      await Wallet.connect();
      toast("Wallet connected", "success");
    } catch (err) {
      toast(err.message || "Couldn't connect wallet", "error");
    } finally {
      connectBtn.disabled = false;
    }
  });

  switchBtn.addEventListener("click", async () => {
    try {
      await Wallet.switchChain();
      toast(`Switched to ${CONFIG.chain.name}`, "success");
    } catch (err) {
      toast(err.message || "Couldn't switch network", "error");
    }
  });

  addTokenBtn.addEventListener("click", async () => {
    try {
      await Wallet.addTokenToWallet();
    } catch (err) {
      toast(err.message || "Couldn't add token", "error");
    }
  });

  buyBtn.addEventListener("click", async () => {
    if (!Wallet.account) {
      toast("Connect your wallet first", "error");
      return;
    }
    if (!Wallet.isCorrectChain()) {
      toast(`Switch to ${CONFIG.chain.name} first`, "error");
      return;
    }
    const amount = Number(amountInput.value);
    if (!amount || amount < CONFIG.presale.minBuyNative || amount > CONFIG.presale.maxBuyNative) {
      toast(`Enter an amount between ${CONFIG.presale.minBuyNative} and ${CONFIG.presale.maxBuyNative} ${CONFIG.chain.nativeSymbol}`, "error");
      return;
    }
    if (!CONFIG.presale.contractAddress) {
      toast("Presale hasn't launched yet — your wallet is connected and ready.", "info");
      return;
    }
    try {
      buyBtn.disabled = true;
      const tx = await Wallet.sendNative(CONFIG.presale.contractAddress, amountInput.value);
      toast(`Transaction sent: ${Wallet.shortAddress(tx)}`, "success");
    } catch (err) {
      toast(err.message || "Transaction failed", "error");
    } finally {
      buyBtn.disabled = false;
    }
  });

  if (!CONFIG.presale.contractAddress) {
    buyBtn.textContent = "Presale Not Live Yet";
  }
  if (!CONFIG.token.address) {
    addTokenBtn.classList.add("hidden");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderTokenomics();
  renderProgress();
  setInterval(renderProgress, 30000);
  initBuyWidget();

  Wallet.onChange(async ({ account }) => {
    setConnectedUI(!!account);
    updateNetworkBanner();
    if (account) await refreshWalletChip();
  });

  document.getElementById("walletChip").addEventListener("click", () => {
    Wallet.disconnect();
    toast("Wallet disconnected", "info");
  });

  document.getElementById("copyContract").addEventListener("click", () => {
    if (CONFIG.presale.contractAddress) copyText(CONFIG.presale.contractAddress, "Presale wallet address copied");
  });

  if (!Wallet.hasProvider()) {
    document.getElementById("connectBtn").textContent = "Install MetaMask";
  }

  Wallet.init();
});
