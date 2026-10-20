import { z } from 'zod';

export const accountSettingsSchema = z.object({
  accountId: z.string().uuid(),
  name: z.string().trim().min(1, 'Informe o nome da conta.').max(120),
  notes: z.string().trim().max(5000),
});