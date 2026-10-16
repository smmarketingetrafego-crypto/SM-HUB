import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Lock,
  Eye,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";

export interface ContractClause {
  id: string;
  title: string;
  content: string;
  required?: boolean;
}

export const DEFAULT_AGENCY_CLAUSES: ContractClause[] = [
  {
    id: "cl_objeto",
    title: "Cláusula 1ª — Do Objeto e Escopo de Performance",
    content:
      "O presente contrato tem por objeto a prestação de serviços especializados de Planejamento Estratégico, Gestão de Tráfego Pago, Otimização Contínua de Campanhas Publicitárias (Meta Ads, Google Ads e congêneres) e Consultoria de Conversão pela CONTRATADA em favor do CONTRATANTE.",
    required: true,
  },
  {
    id: "cl_verba",
    title: "Cláusula 2ª — Da Distinção da Verba de Mídia das Plataformas",
    content:
      "Fica expressamente convencionado que a remuneração da CONTRATADA refere-se exclusivamente aos honorários de gestão técnica e inteligência operacional. O orçamento destinado aos anúncios (verba de tráfego) será custeado diretamente pelo CONTRATANTE mediante inserção de cartão de crédito próprio ou pagamento de boletos emitidos pelas plataformas (Facebook/Meta, Google, etc.).",
    required: true,
  },
  {
    id: "cl_honorarios",
    title: "Cláusula 3ª — Dos Honorários, Vencimento e Chave Pix",
    content:
      "Pelos serviços prestados, o CONTRATANTE pagará à CONTRATADA o valor estipulado no orçamento acordado, com vencimento na data pactuada, por meio de transferência bancária ou Pix diretamente para a chave oficial cadastrada pela CONTRATADA ({PIX_CHAVE} - {PIX_BANCO}), com quitação irrevogável após a compensação.",
    required: true,
  },
  {
    id: "cl_revisoes",
    title: "Cláusula 4ª — Dos Relatórios, Alinhamentos e Prazos",
    content:
      "A CONTRATADA disponibilizará relatórios periódicos de métricas (alcance, cliques, CPL, CPA e ROAS) e manterá canal oficial de suporte via WhatsApp para esclarecimento de dúvidas e alinhamento tático durante o horário comercial regular.",
  },
  {
    id: "cl_titularidade",
    title: "Cláusula 5ª — Da Propriedade dos Ativos e Acessos",
    content:
      "Todas as contas de anúncios, páginas, perfis, listas de clientes e dados de audiência pertencem integralmente ao CONTRATANTE. A CONTRATADA atuará sob permissão de parceiro/administrador técnico, não retendo qualquer posse sobre os ativos ao término do contrato.",
  },
  {
    id: "cl_lgpd",
    title: "Cláusula 6ª — Do Sigilo, Confidencialidade e LGPD",
    content:
      "As partes se comprometem a manter total confidencialidade acerca de faturamentos, estratégias e dados de clientes trocados durante a execução deste contrato, nos estritos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018).",
  },
  {
    id: "cl_vigencia",
    title: "Cláusula 7ª — Da Vigência e Rescisão",
    content:
      "O presente contrato vigorará pelo prazo estipulado na proposta comercial, podendo ser rescindido por qualquer das partes mediante comunicação prévia e por escrito (incluindo via WhatsApp oficial) com antecedência mínima de 30 (trinta) dias.",
  },
  {
    id: "cl_foro",
    title: "Cláusula 8ª — Do Foro de Eleição e Força Executiva",
    content:
      "O presente instrumento constitui título executivo extrajudicial para todos os efeitos de direito (Art. 784, III do Código de Processo Civil). Para dirimir quaisquer litígios oriundos deste contrato, as partes elegem o Foro da Comarca de {FORO_CIDADE}, com expressa renúncia a qualquer outro.",
    required: true,
  },
];

interface ContractClauseEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (clauses: ContractClause[]) => void;
}

