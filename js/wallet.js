const Wallet = (() => {
  let account = null;
  let chainIdHex = null;
  const listeners = new Set();

  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function notify() {
    listeners.forEach((fn) => fn({ account, chainIdHex }));
  }

  function hasProvider() {
    return typeof window.ethereum !== "undefined";
  }

  function isCorrectChain() {
    return chainIdHex && chainIdHex.toLowerCase() === CONFIG.chain.idHex.toLowerCase();
  }

  async function connect() {
    if (!hasProvider()) {
      window.open("https://metamask.io/download/", "_blank", "noopener");
      throw new Error("No wallet found — install MetaMask to continue.");
    }
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    account = accounts[0] || null;
    chainIdHex = await window.ethereum.request({ method: "eth_chainId" });
    notify();
    return account;
  }

  function disconnect() {
    account = null;
    notify();
  }

  async function getNativeBalance() {
    if (!account || !hasProvider()) return null;
    const wei = await window.ethereum.request({
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
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CONFIG.chain.idHex }],
      });
    } catch (err) {
      if (err && err.code === 4902) {
        await window.ethereum.request({
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
    chainIdHex = await window.ethereum.request({ method: "eth_chainId" });
    notify();
  }

  async function addTokenToWallet() {
    if (!CONFIG.token.address) return false;
    return window.ethereum.request({
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
    return window.ethereum.request({
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
    if (!hasProvider()) return;
    window.ethereum.request({ method: "eth_accounts" }).then(async (accounts) => {
      if (accounts[0]) {
        account = accounts[0];
        chainIdHex = await window.ethereum.request({ method: "eth_chainId" });
        notify();
      }
    });
    window.ethereum.on("accountsChanged", (accounts) => {
      account = accounts[0] || null;
      notify();
    });
    window.ethereum.on("chainChanged", (id) => {
      chainIdHex = id;
      notify();
    });
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
