import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { processGoogleCallback } from '@/lib/auth.server';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export const Route = createFileRoute("/api/auth/callback")({
  component: OAuthCallbackPage,
});

function OAuthCallbackPage() {
  const searchParams = new URLSearchParams(window.location.search);
  const code = searchParams.get('code');
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (code) {
      processGoogleCallback({ data: code })
        .then((res) => {
          if (res.success) {
            navigate({ to: '/configuracoes', search: { drive_connected: 'true' } });
          } else {
            setError(res.error || "Erro desconhecido");
          }
        })
        .catch((e) => setError(e.message));
    } else {
      setError("Código de autorização não encontrado.");
    }
  }, [code, navigate]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4 text-white text-center">
        {error ? (
          <>
            <div className="size-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4 text-2xl font-bold">!</div>
            <h2 className="text-xl font-bold">Erro na Autenticação</h2>
            <p className="text-gray-400 max-w-sm">{error}</p>
            <button onClick={() => navigate({ to: '/configuracoes' })} className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg">Voltar</button>
          </>
        ) : (
          <>
            <Loader2 className="size-12 animate-spin text-brand" />
            <h2 className="text-xl font-bold mt-4">Conectando ao Google Drive...</h2>
            <p className="text-gray-400">Por favor, aguarde enquanto finalizamos a configuração do seu banco de dados.</p>
          </>
        )}
      </div>
    </div>
  );
}