export function ContractClauseEditorModal({ open, onOpenChange, onSave }: ContractClauseEditorModalProps) {
  const [clauses, setClauses] = useState<ContractClause[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("smhub_custom_contract_clauses");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return DEFAULT_AGENCY_CLAUSES;
  });

  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  const handleClauseChange = (index: number, field: "title" | "content", value: string) => {
    const updated = [...clauses];
    updated[index] = { ...updated[index], [field]: value };
    setClauses(updated);
  };

  const handleAddClause = () => {
    const nextNum = clauses.length + 1;
    const newClause: ContractClause = {
      id: `cl_custom_${Date.now()}`,
      title: `Cláusula ${nextNum}ª — Nova Cláusula`,
      content: "Insira aqui as condições e termos específicos desta cláusula...",
    };
    setClauses([...clauses, newClause]);
  };

  const handleRemoveClause = (index: number) => {
    const updated = clauses.filter((_, i) => i !== index);
    setClauses(updated);
  };

  const handleResetDefaults = () => {
    if (window.confirm("Deseja restaurar as cláusulas modelo originais de Tráfego Pago & Marketing?")) {
      setClauses(DEFAULT_AGENCY_CLAUSES);
      localStorage.setItem("smhub_custom_contract_clauses", JSON.stringify(DEFAULT_AGENCY_CLAUSES));
      toast.success("Cláusulas padrão restauradas.");
    }
  };

  const handleSave = () => {
    try {
      localStorage.setItem("smhub_custom_contract_clauses", JSON.stringify(clauses));
      window.dispatchEvent(new CustomEvent("smhub_contract_clauses_updated", { detail: clauses }));
      toast.success("Modelo de contrato da sua agência salvo com sucesso!");
      if (onSave) onSave(clauses);
      onOpenChange(false);
    } catch {
      toast.error("Erro ao salvar cláusulas.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-[#0a0a0d] border border-white/10 text-white p-6 sm:p-8 rounded-3xl shadow-2xl">
        <DialogHeader className="space-y-1 shrink-0 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#ff5722]/20 text-[#ff5722] border border-[#ff5722]/30">
                MODELO JURÍDICO DA AGÊNCIA
              </span>
              <span className="text-xs text-gray-400">SM Marketing e Tráfego Pago</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab(activeTab === "edit" ? "preview" : "edit")}
                className="h-8 px-3 rounded-lg text-xs text-gray-300 hover:text-white border border-white/10"
              >
                {activeTab === "edit" ? (
                  <>
                    <Eye className="size-3 mr-1.5 text-[#ff5722]" /> Prévia do Contrato
                  </>
                ) : (
                  <>
                    <FileText className="size-3 mr-1.5 text-[#ff5722]" /> Editar Cláusulas
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetDefaults}
                className="h-8 px-2.5 rounded-lg text-xs text-gray-400 hover:text-white"
                title="Restaurar Padrão"
              >
                <RotateCcw className="size-3.5" />
              </Button>
            </div>
          </div>

          <DialogTitle className="text-xl sm:text-2xl font-black text-white">
            Cláusulas & Modelo de Contrato Personalizado
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-400">
            Edite, adicione ou remova as cláusulas que serão inseridas automaticamente nos contratos gerados para seus clientes. Use variáveis como <span className="font-mono text-gray-300">{`{PIX_CHAVE}`}</span> e <span className="font-mono text-gray-300">{`{FORO_CIDADE}`}</span>.
          </DialogDescription>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-4">
          {activeTab === "edit" ? (
            <div className="space-y-4">
              {clauses.map((clause, index) => (
                <div
                  key={clause.id}
                  className="bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all rounded-2xl p-4 sm:p-5 space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="size-6 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold text-gray-300 flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <Input
                        value={clause.title}
                        onChange={(e) => handleClauseChange(index, "title", e.target.value)}
                        placeholder="Título da Cláusula"
                        className="h-9 bg-black/40 border-white/10 text-xs font-bold text-white"
                      />
                    </div>

                    {!clause.required && (
                      <button
                        type="button"
                        onClick={() => handleRemoveClause(index)}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Remover cláusula"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>

                  <Textarea
                    value={clause.content}
                    onChange={(e) => handleClauseChange(index, "content", e.target.value)}
                    rows={3}
                    className="bg-black/50 border-white/10 text-xs text-gray-300 leading-relaxed rounded-xl resize-y"
                    placeholder="Texto completo da cláusula..."
                  />
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={handleAddClause}
                className="w-full h-11 border-dashed border-white/20 bg-white/[0.01] hover:bg-white/[0.05] text-xs font-semibold text-gray-300 hover:text-white rounded-2xl flex items-center justify-center gap-2"
              >
                <Plus className="size-4 text-[#ff5722]" />
                Adicionar Nova Cláusula ao Contrato
              </Button>
            </div>
          ) : (
            /* Visual Preview */
            <div className="bg-white text-zinc-900 rounded-2xl p-8 font-serif space-y-6 shadow-xl border border-white/20">
              <div className="text-center border-b border-zinc-200 pb-4 space-y-1">
                <h3 className="text-base font-bold uppercase tracking-wider">
                  INSTRUMENTO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS
                </h3>
                <p className="text-xs text-zinc-500 font-sans">
                  CONTRATADA: SM MARKETING E TRÁFEGO PAGO • CNPJ: 67.833.241/0001-92
                </p>
              </div>

              <div className="space-y-4 text-xs leading-relaxed text-zinc-800">
                {clauses.map((clause, idx) => (
                  <div key={clause.id} className="space-y-1">
                    <h5 className="font-bold text-zinc-950 uppercase text-[11px] font-sans">
                      {clause.title}
                    </h5>
                    <p className="text-justify indent-4">
                      {clause.content
                        .replace("{PIX_CHAVE}", "[Chave Pix Cadastrada]")
                        .replace("{PIX_BANCO}", "[Banco Oficial]")
                        .replace("{FORO_CIDADE}", "[Comarca / Foro Judicial]")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-gray-400">
            Total de {clauses.length} cláusulas ativas no modelo da agência.
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto h-10 rounded-xl border-white/10 text-xs text-gray-300"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              onClick={handleSave}
              className="w-full sm:w-auto h-10 px-6 rounded-xl bg-gradient-to-r from-[#ff5722] to-[#ff3d00] hover:from-[#f4511e] hover:to-[#e64a19] text-white font-bold text-xs shadow-lg shadow-[#ff5722]/20 flex items-center justify-center gap-2"
            >
              <Save className="size-3.5" />
              <span>Salvar Modelo do Contrato</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
