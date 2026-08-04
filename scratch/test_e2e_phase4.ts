import assert from 'node:assert';
import { createHash } from 'node:crypto';
import { sign } from 'hono/jwt';
import { env } from '../src/config/env.config.js';
import { prisma } from '../src/lib/prisma.js';

async function runE2EPhase4Tests() {
  console.log('================================================================');
  console.log('🧪 EMPIRICAL BACKEND END-TO-END TEST SUITE (FASE 4 - DETERMINISTIC MOCK ENGINE MODE)');
  console.log('================================================================\n');

  const baseUrl = `http://localhost:${env.PORT}`;
  let adminToken = '';
  let adminUserId = '';

  // Standard Mock Headers for deterministic test execution
  const mockHeaders = {
    'Content-Type': 'application/json',
    'X-USE-MOCK': 'true',
  };

  // Setup Admin Credentials for Admin Endpoints Test
  const adminUser = await prisma.adminUser.findFirst({ where: { deletedAt: null } });
  if (!adminUser) throw new Error('No admin user found in database');
  adminUserId = adminUser.id;
  adminToken = await sign(
    { sub: adminUser.id, email: adminUser.email, role: 'ADMIN', exp: Math.floor(Date.now() / 1000) + 3600 },
    env.JWT_SECRET
  );

  let testUserId = '';
  let testApiKeyId = '';
  let testRawKey = '';
  let userToken = '';
  const testEmail = `e2e.test.${Date.now()}@example.com`;

  try {
    // ------------------------------------------------------------------
    // SCENARIO 1: REGISTRASI & SALDO AWAL
    // ------------------------------------------------------------------
    console.log('--- SCENARIO 1: REGISTRASI & SALDO AWAL ---');

    // Test 1.1: Register New Partner User (Initial Saldo Rp 5.000 + Key Hash Check)
    console.log('Executing Test 1.1: Register New Partner User...');
    const resReg = await fetch(`${baseUrl}/api/v1/user/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'PT Digital Utama Test',
        email: testEmail,
        password: 'password123',
        companyName: 'PT Digital Utama Test',
      }),
    });

    const regStatus = resReg.status;
    const regJson = await resReg.json();
    assert.strictEqual(regStatus, 201, `Expected HTTP 201 Created, got ${regStatus}`);
    assert.strictEqual(regJson.success, true);
    assert.strictEqual(regJson.data.user.balance, 5000);
    assert.ok(regJson.data.token);
    assert.ok(regJson.data.apiKey.rawKey);

    testUserId = regJson.data.user.id;
    testApiKeyId = regJson.data.apiKey.id;
    testRawKey = regJson.data.apiKey.rawKey;
    userToken = regJson.data.token;

    // Cryptographic SHA-256 Hashing Assertion in DB
    const dbKey = await prisma.apiKey.findUnique({ where: { id: testApiKeyId } });
    assert.ok(dbKey, 'ApiKey record should exist in DB');
    assert.notStrictEqual(dbKey.keyHash, testRawKey, 'rawKey MUST NOT be stored in plaintext in DB');
    const computedHash = createHash('sha256').update(testRawKey).digest('hex');
    assert.strictEqual(dbKey.keyHash, computedHash, 'DB keyHash MUST match computed SHA-256 hash of rawKey');

    // DB Audit Transaction Assertion
    const dbUserReg = await prisma.user.findUnique({
      where: { id: testUserId },
      include: { balanceTransactions: true },
    });
    assert.strictEqual(dbUserReg?.balance, 5000);
    assert.strictEqual(dbUserReg?.balanceTransactions.length, 1);
    assert.strictEqual(dbUserReg?.balanceTransactions[0].type, 'SIGNUP_BONUS');
    assert.strictEqual(dbUserReg?.balanceTransactions[0].amount, 5000);
    console.log('✅ PASS Test 1.1: Register success, rawKey hashed, initial bonus Rp 5.000 verified in DB.');

    // Test 1.2: Duplicate Email Registration Rejection (HTTP 409)
    console.log('\nExecuting Test 1.2: Duplicate Email Registration Rejection...');
    const resDup = await fetch(`${baseUrl}/api/v1/user/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Company',
        email: testEmail, // Same email
        password: 'password123',
      }),
    });
    const dupStatus = resDup.status;
    const dupJson = await resDup.json();
    assert.strictEqual(dupStatus, 409, `Expected HTTP 409 Conflict, got ${dupStatus}`);
    assert.strictEqual(dupJson.error.code, 'DUPLICATE_RESOURCE');

    const userCount = await prisma.user.count({ where: { email: testEmail } });
    assert.strictEqual(userCount, 1, 'DB user count for duplicate email must remain exactly 1');
    console.log('✅ PASS Test 1.2: Duplicate registration rejected with HTTP 409 DUPLICATE_RESOURCE.');

    // ------------------------------------------------------------------
    // SCENARIO 2: ALUR PEMOTONGAN SALDO & RACE CONDITION
    // ------------------------------------------------------------------
    console.log('\n--- SCENARIO 2: ALUR PEMOTONGAN SALDO & RACE CONDITION ---');

    // Test 2.1: Post-Success Validation Hit Deduction (Rp 100)
    console.log('Executing Test 2.1: Post-Success Validation Hit Deduction...');
    const resVal1 = await fetch(`${baseUrl}/api/v1/public/validate-account`, {
      method: 'POST',
      headers: { ...mockHeaders, 'X-API-KEY': testRawKey },
      body: JSON.stringify({ gameCode: 'free-fire', userId: '6526829829' }),
    });

    const val1Status = resVal1.status;
    const val1Json = await resVal1.json();
    assert.strictEqual(val1Status, 200, `Expected HTTP 200 OK, got ${val1Status}`);
    assert.strictEqual(val1Json.success, true);
    assert.strictEqual(val1Json.data.capabilities.nickname, 'MockPlayerOne');

    const dbUserVal1 = await prisma.user.findUnique({
      where: { id: testUserId },
      include: { balanceTransactions: { orderBy: { createdAt: 'desc' } } },
    });
    assert.strictEqual(dbUserVal1?.balance, 4900, 'Balance must be reduced by Rp 100 (5000 -> 4900)');
    assert.strictEqual(dbUserVal1?.balanceTransactions[0].type, 'VALIDATION_DEDUCTION');
    assert.strictEqual(dbUserVal1?.balanceTransactions[0].amount, -100);
    assert.strictEqual(dbUserVal1?.balanceTransactions[0].balanceBefore, 5000);
    assert.strictEqual(dbUserVal1?.balanceTransactions[0].balanceAfter, 4900);
    console.log('✅ PASS Test 2.1: Successful validation deducted Rp 100 & recorded VALIDATION_DEDUCTION transaction.');

    // Test 2.2: Mock Provider Failure (0 Saldo Terpotong)
    console.log('\nExecuting Test 2.2: Mock Provider Failure (0 Saldo Terpotong)...');
    const resValFail = await fetch(`${baseUrl}/api/v1/public/validate-account`, {
      method: 'POST',
      headers: { ...mockHeaders, 'X-API-KEY': testRawKey },
      body: JSON.stringify({ gameCode: 'free-fire', userId: '123456' }), // Triggers mock provider error
    });

    const failStatus = resValFail.status;
    assert.strictEqual(failStatus, 502, `Expected HTTP 502 ALL_PROVIDERS_FAILED for mock failure, got ${failStatus}`);

    const dbUserFail = await prisma.user.findUnique({ where: { id: testUserId } });
    assert.strictEqual(dbUserFail?.balance, 4900, 'Balance must remain UNCHANGED at Rp 4.900 after failed request');
    console.log('✅ PASS Test 2.2: Failed validation hit deducted 0 IDR (Balance remains Rp 4.900).');

    // Test 2.3: Low Balance Rejection (< 100 IDR)
    console.log('\nExecuting Test 2.3: Low Balance Pre-Check Rejection (< Rp 100)...');
    // Set balance to Rp 50
    await prisma.user.update({ where: { id: testUserId }, data: { balance: 50 } });

    const resLowBal = await fetch(`${baseUrl}/api/v1/public/validate-account`, {
      method: 'POST',
      headers: { ...mockHeaders, 'X-API-KEY': testRawKey },
      body: JSON.stringify({ gameCode: 'free-fire', userId: '6526829829' }),
    });
    const lowBalStatus = resLowBal.status;
    const lowBalJson = await resLowBal.json();
    assert.strictEqual(lowBalStatus, 402, `Expected HTTP 402 Payment Required, got ${lowBalStatus}`);
    assert.strictEqual(lowBalJson.error.code, 'INSUFFICIENT_BALANCE');
    console.log('✅ PASS Test 2.3: Low balance (< Rp 100) blocked in middleware with HTTP 402 Payment Required.');

    // Test 2.4: Race Condition (Concurrent Burst 10 Requests on Balance = 100 IDR)
    console.log('\nExecuting Test 2.4: Concurrent Burst (10 Parallel Requests on Balance = Rp 100)...');
    await prisma.user.update({ where: { id: testUserId }, data: { balance: 100 } });

    const burstPromises = Array.from({ length: 10 }).map(() =>
      fetch(`${baseUrl}/api/v1/public/validate-account`, {
        method: 'POST',
        headers: { ...mockHeaders, 'X-API-KEY': testRawKey },
        body: JSON.stringify({ gameCode: 'free-fire', userId: '6526829829' }),
      })
    );

    const burstResponses = await Promise.all(burstPromises);
    const burstStatuses = burstResponses.map((r) => r.status);
    const count200 = burstStatuses.filter((s) => s === 200).length;
    const count402 = burstStatuses.filter((s) => s === 402).length;

    console.log('Burst Statuses Result:', burstStatuses);
    console.log(`Count HTTP 200: ${count200} | Count HTTP 402: ${count402}`);

    assert.strictEqual(count200, 1, 'EXACTLY 1 request must succeed with HTTP 200');
    assert.strictEqual(count402, 9, 'STRICT: EXACTLY 9 requests MUST be rejected with HTTP 402 INSUFFICIENT_BALANCE');

    const dbUserBurst = await prisma.user.findUnique({
      where: { id: testUserId },
      include: { balanceTransactions: true },
    });

    assert.strictEqual(dbUserBurst?.balance, 0, 'Balance must be EXACTLY Rp 0 (NEVER MINUS)');
    const deductLogsCount = dbUserBurst?.balanceTransactions.filter((t) => t.type === 'VALIDATION_DEDUCTION').length;
    assert.strictEqual(deductLogsCount, 2, 'Must have exactly 2 VALIDATION_DEDUCTION logs in total (1 from Test 2.1 + 1 from Burst)');
    console.log('✅ PASS Test 2.4: Race condition resolved atomically! Exactly 1 succeeded (200), 9 rejected (402), balance = Rp 0.');

    // ------------------------------------------------------------------
    // SCENARIO 3: PARTNER API KEY LAMA (userId = null)
    // ------------------------------------------------------------------
    console.log('\n--- SCENARIO 3: PARTNER API KEY LAMA (userId = null) ---');

    // Test 3.1: Legacy Admin Key Total Bypass
    console.log('Executing Test 3.1: Legacy Key Total Bypass...');
    const legacyKey = await prisma.apiKey.findFirst({
      where: { userId: null, isActive: true, deletedAt: null },
    });
    assert.ok(legacyKey, 'Must have at least 1 legacy key with userId = null in DB');

    const resLegacy = await fetch(`${baseUrl}/api/v1/public/validate-account`, {
      method: 'POST',
      headers: { ...mockHeaders, 'X-API-KEY': 'nv_live_testkey12345' },
      body: JSON.stringify({ gameCode: 'free-fire', userId: '6526829829' }),
    });

    assert.strictEqual(resLegacy.status, 200, `Expected HTTP 200 OK for legacy key, got ${resLegacy.status}`);
    console.log('✅ PASS Test 3.1: Legacy partner key (userId = null) bypassed balance check & hit 200 OK.');

    // Test 3.2: Mixed Concurrent Load (10 Legacy Key Requests + 10 User Key Requests)
    console.log('\nExecuting Test 3.2: Mixed Concurrent Load (10 Legacy + 10 User Keys)...');

    // Explicit Balance Reset to Rp 5.000 before Test 3.2
    await prisma.user.update({ where: { id: testUserId }, data: { balance: 5000 } });

    // Restored EXACT 10 Legacy + 10 User Keys Composition as approved
    const mixedLegacyPromises = Array.from({ length: 10 }).map(() =>
      fetch(`${baseUrl}/api/v1/public/validate-account`, {
        method: 'POST',
        headers: { ...mockHeaders, 'X-API-KEY': 'nv_live_testkey12345' },
        body: JSON.stringify({ gameCode: 'free-fire', userId: '6526829829' }),
      })
    );

    const mixedUserPromises = Array.from({ length: 10 }).map(() =>
      fetch(`${baseUrl}/api/v1/public/validate-account`, {
        method: 'POST',
        headers: { ...mockHeaders, 'X-API-KEY': testRawKey },
        body: JSON.stringify({ gameCode: 'free-fire', userId: '6526829829' }),
      })
    );

    const [legacyRes, userRes] = await Promise.all([
      Promise.all(mixedLegacyPromises),
      Promise.all(mixedUserPromises),
    ]);

    const legacyStatuses = legacyRes.map((r) => r.status);
    const userStatuses = userRes.map((r) => r.status);

    console.log('Legacy Key Request Statuses (10 Total):', legacyStatuses);
    console.log('User Key Request Statuses (10 Total):', userStatuses);

    // Print error details for any failed requests
    for (let i = 0; i < userRes.length; i++) {
      if (userRes[i].status !== 200) {
        const errJson = await userRes[i].json().catch(() => ({}));
        console.error(`User Key Request #${i + 1} Failed with status ${userRes[i].status}:`, errJson);
      }
    }

    // STRICT Assertions: Legacy keys MUST ALWAYS return 200 OK 100% of the time!
    assert.ok(legacyStatuses.every((s) => s === 200), 'STRICT: All 10 legacy key requests MUST return HTTP 200 OK');
    assert.ok(userStatuses.every((s) => s === 200), 'STRICT: All 10 user key requests MUST return HTTP 200 OK');

    const dbUserMixed = await prisma.user.findUnique({ where: { id: testUserId } });
    assert.strictEqual(dbUserMixed?.balance, 4000, 'User balance must be EXACTLY Rp 4.000 (5000 - 10*100)');
    console.log(`✅ PASS Test 3.2: Mixed concurrent load verified! Legacy 10/10 200 OK, User 10/10 200 OK, DB balance = Rp ${dbUserMixed?.balance}.`);

    // ------------------------------------------------------------------
    // SCENARIO 4: TOP UP MANUAL ADMIN
    // ------------------------------------------------------------------
    console.log('\n--- SCENARIO 4: TOP UP MANUAL ADMIN ---');

    // Test 4.1: Admin Approve Top-Up Manual
    console.log('Executing Test 4.1: Admin Approve Top-Up Manual...');
    const resTopup = await fetch(`${baseUrl}/api/v1/admin/users/${testUserId}/topup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        amount: 15000,
        description: 'Top-up manual via TF Mandiri',
        referenceNo: 'MANDIRI-88192',
      }),
    });

    const topupStatus = resTopup.status;
    const topupJson = await resTopup.json();
    assert.strictEqual(topupStatus, 200, `Expected HTTP 200 OK, got ${topupStatus}`);
    assert.strictEqual(topupJson.data.user.balanceAfter, 19000); // 4000 + 15000

    const dbUserTopup = await prisma.user.findUnique({
      where: { id: testUserId },
      include: { balanceTransactions: { orderBy: { createdAt: 'desc' } } },
    });

    assert.strictEqual(dbUserTopup?.balance, 19000);
    assert.strictEqual(dbUserTopup?.balanceTransactions[0].type, 'MANUAL_TOPUP_ADMIN');
    assert.strictEqual(dbUserTopup?.balanceTransactions[0].amount, 15000);
    assert.strictEqual(dbUserTopup?.balanceTransactions[0].balanceBefore, 4000);
    assert.strictEqual(dbUserTopup?.balanceTransactions[0].balanceAfter, 19000);
    console.log('✅ PASS Test 4.1: Admin manual top-up credited Rp 15.000, balance updated from Rp 4.000 to Rp 19.000.');

    // Test 4.2: Non-Admin Rejection (HTTP 403)
    console.log('\nExecuting Test 4.2: Non-Admin Top-Up Rejection (HTTP 403)...');
    const resTopupForbidden = await fetch(`${baseUrl}/api/v1/admin/users/${testUserId}/topup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userToken}` }, // User token
      body: JSON.stringify({ amount: 10000 }),
    });

    assert.strictEqual(resTopupForbidden.status, 403, `Expected HTTP 403 Forbidden, got ${resTopupForbidden.status}`);
    console.log('✅ PASS Test 4.2: Non-admin user token rejected with HTTP 403 FORBIDDEN.');

    // Test 4.3: Invalid Nominal Top-Up Rejection (HTTP 400)
    console.log('\nExecuting Test 4.3: Invalid Nominal Top-Up Rejection (HTTP 400)...');
    const resTopupInvalid = await fetch(`${baseUrl}/api/v1/admin/users/${testUserId}/topup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ amount: -5000 }), // Negative amount
    });

    assert.strictEqual(resTopupInvalid.status, 400, `Expected HTTP 400 Bad Request, got ${resTopupInvalid.status}`);
    console.log('✅ PASS Test 4.3: Invalid negative top-up nominal rejected with HTTP 400.');

    // ------------------------------------------------------------------
    // SCENARIO 5: AUTH & MIDDLEWARE SECURITY BOUNDARY
    // ------------------------------------------------------------------
    console.log('\n--- SCENARIO 5: AUTH & MIDDLEWARE SECURITY BOUNDARY ---');

    // Test 5.1: Invalid / Expired / Missing Token Rejection (HTTP 401)
    console.log('Executing Test 5.1: Invalid / Missing Token Rejection (HTTP 401)...');
    const resNoToken = await fetch(`${baseUrl}/api/v1/user/me`, { method: 'GET' });
    assert.strictEqual(resNoToken.status, 401, `Expected HTTP 401 Unauthorized, got ${resNoToken.status}`);

    const resInvalidToken = await fetch(`${baseUrl}/api/v1/user/me`, {
      method: 'GET',
      headers: { Authorization: 'Bearer fake-invalid-jwt-token-string' },
    });
    assert.strictEqual(resInvalidToken.status, 401, `Expected HTTP 401 Unauthorized, got ${resInvalidToken.status}`);
    console.log('✅ PASS Test 5.1: Missing & invalid tokens blocked with HTTP 401 UNAUTHORIZED.');

    // Test 5.2: Role Guard Boundary Enforcement (User Token accessing Admin API)
    console.log('\nExecuting Test 5.2: Role Guard Boundary Enforcement...');
    const resRoleGuard = await fetch(`${baseUrl}/api/v1/admin/api-keys`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${userToken}` },
    });
    assert.strictEqual(resRoleGuard.status, 403, `Expected HTTP 403 Forbidden, got ${resRoleGuard.status}`);
    console.log('✅ PASS Test 5.2: Partner User token blocked from accessing Admin endpoints with HTTP 403 FORBIDDEN.');

    console.log('\n================================================================');
    console.log('🎉 ALL FASE 4 E2E TEST SCENARIOS PASSED EMPIRICALLY WITH 100% SUCCESS!');
    console.log('================================================================\n');
  } finally {
    // ------------------------------------------------------------------
    // CLEANUP PROTOCOL
    // ------------------------------------------------------------------
    if (testUserId) {
      console.log('Cleaning up test data from DB...');
      if (testApiKeyId) {
        await prisma.validationLog.deleteMany({ where: { apiKeyId: testApiKeyId } });
      }
      await prisma.balanceTransaction.deleteMany({ where: { userId: testUserId } });
      await prisma.apiKey.deleteMany({ where: { userId: testUserId } });
      await prisma.user.deleteMany({ where: { id: testUserId } });
      console.log('Cleanup completed cleanly.');
    }
    await prisma.$disconnect();
  }
}

runE2EPhase4Tests().catch((err) => {
  console.error('\n❌ E2E TEST SUITE FAILED:', err);
  process.exit(1);
});
