import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  aguardando: { label: "Aguardando", className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  "em andamento": { label: "Em andamento", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  "concluído": { label: "Concluído", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  ativo: { label: "Ativo", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  inativo: { label: "Inativo", className: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
  pendente: { label: "Pendente", className: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status.toLowerCase()] ?? {
    label: status,
    className: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
