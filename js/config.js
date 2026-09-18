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
    totalSupply: 20_000_000,
    initialLiquidity: 200,
  },
  presale: {
    contractAddress: "0x44F5B3B99164A93Ea0c38C80AC01b7805DFd4aA8",
    rate: 2000, // 1 ETH = 2000 NOVA
    minBuyNative: 0.05,
    maxBuyNative: 5,
    hardCapNative: 2500, // 2,500 ETH x 2,000 NOVA/ETH = 5,000,000 NOVA = 25% of 20,000,000 supply
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
  rtdb: {
    // TODO: update once the Realtime Database instance is created —
    // for us-central1 this is https://<project-id>-default-rtdb.firebaseio.com,
    // for any other region it's https://<project-id>-default-rtdb.<region>.firebasedatabase.app
    baseUrl: "https://nova-presale-93088-default-rtdb.firebaseio.com",
  },
  firebase: {
    apiKey: "AIzaSyDWap4FCTTJDKAHht-jc13KybENyCFFBPE",
    authDomain: "nova-presale-93088.firebaseapp.com",
    projectId: "nova-presale-93088",
    storageBucket: "nova-presale-93088.firebasestorage.app",
    messagingSenderId: "973651767757",
    appId: "1:973651767757:web:81fdf06d5d57b0b3939484",
  },
};
