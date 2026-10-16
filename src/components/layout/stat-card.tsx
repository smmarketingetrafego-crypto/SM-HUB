import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: string;
  className?: string;
}

export function StatCard({ label, value, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn("bg-[#111111] border border-white/5 rounded-2xl p-5 hover:border-brand/20 transition-colors", className)}>
      {icon && (
        <div className="size-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center mb-3">
          {icon}
        </div>
      )}
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {trend && <p className="text-xs text-gray-500 mt-1">{trend}</p>}
    </div>
  );
}
