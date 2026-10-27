import { createFileRoute, Link } from '@tanstack/react-router'
import { Download, Search, ExternalLink, X } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getClients } from "@/lib/api-clientes.functions";
import { getPipelines, moveLeadDeal } from "@/lib/api-pipelines.functions";
import { TutorialBanner } from "@/components/layout/tutorial-banner";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/leads")({
  head: () => ({
    meta: [
      { property: 'og:title', content: 'Leads — SM Hub' },
      { property: 'og:description', content: 'Todos os contatos da base, com filtros e histórico de cada um.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { title: "Leads — SM Hub" },
      { name: "description", content: "Todos os contatos da base, com filtros e histórico de cada um." },
    ],
  }),
  component: LeadsPage,
});

function LeadsPage() {
  const queryClient = useQueryClient();
  const moveMutation = useMutation({
    mutationFn: async (payload: { pipelineId: string; fromStage: string; toStage: string; clientName: string }) => {
      const result = await moveLeadDeal({ data: payload });
      if (!result.success) throw new Error(result.error || "Não foi possível alterar a etapa.");
      return result;
    },
    onSuccess: async (_result, payload) => {
      await queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      toast.success(`Lead movido para ${payload.toStage}.`);
    },
    onError: (error) => toast.error(error.message),
  });
  const { data: clientsData = { clients: [] } } = useQuery({
    queryKey: ['clients-data'],
    queryFn: () => getClients(),
  });
  const { data: pipelines = [] } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => getPipelines(),
  });

  const clients = clientsData.clients || [];

  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [compraFilter, setCompraFilter] = useState("any");
  const [dateFilter, setDateFilter] = useState("any-date");

  // Combine leads from pipelines + clients
  const allContacts = useMemo(() => {
    const fromDeals = pipelines.flatMap((pipeline) => pipeline.stages.flatMap((stage) => stage.deals.map((deal, index) => {
      const d = deal as typeof deal & { id?: string; email?: string; phone?: string; createdAt?: string };
      return {
      id: `${pipeline.id}:${stage.name}:${d.id ?? index}`,
      name: d.client,
      email: d.email || "",
      phone: d.phone || "",
      tipo: "lead" as const,
      comprou: false,
      receita: d.value ?? 0,
      origem: "pipeline",
      criadoEm: d.createdAt || "",
      pipelineId: pipeline.id,
      pipelineName: pipeline.name,
      stageName: stage.name,
      stages: pipeline.stages.map((s) => s.name),
    };
    })));
    const fromClients = clients.filter((c) => !c.archived).map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      tipo: "cliente" as const,
      comprou: (c.monthlyValue ?? 0) > 0,
      receita: c.monthlyValue ?? 0,
      origem: c.source || "manual",
      criadoEm: c.createdAt,
      pipelineId: "",
      pipelineName: "",
      stageName: "",
      stages: [] as string[],
    }));
    return [...fromClients, ...fromDeals];
  }, [clients, pipelines]);

  const filtered = useMemo(() => {
    return allContacts.filter((c) => {
      if (search && ![c.name, c.email, c.phone].join(" ").toLowerCase().includes(search.toLowerCase())) return false;
      if (tipoFilter === "clientes" && c.tipo !== "cliente") return false;
      if (tipoFilter === "leads" && c.tipo !== "lead") return false;
      if (compraFilter === "sim" && !c.comprou) return false;
      if (compraFilter === "nao" && c.comprou) return false;
      if (dateFilter !== "any-date") {
        const days = dateFilter === "7d" ? 7 : dateFilter === "30d" ? 30 : 90;
        const diff = (Date.now() - new Date(c.criadoEm).getTime()) / 86400000;
        if (diff > days) return false;
      }
      return true;
    });
  }, [allContacts, search, tipoFilter, compraFilter, dateFilter]);

  const totalReceita = filtered.reduce((acc, c) => acc + c.receita, 0);

  const exportCSV = () => {
    const rows = [
      ["Nome", "E-mail", "Telefone", "Tipo", "Receita", "Origem"],
      ...filtered.map((c) => [c.name, c.email, c.phone, c.tipo, c.receita.toString(), c.origem]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "leads.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com sucesso!");
  };

  return (
    <div className="space-y-6">
      <TutorialBanner location="Leads" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Leads</h1>
          <p className="mt-1 text-sm text-gray-400">Todos os contatos da base, com filtros e histórico.</p>
        </div>
        <Button variant="outline" className="h-10 px-4 rounded-xl text-sm bg-transparent border-white/10 text-white hover:bg-white/5"
          onClick={exportCSV}>
          <Download className="mr-2 size-4" /> Exportar CSV
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Contatos", value: filtered.length },
          { label: "Clientes", value: filtered.filter((c) => c.tipo === "cliente").length },
          { label: "Já compraram", value: filtered.filter((c) => c.comprou).length },
          { label: "Receita", value: brl(totalReceita), color: "text-emerald-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#111111] border border-white/5 rounded-2xl p-5">
            <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color ?? "text-white"}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xl">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Nome, e-mail, telefone..."
            className="pl-9 bg-[#111111] border-white/5 h-10 text-sm rounded-xl text-white placeholder:text-gray-500" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X className="size-4" />
            </button>
          )}
        </div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-[160px] bg-[#111111] border-white/5 h-10 rounded-xl text-white text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="clientes">Apenas Clientes</SelectItem>
            <SelectItem value="leads">Apenas Leads</SelectItem>
          </SelectContent>
        </Select>
        <Select value={compraFilter} onValueChange={setCompraFilter}>
          <SelectTrigger className="w-[160px] bg-[#111111] border-white/5 h-10 rounded-xl text-white text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
            <SelectItem value="any">Comprou ou não</SelectItem>
            <SelectItem value="sim">Já comprou</SelectItem>
            <SelectItem value="nao">Nunca comprou</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[160px] bg-[#111111] border-white/5 h-10 rounded-xl text-white text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
            <SelectItem value="any-date">Qualquer data</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
        {(search || tipoFilter !== "todos" || compraFilter !== "any" || dateFilter !== "any-date") && (
          <Button variant="ghost" className="h-10 px-3 text-gray-400 hover:text-white text-sm"
            onClick={() => { setSearch(""); setTipoFilter("todos"); setCompraFilter("any"); setDateFilter("any-date"); }}>
            <X className="mr-1.5 size-4" /> Limpar filtros
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/5 overflow-hidden bg-[#0A0A0A]">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/5 hover:bg-transparent">
              <TableHead className="text-xs font-semibold text-gray-500 uppercase py-4">Contato</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase py-4 text-center">Tipo</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase py-4 text-center">Receita</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase py-4 text-center">Origem</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground uppercase py-4">Fluxo / Etapa</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase py-4 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-gray-500">
                  {search || tipoFilter !== "todos" ? "Nenhum resultado com esses filtros." : "Nenhum contato ainda. Cadastre clientes ou adicione leads no pipeline."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id} className="border-b border-white/5 hover:bg-white/5 group transition-colors">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-brand/20 flex items-center justify-center text-xs font-bold text-brand shrink-0">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{c.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${c.tipo === "cliente" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" : "border-blue-500/30 bg-blue-500/10 text-blue-400"}`}>
                            {c.tipo === "cliente" ? "Cliente" : "Lead"}
                          </span>
                        </div>
                        {(c.email || c.phone) && (
                          <span className="text-xs text-gray-500">
                            {[c.email, c.phone].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-center text-gray-400 text-sm capitalize">{c.tipo}</TableCell>
                  <TableCell className="py-4 text-center font-medium text-brand text-sm">
                    {c.receita > 0 ? brl(c.receita) : "—"}
                  </TableCell>
                  <TableCell className="py-4 text-center text-gray-500 text-sm capitalize">{c.origem}</TableCell>
                  <TableCell className="py-4">
                    {c.tipo === "lead" ? (
                      <div className="min-w-48 space-y-1.5">
                        <p className="text-xs text-muted-foreground">{c.pipelineName}</p>
                        <Select value={c.stageName} disabled={moveMutation.isPending}
                          onValueChange={(toStage) => {
                            if (toStage === c.stageName) return;
                            moveMutation.mutate({ pipelineId: c.pipelineId, fromStage: c.stageName, toStage, clientName: c.name });
                          }}>
                          <SelectTrigger aria-label={`Etapa de ${c.name}`} className="h-9 w-52 max-w-full bg-background text-foreground border-border">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {c.stages.map((stage) => <SelectItem key={stage} value={stage}>{stage}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {c.tipo === "cliente" && (
                        <Link to="/clientes">
                          <Button variant="ghost" size="icon" className="size-8 text-gray-400 hover:text-white rounded-lg hover:bg-white/10" title="Ver cliente">
                            <ExternalLink className="size-4" />
                          </Button>
                        </Link>
                      )}
                      {c.tipo === "lead" && (
                        <Link to="/pipelines">
                          <Button variant="ghost" size="icon" className="size-8 text-gray-400 hover:text-white rounded-lg hover:bg-white/10" title="Ver no pipeline">
                            <ExternalLink className="size-4" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
