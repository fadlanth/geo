import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Search,
  SlidersHorizontal,
  Edit2,
  BookOpen,
  X
} from 'lucide-react';
import { Dosen, Mahasiswa } from '../types';
import { validators, val } from '../lib/validators';
import { useDebounce, useEscapeClose } from '../lib/hooks';
import { fmt } from '../lib/format';
import { exportToExcel } from '../lib/exportUtils';
import { ToastOptions } from './Toast';
import CsvImporter from './CsvImporter';
import Pagination from './Pagination';
import DataActions from './DataActions';
import Button from './Button';
import IconButton from './IconButton';
import StatusChip from './StatusChip';
import { SkeletonTable, SkeletonCard } from './Skeleton';

interface DosenTabProps {
  dosen: Dosen[];
  mahasiswa: Mahasiswa[];
  loading?: boolean;
  onSaveDosen: (d: Dosen) => void | Promise<void>;
  onDeleteDosen: (nip: string) => void | Promise<void>;
  onBulkImportDosen: (data: Record<string, unknown>[]) => Promise<void>;
  triggerToast?: (options: ToastOptions) => void;
}

export default function DosenTab({
  dosen,
  mahasiswa,
  loading,
  onSaveDosen,
  onDeleteDosen,
  onBulkImportDosen,
  triggerToast
}: DosenTabProps) {
  const [query, setQuery] = useState('');
  const [filterWali, setFilterWali] = useState<'All' | 'Wali' | 'Biasa'>('All');
  const [filterJabatan, setFilterJabatan] = useState('All');
  const [page, setPage] = useState(1);
  const tableRef = useRef<HTMLDivElement | null>(null);
  const ROWS_PER_PAGE = 25;

  const searchQuery = useDebounce(query, 350); // debounced; pakai untuk filter

  const [showAddModal, setShowAddModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingDosen, setEditingDosen] = useState<Dosen | null>(null);

  useEscapeClose(showAddModal, () => setShowAddModal(false));
  useEscapeClose(showImport, () => setShowImport(false));

  useEffect(() => {
    if (page > 1) tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [page]);

  const [form, setForm] = useState<Dosen>({
    nip: '',
    nama: '',
    kode_dosen: '',
    sandi_dosen: '',
    golongan: 'III/b',
    pangkat: 'Penata Muda Tk. I',
    jabatan: 'Asisten Ahli',
    is_dosen_wali: false
  });

  // Error validasi per-field
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Unique list of Jabatan for filtering
  const jabatanOptions = Array.from(new Set(dosen.map(d => d.jabatan || 'Asisten Ahli'))).filter(Boolean);

  const filteredDosen = dosen.filter(d => {
    const matchesSearch =
      (d.nama || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.nip || '').includes(searchQuery) ||
      (d.kode_dosen || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.sandi_dosen || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesWali =
      filterWali === 'All' ||
      (filterWali === 'Wali' && d.is_dosen_wali) ||
      (filterWali === 'Biasa' && !d.is_dosen_wali);

    const matchesJabatan = filterJabatan === 'All' || d.jabatan === filterJabatan;

    return matchesSearch && matchesWali && matchesJabatan;
  });

  const totalPages = Math.ceil(filteredDosen.length / ROWS_PER_PAGE);
  const safePage = Math.min(page, Math.max(1, totalPages));
  const paginatedDosen = filteredDosen.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // --- Validasi client ---
    const errs: Record<string, string> = {};
    if (!editingDosen) errs.npm = val(validators.nip(form.nip));
    errs.nama = val(validators.nama(form.nama));
    errs.jabatan = val(validators.requiredSelect(form.jabatan));
    errs.sandi = val(validators.sandi(form.sandi_dosen || ''));
    for (const k in errs) if (errs[k] === undefined) delete errs[k];
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      if (triggerToast) {
        triggerToast({
          kind: 'error',
          title: 'Validasi Gagal',
          message: 'Perbaiki isian yang ditandai.'
        });
      }
      return;
    }

    try {
      await onSaveDosen(form);

      setErrors({});
      setForm({
        nip: '',
        nama: '',
        kode_dosen: '',
        sandi_dosen: '',
        golongan: 'III/b',
        pangkat: 'Penata Muda Tk. I',
        jabatan: 'Asisten Ahli',
        is_dosen_wali: false
      });
      setShowAddModal(false);
      setEditingDosen(null);
    } catch {
      // error toast already handled by App.tsx
    }
  };

  const handleEditClick = (d: Dosen) => {
    setErrors({});
    setEditingDosen(d);
    setForm(d);
    setShowAddModal(true);
  };

  const handleDeleteClick = (nip: string, nama: string) => {
    onDeleteDosen(nip);
  };

  const handleExportDosen = () => {
    const dataToExport = dosen.map(d => ({
      'NIP': d.nip,
      'Nama': d.nama,
      'Kode Dosen': d.kode_dosen || '',
      'Golongan': d.golongan || '',
      'Pangkat': d.pangkat || '',
      'Jabatan Fungsional': d.jabatan || '',
      'Dosen Wali (Ya/Tidak)': d.is_dosen_wali ? 'Ya' : 'Tidak'
    }));
    exportToExcel(dataToExport, 'data_dosen_geofisika', 'Dosen');
    if (triggerToast) {
      triggerToast({
        kind: 'success',
        title: 'Ekspor Berhasil',
        message: `Berhasil mengunduh ${dataToExport.length} data dosen ke Excel.`
      });
    }
  };

  // Visual Analytics Calculations
  const totalDosen = dosen.length;
  const totalWali = dosen.filter(d => d.is_dosen_wali).length;
  const totalBiasa = totalDosen - totalWali;
  const rasioBimbingan = totalWali > 0 ? (mahasiswa.length / totalWali).toFixed(1) : '0';
  const totalBimbingan = mahasiswa.filter(m => !!m.nip_dosen_wali).length;

  // Distribusi jabatan fungsional
  const jabatanCounts = dosen.reduce<Record<string, number>>((acc, d) => {
    const j = d.jabatan || 'Asisten Ahli';
    acc[j] = (acc[j] || 0) + 1;
    return acc;
  }, {});
  const jabatanDistribution = Object.entries(jabatanCounts).sort((a, b) => b[1] - a[1]);
  const JABATAN_DOT_COLORS = ['bg-[var(--color-primary)]', 'bg-violet-500', 'bg-amber-500', 'bg-emerald-500', 'bg-slate-400', 'bg-rose-400'];

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]/75">Data Akademik</p>
          <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[var(--color-text-main)]">Data Dosen Geofisika</h2>
          <p className="text-xs text-[var(--color-text-main)]/55">Kelola informasi fungsionalitas, golongan, jabatan, dan status dosen wali</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
          <Button
            onClick={() => {
              setEditingDosen(null);
              setForm({
                nip: '',
                nama: '',
                kode_dosen: '',
                sandi_dosen: '',
                golongan: 'III/b',
                pangkat: 'Penata Muda Tk. I',
                jabatan: 'Asisten Ahli',
                is_dosen_wali: false
              });
              setShowAddModal(true);
            }}
            className="flex-1 sm:flex-none"
            icon={<Plus className="w-4 h-4" />}
          >
            Registrasi Dosen
          </Button>
          <DataActions
            onImportCsv={() => setShowImport(true)}
            onImportExcel={() => setShowImport(true)}
            onExportExcel={handleExportDosen}
          />
        </div>
      </div>

      {/* Summary */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : totalDosen === 0 ? (
        <div className="bg-white p-6 sm:p-12 rounded-2xl border border-slate-200 shadow-sm text-center">
          <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-[var(--color-primary)]/20 mb-3" />
          <h3 className="font-bold text-sm text-[var(--color-text-main)]/50">Belum ada data dosen</h3>
          <p className="text-xs text-[var(--color-text-main)]/30 mt-1">Klik "Registrasi Dosen" untuk menambahkan data pertama</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-gray-100">
            <div className="bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Dosen</p>
              <p className="text-2xl font-bold font-display mt-1 text-[var(--color-text-main)]">{fmt(totalDosen)}</p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Dosen Wali</p>
              <p className="text-2xl font-bold font-display mt-1 text-[var(--color-primary)]">{fmt(totalWali)}</p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Bukan Wali</p>
              <p className="text-2xl font-bold font-display mt-1 text-[var(--color-text-main)]">{fmt(totalBiasa)}</p>
            </div>
            <div className="bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Bimbingan</p>
              <p className="text-2xl font-bold font-display mt-1 text-[var(--color-text-main)]">
                {rasioBimbingan}<span className="text-xs font-semibold text-gray-400"> /wali</span>
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">{fmt(totalBimbingan)} mahasiswa terplot</p>
            </div>
          </div>
          <div className="px-4 py-2.5 border-t border-gray-100 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            <span className="font-bold uppercase tracking-wider text-gray-400">Jabatan:</span>
            {jabatanDistribution.map(([jab, count], i) => (
              <span key={jab} className="inline-flex items-center gap-1.5 font-medium text-gray-600">
                <span className={`w-2 h-2 rounded-full ${JABATAN_DOT_COLORS[i % JABATAN_DOT_COLORS.length]}`} />
                {jab} <b className="text-[var(--color-text-main)]">{count}</b>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Directory & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50/80 flex flex-col gap-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari dosen berdasarkan Nama, NIP, atau Sandi..."
                aria-label="Cari dosen"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                className="w-full pl-10 pr-9 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)] shadow-sm"
              />
              {query && (
                <button
                  onClick={() => { setQuery(''); setPage(1); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                  aria-label="Bersihkan pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-main)]/65 font-medium px-2 shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Hasil filter: <b>{filteredDosen.length}</b>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="dosen-filter-wali" className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Status Pembimbing</label>
              <select
                id="dosen-filter-wali"
                value={filterWali}
                onChange={(e) => { setFilterWali(e.target.value as 'All' | 'Wali' | 'Biasa'); setPage(1); }}
                className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] shadow-sm"
              >
                <option value="All">Semua Dosen</option>
                <option value="Wali">Hanya Dosen Wali</option>
                <option value="Biasa">Bukan Dosen Wali</option>
              </select>
            </div>

            <div>
              <label htmlFor="dosen-filter-jabatan" className="block text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1">Jabatan Fungsional</label>
              <select
                id="dosen-filter-jabatan"
                value={filterJabatan}
                onChange={(e) => { setFilterJabatan(e.target.value); setPage(1); }}
                className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] shadow-sm"
              >
                <option value="All">Semua Jabatan</option>
                {jabatanOptions.map(jab => (
                  <option key={jab} value={jab}>{jab}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <SkeletonTable rows={10} cols={6} />
        ) : (
          <div className="overflow-x-auto" ref={tableRef}>
            <table className="w-full text-left border-collapse whitespace-nowrap text-xs md:text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-4 font-bold text-gray-500 text-xs">NIP / Sandi</th>
                  <th className="p-4 font-bold text-gray-500 text-xs">Nama Lengkap</th>
                  <th className="p-4 font-bold text-gray-500 text-xs">Pangkat / Golongan</th>
                  <th className="p-4 font-bold text-gray-500 text-xs">Jabatan Fungsional</th>
                  <th className="p-4 font-bold text-gray-500 text-xs">Status Pembimbing</th>
                  <th className="p-4 font-bold text-gray-500 text-xs text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredDosen.length > 0 ? (
                  paginatedDosen.map((d) => {
                    const mhsCount = mahasiswa.filter(m => m.nip_dosen_wali === d.nip).length;
                    return (
                      <tr key={d.nip} className="hover:bg-gray-50/50 transition">
                        <td className="p-4">
                          <p className="font-semibold font-mono text-[var(--color-text-main)]" dir="auto">
                            {d.nip}{d.sandi_dosen ? ` / ${d.sandi_dosen}` : ''}
                          </p>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-gray-900">{d.nama}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-gray-700 font-medium">{d.pangkat || '-'}</p>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">Gol. {d.golongan || '-'}</p>
                        </td>
                        <td className="p-4">
                          <span className="inline-block bg-blue-50 text-blue-700 font-semibold px-2 py-1 rounded-lg text-[10px]">
                            {d.jabatan || 'Asisten Ahli'}
                          </span>
                        </td>
                        <td className="p-4">
                          {d.is_dosen_wali ? (
                            <div className="flex items-center gap-1.5">
                              <StatusChip status="Dosen Wali" tone="blue" />
                              <StatusChip status={`${mhsCount} Bimbingan`} tone="neutral" />
                            </div>
                          ) : (
                            <StatusChip status="Bukan Dosen Wali" tone="neutral" />
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <IconButton
                              label="Edit Data Dosen"
                              tone="primary"
                              onClick={() => handleEditClick(d)}
                              icon={<Edit2 className="w-3.5 h-3.5" />}
                            />
                            <IconButton
                              label="Hapus Dosen"
                              tone="danger"
                              onClick={() => handleDeleteClick(d.nip, d.nama)}
                              icon={<Trash2 className="w-3.5 h-3.5" />}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      Tidak ditemukan data dosen yang cocok dengan filter pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {filteredDosen.length > ROWS_PER_PAGE && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/30">
            <span className="text-xs text-gray-500">
              Menampilkan {(safePage - 1) * ROWS_PER_PAGE + 1}-{Math.min(safePage * ROWS_PER_PAGE, filteredDosen.length)} dari {filteredDosen.length} dosen
            </span>
            <div className="flex gap-2">
              <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />
            </div>
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT DOSEN */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl border border-[var(--color-primary)]/10">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h3 className="font-display font-bold text-[var(--color-text-main)] text-lg">
                {editingDosen ? 'Edit Profil Dosen' : 'Registrasi Dosen Baru'}
              </h3>
              <IconButton
                label="Tutup"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingDosen(null);
                }}
                icon={<span className="text-sm leading-none">✕</span>}
              />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="dosen-nama" className="block text-xs font-semibold text-gray-500 mb-1.5">Nama Lengkap & Gelar</label>
                <input 
                  id="dosen-nama"
                  type="text" 
                  required
                  placeholder="Contoh: Dr. Maria Ulfah, S.Si., M.Si."
                  value={form.nama}
                  onChange={(e) => { setForm({...form, nama: e.target.value}); if (errors.nama) setErrors({...errors, nama: undefined}); }}
                  className={`w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)] transition ${errors.nama ? 'border-red-400' : ''}`}
                />
                {errors.nama && <p className="mt-1 text-[10px] text-red-600">{errors.nama}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label htmlFor="dosen-nip" className="block text-xs font-semibold text-gray-500 mb-1.5">NIP Kepegawaian</label>
                  <input 
                    id="dosen-nip"
                    type="text" 
                    required
                    disabled={!!editingDosen}
                    placeholder="Contoh: 1982031520..."
                    value={form.nip}
                     onChange={(e) => { setForm({...form, nip: e.target.value.replace(/\s+/g, '')}); if (errors.nip) setErrors({...errors, nip: undefined}); }}
                    className={`w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)] transition disabled:bg-gray-50 disabled:text-gray-400 ${errors.nip ? 'border-red-400' : ''}`}
                  />
                  {errors.nip && <p className="mt-1 text-[10px] text-red-600">{errors.nip}</p>}
                </div>
                <div>
                  <label htmlFor="dosen-kode" className="block text-xs font-semibold text-gray-500 mb-1.5">Kode Dosen</label>
                  <input 
                    id="dosen-kode"
                    type="text" 
                    placeholder="Contoh: MUF"
                    value={form.kode_dosen}
                    onChange={(e) => setForm({...form, kode_dosen: e.target.value.toUpperCase()})}
                    className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)] transition uppercase"
                  />
                </div>
                <div>
                  <label htmlFor="dosen-sandi" className="block text-xs font-semibold text-gray-500 mb-1.5">Sandi Dosen</label>
                  <input 
                    id="dosen-sandi"
                    type="text" 
                    autoComplete="off"
                    placeholder="Contoh: muf2024"
                    value={form.sandi_dosen || ''}
                    onChange={(e) => { setForm({...form, sandi_dosen: e.target.value}); if (errors.sandi) setErrors({...errors, sandi: undefined}); }}
                    className={`w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)] transition ${errors.sandi ? 'border-red-400' : ''}`}
                  />
                  {errors.sandi && <p className="mt-1 text-[10px] text-red-600">{errors.sandi}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="dosen-golongan" className="block text-xs font-semibold text-gray-500 mb-1.5">Golongan</label>
                  <select
                    id="dosen-golongan"
                    value={form.golongan}
                    onChange={(e) => setForm({...form, golongan: e.target.value})}
                    className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)] bg-white"
                  >
                    <option value="III/a">III/a (Penata Muda)</option>
                    <option value="III/b">III/b (Penata Muda Tk. I)</option>
                    <option value="III/c">III/c (Penata)</option>
                    <option value="III/d">III/d (Penata Tk. I)</option>
                    <option value="IV/a">IV/a (Pembina)</option>
                    <option value="IV/b">IV/b (Pembina Tk. I)</option>
                    <option value="IV/c">IV/c (Pembina Utama Muda)</option>
                    <option value="IV/d">IV/d (Pembina Utama Madya)</option>
                    <option value="IV/e">IV/e (Pembina Utama)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="dosen-pangkat" className="block text-xs font-semibold text-gray-500 mb-1.5">Pangkat</label>
                  <input 
                    id="dosen-pangkat"
                    type="text" 
                    placeholder="Contoh: Penata"
                    value={form.pangkat}
                    onChange={(e) => setForm({...form, pangkat: e.target.value})}
                    className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)] transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="dosen-jabatan" className="block text-xs font-semibold text-gray-500 mb-1.5">Jabatan Akademik</label>
                  <select
                    id="dosen-jabatan"
                    value={form.jabatan}
                    onChange={(e) => { setForm({...form, jabatan: e.target.value}); if (errors.jabatan) setErrors({...errors, jabatan: undefined}); }}
                    className={`w-full text-sm p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)] bg-white ${errors.jabatan ? 'border-red-400' : ''}`}
                  >
                    <option value="Asisten Ahli">Asisten Ahli</option>
                    <option value="Lektor">Lektor</option>
                    <option value="Lektor Kepala">Lektor Kepala</option>
                    <option value="Guru Besar">Guru Besar</option>
                    <option value="Tenaga Pengajar">Tenaga Pengajar</option>
                  </select>
                  {errors.jabatan && <p className="mt-1 text-[10px] text-red-600">{errors.jabatan}</p>}
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={form.is_dosen_wali}
                      onChange={(e) => setForm({...form, is_dosen_wali: e.target.checked})}
                      className="w-4 h-4 text-[var(--color-primary)] border-gray-300 rounded focus:ring-[var(--color-primary)]"
                    />
                    <span className="text-xs font-semibold text-gray-700">Dosen Wali (Pembimbing Akademik)</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2.5 justify-end pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingDosen(null);
                  }}
                >
                  Batal
                </Button>
                <Button type="submit">
                  {editingDosen ? 'Simpan Perubahan' : 'Registrasi Dosen'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IMPORT DOSEN */}
      {showImport && (
        <CsvImporter 
          title="Data Dosen Geofisika"
          expectedHeaders={['NAMA', 'NIP', 'GOL', 'PANGKAT', 'JABATAN', 'IS DOSEN WALI', 'SANDI DOSEN']}
          templateCsv={`NAMA,NIP,GOL,PANGKAT,JABATAN,IS DOSEN WALI,SANDI DOSEN
Dr. Maryadi,198001012005011001,IV/a,Pembina,Lektor Kepala,Ya,mary2024
Prof. Kartini,197502022000122002,IV/d,Pembina Utama Madya,Guru Besar,Ya,kart2024
Yudha Hartanto S.T. M.T.,199003032018011003,III/b,Penata Muda Tk. I,Asisten Ahli,Tidak,yudha24`}
          templateData={[
            { NAMA: 'Dr. Maryadi', NIP: '198001012005011001', GOL: 'IV/a', PANGKAT: 'Pembina', JABATAN: 'Lektor Kepala', 'IS DOSEN WALI': 'Ya', 'SANDI DOSEN': 'mary2024' },
            { NAMA: 'Prof. Kartini', NIP: '197502022000122002', GOL: 'IV/d', PANGKAT: 'Pembina Utama Madya', JABATAN: 'Guru Besar', 'IS DOSEN WALI': 'Ya', 'SANDI DOSEN': 'kart2024' },
            { NAMA: 'Yudha Hartanto S.T. M.T.', NIP: '199003032018011003', GOL: 'III/b', PANGKAT: 'Penata Muda Tk. I', JABATAN: 'Asisten Ahli', 'IS DOSEN WALI': 'Tidak', 'SANDI DOSEN': 'yudha24' }
          ]}
          onImport={onBulkImportDosen}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
