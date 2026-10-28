import { describe, it, expect, beforeEach } from 'vitest';
import { api } from '../services/api';
import { batteryStore } from '../services/store';
import { VALID_LIFECYCLE_TRANSITIONS } from '../types';

describe('BatteryPass 360 - Battery Passport & Lifecycle Tests', () => {
  beforeEach(() => {
    batteryStore.resetToDefaults();
  });

  describe('1. QR ID Resolution & Verification', () => {
    it('resolves valid battery ID and returns cryptographic verification', async () => {
      const res = await api.verifyBattery('BAT-NMC-8A2F91C0');
      expect(res.is_authentic).toBe(true);
      expect(res.battery_id).toBe('BAT-NMC-8A2F91C0');
      expect(res.verification_level).toBe('CRYPTOGRAPHICALLY_VERIFIED');
      expect(res.is_audit_chain_valid).toBe(true);
    });

    it('rejects unknown or invalid QR identifiers', async () => {
      await expect(api.verifyBattery('BAT-UNKNOWN-99999999')).rejects.toThrow(
        /Unknown identifier|not recognized/
      );
    });

    it('detects inconsistent specifications between physical label claims and canonical record', async () => {
      // BAT-NCA-F104A7B2 has actual SoH of 64.2%
      // Suppose a malicious sticker claims 96.0% SoH
      const res = await api.verifyBattery('BAT-NCA-F104A7B2', { soh: 96.0 });
      expect(res.verification_level).toBe('LOOKUP_ONLY');
      expect(res.warning_message).toContain('INCONSISTENT SPECIFICATION');
      expect(res.warning_message).toContain('96%');
    });

    it('detects duplicate physical labels and flagged suspicious labels', async () => {
      // Report label as cloned
      await api.reportSuspiciousLabel({
        battery_id: 'BAT-LFP-3C7D410E',
        reporter_role: 'REGULATOR_AUDITOR',
        reporter_org: 'EU Metrology Authority',
        location: 'Frankfurt Central Depot',
        reason: 'CLONED_QR_CODE',
        details: 'Duplicate physical label spotted with reprinted QR code'
      });

      const res = await api.verifyBattery('BAT-LFP-3C7D410E');
      expect(res.is_authentic).toBe(false);
      expect(res.verification_level).toBe('DUPLICATE_OR_CLONED');
      expect(res.is_flagged_suspicious).toBe(true);
      expect(res.warning_message).toContain('SECURITY ALERT');
    });
  });

  describe('2. Lifecycle State Machine & Validated Transitions', () => {
    it('allows valid state transitions along the allowed lifecycle path', async () => {
      const bId = 'BAT-NMC-8A2F91C0'; // currently IN_SERVICE
      // Valid transitions from IN_SERVICE are INSPECTION, REPAIR, SECOND_LIFE_ASSESSMENT
      const updated = await api.transitionLifecycle(bId, 'INSPECTION', 'Routine 50,000 km diagnostic inspection');
      expect(updated.status).toBe('INSPECTION');

      // Then from INSPECTION to SECOND_LIFE_ASSESSMENT
      const updated2 = await api.transitionLifecycle(bId, 'SECOND_LIFE_ASSESSMENT', 'Evaluated for stationary battery repurposing');
      expect(updated2.status).toBe('SECOND_LIFE_ASSESSMENT');
    });

    it('blocks illegal or arbitrary lifecycle state jumps', async () => {
      const bId = 'BAT-NMC-8A2F91C0'; // IN_SERVICE
      // Cannot jump from IN_SERVICE directly to RECYCLED
      await expect(
        api.transitionLifecycle(bId, 'RECYCLED', 'Unauthorized disposal skip')
      ).rejects.toThrow(/Invalid lifecycle transition/);
    });

    it('verifies that terminal state RECYCLED allows no further transitions', () => {
      expect(VALID_LIFECYCLE_TRANSITIONS['RECYCLED']).toEqual([]);
    });
  });

  describe('3. Cryptographic Tamper Evidence & Audit Trail', () => {
    it('verifies an authentic un-tampered hash chain', async () => {
      const bId = 'BAT-NMC-8A2F91C0';
      const audit = await api.verifyAuditTrail(bId);
      expect(audit.is_valid).toBe(true);
      expect(audit.total_events).toBeGreaterThanOrEqual(3);
      expect(audit.error_message).toBeNull();
    });

    it('detects tampering in historical custody blocks and flags failure', async () => {
      const bId = 'BAT-NMC-8A2F91C0';
      // Tamper block index 1
      api.tamperBlockForAudit(bId, 1);

      const audit = await api.verifyAuditTrail(bId);
      expect(audit.is_valid).toBe(false);
      expect(audit.tampered_block_index).toBe(1);
      expect(audit.error_message).toContain('Tampering detected');
    });
  });

  describe('4. Custody Transfers & Multi-Party Handover', () => {
    it('requests a custody transfer and confirms it upon acceptance', async () => {
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

      expect(transfer.status).toBe('PENDING');
      expect(transfer.manifest_hash).toBeDefined();

      // 2. Accept transfer
      const accepted = await api.acceptCustodyTransfer(transfer.transfer_id);
      expect(accepted.status).toBe('ACCEPTED');

      // 3. Confirm passport custodian updated
      const updatedPassport = await api.getBattery(bId);
      expect(updatedPassport.current_custodian).toBe('Nordic Circular Storage AG');
      expect(updatedPassport.current_custodian).not.toBe(originalCustodian);

      // 4. Confirm custody event was appended to the chain
      const events = await api.getBatteryEvents(bId);
      const lastEvent = events[events.length - 1];
      expect(lastEvent.event_type).toBe('TRANSFERRED_CUSTODY');
      expect(lastEvent.actor_organization).toBe('Nordic Circular Storage AG');
    });

    it('allows rejecting a transfer request with an audit reason', async () => {
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
      expect(rejected.status).toBe('REJECTED');
      expect(rejected.rejection_reason).toContain('Physical casing dent');
    });
  });

  describe('5. Algorithmic Disposition Recommendations', () => {
    it('calculates appropriate circular pathway based on health metrics', async () => {
      // BAT-NMC-8A2F91C0 has 88.4% SoH -> REUSE_DIRECT
      const decision1 = await api.getDispositionDecision('BAT-NMC-8A2F91C0');
      expect(decision1.recommended_pathway).toBe('REUSE_DIRECT');
      expect(decision1.residual_value_eur).toBeGreaterThan(4000);

      // BAT-NCA-F104A7B2 has 64.2% SoH -> REMANUFACTURE or RECYCLE
      const decision3 = await api.getDispositionDecision('BAT-NCA-F104A7B2');
      expect(['REMANUFACTURE', 'RECYCLE']).toContain(decision3.recommended_pathway);
      expect(decision3.safety_prerequisites.length).toBeGreaterThan(0);
    });
  });
});
