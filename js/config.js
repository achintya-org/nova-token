// Single source of truth for the presale. Fill these in once the real
// token + presale contract exist — everything else on the page reads from here.
const CONFIG = {
  chain: {
    idHex: "0x1",
    idDecimal: 1,
    name: "Ethereum",
    nativeSymbol: "ETH",
    rpcUrls: ["https://ethereum-rpc.publicnode.com"],
    blockExplorerUrls: ["https://etherscan.io"],
  },
  token: {
    name: "Nova",
    symbol: "NOVA",
    decimals: 18,
    address: "", // TODO: set once the token contract is deployed
    totalSupply: 1_000_000_000,
  },
  presale: {
    contractAddress: "0x44F5B3B99164A93Ea0c38C80AC01b7805DFd4aA8",
    // 25% of the 1,000,000,000 supply (250,000,000 NOVA) sold for a 100 ETH hard cap
    // => rate = 250,000,000 / 100 = 2,500,000 NOVA per 1 ETH.
    rate: 2_500_000,
    minBuyNative: 0.05,
    maxBuyNative: 5,
    hardCapNative: 100,
    endsAt: null, // TODO: set an ISO date string to enable the countdown
  },
  tokenomics: [
    { label: "Presale", pct: 25, color: "#f0b429" },
    { label: "Liquidity", pct: 25, color: "#8b7cff" },
    { label: "Team (vested)", pct: 15, color: "#e8845a" },
    { label: "Marketing", pct: 10, color: "#5fb0d9" },
    { label: "Reserve", pct: 25, color: "#6b7280" },
  ],
  social: {
    twitter: "",
    telegram: "https://t.me/tradecode121",
    discord: "",
  },
  contact: {
    label: "Message the team on Telegram",
    handle: "@tradecode121",
    url: "https://t.me/tradecode121",
  },
};
