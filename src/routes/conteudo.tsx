import { pageMeta } from '@/lib/page-meta';
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/conteudo')({
  head: () => pageMeta('Conteudo', 'Área de conteudo do SM Hub.'),
  beforeLoad: () => {
    throw redirect({ to: '/calendario-conteudo' });
  },
});
