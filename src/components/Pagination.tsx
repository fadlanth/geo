import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

function getPageList(page: number, totalPages: number): (number | 'ellipsis-start' | 'ellipsis-end')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (page <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis-end', totalPages];
  }
  if (page >= totalPages - 3) {
    return [1, 'ellipsis-start', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, 'ellipsis-start', page - 1, page, page + 1, 'ellipsis-end', totalPages];
}

export default function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        aria-label="Halaman sebelumnya"
        className="h-8 px-2.5 flex items-center gap-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none transition"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      {getPageList(page, totalPages).map((p, i) => (
        p === 'ellipsis-start' || p === 'ellipsis-end' ? (
          <span key={`${p}-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-slate-400 select-none">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`w-8 h-8 text-xs font-semibold rounded-lg transition ${
              p === page
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {p}
          </button>
        )
      ))}
      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        aria-label="Halaman berikutnya"
        className="h-8 px-2.5 flex items-center gap-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none transition"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}