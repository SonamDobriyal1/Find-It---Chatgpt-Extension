(() => {
  const PANEL_ID = "cpe-prompt-nav";
  const TOGGLE_ID = "cpe-prompt-nav-toggle";
  const LIST_ID = "cpe-prompt-nav-list";
  const HIGHLIGHT_CLASS = "cpe-prompt-nav-highlight";

  let rebuildTimer = null;
  let locationWatcher = null;
  let mutationObserver = null;
  let isCollapsed = false;

  const style = document.createElement("style");
  style.textContent = `
    #${PANEL_ID} {
      position: fixed;
      top: 76px;
      right: 24px;
      width: 280px;
      max-height: 75vh;
      background: rgba(19, 23, 34, 0.92);
      color: #f5f6fb;
      font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
      border: 1px solid #2c3040;
      border-radius: 12px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
      z-index: 2147483646;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      overscroll-behavior: contain;
      backdrop-filter: blur(6px);
      pointer-events: auto;
    }
    #${PANEL_ID}.cpe-collapsed {
      height: 44px;
      width: 190px;
    }
    #${PANEL_ID} .cpe-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      background: linear-gradient(120deg, #0f172a, #0b1223);
      border-bottom: 1px solid #1f2335;
    }
    #${PANEL_ID} .cpe-title {
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.2px;
    }
    #${PANEL_ID} .cpe-actions {
      display: flex;
      gap: 6px;
    }
    #${PANEL_ID} button {
      all: unset;
      cursor: pointer;
      padding: 6px 8px;
      border-radius: 8px;
      background: #1c2235;
      color: #e8ebfa;
      font-size: 12px;
      line-height: 1;
      border: 1px solid #262c40;
      transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
    }
    #${PANEL_ID} button:hover {
      background: #24304d;
      border-color: #334168;
      transform: translateY(-1px);
    }
    #${PANEL_ID} .cpe-list {
      overflow-y: auto;
      padding: 6px;
      display: grid;
      gap: 4px;
      flex: 1;
      min-height: 0;
    }
    #${PANEL_ID}.cpe-collapsed .cpe-list {
      display: none;
    }
    #${PANEL_ID} .cpe-item {
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: start;
      gap: 8px;
      padding: 10px 10px;
      background: #111626;
      border: 1px solid #1d2233;
      border-radius: 10px;
      cursor: pointer;
      transition: background 120ms ease, border-color 120ms ease, transform 120ms ease;
    }
    #${PANEL_ID} .cpe-item:hover {
      background: #18223a;
      border-color: #273250;
      transform: translateY(-1px);
    }
    #${PANEL_ID} .cpe-index {
      width: 22px;
      height: 22px;
      border-radius: 7px;
      background: #22305a;
      color: #dfe7ff;
      display: grid;
      place-items: center;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.3px;
      flex-shrink: 0;
    }
    #${PANEL_ID} .cpe-text {
      font-size: 12px;
      color: #e8ecff;
      line-height: 1.4;
      max-height: 3.2em;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      word-break: break-word;
    }
    #${PANEL_ID} .cpe-empty {
      padding: 16px;
      text-align: center;
      color: #c8cee4;
      font-size: 12px;
      opacity: 0.85;
    }
    .${HIGHLIGHT_CLASS} {
      outline: 3px solid #4f9cff;
      outline-offset: 3px;
      transition: outline 600ms ease;
    }
  `;
  document.head.appendChild(style);

  function createPanel() {
    if (document.getElementById(PANEL_ID)) return;

    const panel = document.createElement("section");
    panel.id = PANEL_ID;
    panel.setAttribute("aria-label", "Prompt navigator");

    const header = document.createElement("div");
    header.className = "cpe-header";

    const title = document.createElement("div");
    title.className = "cpe-title";
    title.textContent = "Prompts";

    const actions = document.createElement("div");
    actions.className = "cpe-actions";

    const refreshBtn = document.createElement("button");
    refreshBtn.textContent = "Refresh";
    refreshBtn.title = "Rebuild prompt list";
    refreshBtn.addEventListener("click", rebuildList);

    const toggleBtn = document.createElement("button");
    toggleBtn.id = TOGGLE_ID;
    toggleBtn.textContent = "Hide";
    toggleBtn.title = "Collapse / expand";
    toggleBtn.addEventListener("click", toggleCollapse);

    actions.appendChild(refreshBtn);
    actions.appendChild(toggleBtn);
    header.appendChild(title);
    header.appendChild(actions);

    const list = document.createElement("div");
    list.className = "cpe-list";
    list.id = LIST_ID;

    panel.appendChild(header);
    panel.appendChild(list);
    document.body.appendChild(panel);
  }

  function toggleCollapse() {
    const panel = document.getElementById(PANEL_ID);
    const toggle = document.getElementById(TOGGLE_ID);
    if (!panel || !toggle) return;
    isCollapsed = !isCollapsed;
    panel.classList.toggle("cpe-collapsed", isCollapsed);
    toggle.textContent = isCollapsed ? "Show" : "Hide";
  }

  function debouncedRebuild() {
    if (rebuildTimer) clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(rebuildList, 200);
  }

  function rebuildList() {
    const list = document.getElementById(LIST_ID);
    const title = document.querySelector(`#${PANEL_ID} .cpe-title`);
    if (!list || !title) return;

    const prevScrollTop = list.scrollTop;
    list.innerHTML = "";

    const prompts = collectPrompts();
    title.textContent = `Prompts (${prompts.length})`;

    if (!prompts.length) {
      const empty = document.createElement("div");
      empty.className = "cpe-empty";
      empty.textContent = "No prompts found yet in this chat.";
      list.appendChild(empty);
      list.scrollTop = 0;
      return;
    }

    prompts.forEach((item, idx) => {
      const row = document.createElement("div");
      row.className = "cpe-item";
      row.setAttribute("tabindex", "0");
      row.setAttribute("role", "button");
      row.setAttribute("aria-label", `Jump to prompt ${idx + 1}`);

      const indexBadge = document.createElement("div");
      indexBadge.className = "cpe-index";
      indexBadge.textContent = `${idx + 1}`;

      const text = document.createElement("div");
      text.className = "cpe-text";
      text.textContent = item.label;

      row.addEventListener("click", () => scrollToPrompt(item.el));
      row.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          scrollToPrompt(item.el);
        }
      });

      row.appendChild(indexBadge);
      row.appendChild(text);
      list.appendChild(row);
    });

    if (prevScrollTop) {
      list.scrollTop = prevScrollTop;
    }
  }

  function collectPrompts() {
    // Prefer explicit author markers; fall back to role-based labels.
    const selectors = [
      "[data-message-author-role='user']",
      "[data-message-author-role=user]",
      "[data-message-role='user']",
      "[data-author='user']"
    ];

    const nodes = new Set();

    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((n) => {
        nodes.add(getMessageNode(n));
      });
    });

    // Fallback: look for message ids that sit in listitems, keeping only text the user typed.
    if (!nodes.size) {
      document.querySelectorAll("[data-message-id]").forEach((n) => {
        const text = extractText(n);
        if (text.length && looksLikeUserPrompt(text)) {
          nodes.add(n);
        }
      });
    }

    const items = [];
    let order = 0;
    nodes.forEach((el) => {
      const text = extractText(el);
      if (!text) return;
      const label = text.length > 90 ? `${text.slice(0, 90)}…` : text;
      items.push({
        el,
        label,
        order: order++
      });
    });

    // Keep the order they appear in the DOM
    items.sort((a, b) => {
      const pos = a.el.compareDocumentPosition(b.el);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return a.order - b.order;
    });

    return items;
  }

  function getMessageNode(node) {
    if (!node) return null;
    const withId = node.closest
      ? node.closest("[data-message-id]")
      : null;
    return withId || node;
  }

  function extractText(node) {
    if (!node) return "";
    const text = node.innerText || node.textContent || "";
    return text.trim().replace(/\s+/g, " ");
  }

  function looksLikeUserPrompt(text) {
    // Simple heuristic: ignore "Assistant" system text and tool outputs.
    return text.length > 0 && text.length < 2000;
  }

  function scrollToPrompt(el) {
    if (!el || typeof el.scrollIntoView !== "function") return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    flash(el);
  }

  function flash(el) {
    el.classList.add(HIGHLIGHT_CLASS);
    setTimeout(() => el.classList.remove(HIGHLIGHT_CLASS), 1200);
  }

  function startObservers() {
    const body = document.body;
    if (!body) return;

    if (mutationObserver) mutationObserver.disconnect();
    mutationObserver = new MutationObserver((mutations) => {
      const panel = document.getElementById(PANEL_ID);
      const shouldIgnore = panel && mutations.every((m) =>
        m.target === panel || (m.target && panel.contains(m.target))
      );
      if (shouldIgnore) return;
      debouncedRebuild();
    });
    mutationObserver.observe(body, {
      childList: true,
      subtree: true
    });

    let lastUrl = location.href;
    if (locationWatcher) clearInterval(locationWatcher);
    locationWatcher = setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        debouncedRebuild();
      }
    }, 800);
  }

  function init() {
    createPanel();
    rebuildList();
    startObservers();
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    init();
  } else {
    window.addEventListener("DOMContentLoaded", init, { once: true });
  }
})();
