import { useState, useCallback } from 'react';
import { academicService } from '../lib/academicService';
import { Dosen, Mahasiswa } from '../types';
import { errMsg } from '../lib/format';
import { ToastOptions } from '../components/Toast';

export function useDosenActions(
  mahasiswa: Mahasiswa[],
  triggerToast: (opts: ToastOptions) => void,
  setConfirmAction: (action: { title: string; message: string; detail?: string; onConfirm: () => void } | null) => void,
  refreshMahasiswa: () => Promise<void>
) {
  const [dosen, setDosen] = useState<Dosen[]>([]);

  const refreshDosen = useCallback(async () => {
    try {
      const data = await academicService.getDosen();
      setDosen(data);
    } catch (err) {
      console.error('Gagal memuat dosen:', err);
    }
  }, []);

  const handleSaveDosen = async (d: Dosen) => {
    try {
      await academicService.saveDosen(d);
      await refreshDosen();
      triggerToast({
        kind: 'success',
        title: 'Dosen Wali Disimpan',
        message: `Berhasil menyimpan data dosen ${d.nama}.`
      });
    } catch (err) {
      triggerToast({
        kind: 'error',
        title: 'Gagal Menyimpan',
        message: 'Tidak dapat menyimpan data dosen.'
      });
    }
  };

  const handleDeleteDosen = (nip: string) => {
    const dObj = dosen.find(d => d.nip === nip);
    const nama = dObj ? dObj.nama : 'Dosen';
    const studentsWithThisAdvisor = mahasiswa.filter(m => m.nip_dosen_wali === nip);

    setConfirmAction({
      title: 'Hapus Dosen',
      message: `Apakah Anda yakin ingin menghapus data dosen ${nama} dari sistem?`,
      detail: studentsWithThisAdvisor.length > 0
        ? `Ada ${studentsWithThisAdvisor.length} mahasiswa bimbingan yang akan diplot ulang ke 'Belum Diplot'.`
        : undefined,
      onConfirm: async () => {
        try {
          await academicService.deleteDosen(nip);
          await refreshDosen();
          await refreshMahasiswa();
          triggerToast({
            kind: 'success',
            title: 'Dosen Wali Dihapus',
            message: `Berhasil menghapus dosen ${nama} dari sistem.`
          });
        } catch (err) {
          triggerToast({
            kind: 'error',
            title: 'Gagal Menghapus',
            message: errMsg(err, 'Tidak dapat menghapus data dosen.')
          });
        }
      }
    });
  };

  const handleBulkImportDosen = async (data: Record<string, unknown>[]) => {
    try {
      const formattedData: Dosen[] = data.map(row => {
        const nama = String(row.NAMA || row.Nama || row.nama || '').trim();
        const nip = String(row.NIP || row.nip || '').replace(/\s+/g, '');
        const golongan = String(row.GOL || row.Golongan || row.golongan || '').trim() || 'III/b';
        const pangkat = String(row.PANGKAT || row.Pangkat || row.pangkat || '').trim() || 'Penata Muda Tk. I';
        const jabatan = String(row.JABATAN || row.Jabatan || row.jabatan || '').trim() || 'Asisten Ahli';
        
        const isWaliVal = row['IS DOSEN WALI'] !== undefined ? row['IS DOSEN WALI'] : (row['Is Dosen Wali'] !== undefined ? row['Is Dosen Wali'] : row.is_dosen_wali);
        const is_dosen_wali = isWaliVal === 'true' || isWaliVal === true || String(isWaliVal || '').toLowerCase() === 'ya' || String(isWaliVal || '').toLowerCase() === 'true';

        let cleanName = nama.replace(/(Prof\.|Dr\.|S\.T\.|M\.T\.|M\.Sc\.|M\.Kom\.|S\.Kom\.|Ph\.D\.|,|\.)/gi, '').trim();
        let parts = cleanName.split(/\s+/).filter(Boolean);
        let initials = parts.map(p => p[0]).join('').toUpperCase().slice(0, 3);
        if (initials.length < 2) {
          initials = cleanName.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
        }
        if (initials.length < 2) {
          initials = 'DSN';
        }
        const kode_dosen = String(row['Kode Dosen'] || row.kode_dosen || initials).trim().toUpperCase();
        const sandi_dosen = String(row['SANDI DOSEN'] || row['Sandi Dosen'] || row.sandi_dosen || '').trim() || undefined;

        return {
          nip,
          nama,
          kode_dosen,
          sandi_dosen,
          golongan,
          pangkat,
          jabatan,
          is_dosen_wali
        };
      }).filter(d => d.nip && d.nama);

      if (formattedData.length === 0) {
        throw new Error('Tidak ada data dosen valid yang ditemukan dalam file.');
      }

      await academicService.bulkInsertDosen(formattedData);
      await refreshDosen();
      triggerToast({
        kind: 'success',
        title: 'Import Dosen Berhasil',
        message: `Berhasil menambahkan/memperbarui ${formattedData.length} data dosen.`
      });
    } catch (err) {
      triggerToast({
        kind: 'error',
        title: 'Import Gagal',
        message: errMsg(err, 'Terjadi kesalahan format data atau koneksi.')
      });
      throw err;
    }
  };

  return {
    dosen,
    setDosen,
    refreshDosen,
    handleSaveDosen,
    handleDeleteDosen,
    handleBulkImportDosen
  };
}
