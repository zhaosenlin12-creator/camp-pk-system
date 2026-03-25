const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const baseUrl = process.env.QA_BASE_URL || 'http://localhost:3001';
const adminPin = process.env.QA_ADMIN_PIN || process.env.ADMIN_PIN || '';
const dbPath = path.join(process.cwd(), 'database', 'data.json');
const uploadsDir = path.join(process.cwd(), 'uploads', 'photos');
const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/axl9wAAAABJRU5ErkJggg==',
  'base64'
);

let adminHeadersPromise = null;

function readDb() {
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

async function parseJson(response) {
  if (!response.ok()) {
    throw new Error(`API ${response.url()} failed: ${response.status()}`);
  }

  return response.json();
}

async function getAdminHeaders(request) {
  if (!adminPin) {
    throw new Error('QA_ADMIN_PIN or ADMIN_PIN is required for authenticated QA');
  }

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

async function createTeam(request, classId, name, color = '#F97316') {
  const headers = await getAdminHeaders(request);
  return parseJson(
    await request.post(`${baseUrl}/api/teams`, {
      headers,
      data: { class_id: classId, name, color }
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

async function updateScore(request, studentId, delta, reason = 'QA delete verification') {
  const headers = await getAdminHeaders(request);
  return parseJson(
    await request.patch(`${baseUrl}/api/students/${studentId}/score`, {
      headers,
      data: { delta, reason }
    })
  );
}

async function claimPet(request, studentId, petId) {
  const headers = await getAdminHeaders(request);
  return parseJson(
    await request.post(`${baseUrl}/api/students/${studentId}/claim-pet`, {
      headers,
      data: { pet_id: petId, overwrite: true }
    })
  );
}

async function runPetAction(request, studentId, action) {
  const headers = await getAdminHeaders(request);
  return parseJson(
    await request.post(`${baseUrl}/api/students/${studentId}/pet/${action}`, {
      headers
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

async function uploadReportPhoto(request) {
  const headers = await getAdminHeaders(request);
  return parseJson(
    await request.post(`${baseUrl}/api/reports/upload`, {
      headers,
      multipart: {
        photos: {
          name: 'qa-delete-photo.png',
          mimeType: 'image/png',
          buffer: onePixelPng
        }
      }
    })
  );
}

async function createReport(request, payload) {
  const headers = await getAdminHeaders(request);
  return parseJson(
    await request.post(`${baseUrl}/api/reports`, {
      headers,
      data: payload
    })
  );
}

async function createCertificate(request, payload) {
  const headers = await getAdminHeaders(request);
  return parseJson(
    await request.post(`${baseUrl}/api/certificates`, {
      headers,
      data: payload
    })
  );
}

async function addLotteryLog(request, payload) {
  const headers = await getAdminHeaders(request);
  return parseJson(
    await request.post(`${baseUrl}/api/lottery-logs`, {
      headers,
      data: payload
    })
  );
}

async function deleteClass(request, classId) {
  const headers = await getAdminHeaders(request);
  await request.delete(`${baseUrl}/api/classes/${classId}`, {
    headers
  });
}

async function loginAdmin(page) {
  await page.goto(`${baseUrl}/admin`, { waitUntil: 'networkidle' });
  await page.locator('input[type="password"]').fill(adminPin);
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(900);
}

async function selectClass(page, className) {
  await page.getByRole('button', { name: new RegExp(className) }).first().click();
  await page.waitForTimeout(1200);
}

function installAudioSpy(page) {
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

    window.__qaAudioCount = 0;
    window.AudioContext = FakeAudioContext;
    window.webkitAudioContext = FakeAudioContext;
  });
}

test.setTimeout(180000);

test.beforeAll(() => {
  if (!adminPin) {
    throw new Error('QA_ADMIN_PIN or ADMIN_PIN must be set before running delete and sound QA');
  }
});

test('pet profile open sound only plays once per modal open', async ({ page, request }) => {
  await installAudioSpy(page);

  const suffix = Date.now();
  const className = `QA-SOUND-${suffix}`;
  let createdClass = null;

  try {
    createdClass = await createClass(request, className);
    const student = await createStudent(request, {
      name: `QA声音${suffix}`,
      class_id: createdClass.id,
      avatar: '🪄'
    });

    await updateScore(request, student.id, 20, 'QA sound setup');
    await claimPet(request, student.id, 10);

    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await selectClass(page, className);
    await page.waitForTimeout(1200);

    const baselineCount = await page.evaluate(() => window.__qaAudioCount || 0);

    await page.locator('[data-testid^="student-pet-passport-"]').first().click();
    await expect(page.getByTestId('pet-profile-modal')).toBeVisible();
    await page.waitForTimeout(1200);

    const afterOpenCount = await page.evaluate(() => window.__qaAudioCount || 0);
    expect(afterOpenCount).toBeGreaterThan(baselineCount);

    await page.waitForTimeout(9000);
    const afterWaitCount = await page.evaluate(() => window.__qaAudioCount || 0);
    expect(afterWaitCount).toBe(afterOpenCount);

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('pet-profile-modal')).toHaveCount(0);
    await page.waitForTimeout(600);

    await page.locator('[data-testid^="student-pet-passport-"]').first().click();
    await expect(page.getByTestId('pet-profile-modal')).toBeVisible();
    await page.waitForTimeout(1200);

    const afterReopenCount = await page.evaluate(() => window.__qaAudioCount || 0);
    expect(afterReopenCount).toBeGreaterThan(afterWaitCount);
  } finally {
    if (createdClass?.id) {
      try {
        await deleteClass(request, createdClass.id);
      } catch (error) {
        console.error(`sound-class-cleanup-failed:${createdClass.id}:${error.message}`);
      }
    }
  }
});

test('danger confirmation UI works and student deletion clears related data', async ({ page, request }) => {
  const suffix = Date.now();
  const className = `QA-DELETE-${suffix}`;
  const teamName = `QA队伍${suffix}`;
  let createdClass = null;
  let photoItem = null;
  let session = null;
  let targetStudent = null;
  let helperStudent = null;
  let team = null;

  try {
    createdClass = await createClass(request, className);
    team = await createTeam(request, createdClass.id, teamName, '#22C55E');

    targetStudent = await createStudent(request, {
      name: `QA目标${suffix}`,
      class_id: createdClass.id,
      team_id: team.id,
      avatar: '🧪'
    });
    helperStudent = await createStudent(request, {
      name: `QA助手${suffix}`,
      class_id: createdClass.id,
      team_id: team.id,
      avatar: '🛠️'
    });

    await updateScore(request, targetStudent.id, 30, 'QA direct score');
    await claimPet(request, targetStudent.id, 11);
    await runPetAction(request, targetStudent.id, 'feed');

    session = await createRatingSession(request, createdClass.id, targetStudent.id);
    await submitVote(request, session.id, helperStudent.name, 8);
    await closeRatingSession(request, session.id);

    const uploadResult = await uploadReportPhoto(request);
    photoItem = uploadResult.items[0];

    await createReport(request, {
      student_id: targetStudent.id,
      class_id: createdClass.id,
      photos: uploadResult.photos,
      ai_comment: 'QA delete report',
      traits: { focus: 'good' },
      teacher_name: 'QA'
    });

    await createCertificate(request, {
      student_id: targetStudent.id,
      class_id: createdClass.id,
      title: 'QA 奖状',
      subtitle: '用于删除验证',
      teacher_name: 'QA'
    });

    await loginAdmin(page);
    await selectClass(page, className);

    const studentDeleteButton = page.getByTestId(`student-delete-${targetStudent.id}`);
    await expect(studentDeleteButton).toBeVisible();

    await studentDeleteButton.click();
    await expect(page.getByTestId('danger-confirm-student')).toBeVisible();
    await expect(page.getByTestId('danger-confirm-student')).toContainText(targetStudent.name);
    await page.getByTestId('danger-confirm-student-cancel').click();
    await expect(page.getByTestId('danger-confirm-student')).toHaveCount(0);
    await expect(studentDeleteButton).toBeVisible();

    await studentDeleteButton.click();
    await page.getByTestId('danger-confirm-student-confirm').click();
    await expect(page.getByTestId(`student-delete-${targetStudent.id}`)).toHaveCount(0);
    await expect(page.getByTestId('danger-confirm-student')).toHaveCount(0);

    await expect.poll(() => {
      const db = readDb();
      return {
        studentExists: db.students.some((student) => student.id === targetStudent.id),
        scoreLogExists: db.scoreLogs.some((log) => log.student_id === targetStudent.id),
        ratingSessionExists: db.ratingSessions.some((item) => item.student_id === targetStudent.id),
        ratingVoteExists: db.ratingVotes.some((vote) => vote.session_id === session.id),
        reportExists: db.reports.some((report) => report.student_id === targetStudent.id),
        certificateExists: db.certificates.some((certificate) => certificate.student_id === targetStudent.id),
        photoEntryExists: db.photos.some((photo) => photo.url === photoItem.url),
        photoFileExists: fs.existsSync(path.join(uploadsDir, photoItem.filename))
      };
    }).toEqual({
      studentExists: false,
      scoreLogExists: false,
      ratingSessionExists: false,
      ratingVoteExists: false,
      reportExists: false,
      certificateExists: false,
      photoEntryExists: false,
      photoFileExists: false
    });

    await page.getByRole('button', { name: /战队管理/i }).click();
    await page.waitForTimeout(800);

    const teamDeleteButton = page.getByTestId(`team-delete-${team.id}`);
    await expect(teamDeleteButton).toBeVisible();

    await teamDeleteButton.click();
    await expect(page.getByTestId('danger-confirm-team')).toBeVisible();
    await expect(page.getByTestId('danger-confirm-team')).toContainText(teamName);
    await page.getByTestId('danger-confirm-team-cancel').click();
    await expect(page.getByTestId('danger-confirm-team')).toHaveCount(0);
    await expect(teamDeleteButton).toBeVisible();

    await teamDeleteButton.click();
    await page.getByTestId('danger-confirm-team-confirm').click();
    await expect(page.getByTestId(`team-delete-${team.id}`)).toHaveCount(0);
    await expect(page.getByTestId('danger-confirm-team')).toHaveCount(0);
    await expect(page.getByText(helperStudent.name)).toBeVisible();

    await expect.poll(async () => {
      const teamsAfterDelete = await parseJson(
        await request.get(`${baseUrl}/api/classes/${createdClass.id}/teams`)
      );
      const studentsAfterDelete = await parseJson(
        await request.get(`${baseUrl}/api/classes/${createdClass.id}/students`)
      );
      const helperAfterDelete = studentsAfterDelete.find((student) => student.id === helperStudent.id);

      return {
        teamExists: teamsAfterDelete.some((item) => item.id === team.id),
        helperExists: Boolean(helperAfterDelete),
        helperTeamId: helperAfterDelete?.team_id ?? null
      };
    }).toEqual({
      teamExists: false,
      helperExists: true,
      helperTeamId: null
    });
  } finally {
    if (createdClass?.id) {
      try {
        await deleteClass(request, createdClass.id);
      } catch (error) {
        console.error(`delete-flow-class-cleanup-failed:${createdClass.id}:${error.message}`);
      }
    }
  }
});

test('rating and lottery danger actions use custom confirmation dialogs', async ({ page, request }) => {
  const suffix = Date.now();
  const className = `QA-DANGER-${suffix}`;
  let createdClass = null;

  try {
    createdClass = await createClass(request, className);

    const studentA = await createStudent(request, {
      name: `QA评分A${suffix}`,
      class_id: createdClass.id,
      avatar: '🅰️'
    });
    const studentB = await createStudent(request, {
      name: `QA评分B${suffix}`,
      class_id: createdClass.id,
      avatar: '🅱️'
    });
    const studentC = await createStudent(request, {
      name: `QA评分C${suffix}`,
      class_id: createdClass.id,
      avatar: '🌀'
    });

    const closedSession = await createRatingSession(request, createdClass.id, studentC.id);
    await submitVote(request, closedSession.id, studentB.name, 8);
    await closeRatingSession(request, closedSession.id);

    const activeSession = await createRatingSession(request, createdClass.id, studentA.id);
    await submitVote(request, activeSession.id, studentB.name, 9);

    await addLotteryLog(request, {
      class_id: createdClass.id,
      team_id: null,
      team_name: studentA.name,
      type: 'reward',
      item_name: 'QA 奖励',
      item_icon: '🏆'
    });

    await loginAdmin(page);
    await selectClass(page, className);
    await page.getByRole('button', { name: /展示评分/i }).click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: /取消评分/i }).click();
    await expect(page.getByTestId('danger-confirm-rating')).toBeVisible();
    await expect(page.getByTestId('danger-confirm-rating')).toContainText('取消');
    await page.getByTestId('danger-confirm-rating-cancel').click();
    await expect(page.getByTestId('danger-confirm-rating')).toHaveCount(0);

    await page.locator('button[title="删除评分"]').first().click();
    await expect(page.getByTestId('danger-confirm-rating')).toBeVisible();
    await expect(page.getByTestId('danger-confirm-rating')).toContainText('评分');
    await page.getByTestId('danger-confirm-rating-cancel').click();
    await expect(page.getByTestId('danger-confirm-rating')).toHaveCount(0);

    await page.locator('button[title="删除历史记录"]').first().click();
    await expect(page.getByTestId('danger-confirm-rating')).toBeVisible();
    await expect(page.getByTestId('danger-confirm-rating')).toContainText('历史');
    await page.getByTestId('danger-confirm-rating-cancel').click();
    await expect(page.getByTestId('danger-confirm-rating')).toHaveCount(0);

    await page.getByRole('button', { name: /记录/i }).click();
    await expect(page.getByText('QA 奖励')).toBeVisible();
    await page.getByRole('button', { name: /清空记录/i }).click();
    await expect(page.getByTestId('danger-confirm-lottery-history')).toBeVisible();
    await page.getByTestId('danger-confirm-lottery-history-cancel').click();
    await expect(page.getByTestId('danger-confirm-lottery-history')).toHaveCount(0);
  } finally {
    if (createdClass?.id) {
      try {
        await deleteClass(request, createdClass.id);
      } catch (error) {
        console.error(`danger-ui-class-cleanup-failed:${createdClass.id}:${error.message}`);
      }
    }
  }
});
