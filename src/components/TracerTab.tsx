import React, { useState } from 'react';
import CsvImporter from './CsvImporter';
import DataActions from './DataActions';
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
  Users,
  TrendingUp
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
import { TracerStudy, Mahasiswa, getMasaTungguKategori } from '../types';
import { useDebounce } from '../lib/hooks';
import { academicService } from '../lib/academicService';
import { exportToExcel } from '../lib/exportUtils';
import { ToastOptions } from './Toast';
import { SkeletonTable, SkeletonCard, SkeletonChart } from './Skeleton';
import ComboboxMahasiswa from './ComboboxMahasiswa';

interface TracerTabProps {
  alumni: TracerStudy[];
  mahasiswa: Mahasiswa[];
  loading?: boolean;
  onSaveAlumni: (a: TracerStudy) => void;
  onDeleteAlumni: (id: string) => void;
  onRefresh: () => Promise<void>;
  activeSubTab?: string;
  triggerToast?: (options: ToastOptions) => void;
}

const TINGKAT_OPTIONS = ['Lokal', 'Nasional', 'Multinasional', 'Internasional'] as const;
const STATUS_OPTIONS = ['Bekerja', 'Studi Lanjut', 'Wiraswasta', 'Belum Bekerja'] as const;

const COLORS_PIE = ['var(--color-primary)', '#8b5cf6', 'var(--color-warning)', 'var(--color-muted)'];
const COLORS_BAR = ['#60a5fa', '#3b82f6', '#1d4ed8', '#1e3a5f'];

function getStatusColor(status: string): string {
  switch (status) {
    case 'Bekerja': return 'chip status-bekerja';
    case 'Studi Lanjut': return 'chip status-studi';
    case 'Wiraswasta': return 'chip status-wira';
    case 'Belum Bekerja': return 'chip status-belumbekerja';
    default: return 'chip';
  }
}

