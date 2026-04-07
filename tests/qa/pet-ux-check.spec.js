const { test, expect } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs');

const baseUrl = process.env.QA_BASE_URL || 'http://localhost:3001';
const classId = 8;
const adminPin = process.env.QA_ADMIN_PIN || process.env.ADMIN_PIN || '';
const adminTokenStorageKey = 'camp-pk-admin-token';
const currentClassStorageKey = 'camp-pk-current-class-id';
const outputDir = path.join(process.cwd(), '.tmp', 'qa', 'screenshots');
let adminAuthPromise = null;

async function ensureDir() {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function saveShot(page, name, fullPage = true) {
  await page.screenshot({ path: path.join(outputDir, name), fullPage });
}

async function parseJson(response) {
  if (!response.ok()) {
    throw new Error(`API ${response.url()} failed: ${response.status()}`);
  }

  return response.json();
}

async function getAdminAuth(request) {
  if (!adminPin) {
    throw new Error('QA_ADMIN_PIN or ADMIN_PIN is required for authenticated QA');
  }

  if (!adminAuthPromise) {
    adminAuthPromise = (async () => {
      const result = await parseJson(
        await request.post(`${baseUrl}/api/admin/verify`, {
          data: { pin: adminPin }
        })
      );

      if (!result.success || !result.token) {
        throw new Error('Failed to acquire admin token for QA');
      }

      return {
        token: result.token,
        headers: { Authorization: `Bearer ${result.token}` }
      };
    })();
  }

  return adminAuthPromise;
}

async function getAdminHeaders(request) {
  return (await getAdminAuth(request)).headers;
}

async function createStudent(request, name) {
  const headers = await getAdminHeaders(request);
  return parseJson(
    await request.post(`${baseUrl}/api/students`, {
      headers,
      data: {
        name,
        class_id: classId,
        avatar: 'QA'
      }
    })
  );
}

async function updateScore(request, studentId, delta) {
  const headers = await getAdminHeaders(request);
  return parseJson(
    await request.patch(`${baseUrl}/api/students/${studentId}/score`, {
      headers,
      data: { delta, reason: 'QA ritual verification' }
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

async function activatePetSlot(request, studentId, slotId) {
  const headers = await getAdminHeaders(request);
  return parseJson(
    await request.post(`${baseUrl}/api/students/${studentId}/pet-slots/${slotId}/activate`, {
      headers
    })
  );
}

async function runAction(request, studentId, action) {
  const headers = await getAdminHeaders(request);
  return parseJson(await request.post(`${baseUrl}/api/students/${studentId}/pet/${action}`, {
    headers
  }));
}

async function runActionExpectError(request, studentId, action, status = 400) {
  const headers = await getAdminHeaders(request);
  const response = await request.post(`${baseUrl}/api/students/${studentId}/pet/${action}`, {
    headers
  });
  expect(response.status()).toBe(status);
  return response.json();
}

async function deleteStudent(request, studentId) {
  const headers = await getAdminHeaders(request);
  await request.delete(`${baseUrl}/api/students/${studentId}`, {
    headers
  });
}

async function syncCurrentClass(page) {
  await page.evaluate(
    ({ storageKey, selectedClassId }) => {
      window.localStorage.setItem(storageKey, String(selectedClassId));
    },
    { storageKey: currentClassStorageKey, selectedClassId: classId }
  );
}

async function openDisplayForClass(page) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await syncCurrentClass(page);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
}

async function loginAdmin(page, request) {
  const { token } = await getAdminAuth(request);
  await page.goto(`${baseUrl}/admin`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    ({ storageKey, adminToken }) => {
      window.localStorage.setItem(storageKey, adminToken);
    },
    { storageKey: adminTokenStorageKey, adminToken: token }
  );
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
}

async function openPetCenter(page) {
  await syncCurrentClass(page);
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTestId('admin-tab-pets').click();
  await page.waitForTimeout(1200);
}

test.setTimeout(120000);

test.beforeAll(() => {
  if (!adminPin) {
    throw new Error('QA_ADMIN_PIN or ADMIN_PIN must be set before running pet QA');
  }
});

test('capture pet UX screenshots and verify ritual flows', async ({ page, request }) => {
  await ensureDir();

  const suffix = Date.now();
  const createdStudentIds = [];

  try {
    const petCatalog = await parseJson(await request.get(`${baseUrl}/api/pets`));
    expect(Array.isArray(petCatalog)).toBeTruthy();
    expect(petCatalog.length).toBeGreaterThanOrEqual(40);
    expect(petCatalog.some((pet) => pet.id >= 20)).toBeTruthy();

    const claimUiStudent = await createStudent(request, `QA-CLAIM-${suffix}`);
    createdStudentIds.push(claimUiStudent.id);
    await updateScore(request, claimUiStudent.id, 20);

    const economyStudent = await createStudent(request, `QA-ECON-${suffix}`);
    createdStudentIds.push(economyStudent.id);
    await claimPet(request, economyStudent.id, 11);
    const noScoreError = await runActionExpectError(request, economyStudent.id, 'feed');
    expect(noScoreError.error).toMatch(/积分/);
    await updateScore(request, economyStudent.id, 12);
    const economyAfterFeed = await runAction(request, economyStudent.id, 'feed');
    expect(economyAfterFeed.score).toBe(8);
    expect(economyAfterFeed.pet_journey.action_costs.feed).toBe(4);
    expect(economyAfterFeed.pet_journey.score_balance).toBe(8);
    expect(economyAfterFeed.pet_journey.is_dormant).toBeFalsy();

    const dormantStudent = await createStudent(request, `QA-DORMANT-${suffix}`);
    createdStudentIds.push(dormantStudent.id);
    await claimPet(request, dormantStudent.id, 12);
    const dormantAfterPenalty = await updateScore(request, dormantStudent.id, -35);
    expect(dormantAfterPenalty.pet_journey.is_dormant).toBeTruthy();
    const dormantError = await runActionExpectError(request, dormantStudent.id, 'feed');
    expect(dormantError.error).toMatch(/沉睡|积分/);

    const hatchStudent = await createStudent(request, `QA-HATCH-${suffix}`);
    createdStudentIds.push(hatchStudent.id);
    await claimPet(request, hatchStudent.id, 10);
    await updateScore(request, hatchStudent.id, 40);
    await runAction(request, hatchStudent.id, 'feed');
    await runAction(request, hatchStudent.id, 'play');

    const evolveStudent = await createStudent(request, `QA-EVOLVE-${suffix}`);
    createdStudentIds.push(evolveStudent.id);
    await claimPet(request, evolveStudent.id, 13);
    await updateScore(request, evolveStudent.id, 430);
    await runAction(request, evolveStudent.id, 'feed');
    await runAction(request, evolveStudent.id, 'play');
    await runAction(request, evolveStudent.id, 'hatch');
    await runAction(request, evolveStudent.id, 'feed');
    await runAction(request, evolveStudent.id, 'play');
    await runAction(request, evolveStudent.id, 'clean');
    await runAction(request, evolveStudent.id, 'feed');
    await runAction(request, evolveStudent.id, 'play');
    await runAction(request, evolveStudent.id, 'clean');

    const multiStudent = await createStudent(request, `QA-MULTI-${suffix}`);
    createdStudentIds.push(multiStudent.id);
    await claimPet(request, multiStudent.id, 10);
    await updateScore(request, multiStudent.id, 520);
    await runAction(request, multiStudent.id, 'feed');
    await runAction(request, multiStudent.id, 'play');
    await runAction(request, multiStudent.id, 'hatch');
    await runAction(request, multiStudent.id, 'feed');
    await runAction(request, multiStudent.id, 'play');
    await runAction(request, multiStudent.id, 'clean');
    await runAction(request, multiStudent.id, 'feed');
    await runAction(request, multiStudent.id, 'play');
    await runAction(request, multiStudent.id, 'clean');
    const evolvedMultiStudent = await runAction(request, multiStudent.id, 'evolve');
    expect(evolvedMultiStudent.pet_capacity).toBeGreaterThanOrEqual(2);

    const multiClaimTwo = await claimPet(request, multiStudent.id, 15);
    expect(multiClaimTwo.pet_total_collected).toBeGreaterThanOrEqual(2);
    const firstSlot = multiClaimTwo.pet_collection.find((slot) => slot.pet_id === 10);
    const secondSlot = multiClaimTwo.pet_collection.find((slot) => slot.pet_id === 15);
    expect(firstSlot).toBeTruthy();
    expect(secondSlot).toBeTruthy();
    expect(secondSlot.is_active).toBeTruthy();

    const switchedBack = await activatePetSlot(request, multiStudent.id, firstSlot.slot_id);
    expect(switchedBack.active_pet_slot_id).toBe(firstSlot.slot_id);
    expect(switchedBack.pet.id).toBe(10);

    await openDisplayForClass(page);
    await saveShot(page, 'display-home.png');

    await page.locator('[data-testid^="student-pet-passport-"]').first().click();
    await page.waitForTimeout(1200);
    await expect(page.getByTestId('pet-profile-modal')).toBeVisible();
    await saveShot(page, 'display-student-profile.png', false);
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(500);
    await saveShot(page, 'display-student-profile-lower.png', false);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    await loginAdmin(page, request);
    await openPetCenter(page);
    await saveShot(page, 'admin-pet-center.png');

    const studentSelect = page.getByTestId('pet-center-student-select');
    await expect(studentSelect).toBeVisible();
    await expect(page.getByTestId('pet-catalog-series-chip-engineering')).toBeVisible();
    await page.getByTestId('pet-catalog-series-chip-engineering').click();
    await expect(page.getByTestId('pet-catalog-series-highlight')).toContainText('工程车萌宠系列');
    await page.getByTestId('pet-catalog-series-chip-all').click();
    await expect(page.getByTestId('pet-catalog-series-highlight')).toContainText('全部系列');

    await studentSelect.selectOption(String(claimUiStudent.id));
    await page.waitForTimeout(900);
    const claimCard = page.getByTestId('pet-catalog-card-10');
    await claimCard.scrollIntoViewIfNeeded();
    await page.getByTestId('pet-catalog-claim-10').click();
    await expect(page.getByTestId('pet-ceremony-overlay')).toBeVisible();
    await page.waitForTimeout(1100);
    await saveShot(page, 'admin-claim-ceremony.png', false);
    await page.getByTestId('ceremony-continue').click();
    await expect(page.getByTestId('pet-profile-modal')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    await expect(page.getByTestId('pet-care-action-cluster')).toBeVisible();
    await expect(page.getByTestId('pet-care-action-cluster')).toContainText('-4 积分');
    await page.getByTestId('pet-action-feed').click();
    await expect(page.getByTestId('pet-hero-action-cue')).toBeVisible();
    await expect(page.getByTestId('pet-action-feedback')).toBeVisible();
    await expect(page.getByTestId('pet-action-feedback')).toContainText('消耗 4 积分');
    await saveShot(page, 'admin-feed-feedback.png', false);
    await page.waitForTimeout(500);

    await studentSelect.selectOption(String(dormantStudent.id));
    await page.waitForTimeout(900);
    await expect(page.getByTestId('pet-care-action-cluster')).toContainText('先赚分，再把它叫醒');
    await saveShot(page, 'admin-dormant-pet-center.png', false);
    await updateScore(request, dormantStudent.id, 50);
    const revivedAfterFeed = await runAction(request, dormantStudent.id, 'feed');
    expect(revivedAfterFeed.pet_journey.is_dormant).toBeFalsy();
    expect(revivedAfterFeed.score).toBe(11);

    await studentSelect.selectOption(String(hatchStudent.id));
    await page.waitForTimeout(900);
    await page.getByTestId('pet-action-hatch').click();
    await expect(page.getByTestId('pet-ceremony-overlay')).toContainText('蛋壳震动点亮');
    await page.waitForTimeout(1200);
    await saveShot(page, 'admin-hatch-ceremony.png', false);
    await page.mouse.click(16, 16);
    await page.waitForTimeout(600);

    await studentSelect.selectOption(String(evolveStudent.id));
    await page.waitForTimeout(900);
    await page.getByTestId('pet-action-evolve').click();
    await expect(page.getByTestId('pet-ceremony-overlay')).toContainText('能量重构升阶');
    await page.waitForTimeout(1300);
    await saveShot(page, 'admin-evolve-ceremony.png', false);
    await page.mouse.click(16, 16);
    await page.waitForTimeout(600);

    await studentSelect.selectOption(String(multiStudent.id));
    await page.waitForTimeout(900);
    await expect(page.getByTestId('pet-center-collection-summary')).toContainText('2/2');
    await expect(page.getByTestId('pet-center-profile-summary-cta')).toBeVisible();
    await page.getByTestId('pet-center-profile-summary-cta').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await saveShot(page, 'admin-multi-pet-collection.png', false);
    await saveShot(page, 'admin-selected-student-ritual.png', false);

    await page.setViewportSize({ width: 1120, height: 900 });
    await loginAdmin(page, request);
    await openPetCenter(page);
    const stableStudentSelect = page.getByTestId('pet-center-student-select');
    await stableStudentSelect.selectOption(String(multiStudent.id));
    await page.waitForTimeout(1500);
    await expect(page.getByTestId('pet-center-collection-summary')).toContainText('2/2');
    await page.waitForTimeout(2400);
    await page.getByTestId('pet-center-hero-stage').screenshot({
      path: path.join(outputDir, 'admin-stable-hero-stage.png')
    });
    await page.getByTestId('pet-care-action-cluster').screenshot({
      path: path.join(outputDir, 'admin-stable-care-cluster.png')
    });
    await page.getByTestId('pet-center-collection-shelf').screenshot({
      path: path.join(outputDir, 'admin-stable-collection-shelf.png')
    });
  } finally {
    for (const studentId of createdStudentIds.reverse()) {
      try {
        await deleteStudent(request, studentId);
      } catch (error) {
        console.error(`cleanup-failed:${studentId}:${error.message}`);
      }
    }
  }
});
