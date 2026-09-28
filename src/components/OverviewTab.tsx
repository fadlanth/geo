import React, { useState } from 'react';
import { 
  Users, 
  Award, 
  GraduationCap, 
  Sparkles,
  BookOpen,
  ArrowUpRight,
  Briefcase,
  ChevronLeft,
  X
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { Mahasiswa, Dosen, Prestasi, TracerStudy, RiwayatMBKM } from '../types';
import { useEscapeClose } from '../lib/hooks';
import { fmt } from '../lib/format';
import { renderDonutLabel, DonutCenterTotal } from '../lib/chartUtils';
import { SkeletonCard, SkeletonChart } from './Skeleton';
import StatusChip from './StatusChip';
import IconButton from './IconButton';

interface AngkatanRow {
  angkatan: number;
  total: number;
  'Regulasi Akademik': number;
  Lulus: number;
  'Alih Prodi': number;
  'Undur Diri': number;
}

interface ChartAngkatanRow {
  name: string;
  'Regulasi Akademik': number;
  Lulus: number;
  'Alih Prodi': number;
  'Undur Diri': number;
}

interface OverviewTabProps {
  mahasiswa: Mahasiswa[];
  dosen: Dosen[];
  prestasi: Prestasi[];
  alumni: TracerStudy[];
  mbkm: RiwayatMBKM[];
  loading?: boolean;
  setActiveTab: (tab: string) => void;
  activeSubTab?: string;
}

export default function OverviewTab({
  mahasiswa,
  dosen,
  prestasi,
  alumni,
  mbkm,
  loading,
  setActiveTab
}: OverviewTabProps) {

  // 1. Calculate Stats
  const totalMhs = mahasiswa.length;
  const mhsRegulasi = mahasiswa.filter(m => m.status === 'Regulasi Akademik').length;
  const mhsLulus = mahasiswa.filter(m => m.status === 'Lulus').length;
  const pctRegulasi = totalMhs > 0 ? Math.round((mhsRegulasi / totalMhs) * 100) : 0;

  const totalDosenAll = dosen.length;
  const totalDosenWaliOnly = dosen.filter(d => d.is_dosen_wali !== false).length;
  const rasioMhsPerDosen = totalDosenWaliOnly > 0 ? (totalMhs / totalDosenWaliOnly).toFixed(1) : '0';
  
  const totalPrestasi = prestasi.length;
  const juara1Count = prestasi.filter(p => p.juara_ke === 1).length;
  const totalNasionalIntl = prestasi.filter(p => ['Nasional', 'Internasional'].includes(p.tingkat)).length;

  const totalAlumni = alumni.length;
  const alumniBekerja = alumni.filter(a => a.status_lulusan === 'Bekerja').length;
  const alumniKerjaCepat = alumni.filter(a => a.status_lulusan === 'Bekerja' && a.masa_tunggu_bulan <= 6).length;
  const pctBekerja = totalAlumni > 0 ? Math.round((alumniBekerja / totalAlumni) * 100) : 0;
  const avgWaktuTunggu = alumniBekerja > 0
    ? (alumni.filter(a => a.status_lulusan === 'Bekerja').reduce((acc, a) => acc + a.masa_tunggu_bulan, 0) / alumniBekerja).toFixed(1)
    : '0';

  const pctMbkm = mhsRegulasi > 0 ? Math.round((mbkm.length / mhsRegulasi) * 100) : 0;
  // Instansi unik penempatan magang (untuk label "Total Instansi")
  const totalInstansi = new Set(mbkm.map(m => m.tempat_instansi).filter(Boolean)).size;
  const countMagang = mbkm.filter(m => (m.jenis_kegiatan || 'Magang Industri') === 'Magang Industri').length;
  const countPenelitian = mbkm.filter(m => m.jenis_kegiatan === 'Penelitian Dosen').length;

  // Modal state for per-angkatan detail
  const [showAngkatanDetail, setShowAngkatanDetail] = useState(false);
  // Drill-down: klik sel angka -> tampilkan daftar mahasiswa per angkatan / status
  const [drillFilter, setDrillFilter] = useState<{ angkatan?: number; status?: string } | null>(null);

  useEscapeClose(showAngkatanDetail, () => setShowAngkatanDetail(false));

  // Map NIP -> nama dosen (resolve dosen wali pada drill-down)
  const dosenMap = new Map(dosen.map(d => [d.nip, d.nama]));

  // Mahasiswa yang ditampilkan pada drill-down
  const drillList = drillFilter
    ? mahasiswa
        .filter(m =>
          (!drillFilter.angkatan || m.angkatan === drillFilter.angkatan) &&
          (!drillFilter.status || m.status === drillFilter.status)
        )
        .sort((a, b) => a.nama.localeCompare(b.nama))
    : [];

  // Tombol sel angka (status / total-baris / total-kolom) pada tabel ringkasan:
  // klik angka untuk filter daftar mahasiswa per individu.
  const CountCell = ({ angkatan, status, count, chipClass, title }: {
    angkatan?: number; status?: string; count: number; chipClass: string; title: string;
  }) => {
    if (!count) return <span className={`chip ${chipClass}`}>{count}</span>;
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setDrillFilter({ angkatan, status }); setShowAngkatanDetail(true); }}
        className={`chip ${chipClass} cursor-pointer hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]`}
        title={title}
      >
        {count}
      </button>
    );
  };

  // Per-angkatan detail data
  const angkatanDetail = mahasiswa.reduce<Record<number, AngkatanRow>>((acc, m) => {
    if (!acc[m.angkatan]) acc[m.angkatan] = {
      angkatan: m.angkatan,
      total: 0,
      'Regulasi Akademik': 0,
      Lulus: 0,
      'Alih Prodi': 0,
      'Undur Diri': 0
    };
    acc[m.angkatan].total++;
    acc[m.angkatan][m.status]++;
    return acc;
  }, {});
  const angkatanDetailData = Object.values(angkatanDetail).sort((a, b) => b.angkatan - a.angkatan);

  // Per-angkatan counts for Regulasi Akademik only
  const regulasiPerAngkatan = mahasiswa
    .filter(m => m.status === 'Regulasi Akademik')
    .reduce<Record<number, number>>((acc, m) => {
      acc[m.angkatan] = (acc[m.angkatan] || 0) + 1;
      return acc;
    }, {});
  const regulasiAngkatanList = Object.keys(regulasiPerAngkatan)
    .map(Number)
    .sort((a, b) => b - a);

  // 2. Data Rekap Angkatan (Bar Chart Stacked)
  const angkatanMap = mahasiswa.reduce<Record<number, ChartAngkatanRow>>((acc, m) => {
    if (!acc[m.angkatan]) acc[m.angkatan] = { name: m.angkatan.toString(), 'Regulasi Akademik': 0, Lulus: 0, 'Alih Prodi': 0, 'Undur Diri': 0 };
    if (m.status === 'Regulasi Akademik') acc[m.angkatan]['Regulasi Akademik']++;
    else if (m.status === 'Lulus') acc[m.angkatan].Lulus++;
    else if (m.status === 'Alih Prodi') acc[m.angkatan]['Alih Prodi']++;
    else acc[m.angkatan]['Undur Diri']++;
    return acc;
  }, {});
  
  const angkatanChartData = Object.values(angkatanMap).sort((a, b) => a.name.localeCompare(b.name));

  // 3. Tracer Study Status Lulusan (Pie Chart)
  const statusLulusanMap = alumni.reduce<Record<string, number>>((acc, a) => {
    acc[a.status_lulusan] = (acc[a.status_lulusan] || 0) + 1;
    return acc;
  }, {});

  const statusColors: { [key: string]: string } = {
    'Bekerja': 'var(--color-primary)',
    'Studi Lanjut': 'var(--color-primary-dark)',
    'Wiraswasta': 'var(--color-warning)',
    'Belum Bekerja': 'var(--color-muted)'
  };

  const statusChartData = Object.keys(statusLulusanMap).map(key => ({
    name: key,
    Jumlah: statusLulusanMap[key],
    color: statusColors[key] || '#94a3b8'
  }));

  const totalMbkm = mbkm.length;

  return (
    <div className="space-y-6">
      {/* Welcome Hero Banner */}
      <div className="bg-[var(--color-primary)] text-[var(--color-base)] p-6 sm:p-8 rounded-3xl relative overflow-hidden shadow-xl border border-[var(--color-primary)]/20">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-64 h-64 rounded-full bg-[var(--color-primary-light)]/40 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 rounded-full bg-[var(--color-primary-soft)]/25 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)] rounded-full text-xs font-semibold mb-4 backdrop-blur-sm border border-[var(--color-primary-muted)]">
              <Sparkles className="w-3.5 h-3.5" />
              Sistem Informasi Akademik Geofisika
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight mb-2">
              Dashboard Geofisika
            </h2>
            <p className="text-sm sm:text-base text-[var(--color-base)]/80 font-normal leading-relaxed">
              Geofisika UNPAD: Dari Bumi untuk Negeri
            </p>
          </div>


        </div>
      </div>

      {/* Bento Grid Analytics Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div 
            role="button"
            tabIndex={0}
            onClick={() => { setShowAngkatanDetail(true); setDrillFilter(null); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowAngkatanDetail(true);
                setDrillFilter(null);
              }
            }}
            aria-label="Lihat ringkasan detail mahasiswa per angkatan"
            className="bg-white p-5 rounded-2xl border border-[var(--color-primary)]/10 shadow-xs hover:shadow-md transition duration-200 cursor-pointer hover:border-[var(--color-primary)]/30 relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="p-3 bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)] rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <StatusChip status={`${pctRegulasi}%`} tone="blue" count />
            </div>
             <p className="text-xs text-[var(--color-text-main)]/60 font-medium uppercase tracking-wider">Mahasiswa Aktif</p>
            <p className="text-3xl font-bold font-display text-[var(--color-text-main)] mt-1">{fmt(mhsRegulasi)}</p>
            <p className="text-xs text-[var(--color-text-main)]/50 mt-1">Total {fmt(totalMhs)} mahasiswa</p>
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--color-text-main)]/50 border-t border-gray-100 pt-3">
              {regulasiAngkatanList.map(angk => (
                <span key={angk}>{angk}: <b>{regulasiPerAngkatan[angk]}</b></span>
              ))}
            </div>
          </div>

          {/* Stat 2: MBKM / Magang */}
          <div className="bg-white p-5 rounded-2xl border border-[var(--color-primary)]/10 shadow-xs hover:shadow-md transition duration-200">
            <div className="flex justify-between items-start mb-3">
              <div className="p-3 bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)] rounded-xl">
                <Briefcase className="w-5 h-5" />
              </div>
              <StatusChip status={`${totalInstansi} Instansi/Lab`} tone="neutral" count />
            </div>
            <p className="text-xs text-[var(--color-text-main)]/60 font-medium uppercase tracking-wider">Kegiatan Luar Prodi</p>
            <p className="text-3xl font-bold font-display text-[var(--color-text-main)] mt-1">{fmt(totalMbkm)}</p>
            <p className="text-xs text-[var(--color-text-main)]/50 mt-1">{countMagang} magang · {countPenelitian} penelitian dosen</p>
            <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-text-main)]/50 border-t border-gray-100 pt-3">
              <button onClick={() => setActiveTab('mbkm')} className="text-[var(--color-primary)] hover:underline flex items-center gap-1 font-semibold">
                Lihat Detail <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Stat 3: Achievement */}
          <div className="bg-white p-5 rounded-2xl border border-[var(--color-primary)]/10 shadow-xs hover:shadow-md transition duration-200">
            <div className="flex justify-between items-start mb-3">
              <div className="p-3 bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)] rounded-xl">
                <Award className="w-5 h-5" />
              </div>
              <StatusChip status={`${juara1Count} Juara 1`} tone="gold" count />
            </div>
            <p className="text-xs text-[var(--color-text-main)]/60 font-medium uppercase tracking-wider">Prestasi Mahasiswa</p>
            <p className="text-3xl font-bold font-display text-[var(--color-text-main)] mt-1">{fmt(totalPrestasi)}</p>
            <p className="text-xs text-[var(--color-text-main)]/50 mt-1">{fmt(totalNasionalIntl)} di tingkat Nasional/Internasional</p>
            <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-text-main)]/50 border-t border-gray-100 pt-3">
              <button onClick={() => setActiveTab('prestasi')} className="text-[var(--color-primary)] hover:underline flex items-center gap-1 font-semibold">
                Lihat Data <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Stat 4: Tracer Alumni */}
          <div className="bg-white p-5 rounded-2xl border border-[var(--color-primary)]/10 shadow-xs hover:shadow-md transition duration-200">
            <div className="flex justify-between items-start mb-3">
              <div className="p-3 bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)] rounded-xl">
                <GraduationCap className="w-5 h-5" />
              </div>
              <StatusChip status={`${totalAlumni > 0 ? Math.round((alumniBekerja/totalAlumni)*100) : 0}% Kerja`} tone="green" count />
            </div>
            <p className="text-xs text-[var(--color-text-main)]/60 font-medium uppercase tracking-wider">Alumni Terlacak</p>
            <p className="text-3xl font-bold font-display text-[var(--color-text-main)] mt-1">{fmt(totalAlumni)}</p>
            <div className="mt-1 flex items-center gap-2 text-xs">
              <StatusChip status={`${pctBekerja}% Bekerja`} tone="green" />
              <span className="text-[var(--color-text-main)]/50">rata-rata {avgWaktuTunggu} bln tunggu</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-[var(--color-text-main)]/50 border-t border-gray-100 pt-3">
              <span>Kerja 0–6 Bln: <b className="text-[var(--color-success)]">{alumniKerjaCepat} org</b></span>
            </div>
          </div>
        </div>
      )}

      {/* Main Charts Row */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Rekap Mahasiswa per Angkatan */}
          <div className="bg-white p-6 rounded-2xl border border-[var(--color-primary)]/10 shadow-xs">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-display font-bold text-base text-[var(--color-text-main)]">Rekapitulasi Mahasiswa per Angkatan</h3>
                <p className="text-xs text-[var(--color-text-main)]/50">{fmt(totalMhs)} total · {fmt(mhsRegulasi)} aktif ({pctRegulasi}%) · {fmt(mhsLulus)} lulus</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setActiveTab('mahasiswa')} className="p-2 bg-[var(--color-primary)]/5 hover:bg-[var(--color-primary)]/10 rounded-lg text-[var(--color-primary)] transition">
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="h-64 w-full">
              {angkatanChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={angkatanChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-main)' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--color-text-main)' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid var(--color-primary)', fontSize: '12px' }}
                      cursor={{ fill: 'var(--color-primary)', opacity: 0.05 }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="Regulasi Akademik" stackId="a" fill="var(--color-primary)" radius={[0, 0, 0, 0]} barSize={36} />
                    <Bar dataKey="Lulus" stackId="a" fill="var(--color-success)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Alih Prodi" stackId="a" fill="var(--color-warning)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Undur Diri" stackId="a" fill="var(--color-muted)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-gray-400">
                  Belum ada data mahasiswa.
                </div>
              )}
            </div>
          </div>

          {/* Chart 2: Status Tracer Alumni */}
          <div className="bg-white p-6 rounded-2xl border border-[var(--color-primary)]/10 shadow-xs">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-display font-bold text-base text-[var(--color-text-main)]">Status Kelulusan Alumni</h3>
                <p className="text-xs text-[var(--color-text-main)]/50">{pctBekerja}% bekerja · rata-rata tunggu {avgWaktuTunggu} bulan · {alumniKerjaCepat} kerja &lt; 6 bln</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setActiveTab('tracer')} className="p-2 bg-[var(--color-primary)]/5 hover:bg-[var(--color-primary)]/10 rounded-lg text-[var(--color-primary)] transition">
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="h-64 w-full">
              {statusChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="Jumlah"
                      isAnimationActive={false}
                      label={renderDonutLabel(statusChartData.map(d => d.color))}
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <DonutCenterTotal value={fmt(totalAlumni)} unit="alumni" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid var(--color-primary)', fontSize: '12px' }}
                    />
                    <Legend 
                      layout="horizontal" 
                      verticalAlign="bottom" 
                      align="center"
                      iconSize={8}
                      iconType="circle"
                      wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-gray-400">
                  Belum ada data tracer alumni.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Per Angkatan */}
      {showAngkatanDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowAngkatanDetail(false)}>
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <div>
                <h3 className="font-display font-extrabold text-[var(--color-text-main)] text-lg">
                  {drillFilter?.angkatan
                    ? `Mahasiswa Angkatan ${drillFilter.angkatan}`
                    : (drillFilter
                        ? 'Mahasiswa — Semua Angkatan'
                        : 'Detail Mahasiswa per Angkatan')}
                </h3>
                <p className="text-xs text-[var(--color-text-main)]/50 mt-0.5">
                  {drillFilter?.status
                    ? `Status: ${drillFilter.status} (${drillList.length} orang)`
                    : (drillFilter
                        ? `${drillList.length} mahasiswa`
                        : 'Rekapitulasi status akademik berdasarkan angkatan masuk')}
                </p>
              </div>
              {drillFilter ? (
                <IconButton
                  label="Kembali ke ringkasan"
                  onClick={() => setDrillFilter(null)}
                  icon={<ChevronLeft className="w-5 h-5" />}
                />
              ) : (
                <IconButton
                  label="Tutup"
                  onClick={() => setShowAngkatanDetail(false)}
                  icon={<X className="w-5 h-5" />}
                />
              )}
            </div>
            <div className="overflow-y-auto flex-1 mt-4">
              {drillFilter ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-xs font-bold font-display uppercase tracking-wider text-[var(--color-text-main)]/60 border-b border-gray-100">
                          <th className="p-3 pl-0">NPM</th>
                          <th className="p-3">Nama</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 pr-0">Dosen Wali</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {drillList.map((m: Mahasiswa) => (
                          <tr key={m.npm} className="hover:bg-gray-50/50 transition">
                            <td className="p-3 pl-0 font-mono text-[var(--color-text-main)]">{m.npm}</td>
                            <td className="p-3 font-bold text-[var(--color-text-main)]">{m.nama}</td>
                            <td className="p-3">
                              <StatusChip status={m.status} />
                            </td>
                            <td className="p-3 pr-0 text-[var(--color-text-main)]/70">
                              {m.nip_dosen_wali ? (dosenMap.get(m.nip_dosen_wali) || m.nip_dosen_wali) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {drillList.length === 0 && (
                    <div className="text-center text-xs text-gray-400 mt-4">
                      Tidak ada data mahasiswa pada filter ini.
                    </div>
                  )}
                </>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-xs font-bold font-display uppercase tracking-wider text-[var(--color-text-main)]/60 border-b border-gray-100">
                      <th className="p-3 pl-0">Angkatan</th>
                      <th className="p-3">Total</th>
                      <th className="p-3">Regulasi Akademik</th>
                      <th className="p-3">Lulus</th>
                      <th className="p-3">Alih Prodi</th>
                      <th className="p-3 pr-0">Undur Diri</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm">
                    {angkatanDetailData.map((row) => (
                      <tr key={row.angkatan} className="hover:bg-gray-50/50 transition">
                        <td className="p-3 pl-0 font-bold text-[var(--color-text-main)]">
                          <button
                            onClick={(e) => { e.stopPropagation(); setDrillFilter({ angkatan: row.angkatan }); }}
                            className="text-[var(--color-text-main)] hover:text-[var(--color-primary)] hover:underline text-left"
                            title={`Lihat seluruh mahasiswa angkatan ${row.angkatan}`}
                          >
                            {row.angkatan}
                          </button>
                        </td>
                        <td className="p-3 font-bold">
                          <CountCell angkatan={row.angkatan} count={row.total} chipClass="status-neutral" title={`Lihat seluruh mahasiswa angkatan ${row.angkatan}`} />
                        </td>
                        <td className="p-3"><CountCell angkatan={row.angkatan} status="Regulasi Akademik" count={row['Regulasi Akademik']} chipClass="status-regulasi" title={`Mahasiswa Regulasi Akademik angkatan ${row.angkatan}`} /></td>
                        <td className="p-3"><CountCell angkatan={row.angkatan} status="Lulus" count={row.Lulus} chipClass="status-lulus" title={`Mahasiswa Lulus angkatan ${row.angkatan}`} /></td>
                        <td className="p-3"><CountCell angkatan={row.angkatan} status="Alih Prodi" count={row['Alih Prodi']} chipClass="status-alih" title={`Mahasiswa Alih Prodi angkatan ${row.angkatan}`} /></td>
                        <td className="p-3 pr-0"><CountCell angkatan={row.angkatan} status="Undur Diri" count={row['Undur Diri']} chipClass="status-undur" title={`Mahasiswa Undur Diri angkatan ${row.angkatan}`} /></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 text-sm font-bold text-[var(--color-text-main)]">
                      <td className="p-3 pl-0">Total</td>
                      <td className="p-3"><CountCell count={angkatanDetailData.reduce((s, r) => s + r.total, 0)} chipClass="status-neutral" title="Lihat seluruh mahasiswa semua angkatan" /></td>
                      <td className="p-3"><CountCell status="Regulasi Akademik" count={angkatanDetailData.reduce((s, r) => s + r['Regulasi Akademik'], 0)} chipClass="status-regulasi" title="Mahasiswa Regulasi Akademik semua angkatan" /></td>
                      <td className="p-3"><CountCell status="Lulus" count={angkatanDetailData.reduce((s, r) => s + r.Lulus, 0)} chipClass="status-lulus" title="Mahasiswa Lulus semua angkatan" /></td>
                      <td className="p-3"><CountCell status="Alih Prodi" count={angkatanDetailData.reduce((s, r) => s + r['Alih Prodi'], 0)} chipClass="status-alih" title="Mahasiswa Alih Prodi semua angkatan" /></td>
                      <td className="p-3 pr-0"><CountCell status="Undur Diri" count={angkatanDetailData.reduce((s, r) => s + r['Undur Diri'], 0)} chipClass="status-undur" title="Mahasiswa Undur Diri semua angkatan" /></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
