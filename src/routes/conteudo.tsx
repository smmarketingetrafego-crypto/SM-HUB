import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/conteudo')({
  beforeLoad: () => {
    throw redirect({ to: '/calendario-conteudo' });
  },
});
