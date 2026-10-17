import { pageMeta } from '@/lib/page-meta';
import { createFileRoute } from '@tanstack/react-router';
import {
  ClipboardCheck,
  CheckCircle2,
  Sparkles,
  Building2,
  Send,
  ArrowRight,
  ShieldCheck,
  HelpCircle
} from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getBriefingById, submitBriefingResponse, type BriefingRecord } from "@/lib/api-briefings.functions";
import { getAgencyProfile, type AgencyProfile, DEFAULT_AGENCY_PROFILE } from "@/lib/api-propostas.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/briefing/$id")({
  head: () => pageMeta('Briefing', 'Área de briefing do SM Hub.'),
  component: PublicBriefingPage,
});

function PublicBriefingPage() {
  const { id } = Route.useParams();

  const { data: briefing, isLoading: loadingBriefing } = useQuery({
    queryKey: ["public-briefing", id],
    queryFn: () => getBriefingById({ data: id }),
  });

  const { data: agencyProfile = DEFAULT_AGENCY_PROFILE } = useQuery({
    queryKey: ["agency-profile"],
    queryFn: () => getAgencyProfile(),
  });

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const agencyName = agencyProfile?.tradeName || agencyProfile?.legalName || "SM Hub Agência Digital";

  const submitMutation = useMutation({
    mutationFn: (data: { id: string; answers: Record<string, any>; clientName?: string }) =>
      submitBriefingResponse({ data }),
    onSuccess: (res) => {
      if (res.success) {
        setSubmitted(true);
        toast.success("Briefing enviado com sucesso!");
      } else {
        toast.error("Erro ao enviar: " + res.error);
      }
    },
    onError: (err: any) => {
      toast.error("Erro ao enviar respostas: " + (err.message || "Erro inesperado"));
    }
  });

  const handleAnswerChange = (qId: string, val: any) => {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMutation.mutate({
      id,
      answers,
      clientName: clientName || briefing?.client,
    });
  };

  if (loadingBriefing) {
    return (
      <div className="min-h-screen bg-[#07090E] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Carregando briefing da agência...</p>
        </div>
      </div>
    );
  }

  if (!briefing) {
    return (
      <div className="min-h-screen bg-[#07090E] flex items-center justify-center text-white p-4">
        <div className="max-w-md w-full bg-[#111] border border-white/10 rounded-2xl p-8 text-center space-y-4">
          <div className="size-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold">Briefing não encontrado</h2>
          <p className="text-sm text-gray-400">Este link de briefing pode ter sido desativado ou não existe mais.</p>
        </div>
      </div>
    );
  }

  if (submitted || briefing.status === "concluído") {
    return (
      <div className="min-h-screen bg-[#07090E] flex items-center justify-center text-white p-4">
        <div className="max-w-lg w-full bg-gradient-to-b from-[#151922] to-[#0D1017] border border-brand/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="size-16 rounded-2xl bg-brand/20 border border-brand/40 flex items-center justify-center text-brand mx-auto shadow-lg shadow-brand/20">
            <CheckCircle2 className="size-9" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Briefing Concluído & Enviado!</h2>
            <p className="text-sm text-gray-300 mt-2 leading-relaxed">
              A equipe da <strong className="text-brand">{agencyName}</strong> já recebeu todas as suas informações e diretrizes. Entraremos em contato com os próximos passos do projeto!
            </p>
          </div>
          <div className="bg-black/40 border border-white/5 rounded-2xl p-4 text-xs text-gray-400 flex items-center justify-center gap-2">
            <ShieldCheck className="size-4 text-emerald-400" />
            <span>Dados armazenados com segurança pela plataforma SM HUB</span>
          </div>
        </div>
      </div>
    );
  }

  const questions = briefing.questions || [];

  return (
    <div className="min-h-screen bg-[#07090E] text-white">
      {/* Topo da Agência */}
      <header className="border-b border-white/10 bg-[#0B0E14]/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-brand/20 border border-brand/30 flex items-center justify-center text-brand font-bold text-sm">
              <Building2 className="size-5" />
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium">Briefing Oficial</div>
              <div className="text-sm font-bold text-white">{agencyName}</div>
            </div>
          </div>
          <span className="text-xs text-brand bg-brand/10 border border-brand/20 px-3 py-1 rounded-full font-semibold">
            {briefing.category || "Formulário"}
          </span>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <div className="bg-gradient-to-r from-brand/10 via-[#12151D] to-[#0D1017] border border-brand/20 rounded-3xl p-6 sm:p-8 space-y-3 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-brand uppercase tracking-wider">
            <Sparkles className="size-4" />
            Alinhamento Estratégico do Projeto
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{briefing.title}</h1>
          <p className="text-sm text-gray-300 leading-relaxed">
            Olá, <strong className="text-white">{briefing.client || "Cliente"}</strong>! Responda às perguntas abaixo com o máximo de detalhes possível. Suas respostas serão o norte para nossa criação e estratégia.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Identificação do Cliente */}
          <div className="bg-[#0F1219] border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-brand">
              1. Seus Dados de Contato
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">Seu Nome Completo *</Label>
                <Input
                  required
                  defaultValue={briefing.client || ""}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Carlos Oliveira"
                  className="bg-black/60 border-white/10 text-white rounded-xl h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300">WhatsApp / Telefone</Label>
                <Input
                  defaultValue={briefing.clientPhone || ""}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="bg-black/60 border-white/10 text-white rounded-xl h-11"
                />
              </div>
            </div>
          </div>

          {/* Perguntas do Briefing */}
          <div className="space-y-6">
            {questions.map((q, idx) => (
              <div
                key={q.id || idx}
                className="bg-[#0F1219] border border-white/10 rounded-2xl p-6 space-y-3 hover:border-brand/30 transition-all shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="size-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs text-brand font-mono">
                        {idx + 1}
                      </span>
                      {q.label} {q.required && <span className="text-brand">*</span>}
                    </Label>
                    {q.description && (
                      <p className="text-xs text-gray-400 pl-8">{q.description}</p>
                    )}
                  </div>
                </div>

                <div className="pl-8 pt-1">
                  {q.type === "textarea" ? (
                    <Textarea
                      required={q.required}
                      rows={4}
                      value={answers[q.id] || ""}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      placeholder="Digite sua resposta em detalhes..."
                      className="bg-black/60 border-white/10 text-white rounded-xl resize-none focus-visible:ring-brand"
                    />
                  ) : q.type === "select" && q.options ? (
                    <Select
                      value={answers[q.id] || ""}
                      onValueChange={(val) => handleAnswerChange(q.id, val)}
                    >
                      <SelectTrigger className="bg-black/60 border-white/10 text-white rounded-xl h-11">
                        <SelectValue placeholder="Selecione uma opção..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#151922] border-white/10 text-white">
                        {q.options.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      required={q.required}
                      value={answers[q.id] || ""}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      placeholder="Sua resposta..."
                      className="bg-black/60 border-white/10 text-white rounded-xl h-11 focus-visible:ring-brand"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              disabled={submitMutation.isPending}
              className="w-full h-14 rounded-2xl gradient-brand text-black font-bold text-base shadow-xl shadow-brand/20 flex items-center justify-center gap-2"
            >
              {submitMutation.isPending ? (
                "Enviando Respostas..."
              ) : (
                <>
                  <Send className="size-5" />
                  Finalizar e Enviar Briefing à Agência
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
