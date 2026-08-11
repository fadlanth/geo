import React, { useState } from 'react';
import CsvImporter from './CsvImporter';
import Pagination from './Pagination';
import DataActions from './DataActions';
import Button from './Button';
import IconButton from './IconButton';
import StatusChip from './StatusChip';
import {
  Search,
  Plus,
  Trash2,
  Trophy,
  Medal,
  Star,
  Edit2,
  ChevronDown,
  ChevronUp,
  Calendar,
  MapPin,
  UserCheck,
  Users,
  UserPlus
} from 'lucide-react';
import { Prestasi, Mahasiswa, AnggotaPrestasi, getPrestasiNamaMahasiswa } from '../types';
import { useDebounce } from '../lib/hooks';
import { exportToExcel, exportPrestasiRekapToExcel } from '../lib/exportUtils';
import { ToastOptions } from './Toast';
import { SkeletonTable, SkeletonCard } from './Skeleton';
import ComboboxMahasiswa from './ComboboxMahasiswa';

interface PrestasiTabProps {
  prestasi: Prestasi[];
  mahasiswa: Mahasiswa[];
  anggotaPrestasi: AnggotaPrestasi[];
  loading?: boolean;
  onSavePrestasi: (p: Prestasi) => void;
  onDeletePrestasi: (id: string) => void;
  onSaveAnggota: (anggota: AnggotaPrestasi) => void;
  onDeleteAnggota: (id: string) => void;
  onBulkReplaceAnggota: (id_prestasi: string, anggota: AnggotaPrestasi[]) => void;
  onBulkImportPrestasi: (data: any[]) => Promise<void>;
  onRefresh: () => Promise<void>;
  activeSubTab?: string;
  triggerToast?: (options: ToastOptions) => void;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function PrestasiTab({
  prestasi,
  mahasiswa,
  anggotaPrestasi,
  loading,
  onSavePrestasi,
  onDeletePrestasi,
  onSaveAnggota,
  onDeleteAnggota,
  onBulkReplaceAnggota,
  onBulkImportPrestasi,
  onRefresh,
  triggerToast
}: PrestasiTabProps) {

  const [query, setQuery] = useState('');
  const searchQuery = useDebounce(query, 350);
  const [filterTingkat, setFilterTingkat] = useState('All');
  const [filterJuara, setFilterJuara] = useState('All');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const ROWS_PER_PAGE = 25;

  const [showAddModal, setShowAddModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingPrestasi, setEditingPrestasi] = useState<Prestasi | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<Prestasi>({
    npm_mahasiswa: '',
    nama_mahasiswa: '',
    nama_kompetisi: '',
    tingkat: 'Nasional',
    juara_ke: 1,
    jenis_peserta: 'Individu',
    tahun_kegiatan: undefined,
    tempat: '',
    dosen_pembimbing: ''
  });

  const [showAnggotaForm, setShowAnggotaForm] = useState<number | null>(null);
  const [anggotaForm, setAnggotaForm] = useState({
    nama_lengkap: '',
    npm: '',
    prodi: '',
    universitas: '',
    peran: 'Anggota'
  });

  const totalNasionalIntl = prestasi.filter(p => ['Nasional', 'Internasional'].includes(p.tingkat)).length;
  const juara1 = prestasi.filter(p => p.juara_ke === 1).length;
  const juara2 = prestasi.filter(p => p.juara_ke === 2).length;
  const juara3 = prestasi.filter(p => p.juara_ke === 3).length;

  const filteredPrestasi = prestasi.filter(p => {
    const namaMhs = getPrestasiNamaMahasiswa(p, mahasiswa);
    const matchesSearch = p.nama_kompetisi.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          namaMhs.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTingkat = filterTingkat === 'All' || p.tingkat === filterTingkat;
    const matchesJuara = filterJuara === 'All' || p.juara_ke.toString() === filterJuara;
    return matchesSearch && matchesTingkat && matchesJuara;
  });

  // Auto-sort: best achievements first
  const SORT_WEIGHT: Record<string, number> = {
    Internasional: 4, Nasional: 3, Wilayah: 2, Universitas: 1
  };
  const sortedPrestasi = [...filteredPrestasi].sort((a, b) => {
    const weightA = (SORT_WEIGHT[a.tingkat] || 0) + (4 - (a.juara_ke || 3));
    const weightB = (SORT_WEIGHT[b.tingkat] || 0) + (4 - (b.juara_ke || 3));
    return weightB - weightA || (b.tahun_kegiatan || 0) - (a.tahun_kegiatan || 0);
  });

  const totalPages = Math.ceil(sortedPrestasi.length / ROWS_PER_PAGE);
  const safePage = Math.min(page, Math.max(1, totalPages));
  const paginatedPrestasi = sortedPrestasi.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const handleEditClick = (p: Prestasi) => {
    setEditingPrestasi(p);
    setForm({
      npm_mahasiswa: p.npm_mahasiswa || '',
      nama_mahasiswa: p.nama_mahasiswa || '',
      nama_kompetisi: p.nama_kompetisi,
      tingkat: p.tingkat,
      juara_ke: p.juara_ke,
      jenis_peserta: p.jenis_peserta || 'Individu',
      tahun_kegiatan: p.tahun_kegiatan,
      tempat: p.tempat || '',
      dosen_pembimbing: p.dosen_pembimbing || ''
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi client sederhana: nama kompetisi wajib & juara_ke ≥ 1
    if (!form.nama_kompetisi || form.juara_ke < 1) {
      if (triggerToast) {
        triggerToast({
          kind: 'error',
          title: 'Validasi Gagal',
          message: 'Nama kompetisi harus diisi dan juara ke minimal 1.'
        });
      }
      return;
    }

    const data: Prestasi = editingPrestasi
      ? { ...form, id_prestasi: editingPrestasi.id_prestasi }
      : form;

    setIsSubmitting(true);
    try {
      await onSavePrestasi(data);
      resetForm();
      setShowAddModal(false);
    } catch {
      // error toast already handled by App.tsx
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      npm_mahasiswa: '',
      nama_mahasiswa: '',
      nama_kompetisi: '',
      tingkat: 'Nasional',
      juara_ke: 1,
      jenis_peserta: 'Individu',
      tahun_kegiatan: undefined,
      tempat: '',
      dosen_pembimbing: ''
    });
    setEditingPrestasi(null);
  };

  const resetAnggotaForm = () => {
    setAnggotaForm({ nama_lengkap: '', npm: '', prodi: '', universitas: '', peran: 'Anggota' });
    setShowAnggotaForm(null);
  };

  const handleAddAnggota = (id_prestasi: string) => {
    if (!anggotaForm.nama_lengkap.trim()) return;
    onSaveAnggota({
      id_prestasi,
      nama_lengkap: anggotaForm.nama_lengkap.trim(),
      npm: anggotaForm.npm.trim() || null,
      prodi: anggotaForm.prodi.trim() || null,
      universitas: anggotaForm.universitas.trim() || null,
      peran: anggotaForm.peran.trim() || null
    });
    resetAnggotaForm();
  };

  const getTrophyIcon = (juaraKe: number) => {
    if (juaraKe === 1) return <Trophy className="w-5 h-5 text-[var(--color-warning)]" />;
    if (juaraKe === 2) return <Medal className="w-5 h-5 text-[var(--color-muted)]" />;
    if (juaraKe === 3) return <Medal className="w-5 h-5 text-[var(--color-primary)]" />;
    return <Star className="w-4 h-4 text-[var(--color-muted)]" />;
  };

  const handleExportPrestasi = () => {
    const dataToExport = prestasi.map(p => {
      const anggota = anggotaPrestasi.filter(a => a.id_prestasi === p.id_prestasi);
      return {
        'npm_mahasiswa': p.npm_mahasiswa || '',
        'nama_mahasiswa': p.nama_mahasiswa || '',
        'nama_kompetisi': p.nama_kompetisi,
        'tingkat': p.tingkat,
        'juara_ke': p.juara_ke,
        'jenis_peserta': p.jenis_peserta || 'Individu',
        'tahun_kegiatan': p.tahun_kegiatan || '',
        'tempat': p.tempat || '',
        'dosen_pembimbing': p.dosen_pembimbing || '',
        'anggota': anggota.length > 0 ? anggota.map(a => `${a.nama_lengkap} (${a.npm || '-'}, ${a.prodi || '-'}, ${a.universitas || '-'})`).join('; ') : ''
      };
    });
    exportToExcel(dataToExport, 'data_prestasi_mahasiswa', 'Prestasi');
    if (triggerToast) {
      triggerToast({
        kind: 'success',
        title: 'Ekspor Berhasil',
        message: `Berhasil mengunduh ${dataToExport.length} data prestasi ke Excel.`
      });
    }
  };

  const handleExportPrestasiRekap = () => {
    const uniqueByNpm = prestasi.filter((p) => typeof p.npm_mahasiswa === 'string' && p.npm_mahasiswa.trim() !== '');

    if (uniqueByNpm.length === 0) {
      if (triggerToast) {
        triggerToast({
          kind: 'warning',
          title: 'Tidak Ada Data',
          message: 'Belum ada data prestasi per individu mahasiswa untuk diekspor.'
        });
      }
      return;
    }

    exportPrestasiRekapToExcel(prestasi, 'rekap_prestasi_mahasiswa');

    if (triggerToast) {
      triggerToast({
        kind: 'success',
        title: 'Ekspor Rekap Berhasil',
        message: 'File Excel rekap dan grafik prestasi berhasil diunduh.'
      });
    }
  };

  const toggleExpand = (id: string | undefined) => {
    if (!id) return;
    setExpandedId(prev => prev === id ? null : id);
    setShowAnggotaForm(null);
  };

  const detailItems = (p: Prestasi) => {
    const items: { icon: React.ReactNode; label: string; value: React.ReactNode }[] = [];

    if (p.tahun_kegiatan) {
      items.push({
        icon: <Calendar className="w-3.5 h-3.5 shrink-0" />,
        label: 'Tahun',
        value: p.tahun_kegiatan
      });
    }
    if (p.tempat) {
      items.push({
        icon: <MapPin className="w-3.5 h-3.5 shrink-0" />,
        label: 'Tempat',
        value: p.tempat
      });
    }
    if (p.dosen_pembimbing) {
      items.push({
        icon: <UserCheck className="w-3.5 h-3.5 shrink-0" />,
        label: 'Dosen Pembimbing',
        value: p.dosen_pembimbing
      });
    }

    return items;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]/75">Data Akademik</p>
          <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[var(--color-text-main)]">Prestasi Mahasiswa</h2>
          <p className="text-xs text-[var(--color-text-main)]/55">Rekapitulasi pencapaian kompetisi mahasiswa</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-none"
            icon={<Plus className="w-4 h-4" />}
          >
            Catat Prestasi Baru
          </Button>
          <DataActions
            onImportCsv={() => setShowImport(true)}
            onImportExcel={() => setShowImport(true)}
            onExportExcel={handleExportPrestasi}
            onExportRekapPrestasi={handleExportPrestasiRekap}
          />
        </div>
      </div>

      {/* Summary & Unggulan */}
      {loading ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </>
      ) : prestasi.length === 0 ? (
        <div className="bg-white p-6 sm:p-12 rounded-2xl border border-slate-200 shadow-sm text-center">
          <Trophy className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-[var(--color-primary)]/20 mb-3" />
          <h3 className="font-bold text-sm text-[var(--color-text-main)]/50">Belum ada data prestasi</h3>
          <p className="text-xs text-[var(--color-text-main)]/30 mt-1">Klik "Catat Prestasi Baru" untuk menambahkan data pertama</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-2">Total Record</p>
              <p className="text-2xl font-bold font-display text-[var(--color-text-main)]">{prestasi.length}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-2">Nasional & Int'l</p>
              <p className="text-2xl font-bold font-display text-[var(--color-primary)]">{totalNasionalIntl}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <StatusChip status="Juara 1" />
                <Trophy className="w-3.5 h-3.5 text-[var(--color-warning)]" />
              </div>
              <p className="text-2xl font-bold font-display text-[var(--color-text-main)]">{juara1}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-2">
                <StatusChip status="Juara 2" />
                <StatusChip status="Juara 3" />
              </div>
              <div className="flex items-end gap-4">
                <div>
                  <p className="text-2xl font-bold font-display text-[var(--color-text-main)]">{juara2}</p>
                </div>
                <div className="border-l border-slate-200 pl-4">
                  <p className="text-2xl font-bold font-display text-[var(--color-text-main)]">{juara3}</p>
                </div>
              </div>
            </div>
          </div>

          </>
        )}

      {showImport && (
        <CsvImporter
          title="Prestasi Mahasiswa"
          expectedHeaders={[ 'npm_mahasiswa', 'nama_mahasiswa', 'nama_kompetisi', 'tingkat', 'juara_ke', 'jenis_peserta', 'tahun_kegiatan', 'tempat', 'dosen_pembimbing' ]}
          optionalHeaders={[ 'npm_mahasiswa', 'nama_mahasiswa' ]}
          templateCsv={`npm_mahasiswa,nama_mahasiswa,nama_kompetisi,tingkat,juara_ke,jenis_peserta,tahun_kegiatan,tempat,dosen_pembimbing
31242001,,Kompetisi Gempa,Nasional,1,Individu,2025,Bandung,Dr. Subroto
,Andi Pratama,Kontes Seismik,Wilayah,2,Individu,2024,Jakarta,`}
          templateData={[
            { npm_mahasiswa: '31242001', nama_mahasiswa: '', nama_kompetisi: 'Kompetisi Gempa', tingkat: 'Nasional', juara_ke: 1, jenis_peserta: 'Individu', tahun_kegiatan: 2025, tempat: 'Bandung', dosen_pembimbing: 'Dr. Subroto' },
            { npm_mahasiswa: '', nama_mahasiswa: 'Andi Pratama', nama_kompetisi: 'Kontes Seismik', tingkat: 'Wilayah', juara_ke: 2, jenis_peserta: 'Individu', tahun_kegiatan: 2024, tempat: 'Jakarta', dosen_pembimbing: '' }
          ]}
          onImport={onBulkImportPrestasi}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50/80 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-main)]/40" />
            <input
              type="text"
              placeholder="Cari nama mahasiswa atau nama kompetisi..."
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); setExpandedId(null); }}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)] shadow-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 md:w-auto">
            <select
              value={filterTingkat}
              onChange={(e) => { setFilterTingkat(e.target.value); setPage(1); setExpandedId(null); }}
              className="p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)] shadow-sm md:w-40"
            >
              <option value="All">Semua Tingkat</option>
              <option value="Internasional">Internasional</option>
              <option value="Nasional">Nasional</option>
              <option value="Wilayah">Wilayah</option>
              <option value="Universitas">Universitas</option>
            </select>

            <select
              value={filterJuara}
              onChange={(e) => { setFilterJuara(e.target.value); setPage(1); setExpandedId(null); }}
              className="p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)] shadow-sm md:w-32"
            >
              <option value="All">Semua Juara</option>
              <option value="1">Juara 1</option>
              <option value="2">Juara 2</option>
              <option value="3">Juara 3</option>
            </select>
          </div>
        </div>

        {/* Table List */}
        {loading ? (
          <SkeletonTable rows={10} cols={6} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-[var(--color-text-main)]/60 text-xs font-bold uppercase">
                    <th className="p-4 pl-6 w-10">#</th>
                    <th className="p-4">Mahasiswa</th>
                    <th className="p-4">Kompetisi & Bidang</th>
                    <th className="p-4">Tingkat</th>
                    <th className="p-4">Peringkat</th>
                    <th className="p-4 pr-6 text-center w-14"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {paginatedPrestasi.map((p, idx) => {
                    const mhs = mahasiswa.find(m => m.npm === p.npm_mahasiswa);
                    const isExpanded = expandedId === p.id_prestasi;
                    const details = detailItems(p);
                    const anggota = anggotaPrestasi.filter(a => a.id_prestasi === p.id_prestasi);
                    const isKelompok = p.jenis_peserta === 'Kelompok';

                    return (
                      <React.Fragment key={p.id_prestasi}>
                        <tr
                          className={`hover:bg-gray-50/50 transition cursor-pointer ${isExpanded ? 'bg-[var(--color-primary)]/5' : ''}`}
                          onClick={() => toggleExpand(p.id_prestasi)}
                        >
                          <td className="p-4 pl-6 text-xs text-[var(--color-text-main)]/40 font-mono">
                            {(safePage - 1) * ROWS_PER_PAGE + idx + 1}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[var(--color-text-main)]">{getPrestasiNamaMahasiswa(p, mahasiswa)}</span>
                              {isKelompok && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                                  <Users className="w-3 h-3" /> {anggota.length}
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-mono text-[var(--color-text-main)]/50">{p.npm_mahasiswa || (p.nama_mahasiswa ? '(non-mahasiswa)' : '—')}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-[var(--color-text-main)] max-w-sm truncate">{p.nama_kompetisi}</div>
                          </td>
                          <td className="p-4">
                            <StatusChip status={p.tingkat} />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {getTrophyIcon(p.juara_ke)}
                              <span className="font-bold text-sm">Juara {p.juara_ke}</span>
                            </div>
                          </td>
                          <td className="p-4 pr-6 text-center">
                            <IconButton
                              label={isExpanded ? 'Tutup detail' : 'Lihat detail'}
                              onClick={(e) => { e.stopPropagation(); toggleExpand(p.id_prestasi); }}
                              icon={isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            />
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="p-0">
                              <div className="px-6 pb-4 pt-2 bg-gradient-to-b from-[var(--color-primary)]/[0.03] to-transparent border-t border-[var(--color-primary)]/5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5">
                                  {details.map((item, i) => (
                                    <div key={i} className="flex items-center gap-2.5 text-sm">
                                      <span className="text-[var(--color-primary)]/60">{item.icon}</span>
                                      <span className="text-xs text-[var(--color-text-main)]/50 font-medium min-w-[80px]">{item.label}</span>
                                      <span className="text-[var(--color-text-main)] font-medium">{item.value}</span>
                                    </div>
                                  ))}
                                </div>

                                {/* Anggota Kelompok Section */}
                                {isKelompok && (
                                  <div className="mt-3 pt-3 border-t border-[var(--color-primary)]/10">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-main)]">
                                        <Users className="w-4 h-4 text-violet-500" />
                                        Peserta ({anggota.length} orang)
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={(e) => { e.stopPropagation(); setShowAnggotaForm(showAnggotaForm === p.id_prestasi ? null : p.id_prestasi); }}
                                        icon={<UserPlus className="w-3.5 h-3.5" />}
                                      >
                                        Tambah Anggota
                                      </Button>
                                    </div>

                                    {anggota.length > 0 && (
                                      <div className="overflow-hidden rounded-xl border border-gray-100 mb-2">
                                        <table className="w-full text-left text-xs">
                                          <thead>
                                            <tr className="bg-gray-50 text-[var(--color-text-main)]/60 font-bold uppercase tracking-wider">
                                              <th className="p-2 pl-3">Nama</th>
                                              <th className="p-2">NPM</th>
                                              <th className="p-2">Prodi</th>
                                              <th className="p-2">Universitas</th>
                                              <th className="p-2">Peran</th>
                                              <th className="p-2 pr-3 text-center w-10"></th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-50">
                                            {anggota.map(a => {
                                              const mhsAnggota = a.npm ? mahasiswa.find(m => m.npm === a.npm) : null;
                                              return (
                                                <tr key={a.id_anggota} className="hover:bg-gray-50/50">
                                                  <td className="p-2 pl-3 font-medium">{mhsAnggota ? mhsAnggota.nama : a.nama_lengkap}</td>
                                                  <td className="p-2 font-mono text-[var(--color-text-main)]/60">{a.npm || '—'}</td>
                                                  <td className="p-2">{a.prodi || '—'}</td>
                                                  <td className="p-2">{a.universitas || '—'}</td>
                                                  <td className="p-2">
                                                    <StatusChip status={a.peran || 'Anggota'} tone="neutral" />
                                                  </td>
                                                  <td className="p-2 pr-3 text-center">
                                                    <IconButton
                                                      label="Hapus anggota"
                                                      size="sm"
                                                      tone="danger"
                                                      onClick={(e) => { e.stopPropagation(); a.id_anggota && onDeleteAnggota(a.id_anggota); }}
                                                      icon={<Trash2 className="w-3.5 h-3.5" />}
                                                    />
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}

                                    {showAnggotaForm === p.id_prestasi && (
                                      <div onClick={(e) => e.stopPropagation()} className="bg-white border border-violet-200 rounded-xl p-3 mt-2 space-y-2.5">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                                          <div className="lg:col-span-2">
                                            <label className="block text-[10px] font-semibold mb-0.5 text-gray-500">Nama Lengkap *</label>
                                            <input
                                              type="text"
                                              placeholder="Nama peserta"
                                              value={anggotaForm.nama_lengkap}
                                              onChange={(e) => setAnggotaForm({...anggotaForm, nama_lengkap: e.target.value})}
                                              className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-violet-400"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-[10px] font-semibold mb-0.5 text-gray-500">NPM (opsional)</label>
                                            <input
                                              type="text"
                                              placeholder="NPM"
                                              value={anggotaForm.npm}
                                              onChange={(e) => setAnggotaForm({...anggotaForm, npm: e.target.value})}
                                              className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-violet-400"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-[10px] font-semibold mb-0.5 text-gray-500">Prodi</label>
                                            <input
                                              type="text"
                                              placeholder="Geofisika"
                                              value={anggotaForm.prodi}
                                              onChange={(e) => setAnggotaForm({...anggotaForm, prodi: e.target.value})}
                                              className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-violet-400"
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-[10px] font-semibold mb-0.5 text-gray-500">Universitas</label>
                                            <input
                                              type="text"
                                              placeholder="UNPAD"
                                              value={anggotaForm.universitas}
                                              onChange={(e) => setAnggotaForm({...anggotaForm, universitas: e.target.value})}
                                              className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-violet-400"
                                            />
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <select
                                            value={anggotaForm.peran}
                                            onChange={(e) => setAnggotaForm({...anggotaForm, peran: e.target.value})}
                                            className="text-xs p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-violet-400"
                                          >
                                            <option value="Ketua Tim">Ketua Tim</option>
                                            <option value="Anggota">Anggota</option>
                                            <option value="Presenter">Presenter</option>
                                          </select>
                                          <Button
                                            size="sm"
                                            onClick={() => p.id_prestasi && handleAddAnggota(p.id_prestasi)}
                                            disabled={!anggotaForm.nama_lengkap.trim()}
                                          >
                                            Simpan
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={(e) => { e.stopPropagation(); resetAnggotaForm(); }}
                                          >
                                            Batal
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--color-primary)]/10">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleEditClick(p); }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" /> Edit
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); p.id_prestasi && onDeletePrestasi(p.id_prestasi); }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {filteredPrestasi.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-sm text-gray-400">
                        Tidak ada data prestasi yang sesuai.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredPrestasi.length > ROWS_PER_PAGE && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/30">
                <span className="text-xs text-gray-500">
                  Menampilkan {(safePage - 1) * ROWS_PER_PAGE + 1}-{Math.min(safePage * ROWS_PER_PAGE, filteredPrestasi.length)} dari {filteredPrestasi.length} prestasi
                </span>
                <div className="flex gap-2">
                  <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[var(--color-primary)]/10 max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-bold text-lg">
                {editingPrestasi ? 'Edit Prestasi' : 'Catat Prestasi Baru'}
              </h3>
              <IconButton
                label="Tutup"
                onClick={() => { setShowAddModal(false); resetForm(); }}
                icon={<span className="text-sm leading-none">✕</span>}
              />
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Required Fields */}
              <div>
                <h4 className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider mb-3">Data Wajib</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Mahasiswa (NPM)</label>
                    <ComboboxMahasiswa
                      mahasiswa={mahasiswa}
                      value={form.npm_mahasiswa || ''}
                      onChange={(npm) => setForm({...form, npm_mahasiswa: npm})}
                      placeholder="Cari nama/NPM mahasiswa..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Nama Mahasiswa (jika tidak terdaftar)</label>
                    <input
                      type="text"
                      placeholder="Nama lengkap"
                      value={form.nama_mahasiswa || ''}
                      onChange={(e) => setForm({...form, nama_mahasiswa: e.target.value})}
                      className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold mb-1">Nama Kompetisi/Lomba <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={form.nama_kompetisi}
                      onChange={(e) => setForm({...form, nama_kompetisi: e.target.value})}
                      className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Tingkat <span className="text-rose-500">*</span></label>
                    <select
                      value={form.tingkat}
                      onChange={(e) => setForm({...form, tingkat: e.target.value as Prestasi['tingkat']})}
                      className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                    >
                      <option value="Internasional">Internasional</option>
                      <option value="Nasional">Nasional</option>
                      <option value="Wilayah">Wilayah</option>
                      <option value="Universitas">Universitas</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Peringkat/Juara <span className="text-rose-500">*</span></label>
                    <select
                      value={form.juara_ke}
                      onChange={(e) => setForm({...form, juara_ke: Number(e.target.value)})}
                      className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                    >
                      <option value={1}>Juara 1</option>
                      <option value={2}>Juara 2</option>
                      <option value={3}>Juara 3</option>
                      <option value={4}>Harapan/Lainnya</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Jenis Peserta</label>
                    <select
                      value={form.jenis_peserta}
                      onChange={(e) => setForm({...form, jenis_peserta: e.target.value as 'Individu' | 'Kelompok'})}
                      className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                    >
                      <option value="Individu">Individu</option>
                      <option value="Kelompok">Kelompok</option>
                    </select>
                  </div>
                </div>

                {form.jenis_peserta === 'Kelompok' && (
                  <div className="mt-3 p-3 bg-violet-50 border border-violet-200 rounded-xl">
                    <div className="flex items-start gap-2 text-xs text-violet-700">
                      <Users className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Prestasi kelompok</p>
                        <p className="text-violet-600/80 mt-0.5">Anggota tim dapat ditambahkan setelah prestasi tersimpan — klik tombol <strong>⬇</strong> pada baris prestasi di tabel dan gunakan fitur <strong>"Tambah Anggota"</strong>.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Optional Fields */}
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider mb-3">Data Tambahan (Opsional)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Tahun Kegiatan</label>
                    <input
                      type="number"
                      placeholder="2025"
                      value={form.tahun_kegiatan || ''}
                      onChange={(e) => setForm({...form, tahun_kegiatan: e.target.value ? Number(e.target.value) : undefined})}
                      className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Tempat</label>
                    <input
                      type="text"
                      placeholder="Bandung, Jakarta, Tokyo..."
                      value={form.tempat || ''}
                      onChange={(e) => setForm({...form, tempat: e.target.value})}
                      className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold mb-1">Dosen Pembimbing</label>
                    <input
                      type="text"
                      placeholder="Prof. Dr. Ir. Subroto Wardoyo, M.T."
                      value={form.dosen_pembimbing || ''}
                      onChange={(e) => setForm({...form, dosen_pembimbing: e.target.value})}
                      className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Menyimpan...</>
                  ) : (
                    editingPrestasi ? 'Simpan Perubahan' : 'Simpan Prestasi'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
