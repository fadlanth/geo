import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Trash2, 
  SlidersHorizontal,
  Edit2,
  X
} from 'lucide-react';
import { Mahasiswa, Dosen } from '../types';
import { validators, val, JENIS_STATUS_MAHASISWA } from '../lib/validators';
import { useDebounce, useEscapeClose, useFocusTrap } from '../lib/hooks';
import { fmt } from '../lib/format';
import StatCard from './StatCard';
import CsvImporter from './CsvImporter';
import Pagination from './Pagination';
import DataActions from './DataActions';
import Button from './Button';
import IconButton from './IconButton';
import StatusChip from './StatusChip';
import { exportToExcel } from '../lib/exportUtils';
import { ToastOptions } from './Toast';
import { SkeletonTable } from './Skeleton';

interface MahasiswaTabProps {
  mahasiswa: Mahasiswa[];
  dosen: Dosen[];
  loading?: boolean;
  onSaveMahasiswa: (mhs: Mahasiswa) => void;
  onDeleteMahasiswa: (npm: string) => void;
  onBulkImportMahasiswa: (data: Record<string, unknown>[]) => Promise<void>;
  activeSubTab?: string;
  triggerToast?: (options: ToastOptions) => void;
}

export default function MahasiswaTab({
  mahasiswa,
  dosen,
  loading,
  onSaveMahasiswa,
  onDeleteMahasiswa,
  onBulkImportMahasiswa,
  triggerToast
}: MahasiswaTabProps) {

   // Search & Filter state (searchQuery pakai debounce agar tak rerender tiap ketik)
  const [rawSearch, setRawSearch] = useState('');
  const [filterAngkatan, setFilterAngkatan] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [page, setPage] = useState(1);
  const tableRef = useRef<HTMLDivElement | null>(null);
  const ROWS_PER_PAGE = 25;
  const searchQuery = useDebounce(rawSearch, 350);

  const [showAddMhs, setShowAddMhs] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const mhsModalRef = useRef<HTMLDivElement>(null);

  useEscapeClose(showAddMhs, () => setShowAddMhs(false));
  useEscapeClose(showImport, () => setShowImport(false));
  useFocusTrap(showAddMhs, mhsModalRef);

  useEffect(() => {
    if (page > 1) tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [page]);

  const [editingMhs, setEditingMhs] = useState<Mahasiswa | null>(null);

  const [mhsForm, setMhsForm] = useState<Mahasiswa>({
    npm: '',
    nama: '',
    angkatan: new Date().getFullYear(),
    jenis_kelamin: 'L',
    fakultas: 'FMIPA',
    prodi: 'Geofisika',
    status: 'Regulasi Akademik',
    nip_dosen_wali: '',
    tahun_lulus: undefined
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredMahasiswa = mahasiswa.filter(m => {
    const matchesSearch = m.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          m.npm.includes(searchQuery);
    
    const matchesAngkatan = filterAngkatan === 'All' || m.angkatan.toString() === filterAngkatan;
    const matchesStatus = filterStatus === 'All' || m.status === filterStatus;

    return matchesSearch && matchesAngkatan && matchesStatus;
  });

  const totalPages = Math.ceil(filteredMahasiswa.length / ROWS_PER_PAGE);
  const safePage = Math.min(page, Math.max(1, totalPages));
  const paginatedMahasiswa = filteredMahasiswa.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const handleAddMhsSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errs: Record<string, string> = {};
    errs.nama = val(validators.nama(mhsForm.nama));
    if (!editingMhs) errs.npm = val(validators.npm(mhsForm.npm));
    errs.angkatan = val(validators.angkatan(mhsForm.angkatan));
    errs.status = val(validators.enum(mhsForm.status, JENIS_STATUS_MAHASISWA, 'Status'));
    if (mhsForm.status === 'Lulus') {
      errs.tahun_lulus = val(validators.tahunLulus(mhsForm.tahun_lulus, mhsForm.angkatan));
    }
    // Bersihkan nilai undefined
    for (const k in errs) if (errs[k] === undefined) delete errs[k];
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      triggerToast?.({ kind: 'error', title: 'Validasi Gagal', message: 'Perbaiki isian yang ditandai.' });
      return;
    }

    onSaveMahasiswa({
      ...mhsForm,
      nip_dosen_wali: mhsForm.nip_dosen_wali || null
    });
    triggerToast?.({ kind: 'success', title: 'Berhasil', message: `Mahasiswa ${mhsForm.nama} tersimpan.` });

    setErrors({});
    setMhsForm({
      npm: '',
      nama: '',
      angkatan: new Date().getFullYear(),
      jenis_kelamin: 'L',
      fakultas: 'FMIPA',
      prodi: 'Geofisika',
      status: 'Regulasi Akademik',
      nip_dosen_wali: '',
      tahun_lulus: undefined
    });
    setShowAddMhs(false);
    setEditingMhs(null);
  };

  const handleEditMhsClick = (m: Mahasiswa) => {
    setErrors({});
    setEditingMhs(m);
    setMhsForm({
      ...m,
      nip_dosen_wali: m.nip_dosen_wali || '',
      tahun_lulus: m.tahun_lulus || undefined
    });
    setShowAddMhs(true);
  };

  // Fast reassignment
  const handleQuickAssignDosen = (npm: string, dosenNip: string) => {
    const student = mahasiswa.find(m => m.npm === npm);
    if (student) {
      onSaveMahasiswa({
        ...student,
        nip_dosen_wali: dosenNip === 'unassigned' ? null : dosenNip
      });
    }
  };

  const handleExportMhs = () => {
    const dataToExport = mahasiswa.map(m => ({
      'NPM': m.npm,
      'Nama': m.nama,
      'Angkatan': m.angkatan,
      'Jenis Kelamin': m.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan',
      'Fakultas': m.fakultas,
      'Prodi': m.prodi,
      'Status': m.status,
      'Tahun Lulus': m.tahun_lulus || '',
      'NIP Dosen Wali': m.nip_dosen_wali || ''
    }));
    exportToExcel(dataToExport, 'data_mahasiswa_geofisika', 'Mahasiswa');
    if (triggerToast) {
      triggerToast({
        kind: 'success',
        title: 'Ekspor Berhasil',
        message: `Berhasil mengunduh ${dataToExport.length} data mahasiswa ke Excel.`
      });
    }
  };

  const totalMahasiswa = mahasiswa.length;
  const aktifMahasiswa = mahasiswa.filter(m => m.status === 'Regulasi Akademik').length;
  const lulusMahasiswa = mahasiswa.filter(m => m.status === 'Lulus').length;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]/75">Data Akademik</p>
          <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[var(--color-text-main)]">Data Mahasiswa</h2>
          <p className="text-xs text-[var(--color-text-main)]/55">Direktori dan plotting dosen wali mahasiswa Geofisika</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
          <Button
            onClick={() => {
              setEditingMhs(null);
              setMhsForm({
                npm: '',
                nama: '',
                angkatan: new Date().getFullYear(),
                jenis_kelamin: 'L',
                fakultas: 'FMIPA',
                prodi: 'Geofisika',
                status: 'Regulasi Akademik',
                nip_dosen_wali: '',
                tahun_lulus: undefined
              });
              setShowAddMhs(true);
            }}
            className="flex-1 sm:flex-none"
            icon={<UserPlus className="w-4 h-4" />}
          >
            Mahasiswa Baru
          </Button>
          <DataActions
            onImportCsv={() => setShowImport(true)}
            onImportExcel={() => setShowImport(true)}
            onExportExcel={handleExportMhs}
          />
        </div>
      </div>

      {!loading && mahasiswa.length === 0 ? (
        <div className="bg-white p-6 sm:p-12 rounded-2xl border border-slate-200 shadow-sm text-center">
          <Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-[var(--color-primary)]/20 mb-3" />
          <h3 className="font-bold text-sm text-[var(--color-text-main)]/50">Belum ada data mahasiswa</h3>
          <p className="text-xs text-[var(--color-text-main)]/30 mt-1">Klik "Mahasiswa Baru" atau import CSV/Excel untuk menambahkan data</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Total Mahasiswa" value={fmt(totalMahasiswa)} />
            <StatCard label="Aktif" value={fmt(aktifMahasiswa)} accent />
            <StatCard label="Lulus" value={fmt(lulusMahasiswa)} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Sub-header Filter Panel */}
            <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50/80 flex flex-col gap-3">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-main)]/40" />
                  <input
                    type="text"
                    placeholder="Cari nama atau NPM mahasiswa"
                    aria-label="Cari mahasiswa"
                    value={rawSearch}
                    onChange={(e) => { setRawSearch(e.target.value); setPage(1); }}
                    className="w-full pl-10 pr-9 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)] shadow-sm"
                  />
                  {rawSearch && (
                    <button
                      onClick={() => { setRawSearch(''); setPage(1); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                      aria-label="Bersihkan pencarian"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-[var(--color-text-main)]/65 font-medium px-2 shrink-0">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Hasil filter: <b>{filteredMahasiswa.length}</b>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div>
                  <label htmlFor="mhs-filter-angkatan" className="block text-[10px] uppercase tracking-wider font-bold text-[var(--color-text-main)]/50 mb-1">Angkatan</label>
                  <select
                    id="mhs-filter-angkatan"
                    value={filterAngkatan}
                    onChange={(e) => { setFilterAngkatan(e.target.value); setPage(1); }}
                    className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] shadow-sm"
                  >
                    <option value="All">Semua Angkatan</option>
                    {[...new Set(mahasiswa.map(m => m.angkatan))].sort((a, b) => b - a).map(y => (
                      <option key={y} value={y.toString()}>{y}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="mhs-filter-status" className="block text-[10px] uppercase tracking-wider font-bold text-[var(--color-text-main)]/50 mb-1">Status Akademik</label>
                  <select
                    id="mhs-filter-status"
                    value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                    className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] shadow-sm"
                  >
                    <option value="All">Semua Status</option>
                    <option value="Regulasi Akademik">Regulasi Akademik</option>
                    <option value="Lulus">Lulus</option>
                    <option value="Alih Prodi">Alih Prodi</option>
                    <option value="Undur Diri">Undur Diri</option>
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <SkeletonTable rows={10} cols={6} />
            ) : (
              <>
                <div className="overflow-x-auto" ref={tableRef}>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100 text-[var(--color-text-main)]/60 text-xs font-bold font-display uppercase tracking-wider">
                        <th className="p-4 pl-6">NPM / Nama</th>
                        <th className="p-4">Angkatan</th>
                        <th className="p-4">Fakultas/Prodi</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Plotting Dosen Wali</th>
                        <th className="p-4 pr-6 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {paginatedMahasiswa.map((student) => {
                        return (
                          <tr key={student.npm} className="hover:bg-gray-50/30 transition">
                            <td className="p-4 pl-6">
                              <div className="flex flex-col">
                                <span className="font-bold text-[var(--color-text-main)]">{student.nama}</span>
                                <span className="text-xs text-[var(--color-text-main)]/50 font-mono mt-0.5">{student.npm}</span>
                              </div>
                            </td>
                            <td className="p-4 text-[var(--color-text-main)]/70 font-medium">
                              {student.angkatan}
                            </td>
                            <td className="p-4">
                              <span className="text-xs font-medium text-[var(--color-text-main)]/75">
                                {student.fakultas} - {student.prodi}
                              </span>
                            </td>
                            <td className="p-4">
                              <StatusChip status={student.status} />
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={student.nip_dosen_wali || 'unassigned'}
                                  onChange={(e) => handleQuickAssignDosen(student.npm, e.target.value)}
                                  className={`text-xs p-1.5 border rounded-lg focus:outline-none focus:border-[var(--color-primary)] max-w-[200px] truncate ${
                                    !student.nip_dosen_wali 
                                      ? 'select-unassigned' 
                                      : 'border-gray-200 bg-white text-[var(--color-text-main)]/80'
                                  }`}
                                >
                                  <option value="unassigned">⚠️ Belum Diplot</option>
                                  {dosen.filter(d => d.is_dosen_wali !== false).map(d => (
                                    <option key={d.nip} value={d.nip}>
                                      {d.nama}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>
                            <td className="p-4 pr-6 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <IconButton
                                  label="Edit Mahasiswa"
                                  tone="primary"
                                  onClick={() => handleEditMhsClick(student)}
                                  icon={<Edit2 className="w-3.5 h-3.5" />}
                                />
                                <IconButton
                                  label="Hapus Mahasiswa"
                                  tone="danger"
                                  onClick={() => onDeleteMahasiswa(student.npm)}
                                  icon={<Trash2 className="w-3.5 h-3.5" />}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredMahasiswa.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-sm text-gray-400">
                            Data mahasiswa tidak ditemukan.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {filteredMahasiswa.length > ROWS_PER_PAGE && (
                  <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/30">
                    <span className="text-xs text-gray-500">
                      Menampilkan {(safePage - 1) * ROWS_PER_PAGE + 1}-{Math.min(safePage * ROWS_PER_PAGE, filteredMahasiswa.length)} dari {filteredMahasiswa.length} mahasiswa
                    </span>
                    <div className="flex gap-2">
                      <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* MODAL: ADD / EDIT STUDENT */}
      {showAddMhs && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowAddMhs(false); setEditingMhs(null); }}>
          <div
            ref={mhsModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mhs-modal-title"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-[var(--color-primary)]/10 max-w-md w-full p-6 space-y-4 shadow-xl"
          >
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 id="mhs-modal-title" className="font-display font-extrabold text-[var(--color-text-main)] text-base">
                {editingMhs ? 'Edit Profil Mahasiswa' : 'Registrasi Mahasiswa Baru'}
              </h3>
              <IconButton
                label="Tutup"
                onClick={() => {
                  setShowAddMhs(false);
                  setEditingMhs(null);
                }}
                icon={<span className="text-sm leading-none">✕</span>}
              />
            </div>

            <form onSubmit={handleAddMhsSubmit} className="space-y-4">
              <div>
                <label htmlFor="mhs-nama" className="block text-xs font-semibold text-[var(--color-text-main)]/70 mb-1.5">Nama Lengkap</label>
                <input 
                  id="mhs-nama"
                  type="text" 
                  required
                  placeholder="Contoh: Andi Pratama"
                  value={mhsForm.nama}
                  onChange={(e) => { setMhsForm({...mhsForm, nama: e.target.value}); if (errors.nama) setErrors({...errors, nama: undefined}); }}
                  className={`w-full text-sm p-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20 ${errors.nama ? 'border-red-400' : ''}`}
                />
                {errors.nama && <p className="mt-1 text-[10px] text-red-600">{errors.nama}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="mhs-npm" className="block text-xs font-semibold text-[var(--color-text-main)]/70 mb-1.5">NPM</label>
                  <input 
                    id="mhs-npm"
                    type="text" 
                    required
                    disabled={!!editingMhs}
                    placeholder="Contoh: 140710220001"
                    value={mhsForm.npm}
                    onChange={(e) => { setMhsForm({...mhsForm, npm: e.target.value}); if (errors.npm) setErrors({...errors, npm: undefined}); }}
                    className={`w-full text-sm p-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed ${errors.npm ? 'border-red-400' : ''}`}
                  />
                  {errors.npm && <p className="mt-1 text-[10px] text-red-600">{errors.npm}</p>}
                </div>
                <div>
                  <label htmlFor="mhs-angkatan" className="block text-xs font-semibold text-[var(--color-text-main)]/70 mb-1.5">Angkatan</label>
                  <input 
                    id="mhs-angkatan"
                    type="number" 
                    required
                    value={mhsForm.angkatan}
                    onChange={(e) => setMhsForm({...mhsForm, angkatan: Number(e.target.value)})}
                    className={`w-full text-sm p-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20 ${errors.angkatan ? 'border-red-400' : ''}`}
                  />
                  {errors.angkatan && <p className="mt-1 text-[10px] text-red-600">{errors.angkatan}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="mhs-jk" className="block text-xs font-semibold text-[var(--color-text-main)]/70 mb-1.5">Jenis Kelamin</label>
                  <select
                    id="mhs-jk"
                    value={mhsForm.jenis_kelamin}
                    onChange={(e) => setMhsForm({...mhsForm, jenis_kelamin: e.target.value})}
                    className="w-full text-sm p-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="mhs-fakultas" className="block text-xs font-semibold text-[var(--color-text-main)]/70 mb-1.5">Fakultas</label>
                  <input 
                    id="mhs-fakultas"
                    type="text" 
                    required
                    value={mhsForm.fakultas}
                    onChange={(e) => setMhsForm({...mhsForm, fakultas: e.target.value})}
                    className="w-full text-sm p-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="mhs-prodi" className="block text-xs font-semibold text-[var(--color-text-main)]/70 mb-1.5">Program Studi</label>
                  <input 
                    id="mhs-prodi"
                    type="text" 
                    required
                    value={mhsForm.prodi}
                    onChange={(e) => setMhsForm({...mhsForm, prodi: e.target.value})}
                    className="w-full text-sm p-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label htmlFor="mhs-status" className="block text-xs font-semibold text-[var(--color-text-main)]/70 mb-1.5">Status Akademik</label>
                  <select
                    id="mhs-status"
                    value={mhsForm.status}
                    onChange={(e) => setMhsForm({...mhsForm, status: e.target.value as Mahasiswa['status']})}
                    className={`w-full text-sm p-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)] ${errors.status ? 'border-red-400' : ''}`}
                  >
                    {JENIS_STATUS_MAHASISWA.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {errors.status && <p className="mt-1 text-[10px] text-red-600">{errors.status}</p>}
                </div>
                {mhsForm.status === 'Lulus' && (
                  <div className="mt-3">
                    <label htmlFor="mhs-tahun-lulus" className="block text-xs font-semibold text-[var(--color-text-main)]/70 mb-1.5">Tahun Lulus</label>
                    <input
                      id="mhs-tahun-lulus"
                      type="number"
                      placeholder="2024"
                      value={mhsForm.tahun_lulus || ''}
                      onChange={(e) => setMhsForm({...mhsForm, tahun_lulus: e.target.value ? Number(e.target.value) : undefined})}
                      className={`w-full text-sm p-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)] ${errors.tahun_lulus ? 'border-red-400' : ''}`}
                    />
                    {errors.tahun_lulus && <p className="mt-1 text-[10px] text-red-600">{errors.tahun_lulus}</p>}
                  </div>
                )}
                <div>
                  <label htmlFor="mhs-wali" className="block text-xs font-semibold text-[var(--color-text-main)]/70 mb-1.5">Dosen Wali (Opsional)</label>
                  <select
                    id="mhs-wali"
                    value={mhsForm.nip_dosen_wali || ''}
                    onChange={(e) => setMhsForm({...mhsForm, nip_dosen_wali: e.target.value})}
                    className="w-full text-sm p-2 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="">Belum Diplot</option>
                    {dosen.filter(d => d.is_dosen_wali !== false).map(d => (
                      <option key={d.nip} value={d.nip}>{d.nama}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowAddMhs(false);
                    setEditingMhs(null);
                  }}
                >
                  Batal
                </Button>
                <Button type="submit">
                  {editingMhs ? 'Simpan Perubahan' : 'Daftarkan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IMPORT CSV */}
      {showImport && (
        <CsvImporter 
          title="Data Mahasiswa"
          expectedHeaders={['NPM', 'Nama', 'Angkatan', 'Jenis Kelamin', 'Fakultas', 'Prodi', 'Status', 'NIP Dosen Wali', 'Tahun Lulus']}
          optionalHeaders={['NIP Dosen Wali', 'Tahun Lulus']}
          templateCsv={`NPM,Nama,Angkatan,Jenis Kelamin,Fakultas,Prodi,Status,NIP Dosen Wali,Tahun Lulus
31242001,Budi Santoso,2024,L,FMIPA,Geofisika,Regulasi Akademik,198203152008012003,
31242002,Siti Aminah,2024,P,FMIPA,Geofisika,Lulus,199105202015032002,2028
31242003,Rully Hermawan,2024,L,FMIPA,Geofisika,Regulasi Akademik,198901142013121001,
31242004,Dina Kusuma,2024,P,FMIPA,Geofisika,Alih Prodi,198506232010012008,
31242005,Ahmad Rizki,2024,L,FMIPA,Geofisika,Regulasi Akademik,199203142014011002,`}
          templateData={[
            { NPM: '31242001', Nama: 'Budi Santoso', Angkatan: 2024, 'Jenis Kelamin': 'L', Fakultas: 'FMIPA', Prodi: 'Geofisika', Status: 'Regulasi Akademik', 'NIP Dosen Wali': '198203152008012003', 'Tahun Lulus': '' },
            { NPM: '31242002', Nama: 'Siti Aminah', Angkatan: 2024, 'Jenis Kelamin': 'P', Fakultas: 'FMIPA', Prodi: 'Geofisika', Status: 'Lulus', 'NIP Dosen Wali': '199105202015032002', 'Tahun Lulus': 2028 },
            { NPM: '31242003', Nama: 'Rully Hermawan', Angkatan: 2024, 'Jenis Kelamin': 'L', Fakultas: 'FMIPA', Prodi: 'Geofisika', Status: 'Regulasi Akademik', 'NIP Dosen Wali': '198901142013121001', 'Tahun Lulus': '' },
            { NPM: '31242004', Nama: 'Dina Kusuma', Angkatan: 2024, 'Jenis Kelamin': 'P', Fakultas: 'FMIPA', Prodi: 'Geofisika', Status: 'Alih Prodi', 'NIP Dosen Wali': '198506232010012008', 'Tahun Lulus': '' },
            { NPM: '31242005', Nama: 'Ahmad Rizki', Angkatan: 2024, 'Jenis Kelamin': 'L', Fakultas: 'FMIPA', Prodi: 'Geofisika', Status: 'Regulasi Akademik', 'NIP Dosen Wali': '199203142014011002', 'Tahun Lulus': '' }
          ]}
          onImport={onBulkImportMahasiswa}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
