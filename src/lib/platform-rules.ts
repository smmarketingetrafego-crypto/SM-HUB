export const ticketStates = ['open', 'in_progress', 'resolved'] as const;
export function requireFounder(founder: boolean) { if (!founder) throw new Error('Acesso exclusivo do Founder Master.'); }
export function canReadTicket(founder: boolean, userId: string, ownerId: string) { return founder || userId === ownerId; }
export function canChargePlan(plan: { active: boolean; billing_ready?: boolean; price: number; name: string; features: unknown }) { return plan.active && plan.billing_ready === true && Number(plan.price) > 0 && !!plan.name.trim() && Array.isArray(plan.features) && plan.features.length > 0; }
export function freeUntil(days: number, now = Date.now()) { if (!Number.isInteger(days) || days < 1 || days > 3650) throw new Error('Informe entre 1 e 3650 dias.'); return new Date(now + days * 86400000).toISOString(); }
export function accountPatch(action: string, lifetime: boolean) { if (lifetime) throw new Error('A conta Founder Master vitalícia não pode ser suspensa ou ter seu plano alterado.'); if (action === 'suspend') return { status: 'suspended' }; if (action === 'reactivate') return { status: 'active' }; throw new Error('Ação inválida.'); }
export function integrationStatus() { return { connected: false, status: 'not_connected' }; }
