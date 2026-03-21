import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  wide?: boolean;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, wide, children }: ModalProps) {
  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[900] bg-black/40 flex items-center justify-center p-5"
      style={{ backdropFilter: 'blur(4px)' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={cn(
          'bg-card rounded-2xl border border-border w-full max-h-[85vh] overflow-auto shadow-xl',
          wide ? 'max-w-[760px]' : 'max-w-[480px]'
        )}
      >
        <div className="px-5 py-4 border-b border-border flex justify-between items-center">
          <span className="font-bold text-base text-foreground">{title}</span>
          <button onClick={onClose} className="bg-transparent border-none text-muted-foreground text-xl cursor-pointer hover:text-foreground transition-colors">
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
