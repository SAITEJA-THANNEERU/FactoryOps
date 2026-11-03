// Automated RBAC & Security Test Suite for FactoryOps
// Tests all 5 roles against backend endpoints, RLS principles, segregation of duties, and audit logs.

interface TestResult {
  category: string;
  testCase: string;
  role: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  notes: string;
}

const results: TestResult[] = [];
const BASE_URL = 'http://localhost:3000';

async function loginUser(email: string, password: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      console.error(`Login failed for ${email}: ${res.status}`);
      return null;
    }
    const data = await res.json();
    return data.token;
  } catch (err: any) {
    console.error(`Login error for ${email}:`, err.message);
    return null;
  }
}

async function runTest(
  category: string,
  testCase: string,
  role: string,
  token: string | null,
  method: string,
  endpoint: string,
  expectedStatus: number,
  body?: any,
  validateResponse?: (data: any) => boolean
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      // response might not be json
    }

    let passed = res.status === expectedStatus;
    if (passed && validateResponse && data) {
      passed = validateResponse(data);
    }

    results.push({
      category,
      testCase,
      role,
      expectedStatus,
      actualStatus: res.status,
      passed,
      notes: passed ? 'Verified' : `Unexpected result: status ${res.status}, body: ${JSON.stringify(data)?.slice(0, 100)}`
    });

    console.log(`[${passed ? 'PASS' : 'FAIL'}] [${role}] ${testCase} -> Status: ${res.status} (Expected: ${expectedStatus})`);
  } catch (err: any) {
    results.push({
      category,
      testCase,
      role,
      expectedStatus,
      actualStatus: 0,
      passed: false,
      notes: `Fetch error: ${err.message}`
    });
    console.log(`[FAIL] [${role}] ${testCase} -> Fetch error: ${err.message}`);
  }
}

