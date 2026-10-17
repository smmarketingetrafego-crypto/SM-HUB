import { SetupStatus } from './setup-status';
interface Props { open: boolean; onOpenChange: (v: boolean) => void; connection?: unknown; }
export function WhatsAppConnectModal({ open, onOpenChange }: Props) { return <SetupStatus open={open} onOpenChange={onOpenChange} title="WhatsApp não conectado" message="A conexão oficial da Meta ainda precisa ser configurada. Não há QR Code, aparelho pareado ou envio de mensagens ativo."/>; }
