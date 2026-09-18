function formatCompact(n) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(n % 1_000_000_000 === 0 ? 0 : 1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return String(n);
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
  document.getElementById("initialLiquidity").textContent = `${CONFIG.token.initialLiquidity.toLocaleString()} ${CONFIG.token.symbol}`;

  const tokenAddrEl = document.getElementById("tokenContractAddress");
  tokenAddrEl.textContent = CONFIG.token.address || "Not deployed yet";

  document.getElementById("chainNameCard").textContent = CONFIG.chain.name;
  document.getElementById("chainSymbolLabel").textContent = CONFIG.chain.nativeSymbol;
  document.getElementById("chainNameHowTo").textContent = CONFIG.chain.name;
  document.getElementById("chainNameFaq").textContent = CONFIG.chain.name;

  document.getElementById("statSupply").textContent = formatCompact(CONFIG.token.totalSupply);
  document.getElementById("stageRate").textContent = `1 ${CONFIG.chain.nativeSymbol} = ${CONFIG.presale.rate.toLocaleString()} ${CONFIG.token.symbol}`;
  document.getElementById("statHardCap").textContent = `${CONFIG.presale.hardCapNative} ${CONFIG.chain.nativeSymbol}`;
  document.getElementById("statChain").textContent = CONFIG.chain.name;

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

async function rpcCall(method, params) {
  const res = await fetch(CONFIG.chain.rpcUrls[0], {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const { result } = await res.json();
  return result;
}

function rtdbUrl(path) {
  return `${CONFIG.rtdb.baseUrl}/${path}.json`;
}

// "Raised" is a real, visible node (presale/raised) — not just a number computed
// in the browser — so it shows up in the RTDB console and can be corrected there
// manually if a confirmed amount is ever wrong, since crediting still only
// happens client-side today (no server-side re-verification, per the earlier
// trade-off discussion). It's always fetched live (never cached at page load)
// and is denominated in NOVA — the source of truth for everything the site
// shows about progress; ETH-equivalent and hard-cap % are derived from it.
// presale/txns stays alongside it as the per-transaction audit log.
async function fetchRaisedFromDb() {
  try {
    const res = await fetch(rtdbUrl("presale/raised"));
    const value = await res.json();
    return Number(value) || 0;
  } catch {
    return null;
  }
}

// Records an already-verified purchase (see creditPurchaseIfValid): logs the txn
// (keyed by its own hash, so the same transaction can never be logged twice) and
// adds the NOVA amount credited to the visible presale/raised total.
async function recordPresaleTxn(txHash, address, ethAmount, novaAmount) {
  try {
    await fetch(rtdbUrl(`presale/txns/${txHash}`), {
      method: "PUT",
      body: JSON.stringify({ address, ethAmount, novaAmount, time: Date.now() }),
    });
    const current = (await fetchRaisedFromDb()) || 0;
    await fetch(rtdbUrl("presale/raised"), { method: "PUT", body: JSON.stringify(current + novaAmount) });
  } catch {
    // Best-effort — the NOVA credit itself already succeeded regardless.
  }
}

// Poll the chain directly (not MetaMask) for a mined receipt — this is real,
// independently-verifiable on-chain confirmation, not a self-reported claim.
async function waitForReceipt(txHash, { timeoutMs = 180000, intervalMs = 4000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const receipt = await rpcCall("eth_getTransactionReceipt", [txHash]).catch(() => null);
    if (receipt) return receipt;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return null;
}

async function creditPurchaseIfValid({ txHash, account, expectedWeiHex }) {
  try {
    const [tx, receipt] = await Promise.all([
      rpcCall("eth_getTransactionByHash", [txHash]),
      waitForReceipt(txHash),
    ]);
    if (!tx || !receipt || receipt.status !== "0x1") {
      toast("Transaction did not confirm — no NOVA credited.", "error");
      return;
    }
    const toMatches = (tx.to || "").toLowerCase() === CONFIG.presale.contractAddress.toLowerCase();
    const fromMatches = (tx.from || "").toLowerCase() === account.toLowerCase();
    const valueMatches = BigInt(tx.value) >= BigInt(expectedWeiHex);
    if (!toMatches || !fromMatches || !valueMatches) {
      toast("Transaction details didn't match the presale purchase — no NOVA credited.", "error");
      return;
    }
    const ethAmount = Number(Wallet.formatWei(tx.value, 18, 6));
    const novaAmount = Math.floor(ethAmount * CONFIG.presale.rate);
    const result = await creditNovaFromPurchase(account, novaAmount, txHash);
    if (result.credited) {
      toast(`Confirmed! ${novaAmount.toLocaleString()} NOVA credited to your bidding balance.`, "success");
      updateCoinDisplay(result.balance);
      await recordPresaleTxn(txHash, account, ethAmount, novaAmount);
      renderProgress();
    }
  } catch {
    toast("Couldn't verify the transaction — no NOVA credited.", "error");
  }
}

async function renderProgress() {
  const raisedNova = await fetchRaisedFromDb();
  const hardCapNova = CONFIG.presale.hardCapNative * CONFIG.presale.rate;
  const pct = raisedNova === null ? 0 : Math.min(100, (raisedNova / hardCapNova) * 100);
  const raisedEth = raisedNova === null ? null : raisedNova / CONFIG.presale.rate;

  document.getElementById("progressBar").style.width = `${pct}%`;
  document.getElementById("raisedAmount").textContent =
    raisedNova === null ? "—" : raisedNova.toLocaleString();
  document.getElementById("raisedEthEquiv").textContent =
    raisedEth === null ? "" : `≈ ${raisedEth.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${CONFIG.chain.nativeSymbol} raised`;
  document.getElementById("hardCapAmount").textContent =
    `${hardCapNova.toLocaleString()} ${CONFIG.token.symbol} cap`;
  document.getElementById("minMaxHint").textContent =
    `Min ${CONFIG.presale.minBuyNative} · Max ${CONFIG.presale.maxBuyNative} ${CONFIG.chain.nativeSymbol}`;
  document.getElementById("initialLiquidityInline").textContent =
    `${CONFIG.token.initialLiquidity.toLocaleString()} ${CONFIG.token.symbol}`;
}

function estimateTokens(amountNative) {
  const n = Number(amountNative);
  if (!n || n <= 0) return 0;
  return n * CONFIG.presale.rate;
}

function initBuyWidget() {
  const amountInput = document.getElementById("buyAmount");
  const estimateOut = document.getElementById("buyEstimate");
  const buyBtn = document.getElementById("buyBtn");
  const buyForm = document.getElementById("buyForm");
  const addTokenBtn = document.getElementById("addTokenBtn");

  amountInput.addEventListener("input", () => {
    estimateOut.textContent = `${estimateTokens(amountInput.value).toLocaleString()} ${CONFIG.token.symbol}`;
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
      const account = Wallet.account;
      const txHash = await Wallet.sendNative(CONFIG.presale.contractAddress, amountInput.value);
      toast(`Transaction sent: ${Wallet.shortAddress(txHash)} — waiting for confirmation...`, "success");
      creditPurchaseIfValid({
        txHash,
        account,
        expectedWeiHex: Wallet.toWeiHex(amountInput.value),
      });
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

  Wallet.onChange(({ account }) => {
    buyForm.classList.toggle("disabled-panel", !account);
  });

  document.getElementById("copyContract").addEventListener("click", () => {
    if (CONFIG.presale.contractAddress) copyText(CONFIG.presale.contractAddress, "Presale wallet address copied");
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await window.__configReady;
  renderTokenomics();
  renderProgress();
  setInterval(renderProgress, 30000);
  initBuyWidget();
});
