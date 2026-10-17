import { createFileRoute } from '@tanstack/react-router';
import { IntegrationStatusPanel } from '@/components/integrations/integration-status-panel';
import { pageMeta } from '@/lib/page-meta';
export const Route = createFileRoute('/integracoes')({ head: () => pageMeta('Integrações', 'Status real das conexões externas e do Google Drive central do SM Hub.'), component: () => <div className="space-y-6"><header className="border-b border-border pb-5"><h1 className="text-3xl font-semibold">Integrações</h1></header><IntegrationStatusPanel/></div> });
