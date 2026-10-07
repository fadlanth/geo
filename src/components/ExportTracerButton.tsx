import React, { useState } from "react";
import { Download, Loader2, FileSpreadsheet } from "lucide-react";
import { supabase } from "../lib/supabase";

export interface RawTracerStudyRecord {
  npm_mahasiswa: string;
  nama_alumni?: string | null;
  tahun_lulus: number;
  status_lulusan:
    "Bekerja" | "Wiraswasta" | "Studi Lanjut" | "Belum Bekerja" | string;
  masa_tunggu?: string | null;
  masa_tunggu_bulan?: number | null;
  kategori_gaji?: string | null;
  gaji_pekerjaan?: number | null;
  instansi_perusahaan?: string | null;
  instansi_pekerjaan?: string | null;
  jabatan?: string | null;
  bidang_usaha?: string | null;
  kampus_tujuan?: string | null;
  kampus_lanjut?: string | null;
  universitas_tujuan?: string | null;
  program_studi?: string | null;
  prodi_lanjut?: string | null;
  mahasiswa?: {
    nama?: string | null;
  } | null;
}

const extractRowData = (item: RawTracerStudyRecord) => {
  const npm = item.npm_mahasiswa || "-";
  const nama = item.nama_alumni || item.mahasiswa?.nama || "-";
  const tahun = item.tahun_lulus ?? "-";

  let masaTunggu = item.masa_tunggu;
  if (!masaTunggu && item.masa_tunggu_bulan != null) {
    masaTunggu = `${item.masa_tunggu_bulan} Bulan`;
  }

  let kategoriGaji = item.kategori_gaji;
  if (!kategoriGaji && item.gaji_pekerjaan != null) {
    if (item.gaji_pekerjaan <= 0) kategoriGaji = "-";
    else if (item.gaji_pekerjaan <= 5_000_000) kategoriGaji = "0-5jt";
    else if (item.gaji_pekerjaan <= 10_000_000) kategoriGaji = ">5-10jt";
    else kategoriGaji = ">10jt";
  }

  return {
    NPM: npm,
    Nama: nama,
    Tahun: tahun,
    "Masa Tunggu": masaTunggu || "-",
    "Kategori Gaji": kategoriGaji || "-",
    Instansi: item.instansi_perusahaan || item.instansi_pekerjaan || "-",
    Jabatan: item.jabatan || "-",
    "Bidang Usaha": item.bidang_usaha || "-",
    "Kampus Tujuan":
      item.kampus_tujuan ||
      item.universitas_tujuan ||
      item.kampus_lanjut ||
      "-",
    "Program Studi": item.program_studi || item.prodi_lanjut || "-",
  };
};

const getColWidths = (rows: Record<string, unknown>[]) => {
  if (!rows || rows.length === 0) return [];
  const keys = Object.keys(rows[0]);
  return keys.map((key) => {
    let maxLen = key.length;
    rows.forEach((r) => {
      const val = r[key];
      const strLen = val != null ? String(val).length : 0;
      if (strLen > maxLen) maxLen = strLen;
    });
    return { wch: Math.min(Math.max(maxLen + 4, 14), 45) };
  });
};

