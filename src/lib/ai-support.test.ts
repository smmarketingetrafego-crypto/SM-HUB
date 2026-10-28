import { describe, it, expect } from 'vitest';
import { generateAiSupportResponse } from './ai-support.server';

describe('AI Support Engine', () => {
  it('deve gerar resposta autônoma com orientações corretas para dúvida de pipeline', async () => {
    const res = await generateAiSupportResponse({
      ticket: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        subject: 'Como mover leads entre etapas do funil?',
        user_email: 'cliente@exemplo.com',
        requester_type: 'cliente',
      },
      messages: [
        { sender: 'user', body: 'Quero saber como avançar um lead no pipeline rapidamente.' },
      ],
    });

    expect(res.success).toBe(true);
    expect(res.answer).toContain('Pipeline');
    expect(res.answer).toContain('(99) 98550-1962');
    expect(res.agent).toBeDefined();
    expect(res.agent.name).toBeDefined();
  });

  it('deve responder adequadamente sobre tarefas e entregas', async () => {
    const res = await generateAiSupportResponse({
      ticket: {
        id: '223e4567-e89b-12d3-a456-426614174001',
        subject: 'Dúvida sobre prazos de entrega e quadro de tarefas',
        user_email: 'designer@exemplo.com',
        requester_type: 'colaborador',
      },
      messages: [
        { sender: 'user', body: 'Onde organizo o checklist de validação das tarefas?' },
      ],
    });

    expect(res.success).toBe(true);
    expect(res.answer).toContain('Tarefas');
    expect(res.answer).toContain('checklist');
  });

  it('deve responder sobre finanças, boletos e Pix', async () => {
    const res = await generateAiSupportResponse({
      ticket: {
        id: '323e4567-e89b-12d3-a456-426614174002',
        subject: 'Como gero a segunda via do Pix para meu cliente?',
        user_email: 'financeiro@exemplo.com',
        requester_type: 'agencia',
      },
      messages: [
        { sender: 'user', body: 'Preciso emitir um Pix copia e cola no módulo financeiro.' },
      ],
      agentId: 'agent-4',
    });

    expect(res.success).toBe(true);
    expect(res.answer).toContain('Financeira');
  });
});
