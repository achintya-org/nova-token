function escHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function isHttpUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    return (u.hostname + u.pathname).replace(/\/$/, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

function renderMessageNode(msg, byParent, depth) {
  const children = byParent.get(msg.msgId) || [];
  const addr = msg.address ? Wallet.shortAddress(msg.address) : "anon";
  const amountBadge = msg.amount ? `<span class="msg-amount">+${msg.amount} ${CONFIG.chain.nativeSymbol}</span>` : "";
  return `
    <div class="msg" style="margin-left:${Math.min(depth, 4) * 20}px">
      <div class="msg-head"><span class="msg-addr">${escHtml(addr)}</span>${amountBadge}</div>
      <p class="msg-text">${escHtml(msg.text)}</p>
      <button class="link-btn small msg-reply-btn" data-msg-id="${msg.msgId}">Reply</button>
      <div class="reply-form hidden" data-reply-for="${msg.msgId}">
        <textarea class="field msg-reply-input" maxlength="${Board.MAX_MESSAGE_LEN}" placeholder="Write a reply..."></textarea>
        <button class="btn ghost small msg-reply-submit" data-msg-id="${msg.msgId}">Post Reply</button>
      </div>
      ${children.map((c) => renderMessageNode(c, byParent, depth + 1)).join("")}
    </div>`;
}

async function renderLinkThread(linkId, container) {
  const messages = await Board.fetchMessages(linkId);
  const byParent = Board.buildThread(messages);
  const roots = byParent.get("root") || [];
  container.innerHTML = roots.length
    ? roots.map((m) => renderMessageNode(m, byParent, 0)).join("")
    : `<p class="hint">No messages yet — be the first to comment on this link.</p>`;

  container.querySelectorAll(".msg-reply-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      container.querySelector(`[data-reply-for="${btn.dataset.msgId}"]`).classList.toggle("hidden");
    })
  );
  container.querySelectorAll(".msg-reply-submit").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!Wallet.account) return toast("Connect your wallet to reply", "error");
      const form = container.querySelector(`[data-reply-for="${btn.dataset.msgId}"]`);
      const text = form.querySelector(".msg-reply-input").value.trim();
      if (!text) return;
      btn.disabled = true;
      try {
        await Board.addMessage(linkId, { text, address: Wallet.account, parentId: btn.dataset.msgId });
        await renderLinkThread(linkId, container);
        toast("Reply posted", "success");
      } catch {
        toast("Couldn't post reply", "error");
      } finally {
        btn.disabled = false;
      }
    })
  );
}

function linkCardHtml(item, rank) {
  const p = item.preview || {};
  const safeUrl = isHttpUrl(item.url) ? item.url : "#";
  return `
    <div class="link-card" data-link-id="${item.linkId}">
      <div class="link-rank">#${rank}</div>
      <div class="link-body">
        ${p.image ? `<img class="link-image" src="${escHtml(p.image)}" alt="">` : ""}
        <div class="link-meta">
          <a class="link-title" href="${escHtml(safeUrl)}" target="_blank" rel="noopener nofollow">${escHtml(p.title || item.url)}</a>
          <p class="link-desc">${escHtml(p.description || "")}</p>
          <div class="link-bid-row">
            <span class="link-bid">${item.bid} ${CONFIG.chain.nativeSymbol} bid</span>
            <button class="btn ghost small boost-btn" data-link-id="${item.linkId}">Boost this link</button>
          </div>
          <div class="boost-form hidden" data-boost-for="${item.linkId}">
            <input class="field boost-amount" type="number" min="0" step="0.001" placeholder="Amount in ${CONFIG.chain.nativeSymbol}">
            <textarea class="field boost-message" maxlength="${Board.MAX_MESSAGE_LEN}" placeholder="Optional message (max 500 chars)"></textarea>
            <button class="btn primary small boost-submit" data-link-id="${item.linkId}">Send Bid &amp; Boost</button>
          </div>
          <button class="link-btn small toggle-thread" data-link-id="${item.linkId}">View discussion</button>
          <div class="thread hidden" data-thread-for="${item.linkId}"></div>
        </div>
      </div>
    </div>`;
}

