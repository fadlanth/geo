import React, { useState, useRef, useEffect, useMemo } from "react";
import CsvImporter from "./CsvImporter";
import Pagination from "./Pagination";
import DataActions from "./DataActions";
import Button from "./Button";
import IconButton from "./IconButton";
import {
  Search,
  Plus,
  Trash2,
  Building2,
  Calendar,
  BookOpen,
  UserCheck,
  Edit2,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Briefcase,
  FileText,
  DollarSign,
  Landmark,
  X,
  Microscope,
  ExternalLink,
  User,
  Users,
  UserPlus,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { RiwayatMBKM, Mahasiswa, Dosen } from "../types";
import { useDebounce, useEscapeClose, useFocusTrap } from "../lib/hooks";
import { fmt } from "../lib/format";
import { exportToExcel } from "../lib/exportUtils";
import { ToastOptions } from "./Toast";
import { SkeletonTable, SkeletonCard } from "./Skeleton";
import MbkmFormModal, { SKEMA_KETERLIBATAN_OPTIONS } from "./MbkmFormModal";

interface GroupedProject {
  id: string;
  judul_topik_magang: string;
  nama_ketua_riset?: string;
  nip_dosen_pembimbing_dalam?: string | null;
  dosen_pembimbing_lapangan?: string;
  keterlibatan?: string;
  sumber_dana?: string;
  semester: string;
  bukti_dokumen?: string | null;
  members: {
    id_mbkm?: string;
    npm_mahasiswa: string;
    nama: string;
    raw: RiwayatMBKM;
  }[];
}

interface MagangTabProps {
  mbkm: RiwayatMBKM[];
  mahasiswa: Mahasiswa[];
  dosen: Dosen[];
  loading?: boolean;
  activeSubTab?: string;
  onSubTabChange?: (subTab: string) => void;
  onSaveMbkm: (m: RiwayatMBKM) => void;
  onDeleteMbkm: (id: string) => void;
  onBulkImportMagang: (data: Record<string, unknown>[]) => Promise<void>;
  onRefresh: () => Promise<void>;
  triggerToast?: (options: ToastOptions) => void;
}

export default function MagangTab({
  mbkm,
  mahasiswa,
  dosen,
  loading,
  activeSubTab,
  onSaveMbkm,
  onDeleteMbkm,
  onBulkImportMagang,
  triggerToast,
}: MagangTabProps) {
  // Sub-Tab Switcher State (Induk: Kegiatan Luar Prodi -> Magang vs Penelitian)
  const [subTab, setSubTab] = useState<"magang" | "penelitian">(
    (activeSubTab as "magang" | "penelitian" | undefined) || "magang",
  );
  const [viewMode, setViewMode] = useState<"individu" | "kelompok">("individu");

  useEffect(() => {
    if (activeSubTab === "magang" || activeSubTab === "penelitian") {
      setSubTab(activeSubTab);
      setViewMode("individu");
      setPage(1);
      setQuery("");
      setFilterKeterlibatan("All");
      setFilterSemester("All");
      setExpandedId(null);
    }
  }, [activeSubTab]);

  const [query, setQuery] = useState("");
  const searchQuery = useDebounce(query, 350);
  const [filterSemester, setFilterSemester] = useState("All");
  const [filterKeterlibatan, setFilterKeterlibatan] = useState("All");
  const [page, setPage] = useState(1);
  const tableRef = useRef<HTMLDivElement | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const ROWS_PER_PAGE = 25;

  const [showAddModal, setShowAddModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingMbkm, setEditingMbkm] = useState<RiwayatMBKM | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const magangModalRef = useRef<HTMLDivElement>(null);

  useEscapeClose(showAddModal, () => setShowAddModal(false));
  useEscapeClose(showImport, () => setShowImport(false));
  useFocusTrap(showAddModal, magangModalRef);

  useEffect(() => {
    if (page > 1)
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  const [form, setForm] = useState<RiwayatMBKM>({
    npm_mahasiswa: "",
    jenis_kegiatan: "Magang Industri",
    tempat_instansi: "",
    semester: "",
    judul_topik_magang: "",
    dosen_pembimbing_lapangan: "",
    nip_dosen_pembimbing_dalam: null,
    periode_magang: "",
    keterlibatan: "Dengan dosen tetap dari perguruan tinggi homebase",
    sumber_dana: "",
    nama_ketua_riset: "",
    bukti_dokumen: "",
  });

  // Partisi data
  const magangList = mbkm.filter(
    (m) => (m.jenis_kegiatan || "Magang Industri") === "Magang Industri",
  );
  const penelitianList = mbkm.filter(
    (m) => m.jenis_kegiatan === "Penelitian Dosen",
  );

  const countMagang = magangList.length;
  const countPenelitian = penelitianList.length;

  const currentDataset = subTab === "magang" ? magangList : penelitianList;

  // Statistik Magang Industri
  const mhsMagang = new Set(magangList.map((m) => m.npm_mahasiswa)).size;
  const instansiMagang = new Set(magangList.map((m) => m.tempat_instansi)).size;

  // Statistik Penelitian Dosen
  const mhsPeneliti = new Set(penelitianList.map((m) => m.npm_mahasiswa)).size;
  const judulRisetCount = new Set(
    penelitianList.map((m) => m.judul_topik_magang).filter(Boolean),
  ).size;
  const dosenRisetCount = new Set(
    penelitianList
      .map((m) => m.nama_ketua_riset || m.dosen_pembimbing_lapangan)
      .filter(Boolean),
  ).size;
  const sumberDanaCount = new Set(
    penelitianList.map((m) => m.sumber_dana).filter(Boolean),
  ).size;

  const keterlibatanCounts = penelitianList.reduce<Record<string, number>>(
    (acc, m) => {
      const k = m.keterlibatan || "Lainnya";
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    },
    {},
  );

  const getDospemDalamName = (nip: string | null | undefined): string => {
    if (!nip) return "";
    const d = dosen.find((ds) => ds.nip === nip);
    return d ? d.nama : nip;
  };

  // Filter dataset aktif
  const filteredCurrentData = currentDataset.filter((m) => {
    const mhs = mahasiswa.find((s) => s.npm === m.npm_mahasiswa);
    const mhsName = mhs ? mhs.nama.toLowerCase() : "";
    const instansi = (m.tempat_instansi || "").toLowerCase();
    const judul = (m.judul_topik_magang || "").toLowerCase();
    const dospemDalam = getDospemDalamName(
      m.nip_dosen_pembimbing_dalam,
    ).toLowerCase();
    const dospemLuar = (m.dosen_pembimbing_lapangan || "").toLowerCase();
    const ketuaRiset = (m.nama_ketua_riset || "").toLowerCase();
    const sumberDana = (m.sumber_dana || "").toLowerCase();
    const bukti = (m.bukti_dokumen || "").toLowerCase();
    const q = searchQuery.toLowerCase();

    const matchesSearch =
      mhsName.includes(q) ||
      instansi.includes(q) ||
      judul.includes(q) ||
      dospemDalam.includes(q) ||
      dospemLuar.includes(q) ||
      ketuaRiset.includes(q) ||
      sumberDana.includes(q) ||
      bukti.includes(q) ||
      m.npm_mahasiswa.toLowerCase().includes(q);

    const matchesSemester =
      filterSemester === "All" || m.semester === filterSemester;
    const matchesKeterlibatan =
      filterKeterlibatan === "All" ||
      (m.keterlibatan || "") === filterKeterlibatan;

    return (
      matchesSearch &&
      matchesSemester &&
      (subTab === "magang" ? true : matchesKeterlibatan)
    );
  });

  const groupedProjects: GroupedProject[] = useMemo(() => {
    if (subTab !== "penelitian") return [];
    const map = new Map<string, GroupedProject>();

    filteredCurrentData.forEach((m) => {
      const judul = (m.judul_topik_magang || "").trim();
      const ketua = (
        m.nama_ketua_riset ||
        m.nip_dosen_pembimbing_dalam ||
        m.dosen_pembimbing_lapangan ||
        ""
      )
        .trim()
        .toLowerCase();
      const sem = (m.semester || "").trim().toLowerCase();
      const key = judul
        ? `${judul.toLowerCase()}:::${ketua}:::${sem}`
        : m.id_mbkm || Math.random().toString();
      const mhs = mahasiswa.find((s) => s.npm === m.npm_mahasiswa);
      const nama = mhs ? mhs.nama : "N/A";

      if (!map.has(key)) {
        map.set(key, {
          id: m.id_mbkm || key,
          judul_topik_magang: m.judul_topik_magang || "-",
          nama_ketua_riset: m.nama_ketua_riset,
          nip_dosen_pembimbing_dalam: m.nip_dosen_pembimbing_dalam,
          dosen_pembimbing_lapangan: m.dosen_pembimbing_lapangan,
          keterlibatan: m.keterlibatan || m.tempat_instansi,
          sumber_dana: m.sumber_dana,
          semester: m.semester,
          bukti_dokumen: m.bukti_dokumen,
          members: [],
        });
      }

      map.get(key)!.members.push({
        id_mbkm: m.id_mbkm,
        npm_mahasiswa: m.npm_mahasiswa,
        nama,
        raw: m,
      });
    });

    return Array.from(map.values());
  }, [subTab, filteredCurrentData, mahasiswa]);

  const isKelompok = subTab === "penelitian" && viewMode === "kelompok";
  const totalItems = isKelompok
    ? groupedProjects.length
    : filteredCurrentData.length;
  const totalPages = Math.ceil(totalItems / ROWS_PER_PAGE);
  const safePage = Math.min(page, Math.max(1, totalPages));
  const paginatedData = filteredCurrentData.slice(
    (safePage - 1) * ROWS_PER_PAGE,
    safePage * ROWS_PER_PAGE,
  );
  const paginatedGrouped = groupedProjects.slice(
    (safePage - 1) * ROWS_PER_PAGE,
    safePage * ROWS_PER_PAGE,
  );

  const handleOpenAddWithPreset = (group: GroupedProject) => {
    setForm({
      npm_mahasiswa: "",
      jenis_kegiatan: "Penelitian Dosen",
      tempat_instansi:
        group.keterlibatan ||
        "Dengan dosen tetap dari perguruan tinggi homebase",
      semester: group.semester,
      judul_topik_magang: group.judul_topik_magang,
      dosen_pembimbing_lapangan: group.dosen_pembimbing_lapangan || "",
      nip_dosen_pembimbing_dalam: group.nip_dosen_pembimbing_dalam || null,
      periode_magang: "",
      keterlibatan:
        group.keterlibatan ||
        "Dengan dosen tetap dari perguruan tinggi homebase",
      sumber_dana: group.sumber_dana || "",
      nama_ketua_riset: group.nama_ketua_riset || "",
      bukti_dokumen: group.bukti_dokumen || "",
    });
    setEditingMbkm(null);
    setShowAddModal(true);
  };

  const handleEditClick = (m: RiwayatMBKM) => {
    setEditingMbkm(m);
    setForm({
      npm_mahasiswa: m.npm_mahasiswa,
      jenis_kegiatan:
        m.jenis_kegiatan ||
        (subTab === "magang" ? "Magang Industri" : "Penelitian Dosen"),
      tempat_instansi: m.tempat_instansi || "",
      semester: m.semester || "",
      judul_topik_magang: m.judul_topik_magang || "",
      dosen_pembimbing_lapangan: m.dosen_pembimbing_lapangan || "",
      nip_dosen_pembimbing_dalam: m.nip_dosen_pembimbing_dalam || null,
      periode_magang: m.periode_magang || "",
      keterlibatan:
        m.keterlibatan ||
        (m.tempat_instansi &&
        SKEMA_KETERLIBATAN_OPTIONS.includes(m.tempat_instansi as any)
          ? m.tempat_instansi
          : "Dengan dosen tetap dari perguruan tinggi homebase"),
      sumber_dana: m.sumber_dana || "",
      nama_ketua_riset: m.nama_ketua_riset || m.dosen_pembimbing_lapangan || "",
      bukti_dokumen: m.bukti_dokumen || "",
    });
    setShowAddModal(true);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const resetForm = () => {
    setForm({
      npm_mahasiswa: "",
      jenis_kegiatan:
        subTab === "magang" ? "Magang Industri" : "Penelitian Dosen",
      tempat_instansi:
        subTab === "magang"
          ? ""
          : "Dengan dosen tetap dari perguruan tinggi homebase",
      semester: "",
      judul_topik_magang: "",
      dosen_pembimbing_lapangan: "",
      nip_dosen_pembimbing_dalam: null,
      periode_magang: "",
      keterlibatan: "Dengan dosen tetap dari perguruan tinggi homebase",
      sumber_dana: "",
      nama_ketua_riset: "",
      bukti_dokumen: "",
    });
    setEditingMbkm(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.npm_mahasiswa) {
      triggerToast?.({
        kind: "error",
        title: "Validasi Gagal",
        message: "Mahasiswa harus dipilih.",
      });
      return;
    }

    if (subTab === "magang") {
      if (!form.tempat_instansi || !form.semester) {
        triggerToast?.({
          kind: "error",
          title: "Validasi Gagal",
          message: "Instansi magang dan semester harus diisi.",
        });
        return;
      }
    } else {
      if (!form.judul_topik_magang || !form.semester) {
        triggerToast?.({
          kind: "error",
          title: "Validasi Gagal",
          message: "Judul riset dan tahun/periode harus diisi.",
        });
        return;
      }
    }

    const resolvedTempat =
      subTab === "magang"
        ? form.tempat_instansi
        : form.keterlibatan ||
          form.tempat_instansi ||
          "Dengan dosen tetap dari perguruan tinggi homebase";

    const data: RiwayatMBKM = {
      ...form,
      id_mbkm: editingMbkm ? editingMbkm.id_mbkm : undefined,
      jenis_kegiatan:
        subTab === "magang" ? "Magang Industri" : "Penelitian Dosen",
      tempat_instansi: resolvedTempat,
      dosen_pembimbing_lapangan:
        subTab === "magang"
          ? form.dosen_pembimbing_lapangan
          : form.nama_ketua_riset,
      nama_ketua_riset:
        subTab === "penelitian" ? form.nama_ketua_riset : undefined,
      keterlibatan: subTab === "penelitian" ? form.keterlibatan : undefined,
      sumber_dana: subTab === "penelitian" ? form.sumber_dana : undefined,
      bukti_dokumen:
        subTab === "penelitian" ? form.bukti_dokumen?.trim() || null : null,
    };

    setIsSubmitting(true);
    try {
      await onSaveMbkm(data);
      resetForm();
      setShowAddModal(false);
    } catch {
      // toast handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const semesterOptions = Array.from(
    new Set(
      currentDataset
        .map((m) => m.semester)
        .filter((s): s is string => Boolean(s && String(s).trim())),
    ),
  ).sort();
  const reversedSemesters = [...semesterOptions].reverse();

  // Chart per semester
  const semesterChartData = reversedSemesters.map((sem) => ({
    semester: sem,
    jumlah: currentDataset.filter((m) => m.semester === sem).length,
  }));

  // Ekspor Excel disesuaikan 100% dengan kolom borang akreditasi riil
  const handleExport = () => {
    if (subTab === "magang") {
      const dataToExport = magangList.map((m, idx) => {
        const dospemDalam = m.nip_dosen_pembimbing_dalam
          ? dosen.find((d) => d.nip === m.nip_dosen_pembimbing_dalam)
          : null;
        const mhs = mahasiswa.find((s) => s.npm === m.npm_mahasiswa);
        return {
          NO: idx + 1,
          "NAMA MAHASISWA": mhs ? mhs.nama : "",
          NPM: m.npm_mahasiswa,
          "TEMPAT / INSTANSI MAGANG": m.tempat_instansi,
          SEMESTER: m.semester,
          "JUDUL TOPIK MAGANG": m.judul_topik_magang || "",
          "DOSEN PEMBIMBING LAPANGAN": m.dosen_pembimbing_lapangan || "",
          "DOSEN PEMBIMBING UNPAD": dospemDalam ? dospemDalam.nama : "",
          "PERIODE MAGANG": m.periode_magang || "",
        };
      });
      exportToExcel(
        dataToExport,
        "data_magang_industri_mahasiswa",
        "Magang Industri",
      );
      triggerToast?.({
        kind: "success",
        title: "Ekspor Berhasil",
        message: `Berhasil mengunduh ${dataToExport.length} data magang industri.`,
      });
    } else {
      // Format resmi tabel penelitian dosen (sesuai gambar yang diberikan pengguna)
      const dataToExport = penelitianList.map((m, idx) => {
        const dospemDalam = m.nip_dosen_pembimbing_dalam
          ? dosen.find((d) => d.nip === m.nip_dosen_pembimbing_dalam)
          : null;
        const mhs = mahasiswa.find((s) => s.npm === m.npm_mahasiswa);
        const ketuaRiset =
          m.nama_ketua_riset ||
          (dospemDalam ? dospemDalam.nama : m.dosen_pembimbing_lapangan || "");
        return {
          NO: idx + 1,
          "NAMA MAHASISWA": mhs ? mhs.nama : "",
          NPM: m.npm_mahasiswa,
          KETERLIBATAN: m.keterlibatan || m.tempat_instansi || "",
          "JUDUL RISET": m.judul_topik_magang || "",
          "JENIS RISET/SUMBER DANA": m.sumber_dana || "",
          "NAMA KETUA RISET (DOSEN)": ketuaRiset,
          BUKTI: m.bukti_dokumen || "",
          "TAHUN/PERIODE": m.semester || m.periode_magang || "",
        };
      });
      exportToExcel(
        dataToExport,
        "rekap_mahasiswa_terlibat_penelitian_dosen",
        "Penelitian Dosen",
      );
      triggerToast?.({
        kind: "success",
        title: "Ekspor Berhasil",
        message: `Berhasil mengunduh ${dataToExport.length} data penelitian dosen.`,
      });
    }
  };

  const toggleExpand = (id: string | undefined) => {
    if (!id) return;
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getKeterlibatanBadge = (ket?: string) => {
    if (!ket) return <span className="text-slate-400 text-xs">-</span>;
    let cls = "bg-slate-100 text-slate-700 border-slate-200";
    let label = ket;
    if (ket.includes("homebase")) {
      cls = "bg-emerald-50 text-emerald-800 border-emerald-200";
      label = "PT Homebase";
    } else if (ket.includes("lembaga riset")) {
      cls = "bg-purple-50 text-purple-800 border-purple-200";
      label = "Lembaga Riset";
    } else if (ket.includes("pemerintah") || ket.includes("BUMN")) {
      cls = "bg-amber-50 text-amber-800 border-amber-200";
      label = "Pemerintah / BUMN";
    } else if (ket.includes("tinggi lain")) {
      cls = "bg-blue-50 text-blue-800 border-blue-200";
      label = "PT Lain";
    }
    return (
      <span
        className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${cls}`}
        title={ket}
      >
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-bold uppercase tracking-wider">
              <Briefcase className="w-3 h-3" /> Kegiatan Luar Program Studi
            </div>
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[var(--color-text-main)]">
              {subTab === "magang"
                ? "Magang Industri"
                : "Mahasiswa Terlibat Penelitian Dosen"}
            </h2>
            <p className="text-xs text-[var(--color-text-main)]/70">
              {subTab === "magang"
                ? "Rekapitulasi magang kerja praktik mahasiswa di dunia usaha dan industri mitra."
                : "Data keterlibatan mahasiswa dalam riset dosen."}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
            <Button
              onClick={handleOpenAddModal}
              className="flex-1 sm:flex-none shadow-xs"
              icon={<Plus className="w-4 h-4" />}
            >
              {subTab === "magang" ? "Catat Magang" : "Catat Riset Mahasiswa"}
            </Button>
            <DataActions
              onImportCsv={() => setShowImport(true)}
              onImportExcel={() => setShowImport(true)}
              onExportExcel={handleExport}
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : currentDataset.length === 0 ? (
        <div className="bg-white p-8 sm:p-12 rounded-2xl border border-[var(--color-primary)]/10 text-center">
          {subTab === "magang" ? (
            <Building2 className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-[var(--color-primary)]/20 mb-3" />
          ) : (
            <Microscope className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-[var(--color-primary)]/20 mb-3" />
          )}
          <h3 className="font-bold text-sm text-[var(--color-text-main)]/50">
            {subTab === "magang"
              ? "Belum ada data magang industri"
              : "Belum ada data mahasiswa terlibat penelitian dosen"}
          </h3>
          <p className="text-xs text-[var(--color-text-main)]/50 mt-1">
            Klik tombol tambah di atas atau gunakan impor file Excel / CSV.
          </p>
        </div>
      ) : (
        <>
          {subTab === "magang" ? (
            /* Stat Cards Magang */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-slate-200">
                <div className="bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Total Magang
                  </p>
                  <p className="text-2xl font-bold font-display mt-1 text-[var(--color-text-main)]">
                    {fmt(countMagang)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Riwayat kegiatan
                  </p>
                </div>
                <div className="bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Mahasiswa Peserta
                  </p>
                  <p className="text-2xl font-bold font-display mt-1 text-[var(--color-primary)]">
                    {fmt(mhsMagang)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Orang mahasiswa
                  </p>
                </div>
                <div className="bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Mitra Instansi
                  </p>
                  <p className="text-2xl font-bold font-display mt-1 text-emerald-600">
                    {fmt(instansiMagang)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Instansi tempat magang
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Stat Cards Penelitian Dosen (Sesuai Skema Borang LAMSAMA) */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-200">
                <div className="bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Total Keterlibatan
                  </p>
                  <p className="text-2xl font-bold font-display mt-1 text-[var(--color-text-main)]">
                    {fmt(countPenelitian)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Riwayat kegiatan
                  </p>
                </div>
                <div className="bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Mahasiswa Terlibat
                  </p>
                  <p className="text-2xl font-bold font-display mt-1 text-purple-700">
                    {fmt(mhsPeneliti)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Orang mahasiswa
                  </p>
                </div>
                <div className="bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Judul Riset
                  </p>
                  <p className="text-2xl font-bold font-display mt-1 text-indigo-600">
                    {fmt(judulRisetCount)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Topik penelitian
                  </p>
                </div>
                <div className="bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Dosen Ketua Riset
                  </p>
                  <p className="text-2xl font-bold font-display mt-1 text-teal-700">
                    {fmt(dosenRisetCount)}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {sumberDanaCount} skema pendanaan
                  </p>
                </div>
              </div>

              {/* Breakdown Skema Keterlibatan */}
              <div className="px-4 py-2.5 border-t border-slate-200 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                <span className="font-bold uppercase tracking-wider text-slate-500">
                  Skema Kerja Sama:
                </span>
                {SKEMA_KETERLIBATAN_OPTIONS.map((skema) => {
                  const c = keterlibatanCounts[skema] || 0;
                  if (c === 0) return null;
                  return (
                    <span
                      key={skema}
                      className="inline-flex items-center gap-1.5 font-medium text-slate-700"
                    >
                      {getKeterlibatanBadge(skema)}
                      <b className="text-[var(--color-text-main)]">{c}</b>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Grafik per Semester */}
          {semesterChartData.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[var(--color-primary)]" />
                  <h3 className="font-bold text-sm text-[var(--color-text-main)]">
                    {subTab === "magang"
                      ? "Sebaran Magang per Semester"
                      : "Sebaran Keterlibatan Riset per Periode"}
                  </h3>
                </div>
                <span className="text-xs text-gray-400 font-medium">
                  Berdasarkan Tahun/Periode
                </span>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={semesterChartData}
                    barSize={32}
                    margin={{ top: 5, right: 20, left: -15, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e2e8f0"
                      strokeOpacity={0.7}
                    />
                    <XAxis dataKey="semester" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip
                      cursor={{ fill: "var(--color-primary)", opacity: 0.05 }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 text-xs shadow-sm">
                            <p className="font-semibold text-gray-800 mb-1">
                              {label}
                            </p>
                            <p className="text-gray-600">
                              Jumlah Mahasiswa:{" "}
                              <span className="font-semibold text-[var(--color-primary)]">
                                {data.jumlah}
                              </span>
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="jumlah"
                      name="Mahasiswa"
                      radius={[4, 4, 0, 0]}
                      fill={
                        subTab === "magang" ? "var(--color-primary)" : "#7C3AED"
                      }
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {/* CSV / Excel Importer Modal */}
      {showImport && (
        <CsvImporter
          title={
            subTab === "magang"
              ? "Impor Data Magang Industri"
              : "Impor Data Penelitian Dosen"
          }
          expectedHeaders={
            subTab === "magang"
              ? ["NPM", "NAMA INSTANSI TEMPAT MAGANG", "SEMESTER"]
              : ["NPM", "JUDUL RISET", "KETERLIBATAN"]
          }
          optionalHeaders={[
            "npm_mahasiswa",
            "tempat_instansi",
            "semester",
            "jenis_kegiatan",
            "JENIS KEGIATAN",
            "NO",
            "NAMA LENGKAP",
            "NAMA MAHASISWA",
            "JUDUL TOPIK MAGANG",
            "DOSEN PEMBIMBING LAPANGAN",
            "DOSEN PEMBIMBING DALAM",
            "PERIODE MAGANG",
            "judul_topik_magang",
            "dosen_pembimbing_lapangan",
            "nip_dosen_pembimbing_dalam",
            "periode_magang",
            "KETERLIBATAN",
            "JUDUL RISET",
            "JENIS RISET/SUMBER DANA",
            "NAMA KETUA RISET (DOSEN)",
            "BUKTI",
            "TAHUN/PERIODE",
          ]}
          templateCsv={
            subTab === "magang"
              ? `NPM,NAMA MAHASISWA,NAMA INSTANSI TEMPAT MAGANG,SEMESTER,JUDUL TOPIK MAGANG,DOSEN PEMBIMBING LAPANGAN,DOSEN PEMBIMBING DALAM,PERIODE MAGANG
31242001,Andi Pratama,PT Geo Teknologi,Genap 2025/2026,Analisis Data Geofisika,Bapak Andi,Dr. Maria Ulfah,Jan-Jun 2025`
              : `NO,NAMA MAHASISWA,NPM,KETERLIBATAN,JUDUL RISET,JENIS RISET/SUMBER DANA,NAMA KETUA RISET (DOSEN),BUKTI,TAHUN/PERIODE
1,Akmal Renaisans Barnais,140710220035,Dengan pemerintah/BUMN/BUMD (dibimbing dosen),Kota Cimahi Untuk Rekomendasi Zonasi,Hibah Bappeltbangda Kota,Kusnahadi Susanto,LAPORAN PENELITIAN KOTA CIMAHI_compresse,2025
2,Sonya Hutabarat,140710220055,Dengan lembaga riset yang bereputasi,CORE Project (Citarum Oxbow Remediation and Enhancement),Kolaborasi Internasional / Coca Cola Fondation,Kusnahadi Susanto,Surat Keterangan mahasiswa Unpad.pdf,2026 ganjil 26/27
3,Gita Putri Jelita,140710220011,Dengan dosen tetap dari perguruan tinggi homebase,MONITORING GETARAN TANAH BERBASIS IoT DAN AI UNTUK MITIGASI BENCANA GERAKAN TANAH,RIM Kompetisi Gelombang 8,Prof. Dr. rer. nat. Yudi Rosandi, M.Si.,,2025-2026 genap 25/26`
          }
          templateData={
            subTab === "magang"
              ? [
                  {
                    NPM: "31242001",
                    "NAMA MAHASISWA": "Andi Pratama",
                    "NAMA INSTANSI TEMPAT MAGANG": "PT Geo Teknologi",
                    SEMESTER: "Genap 2025/2026",
                    "JUDUL TOPIK MAGANG": "Analisis Data Geofisika",
                    "DOSEN PEMBIMBING LAPANGAN": "Bapak Andi",
                    "DOSEN PEMBIMBING DALAM": "Dr. Maria Ulfah, S.Si., M.Si.",
                    "PERIODE MAGANG": "Jan-Jun 2025",
                  },
                ]
              : [
                  {
                    NO: 1,
                    "NAMA MAHASISWA": "Akmal Renaisans Barnais",
                    NPM: "140710220035",
                    KETERLIBATAN:
                      "Dengan pemerintah/BUMN/BUMD (dibimbing dosen)",
                    "JUDUL RISET": "Kota Cimahi Untuk Rekomendasi Zonasi",
                    "JENIS RISET/SUMBER DANA": "Hibah Bappeltbangda Kota",
                    "NAMA KETUA RISET (DOSEN)": "Kusnahadi Susanto",
                    BUKTI: "LAPORAN PENELITIAN KOTA CIMAHI_compresse",
                    "TAHUN/PERIODE": "2025",
                  },
                  {
                    NO: 2,
                    "NAMA MAHASISWA": "Sonya Hutabarat",
                    NPM: "140710220055",
                    KETERLIBATAN: "Dengan lembaga riset yang bereputasi",
                    "JUDUL RISET":
                      "CORE Project (Citarum Oxbow Remediation and Enhancement)",
                    "JENIS RISET/SUMBER DANA":
                      "Kolaborasi Internasional / Coca Cola Fondation",
                    "NAMA KETUA RISET (DOSEN)": "Kusnahadi Susanto",
                    BUKTI: "Surat Keterangan mahasiswa Unpad.pdf",
                    "TAHUN/PERIODE": "2026 ganjil 26/27",
                  },
                  {
                    NO: 3,
                    "NAMA MAHASISWA": "Gita Putri Jelita",
                    NPM: "140710220011",
                    KETERLIBATAN:
                      "Dengan dosen tetap dari perguruan tinggi homebase",
                    "JUDUL RISET":
                      "MONITORING GETARAN TANAH BERBASIS IoT DAN AI UNTUK MITIGASI BENCANA GERAKAN TANAH",
                    "JENIS RISET/SUMBER DANA": "RIM Kompetisi Gelombang 8",
                    "NAMA KETUA RISET (DOSEN)":
                      "Prof. Dr. rer. nat. Yudi Rosandi, M.Si.",
                    BUKTI: "",
                    "TAHUN/PERIODE": "2025-2026 genap 25/26",
                  },
                ]
          }
          onImport={onBulkImportMagang}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Main Table Area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-gray-100 bg-slate-50/70 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-main)]/40 pointer-events-none" />
            <input
              type="text"
              placeholder={
                subTab === "magang"
                  ? "Cari nama mahasiswa, NPM, atau instansi magang..."
                  : "Cari mahasiswa, judul riset, ketua riset, sumber dana, bukti..."
              }
              aria-label="Cari data kegiatan"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
                setExpandedId(null);
              }}
              className="w-full pl-10 pr-9 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20 focus-visible:border-[var(--color-primary)]"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setPage(1);
                  setExpandedId(null);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none transition"
                aria-label="Bersihkan pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {subTab === "penelitian" && (
            <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setViewMode("individu");
                  setPage(1);
                  setExpandedId(null);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === "individu"
                    ? "bg-white text-[var(--color-primary)] shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Tampilkan per baris mahasiswa"
              >
                <User className="w-3.5 h-3.5" />
                <span>Individu ({filteredCurrentData.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode("kelompok");
                  setPage(1);
                  setExpandedId(null);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === "kelompok"
                    ? "bg-white text-[var(--color-primary)] shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Gabungkan mahasiswa dengan judul riset yang sama"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Kelompok Riset ({groupedProjects.length})</span>
              </button>
            </div>
          )}

          {subTab === "penelitian" && (
            <select
              value={filterKeterlibatan}
              onChange={(e) => {
                setFilterKeterlibatan(e.target.value);
                setPage(1);
                setExpandedId(null);
              }}
              aria-label="Filter skema keterlibatan"
              className="p-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20 focus-visible:border-[var(--color-primary)] sm:w-56 text-slate-700 font-medium"
            >
              <option value="All">Semua Skema Keterlibatan</option>
              {SKEMA_KETERLIBATAN_OPTIONS.map((skema) => (
                <option key={skema} value={skema}>
                  {skema}
                </option>
              ))}
            </select>
          )}

          <select
            value={filterSemester}
            onChange={(e) => {
              setFilterSemester(e.target.value);
              setPage(1);
              setExpandedId(null);
            }}
            aria-label={
              subTab === "magang"
                ? "Filter semester magang"
                : "Filter tahun/periode riset"
            }
            className="p-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20 focus-visible:border-[var(--color-primary)] sm:w-44 text-slate-700 font-medium"
          >
            <option value="All">
              {subTab === "magang" ? "Semua Semester" : "Semua Tahun/Periode"}
            </option>
            {semesterOptions.map((sem) => (
              <option key={sem} value={sem}>
                {sem}
              </option>
            ))}
          </select>
        </div>

        {/* Tabel Data */}
        {loading ? (
          <SkeletonTable rows={10} cols={6} />
        ) : (
          <>
            <div className="overflow-x-auto" ref={tableRef}>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider">
                    {isKelompok ? (
                      <>
                        <th className="p-3.5 pl-5 w-12 text-center">#</th>
                        <th className="p-3.5 min-w-[260px] max-w-[340px]">
                          Judul Riset & Skema
                        </th>
                        <th className="p-3.5 min-w-[160px]">
                          Ketua Riset (Dosen)
                        </th>
                        <th className="p-3.5 min-w-[200px]">
                          Anggota Mahasiswa
                        </th>
                        <th className="p-3.5 min-w-[140px]">Sumber Dana</th>
                        <th className="p-3.5 w-32 text-center">
                          Tahun / Periode
                        </th>
                        <th className="p-3.5 min-w-[150px] max-w-[200px]">
                          Bukti
                        </th>
                        <th className="p-3.5 pr-5 text-center min-w-[110px]">
                          Aksi
                        </th>
                      </>
                    ) : (
                      <>
                        <th className="p-3.5 pl-5 w-12 text-center">#</th>
                        <th className="p-3.5 min-w-[170px]">Mahasiswa</th>
                        {subTab === "magang" ? (
                          <>
                            <th className="p-3.5 min-w-[180px]">
                              Instansi Magang
                            </th>
                            <th className="p-3.5 w-32 text-center">Semester</th>
                            <th className="p-3.5 min-w-[220px]">
                              Topik Magang
                            </th>
                            <th className="p-3.5 min-w-[160px]">Dospem</th>
                          </>
                        ) : (
                          <>
                            <th className="p-3.5 min-w-[140px]">
                              Keterlibatan
                            </th>
                            <th className="p-3.5 min-w-[240px] max-w-[320px]">
                              Judul Riset
                            </th>
                            <th className="p-3.5 min-w-[160px]">
                              Ketua Riset (Dosen)
                            </th>
                            <th className="p-3.5 min-w-[140px]">Sumber Dana</th>
                            <th className="p-3.5 w-32 text-center">
                              Tahun / Periode
                            </th>
                            <th className="p-3.5 min-w-[150px] max-w-[200px]">
                              Bukti
                            </th>
                          </>
                        )}
                        <th className="p-3.5 pr-5 text-center w-12"></th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {isKelompok ? (
                    <>
                      {paginatedGrouped.map((grp, idx) => {
                        const isExpanded = expandedId === grp.id;
                        const dospemDalam = getDospemDalamName(
                          grp.nip_dosen_pembimbing_dalam,
                        );
                        const ketuaRiset =
                          grp.nama_ketua_riset ||
                          dospemDalam ||
                          grp.dosen_pembimbing_lapangan ||
                          "-";

                        return (
                          <React.Fragment key={grp.id}>
                            <tr
                              tabIndex={0}
                              role="button"
                              aria-expanded={isExpanded}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  toggleExpand(grp.id);
                                }
                              }}
                              className={`hover:bg-slate-50/80 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-inset ${
                                isExpanded
                                  ? "bg-[var(--color-primary)]/[0.04]"
                                  : ""
                              }`}
                              onClick={() => toggleExpand(grp.id)}
                            >
                              <td className="p-3.5 pl-5 text-slate-400 font-mono text-xs text-center">
                                {(safePage - 1) * ROWS_PER_PAGE + idx + 1}
                              </td>
                              <td className="p-3.5 max-w-[340px]">
                                <span
                                  className="text-xs font-semibold text-slate-900 line-clamp-2 block"
                                  title={grp.judul_topik_magang}
                                >
                                  {grp.judul_topik_magang || "-"}
                                </span>
                                <div className="mt-1">
                                  {getKeterlibatanBadge(grp.keterlibatan)}
                                </div>
                              </td>
                              <td className="p-3.5 text-xs font-medium text-slate-700">
                                {ketuaRiset}
                              </td>
                              <td className="p-3.5">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-[var(--color-primary)] border border-rose-200 mb-1">
                                  <Users className="w-3.5 h-3.5 shrink-0" />
                                  <span>{grp.members.length} Mahasiswa</span>
                                </div>
                                <div
                                  className="text-[11px] text-slate-600 line-clamp-1 max-w-[220px]"
                                  title={grp.members
                                    .map((m) => m.nama)
                                    .join(", ")}
                                >
                                  {grp.members
                                    .slice(0, 2)
                                    .map((m) => m.nama)
                                    .join(", ")}
                                  {grp.members.length > 2
                                    ? `, +${grp.members.length - 2} lainnya`
                                    : ""}
                                </div>
                              </td>
                              <td
                                className="p-3.5 text-xs text-slate-600 max-w-[140px] truncate"
                                title={grp.sumber_dana}
                              >
                                {grp.sumber_dana || "-"}
                              </td>
                              <td className="p-3.5 text-xs font-medium text-slate-600 whitespace-nowrap text-center">
                                {grp.semester}
                              </td>
                              <td className="p-3.5 text-xs text-slate-700 max-w-[200px]">
                                {grp.bukti_dokumen ? (
                                  /^https?:\/\//i.test(grp.bukti_dokumen) ? (
                                    <a
                                      href={grp.bukti_dokumen}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-50 text-[var(--color-primary)] hover:bg-red-100 hover:text-[#7f2626] border border-red-200 text-[11px] font-medium transition cursor-pointer max-w-full group shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                                      title={`Buka dokumen: ${grp.bukti_dokumen}`}
                                    >
                                      <FileText className="w-3 h-3 text-[var(--color-primary)] shrink-0" />
                                      <span className="truncate">
                                        Buka Dokumen
                                      </span>
                                      <ExternalLink className="w-3 h-3 opacity-70 group-hover:opacity-100 shrink-0" />
                                    </a>
                                  ) : (
                                    <span
                                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-mono font-medium max-w-full truncate"
                                      title={grp.bukti_dokumen}
                                    >
                                      <FileText className="w-3 h-3 text-[var(--color-primary)] shrink-0" />
                                      <span className="truncate">
                                        {grp.bukti_dokumen}
                                      </span>
                                    </span>
                                  )
                                ) : (
                                  <span className="text-slate-300 font-mono text-center block">
                                    -
                                  </span>
                                )}
                              </td>
                              <td className="p-3.5 pr-5 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenAddWithPreset(grp);
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:text-[var(--color-primary)] shadow-2xs transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                                    title="Tambah anggota mahasiswa ke riset ini"
                                  >
                                    <UserPlus className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                                    <span className="hidden sm:inline">
                                      Anggota
                                    </span>
                                  </button>
                                  <IconButton
                                    label={
                                      isExpanded
                                        ? "Tutup daftar anggota"
                                        : "Lihat daftar anggota"
                                    }
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleExpand(grp.id);
                                    }}
                                    icon={
                                      isExpanded ? (
                                        <ChevronUp className="w-4 h-4" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4" />
                                      )
                                    }
                                  />
                                </div>
                              </td>
                            </tr>

                            {/* Detail Anggota Kelompok */}
                            {isExpanded && (
                              <tr>
                                <td colSpan={8} className="p-0">
                                  <div className="px-6 pb-4 pt-3 bg-slate-50/90 border-t border-slate-200">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-200">
                                      <div>
                                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                          <Users className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                                          Daftar Anggota Mahasiswa (
                                          {grp.members.length} Orang)
                                        </h4>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                          Riset:{" "}
                                          <span className="font-semibold text-slate-700">
                                            {grp.judul_topik_magang}
                                          </span>
                                        </p>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOpenAddWithPreset(grp)
                                        }
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[#852c2c] text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer self-start sm:self-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                                      >
                                        <UserPlus className="w-3.5 h-3.5" />
                                        <span>+ Tambah Anggota</span>
                                      </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                      {grp.members.map((mbr) => (
                                        <div
                                          key={mbr.id_mbkm || mbr.npm_mahasiswa}
                                          className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg shadow-2xs hover:border-slate-300 transition"
                                        >
                                          <div className="min-w-0 pr-2">
                                            <div
                                              className="text-xs font-semibold text-slate-900 truncate"
                                              title={mbr.nama}
                                            >
                                              {mbr.nama}
                                            </div>
                                            <div className="text-[11px] font-mono text-slate-500">
                                              {mbr.npm_mahasiswa}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1 shrink-0">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleEditClick(mbr.raw)
                                              }
                                              title={`Edit data ${mbr.nama}`}
                                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                            >
                                              <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                mbr.id_mbkm &&
                                                onDeleteMbkm(mbr.id_mbkm)
                                              }
                                              title={`Hapus ${mbr.nama} dari riset`}
                                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                      {paginatedGrouped.length === 0 && (
                        <tr>
                          <td
                            colSpan={8}
                            className="text-center py-10 text-gray-400 text-xs"
                          >
                            Tidak ada kelompok riset yang sesuai dengan filter
                            pencarian.
                          </td>
                        </tr>
                      )}
                    </>
                  ) : (
                    <>
                      {paginatedData.map((m, idx) => {
                        const mhs = mahasiswa.find(
                          (s) => s.npm === m.npm_mahasiswa,
                        );
                        const isExpanded = expandedId === m.id_mbkm;
                        const dospemDalam = getDospemDalamName(
                          m.nip_dosen_pembimbing_dalam,
                        );
                        const ketuaRiset =
                          m.nama_ketua_riset ||
                          dospemDalam ||
                          m.dosen_pembimbing_lapangan ||
                          "-";

                        return (
                          <React.Fragment key={m.id_mbkm}>
                            <tr
                              tabIndex={0}
                              role="button"
                              aria-expanded={isExpanded}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  toggleExpand(m.id_mbkm);
                                }
                              }}
                              className={`hover:bg-slate-50/80 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-inset ${
                                isExpanded
                                  ? "bg-[var(--color-primary)]/[0.04]"
                                  : ""
                              }`}
                              onClick={() => toggleExpand(m.id_mbkm)}
                            >
                              <td className="p-3.5 pl-5 text-slate-400 font-mono text-xs text-center">
                                {(safePage - 1) * ROWS_PER_PAGE + idx + 1}
                              </td>
                              <td className="p-3.5">
                                <div className="font-semibold text-[var(--color-text-main)]">
                                  {mhs ? mhs.nama : "N/A"}
                                </div>
                                <div className="text-xs font-mono text-slate-500">
                                  {m.npm_mahasiswa}
                                </div>
                              </td>

                              {subTab === "magang" ? (
                                <>
                                  <td className="p-3.5 font-medium text-[var(--color-text-main)]">
                                    {m.tempat_instansi}
                                  </td>
                                  <td className="p-3.5 text-xs font-medium text-slate-600 text-center">
                                    {m.semester}
                                  </td>
                                  <td
                                    className="p-3.5 text-xs text-slate-600 max-w-xs truncate"
                                    title={m.judul_topik_magang}
                                  >
                                    {m.judul_topik_magang || "-"}
                                  </td>
                                  <td className="p-3.5 text-xs text-slate-600">
                                    {dospemDalam ||
                                      m.dosen_pembimbing_lapangan ||
                                      "-"}
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="p-3.5">
                                    {getKeterlibatanBadge(
                                      m.keterlibatan || m.tempat_instansi,
                                    )}
                                  </td>
                                  <td className="p-3.5 max-w-[320px]">
                                    <span
                                      className="text-xs font-medium text-slate-800 line-clamp-2 block"
                                      title={m.judul_topik_magang}
                                    >
                                      {m.judul_topik_magang || "-"}
                                    </span>
                                  </td>
                                  <td className="p-3.5 text-xs font-medium text-slate-700">
                                    {ketuaRiset}
                                  </td>
                                  <td
                                    className="p-3.5 text-xs text-slate-600 max-w-[140px] truncate"
                                    title={m.sumber_dana}
                                  >
                                    {m.sumber_dana || "-"}
                                  </td>
                                  <td className="p-3.5 text-xs font-medium text-slate-600 whitespace-nowrap text-center">
                                    {m.semester}
                                  </td>
                                  <td className="p-3.5 text-xs text-slate-700 max-w-[200px]">
                                    {m.bukti_dokumen ? (
                                      /^https?:\/\//i.test(m.bukti_dokumen) ? (
                                        <a
                                          href={m.bukti_dokumen}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-50 text-[var(--color-primary)] hover:bg-red-100 hover:text-[#7f2626] border border-red-200 text-[11px] font-medium transition cursor-pointer max-w-full group shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                                          title={`Buka dokumen: ${m.bukti_dokumen}`}
                                        >
                                          <FileText className="w-3 h-3 text-[var(--color-primary)] shrink-0" />
                                          <span className="truncate">
                                            Buka Dokumen
                                          </span>
                                          <ExternalLink className="w-3 h-3 opacity-70 group-hover:opacity-100 shrink-0" />
                                        </a>
                                      ) : (
                                        <span
                                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-mono font-medium max-w-full truncate"
                                          title={m.bukti_dokumen}
                                        >
                                          <FileText className="w-3 h-3 text-[var(--color-primary)] shrink-0" />
                                          <span className="truncate">
                                            {m.bukti_dokumen}
                                          </span>
                                        </span>
                                      )
                                    ) : (
                                      <span className="text-slate-300 font-mono text-center block">
                                        -
                                      </span>
                                    )}
                                  </td>
                                </>
                              )}

                              <td className="p-3.5 pr-5 text-center">
                                <IconButton
                                  label={
                                    isExpanded ? "Tutup detail" : "Lihat detail"
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand(m.id_mbkm);
                                  }}
                                  icon={
                                    isExpanded ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )
                                  }
                                />
                              </td>
                            </tr>

                            {/* Detail Expandable Row */}
                            {isExpanded && (
                              <tr>
                                <td
                                  colSpan={subTab === "magang" ? 7 : 9}
                                  className="p-0"
                                >
                                  <div className="px-6 pb-4 pt-3 bg-slate-50/90 border-t border-slate-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2.5 text-xs">
                                      {subTab === "magang" ? (
                                        <>
                                          <div className="flex items-center gap-2">
                                            <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                            <span className="text-gray-500">
                                              Instansi:
                                            </span>
                                            <span className="font-semibold text-gray-800">
                                              {m.tempat_instansi}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                            <span className="text-gray-500">
                                              Semester:
                                            </span>
                                            <span className="font-semibold text-gray-800">
                                              {m.semester}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                            <span className="text-gray-500">
                                              Periode:
                                            </span>
                                            <span className="font-semibold text-gray-800">
                                              {m.periode_magang || "-"}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2 md:col-span-2">
                                            <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                                            <span className="text-gray-500">
                                              Topik Magang:
                                            </span>
                                            <span className="font-semibold text-gray-800">
                                              {m.judul_topik_magang || "-"}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                                            <span className="text-gray-500">
                                              Dospem Lapangan:
                                            </span>
                                            <span className="font-semibold text-gray-800">
                                              {m.dosen_pembimbing_lapangan ||
                                                "-"}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                                            <span className="text-gray-500">
                                              Dospem UNPAD:
                                            </span>
                                            <span className="font-semibold text-gray-800">
                                              {dospemDalam || "-"}
                                            </span>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <div className="flex items-center gap-2 md:col-span-2">
                                            <Landmark className="w-3.5 h-3.5 text-gray-400" />
                                            <span className="text-gray-500">
                                              Skema Keterlibatan:
                                            </span>
                                            <span className="font-semibold text-gray-800">
                                              {m.keterlibatan ||
                                                m.tempat_instansi}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                            <span className="text-gray-500">
                                              Tahun/Periode:
                                            </span>
                                            <span className="font-semibold text-gray-800">
                                              {m.semester}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2 md:col-span-3">
                                            <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                                            <span className="text-gray-500">
                                              Judul Riset:
                                            </span>
                                            <span className="font-semibold text-gray-900">
                                              {m.judul_topik_magang || "-"}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                                            <span className="text-gray-500">
                                              Ketua Riset (Dosen):
                                            </span>
                                            <span className="font-semibold text-gray-800">
                                              {ketuaRiset}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                                            <span className="text-gray-500">
                                              Sumber Dana:
                                            </span>
                                            <span className="font-semibold text-gray-800">
                                              {m.sumber_dana || "-"}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                            <span className="text-gray-500">
                                              Bukti:
                                            </span>
                                            {m.bukti_dokumen ? (
                                              /^https?:\/\//i.test(
                                                m.bukti_dokumen,
                                              ) ? (
                                                <a
                                                  href={m.bukti_dokumen}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:underline truncate max-w-md"
                                                  title={m.bukti_dokumen}
                                                >
                                                  <span className="truncate">
                                                    {m.bukti_dokumen}
                                                  </span>
                                                  <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-0.5" />
                                                </a>
                                              ) : (
                                                <span className="font-semibold text-gray-800">
                                                  {m.bukti_dokumen}
                                                </span>
                                              )
                                            ) : (
                                              <span className="font-semibold text-gray-800">
                                                -
                                              </span>
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditClick(m);
                                        }}
                                        aria-label={`Edit data ${subTab === "magang" ? "magang" : "riset"} ${m.npm_mahasiswa}`}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:border-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition cursor-pointer"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" /> Edit
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (m.id_mbkm) onDeleteMbkm(m.id_mbkm);
                                        }}
                                        aria-label={`Hapus data ${subTab === "magang" ? "magang" : "riset"} ${m.npm_mahasiswa}`}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 transition cursor-pointer"
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
                      {filteredCurrentData.length === 0 && (
                        <tr>
                          <td
                            colSpan={subTab === "magang" ? 7 : 9}
                            className="text-center py-10 text-gray-400 text-xs"
                          >
                            Tidak ada data yang sesuai dengan filter pencarian.
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {totalItems > ROWS_PER_PAGE && (
              <div className="flex items-center justify-between p-4 border-t border-gray-100">
                <span className="text-xs text-[var(--color-text-main)]/50">
                  Menampilkan {(safePage - 1) * ROWS_PER_PAGE + 1}–
                  {Math.min(safePage * ROWS_PER_PAGE, totalItems)} dari{" "}
                  {totalItems} {isKelompok ? "kelompok riset" : "data"}
                </span>
                <Pagination
                  page={safePage}
                  totalPages={totalPages}
                  onChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <MbkmFormModal
          subTab={subTab}
          editingMbkm={editingMbkm}
          form={form}
          setForm={setForm}
          isSubmitting={isSubmitting}
          mahasiswa={mahasiswa}
          dosen={dosen}
          onSubmit={handleSubmit}
          onClose={() => {
            setShowAddModal(false);
            resetForm();
          }}
          modalRef={magangModalRef}
        />
      )}
    </div>
  );
}
