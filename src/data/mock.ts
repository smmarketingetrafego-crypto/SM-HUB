export const integrations = [
  {
    id: "meta",
    name: "Meta Ads",
    description: "Conecte suas contas de anúncio do Facebook e Instagram",
    icon: "Meta",
    status: "disconnected" as const,
    category: "marketing",
  },
  {
    id: "google",
    name: "Google Ads",
    description: "Integração com campanhas do Google",
    icon: "Google",
    status: "disconnected" as const,
    category: "marketing",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Atendimento e automações via WhatsApp",
    icon: "WhatsApp",
    status: "disconnected" as const,
    category: "communication",
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Agendamento e métricas do Instagram",
    icon: "Instagram",
    status: "disconnected" as const,
    category: "social",
  },
];

export type Integration = typeof integrations[0];
