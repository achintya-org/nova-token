// Presale economics (rate, hard cap, min/max, supply, liquidity, end date) are
// editable live via the Realtime Database console at /presale, without a redeploy.
// CONFIG's own values (config.js) are the fallback if RTDB has nothing set yet
// or the fetch fails — the site still works standalone either way.
window.__configReady = (async function loadRemoteConfig() {
  try {
    const res = await fetch(`${CONFIG.rtdb.baseUrl}/presale.json`);
    const remote = await res.json();
    if (!remote || typeof remote !== "object") return;

    const { txns, raised, liquidity, totalSupply, ...presaleFields } = remote;
    Object.assign(CONFIG.presale, presaleFields);
    if (typeof liquidity === "number") CONFIG.token.initialLiquidity = liquidity;
    if (typeof totalSupply === "number") CONFIG.token.totalSupply = totalSupply;
  } catch {
    // Network/parse failure — keep the local defaults already in CONFIG.
  }
})();
