export const brl = (val: number) => `R$ ${val.toFixed(2).replace('.', ',')}`;
export const initials = (name: string) => name ? name.substring(0, 2).toUpperCase() : '??';
export const shortDate = (date: string) => date ? new Date(date).toLocaleDateString('pt-BR') : '';
