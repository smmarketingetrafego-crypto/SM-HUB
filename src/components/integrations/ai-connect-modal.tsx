import { SetupStatus } from './setup-status';
interface Props { open: boolean; onOpenChange: (v: boolean) => void; integrations?: unknown; initialProvider?: string; }
export function AIConnectModal({ open, onOpenChange }: Props) { return <SetupStatus open={open} onOpenChange={onOpenChange} title="Provedores de IA externos" message="Nenhuma conta pessoal de IA foi autorizada. O assistente de suporte utiliza Lovable AI; conectar um e-mail não conecta ChatGPT ou outros provedores."/>; }
