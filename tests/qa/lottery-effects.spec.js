const { test, expect } = require('@playwright/test');

const baseUrl = process.env.QA_BASE_URL || 'http://localhost:3001';
const classId = 8;
const adminPin = process.env.QA_ADMIN_PIN || process.env.ADMIN_PIN || '';
let adminHeadersPromise = null;

async function parseJson(response) {
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`API ${response.url()} failed: ${response.status()} ${body}`);
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

async function createTeam(request, name) {
  const headers = await getAdminHeaders(request);
  return parseJson(
    await request.post(`${baseUrl}/api/teams`, {
      headers,
      data: {
        name,
        class_id: classId,
        color: '#4F46E5'
      }
    })
  );
}

async function deleteTeam(request, teamId) {
  const headers = await getAdminHeaders(request);
  await request.delete(`${baseUrl}/api/teams/${teamId}`, { headers });
}

async function createStudent(request, name, teamId = null) {
  const headers = await getAdminHeaders(request);
  return parseJson(
    await request.post(`${baseUrl}/api/students`, {
      headers,
      data: {
        name,
        class_id: classId,
        team_id: teamId,
        avatar: 'QA'
      }
    })
  );
}

async function deleteStudent(request, studentId) {
  const headers = await getAdminHeaders(request);
  await request.delete(`${baseUrl}/api/students/${studentId}`, { headers });
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

async function executeLottery(request, payload) {
  const headers = await getAdminHeaders(request);
  return parseJson(
    await request.post(`${baseUrl}/api/lottery/execute`, {
      headers,
      data: payload
    })
  );
}

test.beforeAll(() => {
  if (!adminPin) {
    throw new Error('QA_ADMIN_PIN or ADMIN_PIN must be set before running lottery QA');
  }
});

test('lottery execution applies score and pet cultivation effects for student and team targets', async ({ request }) => {
  const suffix = Date.now();
  const createdStudentIds = [];
  const createdTeamIds = [];

  try {
    const studentName = `QLS${suffix}`;
    const teamName = `QLT${suffix}`.slice(0, 20);
    const teamStudentName = `QLM${suffix}`;
    const petCatalog = await parseJson(await request.get(`${baseUrl}/api/pets`));
    const rewards = await parseJson(await request.get(`${baseUrl}/api/rewards`));
    const punishments = await parseJson(await request.get(`${baseUrl}/api/punishments`));

    expect(rewards.length).toBeGreaterThanOrEqual(26);
    expect(punishments.length).toBeGreaterThanOrEqual(33);

    const engineeringPet = petCatalog.find((pet) => pet.name === '铲铲工程喵') || petCatalog.find((pet) => pet.id >= 25);
    expect(engineeringPet).toBeTruthy();

    const studentReward = rewards.find((item) => item.name === '工程喵加餐包');
    const bonusSlotReward = rewards.find((item) => item.name === '神秘宠物蛋入场券');
    const teamReward = rewards.find((item) => item.name === '机甲能量芯片');
    const teamPunishment = punishments.find((item) => item.name === '电量告急');

    expect(studentReward?.score_delta).toBeGreaterThan(0);
    expect(bonusSlotReward?.pet_bonus_slot_delta).toBe(1);
    expect(studentReward?.pet_growth_delta).toBeGreaterThan(0);
    expect(teamReward?.pet_growth_delta).toBeGreaterThan(0);
    expect(teamPunishment?.score_delta).toBeLessThan(0);

    const student = await createStudent(request, studentName);
    createdStudentIds.push(student.id);
    await claimPet(request, student.id, engineeringPet.id);

    const studentResult = await executeLottery(request, {
      class_id: classId,
      target_type: 'student',
      target_id: student.id,
      type: 'reward',
      item_id: studentReward.id
    });

    expect(studentResult.success).toBeTruthy();
    expect(studentResult.log.target_type).toBe('student');
    expect(studentResult.log.target_name).toBe(studentName);
    expect(studentResult.log.score_delta).toBe(studentReward.score_delta);
    expect(studentResult.log.pet_growth_delta).toBe(studentReward.pet_growth_delta);
    expect(studentResult.log.effect_summary).toContain('学员积分');
    expect(studentResult.log.effect_summary).toContain('宠物成长');
    expect(studentResult.student.score).toBe(studentReward.score_delta);
    expect(studentResult.student.pet_bonus_growth).toBe(studentReward.pet_growth_delta);
    expect(studentResult.student.pet_journey.growth_from_bonus).toBe(studentReward.pet_growth_delta);
    expect(studentResult.student.pet_journey.growth_value).toBe(
      studentReward.score_delta + studentReward.pet_growth_delta
    );

    const bonusSlotResult = await executeLottery(request, {
      class_id: classId,
      target_type: 'student',
      target_id: student.id,
      type: 'reward',
      item_id: bonusSlotReward.id
    });

    expect(bonusSlotResult.success).toBeTruthy();
    expect(bonusSlotResult.log.pet_bonus_slot_delta).toBe(1);
    expect(bonusSlotResult.log.effect_summary).toContain('宠物位 +1');
    expect(bonusSlotResult.student.pet_capacity).toBe(2);
    expect(bonusSlotResult.student.can_claim_more_pets).toBeTruthy();

    const team = await createTeam(request, teamName);
    createdTeamIds.push(team.id);
    const teamStudent = await createStudent(request, teamStudentName, team.id);
    createdStudentIds.push(teamStudent.id);
    await claimPet(request, teamStudent.id, engineeringPet.id);

    const teamRewardResult = await executeLottery(request, {
      class_id: classId,
      target_type: 'team',
      target_id: team.id,
      type: 'reward',
      item_id: teamReward.id
    });

    expect(teamRewardResult.success).toBeTruthy();
    expect(teamRewardResult.log.target_type).toBe('team');
    expect(teamRewardResult.log.target_name).toBe(teamName);
    expect(teamRewardResult.log.pet_affected_count).toBeGreaterThanOrEqual(1);
    expect(teamRewardResult.log.effect_summary).toContain('战队积分');
    expect(teamRewardResult.log.effect_summary).toContain('已影响');
    expect(teamRewardResult.team.score).toBe(teamReward.score_delta);

    const studentsAfterReward = await parseJson(await request.get(`${baseUrl}/api/classes/${classId}/students`));
    const teamStudentAfterReward = studentsAfterReward.find((item) => item.id === teamStudent.id);
    expect(teamStudentAfterReward).toBeTruthy();
    expect(teamStudentAfterReward.pet_bonus_growth).toBe(teamReward.pet_growth_delta);
    expect(teamStudentAfterReward.pet_journey.growth_from_bonus).toBe(teamReward.pet_growth_delta);
    expect(teamStudentAfterReward.score).toBe(0);

    const teamPunishmentResult = await executeLottery(request, {
      class_id: classId,
      target_type: 'team',
      target_id: team.id,
      type: 'punishment',
      item_id: teamPunishment.id
    });

    expect(teamPunishmentResult.success).toBeTruthy();
    expect(teamPunishmentResult.log.score_delta).toBe(teamPunishment.score_delta);
    expect(teamPunishmentResult.log.effect_summary).toContain('战队积分');
    expect(teamPunishmentResult.team.score).toBe(teamReward.score_delta + teamPunishment.score_delta);

    const headers = await getAdminHeaders(request);
    const lotteryLogs = await parseJson(
      await request.get(`${baseUrl}/api/classes/${classId}/lottery-logs?type=reward`, { headers })
    );
    expect(lotteryLogs.some((log) => log.id === studentResult.log.id && log.effect_summary.includes('宠物成长'))).toBeTruthy();
    expect(lotteryLogs.some((log) => log.id === teamRewardResult.log.id && log.target_name === teamName)).toBeTruthy();
  } finally {
    for (const studentId of createdStudentIds.reverse()) {
      await deleteStudent(request, studentId).catch(() => {});
    }

    for (const teamId of createdTeamIds.reverse()) {
      await deleteTeam(request, teamId).catch(() => {});
    }
  }
});
