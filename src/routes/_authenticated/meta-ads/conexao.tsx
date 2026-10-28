import { pageMeta } from '@/lib/page-meta';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { startMetaOAuth, getMetaConnection, listMetaAdAccounts, disconnectMeta, setMetaAccountLinked } from '../../../lib/meta-ads.functions';
import { toast } from 'sonner';

export const Route = createFileRoute('/_authenticated/meta-ads/conexao')({
  head: () => pageMeta('Conexao', 'Área de conexao do SM Hub.'),
  component: MetaAdsConnectionPage,
});

function MetaAdsConnectionPage() {
  const qc = useQueryClient();
  const getConnFn = useServerFn(getMetaConnection);
  const startOAuthFn = useServerFn(startMetaOAuth);
  const listAccountsFn = useServerFn(listMetaAdAccounts);
  const disconnectFn = useServerFn(disconnectMeta);
  const setLinkedFn = useServerFn(setMetaAccountLinked);

  const { data: connection, isLoading } = useQuery({
    queryKey: ['meta-connection'],
    queryFn: () => getConnFn(),
  });

  const { data: accounts, isLoading: loadingAccounts } = useQuery({
    queryKey: ['meta-accounts'],
    queryFn: () => listAccountsFn(),
    enabled: !!connection?.connected,
  });

  const handleConnect = async () => {
    try {
      const res = await startOAuthFn();
      if (res?.url) {
        window.location.href = res.url;
      } else {
        toast.success('Meta Ads conectado com sucesso!');
        await qc.invalidateQueries({ queryKey: ['meta-connection'] });
        await qc.invalidateQueries({ queryKey: ['meta-accounts'] });
      }
    } catch (e: any) {
      toast.error('Erro ao conectar Meta Ads: ' + e.message);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectFn();
      toast.success('Meta Ads desconectado.');
      await qc.invalidateQueries({ queryKey: ['meta-connection'] });
      await qc.invalidateQueries({ queryKey: ['meta-accounts'] });
    } catch (e: any) {
      toast.error('Erro ao desconectar: ' + e.message);
    }
  };

  const handleToggle = async (accountId: string, current: boolean) => {
    try {
      await setLinkedFn({ data: { accountId, active: !current } });
      await qc.invalidateQueries({ queryKey: ['meta-accounts'] });
      toast.success('Status da conta atualizado.');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-muted-foreground">Verificando conexão Meta Ads...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Integração Meta Ads</h1>
        <p className="text-muted-foreground mt-1">Gerencie a conexão da sua conta empresarial e contas de anúncios do Facebook / Instagram.</p>
      </div>

      {!connection?.connected ? (
        <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mb-5">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02Z"/></svg>
          </div>
          <h3 className="text-xl font-bold mb-2 text-foreground">Conecte sua conta do Facebook Business</h3>
          <p className="text-muted-foreground max-w-md mb-6 text-sm leading-relaxed">
            Vincule seu gerenciador de negócios para importar automaticamente métricas, campanhas e relatórios de tráfego pago dos seus clientes.
          </p>
          <button 
            onClick={handleConnect}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            Conectar com Facebook Business
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 flex flex-wrap justify-between items-center gap-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">Facebook Business Conectado</h3>
                <p className="text-sm text-muted-foreground">Credenciais ativas e validadas para sincronização de campanhas.</p>
              </div>
            </div>
            <button 
              onClick={handleDisconnect} 
              className="text-destructive hover:bg-destructive/10 border border-destructive/30 px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer"
            >
              Desconectar
            </button>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-lg mb-4 text-foreground">Contas de Anúncios Disponíveis</h3>
            {loadingAccounts ? (
              <p className="text-muted-foreground text-sm">Carregando contas de anúncio...</p>
            ) : accounts?.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma conta de anúncio encontrada neste perfil.</p>
            ) : (
              <div className="space-y-3">
                {accounts?.map((acc: any) => (
                  <div key={acc.account_id} className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/40">
                    <div>
                      <h4 className="font-semibold text-foreground text-sm">{acc.name}</h4>
                      <p className="text-xs text-muted-foreground">ID: {acc.account_id} • Moeda: {acc.currency}</p>
                    </div>
                    <div>
                      <button
                        onClick={() => handleToggle(acc.account_id, !!acc.active)}
                        className={`text-xs px-3 py-1.5 rounded-md font-medium cursor-pointer transition ${
                          acc.active
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                            : 'bg-muted text-muted-foreground border border-border'
                        }`}
                      >
                        {acc.active ? 'Sincronizando' : 'Pausado'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
