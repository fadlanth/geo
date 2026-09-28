import React, { useEffect, useState, useCallback } from 'react';
import { Activity, Search, RefreshCw, Eye, X, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SkeletonTable } from './Skeleton';
import IconButton from './IconButton';
import StatusChip from './StatusChip';
import Pagination from './Pagination';
import { ToastOptions } from './Toast';
import { errMsg } from '../lib/format';
import { useEscapeClose } from '../lib/hooks';

interface AuditLog {
  id: string;
  actor_email: string;
  entitas: string;
  aksi: string;
  entitas_id: string;
  payload: unknown;
  created_at: string;
}

interface AuditTabProps {
  loading: boolean;
  triggerToast?: (options: ToastOptions) => void;
}

const ROWS_PER_PAGE = 25;

export default function AuditTab({ loading: initialLoading, triggerToast }: AuditTabProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copied, setCopied] = useState(false);

  useEscapeClose(Boolean(selectedLog), () => setSelectedLog(null));

  const loadLogs = useCallback(async () => {
    setIsLoadingLogs(true);
    try {
      const from = (page - 1) * ROWS_PER_PAGE;
      const to = from + ROWS_PER_PAGE - 1;

      let query = supabase
        .from('audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      const cleanSearch = search.trim().replace(/[%_(),]/g, '');
      if (cleanSearch) {
        query = query.or(
          `entitas.ilike.%${cleanSearch}%,aksi.ilike.%${cleanSearch}%,entitas_id.ilike.%${cleanSearch}%,actor_email.ilike.%${cleanSearch}%`
        );
      }
      const { data, error, count } = await query;
      if (error) throw error;
      setLogs((data as AuditLog[]) || []);
      setTotalCount(count ?? 0);
    } catch (err) {
      triggerToast?.({ kind: 'error', title: 'Gagal Memuat', message: errMsg(err, 'Tidak dapat memuat log audit.') });
      setLogs([]);
      setTotalCount(0);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [page, search, triggerToast]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs, refreshKey]);

  const totalPages = Math.ceil(totalCount / ROWS_PER_PAGE) || 1;

  const handleCopyPayload = () => {
    if (!selectedLog) return;
    navigator.clipboard.writeText(JSON.stringify(selectedLog.payload ?? {}, null, 2));
    setCopied(true);
    triggerToast?.({ kind: 'success', title: 'Tersalin', message: 'Payload JSON berhasil disalin ke clipboard.' });
    setTimeout(() => setCopied(false), 2000);
  };

  const isBusy = initialLoading || isLoadingLogs;

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]/75">Monitoring Sistem</p>
          <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[var(--color-text-main)] flex items-center gap-2">
            <Activity className="w-5 h-5 text-[var(--color-primary)]" /> Log Aktivitas Sistem
          </h2>
          <p className="text-xs text-[var(--color-text-main)]/75">Jejak riwayat perubahan data oleh pengguna sistem</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64 sm:flex-none">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari entitas / aksi / email..."
              aria-label="Cari log aktivitas"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-9 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] shadow-sm"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none transition"
                aria-label="Bersihkan pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <IconButton
            label="Muat ulang log"
            onClick={() => setRefreshKey((k) => k + 1)}
            icon={<RefreshCw className={`w-4 h-4 ${isLoadingLogs ? 'animate-spin' : ''}`} />}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[var(--color-primary)]/10 shadow-xs overflow-hidden">
        {isBusy && logs.length === 0 ? (
          <SkeletonTable rows={5} cols={6} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs font-bold font-display uppercase tracking-wider text-[var(--color-text-main)]/75 border-b border-gray-100 bg-gray-50/50">
                    <th className="p-3 pl-4">Tanggal/Jam</th>
                    <th className="p-3">Pengguna</th>
                    <th className="p-3">Entitas</th>
                    <th className="p-3">Aksi</th>
                    <th className="p-3">ID Baris</th>
                    <th className="p-3 pr-4 text-center">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {logs.length > 0 ? (
                    logs.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50/40 transition">
                        <td className="p-3 pl-4 font-mono text-[11px] text-[var(--color-text-main)]/85 whitespace-nowrap">
                          {new Date(row.created_at).toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-[var(--color-text-main)]/80">
                          {row.actor_email || <span className="text-gray-400 font-mono text-xs">(sistem)</span>}
                        </td>
                        <td className="p-3">
                          <StatusChip status={row.entitas} tone="neutral" />
                        </td>
                        <td className="p-3 capitalize">
                          {row.aksi === 'insert' && <StatusChip status="tambah" tone="green" />}
                          {row.aksi === 'update' && <StatusChip status="ubah" tone="blue" />}
                          {row.aksi === 'delete' && <StatusChip status="hapus" tone="red" />}
                          {row.aksi === 'replace' && <StatusChip status="ganti" tone="amber" />}
                          {!['insert','update','delete','replace'].includes(row.aksi) && (
                            <StatusChip status={row.aksi} tone="neutral" />
                          )}
                        </td>
                        <td className="p-3 font-mono text-xs text-[var(--color-text-main)]/85 truncate max-w-[160px]" title={row.entitas_id}>
                          {row.entitas_id}
                        </td>
                        <td className="p-3 pr-4 text-center">
                          <button
                            onClick={() => setSelectedLog(row)}
                            className="inline-flex items-center gap-1 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 px-2.5 py-1 rounded-lg text-xs font-semibold focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none transition cursor-pointer"
                            title="Buka detail payload JSON"
                          >
                            <Eye className="w-3.5 h-3.5" /> Detail
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-sm text-gray-400">
                        {search ? `Tidak ada log aktivitas yang cocok dengan "${search}".` : 'Belum ada log aktivitas.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/40">
              <p className="text-xs text-gray-500">
                Menampilkan {logs.length > 0 ? (page - 1) * ROWS_PER_PAGE + 1 : 0}–{Math.min(page * ROWS_PER_PAGE, totalCount)} dari <b>{totalCount}</b> aktivitas
              </p>
              <Pagination page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          </>
        )}
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-display font-bold text-base text-[var(--color-text-main)] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[var(--color-primary)]" />
                  Detail Log Aktivitas
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(selectedLog.created_at).toLocaleString('id-ID')} &bull; Oleh: <span className="font-semibold text-gray-700">{selectedLog.actor_email || 'sistem'}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none transition cursor-pointer"
                aria-label="Tutup detail modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <p className="text-gray-400 uppercase text-[10px] font-bold">Entitas</p>
                <p className="font-semibold mt-0.5 text-gray-800 capitalize">{selectedLog.entitas}</p>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <p className="text-gray-400 uppercase text-[10px] font-bold">Aksi</p>
                <p className="font-semibold mt-0.5 text-gray-800 capitalize">{selectedLog.aksi}</p>
              </div>
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                <p className="text-gray-400 uppercase text-[10px] font-bold">ID / Kunci</p>
                <p className="font-mono font-semibold mt-0.5 text-gray-800 truncate" title={selectedLog.entitas_id}>{selectedLog.entitas_id}</p>
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-bold text-gray-600">Data Payload (JSON):</p>
                <button
                  onClick={handleCopyPayload}
                  className="text-[11px] font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none rounded px-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin!' : 'Salin JSON'}</span>
                </button>
              </div>
              <pre className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-auto flex-1 max-h-80 leading-relaxed border border-slate-800 shadow-inner">
                {JSON.stringify(selectedLog.payload ?? {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
