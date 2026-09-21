import React, { useState, useRef, useEffect } from 'react';
import CsvImporter from './CsvImporter';
import TracerImporterModal from './TracerImporterModal';
import Pagination from './Pagination';
import DataActions from './DataActions';
import Button from './Button';
import IconButton from './IconButton';
import StatusChip from './StatusChip';
import {
  GraduationCap,
  Search,
  Plus,
  Trash2,
  Edit2,
  Briefcase,
  Clock,
  Building2,
  BookOpen,
  Store,
  ChevronDown,
  ChevronUp,
  Calendar,
  TrendingUp,
  Download,
  X,
  Sparkles,
  UploadCloud,
  AlertTriangle,
  DollarSign
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { TracerStudy, Mahasiswa, getMasaTungguKategori, getGajiKategori } from '../types';
import { useDebounce, useEscapeClose } from '../lib/hooks';
import { fmt } from '../lib/format';
import { renderDonutLabel } from '../lib/chartUtils';
import StatCard from './StatCard';
import { academicService } from '../lib/academicService';
import { exportToExcel, exportRekapMultiSheetToExcel } from '../lib/exportUtils';
import { ToastOptions } from './Toast';
import { SkeletonTable, SkeletonCard, SkeletonChart } from './Skeleton';
import ComboboxMahasiswa from './ComboboxMahasiswa';
import { exportTracerMultiSheet } from './ExportTracerButton';
import { autoMapColumns, validateAndNormalizeRows, getImportSummary } from '../lib/tracerImportUtils';

interface TracerTabProps {
  alumni: TracerStudy[];
  mahasiswa: Mahasiswa[];
  loading?: boolean;
  onSaveAlumni: (a: TracerStudy) => void;
  onDeleteAlumni: (id: string) => void;
  onBulkImportAlumni?: (records: TracerStudy[]) => Promise<void>;
  onRefresh: () => Promise<void>;
  activeSubTab?: string;
  triggerToast?: (options: ToastOptions) => void;
}

const TINGKAT_OPTIONS = ['Lokal', 'Nasional', 'Multinasional', 'Internasional'] as const;
const STATUS_OPTIONS = ['Bekerja', 'Studi Lanjut', 'Wiraswasta', 'Belum Bekerja'] as const;

const COLORS_PIE = ['var(--color-primary)', '#8b5cf6', 'var(--color-warning)', 'var(--color-muted)'];
const COLORS_BAR = ['#60a5fa', '#3b82f6', '#1d4ed8', '#1e3a5f'];

export default function TracerTab({
  alumni,
  mahasiswa,
  loading,
  onSaveAlumni,
  onDeleteAlumni,
  onBulkImportAlumni,
  onRefresh,
  triggerToast
}: TracerTabProps) {

  const [query, setQuery] = useState('');
  const searchQuery = useDebounce(query, 350);
  const [filterTahun, setFilterTahun] = useState('All');
  const [page, setPage] = useState(1);
  const tableRef = useRef<HTMLDivElement | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const ROWS_PER_PAGE = 25;

  const [showAddModal, setShowAddModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showDiktiImporter, setShowDiktiImporter] = useState(false);
  const [editingAlumni, setEditingAlumni] = useState<TracerStudy | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEscapeClose(showAddModal, () => setShowAddModal(false));
  useEscapeClose(showImport, () => setShowImport(false));

  useEffect(() => {
    if (page > 1) tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [page]);
  const [form, setForm] = useState<TracerStudy>({
    npm_mahasiswa: '',
    tahun_lulus: new Date().getFullYear(),
    status_lulusan: 'Bekerja',
    masa_tunggu_bulan: 0,
    instansi_pekerjaan: '',
    jabatan: '',
    tingkat_perusahaan: undefined,
    gaji_pekerjaan: undefined,
    universitas_tujuan: '',
    program_studi: '',
    bidang_usaha: ''
  });

  // === Computed Analytics ===
  const totalAlumni = alumni.length;

  const statusMap = alumni.reduce((acc: Record<string, number>, a) => {
    acc[a.status_lulusan] = (acc[a.status_lulusan] || 0) + 1;
    return acc;
  }, {});
  const statusChartData = STATUS_OPTIONS
    .filter(s => (statusMap[s] || 0) > 0)
    .map(s => ({ name: s, value: statusMap[s] || 0 }));

  const bekerja = alumni.filter(a => a.status_lulusan === 'Bekerja');
  const avgTunggu = bekerja.length > 0
    ? (bekerja.reduce((s, a) => s + a.masa_tunggu_bulan, 0) / bekerja.length).toFixed(1)
    : '0';

  const tingkatMap = bekerja.reduce((acc: Record<string, number>, a) => {
    const t = a.tingkat_perusahaan || 'Lokal';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});
  const tingkatChartData = TINGKAT_OPTIONS
    .filter(t => (tingkatMap[t] || 0) > 0)
    .map(t => ({ name: t, jumlah: tingkatMap[t] || 0 }));

  const tungguKategoriMap = bekerja.reduce((acc: Record<string, number>, a) => {
    const k = getMasaTungguKategori(a.masa_tunggu_bulan);
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
   const tungguKategoriData = ['0-6 bln', '>6-12 bln', '>12 bln']
     .filter(k => (tungguKategoriMap[k] || 0) > 0)
     .map(k => ({ label: k, count: tungguKategoriMap[k] || 0 }));

   // === Rekap Gaji per Tahun Lulus (alumni Bekerja & Wiraswasta) ===
   const berpenghasilan = alumni.filter(a => a.status_lulusan === 'Bekerja' || a.status_lulusan === 'Wiraswasta');
   const GAJI_KATEGORI = ['0-5jt', '>5-10jt', '>10jt'] as const;
   const sortedTahun = Array.from(new Set(alumni.map(a => a.tahun_lulus))).sort((a, b) => b - a);
   const gajiPerTahun = sortedTahun.map(th => {
     const bekerjaTahun = berpenghasilan.filter(a => a.tahun_lulus === th);
     const counts: Record<typeof GAJI_KATEGORI[number], number> = { '0-5jt': 0, '>5-10jt': 0, '>10jt': 0 };
     bekerjaTahun.forEach(a => {
       const kategori = getGajiKategori(a.gaji_pekerjaan);
       if (kategori !== '-') counts[kategori]++;
     });
     return {
       tahun_lulus: th,
       '0-5jt': counts['0-5jt'],
       '>5-10jt': counts['>5-10jt'],
       '>10jt': counts['>10jt'],
       total: bekerjaTahun.filter(a => getGajiKategori(a.gaji_pekerjaan) !== '-').length,
     };
   });
   const gajiGrandTotal = GAJI_KATEGORI.reduce((acc, k) => {
     acc[k] = gajiPerTahun.reduce((s, r) => s + r[k], 0);
     return acc;
   }, { '0-5jt': 0, '>5-10jt': 0, '>10jt': 0 } as Record<typeof GAJI_KATEGORI[number], number>);

   // === Rekap Status Lulusan per Tahun Lulus (untuk download, tidak ditampilkan di web) ===
   const STATUS_KATEGORI = ['Bekerja', 'Wiraswarta', 'Studi Lanjut', 'Belum Bekerja'] as const;
   const statusPerTahun = sortedTahun.map(th => {
     const allTahun = alumni.filter(a => a.tahun_lulus === th);
     const counts: Record<typeof STATUS_KATEGORI[number], number> = {
       Bekerja: 0, Wiraswarta: 0, 'Studi Lanjut': 0, 'Belum Bekerja': 0
     };
     allTahun.forEach(a => {
       if (a.status_lulusan === 'Wiraswasta') counts.Wiraswarta++;
       else if (a.status_lulusan === 'Bekerja') counts.Bekerja++;
       else if (a.status_lulusan === 'Studi Lanjut') counts['Studi Lanjut']++;
       else counts['Belum Bekerja']++;
     });
     return {
       tahun_lulus: th,
       Bekerja: counts.Bekerja,
       Wiraswarta: counts.Wiraswarta,
       'Studi Lanjut': counts['Studi Lanjut'],
       'Belum Bekerja': counts['Belum Bekerja'],
       total: allTahun.length,
     };
   });

  // === Filter ===
  const tahunOptions = Array.from(new Set(alumni.map(a => a.tahun_lulus))).sort((a, b) => b - a);

  const filteredAlumni = alumni.filter(a => {
    const mhs = mahasiswa.find(m => m.npm === a.npm_mahasiswa);
    const namaMhs = mhs ? mhs.nama.toLowerCase() : '';
    const inst = (a.instansi_pekerjaan || a.universitas_tujuan || a.bidang_usaha || '').toLowerCase();
    const matchesSearch = namaMhs.includes(searchQuery.toLowerCase()) ||
                          inst.includes(searchQuery.toLowerCase()) ||
                          a.npm_mahasiswa.includes(searchQuery);
    const matchesTahun = filterTahun === 'All' || a.tahun_lulus.toString() === filterTahun;
    return matchesSearch && matchesTahun;
  });

  const totalPages = Math.ceil(filteredAlumni.length / ROWS_PER_PAGE);
  const safePage = Math.min(page, Math.max(1, totalPages));
  const paginatedAlumni = filteredAlumni.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  // === Handlers ===
  const handleEditClick = (a: TracerStudy) => {
    setEditingAlumni(a);
    setForm({
      npm_mahasiswa: a.npm_mahasiswa,
      tahun_lulus: a.tahun_lulus,
      status_lulusan: a.status_lulusan,
      masa_tunggu_bulan: a.masa_tunggu_bulan,
      instansi_pekerjaan: a.instansi_pekerjaan || '',
      jabatan: a.jabatan || '',
      tingkat_perusahaan: a.tingkat_perusahaan,
      gaji_pekerjaan: a.gaji_pekerjaan,
      universitas_tujuan: a.universitas_tujuan || '',
      program_studi: a.program_studi || '',
      bidang_usaha: a.bidang_usaha || ''
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.npm_mahasiswa) {
      if (triggerToast) {
        triggerToast({
          kind: 'error',
          title: 'Validasi Gagal',
          message: 'Pilih mahasiswa lulusan terlebih dahulu.'
        });
      }
      return;
    }

    const data: TracerStudy = editingAlumni
      ? { ...form, id_tracer: editingAlumni.id_tracer }
      : form;

    setIsSubmitting(true);
    try {
      await onSaveAlumni(data);
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
      tahun_lulus: new Date().getFullYear(),
      status_lulusan: 'Bekerja',
      masa_tunggu_bulan: 0,
      instansi_pekerjaan: '',
      jabatan: '',
      tingkat_perusahaan: undefined,
      gaji_pekerjaan: undefined,
      universitas_tujuan: '',
      program_studi: '',
      bidang_usaha: ''
    });
    setEditingAlumni(null);
  };

  const handleBulkImport = async (rawData: Record<string, unknown>[]) => {
    if (!onBulkImportAlumni) return;
    if (rawData.length === 0) return;

    const headers = Object.keys(rawData[0]);
    const { mapped } = autoMapColumns(headers);
    const validated = validateAndNormalizeRows(rawData, mapped);

    const validRows = validated
      .filter((v) => v.isValid && v.row.npm_mahasiswa)
      .map((v) => v.row);

    if (validRows.length === 0) {
      throw new Error('Tidak ada baris data valid yang memiliki NPM dan status lulusan.');
    }

    await onBulkImportAlumni(validRows);
    setShowImport(false);
  };

  const handleExportAlumni = () => {
    const dataToExport = alumni.map(a => {
      const mhs = mahasiswa.find(m => m.npm === a.npm_mahasiswa);
      return {
        'NPM': a.npm_mahasiswa,
        'Nama': mhs ? mhs.nama : '',
        'Tahun Lulus': a.tahun_lulus,
        'Status': a.status_lulusan,
        'Masa Tunggu (bln)': a.masa_tunggu_bulan,
        'Instansi': a.instansi_pekerjaan || '',
        'Jabatan': a.jabatan || '',
        'Tingkat Perusahaan': a.tingkat_perusahaan || '',
        'Gaji (Rp)': a.gaji_pekerjaan || '',
        'Universitas Tujuan': a.universitas_tujuan || '',
        'Program Studi': a.program_studi || '',
        'Bidang Usaha': a.bidang_usaha || ''
      };
    });
    exportToExcel(dataToExport, 'data_tracer_study_alumni', 'Tracer Study');
    if (triggerToast) {
      triggerToast({
        kind: 'success',
        title: 'Ekspor Berhasil',
        message: `Berhasil mengunduh ${dataToExport.length} data tracer ke Excel.`
      });
    }
  };

  const handleExportRekapAll = () => {
    const hasGaji = gajiPerTahun.length > 0;
    const hasStatus = statusPerTahun.length > 0;
    if (!hasGaji && !hasStatus) {
      triggerToast?.({ kind: 'warning', title: 'Tidak Ada Data', message: 'Tidak ada data rekap untuk diekspor.' });
      return;
    }

    const sheets: Record<string, Record<string, unknown>[]> = {};

    if (hasGaji) {
      const rows: Record<string, unknown>[] = gajiPerTahun.map(r => ({
        'Tahun Lulus': r.tahun_lulus,
        '0-5jt': r['0-5jt'],
        '>5-10jt': r['>5-10jt'],
        '>10jt': r['>10jt'],
        'Total': r.total,
      }));
      const grand = gajiGrandTotal;
      rows.push({
        'Tahun Lulus': 'TOTAL',
        '0-5jt': grand['0-5jt'],
        '>5-10jt': grand['>5-10jt'],
        '>10jt': grand['>10jt'],
        'Total': grand['0-5jt'] + grand['>5-10jt'] + grand['>10jt'],
      });
      sheets['Rekap Gaji'] = rows;
    }

    if (hasStatus) {
      const rows: Record<string, unknown>[] = statusPerTahun.map(r => ({
        'Tahun Lulus': r.tahun_lulus,
        'Bekerja': r.Bekerja,
        'Wiraswarta': r.Wiraswarta,
        'Studi Lanjut': r['Studi Lanjut'],
        'Belum Bekerja': r['Belum Bekerja'],
        'Total': r.total,
      }));
      const grand = statusPerTahun.reduce((acc, r) => ({
        Bekerja: acc.Bekerja + r.Bekerja,
        Wiraswarta: acc.Wiraswarta + r.Wiraswarta,
        'Studi Lanjut': acc['Studi Lanjut'] + r['Studi Lanjut'],
        'Belum Bekerja': acc['Belum Bekerja'] + r['Belum Bekerja'],
      }), { Bekerja: 0, Wiraswarta: 0, 'Studi Lanjut': 0, 'Belum Bekerja': 0 });
      rows.push({
        'Tahun Lulus': 'TOTAL',
        'Bekerja': grand.Bekerja,
        'Wiraswarta': grand.Wiraswarta,
        'Studi Lanjut': grand['Studi Lanjut'],
        'Belum Bekerja': grand['Belum Bekerja'],
        'Total': grand.Bekerja + grand.Wiraswarta + grand['Studi Lanjut'] + grand['Belum Bekerja'],
      });
      sheets['Rekap Status'] = rows;
    }

    exportRekapMultiSheetToExcel(sheets, 'Rekap_Tracer');
    if (triggerToast) {
      triggerToast({
        kind: 'success',
        title: 'Ekspor Berhasil',
        message: `Berhasil mengunduh rekap (gaji + status) ke Excel.`
      });
    }
  };

  const toggleExpand = (id: string | undefined) => {
    if (!id) return;
    setExpandedId(prev => prev === id ? null : id);
  };

  // === Category badge helper ===
  const masaTungguBadge = (bulan: number) => {
    const kategori = getMasaTungguKategori(bulan);
    const cls = bulan <= 6 ? 'bg-green-100 text-green-700' :
                bulan <= 12 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700';
    return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cls}`}>{kategori}</span>;
  };

  const gajiBadge = (gaji: number | undefined | null) => {
    const kategori = getGajiKategori(gaji);
    if (kategori === '-') return <span className="text-xs text-gray-400">-</span>;
    const cls = kategori === '0-5jt' ? 'bg-sky-100 text-sky-700' :
                kategori === '>5-10jt' ? 'bg-violet-100 text-violet-700' :
                'bg-emerald-100 text-emerald-700';
    return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cls}`}>{kategori}</span>;
  };

  // === Detail items helper ===
  const detailItems = (a: TracerStudy) => {
    const items: { icon: React.ReactNode; label: string; value: React.ReactNode }[] = [];

    if (a.status_lulusan === 'Bekerja') {
      if (a.instansi_pekerjaan) items.push({ icon: <Building2 className="w-3.5 h-3.5 shrink-0" />, label: 'Instansi', value: a.instansi_pekerjaan });
      if (a.jabatan) items.push({ icon: <Briefcase className="w-3.5 h-3.5 shrink-0" />, label: 'Jabatan', value: a.jabatan });
      if (a.tingkat_perusahaan) items.push({ icon: <TrendingUp className="w-3.5 h-3.5 shrink-0" />, label: 'Tingkat Perusahaan', value: a.tingkat_perusahaan });
      items.push({ icon: <DollarSign className="w-3.5 h-3.5 shrink-0" />, label: 'Gaji', value: gajiBadge(a.gaji_pekerjaan) });
      items.push({ icon: <Clock className="w-3.5 h-3.5 shrink-0" />, label: 'Masa Tunggu', value: masaTungguBadge(a.masa_tunggu_bulan) });
    }

    if (a.status_lulusan === 'Studi Lanjut') {
      if (a.universitas_tujuan) items.push({ icon: <GraduationCap className="w-3.5 h-3.5 shrink-0" />, label: 'Universitas', value: a.universitas_tujuan });
      if (a.program_studi) items.push({ icon: <BookOpen className="w-3.5 h-3.5 shrink-0" />, label: 'Program Studi', value: a.program_studi });
      items.push({ icon: <Clock className="w-3.5 h-3.5 shrink-0" />, label: 'Masa Tunggu', value: masaTungguBadge(a.masa_tunggu_bulan) });
    }

    if (a.status_lulusan === 'Wiraswasta') {
      if (a.bidang_usaha) items.push({ icon: <Store className="w-3.5 h-3.5 shrink-0" />, label: 'Bidang Usaha', value: a.bidang_usaha });
      items.push({ icon: <DollarSign className="w-3.5 h-3.5 shrink-0" />, label: 'Gaji', value: gajiBadge(a.gaji_pekerjaan) });
      items.push({ icon: <Clock className="w-3.5 h-3.5 shrink-0" />, label: 'Masa Tunggu', value: masaTungguBadge(a.masa_tunggu_bulan) });
    }

    if (a.status_lulusan === 'Belum Bekerja') {
      items.push({ icon: <Clock className="w-3.5 h-3.5 shrink-0" />, label: 'Masa Tunggu', value: masaTungguBadge(a.masa_tunggu_bulan) });
    }

    return items;
  };

  const getMainLabel = (a: TracerStudy): string => {
    if (a.status_lulusan === 'Bekerja') return a.instansi_pekerjaan || '-';
    if (a.status_lulusan === 'Studi Lanjut') return a.universitas_tujuan || '-';
    if (a.status_lulusan === 'Wiraswasta') return a.bidang_usaha || '-';
    return `${a.masa_tunggu_bulan} bln tanpa kerja`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]/75">Tracer Study</p>
          <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[var(--color-text-main)]">Tracer Study Alumni</h2>
          <p className="text-xs text-[var(--color-text-main)]/55">Profil lulusan: bekerja, studi lanjut, wiraswasta</p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <Button
            onClick={() => setShowAddModal(true)}
            className="shadow-xs"
            icon={<Plus className="w-4 h-4" />}
          >
            Tambah Data Tracer
          </Button>
          <DataActions
            onImportPusat={() => setShowDiktiImporter(true)}
            onImportCsv={() => setShowImport(true)}
            onImportExcel={() => setShowImport(true)}
            onExportMultiSheet={async () => {
              try {
                const total = await exportTracerMultiSheet();
                triggerToast?.({
                  kind: 'success',
                  title: 'Ekspor Multi-Sheet Berhasil',
                  message: `Berhasil mengunduh ${total} data alumni ke Laporan_Tracer_Study_GEO.xlsx`
                });
              } catch {
                triggerToast?.({
                  kind: 'error',
                  title: 'Ekspor Gagal',
                  message: 'Gagal mengekspor data tracer study ke Excel.'
                });
              }
            }}
            onExportExcel={handleExportAlumni}
          />
        </div>
      </div>

      {/* Dashboard Section */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonChart />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
          <SkeletonTable rows={4} cols={5} />
        </div>
      ) : totalAlumni === 0 ? (
        <div className="bg-white p-6 sm:p-12 rounded-2xl border border-[var(--color-primary)]/10 text-center">
          <GraduationCap className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-[var(--color-primary)]/20 mb-3" />
          <h3 className="font-bold text-sm text-[var(--color-text-main)]/50">Belum ada data tracer study</h3>
          <p className="text-xs text-[var(--color-text-main)]/30 mt-1">Klik "Tambah Data Tracer" untuk menambahkan data pertama</p>
        </div>
      ) : (
        <>
          {/* Filter Row */}
          <div className="bg-white p-4 rounded-2xl border border-[var(--color-primary)]/10 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-main)]/40" />
              <input
                type="text"
                placeholder="Cari alumni, instansi, atau universitas..."
                aria-label="Cari data tracer study"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); setExpandedId(null); }}
                className="w-full pl-10 pr-9 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
              />
              {query && (
                <button
                  onClick={() => { setQuery(''); setPage(1); setExpandedId(null); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                  aria-label="Bersihkan pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <select
              value={filterTahun}
              onChange={(e) => { setFilterTahun(e.target.value); setPage(1); setExpandedId(null); }}
              className="p-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)] md:w-40"
            >
              <option value="All">Semua Tahun Lulus</option>
              {tahunOptions.map(t => (
                <option key={t} value={t.toString()}>{t}</option>
              ))}
            </select>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Donut: Status Lulusan */}
            <div className="bg-white p-5 rounded-2xl border border-[var(--color-primary)]/10 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm flex items-center gap-2"><GraduationCap className="w-4 h-4"/> Status Lulusan</h3>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-500">{fmt(totalAlumni)} Alumni</span>
                </div>
              </div>
              <div className="flex-1 h-56">
                {statusChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                      <Pie
                        data={statusChartData}
                        cx="50%" cy="50%"
                        innerRadius={58} outerRadius={72}
                        paddingAngle={2}
                        dataKey="value"
                        label={renderDonutLabel(COLORS_PIE)}
                      >
                        {statusChartData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-gray-400">Belum ada data</div>
                )}
              </div>
            </div>

            {/* Bento Stats */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                variant="primary-border"
                align="center"
                icon={Clock}
                label="Rata Masa Tunggu"
                labelPosition="bottom"
                value={avgTunggu}
                sub="(bulan, alumni bekerja)"
              />
              <StatCard
                variant="primary-border"
                align="center"
                icon={Briefcase}
                label="Bekerja"
                labelPosition="bottom"
                value={fmt(bekerja.length)}
                sub={`${totalAlumni > 0 ? Math.round((bekerja.length / totalAlumni) * 100) : 0}% alumni`}
              />

              {/* Distribusi Tingkat Perusahaan (bar chart mini) */}
              <div className="col-span-2 bg-white p-4 rounded-2xl border border-[var(--color-primary)]/10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Distribusi Tingkat Perusahaan</p>
                </div>
                {tingkatChartData.length > 0 ? (
                  <div className="h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={tingkatChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 9 }} />
                        <Tooltip cursor={{ fill: 'var(--color-primary)', opacity: 0.1 }} />
                        <Bar dataKey="jumlah" radius={[4, 4, 0, 0]} barSize={28}>
                          {tingkatChartData.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS_BAR[index % COLORS_BAR.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-28 flex items-center justify-center text-xs text-gray-400">Belum ada data</div>
                )}
              </div>
            </div>
          </div>

          {/* Masa Tunggu Kategori Row */}
          {tungguKategoriData.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Kategori Masa Tunggu (Alumni Bekerja)</p>
              <div className="flex flex-wrap gap-3">
              {tungguKategoriData.map(k => (
                <div key={k.label} className="bg-white px-4 py-2 rounded-xl border border-gray-100 flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full ${
                    k.label === '0-6 bln' ? 'bg-green-500' :
                    k.label === '>6-12 bln' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <span className="font-semibold">{k.count}</span>
                  <span className="text-gray-500">{k.label}</span>
                </div>
              ))}
            </div>
            </div>
          )}

          {/* Rekap Gaji Alumni per Tahun Lulus (Bekerja & Wiraswasta) */}
          {gajiPerTahun.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-[var(--color-primary)]/10 shadow-xs">
              <div className="flex items-center mb-3 pb-2 border-b border-gray-100">
                <h3 className="font-display font-bold text-sm text-[var(--color-text-main)]">Rekap Gaji Alumni per Tahun Lulus</h3>
                <span className="ml-2 text-[10px] font-semibold text-gray-400">Bekerja & Wiraswasta</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 text-[var(--color-text-main)]/60 font-bold uppercase tracking-wider">
                      <th className="p-3 pl-4">Tahun Lulus</th>
                      <th className="p-3 text-center">0–5jt</th>
                      <th className="p-3 text-center">&gt;5–10jt</th>
                      <th className="p-3 text-center">&gt;10jt</th>
                      <th className="p-3 text-center font-display">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {gajiPerTahun.map(r => (
                      <tr key={r.tahun_lulus} className="hover:bg-gray-50/30">
                        <td className="p-3 pl-4 font-bold text-[var(--color-text-main)]">{r.tahun_lulus}</td>
                        <td className="p-3 text-center text-gray-700">{r['0-5jt']}</td>
                        <td className="p-3 text-center text-gray-700">{r['>5-10jt']}</td>
                        <td className="p-3 text-center text-gray-700">{r['>10jt']}</td>
                        <td className="p-3 text-center font-bold text-[var(--color-primary)]">{r.total}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-gray-200 bg-gray-50/30 font-bold">
                      <td className="p-3 pl-4 text-[var(--color-text-main)]">TOTAL</td>
                      <td className="p-3 text-center">{gajiGrandTotal['0-5jt']}</td>
                      <td className="p-3 text-center">{gajiGrandTotal['>5-10jt']}</td>
                      <td className="p-3 text-center">{gajiGrandTotal['>10jt']}</td>
                      <td className="p-3 text-center text-[var(--color-primary)]">{gajiGrandTotal['0-5jt'] + gajiGrandTotal['>5-10jt'] + gajiGrandTotal['>10jt']}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[var(--color-primary)]/10 overflow-hidden">
            <div className="overflow-x-auto" ref={tableRef}>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-[var(--color-text-main)]/60 text-xs font-bold uppercase">
                    <th className="p-4 pl-6 w-10">#</th>
                    <th className="p-4">Alumni</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Detail</th>
                    <th className="p-4 pr-6 text-center w-14"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {paginatedAlumni.map((a, idx) => {
                    const mhs = mahasiswa.find(m => m.npm === a.npm_mahasiswa);
                    const isExpanded = expandedId === a.id_tracer;
                    const details = detailItems(a);

                    return (
                      <React.Fragment key={a.id_tracer}>
                        <tr
                          className={`hover:bg-gray-50/50 transition cursor-pointer ${isExpanded ? 'bg-[var(--color-primary)]/5' : ''}`}
                          onClick={() => toggleExpand(a.id_tracer)}
                        >
                          <td className="p-4 pl-6 text-xs text-[var(--color-text-main)]/40 font-mono">
                            {(safePage - 1) * ROWS_PER_PAGE + idx + 1}
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-[var(--color-text-main)]">{mhs ? mhs.nama : a.npm_mahasiswa}</div>
                            <div className="text-xs font-mono text-[var(--color-text-main)]/50">{a.npm_mahasiswa}</div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1">
                              <StatusChip status={a.status_lulusan} />
                              <span className="text-[10px] text-gray-500">{a.tahun_lulus}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-[var(--color-text-main)]/80 max-w-xs truncate block">
                              {getMainLabel(a)}
                            </span>
                          </td>
                          <td className="p-4 pr-6 text-center">
                            <IconButton
                              label={isExpanded ? 'Tutup detail' : 'Lihat detail'}
                              onClick={(e) => { e.stopPropagation(); toggleExpand(a.id_tracer); }}
                              icon={isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            />
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={5} className="p-0">
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

                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--color-primary)]/10">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleEditClick(a); }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" /> Edit
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); a.id_tracer && onDeleteAlumni(a.id_tracer); }}
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
                  {filteredAlumni.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-sm text-gray-400">
                        Tidak ada data tracer alumni yang sesuai.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredAlumni.length > ROWS_PER_PAGE && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/30">
                <span className="text-xs text-gray-500">
                  Menampilkan {(safePage - 1) * ROWS_PER_PAGE + 1}-{Math.min(safePage * ROWS_PER_PAGE, filteredAlumni.length)} dari {filteredAlumni.length} data
                </span>
                <div className="flex gap-2">
                  <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />
                </div>
              </div>
            )}
          </div>
        </>
      )}

        {/* Download Rekap (gaji + status) - tabel rekap status tidak ditampilkan di web */}
        {(gajiPerTahun.length > 0 || statusPerTahun.length > 0) && (
          <div className="mt-4 flex justify-end">
            <Button
              size="sm"
              variant="secondary"
              onClick={handleExportRekapAll}
              className="text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
              title="Download rekap (gaji + status) ke Excel"
              icon={<Download className="w-3.5 h-3.5" />}
            >
              Download Rekap
            </Button>
          </div>
        )}

        {/* Import Modal */}
      {showImport && (
        <CsvImporter
          title="Tracer Study Alumni"
          expectedHeaders={[
            'NPM', 'Tahun Lulus', 'Status', 'Masa Tunggu (bln)',
            'Instansi', 'Jabatan', 'Tingkat Perusahaan', 'Gaji',
            'Universitas Tujuan', 'Program Studi', 'Bidang Usaha'
          ]}
          optionalHeaders={[
            'Instansi', 'Jabatan', 'Tingkat Perusahaan', 'Gaji',
            'Universitas Tujuan', 'Program Studi', 'Bidang Usaha'
          ]}
          templateData={[
            { NPM: '12318001', 'Tahun Lulus': 2022, Status: 'Bekerja', 'Masa Tunggu (bln)': 3, Instansi: 'Pertamina Geothermal Energy', Jabatan: 'Geophysicist', 'Tingkat Perusahaan': 'Multinasional', Gaji: 8500000, 'Universitas Tujuan': '', 'Program Studi': '', 'Bidang Usaha': '' },
            { NPM: '12319012', 'Tahun Lulus': 2023, Status: 'Studi Lanjut', 'Masa Tunggu (bln)': 2, Instansi: '', Jabatan: '', 'Tingkat Perusahaan': '', Gaji: '', 'Universitas Tujuan': 'Kyushu University', 'Program Studi': 'Earth Resources Engineering', 'Bidang Usaha': '' },
            { NPM: '12320011', 'Tahun Lulus': 2024, Status: 'Wiraswasta', 'Masa Tunggu (bln)': 5, Instansi: '', Jabatan: '', 'Tingkat Perusahaan': '', Gaji: '', 'Universitas Tujuan': '', 'Program Studi': '', 'Bidang Usaha': 'Jasa Konsultasi Geofisika' }
          ]}
          templateCsv="NPM,Tahun Lulus,Status,Masa Tunggu (bln),Instansi,Jabatan,Tingkat Perusahaan,Gaji,Universitas Tujuan,Program Studi,Bidang Usaha"
          onImport={async (data) => {
            // Step 1: Auto-detect column mapping
            if (data.length === 0) {
              triggerToast?.({ kind: 'error', title: 'Import Gagal', message: 'File tidak memiliki data baris.' });
              return;
            }
            const fileHeaders = Object.keys(data[0]);
            const { mapped, missingRequired } = autoMapColumns(fileHeaders);

            if (missingRequired.length > 0) {
              triggerToast?.({ kind: 'error', title: 'Kolom Wajib Hilang', message: `Kolom tidak ditemukan: ${missingRequired.join(', ')}. Pastikan file memiliki kolom NPM, Tahun Lulus, Status, dan Masa Tunggu.` });
              return;
            }

            // Step 2: Validate & normalize all rows
            const validated = validateAndNormalizeRows(data, mapped);
            const summary = getImportSummary(validated);

            // Step 3: Show validation warnings if any
            const warningRows = validated.filter(v => v.warnings.length > 0);
            if (warningRows.length > 0) {
              const warningPreview = warningRows.slice(0, 5)
                .map(v => `Baris ${v.rowIndex}: ${v.warnings.join('; ')}`)
                .join('\n');
              console.warn('[Smart Import] Warnings:\n' + warningPreview);
            }

            // Step 4: Import valid rows
            const validRows = validated.filter(v => v.isValid);
            let count = 0;
            let errors = 0;
            for (const v of validRows) {
              try {
                await academicService.saveTracerAlumni(v.row);
                count++;
              } catch {
                errors++;
              }
            }
            await onRefresh();

            // Step 5: Report results
            if (triggerToast) {
              if (count > 0) {
                const parts: string[] = [`${count} data berhasil diimport.`];
                if (errors > 0) parts.push(`${errors} gagal simpan.`);
                if (summary.errorRows > 0) parts.push(`${summary.errorRows} baris dilewati karena data tidak valid.`);
                if (summary.warningRows > 0) parts.push(`${summary.warningRows} baris memiliki peringatan.`);
                triggerToast({
                  kind: summary.errorRows > 0 || errors > 0 ? 'warning' : 'success',
                  title: 'Import Tracer Selesai',
                  message: parts.join(' ')
                });
              } else {
                const errorDetail = validated.filter(v => !v.isValid).slice(0, 3)
                  .map(v => `Baris ${v.rowIndex}: ${v.errors.join(', ')}`)
                  .join(' | ');
                triggerToast({
                  kind: 'error',
                  title: 'Import Gagal',
                  message: `Tidak ada data valid. ${errorDetail}`
                });
              }
            }
          }}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[var(--color-primary)]/10 max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-bold text-lg">
                {editingAlumni ? 'Edit Data Tracer' : 'Tambah Data Tracer'}
              </h3>
              <IconButton
                label="Tutup"
                onClick={() => { setShowAddModal(false); resetForm(); }}
                icon={<span className="text-sm leading-none">✕</span>}
              />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Identitas */}
              <div>
                <label htmlFor="tracer-mahasiswa" className="block text-xs font-semibold mb-1">Mahasiswa (Lulusan) *</label>
                <ComboboxMahasiswa
                  id="tracer-mahasiswa"
                  mahasiswa={mahasiswa.filter(m => m.status === 'Lulus' || alumni.some(a => a.npm_mahasiswa === m.npm))}
                  value={form.npm_mahasiswa}
                  onChange={(npm) => {
                    const mhs = mahasiswa.find(m => m.npm === npm);
                    setForm({...form, npm_mahasiswa: npm, tahun_lulus: mhs?.tahun_lulus || form.tahun_lulus});
                  }}
                  placeholder="Cari nama/NPM alumni lulus..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="tracer-tahun" className="block text-xs font-semibold mb-1">Tahun Lulus *</label>
                  <input
                    id="tracer-tahun"
                    type="number"
                    required
                    value={form.tahun_lulus}
                    onChange={(e) => setForm({...form, tahun_lulus: Number(e.target.value)})}
                    className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label htmlFor="tracer-status" className="block text-xs font-semibold mb-1">Status Lulusan *</label>
                  <select
                    id="tracer-status"
                    value={form.status_lulusan}
                    onChange={(e) => setForm({...form, status_lulusan: e.target.value as TracerStudy['status_lulusan']})}
                    className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="Bekerja">Bekerja</option>
                    <option value="Studi Lanjut">Studi Lanjut</option>
                    <option value="Wiraswasta">Wiraswasta</option>
                    <option value="Belum Bekerja">Belum Bekerja</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="tracer-tunggu" className="block text-xs font-semibold mb-1">Masa Tunggu (bulan) *</label>
                <input
                  id="tracer-tunggu"
                  type="number"
                  min={0}
                  value={form.masa_tunggu_bulan}
                  onChange={(e) => setForm({...form, masa_tunggu_bulan: Number(e.target.value)})}
                  className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>

              {/* Conditional: Bekerja */}
              {form.status_lulusan === 'Bekerja' && (
                <div className="border-t border-gray-100 pt-4 space-y-4">
                  <h4 className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider">Data Pekerjaan</h4>
                  <div>
                    <label htmlFor="tracer-instansi" className="block text-xs font-semibold mb-1">Instansi / Perusahaan</label>
                    <input
                      id="tracer-instansi"
                      type="text"
                      value={form.instansi_pekerjaan || ''}
                      onChange={(e) => setForm({...form, instansi_pekerjaan: e.target.value})}
                      className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="tracer-jabatan" className="block text-xs font-semibold mb-1">Jabatan / Posisi</label>
                      <input
                        id="tracer-jabatan"
                        type="text"
                        value={form.jabatan || ''}
                        onChange={(e) => setForm({...form, jabatan: e.target.value})}
                        className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                    <div>
                      <label htmlFor="tracer-tingkat" className="block text-xs font-semibold mb-1">Tingkat Perusahaan</label>
                      <select
                        id="tracer-tingkat"
                        value={form.tingkat_perusahaan || ''}
                        onChange={(e) => setForm({...form, tingkat_perusahaan: (e.target.value || undefined) as TracerStudy['tingkat_perusahaan']})}
                        className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                      >
                        <option value="">-- Pilih --</option>
                        {TINGKAT_OPTIONS.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="tracer-gaji" className="block text-xs font-semibold mb-1">Gaji Bulanan (Rp)</label>
                    <input
                      id="tracer-gaji"
                      type="number"
                      min={0}
                      step={100000}
                      placeholder="contoh: 8500000"
                      value={form.gaji_pekerjaan || ''}
                      onChange={(e) => setForm({...form, gaji_pekerjaan: e.target.value ? Number(e.target.value) : undefined})}
                      className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Kategori otomatis: 0-5jt / &gt;5-10jt / &gt;10jt</p>
                  </div>
                </div>
              )}

              {/* Conditional: Studi Lanjut */}
              {form.status_lulusan === 'Studi Lanjut' && (
                <div className="border-t border-gray-100 pt-4 space-y-4">
                  <h4 className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider">Data Studi Lanjut</h4>
                  <div>
                    <label htmlFor="tracer-univ" className="block text-xs font-semibold mb-1">Universitas / Institusi Tujuan</label>
                    <input
                      id="tracer-univ"
                      type="text"
                      placeholder="Kyushu University, ITB, UI..."
                      value={form.universitas_tujuan || ''}
                      onChange={(e) => setForm({...form, universitas_tujuan: e.target.value})}
                      className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                  <div>
                    <label htmlFor="tracer-prodi" className="block text-xs font-semibold mb-1">Program Studi</label>
                    <input
                      id="tracer-prodi"
                      type="text"
                      placeholder="Magister Teknik Geofisika"
                      value={form.program_studi || ''}
                      onChange={(e) => setForm({...form, program_studi: e.target.value})}
                      className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>
              )}

              {/* Conditional: Wiraswasta */}
              {form.status_lulusan === 'Wiraswasta' && (
                <div className="border-t border-gray-100 pt-4 space-y-4">
                  <h4 className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider">Data Wiraswasta</h4>
                  <div>
                    <label htmlFor="tracer-usaha" className="block text-xs font-semibold mb-1">Bidang Usaha</label>
                    <input
                      id="tracer-usaha"
                      type="text"
                      placeholder="Konsultasi Geofisika, Startup Teknologi..."
                      value={form.bidang_usaha || ''}
                      onChange={(e) => setForm({...form, bidang_usaha: e.target.value})}
                      className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>
              )}

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
                    editingAlumni ? 'Simpan Perubahan' : 'Simpan Data'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IMPORT CSV / EXCEL TRACER STUDY */}
      {showImport && (
        <CsvImporter
          title="Data Tracer Study Alumni"
          expectedHeaders={['NPM', 'Tahun Lulus', 'Status', 'Masa Tunggu']}
          optionalHeaders={['Instansi', 'Jabatan', 'Tingkat Perusahaan', 'Gaji', 'Universitas Tujuan', 'Program Studi', 'Bidang Usaha']}
          templateCsv={`NPM,Tahun Lulus,Status,Masa Tunggu,Instansi,Jabatan,Tingkat Perusahaan,Gaji,Universitas Tujuan,Program Studi,Bidang Usaha
140710200001,2024,Bekerja,3,PT Pertamina Hulu Energi,Junior Geophysicist,Nasional,8500000,,,
140710200002,2024,Studi Lanjut,0,,,,,,ITB,Magister Teknik Geofisika,
140710200003,2024,Wiraswasta,2,,,,,,,Konsultan Geofisika Mandiri
140710200004,2024,Belum Bekerja,0,,,,,,,,`}
          templateData={[
            { NPM: '140710200001', 'Tahun Lulus': 2024, Status: 'Bekerja', 'Masa Tunggu': 3, Instansi: 'PT Pertamina Hulu Energi', Jabatan: 'Junior Geophysicist', 'Tingkat Perusahaan': 'Nasional', Gaji: 8500000, 'Universitas Tujuan': '', 'Program Studi': '', 'Bidang Usaha': '' },
            { NPM: '140710200002', 'Tahun Lulus': 2024, Status: 'Studi Lanjut', 'Masa Tunggu': 0, Instansi: '', Jabatan: '', 'Tingkat Perusahaan': '', Gaji: '', 'Universitas Tujuan': 'ITB', 'Program Studi': 'Magister Teknik Geofisika', 'Bidang Usaha': '' },
            { NPM: '140710200003', 'Tahun Lulus': 2024, Status: 'Wiraswasta', 'Masa Tunggu': 2, Instansi: '', Jabatan: '', 'Tingkat Perusahaan': '', Gaji: '', 'Universitas Tujuan': '', 'Program Studi': '', 'Bidang Usaha': 'Konsultan Geofisika Mandiri' },
            { NPM: '140710200004', 'Tahun Lulus': 2024, Status: 'Belum Bekerja', 'Masa Tunggu': 0, Instansi: '', Jabatan: '', 'Tingkat Perusahaan': '', Gaji: '', 'Universitas Tujuan': '', 'Program Studi': '', 'Bidang Usaha': '' }
          ]}
          onImport={handleBulkImport}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* MODAL: IMPORT TRACER STUDY PUSAT (Auto-Pilot) */}
      <TracerImporterModal
        isOpen={showDiktiImporter}
        onClose={() => setShowDiktiImporter(false)}
        onSuccess={async () => { await onRefresh(); }}
        triggerToast={triggerToast}
      />
    </div>
  );
}