export async function exportTracerMultiSheet(
  onSuccess?: (count: number) => void,
  onError?: (error: Error) => void,
): Promise<number> {
  try {
    const { data, error } = await supabase
      .from("tracer_study")
      .select("*, mahasiswa(nama)");

    if (error) {
      throw new Error(
        error.message || "Gagal mengambil data tracer study dari database.",
      );
    }

    const records = (data as unknown as RawTracerStudyRecord[]) || [];
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();

    const bekerjaData = records
      .filter((r) => r.status_lulusan === "Bekerja")
      .map((r) => {
        const d = extractRowData(r);
        return {
          NPM: d.NPM,
          Nama: d.Nama,
          Tahun: d.Tahun,
          "Masa Tunggu": d["Masa Tunggu"],
          Instansi: d.Instansi,
          Jabatan: d.Jabatan,
          "Kategori Gaji": d["Kategori Gaji"],
        };
      });

    const wsBekerja = XLSX.utils.json_to_sheet(
      bekerjaData.length > 0
        ? bekerjaData
        : [
            {
              NPM: "",
              Nama: "",
              Tahun: "",
              "Masa Tunggu": "",
              Instansi: "",
              Jabatan: "",
              "Kategori Gaji": "",
            },
          ],
    );
    wsBekerja["!cols"] = getColWidths(bekerjaData);
    XLSX.utils.book_append_sheet(workbook, wsBekerja, "Bekerja");

    const wiraswastaData = records
      .filter((r) => r.status_lulusan === "Wiraswasta")
      .map((r) => {
        const d = extractRowData(r);
        return {
          NPM: d.NPM,
          Nama: d.Nama,
          Tahun: d.Tahun,
          "Masa Tunggu": d["Masa Tunggu"],
          "Bidang Usaha": d["Bidang Usaha"],
          "Kategori Gaji": d["Kategori Gaji"],
        };
      });

    const wsWiraswasta = XLSX.utils.json_to_sheet(
      wiraswastaData.length > 0
        ? wiraswastaData
        : [
            {
              NPM: "",
              Nama: "",
              Tahun: "",
              "Masa Tunggu": "",
              "Bidang Usaha": "",
              "Kategori Gaji": "",
            },
          ],
    );
    wsWiraswasta["!cols"] = getColWidths(wiraswastaData);
    XLSX.utils.book_append_sheet(workbook, wsWiraswasta, "Wiraswasta");

    const studiLanjutData = records
      .filter((r) => r.status_lulusan === "Studi Lanjut")
      .map((r) => {
        const d = extractRowData(r);
        return {
          NPM: d.NPM,
          Nama: d.Nama,
          Tahun: d.Tahun,
          "Kampus Tujuan": d["Kampus Tujuan"],
          "Program Studi": d["Program Studi"],
        };
      });

    const wsStudiLanjut = XLSX.utils.json_to_sheet(
      studiLanjutData.length > 0
        ? studiLanjutData
        : [
            {
              NPM: "",
              Nama: "",
              Tahun: "",
              "Kampus Tujuan": "",
              "Program Studi": "",
            },
          ],
    );
    wsStudiLanjut["!cols"] = getColWidths(studiLanjutData);
    XLSX.utils.book_append_sheet(workbook, wsStudiLanjut, "Studi Lanjut");

    XLSX.writeFile(workbook, "Laporan_Tracer_Study_GEO.xlsx");

    if (onSuccess) {
      onSuccess(records.length);
    }
    return records.length;
  } catch (err) {
    const errorObj =
      err instanceof Error
        ? err
        : new Error("Terjadi kegagalan saat mengekspor data tracer study.");
    console.error("[ExportTracerButton] Export failed:", errorObj);
    if (onError) {
      onError(errorObj);
    }
    throw errorObj;
  }
}

interface ExportTracerButtonProps {
  className?: string;
  onSuccess?: (count: number) => void;
  onError?: (error: Error) => void;
}

export const ExportTracerButton: React.FC<ExportTracerButtonProps> = ({
  className = "",
  onSuccess,
  onError,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      await exportTracerMultiSheet(onSuccess, onError);
    } catch (err) {
      const errorObj =
        err instanceof Error
          ? err
          : new Error("Terjadi kegagalan saat mengekspor data tracer study.");
      setErrorMessage(errorObj.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleExport}
        disabled={loading}
        title="Download rekap data mentah tracer study ke Excel (Multi-Sheet)"
        className={`inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition whitespace-nowrap bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-xs cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-1 ${className}`}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
            <span>Mengekspor...</span>
          </>
        ) : (
          <>
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Multi-Sheet</span>
            <Download className="w-3.5 h-3.5 text-slate-400" />
          </>
        )}
      </button>

      {errorMessage && (
        <span className="text-xs text-rose-600 font-medium px-1 mt-0.5">
          {errorMessage}
        </span>
      )}
    </div>
  );
};

export default ExportTracerButton;
