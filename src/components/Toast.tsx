import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'warning';

export type ToastOptions = {
  kind: ToastKind;
  title: string;
  message?: string;
  durationMs?: number;
};

type ToastProps = {
  key?: React.Key;
  toast: ToastOptions & { id: string };
  onClose: (id: string) => void;
};

export default function Toast({ toast, onClose }: ToastProps) {
  const { id, kind, title, message, durationMs = 3000 } = toast;
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t1 = window.setTimeout(() => setVisible(false), Math.max(0, durationMs - 250));
    const t2 = window.setTimeout(() => onClose(id), durationMs);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [id, durationMs, onClose]);

  const icon = kind === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />;
  const borderColor = kind === 'success'
    ? 'color-mix(in srgb, var(--color-success) 18%, transparent)'
    : 'color-mix(in srgb, var(--color-warning) 18%, transparent)';
  const bgColor = kind === 'success'
    ? 'color-mix(in srgb, var(--color-success) 10%, var(--color-base))'
    : 'color-mix(in srgb, var(--color-warning) 10%, var(--color-base))';
  const fgColor = kind === 'success' ? 'var(--color-success)' : 'var(--color-warning)';

  return (
    <div
      className={
        `pointer-events-auto transition-all duration-200 fixed right-4 top-4 z-[60] ` +
        (visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0')
      }
      style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, color: fgColor, width: 'min(420px, calc(100vw - 2rem))' }}
      role="status"
      aria-live="polite"
    >
      <div className="p-3.5 flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div className="flex-1">
          <div className="font-bold text-xs">{title}</div>
          {message ? <div className="text-[11px] mt-1.5 text-[color:inherit] opacity-90">{message}</div> : null}
        </div>
        <button
          onClick={() => onClose(id)}
          className="p-1 rounded-md hover:bg-black/5 transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

