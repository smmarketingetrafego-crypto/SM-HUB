import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, AlertCircle, Circle, BookOpen, FileText, ListChecks, Megaphone, GraduationCap, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getMyJourney, submitStep, submitQuiz } from "@/lib/api-onboarding.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthState, AuthSplash } from "@/lib/auth-gate";

export const Route = createFileRoute("/integracao")({
  head: () => ({
    meta: [
      { title: "Minha Integração — SM Hub" },
      { name: "description", content: "Sua jornada de boas-vindas: etapas, aulas, documentos e avaliação da equipe." },
      { property: "og:title", content: "Minha Integração — SM Hub" },
      { property: "og:description", content: "Sua jornada de boas-vindas na equipe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IntegracaoPage,
});

const statusInfo: Record<string, { label: string; icon: any; cls: string }> = {
  pending: { label: "A fazer", icon: Circle, cls: "text-muted-foreground" },
  under_review: { label: "Em avaliação", icon: Clock, cls: "text-amber-500" },
  approved: { label: "Aprovada", icon: CheckCircle2, cls: "text-emerald-500" },
  needs_changes: { label: "Ajustar", icon: AlertCircle, cls: "text-destructive" },
};

function Md({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
      {String(text ?? "").split("\n").filter((l) => l.trim()).map((l, i) => (
        <p key={i} dangerouslySetInnerHTML={{ __html: l.trim().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\*\*(.+?)\*\*/g, "<strong class='text-foreground'>$1</strong>") }} />
      ))}
    </div>
  );
}

function SetPassword() {
  const [show, setShow] = useState(false);
  const [pw, setPw] = useState("");
  useEffect(() => { if (window.location.hash.includes("type=invite")) setShow(true); }, []);
  if (!show) return null;
  return (
    <div className="rounded-2xl border border-primary/40 bg-card p-5">
      <h2 className="font-semibold">Crie sua senha</h2>
      <p className="mt-1 text-sm text-muted-foreground">Assim você poderá entrar depois com seu e-mail.</p>
      <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={async (e) => {
        e.preventDefault();
        const { error } = await supabase.auth.updateUser({ password: pw });
        if (error) return toast.error(error.message);
        toast.success("Senha criada!"); setShow(false);
      }}>
        <Input type="password" minLength={8} required placeholder="Mínimo 8 caracteres" value={pw} onChange={(e) => setPw(e.target.value)} />
        <Button type="submit">Salvar senha</Button>
      </form>
    </div>
  );
}

function IntegracaoPage() {
  const auth = useAuthState();
  if (auth === "loading") return <AuthSplash />;
  if (auth === "anon") {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-2xl font-bold">Sua integração</h1>
          <p className="mt-2 text-sm text-muted-foreground">Entre com o e-mail em que você recebeu o convite.</p>
          <Button asChild className="mt-5"><Link to="/auth">Entrar</Link></Button>
        </div>
      </div>
    );
  }
  return <Journey />;
}

function Journey() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["my-journey"], queryFn: () => getMyJourney() });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<number[]>([]);
  const [quizResult, setQuizResult] = useState<any>(null);

  const send = useMutation({
    mutationFn: (v: { stepId: string; submission: string }) => submitStep({ data: v }),
    onSuccess: () => { toast.success("Enviado para avaliação do gestor."); qc.invalidateQueries({ queryKey: ["my-journey"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const quiz = useMutation({
    mutationFn: () => submitQuiz({ data: { answers } }),
    onSuccess: (r) => { setQuizResult(r); qc.invalidateQueries({ queryKey: ["my-journey"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <AuthSplash />;
  if (error) return <div className="p-8 text-center text-destructive">{(error as Error).message}</div>;
  if (!data?.journey) {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold">Nenhuma integração encontrada</h1>
          <p className="mt-2 text-sm text-muted-foreground">Confirme que entrou com o mesmo e-mail do convite, ou peça ao seu gestor para enviar um novo.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button asChild variant="outline"><Link to="/">Ir ao painel</Link></Button>
            <Button variant="ghost" onClick={() => supabase.auth.signOut()}>Sair</Button>
          </div>
        </div>
      </div>
    );
  }

  const { journey, content, progress, percent, accountName } = data as any;
  const prog = (id: string) => progress.find((p: any) => p.item_id === `step:${id}`);
  const acts: Record<string, any[]> = {};
  content.steps.forEach((s: any) => { (acts[s.act] ??= []).push(s); });
  const quizDone = progress.find((p: any) => p.item_id === "quiz");

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary">Integração · {accountName}</p>
          <h1 className="mt-1 text-3xl font-bold">Bem-vindo(a), {journey.name || "colaborador(a)"}!</h1>
          {journey.role && <p className="text-sm text-muted-foreground">{journey.role}</p>}
        </div>
        <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}><LogOut className="mr-1 size-4" />Sair</Button>
      </header>

      <SetPassword />

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{journey.status === "completed" ? "Integração concluída 🎉" : "Seu progresso"}</span>
          <span className="font-bold text-primary">{percent}%</span>
        </div>
        <Progress value={percent} className="mt-2" />
        <p className="mt-2 text-xs text-muted-foreground">Cada etapa é concluída quando seu gestor aprova o que você enviou.</p>
      </div>

      <Tabs defaultValue="etapas">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="etapas"><ListChecks className="mr-1 size-4" />Etapas</TabsTrigger>
          <TabsTrigger value="aulas"><GraduationCap className="mr-1 size-4" />Aulas</TabsTrigger>
          <TabsTrigger value="docs"><FileText className="mr-1 size-4" />Documentos</TabsTrigger>
          <TabsTrigger value="checklists"><BookOpen className="mr-1 size-4" />Checklists</TabsTrigger>
          <TabsTrigger value="avisos"><Megaphone className="mr-1 size-4" />Avisos</TabsTrigger>
          <TabsTrigger value="quiz">Avaliação</TabsTrigger>
        </TabsList>

        <TabsContent value="etapas" className="space-y-6">
          {Object.entries(acts).map(([act, steps]) => (
            <section key={act} className="space-y-3">
              <h2 className="text-sm font-semibold text-primary">{act}</h2>
              {steps.map((s: any) => {
                const p = prog(s.id);
                const st = statusInfo[p?.status ?? "pending"];
                const Icon = st.icon;
                const canSend = !p || p.status === "pending" || p.status === "needs_changes";
                return (
                  <details key={s.id} className="group rounded-2xl border border-border bg-card p-4">
                    <summary className="flex cursor-pointer list-none items-center gap-3">
                      <Icon className={`size-5 shrink-0 ${st.cls}`} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{s.title}</p>
                        <p className="text-xs text-muted-foreground">{s.category} · {s.estimatedTime} · {s.points} pts</p>
                      </div>
                      <span className={`text-xs font-medium ${st.cls}`}>{st.label}</span>
                    </summary>
                    <div className="mt-4 space-y-3 border-t border-border pt-4">
                      <p className="text-sm">{s.summary}</p>
                      <Md text={s.details} />
                      {s.checklist?.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">{s.checklist.map((c: any, i: number) => <li key={i}>{typeof c === "string" ? c : c.text ?? c.label}</li>)}</ul>}
                      {p?.feedback && <div className="rounded-xl bg-muted p-3 text-sm"><strong>Retorno do gestor:</strong> {p.feedback}</div>}
                      {p?.submission && !canSend && <div className="rounded-xl border border-border p-3 text-sm text-muted-foreground"><strong className="text-foreground">Você enviou:</strong> {p.submission}</div>}
                      {canSend && (
                        <div className="space-y-2">
                          <Textarea placeholder="Conte o que você fez ou cole um link de comprovação" value={drafts[s.id] ?? ""} onChange={(e) => setDrafts({ ...drafts, [s.id]: e.target.value })} />
                          <Button size="sm" disabled={send.isPending || (drafts[s.id] ?? "").trim().length < 3} onClick={() => send.mutate({ stepId: s.id, submission: drafts[s.id] })}>Enviar para avaliação</Button>
                        </div>
                      )}
                    </div>
                  </details>
                );
              })}
            </section>
          ))}
        </TabsContent>

        <TabsContent value="aulas" className="grid gap-3 sm:grid-cols-2">
          {content.lessons.map((l: any) => (
            <details key={l.id} className="rounded-2xl border border-border bg-card p-4">
              <summary className="cursor-pointer list-none"><p className="font-medium">{l.title}</p><p className="text-xs text-muted-foreground">{l.role} · {l.duration}</p></summary>
              <div className="mt-3 space-y-2 text-sm">
                <p>{l.summary}</p>
                {l.keyPoints?.length > 0 && <ul className="list-disc pl-5 text-muted-foreground">{l.keyPoints.map((k: string, i: number) => <li key={i}>{k}</li>)}</ul>}
                {l.url && <a href={l.url} target="_blank" rel="noreferrer" className="text-primary underline">Assistir aula</a>}
              </div>
            </details>
          ))}
        </TabsContent>

        <TabsContent value="docs" className="space-y-3">
          {content.documents.map((d: any) => (
            <details key={d.id} className="rounded-2xl border border-border bg-card p-4">
              <summary className="cursor-pointer list-none"><p className="font-medium">{d.title}</p><p className="text-xs text-muted-foreground">{d.category} · {d.summary}</p></summary>
              <div className="mt-3"><Md text={d.content} /></div>
            </details>
          ))}
        </TabsContent>

        <TabsContent value="checklists" className="grid gap-3 sm:grid-cols-2">
          {content.checklists.map((c: any) => (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
              <p className="font-medium">{c.title}</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">{c.items.map((it: string, i: number) => <li key={i}>• {it}</li>)}</ul>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="avisos" className="space-y-3">
          {content.bulletins.map((b: any) => (
            <div key={b.id} className="rounded-2xl border border-border bg-card p-4">
              <p className="font-medium">{b.title}</p>
              <p className="text-xs text-muted-foreground">{b.category}</p>
              <div className="mt-2"><Md text={b.content} /></div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="quiz" className="space-y-4">
          {quizDone && !quizResult && (() => { const r = JSON.parse(quizDone.submission || "{}"); return <p className="rounded-xl bg-muted p-3 text-sm">Última tentativa: <strong>{r.score}/{r.total}</strong> acertos. Você pode refazer quando quiser.</p>; })()}
          {content.quiz.map((q: any, qi: number) => (
            <div key={q.id} className="rounded-2xl border border-border bg-card p-4">
              <p className="font-medium">{qi + 1}. {q.question}</p>
              <div className="mt-3 space-y-2">
                {q.options.map((o: string, oi: number) => {
                  const rv = quizResult?.review?.[qi];
                  const mark = rv ? (oi === rv.correct ? "border-emerald-500" : oi === rv.chosen ? "border-destructive" : "border-border") : answers[qi] === oi ? "border-primary" : "border-border";
                  return (
                    <button key={oi} type="button" disabled={!!quizResult} onClick={() => { const a = [...answers]; a[qi] = oi; setAnswers(a); }} className={`block w-full rounded-xl border p-3 text-left text-sm ${mark}`}>{o}</button>
                  );
                })}
              </div>
              {quizResult?.review?.[qi]?.explanation && <p className="mt-2 text-xs text-muted-foreground">{quizResult.review[qi].explanation}</p>}
            </div>
          ))}
          {quizResult ? (
            <div className="flex items-center gap-3"><p className="font-semibold">Resultado: {quizResult.score}/{quizResult.total}</p><Button variant="outline" onClick={() => { setQuizResult(null); setAnswers([]); }}>Refazer</Button></div>
          ) : (
            <Button disabled={quiz.isPending || content.quiz.some((_: any, i: number) => answers[i] === undefined)} onClick={() => quiz.mutate()}>Enviar respostas</Button>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
