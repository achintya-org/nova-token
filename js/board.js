const Board = (() => {
  const MAX_MESSAGE_LEN = 500;

  function dbUrl(path) {
    return `${CONFIG.rtdb.baseUrl}/${path}.json`;
  }

  async function fetchLinks() {
    const res = await fetch(dbUrl("board"));
    const data = await res.json();
    if (!data) return [];
    return Object.entries(data)
      .map(([linkId, v]) => ({ linkId, ...v, bid: Number(v.bid) || 0 }))
      .sort((a, b) => b.bid - a.bid);
  }

  async function fetchPreview(url) {
    try {
      const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
      const json = await res.json();
      if (json.status !== "success") return null;
      const d = json.data;
      return {
        title: d.title || url,
        description: d.description || "",
        image: (d.image && d.image.url) || (d.logo && d.logo.url) || "",
      };
    } catch {
      return null;
    }
  }

  async function createLink({ url, amount, address, text }) {
    const preview = await fetchPreview(url);
    const now = Date.now();
    const payload = {
      url,
      bid: amount,
      createdAt: now,
      preview: preview || { title: url, description: "", image: "" },
    };
    const res = await fetch(dbUrl("board"), { method: "POST", body: JSON.stringify(payload) });
    const { name: linkId } = await res.json();
    if (text) await addMessage(linkId, { text, address, amount });
    return linkId;
  }

  async function boostLink(linkId, { amount, address, text }) {
    const res = await fetch(dbUrl(`board/${linkId}/bid`));
    const current = Number(await res.json()) || 0;
    await fetch(dbUrl(`board/${linkId}/bid`), {
      method: "PUT",
      body: JSON.stringify(current + amount),
    });
    if (text) await addMessage(linkId, { text, address, amount });
  }

  async function addMessage(linkId, { text, address, amount, parentId }) {
    const payload = {
      text: text.slice(0, MAX_MESSAGE_LEN),
      address,
      amount: amount || 0,
      parentId: parentId || null,
      ts: Date.now(),
    };
    await fetch(dbUrl(`board/${linkId}/messages`), { method: "POST", body: JSON.stringify(payload) });
  }

  async function fetchMessages(linkId) {
    const res = await fetch(dbUrl(`board/${linkId}/messages`));
    const data = await res.json();
    if (!data) return [];
    return Object.entries(data).map(([msgId, v]) => ({ msgId, ...v }));
  }

  function buildThread(messages) {
    const byParent = new Map();
    messages.forEach((m) => {
      const key = m.parentId || "root";
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key).push(m);
    });
    byParent.forEach((list) => list.sort((a, b) => a.ts - b.ts));
    return byParent;
  }

  return { fetchLinks, fetchPreview, createLink, boostLink, addMessage, fetchMessages, buildThread, MAX_MESSAGE_LEN };
})();
