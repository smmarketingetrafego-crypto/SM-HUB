import { pageMeta } from '@/lib/page-meta';
import { createFileRoute } from '@tanstack/react-router'
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, Calendar as CalendarIcon, Mail, Activity, UserPlus, Handshake, FileText, CalendarDays, CreditCard } from "lucide-react";

export const Route = createFileRoute("/lead-details")({
  head: () => pageMeta('Lead details', 'Área de lead details do SM Hub.'),
  component: LeadDetailsPage,
});

function LeadDetailsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 pt-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link to="/pipelines" className="mt-1.5 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">Cliente Exemplo</h1>
              <span className="px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-xs font-semibold">
                Cliente
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-2 text-gray-400 text-sm">
              <div className="flex items-center gap-2">
                <CalendarIcon className="size-4" /> Na base desde 18/09/2026 · via cadastro_cliente
              </div>
              <div className="flex items-center gap-2">
                <Mail className="size-4" /> teste@gmail.com
              </div>
            </div>
          </div>
        </div>
        
        <button className="flex items-center justify-center gap-2 px-4 py-2 bg-transparent border border-white/10 rounded-xl text-white hover:bg-white/5 transition-colors text-sm font-medium">
          <ExternalLink className="size-4" /> Abrir no funil
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-5">
          <p className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-2">
            <CreditCard className="size-4" /> Compras
          </p>
          <p className="text-2xl font-bold text-white mt-2">0</p>
        </div>
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-5">
          <p className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-2">
            <Activity className="size-4" /> Total pago
          </p>
          <p className="text-2xl font-bold text-emerald-500 mt-2">R$ 0,00</p>
        </div>
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-5">
          <p className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-2">
            <DollarSign className="size-4" /> Ticket médio
          </p>
          <p className="text-2xl font-bold text-white mt-2">R$ 0,00</p>
        </div>
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-5">
          <p className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-2">
            <FileText className="size-4" /> Orçamentos
          </p>
          <p className="text-2xl font-bold text-white mt-2">0</p>
        </div>
      </div>

      {/* Tags */}
      <div className="flex items-center gap-2">
        <span className="px-3 py-1.5 rounded-full border border-emerald-500/30 text-emerald-500 text-sm">Cliente</span>
        <span className="px-3 py-1.5 rounded-full border border-white/10 text-gray-300 text-sm flex items-center gap-2 bg-[#111111]">
          <CalendarIcon className="size-4" /> Na base desde 18/09/2026
        </span>
      </div>

      {/* Jornada */}
      <div className="bg-[#111111] border border-white/5 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Activity className="size-5 text-red-500" />
          <h2 className="text-xl font-bold text-white">Jornada</h2>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-8">
          <CalendarIcon className="size-4" /> Da entrada até aqui: <span className="text-white font-medium">na hora</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide">
          {/* Step 1 */}
          <div className="flex-shrink-0 min-w-[200px] rounded-xl border-2 border-brand bg-[#1A1A1A] p-4 relative">
            <div className="flex items-center gap-2 text-white font-semibold mb-2">
              <UserPlus className="size-4 text-brand" /> Entrada: cadastro_...
            </div>
            <p className="text-xs text-gray-500">18/09/26, 14:49</p>
          </div>

          <div className="flex-shrink-0 w-16 flex items-center justify-center">
            <div className="w-full h-px bg-white/10 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 bg-[#111111] px-1">na hora</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex-shrink-0 min-w-[200px] rounded-xl border-2 border-emerald-500 bg-[#1A1A1A] p-4 relative">
            <div className="flex items-center gap-2 text-white font-semibold mb-2">
              <Handshake className="size-4 text-emerald-500" /> Virou cliente
            </div>
            <p className="text-xs text-gray-500">18/09/26, 14:49</p>
          </div>

          <div className="flex-shrink-0 w-8 flex items-center justify-center">
            <div className="w-full h-px bg-white/10" />
          </div>

          {/* Step 3 */}
          <div className="flex-shrink-0 min-w-[180px] rounded-xl border-2 border-dashed border-white/10 bg-transparent p-4 opacity-50">
            <div className="flex items-center gap-2 text-gray-400 font-semibold mb-2">
              <FileText className="size-4" /> Orçamento
            </div>
          </div>

          <div className="flex-shrink-0 w-8 flex items-center justify-center">
            <div className="w-full h-px bg-white/10" />
          </div>

          {/* Step 4 */}
          <div className="flex-shrink-0 min-w-[180px] rounded-xl border-2 border-dashed border-white/10 bg-transparent p-4 opacity-50">
            <div className="flex items-center gap-2 text-gray-400 font-semibold mb-2">
              <CalendarDays className="size-4" /> Reunião
            </div>
          </div>

          <div className="flex-shrink-0 w-8 flex items-center justify-center">
            <div className="w-full h-px bg-white/10" />
          </div>

          {/* Step 5 */}
          <div className="flex-shrink-0 min-w-[180px] rounded-xl border-2 border-dashed border-white/10 bg-transparent p-4 opacity-50">
            <div className="flex items-center gap-2 text-gray-400 font-semibold mb-2">
              <CreditCard className="size-4" /> Comprou
            </div>
          </div>
        </div>
      </div>

      {/* Histórico detalhado */}
      <div className="bg-[#111111] border border-white/5 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-8">
          <Activity className="size-5 text-gray-400" />
          <h2 className="text-xl font-bold text-white">Histórico detalhado</h2>
        </div>

        <div className="relative pl-6 border-l border-white/10 space-y-8">
          <div className="relative">
            <div className="absolute -left-[35px] top-0 size-8 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center z-10">
              <UserPlus className="size-4 text-brand" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg mb-1">Entrou na base</h3>
              <p className="text-gray-400 text-sm mb-1">18 de set. de 2026</p>
              <p className="text-gray-500 text-sm">Origem: cadastro_cliente</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// Minimal dummy for the dollar icon to avoid missing import
function DollarSign(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
}
