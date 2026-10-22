import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserPlus, Trash2 } from "lucide-react";
import { listJourneys, inviteToOnboarding, reviewStep, removeJourney } from "@/lib/api-onboarding.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/integracao-equipe")({
  head: () => ({
    meta: [
      { title: "Integração da Equipe — SM Hub" },
      { name: "description", content: "Convide novos colaboradores e acompanhe e aprove cada etapa da integração." },
      { property: "og:title", content: "Integração da Equipe — SM Hub" },
      { property: "og:description", content: "Acompanhe a integração de novos colaboradores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const statusLabel: Record<string, string> = { invited: "Convidado", in_progress: "Em andamento", completed: "Concluída" };

function Page() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["journeys"], queryFn: () => listJourneys() });
  const [form, setForm] = useState({ name: "", email: "", role: "", track: "" });
  const [open, setOpen] = useState<string | null>(null);
  const [fb, setFb] = useState<Record<string, string>>({});
  const refresh = () => qc.invalidateQueries({ queryKey: ["journeys"] });

  const invite = useMutation({
    mutationFn: () => inviteToOnboarding({ data: form }),
    onSuccess: (r) => { toast.success(r.alreadyUser ? "Jornada criada. A pessoa já tem acesso: peça para entrar em /integracao." : "Convite enviado por e-mail."); setForm({ name: "", email: "", role: "", track: "" }); refresh(); },
    onError: (e: any) => toast.error(e.message),
  });
  const review = useMutation({
    mutationFn: (v: { journeyId: string; stepId: string; decision: "approved" | "needs_changes"; feedback: string }) => reviewStep({ data: v }),
    onSuccess: () => { toast.success("Avaliação registrada."); refresh(); },
    onError: (e: any) => toast.error(e.message),
  });
  const remove = useMutation({ mutationFn: (id: string) => removeJourney({ data: id }), onSuccess: refresh, onError: (e: any) => toast.error(e.message) });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integração da Equipe</h1>
        <p className="text-sm text-muted-foreground">Convide quem está chegando. A pessoa recebe um e-mail, cria a senha e segue as etapas; você aprova cada uma.</p>
      </div>

      <form className="grid gap-2 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[1fr_1fr_1fr_1fr_auto]" onSubmit={(e) => { e.preventDefault(); invite.mutate(); }}>
        <Input required placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input required type="email" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Input placeholder="Função (ex.: Designer)" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        <select aria-label="Trilha" className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={form.track} onChange={(e) => setForm({ ...form, track: e.target.value })}>
          <option value="">Trilha: automática pela função</option>
          {(data?.tracks ?? []).map((t: any) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <Button type="submit" disabled={invite.isPending}><UserPlus className="mr-1 size-4" />Convidar</Button>
      </form>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
      {data && data.journeys.length === 0 && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhuma integração iniciada ainda.</p>}

      <div className="space-y-3">
        {data?.journeys.map((j: any) => (
          <div key={j.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{j.name || j.email}</p>
                <p className="text-xs text-muted-foreground">{j.email}{j.role ? ` · ${j.role}` : ""} · Trilha: {data.tracks.find((t: any) => t.id === j.track)?.label ?? "Geral"} · {statusLabel[j.status] ?? j.status}</p>
              </div>
              {j.pendingReviews > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">{j.pendingReviews} para avaliar</span>}
              <div className="w-32"><Progress value={j.percent} /><p className="mt-1 text-right text-xs">{j.percent}%</p></div>
              <Button size="sm" variant="outline" onClick={() => setOpen(open === j.id ? null : j.id)}>{open === j.id ? "Fechar" : "Ver etapas"}</Button>
              <Button size="icon" variant="ghost" onClick={() => confirm(`Remover a integração de ${j.name || j.email}?`) && remove.mutate(j.id)}><Trash2 className="size-4" /></Button>
            </div>
            {open === j.id && (
              <div className="mt-4 space-y-2 border-t border-border pt-4">
                {j.steps.map((s: any) => {
                  const p = j.progress.find((x: any) => x.item_id === `step:${s.id}`);
                  const key = `${j.id}:${s.id}`;
                  return (
                    <div key={s.id} className="rounded-xl border border-border p-3">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="font-medium">{s.title}</span>
                        <span className="text-xs text-muted-foreground">{({ under_review: "Aguardando você", approved: "Aprovada", needs_changes: "Pediu ajuste" } as any)[p?.status] ?? "Não enviada"}</span>
                      </div>
                      {p?.submission && <p className="mt-2 rounded-lg bg-muted p-2 text-sm">{p.submission}</p>}
                      {p?.status === "under_review" && (
                        <div className="mt-2 space-y-2">
                          <Textarea placeholder="Comentário (opcional)" value={fb[key] ?? ""} onChange={(e) => setFb({ ...fb, [key]: e.target.value })} />
                          <div className="flex gap-2">
                            <Button size="sm" disabled={review.isPending} onClick={() => review.mutate({ journeyId: j.id, stepId: s.id, decision: "approved", feedback: fb[key] ?? "" })}>Aprovar</Button>
                            <Button size="sm" variant="outline" disabled={review.isPending} onClick={() => review.mutate({ journeyId: j.id, stepId: s.id, decision: "needs_changes", feedback: fb[key] ?? "" })}>Pedir ajuste</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {(() => { const q = j.progress.find((x: any) => x.item_id === "quiz"); if (!q) return null; const r = JSON.parse(q.submission || "{}"); return <p className="text-sm">Avaliação: <strong>{r.score}/{r.total}</strong> acertos</p>; })()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
