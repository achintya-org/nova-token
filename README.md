# Nova Token

Work-in-progress presale website scaffold for **Nova ($NOVA)**.

Structure (page layout, tokenomics/roadmap sections, countdown) is inspired
by the presale page already in `achintya-org/serverless-webrtc`, rebuilt
from scratch with placeholder content. No token contract has been deployed
and there is no wallet-connect / fund-collection logic wired up yet — the
"Connect Wallet" and "View Contract" buttons are intentionally disabled.

## Structure

- `index.html` — landing page (hero, tokenomics, roadmap, FAQ)
- `css/styles.css` — styling
- `js/countdown.js` — placeholder countdown timer
- `firebase.json` — Firebase Hosting config for static deploy

## TODO before this is a real presale

- [ ] Decide chain (ETH / BSC / Solana / etc.)
- [ ] Write, test, and audit the token + presale contract
- [ ] Fill in real tokenomics (supply, price, contract address)
- [ ] Wire up wallet connect + on-chain presale logic
- [ ] Replace the placeholder countdown target date

## Local preview

```
npx serve .
```

## Deploy (Firebase Hosting)

```
npx firebase-tools deploy --only hosting --project <your-project-id>
```
