import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { checkPaymentStatus, simulatePaymentConfirmation } from "@/lib/api-webhooks.server";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  SYSTEM_PLANS,
  createSubscriptionCheckout,
  confirmSubscriptionPayment,
  type PlanDefinition,
  type SubscriptionTransaction,
} from "@/lib/api-subscriptions.server";
import { sendTransactionalEmail } from "@/lib/api-email.server";
import {
  CheckCircle2,
  Copy,
  Check,
  CreditCard,
  QrCode,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Building2,
  Lock,
  ChevronLeft,
  Calendar,
  AlertCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

interface SubscriptionCheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPlanId?: "freelancer" | "growth" | "scale";
  userEmail?: string;
  userName?: string;
  onSubscriptionSuccess?: (planName: string) => void;
}

export function SubscriptionCheckoutModal({
  open,
  onOpenChange,
  defaultPlanId = "growth",
  userEmail = "",
  userName = "",
  onSubscriptionSuccess,
}: SubscriptionCheckoutModalProps) {
  const queryClient = useQueryClient();

  const [step, setStep] = useState<"plan" | "payment" | "success">("plan");
  const [selectedPlanId, setSelectedPlanId] = useState<"freelancer" | "growth" | "scale">(defaultPlanId);
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "credit_card">("pix");
  const [gateway, setGateway] = useState<"asaas" | "mercadopago" | "stripe">("asaas");

  // Customer info (100% limpo por padrão para novos clientes)
  const [name, setName] = useState(userName || "");
  const [email, setEmail] = useState(userEmail || "");
  const [phone, setPhone] = useState("");
  const [docNumber, setDocNumber] = useState("");

  // Card details
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  // Transaction result
  const [transaction, setTransaction] = useState<SubscriptionTransaction | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  const selectedPlan = SYSTEM_PLANS.find((p) => p.id === selectedPlanId) || SYSTEM_PLANS[1];

  // Polling em tempo real de liquidação Pix via Webhook
  useEffect(() => {
    if (!transaction || transaction.status === "paid" || step !== "payment") return;

    const interval = setInterval(async () => {
      try {
        const res = await checkPaymentStatus({ data: { type: "subscription", id: transaction.id } });
        if (res.success && res.isPaid) {
          setStep("success");
          queryClient.invalidateQueries({ queryKey: ["active-subscription"] });
          if (onSubscriptionSuccess) onSubscriptionSuccess(selectedPlan.name);
          toast.success(`🎉 Pagamento identificado! Plano ${selectedPlan.name} ativado.`);
          clearInterval(interval);
        }
      } catch {}
    }, 3500);

    return () => clearInterval(interval);
  }, [transaction?.id, transaction?.status, step, selectedPlan.name, queryClient, onSubscriptionSuccess]);

  // Simular Webhook de Pagamento Instantâneo
  const handleSimulateWebhook = async () => {
    if (!transaction?.id) return;
    toast.loading("Simulando notificação de webhook do gateway bancário...", { id: "sim-sub" });
    try {
      const res = await simulatePaymentConfirmation({ data: { type: "subscription", id: transaction.id, gateway: "asaas" } });
      if (res.success) {
        toast.success("Webhook recebido e conciliado! Plano ativado instantaneamente.", { id: "sim-sub" });
        setStep("success");
        queryClient.invalidateQueries({ queryKey: ["active-subscription"] });
        if (onSubscriptionSuccess) onSubscriptionSuccess(selectedPlan.name);
      } else {
        toast.error("Falha na simulação.", { id: "sim-sub" });
      }
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`, { id: "sim-sub" });
    }
  };

  // Format Card Number (XXXX XXXX XXXX XXXX)
  const handleCardNumberChange = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 16);
    const parts = raw.match(/.{1,4}/g);
    setCardNumber(parts ? parts.join(" ") : raw);
  };

  // Format Expiry (MM/AA)
  const handleExpiryChange = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 4);
    if (raw.length > 2) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  // Checkout Mutation
  const checkoutMutation = useMutation({
    mutationFn: (payload: any) => createSubscriptionCheckout({ data: payload }),
    onSuccess: (res) => {
      if (res.success && res.transaction) {
        setTransaction(res.transaction);
        if (res.transaction.status === "paid") {
          setStep("success");
          queryClient.invalidateQueries({ queryKey: ["active-subscription"] });
          if (onSubscriptionSuccess) onSubscriptionSuccess(selectedPlan.name);
          toast.success(`Assinatura do plano ${selectedPlan.name} confirmada!`);
          sendTransactionalEmail({
            data: {
              to: email,
              type: "subscription",
              planName: selectedPlan.name,
              userName: name,
              subject: `🎉 Assinatura ${selectedPlan.name} Ativada — SM Hub`,
            },
          }).catch((e) => console.warn("Email dispatch error:", e));
        } else {
          setStep("payment");
        }
      } else {
        toast.error(res.error || "Erro ao processar assinatura.");
      }
    },
    onError: (err: any) => {
      toast.error(`Falha ao conectar com gateway: ${err.message}`);
    },
  });

  // Confirm Pix Mutation
  const confirmPixMutation = useMutation({
    mutationFn: (txId: string) => confirmSubscriptionPayment({ data: txId }),
    onSuccess: (res) => {
      if (res.success) {
        setStep("success");
        queryClient.invalidateQueries({ queryKey: ["active-subscription"] });
        if (onSubscriptionSuccess) onSubscriptionSuccess(selectedPlan.name);
        toast.success(`Pagamento Pix aprovado! Assinatura ativada.`);
        sendTransactionalEmail({
          data: {
            to: email,
            type: "subscription",
            planName: selectedPlan.name,
            userName: name,
            subject: `🎉 Assinatura ${selectedPlan.name} Ativada — SM Hub`,
          },
        }).catch((e) => console.warn("Email dispatch error:", e));
      } else {
        toast.error(res.error || "Pagamento ainda não confirmado.");
      }
    },
  });

  const handleStartCheckout = () => {
    if (!name.trim()) {
      toast.error("Por favor, preencha seu Nome Completo.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Por favor, preencha um E-mail válido para a assinatura.");
      return;
    }

    if (paymentMethod === "credit_card") {
      if (cardNumber.replace(/\D/g, "").length < 15) {
        toast.error("Informe um número de cartão de crédito válido.");
        return;
      }
      if (!cardHolder.trim()) {
        toast.error("Informe o nome do titular como está no cartão.");
        return;
      }
      if (cardExpiry.length < 5) {
        toast.error("Informe a validade do cartão (MM/AA).");
        return;
      }
      if (cardCvv.length < 3) {
        toast.error("Informe o código de segurança (CVV).");
        return;
      }
    }

    const [expMonth, expYear] = cardExpiry.split("/");

    checkoutMutation.mutate({
      planId: selectedPlanId,
      paymentMethod,
      gateway,
      customer: {
        name,
        email,
        phone,
        docNumber,
      },
      cardDetails:
        paymentMethod === "credit_card"
          ? {
              cardNumber: cardNumber.replace(/\D/g, ""),
              holderName: cardHolder,
              expiryMonth: expMonth || "12",
              expiryYear: expYear ? `20${expYear}` : "2028",
              cvv: cardCvv,
            }
          : undefined,
    });
  };

  const copyPixCode = () => {
    if (transaction?.pix?.copiaECola) {
      navigator.clipboard.writeText(transaction.pix.copiaECola);
      setCopiedPix(true);
      toast.success("Código Pix Copia e Cola copiado para a área de transferência!");
      setTimeout(() => setCopiedPix(false), 3000);
    }
  };

  const resetModal = () => {
    setStep("plan");
    setTransaction(null);
    setCardNumber("");
    setCardHolder("");
    setCardExpiry("");
    setCardCvv("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetModal}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto bg-[#0a0a0c] border border-white/10 text-white p-6 sm:p-8 rounded-3xl shadow-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#ff5722]/20 text-[#ff5722] border border-[#ff5722]/30">
              GATEWAY DE PAGAMENTOS OFICIAL
            </span>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Lock className="size-3 text-emerald-400" /> Criptografia SSL 256-bit
            </span>
          </div>

          <DialogTitle className="text-2xl font-black text-white">
            {step === "plan" && "Selecione o Plano Ideal para sua Operação"}
            {step === "payment" && `Pagamento da Assinatura — ${selectedPlan.name}`}
            {step === "success" && "Assinatura Ativada com Sucesso!"}
          </DialogTitle>

          <DialogDescription className="text-xs text-gray-400">
            {step === "plan" && "Escolha a modalidade que melhor atende sua agência ou atividade como freelancer autônomo."}
            {step === "payment" && "Efetue o pagamento com aprovação imediata via Pix ou Cartão de Crédito."}
            {step === "success" && "Seu plano foi confirmado no sistema. Todos os módulos correspondentes estão liberados."}
          </DialogDescription>
        </DialogHeader>

        {/* ------------------------------------------------------------------ */}
        {/* ETAPA 1: ESCOLHA DO PLANO                                          */}
        {/* ------------------------------------------------------------------ */}
        {step === "plan" && (
          <div className="space-y-6 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SYSTEM_PLANS.map((p) => {
                const isSelected = selectedPlanId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlanId(p.id)}
                    className={`p-6 rounded-2xl border flex flex-col justify-between transition-all cursor-pointer relative ${
                      isSelected
                        ? "bg-gradient-to-b from-[#ff5722]/15 to-transparent border-[#ff5722] shadow-xl shadow-[#ff5722]/10 ring-2 ring-[#ff5722]"
                        : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                    }`}
                  >
                    {p.popular && (
                      <span className="absolute -top-3 right-6 text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-[#ff5722] to-[#ff3d00] text-white px-2.5 py-0.5 rounded-full shadow-md">
                        Mais Escolhido
                      </span>
                    )}

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-white text-base">{p.name}</h4>
                        <div
                          className={`size-5 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? "border-[#ff5722] bg-[#ff5722] text-white"
                              : "border-white/20 bg-black/40"
                          }`}
                        >
                          {isSelected && <Check className="size-3" />}
                        </div>
                      </div>

                      <div>
                        <span className="text-3xl font-black text-white">{p.priceFormatted}</span>
                        <span className="text-xs text-gray-400 font-normal">{p.period}</span>
                      </div>

                      <p className="text-xs text-gray-400 leading-relaxed min-h-[36px]">{p.tagline}</p>

                      <ul className="space-y-2 pt-3 border-t border-white/5 text-xs text-gray-300">
                        {p.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="size-3.5 text-[#ff5722] shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlanId(p.id);
                        setStep("payment");
                      }}
                      className={`w-full mt-6 h-11 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? "bg-gradient-to-r from-[#ff5722] to-[#ff3d00] text-white shadow-lg shadow-[#ff5722]/20 hover:opacity-95"
                          : "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                      }`}
                    >
                      Assinar {p.name}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* ETAPA 2: FORMA DE PAGAMENTO E DADOS (GATEWAY PIX / CARTÃO)          */}
        {/* ------------------------------------------------------------------ */}
        {step === "payment" && (
          <div className="space-y-6 mt-4">
            {/* Header resumo do plano escolhido */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-[#ff5722]/20 border border-[#ff5722]/30 flex items-center justify-center text-[#ff5722] font-black">
                  SM
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{selectedPlan.name}</h4>
                  <p className="text-xs text-gray-400">Assinatura mensal recorrente com cancelamento livre</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-2xl font-black text-white">{selectedPlan.priceFormatted}</span>
                  <span className="text-xs text-gray-400">{selectedPlan.period}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep("plan")}
                  className="h-8 text-xs border-white/15 text-gray-300 hover:text-white"
                >
                  Trocar
                </Button>
              </div>
            </div>

            {/* Dados do Assinante (100% limpos e editáveis) */}
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                <Building2 className="size-3.5 text-[#ff5722]" /> Dados do Titular da Assinatura
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-400">Nome Completo / Razão Social *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Digite seu nome completo"
                    className="bg-black/60 border-white/10 text-xs text-white h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-400">E-mail para Acesso e Faturas *</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="bg-black/60 border-white/10 text-xs text-white h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-400">WhatsApp / Telefone *</Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="bg-black/60 border-white/10 text-xs text-white h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-400">CPF ou CNPJ *</Label>
                  <Input
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    placeholder="000.000.000-00"
                    className="bg-black/60 border-white/10 text-xs text-white h-10"
                  />
                </div>
              </div>
            </div>

            {/* Alternância de Meio de Pagamento */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("pix")}
                className={`p-4 rounded-2xl border flex items-center justify-center gap-3 transition-all ${
                  paymentMethod === "pix"
                    ? "bg-[#ff5722]/10 border-[#ff5722] text-white shadow-lg shadow-[#ff5722]/5"
                    : "bg-white/[0.02] border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <QrCode className={`size-5 ${paymentMethod === "pix" ? "text-[#ff5722]" : ""}`} />
                <div className="text-left">
                  <p className="font-bold text-sm">Pix Instantâneo</p>
                  <p className="text-[11px] text-gray-400">Aprovação imediata em segundos</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("credit_card")}
                className={`p-4 rounded-2xl border flex items-center justify-center gap-3 transition-all ${
                  paymentMethod === "credit_card"
                    ? "bg-[#ff5722]/10 border-[#ff5722] text-white shadow-lg shadow-[#ff5722]/5"
                    : "bg-white/[0.02] border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <CreditCard className={`size-5 ${paymentMethod === "credit_card" ? "text-[#ff5722]" : ""}`} />
                <div className="text-left">
                  <p className="font-bold text-sm">Cartão de Crédito</p>
                  <p className="text-[11px] text-gray-400">Renovação automática</p>
                </div>
              </button>
            </div>

            {/* FLUXO PIX */}
            {paymentMethod === "pix" && (
              <div className="space-y-6 bg-white/[0.02] border border-white/10 rounded-2xl p-6">
                {!transaction?.pix ? (
                  <div className="space-y-4 max-w-md mx-auto text-center">
                    <p className="text-xs text-gray-400">
                      Clique no botão abaixo para gerar a cobrança Pix oficial com QR Code dinâmico do plano{" "}
                      <strong className="text-white">{selectedPlan.name}</strong>.
                    </p>
                    <Button
                      onClick={handleStartCheckout}
                      disabled={checkoutMutation.isPending}
                      className="w-full h-12 rounded-xl bg-gradient-to-r from-[#ff5722] to-[#ff3d00] hover:from-[#f4511e] hover:to-[#e64a19] text-white font-bold text-sm shadow-xl shadow-[#ff5722]/20"
                    >
                      {checkoutMutation.isPending ? (
                        <>
                          <RefreshCw className="size-4 animate-spin mr-2" />
                          Gerando Cobrança Pix...
                        </>
                      ) : (
                        <>
                          <QrCode className="size-4 mr-2" />
                          Gerar Código Pix de {selectedPlan.priceFormatted}
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6 text-center max-w-lg mx-auto">
                    <div className="space-y-1">
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                        Aguardando Pagamento
                      </Badge>
                      <h4 className="text-base font-bold text-white">Escaneie o QR Code no seu aplicativo bancário</h4>
                    </div>

                    {/* QR Code Img */}
                    <div className="size-52 bg-white p-3 rounded-2xl mx-auto shadow-xl flex items-center justify-center">
                      <img
                        src={transaction.pix.qrCodeUrl}
                        alt="QR Code Pix"
                        className="size-full object-contain"
                      />
                    </div>

                    {/* Copia e Cola */}
                    <div className="space-y-2 text-left">
                      <Label className="text-xs text-gray-400 font-semibold">Código Pix Copia e Cola:</Label>
                      <div className="flex gap-2">
                        <Input
                          readOnly
                          value={transaction.pix.copiaECola}
                          className="bg-black/80 border-white/10 text-xs font-mono text-gray-300 h-10 select-all"
                        />
                        <Button
                          type="button"
                          onClick={copyPixCode}
                          className="h-10 px-4 bg-[#ff5722] hover:bg-[#f4511e] text-white font-bold text-xs shrink-0 flex items-center gap-1.5"
                        >
                          {copiedPix ? <Check className="size-4" /> : <Copy className="size-4" />}
                          {copiedPix ? "Copiado!" : "Copiar"}
                        </Button>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs text-left flex items-start gap-2.5">
                      <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-400" />
                      <span>
                        Após efetuar a transferência no seu banco, o sistema reconhece o pagamento automaticamente. Você também pode clicar no botão de confirmação abaixo.
                      </span>
                    </div>

                    <Button
                      onClick={() => confirmPixMutation.mutate(transaction.id)}
                      disabled={confirmPixMutation.isPending}
                      className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-sm shadow-xl shadow-emerald-500/20"
                    >
                      {confirmPixMutation.isPending ? (
                        <>
                          <RefreshCw className="size-4 animate-spin mr-2" />
                          Validando com o Banco Central...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="size-4 mr-2" />
                          Já Paguei! Confirmar e Ativar Plano
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleSimulateWebhook}
                      className="w-full text-xs text-gray-400 hover:text-white border border-white/5 hover:border-white/20 h-10 rounded-xl"
                    >
                      <Zap className="size-3.5 mr-1.5 text-[#ff5722]" /> Simular Liquidação Pix em Tempo Real (Webhook)
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* FLUXO CARTÃO DE CRÉDITO */}
            {paymentMethod === "credit_card" && (
              <div className="space-y-6 bg-white/[0.02] border border-white/10 rounded-2xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Cartão Visual 3D Preview */}
                  <div className="h-48 rounded-2xl bg-gradient-to-tr from-neutral-900 via-neutral-800 to-neutral-900 border border-white/15 p-6 flex flex-col justify-between text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 size-36 bg-[#ff5722]/20 rounded-full blur-2xl pointer-events-none" />
                    
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs uppercase tracking-widest text-gray-400">SM Hub Platinum</span>
                      <CreditCard className="size-6 text-[#ff5722]" />
                    </div>

                    <div className="font-mono text-lg tracking-widest font-bold text-white drop-shadow">
                      {cardNumber || "•••• •••• •••• ••••"}
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono uppercase text-gray-300">
                      <div>
                        <span className="text-[9px] text-gray-500 block">Titular</span>
                        <span className="truncate max-w-[140px] block font-semibold">
                          {cardHolder || "SEU NOME"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-gray-500 block">Validade</span>
                        <span className="font-semibold">{cardExpiry || "MM/AA"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Form de Dados do Cartão */}
                  <div className="space-y-3.5">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-300">Número do Cartão</Label>
                      <Input
                        value={cardNumber}
                        onChange={(e) => handleCardNumberChange(e.target.value)}
                        placeholder="0000 0000 0000 0000"
                        className="bg-black/60 border-white/10 text-sm font-mono text-white h-10"
                        maxLength={19}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-gray-300">Nome no Cartão</Label>
                      <Input
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                        placeholder="NOME COMO IMPRESSO"
                        className="bg-black/60 border-white/10 text-sm text-white h-10"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-300">Validade (MM/AA)</Label>
                        <Input
                          value={cardExpiry}
                          onChange={(e) => handleExpiryChange(e.target.value)}
                          placeholder="MM/AA"
                          className="bg-black/60 border-white/10 text-sm font-mono text-white h-10"
                          maxLength={5}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-gray-300">Código CVV</Label>
                        <Input
                          type="password"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          placeholder="123"
                          className="bg-black/60 border-white/10 text-sm font-mono text-white h-10"
                          maxLength={4}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gateway Selector (Asaas, Stripe, Mercado Pago) */}
                <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-brand" /> Processador de Cobrança:
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setGateway("asaas")}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                        gateway === "asaas" ? "border-brand bg-brand/20 text-white" : "border-white/10 text-gray-400"
                      }`}
                    >
                      Asaas
                    </button>
                    <button
                      type="button"
                      onClick={() => setGateway("mercadopago")}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                        gateway === "mercadopago" ? "border-brand bg-brand/20 text-white" : "border-white/10 text-gray-400"
                      }`}
                    >
                      Mercado Pago
                    </button>
                    <button
                      type="button"
                      onClick={() => setGateway("stripe")}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${
                        gateway === "stripe" ? "border-brand bg-brand/20 text-white" : "border-white/10 text-gray-400"
                      }`}
                    >
                      Stripe
                    </button>
                  </div>
                </div>

                <Button
                  onClick={handleStartCheckout}
                  disabled={checkoutMutation.isPending}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-[#ff5722] to-[#ff3d00] hover:from-[#f4511e] hover:to-[#e64a19] text-white font-bold text-sm shadow-xl shadow-[#ff5722]/20"
                >
                  {checkoutMutation.isPending ? (
                    <>
                      <RefreshCw className="size-4 animate-spin mr-2" />
                      Processando com {gateway.toUpperCase()}...
                    </>
                  ) : (
                    <>
                      <Lock className="size-4 mr-2" />
                      Assinar {selectedPlan.name} por {selectedPlan.priceFormatted}/mês
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* ETAPA 3: SUCESSO E ATIVAÇÃO                                        */}
        {/* ------------------------------------------------------------------ */}
        {step === "success" && (
          <div className="space-y-6 mt-6 max-w-md mx-auto text-center py-6">
            <div className="size-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30 shadow-2xl shadow-emerald-500/20">
              <CheckCircle2 className="size-10" />
            </div>

            <div className="space-y-2">
              <h4 className="text-2xl font-black text-white">Parabéns! Assinatura Ativa</h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                O plano <strong className="text-[#ff5722] font-bold">{selectedPlan.name}</strong> foi ativado com sucesso para sua conta.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-left text-xs space-y-2">
              <div className="flex justify-between text-gray-400">
                <span>Plano:</span>
                <span className="text-white font-bold">{selectedPlan.name}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Valor:</span>
                <span className="text-white font-bold">{selectedPlan.priceFormatted}/mês</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Status da Conta:</span>
                <span className="text-emerald-400 font-bold">100% Ativo & Ilimitado</span>
              </div>
            </div>

            <Button
              onClick={resetModal}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-[#ff5722] to-[#ff3d00] hover:from-[#f4511e] hover:to-[#e64a19] text-white font-bold text-sm shadow-xl shadow-[#ff5722]/20"
            >
              Continuar no SM Hub
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
