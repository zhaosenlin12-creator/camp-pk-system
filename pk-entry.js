(function pkEntryBootstrap() {
  const pathname = String(window.location.pathname || '');
  if (!/\/admin(?:\/|$)/.test(pathname)) return;

  const CURRENT_CLASS_KEY = 'camp-pk-current-class-id';
  const ENTRY_ID = 'pk-game-entry-btn';
  const MODAL_ID = 'pk-entry-modal';
  const MODAL_STYLE_ID = 'pk-entry-modal-style';
  const ENTRY_LABEL = '\u62d4\u6cb3';
  const LEGACY_ENTRY_LABELS = [
    '\u62d4\u6cb3\u7b54\u9898\u8d5b',
    '\u62d4\u6cb3\u8d5b'
  ];

  const ADMIN_KEYWORDS = [
    '\u5b66\u5458\u7ba1\u7406',
    '\u6218\u961f\u7ba1\u7406',
    '\u73ed\u7ea7\u7ba1\u7406',
    '\u62bd\u5956\u9762\u677f',
    '\u7ba1\u7406'
  ];

  function ensureModalStyle() {
    if (document.getElementById(MODAL_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = MODAL_STYLE_ID;
    style.textContent = `
      #${MODAL_ID} {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.45);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
      }
      #${MODAL_ID} .pk-entry-modal-card {
        width: min(440px, 96vw);
        border-radius: 16px;
        border: 1px solid #dbeafe;
        background: #fff;
        box-shadow: 0 20px 55px rgba(15, 23, 42, 0.28);
        padding: 16px;
      }
      #${MODAL_ID} .pk-entry-modal-title {
        margin: 0;
        font-size: 18px;
        color: #0f172a;
        font-weight: 900;
      }
      #${MODAL_ID} .pk-entry-modal-text {
        margin-top: 8px;
        font-size: 14px;
        color: #334155;
        line-height: 1.6;
        white-space: pre-wrap;
      }
      #${MODAL_ID} .pk-entry-modal-actions {
        margin-top: 14px;
        display: flex;
        justify-content: flex-end;
      }
      #${MODAL_ID} .pk-entry-modal-btn {
        border: none;
        border-radius: 10px;
        padding: 8px 16px;
        font-size: 14px;
        font-weight: 800;
        color: #fff;
        background: linear-gradient(135deg, #0284c7, #2563eb);
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }

  function showModal(message, title) {
    ensureModalStyle();
    const old = document.getElementById(MODAL_ID);
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = MODAL_ID;
    overlay.innerHTML = `
      <div class="pk-entry-modal-card">
        <h3 class="pk-entry-modal-title">${String(title || '\u63d0\u793a').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h3>
        <div class="pk-entry-modal-text">${String(message || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        <div class="pk-entry-modal-actions">
          <button type="button" class="pk-entry-modal-btn">\u77e5\u9053\u4e86</button>
        </div>
      </div>
    `;

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) overlay.remove();
    });
    overlay.querySelector('.pk-entry-modal-btn')?.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
  }

  function resolveClassId() {
    const id = Number(window.localStorage.getItem(CURRENT_CLASS_KEY));
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  async function ensureClassReady(classId) {
    const response = await fetch(`/api/pk/classes/${classId}/context`, { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || '\u73ed\u7ea7\u4fe1\u606f\u8bfb\u53d6\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002');
    }
    if (!data.ready) {
      throw new Error('\u8be5\u73ed\u7ea7\u8fd8\u6ca1\u6709\u81f3\u5c11\u4e24\u4e2a\u6218\u961f\uff0c\u8bf7\u5148\u521b\u5efa\u6218\u961f\u3002');
    }
  }

  function findButtonByKeywords(keywords) {
    const list = Array.from(document.querySelectorAll('button'));
    return list.find((button) => {
      const text = (button.textContent || '').trim();
      return keywords.some((keyword) => text.includes(keyword));
    }) || null;
  }

  function findRowForButton(button) {
    let node = button;
    while (node && node !== document.body) {
      const directButtonCount = Array.from(node.children || [])
        .filter((child) => child.tagName === 'BUTTON')
        .length;
      if (directButtonCount >= 2) return node;

      const allButtons = node.querySelectorAll ? node.querySelectorAll('button') : [];
      if (allButtons.length >= 3) {
        const display = window.getComputedStyle(node).display;
        if (display.includes('flex') || display.includes('grid')) return node;
      }
      node = node.parentElement;
    }
    return null;
  }

  function findPreferredContainer() {
    const adminAnchor = findButtonByKeywords(ADMIN_KEYWORDS);
    if (!adminAnchor) return null;
    return findRowForButton(adminAnchor);
  }

  function isEntryButton(button) {
    if (!(button instanceof HTMLButtonElement)) return false;
    const text = (button.textContent || '').trim();
    return button.id === ENTRY_ID
      || button.dataset.pkEntry === '1'
      || text === ENTRY_LABEL
      || LEGACY_ENTRY_LABELS.includes(text);
  }

  function removeDuplicateButtons() {
    const all = Array.from(document.querySelectorAll('button')).filter(isEntryButton);
    if (all.length <= 1) return;
    const keeper = all.find((node) => node.id === ENTRY_ID || node.dataset.pkEntry === '1') || all[0];
    if (keeper) {
      keeper.id = ENTRY_ID;
      keeper.dataset.pkEntry = '1';
      keeper.textContent = ENTRY_LABEL;
    }
    all.forEach((node) => {
      if (node !== keeper) node.remove();
    });
  }

  function applyFallbackStyle(button) {
    button.className = '';
    button.style.border = '1px solid rgba(255, 255, 255, 0.5)';
    button.style.borderRadius = '999px';
    button.style.padding = '8px 16px';
    button.style.fontSize = '14px';
    button.style.fontWeight = '800';
    button.style.color = '#ffffff';
    button.style.background = 'rgba(255, 255, 255, 0.2)';
    button.style.backdropFilter = 'blur(4px)';
    button.style.whiteSpace = 'nowrap';
    button.style.cursor = 'pointer';
  }

  function findReferenceButton(container, entryButton) {
    const directButtons = Array.from(container.children || [])
      .filter((node) => node instanceof HTMLButtonElement && node !== entryButton && !isEntryButton(node));
    const allButtons = directButtons.length > 0
      ? directButtons
      : Array.from(container.querySelectorAll('button')).filter((node) => node !== entryButton && !isEntryButton(node));

    const notPressed = allButtons.find((button) => button.getAttribute('aria-pressed') === 'false');
    if (notPressed) return notPressed;

    const translucent = allButtons.find((button) => {
      const cls = String(button.className || '');
      return cls.includes('bg-white/') && cls.includes('text-white');
    });
    if (translucent) return translucent;

    return allButtons[0] || null;
  }

  function syncVisualStyle(button, referenceButton) {
    if (!(button instanceof HTMLButtonElement)) return;
    if (!(referenceButton instanceof HTMLButtonElement)) {
      applyFallbackStyle(button);
      return;
    }

    button.className = referenceButton.className;

    const referenceStyle = referenceButton.getAttribute('style');
    if (referenceStyle) {
      button.setAttribute('style', referenceStyle);
    } else {
      button.removeAttribute('style');
    }

    button.style.whiteSpace = 'nowrap';
    button.style.width = 'auto';
    button.style.minWidth = 'unset';
    button.style.cursor = 'pointer';
  }

  function ensureEntryAppearance(button, container) {
    const referenceButton = findReferenceButton(container, button);
    syncVisualStyle(button, referenceButton);
    button.textContent = ENTRY_LABEL;
  }

  function createEntryButton() {
    const button = document.createElement('button');
    button.id = ENTRY_ID;
    button.dataset.pkEntry = '1';
    button.type = 'button';
    button.textContent = ENTRY_LABEL;
    applyFallbackStyle(button);

    button.addEventListener('click', async () => {
      const classId = resolveClassId();
      if (!classId) {
        showModal('\u8bf7\u5148\u9009\u62e9\u73ed\u7ea7\uff0c\u518d\u8fdb\u5165\u62d4\u6cb3\u3002');
        return;
      }

      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = '\u68c0\u67e5\u6218\u961f\u4e2d...';
      try {
        await ensureClassReady(classId);
        window.open(`/pk-game?classId=${classId}`, '_blank');
      } catch (error) {
        showModal(error.message || '\u6682\u65f6\u65e0\u6cd5\u8fdb\u5165\u62d4\u6cb3\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002');
      } finally {
        button.disabled = false;
        button.textContent = originalText;
      }
    });

    return button;
  }

  function injectEntryButton() {
    const container = findPreferredContainer();
    if (!container) {
      const existing = document.getElementById(ENTRY_ID) || document.querySelector('[data-pk-entry="1"]');
      if (existing) existing.remove();
      return;
    }

    const existing = document.getElementById(ENTRY_ID) || document.querySelector('[data-pk-entry="1"]');
    if (existing) {
      if (existing.parentElement !== container) {
        container.appendChild(existing);
      }
      ensureEntryAppearance(existing, container);
      removeDuplicateButtons();
      return;
    }

    const button = createEntryButton();
    container.appendChild(button);
    ensureEntryAppearance(button, container);
    removeDuplicateButtons();
  }

  function boot() {
    const schedule = [0, 220, 680, 1500, 3000, 5200];
    schedule.forEach((delay) => window.setTimeout(injectEntryButton, delay));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
