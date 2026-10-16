import { createFileRoute } from '@tanstack/react-router';
import { TutorialBanner } from "@/components/layout/tutorial-banner";
import { Search, Plus, Filter, Package, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { brl } from "@/lib/format";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProducts, addProduct, updateProduct, deleteProduct } from "@/lib/api-produtos.server";
import { toast } from "sonner";

export const Route = createFileRoute("/produtos")({
  component: ProdutosPage,
});

function ProdutosPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<any>({ id: '', name: '', desc: '', price: '', category: 'Serviço', active: true });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts()
  });

  const addProdMutation = useMutation({
    mutationFn: async (data: any) => addProduct({ data }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Produto cadastrado!");
        queryClient.invalidateQueries({ queryKey: ['products'] });
        setIsModalOpen(false);
      } else toast.error("Erro: " + res.error);
    }
  });

  const updateProdMutation = useMutation({
    mutationFn: async (data: any) => updateProduct({ data }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Produto atualizado!");
        queryClient.invalidateQueries({ queryKey: ['products'] });
        setIsModalOpen(false);
      } else toast.error("Erro: " + res.error);
    }
  });

  const deleteProdMutation = useMutation({
    mutationFn: async (id: string) => deleteProduct({ data: id }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Produto removido!");
        queryClient.invalidateQueries({ queryKey: ['products'] });
      } else toast.error("Erro: " + res.error);
    }
  });

  const handleSave = () => {
    if (!formData.name || !formData.price) {
      toast.error("Nome e Preço são obrigatórios.");
      return;
    }
    const payload = { ...formData, price: Number(formData.price) };
    if (formData.id) {
      updateProdMutation.mutate(payload);
    } else {
      addProdMutation.mutate(payload);
    }
  };

  const handleOpenNew = () => {
    setFormData({ id: '', name: '', desc: '', price: '', category: 'Serviço', active: true });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <TutorialBanner location="Produtos" />
      
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Produtos & Serviços</h1>
          <p className="mt-1 text-sm text-gray-400">Gerencie seu catálogo para envio rápido de orçamentos e links de pagamento.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64 hidden md:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-500" />
            <Input placeholder="Buscar produto..." className="pl-9 h-10 bg-[#111] border-white/10 text-white rounded-xl" />
          </div>
          <Button variant="outline" className="bg-transparent border-white/10 text-white hover:bg-white/5">
            <Filter className="mr-2 size-4" /> Filtros
          </Button>

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenNew} className="gradient-brand text-primary-foreground shadow-[0_0_15px_rgba(201,162,39,0.3)] border-0">
                <Plus className="mr-2 size-4" /> Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#111] border border-white/10 text-white rounded-2xl max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl">Cadastrar Novo Produto/Serviço</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nome do Produto/Serviço</Label>
                  <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Mentoria 1h" className="bg-black border-white/10 text-white h-10" />
                </div>
                <div className="space-y-2">
                  <Label>Descrição Curta</Label>
                  <Input value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} placeholder="Detalhes que vão aparecer no orçamento..." className="bg-black border-white/10 text-white h-10" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Preço Base (R$)</Label>
                    <Input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="0,00" className="bg-black border-white/10 text-white h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={formData.category} onValueChange={val => setFormData({...formData, category: val})}>
                      <SelectTrigger className="bg-black border-white/10 text-white h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black border-white/10 text-white">
                        <SelectItem value="Serviço">Serviço</SelectItem>
                        <SelectItem value="Produto Digital">Produto Digital</SelectItem>
                        <SelectItem value="SaaS">SaaS / Assinatura</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button disabled={addProdMutation.isPending || updateProdMutation.isPending} className="w-full mt-4 gradient-brand text-black" onClick={handleSave}>
                  {addProdMutation.isPending || updateProdMutation.isPending ? "Salvando..." : "Salvar Cadastro"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((prod: any) => (
          <div key={prod.id} className="bg-[#111] border border-white/10 rounded-2xl p-5 hover:border-brand/50 transition-colors group flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
              <Button onClick={() => { setFormData({...prod}); setIsModalOpen(true); }} variant="ghost" size="icon" className="size-8 bg-black/50 text-white hover:bg-brand hover:text-black rounded-full backdrop-blur-sm"><Edit2 className="size-3" /></Button>
              <Button onClick={() => deleteProdMutation.mutate(prod.id)} variant="ghost" size="icon" className="size-8 bg-black/50 text-white hover:bg-red-500 hover:text-white rounded-full backdrop-blur-sm"><Trash2 className="size-3" /></Button>
            </div>
            
            <div className="size-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-brand mb-4">
              <Package className="size-6" />
            </div>
            
            <Badge variant="outline" className={`w-fit mb-3 text-[10px] uppercase border-0 ${prod.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
              {prod.active ? "Ativo" : "Inativo"}
            </Badge>
            
            <h3 className="text-lg font-semibold text-white mb-2 leading-tight">{prod.name}</h3>
            <p className="text-sm text-gray-500 mb-6 flex-1">{prod.desc}</p>
            
            <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10">
              <span className="text-xs text-gray-400">{prod.category}</span>
              <span className="text-xl font-bold text-white">{brl(prod.price)}</span>
            </div>
          </div>
        ))}

        {/* Empty state card */}
        <div className="bg-black/20 border border-dashed border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/5 transition-colors min-h-[250px]">
          <div className="size-12 rounded-full bg-brand/10 text-brand flex items-center justify-center mb-4">
            <Plus className="size-6" />
          </div>
          <h3 className="text-white font-medium mb-1">Adicionar novo</h3>
          <p className="text-xs text-gray-500 max-w-[200px]">Crie um novo produto, serviço ou pacote para o seu portfólio.</p>
        </div>
      </div>
    </div>
  );
}
