(() => {
  const PANEL_ID = "cpe-prompt-nav";
  const LAUNCHER_ID = "cpe-prompt-nav-launcher";
  const LIST_ID = "cpe-prompt-nav-list";
  const HIGHLIGHT_CLASS = "cpe-prompt-nav-highlight";
  const PLATFORM_CONFIGS = {
    "chatgpt.com": {
      name: "ChatGPT",
      selectors: [
        "[data-message-author-role='user']",
        "[data-message-author-role=user]",
        "[data-message-role='user']",
        "[data-author='user']"
      ],
      closestSelectors: ["[data-message-id]"],
      fallbackSelectors: ["[data-message-id]"]
    },
    "www.chatgpt.com": {
      name: "ChatGPT",
      selectors: [
        "[data-message-author-role='user']",
        "[data-message-author-role=user]",
        "[data-message-role='user']",
        "[data-author='user']"
      ],
      closestSelectors: ["[data-message-id]"],
      fallbackSelectors: ["[data-message-id]"]
    },
    "chat.openai.com": {
      name: "ChatGPT",
      selectors: [
        "[data-message-author-role='user']",
        "[data-message-author-role=user]",
        "[data-message-role='user']",
        "[data-author='user']"
      ],
      closestSelectors: ["[data-message-id]"],
      fallbackSelectors: ["[data-message-id]"]
    },
    "gemini.google.com": {
      name: "Gemini",
      selectors: [
        "user-query",
        "user-query-content",
        "[data-test-id='user-query']",
        "[data-test-id='user-query-content']"
      ],
      closestSelectors: ["user-query", "user-query-content"],
      fallbackSelectors: ["#chat-history user-query", "#chat-history user-query-content"],
      sanitizeText(text) {
        return text.replace(/^\s*you said\s*/i, "").trim();
      }
    },
    "claude.ai": {
      name: "Claude",
      selectors: [
        "div[data-testid='user-message']",
        "[data-testid='user-message']"
      ],
      closestSelectors: ["div[data-testid='user-message']", "[data-testid='user-message']"],
      fallbackSelectors: ["div[data-testid='user-message']"]
    }
  };

  let rebuildTimer = null;
  let locationWatcher = null;
  let mutationObserver = null;
  let isOpen = false;
  const logoUrl = getLogoUrl();

  const style = document.createElement("style");
  style.textContent = `
    :root {
      --cpe-bg: rgba(10, 14, 24, 0.9);
      --cpe-panel-border: rgba(255, 255, 255, 0.1);
      --cpe-panel-shadow: 0 24px 80px rgba(0, 0, 0, 0.4);
      --cpe-accent: #78f0c8;
      --cpe-accent-2: #7aa2ff;
      --cpe-text: #f6f8ff;
      --cpe-text-muted: rgba(229, 234, 255, 0.72);
    }
    #${LAUNCHER_ID} {
      position: fixed;
      top: 76px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 18px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      background:
        radial-gradient(circle at 20% 20%, rgba(120, 240, 200, 0.35), transparent 45%),
        radial-gradient(circle at 80% 25%, rgba(122, 162, 255, 0.3), transparent 38%),
        linear-gradient(145deg, rgba(15, 20, 34, 0.98), rgba(6, 8, 16, 0.98));
      box-shadow: 0 18px 55px rgba(0, 0, 0, 0.35);
      z-index: 2147483646;
      display: grid;
      place-items: center;
      cursor: pointer;
      overflow: hidden;
      backdrop-filter: blur(12px);
      transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
    }
    #${LAUNCHER_ID}:hover {
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 24px 65px rgba(0, 0, 0, 0.42);
      border-color: rgba(255, 255, 255, 0.28);
    }
    #${LAUNCHER_ID}.cpe-open {
      transform: scale(0.98);
      border-color: rgba(120, 240, 200, 0.45);
    }
    #${LAUNCHER_ID} .cpe-logo-ring {
      position: absolute;
      inset: 6px;
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.01));
    }
    #${LAUNCHER_ID} .cpe-logo {
      position: relative;
      width: 28px;
      height: 28px;
      object-fit: contain;
      filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.28));
    }
    #${PANEL_ID} {
      position: fixed;
      top: 142px;
      right: 24px;
      width: min(320px, calc(100vw - 32px));
      max-height: min(72vh, 640px);
      background:
        radial-gradient(circle at top left, rgba(120, 240, 200, 0.1), transparent 32%),
        radial-gradient(circle at top right, rgba(122, 162, 255, 0.12), transparent 38%),
        var(--cpe-bg);
      color: var(--cpe-text);
      font-family: "Avenir Next", "Segoe UI", system-ui, sans-serif;
      border: 1px solid var(--cpe-panel-border);
      border-radius: 22px;
      box-shadow: var(--cpe-panel-shadow);
      z-index: 2147483645;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      overscroll-behavior: contain;
      backdrop-filter: blur(16px);
      pointer-events: auto;
      opacity: 0;
      transform: translateY(-12px) scale(0.96);
      transform-origin: top right;
      transition: opacity 170ms ease, transform 170ms ease;
      visibility: hidden;
    }
    #${PANEL_ID}.cpe-open {
      opacity: 1;
      transform: translateY(0) scale(1);
      visibility: visible;
    }
    #${PANEL_ID} .cpe-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 16px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    #${PANEL_ID} .cpe-heading {
      display: grid;
      gap: 4px;
    }
    #${PANEL_ID} .cpe-title {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.01em;
    }
    #${PANEL_ID} .cpe-subtitle {
      font-size: 11px;
      color: var(--cpe-text-muted);
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    #${PANEL_ID} .cpe-actions {
      display: flex;
      gap: 6px;
      flex-shrink: 0;
    }
    #${PANEL_ID} button {
      all: unset;
      cursor: pointer;
      padding: 7px 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.06);
      color: var(--cpe-text);
      font-size: 11px;
      font-weight: 600;
      line-height: 1;
      border: 1px solid rgba(255, 255, 255, 0.08);
      transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
    }
    #${PANEL_ID} button:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.18);
      transform: translateY(-1px);
    }
    #${PANEL_ID} .cpe-close-btn {
      background: rgba(255, 120, 120, 0.08);
      border-color: rgba(255, 120, 120, 0.18);
    }
    #${PANEL_ID} .cpe-close-btn:hover {
      background: rgba(255, 120, 120, 0.16);
      border-color: rgba(255, 120, 120, 0.26);
    }
    #${PANEL_ID} .cpe-list {
      overflow-y: auto;
      padding: 10px 12px 12px;
      display: grid;
      gap: 8px;
      flex: 1;
      min-height: 0;
    }
    #${PANEL_ID} .cpe-item {
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: start;
      gap: 10px;
      padding: 12px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.025));
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      cursor: pointer;
      transition: background 120ms ease, border-color 120ms ease, transform 120ms ease, box-shadow 120ms ease;
    }
    #${PANEL_ID} .cpe-item:hover {
      background: linear-gradient(180deg, rgba(120, 240, 200, 0.12), rgba(122, 162, 255, 0.08));
      border-color: rgba(120, 240, 200, 0.28);
      transform: translateY(-1px);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.16);
    }
    #${PANEL_ID} .cpe-index {
      width: 26px;
      height: 26px;
      border-radius: 9px;
      background: linear-gradient(180deg, rgba(120, 240, 200, 0.22), rgba(122, 162, 255, 0.18));
      color: var(--cpe-text);
      display: grid;
      place-items: center;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.3px;
      flex-shrink: 0;
    }
    #${PANEL_ID} .cpe-text {
      font-size: 12px;
      color: var(--cpe-text);
      line-height: 1.4;
      max-height: 3.2em;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      word-break: break-word;
    }
    #${PANEL_ID} .cpe-empty {
      padding: 20px 16px 24px;
      text-align: center;
      color: var(--cpe-text-muted);
      font-size: 12px;
      line-height: 1.5;
    }
    @media (max-width: 640px) {
      #${LAUNCHER_ID} {
        right: 18px;
      }
      #${PANEL_ID} {
        right: 16px;
        max-height: min(62vh, 540px);
      }
    }
    .${HIGHLIGHT_CLASS} {
      outline: 3px solid #4f9cff;
      outline-offset: 3px;
      transition: outline 600ms ease;
    }
  `;
  document.head.appendChild(style);

  function getLogoUrl() {
    if (typeof chrome !== "undefined" && chrome.runtime && typeof chrome.runtime.getURL === "function") {
      return chrome.runtime.getURL("icons/icon48.png");
    }
    return "";
  }

  function createPanel() {
    if (document.getElementById(PANEL_ID) || document.getElementById(LAUNCHER_ID)) return;

    const launcher = document.createElement("button");
    launcher.id = LAUNCHER_ID;
    launcher.type = "button";
    launcher.setAttribute("aria-label", "Toggle prompt navigator");
    launcher.setAttribute("aria-expanded", "false");
    launcher.title = "Open prompt navigator";

    const ring = document.createElement("div");
    ring.className = "cpe-logo-ring";

    const logo = document.createElement("img");
    logo.className = "cpe-logo";
    logo.alt = "";
    logo.src = logoUrl;

    launcher.appendChild(ring);
    launcher.appendChild(logo);
    launcher.addEventListener("click", togglePanel);

    const panel = document.createElement("section");
    panel.id = PANEL_ID;
    panel.setAttribute("aria-label", "Prompt navigator");

    const header = document.createElement("div");
    header.className = "cpe-header";

    const heading = document.createElement("div");
    heading.className = "cpe-heading";

    const title = document.createElement("div");
    title.className = "cpe-title";
    title.textContent = "Prompts";

    const subtitle = document.createElement("div");
    subtitle.className = "cpe-subtitle";
    subtitle.textContent = "Current conversation";

    const actions = document.createElement("div");
    actions.className = "cpe-actions";

    const refreshBtn = document.createElement("button");
    refreshBtn.textContent = "Refresh";
    refreshBtn.title = "Rebuild prompt list";
    refreshBtn.addEventListener("click", rebuildList);

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Close";
    closeBtn.className = "cpe-close-btn";
    closeBtn.title = "Hide prompt navigator";
    closeBtn.addEventListener("click", closePanel);

    actions.appendChild(refreshBtn);
    actions.appendChild(closeBtn);
    heading.appendChild(title);
    heading.appendChild(subtitle);
    header.appendChild(heading);
    header.appendChild(actions);

    const list = document.createElement("div");
    list.className = "cpe-list";
    list.id = LIST_ID;

    panel.appendChild(header);
    panel.appendChild(list);
    document.body.appendChild(launcher);
    document.body.appendChild(panel);
  }

  function togglePanel() {
    const panel = document.getElementById(PANEL_ID);
    const launcher = document.getElementById(LAUNCHER_ID);
    if (!panel || !launcher) return;

    isOpen = !isOpen;
    panel.classList.toggle("cpe-open", isOpen);
    launcher.classList.toggle("cpe-open", isOpen);
    launcher.setAttribute("aria-expanded", String(isOpen));
    launcher.title = isOpen ? "Hide prompt navigator" : "Open prompt navigator";
  }

  function closePanel() {
    const panel = document.getElementById(PANEL_ID);
    const launcher = document.getElementById(LAUNCHER_ID);
    if (!panel || !launcher) return;

    isOpen = false;
    panel.classList.remove("cpe-open");
    launcher.classList.remove("cpe-open");
    launcher.setAttribute("aria-expanded", "false");
    launcher.title = "Open prompt navigator";
  }

  function debouncedRebuild() {
    if (rebuildTimer) clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(rebuildList, 200);
  }

  function rebuildList() {
    const list = document.getElementById(LIST_ID);
    const title = document.querySelector(`#${PANEL_ID} .cpe-title`);
    if (!list || !title) return;
    const platform = getPlatformConfig();

    const prevScrollTop = list.scrollTop;
    list.innerHTML = "";

    const prompts = collectPrompts();
    title.textContent = `${platform.name} Prompts (${prompts.length})`;

    if (!prompts.length) {
      const empty = document.createElement("div");
      empty.className = "cpe-empty";
      empty.textContent = `No prompts found yet in this ${platform.name} chat.`;
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
    const config = getPlatformConfig();
    const selectors = config.selectors || [];

    const nodes = new Set();

    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((n) => {
        const messageNode = getMessageNode(n, config.closestSelectors);
        if (messageNode) {
          nodes.add(messageNode);
        }
      });
    });

    // Fallbacks for host-specific structures when primary selectors miss.
    if (!nodes.size) {
      (config.fallbackSelectors || []).forEach((sel) => {
        document.querySelectorAll(sel).forEach((n) => {
          const messageNode = getMessageNode(n, config.closestSelectors) || n;
          const text = extractText(messageNode);
          if (text.length && looksLikeUserPrompt(text)) {
            nodes.add(messageNode);
          }
        });
      });
    }

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

  function getPlatformConfig() {
    return PLATFORM_CONFIGS[location.hostname] || PLATFORM_CONFIGS["chatgpt.com"];
  }

  function getMessageNode(node, closestSelectors = []) {
    if (!node) return null;
    if (node.closest) {
      for (const selector of closestSelectors) {
        const match = node.closest(selector);
        if (match) return match;
      }
      const withId = node.closest("[data-message-id]");
      if (withId) return withId;
    }
    return node;
  }

  function extractText(node) {
    if (!node) return "";
    const config = getPlatformConfig();
    const text = node.innerText || node.textContent || "";
    const normalized = text.trim().replace(/\s+/g, " ");
    return typeof config.sanitizeText === "function"
      ? config.sanitizeText(normalized)
      : normalized;
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
