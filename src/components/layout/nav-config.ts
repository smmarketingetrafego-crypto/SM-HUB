export interface NavItem {
  id: string;
  label: string;
  href: string;
  section: string;
}

export const navConfig = {
  comercial: ['/painel-tv', '/clientes', '/pipelines', '/leads', '/propostas', '/briefings'],
  operacional: ['/kanban', '/calendario-conteudo', '/conteudos', '/agendamentos', '/relatorios', '/meta-ads', '/agenda', '/projetos', '/tarefas', '/minhas-metas'],
  atendimento: ['/whatsapp', '/atendentes', '/automacoes', '/monitor-de-grupos'],
  servicos: ['/servicos', '/produtos', '/planos', '/checkout'],
  paginas: ['/landing-pages', '/link-na-bio', '/formularios', '/portfolio', '/paginas-de-captura'],
  trafego: ['/meta-ads', '/meta-ads/conexao', '/meta-ads/automacao'],
  agentes_ia: ['/agentes-ia', '/analista', '/copywriter', '/designer', '/estudio'],
  financeiro: ['/financeiro', '/financeiro/receber', '/assinaturas', '/relatorios', '/gateways'],
  treinamentos: ['/treinamentos'],
  administracao: ['/colaboradores', '/integracao-equipe', '/equipe', '/acessos', '/avisos', '/auditoria', '/marca', '/tutoriais', '/metas', '/configuracoes']
};

export const allNavItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/", section: "Geral" },
  { id: "painel-tv", label: "Painel de Vendas (TV)", href: "/painel-tv", section: "Geral" },
  { id: "metas", label: "Metas & OKRs", href: "/metas", section: "Geral" },
  { id: "atualizacoes", label: "Atualizações", href: "/atualizacoes", section: "Geral" },
  { id: "clientes", label: "Clientes", href: "/clientes", section: "Comercial" },
  { id: "pipelines", label: "Pipelines", href: "/pipelines", section: "Comercial" },
  { id: "leads", label: "Leads", href: "/leads", section: "Comercial" },
  { id: "propostas", label: "Propostas/Orçamentos", href: "/propostas", section: "Comercial" },
  { id: "briefings", label: "Briefings", href: "/briefings", section: "Comercial" },
  { id: "conteudos", label: "Conteúdos", href: "/calendario-conteudo", section: "Operacional" },
  { id: "relatorios", label: "Relatórios", href: "/relatorios", section: "Operacional" },
  { id: "colaboradores", label: "Colaboradores", href: "/colaboradores", section: "Administração" },
  { id: "integracao-equipe", label: "Integração da Equipe", href: "/integracao-equipe", section: "Administração" },
  { id: "tutoriais", label: "Tutoriais", href: "/tutoriais", section: "Administração" },
  { id: "configuracoes", label: "Configurações", href: "/configuracoes", section: "Administração" },
];
