const Wallet = (() => {
  let account = null;
  let chainIdHex = null;
  let cachedProvider = null;
  const listeners = new Set();
  const announced = new Map();

  window.addEventListener("eip6963:announceProvider", (event) => {
    const { info, provider } = event.detail || {};
    if (info && provider) announced.set(info.rdns || info.uuid, { info, provider });
  });
  window.dispatchEvent(new Event("eip6963:requestProvider"));

  function isMetaMaskProvider(p) {
    return !!p && p.isMetaMask && !p.isBraveWallet;
  }

  function pickMetaMask(candidates) {
    return candidates.find(isMetaMaskProvider) || null;
  }

  function getProvider() {
    if (cachedProvider) return cachedProvider;

    const fromEip6963 = pickMetaMask(Array.from(announced.values()).map((a) => a.provider));
    if (fromEip6963) return (cachedProvider = fromEip6963);

    const eth = window.ethereum;
    if (!eth) return null;
    if (Array.isArray(eth.providers) && eth.providers.length) {
      const fromLegacyList = pickMetaMask(eth.providers);
      if (fromLegacyList) return (cachedProvider = fromLegacyList);
    }
    if (isMetaMaskProvider(eth)) return (cachedProvider = eth);
    return null;
  }

  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function notify() {
    listeners.forEach((fn) => fn({ account, chainIdHex }));
  }

  function hasProvider() {
    return !!getProvider();
  }

  function isCorrectChain() {
    return chainIdHex && chainIdHex.toLowerCase() === CONFIG.chain.idHex.toLowerCase();
  }

  async function connect() {
    const provider = getProvider();
    if (!provider) {
      window.open("https://metamask.io/download/", "_blank", "noopener");
      throw new Error("MetaMask not found — install it, or disable any other wallet extension that's intercepting the page.");
    }
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    account = accounts[0] || null;
    chainIdHex = await provider.request({ method: "eth_chainId" });
    notify();
    return account;
  }

  function disconnect() {
    account = null;
    notify();
  }

  async function getNativeBalance() {
    const provider = getProvider();
    if (!account || !provider) return null;
    const wei = await provider.request({
      method: "eth_getBalance",
      params: [account, "latest"],
    });
    return formatWei(wei);
  }

  function formatWei(hexWei, decimals = 18, precision = 4) {
    const value = BigInt(hexWei);
    const base = 10n ** BigInt(decimals);
    const whole = value / base;
    const frac = value % base;
    const fracStr = frac.toString().padStart(decimals, "0").slice(0, precision);
    return `${whole}.${fracStr}`;
  }

  function toWeiHex(amountStr, decimals = 18) {
    const [whole, frac = ""] = String(amountStr).split(".");
    const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
    const value = BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(fracPadded || "0");
    return "0x" + value.toString(16);
  }

  async function switchChain() {
    const provider = getProvider();
    if (!provider) throw new Error("MetaMask not found");
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CONFIG.chain.idHex }],
      });
    } catch (err) {
      if (err && err.code === 4902) {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: CONFIG.chain.idHex,
              chainName: CONFIG.chain.name,
              nativeCurrency: { name: CONFIG.chain.nativeSymbol, symbol: CONFIG.chain.nativeSymbol, decimals: 18 },
              rpcUrls: CONFIG.chain.rpcUrls,
              blockExplorerUrls: CONFIG.chain.blockExplorerUrls,
            },
          ],
        });
      } else {
        throw err;
      }
    }
    chainIdHex = await provider.request({ method: "eth_chainId" });
    notify();
  }

  async function addTokenToWallet() {
    const provider = getProvider();
    if (!provider || !CONFIG.token.address) return false;
    return provider.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address: CONFIG.token.address,
          symbol: CONFIG.token.symbol,
          decimals: CONFIG.token.decimals,
        },
      },
    });
  }

  async function sendNative(toAddress, amountStr) {
    const provider = getProvider();
    if (!provider) throw new Error("MetaMask not found");
    return provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: account,
          to: toAddress,
          value: toWeiHex(amountStr),
        },
      ],
    });
  }

  function shortAddress(addr) {
    return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";
  }

  function init() {
    // Give injected wallets a tick to announce themselves via EIP-6963 before resolving.
    setTimeout(async () => {
      const provider = getProvider();
      if (!provider) return;
      try {
        const accounts = await provider.request({ method: "eth_accounts" });
        if (accounts[0]) {
          account = accounts[0];
          chainIdHex = await provider.request({ method: "eth_chainId" });
          notify();
        }
      } catch {
        // Wallet not ready/unlocked yet — the user can still click Connect manually.
      }
      try {
        provider.on("accountsChanged", (accounts) => {
          account = accounts[0] || null;
          notify();
        });
        provider.on("chainChanged", (id) => {
          chainIdHex = id;
          notify();
        });
      } catch {
        // Some non-standard providers don't support event subscriptions.
      }
    }, 150);
  }

  return {
    onChange,
    hasProvider,
    isCorrectChain,
    connect,
    disconnect,
    getNativeBalance,
    switchChain,
    addTokenToWallet,
    sendNative,
    shortAddress,
    formatWei,
    init,
    get account() {
      return account;
    },
    get chainIdHex() {
      return chainIdHex;
    },
  };
})();
