import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useStore, setStore } from "@/lib/store";

export function GlobalVideoModal() {
  const { activeVideo } = useStore();

  const handleClose = (open: boolean) => {
    if (!open) {
      setStore({ activeVideo: null });
    }
  };

  return (
    <Dialog open={activeVideo !== null} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl bg-black border border-white/10 p-0 overflow-hidden rounded-2xl z-[9999]">
        <div className="relative w-full aspect-video bg-black">
          {activeVideo && (
            activeVideo.videoUrl?.includes(".mp4") ? (
              <video 
                controls 
                autoPlay 
                className="absolute inset-0 w-full h-full object-contain bg-black"
                src={activeVideo.videoUrl}
              />
            ) : (
              <iframe 
                width="100%" 
                height="100%" 
                src={activeVideo.videoUrl || "https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1"} 
                title={activeVideo.title} 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
                className="absolute inset-0"
              ></iframe>
            )
          )}
        </div>
        {activeVideo && (
          <div className="p-6 bg-[#0a0a0a]">
            <h3 className="text-xl font-bold text-white mb-2">{activeVideo.title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{activeVideo.description || "Assista a este tutorial para aprender mais sobre essa funcionalidade."}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
