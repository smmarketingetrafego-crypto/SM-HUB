// @ts-nocheck
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { getAgencyProfile, saveAgencyProfile, type AgencyProfile, DEFAULT_AGENCY_PROFILE } from "@/lib/api-propostas.functions";
import { AddressFormFields } from "@/components/common/address-form-fields";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, Briefcase, ShieldCheck, Sparkles, AlertCircle, Save, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";

const FREELANCER_SPECIALTIES = [
  {
    group: "🎨 Design & Criação Visual",
    options: [
      "Designer UI/UX & Web Designer",
      "Designer Gráfico & Identidade Visual",
      "Editor(a) de Vídeo & Motion Designer",
      "Ilustrador(a) & Artista Digital",
      "Designer 3D & Modelagem",
    ],
  },
  {
    group: "💻 Desenvolvimento & Tecnologia",
    options: [
      "Desenvolvedor(a) Full Stack",
      "Desenvolvedor(a) Frontend / No-Code",
      "Desenvolvedor(a) Backend & APIs",
      "Desenvolvedor(a) WordPress / Shopify",
      "Programador(a) Mobile (iOS & Android)",
    ],
  },
  {
    group: "🚀 Marketing, Mídia & Tráfego",
    options: [
      "Gestor(a) de Tráfego Pago & Performance",
      "Social Media & Gestor(a) de Conteúdo",
      "Copywriter & Redator(a) Estratégico",
      "Estrategista Digital & Growth Hacker",
      "Especialista em SEO & Conteúdo Orgânico",
    ],
  },
  {
    group: "⚡ Automação, IA & Audiovisual",
    options: [
      "Especialista em Automações & IA (No-Code/APIs)",
      "Filmmaker & Produtor(a) Audiovisual",
      "Fotógrafo(a) Profissional",
      "Consultor(a) de Negócios Digitais",
      "Gestor(a) de Projetos & Operações Digitais",
    ],
  },
];

const AGENCY_SPECIALTIES = [
  {
    group: "📈 Performance & Aquisição",
    options: [
      "Agência de Marketing Digital & Performance",
      "Agência de Tráfego Pago & Escala de Vendas",
      "Agência de Social Media & Conteúdo Estratégico",
      "Assessoria de Comunicação & Imprensa",
    ],
  },
  {
    group: "✨ Design, Branding & Mídia",
    options: [
      "Estúdio de Design, Branding & Identidade Visual",
      "Produtora Audiovisual, Vídeos & Motion Design",
    ],
  },
  {
    group: "💻 Tecnologia & Inovação",
    options: [
      "Software House & Desenvolvimento Web / Mobile",
      "Agência de Automações, CRM & IA Aplicada",
    ],
  },
  {
    group: "🌐 Soluções Integradas",
    options: [
      "Agência Full Service (360°)",
      "Consultoria Estratégica de Crescimento (Growth)",
    ],
  },
];

const BRAZILIAN_BANKS = [
  {
    group: "⚡ Bancos Digitais & Fintechs Populares",
    options: [
      "Nubank (Nu Pagamentos)",
      "Banco Inter",
      "C6 Bank",
      "Mercado Pago",
      "PagBank (PagSeguro)",
      "PicPay",
      "Stone Pagamentos",
      "Neon Pagamentos",
      "Ame Digital",
    ],
  },
  {
    group: "🏛️ Bancos Tradicionais & Grandes Redes",
    options: [
      "Itaú Unibanco",
      "Banco Bradesco",
      "Banco do Brasil",
      "Caixa Econômica Federal",
      "Banco Santander",
      "BTG Pactual",
      "Banco Safra",
      "Banco Pan",
      "Banco BV (Votorantim)",
      "Banco Original",
    ],
  },
  {
    group: "🤝 Cooperativas & Bancos Públicos / Regionais",
    options: [
      "Sicoob",
      "Sicredi",
      "BRB (Banco de Brasília)",
      "Banrisul",
      "Banco do Nordeste (BNB)",
      "Banco da Amazônia (BASA)",
    ],
  },
];

