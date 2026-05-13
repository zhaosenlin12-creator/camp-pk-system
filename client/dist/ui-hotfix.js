(function uiHotfixBootstrap() {
  const pathname = String(window.location.pathname || '');
  if (!/\/admin(?:\/|$)/.test(pathname)) return;

  const ROOT_CLASS = 'uihf-patched';
  const CEREMONY_ATTR = 'data-uihf-ceremony';
  const FIXED_HOST_RESET_CLASS = 'uihf-fixed-host-reset';
  const REAPPLY_INTERVAL_MS = 900;
  const REAPPLY_MAX_TICKS = 16;
  const PET_CENTER_REFRESH_MS = 2400;

  let fetchPatched = false;
  let reapplyTimer = null;
  let reapplyTicks = 0;
  let petCenterRefreshTimer = null;

  const petCenterCache = {
    classId: 0,
    loadedAt: 0,
    loading: null,
    students: new Map()
  };

  const actionTalkLines = {
    claim: ['新伙伴到位，准备一起成长！', '这只宠物今天正式入队！', '收藏架又热闹起来了！'],
    feed: ['\u7ee7\u7eed\u5403\uff0c\u5feb\u957f\u5927\uff01', '\u80fd\u91cf\u52a0\u6ee1\uff0c\u518d\u51b2\u4e00\u8f6e\uff01', '\u4eca\u5929\u7684\u653b\u7565\u5f88\u5230\u4f4d\uff01'],
    play: ['\u914d\u5408\u5b8c\u7f8e\uff0c\u518d\u6765\u4e00\u628a\uff01', '\u56e2\u961f\u9ed8\u5951+1\uff01', '\u52a8\u8d77\u6765\uff0c\u6211\u4eec\u80fd\u8d62\uff01'],
    clean: ['\u6e05\u6f54\u5b8c\u6210\uff0c\u72b6\u6001\u66f4\u597d\uff01', '\u5e72\u5e72\u51c0\u51c0\uff0c\u7ee7\u7eed\u53d1\u529b\uff01', '\u6574\u7406\u597d\u4e86\uff0c\u4e0a\u573a\u5427\uff01'],
    hatch: ['\u5b75\u5316\u5012\u8ba1\u65f6\uff0c\u51c6\u5907\u89c1\u8bc1\uff01', '\u86cb\u58f3\u5f00\u59cb\u88c2\u5f00\u4e86\uff01', '\u5168\u73ed\u4e00\u8d77\u5012\u6570\uff01'],
    evolve: ['\u8fdb\u5316\u5149\u73af\u5145\u80fd\u4e2d\uff01', '\u65b0\u5f62\u6001\u5feb\u8981\u89e3\u9501\uff01', '\u8fd9\u4e00\u6ce2\u8fdb\u5316\u592a\u9177\u4e86\uff01']
  };

  function normalizeText(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function pickRandom(list) {
    if (!Array.isArray(list) || list.length === 0) return '';
    return list[Math.floor(Math.random() * list.length)];
  }

  function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function detectActionType(text) {
    const safe = normalizeText(text).toLowerCase();
    if (!safe) return '';
    if (/(?:\u9886\u53d6|\u83b7\u5f97|claim)/i.test(safe)) return 'claim';
    if (/(?:\u5582\u517b|\u5582\u98df|feed)/i.test(safe)) return 'feed';
    if (/(?:\u4e92\u52a8|\u73a9\u800d|play)/i.test(safe)) return 'play';
    if (/(?:\u6e05\u6d01|\u6e05\u7406|clean)/i.test(safe)) return 'clean';
    if (/(?:\u5b75\u5316|hatch)/i.test(safe)) return 'hatch';
    if (/(?:\u8fdb\u5316|\u8fdb\u9636|evolve)/i.test(safe)) return 'evolve';
    return '';
  }

  function getCurrentClassId() {
    const stored = Number(window.localStorage.getItem('camp-pk-current-class-id'));
    return Number.isFinite(stored) && stored > 0 ? stored : 0;
  }

  function getCurrentSelectedStudentId(root = document) {
    const select = root.querySelector?.('[data-testid="pet-center-student-select"]');
    const value = Number(select?.value || 0);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function upsertStudentRecord(student) {
    const id = toNumber(student?.id, 0);
    if (!id) return;
    petCenterCache.students.set(id, student);
  }

  function getSelectedStudentRecord(root = document) {
    const selectedId = getCurrentSelectedStudentId(root);
    if (!selectedId) return null;
    return petCenterCache.students.get(selectedId) || null;
  }

  async function refreshPetCenterStudents(force = false) {
    const classId = getCurrentClassId();
    if (!classId) return null;
    const shouldSkip = !force
      && petCenterCache.classId === classId
      && (Date.now() - petCenterCache.loadedAt) < PET_CENTER_REFRESH_MS;
    if (shouldSkip && petCenterCache.students.size) {
      return petCenterCache.students;
    }
    if (petCenterCache.loading) {
      return petCenterCache.loading;
    }

    petCenterCache.loading = window.fetch(`/api/classes/${classId}/students`, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : [])
      .then((students) => {
        petCenterCache.classId = classId;
        petCenterCache.loadedAt = Date.now();
        petCenterCache.students = new Map();
        if (Array.isArray(students)) {
          students.forEach((student) => upsertStudentRecord(student));
        }
        window.setTimeout(() => applyLightFix(), 0);
        return petCenterCache.students;
      })
      .catch(() => petCenterCache.students)
      .finally(() => {
        petCenterCache.loading = null;
      });

    return petCenterCache.loading;
  }

  function getJourneyForStudent(student) {
    if (!student || typeof student !== 'object') return null;
    return student.pet_journey || student.journey || student.pet_collection?.find?.((slot) => slot?.is_active)?.journey || null;
  }

  function buildStageHintText(journey) {
    if (!journey) return '';
    if (journey.can_hatch) return '\u53ef\u4ee5\u5b75\u5316';
    if (journey.can_evolve) {
      return journey.next_stage_level
        ? `\u53ef\u8fdb\u5316\u5230 Lv.${journey.next_stage_level}`
        : '\u53ef\u4ee5\u8fdb\u5316';
    }
    if (toNumber(journey.remaining_growth_to_next_stage, 0) > 0) {
      return `\u8fd8\u5dee ${journey.remaining_growth_to_next_stage} \u70b9\u6210\u957f`;
    }
    if (journey.next_stage_name) return `\u51c6\u5907\u89e3\u9501 ${journey.next_stage_name}`;
    return normalizeText(journey.status_label || journey.stage_name || '');
  }

  function buildNextStepSummary(journey) {
    if (!journey) {
      return {
        badge: '\u7b49\u5f85\u9009\u62e9',
        headline: '\u5148\u9009\u4e00\u4f4d\u5b66\u751f\uff0c\u518d\u5f00\u59cb\u57f9\u517b\u3002',
        range: '--',
        progress: 0,
        progressText: '--',
        extraA: '\u5f53\u524d\u9636\u6bb5\u6682\u672a\u5f00\u542f',
        extraB: '\u5f15\u5bfc\uff1a\u9886\u53d6\u6216\u5207\u6362\u4e3b\u5ba0'
      };
    }

    const start = toNumber(journey.stage_growth_start, 0);
    const target = toNumber(journey.stage_growth_target, start);
    const remaining = Math.max(0, toNumber(journey.remaining_growth_to_next_stage, 0));
    const progress = clamp(toNumber(journey.stage_growth_progress, 0), 0, 100);
    const levelLabel = journey.next_stage_level
      ? `Lv.${journey.stage_level || 1} \u2192 Lv.${journey.next_stage_level}`
      : (journey.stage_name || '\u5f53\u524d\u9636\u6bb5');

    if (journey.can_hatch) {
      return {
        badge: '\u53ef\u4ee5\u5b75\u5316',
        headline: '\u73b0\u5728\u70b9\u51fb\u201c\u5b75\u5316\u201d\uff0c\u4e3b\u89d2\u5c31\u4f1a\u6b63\u5f0f\u767b\u573a\u3002',
        range: `0 \u2192 ${target}`,
        progress,
        progressText: '\u6761\u4ef6\u5df2\u6ee1',
        extraA: `\u6210\u957f ${journey.growth_value || 0}/${target}`,
        extraB: `\u7167\u6599 ${journey.total_care_actions || 0}\u6b21`
      };
    }

    if (journey.can_evolve) {
      return {
        badge: journey.next_stage_name || '\u53ef\u4ee5\u8fdb\u5316',
        headline: journey.next_stage_name
          ? `\u73b0\u5728\u70b9\u51fb\u201c\u8fdb\u5316\u201d\uff0c\u89e3\u9501 ${journey.next_stage_name}\u3002`
          : '\u5df2\u8fbe\u6210\u5f53\u524d\u9636\u6bb5\u76ee\u6807\uff0c\u53ef\u4ee5\u70b9\u51fb\u8fdb\u5316\u3002',
        range: `${start} \u2192 ${target}`,
        progress: 100,
        progressText: '\u76ee\u6807\u5df2\u8fbe\u6210',
        extraA: `\u6210\u957f ${journey.growth_value || 0}/${target}`,
        extraB: `\u5c06\u89e3\u9501 ${journey.next_stage_level ? `Lv.${journey.next_stage_level}` : '\u4e0b\u4e00\u9636\u6bb5'}`
      };
    }

    return {
      badge: levelLabel,
      headline: remaining > 0
        ? `\u8fd8\u5dee ${remaining} \u70b9\u6210\u957f\uff0c\u5c31\u80fd\u89e3\u9501 ${journey.next_stage_name || `Lv.${journey.next_stage_level || ((journey.stage_level || 1) + 1)}`}\u3002`
        : (normalizeText(journey.next_target) || '\u4fdd\u6301\u7167\u6599\uff0c\u7ee7\u7eed\u63a8\u8fdb\u5f53\u524d\u9636\u6bb5\u3002'),
      range: `${start} \u2192 ${target}`,
      progress,
      progressText: `\u8fd8\u5dee ${remaining} \u70b9`,
      extraA: `\u6210\u957f ${journey.growth_value || 0}/${target}`,
      extraB: `\u7167\u6599\u5206 ${journey.care_score || 0}`
    };
  }

  function patchStageHintBubble(host, journey) {
    if (!(host instanceof HTMLElement) || !journey) return;
    const bubble = Array.from(host.querySelectorAll('div, span')).find((node) => {
      const text = normalizeText(node.textContent);
      return text && (
        text === '\u8ddd\u79bb\u8fdb\u5316'
        || text === '\u53ef\u4ee5\u5b75\u5316\u4e86'
        || text === '\u53ef\u4ee5\u8fdb\u5316'
        || text.startsWith('\u8fd8\u5dee')
      );
    });
    if (!(bubble instanceof HTMLElement)) return;
    bubble.textContent = buildStageHintText(journey);
    bubble.classList.add('uihf-stage-bubble');
  }

  function patchPetActionSummary(root, journey) {
    if (!journey) return;
    const actionButton = root.querySelector?.('[data-testid="pet-action-feed"], [data-testid="pet-action-hatch"], [data-testid="pet-action-evolve"]');
    if (!(actionButton instanceof HTMLElement)) return;
    const actionPanel = actionButton.parentElement?.parentElement?.parentElement;
    if (!(actionPanel instanceof HTMLElement)) return;
    const summaryBox = Array.from(actionPanel.children).find((child) => normalizeText(child.textContent).includes('\u4e0b\u4e00\u6b65'));
    if (!(summaryBox instanceof HTMLElement)) return;

    const summary = buildNextStepSummary(journey);
    summaryBox.classList.add('uihf-next-box');
    summaryBox.setAttribute('data-uihf-stage-summary', '1');
    summaryBox.innerHTML = `
      <div class="uihf-next-box-head">
        <div class="uihf-next-box-kicker">\u4e0b\u4e00\u6b65</div>
        <span class="uihf-next-box-badge">${escapeHtml(summary.badge)}</span>
      </div>
      <div class="uihf-next-box-title">${escapeHtml(summary.headline)}</div>
      <div class="uihf-next-box-progress">
        <div class="uihf-next-box-progress-bar">
          <span style="width:${clamp(summary.progress, 0, 100)}%"></span>
        </div>
        <span class="uihf-next-box-progress-text">${escapeHtml(summary.progressText)}</span>
      </div>
      <div class="uihf-next-box-metrics">
        <span class="uihf-next-metric">\u672c\u9636\u6bb5 ${escapeHtml(summary.range)}</span>
        <span class="uihf-next-metric">${escapeHtml(summary.extraA)}</span>
        <span class="uihf-next-metric">${escapeHtml(summary.extraB)}</span>
      </div>
    `;
  }

  function compactPetProfileStructure(modal) {
    if (!(modal instanceof HTMLElement)) return;
    modal.classList.add('uihf-pet-profile-slim');
    const headingsToHide = new Set(['\u9636\u6bb5\u91cd\u70b9', '\u6210\u957f\u8f68\u8ff9']);
    const focusHeadings = Array.from(modal.querySelectorAll('div')).filter((node) => {
      if (!(node instanceof HTMLElement)) return false;
      return headingsToHide.has(normalizeText(node.textContent));
    });
    focusHeadings.forEach((heading) => {
      const card = heading.closest('.rounded-\\[30px\\]') || heading.parentElement;
      if (!(card instanceof HTMLElement)) return;
      card.setAttribute('data-uihf-compact-hidden', '1');
    });

    const previewTagPattern = /^lv\.?\s*\d+\s*(?:\u9884\u89c8\u5f62\u6001|\u5f53\u524d\u5f62\u6001)$/i;
    const chips = Array.from(modal.querySelectorAll('span, div')).filter((node) => {
      if (!(node instanceof HTMLElement)) return false;
      return previewTagPattern.test(normalizeText(node.textContent));
    });
    chips.forEach((chip) => {
      chip.setAttribute('data-uihf-compact-hidden', '1');
      chip.style.display = 'none';
    });
  }

  function patchPetCenterPanels(_root) {
    // Avoid rewriting React-managed pet center markup here.
  }

  function patchActionButtonLabels(root) {
    const buttons = root.querySelectorAll ? root.querySelectorAll('button[title]') : [];
    buttons.forEach((button) => {
      if (!(button instanceof HTMLButtonElement)) return;
      const title = normalizeText(button.getAttribute('title'));
      if (title === '\u4fee\u6539\u79ef\u5206') button.textContent = '\u79ef\u5206';
      if (title === '\u7f16\u8f91') button.textContent = '\u7f16\u8f91';
      if (title === '\u5220\u9664') button.textContent = '\u5220\u9664';
    });
  }

  function patchModalLayers(root) {
    const layers = root.querySelectorAll
      ? root.querySelectorAll('.dialog-layer, .editor-modal-layer')
      : [];
    layers.forEach((layer) => {
      if (!(layer instanceof HTMLElement)) return;
      if (layer.classList.contains('editor-modal-layer')) layer.style.zIndex = '12500';
      if (layer.classList.contains('dialog-layer')) layer.style.zIndex = '13000';
    });
  }

  function patchModalShell(modal) {
    if (!(modal instanceof HTMLElement)) return;
    const shell = modal.closest('.fixed.inset-0') || modal.parentElement;
    if (!(shell instanceof HTMLElement)) return;
    shell.classList.add('uihf-modal-shell');
    shell.style.overflowY = 'auto';
    shell.style.padding = '18px 14px 26px';
    shell.style.alignItems = 'flex-start';
    shell.style.justifyContent = 'center';
  }

  function clearFixedHostResets(root = document) {
    const hosts = root.querySelectorAll ? root.querySelectorAll(`.${FIXED_HOST_RESET_CLASS}`) : [];
    hosts.forEach((host) => {
      if (!(host instanceof HTMLElement)) return;
      host.classList.remove(FIXED_HOST_RESET_CLASS);
    });
  }

  function releaseFixedModalHosts(modal) {
    if (!(modal instanceof HTMLElement)) return;
    let cursor = modal.parentElement;
    while (cursor && cursor !== document.body && cursor !== document.documentElement) {
      const style = window.getComputedStyle(cursor);
      const trapsFixedPosition = style.backdropFilter !== 'none'
        || style.webkitBackdropFilter !== 'none'
        || style.filter !== 'none'
        || style.transform !== 'none'
        || style.perspective !== 'none';
      if (trapsFixedPosition) {
        cursor.classList.add(FIXED_HOST_RESET_CLASS);
      }
      cursor = cursor.parentElement;
    }
  }

  function compactPetProfileModal(root) {
    const modals = root.querySelectorAll
      ? root.querySelectorAll('[data-testid="pet-profile-modal"]')
      : [];
    modals.forEach((modal) => {
      if (!(modal instanceof HTMLElement)) return;
      modal.classList.add('uihf-pet-profile-compact');
      modal.style.maxHeight = '88vh';
      modal.style.overflowY = 'auto';
      patchModalShell(modal);
      compactPetProfileStructure(modal);
    });
  }

  function patchDangerConfirmModals(root) {
    clearFixedHostResets(root);
    const modals = root.querySelectorAll
      ? root.querySelectorAll('[data-testid$="danger-confirm-modal"], .fixed.inset-0')
      : [];
    modals.forEach((modal) => {
      if (!(modal instanceof HTMLElement)) return;
      const text = normalizeText(modal.textContent);
      const looksDangerDialog = modal.matches('[data-testid$="danger-confirm-modal"]')
        || /(?:\u5371\u9669\u64cd\u4f5c|\u786e\u8ba4\u5220\u9664|\u5220\u9664(?:\u73ed\u7ea7|\u6218\u961f|\u5b66\u5458|\u8bc4\u5206))/i.test(text);
      if (!looksDangerDialog) return;
      modal.classList.add('uihf-danger-confirm');
      modal.style.maxHeight = 'calc(100vh - 40px)';
      modal.style.overflowY = 'auto';
      patchModalShell(modal);
      releaseFixedModalHosts(modal);
    });
  }

  function showPetTalk(button, actionType) {
    if (!(button instanceof HTMLElement) || !actionType) return;
    const rect = button.getBoundingClientRect();
    const bubble = document.createElement('span');
    bubble.className = 'uihf-action-bubble';
    bubble.textContent = pickRandom(actionTalkLines[actionType]) || '\u52a0\u6cb9\uff01';
    bubble.style.left = `${Math.round(rect.left + rect.width / 2)}px`;
    bubble.style.top = `${Math.max(14, Math.round(rect.top - 16))}px`;
    document.body.appendChild(bubble);
    window.setTimeout(() => bubble.remove(), 1800);
  }

  function hideLegacyCeremonyPanels(actionType) {
    let matcher = /(?:\u5b75\u5316|\u7834\u58f3|\u86cb)/i;
    if (actionType === 'evolve') {
      matcher = /(?:\u8fdb\u5316|\u8fdb\u9636)/i;
    } else if (actionType === 'claim') {
      matcher = /(?:\u65b0\u5ba0\u7269\u62a5\u5230|\u52a0\u5165\u6536\u85cf\u67b6|\u9886\u53d6\u5ba0\u7269|\u9886\u53d6\u6210\u529f|\u6536\u85cf\u67b6)/i;
    }
    const panels = Array.from(document.querySelectorAll('[data-testid="pet-ceremony-overlay"]'));
    panels.forEach((panel) => {
      if (!(panel instanceof HTMLElement)) return;
      const text = normalizeText(panel.textContent);
      if (!matcher.test(text)) return;

      const shell = panel.closest('.fixed.inset-0');
      if (shell instanceof HTMLElement) {
        shell.classList.add('uihf-legacy-ceremony-muted');
      }
      const continueBtn = panel.querySelector('[data-testid="ceremony-continue"]')
        || panel.querySelector('[data-testid="ceremony-close"]')
        || panel.querySelector('button');
      if (continueBtn instanceof HTMLElement) {
        window.setTimeout(() => continueBtn.click(), 1800);
      }
    });
  }

  function dismissAutoPetProfileOverlay() {
    const shells = Array.from(document.querySelectorAll('.fixed.inset-0'));
    shells.forEach((shell) => {
      if (!(shell instanceof HTMLElement)) return;
      const text = normalizeText(shell.textContent);
      if (!text.includes('\u5ba0\u7269\u6210\u957f\u6863\u6848')) return;

      const closeButton = Array.from(shell.querySelectorAll('button')).find((button) => {
        return normalizeText(button.textContent) === '\u5173\u95ed';
      });

      if (closeButton instanceof HTMLButtonElement) {
        closeButton.click();
        return;
      }

      shell.classList.add('uihf-auto-closed-overlay');
    });
  }

  function collectStageImages(payload) {
    const images = [];
    const seen = new Set();

    const push = (value) => {
      if (typeof value !== 'string') return;
      const src = value.trim();
      if (!src || seen.has(src)) return;
      seen.add(src);
      images.push(src);
    };

    const pushFromPet = (pet) => {
      if (!pet || typeof pet !== 'object') return;
      push(pet.image);
      const stages = Array.isArray(pet.evolutionStages) ? pet.evolutionStages : [];
      stages.forEach(push);
    };

    pushFromPet(payload?.pet);

    const collection = Array.isArray(payload?.pet_collection) ? payload.pet_collection : [];
    const active = collection.find((slot) => slot && slot.is_active) || collection[0];
    pushFromPet(active?.pet);

    return images;
  }

  function resolveStageLevel(payload) {
    const candidates = [
      payload?.pet?.stage_level,
      payload?.pet_journey?.stage_level,
      payload?.journey?.stage_level
    ];

    if (Array.isArray(payload?.pet_collection)) {
      const active = payload.pet_collection.find((slot) => slot && slot.is_active) || payload.pet_collection[0];
      candidates.push(active?.journey?.stage_level);
      candidates.push(active?.pet?.stage_level);
    }

    for (const value of candidates) {
      const level = toNumber(value, 0);
      if (level > 0) return level;
    }
    return 1;
  }

  function pickStageImage(images, stageLevel, fallback = '') {
    if (!Array.isArray(images) || images.length === 0) return fallback;
    const index = clamp(Math.round(stageLevel) - 1, 0, images.length - 1);
    return images[index] || fallback || images[0];
  }

  function resolveTransition(actionType, payload) {
    const images = collectStageImages(payload);
    const stageLevel = resolveStageLevel(payload);

    if (actionType === 'claim') {
      const afterSrc = pickStageImage(images, Math.max(1, stageLevel), '');
      return {
        beforeSrc: '',
        afterSrc,
        beforeEmoji: '\ud83c\udf81',
        afterEmoji: '\ud83d\udc3e',
        titleBefore: '\u65b0\u4f19\u4f34\u6b63\u5728\u767b\u573a...',
        titleAfter: '\u9886\u53d6\u6210\u529f\uff01'
      };
    }

    if (actionType === 'hatch') {
      const afterSrc = pickStageImage(images, Math.max(1, stageLevel), '');
      return {
        beforeSrc: '',
        afterSrc,
        beforeEmoji: '\ud83e\udd5a',
        afterEmoji: '\ud83d\udc3e',
        titleBefore: '\u5b75\u5316\u4eea\u5f0f\u8fdb\u884c\u4e2d...',
        titleAfter: '\u5b75\u5316\u6210\u529f\uff01'
      };
    }

    const afterLevel = Math.max(2, stageLevel);
    const beforeLevel = Math.max(1, afterLevel - 1);
    const beforeSrc = pickStageImage(images, beforeLevel, '');
    const afterSrc = pickStageImage(images, afterLevel, beforeSrc);
    return {
      beforeSrc,
      afterSrc,
      beforeEmoji: '\ud83d\udc3e',
      afterEmoji: '\ud83e\udd81',
      titleBefore: '\u8fdb\u5316\u4eea\u5f0f\u8fdb\u884c\u4e2d...',
      titleAfter: '\u8fdb\u5316\u6210\u529f\uff01'
    };
  }

  function renderCeremonyPet(source, className, fallbackEmoji) {
    if (source) {
      return `<img class="${className}" src="${escapeHtml(source)}" alt="" loading="eager" decoding="async" />`;
    }
    return `<span class="${className} uihf-ceremony-emoji">${escapeHtml(fallbackEmoji)}</span>`;
  }

  function showCeremony(actionType, payload) {
    if (actionType !== 'claim' && actionType !== 'hatch' && actionType !== 'evolve') return;
    const existing = document.querySelector(`[${CEREMONY_ATTR}="1"]`);
    if (existing) existing.remove();

    const transition = resolveTransition(actionType, payload);
    const ceremonyClass = actionType === 'evolve'
      ? 'evolve'
      : (actionType === 'claim' ? 'claim' : 'hatch');

    const layer = document.createElement('div');
    layer.setAttribute(CEREMONY_ATTR, '1');
    layer.className = 'uihf-ceremony-layer';
    layer.innerHTML = `
      <div class="uihf-ceremony-card ${ceremonyClass}">
        <div class="uihf-ceremony-stage">
          <div class="uihf-ceremony-pet before">
            ${renderCeremonyPet(transition.beforeSrc, 'uihf-ceremony-pet-image', transition.beforeEmoji)}
          </div>
          <div class="uihf-ceremony-arrow">\u2192</div>
          <div class="uihf-ceremony-pet after">
            ${renderCeremonyPet(transition.afterSrc, 'uihf-ceremony-pet-image', transition.afterEmoji)}
          </div>
        </div>
        <div class="uihf-ceremony-title">${transition.titleBefore}</div>
      </div>
    `;
    document.body.appendChild(layer);
    requestAnimationFrame(() => layer.classList.add('show'));

    window.setTimeout(() => {
      const card = layer.querySelector('.uihf-ceremony-card');
      const title = layer.querySelector('.uihf-ceremony-title');
      if (card) card.classList.add('done');
      if (title) title.textContent = transition.titleAfter;
    }, 2800);

    window.setTimeout(() => {
      layer.classList.remove('show');
      window.setTimeout(() => layer.remove(), 360);
    }, 6200);
  }

  function patchFetchForPetCeremony() {
    if (fetchPatched || typeof window.fetch !== 'function') return;
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const request = args[0];
      const url = typeof request === 'string' ? request : String(request?.url || '');
      const petActionMatch = url.match(/\/api\/students\/\d+\/pet\/(hatch|evolve)(?:\?|$)/i);
      const claimMatch = /\/api\/students\/\d+\/claim-pet(?:\?|$)/i.test(url);
      const response = await originalFetch(...args);
      if (/\/api\/classes\/\d+\/students(?:\?|$)/i.test(url) && response?.ok) {
        try {
          const payload = await response.clone().json();
          petCenterCache.classId = getCurrentClassId();
          petCenterCache.loadedAt = Date.now();
          petCenterCache.students = new Map();
          if (Array.isArray(payload)) {
            payload.forEach((student) => upsertStudentRecord(student));
          }
        } catch (_error) {
          // ignore cache warm failures
        }
      }
      const actionType = petActionMatch
        ? String(petActionMatch[1]).toLowerCase()
        : (claimMatch ? 'claim' : '');
      if (actionType && response?.ok) {
        let payload = null;
        try {
          payload = await response.clone().json();
        } catch (_error) {
          payload = null;
        }
        if (payload && typeof payload === 'object') {
          upsertStudentRecord(payload);
          petCenterCache.loadedAt = Date.now();
        }
        showCeremony(actionType, payload);
        hideLegacyCeremonyPanels(actionType);
        window.setTimeout(() => hideLegacyCeremonyPanels(actionType), 260);
        window.setTimeout(() => hideLegacyCeremonyPanels(actionType), 620);
        window.setTimeout(dismissAutoPetProfileOverlay, 320);
        window.setTimeout(dismissAutoPetProfileOverlay, 1200);
        window.setTimeout(dismissAutoPetProfileOverlay, 2400);
        window.setTimeout(dismissAutoPetProfileOverlay, 4200);
        window.setTimeout(dismissAutoPetProfileOverlay, 6200);
        window.setTimeout(() => applyLightFix(), 120);
      }
      return response;
    };
    fetchPatched = true;
  }

  function applyLightFix() {
    document.documentElement.classList.add(ROOT_CLASS);
    patchActionButtonLabels(document);
    patchModalLayers(document);
    compactPetProfileModal(document);
    patchDangerConfirmModals(document);
    void refreshPetCenterStudents();
  }

  function scheduleReapply() {
    if (reapplyTimer) {
      window.clearInterval(reapplyTimer);
      reapplyTimer = null;
    }
    reapplyTicks = 0;
    reapplyTimer = window.setInterval(() => {
      reapplyTicks += 1;
      applyLightFix();
      if (reapplyTicks >= REAPPLY_MAX_TICKS) {
        window.clearInterval(reapplyTimer);
        reapplyTimer = null;
      }
    }, REAPPLY_INTERVAL_MS);
  }

  function bindButtonEffects() {
    document.addEventListener('click', (event) => {
      const button = event.target instanceof Element ? event.target.closest('button') : null;
      if (!(button instanceof HTMLButtonElement)) return;

      const actionType = detectActionType(button.textContent || button.getAttribute('title'));
      if (actionType) {
        button.classList.add('uihf-pet-btn');
        button.classList.toggle('uihf-pet-feed', actionType === 'feed');
        button.classList.toggle('uihf-pet-play', actionType === 'play');
        button.classList.toggle('uihf-pet-clean', actionType === 'clean');
        button.classList.toggle('uihf-pet-hatch', actionType === 'hatch');
        button.classList.toggle('uihf-pet-evolve', actionType === 'evolve');
        button.classList.remove('uihf-pet-pop');
        requestAnimationFrame(() => {
          button.classList.add('uihf-pet-pop');
          window.setTimeout(() => button.classList.remove('uihf-pet-pop'), 280);
        });
        showPetTalk(button, actionType);
      }

      window.setTimeout(applyLightFix, 70);
      window.setTimeout(applyLightFix, 260);
      window.setTimeout(applyLightFix, 740);
    }, true);
  }

  function bindVisibilityRefresh() {
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        applyLightFix();
        window.setTimeout(applyLightFix, 220);
      }
    });
  }

  function bindPetCenterRefresh() {
    if (petCenterRefreshTimer) {
      window.clearInterval(petCenterRefreshTimer);
      petCenterRefreshTimer = null;
    }
    petCenterRefreshTimer = window.setInterval(() => {
      void refreshPetCenterStudents();
    }, PET_CENTER_REFRESH_MS);
  }

  function init() {
    patchFetchForPetCeremony();
    applyLightFix();
    bindButtonEffects();
    bindVisibilityRefresh();
    bindPetCenterRefresh();
    scheduleReapply();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
