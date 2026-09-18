let firestoreDb = null;
try {
  firebase.initializeApp(CONFIG.firebase);
  firestoreDb = firebase.firestore();
} catch {
  firestoreDb = null;
}

async function recordUser(address) {
  if (!firestoreDb || !address) return;
  const walletId = address.toLowerCase();
  const ref = firestoreDb.collection("users").doc(walletId);
  const now = firebase.firestore.FieldValue.serverTimestamp();
  try {
    const snap = await ref.get();
    if (snap.exists) {
      await ref.update({ lastSeenAt: now, connections: firebase.firestore.FieldValue.increment(1) });
    } else {
      await ref.set({ address: walletId, firstSeenAt: now, lastSeenAt: now, connections: 1, coins: 0, lastCoinClaimAt: null });
    }
  } catch {
    // best-effort — never block the wallet-connect flow on this
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

async function claimDailyCoin(address) {
  if (!firestoreDb || !address) return { coins: 0, claimed: false };
  const walletId = address.toLowerCase();
  const ref = firestoreDb.collection("users").doc(walletId);
  try {
    const snap = await ref.get();
    const data = snap.exists ? snap.data() : {};
    const lastClaimMs = data.lastCoinClaimAt && data.lastCoinClaimAt.toMillis ? data.lastCoinClaimAt.toMillis() : 0;
    const coins = data.coins || 0;
    if (Date.now() - lastClaimMs < DAY_MS) {
      return { coins, claimed: false };
    }
    const nextCoins = coins + 1;
    await ref.set({ coins: nextCoins, lastCoinClaimAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return { coins: nextCoins, claimed: true };
  } catch {
    return { coins: 0, claimed: false };
  }
}

async function getCoinBalance(address) {
  if (!firestoreDb || !address) return 0;
  try {
    const snap = await firestoreDb.collection("users").doc(address.toLowerCase()).get();
    return snap.exists ? snap.data().coins || 0 : 0;
  } catch {
    return 0;
  }
}

async function spendCoins(address, amount) {
  if (!firestoreDb || !address) throw new Error("Coins unavailable right now");
  const ref = firestoreDb.collection("users").doc(address.toLowerCase());
  return firestoreDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? snap.data().coins || 0 : 0;
    if (current < amount) throw new Error(`Not enough coins — you have ${current}`);
    tx.update(ref, { coins: current - amount });
    return current - amount;
  });
}

// Credits a verified real presale purchase to the same spendable balance used for
// board bids. txHash is recorded in processedTx as a dedupe guard so the same
// on-chain transaction can never be credited twice.
async function creditNovaFromPurchase(address, novaAmount, txHash) {
  if (!firestoreDb || !address || !txHash) return { credited: false, balance: 0 };
  const userRef = firestoreDb.collection("users").doc(address.toLowerCase());
  const txRef = firestoreDb.collection("processedTx").doc(txHash.toLowerCase());
  try {
    return await firestoreDb.runTransaction(async (tx) => {
      const [userSnap, txSnap] = await Promise.all([tx.get(userRef), tx.get(txRef)]);
      if (txSnap.exists) {
        return { credited: false, balance: userSnap.exists ? userSnap.data().coins || 0 : 0 };
      }
      const current = userSnap.exists ? userSnap.data().coins || 0 : 0;
      const next = current + novaAmount;
      tx.set(userRef, { coins: next }, { merge: true });
      tx.set(txRef, {
        address: address.toLowerCase(),
        novaCredited: novaAmount,
        ts: firebase.firestore.FieldValue.serverTimestamp(),
      });
      return { credited: true, balance: next };
    });
  } catch {
    return { credited: false, balance: 0 };
  }
}