export function MandatoryOnboardingModal() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: ["agency-profile"],
    queryFn: () => getAgencyProfile(),
  });

  const [form, setForm] = useState<AgencyProfile>(DEFAULT_AGENCY_PROFILE);

  useEffect(() => {
    if (profile) {
      setForm(profile);
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<AgencyProfile>) => saveAgencyProfile({ data: { ...data, isCompleted: true } }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Cadastro do prestador concluído com sucesso! Bem-vindo(a) ao SM Hub.");
        queryClient.invalidateQueries({ queryKey: ["agency-profile"] });
        queryClient.invalidateQueries({ queryKey: ["orcamentos"] });
      } else {
        toast.error(res.error || "Erro ao salvar perfil.");
      }
    },
    onError: (err: any) => {
      toast.error(`Falha ao salvar: ${err.message || 'Erro inesperado'}`);
    }
  });

  const set = (patch: Partial<AgencyProfile>) => setForm((prev) => ({ ...prev, ...patch }));
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);

  // Se já está carregando, se o usuário dispensou, se já completou, ou se já está em configurações, não exibe
  if (isLoading || !profile) return null;
  if (dismissed) return null;
  if (location.pathname.startsWith("/configuracoes")) return null;
  if (location.pathname.startsWith("/suporte")) return null;
  if (profile.isCompleted && profile.legalName?.trim()) return null;

  const isFreelancer = form.providerType === "freelancer";
  const activeSpecialtyGroups = isFreelancer ? FREELANCER_SPECIALTIES : AGENCY_SPECIALTIES;
  const allSpecialties = activeSpecialtyGroups.flatMap((g) => g.options);
  const isRoleInList = form.professionalRole ? allSpecialties.includes(form.professionalRole) : false;

  const allBanks = BRAZILIAN_BANKS.flatMap((g) => g.options);
  const isBankInList = form.pixBank ? allBanks.includes(form.pixBank) : false;

  const handleComplete = () => {
    // Validação dos campos obrigatórios
    if (!form.legalName?.trim()) {
      toast.error(isFreelancer ? "Informe seu Nome Completo." : "Informe a Razão Social da agência.");
      return;
    }
    if (!form.docNumber?.trim()) {
      toast.error(isFreelancer ? "Informe seu CPF." : "Informe o CNPJ da empresa.");
      return;
    }
    if (!form.phone?.trim()) {
      toast.error("Informe seu número de WhatsApp oficial com DDD.");
      return;
    }
    if (!form.email?.trim()) {
      toast.error("Informe seu e-mail de contato oficial.");
      return;
    }
    if (!form.address?.trim() || !form.city?.trim() || !form.state?.trim()) {
      toast.error("Preencha o endereço completo (CEP, rua, número, cidade e estado).");
      return;
    }
    if (!form.pixKey?.trim() || !form.pixBeneficiary?.trim()) {
      toast.error("Informe sua Chave Pix oficial e o nome do favorecido.");
      return;
    }

    saveMutation.mutate(form);
  };

  return (
    <Dialog open={!dismissed} onOpenChange={(open) => !open && setDismissed(true)}>
      <DialogContent 
        className="max-w-4xl max-h-[92vh] overflow-y-auto bg-[#0a0a0c] border border-brand/30 text-white p-0 rounded-3xl shadow-2xl z-[100]"
      >
        {/* Header Banner */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-brand/20 via-brand/10 to-transparent border-b border-brand/20 relative">
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-6 right-6 size-8 rounded-full bg-white/10 hover:bg-white/20 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
            title="Fechar / Preencher mais tarde"
          >
            <X className="size-4" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-brand text-black text-xs font-black uppercase tracking-wider">
              Etapa de Ativação do Prestador
            </span>
            <span className="text-xs text-brand flex items-center gap-1 font-semibold">
              <ShieldCheck className="size-3.5" /> Validade Jurídica Art. 784 CPC
            </span>
          </div>

          <DialogTitle className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Identificação Oficial do Prestador
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-300 mt-2 max-w-2xl leading-relaxed">
            Seja muito bem-vindo(a) ao <strong>SM Hub</strong>! Conforme exigência legal para emissão de orçamentos, contratos de prestação de serviços e recebimento via Pix, preencha os dados oficiais da sua agência ou perfil freelancer.
          </DialogDescription>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          
          {/* PJ vs PF Toggle Cards */}
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-3">
              1. Selecione sua Modalidade de Atuação:
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => set({ 
                  providerType: "agency",
                  docType: "cnpj",
                  representativeRole: form.representativeRole || "Diretor Executivo",
                })}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  !isFreelancer
                    ? "bg-brand/10 border-brand text-white shadow-xl shadow-brand/10 ring-1 ring-brand"
                    : "bg-white/[0.02] border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="size-10 rounded-xl bg-brand/20 border border-brand/30 flex items-center justify-center text-brand">
                    <Building2 className="size-5" />
                  </div>
                  {!isFreelancer && (
                    <Badge className="bg-brand text-black font-black text-[10px]">SELECIONADO</Badge>
                  )}
                </div>
                <h3 className="font-bold text-white text-base">Agência Digital (PJ)</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Pessoas jurídicas com CNPJ (Ltda, ME, EPP, EIRELI) emitindo contratos em nome da empresa.
                </p>
              </div>

              <div
                onClick={() => set({ 
                  providerType: "freelancer",
                  docType: "cpf",
                  representativeRole: form.representativeRole || "Profissional Autônomo Independente",
                })}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  isFreelancer
                    ? "bg-brand/10 border-brand text-white shadow-xl shadow-brand/10 ring-1 ring-brand"
                    : "bg-white/[0.02] border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="size-10 rounded-xl bg-brand/20 border border-brand/30 flex items-center justify-center text-brand">
                    <Briefcase className="size-5" />
                  </div>
                  {isFreelancer && (
                    <Badge className="bg-brand text-black font-black text-[10px]">SELECIONADO</Badge>
                  )}
                </div>
                <h3 className="font-bold text-white text-base">Freelancer / Autônomo (PF)</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Profissionais autônomos que atuam com CPF e contratos amparados no Art. 442-B da CLT.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Identificação */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="size-6 rounded-lg bg-brand/20 text-brand text-xs font-black flex items-center justify-center">2</span>
              Identificação & Documentos
            </h4>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300 font-semibold">
                  {isFreelancer ? "Nome Completo do Profissional *" : "Razão Social da Empresa *"}
                </Label>
                <Input
                  value={form.legalName}
                  onChange={(e) => set({ legalName: e.target.value })}
                  placeholder={isFreelancer ? "Ex: Carlos Silva de Souza" : "Ex: Minha Empresa Digital Ltda."}
                  className="bg-black/40 border-white/10 h-11 rounded-xl text-sm focus:border-brand"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300 font-semibold">
                  {isFreelancer ? "Nome Profissional ou Marca Comercial" : "Nome Fantasia da Agência"}
                </Label>
                <Input
                  value={form.tradeName}
                  onChange={(e) => set({ tradeName: e.target.value })}
                  placeholder={isFreelancer ? "Ex: Silva Design & Marketing" : "Ex: SM Hub Digital"}
                  className="bg-black/40 border-white/10 h-11 rounded-xl text-sm focus:border-brand"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300 font-semibold">
                  {isFreelancer ? "CPF do Profissional *" : "CNPJ da Empresa *"}
                </Label>
                <Input
                  value={form.docNumber}
                  onChange={(e) => set({ docNumber: e.target.value })}
                  placeholder={isFreelancer ? "000.000.000-00" : "00.000.000/0001-00"}
                  className="bg-black/40 border-white/10 h-11 rounded-xl text-sm font-mono focus:border-brand"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300 font-semibold">
                  {isFreelancer ? "Especialidade Profissional *" : "Área Principal de Atuação *"}
                </Label>
                <select
                  className="h-11 w-full rounded-xl border border-white/10 bg-black/50 px-3.5 text-sm text-white focus:border-brand focus:outline-none"
                  value={isRoleInList ? form.professionalRole : (form.professionalRole ? "outro" : "")}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "outro") {
                      if (isRoleInList) set({ professionalRole: "" });
                    } else {
                      set({ professionalRole: val });
                    }
                  }}
                >
                  <option value="" disabled className="bg-neutral-900 text-gray-500">
                    {isFreelancer ? "Selecione sua especialidade..." : "Selecione a área da agência..."}
                  </option>
                  {activeSpecialtyGroups.map((group) => (
                    <optgroup key={group.group} label={group.group} className="bg-neutral-950 text-brand font-semibold">
                      {group.options.map((opt) => (
                        <option key={opt} value={opt} className="bg-neutral-900 text-white font-normal py-1">
                          {opt}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <optgroup label="Opção Personalizada" className="bg-neutral-950 text-gray-400 font-semibold">
                    <option value="outro" className="bg-neutral-900 text-amber-400 font-medium">
                      ✍️ Outro / Digitar Personalizado...
                    </option>
                  </optgroup>
                </select>

                {(!isRoleInList || !form.professionalRole) && (
                  <Input
                    value={form.professionalRole}
                    onChange={(e) => set({ professionalRole: e.target.value })}
                    placeholder="Digite sua especialidade personalizada"
                    className="bg-black/40 border-white/10 h-10 rounded-xl text-sm focus:border-brand mt-1.5"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Section: Contatos */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="size-6 rounded-lg bg-brand/20 text-brand text-xs font-black flex items-center justify-center">3</span>
              Contatos Oficiais
            </h4>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300 font-semibold">
                  WhatsApp com DDD (Para envio de propostas & notificações) *
                </Label>
                <Input
                  value={form.phone}
                  onChange={(e) => set({ phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="bg-black/40 border-white/10 h-11 rounded-xl text-sm focus:border-brand font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300 font-semibold">
                  E-mail Oficial de Contato *
                </Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set({ email: e.target.value })}
                  placeholder="contato@suaempresa.com.br"
                  className="bg-black/40 border-white/10 h-11 rounded-xl text-sm focus:border-brand"
                />
              </div>
            </div>
          </div>

          {/* Section: Endereço com Buscador de CEP */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="size-6 rounded-lg bg-brand/20 text-brand text-xs font-black flex items-center justify-center">4</span>
              Endereço da Sede & Foro Jurídico
            </h4>

            <AddressFormFields
              values={{
                zip: form.zip || "",
                address: form.address || "",
                addressNumber: form.addressNumber || "",
                district: form.district || "",
                city: form.city || "",
                state: form.state || "",
              }}
              onChange={(patch) => {
                set(patch);
                if (patch.city || patch.state) {
                  const newCity = patch.city ?? form.city;
                  const newState = patch.state ?? form.state;
                  if (!form.jurisdictionCity) {
                    set({ jurisdictionCity: `${newCity} - ${newState}` });
                  }
                }
              }}
              showComplement={false}
            />

            <div className="space-y-1.5 pt-2">
              <Label className="text-xs text-gray-300 font-semibold">
                Comarca Eleita para o Foro Jurídico (Art. 784 CPC)
              </Label>
              <Input
                value={form.jurisdictionCity || (form.city ? `${form.city} - ${form.state}` : "")}
                onChange={(e) => set({ jurisdictionCity: e.target.value })}
                placeholder="Ex: São Paulo - SP ou Rio de Janeiro - RJ"
                className="bg-black/40 border-white/10 h-10 rounded-xl text-sm focus:border-brand"
              />
            </div>
          </div>

          {/* Section: Pix e Dados Bancários */}
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="size-6 rounded-lg bg-brand/20 text-brand text-xs font-black flex items-center justify-center">5</span>
              Recebimento de Honorários via Pix
            </h4>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300 font-semibold">
                  Chave Pix Oficial para os Clientes Pagarem *
                </Label>
                <Input
                  value={form.pixKey}
                  onChange={(e) => set({ pixKey: e.target.value })}
                  placeholder="suachave@pix.com.br, CNPJ ou Celular"
                  className="bg-black/40 border-white/10 h-11 rounded-xl text-sm font-mono focus:border-brand text-brand font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-300 font-semibold">
                  Nome do Titular / Favorecido da Chave *
                </Label>
                <Input
                  value={form.pixBeneficiary || form.legalName}
                  onChange={(e) => set({ pixBeneficiary: e.target.value })}
                  placeholder="Nome idêntico ao cadastrado no banco"
                  className="bg-black/40 border-white/10 h-11 rounded-xl text-sm focus:border-brand"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs text-gray-300 font-semibold">
                  Banco / Instituição Financeira *
                </Label>
                <select
                  className="h-11 w-full rounded-xl border border-white/10 bg-black/50 px-3.5 text-sm text-white focus:border-brand focus:outline-none"
                  value={isBankInList ? form.pixBank : (form.pixBank ? "outro" : "")}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "outro") {
                      if (isBankInList) set({ pixBank: "" });
                    } else {
                      set({ pixBank: val });
                    }
                  }}
                >
                  <option value="" disabled className="bg-neutral-900 text-gray-500">
                    Selecione seu banco ou fintech...
                  </option>
                  {BRAZILIAN_BANKS.map((group) => (
                    <optgroup key={group.group} label={group.group} className="bg-neutral-950 text-brand font-semibold">
                      {group.options.map((bank) => (
                        <option key={bank} value={bank} className="bg-neutral-900 text-white font-normal py-1">
                          {bank}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <optgroup label="Outras Instituições" className="bg-neutral-950 text-gray-400 font-semibold">
                    <option value="outro" className="bg-neutral-900 text-amber-400 font-medium">
                      ✍️ Outro Banco / Não listado...
                    </option>
                  </optgroup>
                </select>

                {(!isBankInList) && (
                  <Input
                    value={form.pixBank || ""}
                    onChange={(e) => set({ pixBank: e.target.value })}
                    placeholder="Digite o nome do seu banco"
                    className="bg-black/40 border-white/10 h-10 rounded-xl text-sm focus:border-brand mt-1.5"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <Sparkles className="size-4 text-brand shrink-0" />
              Estes dados poderão ser editados a qualquer momento em <strong>Configurações &gt; Agência / Freelancer</strong>.
            </p>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDismissed(true)}
                className="text-neutral-400 hover:text-white hover:bg-white/5 text-xs px-4 h-11 rounded-xl"
              >
                Preencher Mais Tarde
              </Button>

              <Button
                type="button"
                variant="outline"
                asChild
                className="border-white/10 text-neutral-300 hover:text-white hover:bg-white/5 text-xs px-4 h-11 rounded-xl"
              >
                <Link to="/configuracoes" onClick={() => setDismissed(true)}>
                  Ir para Configurações
                </Link>
              </Button>

              <Button
                onClick={handleComplete}
                disabled={saveMutation.isPending}
                className="w-full sm:w-auto h-11 px-6 rounded-xl gradient-brand text-black font-extrabold text-xs shadow-xl shadow-brand/20 hover:opacity-95 transition-all flex items-center justify-center gap-2"
              >
                {saveMutation.isPending ? (
                  <>Salvando e Ativando Conta...</>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" /> Concluir e Ativar
                  </>
                )}
              </Button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
