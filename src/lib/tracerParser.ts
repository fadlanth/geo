// Parser Kuesioner Tracer Study Pusat (Kemdikbud).
// Mendukung file: .xlsx, .xls, .csv, dan XML Spreadsheet 2003.


import * as XLSX from 'xlsx';
import { Mahasiswa, TracerStudy } from '../types';

export interface TracerParseResult {
  totalRowsInFile: number;
  geofisikaFound: number;
  otherMajorsSkipped: number;
  mahasiswaList: Mahasiswa[];
  tracerList: TracerStudy[];
  breakdown: {
    bekerja: number;
    studiLanjut: number;
    wiraswasta: number;
    belumBekerja: number;
  };
}

/**
 * Membersihkan nilai sel dari kutip ganda, spasi berlebih, dan karakter noise
 */
function cleanVal(raw: unknown): string {
  if (raw == null) return '';
  let str = String(raw).trim();
  // Hapus kutip ganda pembungkus seperti ""PT Bank Central Asia"" atau "3"
  str = str.replace(/^"+|"+$/g, '').trim();
  // Hapus newline/carriage return di dalam teks
  str = str.replace(/[\r\n]+/g, ' ').trim();
  return str;
}

/**
 * Mencari index kolom yang cocok dengan salah satu kata kunci (case-insensitive).
 * Mendukung multiple keyword per kolom untuk handle variasi antar-tahun.
 */
function findColIndex(headers: string[], keywords: string[]): number {
  return headers.findIndex((h) => {
    const low = h.toLowerCase().trim();
    return keywords.some((kw) => low.includes(kw.toLowerCase()));
  });
}

/**
 * Varian lebih ketat: cocokkan awal string (startsWith) untuk mencegah false-match
 */
function findColIndexStrict(headers: string[], prefixes: string[]): number {
  return headers.findIndex((h) => {
    const low = h.toLowerCase().trim();
    return prefixes.some((p) => low.startsWith(p.toLowerCase()));
  });
}

/**
 * Parse file mentah Tracer Study Pusat (ArrayBuffer atau string).
 * Mendukung format survei dari berbagai tahun (2019 s.d. terbaru).
 */
