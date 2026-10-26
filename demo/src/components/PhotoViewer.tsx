import { X } from "lucide-react";

export function PhotoViewer({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/90 p-4 animate-fade-in" onClick={onClose} role="dialog" aria-modal="true">
      <button type="button" aria-label="close" className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white">
        <X className="h-6 w-6" />
      </button>
      <img src={src} alt="" className="max-h-full max-w-full rounded-xl object-contain" />
    </div>
  );
}
