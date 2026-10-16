import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/conteudos')({
  beforeLoad: () => {
    throw redirect({ to: '/calendario-conteudo' });
  },
});