export function parseTracerFile(
  fileData: ArrayBuffer | string,
  filterGeofisikaOnly: boolean = true
): TracerParseResult {
  // 1. Baca workbook dengan SheetJS
  const wb = typeof fileData === 'string'
    ? XLSX.read(fileData, { type: 'string' })
    : XLSX.read(fileData, { type: 'array' });

  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];

  // Konversi sheet ke 2D array baris demi baris
  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  if (rawRows.length === 0) {
    throw new Error('File kosong atau format tidak dapat dibaca.');
  }

  // 2. Deteksi baris Header (scan baris 0 sampai 20 untuk fleksibilitas)
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
    const row = rawRows[i];
    if (!Array.isArray(row) || row.length < 3) continue;
    const rowStr = row.map(cleanVal).join(' ').toLowerCase();

    // Ciri khas header: ada NIM/NPM + minimal salah satu: nama, tahun lulus, f8, status
    const hasNIM = rowStr.includes('nim') || rowStr.includes('npm') || rowStr.includes('no mahasiswa');
    const hasContext =
      rowStr.includes('nama lengkap') ||
      rowStr.includes('nama alumni') ||
      rowStr.includes('f8') ||
      rowStr.includes('tahun lulus') ||
      rowStr.includes('thn lulus') ||
      rowStr.includes('status') ||
      rowStr.includes('prodi') ||
      rowStr.includes('program studi') ||
      rowStr.includes('f1-c');

    if (hasNIM && hasContext) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error(
      'Tidak dapat menemukan baris header kuesioner (kolom NIM / NPM tidak ditemukan). ' +
      'Pastikan file berformat spreadsheet hasil kuesioner tracer study.'
    );
  }

  const headerRow: string[] = rawRows[headerRowIndex].map(cleanVal);

  // 3. Mapping index kolom — keyword diperluas untuk handle variasi format antar-tahun
  const colNIM = findColIndex(headerRow, [
    'nim', 'npm', 'no mahasiswa', 'no_mahasiswa', 'nomor mahasiswa',
    'nomor induk', 'student id'
  ]);
  const colNama = findColIndex(headerRow, [
    'nama lengkap', 'f1-c', 'nama alumni', 'nama responden',
    'nama_lengkap', 'nama mhs', 'nama mahasiswa', 'full name'
  ]);

  // Prodi — hati-hati agar tidak bentrok dengan f18c (prodi lanjut)
  const colProdi = headerRow.findIndex(h => {
    const l = h.toLowerCase().trim();
    return (
      l === 'prodi' ||
      l === 'program studi' ||
      l === 'jurusan' ||
      (l.includes('prodi') && !l.includes('f18') && !l.includes('lanjut') && !l.includes('wajib'))
    );
  });
  const colFakultas = findColIndex(headerRow, ['fakultas', 'faculty']);

  const colTahunMasuk = findColIndex(headerRow, [
    'tahun masuk', 'thn masuk', 'angkatan', 'tahun_masuk', 'year of entry'
  ]);
  const colTahunLulus = findColIndex(headerRow, [
    'tahun lulus', 'thn lulus', 'tahun_lulus', 'year of graduation',
    'tahun kelulusan'
  ]);

  // Status — variasi kode antar-tahun: f8, f8., f502, dsb.
  const colStatus = findColIndex(headerRow, [
    'f8.', 'f8 ', 'f8-', 'f502',
    'status anda saat ini', 'status lulusan', 'status_lulusan',
    'kondisi anda saat ini', 'status alumni', 'kegiatan saat ini'
  ]);

  // Masa tunggu — dua kolom terpisah di beberapa format
  const colTunggu1 = findColIndex(headerRow, [
    'f5-02', 'f502', '0 - 5 bulan', '0-5 bulan', '0-5bulan',
    'masa tunggu kerja pertama (bulan)', 'berapa bulan'
  ]);
  const colTunggu2 = findColIndex(headerRow, [
    'f5-06', 'f506', '6 - ... bulan', '6-... bulan', '6-...bulan',
    'masa tunggu (di atas 6 bulan)'
  ]);

  // Kadang masa tunggu cuma 1 kolom generik
  const colTungguGeneric = colTunggu1 === -1 && colTunggu2 === -1
    ? findColIndex(headerRow, ['masa tunggu', 'masa_tunggu', 'tunggu'])
    : -1;

  // Gaji / Pendapatan
  const colGaji = findColIndex(headerRow, [
    'f5-05', 'f505', 'rata-rata pendapatan', 'take home pay',
    'pendapatan per bulan', 'gaji', 'penghasilan', 'income',
    'pendapatan utama', 'rata rata pendapatan'
  ]);

  // Nama perusahaan — hati-hati agar tidak bentrok dengan f11 (jenis instansi)
  const colPerusahaan = (() => {
    // Coba match spesifik dulu
    let idx = findColIndexStrict(headerRow, ['f5b.', 'f5b ', 'f5b-']);
    if (idx !== -1) return idx;
    idx = findColIndex(headerRow, [
      'nama perusahaan/kantor', 'nama kantor', 'nama perusahaan',
      'nama instansi tempat bekerja', 'instansi/perusahaan',
      'tempat kerja', 'nama instansi'
    ]);
    return idx;
  })();

  const colJabatan = findColIndex(headerRow, [
    'f5b02', 'f5b-02', 'jabatan atasan', 'jabatan/posisi',
    'jabatan', 'posisi pekerjaan', 'posisi', 'position'
  ]);
  const colJabatanWira = findColIndex(headerRow, [
    'f5c.', 'f5c ', 'f5c-', 'posisi/jabatan wiraswasta',
    'jabatan wiraswasta'
  ]);

  const colTingkat = findColIndex(headerRow, [
    'f5d.', 'f5d ', 'f5d-', 'tingkat tempat kerja',
    'tingkat perusahaan', 'level perusahaan', 'skala perusahaan'
  ]);

  const colJenisInstansi = findColIndex(headerRow, [
    'f11.', 'f11 ', 'f11-',
    'jenis perusahaan/instansi', 'jenis instansi', 'jenis perusahaan',
    'tipe instansi'
  ]);

  const colUnivLanjut = findColIndex(headerRow, [
    'f18b', 'perguruan tinggi (wajib)', 'perguruan tinggi',
    'universitas tujuan', 'kampus tujuan', 'pt tujuan',
    'nama pt', 'kampus lanjut'
  ]);
  const colProdiLanjut = findColIndex(headerRow, [
    'f18c', 'program studi (wajib)', 'prodi lanjut',
    'prodi tujuan', 'program studi tujuan', 'prodi s2'
  ]);

  if (colNIM === -1) {
    throw new Error(
      'Kolom NIM / NPM tidak ditemukan pada file. ' +
      'Pastikan spreadsheet memiliki kolom berisi NIM atau NPM mahasiswa.'
    );
  }

  const mahasiswaMap = new Map<string, Mahasiswa>();
  const tracerList: TracerStudy[] = [];

  let otherMajorsSkipped = 0;
  let geofisikaFound = 0;

  const breakdown = {
    bekerja: 0,
    studiLanjut: 0,
    wiraswasta: 0,
    belumBekerja: 0
  };

  // 4. Loop setiap baris data (setelah baris header)
  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    const nim = cleanVal(row[colNIM]);
    if (!nim || nim.length < 5) continue; // baris kosong atau bukan NIM

    const nama = colNama !== -1 ? cleanVal(row[colNama]) : '';
    const prodi = colProdi !== -1 ? cleanVal(row[colProdi]) : '';
    const fakultas = colFakultas !== -1 ? cleanVal(row[colFakultas]) : 'FMIPA';

    // 5. Filter Geofisika jika diaktifkan
    const isGeofisika =
      prodi.toLowerCase().includes('geofisika') ||
      nim.startsWith('140710');

    if (filterGeofisikaOnly && !isGeofisika) {
      otherMajorsSkipped++;
      continue;
    }

    geofisikaFound++;

    // Hitung Angkatan dan Tahun Lulus
    let tahunMasuk = colTahunMasuk !== -1 ? parseInt(cleanVal(row[colTahunMasuk]), 10) : NaN;
    if (isNaN(tahunMasuk) || tahunMasuk < 1990) {
      // Ekstrak dari NIM: 140710190026 -> 2019
      const matchYear = nim.match(/140710(\d{2})/);
      tahunMasuk = matchYear ? 2000 + parseInt(matchYear[1], 10) : new Date().getFullYear() - 4;
    }

    let tahunLulus = colTahunLulus !== -1 ? parseInt(cleanVal(row[colTahunLulus]), 10) : NaN;
    if (isNaN(tahunLulus) || tahunLulus < 1990) {
      tahunLulus = new Date().getFullYear();
    }

    // Ekstrak Data Mahasiswa untuk Auto-Register
    if (!mahasiswaMap.has(nim)) {
      mahasiswaMap.set(nim, {
        npm: nim,
        nama: nama || `Alumni ${nim}`,
        angkatan: tahunMasuk,
        jenis_kelamin: 'L',
        fakultas: fakultas || 'Matematika Dan Ilmu Pengetahuan Alam',
        prodi: 'Geofisika',
        status: 'Lulus',
        nip_dosen_wali: null,
        tahun_lulus: tahunLulus
      });
    }

    // 6. Normalisasi Status Lulusan — diperkuat untuk variasi format antar-tahun
    const rawStatus = colStatus !== -1 ? cleanVal(row[colStatus]).toLowerCase() : '';
    const rawJenis = colJenisInstansi !== -1 ? cleanVal(row[colJenisInstansi]).toLowerCase() : '';
    const rawUniv = colUnivLanjut !== -1 ? cleanVal(row[colUnivLanjut]) : '';

    let statusLulusan: TracerStudy['status_lulusan'] = 'Bekerja';

    if (
      rawStatus.includes('melanjutkan') ||
      rawStatus.includes('pendidikan') ||
      rawStatus.includes('studi') ||
      rawStatus.includes('kuliah') ||
      rawStatus.includes('sekolah lagi') ||
      rawUniv.length > 2
    ) {
      statusLulusan = 'Studi Lanjut';
      breakdown.studiLanjut++;
    } else if (
      rawJenis.includes('wiraswasta') ||
      rawStatus.includes('wiraswasta') ||
      rawStatus.includes('usaha') ||
      rawStatus.includes('wirausaha') ||
      rawStatus.includes('entrepreneur') ||
      rawStatus.includes('bisnis sendiri') ||
      rawStatus.includes('mendirikan')
    ) {
      statusLulusan = 'Wiraswasta';
      breakdown.wiraswasta++;
    } else if (
      rawStatus.includes('tidak kerja') ||
      rawStatus.includes('mencari kerja') ||
      rawStatus.includes('belum memungkinkan') ||
      rawStatus.includes('belum bekerja') ||
      rawStatus.includes('belum mendapat') ||
      rawStatus.includes('tidak bekerja') ||
      rawStatus.includes('sedang mencari') ||
      rawStatus === ''
    ) {
      // Jika status kosong DAN tidak ada info perusahaan → Belum Bekerja
      const hasPerusahaan = colPerusahaan !== -1 && cleanVal(row[colPerusahaan]).length > 2;
      if (rawStatus === '' && hasPerusahaan) {
        statusLulusan = 'Bekerja';
        breakdown.bekerja++;
      } else if (rawStatus === '' && !hasPerusahaan) {
        statusLulusan = 'Belum Bekerja';
        breakdown.belumBekerja++;
      } else {
        statusLulusan = 'Belum Bekerja';
        breakdown.belumBekerja++;
      }
    } else {
      statusLulusan = 'Bekerja';
      breakdown.bekerja++;
    }

    // 7. Normalisasi Masa Tunggu (Gabung f5-02 dan f5-06, atau kolom generik)
    let masaTunggu = 0;

    if (colTungguGeneric !== -1) {
      // Format 1 kolom generik
      const valGeneric = cleanVal(row[colTungguGeneric]);
      const parsed = parseInt(valGeneric.replace(/\D/g, ''), 10);
      if (!isNaN(parsed)) masaTunggu = parsed;
    } else {
      // Format 2 kolom terpisah
      const valTunggu1 = colTunggu1 !== -1 ? cleanVal(row[colTunggu1]) : '';
      const valTunggu2 = colTunggu2 !== -1 ? cleanVal(row[colTunggu2]) : '';

      if (valTunggu1 && !isNaN(parseInt(valTunggu1, 10))) {
        masaTunggu = parseInt(valTunggu1, 10);
      } else if (valTunggu2 && !isNaN(parseInt(valTunggu2, 10))) {
        masaTunggu = parseInt(valTunggu2, 10);
      }
    }

    // 8. Normalisasi Gaji — handle format "Rp 8.500.000", "8500000", "8,500,000"
    let gaji: number | undefined = undefined;
    if (colGaji !== -1) {
      let rawGaji = cleanVal(row[colGaji]);
      // Bersihkan prefix "Rp", simbol mata uang, titik ribuan, koma
      rawGaji = rawGaji.replace(/[Rr][Pp]\.?\s*/g, '');
      rawGaji = rawGaji.replace(/\./g, ''); // titik ribuan Indonesia
      rawGaji = rawGaji.replace(/,/g, '');  // koma ribuan English
      rawGaji = rawGaji.replace(/\s/g, '');
      rawGaji = rawGaji.replace(/[^\d]/g, '');
      if (rawGaji && !isNaN(Number(rawGaji))) {
        const num = Number(rawGaji);
        if (num > 0) gaji = num;
      }
    }

    // 9. Normalisasi Instansi & Jabatan
    const instansi = colPerusahaan !== -1 ? cleanVal(row[colPerusahaan]) : '';
    let jabatan = colJabatan !== -1 ? cleanVal(row[colJabatan]) : '';
    if (!jabatan && colJabatanWira !== -1) {
      jabatan = cleanVal(row[colJabatanWira]);
    }

    // 10. Normalisasi Tingkat Perusahaan
    let tingkat: TracerStudy['tingkat_perusahaan'] = undefined;
    if (colTingkat !== -1) {
      const rawTingkat = cleanVal(row[colTingkat]).toLowerCase();
      if (rawTingkat.includes('multi') || rawTingkat.includes('internasional')) {
        tingkat = 'Multinasional';
      } else if (rawTingkat.includes('nasional')) {
        tingkat = 'Nasional';
      } else if (rawTingkat.includes('lokal') || rawTingkat.includes('wilayah')) {
        tingkat = 'Lokal';
      }
    }

    // 11. Data Studi Lanjut
    const univLanjut = colUnivLanjut !== -1 ? cleanVal(row[colUnivLanjut]) : undefined;
    const prodiLanjut = colProdiLanjut !== -1 ? cleanVal(row[colProdiLanjut]) : undefined;

    // 12. Bentuk Record TracerStudy
    const tracerRecord: TracerStudy = {
      npm_mahasiswa: nim,
      tahun_lulus: tahunLulus,
      status_lulusan: statusLulusan,
      masa_tunggu_bulan: masaTunggu,
      instansi_pekerjaan: instansi || undefined,
      jabatan: jabatan || undefined,
      tingkat_perusahaan: tingkat,
      gaji_pekerjaan: gaji,
      universitas_tujuan: univLanjut || undefined,
      program_studi: prodiLanjut || undefined,
      bidang_usaha: statusLulusan === 'Wiraswasta' ? (instansi || jabatan || undefined) : undefined
    };

    tracerList.push(tracerRecord);
  }

  return {
    totalRowsInFile: rawRows.length - (headerRowIndex + 1),
    geofisikaFound,
    otherMajorsSkipped,
    mahasiswaList: Array.from(mahasiswaMap.values()),
    tracerList,
    breakdown
  };
}
