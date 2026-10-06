import { useState, useCallback } from "react";
import { academicService } from "../lib/academicService";
import { Prestasi, AnggotaPrestasi } from "../types";
import { errMsg } from "../lib/format";
import { ToastOptions } from "../components/Toast";

export function usePrestasiActions(
  triggerToast: (opts: ToastOptions) => void,
  setConfirmAction: (
    action: {
      title: string;
      message: string;
      detail?: string;
      onConfirm: () => void;
    } | null,
  ) => void,
) {
  const [prestasi, setPrestasi] = useState<Prestasi[]>([]);
  const [anggotaPrestasi, setAnggotaPrestasi] = useState<AnggotaPrestasi[]>([]);

  const refreshPrestasi = useCallback(async () => {
    try {
      const data = await academicService.getPrestasi();
      setPrestasi(data);
    } catch (err) {
      console.error("Gagal memuat prestasi:", err);
    }
  }, []);

  const refreshAnggota = useCallback(async () => {
    try {
      const data = await academicService.getAnggotaPrestasi();
      setAnggotaPrestasi(data);
    } catch (err) {
      console.error("Gagal memuat anggota prestasi:", err);
    }
  }, []);

  const handleSavePrestasi = async (p: Prestasi) => {
    try {
      await academicService.savePrestasi(p);
      await refreshPrestasi();
      triggerToast({
        kind: "success",
        title: "Prestasi Tersimpan",
        message: `Data prestasi ${p.nama_kompetisi} berhasil disimpan.`,
      });
    } catch (err) {
      triggerToast({
        kind: "error",
        title: "Gagal Menyimpan",
        message: errMsg(err, "Terjadi kesalahan saat menyimpan data prestasi."),
      });
    }
  };

  const handleDeletePrestasi = (id: string) => {
    setConfirmAction({
      title: "Hapus Prestasi",
      message:
        "Apakah Anda yakin ingin menghapus pencatatan prestasi ini dari sistem?",
      onConfirm: async () => {
        try {
          await academicService.deletePrestasi(id);
          await refreshPrestasi();
          await refreshAnggota();
          triggerToast({
            kind: "success",
            title: "Prestasi Dihapus",
            message: "Pencatatan prestasi berhasil dihapus.",
          });
        } catch (err) {
          triggerToast({
            kind: "error",
            title: "Gagal Menghapus",
            message: errMsg(err, "Gagal menghapus data prestasi."),
          });
        }
      },
    });
  };

  const handleSaveAnggota = async (anggota: AnggotaPrestasi) => {
    try {
      await academicService.saveAnggotaPrestasi(anggota);
      await refreshAnggota();
      triggerToast({
        kind: "success",
        title: "Anggota Tersimpan",
        message: `Data anggota prestasi berhasil disimpan.`,
      });
    } catch (err) {
      triggerToast({
        kind: "error",
        title: "Gagal Menyimpan",
        message: errMsg(
          err,
          "Terjadi kesalahan saat menyimpan data anggota prestasi.",
        ),
      });
    }
  };

  const handleDeleteAnggota = async (id: string) => {
    try {
      await academicService.deleteAnggotaPrestasi(id);
      await refreshAnggota();
      triggerToast({
        kind: "success",
        title: "Anggota Dihapus",
        message: "Anggota prestasi berhasil dihapus.",
      });
    } catch (err) {
      triggerToast({
        kind: "error",
        title: "Gagal Menghapus",
        message: errMsg(err, "Gagal menghapus data anggota prestasi."),
      });
    }
  };

  const handleBulkReplaceAnggota = async (
    id_prestasi: string,
    anggota: AnggotaPrestasi[],
  ) => {
    try {
      await academicService.bulkReplaceAnggotaPrestasi(id_prestasi, anggota);
      await refreshAnggota();
    } catch (err) {
      triggerToast({
        kind: "error",
        title: "Gagal Simpan Anggota",
        message: errMsg(
          err,
          "Terjadi kesalahan saat menyimpan anggota prestasi.",
        ),
      });
    }
  };

  const handleBulkImportPrestasi = async (data: Record<string, unknown>[]) => {
    const listToInsert: Prestasi[] = [];
    let errors = 0;
    for (const row of data) {
      const npm = String(
        row.npm_mahasiswa ||
          row["NPM Mahasiswa"] ||
          row["NPM"] ||
          row["npm"] ||
          "",
      ).trim();
      const namaMhs = String(
        row.nama_mahasiswa || row["Nama Mahasiswa"] || row["Nama"] || "",
      ).trim();
      if (!npm && !namaMhs) {
        errors++;
        continue;
      }
      const juaraVal = row.juara_ke || row["Juara Ke"] || 0;
      const juaraNum = (() => {
        const n = Number(juaraVal);
        if (!isNaN(n)) return n;
        const m = String(juaraVal).match(/(\d+)/);
        return m ? parseInt(m[1], 10) : 0;
      })();
      const p: Prestasi = {
        npm_mahasiswa: npm || undefined,
        nama_mahasiswa: namaMhs || undefined,
        nama_kompetisi: String(
          row.nama_kompetisi || row["Nama Kompetisi"] || "",
        ).trim(),
        tingkat: (row.tingkat ||
          row["Tingkat"] ||
          "Nasional") as Prestasi["tingkat"],
        juara_ke: juaraNum,
        jenis_peserta: (row.jenis_peserta ||
          row["Jenis Peserta"] ||
          "Individu") as "Individu" | "Kelompok",
        tahun_kegiatan:
          Number(
            row.tahun_kegiatan || row["Tahun"] || row["Tahun Kegiatan"] || 0,
          ) || undefined,
        tempat: String(row.tempat || row["Tempat"] || "").trim() || undefined,
        dosen_pembimbing:
          String(
            row.dosen_pembimbing ||
              row["Dosen Pembimbing"] ||
              row["Dospem"] ||
              "",
          ).trim() || undefined,
      };
      if (!p.nama_kompetisi) {
        errors++;
        continue;
      }
      listToInsert.push(p);
    }

    if (listToInsert.length === 0) {
      triggerToast({
        kind: "error",
        title: "Import Gagal",
        message: "Tidak ada data prestasi valid yang dapat diimport.",
      });
      throw new Error("Import gagal");
    }

    try {
      await academicService.bulkInsertPrestasi(listToInsert);
      await refreshPrestasi();
      triggerToast({
        kind: "success",
        title: "Import Prestasi Berhasil",
        message:
          errors > 0
            ? `${listToInsert.length} data berhasil diimport, ${errors} gagal.`
            : `Berhasil menambahkan/memperbarui ${listToInsert.length} data prestasi.`,
      });
    } catch (err) {
      triggerToast({
        kind: "error",
        title: "Import Gagal",
        message: errMsg(
          err,
          "Terjadi kesalahan saat menyimpan data batch prestasi.",
        ),
      });
      throw err;
    }
  };

  return {
    prestasi,
    setPrestasi,
    anggotaPrestasi,
    setAnggotaPrestasi,
    refreshPrestasi,
    refreshAnggota,
    handleSavePrestasi,
    handleDeletePrestasi,
    handleSaveAnggota,
    handleDeleteAnggota,
    handleBulkReplaceAnggota,
    handleBulkImportPrestasi,
  };
}
