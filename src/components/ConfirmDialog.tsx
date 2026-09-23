import { AlertTriangle, X } from 'lucide-react';
import Button from './Button';
import { useEscapeClose } from '../lib/hooks';

interface ConfirmDialogProps {
  title: string;
  message: string;
  detail?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ title, message, detail, confirmLabel = 'Hapus', onConfirm, onCancel }: ConfirmDialogProps) {
  useEscapeClose(true, onCancel);
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onCancel}>
      <div
        className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="text-sm font-bold text-[var(--color-text-main)]">{title}</h3>
            <p className="text-xs text-gray-500 leading-relaxed">{message}</p>
            {detail && (
              <p className="text-[11px] font-semibold text-[var(--color-primary)] bg-red-50 border border-[var(--color-primary)]/15 rounded-lg p-2.5 leading-relaxed">
                {detail}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={onCancel}>Batal</Button>
              <Button size="sm" onClick={onConfirm}>{confirmLabel}</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}