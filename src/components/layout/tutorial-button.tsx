import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TutorialButton({ compact }: any) {
  return (
    <Button variant="outline" className="text-neutral-400 border-white/10 bg-transparent hover:bg-white/5 hover:text-white">
      <PlayCircle className="size-4 mr-2" />
      {!compact && "Ver Tutorial"}
      {compact && "Tutorial"}
    </Button>
  );
}
