import React, { useState, useRef, useEffect } from 'react';
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
  Edit2,
  Building2,
  ChevronDown,
  ChevronUp,
  BookOpen,
  UserCheck,
  Calendar,
  BarChart3,
  Download,
  X
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { RiwayatMBKM, Mahasiswa, Dosen } from '../types';
import { useDebounce, useEscapeClose } from '../lib/hooks';
import { fmt } from '../lib/format';
import { downloadChartAsSvg } from '../lib/chartExport';
import { exportToExcel } from '../lib/exportUtils';
import { ToastOptions } from './Toast';
import { SkeletonTable, SkeletonCard, SkeletonChart } from './Skeleton';
import ComboboxMahasiswa from './ComboboxMahasiswa';

interface MagangTabProps {
  mbkm: RiwayatMBKM[];
  mahasiswa: Mahasiswa[];
  dosen: Dosen[];
  loading?: boolean;
  onSaveMbkm: (m: RiwayatMBKM) => void;
  onDeleteMbkm: (id: string) => void;
  onBulkImportMagang: (data: Record<string, unknown>[]) => Promise<void>;
  onRefresh: () => Promise<void>;
  activeSubTab?: string;
  triggerToast?: (options: ToastOptions) => void;
}

export default function MagangTab({
  mbkm,
  mahasiswa,
  dosen,
  loading,
  onSaveMbkm,
  onDeleteMbkm,
  onBulkImportMagang,
  onRefresh,
  triggerToast
}: MagangTabProps) {

  const [query, setQuery] = useState('');
  const searchQuery = useDebounce(query, 350);
  const [filterSemester, setFilterSemester] = useState('All');
  const [page, setPage] = useState(1);
  const tableRef = useRef<HTMLDivElement | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const ROWS_PER_PAGE = 25;

  const [showAddModal, setShowAddModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingMbkm, setEditingMbkm] = useState<RiwayatMBKM | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEscapeClose(showAddModal, () => setShowAddModal(false));
  useEscapeClose(showImport, () => setShowImport(false));

  useEffect(() => {
    if (page > 1) tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [page]);
  const [form, setForm] = useState<RiwayatMBKM>({
    npm_mahasiswa: '',
    tempat_instansi: '',
    semester: '',
    judul_topik_magang: '',
    dosen_pembimbing_lapangan: '',
    nip_dosen_pembimbing_dalam: null,
    periode_magang: ''
  });

  const totalMbkm = mbkm.length;
  const mahasiswaMagang = new Set(mbkm.filter(m => m.npm_mahasiswa).map(m => m.npm_mahasiswa)).size;
  const instansiMitra = new Set(mbkm.map(m => m.tempat_instansi)).size;
  const instansiCounts = mbkm.reduce<Record<string, number>>((acc, m) => {
    acc[m.tempat_instansi] = (acc[m.tempat_instansi] || 0) + 1;
    return acc;
  }, {});
  const topInstansi = Object.entries(instansiCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  // Ref untuk unduh grafik sebagai SVG
  const chartSemesterRef = useRef<HTMLDivElement | null>(null);

  const filteredMbkm = mbkm.filter(m => {
    const mhs = mahasiswa.find(s => s.npm === m.npm_mahasiswa);
    const mhsName = mhs ? mhs.nama.toLowerCase() : '';
    const instansi = m.tempat_instansi.toLowerCase();
    const matchesSearch = mhsName.includes(searchQuery.toLowerCase()) ||
                          instansi.includes(searchQuery.toLowerCase()) ||
                          m.npm_mahasiswa.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSemester = filterSemester === 'All' || m.semester === filterSemester;
    return matchesSearch && matchesSemester;
  });

  const totalPages = Math.ceil(filteredMbkm.length / ROWS_PER_PAGE);
  const safePage = Math.min(page, Math.max(1, totalPages));
  const paginatedMbkm = filteredMbkm.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const handleEditClick = (m: RiwayatMBKM) => {
    setEditingMbkm(m);
    setForm({
      npm_mahasiswa: m.npm_mahasiswa,
      tempat_instansi: m.tempat_instansi,
      semester: m.semester,
      judul_topik_magang: m.judul_topik_magang || '',
      dosen_pembimbing_lapangan: m.dosen_pembimbing_lapangan || '',
      nip_dosen_pembimbing_dalam: m.nip_dosen_pembimbing_dalam || null,
      periode_magang: m.periode_magang || ''
    });
    setShowAddModal(true);
  };

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.npm_mahasiswa || !form.tempat_instansi || !form.semester) {
      if (triggerToast) {
        triggerToast({
          kind: 'error',
          title: 'Validasi Gagal',
          message: 'Mahasiswa, tempat instansi, dan semester harus diisi.'
        });
      }
      return;
    }

    const data: RiwayatMBKM = editingMbkm
      ? { ...form, id_mbkm: editingMbkm.id_mbkm }
      : form;

    setIsSubmitting(true);
    try {
      await onSaveMbkm(data);
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
      tempat_instansi: '',
      semester: '',
      judul_topik_magang: '',
      dosen_pembimbing_lapangan: '',
      nip_dosen_pembimbing_dalam: null,
      periode_magang: ''
    });
    setEditingMbkm(null);
  };

  const semesterOptions = Array.from(new Set(mbkm.map(m => m.semester))).sort();
  const reversedSemesters = [...semesterOptions].reverse();

  // Rekap per semester
