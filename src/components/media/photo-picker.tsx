export function PhotoAvatar({ value, fallback, shape, className, onClick }: any) {
  return (
    <div onClick={onClick} className={`${className} bg-[#222] flex items-center justify-center text-sm font-medium text-white cursor-pointer`}>
      {fallback}
    </div>
  );
}
export function PhotoCropDialog({ open, onOpenChange }: any) {
  return null;
}
