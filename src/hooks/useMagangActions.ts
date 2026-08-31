import { useState, useCallback } from 'react';
import { academicService } from '../lib/academicService';
import { RiwayatMBKM, Dosen } from '../types';
import { errMsg } from '../lib/format';
import { ToastOptions } from '../components/Toast';

export function useMagangActions(
  dosen: Dosen[],
  triggerToast: (opts: ToastOptions) => void,
  setConfirmAction: (action: { title: string; message: string; detail?: string; onConfirm: () => void } | null) => void
) {
  const [mbkm, setMbkm] = useState<RiwayatMBKM[]>([]);

  const refreshMbkm = useCallback(async () => {
    try {
      const data = await academicService.getMBKM();
      setMbkm(data);
    } catch (err) {
      console.error('Gagal memuat MBKM:', err);
    }
  }, []);

  const handleSaveMbkm = async (m: RiwayatMBKM) => {
    try {
      await academicService.saveMBKM(m);
      await refreshMbkm();
      triggerToast({
        kind: 'success',
        title: 'Magang Tersimpan',
        message: `Data magang ${m.tempat_instansi} berhasil disimpan.`
      });
    } catch (err) {
      triggerToast({
        kind: 'error',
        title: 'Gagal Menyimpan',
        message: errMsg(err, 'Terjadi kesalahan saat menyimpan data magang.')
      });
      throw err;
    }
  };

  const handleDeleteMbkm = (id: string) => {
    setConfirmAction({
      title: 'Hapus Riwayat MBKM',
      message: 'Apakah Anda yakin ingin menghapus data riwayat MBKM ini dari sistem?',
      onConfirm: async () => {
        try {
          await academicService.deleteMBKM(id);
          await refreshMbkm();
          triggerToast({
            kind: 'success',
            title: 'Data Magang Dihapus',
            message: 'Data magang berhasil dihapus.'
          });
        } catch (err) {
          triggerToast({
            kind: 'error',
            title: 'Gagal Menghapus',
            message: errMsg(err, 'Gagal menghapus data magang.')
          });
        }
      }
    });
  };

  const handleBulkImportMagang = async (data: Record<string, unknown>[]) => {
    const listToInsert: RiwayatMBKM[] = [];
    let errors = 0;
    for (const row of data) {
      const nr = Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), String(v ?? '')])
      );
      const npmVal = nr['npm'] || nr['npm_mahasiswa'] || '';
      const instansiVal = nr['nama instansi tempat magang'] || nr['tempat_instansi'] || '';
      const semesterVal = nr['semester'] || '';
      if (!npmVal || !instansiVal || !semesterVal) { errors++; continue; }
      const dospemDalamName = nr['dosen pembimbing dalam'] || nr['dosen_pembimbing_dalam'] || '';
      const dospemDalamNip = (() => {
        if (!dospemDalamName) return null;
        const clean = dospemDalamName.trim().toLowerCase();
        const found = dosen.find(d => d.nama.toLowerCase().includes(clean) || clean.includes(d.nama.toLowerCase()));
        if (found) return found.nip;
        const nipClean = clean.replace(/\s+/g, '');
        const byNip = dosen.find(d => d.nip.replace(/\s+/g, '') === nipClean);
        return byNip ? byNip.nip : null;
      })();

      const m: RiwayatMBKM = {
        npm_mahasiswa: npmVal,
        tempat_instansi: instansiVal,
        semester: semesterVal,
        judul_topik_magang: nr['judul topik magang'] || nr['judul_topik_magang'] || undefined,
        dosen_pembimbing_lapangan: nr['dosen pembimbing lapangan'] || nr['dosen_pembimbing_lapangan'] || undefined,
        nip_dosen_pembimbing_dalam: dospemDalamNip,
        periode_magang: nr['periode magang'] || nr['periode_magang'] || undefined
      };
      listToInsert.push(m);
    }

    if (listToInsert.length === 0) {
      triggerToast({
        kind: 'error',
        title: 'Import Gagal',
        message: 'Tidak ada data magang valid yang dapat diimport.'
      });
      throw new Error('Import gagal');
    }

    try {
      await academicService.bulkInsertMBKM(listToInsert);
      await refreshMbkm();
      triggerToast({
        kind: 'success',
        title: 'Import Magang Berhasil',
        message: errors > 0
          ? `${listToInsert.length} data berhasil diimport, ${errors} gagal.`
          : `Berhasil menambahkan/memperbarui ${listToInsert.length} data magang.`
      });
    } catch (err) {
      triggerToast({
        kind: 'error',
        title: 'Import Gagal',
        message: errMsg(err, 'Terjadi kesalahan saat menyimpan data batch magang.')
      });
      throw err;
    }
  };

  return {
    mbkm,
    setMbkm,
    refreshMbkm,
    handleSaveMbkm,
    handleDeleteMbkm,
    handleBulkImportMagang
  };
}
