(() => {
  const STORAGE_KEY = "inline-ai-branches:v1";
  const ANCHOR_ATTR = "data-iab-anchor-id";
  const PROCESSED_ATTR = "data-iab-processed";

  const state = {
    branches: loadBranches(),
    topbar: null,
    list: null
  };

  injectTopbar();
  scan();

  const observer = new MutationObserver(() => scan());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  function scan() {
    getCandidateMessages().forEach((message) => {
      if (message.getAttribute(PROCESSED_ATTR) === "true") return;
      message.setAttribute(PROCESSED_ATTR, "true");

      const text = getMessageText(message);
      if (!text || text.length < 40) return;

      const anchorId = ensureAnchorId(message, text);
      addOpenButton(message, anchorId);
      const branch = state.branches[anchorId];
      if (branch && !message.querySelector(".iab-panel")) {
        renderPanel(message, branch);
      }
    });

    renderTopbar();
  }

  function getCandidateMessages() {
    const roleMessages = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));
    if (roleMessages.length) return roleMessages.map((node) => node.closest("article") || node);

    return Array.from(document.querySelectorAll("article")).filter((article) => {
      const text = getMessageText(article);
      return text && text.length > 80 && !article.querySelector("textarea");
    });
  }

  function getMessageText(node) {
    const clone = node.cloneNode(true);
    clone.querySelectorAll(".iab-panel, .iab-anchor-actions, button, textarea, script, style").forEach((el) => el.remove());
    return normalizeText(clone.textContent || "");
  }

  function normalizeText(text) {
    return text.replace(/\s+/g, " ").trim();
  }

  function ensureAnchorId(message, text) {
    const existing = message.getAttribute(ANCHOR_ATTR);
    if (existing) return existing;

    const source = `${location.pathname}|${text.slice(0, 180)}`;
    const id = `iab-${hash(source)}`;
    message.setAttribute(ANCHOR_ATTR, id);
    return id;
  }

  function addOpenButton(message, anchorId) {
    if (message.querySelector(".iab-anchor-actions")) return;

    const actions = document.createElement("div");
    actions.className = "iab-anchor-actions";

    const button = document.createElement("button");
    button.className = "iab-open-button";
    button.type = "button";
    button.textContent = state.branches[anchorId] ? "打开分支" : "旁边提问";
    button.addEventListener("click", () => {
      const branch = state.branches[anchorId] || createBranch(anchorId, getMessageText(message));
      renderPanel(message, branch);
      saveBranches();
      renderTopbar();
    });

    actions.append(button);
    message.append(actions);
  }

  function createBranch(anchorId, anchorText) {
    const branch = {
      id: anchorId,
      title: anchorText.slice(0, 42) || "未命名分支",
      anchorText: anchorText.slice(0, 220),
      createdAt: Date.now(),
      kept: true,
      messages: []
    };
    state.branches[anchorId] = branch;
    return branch;
  }

  function renderPanel(message, branch) {
    const old = message.querySelector(".iab-panel");
    if (old) old.remove();

    const panel = document.createElement("section");
    panel.className = "iab-panel";
    panel.setAttribute("data-iab-panel-id", branch.id);

    const header = document.createElement("header");
    header.className = "iab-panel-header";

    const titleWrap = document.createElement("div");
    const title = document.createElement("h3");
    title.className = "iab-panel-title";
    title.textContent = branch.title;
    const subtitle = document.createElement("p");
    subtitle.className = "iab-panel-subtitle";
    subtitle.textContent = branch.kept ? "已保留的分支" : "临时分支";
    titleWrap.append(title, subtitle);

    const actions = document.createElement("div");
    actions.className = "iab-panel-actions";

    const keepButton = iconButton(branch.kept ? "✓" : "+", branch.kept ? "设为临时" : "保留分支");
    keepButton.addEventListener("click", () => {
      branch.kept = !branch.kept;
      saveBranches();
      renderPanel(message, branch);
      renderTopbar();
    });

    const closeButton = iconButton("×", "关闭面板");
    closeButton.addEventListener("click", () => panel.remove());

    const deleteButton = iconButton("⌫", "删除分支", true);
    deleteButton.addEventListener("click", () => {
      delete state.branches[branch.id];
      saveBranches();
      panel.remove();
      renderTopbar();
      const openButton = message.querySelector(".iab-open-button");
      if (openButton) openButton.textContent = "旁边提问";
    });

    actions.append(keepButton, closeButton, deleteButton);
    header.append(titleWrap, actions);

    const messages = document.createElement("div");
    messages.className = "iab-messages";
    renderMessages(messages, branch);

    const inputRow = document.createElement("form");
    inputRow.className = "iab-input-row";
    const input = document.createElement("textarea");
    input.className = "iab-input";
    input.placeholder = "针对这段回答继续追问...";
    const send = document.createElement("button");
    send.className = "iab-send-button";
    send.type = "submit";
    send.textContent = "发送";
    inputRow.append(input, send);
    inputRow.addEventListener("submit", (event) => {
      event.preventDefault();
      const content = input.value.trim();
      if (!content) return;
      branch.messages.push({ role: "你", content, createdAt: Date.now() });
      branch.messages.push({
        role: "AI",
        content: "这里是分支回复占位。下一步可以接入 OpenAI Responses API，让它带着原回答片段和你的追问生成真正回答。",
        createdAt: Date.now()
      });
      input.value = "";
      saveBranches();
      renderMessages(messages, branch);
      renderTopbar();
    });

    panel.append(header, messages, inputRow);
    message.append(panel);
    panel.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function renderMessages(container, branch) {
    container.replaceChildren();

    const anchor = document.createElement("div");
    anchor.className = "iab-message";
    const anchorRole = document.createElement("div");
    anchorRole.className = "iab-message-role";
    anchorRole.textContent = "引用";
    const anchorBody = document.createElement("div");
    anchorBody.className = "iab-message-body";
    anchorBody.textContent = branch.anchorText;
    anchor.append(anchorRole, anchorBody);
    container.append(anchor);

    if (!branch.messages.length) {
      const empty = document.createElement("div");
      empty.className = "iab-empty";
      empty.textContent = "这个分支还没有追问。";
      container.append(empty);
      return;
    }

    branch.messages.forEach((item) => {
      const message = document.createElement("div");
      message.className = "iab-message";
      const role = document.createElement("div");
      role.className = "iab-message-role";
      role.textContent = item.role;
      const body = document.createElement("div");
      body.className = "iab-message-body";
      body.textContent = item.content;
      message.append(role, body);
      container.append(message);
    });

    container.scrollTop = container.scrollHeight;
  }

  function injectTopbar() {
    if (document.querySelector(".iab-topbar")) {
      state.topbar = document.querySelector(".iab-topbar");
      state.list = state.topbar.querySelector(".iab-branch-list");
      return;
    }

    const topbar = document.createElement("aside");
    topbar.className = "iab-topbar";
    const label = document.createElement("div");
    label.className = "iab-topbar-label";
    label.textContent = "分支";
    const list = document.createElement("div");
    list.className = "iab-branch-list";
    topbar.append(label, list);
    document.body.prepend(topbar);
    state.topbar = topbar;
    state.list = list;
  }

  function renderTopbar() {
    const branches = Object.values(state.branches).filter((branch) => branch.kept);
    state.topbar.dataset.visible = String(branches.length > 0);
    state.list.replaceChildren();

    branches
      .sort((a, b) => b.createdAt - a.createdAt)
      .forEach((branch) => {
        const pill = document.createElement("button");
        pill.className = "iab-pill";
        pill.type = "button";
        pill.title = branch.title;
        pill.textContent = branch.title;
        pill.addEventListener("click", () => {
          const anchor = document.querySelector(`[${ANCHOR_ATTR}="${CSS.escape(branch.id)}"]`);
          if (!anchor) return;
          renderPanel(anchor, branch);
          anchor.scrollIntoView({ block: "center", behavior: "smooth" });
        });
        state.list.append(pill);
      });
  }

  function iconButton(label, title, danger = false) {
    const button = document.createElement("button");
    button.className = "iab-icon-button";
    button.type = "button";
    button.textContent = label;
    button.title = title;
    if (danger) button.dataset.danger = "true";
    return button;
  }

  function loadBranches() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveBranches() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.branches));
  }

  function hash(value) {
    let result = 0;
    for (let index = 0; index < value.length; index += 1) {
      result = (result << 5) - result + value.charCodeAt(index);
      result |= 0;
    }
    return Math.abs(result).toString(36);
  }
})();
