import { useState, useCallback } from "react";
import { academicService } from "../lib/academicService";
import { Mahasiswa } from "../types";
import { errMsg } from "../lib/format";
import { ToastOptions } from "../components/Toast";

export function useMahasiswaActions(
  triggerToast: (opts: ToastOptions) => void,
  setConfirmAction: (
    action: {
      title: string;
      message: string;
      detail?: string;
      onConfirm: () => void;
    } | null,
  ) => void,
  onRefresh: () => Promise<void>,
) {
  const [mahasiswa, setMahasiswa] = useState<Mahasiswa[]>([]);

  const refreshMahasiswa = useCallback(async () => {
    try {
      const data = await academicService.getMahasiswa();
      setMahasiswa(data);
    } catch (err) {
      console.error("Gagal memuat mahasiswa:", err);
    }
  }, []);

  const handleSaveMahasiswa = async (mhs: Mahasiswa) => {
    try {
      await academicService.saveMahasiswa(mhs);
      await refreshMahasiswa();
      triggerToast({
        kind: "success",
        title: "Data Disimpan",
        message: `Berhasil menyimpan data mahasiswa ${mhs.nama}.`,
      });
    } catch (err) {
      triggerToast({
        kind: "error",
        title: "Gagal Menyimpan",
        message: errMsg(err, "Tidak dapat menyimpan data mahasiswa."),
      });
    }
  };

  const normalizeGender = (val: string): string => {
    const v = val.trim().toLowerCase();
    if (v === "l" || v === "laki-laki") return "L";
    if (v === "p" || v === "perempuan") return "P";
    return "L";
  };

  const handleBulkImportMahasiswa = async (data: Record<string, unknown>[]) => {
    try {
      const formattedData: Mahasiswa[] = data
        .map((row) => ({
          npm: String(row.NPM || row.npm || "").trim(),
          nama: String(row.Nama || row.nama || "").trim(),
          angkatan:
            Number(row.Angkatan || row.angkatan) || new Date().getFullYear(),
          jenis_kelamin: normalizeGender(
            String(row["Jenis Kelamin"] || row.jenis_kelamin || ""),
          ),
          fakultas:
            String(row.Fakultas || row.fakultas || "").trim() || "FMIPA",
          prodi: String(row.Prodi || row.prodi || "").trim() || "Geofisika",
          status:
            (String(
              row.Status || row.status || "",
            ).trim() as Mahasiswa["status"]) || "Regulasi Akademik",
          nip_dosen_wali:
            String(row["NIP Dosen Wali"] || row.nip_dosen_wali || "").replace(
              /\s+/g,
              "",
            ) || null,
          tahun_lulus:
            row["Tahun Lulus"] || row.tahun_lulus
              ? Number(row["Tahun Lulus"] || row.tahun_lulus)
              : undefined,
        }))
        .filter((m) => m.npm && m.nama);

      if (formattedData.length === 0) {
        throw new Error(
          "Tidak ada data mahasiswa valid yang ditemukan dalam file.",
        );
      }

      await academicService.bulkInsertMahasiswa(formattedData);
      await refreshMahasiswa();
      triggerToast({
        kind: "success",
        title: "Import Berhasil",
        message: `Berhasil menambahkan/memperbarui ${formattedData.length} data mahasiswa.`,
      });
    } catch (err) {
      triggerToast({
        kind: "error",
        title: "Import Gagal",
        message: errMsg(err, "Terjadi kesalahan format data atau koneksi."),
      });
      throw err;
    }
  };

  const handleDeleteMahasiswa = (npm: string) => {
    setConfirmAction({
      title: "Hapus Mahasiswa",
      message:
        "Apakah Anda yakin ingin menghapus mahasiswa ini dari sistem akademik?",
      onConfirm: async () => {
        try {
          await academicService.deleteMahasiswa(npm);
          await refreshMahasiswa();
          // Cascaded relations might also change (prestasi, mbkm, tracer)
          await onRefresh();
          triggerToast({
            kind: "success",
            title: "Data Dihapus",
            message: "Berhasil menghapus mahasiswa dari sistem.",
          });
        } catch (err) {
          triggerToast({
            kind: "error",
            title: "Gagal Menghapus",
            message: errMsg(err, "Tidak dapat menghapus data mahasiswa."),
          });
        }
      },
    });
  };

  return {
    mahasiswa,
    setMahasiswa,
    refreshMahasiswa,
    handleSaveMahasiswa,
    handleBulkImportMahasiswa,
    handleDeleteMahasiswa,
  };
}
