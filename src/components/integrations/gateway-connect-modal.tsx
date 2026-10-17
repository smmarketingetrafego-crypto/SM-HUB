import { SetupStatus } from './setup-status';
interface Props { open: boolean; onOpenChange: (v: boolean) => void; integrations?: unknown; initialGateway?: string; }
export function GatewayConnectModal({ open, onOpenChange }: Props) { return <SetupStatus open={open} onOpenChange={onOpenChange} title="Pagamentos Asaas" message="As credenciais serão configuradas somente por formulário seguro. Cobranças aguardam seus planos reais, sem preços de demonstração."/>; }