export default function TracerTab({
  alumni,
  mahasiswa,
  loading,
  onSaveAlumni,
  onDeleteAlumni,
  onRefresh,
  triggerToast
}: TracerTabProps) {

  const [query, setQuery] = useState('');
  const searchQuery = useDebounce(query, 350);
  const [filterTahun, setFilterTahun] = useState('All');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const ROWS_PER_PAGE = 25;

  const [showAddModal, setShowAddModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingAlumni, setEditingAlumni] = useState<TracerStudy | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<TracerStudy>({
    npm_mahasiswa: '',
    tahun_lulus: new Date().getFullYear(),
    status_lulusan: 'Bekerja',
    masa_tunggu_bulan: 0,
    instansi_pekerjaan: '',
    jabatan: '',
    tingkat_perusahaan: undefined,
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
      universitas_tujuan: '',
      program_studi: '',
      bidang_usaha: ''
    });
    setEditingAlumni(null);
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

  const toggleExpand = (id: string | undefined) => {
    if (!id) return;
    setExpandedId(prev => prev === id ? null : id);
  };

  // === Detail items helper ===
  const detailItems = (a: TracerStudy) => {
    const items: { icon: React.ReactNode; label: string; value: React.ReactNode }[] = [];

    if (a.status_lulusan === 'Bekerja') {
      if (a.instansi_pekerjaan) items.push({ icon: <Building2 className="w-3.5 h-3.5 shrink-0" />, label: 'Instansi', value: a.instansi_pekerjaan });
      if (a.jabatan) items.push({ icon: <Briefcase className="w-3.5 h-3.5 shrink-0" />, label: 'Jabatan', value: a.jabatan });
      if (a.tingkat_perusahaan) items.push({ icon: <TrendingUp className="w-3.5 h-3.5 shrink-0" />, label: 'Tingkat Perusahaan', value: a.tingkat_perusahaan });
      items.push({
        icon: <Clock className="w-3.5 h-3.5 shrink-0" />,
        label: 'Masa Tunggu',
        value: (
          <span className="inline-flex items-center gap-1.5">
            {a.masa_tunggu_bulan} bulan
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              a.masa_tunggu_bulan <= 6 ? 'bg-green-100 text-green-700' :
              a.masa_tunggu_bulan <= 12 ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {getMasaTungguKategori(a.masa_tunggu_bulan)}
            </span>
          </span>
        )
      });
    }

    if (a.status_lulusan === 'Studi Lanjut') {
      if (a.universitas_tujuan) items.push({ icon: <GraduationCap className="w-3.5 h-3.5 shrink-0" />, label: 'Universitas', value: a.universitas_tujuan });
      if (a.program_studi) items.push({ icon: <BookOpen className="w-3.5 h-3.5 shrink-0" />, label: 'Program Studi', value: a.program_studi });
      items.push({ icon: <Clock className="w-3.5 h-3.5 shrink-0" />, label: 'Masa Tunggu', value: `${a.masa_tunggu_bulan} bulan` });
    }

    if (a.status_lulusan === 'Wiraswasta') {
      if (a.bidang_usaha) items.push({ icon: <Store className="w-3.5 h-3.5 shrink-0" />, label: 'Bidang Usaha', value: a.bidang_usaha });
      items.push({ icon: <Clock className="w-3.5 h-3.5 shrink-0" />, label: 'Masa Tunggu', value: `${a.masa_tunggu_bulan} bulan` });
    }

    if (a.status_lulusan === 'Belum Bekerja') {
      items.push({ icon: <Clock className="w-3.5 h-3.5 shrink-0" />, label: 'Masa Tunggu', value: `${a.masa_tunggu_bulan} bulan` });
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-[var(--color-primary)]/10">
        <div>
          <h2 className="font-display font-extrabold text-xl text-[var(--color-text-main)]">Tracer Study Alumni</h2>
          <p className="text-xs text-[var(--color-text-main)]/50">Profil lulusan: bekerja, studi lanjut, wiraswasta</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-base)] hover:bg-[var(--color-primary-light)] font-semibold text-xs rounded-xl transition shadow-md shadow-[var(--color-primary)]/10"
          >
            <Plus className="w-4 h-4" /> Tambah Data Tracer
          </button>
          <DataActions
            onImportCsv={() => setShowImport(true)}
            onImportExcel={() => setShowImport(true)}
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
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); setExpandedId(null); }}
                className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
              />
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
                <span className="text-xs font-bold text-gray-500">{totalAlumni} Alumni</span>
              </div>
              <div className="flex-1 h-56">
                {statusChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%" cy="50%"
                        innerRadius={60} outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
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
              <div className="bg-white p-4 rounded-2xl border border-[var(--color-primary)]/10 flex flex-col items-center justify-center text-center">
                <Clock className="w-5 h-5 text-[var(--color-primary)] mb-1" />
                <p className="text-2xl font-bold font-display">{avgTunggu}</p>
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Rata Masa Tunggu</p>
                <p className="text-[9px] text-gray-400">(bulan, alumni bekerja)</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-[var(--color-primary)]/10 flex flex-col items-center justify-center text-center">
                <Briefcase className="w-5 h-5 text-[var(--color-primary)] mb-1" />
                <p className="text-2xl font-bold font-display">{bekerja.length}</p>
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Bekerja</p>
                <p className="text-[9px] text-gray-400">{totalAlumni > 0 ? Math.round((bekerja.length / totalAlumni) * 100) : 0}% alumni</p>
              </div>

              {/* Distribusi Tingkat Perusahaan (bar chart mini) */}
              <div className="col-span-2 bg-white p-4 rounded-2xl border border-[var(--color-primary)]/10">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Distribusi Tingkat Perusahaan</p>
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

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[var(--color-primary)]/10 overflow-hidden">
            <div className="overflow-x-auto">
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
                              <span className={getStatusColor(a.status_lulusan)}>{a.status_lulusan}</span>
                              <span className="text-[10px] text-gray-500">{a.tahun_lulus}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="text-[var(--color-text-main)]/80 max-w-xs truncate block">
                              {getMainLabel(a)}
                            </span>
                          </td>
                          <td className="p-4 pr-6 text-center">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleExpand(a.id_tracer); }}
                              className="p-1.5 hover:bg-gray-200/60 rounded-lg transition text-gray-400 hover:text-gray-600"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
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
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed enabled:hover:bg-gray-200 bg-gray-100 text-gray-700"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed enabled:hover:bg-gray-200 bg-gray-100 text-gray-700"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Import Modal */}
      {showImport && (
        <CsvImporter
          title="Tracer Study Alumni"
          expectedHeaders={[
            'npm_mahasiswa', 'tahun_lulus', 'status_lulusan', 'masa_tunggu_bulan',
            'instansi_pekerjaan', 'jabatan', 'tingkat_perusahaan',
            'universitas_tujuan', 'program_studi', 'bidang_usaha'
          ]}
          optionalHeaders={[
            'instansi_pekerjaan', 'jabatan', 'tingkat_perusahaan',
            'universitas_tujuan', 'program_studi', 'bidang_usaha'
          ]}
          templateCsv={`npm_mahasiswa,tahun_lulus,status_lulusan,masa_tunggu_bulan,instansi_pekerjaan,jabatan,tingkat_perusahaan,universitas_tujuan,program_studi,bidang_usaha
12318001,2022,Bekerja,3,Pertamina Geothermal Energy,Geophysicist,Multinasional,,,
12319012,2023,Studi Lanjut,2,,,,"Kyushu University","Earth Resources Engineering",
12320011,2024,Wiraswasta,5,,,,,,,"Jasa Konsultasi Geofisika"`}
          templateData={[
            { npm_mahasiswa: '12318001', tahun_lulus: 2022, status_lulusan: 'Bekerja', masa_tunggu_bulan: 3, instansi_pekerjaan: 'Pertamina Geothermal Energy', jabatan: 'Geophysicist', tingkat_perusahaan: 'Multinasional', universitas_tujuan: '', program_studi: '', bidang_usaha: '' },
            { npm_mahasiswa: '12319012', tahun_lulus: 2023, status_lulusan: 'Studi Lanjut', masa_tunggu_bulan: 2, instansi_pekerjaan: '', jabatan: '', tingkat_perusahaan: '', universitas_tujuan: 'Kyushu University', program_studi: 'Earth Resources Engineering', bidang_usaha: '' },
            { npm_mahasiswa: '12320011', tahun_lulus: 2024, status_lulusan: 'Wiraswasta', masa_tunggu_bulan: 5, instansi_pekerjaan: '', jabatan: '', tingkat_perusahaan: '', universitas_tujuan: '', program_studi: '', bidang_usaha: 'Jasa Konsultasi Geofisika' }
          ]}
          onImport={async (data) => {
            let count = 0;
            let errors = 0;
            for (const row of data) {
              const nr = Object.fromEntries(
                Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), v])
              );
              const npmVal = String(nr['npm_mahasiswa'] || nr['npm'] || '').trim();
              if (!npmVal) { errors++; continue; }
              const a: TracerStudy = {
                npm_mahasiswa: npmVal,
                tahun_lulus: Number(nr['tahun_lulus'] || new Date().getFullYear()) || new Date().getFullYear(),
                status_lulusan: (nr['status_lulusan'] || 'Bekerja') as any,
                masa_tunggu_bulan: Number(nr['masa_tunggu_bulan'] || 0) || 0,
                instansi_pekerjaan: String(nr['instansi_pekerjaan'] || '').trim() || undefined,
                jabatan: String(nr['jabatan'] || '').trim() || undefined,
                tingkat_perusahaan: (['Lokal', 'Nasional', 'Multinasional', 'Internasional'].includes(String(nr['tingkat_perusahaan'] || '').trim())
                  ? String(nr['tingkat_perusahaan']).trim() as any : undefined),
                universitas_tujuan: String(nr['universitas_tujuan'] || '').trim() || undefined,
                program_studi: String(nr['program_studi'] || '').trim() || undefined,
                bidang_usaha: String(nr['bidang_usaha'] || '').trim() || undefined
              };
              try {
                await academicService.saveTracerAlumni(a);
                count++;
              } catch {
                errors++;
              }
            }
            await onRefresh();
            if (triggerToast) {
              if (count > 0) {
                triggerToast({
                  kind: 'success',
                  title: 'Import Tracer Berhasil',
                  message: errors > 0
                    ? `${count} data berhasil diimport, ${errors} gagal.`
                    : `Berhasil menambahkan/memperbarui ${count} data tracer alumni.`
                });
              } else {
                triggerToast({
                  kind: 'error',
                  title: 'Import Gagal',
                  message: 'Tidak ada data tracer alumni valid yang dapat diimport.'
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
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Identitas */}
              <div>
                <label className="block text-xs font-semibold mb-1">Mahasiswa (Lulusan) *</label>
                <ComboboxMahasiswa
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
                  <label className="block text-xs font-semibold mb-1">Tahun Lulus *</label>
                  <input
                    type="number"
                    required
                    value={form.tahun_lulus}
                    onChange={(e) => setForm({...form, tahun_lulus: Number(e.target.value)})}
                    className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Status Lulusan *</label>
                  <select
                    value={form.status_lulusan}
                    onChange={(e) => setForm({...form, status_lulusan: e.target.value as any})}
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
                <label className="block text-xs font-semibold mb-1">Masa Tunggu (bulan) *</label>
                <input
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
                    <label className="block text-xs font-semibold mb-1">Instansi / Perusahaan</label>
                    <input
                      type="text"
                      value={form.instansi_pekerjaan || ''}
                      onChange={(e) => setForm({...form, instansi_pekerjaan: e.target.value})}
                      className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Jabatan / Posisi</label>
                      <input
                        type="text"
                        value={form.jabatan || ''}
                        onChange={(e) => setForm({...form, jabatan: e.target.value})}
                        className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Tingkat Perusahaan</label>
                      <select
                        value={form.tingkat_perusahaan || ''}
                        onChange={(e) => setForm({...form, tingkat_perusahaan: (e.target.value || undefined) as any})}
                        className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                      >
                        <option value="">-- Pilih --</option>
                        {TINGKAT_OPTIONS.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional: Studi Lanjut */}
              {form.status_lulusan === 'Studi Lanjut' && (
                <div className="border-t border-gray-100 pt-4 space-y-4">
                  <h4 className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider">Data Studi Lanjut</h4>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Universitas / Institusi Tujuan</label>
                    <input
                      type="text"
                      placeholder="Kyushu University, ITB, UI..."
                      value={form.universitas_tujuan || ''}
                      onChange={(e) => setForm({...form, universitas_tujuan: e.target.value})}
                      className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">Program Studi</label>
                    <input
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
                    <label className="block text-xs font-semibold mb-1">Bidang Usaha</label>
                    <input
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
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  className="px-4 py-2 bg-gray-100 rounded-xl text-sm font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--color-primary-light)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Menyimpan...</>
                  ) : (
                    editingAlumni ? 'Simpan Perubahan' : 'Simpan Data'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