async function main() {
  console.log('=== STARTING FACTORYOPS SECURITY & RBAC VERIFICATION SUITE ===\n');

  // Test accounts with passwords
  const superAdminToken = await loginUser('superadmin@factoryops.com', 'SuperAdmin@123');
  const adminToken = await loginUser('admin.apex@factoryops.com', 'Admin@123');
  const managerToken = await loginUser('manager.apex@factoryops.com', 'Manager@123');
  const plannerToken = await loginUser('planner.apex@factoryops.com', 'Planner@123');
  const techToken = await loginUser('tech.apex@factoryops.com', 'Tech@123');

  if (!superAdminToken || !adminToken || !managerToken || !plannerToken || !techToken) {
    console.error('Failed to obtain auth tokens for all roles. Aborting.');
    process.exit(1);
  }
  console.log('All 5 roles successfully authenticated.\n');

  // 2. Unauthenticated Access Protection (Phase 2)
  console.log('--- Phase 2: Unauthenticated Access Tests ---');
  await runTest('Authentication', 'Unauthenticated request to /api/machines', 'Anonymous', null, 'GET', '/api/machines', 401);
  await runTest('Authentication', 'Unauthenticated request to /api/work-orders', 'Anonymous', null, 'GET', '/api/work-orders', 401);
  await runTest('Authentication', 'Unauthenticated request to /api/audit-logs', 'Anonymous', null, 'GET', '/api/audit-logs', 401);

  // 3. Super Admin Role Permissions (Phase 3)
  console.log('\n--- Phase 3: Super Admin Role Permissions ---');
  await runTest('RBAC - Super Admin', 'Access multi-factory overview', 'Super Admin', superAdminToken, 'GET', '/api/super-admin/overview', 200);
  await runTest('RBAC - Super Admin', 'Access all enterprise factories', 'Super Admin', superAdminToken, 'GET', '/api/factories', 200);
  await runTest('RBAC - Super Admin', 'Access system audit logs', 'Super Admin', superAdminToken, 'GET', '/api/audit-logs', 200);
  await runTest('RBAC - Super Admin', 'Access data quality governance', 'Super Admin', superAdminToken, 'GET', '/api/data-quality', 200);

  // 4. Admin Role Permissions (Phase 4)
  console.log('\n--- Phase 4: Admin Role Permissions ---');
  await runTest('RBAC - Admin', 'Access assigned factory machines', 'Admin', adminToken, 'GET', '/api/machines', 200);
  await runTest('RBAC - Admin', 'Access system audit logs', 'Admin', adminToken, 'GET', '/api/audit-logs', 200);
  await runTest('RBAC - Admin', 'Access data quality dashboard', 'Admin', adminToken, 'GET', '/api/data-quality', 200);
  await runTest('RBAC - Admin', 'Access user management list', 'Admin', adminToken, 'GET', '/api/users', 200);
  await runTest('RBAC - Admin', 'Create new machine asset', 'Admin', adminToken, 'POST', '/api/machines', 201, {
    name: 'SecTest CNC 900',
    machine_id: 'TEST-M900',
    line: 'Bay 1',
    type: 'CNC',
    status: 'running'
  });

  // 5. Manager/Supervisor Role Permissions (Phase 5)
  console.log('\n--- Phase 5: Manager/Supervisor Role Permissions ---');
  await runTest('RBAC - Manager', 'Access system audit logs', 'Manager', managerToken, 'GET', '/api/audit-logs', 200);
  await runTest('RBAC - Manager', 'Create work order', 'Manager', managerToken, 'POST', '/api/work-orders', 201, {
    title: 'SecTest Preventative Lube',
    machine_id: 'M001',
    priority: 'Medium',
    assigned_to: 'Ramesh Varma'
  });
  await runTest('RBAC - Manager', 'Attempt delete machine (Forbidden)', 'Manager', managerToken, 'DELETE', '/api/machines/TEST-M900', 403);
  await runTest('RBAC - Manager', 'Attempt delete production record (Forbidden)', 'Manager', managerToken, 'DELETE', '/api/production/PRD-001', 403);
  await runTest('RBAC - Manager', 'Attempt access data quality (Forbidden)', 'Manager', managerToken, 'GET', '/api/data-quality', 403);

  // 6. Production Planner Role Permissions (Phase 6)
  console.log('\n--- Phase 6: Production Planner Role Permissions ---');
  await runTest('RBAC - Planner', 'Read production records', 'Production Planner', plannerToken, 'GET', '/api/production', 200);
  await runTest('RBAC - Planner', 'Log shift output', 'Production Planner', plannerToken, 'POST', '/api/production', 201, {
    machine_id: 'M001',
    product_name: 'Precision Shaft A1',
    shift: 'Morning',
    units_produced: 120,
    target_units: 150,
    defect_units: 2,
    operator: 'Priya Sharma'
  });
  await runTest('RBAC - Planner', 'Attempt create work order (Forbidden)', 'Production Planner', plannerToken, 'POST', '/api/work-orders', 403, {
    title: 'Illegal WO',
    machine_id: 'M001'
  });
  await runTest('RBAC - Planner', 'Attempt report incident (Forbidden)', 'Production Planner', plannerToken, 'POST', '/api/incidents', 403, {
    title: 'Illegal Incident',
    machine_id: 'M001'
  });
  await runTest('RBAC - Planner', 'Attempt access audit logs (Forbidden)', 'Production Planner', plannerToken, 'GET', '/api/audit-logs', 403);
  await runTest('RBAC - Planner', 'Attempt access data quality (Forbidden)', 'Production Planner', plannerToken, 'GET', '/api/data-quality', 403);
  await runTest('RBAC - Planner', 'Attempt delete production record (Forbidden)', 'Production Planner', plannerToken, 'DELETE', '/api/production/PRD-001', 403);

  // 7. Technician Role Permissions & Segregation of Duties (Phase 7)
  console.log('\n--- Phase 7: Technician Role Permissions & Segregation of Duties ---');
  await runTest('RBAC - Technician', 'Read assigned work orders', 'Technician', techToken, 'GET', '/api/work-orders', 200);
  await runTest('RBAC - Technician', 'Attempt create work order (Forbidden)', 'Technician', techToken, 'POST', '/api/work-orders', 403, {
    title: 'Technician Unauthorized WO',
    machine_id: 'M001'
  });
  await runTest('RBAC - Technician', 'Attempt delete machine (Forbidden)', 'Technician', techToken, 'DELETE', '/api/machines/M001', 403);
  await runTest('RBAC - Technician', 'Attempt delete spare part (Forbidden)', 'Technician', techToken, 'DELETE', '/api/inventory/PART-001', 403);
  await runTest('RBAC - Technician', 'Attempt access audit logs (Forbidden)', 'Technician', techToken, 'GET', '/api/audit-logs', 403);
  await runTest('RBAC - Technician', 'Attempt access data quality (Forbidden)', 'Technician', techToken, 'GET', '/api/data-quality', 403);

  // 8. Workflow Lifecycle & Segregation of Duties Tests
  console.log('\n--- Phase 8: Workflow Lifecycle & Segregation of Duties ---');
  // Manager creates assignment
  let testAssignmentId = '';
  try {
    const res = await fetch(`${BASE_URL}/api/technician-assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${managerToken}`
      },
      body: JSON.stringify({
        incident_id: 'INC-2026-9999',
        incident_title: 'Spindle Bearing Thermal Vibration Test',
        technician_id: 'TECH-001',
        technician_name: 'Ramesh Varma',
        priority: 'High',
        identified_issue: 'Thermal expansion on bearing'
      })
    });
    if (res.ok) {
      const data = await res.json();
      testAssignmentId = data.id;
      console.log(`Created test assignment: ${testAssignmentId} (Status: ${data.status})`);
    }
  } catch (e: any) {
    console.error('Failed to create test assignment:', e.message);
  }

  if (testAssignmentId) {
    // Test: Start repair directly from PENDING ACCEPTANCE (Should Fail: 400 - must accept first)
    await runTest('Workflow State Transition', 'Attempt start repair before accepting', 'Technician', techToken, 'POST', `/api/technician-assignments/${testAssignmentId}/start-repair`, 400);

    // Test: Technician accepts assignment
    await runTest('Workflow State Transition', 'Technician accepts assignment', 'Technician', techToken, 'POST', `/api/technician-assignments/${testAssignmentId}/accept`, 200, {
      notes: 'Accepted test assignment'
    });

    // Test: Re-accepting already accepted assignment (Should Fail: 400)
    await runTest('Workflow State Transition', 'Attempt accepting already accepted assignment', 'Technician', techToken, 'POST', `/api/technician-assignments/${testAssignmentId}/accept`, 400);

    // Test: Technician starts repair
    await runTest('Workflow State Transition', 'Technician begins repair', 'Technician', techToken, 'POST', `/api/technician-assignments/${testAssignmentId}/start-repair`, 200, {
      notes: 'LOTO verified and spindle disassembled'
    });

    // Test: Log progress update
    await runTest('Workflow State Transition', 'Log progress update', 'Technician', techToken, 'POST', `/api/technician-assignments/${testAssignmentId}/progress-update`, 200, {
      progress_percent: 60,
      diagnosis_notes: 'Replaced bearing set, torque test pending'
    });

    // Test: Manager attempts to verify before resolution submission (Should Fail: 400)
    await runTest('Workflow State Transition', 'Manager attempt verify before resolution submission', 'Manager', managerToken, 'POST', `/api/technician-assignments/${testAssignmentId}/verify`, 400, {
      decision: 'APPROVE',
      quality_rating: 5
    });

    // Test: Technician submits resolution
    await runTest('Workflow State Transition', 'Technician submits resolution', 'Technician', techToken, 'POST', `/api/technician-assignments/${testAssignmentId}/resolve`, 200, {
      confirmed_root_cause: 'Thermal overload',
      actions_taken: 'Replaced bearing SKF-7014 and balanced spindle',
      actual_repair_hours: 2.5
    });

    // Test: Segregation of Duties - Technician attempts to verify and approve their own repair (Should Fail: 403)
    await runTest('Segregation of Duties', 'Technician attempts to sign off own repair', 'Technician', techToken, 'POST', `/api/technician-assignments/${testAssignmentId}/verify`, 403, {
      decision: 'APPROVE',
      quality_rating: 5
    });

    // Test: Manager verifies and approves resolution
    await runTest('Workflow State Transition', 'Manager inspects and approves resolution', 'Manager', managerToken, 'POST', `/api/technician-assignments/${testAssignmentId}/verify`, 200, {
      decision: 'APPROVE',
      verification_notes: 'Runout checked with dial indicator: 1.5 microns. Approved.',
      quality_rating: 5
    });

    // Test: Verify again after closed (Should Fail: 400)
    await runTest('Workflow State Transition', 'Attempt verifying already VERIFIED assignment', 'Manager', managerToken, 'POST', `/api/technician-assignments/${testAssignmentId}/verify`, 400, {
      decision: 'APPROVE'
    });
  }

  // 9. Centralized Audit Log Verification (Phase 9)
  console.log('\n--- Phase 9: Centralized Audit Log Verification ---');
  try {
    const auditRes = await fetch(`${BASE_URL}/api/audit-logs`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const logs = await auditRes.json();
    const hasAuthLogs = logs.some((l: any) => l.action === 'LOGIN_SUCCESS');
    const hasForbiddenLogs = logs.some((l: any) => l.action === 'UNAUTHORIZED_ACCESS_ATTEMPT');
    const hasWorkflowLogs = logs.some((l: any) => l.action === 'ASSIGN_TECHNICIAN' || l.action === 'VERIFY_RESOLUTION');

    console.log(`Total Audit Log Entries: ${logs.length}`);
    console.log(`- Contains LOGIN_SUCCESS: ${hasAuthLogs}`);
    console.log(`- Contains UNAUTHORIZED_ACCESS_ATTEMPT: ${hasForbiddenLogs}`);
    console.log(`- Contains Workflow Events: ${hasWorkflowLogs}`);

    results.push({
      category: 'Audit Logging',
      testCase: 'Audit Log contains authentication events',
      role: 'Admin',
      expectedStatus: 200,
      actualStatus: 200,
      passed: hasAuthLogs,
      notes: hasAuthLogs ? 'LOGIN_SUCCESS logged' : 'Missing login audit logs'
    });

    results.push({
      category: 'Audit Logging',
      testCase: 'Audit Log records unauthorized access attempts',
      role: 'Admin',
      expectedStatus: 200,
      actualStatus: 200,
      passed: hasForbiddenLogs,
      notes: hasForbiddenLogs ? 'UNAUTHORIZED_ACCESS_ATTEMPT captured' : 'Missing unauthorized access logs'
    });

    results.push({
      category: 'Audit Logging',
      testCase: 'Audit Log captures workflow assignment and verification',
      role: 'Admin',
      expectedStatus: 200,
      actualStatus: 200,
      passed: hasWorkflowLogs,
      notes: hasWorkflowLogs ? 'Workflow milestones captured' : 'Missing workflow audit logs'
    });
  } catch (err: any) {
    console.error('Audit verification failed:', err.message);
  }

  // Summary
  console.log('\n=== TEST EXECUTION SUMMARY ===');
  const total = results.length;
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = total - passedCount;
  console.log(`Total Tests Run: ${total}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Pass Rate: ${((passedCount / total) * 100).toFixed(1)}%\n`);

  if (failedCount > 0) {
    console.log('Failed Tests:');
    results.filter(r => !r.passed).forEach(f => {
      console.log(`- [${f.role}] ${f.testCase}: Expected ${f.expectedStatus}, got ${f.actualStatus} (${f.notes})`);
    });
    process.exit(1);
  } else {
    console.log('ALL SECURITY & RBAC TESTS PASSED SUCCESSFULLY!');
  }
}

main().catch(err => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
});
