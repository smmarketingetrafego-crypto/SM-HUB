import { pageMeta } from '@/lib/page-meta';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { startMetaOAuth, getMetaConnection, listMetaAdAccounts, disconnectMeta } from '../../../lib/meta-ads.functions';

export const Route = createFileRoute('/_authenticated/meta-ads/conexao')({
 head: () => pageMeta('Conexao', 'Área de conexao do SM Hub.'),
  component: MetaAdsConnectionPage,
});

function MetaAdsConnectionPage() {
  const { data: connection, isLoading } = useQuery({
    queryKey: ['meta-connection'],
    queryFn: () => getMetaConnection()
  });

  const { data: accounts, isLoading: loadingAccounts } = useQuery({
    queryKey: ['meta-accounts'],
    queryFn: () => listMetaAdAccounts(),
    enabled: !!connection?.connected
  });

  const handleConnect = async () => {
    const { url } = await startMetaOAuth();
    if (url) {
      window.location.href = url; // Redireciona o usuário para o OAuth da Meta
    }
  };

  const handleDisconnect = async () => {
    await disconnectMeta();
    window.location.reload();
  };

  if (isLoading) {
    return <div className="text-gray-400">Verificando conexão...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 text-heading">Integração Meta Ads</h1>
      <p className="text-gray-400 mb-8">Gerencie a conexão da sua conta empresarial do Facebook.</p>

      {!connection?.connected ? (
        <div className="bg-[#111] border border-gray-800 rounded-lg p-8 flex flex-col items-center justify-center text-center shadow-lg">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02Z"/></svg>
          </div>
          <h3 className="text-xl font-bold mb-2">Conecte sua conta do Facebook</h3>
          <p className="text-gray-400 max-w-md mb-6">Você precisa vincular o seu gerenciador de negócios para que possamos importar automaticamente campanhas e gastos.</p>
          <button 
            onClick={handleConnect}
            className="bg-blue-600 text-white font-semibold px-8 py-3 rounded-md hover:bg-blue-700 transition-colors shadow-md"
          >
            Conectar com Facebook
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-[#111] border border-gray-800 rounded-lg p-6 flex justify-between items-center shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-lg">Facebook Business Conectado</h3>
                <p className="text-sm text-gray-400">Suas credenciais estão ativas e validadas.</p>
              </div>
            </div>
            <button onClick={handleDisconnect} className="text-red-400 hover:text-red-300 border border-red-900/50 px-4 py-2 rounded-md transition">
              Desconectar
            </button>
          </div>

          <div className="bg-[#111] border border-gray-800 rounded-lg p-6 shadow-md">
            <h3 className="font-bold text-lg mb-4">Contas de Anúncio Disponíveis</h3>
            {loadingAccounts ? (
              <p className="text-gray-400">Carregando contas...</p>
            ) : accounts?.length === 0 ? (
              <p className="text-gray-400">Nenhuma conta de anúncio encontrada neste perfil.</p>
            ) : (
              <div className="space-y-4">
                {accounts?.map((acc: any) => (
                  <div key={acc.account_id} className="flex items-center justify-between p-4 border border-gray-800 rounded-md bg-[#1a1a1a]">
                    <div>
                      <h4 className="font-semibold text-heading">{acc.name}</h4>
                      <p className="text-sm text-gray-500">ID: {acc.account_id} • Moeda: {acc.currency}</p>
                    </div>
                    <div>
                      {/* Simulação de um Toggle Switch */}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold"></div>
                      </label>
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
