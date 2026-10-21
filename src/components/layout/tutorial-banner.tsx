import { useEffect, useState } from "react";
import { PlayCircle, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore, setStore } from "@/lib/store";
import {
  getHiddenTutorials, hideAllTutorials, hideTutorial, isAllTutorialsHidden, TUTORIAL_VISIBILITY_EVENT,
} from "@/lib/tutorial-visibility";

export function TutorialBanner({ location }: { location: string }) {
  const { tutorials } = useStore();
  // Hidden until storage is read, so dismissed banners never flash.
  const [visibility, setVisibility] = useState<{ ready: boolean; all: boolean; hidden: string[] }>({ ready: false, all: true, hidden: [] });

  useEffect(() => {
    const sync = () => setVisibility({ ready: true, all: isAllTutorialsHidden(), hidden: getHiddenTutorials() });
    sync();
    window.addEventListener(TUTORIAL_VISIBILITY_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(TUTORIAL_VISIBILITY_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!visibility.ready || visibility.all) return null;

  const video = tutorials?.find((t: any) => (t.locations || []).includes(location));
  if (!video) return null;
  const hiddenKey = `${location}:${video.id}`;
  if (visibility.hidden.includes(hiddenKey)) return null;
  const setShowBanner = (_: boolean) => hideTutorial(hiddenKey);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-r from-[#1A1500] to-[#0A0A0A] p-1 mb-8 animate-in fade-in slide-in-from-top-4">
      <div className="absolute right-4 top-4 z-10">
        <Button
          variant="ghost" size="icon"
          className="size-8 rounded-full text-gray-400 hover:text-white hover:bg-white/10"
          onClick={() => setShowBanner(false)}
          title="Fechar"
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="flex flex-col md:flex-row gap-6 p-5">
        <div 
          className="relative w-full md:w-[380px] h-[210px] rounded-xl overflow-hidden bg-black/50 border border-white/10 flex-shrink-0 group cursor-pointer"
          onClick={() => setStore({ activeVideo: video })}
        >
          <img
            src={video.thumbnail || "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1000"}
            alt="Video thumbnail"
            className="w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="size-16 rounded-full bg-brand/90 text-white flex items-center justify-center pl-1 shadow-[0_0_30px_rgba(201,162,39,0.5)] group-hover:scale-110 transition-transform">
              <PlayCircle className="size-8" />
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-center max-w-xl">
          <div className="flex items-center gap-2 text-brand font-medium text-sm mb-3">
            <TrendingUp className="size-4" /> {location === "Dashboard" ? "Comece por aqui" : "Tutorial da Tela"}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{video.title}</h2>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            {video.description || "Aprenda a utilizar todos os recursos desta página assistindo a este rápido tutorial em vídeo."}
          </p>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setStore({ activeVideo: video })}
              className="bg-brand hover:brightness-110 text-primary-foreground h-10 px-6 rounded-xl font-semibold shadow-[0_0_15px_rgba(201,162,39,0.3)]"
            >
              <PlayCircle className="mr-2 size-4" /> Assistir agora
            </Button>
            <Button
              variant="ghost"
              className="h-10 px-6 rounded-xl text-gray-300 hover:text-white hover:bg-white/5"
              onClick={() => setShowBanner(false)}
            >
              Ocultar aviso
            </Button>
            <Button
              variant="ghost"
              className="h-10 px-4 rounded-xl text-gray-400 hover:text-white hover:bg-white/5"
              onClick={() => hideAllTutorials()}
            >
              Ocultar todos os tutoriais
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
