export type Pipeline = {
  id: string;
  name: string;
  stages: Array<{
    name: string;
    deals: Array<{
      client: string;
      value: number;
      stage: string;
    }>;
  }>;
};

export type Briefing = {
  id: string;
  title: string;
  kind: string;
  client: string;
  status: "aguardando" | "em andamento" | "concluído";
  createdAt: string;
  link: string;
};
