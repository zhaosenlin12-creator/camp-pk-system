const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const baseUrl = process.env.QA_BASE_URL || 'http://localhost:3001';
const adminPin = process.env.QA_ADMIN_PIN || process.env.ADMIN_PIN || '980116';
const outputDir = path.join(process.cwd(), '.tmp', 'qa', 'screenshots');

let adminHeadersPromise = null;

function ensureDir() {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function saveShot(page, name, fullPage = true) {
  ensureDir();
  await page.screenshot({ path: path.join(outputDir, name), fullPage });
}

async function parseJson(response) {
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`API ${response.url()} failed: ${response.status()} ${body}`);
  }

  return response.json();
}

async function getAdminHeaders(request) {
  if (!adminHeadersPromise) {
    adminHeadersPromise = (async () => {
      const result = await parseJson(
        await request.post(`${baseUrl}/api/admin/verify`, {
          data: { pin: adminPin }
        })
      );

      if (!result.success || !result.token) {
        throw new Error('Failed to acquire admin token for QA');
      }

      return { Authorization: `Bearer ${result.token}` };
    })();
  }

  return adminHeadersPromise;
}

async function createClass(request, name) {
  const headers = await getAdminHeaders(request);
  return parseJson(
    await request.post(`${baseUrl}/api/classes`, {
      headers,
      data: { name }
    })
  );
}

async function deleteClass(request, classId) {
  const headers = await getAdminHeaders(request);
  await request.delete(`${baseUrl}/api/classes/${classId}`, { headers });
}

async function createTeam(request, classId, name, color = '#0EA5E9') {
  const headers = await getAdminHeaders(request);
  return parseJson(
    await request.post(`${baseUrl}/api/teams`, {
      headers,
      data: {
        class_id: classId,
        name,
        color
      }
    })
  );
}

async function createStudent(request, payload) {
  const headers = await getAdminHeaders(request);
  return parseJson(
    await request.post(`${baseUrl}/api/students`, {
      headers,
      data: payload
    })
  );
}

async function createRatingSession(request, classId, studentId) {
  const headers = await getAdminHeaders(request);
  return parseJson(
    await request.post(`${baseUrl}/api/rating-sessions`, {
      headers,
      data: { class_id: classId, student_id: studentId }
    })
  );
}

async function submitVote(request, sessionId, voterName, score) {
  return parseJson(
    await request.post(`${baseUrl}/api/rating-sessions/${sessionId}/vote`, {
      data: { voter_name: voterName, score }
    })
  );
}

async function closeRatingSession(request, sessionId) {
  const headers = await getAdminHeaders(request);
  return parseJson(
    await request.patch(`${baseUrl}/api/rating-sessions/${sessionId}/close`, {
      headers
    })
  );
}

async function fetchStudents(request, classId) {
  return parseJson(await request.get(`${baseUrl}/api/classes/${classId}/students`));
}

async function fetchTeams(request, classId) {
  return parseJson(await request.get(`${baseUrl}/api/classes/${classId}/teams`));
}

async function loginAdmin(page) {
  await page.goto(`${baseUrl}/admin`, { waitUntil: 'networkidle' });
  await page.locator('input[type="password"]').fill(adminPin);
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(900);
}

async function selectClass(page, className) {
  await page.getByRole('button', { name: /Class Hub/i }).first().click();
  await page.getByRole('button', { name: new RegExp(className) }).first().click();
  await page.waitForTimeout(1200);
}

function installPickerSpy(page) {
  return page.addInitScript(() => {
    class FakeOscillator {
      constructor() {
        window.__qaAudioCount = (window.__qaAudioCount || 0) + 1;
        this.frequency = { value: 0 };
        this.type = 'sine';
      }

      connect() {
        return this;
      }

      start() {}

      stop() {}
    }

    class FakeGain {
      constructor() {
        this.gain = {
          setValueAtTime() {},
          exponentialRampToValueAtTime() {}
        };
      }

      connect() {
        return this;
      }
    }

    class FakeAudioContext {
      constructor() {
        this.state = 'running';
        this.currentTime = 0;
        this.destination = {};
      }

      resume() {
        this.state = 'running';
        return Promise.resolve();
      }

      createOscillator() {
        return new FakeOscillator();
      }

      createGain() {
        return new FakeGain();
      }
    }

    class FakeSpeechSynthesisUtterance {
      constructor(text) {
        this.text = text;
        this.lang = 'zh-CN';
        this.rate = 1;
        this.pitch = 1;
        this.volume = 1;
      }
    }

    window.__qaAudioCount = 0;
    window.__qaSpeechCalls = [];

    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      writable: true,
      value: FakeAudioContext
    });
    Object.defineProperty(window, 'webkitAudioContext', {
      configurable: true,
      writable: true,
      value: FakeAudioContext
    });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      writable: true,
      value: FakeSpeechSynthesisUtterance
    });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      writable: true,
      value: {
        getVoices() {
          return [{ name: 'QA-ZH', lang: 'zh-CN' }];
        },
        speak(utterance) {
          window.__qaSpeechCalls.push(utterance.text);
        },
        cancel() {},
        addEventListener() {},
        removeEventListener() {}
      }
    });
  });
}

