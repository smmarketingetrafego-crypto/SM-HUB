import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Save, Settings, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getFounderAccountAccess, saveFounderAccountSettings, selectFounderAccount } from '@/lib/api-admin.functions';

export function AccountSettingsPanel({ account }: { account: { id: string; name: string; email: string; notes: string; status: string } }) {
  const [name, setName] = useState(account.name);
  const [notes, setNotes] = useState(account.notes);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const read = useServerFn(getFounderAccountAccess);
  const save = useServerFn(saveFounderAccountSettings);
  const selectAccount = useServerFn(selectFounderAccount);
  const access = useQuery({ queryKey: ['founder-account-access', account.id], queryFn: () => read({ data: account.id }) });
  async function openSettings() {
    setBusy(true);
    try {
      const target = await selectAccount({ data: account.id });
      sessionStorage.setItem('smhub-founder-account', target.id);
      sessionStorage.setItem('smhub-founder-account-label', target.email || target.name);
      window.location.assign('/configuracoes');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível abrir a conta.'); setBusy(false); }
  }
  return <section className="space-y-4 border-t border-border pt-5">
    <form className="space-y-3" onSubmit={async e => {
      e.preventDefault(); setBusy(true);
      try { await save({ data: { accountId: account.id, name, notes } }); await qc.invalidateQueries({ queryKey: ['admin-overview'] }); toast.success('Configurações da conta salvas.'); }
      catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível salvar.'); }
      finally { setBusy(false); }
    }}>
      <div><Label htmlFor="account-name">Nome da conta</Label><Input id="account-name" required maxLength={120} value={name} onChange={e => setName(e.target.value)}/></div>
      <div><Label htmlFor="account-notes">Notas administrativas</Label><Textarea id="account-notes" maxLength={5000} value={notes} onChange={e => setNotes(e.target.value)}/></div>
      <Button type="submit" variant="outline" disabled={busy}><Save className="mr-2 size-4"/>Salvar configurações</Button>
    </form>
    <div className="space-y-2 border-t border-border pt-4"><h3 className="flex items-center gap-2 font-medium"><Users className="size-4"/>Acessos da conta</h3>
      <p className="text-sm text-muted-foreground">{account.status === 'suspended' ? 'Conta suspensa' : 'Conta ativa'}</p>
      {access.isPending && <p role="status" className="text-sm">Carregando acessos…</p>}
      {access.error && <p role="alert" className="text-sm text-destructive">{access.error.message}</p>}
      {access.data?.map(person => <div key={person.userId} className="flex flex-wrap justify-between gap-2 border-b border-border py-2 text-sm"><span className="break-all">{person.name}</span><span className="text-muted-foreground">{person.role === 'member' ? 'Membro' : person.role === 'admin' ? 'Administrador' : person.role}</span></div>)}
    </div>
    <Button disabled={busy} variant="outline" onClick={openSettings}><Settings className="mr-2 size-4"/>Abrir configurações desta conta</Button>
  </section>;
}