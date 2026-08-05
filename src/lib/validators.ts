// Validators pusat GEO INFO
// Setiap validator mengembalikan { ok: true } atau { ok: false, message: string }
// dipakai oleh seluruh form (Mahasiswa, Dosen, Prestasi, dll.) sebelum submit.

export type Validation = { ok: true } | { ok: false; message: string };

const THIS_YEAR = new Date().getFullYear();

export const validators = {
  npm: (value: string): Validation => {
    const v = (value || '').trim();
    if (!v) return { ok: false, message: 'NPM tidak boleh kosong.' };
    if (!/^\d{6,10}$/.test(v)) return { ok: false, message: 'NPM harus 6–10 angka.' };
    return { ok: true };
  },

   nip: (value: string): Validation => {
     const v = (value || '').replace(/\s+/g, '');
     if (!v) return { ok: false, message: 'NIP tidak boleh kosong.' };
     if (!/^\d{9,20}$/.test(v)) return { ok: false, message: 'NIP harus 9–20 angka (tanpa spasi).' };
     return { ok: true };
   },

  nama: (value: string): Validation => {
    const v = (value || '').trim();
    if (!v) return { ok: false, message: 'Nama tidak boleh kosong.' };
    if (v.length > 120) return { ok: false, message: 'Nama terlalu panjang (maks 120 karakter).' };
    return { ok: true };
  },

  angkatan: (value: number | string): Validation => {
    const n = Number(value);
    if (!n || isNaN(n)) return { ok: false, message: 'Angkatan tidak valid.' };
    if (n < 2000 || n > THIS_YEAR + 2) {
      return { ok: false, message: `Angkatan harus antara 2000 dan ${THIS_YEAR + 2}.` };
    }
    return { ok: true };
  },

  tahunLulus: (value: number | string | undefined, angkatan: number): Validation => {
    const raw = Number(value);
    if (!value) return { ok: false, message: 'Tahun lulus tidak boleh kosong.' };
    if (isNaN(raw)) return { ok: false, message: 'Tahun lulus harus angka.' };
    if (raw < angkatan) return { ok: false, message: 'Tahun lulus tidak boleh lebih awal dari angkatan.' };
    if (raw > THIS_YEAR + 2) return { ok: false, message: 'Tahun lulus terlalu jauh di masa depan.' };
    return { ok: true };
  },

  juaraKe: (value: number): Validation => {
    if (!value || value < 1) return { ok: false, message: 'Juara ke harus ≥ 1.' };
    return { ok: true };
  },

  email: (value: string): Validation => {
    const v = (value || '').trim().toLowerCase();
    if (!v) return { ok: false, message: 'Email tidak boleh kosong.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { ok: false, message: 'Format email tidak valid.' };
    return { ok: true };
  },

  requiredSelect: (value: string): Validation => {
    if (!value) return { ok: false, message: 'Harap pilih salah satu.' };
    return { ok: true };
  },

  enum: <T extends string>(value: string, allowed: readonly T[], label = 'Nilai'): Validation => {
    if (!allowed.includes(value as T)) {
      return { ok: false, message: `${label} pilihan tidak valid.` };
    }
    return { ok: true };
  },

  // Semua field-form validator kembalikan semua error (untuk ditampilkan per field)
  all: (checks: { [field: string]: () => Validation }) => {
    const errors: Record<string, string> = {};
    (Object.keys(checks) as Array<keyof typeof checks>).forEach((field) => {
      const res = checks[field]();
      // res: {ok:true} | {ok:false, message} -> hanya simpan bila gagal
      if (res.ok === false) errors[field] = (res as { ok: false; message: string }).message;
    });
    return errors;
  },
};

// Helper: ekstrak pesan error saja bila tidak valid (hindari union narrowing di closure)
export function val(res: Validation): string | undefined {
  if (res.ok === false) return (res as { ok: false; message: string }).message;
  return undefined;
}

export const JENIS_STATUS_MAHASISWA = ['Regulasi Akademik', 'Lulus', 'Alih Prodi', 'Undur Diri'] as const;
export const JENIS_TINGKAT_PRESTASI = ['Internasional', 'Nasional', 'Wilayah', 'Universitas'] as const;
export const JENIS_PESERTA_PRESTASI = ['Individu', 'Kelompok'];