test.setTimeout(180000);

test('random picker uses current class roster, animation, and speech fallback path', async ({ page, request }) => {
  const suffix = Date.now();
  const className = `QA-PICK-${suffix}`;
  let createdClass = null;

  try {
    createdClass = await createClass(request, className);
    const students = [
      await createStudent(request, { name: `QA点名甲${suffix}`, class_id: createdClass.id, avatar: '🦊' }),
      await createStudent(request, { name: `QA点名乙${suffix}`, class_id: createdClass.id, avatar: '🐼' }),
      await createStudent(request, { name: `QA点名丙${suffix}`, class_id: createdClass.id, avatar: '🐯' })
    ];

    const expectedNames = students.map((student) => student.name);

    await installPickerSpy(page);
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await selectClass(page, className);

    await page.getByTestId('display-random-picker-open').click();
    await expect(page.getByTestId('random-picker-modal')).toBeVisible();
    await expect(page.getByTestId('random-picker-roster')).toContainText(expectedNames[0]);
    await saveShot(page, 'random-picker-modal.png', false);

    await page.getByTestId('random-picker-start').click();
    await page.waitForTimeout(4600);
    await expect(page.getByTestId('random-picker-start')).toHaveText('再来一次');

    const firstResultText = await page.getByTestId('random-picker-result').textContent();
    expect(expectedNames.some((name) => firstResultText.includes(name))).toBeTruthy();

    const qaAudioCount = await page.evaluate(() => window.__qaAudioCount || 0);
    const qaSpeechCalls = await page.evaluate(() => window.__qaSpeechCalls || []);
    expect(qaAudioCount).toBeGreaterThan(0);
    expect(qaSpeechCalls.length).toBeGreaterThan(0);
    expect(expectedNames.some((name) => qaSpeechCalls[0].includes(name))).toBeTruthy();
    await saveShot(page, 'random-picker-result.png', false);

    await page.getByTestId('random-picker-start').click();
    await page.waitForTimeout(4600);
    await expect(page.getByTestId('random-picker-start')).toHaveText('再来一次');

    const secondResultText = await page.getByTestId('random-picker-result').textContent();
    expect(expectedNames.some((name) => secondResultText.includes(name))).toBeTruthy();
    expect(secondResultText).not.toEqual(firstResultText);

    const speechCallsAfterSecond = await page.evaluate(() => window.__qaSpeechCalls || []);
    expect(speechCallsAfterSecond.length).toBeGreaterThanOrEqual(2);
    expect(expectedNames.some((name) => speechCallsAfterSecond[1].includes(name))).toBeTruthy();

    await loginAdmin(page);
    await selectClass(page, className);
    await expect(page.getByTestId('admin-random-picker-open')).toBeVisible();
  } finally {
    if (createdClass?.id) {
      await deleteClass(request, createdClass.id).catch(() => {});
    }
  }
});

test('closing a rating session twice is idempotent and does not double-apply scores', async ({ request }) => {
  const suffix = Date.now();
  const className = `QA-RATE-${suffix}`;
  let createdClass = null;

  try {
    createdClass = await createClass(request, className);
    const team = await createTeam(request, createdClass.id, `QA队${suffix}`.slice(0, 18), '#8B5CF6');
    const targetStudent = await createStudent(request, {
      name: `QA评分甲${suffix}`,
      class_id: createdClass.id,
      team_id: team.id,
      avatar: '🦁'
    });
    const voterA = await createStudent(request, {
      name: `QA评分乙${suffix}`,
      class_id: createdClass.id,
      avatar: '🐰'
    });
    const voterB = await createStudent(request, {
      name: `QA评分丙${suffix}`,
      class_id: createdClass.id,
      avatar: '🐼'
    });

    const session = await createRatingSession(request, createdClass.id, targetStudent.id);
    await submitVote(request, session.id, voterA.name, 8);
    await submitVote(request, session.id, voterB.name, 10);

    const firstClose = await closeRatingSession(request, session.id);
    const secondClose = await closeRatingSession(request, session.id);

    expect(firstClose.status).toBe('closed');
    expect(secondClose.status).toBe('closed');
    expect(secondClose.already_closed).toBeTruthy();
    expect(secondClose.avg_score).toBe(firstClose.avg_score);
    expect(secondClose.vote_count).toBe(firstClose.vote_count);

    const studentsAfterClose = await fetchStudents(request, createdClass.id);
    const teamsAfterClose = await fetchTeams(request, createdClass.id);
    const targetAfterClose = studentsAfterClose.find((student) => student.id === targetStudent.id);
    const teamAfterClose = teamsAfterClose.find((item) => item.id === team.id);

    expect(targetAfterClose).toBeTruthy();
    expect(teamAfterClose).toBeTruthy();
    expect(targetAfterClose.score).toBe(firstClose.avg_score);
    expect(teamAfterClose.score).toBe(firstClose.avg_score);
  } finally {
    if (createdClass?.id) {
      await deleteClass(request, createdClass.id).catch(() => {});
    }
  }
});
