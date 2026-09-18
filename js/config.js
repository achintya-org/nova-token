// Single source of truth for the presale. Fill these in once the real
// token + presale contract exist — everything else on the page reads from here.
const CONFIG = {
  chain: {
    idHex: "0x38",
    idDecimal: 56,
    name: "BNB Smart Chain",
    nativeSymbol: "BNB",
    rpcUrls: ["https://bsc-dataseed.binance.org"],
    blockExplorerUrls: ["https://bscscan.com"],
  },
  token: {
    name: "Nova",
    symbol: "NOVA",
    decimals: 18,
    address: "", // TODO: set once the token contract is deployed
    totalSupply: 1_000_000_000,
  },
  presale: {
    contractAddress: "", // TODO: set once the presale contract is deployed — buy is disabled until then
    rate: 1000, // TODO: placeholder — NOVA per 1 native coin
    minBuyNative: 0.05,
    maxBuyNative: 5,
    hardCapNative: 250,
    raisedNative: 0, // TODO: wire to the real on-chain raised amount later
    endsAt: null, // TODO: set an ISO date string to enable the countdown
  },
  tokenomics: [
    { label: "Presale", pct: 40, color: "#7c6cff" },
    { label: "Liquidity", pct: 25, color: "#35e0c1" },
    { label: "Team (vested)", pct: 15, color: "#ffb454" },
    { label: "Marketing", pct: 10, color: "#ff6b6b" },
    { label: "Reserve", pct: 10, color: "#5eb1ff" },
  ],
  social: {
    twitter: "",
    telegram: "",
    discord: "",
  },
};
