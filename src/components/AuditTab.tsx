import React, { useEffect, useState } from 'react';
import { Activity, Search, RefreshCw, Eye, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SkeletonTable } from './Skeleton';
import IconButton from './IconButton';
import StatusChip from './StatusChip';
import { ToastOptions } from './Toast';
import { errMsg } from '../lib/format';

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

export default function AuditTab({ loading, triggerToast }: AuditTabProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadLogs = async () => {
    try {
      let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(ROWS_PER_PAGE);

      const cleanSearch = search.trim().replace(/[%_(),]/g, '');
      if (cleanSearch) {
        query = query.or(
          `entitas.ilike.%${cleanSearch}%,aksi.ilike.%${cleanSearch}%,entitas_id.ilike.%${cleanSearch}%,actor_email.ilike.%${cleanSearch}%`
        );
      }
      const { data, error } = await query;
      if (error) throw error;
      setLogs(data as AuditLog[] || []);
    } catch (err) {
      triggerToast?.({ kind: 'error', title: 'Gagal Memuat', message: errMsg(err, 'Tidak dapat memuat log audit.') });
      setLogs([]);
    }
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page, refreshKey]);

  const pagi = logs.slice(0, ROWS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]/75">Monitoring Sistem</p>
          <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[var(--color-text-main)] flex items-center gap-2">
            <Activity className="w-5 h-5 text-[var(--color-primary)]" /> Log Aktivitas Sistem
          </h2>
          <p className="text-xs text-[var(--color-text-main)]/55">Jejak perubahan data oleh pengguna sistem</p>
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
              className="w-full pl-10 pr-9 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)] shadow-sm"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                aria-label="Bersihkan pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <IconButton
            label="Muat ulang log"
            onClick={() => setRefreshKey((k) => k + 1)}
            icon={<RefreshCw className="w-4 h-4" />}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[var(--color-primary)]/10 shadow-xs overflow-hidden">
        {loading ? (
          <SkeletonTable rows={5} cols={6} />
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-bold font-display uppercase tracking-wider text-[var(--color-text-main)]/60 border-b border-gray-100">
                <th className="p-3 pl-4">Tanggal/Jam</th>
                <th className="p-3">Pengguna</th>
                <th className="p-3">Entitas</th>
                <th className="p-3">Aksi</th>
                <th className="p-3">ID Baris</th>
                <th className="p-3 pr-4">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {pagi.length ? (
                pagi.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/40 transition">
                    <td className="p-3 pl-4 font-mono text-[10px] text-[var(--color-text-main)]/60">
                      {new Date(row.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 text-[var(--color-text-main)]/80">
                      {row.actor_email || <span className="text-gray-400">— sistem —</span>}
                    </td>
                    <td className="p-3">
                      <StatusChip status={row.entitas} tone="neutral" />
                    </td>
                    <td className="p-3 capitalize">
                      {row.aksi === 'insert' && <StatusChip status="tambah" tone="green" />}
                      {row.aksi === 'update' && <StatusChip status="ubah" tone="blue" />}
                      {row.aksi === 'delete' && <StatusChip status="hapus" tone="red" />}
                      {row.aksi === 'replace' && <StatusChip status="ganti" tone="amber" />}
                      {!['insert','update','delete','replace'].includes(row.aksi) && row.aksi}
                    </td>
                    <td className="p-3 font-mono text-xs text-[var(--color-text-main)]/70 truncate max-w-[140px]">
                      {row.entitas_id}
                    </td>
                    <td className="p-3 pr-4">
                      <button
                        onClick={() => {
                          triggerToast?.({
                            kind: 'success',
                            title: 'Payload',
                            message: JSON.stringify(row.payload ?? {}, null, 0).slice(0, 120) + (JSON.stringify(row.payload ?? {}).length > 120 ? '…' : ''),
                          });
                        }}
                        className="text-[var(--color-primary)] hover:underline text-xs font-semibold flex items-center gap-1"
                        title="Lihat detail payload (toast)"
                      >
                        <Eye className="w-3.5 h-3.5" /> detail
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-gray-400">
                    Belum ada log aktivitas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
