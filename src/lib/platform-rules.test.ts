import { describe, it, expect } from 'vitest';
import { requireFounder, canReadTicket, canChargePlan, freeUntil, accountPatch, ticketStates, integrationStatus } from './platform-rules';
describe('SM Hub operating rules', () => {
  it('reserves founder administration for a verified founder', () => { expect(() => requireFounder(false)).toThrow(); expect(() => requireFounder(true)).not.toThrow(); });
  it('prevents another user from reading a ticket', () => { expect(canReadTicket(false, 'other', 'owner')).toBe(false); expect(canReadTicket(false, 'owner', 'owner')).toBe(true); expect(canReadTicket(true, 'founder', 'owner')).toBe(true); });
  it('blocks invented initial prices until explicitly confirmed', () => { for (const price of [97, 197, 397]) expect(canChargePlan({ active: true, billing_ready: false, price, name: 'Starter', features: ['Recurso'] })).toBe(false); });
  it('allows only a confirmed real catalog with a positive price and resources', () => { expect(canChargePlan({ active: true, billing_ready: true, price: 120, name: 'Plano real', features: ['Suporte'] })).toBe(true); expect(canChargePlan({ active: true, billing_ready: true, price: 0, name: 'Plano', features: [] })).toBe(false); });
  it('grants the exact free period requested', () => { expect(freeUntil(14, Date.parse('2026-10-17T00:00:00Z'))).toBe('2026-10-31T00:00:00.000Z'); });
  it('protects founder lifetime access', () => { expect(() => accountPatch('suspend', true)).toThrow(); });
  it('supports suspension and reactivation', () => { expect(accountPatch('suspend', false)).toEqual({ status: 'suspended' }); expect(accountPatch('reactivate', false)).toEqual({ status: 'active' }); });
  it('supports the three requested support states', () => { expect(ticketStates).toEqual(['open', 'in_progress', 'resolved']); });
  it('never treats saved placeholder integrations as connected', () => { expect(integrationStatus().connected).toBe(false); });
});
