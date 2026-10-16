import { createFileRoute } from '@tanstack/react-router'
import { 
  Trophy, Lock, Target, Zap, Star, Medal, TrendingUp, X, Award, Sparkles, Unlock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { TutorialBanner } from "@/components/layout/tutorial-banner";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/conquistas")({
  head: () => ({
    meta: [
      { title: "Conquistas — SM Hub" },
      { name: "description", content: "Suas conquistas e metas de faturamento" },
    ],
  }),
  component: ConquistasPage,
});

function ConquistasPage() {
  const { pipelines } = useStore();
  
  // Calculate total won revenue
  const totalRevenue = pipelines.reduce((acc, p) => {
    const wonStage = p.stages.find(s => s.name.toLowerCase().includes("ganho"));
    if (!wonStage) return acc;
    return acc + wonStage.deals.reduce((sum, d) => sum + (d.value || 0), 0);
  }, 0);

  const plaques = [
    { icon: Trophy, label: "10K", value: 10000 },
    { icon: Award, label: "50K", value: 50000 },
    { icon: Award, label: "100K", value: 100000 },
    { icon: Sparkles, label: "1M", value: 1000000 },
  ];

  const milestones = [
    { icon: Zap, label: "R$ 1k", value: 1000 },
    { icon: Star, label: "R$ 5k", value: 5000 },
    { icon: Target, label: "R$ 10k", value: 10000 },
    { icon: Trophy, label: "R$ 20k", value: 20000 },
    { icon: Medal, label: "R$ 30k", value: 30000 },
    { icon: TrendingUp, label: "R$ 50k", value: 50000 },
    { icon: Trophy, label: "R$ 100k", value: 100000 },
  ];

  // Find the next plaque
  const nextPlaque = plaques.find(p => totalRevenue < p.value) || plaques[plaques.length - 1];
  const progressPercent = Math.min(100, (totalRevenue / nextPlaque.value) * 100);
  const remaining = Math.max(0, nextPlaque.value - totalRevenue);

  return (
    <div className="flex items-center justify-center min-h-[80vh] p-4 flex-col gap-8">
      <div className="w-full max-w-2xl"><TutorialBanner location="Conquistas" /></div>
      <div className="w-full max-w-2xl bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden relative shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-2">
          <div className="flex items-center gap-3 text-white font-bold text-xl">
            <Trophy className="size-6 text-brand" /> Suas Conquistas
          </div>
          <Button variant="ghost" size="icon" className="size-8 rounded-full bg-transparent text-gray-500 border border-brand/50 hover:text-white hover:bg-white/5 flex items-center justify-center" onClick={() => history.back()}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="px-6 py-4 max-h-[75vh] overflow-y-auto">
          {/* Faturamento Total Box */}
          <div className="w-full border border-brand/30 bg-brand/5 rounded-2xl p-6 flex flex-col items-center justify-center mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles className="size-24 text-brand" />
            </div>
            <p className="text-brand/80 font-medium text-sm mb-2 relative z-10 uppercase tracking-widest">Faturamento Fechado</p>
            <h2 className="text-5xl font-black text-brand relative z-10">{brl(totalRevenue)}</h2>
          </div>

          {/* Placas de Conquista */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-white font-semibold mb-4">
              <Award className="size-4 text-gray-400" /> Placas de Conquista
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {plaques.map((placa, i) => {
                const unlocked = totalRevenue >= placa.value;
                return (
                  <div key={i} className={`border rounded-2xl p-4 flex flex-col items-center justify-center gap-2 relative group transition-all ${unlocked ? 'border-brand/50 bg-brand/10 shadow-[0_0_15px_rgba(201,162,39,0.15)]' : 'border-white/5 bg-[#111111] opacity-50'}`}>
                    <placa.icon className={`size-8 ${unlocked ? 'text-brand drop-shadow-md' : 'text-gray-500'}`} />
                    {!unlocked && (
                      <div className="absolute inset-0 flex items-center justify-center mt-6">
                        <Lock className="size-4 text-gray-400" />
                      </div>
                    )}
                    {unlocked && (
                       <div className="absolute top-2 right-2">
                         <Unlock className="size-3 text-brand" />
                       </div>
                    )}
                    <span className={`font-bold mt-2 ${unlocked ? 'text-brand' : 'text-gray-500'}`}>{placa.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Linha do Tempo */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-white font-semibold mb-6">
              <Target className="size-4 text-gray-400" /> Linha do Tempo
            </div>
            
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-brand/50 before:via-white/5 before:to-transparent">
              {milestones.map((item, i) => {
                const reached = totalRevenue >= item.value;
                return (
                  <div key={i} className={`flex items-center gap-4 relative ${!reached && 'opacity-50'}`}>
                    <div className={`size-10 rounded-full border flex items-center justify-center z-10 shrink-0 ${reached ? 'border-brand bg-brand/20 shadow-[0_0_10px_rgba(201,162,39,0.3)]' : 'border-white/10 bg-[#0A0A0A]'}`}>
                      <item.icon className={`size-4 ${reached ? 'text-brand' : 'text-gray-400'}`} />
                    </div>
                    <div className={`flex-1 border rounded-2xl px-5 py-3 flex justify-between items-center ${reached ? 'border-brand/30 bg-brand/5' : 'border-white/5 bg-[#111111]'}`}>
                      <span className={`font-bold ${reached ? 'text-white' : 'text-gray-400'}`}>{item.label}</span>
                      <span className={reached ? 'text-brand font-medium' : 'text-gray-500 text-sm'}>{brl(item.value)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Banner */}
          <div className="border border-brand/30 bg-[#1A1810] rounded-2xl p-5 relative overflow-hidden mt-8">
            <div className="flex justify-between items-center mb-4 relative z-10">
              <span className="text-white font-semibold">Próxima Placa</span>
              <span className="text-brand font-bold text-xl">{nextPlaque.label}</span>
            </div>
            <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden mb-3 relative z-10">
              <div className="h-full bg-brand transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="text-center text-sm relative z-10">
              {remaining > 0 ? (
                <><span className="text-white font-bold">{brl(remaining)}</span> <span className="text-gray-400">restantes para a próxima placa</span></>
              ) : (
                <span className="text-brand font-bold uppercase tracking-widest">Nível Máximo Atingido!</span>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
