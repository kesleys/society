import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

export function Modal({ open, onClose, title, children, size = "md" }: { open: boolean; onClose: () => void; title: string; children: ReactNode; size?: "md" | "lg" | "xl" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const w = size === "xl" ? "max-w-4xl" : size === "lg" ? "max-w-3xl" : "max-w-xl";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={`bg-[#252526] border border-[#3E3E42] rounded-md w-full ${w} max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#252526] border-b border-[#3E3E42] p-5 flex items-center gap-4 z-10">
          <h2 className="text-white tracking-tight flex-1">{title}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-md bg-[#2D2D30] border border-[#3E3E42] hover:bg-[#3E3E42] flex items-center justify-center">
            <X className="w-4 h-4 text-[#CCCCCC]" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-widest text-[#858585] mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full px-3 py-2 rounded-md bg-[#1E1E1E] border border-[#3E3E42] text-sm text-[#D4D4D4] placeholder:text-[#858585] focus:outline-none focus:border-[#007ACC]";
