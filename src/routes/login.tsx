import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "./auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { property: 'og:title', content: 'Login & Acesso — SM Hub' },
      { property: 'og:description', content: 'Acesse sua conta no SM Hub ou cadastre-se para gerenciar sua agência.' },
      { property: 'og:type', content: 'website' },
      { title: "Login & Cadastro — SM Hub" },
      { name: "description", content: "Acesse sua conta no SM Hub ou cadastre-se para gerenciar sua agência." },
    ],
  }),
  component: AuthPage,
});
