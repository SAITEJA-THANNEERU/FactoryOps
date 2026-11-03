import dotenv from 'dotenv';
dotenv.config({ override: true });

import { supabaseAdapter, testSupabaseConnection, getDetailedSystemStatus } from '../server/supabase.ts';
import { db } from '../server/db.ts';

async function verifySyncFlow() {
  console.log('--- FACTORYOPS SUPABASE SYNC FLOW VERIFICATION ---');

  // 1. Initial Status Check
  console.log('\n1. Testing Supabase Connection & Health Check...');
  const initialStatus = await testSupabaseConnection();
  console.log('Status Result:', {
    isHealthy: initialStatus.isHealthy,
    hasServiceRoleKey: initialStatus.hasServiceRoleKey,
    counts: initialStatus.counts,
    error: initialStatus.error
  });

  // 2. Perform Full Data Sync
  console.log('\n2. Syncing Local In-Memory / Persistent Data to Supabase Cloud...');
  const syncResult = await supabaseAdapter.syncAllToSupabase();
  console.log('Sync Result:', syncResult);

  // 3. Re-test Status after Sync
  console.log('\n3. Re-testing Supabase Connection & Health Check post-sync...');
  const postSyncStatus = await testSupabaseConnection();
  console.log('Post-Sync Status:', {
    isHealthy: postSyncStatus.isHealthy,
    hasServiceRoleKey: postSyncStatus.hasServiceRoleKey,
    counts: postSyncStatus.counts,
    error: postSyncStatus.error
  });

  // 4. Verify System Status Object
  console.log('\n4. System Status Summary:');
  console.log(getDetailedSystemStatus());

  // 5. Test Write & Read on Specific Table
  console.log('\n5. Testing Live CRUD operations via Supabase Adapter...');
  const testMachine = {
    id: `MAC-TEST-${Date.now()}`,
    machine_id: `MAC-TEST-${Date.now()}`,
    factory_id: 'FAC-001',
    name: 'Sync Test Machine',
    machine_name: 'Sync Test Machine',
    type: 'CNC',
    machine_type: 'CNC',
    line: 'Line 1',
    line_id: 'L01',
    line_name: 'Line 1',
    station_number: 'ST-01',
    status: 'running' as const,
    health_score: 99,
    temperature_c: 45,
    vibration_mms: 0.8,
    pressure_bar: 5.5,
    speed_rpm: 1200,
    oee: 95,
    operator: 'Automated Test',
    install_date: '2026-01-01',
    last_service_date: '2026-10-01'
  };

  const createdMachine = await supabaseAdapter.createMachine(testMachine);
  console.log('Created Machine:', createdMachine ? createdMachine.machine?.id : 'FAILED');

  const fetchedMachines = await supabaseAdapter.getMachines('FAC-001');
  const found = fetchedMachines.find(m => m.id === testMachine.id);
  console.log('Fetched Machine from Supabase:', found ? 'SUCCESS' : 'NOT FOUND');

  if (found) {
    await supabaseAdapter.deleteMachine(testMachine.id);
    console.log('Cleaned up test machine.');
  }
}

verifySyncFlow().catch(err => console.error('Error during verification:', err));