async function renderBoard() {
  const list = document.getElementById("boardList");
  const items = await Board.fetchLinks();
  list.innerHTML = items.length
    ? items.map((item, i) => linkCardHtml(item, i + 1)).join("")
    : `<p class="hint">No links yet — submit the first one below.</p>`;

  list.querySelectorAll(".toggle-thread").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const thread = list.querySelector(`[data-thread-for="${btn.dataset.linkId}"]`);
      thread.classList.toggle("hidden");
      if (!thread.classList.contains("hidden") && !thread.dataset.loaded) {
        thread.dataset.loaded = "1";
        await renderLinkThread(btn.dataset.linkId, thread);
      }
    })
  );

  list.querySelectorAll(".boost-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      list.querySelector(`[data-boost-for="${btn.dataset.linkId}"]`).classList.toggle("hidden");
    })
  );

  list.querySelectorAll(".boost-submit").forEach((btn) =>
    btn.addEventListener("click", async () => {
      if (!Wallet.account) return toast("Connect your wallet first", "error");
      if (!Wallet.isCorrectChain()) return toast(`Switch to ${CONFIG.chain.name} first`, "error");
      const linkId = btn.dataset.linkId;
      const form = list.querySelector(`[data-boost-for="${linkId}"]`);
      const amount = Number(form.querySelector(".boost-amount").value);
      const text = form.querySelector(".boost-message").value.trim();
      if (!amount || amount <= 0) return toast("Enter a bid amount", "error");
      btn.disabled = true;
      try {
        await Wallet.sendNative(CONFIG.presale.contractAddress, String(amount));
        await Board.boostLink(linkId, { amount, address: Wallet.account, text });
        toast("Bid sent and recorded", "success");
        await renderBoard();
      } catch (err) {
        toast(err.message || "Boost failed", "error");
      } finally {
        btn.disabled = false;
      }
    })
  );
}

function initBoardSubmit() {
  const urlInput = document.getElementById("boardUrl");
  const amountInput = document.getElementById("boardAmount");
  const messageInput = document.getElementById("boardMessage");
  const counter = document.getElementById("boardMessageCount");
  const submitBtn = document.getElementById("boardSubmit");

  messageInput.addEventListener("input", () => {
    counter.textContent = `${messageInput.value.length}/${Board.MAX_MESSAGE_LEN}`;
  });

  submitBtn.addEventListener("click", async () => {
    if (!Wallet.account) return toast("Connect your wallet first", "error");
    if (!Wallet.isCorrectChain()) return toast(`Switch to ${CONFIG.chain.name} first`, "error");
    const url = urlInput.value.trim();
    const amount = Number(amountInput.value);
    const text = messageInput.value.trim();
    if (!isHttpUrl(url)) return toast("Enter a valid http(s) link", "error");
    if (!amount || amount <= 0) return toast("Enter a bid amount", "error");

    submitBtn.disabled = true;
    try {
      const existing = await Board.fetchLinks();
      const match = existing.find((item) => normalizeUrl(item.url) === normalizeUrl(url));
      await Wallet.sendNative(CONFIG.presale.contractAddress, String(amount));
      if (match) {
        await Board.boostLink(match.linkId, { amount, address: Wallet.account, text });
        toast("Bid added to existing link", "success");
      } else {
        await Board.createLink({ url, amount, address: Wallet.account, text });
        toast("Link submitted", "success");
      }
      urlInput.value = "";
      amountInput.value = "";
      messageInput.value = "";
      counter.textContent = `0/${Board.MAX_MESSAGE_LEN}`;
      await renderBoard();
    } catch (err) {
      toast(err.message || "Submission failed", "error");
    } finally {
      submitBtn.disabled = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initBoardSubmit();
  renderBoard();
});
