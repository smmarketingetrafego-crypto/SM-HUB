import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import { Unplug } from 'lucide-react';
export function SetupStatus({ open, onOpenChange, title, message }: { open: boolean; onOpenChange: (v: boolean) => void; title: string; message: string }) {
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><Unplug className="mb-3 size-7 text-muted-foreground"/><DialogTitle>{title}</DialogTitle><DialogDescription>{message}</DialogDescription></DialogHeader><p className="text-sm text-warning">Não conectado</p><Button asChild variant="outline"><Link to="/integracoes" onClick={() => onOpenChange(false)}>Ver integrações</Link></Button></DialogContent></Dialog>;
}
