import { createFileRoute, Link } from '@tanstack/react-router';
import { PageHeader } from "@/components/layout/page-header";
import { TutorialBanner } from "@/components/layout/tutorial-banner";
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  DollarSign, 
  Download, 
  Filter, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Calendar, 
  CreditCard, 
  Wallet, 
  TrendingUp,
  ShoppingBag,
  Package,
  Sparkles,
  CheckCircle2,
  Tag,
  UserCheck,
  Printer,
  Receipt,
  Copy,
  Share2,
  FileText,
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { brl } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTransactions, addTransaction, deleteTransaction, updateTransaction } from "@/lib/api-financeiro.server";
import { getProducts } from "@/lib/api-produtos.server";
import { getClients } from "@/lib/api-clientes.server";
import { getMetas } from "@/lib/api-metas.server";
import { toast } from "sonner";

export const Route = createFileRoute("/financeiro")({
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const [filter, setFilter] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [period, setPeriod] = useState<"mensal" | "trimestral" | "anual" | "todos" | "calendar">("todos");
  const [dateRange, setDateRange] = useState<any>({ from: new Date() });
  const queryClient = useQueryClient();

  // Queries
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      return getTransactions();
    }
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      return getProducts();
    }
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      return getClients();
    }
  });
  const clients = clientsData?.clients || [];

  // Mutations
  const addTxMutation = useMutation({
    mutationFn: async (data: any) => addTransaction({ data }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Transação registrada com sucesso!");
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        setIsModalOpen(false);
        setIsSaleModalOpen(false);
      } else {
        toast.error("Erro ao salvar: " + res.error);
      }
    }
  });

  const deleteTxMutation = useMutation({
    mutationFn: async (id: string) => deleteTransaction({ data: id }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Transação excluída!");
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
      } else {
        toast.error("Erro ao excluir: " + res.error);
      }
    }
  });

  const updateTxMutation = useMutation({
    mutationFn: async (data: any) => updateTransaction({ data }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Transação atualizada!");
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        setIsModalOpen(false);
      } else {
        toast.error("Erro ao atualizar: " + res.error);
      }
    }
  });

  // Regular Transaction Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({ id: '', desc: '', amount: '', type: 'out', date: '', cat: 'Serviços', status: 'Pendente' });

  // Receipt Modal State (Comprovante / Recibo da Venda)
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const handleOpenReceipt = (tx: any) => {
    setSelectedReceiptTx(tx);
    setIsReceiptModalOpen(true);
  };

  const getReceiptText = (tx: any) => {
    if (!tx) return "";
    const clientName = tx.client || tx.cliente || tx.saleDetails?.client || "Cliente";
    const receiptNum = `REC-${(tx.id || "0000").substring(0, 8).toUpperCase()}`;
    const dateFormatted = new Date((tx.date || new Date().toISOString().split('T')[0]) + 'T12:00:00').toLocaleDateString('pt-BR');
    const details = tx.saleDetails;

    return `🧾 *COMPROVANTE DE VENDA — SM HUB*
----------------------------------------
*Recibo:* #${receiptNum}
*Data:* ${dateFormatted}
*Cliente:* ${clientName}
*Descrição:* ${tx.desc || tx.description}
${details?.productName ? `*Item:* ${details.quantity || 1}x ${details.productName}\n` : ""}${details?.unitPrice ? `*Valor Unitário:* ${brl(details.unitPrice)}\n` : ""}${details?.discount > 0 ? `*Desconto:* -${brl(details.discount)}\n` : ""}*Valor Total:* ${brl(Math.abs(tx.amount))}
*Forma de Pgto:* ${details?.paymentMethod ? details.paymentMethod.toUpperCase() : "À Vista"}
*Status:* ${tx.status === "Recebido" || tx.status === "Pago" || tx.status === "completed" ? "✅ PAGO & CONFIRMADO" : "⏳ PENDENTE"}
----------------------------------------
Obrigado pela preferência e parceria!
Silas Maroto Hub`;
  };

  const handleSendWhatsAppReceipt = (tx: any) => {
    const text = getReceiptText(tx);
    const clientName = tx.client || tx.cliente || tx.saleDetails?.client;
    const clientObj = clients.find((c: any) => c.name === clientName || c.id === tx.clientId || c.id === tx.saleDetails?.clientId);
    const rawPhone = clientObj?.phone ? clientObj.phone.replace(/\D/g, "") : "";
    const url = rawPhone ? `https://wa.me/55${rawPhone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const handleCopyReceiptText = (tx: any) => {
    const text = getReceiptText(tx);
    navigator.clipboard.writeText(text);
    toast.success("Comprovante copiado para a área de transferência!");
  };

  // Sale Modal State (Produtos e Serviços)
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [saleItemType, setSaleItemType] = useState<"serviço" | "produto">("serviço");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [saleProductName, setSaleProductName] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [saleClientName, setSaleClientName] = useState("");
  const [saleQuantity, setSaleQuantity] = useState("1");
  const [saleUnitPrice, setSaleUnitPrice] = useState("");
  const [saleDiscount, setSaleDiscount] = useState("0");
  const [salePaymentMethod, setSalePaymentMethod] = useState("pix");
  const [saleInstallments, setSaleInstallments] = useState("vista");
  const [saleStatus, setSaleStatus] = useState("Recebido");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [saleNotes, setSaleNotes] = useState("");

  const handleOpenSaleModal = () => {
    setSaleItemType("serviço");
    setSelectedProductId("");
    setSaleProductName("");
    setSelectedClientId("");
    setSaleClientName("");
    setSaleQuantity("1");
    setSaleUnitPrice("");
    setSaleDiscount("0");
    setSalePaymentMethod("pix");
    setSaleInstallments("vista");
    setSaleStatus("Recebido");
    setSaleDate(new Date().toISOString().split('T')[0]);
    setSaleNotes("");

    // Pre-select first item if available
    if (products.length > 0) {
      const first = products[0];
      setSelectedProductId(first.id);
      setSaleProductName(first.name);
      setSaleUnitPrice(String(first.price));
      setSaleItemType(first.category?.toLowerCase().includes("prod") ? "produto" : "serviço");
    }

    if (clients.length > 0) {
      setSelectedClientId(clients[0].id);
      setSaleClientName(clients[0].name);
    }

    setIsSaleModalOpen(true);
  };

  const handleSelectProduct = (prodId: string) => {
    setSelectedProductId(prodId);
    if (prodId === "custom") {
      setSaleProductName("");
      setSaleUnitPrice("");
      return;
    }
    const found = products.find((p: any) => p.id === prodId);
    if (found) {
      setSaleProductName(found.name);
      setSaleUnitPrice(String(found.price));
      setSaleItemType(found.category?.toLowerCase().includes("prod") ? "produto" : "serviço");
    }
  };

  const handleSelectClient = (cId: string) => {
    setSelectedClientId(cId);
    if (cId === "custom") {
      setSaleClientName("");
      return;
    }
    const found = clients.find((c: any) => c.id === cId);
    if (found) {
      setSaleClientName(found.name);
    }
  };

  const calculateSaleTotal = () => {
    const qty = Math.max(1, parseFloat(saleQuantity) || 1);
    const unitPrice = Math.max(0, parseFloat(saleUnitPrice.replace(/[^\d.]/g, "")) || 0);
    const discount = Math.max(0, parseFloat(saleDiscount.replace(/[^\d.]/g, "")) || 0);
    return Math.max(0, qty * unitPrice - discount);
  };

  const handleSaveSale = () => {
    if (!saleProductName.trim()) {
      toast.error("Informe o nome do produto ou serviço vendido.");
      return;
    }
    const totalAmount = calculateSaleTotal();
    if (totalAmount <= 0) {
      toast.error("O valor total da venda deve ser maior que zero.");
      return;
    }

    const clientLabel = saleClientName.trim() || "Cliente Direto";
    const qty = parseFloat(saleQuantity) || 1;
    const desc = `🛍️ Venda: ${qty}x ${saleProductName.trim()} (${clientLabel})`;
    const cat = `Venda de ${saleItemType === "produto" ? "Produtos" : "Serviços"}`;

    const payload = {
      desc,
      amount: totalAmount,
      type: "in",
      date: saleDate || new Date().toISOString().split('T')[0],
      cat,
      status: saleStatus,
      isSale: true,
      client: clientLabel,
      saleDetails: {
        itemType: saleItemType,
        productId: selectedProductId,
        productName: saleProductName.trim(),
        client: clientLabel,
        quantity: qty,
        unitPrice: parseFloat(saleUnitPrice) || 0,
        discount: parseFloat(saleDiscount) || 0,
        paymentMethod: salePaymentMethod,
        installments: saleInstallments,
        notes: saleNotes.trim()
      }
    };

    addTxMutation.mutate(payload);
  };

  const handleSave = () => {
    if (!formData.desc || !formData.amount) {
      toast.error("Preencha a descrição e o valor.");
      return;
    }
    const amountNum = formData.type === 'out' ? -Math.abs(Number(formData.amount)) : Math.abs(Number(formData.amount));
    
    const payload = {
      desc: formData.desc,
      amount: amountNum,
      type: formData.type,
      date: formData.date || new Date().toISOString().split('T')[0],
      cat: formData.cat,
      status: formData.status
    };

    if (formData.id) {
      updateTxMutation.mutate({ id: formData.id, ...payload });
    } else {
      addTxMutation.mutate(payload);
    }
  };

  const handleOpenNew = () => {
    setFormData({ id: '', desc: '', amount: '', type: 'out', date: '', cat: 'Serviços', status: 'Pendente' });
    setIsModalOpen(true);
  };

  // Filtering Logic
  const filteredTransactions = transactions.filter((t: any) => {
    // Search text filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const desc = (t.desc || t.description || "").toLowerCase();
      const cat = (t.cat || t.category || "").toLowerCase();
      const client = (t.client || t.cliente || t.saleDetails?.client || "").toLowerCase();
      if (!desc.includes(term) && !cat.includes(term) && !client.includes(term)) {
        return false;
      }
    }

    // Status / Category filter
    if (filter === "vendas") {
      const isSale = t.isSale || (t.desc && t.desc.includes("Venda")) || (t.cat && t.cat.includes("Venda"));
      if (!isSale) return false;
    } else if (filter === "pago") {
      if (t.status !== "Pago" && t.status !== "Recebido" && t.status !== "completed") return false;
    } else if (filter === "pendente") {
      if (t.status !== "Pendente") return false;
    } else if (filter === "atrasado") {
      if (t.status !== "Atrasado") return false;
    }

    // Period filter
    if (period === "todos") return true;
    const date = new Date((t.date || new Date().toISOString().split('T')[0]) + 'T12:00:00');
    const now = new Date();
    if (period === "mensal") {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }
    if (period === "trimestral") {
      const past = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const future = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return date >= past && date <= future;
    }
    if (period === "anual") {
      return date.getFullYear() === now.getFullYear();
    }
    if (period === "calendar" && dateRange?.from) {
      const past = new Date(dateRange.from);
      past.setHours(0, 0, 0, 0);
      const future = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from);
      future.setHours(23, 59, 59, 999);
      return date >= past && date <= future;
    }
    return true;
  });

  const recebido = filteredTransactions
    .filter((t: any) => (t.type === 'in' || t.amount > 0) && (t.status === 'Recebido' || t.status === 'completed' || t.status === 'Pago'))
    .reduce((a: any, b: any) => a + Math.abs(Number(b.amount)), 0);

  const pago = filteredTransactions
    .filter((t: any) => t.type === 'out' && (t.status === 'Pago' || t.status === 'completed'))
    .reduce((a: any, b: any) => a + Math.abs(Number(b.amount)), 0);

  const saldoAtual = recebido - pago;

  const receitasPrevistas = filteredTransactions
    .filter((t: any) => (t.type === 'in' || t.amount > 0) && t.status === 'Pendente')
    .reduce((a: any, b: any) => a + Math.abs(Number(b.amount)), 0);

  const despesasPrevistas = filteredTransactions
    .filter((t: any) => t.type === 'out' && t.status === 'Pendente')
    .reduce((a: any, b: any) => a + Math.abs(Number(b.amount)), 0);
  
  const totalAtrasado = filteredTransactions
    .filter((t: any) => t.status === 'Atrasado')
    .reduce((a: any, b: any) => a + Math.abs(Number(b.amount)), 0);

  // Sales KPIs
  const salesTransactions = filteredTransactions.filter((t: any) =>
    t.isSale || (t.desc && t.desc.includes("Venda")) || (t.cat && t.cat.includes("Venda"))
  );
  const totalSalesAmount = salesTransactions.reduce((acc: number, t: any) => acc + Math.abs(Number(t.amount)), 0);
  const totalSalesCount = salesTransactions.length;
  
  const { data: metasData } = useQuery({
    queryKey: ['metas'],
    queryFn: () => getMetas()
  });
  const metaReceita = metasData?.summary?.primaryRevenueMeta?.targetValue || 25000;

  return (
    <div className="space-y-6 pb-12">
      <style>{`
        .rdp-root {
          --rdp-accent-color: #c9a227;
          --rdp-accent-background-color: rgba(201, 162, 39, 0.2);
          --rdp-range_middle-background-color: rgba(201, 162, 39, 0.15);
          --rdp-background-color: transparent;
          color: white;
        }
        .rdp-day { color: white; }
        .rdp-day_selected:not(.rdp-day_range_middle) { color: black !important; font-weight: bold; background-color: #c9a227 !important; }
        .rdp-day_range_middle { color: white !important; background-color: rgba(201, 162, 39, 0.15) !important; }
        .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: rgba(255,255,255,0.1); }

        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 30px;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <TutorialBanner location="Financeiro" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Gestão Financeira & Vendas
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Controle seu fluxo de caixa, venda de produtos e serviços, despesas e receitas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {(["todos", "mensal", "trimestral", "anual"] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? "secondary" : "outline"}
              onClick={() => setPeriod(p)}
              className={`h-10 px-4 rounded-xl text-sm capitalize transition-all ${
                period === p
                  ? "bg-brand/20 border-brand/40 text-brand"
                  : "bg-transparent border-white/10 text-white hover:bg-white/5"
              }`}
            >
              {p}
            </Button>
          ))}

          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                onClick={() => setPeriod("calendar")}
                className={`h-10 px-4 rounded-xl text-sm transition-all ${period === 'calendar' ? 'bg-brand/20 border-brand/40 text-brand' : 'bg-transparent border-white/10 text-white hover:bg-white/5'}`}
              >
                <Calendar className="mr-2 size-4 text-gray-400" />
                {dateRange?.from ? (
                  dateRange.to ? `${format(dateRange.from, "dd/MM")} - ${format(dateRange.to, "dd/MM")}` : format(dateRange.from, "dd/MM")
                ) : 'Selecionar Período'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-[#111] border-white/10" align="end">
              <CalendarPicker
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                initialFocus
                locale={ptBR}
                className="text-white bg-[#111]"
              />
            </PopoverContent>
          </Popover>

          {/* Botão Oficial: Venda de Produtos e Serviços */}
          <Button 
            onClick={handleOpenSaleModal}
            className="gradient-brand text-black font-extrabold shadow-[0_0_20px_rgba(201,162,39,0.35)] border-0 h-10 px-4 rounded-xl hover:opacity-95"
          >
            <ShoppingBag className="mr-2 size-4" /> Registrar Venda
          </Button>

          {/* Botão: Nova Transação Genérica */}
          <Button 
            onClick={handleOpenNew}
            variant="outline"
            className="bg-transparent border-white/10 text-white hover:bg-white/5 h-10 px-4 rounded-xl"
          >
            <Plus className="mr-2 size-4" /> Nova Transação
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {/* Vendas de Produtos e Serviços (Card Especial) */}
        <div className="rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/10 via-[#111] to-[#111] p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-brand flex items-center gap-1.5">
              <ShoppingBag className="size-4" /> Vendas Realizadas
            </h3>
            <div className="size-9 rounded-xl bg-brand/20 flex items-center justify-center text-brand">
              <Tag className="size-4" />
            </div>
          </div>
          <p className="text-2xl lg:text-3xl font-extrabold text-white">{brl(totalSalesAmount)}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-brand/20">
            <span className="text-xs text-neutral-300 font-medium">{totalSalesCount} {totalSalesCount === 1 ? "venda registrada" : "vendas registradas"}</span>
            <button 
              onClick={() => setFilter("vendas")}
              className="text-[11px] font-bold text-brand hover:underline"
            >
              Ver vendas
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#111] p-6 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-medium text-gray-400">Faturamento Líquido</h3>
              <Link to="/metas" title="Ver Metas & OKRs" className="text-gray-500 hover:text-brand transition-colors">
                <Target className="size-3.5" />
              </Link>
            </div>
            <div className="size-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Wallet className="size-4" />
            </div>
          </div>
          <div className="flex justify-between items-end mb-2">
            <p className="text-2xl lg:text-3xl font-bold text-white">{brl(saldoAtual)}</p>
          </div>
          <div className="h-1.5 w-full bg-[#222] rounded-full overflow-hidden mb-1.5">
            <div className="h-full bg-brand rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (saldoAtual / metaReceita) * 100)}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{Math.round((saldoAtual / metaReceita) * 100)}% da meta de {brl(metaReceita)}</span>
            <Link to="/metas" className="text-brand hover:underline text-[11px] font-medium">Ajustar meta</Link>
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#111] p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Receitas Previstas</h3>
            <div className="size-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
              <ArrowUpRight className="size-4" />
            </div>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-white">{brl(receitasPrevistas)}</p>
          <p className="text-xs text-gray-500 mt-2">Valores a receber</p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#111] p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Despesas Previstas</h3>
            <div className="size-9 rounded-xl bg-red-500/20 flex items-center justify-center text-red-500">
              <ArrowDownRight className="size-4" />
            </div>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-white">{brl(despesasPrevistas)}</p>
          <p className="text-xs text-gray-500 mt-2">Contas a pagar</p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#111] p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-400">Inadimplência</h3>
            <div className="size-9 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500">
              <DollarSign className="size-4" />
            </div>
          </div>
          <p className="text-2xl lg:text-3xl font-bold text-white">{brl(totalAtrasado)}</p>
          <p className="text-xs text-orange-500 mt-2">Valores em atraso</p>
        </div>
      </div>

      {/* Table Section */}
      <div className="rounded-2xl border border-white/10 bg-[#0A0A0A] overflow-hidden shadow-xl">
        <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
            <Input 
              placeholder="Buscar por descrição, cliente ou categoria..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 bg-[#111] border-white/10 text-white rounded-xl text-sm" 
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[200px] h-10 bg-[#111] border-white/10 text-white rounded-xl text-xs">
                <SelectValue placeholder="Filtrar por" />
              </SelectTrigger>
              <SelectContent className="bg-[#111] border-white/10 text-white rounded-xl">
                <SelectItem value="todos">Todos os Lançamentos</SelectItem>
                <SelectItem value="vendas">🛍️ Vendas de Produtos/Serviços</SelectItem>
                <SelectItem value="pago">Pagos & Recebidos</SelectItem>
                <SelectItem value="pendente">Pendentes a Receber</SelectItem>
                <SelectItem value="atrasado">Atrasados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-gray-400 w-[340px]">Descrição & Origem</TableHead>
              <TableHead className="text-gray-400">Categoria</TableHead>
              <TableHead className="text-gray-400">Data</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400 text-right">Valor</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-neutral-500">
                  Nenhuma transação encontrada para este filtro.
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((tx: any) => {
                const isSale = tx.isSale || (tx.desc && tx.desc.includes("Venda")) || (tx.cat && tx.cat.includes("Venda"));
                const clientName = tx.client || tx.cliente || tx.saleDetails?.client;
                const isIncome = tx.type === 'in' || (tx.amount > 0 && tx.type !== 'out');

                return (
                  <TableRow key={tx.id} className="border-white/5 hover:bg-white/5 cursor-pointer">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                          isSale 
                            ? 'bg-brand/20 text-brand border border-brand/30'
                            : isIncome 
                            ? 'bg-emerald-500/10 text-emerald-500' 
                            : 'bg-red-500/10 text-red-500'
                        }`}>
                          {isSale ? (
                            <ShoppingBag className="size-4" />
                          ) : isIncome ? (
                            <ArrowUpRight className="size-4" />
                          ) : (
                            <ArrowDownRight className="size-4" />
                          )}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white truncate">{tx.desc || tx.description}</span>
                            {isSale && (
                              <span className="text-[10px] uppercase font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded shrink-0">
                                VENDA
                              </span>
                            )}
                          </div>
                          {clientName && (
                            <span className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5">
                              <UserCheck className="size-3 text-neutral-500" /> {clientName}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300 text-xs">
                      {tx.cat || tx.category || "Geral"}
                    </TableCell>
                    <TableCell className="text-gray-300 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3 text-gray-500" />
                        {new Date((tx.date || new Date().toISOString().split('T')[0]) + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="focus:outline-none cursor-pointer group">
                          <Badge variant="outline" className={
                            tx.status === "Pago" || tx.status === "Recebido" || tx.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 group-hover:bg-emerald-500/20" :
                            tx.status === "Atrasado" ? "bg-red-500/10 text-red-400 border-red-500/20 group-hover:bg-red-500/20" :
                            "bg-orange-500/10 text-orange-400 border-orange-500/20 group-hover:bg-orange-500/20"
                          }>
                            {tx.status === "completed" ? "Recebido" : tx.status}
                          </Badge>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#111] border-white/10 text-white shadow-xl rounded-xl">
                          {['Pendente', 'Atrasado', isIncome ? 'Recebido' : 'Pago'].map(s => (
                            <DropdownMenuItem 
                              key={s} 
                              className="hover:bg-white/10 focus:bg-white/10 cursor-pointer text-xs"
                              onClick={() => updateTxMutation.mutate({ id: tx.id, status: s })}
                            >
                              {s}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className={`text-right font-medium text-sm ${isIncome ? 'text-emerald-400 font-bold' : 'text-neutral-200'}`}>
                      {isIncome ? '+' : '-'}{brl(Math.abs(tx.amount))}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenReceipt(tx);
                          }}
                          className={`size-8 rounded-lg ${isSale ? 'text-brand hover:text-white hover:bg-brand/20' : 'text-neutral-400 hover:text-white hover:bg-white/10'}`}
                          title={isSale ? "Ver Recibo da Venda" : "Ver Comprovante"}
                        >
                          <Receipt className="size-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#111] border-white/10 text-white rounded-xl shadow-xl">
                            <DropdownMenuItem 
                              onClick={() => handleOpenReceipt(tx)}
                              className="cursor-pointer text-xs text-brand focus:bg-brand/10 focus:text-brand flex items-center gap-2"
                            >
                              <Receipt className="size-3.5" /> Ver Recibo / Comprovante
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setFormData({
                                id: tx.id,
                                desc: tx.desc || tx.description,
                                amount: Math.abs(Number(tx.amount)).toString(),
                                type: tx.type || (tx.amount < 0 ? 'out' : 'in'),
                                date: tx.date,
                                cat: tx.cat || tx.category,
                                status: tx.status
                              });
                              setIsModalOpen(true);
                            }}>Editar transação</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteTxMutation.mutate(tx.id)} className="text-red-400 focus:bg-red-500/10 focus:text-red-500">Excluir</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal: Registrar Venda de Produtos e Serviços */}
      <Dialog open={isSaleModalOpen} onOpenChange={setIsSaleModalOpen}>
        <DialogContent className="max-w-xl bg-[#0e0e11] border border-white/10 text-white rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
              <ShoppingBag className="size-5 text-brand" />
              Registrar Venda (Produto / Serviço)
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Lance uma nova venda para o cliente, selecione itens do catálogo e defina condições de pagamento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Tipo: Serviço ou Produto */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-black/60 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => setSaleItemType("serviço")}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  saleItemType === "serviço"
                    ? "bg-brand text-black shadow-md shadow-brand/20"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Sparkles className="size-3.5" /> Prestação de Serviço
              </button>
              <button
                type="button"
                onClick={() => setSaleItemType("produto")}
                className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  saleItemType === "produto"
                    ? "bg-brand text-black shadow-md shadow-brand/20"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Package className="size-3.5" /> Venda de Produto
              </button>
            </div>

            {/* Cliente */}
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-300">Cliente Comprador *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Select value={selectedClientId} onValueChange={handleSelectClient}>
                  <SelectTrigger className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-xs">
                    <SelectValue placeholder="Selecionar cliente cadastrado" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-white/10 text-white">
                    {clients.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ""}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Outro (Digitar nome)</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Nome do cliente"
                  value={saleClientName}
                  onChange={(e) => setSaleClientName(e.target.value)}
                  className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-xs focus-visible:ring-brand"
                />
              </div>
            </div>

            {/* Item do Catálogo */}
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-300">Item do Catálogo ou Personalizado *</Label>
              <Select value={selectedProductId} onValueChange={handleSelectProduct}>
                <SelectTrigger className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-xs">
                  <SelectValue placeholder="Escolher item do catálogo..." />
                </SelectTrigger>
                <SelectContent className="bg-[#111] border-white/10 text-white">
                  {products.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} - {brl(p.price)} ({p.category || "Item"})
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Outro (Digitar manualmente)</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Descrição ou nome do item vendido"
                value={saleProductName}
                onChange={(e) => setSaleProductName(e.target.value)}
                className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-xs focus-visible:ring-brand mt-1.5"
              />
            </div>

            {/* Quantidade, Preço Unitário e Desconto */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-300">Quantidade</Label>
                <Input
                  type="number"
                  min="1"
                  value={saleQuantity}
                  onChange={(e) => setSaleQuantity(e.target.value)}
                  className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-xs focus-visible:ring-brand"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-300">Preço Unitário (R$)</Label>
                <Input
                  placeholder="0.00"
                  value={saleUnitPrice}
                  onChange={(e) => setSaleUnitPrice(e.target.value)}
                  className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-xs focus-visible:ring-brand font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-300">Desconto (R$)</Label>
                <Input
                  placeholder="0.00"
                  value={saleDiscount}
                  onChange={(e) => setSaleDiscount(e.target.value)}
                  className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-xs focus-visible:ring-brand"
                />
              </div>
            </div>

            {/* Total Preview Card */}
            <div className="bg-brand/10 border border-brand/30 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block">
                  Valor Total da Venda
                </span>
                <span className="text-xs text-neutral-300">
                  {saleQuantity}x {brl(parseFloat(saleUnitPrice) || 0)} - Desc: {brl(parseFloat(saleDiscount) || 0)}
                </span>
              </div>
              <p className="text-2xl font-black text-brand">
                {brl(calculateSaleTotal())}
              </p>
            </div>

            {/* Forma de Pagamento e Condição */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-300">Forma de Pagamento</Label>
                <Select value={salePaymentMethod} onValueChange={setSalePaymentMethod}>
                  <SelectTrigger className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-white/10 text-white">
                    <SelectItem value="pix">⚡ Pix Instantâneo</SelectItem>
                    <SelectItem value="cartao_credito">💳 Cartão de Crédito</SelectItem>
                    <SelectItem value="boleto">📄 Boleto Bancário</SelectItem>
                    <SelectItem value="transferencia">🏦 Transferência TED / DOC</SelectItem>
                    <SelectItem value="dinheiro">💵 Dinheiro / À Vista</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-300">Condição / Parcelas</Label>
                <Select value={saleInstallments} onValueChange={setSaleInstallments}>
                  <SelectTrigger className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-white/10 text-white">
                    <SelectItem value="vista">À Vista / Parcela Única</SelectItem>
                    <SelectItem value="2x">2x Parcelado</SelectItem>
                    <SelectItem value="3x">3x Parcelado</SelectItem>
                    <SelectItem value="6x">6x Parcelado</SelectItem>
                    <SelectItem value="12x">12x Parcelado</SelectItem>
                    <SelectItem value="recorrente">Mensalidade Recorrente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-300">Status do Pagamento</Label>
                <Select value={saleStatus} onValueChange={setSaleStatus}>
                  <SelectTrigger className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-white/10 text-white">
                    <SelectItem value="Recebido">Recebido / Já Pago</SelectItem>
                    <SelectItem value="Pendente">Pendente / A Receber</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-neutral-300">Data da Venda</Label>
                <Input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="bg-black/60 border-white/10 text-white rounded-xl h-10 text-xs focus-visible:ring-brand"
                />
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-300">Observações ou Nota Fiscal (Opcional)</Label>
              <Textarea
                placeholder="Ex: Contrato nº 2026/04, entregas divididas em 2 etapas..."
                value={saleNotes}
                onChange={(e) => setSaleNotes(e.target.value)}
                className="bg-black/60 border-white/10 text-white rounded-xl text-xs min-h-[60px] focus-visible:ring-brand"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsSaleModalOpen(false)}
              className="border-white/10 text-neutral-300 hover:bg-white/5 rounded-xl text-xs h-10"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveSale}
              disabled={addTxMutation.isPending}
              className="gradient-brand text-black font-extrabold text-xs h-10 px-5 rounded-xl shadow-lg shadow-brand/20 hover:opacity-95"
            >
              {addTxMutation.isPending ? "Gravando Venda..." : "Concluir & Registrar Venda"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Nova Transação Genérica */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-[#111] border border-white/10 text-white rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">{formData.id ? "Editar Transação" : "Nova Transação"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input 
                value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})}
                placeholder="Ex: Pagamento Fornecedor" className="bg-black border-white/10 text-white h-10" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input 
                  value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})}
                  placeholder="0.00" type="number" className="bg-black border-white/10 text-white h-10" 
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formData.type} onValueChange={(val) => setFormData({...formData, type: val})}>
                  <SelectTrigger className="bg-black border-white/10 text-white h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-white/10 text-white">
                    <SelectItem value="in">Receita (Entrada)</SelectItem>
                    <SelectItem value="out">Despesa (Saída)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className="w-full bg-black border-white/10 text-left font-normal text-white h-10 hover:bg-black hover:text-white"
                    >
                      {formData.date ? format(new Date(formData.date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione uma data</span>}
                      <Calendar className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-[#111] border-white/10" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={formData.date ? new Date(formData.date + 'T12:00:00') : undefined}
                      onSelect={(date) => date && setFormData({...formData, date: date.toISOString().split('T')[0]})}
                      initialFocus
                      locale={ptBR}
                      className="text-white bg-[#111]"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val})}>
                  <SelectTrigger className="bg-black border-white/10 text-white h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black border-white/10 text-white">
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Atrasado">Atrasado</SelectItem>
                    {formData.type === 'in' ? (
                      <SelectItem value="Recebido">Recebido</SelectItem>
                    ) : (
                      <SelectItem value="Pago">Pago</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button disabled={addTxMutation.isPending || updateTxMutation.isPending} className="w-full mt-4 gradient-brand text-black" onClick={handleSave}>
              {addTxMutation.isPending || updateTxMutation.isPending ? "Salvando..." : "Salvar Transação"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Comprovante / Recibo da Venda */}
      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="max-w-md bg-[#0e0e11] border border-white/10 text-white rounded-2xl shadow-2xl p-0 overflow-hidden">
          <div id="printable-receipt" className="p-6 bg-[#111114] text-white">
            {/* Header com Logo e Dados da Agência */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-xl bg-gradient-to-tr from-[#c9a227] to-[#e6be44] text-black font-black text-lg flex items-center justify-center shadow-lg shadow-brand/20">
                  SM
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white tracking-tight">SM HUB</h3>
                  <p className="text-[11px] text-brand font-semibold">Agência & Performance Estratégica</p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="bg-brand/10 text-brand border-brand/30 text-[10px] font-mono px-2 py-0.5">
                  #{selectedReceiptTx ? `REC-${(selectedReceiptTx.id || "0000").substring(0, 8).toUpperCase()}` : "REC-0000"}
                </Badge>
                <p className="text-[10px] text-neutral-400 mt-1">
                  {selectedReceiptTx?.date ? new Date(selectedReceiptTx.date + 'T12:00:00').toLocaleDateString('pt-BR') : ""}
                </p>
              </div>
            </div>

            <div className="text-center my-3">
              <h2 className="text-base font-black text-white tracking-wide uppercase">
                Comprovante de Venda
              </h2>
              <p className="text-[11px] text-neutral-400">Documento de quitação de serviços e produtos</p>
            </div>

            {/* Client Info Card */}
            <div className="bg-black/50 border border-white/5 rounded-xl p-3 mb-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase font-bold">Cliente</span>
                  <span className="text-white font-bold truncate block">
                    {selectedReceiptTx?.client || selectedReceiptTx?.cliente || selectedReceiptTx?.saleDetails?.client || "Cliente Direto"}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase font-bold">Categoria</span>
                  <span className="text-white font-medium truncate block">{selectedReceiptTx?.cat || selectedReceiptTx?.category || "Venda"}</span>
                </div>
              </div>
            </div>

            {/* Breakdown Table */}
            <div className="border border-white/10 rounded-xl overflow-hidden mb-4">
              <table className="w-full text-xs text-left">
                <thead className="bg-white/5 text-neutral-400 border-b border-white/10">
                  <tr>
                    <th className="p-2.5">Item / Descrição</th>
                    <th className="p-2.5 text-center">Qtd</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr>
                    <td className="p-2.5 text-white font-medium text-xs">
                      {selectedReceiptTx?.saleDetails?.productName || selectedReceiptTx?.desc || selectedReceiptTx?.description}
                    </td>
                    <td className="p-2.5 text-center text-neutral-300">
                      {selectedReceiptTx?.saleDetails?.quantity || 1}
                    </td>
                    <td className="p-2.5 text-right font-bold text-white">
                      {brl(Math.abs(selectedReceiptTx?.amount || 0))}
                    </td>
                  </tr>
                </tbody>
              </table>

              {selectedReceiptTx?.saleDetails?.discount > 0 && (
                <div className="p-2 bg-red-500/5 text-right text-xs text-red-400 border-t border-white/5">
                  Desconto aplicado: -{brl(selectedReceiptTx.saleDetails.discount)}
                </div>
              )}

              <div className="p-3 bg-brand/5 border-t border-brand/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-neutral-400 block uppercase font-medium">Forma de Pagamento</span>
                  <span className="text-xs font-bold text-white uppercase">
                    {selectedReceiptTx?.saleDetails?.paymentMethod || "Pix Instantâneo"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-brand block uppercase font-bold">Valor Total</span>
                  <span className="text-base font-black text-brand">
                    {brl(Math.abs(selectedReceiptTx?.amount || 0))}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Stamp */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0" />
                <div>
                  <span className="font-bold block">Status: {selectedReceiptTx?.status || "Recebido"}</span>
                  <span className="text-[10px] text-emerald-400/80">Lançamento autenticado no SM HUB</span>
                </div>
              </div>
              <span className="text-[10px] font-mono uppercase bg-emerald-500/20 px-2 py-0.5 rounded font-bold">
                ✓ PAGO
              </span>
            </div>

            {selectedReceiptTx?.saleDetails?.notes && (
              <div className="mt-3 p-2.5 bg-black/40 border border-white/5 rounded-xl text-xs text-neutral-300">
                <span className="text-[10px] text-neutral-500 block uppercase font-bold">Observações</span>
                {selectedReceiptTx.saleDetails.notes}
              </div>
            )}
          </div>

          {/* Modal Actions (Hidden in Print) */}
          <div className="p-4 bg-[#0a0a0c] border-t border-white/10 flex flex-wrap items-center justify-end gap-2 no-print">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopyReceiptText(selectedReceiptTx)}
              className="bg-white/5 border-white/10 text-white hover:bg-white/10 text-xs h-9 rounded-xl"
            >
              <Copy className="size-3.5 mr-1.5" /> Copiar Texto
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="bg-white/5 border-white/10 text-white hover:bg-white/10 text-xs h-9 rounded-xl"
            >
              <Printer className="size-3.5 mr-1.5" /> Imprimir / PDF
            </Button>
            <Button
              size="sm"
              onClick={() => handleSendWhatsAppReceipt(selectedReceiptTx)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 rounded-xl shadow-lg shadow-emerald-600/20"
            >
              <Share2 className="size-3.5 mr-1.5" /> Enviar WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
