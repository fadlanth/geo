import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  TrendingUp,
  Download,
  X,
  Sparkles,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Copy,
  Check,
  UserCheck,
  UserX,
  Calendar,
  Layers
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
  YAxis
} from 'recharts';
import { TracerStudy, Mahasiswa, Dosen, getMasaTungguKategori, getGajiKategori } from '../types';
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
  dosen?: Dosen[];
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

type SubViewType = 'terlacak' | 'belum_terlacak' | 'akreditasi';

export default function TracerTab({
  alumni,
  mahasiswa,
  dosen = [],
  loading,
  onSaveAlumni,
  onDeleteAlumni,
  onBulkImportAlumni,
  onRefresh,
  triggerToast
}: TracerTabProps) {
  // Navigation & Sub-views
  const [activeSubView, setActiveSubView] = useState<SubViewType>('terlacak');
  const [filterTahun, setFilterTahun] = useState<string>('All');
  const [query, setQuery] = useState('');
  const searchQuery = useDebounce(query, 350);
  const [page, setPage] = useState(1);
  const [untrackedPage, setUntrackedPage] = useState(1);
  const tableRef = useRef<HTMLDivElement | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isCopiedUntracked, setIsCopiedUntracked] = useState(false);
  const ROWS_PER_PAGE = 25;

  // Modals
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

  // Form State
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

  // Map Dosen Wali (NIP -> Nama)
  const dosenMap = useMemo(() => {
    const map: Record<string, string> = {};
    (dosen || []).forEach(d => {
      map[d.nip] = d.nama;
    });
    return map;
  }, [dosen]);

  // Helper resolusi Tahun Lulus Mahasiswa
  const getMahasiswaTahunLulus = (m: Mahasiswa): number => {
    if (m.tahun_lulus) return m.tahun_lulus;
    const tracerMatch = alumni.find(a => a.npm_mahasiswa === m.npm);
    if (tracerMatch?.tahun_lulus) return tracerMatch.tahun_lulus;
    if (m.angkatan) return m.angkatan + 4; // estimasi 4 tahun kuliah
    return new Date().getFullYear();
  };

  // Kumpulan Tahun Kelulusan yang terdeteksi
  const tahunOptions = useMemo(() => {
    const years = new Set<number>();
    alumni.forEach(a => {
      if (a.tahun_lulus) years.add(a.tahun_lulus);
    });
    mahasiswa.forEach(m => {
      if (m.status === 'Lulus') {
        years.add(getMahasiswaTahunLulus(m));
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [alumni, mahasiswa]);

  // Set Mahasiswa yang sudah terlacak (ada di tracer)
  const trackedNpmSet = useMemo(() => {
    return new Set(alumni.map(a => a.npm_mahasiswa));
  }, [alumni]);

  // Mahasiswa yang berstatus Lulus di Master Data
  const semuaLulusanMahasiswa = useMemo(() => {
    return mahasiswa.filter(m => m.status === 'Lulus');
  }, [mahasiswa]);

  // Filter Lulusan Mahasiswa berdasarkan Tahun Kelulusan
  const cohortLulusanMahasiswa = useMemo(() => {
    if (filterTahun === 'All') return semuaLulusanMahasiswa;
    return semuaLulusanMahasiswa.filter(m => getMahasiswaTahunLulus(m).toString() === filterTahun);
  }, [semuaLulusanMahasiswa, filterTahun]);

  // Alumni Terlacak berdasarkan Tahun Kelulusan
  const cohortAlumni = useMemo(() => {
    if (filterTahun === 'All') return alumni;
    return alumni.filter(a => a.tahun_lulus.toString() === filterTahun);
  }, [alumni, filterTahun]);

  // Hitung Total Lulusan Unik untuk Cohort Terpilih (Master Data ∪ Tracer)
  const totalLulusanCohortCount = useMemo(() => {
    const set = new Set<string>();
    cohortLulusanMahasiswa.forEach(m => set.add(m.npm));
    cohortAlumni.forEach(a => set.add(a.npm_mahasiswa));
    return set.size;
  }, [cohortLulusanMahasiswa, cohortAlumni]);

  // Daftar Alumni Belum Terlacak (Status Lulus tapi belum ada di tracer)
  const untrackedAlumniList = useMemo(() => {
    return cohortLulusanMahasiswa
      .filter(m => !trackedNpmSet.has(m.npm))
      .filter(m => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return m.nama.toLowerCase().includes(q) || m.npm.includes(q);
      });
  }, [cohortLulusanMahasiswa, trackedNpmSet, searchQuery]);

  // Alumni Terlacak terfilter pencarian
  const filteredAlumni = useMemo(() => {
    return cohortAlumni.filter(a => {
      if (!searchQuery) return true;
      const mhs = mahasiswa.find(m => m.npm === a.npm_mahasiswa);
      const namaMhs = mhs ? mhs.nama.toLowerCase() : '';
      const inst = (a.instansi_pekerjaan || a.universitas_tujuan || a.bidang_usaha || '').toLowerCase();
      const q = searchQuery.toLowerCase();
      return namaMhs.includes(q) || inst.includes(q) || a.npm_mahasiswa.includes(q);
    });
  }, [cohortAlumni, mahasiswa, searchQuery]);

  // Metrik Keterlacakan (Response Rate)
  const terlacakCount = cohortAlumni.length;
  const belumTerlacakCount = untrackedAlumniList.length;
  const responseRate = totalLulusanCohortCount > 0
    ? Math.round((terlacakCount / totalLulusanCohortCount) * 100)
    : 0;

  // Pagination Lulusan Terlacak
  const totalPages = Math.ceil(filteredAlumni.length / ROWS_PER_PAGE);
  const safePage = Math.min(page, Math.max(1, totalPages));
  const paginatedAlumni = filteredAlumni.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  // Pagination Lulusan Belum Terlacak
  const totalUntrackedPages = Math.ceil(untrackedAlumniList.length / ROWS_PER_PAGE);
  const safeUntrackedPage = Math.min(untrackedPage, Math.max(1, totalUntrackedPages));
  const paginatedUntracked = untrackedAlumniList.slice(
    (safeUntrackedPage - 1) * ROWS_PER_PAGE,
    safeUntrackedPage * ROWS_PER_PAGE
  );

  // === Computed Analytics untuk Cohort Terpilih ===
  const statusMap = cohortAlumni.reduce((acc: Record<string, number>, a) => {
    acc[a.status_lulusan] = (acc[a.status_lulusan] || 0) + 1;
    return acc;
  }, {});
  const statusChartData = STATUS_OPTIONS
    .filter(s => (statusMap[s] || 0) > 0)
    .map(s => ({ name: s, value: statusMap[s] || 0 }));

  const bekerja = cohortAlumni.filter(a => a.status_lulusan === 'Bekerja');
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
  const berpenghasilan = cohortAlumni.filter(a => a.status_lulusan === 'Bekerja' || a.status_lulusan === 'Wiraswasta');
  const GAJI_KATEGORI = ['0-5jt', '>5-10jt', '>10jt'] as const;
  const sortedTahun = Array.from(new Set(cohortAlumni.map(a => a.tahun_lulus))).sort((a, b) => b - a);
  const gajiPerTahun = sortedTahun.map(th => {
    const bekerjaTahun = berpenghasilan.filter(a => a.tahun_lulus === th);
    const counts: Record<typeof GAJI_KATEGORI[number], number> = { '0-5jt': 0, '>5-10jt': 0, '>10jt': 0 };
    bekerjaTahun.forEach(a => {
      const kategori = getGajiKategori(a.gaji_pekerjaan);
      if (kategori !== '-') counts[kategori as typeof GAJI_KATEGORI[number]]++;
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

  // === Matriks Akreditasi LAMSAMA / IKU-1 Tahunan ===
  const akreditasiMatrix = useMemo(() => {
    return tahunOptions.map(th => {
      const lulusanTh = mahasiswa.filter(m => {
        if (m.status !== 'Lulus') return false;
        return getMahasiswaTahunLulus(m) === th;
      });
      const tracerTh = alumni.filter(a => a.tahun_lulus === th);
      const uniqueNpms = new Set([...lulusanTh.map(m => m.npm), ...tracerTh.map(a => a.npm_mahasiswa)]);
      const totalLulusan = uniqueNpms.size;
      const terlacak = tracerTh.length;
      const rate = totalLulusan > 0 ? Math.round((terlacak / totalLulusan) * 100) : 0;

      const bekerjaLulusan = tracerTh.filter(a => a.status_lulusan === 'Bekerja');
      const tungguKurang6 = bekerjaLulusan.filter(a => a.masa_tunggu_bulan <= 6).length;
      const tunggu6sd18 = bekerjaLulusan.filter(a => a.masa_tunggu_bulan > 6 && a.masa_tunggu_bulan <= 18).length;
      const tungguLebih18 = bekerjaLulusan.filter(a => a.masa_tunggu_bulan > 18).length;

      const lokal = bekerjaLulusan.filter(a => a.tingkat_perusahaan === 'Lokal').length;
      const nasional = bekerjaLulusan.filter(a => a.tingkat_perusahaan === 'Nasional').length;
      const multiOrInt = bekerjaLulusan.filter(a => a.tingkat_perusahaan === 'Multinasional' || a.tingkat_perusahaan === 'Internasional').length;

      const studiLanjut = tracerTh.filter(a => a.status_lulusan === 'Studi Lanjut').length;
      const wiraswasta = tracerTh.filter(a => a.status_lulusan === 'Wiraswasta').length;
      const belumBekerja = tracerTh.filter(a => a.status_lulusan === 'Belum Bekerja').length;

      const gajiDiatasUMR = bekerjaLulusan.filter(a => (a.gaji_pekerjaan || 0) >= 5000000).length;

      return {
        tahun: th,
        totalLulusan,
        terlacak,
        belumTerlacak: Math.max(0, totalLulusan - terlacak),
        rate,
        tungguKurang6,
        tunggu6sd18,
        tungguLebih18,
        lokal,
        nasional,
        multiOrInt,
        studiLanjut,
        wiraswasta,
        belumBekerja,
        gajiDiatasUMR
      };
    });
  }, [tahunOptions, mahasiswa, alumni]);

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

  const handleQuickInputTracer = (m: Mahasiswa) => {
    setEditingAlumni(null);
    setForm({
      npm_mahasiswa: m.npm,
      tahun_lulus: getMahasiswaTahunLulus(m),
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
    setShowAddModal(true);
  };

  const handleCopyUntrackedList = () => {
    if (untrackedAlumniList.length === 0) return;
    const textHeader = `Daftar Alumni Belum Terlacak (${filterTahun === 'All' ? 'Semua Tahun Lulus' : 'Tahun Kelulusan ' + filterTahun}) - Total: ${untrackedAlumniList.length} orang\n`;
    const lines = untrackedAlumniList.map((m, idx) => {
      const dosenName = m.nip_dosen_wali && dosenMap[m.nip_dosen_wali] ? ` [Wali: ${dosenMap[m.nip_dosen_wali]}]` : '';
      return `${idx + 1}. ${m.npm} - ${m.nama} (Angkatan ${m.angkatan})${dosenName}`;
    });
    navigator.clipboard.writeText(textHeader + lines.join('\n'));
    setIsCopiedUntracked(true);
    setTimeout(() => setIsCopiedUntracked(false), 2500);

    triggerToast?.({
      kind: 'success',
      title: 'Tersalin ke Clipboard',
      message: `${untrackedAlumniList.length} alumni belum terlacak berhasil disalin.`
    });
  };

  const handleExportAkreditasiExcel = () => {
    if (akreditasiMatrix.length === 0) {
      triggerToast?.({ kind: 'warning', title: 'Tidak Ada Data', message: 'Data matriks akreditasi kosong.' });
      return;
    }
    const rows = akreditasiMatrix.map(row => ({
      'Tahun Lulus (TS)': row.tahun,
      'Jumlah Lulusan': row.totalLulusan,
      'Jumlah Terlacak': row.terlacak,
      'Keterlacakan (%)': `${row.rate}%`,
      'Waktu Tunggu < 6 Bulan': row.tungguKurang6,
      'Waktu Tunggu 6-18 Bulan': row.tunggu6sd18,
      'Waktu Tunggu > 18 Bulan': row.tungguLebih18,
      'Tingkat Lokal': row.lokal,
      'Tingkat Nasional': row.nasional,
      'Tingkat Multinasional / Internasional': row.multiOrInt,
      'Studi Lanjut': row.studiLanjut,
      'Wiraswasta': row.wiraswasta,
      'Belum Bekerja': row.belumBekerja,
      'Gaji >= UMR (> 5 Juta)': row.gajiDiatasUMR
    }));

    exportToExcel(rows, `Matriks_Akreditasi_LAMSAMA_Tracer_${new Date().getFullYear()}`, 'LKPS LAMSAMA');
    triggerToast?.({
      kind: 'success',
      title: 'Ekspor Berhasil',
      message: 'Matriks akreditasi berhasil diunduh ke Excel.'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.npm_mahasiswa) {
      triggerToast?.({
        kind: 'error',
        title: 'Validasi Gagal',
        message: 'Pilih mahasiswa lulusan terlebih dahulu.'
      });
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
      // toast handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      npm_mahasiswa: '',
      tahun_lulus: filterTahun !== 'All' ? Number(filterTahun) : new Date().getFullYear(),
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
    if (!onBulkImportAlumni || rawData.length === 0) return;
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
    const dataToExport = cohortAlumni.map(a => {
      const mhs = mahasiswa.find(m => m.npm === a.npm_mahasiswa);
      return {
        NPM: a.npm_mahasiswa,
        Nama: mhs ? mhs.nama : '',
        'Tahun Lulus': a.tahun_lulus,
        Status: a.status_lulusan,
        'Masa Tunggu (bln)': a.masa_tunggu_bulan,
        Instansi: a.instansi_pekerjaan || '',
        Jabatan: a.jabatan || '',
        'Tingkat Perusahaan': a.tingkat_perusahaan || '',
        'Gaji (Rp)': a.gaji_pekerjaan || '',
        'Universitas Tujuan': a.universitas_tujuan || '',
        'Program Studi': a.program_studi || '',
        'Bidang Usaha': a.bidang_usaha || ''
      };
    });
    exportToExcel(dataToExport, `Data_Tracer_Alumni_${filterTahun}`, 'Tracer Study');
    triggerToast?.({
      kind: 'success',
      title: 'Ekspor Berhasil',
      message: `Berhasil mengunduh ${dataToExport.length} data tracer ke Excel.`
    });
  };

  const toggleExpand = (id: string | undefined) => {
    if (!id) return;
    setExpandedId(prev => prev === id ? null : id);
  };

  // Helper Badges
  const masaTungguBadge = (bulan: number) => {
    const kategori = getMasaTungguKategori(bulan);
    const cls = bulan <= 6 ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                bulan <= 12 ? 'bg-amber-100 text-amber-800 border-amber-200' :
                'bg-rose-100 text-rose-800 border-rose-200';
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cls}`}>{kategori}</span>;
  };

  const gajiBadge = (gaji: number | undefined | null) => {
    const kategori = getGajiKategori(gaji);
    if (kategori === '-') return <span className="text-xs text-gray-400">-</span>;
    const cls = kategori === '0-5jt' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                kategori === '>5-10jt' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                'bg-emerald-50 text-emerald-700 border-emerald-200';
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cls}`}>{kategori}</span>;
  };

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
      {/* 1. Header Halaman */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-bold uppercase tracking-wider">
            <Layers className="w-3 h-3" /> Master Data Tracer Study
          </div>
          <h2 className="font-display font-extrabold text-2xl text-[var(--color-text-main)]">
            Monitoring Cohort &amp; Keterlacakan Alumni
          </h2>
          <p className="text-xs text-[var(--color-text-main)]/60">
            Analisis serapan kelulusan, gap analysis kuesioner Dikti/Univ, dan pelaporan borang akreditasi LAMSAMA.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-start xl:justify-end">
          <Button
            onClick={() => { resetForm(); setShowAddModal(true); }}
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

      {/* 2. Cohort Selector (Tahun Kelulusan) */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">
          <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
          <span>Cohort Tahun Lulus:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-1">
          <button
            onClick={() => { setFilterTahun('All'); setPage(1); setUntrackedPage(1); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterTahun === 'All'
                ? 'bg-[var(--color-primary)] text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
            }`}
          >
            Semua Tahun ({semuaLulusanMahasiswa.length})
          </button>

          {tahunOptions.map((th) => {
            const mhsCount = semuaLulusanMahasiswa.filter(m => getMahasiswaTahunLulus(m) === th).length;
            const isSelected = filterTahun === th.toString();
            return (
              <button
                key={th}
                onClick={() => { setFilterTahun(th.toString()); setPage(1); setUntrackedPage(1); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--color-primary)] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
                }`}
              >
                <span>{th}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-white text-gray-500'}`}>
                  {mhsCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

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
      ) : (
        <>
          {/* 3. Kartu KPI & Keterlacakan (Response Rate Banner) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Status Keterlacakan {filterTahun === 'All' ? 'Seluruh Tahun Kelulusan' : `Tahun Kelulusan ${filterTahun}`}
                </span>
                <h3 className="text-xl font-display font-extrabold text-[var(--color-text-main)] flex items-center gap-2 mt-0.5">
                  Tingkat Keterlacakan Lulusan (Response Rate)
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                    responseRate >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    responseRate >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {responseRate >= 80 ? 'Target Akreditasi Unggul Terpenuhi' :
                     responseRate >= 60 ? 'Cukup (Perlu Ditingkatkan)' : 'Kritis (Perlu Follow-up)'}
                  </span>
                </h3>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="text-3xl font-display font-extrabold text-[var(--color-primary)]">
                    {responseRate}%
                  </div>
                  <div className="text-[11px] text-gray-500 font-medium">
                    {terlacakCount} dari {totalLulusanCohortCount} alumni terdata
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Progress Bar Response Rate */}
            <div className="space-y-1.5">
              <div className="w-full bg-gray-100 rounded-full h-3.5 overflow-hidden flex">
                <div
                  className={`h-full transition-all duration-500 ${
                    responseRate >= 80 ? 'bg-emerald-500' :
                    responseRate >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, responseRate))}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-gray-400 font-medium">
                <span>0%</span>
                <span className="text-amber-600 font-semibold">Batas Cukup (60%)</span>
                <span className="text-emerald-600 font-semibold">Target Unggul LAMSAMA (≥ 80%)</span>
                <span>100%</span>
              </div>
            </div>

            {/* 4 Kartu Metrik Komparasi */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  <span>Total Lulusan Prodi</span>
                </div>
                <div className="text-2xl font-extrabold text-gray-800">{fmt(totalLulusanCohortCount)}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Master Data Mahasiswa</div>
              </div>

              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100/70">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 mb-1">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>Sudah Terlacak</span>
                </div>
                <div className="text-2xl font-extrabold text-emerald-900">{fmt(terlacakCount)}</div>
                <div className="text-[10px] text-emerald-700/80 mt-0.5">Sudah mengisi kuesioner</div>
              </div>

              <div className={`p-4 rounded-2xl border ${
                belumTerlacakCount > 0 ? 'bg-rose-50/60 border-rose-100 text-rose-900' : 'bg-gray-50 border-gray-100 text-gray-500'
              }`}>
                <div className="flex items-center gap-2 text-xs font-bold mb-1">
                  <UserX className="w-4 h-4 text-rose-600" />
                  <span>Belum Terlacak (Gap)</span>
                </div>
                <div className="text-2xl font-extrabold">{fmt(belumTerlacakCount)}</div>
                <div className="text-[10px] text-rose-700/80 mt-0.5">Perlu ditindaklanjuti admin</div>
              </div>

              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1">
                  <Clock className="w-4 h-4 text-teal-600" />
                  <span>Rata Masa Tunggu</span>
                </div>
                <div className="text-2xl font-extrabold text-gray-800">{avgTunggu} <span className="text-xs font-normal text-gray-500">bln</span></div>
                <div className="text-[10px] text-gray-400 mt-0.5">Alumni bekerja</div>
              </div>
            </div>
          </div>

          {/* 4. Tab Navigasi Sub-View */}
          <div className="flex items-center gap-2 border-b border-gray-200/80 pb-1">
            <button
              onClick={() => setActiveSubView('terlacak')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 font-display font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer ${
                activeSubView === 'terlacak'
                  ? 'bg-[var(--color-primary)] text-white shadow-xs'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/60'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Data Alumni Terlacak ({terlacakCount})</span>
            </button>

            <button
              onClick={() => setActiveSubView('belum_terlacak')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 font-display font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer ${
                activeSubView === 'belum_terlacak'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
              }`}
            >
              <UserX className="w-4 h-4" />
              <span>Alumni Belum Terlacak ({belumTerlacakCount})</span>
            </button>

            <button
              onClick={() => setActiveSubView('akreditasi')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 font-display font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer ${
                activeSubView === 'akreditasi'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Matriks Akreditasi &amp; IKU</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* SUB-VIEW 1: DATA ALUMNI TERLACAK */}
          {/* ========================================================================= */}
          {activeSubView === 'terlacak' && (
            <div className="space-y-6">
              {/* Filter Row */}
              <div className="bg-white p-4 rounded-2xl border border-[var(--color-primary)]/10 flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-main)]/40" />
                  <input
                    type="text"
                    placeholder="Cari alumni terlacak berdasarkan nama, instansi, atau NPM..."
                    aria-label="Cari data tracer alumni terlacak"
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
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Donut: Status Lulusan */}
                <div className="bg-white p-5 rounded-2xl border border-[var(--color-primary)]/10 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-[var(--color-primary)]" /> Distribusi Status Alumni
                    </h3>
                    <span className="text-xs font-bold text-gray-500">{fmt(terlacakCount)} Responden</span>
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
                      <div className="h-full flex items-center justify-center text-xs text-gray-400">Belum ada data responden</div>
                    )}
                  </div>
                </div>

                {/* Bar: Tingkat Perusahaan */}
                <div className="bg-white p-5 rounded-2xl border border-[var(--color-primary)]/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-sm flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-600" /> Skala / Tingkat Tempat Kerja
                      </h3>
                      <span className="text-xs text-gray-400">Khusus Bekerja</span>
                    </div>
                    {tingkatChartData.length > 0 ? (
                      <div className="h-44 mt-3">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={tingkatChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                            <Tooltip cursor={{ fill: 'var(--color-primary)', opacity: 0.05 }} />
                            <Bar dataKey="jumlah" radius={[6, 6, 0, 0]} barSize={36}>
                              {tingkatChartData.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS_BAR[index % COLORS_BAR.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-44 flex items-center justify-center text-xs text-gray-400">Belum ada data tingkat perusahaan</div>
                    )}
                  </div>

                  {/* Kategori Masa Tunggu Pills */}
                  {tungguKategoriData.length > 0 && (
                    <div className="pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                      <span className="text-[10px] font-bold text-gray-400 self-center uppercase">Waktu Tunggu:</span>
                      {tungguKategoriData.map(k => (
                        <div key={k.label} className="bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200/60 flex items-center gap-1.5 text-xs">
                          <span className={`w-2 h-2 rounded-full ${
                            k.label === '0-6 bln' ? 'bg-emerald-500' :
                            k.label === '>6-12 bln' ? 'bg-amber-500' : 'bg-rose-500'
                          }`} />
                          <span className="font-bold text-gray-700">{k.count}</span>
                          <span className="text-gray-500">{k.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Rekap Gaji Alumni per Tahun Lulus (Bekerja & Wiraswasta) */}
              {gajiPerTahun.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-[var(--color-primary)]/10 shadow-xs">
                  <div className="flex items-center mb-3 pb-2 border-b border-gray-100">
                    <h3 className="font-display font-bold text-sm text-[var(--color-text-main)] flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-600" /> Rekap Gaji Alumni per Tahun Lulus
                    </h3>
                    <span className="ml-2 text-[10px] font-semibold text-gray-400">Bekerja &amp; Wiraswasta</span>
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

              {/* Table Data Alumni Terlacak */}
              <div className="bg-white rounded-2xl border border-[var(--color-primary)]/10 overflow-hidden shadow-xs">
                <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                  <h4 className="font-bold text-sm text-gray-700">
                    Daftar Alumni Terlacak ({filteredAlumni.length})
                  </h4>
                  <span className="text-xs text-gray-400">Klik baris untuk melihat detail pekerjaan / kampus lanjut</span>
                </div>

                <div className="overflow-x-auto" ref={tableRef}>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50/30 border-b border-gray-100 text-[var(--color-text-main)]/60 text-xs font-bold uppercase">
                        <th className="p-4 pl-6 w-10">#</th>
                        <th className="p-4">Alumni</th>
                        <th className="p-4">Status &amp; Tahun Lulus</th>
                        <th className="p-4">Instansi / Aktivitas</th>
                        <th className="p-4 pr-6 text-center w-14"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {paginatedAlumni.map((a, idx) => {
                        const mhs = mahasiswa.find(m => m.npm === a.npm_mahasiswa);
                        const isExpanded = expandedId === a.id_tracer;
                        const details = detailItems(a);

                        return (
                          <React.Fragment key={a.id_tracer || a.npm_mahasiswa}>
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
                                <div className="flex flex-col gap-1 items-start">
                                  <StatusChip status={a.status_lulusan} />
                                  <span className="text-[10px] text-gray-500 font-medium">Lulus: {a.tahun_lulus}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className="text-[var(--color-text-main)]/80 max-w-xs truncate block font-medium">
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
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition cursor-pointer"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" /> Edit
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); a.id_tracer && onDeleteAlumni(a.id_tracer); }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition cursor-pointer"
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
                            Tidak ada data tracer alumni yang sesuai filter.
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
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-VIEW 2: ALUMNI BELUM TERLACAK (GAP ANALYSIS) */}
          {/* ========================================================================= */}
          {activeSubView === 'belum_terlacak' && (
            <div className="space-y-6">
              {/* Banner Info Gap Analysis */}
              <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-rose-100 rounded-xl text-rose-700 shrink-0 mt-0.5">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-sm text-rose-900">
                      Terdapat {untrackedAlumniList.length} Alumni Lulusan yang Belum Terlacak
                    </h4>
                    <p className="text-xs text-rose-700/80 mt-0.5 leading-relaxed">
                      Mahasiswa di bawah ini tercatat berstatus <strong>Lulus</strong> di Master Data Mahasiswa, namun belum terdata di hasil kuesioner Tracer Study.
                      Admin dapat menginputkan langsung atau menyalin daftar ini untuk koordinasi penelusuran.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleCopyUntrackedList}
                    disabled={untrackedAlumniList.length === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-rose-200 text-rose-700 rounded-xl text-xs font-bold hover:bg-rose-100/50 transition cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isCopiedUntracked ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    {isCopiedUntracked ? 'Tersalin!' : 'Salin Daftar Alumni'}
                  </button>
                </div>
              </div>

              {/* Filter Search */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200/80">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari mahasiswa belum terlacak berdasarkan nama atau NPM..."
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setUntrackedPage(1); }}
                    className="w-full pl-10 pr-9 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-rose-600"
                  />
                  {query && (
                    <button
                      onClick={() => { setQuery(''); setUntrackedPage(1); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Tabel Alumni Belum Terlacak */}
              <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-rose-50/30 border-b border-gray-100 text-gray-500 text-xs font-bold uppercase">
                        <th className="p-4 pl-6 w-10">#</th>
                        <th className="p-4">NPM &amp; Nama Mahasiswa</th>
                        <th className="p-4">Angkatan</th>
                        <th className="p-4">Tahun Lulus (Est.)</th>
                        <th className="p-4">Dosen Wali</th>
                        <th className="p-4 pr-6 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {paginatedUntracked.map((m, idx) => {
                        const dosenWali = m.nip_dosen_wali ? (dosenMap[m.nip_dosen_wali] || m.nip_dosen_wali) : '-';
                        const thLulus = getMahasiswaTahunLulus(m);

                        return (
                          <tr key={m.npm} className="hover:bg-gray-50/50 transition">
                            <td className="p-4 pl-6 text-xs text-gray-400 font-mono">
                              {(safeUntrackedPage - 1) * ROWS_PER_PAGE + idx + 1}
                            </td>
                            <td className="p-4">
                              <div className="font-semibold text-gray-800">{m.nama}</div>
                              <div className="text-xs font-mono text-gray-400">{m.npm}</div>
                            </td>
                            <td className="p-4 text-xs font-medium text-gray-600">
                              {m.angkatan}
                            </td>
                            <td className="p-4">
                              <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs font-semibold">
                                {thLulus}
                              </span>
                            </td>
                            <td className="p-4 text-xs text-gray-600">
                              {dosenWali}
                            </td>
                            <td className="p-4 pr-6 text-right">
                              <button
                                onClick={() => handleQuickInputTracer(m)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-xs font-semibold hover:bg-[var(--color-primary-dark)] transition cursor-pointer shadow-xs"
                                title="Input data tracer untuk mahasiswa ini"
                              >
                                <Plus className="w-3.5 h-3.5" /> Input Tracer
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {untrackedAlumniList.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-14">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                              <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <h4 className="font-bold text-sm text-gray-800">Semua Lulusan Telah Terlacak!</h4>
                            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                              Tidak ada gap alumni untuk filter tahun kelulusan ini. Seluruh mahasiswa lulusan telah memiliki data kuesioner.
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {untrackedAlumniList.length > ROWS_PER_PAGE && (
                  <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/30">
                    <span className="text-xs text-gray-500">
                      Menampilkan {(safeUntrackedPage - 1) * ROWS_PER_PAGE + 1}-{Math.min(safeUntrackedPage * ROWS_PER_PAGE, untrackedAlumniList.length)} dari {untrackedAlumniList.length} data
                    </span>
                    <div className="flex gap-2">
                      <Pagination page={safeUntrackedPage} totalPages={totalUntrackedPages} onChange={setUntrackedPage} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SUB-VIEW 3: MATRIKS BORANG AKREDITASI (LKPS LAMSAMA / IKU-1) */}
          {/* ========================================================================= */}
          {activeSubView === 'akreditasi' && (
            <div className="space-y-6">
              {/* Header Box Matriks */}
              <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase tracking-wider mb-1">
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Standar LKPS LAM SAMA &amp; IKU-1
                  </div>
                  <h3 className="font-display font-extrabold text-base text-indigo-950">
                    Tabel Matriks Kinerja Lulusan per Tahun Kelulusan (TS)
                  </h3>
                  <p className="text-xs text-indigo-800/80 mt-0.5 max-w-2xl leading-relaxed">
                    Data agregat resmi per baris tahun lulusan. Sesuai dengan format isian LKPS akreditasi LAMSAMA (Tabel 8.d.1 Waktu Tunggu &amp; Tabel 8.d.2 Kesesuaian Bidang Kerja).
                  </p>
                </div>

                <Button
                  onClick={handleExportAkreditasiExcel}
                  className="bg-indigo-700 hover:bg-indigo-800 text-white shrink-0 shadow-xs"
                  icon={<Download className="w-4 h-4" />}
                >
                  Ekspor Matriks ke Excel
                </Button>
              </div>

              {/* Tabel Matriks */}
              <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs md:text-sm">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-bold uppercase text-[11px] tracking-wider">
                        <th className="p-3.5 pl-5" rowSpan={2}>Tahun Lulus (TS)</th>
                        <th className="p-3.5 text-center" rowSpan={2}>Jml Lulusan</th>
                        <th className="p-3.5 text-center" rowSpan={2}>Jml Terlacak</th>
                        <th className="p-3.5 text-center text-indigo-700" rowSpan={2}>Response Rate</th>
                        <th className="p-3 text-center border-l border-gray-200 bg-amber-50/40" colSpan={3}>Waktu Tunggu Kerja</th>
                        <th className="p-3 text-center border-l border-gray-200 bg-blue-50/40" colSpan={3}>Tingkat Tempat Kerja</th>
                        <th className="p-3 text-center border-l border-gray-200 bg-emerald-50/40" colSpan={3}>Aktivitas Lainnya</th>
                        <th className="p-3 text-center pr-5 border-l border-gray-200 bg-teal-50/40" rowSpan={2}>Gaji ≥ UMR</th>
                      </tr>
                      <tr className="bg-gray-50/50 border-b border-gray-200 text-gray-500 font-bold text-[10px]">
                        {/* Waktu Tunggu */}
                        <th className="p-2 text-center border-l border-gray-200">&lt; 6 Bln</th>
                        <th className="p-2 text-center">6-18 Bln</th>
                        <th className="p-2 text-center">&gt; 18 Bln</th>
                        {/* Tingkat */}
                        <th className="p-2 text-center border-l border-gray-200">Lokal</th>
                        <th className="p-2 text-center">Nasional</th>
                        <th className="p-2 text-center">Multi/Int</th>
                        {/* Aktivitas Lain */}
                        <th className="p-2 text-center border-l border-gray-200">S2/S3</th>
                        <th className="p-2 text-center">Wirausaha</th>
                        <th className="p-2 text-center">Belum Kerja</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {akreditasiMatrix.map((row) => (
                        <tr key={row.tahun} className="hover:bg-indigo-50/20 transition-colors">
                          <td className="p-3.5 pl-5 font-bold font-display text-[var(--color-text-main)]">
                            {row.tahun}
                          </td>
                          <td className="p-3.5 text-center font-medium text-gray-700">
                            {row.totalLulusan}
                          </td>
                          <td className="p-3.5 text-center font-bold text-gray-800">
                            {row.terlacak}
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                              row.rate >= 80 ? 'bg-emerald-100 text-emerald-800' :
                              row.rate >= 60 ? 'bg-amber-100 text-amber-800' :
                              'bg-rose-100 text-rose-800'
                            }`}>
                              {row.rate}%
                            </span>
                          </td>
                          {/* Waktu Tunggu */}
                          <td className="p-3 text-center border-l border-gray-100 font-medium text-emerald-700">
                            {row.tungguKurang6}
                          </td>
                          <td className="p-3 text-center font-medium text-gray-700">
                            {row.tunggu6sd18}
                          </td>
                          <td className="p-3 text-center font-medium text-rose-600">
                            {row.tungguLebih18}
                          </td>
                          {/* Tingkat */}
                          <td className="p-3 text-center border-l border-gray-100 font-medium text-gray-600">
                            {row.lokal}
                          </td>
                          <td className="p-3 text-center font-medium text-blue-700">
                            {row.nasional}
                          </td>
                          <td className="p-3 text-center font-medium text-indigo-700 font-semibold">
                            {row.multiOrInt}
                          </td>
                          {/* Aktivitas */}
                          <td className="p-3 text-center border-l border-gray-100 font-medium text-teal-700">
                            {row.studiLanjut}
                          </td>
                          <td className="p-3 text-center font-medium text-amber-700">
                            {row.wiraswasta}
                          </td>
                          <td className="p-3 text-center font-medium text-gray-400">
                            {row.belumBekerja}
                          </td>
                          {/* Gaji */}
                          <td className="p-3 text-center pr-5 border-l border-gray-100 font-bold text-teal-800">
                            {row.gajiDiatasUMR}
                          </td>
                        </tr>
                      ))}
                      {akreditasiMatrix.length === 0 && (
                        <tr>
                          <td colSpan={14} className="text-center py-10 text-gray-400 text-xs">
                            Belum ada rekaman data lulusan.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL: ADD / EDIT TRACER STUDY */}
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
              {/* Identitas Mahasiswa */}
              <div>
                <label htmlFor="tracer-mahasiswa" className="block text-xs font-semibold mb-1">Mahasiswa (Lulusan) *</label>
                <ComboboxMahasiswa
                  id="tracer-mahasiswa"
                  mahasiswa={mahasiswa.filter(m => m.status === 'Lulus' || alumni.some(a => a.npm_mahasiswa === m.npm))}
                  value={form.npm_mahasiswa}
                  onChange={(npm) => {
                    const mhs = mahasiswa.find(m => m.npm === npm);
                    setForm({
                      ...form,
                      npm_mahasiswa: npm,
                      tahun_lulus: mhs?.tahun_lulus || (mhs ? getMahasiswaTahunLulus(mhs) : form.tahun_lulus)
                    });
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
                    onChange={(e) => setForm({ ...form, tahun_lulus: Number(e.target.value) })}
                    className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label htmlFor="tracer-status" className="block text-xs font-semibold mb-1">Status Lulusan *</label>
                  <select
                    id="tracer-status"
                    value={form.status_lulusan}
                    onChange={(e) => setForm({ ...form, status_lulusan: e.target.value as TracerStudy['status_lulusan'] })}
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
                  onChange={(e) => setForm({ ...form, masa_tunggu_bulan: Number(e.target.value) })}
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
                      onChange={(e) => setForm({ ...form, instansi_pekerjaan: e.target.value })}
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
                        onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
                        className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                    <div>
                      <label htmlFor="tracer-tingkat" className="block text-xs font-semibold mb-1">Tingkat Perusahaan</label>
                      <select
                        id="tracer-tingkat"
                        value={form.tingkat_perusahaan || ''}
                        onChange={(e) => setForm({ ...form, tingkat_perusahaan: (e.target.value || undefined) as TracerStudy['tingkat_perusahaan'] })}
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
                      onChange={(e) => setForm({ ...form, gaji_pekerjaan: e.target.value ? Number(e.target.value) : undefined })}
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
                      onChange={(e) => setForm({ ...form, universitas_tujuan: e.target.value })}
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
                      onChange={(e) => setForm({ ...form, program_studi: e.target.value })}
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
                      onChange={(e) => setForm({ ...form, bidang_usaha: e.target.value })}
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

      {/* MODAL: IMPORT TRACER STUDY PUSAT (Format Unduhan Dikti/Univ) */}
      <TracerImporterModal
        isOpen={showDiktiImporter}
        onClose={() => setShowDiktiImporter(false)}
        onSuccess={async () => { await onRefresh(); }}
        triggerToast={triggerToast}
      />
    </div>
  );
}
