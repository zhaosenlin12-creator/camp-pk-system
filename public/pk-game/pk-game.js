(function pkGameBootstrap() {
  const CURRENT_CLASS_KEY = 'camp-pk-current-class-id';
  const RECORDS_KEY = 'camp-pk-tug-records';
  const MAX_RECORDS = 80;
  const ROPE_LIMIT = 100;
  const ROPE_STEP = 12;
  const EDITOR_PAGE_SIZE = 6;

  const FALLBACK_AVATAR_POOL = [
    '/pet-assets/pixel-animals/avatars/tiger-cub.png',
    '/pet-assets/pixel-animals/avatars/panda-baby.png',
    '/pet-assets/pixel-animals/avatars/white-cat.png',
    '/pet-assets/pixel-animals/avatars/penguin-buddy.png',
    '/pet-assets/pixel-animals/avatars/gray-cat.png',
    '/pet-assets/pixel-animals/avatars/beagle.png',
    '/pet-assets/kenney/avatars/penguin.png',
    '/pet-assets/kenney/avatars/panda.png',
    '/pet-assets/kenney/avatars/raccoon.png',
    '/pet-assets/kenney/avatars/polar-bear.png',
    '/pet-assets/kenney/avatars/duck.png',
    '/pet-assets/kenney/avatars/bear.png'
  ];

  const TRUE_SET = new Set(['对', '是', 'yes', 'true', 't', '正确']);
  const FALSE_SET = new Set(['错', '否', 'no', 'false', 'f', '错误']);
  const CHEER_LINES = {
    left: ['左队冲鸭！', '加把劲！', '稳住稳住！', '别眨眼，马上反超！', '拉过线就是王者！', '你们快看我们起飞了！'],
    right: ['右队发力！', '这题我们拿下！', '别慌，节奏在这边！', '你们再使劲也追不上~', '笑着把你们拉过来！', '我们要赢麻了！']
  };
  const BATTLE_DISTRACTOR_LINES = ['还需要再想想', '以上都不对', '暂时不确定', '请再检查一遍'];

  const state = {
    classId: null,
    className: '',
    options: null,
    petCatalog: [],
    teams: [],
    leftTeam: null,
    rightTeam: null,
    banks: [],
    bankDetailCache: new Map(),
    selectedBankId: null,
    selectedBank: null,
    generating: false,
    deletingBankId: null,
    pendingJobId: null,
    pollHandle: null,
    running: false,
    timerSec: 180,
    durationSec: 180,
    timerHandle: null,
    position: 0,
    leftScore: 0,
    rightScore: 0,
    questions: [],
    questionIndex: 0,
    currentQuestion: null,
    answerLocked: false,
    multiSelections: {
      left: new Set(),
      right: new Set()
    },
    numericBuffers: {
      left: '',
      right: ''
    },
    provider: '',
    editor: {
      title: '',
      description: '',
      questions: [],
      dirty: false,
      page: 1,
      search: ''
    },
    audio: {
      enabled: true,
      ctx: null,
      masterGain: null,
      bgmTimer: null,
      beatTimer: null
    },
    chatter: {
      timer: null
    },
    fx: {
      particles: [],
      raf: null
    }
  };

  const ui = {};

  function byId(id) {
    return document.getElementById(id);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function shuffleTugItems(items) {
    const copy = Array.isArray(items) ? [...items] : [];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeAnswerText(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[，。！？,.!?;:；：'"`]/g, '');
  }

  function stripOptionLabelPrefix(value) {
    let text = String(value || '').trim();
    if (!text) return '';
    for (let i = 0; i < 4; i += 1) {
      const next = text.replace(/^(?:[\(\[]?[A-Ha-hTtFf][\)\].:：、\s-]+)+/, '').trim();
      if (!next || next === text) break;
      text = next;
    }
    return text;
  }

  function isNumericAnswerText(value) {
    return /^-?\d+(?:\.\d+)?$/.test(String(value || '').trim());
  }

  function normalizeNumericText(value) {
    const safe = String(value || '').trim();
    if (!isNumericAnswerText(safe)) return '';
    const parsed = Number(safe);
    return Number.isFinite(parsed) ? String(parsed) : '';
  }

  function toFriendlyErrorMessage(message, fallbackMessage) {
    const text = String(message || '').trim();
    if (!text) return fallbackMessage || '操作失败，请稍后重试。';
    if (/shuffleTugItems/i.test(text)) return '题目模块正在刷新，请重试一次。';
    if (/MINIMAX|DEEPSEEK|API_KEY|endpoint|HTTP \d+/i.test(text)) {
      return '智能题库服务暂时繁忙，系统已自动切换可用题库。';
    }
    if (/network|fetch|timeout|Failed to fetch/i.test(text)) {
      return '网络波动，请稍后再试。';
    }
    return text;
  }

  function formatTime(sec) {
    const safe = Math.max(0, Math.floor(sec));
    const mm = String(Math.floor(safe / 60)).padStart(2, '0');
    const ss = String(safe % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  function parseClassIdFromUrl() {
    const fromUrl = Number(new URL(window.location.href).searchParams.get('classId'));
    if (Number.isFinite(fromUrl) && fromUrl > 0) return fromUrl;
    const fromStorage = Number(window.localStorage.getItem(CURRENT_CLASS_KEY));
    if (Number.isFinite(fromStorage) && fromStorage > 0) return fromStorage;
    return null;
  }

  function debounce(fn, wait) {
    let timer = null;
    return function debounced(...args) {
      if (timer) clearTimeout(timer);
      timer = window.setTimeout(() => fn.apply(this, args), wait || 300);
    };
  }

  async function safeFetchJson(url, options) {
    const response = await fetch(url, {
      cache: 'no-store',
      ...(options || {})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(toFriendlyErrorMessage(data.error || `请求失败（${response.status}）`, '请求失败，请稍后重试。'));
    }
    return data;
  }

  function showToast(message, type, duration) {
    const safeType = type || 'info';
    const safeMessage = safeType === 'error'
      ? toFriendlyErrorMessage(message, '操作失败，请稍后重试。')
      : String(message || '');
    const toast = document.createElement('div');
    toast.className = `toast ${safeType}`;
    toast.textContent = safeMessage;
    ui.toastContainer.appendChild(toast);
    window.setTimeout(() => {
      toast.style.opacity = '0';
      window.setTimeout(() => toast.remove(), 220);
    }, duration || 2200);
  }

  function openDialog(config) {
    return new Promise((resolve) => {
      const title = config?.title || '提示';
      const message = config?.message || '';
      const confirmText = config?.confirmText || '确定';
      const cancelText = config?.cancelText || '取消';
      const withInput = Boolean(config?.withInput);
      const placeholder = config?.placeholder || '';
      const defaultValue = config?.defaultValue || '';

      ui.dialogLayer.classList.remove('hidden');
      ui.dialogLayer.innerHTML = `
        <div class="dialog-card">
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(message)}</p>
          ${withInput ? `<input class="dialog-input" type="text" maxlength="240" placeholder="${escapeHtml(placeholder)}" value="${escapeHtml(defaultValue)}" />` : ''}
          <div class="dialog-actions">
            <button type="button" class="btn ghost small" data-dialog-cancel>${escapeHtml(cancelText)}</button>
            <button type="button" class="btn primary small" data-dialog-confirm>${escapeHtml(confirmText)}</button>
          </div>
        </div>
      `;

      const input = withInput ? ui.dialogLayer.querySelector('.dialog-input') : null;
      const finish = (confirmed) => {
        const value = input ? input.value : '';
        ui.dialogLayer.classList.add('hidden');
        ui.dialogLayer.innerHTML = '';
        resolve({ confirmed, value });
      };

      ui.dialogLayer.querySelector('[data-dialog-cancel]')?.addEventListener('click', () => finish(false));
      ui.dialogLayer.querySelector('[data-dialog-confirm]')?.addEventListener('click', () => finish(true));
      ui.dialogLayer.addEventListener('click', (event) => {
        if (event.target === ui.dialogLayer) finish(false);
      }, { once: true });

      if (input) {
        input.focus();
        input.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') finish(true);
        });
      }
    });
  }

  async function askConfirm(message, title) {
    const result = await openDialog({
      title: title || '请确认',
      message,
      confirmText: '确认',
      cancelText: '取消'
    });
    return result.confirmed;
  }

  async function askPrompt(message, placeholder, defaultValue) {
    const result = await openDialog({
      title: '输入提示词',
      message,
      withInput: true,
      placeholder: placeholder || '例如：增加真实场景和实战感',
      defaultValue: defaultValue || '',
      confirmText: '提交',
      cancelText: '取消'
    });
    return result.confirmed ? result.value.trim() : null;
  }

  function toLabelMap(items) {
    const map = new Map();
    (items || []).forEach((item) => {
      if (item?.value) {
        map.set(String(item.value), item.label || String(item.value));
      }
    });
    return map;
  }

  function mapSubjectLabel(value) {
    const map = toLabelMap(state.options?.subjects || []);
    return map.get(String(value || '')) || String(value || '-');
  }

  function mapGradeLabel(value) {
    const map = toLabelMap(state.options?.grades || []);
    return map.get(String(value || '')) || String(value || '-');
  }

  function mapTypeLabel(value) {
    const map = toLabelMap(state.options?.question_types || []);
    return map.get(String(value || '')) || String(value || '-');
  }

  function sourceLabel(source) {
    const text = String(source || '');
    if (!text) return '未知来源';
    if (text.startsWith('preset')) return '预制题库';
    if (text.startsWith('minimax')) return 'MiniMax';
    if (text.startsWith('deepseek')) return 'DeepSeek';
    return text;
  }

  function updateProviderRuntimeTag() {
    const providers = state.options?.ai_providers;
    if (!providers) {
      ui.providerRuntimeTag.textContent = '智能题库服务连接中...';
      return;
    }
    const miniOn = Boolean(providers.minimax?.enabled);
    const deepOn = Boolean(providers.deepseek?.enabled);
    if (miniOn && deepOn) {
      ui.providerRuntimeTag.className = 'provider-runtime';
      ui.providerRuntimeTag.textContent = '智能题库服务已就绪';
      return;
    }
    if (miniOn && !deepOn) {
      ui.providerRuntimeTag.className = 'provider-runtime warn';
      ui.providerRuntimeTag.textContent = '智能题库服务可用';
      return;
    }
    if (!miniOn && deepOn) {
      ui.providerRuntimeTag.className = 'provider-runtime warn';
      ui.providerRuntimeTag.textContent = '智能题库服务可用';
      return;
    }
    ui.providerRuntimeTag.className = 'provider-runtime bad';
    ui.providerRuntimeTag.textContent = '智能题库暂时忙碌，可先用标准题库开赛';
  }

  function applyRuntimeDiagnostics(diag) {
    const attempts = Array.isArray(diag?.attempts) ? diag.attempts : [];
    if (!attempts.length) return;
    const miniFail = attempts.find((item) => item.provider === 'minimax' && item.ok === false);
    const miniOk = attempts.find((item) => item.provider === 'minimax' && item.ok === true);
    const deepFail = attempts.find((item) => item.provider === 'deepseek' && item.ok === false);
    const deepOk = attempts.find((item) => item.provider === 'deepseek' && item.ok === true);

    if (miniFail && deepOk) {
      ui.providerRuntimeTag.className = 'provider-runtime warn';
      ui.providerRuntimeTag.textContent = '题库已准备好，可直接开赛';
      return;
    }
    if (miniFail && deepFail) {
      ui.providerRuntimeTag.className = 'provider-runtime bad';
      ui.providerRuntimeTag.textContent = '智能题库暂时忙碌，已准备标准题库';
      return;
    }
    if (miniOk) {
      ui.providerRuntimeTag.className = 'provider-runtime';
      ui.providerRuntimeTag.textContent = '智能题库服务运行稳定';
    }
  }

  function setClassLabel(text) {
    ui.classLabel.textContent = text || '';
  }

  function setProviderTag(text) {
    if (!ui.providerTag) return;
    ui.providerTag.textContent = text ? '题库已就绪，可开始比赛' : '准备就绪后开始比赛';
  }

  function setTips(leftText, rightText) {
    ui.leftTip.textContent = leftText || '';
    ui.rightTip.textContent = rightText || '';
  }

  function setResultBanner(text) {
    if (!text) {
      ui.resultBanner.classList.add('hidden');
      ui.resultBanner.textContent = '';
      return;
    }
    ui.resultBanner.textContent = text;
    ui.resultBanner.classList.remove('hidden');
  }

  function setWinnerVisualState(winnerSide) {
    if (ui.ropeField) {
      ui.ropeField.classList.remove('winner-left', 'winner-right');
      if (winnerSide === 'left') ui.ropeField.classList.add('winner-left');
      if (winnerSide === 'right') ui.ropeField.classList.add('winner-right');
    }
    if (ui.leftTeamPanel) {
      ui.leftTeamPanel.classList.toggle('winner', winnerSide === 'left');
    }
    if (ui.rightTeamPanel) {
      ui.rightTeamPanel.classList.toggle('winner', winnerSide === 'right');
    }
  }

  function updateTimerText() {
    ui.timerText.textContent = formatTime(state.timerSec);
  }

  function loadRecords() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(RECORDS_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveRecords(list) {
    window.localStorage.setItem(RECORDS_KEY, JSON.stringify((list || []).slice(0, MAX_RECORDS)));
  }

  function renderRecords() {
    const records = loadRecords();
    if (!records.length) {
      ui.recordList.innerHTML = '<div class="record-empty">还没有比赛记录，开始一场试试吧。</div>';
      return;
    }
    ui.recordList.innerHTML = records.map((item) => `
      <div class="record-item">
        <div><strong>${escapeHtml(item.winner || '平局')}</strong> · ${escapeHtml(item.class_name || '-')}</div>
        <div>${escapeHtml(item.left_team || '左队')} ${escapeHtml(String(item.left_score || 0))} : ${escapeHtml(String(item.right_score || 0))} ${escapeHtml(item.right_team || '右队')}</div>
        <div>题库：${escapeHtml(item.bank_title || '-')} · ${escapeHtml(item.time || '')}</div>
      </div>
    `).join('');
  }

  function pushRecord(record) {
    const records = loadRecords();
    records.unshift(record);
    saveRecords(records);
    renderRecords();
  }

  function toFriendlyProgressMessage(rawMessage) {
    const text = String(rawMessage || '').trim();
    if (!text) return '处理中...';
    if (text.includes('已切换') || text.includes('备用') || text.includes('DeepSeek')) return '题库生成完成，已自动保障可开赛';
    if (text.includes('AI失败')) return '智能出题繁忙，本次已自动使用标准题库';
    if (text.includes('MiniMax')) return '智能题库正在生成中...';
    return text;
  }

  function setProgress(progress, message) {
    const safeProgress = clamp(Math.round(Number(progress) || 0), 0, 100);
    ui.generationStatusCard.classList.remove('hidden');
    ui.generationProgress.style.width = `${safeProgress}%`;
    ui.generationProgressText.textContent = `${safeProgress}%`;
    ui.generationMessage.textContent = toFriendlyProgressMessage(message);
  }

  function hideProgress() {
    ui.generationStatusCard.classList.add('hidden');
  }

  function formatDiagnostics(diag) {
    if (!diag || typeof diag !== 'object') return '可直接生成题库，完成后即可开赛。';
    const lines = [];
    const attempts = Array.isArray(diag.attempts) ? diag.attempts : [];
    const hasSuccess = attempts.some((attempt) => attempt.ok);
    const hasFailure = attempts.some((attempt) => !attempt.ok);
    if (hasSuccess && !hasFailure) {
      lines.push('题库已由智能出题完成，可直接开赛。');
    } else if (hasSuccess && hasFailure) {
      lines.push('题库已准备完成，可直接开赛。');
    } else if (!hasSuccess && hasFailure) {
      lines.push('本次已自动切换标准题库，比赛可继续进行。');
    }
    if (diag.mode === 'preset_only') {
      lines.push('当前使用快速模板题库，可秒开比赛。');
    }
    if (diag.fallback_reason) {
      lines.push('智能出题暂时繁忙，已自动保障题库可用。');
    }
    if (diag.partial_fill?.fill_count) {
      lines.push(`系统已自动补充 ${Number(diag.partial_fill.fill_count)} 道题目，保证比赛连贯。`);
    }
    if (diag.last_regenerate) {
      lines.push(`最近已优化第 ${Number(diag.last_regenerate.index) + 1} 题。`);
    }
    return lines.length ? lines.join('\n') : '题库准备完成，可以开始比赛。';
  }

  function renderDiagnosticsText(diag, fallbackText) {
    ui.diagnosticsText.textContent = formatDiagnostics(diag) || fallbackText || '题库准备完成，可以开始比赛。';
  }

  function renderOptions() {
    if (!state.options) return;

    const subjectGroups = new Map();
    (state.options.subjects || []).forEach((subject) => {
      const group = subject.group || '其他';
      if (!subjectGroups.has(group)) subjectGroups.set(group, []);
      subjectGroups.get(group).push(subject);
    });

    ui.subjectSelect.innerHTML = '';
    subjectGroups.forEach((subjects, group) => {
      const optGroup = document.createElement('optgroup');
      optGroup.label = group;
      subjects.forEach((subject) => {
        const option = document.createElement('option');
        option.value = subject.value;
        option.textContent = subject.label;
        optGroup.appendChild(option);
      });
      ui.subjectSelect.appendChild(optGroup);
    });

    ui.gradeSelect.innerHTML = (state.options.grades || [])
      .map((grade) => `<option value="${escapeHtml(grade.value)}">${escapeHtml(grade.label)}</option>`)
      .join('');

    ui.typeSelect.innerHTML = (state.options.question_types || [])
      .map((item) => `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`)
      .join('');

    ui.templateSelect.innerHTML = '<option value="">AI 动态出题</option>';
    (state.options.templates || []).forEach((template) => {
      const option = document.createElement('option');
      option.value = template.id;
      option.textContent = `${template.label}（快速）`;
      ui.templateSelect.appendChild(option);
    });

    ui.quickTemplateRow.innerHTML = '';
    (state.options.templates || []).forEach((template) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'quick-btn';
      button.dataset.template = template.id;
      button.textContent = template.label;
      button.title = template.description || template.label;
      ui.quickTemplateRow.appendChild(button);
    });
    ui.quickButtons = Array.from(ui.quickTemplateRow.querySelectorAll('.quick-btn'));

    const defaults = state.options.defaults || {};
    const count = Number(defaults.question_count) || 20;
    ui.countInput.value = String(count);
    ui.countInput.min = String(Number(defaults.min_question_count) || 20);
    ui.countInput.max = String(Number(defaults.max_question_count) || 220);

    updateProviderRuntimeTag();
    renderFilterOptions();
  }

  function renderFilterOptions() {
    const render = (node, allLabel, rows) => {
      const current = node.value || '';
      node.innerHTML = `<option value="">${allLabel}</option>${(rows || [])
        .map((row) => `<option value="${escapeHtml(row.value)}">${escapeHtml(row.label)}</option>`)
        .join('')}`;
      if (current && Array.from(node.options).some((opt) => opt.value === current)) {
        node.value = current;
      }
    };

    render(ui.bankSubjectFilter, '全部科目', state.options?.subjects || []);
    render(ui.bankGradeFilter, '全部年级', state.options?.grades || []);
    render(ui.bankTypeFilter, '全部题型', state.options?.question_types || []);
    render(ui.bankSourceFilter, '全部来源', []);
  }

  function renderSourceFilters(sourceRows) {
    const current = ui.bankSourceFilter.value || '';
    ui.bankSourceFilter.innerHTML = '<option value="">全部来源</option>';
    const dedupe = new Set();
    (sourceRows || []).forEach((row) => {
      const value = String(row?.value || '').trim();
      if (!value || dedupe.has(value)) return;
      dedupe.add(value);
      const option = document.createElement('option');
      option.value = value;
      option.textContent = String(row?.label || row?.value || '').trim() || value;
      ui.bankSourceFilter.appendChild(option);
    });
    if (current && Array.from(ui.bankSourceFilter.options).some((item) => item.value === current)) {
      ui.bankSourceFilter.value = current;
    }
  }

  function syncQuickTemplateButtons() {
    const activeTemplate = ui.templateSelect.value || '';
    (ui.quickButtons || []).forEach((button) => {
      button.classList.toggle('active', button.dataset.template === activeTemplate);
    });
  }

  function applyTemplate(templateId, options) {
    const quickStart = Boolean(options?.quickStart);
    ui.templateSelect.value = templateId || '';
    const template = (state.options?.templates || []).find((item) => item.id === templateId);
    if (template) {
      ui.subjectSelect.value = template.subject;
      ui.typeSelect.value = template.questionType;
    }
    if (quickStart && ui.preferPresetToggle) {
      ui.preferPresetToggle.checked = true;
      showToast('已切换为快速模板模式：将跳过 AI，直接秒开题库。', 'info', 2200);
    }
    if (!templateId && ui.preferPresetToggle) {
      ui.preferPresetToggle.checked = false;
    }
    syncQuickTemplateButtons();
  }

  function getPetAssetBySeed(seed, stageOffset = 0) {
    const pets = Array.isArray(state.petCatalog) ? state.petCatalog : [];
    if (!pets.length) return null;
    const petIndex = Math.abs(seed) % pets.length;
    const pet = pets[petIndex];
    if (Array.isArray(pet.evolutionStages) && pet.evolutionStages.length) {
      const stageIndex = Math.abs(stageOffset) % pet.evolutionStages.length;
      return pet.evolutionStages[stageIndex] || pet.image || null;
    }
    return pet.image || null;
  }

  function pickAvatarByTeam(teamId, offset) {
    const seed = (Number(teamId) || 0) * 17 + (Number(offset) || 0) * 31;
    const petAsset = getPetAssetBySeed(seed, offset || 0);
    if (petAsset) return petAsset;
    const index = Math.abs((Number(teamId) || 0) + (offset || 0)) % FALLBACK_AVATAR_POOL.length;
    return FALLBACK_AVATAR_POOL[index];
  }

  function renderPullerGroup(container, side, team) {
    container.innerHTML = '';
    if (!team) return;
    const count = 3 + (Math.abs(Number(team.id) || 0) % 2);
    for (let i = 0; i < count; i += 1) {
      const member = document.createElement('div');
      member.className = 'puller-member';
      member.style.animationDelay = `${(i * 0.14).toFixed(2)}s`;
      member.innerHTML = `
        <img src="${escapeHtml(pickAvatarByTeam(team.id, side === 'left' ? i + 1 : i + 5))}" alt="${escapeHtml(team.name)}成员${i + 1}" />
      `;
      container.appendChild(member);
    }
  }

  function clearChatterBubbles() {
    if (ui.leftChatter) ui.leftChatter.innerHTML = '';
    if (ui.rightChatter) ui.rightChatter.innerHTML = '';
  }

  function spawnChatterBubble(side, customText) {
    const host = side === 'left' ? ui.leftChatter : ui.rightChatter;
    if (!host) return;
    const pool = CHEER_LINES[side] || [];
    if (!pool.length && !customText) return;
    const text = customText || pool[Math.floor(Math.random() * pool.length)];
    const bubble = document.createElement('div');
    bubble.className = 'chatter-bubble';
    bubble.textContent = text;
    host.appendChild(bubble);
    window.setTimeout(() => bubble.remove(), 2900);
  }

  function stopBattleChatter() {
    if (state.chatter.timer) {
      clearInterval(state.chatter.timer);
      state.chatter.timer = null;
    }
    clearChatterBubbles();
  }

  function startBattleChatter() {
    stopBattleChatter();
    if (!state.running) return;
    spawnChatterBubble('left', '开战！加油冲线！');
    spawnChatterBubble('right', '来吧，今天不服输！');
    state.chatter.timer = window.setInterval(() => {
      if (!state.running) return;
      const speakingSide = Math.random() > 0.5 ? 'left' : 'right';
      spawnChatterBubble(speakingSide);
    }, 1700 + Math.floor(Math.random() * 700));
  }

  function renderTeamAppearance() {
    if (state.leftTeam) {
      const leftAvatar = pickAvatarByTeam(state.leftTeam.id, 1);
      ui.leftTeamName.textContent = state.leftTeam.name;
      ui.leftCardAvatar.src = leftAvatar;
      ui.resultLeftAvatar.src = leftAvatar;
      ui.resultLeftName.textContent = state.leftTeam.name;
    } else {
      ui.leftTeamName.textContent = '左侧战队';
    }
    if (state.rightTeam) {
      const rightAvatar = pickAvatarByTeam(state.rightTeam.id, 3);
      ui.rightTeamName.textContent = state.rightTeam.name;
      ui.rightCardAvatar.src = rightAvatar;
      ui.resultRightAvatar.src = rightAvatar;
      ui.resultRightName.textContent = state.rightTeam.name;
    } else {
      ui.rightTeamName.textContent = '右侧战队';
    }
    renderPullerGroup(ui.leftPullers, 'left', state.leftTeam);
    renderPullerGroup(ui.rightPullers, 'right', state.rightTeam);
  }

  function syncTeamSelection() {
    const leftId = Number(ui.leftTeamSelect.value);
    const rightId = Number(ui.rightTeamSelect.value);
    const left = state.teams.find((team) => Number(team.id) === leftId) || state.teams[0] || null;
    let right = state.teams.find((team) => Number(team.id) === rightId) || state.teams[1] || null;

    if (left && right && Number(left.id) === Number(right.id)) {
      right = state.teams.find((team) => Number(team.id) !== Number(left.id)) || null;
      if (right) ui.rightTeamSelect.value = String(right.id);
    }

    state.leftTeam = left;
    state.rightTeam = right;
    renderTeamAppearance();
    updateActionAvailability();
  }

  function renderTeamSelects() {
    const html = (state.teams || [])
      .map((team) => `<option value="${escapeHtml(String(team.id))}">${escapeHtml(team.name)}（${Math.round(Number(team.score) || 0)}分）</option>`)
      .join('');
    ui.leftTeamSelect.innerHTML = html;
    ui.rightTeamSelect.innerHTML = html;
    if (state.teams[0]) ui.leftTeamSelect.value = String(state.teams[0].id);
    if (state.teams[1]) ui.rightTeamSelect.value = String(state.teams[1].id);
    syncTeamSelection();
  }

  function buildBankSummaryText(bank) {
    if (!bank) return '当前未选择题库';
    return `当前题库：${bank.title || `题库#${bank.id}`} · ${mapSubjectLabel(bank.subject)}/${mapGradeLabel(bank.grade)}/${mapTypeLabel(bank.question_type)} · ${bank.question_count || 0}题`;
  }

  function updateSelectedBankText() {
    ui.selectedBankText.textContent = buildBankSummaryText(state.selectedBank);
    setProviderTag(sourceLabel(state.selectedBank?.source_provider || state.provider || ''));
  }

  function renderBankList() {
    if (!state.banks.length) {
      ui.bankList.innerHTML = '<div class="record-empty">暂无符合条件的题库，请先生成或修改筛选条件。</div>';
      return;
    }
    ui.bankList.innerHTML = state.banks.map((bank) => {
      const selected = Number(state.selectedBankId) === Number(bank.id) ? 'selected' : '';
      const createdAt = bank.created_at ? new Date(bank.created_at).toLocaleString() : '-';
      const canDelete = Boolean(
        bank.can_delete === true
        || (String(bank.scope || '').toLowerCase() === 'class' && Number(bank.class_id) === Number(state.classId))
      );
      const deletingThis = Number(state.deletingBankId) === Number(bank.id);
      return `
        <div class="bank-item ${selected}" data-bank-id="${escapeHtml(String(bank.id))}">
          <div class="bank-title">
            <strong>${escapeHtml(bank.title || `题库#${bank.id}`)}</strong>
            <span class="bank-meta">${String(bank.source_provider || '').startsWith('preset') ? '标准题库' : '智能题库'}</span>
          </div>
          <div class="bank-meta">${escapeHtml(mapSubjectLabel(bank.subject))} · ${escapeHtml(mapGradeLabel(bank.grade))} · ${escapeHtml(mapTypeLabel(bank.question_type))} · ${escapeHtml(String(bank.question_count || 0))}题</div>
          <div class="bank-meta">${escapeHtml(bank.description || '暂无描述')}</div>
          <div class="bank-time">更新时间：${escapeHtml(createdAt)}</div>
          <div class="bank-actions">
            <button
              type="button"
              class="btn ${selected ? 'primary' : 'ghost'} small"
              data-select-bank="${escapeHtml(String(bank.id))}"
              ${state.deletingBankId !== null ? 'disabled' : ''}
            >
              ${selected ? '已选择' : '选择题库'}
            </button>
            ${canDelete ? `
              <button
                type="button"
                class="btn danger small"
                data-delete-bank="${escapeHtml(String(bank.id))}"
                ${state.deletingBankId !== null ? 'disabled' : ''}
              >
                ${deletingThis ? '删除中...' : '删除题库'}
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  function cloneQuestion(question) {
    return {
      id: question.id || `q_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      prompt: String(question.prompt || '').trim(),
      question_type: String(question.question_type || 'single_choice'),
      answer_mode: String(question.answer_mode || 'single_choice'),
      options: Array.isArray(question.options)
        ? question.options.map((option, idx) => ({
          key: String(option?.key || String.fromCharCode(65 + idx)).trim().toUpperCase(),
          text: stripOptionLabelPrefix(option?.text || '')
        }))
        : [],
      correct_options: Array.isArray(question.correct_options)
        ? question.correct_options.map((key) => String(key || '').trim().toUpperCase()).filter(Boolean)
        : [],
      answers: Array.isArray(question.answers)
        ? question.answers.map((answer) => String(answer || '').trim()).filter(Boolean)
        : [],
      difficulty: String(question.difficulty || 'normal').trim()
    };
  }

  function normalizeClientQuestionType(value) {
    const safe = String(value || '').trim().toLowerCase();
    if (!safe) return 'single_choice';
    const map = {
      single: 'single_choice',
      singlechoice: 'single_choice',
      choice: 'single_choice',
      radio: 'single_choice',
      multiple: 'multiple_choice',
      multi: 'multiple_choice',
      multiplechoice: 'multiple_choice',
      multi_choice: 'multiple_choice',
      truefalse: 'true_false',
      tf: 'true_false',
      fill: 'single_choice',
      fill_blank: 'single_choice',
      blank: 'single_choice',
      spelling: 'single_choice',
      qa: 'single_choice',
      text: 'single_choice',
      quickmath: 'quick_math',
      numeric: 'quick_math',
      number: 'quick_math'
    };
    return map[safe] || safe;
  }

  function normalizeClientAnswerMode(value, questionType, options) {
    const safe = String(value || '').trim().toLowerCase();
    const type = normalizeClientQuestionType(questionType || 'single_choice');
    const map = {
      single: 'single_choice',
      singlechoice: 'single_choice',
      choice: 'single_choice',
      radio: 'single_choice',
      multiple: 'multiple_choice',
      multichoice: 'multiple_choice',
      multiplechoice: 'multiple_choice',
      multi: 'multiple_choice',
      numeric: 'numeric',
      number: 'numeric',
      quick_math: 'numeric',
      quickmath: 'numeric'
    };
    let mode = map[safe] || safe;
    if (!mode) {
      if (type === 'multiple_choice') mode = 'multiple_choice';
      else if (type === 'single_choice' || type === 'true_false') mode = 'single_choice';
      else if (type === 'quick_math') mode = 'numeric';
      else if (Array.isArray(options) && options.length >= 2) mode = 'single_choice';
      else mode = 'single_choice';
    }
    if (mode !== 'numeric' && mode !== 'single_choice' && mode !== 'multiple_choice') {
      mode = type === 'quick_math' ? 'numeric' : 'single_choice';
    }
    return mode;
  }

  function getQuestionAnswerTextsForBattle(question) {
    const texts = [];
    if (!question || typeof question !== 'object') return texts;

    if (Array.isArray(question.answers)) {
      question.answers.forEach((item) => {
        const safe = String(item || '').trim();
        if (safe) texts.push(safe);
      });
    }

    if (Array.isArray(question.options) && Array.isArray(question.correct_options)) {
      const optionMap = new Map(
        question.options.map((item) => [
          String(item?.key || '').trim().toUpperCase(),
          String(item?.text || '').trim()
        ])
      );
      question.correct_options.forEach((key) => {
        const text = optionMap.get(String(key || '').trim().toUpperCase());
        if (text) texts.push(text);
      });
    }

    return [...new Set(texts.filter(Boolean))];
  }

  function buildNumericDistractorsForBattle(correctText) {
    const parsed = Number(String(correctText || '').replace(/[^0-9.\-]/g, ''));
    if (!Number.isFinite(parsed)) return [];
    const delta = parsed >= 20 ? 5 : (parsed >= 10 ? 3 : 1);
    const values = [parsed + delta, parsed - delta, parsed + delta * 2]
      .filter((item) => Number.isFinite(item) && item >= 0)
      .map((item) => String(Number.isInteger(item) ? item : Number(item.toFixed(2))));
    return [...new Set(values.filter((item) => normalizeAnswerText(item) !== normalizeAnswerText(correctText)))];
  }

  function buildBattleDistractors(correctText, question) {
    const normalizedCorrect = normalizeAnswerText(correctText);
    const candidates = [];
    const seen = new Set([normalizedCorrect]);

    const pushCandidate = (value) => {
      const safe = String(value || '').trim();
      const key = normalizeAnswerText(safe);
      if (!safe || !key || seen.has(key)) return;
      seen.add(key);
      candidates.push(safe);
    };

    getQuestionAnswerTextsForBattle(question).forEach(pushCandidate);
    buildNumericDistractorsForBattle(correctText).forEach(pushCandidate);
    BATTLE_DISTRACTOR_LINES.forEach(pushCandidate);
    while (candidates.length < 3) {
      pushCandidate(`选项${candidates.length + 2}`);
    }
    return candidates.slice(0, 3);
  }

  function convertToBattleSingleChoice(question) {
    const answerTexts = getQuestionAnswerTextsForBattle(question);
    const correctText = String(answerTexts[0] || '').trim();
    if (!correctText) return null;

    const distractors = buildBattleDistractors(correctText, question);
    const optionTexts = shuffleTugItems([correctText, ...distractors]).slice(0, 4);
    const options = optionTexts.map((text, idx) => ({
      key: String.fromCharCode(65 + idx),
      text: stripOptionLabelPrefix(text)
    }));
    const correct = options.find((item) => normalizeAnswerText(item.text) === normalizeAnswerText(correctText));
    if (!correct) return null;

    return {
      ...question,
      question_type: 'single_choice',
      answer_mode: 'single_choice',
      options,
      correct_options: [correct.key],
      answers: [correctText]
    };
  }

  function sanitizeQuestionForBattle(rawQuestion) {
    const question = cloneQuestion(rawQuestion || {});
    question.question_type = normalizeClientQuestionType(question.question_type || 'single_choice');
    question.answer_mode = normalizeClientAnswerMode(question.answer_mode, question.question_type, question.options);

    if (question.question_type === 'quick_math') {
      let numericAnswers = (question.answers || [])
        .map((item) => normalizeNumericText(item))
        .filter(Boolean);
      if (!numericAnswers.length && Array.isArray(question.options) && Array.isArray(question.correct_options)) {
        const optionMap = new Map(
          question.options.map((item) => [
            String(item?.key || '').trim().toUpperCase(),
            normalizeNumericText(item?.text || '')
          ])
        );
        numericAnswers = (question.correct_options || [])
          .map((key) => optionMap.get(String(key || '').trim().toUpperCase()))
          .filter(Boolean);
      }
      if (numericAnswers.length) {
        question.answer_mode = 'numeric';
        question.answers = [numericAnswers[0]];
        question.options = [];
        question.correct_options = [];
        return question;
      }
    }

    if (question.question_type === 'true_false') {
      question.answer_mode = 'single_choice';
      if (!Array.isArray(question.options) || question.options.length < 2) {
        question.options = [
          { key: 'T', text: '对' },
          { key: 'F', text: '错' }
        ];
      }
      if (!Array.isArray(question.correct_options) || !question.correct_options.length) {
        const trueLike = (question.answers || []).some((item) => TRUE_SET.has(normalizeAnswerText(item)));
        question.correct_options = [trueLike ? 'T' : 'F'];
      } else {
        question.correct_options = [String(question.correct_options[0] || '').trim().toUpperCase() === 'F' ? 'F' : 'T'];
      }
    }

    if (question.answer_mode === 'single_choice' || question.answer_mode === 'multiple_choice') {
      question.options = Array.isArray(question.options)
        ? question.options
          .map((item, idx) => ({
            key: String(item?.key || String.fromCharCode(65 + idx)).trim().toUpperCase(),
            text: stripOptionLabelPrefix(item?.text || '')
          }))
          .filter((item) => item.key && item.text)
        : [];
      question.correct_options = Array.isArray(question.correct_options)
        ? question.correct_options.map((item) => String(item || '').trim().toUpperCase()).filter(Boolean)
        : [];

      // Keep battle fair on one device: invalid choice questions are converted into clickable single-choice.
      if (question.options.length < 2 || !question.correct_options.length) {
        const converted = convertToBattleSingleChoice(question);
        if (converted) return converted;
        question.question_type = 'single_choice';
        question.answer_mode = 'single_choice';
        question.options = [
          { key: 'A', text: '需要再判断' },
          { key: 'B', text: '暂不确定' },
          { key: 'C', text: '继续观察' },
          { key: 'D', text: '再看一眼' }
        ];
        question.correct_options = ['A'];
        question.answers = ['需要再判断'];
      }
    }

    if (question.answer_mode === 'numeric') {
      const numericAnswers = (question.answers || []).map((item) => normalizeNumericText(item)).filter(Boolean);
      if (numericAnswers.length) {
        question.answers = [numericAnswers[0]];
        question.question_type = 'quick_math';
        question.options = [];
        question.correct_options = [];
        return question;
      }
    }

    const converted = convertToBattleSingleChoice(question);
    if (converted) return converted;
    question.question_type = 'single_choice';
    question.answer_mode = 'single_choice';
    question.options = [
      { key: 'A', text: '需要再判断' },
      { key: 'B', text: '暂不确定' },
      { key: 'C', text: '继续观察' },
      { key: 'D', text: '再看一眼' }
    ];
    question.correct_options = ['A'];
    question.answers = ['需要再判断'];

    return question;
  }

  function normalizeQuestion(rawQuestion) {
    const type = normalizeClientQuestionType(rawQuestion.question_type || rawQuestion.type || 'single_choice');
    const options = Array.isArray(rawQuestion.options)
      ? rawQuestion.options.map((item, idx) => {
        if (typeof item === 'string') {
          return { key: String.fromCharCode(65 + idx), text: stripOptionLabelPrefix(item) };
        }
        return {
          key: String(item?.key || item?.id || String.fromCharCode(65 + idx)).trim().toUpperCase(),
          text: stripOptionLabelPrefix(item?.text || item?.label || '')
        };
      }).filter((item) => item.key && item.text)
      : [];

    const correctOptions = Array.isArray(rawQuestion.correct_options)
      ? rawQuestion.correct_options.map((item) => String(item || '').trim().toUpperCase()).filter(Boolean)
      : [];

    const answers = Array.isArray(rawQuestion.answers)
      ? rawQuestion.answers.map((item) => String(item || '').trim()).filter(Boolean)
      : (String(rawQuestion.answer || '').trim() ? [String(rawQuestion.answer || '').trim()] : []);

    const normalized = {
      id: rawQuestion.id || `q_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      prompt: String(rawQuestion.prompt || rawQuestion.question || '').trim(),
      question_type: type,
      answer_mode: normalizeClientAnswerMode(rawQuestion.answer_mode, type, options),
      options,
      correct_options: correctOptions,
      answers,
      difficulty: String(rawQuestion.difficulty || 'normal').trim()
    };
    return sanitizeQuestionForBattle(normalized);
  }

  function normalizeQuestionList(list) {
    return (Array.isArray(list) ? list : [])
      .map((item) => normalizeQuestion(item))
      .filter((item) => item.prompt);
  }

  function hydrateEditorFromBank(bank) {
    state.editor.title = String(bank?.title || '');
    state.editor.description = String(bank?.description || '');
    state.editor.questions = normalizeQuestionList(bank?.questions || []);
    state.editor.page = 1;
    state.editor.search = '';
    if (ui.editorQuestionSearchInput) ui.editorQuestionSearchInput.value = '';
    if (ui.editorTitleInput) ui.editorTitleInput.value = state.editor.title;
    if (ui.editorDescriptionInput) ui.editorDescriptionInput.value = state.editor.description;
    markEditorDirty(false);
    renderEditor();
    renderDiagnosticsText(bank?.provider_diagnostics || null, bank ? '已加载当前题库' : '请选择题库后开始编辑');
    updateEditorSummary();
  }

  function markEditorDirty(value) {
    state.editor.dirty = Boolean(value);
    const text = state.editor.dirty ? '有未保存修改' : '未修改';
    const isDirty = state.editor.dirty;
    if (ui.editorDirtyHint) {
      ui.editorDirtyHint.textContent = text;
      ui.editorDirtyHint.classList.toggle('dirty', isDirty);
    }
    if (ui.editorModalDirtyHint) {
      ui.editorModalDirtyHint.textContent = text;
      ui.editorModalDirtyHint.classList.toggle('dirty', isDirty);
    }
    updateEditorSummary();
  }

  function getQuestionTypeOptionsHtml(selectedType) {
    const options = state.options?.question_types || [];
    const hasSelected = options.some((item) => String(item.value) === String(selectedType));
    const rows = [...options];
    if (selectedType && !hasSelected) {
      rows.push({ value: selectedType, label: selectedType });
    }
    return rows
      .map((item) => `<option value="${escapeHtml(item.value)}" ${String(item.value) === String(selectedType) ? 'selected' : ''}>${escapeHtml(item.label)}</option>`)
      .join('');
  }

  function getAnswerModeOptionsHtml(selectedMode, questionType) {
    const type = normalizeClientQuestionType(questionType || 'single_choice');
    let options = [];
    if (type === 'quick_math') {
      options = [
        { value: 'numeric', label: '数字输入' },
        { value: 'single_choice', label: '单选' }
      ];
    } else if (type === 'multiple_choice') {
      options = [
        { value: 'multiple_choice', label: '多选' },
        { value: 'single_choice', label: '单选' }
      ];
    } else {
      options = [{ value: 'single_choice', label: '单选' }];
    }

    if (selectedMode && !options.some((item) => item.value === selectedMode)) {
      options.push({ value: selectedMode, label: selectedMode });
    }

    return options
      .map((item) => `<option value="${item.value}" ${item.value === selectedMode ? 'selected' : ''}>${item.label}</option>`)
      .join('');
  }

  function ensureQuestionShapeByMode(question) {
    if (question.answer_mode === 'numeric') {
      question.options = [];
      question.correct_options = [];
      if (!Array.isArray(question.answers)) question.answers = [];
      question.answers = question.answers
        .map((item) => normalizeNumericText(item))
        .filter(Boolean)
        .slice(0, 1);
      return;
    }
    if (!Array.isArray(question.options) || question.options.length < 2) {
      question.options = [
        { key: 'A', text: '选项A' },
        { key: 'B', text: '选项B' },
        { key: 'C', text: '选项C' },
        { key: 'D', text: '选项D' }
      ];
    }
    question.options = question.options.map((option, idx) => ({
      key: String(option?.key || String.fromCharCode(65 + idx)).trim().toUpperCase(),
      text: stripOptionLabelPrefix(option?.text || '')
    })).filter((option) => option.key && option.text);
    if (!Array.isArray(question.correct_options)) question.correct_options = [];
    question.correct_options = question.correct_options.map((key) => String(key || '').trim().toUpperCase()).filter(Boolean);
    question.answers = [];
  }

  function adaptQuestionByType(question, nextType) {
    const type = String(nextType || question.question_type || 'single_choice');
    question.question_type = type;
    if (type === 'multiple_choice') question.answer_mode = 'multiple_choice';
    else if (type === 'quick_math') question.answer_mode = 'numeric';
    else question.answer_mode = 'single_choice';

    if (type === 'true_false') {
      question.options = [
        { key: 'T', text: '对' },
        { key: 'F', text: '错' }
      ];
      if (!question.correct_options.length) {
        question.correct_options = ['T'];
      } else {
        question.correct_options = [question.correct_options[0] === 'F' ? 'F' : 'T'];
      }
    }
    ensureQuestionShapeByMode(question);
  }

  function parseMultiValuesText(value) {
    return String(value || '')
      .split(/[|,，、\/]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function renderEditor() {
    const hasBank = Boolean(state.selectedBank);
    if (!hasBank) {
      ui.editorEmptyHint.classList.remove('hidden');
      ui.editorQuestionList.innerHTML = '';
      ui.editorPageInfo.textContent = '第 0 / 0 页';
      return;
    }

    const all = state.editor.questions || [];
    const keyword = normalizeAnswerText(state.editor.search || '');
    const visibleIndexes = all
      .map((question, index) => ({ question, index }))
      .filter(({ question }) => !keyword || normalizeAnswerText(question.prompt).includes(keyword))
      .map((item) => item.index);

    const totalPages = Math.max(1, Math.ceil(visibleIndexes.length / EDITOR_PAGE_SIZE));
    state.editor.page = clamp(state.editor.page || 1, 1, totalPages);
    const pageStart = (state.editor.page - 1) * EDITOR_PAGE_SIZE;
    const pageIndexes = visibleIndexes.slice(pageStart, pageStart + EDITOR_PAGE_SIZE);

    ui.editorPageInfo.textContent = `第 ${state.editor.page} / ${totalPages} 页`;

    if (!pageIndexes.length) {
      ui.editorQuestionList.innerHTML = '';
      ui.editorEmptyHint.classList.remove('hidden');
      ui.editorEmptyHint.textContent = visibleIndexes.length ? '本页暂无题目' : '没有符合搜索条件的题目';
      return;
    }

    ui.editorEmptyHint.classList.add('hidden');
    ui.editorQuestionList.innerHTML = pageIndexes.map((qIndex) => {
      const question = all[qIndex];
      const optionsRows = question.options.map((option, optionIndex) => `
        <div class="option-row">
          <input class="key-input" type="text" maxlength="2" data-q-index="${qIndex}" data-option-key="${optionIndex}" value="${escapeHtml(option.key)}" />
          <input type="text" maxlength="100" data-q-index="${qIndex}" data-option-text="${optionIndex}" value="${escapeHtml(option.text)}" />
          <button type="button" class="btn ghost small" data-remove-option="${qIndex}" data-option-index="${optionIndex}">删</button>
        </div>
      `).join('');

      return `
        <article class="question-card" data-question-index="${qIndex}">
          <div class="question-head">
            <div class="question-no">第 ${qIndex + 1} 题</div>
            <div class="question-actions">
              <button type="button" class="btn ghost small" data-regenerate-question="${qIndex}">AI重写本题</button>
              <button type="button" class="btn ghost small" data-delete-question="${qIndex}">删除</button>
            </div>
          </div>

          <div class="question-grid">
            <label class="wide">
              题目内容
              <textarea data-q-index="${qIndex}" data-field="prompt">${escapeHtml(question.prompt)}</textarea>
            </label>

            <label>
              题型
              <select data-q-index="${qIndex}" data-field="question_type">
                ${getQuestionTypeOptionsHtml(question.question_type)}
              </select>
            </label>

            <label>
              作答方式
              <select data-q-index="${qIndex}" data-field="answer_mode">
                ${getAnswerModeOptionsHtml(question.answer_mode, question.question_type)}
              </select>
            </label>

            <label>
              难度
              <input type="text" maxlength="20" data-q-index="${qIndex}" data-field="difficulty" value="${escapeHtml(question.difficulty || 'normal')}" />
            </label>
          </div>

          ${question.answer_mode === 'numeric' ? `
            <label>
              标准数字答案（仅数字）
              <input type="text" data-q-index="${qIndex}" data-field="answers" value="${escapeHtml((question.answers || []).join(' | '))}" />
            </label>
          ` : `
            <div>
              <div class="option-list">${optionsRows}</div>
              <div style="margin-top: 6px;">
                <button type="button" class="btn ghost small" data-add-option="${qIndex}">新增选项</button>
              </div>
            </div>
            <label>
              正确选项（多个用逗号分隔，如 A,C）
              <input type="text" data-q-index="${qIndex}" data-field="correct_options" value="${escapeHtml((question.correct_options || []).join(','))}" />
            </label>
          `}
        </article>
      `;
    }).join('');
  }

  function updateScoreboard() {
    ui.leftScore.textContent = String(state.leftScore);
    ui.rightScore.textContent = String(state.rightScore);
  }

  function updateRopePosition() {
    const ratio = clamp(state.position / ROPE_LIMIT, -1, 1);
    const percent = ratio * 38;
    const pxShift = ratio * 52;
    ui.flag.style.left = `${50 + percent}%`;
    ui.ropeField.style.setProperty('--rope-shift', `${pxShift}px`);
  }

  function triggerPullEffect(side) {
    ui.ropeField.classList.remove('pull-left', 'pull-right', 'flash-left', 'flash-right', 'screen-shake');
    if (side === 'left') {
      ui.ropeField.classList.add('pull-left', 'flash-left');
    } else {
      ui.ropeField.classList.add('pull-right', 'flash-right');
    }
    ui.ropeField.classList.add('screen-shake');

    playSfx(side === 'left' ? 'pullLeft' : 'pullRight');
    spawnSparkBurst();

    window.setTimeout(() => {
      ui.ropeField.classList.remove('pull-left', 'pull-right', 'flash-left', 'flash-right', 'screen-shake');
    }, 280);
  }

  function renderQuestion() {
    const question = state.currentQuestion;
    if (!question) {
      ui.questionIndexText.textContent = '第 0 题';
      ui.questionTypeText.textContent = '题型：-';
      ui.questionText.textContent = '选择题库后开始比赛';
      return;
    }
    ui.questionIndexText.textContent = `第 ${state.questionIndex + 1} 题 / 共 ${state.questions.length} 题`;
    ui.questionTypeText.textContent = `题型：${mapTypeLabel(question.question_type)}`;
    ui.questionText.textContent = question.prompt;
  }

  function compareTextAnswer(inputText, answers) {
    const normalizedInput = normalizeAnswerText(inputText);
    if (!normalizedInput) return false;
    const answerList = (answers || [])
      .flatMap((answer) => String(answer || '').split(/[|/、，,]/))
      .map((part) => normalizeAnswerText(part))
      .filter(Boolean);
    if (!answerList.length) return false;
    if (answerList.includes(normalizedInput)) return true;
    if (answerList.some((item) => TRUE_SET.has(item)) && TRUE_SET.has(normalizedInput)) return true;
    if (answerList.some((item) => FALSE_SET.has(item)) && FALSE_SET.has(normalizedInput)) return true;
    return false;
  }

  function compareNumericAnswer(inputText, answers) {
    const normalizedInput = normalizeNumericText(inputText);
    if (!normalizedInput) return false;
    const answerList = (answers || [])
      .map((answer) => normalizeNumericText(answer))
      .filter(Boolean);
    return answerList.includes(normalizedInput);
  }

  function compareChoiceAnswer(question, userKeys) {
    const expected = [...new Set((question.correct_options || []).map((item) => String(item || '').trim().toUpperCase()))].sort();
    const actual = [...new Set((userKeys || []).map((item) => String(item || '').trim().toUpperCase()))].sort();
    if (!expected.length || !actual.length) return false;
    if (expected.length !== actual.length) return false;
    return expected.every((item, index) => item === actual[index]);
  }

  function isCorrectAnswer(question, payload) {
    if (!question) return false;
    if (question.answer_mode === 'numeric') {
      return compareNumericAnswer(payload?.text || '', question.answers || []);
    }
    if (question.answer_mode === 'single_choice') {
      return compareChoiceAnswer(question, payload?.keys ? [payload.keys[0]] : []);
    }
    if (question.answer_mode === 'multiple_choice') {
      return compareChoiceAnswer(question, payload?.keys || []);
    }
    return false;
  }

  function nextQuestion() {
    if (!state.questions.length) return;
    state.questionIndex += 1;
    if (state.questionIndex >= state.questions.length) {
      state.questionIndex = 0;
    }
    state.currentQuestion = sanitizeQuestionForBattle(state.questions[state.questionIndex]);
    state.answerLocked = false;
    state.multiSelections.left = new Set();
    state.multiSelections.right = new Set();
    state.numericBuffers.left = '';
    state.numericBuffers.right = '';
    renderQuestion();
    renderAnswerZones();
  }

  function checkWinByRope() {
    if (state.position <= -ROPE_LIMIT) {
      endMatch('左侧率先把绳结拉过终点线', 'left');
      return true;
    }
    if (state.position >= ROPE_LIMIT) {
      endMatch('右侧率先把绳结拉过终点线', 'right');
      return true;
    }
    return false;
  }

  function submitAnswer(side, payload) {
    if (!state.running || !state.currentQuestion || state.answerLocked) return;
    const correct = isCorrectAnswer(state.currentQuestion, payload);
    if (!correct) {
      if (side === 'left') {
        setTips('答案不正确，再想想。', ui.rightTip.textContent || '稳住节奏继续答题。');
      } else {
        setTips(ui.leftTip.textContent || '稳住节奏继续答题。', '答案不正确，再想想。');
      }
      playSfx('wrong');
      return;
    }

    state.answerLocked = true;
    if (side === 'left') {
      state.leftScore += 1;
      state.position = clamp(state.position - ROPE_STEP, -ROPE_LIMIT, ROPE_LIMIT);
      setTips('答对了，继续发力！', '对手答对了，守住阵线！');
    } else {
      state.rightScore += 1;
      state.position = clamp(state.position + ROPE_STEP, -ROPE_LIMIT, ROPE_LIMIT);
      setTips('对手答对了，守住阵线！', '答对了，继续发力！');
    }

    updateScoreboard();
    updateRopePosition();
    triggerPullEffect(side);

    if (checkWinByRope()) return;

    window.setTimeout(() => {
      if (state.running) nextQuestion();
    }, 360);
  }

  function createNumericAnswerZone(side) {
    const wrapper = document.createElement('div');
    wrapper.className = 'numeric-zone';

    const display = document.createElement('input');
    display.type = 'text';
    display.className = 'numeric-display';
    display.placeholder = '点击下方数字输入';
    display.readOnly = true;
    display.value = state.numericBuffers[side] || '';

    const keypad = document.createElement('div');
    keypad.className = 'numeric-keypad';

    const setBuffer = (next) => {
      const safe = String(next || '').replace(/[^0-9.\-]/g, '');
      state.numericBuffers[side] = safe.slice(0, 12);
      display.value = state.numericBuffers[side];
    };

    const appendChar = (char) => {
      const current = state.numericBuffers[side] || '';
      if (char === '.' && current.includes('.')) return;
      if (char === '-' && current.length > 0) return;
      setBuffer(`${current}${char}`);
    };

    const keyRows = [
      ['7', '8', '9'],
      ['4', '5', '6'],
      ['1', '2', '3'],
      ['-', '0', '.'],
      ['退格']
    ];

    keyRows.forEach((row) => {
      row.forEach((key) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'num-key';
        if (row.length === 1) button.classList.add('wide');
        button.textContent = key;
        button.addEventListener('click', () => {
          if (key === '退格') {
            setBuffer((state.numericBuffers[side] || '').slice(0, -1));
            return;
          }
          appendChar(key);
        });
        keypad.appendChild(button);
      });
    });

    const actions = document.createElement('div');
    actions.className = 'numeric-actions';

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'btn ghost small';
    clearBtn.textContent = '清空';
    clearBtn.addEventListener('click', () => setBuffer(''));

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn primary small';
    button.textContent = '提交';
    button.addEventListener('click', () => {
      submitAnswer(side, { text: state.numericBuffers[side] || '' });
      setBuffer('');
    });

    actions.appendChild(clearBtn);
    actions.appendChild(button);
    wrapper.appendChild(display);
    wrapper.appendChild(keypad);
    wrapper.appendChild(actions);
    return wrapper;
  }

  function createSingleChoiceZone(side, question) {
    const wrapper = document.createElement('div');
    wrapper.className = 'answer-option-grid';
    (question.options || []).forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'option-btn';
      button.textContent = `${option.key}. ${option.text}`;
      button.addEventListener('click', () => submitAnswer(side, { keys: [option.key] }));
      wrapper.appendChild(button);
    });
    return wrapper;
  }

  function createMultipleChoiceZone(side, question) {
    const wrapper = document.createElement('div');
    const grid = document.createElement('div');
    grid.className = 'answer-option-grid';

    (question.options || []).forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'option-btn';
      button.textContent = `${option.key}. ${option.text}`;
      button.addEventListener('click', () => {
        const set = state.multiSelections[side];
        if (set.has(option.key)) {
          set.delete(option.key);
          button.classList.remove('active');
        } else {
          set.add(option.key);
          button.classList.add('active');
        }
      });
      grid.appendChild(button);
    });

    const submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'btn primary small';
    submitBtn.textContent = '提交多选';
    submitBtn.addEventListener('click', () => {
      submitAnswer(side, { keys: [...state.multiSelections[side]] });
      state.multiSelections[side] = new Set();
      renderAnswerZones();
    });

    wrapper.appendChild(grid);
    wrapper.appendChild(submitBtn);
    return wrapper;
  }

  function buildEmergencyClickableQuestion(sourceQuestion) {
    return sanitizeQuestionForBattle({
      ...cloneQuestion(sourceQuestion || {}),
      question_type: 'single_choice',
      answer_mode: 'single_choice',
      options: [
        { key: 'A', text: '需要再判断' },
        { key: 'B', text: '暂不确定' },
        { key: 'C', text: '继续观察' },
        { key: 'D', text: '再看一眼' }
      ],
      correct_options: ['A'],
      answers: ['需要再判断']
    });
  }

  function ensureRenderableCurrentQuestion() {
    if (!state.currentQuestion) return null;
    const question = sanitizeQuestionForBattle(state.currentQuestion);
    if (question.answer_mode === 'single_choice' || question.answer_mode === 'multiple_choice') {
      if (!Array.isArray(question.options) || question.options.length < 2) {
        return buildEmergencyClickableQuestion(question);
      }
      return question;
    }
    if (question.answer_mode === 'numeric') {
      return question;
    }
    return buildEmergencyClickableQuestion(question);
  }

  function renderSingleAnswerZone(side, question) {
    const zone = side === 'left' ? ui.leftAnswerZone : ui.rightAnswerZone;
    zone.innerHTML = '';

    if (!state.running || !question) {
      const placeholder = document.createElement('div');
      placeholder.className = 'answer-placeholder';
      placeholder.textContent = '比赛未开始';
      zone.appendChild(placeholder);
      return;
    }

    if (question.answer_mode === 'single_choice') {
      zone.appendChild(createSingleChoiceZone(side, question));
      return;
    }
    if (question.answer_mode === 'multiple_choice') {
      zone.appendChild(createMultipleChoiceZone(side, question));
      return;
    }

    if (question.answer_mode === 'numeric') {
      zone.appendChild(createNumericAnswerZone(side));
      return;
    }

    zone.appendChild(createSingleChoiceZone(side, question));
  }

  function renderAnswerZones() {
    if (!state.running || !state.currentQuestion) {
      renderSingleAnswerZone('left', null);
      renderSingleAnswerZone('right', null);
      return;
    }
    const question = ensureRenderableCurrentQuestion();
    state.currentQuestion = question;
    renderSingleAnswerZone('left', question);
    renderSingleAnswerZone('right', question);
  }

  function setRunning(value) {
    state.running = Boolean(value);
    if (state.running) startBattleChatter();
    else stopBattleChatter();
    renderAnswerZones();
    updateActionAvailability();
  }

  function clearRoundTimer() {
    if (state.timerHandle) {
      clearInterval(state.timerHandle);
      state.timerHandle = null;
    }
  }

  function endMatch(reason, winnerSide) {
    if (!state.running) return;
    clearRoundTimer();
    setRunning(false);
    stopBgm();

    let winnerName = '平局';
    if (winnerSide === 'left') {
      winnerName = state.leftTeam?.name || '左侧战队';
    } else if (winnerSide === 'right') {
      winnerName = state.rightTeam?.name || '右侧战队';
    } else if (state.position < 0) {
      winnerName = state.leftTeam?.name || '左侧战队';
    } else if (state.position > 0) {
      winnerName = state.rightTeam?.name || '右侧战队';
    } else if (state.leftScore > state.rightScore) {
      winnerName = state.leftTeam?.name || '左侧战队';
      winnerSide = 'left';
    } else if (state.rightScore > state.leftScore) {
      winnerName = state.rightTeam?.name || '右侧战队';
      winnerSide = 'right';
    }

    setWinnerVisualState(winnerSide || '');
    const resultText = winnerName === '平局'
      ? `比赛结束：平局（${reason}）`
      : `比赛结束：${winnerName}获胜（${reason}）`;
    setResultBanner(resultText);
    ui.arenaTip.textContent = resultText;
    setTips(
      winnerName === (state.leftTeam?.name || '') ? '恭喜获胜！' : '本局结束',
      winnerName === (state.rightTeam?.name || '') ? '恭喜获胜！' : '本局结束'
    );

    showResultStage({
      winnerName,
      reason
    });
    playSfx('win');
    startWinFireworks(winnerSide || '');
    window.setTimeout(() => startWinFireworks(winnerSide || ''), 320);
    window.setTimeout(() => startWinFireworks(winnerSide || ''), 720);

    pushRecord({
      class_name: state.className || `班级${state.classId}`,
      left_team: state.leftTeam?.name || '左队',
      right_team: state.rightTeam?.name || '右队',
      left_score: state.leftScore,
      right_score: state.rightScore,
      winner: winnerName,
      provider: sourceLabel(state.provider),
      bank_title: state.selectedBank?.title || '-',
      time: new Date().toLocaleString()
    });
  }

  function resetRound() {
    clearRoundTimer();
    setRunning(false);
    stopBgm();
    setWinnerVisualState('');

    state.questions = [];
    state.currentQuestion = null;
    state.questionIndex = 0;
    state.position = 0;
    state.leftScore = 0;
    state.rightScore = 0;
    state.answerLocked = false;
    state.multiSelections.left = new Set();
    state.multiSelections.right = new Set();
    state.numericBuffers.left = '';
    state.numericBuffers.right = '';
    state.timerSec = state.durationSec || 180;

    setResultBanner('');
    updateScoreboard();
    updateRopePosition();
    updateTimerText();
    renderQuestion();
    renderAnswerZones();
    hideResultStage();
    setTips('等待开赛', '等待开赛');
    ui.arenaTip.textContent = '选择题库并开始比赛';
  }

  async function startMatch() {
    if (!state.classId) {
      showToast('未识别到班级，请从班级页面进入。', 'error');
      return;
    }
    if (!state.selectedBankId) {
      showToast('请先选择题库。', 'warn');
      return;
    }
    if (!state.leftTeam || !state.rightTeam || Number(state.leftTeam.id) === Number(state.rightTeam.id)) {
      showToast('请选择两个不同的战队。', 'warn');
      return;
    }
    if (state.editor.dirty) {
      const goOn = await askConfirm('当前题库有未保存修改，是否继续开赛？未保存内容不会进入本场比赛。', '未保存修改');
      if (!goOn) return;
    }

    if (state.audio.enabled) {
      ensureAudioContext();
    }

    ui.startBtn.disabled = true;
    ui.startBtn.textContent = '正在开赛...';

    try {
      const data = await safeFetchJson('/api/pk/matches/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: state.classId,
          question_bank_id: state.selectedBankId,
          left_team_id: state.leftTeam.id,
          right_team_id: state.rightTeam.id
        })
      });

      const questions = normalizeQuestionList(data.questions || []);
      if (!questions.length) {
        throw new Error('题库为空，无法开始比赛。');
      }

      state.provider = data.provider || state.selectedBank?.source_provider || '';
      state.durationSec = Number(data?.game?.duration_sec) || 180;
      state.timerSec = state.durationSec;
      state.questions = questions;
      const adaptedCount = Number(data?.game?.adapted_question_count || 0);
      state.questionIndex = 0;
      state.currentQuestion = sanitizeQuestionForBattle(questions[0]);
      state.position = 0;
      state.leftScore = 0;
      state.rightScore = 0;
      state.answerLocked = false;
      state.multiSelections.left = new Set();
      state.multiSelections.right = new Set();
      state.numericBuffers.left = '';
      state.numericBuffers.right = '';

      if (data.teams?.left) state.leftTeam = data.teams.left;
      if (data.teams?.right) state.rightTeam = data.teams.right;

      renderTeamAppearance();
      updateScoreboard();
      updateRopePosition();
      updateTimerText();
      renderQuestion();
      renderAnswerZones();
      setProviderTag(sourceLabel(state.provider));
      if (adaptedCount > 0) {
        showToast(`已自动优化 ${adaptedCount} 道题，确保双方可同时作答。`, 'info', 3200);
      }
      setTips('准备抢答，稳住节奏！', '准备抢答，稳住节奏！');
      setResultBanner('');
      hideResultStage();

      setRunning(true);
      if (state.audio.enabled) startBgm();
      playSfx('countdown');
      window.setTimeout(() => playSfx('countdown'), 420);
      window.setTimeout(() => playSfx('crowd'), 860);

      state.timerHandle = window.setInterval(() => {
        state.timerSec -= 1;
        updateTimerText();
        if (state.timerSec <= 0) {
          if (state.position < 0) {
            endMatch('时间到，左侧绳结更靠近终点线', 'left');
          } else if (state.position > 0) {
            endMatch('时间到，右侧绳结更靠近终点线', 'right');
          } else if (state.leftScore > state.rightScore) {
            endMatch('时间到，左侧答对更多题目', 'left');
          } else if (state.rightScore > state.leftScore) {
            endMatch('时间到，右侧答对更多题目', 'right');
          } else {
            endMatch('时间到，双方势均力敌', '');
          }
        }
      }, 1000);
    } catch (error) {
      showToast(error.message || '开赛失败，请重试。', 'error', 2800);
      setTips('开赛失败，请重试。', '开赛失败，请重试。');
    } finally {
      ui.startBtn.textContent = '开始比赛';
      updateActionAvailability();
    }
  }

  function updateActionAvailability() {
    const readyTeams = Boolean(state.leftTeam && state.rightTeam && Number(state.leftTeam.id) !== Number(state.rightTeam.id));
    const readyBank = Boolean(state.selectedBankId);
    const deleting = state.deletingBankId !== null;
    ui.startBtn.disabled = state.running || state.generating || deleting || !readyTeams || !readyBank;
    ui.generateBankBtn.disabled = state.running || state.generating || deleting || (state.teams || []).length < 2;
    ui.saveBankBtn.disabled = !state.selectedBank || !state.editor.dirty || state.generating || state.running || deleting;
    if (ui.openEditorModalBtn) {
      ui.openEditorModalBtn.disabled = !state.selectedBank || state.generating || state.running || deleting;
    }
  }

  async function fetchBankDetail(bankId) {
    const id = Number(bankId);
    if (!Number.isFinite(id) || id <= 0) return null;
    const cached = state.bankDetailCache.get(id);
    if (cached) return cached;
    const detail = await safeFetchJson(`/api/pk/question-banks/${id}?class_id=${state.classId}`);
    state.bankDetailCache.set(id, detail);
    return detail;
  }

  async function selectBank(bankId) {
    const id = Number(bankId);
    if (!Number.isFinite(id) || id <= 0) return;
    try {
      const detail = await safeFetchJson(`/api/pk/question-banks/${id}?class_id=${state.classId}`);
      state.bankDetailCache.set(id, detail);
      state.selectedBankId = id;
      state.selectedBank = detail;
      updateSelectedBankText();
      renderBankList();
      hydrateEditorFromBank(detail);
      applyRuntimeDiagnostics(detail.provider_diagnostics || null);
      updateActionAvailability();
      showToast('题库已载入，可编辑后保存。', 'success');
    } catch (error) {
      showToast(error.message || '题库读取失败。', 'error');
    }
  }

  async function deleteQuestionBank(bankId) {
    const id = Number(bankId);
    if (!Number.isFinite(id) || id <= 0) return;
    if (!state.classId || state.deletingBankId !== null) return;

    const bank = state.banks.find((item) => Number(item.id) === id)
      || (Number(state.selectedBankId) === id ? state.selectedBank : null);
    if (!bank) {
      showToast('题库不存在或已删除。', 'warn');
      return;
    }
    if (String(bank.scope || '').toLowerCase() !== 'class') {
      showToast('系统标准题库不支持删除。', 'warn');
      return;
    }

    const bankName = bank.title || `题库#${id}`;
    let confirmed = await askConfirm(
      `确认删除题库《${bankName}》吗？删除后不可恢复。`,
      '删除题库'
    );
    if (!confirmed) return;

    if (state.editor.dirty && Number(state.selectedBankId) === id) {
      confirmed = await askConfirm(
        '当前题库有未保存修改，删除后这些内容无法恢复。确定继续删除吗？',
        '再次确认'
      );
      if (!confirmed) return;
    }

    state.deletingBankId = id;
    renderBankList();
    updateActionAvailability();
    try {
      await safeFetchJson(`/api/pk/question-banks/${id}?class_id=${state.classId}`, {
        method: 'DELETE'
      });
      state.bankDetailCache.delete(id);
      if (Number(state.selectedBankId) === id) {
        state.selectedBankId = null;
        state.selectedBank = null;
        hydrateEditorFromBank(null);
      }
      await loadQuestionBanks({ keepSelection: true });
      showToast(`题库《${bankName}》已删除。`, 'success');
    } catch (error) {
      showToast(error.message || '删除题库失败。', 'error', 2800);
    } finally {
      state.deletingBankId = null;
      renderBankList();
      updateActionAvailability();
    }
  }

  async function loadQuestionBanks(config) {
    if (!state.classId) return;
    const keepSelection = config?.keepSelection !== false;
    const params = new URLSearchParams();
    params.set('class_id', String(state.classId));
    if (ui.bankKeywordInput.value.trim()) params.set('keyword', ui.bankKeywordInput.value.trim());
    if (ui.bankSubjectFilter.value) params.set('subject', ui.bankSubjectFilter.value);
    if (ui.bankGradeFilter.value) params.set('grade', ui.bankGradeFilter.value);
    if (ui.bankTypeFilter.value) params.set('question_type', ui.bankTypeFilter.value);
    if (ui.bankSourceFilter.value) params.set('source', ui.bankSourceFilter.value);

    const data = await safeFetchJson(`/api/pk/question-banks?${params.toString()}`);
    state.banks = Array.isArray(data.items) ? data.items : [];
    renderSourceFilters(data.filters?.sources || []);

    if (!keepSelection) {
      state.selectedBankId = null;
      state.selectedBank = null;
    } else if (state.selectedBankId) {
      const found = state.banks.find((item) => Number(item.id) === Number(state.selectedBankId));
      if (found) {
        state.selectedBank = {
          ...(state.selectedBank || {}),
          ...found,
          questions: state.selectedBank?.questions || []
        };
      } else {
        state.selectedBankId = null;
        state.selectedBank = null;
      }
    }

    if (!state.selectedBank) {
      hydrateEditorFromBank(null);
    }

    renderBankList();
    updateSelectedBankText();
    updateEditorSummary();
    updateActionAvailability();
  }

  function clearPollTimer() {
    if (state.pollHandle) {
      clearInterval(state.pollHandle);
      state.pollHandle = null;
    }
  }

  async function pollGenerationJob(jobId) {
    clearPollTimer();
    state.pendingJobId = jobId;

    const tick = async () => {
      if (!state.pendingJobId) return;
      try {
        const data = await safeFetchJson(`/api/pk/question-banks/jobs/${state.pendingJobId}`);
        setProgress(data.progress || 0, data.message || '题库生成中...');

        if (data.status === 'done') {
          state.generating = false;
          state.pendingJobId = null;
          clearPollTimer();
          ui.generateBankBtn.textContent = '生成题库';
          showToast('题库生成完成。', 'success');

          await loadQuestionBanks({ keepSelection: true });
          if (data.bank?.id) {
            await selectBank(data.bank.id);
          }
          renderDiagnosticsText(data.bank?.provider_diagnostics || null, data.message || '题库生成完成');
          applyRuntimeDiagnostics(data.bank?.provider_diagnostics || null);
          if (String(data.bank?.source_provider || '').startsWith('preset:fallback')) {
            showToast('智能题库暂时忙碌，已自动使用标准题库。', 'warn', 2800);
          }
          updateActionAvailability();
          return;
        }

        if (data.status === 'failed') {
          state.generating = false;
          state.pendingJobId = null;
          clearPollTimer();
          ui.generateBankBtn.textContent = '生成题库';
          setProgress(100, data.message || '题库生成失败');
          showToast(data.error || '题库生成失败，请重试。', 'error', 2800);
          updateActionAvailability();
        }
      } catch (error) {
        state.generating = false;
        state.pendingJobId = null;
        clearPollTimer();
        ui.generateBankBtn.textContent = '生成题库';
        showToast(error.message || '生成任务轮询失败。', 'error');
        updateActionAvailability();
      }
    };

    await tick();
    if (!state.pendingJobId) return;
    state.pollHandle = setInterval(tick, 900);
  }

  async function generateQuestionBank() {
    if (!state.classId) {
      showToast('缺少班级信息，无法生成题库。', 'error');
      return;
    }
    if ((state.teams || []).length < 2) {
      showToast('当前班级战队不足两个，请先创建战队。', 'warn');
      return;
    }
    if (state.generating) return;

    const questionCount = Number(ui.countInput.value);
    const minCount = Number(state.options?.defaults?.min_question_count) || 20;
    const maxCount = Number(state.options?.defaults?.max_question_count) || 220;
    const clampedCount = clamp(Number.isFinite(questionCount) ? questionCount : 20, minCount, maxCount);
    ui.countInput.value = String(clampedCount);

    state.generating = true;
    ui.generateBankBtn.disabled = true;
    ui.generateBankBtn.textContent = '生成中...';
    setProgress(3, '正在创建题库任务...');
    renderDiagnosticsText(null, '正在初始化 AI 出题流程');

    try {
      const preferPreset = Boolean(ui.preferPresetToggle.checked);
      const payload = {
        class_id: state.classId,
        subject: ui.subjectSelect.value || 'math',
        grade: ui.gradeSelect.value || 'g3',
        question_type: ui.typeSelect.value || 'single_choice',
        question_count: clampedCount,
        template_id: ui.templateSelect.value || null,
        description: ui.descriptionInput.value.trim(),
        prefer_preset: preferPreset
      };

      const data = await safeFetchJson('/api/pk/question-banks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setProgress(data.progress || 5, data.message || '题库任务已创建');
      await pollGenerationJob(data.job_id);
    } catch (error) {
      state.generating = false;
      ui.generateBankBtn.textContent = '生成题库';
      showToast(error.message || '题库生成失败。', 'error', 2800);
      updateActionAvailability();
    }
  }

  async function saveCurrentBank() {
    if (!state.selectedBankId || !state.selectedBank) {
      showToast('请先选择题库。', 'warn');
      return;
    }
    const title = ui.editorTitleInput.value.trim();
    if (!title) {
      showToast('题库标题不能为空。', 'warn');
      return;
    }
    const questions = state.editor.questions.map((question) => cloneQuestion(question)).filter((question) => question.prompt.trim());
    if (!questions.length) {
      showToast('题库至少需要 1 道题目。', 'warn');
      return;
    }

    for (let i = 0; i < questions.length; i += 1) {
      const question = questions[i];
      ensureQuestionShapeByMode(question);
      if (question.answer_mode === 'numeric') {
        question.question_type = 'quick_math';
        question.answers = (question.answers || [])
          .map((item) => normalizeNumericText(item))
          .filter(Boolean)
          .slice(0, 1);
        if (!question.answers.length) {
          showToast(`第 ${i + 1} 题缺少数字答案。`, 'warn');
          return;
        }
      } else {
        question.options = (question.options || []).map((option, idx) => ({
          key: String(option.key || String.fromCharCode(65 + idx)).trim().toUpperCase(),
          text: stripOptionLabelPrefix(option.text || '')
        })).filter((option) => option.key && option.text);
        if (question.options.length < 2) {
          showToast(`第 ${i + 1} 题至少需要 2 个选项。`, 'warn');
          return;
        }
        question.correct_options = (question.correct_options || [])
          .map((item) => String(item || '').trim().toUpperCase())
          .filter(Boolean);
        if (!question.correct_options.length) {
          showToast(`第 ${i + 1} 题需要设置正确选项。`, 'warn');
          return;
        }
      }
    }

    ui.saveBankBtn.disabled = true;
    ui.saveBankBtn.textContent = '保存中...';
    try {
      const data = await safeFetchJson(`/api/pk/question-banks/${state.selectedBankId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: state.classId,
          title,
          description: ui.editorDescriptionInput.value.trim(),
          questions,
          generated_by: 'manual'
        })
      });
      const savedBank = data.bank;
      state.selectedBank = savedBank;
      state.bankDetailCache.set(Number(savedBank.id), savedBank);
      markEditorDirty(false);
      hydrateEditorFromBank(savedBank);
      await loadQuestionBanks({ keepSelection: true });
      showToast('题库已保存。', 'success');
    } catch (error) {
      showToast(error.message || '题库保存失败。', 'error', 3000);
    } finally {
      ui.saveBankBtn.textContent = '保存题库';
      updateActionAvailability();
    }
  }

  async function regenerateSingleQuestion(questionIndex) {
    if (!state.selectedBankId || !state.selectedBank) return;
    if (state.editor.dirty) {
      showToast('请先保存当前题库修改，再执行单题 AI 重写。', 'warn', 2600);
      return;
    }

    const question = state.editor.questions[questionIndex];
    if (!question) return;

    const hint = await askPrompt(
      `将重写第 ${questionIndex + 1} 题。可输入补充要求（可为空）。`,
      '例如：改成更贴近小学编程课堂的情景题',
      ''
    );
    if (hint === null) return;

    try {
      showToast('正在重写题目，请稍候...', 'info');
      const data = await safeFetchJson(
        `/api/pk/question-banks/${state.selectedBankId}/questions/${questionIndex}/regenerate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            class_id: state.classId,
            rewrite_hint: hint
          })
        }
      );
      const rewritten = normalizeQuestion(data.question || {});
      state.editor.questions[questionIndex] = rewritten;
      state.selectedBank.questions = state.editor.questions.map((item) => cloneQuestion(item));
      if (data.diagnostics) {
        state.selectedBank.provider_diagnostics = {
          ...(state.selectedBank.provider_diagnostics || {}),
          last_regenerate: {
            index: questionIndex,
            provider: data.provider || '',
            diagnostics: data.diagnostics || null,
            at: new Date().toISOString()
          }
        };
      }
      renderEditor();
      renderDiagnosticsText(state.selectedBank.provider_diagnostics || null, data.message || '单题重写完成');
      applyRuntimeDiagnostics(state.selectedBank.provider_diagnostics || null);
      showToast(data.message || '题目重写成功。', data.provider === 'preset:fallback' ? 'warn' : 'success', 2800);
      markEditorDirty(true);
      updateActionAvailability();
    } catch (error) {
      showToast(error.message || '单题重写失败。', 'error', 2800);
    }
  }

  async function reloadEditorFromServer() {
    if (!state.selectedBankId) return;
    if (state.editor.dirty) {
      const goOn = await askConfirm('将放弃当前未保存修改，是否继续？');
      if (!goOn) return;
    }
    try {
      const detail = await safeFetchJson(`/api/pk/question-banks/${state.selectedBankId}?class_id=${state.classId}`);
      state.selectedBank = detail;
      state.bankDetailCache.set(Number(detail.id), detail);
      hydrateEditorFromBank(detail);
      showToast('已重新加载题库。', 'info');
    } catch (error) {
      showToast(error.message || '重载题库失败。', 'error');
    }
  }

  function createEmptyQuestion() {
    const type = ui.typeSelect.value || 'single_choice';
    return {
      id: `manual_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      prompt: '请填写题目内容',
      question_type: type,
      answer_mode: type === 'quick_math' ? 'numeric' : 'single_choice',
      options: [],
      correct_options: [],
      answers: [''],
      difficulty: 'normal'
    };
  }

  function clearResultStageEffects() {
    hideResultStage();
  }

  function showResultStage(payload) {
    ui.resultStageTitle.textContent = '比赛结束';
    ui.resultStageReason.textContent = payload.reason || '';
    if (payload.winnerName === '平局') {
      ui.resultWinnerText.textContent = '本局平局，双方都很棒！';
    } else {
      ui.resultWinnerText.textContent = `冠军：${payload.winnerName}`;
    }
    ui.resultStage.classList.remove('hidden');
  }

  function hideResultStage() {
    ui.resultStage.classList.add('hidden');
  }

  function ensureAudioContext() {
    if (!window.AudioContext && !window.webkitAudioContext) return null;
    if (!state.audio.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      state.audio.ctx = new Ctx();
      state.audio.masterGain = state.audio.ctx.createGain();
      state.audio.masterGain.gain.value = 0.62;
      state.audio.masterGain.connect(state.audio.ctx.destination);
    }
    if (state.audio.ctx.state === 'suspended') {
      state.audio.ctx.resume().catch(() => {});
    }
    return state.audio.ctx;
  }

  function playTone(freq, duration, type, volume, delay) {
    const ctx = ensureAudioContext();
    if (!ctx || !state.audio.enabled) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type || 'sine';
    oscillator.frequency.value = Math.max(80, Number(freq) || 440);
    gain.gain.value = 0;
    oscillator.connect(gain);
    gain.connect(state.audio.masterGain);

    const now = ctx.currentTime + (delay || 0);
    const attack = 0.01;
    const release = Math.max(0.03, duration - attack);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume || 0.04, now + attack);
    gain.gain.linearRampToValueAtTime(0.0001, now + attack + release);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  function playSfx(name) {
    if (!state.audio.enabled) return;
    if (name === 'pullLeft') {
      playTone(220, 0.1, 'square', 0.06, 0);
      playTone(180, 0.13, 'triangle', 0.04, 0.03);
      playTone(260, 0.08, 'sine', 0.03, 0.08);
      return;
    }
    if (name === 'pullRight') {
      playTone(250, 0.1, 'square', 0.06, 0);
      playTone(210, 0.13, 'triangle', 0.04, 0.03);
      playTone(290, 0.08, 'sine', 0.03, 0.08);
      return;
    }
    if (name === 'wrong') {
      playTone(180, 0.16, 'sawtooth', 0.05, 0);
      playTone(140, 0.16, 'sawtooth', 0.03, 0.05);
      return;
    }
    if (name === 'countdown') {
      playTone(420, 0.08, 'triangle', 0.04, 0);
      playTone(520, 0.08, 'triangle', 0.04, 0.14);
      playTone(620, 0.12, 'triangle', 0.04, 0.28);
      return;
    }
    if (name === 'win') {
      playTone(440, 0.14, 'triangle', 0.05, 0);
      playTone(554, 0.14, 'triangle', 0.05, 0.14);
      playTone(659, 0.16, 'triangle', 0.05, 0.28);
      playTone(784, 0.2, 'triangle', 0.04, 0.42);
      return;
    }
    if (name === 'crowd') {
      playTone(520, 0.08, 'triangle', 0.025, 0);
      playTone(620, 0.08, 'triangle', 0.025, 0.05);
      playTone(720, 0.12, 'triangle', 0.02, 0.1);
    }
  }

  function startBgm() {
    if (!state.audio.enabled || state.audio.bgmTimer) return;
    ensureAudioContext();
    const melody = [392, 392, 440, 392, 523, 494, 440, 392, 349, 392, 330, 294];
    let melodyStep = 0;
    let beatStep = 0;

    state.audio.bgmTimer = window.setInterval(() => {
      if (!state.running || !state.audio.enabled) return;
      const note = melody[melodyStep % melody.length];
      playTone(note, 0.2, 'triangle', 0.045);
      playTone(note / 2, 0.22, 'sine', 0.028);
      if (melodyStep % 4 === 0) {
        playTone(note * 1.5, 0.08, 'square', 0.03, 0.12);
      }
      melodyStep += 1;
    }, 280);

    state.audio.beatTimer = window.setInterval(() => {
      if (!state.running || !state.audio.enabled) return;
      if (beatStep % 2 === 0) {
        playTone(92, 0.09, 'square', 0.055);
      } else {
        playTone(140, 0.07, 'triangle', 0.04);
      }
      if (beatStep % 8 === 0) {
        playSfx('crowd');
      }
      beatStep += 1;
    }, 220);
  }

  function stopBgm() {
    if (state.audio.bgmTimer) {
      clearInterval(state.audio.bgmTimer);
      state.audio.bgmTimer = null;
    }
    if (state.audio.beatTimer) {
      clearInterval(state.audio.beatTimer);
      state.audio.beatTimer = null;
    }
  }

  function setAudioEnabled(enabled) {
    state.audio.enabled = Boolean(enabled);
    if (state.audio.enabled) {
      ui.audioToggleBtn.textContent = '音效已开启';
      ui.audioToggleBtn.classList.remove('ghost');
      ui.audioToggleBtn.classList.add('primary');
      if (state.running) startBgm();
    } else {
      stopBgm();
      ui.audioToggleBtn.textContent = '音效已关闭';
      ui.audioToggleBtn.classList.add('ghost');
      ui.audioToggleBtn.classList.remove('primary');
    }
  }

  function resizeFxCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    ui.fxCanvas.width = Math.floor(w * ratio);
    ui.fxCanvas.height = Math.floor(h * ratio);
    ui.fxCanvas.style.width = `${w}px`;
    ui.fxCanvas.style.height = `${h}px`;
    ui.fxCanvasContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function spawnParticles(x, y, count, spread, speed, colors) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.4 + Math.random() * 0.8);
      state.fx.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity * spread,
        vy: Math.sin(angle) * velocity * spread,
        life: 1,
        decay: 0.012 + Math.random() * 0.013,
        gravity: 0.05 + Math.random() * 0.05,
        size: 2 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
  }

  function spawnSparkBurst() {
    const rect = ui.ropeField.getBoundingClientRect();
    const x = rect.left + rect.width * 0.5;
    const y = rect.top + rect.height * 0.54;
    spawnParticles(x, y, 18, 1.1, 2.4, ['#ffd057', '#fff1b7', '#f7b731']);
  }

  function startWinFireworks(winnerSide) {
    const leftX = window.innerWidth * 0.3;
    const rightX = window.innerWidth * 0.7;
    const y = window.innerHeight * 0.32;
    let count = 0;
    const timer = window.setInterval(() => {
      if (count >= 10) {
        clearInterval(timer);
        return;
      }
      const colors = winnerSide === 'left'
        ? ['#1ba4e6', '#7ad8ff', '#ffffff']
        : winnerSide === 'right'
          ? ['#f07171', '#ffc2c2', '#ffffff']
          : ['#ffc857', '#7ad8ff', '#f79797', '#ffffff'];
      const baseX = winnerSide === 'left'
        ? leftX
        : winnerSide === 'right'
          ? rightX
          : (count % 2 === 0 ? leftX : rightX);
      const jitterX = (Math.random() - 0.5) * 180;
      const jitterY = (Math.random() - 0.5) * 80;
      spawnParticles(baseX + jitterX, y + jitterY, 45, 1.4, 3.1, colors);
      count += 1;
    }, 180);
  }

  function animateFx() {
    const ctx = ui.fxCanvasContext;
    const particles = state.fx.particles;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i];
      p.life -= p.decay;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    state.fx.raf = window.requestAnimationFrame(animateFx);
  }

  async function loadContext() {
    state.classId = parseClassIdFromUrl();
    if (!state.classId) {
      setClassLabel('未识别到班级，请从班级页面进入。');
      showToast('缺少班级信息，无法进入比赛。', 'error');
      return;
    }

    const [optionsData, classData, petData] = await Promise.all([
      safeFetchJson('/api/pk/options'),
      safeFetchJson(`/api/pk/classes/${state.classId}/context`),
      safeFetchJson('/api/pets').catch(() => [])
    ]);

    state.options = optionsData;
    state.className = classData.class_name || `班级 ${state.classId}`;
    state.teams = Array.isArray(classData.teams) ? classData.teams : [];
    state.petCatalog = Array.isArray(petData) ? petData : [];

    setClassLabel(`${state.className} · 拔河答题赛`);
    renderOptions();
    renderTeamSelects();
    updateTimerText();
    renderQuestion();
    renderAnswerZones();
    updateRopePosition();
    await loadQuestionBanks({ keepSelection: true });

    if (state.teams.length < 2) {
      showToast('战队不足 2 个，请先创建战队。', 'warn', 2600);
      setTips('战队不足，无法开赛。', '战队不足，无法开赛。');
    }
    updateActionAvailability();
  }

  function bindEvents() {
    ui.backToAdminBtn?.addEventListener('click', () => {
      window.location.href = '/admin';
    });

    ui.audioToggleBtn.addEventListener('click', () => {
      setAudioEnabled(!state.audio.enabled);
      showToast(state.audio.enabled ? '音效已开启' : '音效已关闭', 'info');
    });

    ui.leftTeamSelect.addEventListener('change', syncTeamSelection);
    ui.rightTeamSelect.addEventListener('change', syncTeamSelection);

    ui.templateSelect.addEventListener('change', () => {
      syncQuickTemplateButtons();
      if (!ui.templateSelect.value && ui.preferPresetToggle) {
        ui.preferPresetToggle.checked = false;
      }
    });
    ui.quickTemplateRow.addEventListener('click', (event) => {
      const button = event.target.closest('[data-template]');
      if (!button) return;
      applyTemplate(button.dataset.template || '', { quickStart: true });
    });

    ui.generateBankBtn.addEventListener('click', generateQuestionBank);
    ui.refreshBanksBtn.addEventListener('click', () => {
      loadQuestionBanks({ keepSelection: true }).catch((error) => {
        showToast(error.message || '题库刷新失败。', 'error');
      });
    });

    const debounceBankSearch = debounce(() => {
      loadQuestionBanks({ keepSelection: false }).catch((error) => {
        showToast(error.message || '题库查询失败。', 'error');
      });
    }, 260);

    ui.bankKeywordInput.addEventListener('input', debounceBankSearch);
    [ui.bankSubjectFilter, ui.bankGradeFilter, ui.bankTypeFilter, ui.bankSourceFilter].forEach((node) => {
      node.addEventListener('change', debounceBankSearch);
    });

    ui.bankList.addEventListener('click', (event) => {
      const deleteTarget = event.target.closest('[data-delete-bank]');
      if (deleteTarget) {
        deleteQuestionBank(Number(deleteTarget.getAttribute('data-delete-bank')));
        return;
      }
      const target = event.target.closest('[data-select-bank]');
      if (!target) return;
      selectBank(Number(target.getAttribute('data-select-bank')));
    });

    ui.startBtn.addEventListener('click', startMatch);
    ui.resetBtn.addEventListener('click', resetRound);

    ui.openEditorModalBtn?.addEventListener('click', openEditorModal);
    ui.closeEditorModalBtn?.addEventListener('click', closeEditorModal);
    ui.editorModalLayer?.addEventListener('click', (event) => {
      if (event.target === ui.editorModalLayer) closeEditorModal();
    });
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && ui.editorModalLayer && !ui.editorModalLayer.classList.contains('hidden')) {
        closeEditorModal();
      }
    });

    ui.editorTitleInput.addEventListener('input', () => {
      state.editor.title = ui.editorTitleInput.value;
      markEditorDirty(true);
      updateActionAvailability();
    });
    ui.editorDescriptionInput.addEventListener('input', () => {
      state.editor.description = ui.editorDescriptionInput.value;
      markEditorDirty(true);
      updateActionAvailability();
    });

    ui.editorQuestionSearchInput.addEventListener('input', () => {
      state.editor.search = ui.editorQuestionSearchInput.value;
      state.editor.page = 1;
      renderEditor();
    });
    ui.editorPrevPageBtn.addEventListener('click', () => {
      state.editor.page = Math.max(1, state.editor.page - 1);
      renderEditor();
    });
    ui.editorNextPageBtn.addEventListener('click', () => {
      state.editor.page += 1;
      renderEditor();
    });

    ui.addQuestionBtn.addEventListener('click', () => {
      if (!state.selectedBank) {
        showToast('请先选择题库。', 'warn');
        return;
      }
      const q = createEmptyQuestion();
      adaptQuestionByType(q, q.question_type);
      state.editor.questions.push(q);
      state.editor.page = Math.ceil(state.editor.questions.length / EDITOR_PAGE_SIZE);
      markEditorDirty(true);
      renderEditor();
      updateActionAvailability();
    });

    ui.reloadEditorBtn.addEventListener('click', () => {
      reloadEditorFromServer();
    });

    ui.saveBankBtn.addEventListener('click', saveCurrentBank);

    ui.editorQuestionList.addEventListener('input', (event) => {
      const target = event.target;
      const qIndex = Number(target.getAttribute('data-q-index'));
      if (!Number.isInteger(qIndex) || qIndex < 0 || qIndex >= state.editor.questions.length) return;
      const question = state.editor.questions[qIndex];

      const field = target.getAttribute('data-field');
      if (field === 'prompt') {
        question.prompt = target.value;
        markEditorDirty(true);
        updateActionAvailability();
        return;
      }
      if (field === 'difficulty') {
        question.difficulty = target.value;
        markEditorDirty(true);
        updateActionAvailability();
        return;
      }
      if (field === 'answers') {
        question.answers = parseMultiValuesText(target.value);
        markEditorDirty(true);
        updateActionAvailability();
        return;
      }
      if (field === 'correct_options') {
        question.correct_options = parseMultiValuesText(target.value).map((item) => item.toUpperCase());
        markEditorDirty(true);
        updateActionAvailability();
        return;
      }

      const optionKeyIndex = target.getAttribute('data-option-key');
      if (optionKeyIndex !== null) {
        const idx = Number(optionKeyIndex);
        if (question.options[idx]) {
          question.options[idx].key = String(target.value || '').trim().toUpperCase();
          markEditorDirty(true);
          updateActionAvailability();
        }
        return;
      }
      const optionTextIndex = target.getAttribute('data-option-text');
      if (optionTextIndex !== null) {
        const idx = Number(optionTextIndex);
        if (question.options[idx]) {
          question.options[idx].text = String(target.value || '').trim();
          markEditorDirty(true);
          updateActionAvailability();
        }
      }
    });

    ui.editorQuestionList.addEventListener('change', (event) => {
      const target = event.target;
      const qIndex = Number(target.getAttribute('data-q-index'));
      if (!Number.isInteger(qIndex) || qIndex < 0 || qIndex >= state.editor.questions.length) return;
      const question = state.editor.questions[qIndex];
      const field = target.getAttribute('data-field');
      if (field === 'question_type') {
        adaptQuestionByType(question, target.value);
        markEditorDirty(true);
        renderEditor();
        updateActionAvailability();
        return;
      }
      if (field === 'answer_mode') {
        question.answer_mode = normalizeClientAnswerMode(target.value, question.question_type, question.options);
        if (question.answer_mode === 'numeric') {
          question.question_type = 'quick_math';
        } else if (question.answer_mode === 'multiple_choice' && question.question_type !== 'multiple_choice') {
          question.question_type = 'multiple_choice';
        } else if (question.answer_mode === 'single_choice' && question.question_type === 'quick_math') {
          question.question_type = 'single_choice';
        }
        ensureQuestionShapeByMode(question);
        markEditorDirty(true);
        renderEditor();
        updateActionAvailability();
      }
    });

    ui.editorQuestionList.addEventListener('click', async (event) => {
      const addOptionBtn = event.target.closest('[data-add-option]');
      if (addOptionBtn) {
        const qIndex = Number(addOptionBtn.getAttribute('data-add-option'));
        const question = state.editor.questions[qIndex];
        if (!question) return;
        question.options.push({
          key: String.fromCharCode(65 + question.options.length),
          text: `选项${question.options.length + 1}`
        });
        markEditorDirty(true);
        renderEditor();
        updateActionAvailability();
        return;
      }

      const removeOptionBtn = event.target.closest('[data-remove-option]');
      if (removeOptionBtn) {
        const qIndex = Number(removeOptionBtn.getAttribute('data-remove-option'));
        const optionIndex = Number(removeOptionBtn.getAttribute('data-option-index'));
        const question = state.editor.questions[qIndex];
        if (!question || question.options.length <= 2) {
          showToast('选项题至少保留 2 个选项。', 'warn');
          return;
        }
        question.options.splice(optionIndex, 1);
        question.options = question.options.map((item, idx) => ({
          key: String.fromCharCode(65 + idx),
          text: item.text
        }));
        markEditorDirty(true);
        renderEditor();
        updateActionAvailability();
        return;
      }

      const deleteBtn = event.target.closest('[data-delete-question]');
      if (deleteBtn) {
        const qIndex = Number(deleteBtn.getAttribute('data-delete-question'));
        const ok = await askConfirm(`确认删除第 ${qIndex + 1} 题吗？`);
        if (!ok) return;
        state.editor.questions.splice(qIndex, 1);
        markEditorDirty(true);
        renderEditor();
        updateActionAvailability();
        return;
      }

      const regenerateBtn = event.target.closest('[data-regenerate-question]');
      if (regenerateBtn) {
        const qIndex = Number(regenerateBtn.getAttribute('data-regenerate-question'));
        regenerateSingleQuestion(qIndex);
      }
    });

    ui.clearRecordsBtn.addEventListener('click', async () => {
      const ok = await askConfirm('确定清空本浏览器中的比赛记录吗？', '清空记录');
      if (!ok) return;
      window.localStorage.removeItem(RECORDS_KEY);
      renderRecords();
      showToast('记录已清空。', 'info');
    });

    ui.closeResultStageBtn.addEventListener('click', () => {
      clearResultStageEffects();
    });

    window.addEventListener('resize', resizeFxCanvas);
  }

  function collectUiRefs() {
    ui.classLabel = byId('classLabel');
    ui.backToAdminBtn = byId('backToAdminBtn');
    ui.timerText = byId('timerText');
    ui.providerTag = byId('providerTag');
    ui.providerRuntimeTag = byId('providerRuntimeTag');
    ui.audioToggleBtn = byId('audioToggleBtn');

    ui.subjectSelect = byId('subjectSelect');
    ui.gradeSelect = byId('gradeSelect');
    ui.typeSelect = byId('typeSelect');
    ui.countInput = byId('countInput');
    ui.templateSelect = byId('templateSelect');
    ui.descriptionInput = byId('descriptionInput');
    ui.preferPresetToggle = byId('preferPresetToggle');
    ui.quickTemplateRow = byId('quickTemplateRow');
    ui.quickButtons = [];
    ui.generateBankBtn = byId('generateBankBtn');
    ui.generationStatusCard = byId('generationStatusCard');
    ui.generationProgress = byId('generationProgress');
    ui.generationProgressText = byId('generationProgressText');
    ui.generationMessage = byId('generationMessage');
    ui.diagnosticsText = byId('diagnosticsText');

    ui.bankKeywordInput = byId('bankKeywordInput');
    ui.bankSubjectFilter = byId('bankSubjectFilter');
    ui.bankGradeFilter = byId('bankGradeFilter');
    ui.bankTypeFilter = byId('bankTypeFilter');
    ui.bankSourceFilter = byId('bankSourceFilter');
    ui.refreshBanksBtn = byId('refreshBanksBtn');
    ui.bankList = byId('bankList');

    ui.editorTitleInput = byId('editorTitleInput');
    ui.editorDescriptionInput = byId('editorDescriptionInput');
    ui.editorQuestionSearchInput = byId('editorQuestionSearchInput');
    ui.editorQuestionList = byId('editorQuestionList');
    ui.editorEmptyHint = byId('editorEmptyHint');
    ui.editorPrevPageBtn = byId('editorPrevPageBtn');
    ui.editorNextPageBtn = byId('editorNextPageBtn');
    ui.editorPageInfo = byId('editorPageInfo');
    ui.editorDirtyHint = byId('editorDirtyHint');
    ui.editorModalDirtyHint = byId('editorModalDirtyHint');
    ui.editorSummaryText = byId('editorSummaryText');
    ui.editorModalLayer = byId('editorModalLayer');
    ui.openEditorModalBtn = byId('openEditorModalBtn');
    ui.closeEditorModalBtn = byId('closeEditorModalBtn');
    ui.saveBankBtn = byId('saveBankBtn');
    ui.addQuestionBtn = byId('addQuestionBtn');
    ui.reloadEditorBtn = byId('reloadEditorBtn');

    ui.selectedBankText = byId('selectedBankText');
    ui.leftTeamSelect = byId('leftTeamSelect');
    ui.rightTeamSelect = byId('rightTeamSelect');
    ui.startBtn = byId('startBtn');
    ui.resetBtn = byId('resetBtn');

    ui.leftCardAvatar = byId('leftCardAvatar');
    ui.rightCardAvatar = byId('rightCardAvatar');
    ui.leftTeamPanel = byId('leftTeamPanel');
    ui.rightTeamPanel = byId('rightTeamPanel');
    ui.leftTeamName = byId('leftTeamName');
    ui.rightTeamName = byId('rightTeamName');
    ui.leftScore = byId('leftScore');
    ui.rightScore = byId('rightScore');
    ui.leftTip = byId('leftTip');
    ui.rightTip = byId('rightTip');
    ui.leftAnswerZone = byId('leftAnswerZone');
    ui.rightAnswerZone = byId('rightAnswerZone');
    ui.questionIndexText = byId('questionIndexText');
    ui.questionTypeText = byId('questionTypeText');
    ui.questionText = byId('questionText');
    ui.ropeField = byId('ropeField');
    ui.ropeCore = byId('ropeCore');
    ui.flag = byId('flag');
    ui.leftPullers = byId('leftPullers');
    ui.rightPullers = byId('rightPullers');
    ui.leftChatter = byId('leftChatter');
    ui.rightChatter = byId('rightChatter');
    ui.resultBanner = byId('resultBanner');
    ui.arenaTip = byId('arenaTip');

    ui.recordList = byId('recordList');
    ui.clearRecordsBtn = byId('clearRecordsBtn');

    ui.toastContainer = byId('toastContainer');
    ui.dialogLayer = byId('dialogLayer');
    ui.resultStage = byId('resultStage');
    ui.resultStageTitle = byId('resultStageTitle');
    ui.resultStageReason = byId('resultStageReason');
    ui.resultWinnerText = byId('resultWinnerText');
    ui.resultLeftAvatar = byId('resultLeftAvatar');
    ui.resultRightAvatar = byId('resultRightAvatar');
    ui.resultLeftName = byId('resultLeftName');
    ui.resultRightName = byId('resultRightName');
    ui.closeResultStageBtn = byId('closeResultStageBtn');

    ui.fxCanvas = byId('fxCanvas');
    ui.fxCanvasContext = ui.fxCanvas.getContext('2d');
  }

  function updateEditorSummary() {
    if (!ui.editorSummaryText) return;
    if (!state.selectedBank) {
      ui.editorSummaryText.textContent = '请选择题库后打开编辑器';
      return;
    }
    const qCount = Array.isArray(state.editor.questions) ? state.editor.questions.length : 0;
    ui.editorSummaryText.textContent = `当前题库：${state.selectedBank.title || `题库#${state.selectedBank.id}`} · 共 ${qCount} 题`;
  }

  function openEditorModal() {
    if (!state.selectedBank) {
      showToast('请先选择题库。', 'warn');
      return;
    }
    if (ui.editorModalLayer) {
      ui.editorModalLayer.classList.remove('hidden');
    }
  }

  function closeEditorModal() {
    if (ui.editorModalLayer) {
      ui.editorModalLayer.classList.add('hidden');
    }
  }

  async function init() {
    collectUiRefs();
    bindEvents();
    renderRecords();
    hideProgress();
    updateTimerText();
    resetRound();
    setAudioEnabled(true);
    updateEditorSummary();
    setProviderTag('待选择');
    renderDiagnosticsText(null, '尚未生成题库');
    resizeFxCanvas();
    animateFx();

    try {
      await loadContext();
    } catch (error) {
      setClassLabel('班级数据加载失败');
      showToast(error.message || '加载失败，请刷新重试。', 'error', 3000);
    }
  }

  window.addEventListener('beforeunload', () => {
    clearRoundTimer();
    clearPollTimer();
    stopBgm();
    if (state.fx.raf) cancelAnimationFrame(state.fx.raf);
  });

  window.addEventListener('DOMContentLoaded', init);
})();
