import { pageMeta } from '@/lib/page-meta';
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/conteudos')({
  head: () => pageMeta('Conteudos', 'Área de conteudos do SM Hub.'),
  beforeLoad: () => {
    throw redirect({ to: '/calendario-conteudo' });
  },
});