const semesterInstansiMap = mbkm.reduce((acc: Record<string, Record<string, number>>, m) => {
    if (!acc[m.semester]) acc[m.semester] = {};
    acc[m.semester][m.tempat_instansi] = (acc[m.semester][m.tempat_instansi] || 0) + 1;
    return acc;
  }, {});
  const semesterChartData = reversedSemesters.map(sem => ({
    semester: sem,
    jumlah: Object.values(semesterInstansiMap[sem] || {}).reduce((sum, c) => sum + c, 0),
    instansi: Object.keys(semesterInstansiMap[sem] || {}).length
  }));

  const handleExportMbkm = () => {
    const dataToExport = mbkm.map(m => {
      const dospemDalam = m.nip_dosen_pembimbing_dalam
        ? dosen.find(d => d.nip === m.nip_dosen_pembimbing_dalam)
        : null;
      return {
        'NPM': m.npm_mahasiswa,
        'NAMA INSTANSI TEMPAT MAGANG': m.tempat_instansi,
        'SEMESTER': m.semester,
        'JUDUL TOPIK MAGANG': m.judul_topik_magang || '',
        'DOSEN PEMBIMBING LAPANGAN': m.dosen_pembimbing_lapangan || '',
        'DOSEN PEMBIMBING DALAM': dospemDalam ? dospemDalam.nama : '',
        'PERIODE MAGANG': m.periode_magang || ''
      };
    });
    exportToExcel(dataToExport, 'data_magang_mahasiswa', 'Magang');
    if (triggerToast) {
      triggerToast({
        kind: 'success',
        title: 'Ekspor Berhasil',
        message: `Berhasil mengunduh ${dataToExport.length} data magang ke Excel.`
      });
    }
  };

  const toggleExpand = (id: string | undefined) => {
    if (!id) return;
    setExpandedId(prev => prev === id ? null : id);
  };

  const getDospemDalamName = (nip?: string | null): string | null => {
    if (!nip) return null;
    const d = dosen.find(d => d.nip === nip);
    return d ? d.nama : null;
  };

  const detailItems = (m: RiwayatMBKM) => {
    const items: { icon: React.ReactNode; label: string; value: React.ReactNode }[] = [];

    if (m.semester) {
      items.push({
        icon: <Calendar className="w-3.5 h-3.5 shrink-0" />,
        label: 'Semester',
        value: m.semester
      });
    }
    if (m.judul_topik_magang) {
      items.push({
        icon: <BookOpen className="w-3.5 h-3.5 shrink-0" />,
        label: 'Topik',
        value: m.judul_topik_magang
      });
    }
    if (m.dosen_pembimbing_lapangan) {
      items.push({
        icon: <UserCheck className="w-3.5 h-3.5 shrink-0" />,
        label: 'Dospem Lapangan',
        value: m.dosen_pembimbing_lapangan
      });
    }
    const dospemDalam = getDospemDalamName(m.nip_dosen_pembimbing_dalam);
    if (dospemDalam) {
      items.push({
        icon: <UserCheck className="w-3.5 h-3.5 shrink-0" />,
        label: 'Dospem UNPAD',
        value: dospemDalam
      });
    }
    if (m.periode_magang) {
      items.push({
        icon: <Calendar className="w-3.5 h-3.5 shrink-0" />,
        label: 'Periode',
        value: m.periode_magang
      });
    }

    return items;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]/75">MBKM / Kampus Merdeka</p>
          <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[var(--color-text-main)]">Magang & MBKM</h2>
          <p className="text-xs text-[var(--color-text-main)]/55">Rekapitulasi aktivitas magang mahasiswa</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
          <Button
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-none"
            icon={<Plus className="w-4 h-4" />}
          >
            Catat Magang
          </Button>
          <DataActions
            onImportCsv={() => setShowImport(true)}
            onImportExcel={() => setShowImport(true)}
            onExportExcel={handleExportMbkm}
          />
        </div>
      </div>

      {/* Summary & Rekap */}
      {loading ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <SkeletonChart />
        </>
      ) : totalMbkm === 0 ? (
        <div className="bg-white p-6 sm:p-12 rounded-2xl border border-[var(--color-primary)]/10 text-center">
          <Building2 className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-[var(--color-primary)]/20 mb-3" />
          <h3 className="font-bold text-sm text-[var(--color-text-main)]/50">Belum ada data magang</h3>
          <p className="text-xs text-[var(--color-text-main)]/30 mt-1">Klik "Catat Magang" untuk menambahkan data pertama</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-3 gap-px bg-gray-100">
              <div className="bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Magang</p>
                <p className="text-2xl font-bold font-display mt-1 text-[var(--color-text-main)]">{fmt(totalMbkm)}</p>
              </div>
              <div className="bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Mahasiswa Peserta</p>
                <p className="text-2xl font-bold font-display mt-1 text-[var(--color-primary)]">{fmt(mahasiswaMagang)}</p>
              </div>
              <div className="bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Instansi Mitra</p>
                <p className="text-2xl font-bold font-display mt-1 text-[var(--color-primary)]">{fmt(instansiMitra)}</p>
              </div>
            </div>
            {topInstansi.length > 0 && (
              <div className="px-4 py-2.5 border-t border-gray-100 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                <span className="font-bold uppercase tracking-wider text-gray-400">Top Instansi:</span>
                {topInstansi.map(([instansi, count]) => (
                  <span key={instansi} className="inline-flex items-center gap-1.5 font-medium text-gray-600">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                    {instansi} <b className="text-[var(--color-text-main)]">{count}</b>
                  </span>
                ))}
              </div>
            )}
          </div>

          {semesterChartData.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-[var(--color-primary)]/10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[var(--color-primary)]" />
                  <h3 className="font-bold text-sm text-[var(--color-text-main)]">Rekap Magang per Semester</h3>
                </div>
                <IconButton
                  label="Unduh grafik (SVG)"
                  onClick={() => downloadChartAsSvg(chartSemesterRef.current, 'rekap_magang_per_semester')}
                  icon={<Download className="w-4 h-4" />}
                />
              </div>
              <div className="h-44" ref={chartSemesterRef}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={semesterChartData} barSize={32} margin={{ top: 5, right: 20, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-primary)" strokeOpacity={0.08} />
                    <XAxis dataKey="semester" tick={{ fontSize: 10 }} angle={0} height={60} tickMargin={8} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip
                      cursor={{ fill: 'var(--color-primary)', opacity: 0.05 }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white rounded-lg border border-[var(--color-primary)]/20 px-3 py-2 text-xs shadow-sm">
                            <p className="font-semibold text-[var(--color-text-main)] mb-1">{label}</p>
                            <p className="text-[var(--color-text-main)]/70">Mahasiswa: <span className="font-semibold text-[var(--color-primary)]">{data.jumlah}</span></p>
                            <p className="text-[var(--color-text-main)]/70">Instansi: <span className="font-semibold text-[var(--color-primary)]">{data.instansi}</span></p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="jumlah" name="Mahasiswa" radius={[4, 4, 0, 0]} fill="var(--color-primary)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {showImport && (
        <CsvImporter
          title="Riwayat Magang"
          expectedHeaders={[ 'NPM', 'NAMA INSTANSI TEMPAT MAGANG', 'SEMESTER' ]}
          optionalHeaders={[ 'npm_mahasiswa', 'tempat_instansi', 'semester', 'NO', 'NAMA LENGKAP', 'JUDUL TOPIK MAGANG', 'DOSEN PEMBIMBING LAPANGAN', 'DOSEN PEMBIMBING DALAM', 'PERIODE MAGANG', 'judul_topik_magang', 'dosen_pembimbing_lapangan', 'nip_dosen_pembimbing_dalam', 'periode_magang' ]}
          templateCsv={`NPM,NAMA INSTANSI TEMPAT MAGANG,SEMESTER,JUDUL TOPIK MAGANG,DOSEN PEMBIMBING LAPANGAN,DOSEN PEMBIMBING DALAM,PERIODE MAGANG
31242001,PT Geo Teknologi,Genap 2025/2026,Analisis Data,Bapak Andi,Dr. Maria Ulfah,Jan-Jun 2025`}
          templateData={[
            { 'NPM': '31242001', 'NAMA INSTANSI TEMPAT MAGANG': 'PT Geo Teknologi', 'SEMESTER': 'Genap 2025/2026', 'JUDUL TOPIK MAGANG': 'Analisis Data', 'DOSEN PEMBIMBING LAPANGAN': 'Bapak Andi', 'DOSEN PEMBIMBING DALAM': 'Dr. Maria Ulfah, S.Si., M.Si.', 'PERIODE MAGANG': 'Jan-Jun 2025' }
          ]}
          onImport={onBulkImportMagang}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-[var(--color-primary)]/10 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 bg-[var(--color-primary)]/5 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-main)]/40" />
            <input
              type="text"
              placeholder="Cari mahasiswa atau instansi magang..."
              aria-label="Cari data magang"
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
            value={filterSemester}
            onChange={(e) => { setFilterSemester(e.target.value); setPage(1); setExpandedId(null); }}
            className="p-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)] sm:w-48"
          >
            <option value="All">Semua Semester</option>
            {semesterOptions.map(sem => (
              <option key={sem} value={sem}>{sem}</option>
            ))}
          </select>
        </div>

        {/* Table List */}
        {loading ? (
          <SkeletonTable rows={10} cols={5} />
        ) : (
          <>
            <div className="overflow-x-auto" ref={tableRef}>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-[var(--color-text-main)]/60 text-xs font-bold uppercase">
                    <th className="p-4 pl-6 w-10">#</th>
                    <th className="p-4">Mahasiswa</th>
                    <th className="p-4">Semester</th>
                    <th className="p-4">Instansi Magang</th>
                    <th className="p-4 pr-6 text-center w-14"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {paginatedMbkm.map((m, idx) => {
                    const mhs = mahasiswa.find(s => s.npm === m.npm_mahasiswa);
                    const isExpanded = expandedId === m.id_mbkm;
                    const details = detailItems(m);

                    return (
                      <React.Fragment key={m.id_mbkm}>
                        <tr
                          className={`hover:bg-gray-50/50 transition cursor-pointer ${isExpanded ? 'bg-[var(--color-primary)]/5' : ''}`}
                          onClick={() => toggleExpand(m.id_mbkm)}
                        >
                          <td className="p-4 pl-6 text-xs text-[var(--color-text-main)]/40 font-mono">
                            {(safePage - 1) * ROWS_PER_PAGE + idx + 1}
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-[var(--color-text-main)]">{mhs ? mhs.nama : 'Unknown'}</div>
                            <div className="text-xs font-mono text-[var(--color-text-main)]/50">{m.npm_mahasiswa}</div>
                          </td>
                          <td className="p-4">
                            <StatusChip status={m.semester} tone="neutral" />
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5 font-bold text-sm">
                              <Building2 className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
                              <span>{m.tempat_instansi}</span>
                            </div>
                          </td>
                          <td className="p-4 pr-6 text-center">
                            <IconButton
                              label={isExpanded ? 'Tutup detail' : 'Lihat detail'}
                              onClick={(e) => { e.stopPropagation(); toggleExpand(m.id_mbkm); }}
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
                                      <span className="text-xs text-[var(--color-text-main)]/50 font-medium min-w-[95px]">{item.label}</span>
                                      <span className="text-[var(--color-text-main)] font-medium">{item.value}</span>
                                    </div>
                                  ))}
                                </div>

                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--color-primary)]/10">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleEditClick(m); }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" /> Edit
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); m.id_mbkm && onDeleteMbkm(m.id_mbkm); }}
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
                  {filteredMbkm.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-sm text-gray-400">
                        Tidak ada data magang yang sesuai.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredMbkm.length > ROWS_PER_PAGE && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50/30">
                <span className="text-xs text-gray-500">
                  Menampilkan {(safePage - 1) * ROWS_PER_PAGE + 1}-{Math.min(safePage * ROWS_PER_PAGE, filteredMbkm.length)} dari {filteredMbkm.length} data
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
                {editingMbkm ? 'Edit Magang' : 'Catat Magang Baru'}
              </h3>
              <button onClick={() => { setShowAddModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Required Fields */}
              <div>
                <h4 className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider mb-3">Data Wajib</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label htmlFor="magang-mahasiswa" className="block text-xs font-semibold mb-1">Mahasiswa <span className="text-rose-500">*</span></label>
                    <ComboboxMahasiswa
                      id="magang-mahasiswa"
                      mahasiswa={mahasiswa}
                      value={form.npm_mahasiswa}
                      onChange={(npm) => setForm({...form, npm_mahasiswa: npm})}
                      placeholder="Cari nama/NPM mahasiswa..."
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="magang-tempat" className="block text-xs font-semibold mb-1">Tempat / Instansi Magang <span className="text-rose-500">*</span></label>
                    <input
                      id="magang-tempat"
                      type="text"
                      required
                      placeholder="Pertamina Geothermal Energy, BMKG, Chevron..."
                      value={form.tempat_instansi}
                      onChange={(e) => setForm({...form, tempat_instansi: e.target.value})}
                      className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="magang-semester" className="block text-xs font-semibold mb-1">Semester Pelaksanaan <span className="text-rose-500">*</span></label>
                    <input
                      id="magang-semester"
                      type="text"
                      required
                      placeholder="Genap 2025/2026"
                      value={form.semester}
                      onChange={(e) => setForm({...form, semester: e.target.value})}
                      className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>
              </div>

              {/* Optional Fields */}
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-xs font-bold text-[var(--color-muted)] uppercase tracking-wider mb-3">Data Tambahan (Opsional)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label htmlFor="magang-judul" className="block text-xs font-semibold mb-1">Judul Topik Magang</label>
                    <input
                      id="magang-judul"
                      type="text"
                      placeholder="Analisis Petrofisika dan Penentuan Net Pay..."
                      value={form.judul_topik_magang || ''}
                      onChange={(e) => setForm({...form, judul_topik_magang: e.target.value})}
                      className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>

                  <div>
                    <label htmlFor="magang-dpl" className="block text-xs font-semibold mb-1">Dosen Pembimbing Lapangan</label>
                    <input
                      id="magang-dpl"
                      type="text"
                      placeholder="Nama + instansi, misal: Bapak Andi (PGE)"
                      value={form.dosen_pembimbing_lapangan || ''}
                      onChange={(e) => setForm({...form, dosen_pembimbing_lapangan: e.target.value})}
                      className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>

                  <div>
                    <label htmlFor="magang-dpd" className="block text-xs font-semibold mb-1">Dosen Pembimbing Dalam (UNPAD)</label>
                    <select
                      id="magang-dpd"
                      value={form.nip_dosen_pembimbing_dalam || ''}
                      onChange={(e) => setForm({...form, nip_dosen_pembimbing_dalam: e.target.value || null})}
                      className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                    >
                      <option value="">-- Belum Ditentukan --</option>
                      {dosen.map(d => (
                        <option key={d.nip} value={d.nip}>{d.nama} ({d.nip})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="magang-periode" className="block text-xs font-semibold mb-1">Periode Magang</label>
                    <input
                      id="magang-periode"
                      type="text"
                      placeholder="6 Juli - 6 Agustus 2026"
                      value={form.periode_magang || ''}
                      onChange={(e) => setForm({...form, periode_magang: e.target.value})}
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
                    editingMbkm ? 'Simpan Perubahan' : 'Simpan Data Magang'
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
