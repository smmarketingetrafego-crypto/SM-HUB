import { expect, it } from 'vitest';
import { accountSettingsSchema } from './account-settings';
it('only accepts account settings, not client-supplied access privileges', () => {
  const parsed = accountSettingsSchema.parse({ accountId: '00000000-0000-4000-8000-000000000001', name: 'Agência', notes: '', lifetime: true, role: 'founder' });
  expect(parsed).toEqual({ accountId: '00000000-0000-4000-8000-000000000001', name: 'Agência', notes: '' });
});