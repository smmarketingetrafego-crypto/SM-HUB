export function ConfirmAction({ title, description, onConfirm, trigger }: any) {
  return <div onClick={onConfirm}>{trigger}</div>;
}
