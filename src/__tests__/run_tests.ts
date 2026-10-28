// Standalone test suite runner for BatteryPass 360
import { api } from '../services/api';
import { batteryStore } from '../services/store';
import { VALID_LIFECYCLE_TRANSITIONS } from '../types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTest(name: string, fn: () => Promise<void> | void) {
  try {
    batteryStore.resetToDefaults();
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err?.message || err}`);
    failed++;
  }
}

async function runAll() {
  console.log('\n========================================');
  console.log(' BatteryPass 360 Verification Test Suite');
  console.log('========================================\n');

  console.log('1. QR ID Resolution & Verification:');
  await runTest('Resolves valid battery ID and returns cryptographic verification', async () => {
    const res = await api.verifyBattery('BAT-NMC-8A2F91C0');
    assert(res.is_authentic === true, 'is_authentic must be true');
    assert(res.battery_id === 'BAT-NMC-8A2F91C0', 'battery_id matches');
    assert(res.verification_level === 'CRYPTOGRAPHICALLY_VERIFIED', 'verification_level is CRYPTOGRAPHICALLY_VERIFIED');
    assert(res.is_audit_chain_valid === true, 'is_audit_chain_valid must be true');
  });

  await runTest('Rejects unknown or invalid QR identifiers', async () => {
    let threw = false;
    try {
      await api.verifyBattery('BAT-UNKNOWN-99999999');
    } catch {
      threw = true;
    }
    assert(threw, 'Should throw error for unknown identifier');
  });

  await runTest('Detects inconsistent specifications between physical label claims and canonical record', async () => {
    const res = await api.verifyBattery('BAT-NCA-F104A7B2', { soh: 96.0 });
    assert(res.verification_level === 'LOOKUP_ONLY', 'verification_level should be LOOKUP_ONLY on inconsistency');
    assert(res.warning_message?.includes('INCONSISTENT SPECIFICATION') ?? false, 'warning_message should flag inconsistency');
    assert(res.warning_message?.includes('96%') ?? false, 'warning_message should cite claimed 96%');
  });

  await runTest('Detects duplicate physical labels and flagged suspicious labels', async () => {
    await api.reportSuspiciousLabel({
      battery_id: 'BAT-LFP-3C7D410E',
      reporter_role: 'REGULATOR_AUDITOR',
      reporter_org: 'EU Metrology Authority',
      location: 'Frankfurt Central Depot',
      reason: 'CLONED_QR_CODE',
      details: 'Duplicate physical label spotted with reprinted QR code'
    });

    const res = await api.verifyBattery('BAT-LFP-3C7D410E');
    assert(res.is_authentic === false, 'is_authentic should be false for cloned/suspicious label');
    assert(res.verification_level === 'DUPLICATE_OR_CLONED', 'verification_level should be DUPLICATE_OR_CLONED');
    assert(res.is_flagged_suspicious === true, 'is_flagged_suspicious must be true');
    assert(res.warning_message?.includes('SECURITY ALERT') ?? false, 'warning_message must include alert');
  });

  console.log('\n2. Lifecycle State Machine & Validated Transitions:');
  await runTest('Allows valid state transitions along the allowed lifecycle path', async () => {
    const bId = 'BAT-NMC-8A2F91C0'; // IN_SERVICE
    const updated = await api.transitionLifecycle(bId, 'INSPECTION', 'Routine 50,000 km diagnostic inspection');
    assert(updated.status === 'INSPECTION', 'status should be INSPECTION');

    const updated2 = await api.transitionLifecycle(bId, 'SECOND_LIFE_ASSESSMENT', 'Evaluated for stationary battery repurposing');
    assert(updated2.status === 'SECOND_LIFE_ASSESSMENT', 'status should be SECOND_LIFE_ASSESSMENT');
  });

  await runTest('Blocks illegal or arbitrary lifecycle state jumps', async () => {
    const bId = 'BAT-NMC-8A2F91C0'; // IN_SERVICE
    let threw = false;
    try {
      await api.transitionLifecycle(bId, 'RECYCLED', 'Unauthorized disposal skip');
    } catch {
      threw = true;
    }
    assert(threw, 'Should throw error when attempting illegal jump to RECYCLED');
  });

  await runTest('Verifies that terminal state RECYCLED allows no further transitions', () => {
    const nextStates = VALID_LIFECYCLE_TRANSITIONS['RECYCLED'];
    assert(Array.isArray(nextStates) && nextStates.length === 0, 'RECYCLED should have 0 valid outgoing transitions');
  });

  console.log('\n3. Cryptographic Tamper Evidence & Audit Trail:');
  await runTest('Verifies an authentic un-tampered hash chain', async () => {
    const bId = 'BAT-NMC-8A2F91C0';
    const audit = await api.verifyAuditTrail(bId);
    assert(audit.is_valid === true, 'Audit chain should be valid');
    assert(audit.total_events >= 3, 'Must have at least 3 events in chain');
    assert(audit.error_message === null, 'Error message should be null');
  });

  await runTest('Detects tampering in historical custody blocks and flags failure', async () => {
    const bId = 'BAT-NMC-8A2F91C0';
    api.tamperBlockForAudit(bId, 1);
    const audit = await api.verifyAuditTrail(bId);
    assert(audit.is_valid === false, 'Audit chain should be marked invalid');
    assert(audit.tampered_block_index === 1, 'tampered_block_index should be 1');
    assert(audit.error_message?.includes('Tampering detected') ?? false, 'Should flag tampering detected');
  });

  console.log('\n4. Custody Transfers & Multi-Party Handover:');
  await runTest('Requests a custody transfer and confirms it upon acceptance', async () => {
    const bId = 'BAT-LFP-3C7D410E';
    const initialPassport = await api.getBattery(bId);
    const originalCustodian = initialPassport.current_custodian;

    // 1. Request transfer
    const transfer = await api.requestCustodyTransfer({
      battery_id: bId,
      receiver_organization: 'Nordic Circular Storage AG',
      intended_receiver_role: 'RECYCLER',
      transfer_reason: 'Battery Pack Repurposing Transfer',
      notes: 'Handover manifest #2026-NCS'
    });

    assert(transfer.status === 'PENDING', 'Transfer status should be PENDING');
    assert(Boolean(transfer.manifest_hash), 'Transfer manifest_hash must be present');

    // 2. Accept transfer
    const accepted = await api.acceptCustodyTransfer(transfer.transfer_id);
    assert(accepted.status === 'ACCEPTED', 'Transfer status should be ACCEPTED');

    // 3. Confirm passport custodian updated
    const updatedPassport = await api.getBattery(bId);
    assert(updatedPassport.current_custodian === 'Nordic Circular Storage AG', 'Custodian should be updated');
    assert(updatedPassport.current_custodian !== originalCustodian, 'Custodian should be changed');

    // 4. Confirm custody event was appended to the chain
    const events = await api.getBatteryEvents(bId);
    const lastEvent = events[events.length - 1];
    assert(lastEvent.event_type === 'TRANSFERRED_CUSTODY', 'Last event should be TRANSFERRED_CUSTODY');
    assert(lastEvent.actor_organization === 'Nordic Circular Storage AG', 'Actor org should match receiver');
  });

  await runTest('Allows rejecting a transfer request with an audit reason', async () => {
    const bId = 'BAT-NMC-8A2F91C0';
    const transfer = await api.requestCustodyTransfer({
      battery_id: bId,
      receiver_organization: 'Damaged Cargo Warehouse',
      intended_receiver_role: 'FLEET_OPERATOR',
      transfer_reason: 'Depot Transfer'
    });

    const rejected = await api.rejectCustodyTransfer(
      transfer.transfer_id,
      'Physical casing dent observed at dock'
    );
    assert(rejected.status === 'REJECTED', 'Status should be REJECTED');
    assert(rejected.rejection_reason?.includes('Physical casing dent') ?? false, 'Rejection reason must be recorded');
  });

  console.log('\n5. Algorithmic Disposition Recommendations:');
  await runTest('Calculates appropriate circular pathway based on health metrics', async () => {
    const decision1 = await api.getDispositionDecision('BAT-NMC-8A2F91C0');
    assert(decision1.recommended_pathway === 'REUSE_DIRECT', 'High SoH battery should recommend REUSE_DIRECT');
    assert(decision1.residual_value_eur > 4000, 'High SoH battery residual value > 4000 EUR');

    const decision3 = await api.getDispositionDecision('BAT-NCA-F104A7B2');
    assert(
      ['REMANUFACTURE', 'RECYCLE'].includes(decision3.recommended_pathway),
      'Degraded battery should recommend REMANUFACTURE or RECYCLE'
    );
    assert(decision3.safety_prerequisites.length > 0, 'Safety prerequisites must be present for degraded battery');
  });

  console.log('\n----------------------------------------');
  console.log(`Summary: ${passed} passed, ${failed} failed.`);
  console.log('----------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAll();
