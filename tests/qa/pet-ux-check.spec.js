const { test, expect } = require('@playwright/test');
const path = require('node:path');
const fs = require('node:fs');

const baseUrl = 'http://localhost:3001';
const classId = 8;
const adminPin = '980116';
const outputDir = path.join(process.cwd(), '.tmp', 'qa', 'screenshots');

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

async function createStudent(request, name) {
  return parseJson(
    await request.post(`${baseUrl}/api/students`, {
      data: {
        name,
        class_id: classId,
        avatar: 'QA'
      }
    })
  );
}

async function updateScore(request, studentId, delta) {
  return parseJson(
    await request.patch(`${baseUrl}/api/students/${studentId}/score`, {
      data: { delta, reason: 'QA ritual verification' }
    })
  );
}

async function claimPet(request, studentId, petId) {
  return parseJson(
    await request.post(`${baseUrl}/api/students/${studentId}/claim-pet`, {
      data: { pet_id: petId, overwrite: true }
    })
  );
}

async function activatePetSlot(request, studentId, slotId) {
  return parseJson(
    await request.post(`${baseUrl}/api/students/${studentId}/pet-slots/${slotId}/activate`)
  );
}

async function runAction(request, studentId, action) {
  return parseJson(await request.post(`${baseUrl}/api/students/${studentId}/pet/${action}`));
}

async function deleteStudent(request, studentId) {
  await request.delete(`${baseUrl}/api/students/${studentId}`);
}

async function selectClass(page) {
  await page.getByRole('button', { name: /python-2/i }).first().click();
  await page.waitForTimeout(1200);
}

async function loginAdmin(page) {
  await page.goto(`${baseUrl}/admin`, { waitUntil: 'networkidle' });
  await page.locator('input[type="password"]').fill(adminPin);
  await page.locator('button[type="submit"]').click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(900);
}

async function openPetCenter(page) {
  await selectClass(page);
  await page.getByTestId('admin-tab-pets').click();
  await page.waitForTimeout(1200);
}

test.setTimeout(120000);

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

    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await selectClass(page);
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

    await loginAdmin(page);
    await openPetCenter(page);
    await saveShot(page, 'admin-pet-center.png');

    const studentSelect = page.getByTestId('pet-center-student-select');
    await expect(studentSelect).toBeVisible();

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

    await studentSelect.selectOption(String(hatchStudent.id));
    await page.waitForTimeout(900);
    await page.getByTestId('pet-action-hatch').click();
    await page.waitForTimeout(1200);
    await saveShot(page, 'admin-hatch-ceremony.png', false);
    await page.mouse.click(16, 16);
    await page.waitForTimeout(600);

    await studentSelect.selectOption(String(evolveStudent.id));
    await page.waitForTimeout(900);
    await page.getByTestId('pet-action-evolve').click();
    await page.waitForTimeout(1300);
    await saveShot(page, 'admin-evolve-ceremony.png', false);
    await page.mouse.click(16, 16);
    await page.waitForTimeout(600);

    await studentSelect.selectOption(String(multiStudent.id));
    await page.waitForTimeout(900);
    await expect(page.getByTestId('pet-center-collection-summary')).toContainText('2/2');
    await expect(page.getByText(/Teacher Script/)).toBeVisible();
    await page.getByText(/Teacher Script/).scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await saveShot(page, 'admin-multi-pet-collection.png', false);
    await saveShot(page, 'admin-selected-student-ritual.png', false);
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
