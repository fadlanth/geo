import React, { useEffect, useState, useMemo } from "react";
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
  CartesianGrid,
} from "recharts";
import {
  GraduationCap,
  Briefcase,
  BookOpen,
  Store,
  TrendingUp,
  AlertCircle,
  RotateCw,
} from "lucide-react";
import { supabase } from "../lib/supabase";

export interface PublicRekapRow {
  tahun_lulus: number;
  total_lulusan: number;
  total_bekerja: number;
  total_studi_lanjut: number;
  total_wiraswasta: number;
  total_belum_bekerja: number;
}

const STATUS_COLORS = {
  Bekerja: "#134e53", // Deep Teal
  "Studi Lanjut": "#0d9488", // Emerald/Teal
  Wiraswasta: "#d97706", // Amber
  "Belum Bekerja": "#94a3b8", // Slate Muted
};

interface PublicTracerDashboardProps {
  className?: string;
}

export const PublicTracerDashboard: React.FC<PublicTracerDashboardProps> = ({
  className = "",
}) => {
  const [data, setData] = useState<PublicRekapRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: rows, error: fetchError } = await supabase
        .from("v_publik_rekap")
        .select("*")
        .order("tahun_lulus", { ascending: true });

      if (fetchError) {
        throw new Error(
          fetchError.message || "Gagal memuat data agregat tracer study.",
        );
      }

      setData((rows as PublicRekapRow[]) || []);
    } catch (err) {
      const msg =
        err instanceof Error ? err : new Error("Terjadi kesalahan jaringan");
      console.error("[PublicTracerDashboard] Fetch error:", msg);
      setError(msg.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Agregasi status seluruh tahun untuk PieChart
  const pieData = useMemo(() => {
    const totals = data.reduce(
      (acc, curr) => {
        acc.bekerja += curr.total_bekerja || 0;
        acc.studiLanjut += curr.total_studi_lanjut || 0;
        acc.wiraswasta += curr.total_wiraswasta || 0;
        acc.belumBekerja += curr.total_belum_bekerja || 0;
        return acc;
      },
      { bekerja: 0, studiLanjut: 0, wiraswasta: 0, belumBekerja: 0 },
    );

    return [
      { name: "Bekerja", value: totals.bekerja, color: STATUS_COLORS.Bekerja },
      {
        name: "Studi Lanjut",
        value: totals.studiLanjut,
        color: STATUS_COLORS["Studi Lanjut"],
      },
      {
        name: "Wiraswasta",
        value: totals.wiraswasta,
        color: STATUS_COLORS.Wiraswasta,
      },
      {
        name: "Belum Bekerja",
        value: totals.belumBekerja,
        color: STATUS_COLORS["Belum Bekerja"],
      },
    ].filter((item) => item.value > 0);
  }, [data]);

  // Statistik Kunci
  const overallStats = useMemo(() => {
    const totalAlumni = data.reduce(
      (acc, curr) => acc + (curr.total_lulusan || 0),
      0,
    );
    const totalKerja = data.reduce(
      (acc, curr) => acc + (curr.total_bekerja || 0),
      0,
    );
    const totalStudi = data.reduce(
      (acc, curr) => acc + (curr.total_studi_lanjut || 0),
      0,
    );
    const totalWira = data.reduce(
      (acc, curr) => acc + (curr.total_wiraswasta || 0),
      0,
    );

    const persenKerja =
      totalAlumni > 0 ? Math.round((totalKerja / totalAlumni) * 100) : 0;
    const persenSerapan =
      totalAlumni > 0
        ? Math.round(
            ((totalKerja + totalStudi + totalWira) / totalAlumni) * 100,
          )
        : 0;

    return {
      totalAlumni,
      totalKerja,
      totalStudi,
      totalWira,
      persenKerja,
      persenSerapan,
    };
  }, [data]);

  return (
    <div
      className={`w-full bg-[#f3f5ef] text-[#241f20] font-sans ${className || "min-h-screen py-10 px-4 sm:px-6 lg:px-8"}`}
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Publik */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#241f20]/10 pb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold tracking-wide uppercase bg-[#134e53]/10 text-[#134e53] rounded-full mb-3">
              <TrendingUp className="w-3.5 h-3.5" />
              Statistik Terbuka & Agregat
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#241f20]">
              Tracer Study Alumni
            </h1>
            <p className="mt-1.5 text-sm sm:text-base text-[#241f20]/70 max-w-2xl">
              Distribusi karier, studi lanjut, dan rekapitulasi kelulusan alumni
              secara transparan tanpa menampilkan data pribadi.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#241f20] bg-white border border-[#241f20]/15 rounded-xl shadow-sm hover:bg-stone-50 transition cursor-pointer disabled:opacity-50"
          >
            <RotateCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Perbarui Data
          </button>
        </div>

        {/* State Error */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold">
                Gagal memuat rekap publik
              </h4>
              <p className="text-xs text-rose-700 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* BENTO GRID LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Bento Item 1: Stat Cards (Span 12 -> 4 subcards) */}
          <div className="md:col-span-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-5 shadow-xs border border-[#241f20]/5 animate-pulse h-28 flex flex-col justify-between"
                >
                  <div className="w-8 h-8 bg-stone-200 rounded-lg" />
                  <div className="space-y-2">
                    <div className="w-16 h-6 bg-stone-200 rounded" />
                    <div className="w-24 h-3 bg-stone-200 rounded" />
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="bg-white rounded-2xl p-5 shadow-xs border border-[#241f20]/5 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="w-9 h-9 rounded-xl bg-[#134e53]/10 flex items-center justify-center text-[#134e53]">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[#241f20]">
                      {overallStats.totalAlumni}
                    </span>
                    <p className="text-xs text-[#241f20]/60 font-medium mt-0.5">
                      Total Alumni Terdata
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-xs border border-[#241f20]/5 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-[#134e53]">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-2xl sm:text-3xl font-bold tracking-tight text-[#134e53]">
                      {overallStats.persenSerapan}%
                    </span>
                    <p className="text-xs text-[#241f20]/60 font-medium mt-0.5">
                      Terserap Kerja / Studi
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-xs border border-[#241f20]/5 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-700">
                      {overallStats.totalWira}
                    </span>
                    <p className="text-xs text-[#241f20]/60 font-medium mt-0.5">
                      Wirausahawan
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-xs border border-[#241f20]/5 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-2xl sm:text-3xl font-bold tracking-tight text-teal-700">
                      {overallStats.totalStudi}
                    </span>
                    <p className="text-xs text-[#241f20]/60 font-medium mt-0.5">
                      Lanjut Studi (S2/S3)
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Bento Item 2: BarChart Lulusan per Tahun (Span 7) */}
          <div className="md:col-span-7 bg-white rounded-3xl p-6 shadow-xs border border-[#241f20]/5 flex flex-col">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-[#241f20]">
                Tren Kelulusan per Tahun
              </h2>
              <p className="text-xs text-[#241f20]/60">
                Jumlah alumni yang terdaftar pada sistem tracer study
              </p>
            </div>

            <div className="flex-1 min-h-[300px] w-full">
              {loading ? (
                <div className="w-full h-[300px] bg-stone-100/70 rounded-2xl animate-pulse flex items-center justify-center text-xs text-[#241f20]/40">
                  Memuat grafik tren...
                </div>
              ) : data.length === 0 ? (
                <div className="w-full h-[300px] flex items-center justify-center text-xs text-[#241f20]/50 border border-dashed border-stone-200 rounded-2xl">
                  Belum ada data kelulusan tahunan.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={data}
                    margin={{ top: 20, right: 20, left: -15, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#241f20"
                      strokeOpacity={0.06}
                    />
                    <XAxis
                      dataKey="tahun_lulus"
                      tick={{ fill: "#241f20", fontSize: 12, opacity: 0.7 }}
                      axisLine={{ stroke: "#241f20", opacity: 0.1 }}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "#241f20", fontSize: 12, opacity: 0.7 }}
                      axisLine={{ stroke: "#241f20", opacity: 0.1 }}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "#f3f5ef" }}
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid rgba(36,31,32,0.1)",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                        color: "#241f20",
                        fontSize: "12px",
                      }}
                      formatter={(val: number | string | Array<number | string>) => [
                        `${val} Alumni`,
                        "Total Lulusan",
                      ]}
                      labelFormatter={(label) => `Tahun Lulus: ${label}`}
                    />
                    <Bar
                      dataKey="total_lulusan"
                      fill="#134e53"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Bento Item 3: PieChart Distribusi Status Lulusan (Span 5) */}
          <div className="md:col-span-5 bg-white rounded-3xl p-6 shadow-xs border border-[#241f20]/5 flex flex-col">
            <div className="mb-2">
              <h2 className="text-lg font-bold text-[#241f20]">
                Distribusi Status Lulusan
              </h2>
              <p className="text-xs text-[#241f20]/60">
                Komposisi aktivitas terkini seluruh alumni
              </p>
            </div>

            <div className="flex-1 min-h-[300px] w-full flex items-center justify-center">
              {loading ? (
                <div className="w-full h-[300px] bg-stone-100/70 rounded-2xl animate-pulse flex items-center justify-center text-xs text-[#241f20]/40">
                  Memuat diagram status...
                </div>
              ) : pieData.length === 0 ? (
                <div className="w-full h-[300px] flex items-center justify-center text-xs text-[#241f20]/50 border border-dashed border-stone-200 rounded-2xl">
                  Belum ada data status alumni.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="48%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid rgba(36,31,32,0.1)",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                        color: "#241f20",
                        fontSize: "12px",
                      }}
                      formatter={(value: number | string | Array<number | string>, name: string) => {
                        const total = pieData.reduce((s, i) => s + i.value, 0);
                        const pct =
                          total > 0
                            ? ((Number(value) / total) * 100).toFixed(1)
                            : 0;
                        return [`${value} Alumni (${pct}%)`, name];
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      align="center"
                      iconType="circle"
                      wrapperStyle={{
                        paddingTop: "14px",
                        fontSize: "11px",
                        color: "#241f20",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Bento Item 4: Detail Breakdown per Tahun (Span 12) */}
          <div className="md:col-span-12 bg-white rounded-3xl p-6 shadow-xs border border-[#241f20]/5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-[#241f20]">
                  Tabel Rekapitulasi Tahunan
                </h2>
                <p className="text-xs text-[#241f20]/60">
                  Data agregat resmi IKU-1 & Akreditasi
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200/80 text-xs font-semibold text-[#241f20]/70 uppercase tracking-wider">
                    <th className="py-3 px-4">Tahun Lulus</th>
                    <th className="py-3 px-4">Total Lulusan</th>
                    <th className="py-3 px-4 text-[#134e53]">Bekerja</th>
                    <th className="py-3 px-4 text-teal-700">Studi Lanjut</th>
                    <th className="py-3 px-4 text-amber-700">Wiraswasta</th>
                    <th className="py-3 px-4 text-stone-500">Belum Bekerja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-3 px-4">
                          <div className="w-12 h-4 bg-stone-200 rounded" />
                        </td>
                        <td className="py-3 px-4">
                          <div className="w-16 h-4 bg-stone-200 rounded" />
                        </td>
                        <td className="py-3 px-4">
                          <div className="w-10 h-4 bg-stone-200 rounded" />
                        </td>
                        <td className="py-3 px-4">
                          <div className="w-10 h-4 bg-stone-200 rounded" />
                        </td>
                        <td className="py-3 px-4">
                          <div className="w-10 h-4 bg-stone-200 rounded" />
                        </td>
                        <td className="py-3 px-4">
                          <div className="w-10 h-4 bg-stone-200 rounded" />
                        </td>
                      </tr>
                    ))
                  ) : data.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-6 text-center text-xs text-[#241f20]/50"
                      >
                        Belum ada rekaman data rekap.
                      </td>
                    </tr>
                  ) : (
                    data.map((row) => (
                      <tr
                        key={row.tahun_lulus}
                        className="hover:bg-stone-50/60 transition-colors"
                      >
                        <td className="py-3 px-4 font-semibold text-[#241f20]">
                          {row.tahun_lulus}
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {row.total_lulusan}
                        </td>
                        <td className="py-3 px-4 text-[#134e53] font-medium">
                          {row.total_bekerja}
                        </td>
                        <td className="py-3 px-4 text-teal-700 font-medium">
                          {row.total_studi_lanjut}
                        </td>
                        <td className="py-3 px-4 text-amber-700 font-medium">
                          {row.total_wiraswasta}
                        </td>
                        <td className="py-3 px-4 text-stone-500 font-medium">
                          {row.total_belum_bekerja}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Disclaimer */}
        <div className="text-center pt-4">
          <p className="text-xs text-[#241f20]/50">
            Sumber Data: Sistem Informasi Akademik & Tracer Study Program Studi.
            Agregat diperbarui secara otomatis.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicTracerDashboard;
