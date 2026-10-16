export type BriefingKindId = "logo" | "social" | "video" | "landing" | "branding" | "outro";

export interface BriefingKind {
  id: BriefingKindId;
  label: string;
  description: string;
}

export const briefingKinds: BriefingKind[] = [
  { id: "logo", label: "Logo & Identidade", description: "Desenvolvimento de marca e identidade visual" },
  { id: "social", label: "Redes Sociais", description: "Estratégia e produção para mídias sociais" },
  { id: "video", label: "Vídeo", description: "Produção e edição de vídeo" },
  { id: "landing", label: "Landing Page", description: "Criação de páginas de captação" },
  { id: "branding", label: "Branding Completo", description: "Projeto completo de identidade de marca" },
  { id: "outro", label: "Outro", description: "Outros tipos de projeto" },
];

export function briefingKindById(id: BriefingKindId): BriefingKind | undefined {
  return briefingKinds.find((k) => k.id === id);
}
