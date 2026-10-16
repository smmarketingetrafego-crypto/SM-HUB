import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Copy, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { listPlans, createSubscriptionCheckout, getPaymentStatus } from "@/lib/api-subscriptions.functions";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPlanId?: string;
  userEmail?: string;
  userName?: string;
  onSubscriptionSuccess?: (planName: string) => void;
}

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function SubscriptionCheckoutModal({ open, onOpenChange, defaultPlanId, userName = "", onSubscriptionSuccess }: Props) {
  const qc = useQueryClient();
  const { data: plans = [] } = useQuery({ queryKey: ["plans"], queryFn: () => listPlans(), enabled: open });
  const [planId, setPlanId] = useState<string | undefined>(defaultPlanId);
  const [billingType, setBillingType] = useState<"PIX" | "BOLETO" | "CREDIT_CARD">("PIX");
  const [name, setName] = useState(userName);
  const [doc, setDoc] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<any>(null);
  const [paid, setPaid] = useState(false);

  const plan = plans.find((p) => p.id === planId) ?? plans[0];

  useEffect(() => {
    if (!payment || paid) return;
    const t = setInterval(async () => {
      try {
        const r = await getPaymentStatus({ data: payment.id });
        if (r.isPaid) {
          setPaid(true);
          qc.invalidateQueries({ queryKey: ["active-subscription"] });
          onSubscriptionSuccess?.(plan?.name ?? "");
          toast.success("Pagamento confirmado! Plano ativado.");
        }
      } catch {}
    }, 5000);
    return () => clearInterval(t);
  }, [payment, paid, plan?.name, qc, onSubscriptionSuccess]);

  const submit = async () => {
    if (!plan) return;
    setLoading(true);
    try {
      const r = await createSubscriptionCheckout({ data: { planId: plan.id, billingType, name, cpfCnpj: doc, phone } });
      if (!r.success) throw new Error(r.error);
      setPayment(r.payment);
      if (billingType !== "PIX" && r.payment?.invoice_url) window.open(r.payment.invoice_url, "_blank");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = (o: boolean) => {
    if (!o) {
      setPayment(null);
      setPaid(false);
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assinar SM Hub</DialogTitle>
          <DialogDescription>Pagamento seguro processado pelo Asaas.</DialogDescription>
        </DialogHeader>

        {paid ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 className="size-12 text-primary" />
            <p className="text-lg font-semibold">Plano {plan?.name} ativado!</p>
            <Button onClick={() => reset(false)}>Fechar</Button>
          </div>
        ) : payment ? (
          <div className="space-y-4">
            {payment.pix_image ? (
              <>
                <img src={`data:image/png;base64,${payment.pix_image}`} alt="QR Code Pix" className="mx-auto size-56 rounded-lg bg-card" />
                <div className="flex gap-2">
                  <Input readOnly value={payment.pix_payload ?? ""} />
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(payment.pix_payload ?? "");
                      toast.success("Código Pix copiado");
                    }}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Abrimos a página de pagamento em outra aba.</p>
            )}
            {payment.invoice_url && (
              <Button variant="outline" className="w-full" asChild>
                <a href={payment.invoice_url} target="_blank" rel="noreferrer">
                  Abrir fatura <ExternalLink className="ml-2 size-4" />
                </a>
              </Button>
            )}
            <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" /> Aguardando confirmação do pagamento…
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2">
              {plans.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlanId(p.id)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition",
                    plan?.id === p.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{p.name}</span>
                    <span className="font-semibold">{brl(p.price)}<span className="text-xs text-muted-foreground">/{p.cycle === "YEARLY" ? "ano" : "mês"}</span></span>
                  </div>
                  {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                </button>
              ))}
              {plans.length === 0 && <p className="text-sm text-muted-foreground">Nenhum plano disponível.</p>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["PIX", "BOLETO", "CREDIT_CARD"] as const).map((b) => (
                <Button key={b} type="button" variant={billingType === b ? "default" : "outline"} onClick={() => setBillingType(b)}>
                  {b === "PIX" ? "Pix" : b === "BOLETO" ? "Boleto" : "Cartão"}
                </Button>
              ))}
            </div>
            <div className="grid gap-3">
              <div><Label>Nome completo ou razão social</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>CPF ou CNPJ</Label><Input value={doc} onChange={(e) => setDoc(e.target.value)} inputMode="numeric" /></div>
              <div><Label>Celular (opcional)</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" /></div>
            </div>
            <Button className="w-full" disabled={loading || !plan} onClick={submit}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : `Gerar cobrança ${plan ? brl(plan.price) : ""}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
