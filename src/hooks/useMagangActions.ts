import { useState, useCallback } from "react";
import { academicService } from "../lib/academicService";
import { RiwayatMBKM, JenisKegiatan, Dosen, Mahasiswa } from "../types";
import { errMsg } from "../lib/format";
import { ToastOptions } from "../components/Toast";

export function useMagangActions(
  dosen: Dosen[],
  triggerToast: (opts: ToastOptions) => void,
  setConfirmAction: (
    action: {
      title: string;
      message: string;
      detail?: string;
      onConfirm: () => void;
    } | null,
  ) => void,
  mahasiswa?: Mahasiswa[],
  refreshMahasiswa?: () => Promise<void>,
) {
  const [mbkm, setMbkm] = useState<RiwayatMBKM[]>([]);

  const refreshMbkm = useCallback(async () => {
    try {
      const data = await academicService.getMBKM();
      setMbkm(data || []);
    } catch (err) {
      console.error("[MBKM Error] Gagal memuat MBKM:", err);
      triggerToast({
        kind: "error",
        title: "Gagal Memuat Data Magang/MBKM",
        message: errMsg(
          err,
          "Terjadi kendala saat membaca data kegiatan luar prodi dari server.",
        ),
      });
    }
  }, [triggerToast]);

  const handleSaveMbkm = async (m: RiwayatMBKM) => {
    try {
      await academicService.saveMBKM(m);
      await refreshMbkm();
      triggerToast({
        kind: "success",
        title: "Magang Tersimpan",
        message: `Data magang ${m.tempat_instansi} berhasil disimpan.`,
      });
    } catch (err) {
      triggerToast({
        kind: "error",
        title: "Gagal Menyimpan",
        message: errMsg(err, "Terjadi kesalahan saat menyimpan data magang."),
      });
      throw err;
    }
  };

  const handleDeleteMbkm = (id: string) => {
    setConfirmAction({
      title: "Hapus Riwayat MBKM",
      message:
        "Apakah Anda yakin ingin menghapus data riwayat MBKM ini dari sistem?",
      onConfirm: async () => {
        try {
          await academicService.deleteMBKM(id);
          await refreshMbkm();
          triggerToast({
            kind: "success",
            title: "Data Magang Dihapus",
            message: "Data magang berhasil dihapus.",
          });
        } catch (err) {
          triggerToast({
            kind: "error",
            title: "Gagal Menghapus",
            message: errMsg(err, "Gagal menghapus data magang."),
          });
        }
      },
    });
  };

  const handleBulkImportMagang = async (data: Record<string, unknown>[]) => {
    const listToInsert: RiwayatMBKM[] = [];
    const missingStudentsMap = new Map<string, Mahasiswa>();
    const existingNpms = new Set((mahasiswa || []).map((m) => m.npm.trim()));
    let errors = 0;

    for (const row of data) {
      const nr = Object.fromEntries(
        Object.entries(row).map(([k, v]) => [
          k.trim().toLowerCase(),
          String(v ?? "").trim(),
        ]),
      );

      // Parse NPM, handle Excel scientific notation (misal "1,4071E+11" atau "1.4071E+11")
      let npmVal = nr["npm"] || nr["npm_mahasiswa"] || "";
      if (/^[0-9]+[.,][0-9]+[eE]\+[0-9]+$/.test(npmVal)) {
        try {
          const num = Number(npmVal.replace(",", "."));
          if (!isNaN(num)) {
            npmVal = Math.round(num).toString();
          }
        } catch {
          // fallback
        }
      }

      // Deteksi otomatis apakah data ini penelitian dosen
      const isPenelitian = Boolean(
        nr["keterlibatan"] ||
        nr["judul riset"] ||
        nr["judul_riset"] ||
        nr["jenis riset/sumber dana"] ||
        nr["nama ketua riset (dosen)"] ||
        (nr["jenis kegiatan"] || nr["jenis_kegiatan"] || "")
          .toLowerCase()
          .includes("penelitian"),
      );

      const jenisKegiatan: JenisKegiatan = isPenelitian
        ? "Penelitian Dosen"
        : "Magang Industri";

      const keterlibatanVal = nr["keterlibatan"] || undefined;
      const sumberDanaVal =
        nr["jenis riset/sumber dana"] ||
        nr["jenis riset"] ||
        nr["sumber dana"] ||
        nr["sumber_dana"] ||
        undefined;
      const ketuaRisetVal =
        nr["nama ketua riset (dosen)"] ||
        nr["nama ketua riset"] ||
        nr["ketua riset"] ||
        nr["nama_ketua_riset"] ||
        undefined;
      const rawBukti =
        nr["bukti"] ||
        nr["bukti_dokumen"] ||
        nr["bukti dokumen"] ||
        nr["link bukti"] ||
        nr["link"] ||
        nr["dokumen"] ||
        nr["tautan"];
      const buktiVal =
        rawBukti !== undefined &&
        rawBukti !== null &&
        String(rawBukti).trim() !== ""
          ? String(rawBukti).trim()
          : undefined;
      const judulVal =
        nr["judul riset"] ||
        nr["judul_riset"] ||
        nr["judul topik magang"] ||
        nr["judul_topik_magang"] ||
        nr["judul"] ||
        undefined;
      const semesterVal =
        nr["tahun/periode"] ||
        nr["tahun_periode"] ||
        nr["periode"] ||
        nr["semester"] ||
        "";

      const instansiVal = isPenelitian
        ? nr["lab / unit penelitian"] ||
          nr["tempat_instansi"] ||
          keterlibatanVal ||
          "Riset Dosen Geofisika"
        : nr["nama instansi tempat magang"] ||
          nr["tempat_instansi"] ||
          nr["instansi"] ||
          "";

      if (!npmVal || !instansiVal || !semesterVal) {
        errors++;
        continue;
      }

      const namaVal =
        nr["nama mahasiswa"] ||
        nr["nama"] ||
        nr["nama lengkap"] ||
        nr["nama_mahasiswa"] ||
        "";

      // Auto-register mahasiswa ke master data jika belum ada agar memenuhi foreign key
      if (!existingNpms.has(npmVal) && !missingStudentsMap.has(npmVal)) {
        let angkatanVal = new Date().getFullYear();
        if (npmVal.length >= 8) {
          const rawYear = Number(npmVal.slice(6, 8));
          if (!isNaN(rawYear) && rawYear >= 10 && rawYear <= 35) {
            angkatanVal = 2000 + rawYear;
          }
        }
        missingStudentsMap.set(npmVal, {
          npm: npmVal,
          nama: namaVal || `Mahasiswa ${npmVal}`,
          angkatan: angkatanVal,
          jenis_kelamin: "L",
          fakultas: "FMIPA",
          prodi: "Geofisika",
          status: "Regulasi Akademik",
          nip_dosen_wali: null,
        });
      }

      const dospemDalamName =
        nr["dosen pembimbing dalam"] ||
        nr["dosen_pembimbing_dalam"] ||
        ketuaRisetVal ||
        "";
      const dospemDalamNip = (() => {
        if (!dospemDalamName) return null;
        const clean = dospemDalamName.trim().toLowerCase();
        const found = dosen.find(
          (d) =>
            d.nama.toLowerCase().includes(clean) ||
            clean.includes(d.nama.toLowerCase()),
        );
        if (found) return found.nip;
        const nipClean = clean.replace(/\s+/g, "");
        const byNip = dosen.find((d) => d.nip.replace(/\s+/g, "") === nipClean);
        return byNip ? byNip.nip : null;
      })();

      const m: RiwayatMBKM = {
        npm_mahasiswa: npmVal,
        jenis_kegiatan: jenisKegiatan,
        tempat_instansi: instansiVal,
        semester: semesterVal,
        judul_topik_magang: judulVal,
        dosen_pembimbing_lapangan:
          nr["dosen pembimbing lapangan"] ||
          nr["dosen_pembimbing_lapangan"] ||
          ketuaRisetVal ||
          undefined,
        nip_dosen_pembimbing_dalam: dospemDalamNip,
        periode_magang:
          nr["periode magang"] ||
          nr["periode_magang"] ||
          semesterVal ||
          undefined,
        keterlibatan: keterlibatanVal,
        sumber_dana: sumberDanaVal,
        nama_ketua_riset: ketuaRisetVal,
        bukti_dokumen: isPenelitian ? buktiVal : undefined,
      };
      listToInsert.push(m);
    }

    if (listToInsert.length === 0) {
      triggerToast({
        kind: "error",
        title: "Import Gagal",
        message: "Tidak ada data magang valid yang dapat diimport.",
      });
      throw new Error("Import gagal: tidak ada baris data valid.");
    }

    try {
      // Auto-register mahasiswa baru sebelum insert MBKM agar tidak melanggar foreign key constraint
      if (missingStudentsMap.size > 0) {
        const missingStudents = Array.from(missingStudentsMap.values());
        try {
          await academicService.bulkInsertMahasiswa(missingStudents);
          await refreshMahasiswa?.();
        } catch (studentErr) {
          console.warn(
            "Peringatan: Gagal mendaftarkan mahasiswa baru otomatis:",
            studentErr,
          );
        }
      }

      await academicService.bulkInsertMBKM(listToInsert);
      await refreshMbkm();
      triggerToast({
        kind: "success",
        title: "Import Magang Berhasil",
        message:
          errors > 0
            ? `${listToInsert.length} data berhasil diimport (${missingStudentsMap.size} mahasiswa baru didaftarkan), ${errors} gagal.`
            : `Berhasil menambahkan/memperbarui ${listToInsert.length} data magang${missingStudentsMap.size > 0 ? ` (${missingStudentsMap.size} mahasiswa baru didaftarkan)` : ""}.`,
      });
    } catch (err) {
      const rawMsg = errMsg(
        err,
        "Terjadi kesalahan saat menyimpan data batch magang.",
      );
      const friendlyMsg = rawMsg.includes("riwayat_mbkm_npm_mahasiswa_fkey")
        ? "NPM mahasiswa belum terdaftar di data Mahasiswa. Sistem gagal mendaftarkan mahasiswa tersebut ke data induk."
        : rawMsg;
      triggerToast({
        kind: "error",
        title: "Import Gagal",
        message: friendlyMsg,
      });
      throw new Error(friendlyMsg, { cause: err });
    }
  };

  return {
    mbkm,
    setMbkm,
    refreshMbkm,
    handleSaveMbkm,
    handleDeleteMbkm,
    handleBulkImportMagang,
  };
}
