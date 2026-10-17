import { SetupStatus } from './setup-status';
interface Props { open: boolean; onOpenChange: (v: boolean) => void; adminEmail?: string; }
export function EmailConnectModal({ open, onOpenChange }: Props) { return <SetupStatus open={open} onOpenChange={onOpenChange} title="E-mail externo não conectado" message="Não existe conexão externa verificada de envio. A configuração deve utilizar credenciais seguras, nunca uma confirmação simulada."/>; }
