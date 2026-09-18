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
      await ref.set({ address: walletId, firstSeenAt: now, lastSeenAt: now, connections: 1 });
    }
  } catch {
    // best-effort — never block the wallet-connect flow on this
  }
}
