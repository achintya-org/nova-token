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

  const addrEl = document.getElementById("contractAddress");
  if (CONFIG.token.address) {
    addrEl.textContent = Wallet.shortAddress(CONFIG.token.address);
    addrEl.title = CONFIG.token.address;
  } else {
    addrEl.textContent = "To be announced at launch";
  }
}

function renderProgress() {
  const pct = Math.min(100, (CONFIG.presale.raisedNative / CONFIG.presale.hardCapNative) * 100);
  document.getElementById("progressBar").style.width = `${pct}%`;
  document.getElementById("raisedAmount").textContent = `${CONFIG.presale.raisedNative} ${CONFIG.chain.nativeSymbol}`;
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
    if (CONFIG.token.address) copyText(CONFIG.token.address, "Contract address copied");
  });

  if (!Wallet.hasProvider()) {
    document.getElementById("connectBtn").textContent = "Install MetaMask";
  }

  Wallet.init();
});
