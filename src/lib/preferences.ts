export interface Preferences {
  theme: "dark" | "light" | "system";
  accentColor: string;
  sidebarCollapsed: boolean;
  notificationsEmail: boolean;
  notificationsWhatsapp: boolean;
  language: string;
}

export const defaultPreferences: Preferences = {
  theme: "dark",
  accentColor: "brand",
  sidebarCollapsed: false,
  notificationsEmail: true,
  notificationsWhatsapp: false,
  language: "pt-BR",
};

export const accentOptions = [
  { id: "brand", label: "Ouro", color: "#C9A227" },
  { id: "blue", label: "Azul", color: "#3B82F6" },
  { id: "purple", label: "Roxo", color: "#8B5CF6" },
  { id: "emerald", label: "Verde", color: "#10B981" },
  { id: "rose", label: "Rosa", color: "#F43F5E" },
];
