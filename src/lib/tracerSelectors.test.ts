import { describe, it, expect } from 'vitest';
import {
  buildDosenMap,
  getMahasiswaTahunLulus,
  computeTahunOptions,
  computeTrackedNpmSet,
  computeCohortLulusanMahasiswa,
  computeCohortAlumni,
  computeUntrackedAlumni,
  filterAlumniByQuery,
} from './tracerSelectors';
import type { Mahasiswa, TracerStudy } from '../types';

const alumni: TracerStudy[] = [
  { npm_mahasiswa: '001', tahun_lulus: 2023, status_lulusan: 'Bekerja', masa_tunggu_bulan: 2 },
  { npm_mahasiswa: '002', tahun_lulus: 2024, status_lulusan: 'Bekerja', masa_tunggu_bulan: 1, instansi_pekerjaan: 'PT GEO' },
];

const mahasiswa: Mahasiswa[] = [
  { npm: '001', nama: 'Andi', status: 'Lulus', tahun_lulus: 2023 } as Mahasiswa,
  { npm: '002', nama: 'Budi', status: 'Lulus', angkatan: 2020 } as Mahasiswa,
  { npm: '003', nama: 'Citra', status: 'Lulus', angkatan: 2020 } as Mahasiswa,
  { npm: '004', nama: 'Dina', status: 'Regulasi Akademik' } as Mahasiswa,
];

describe('buildDosenMap', () => {
  it('memetakan NIP ke nama dosen', () => {
    expect(buildDosenMap([{ nip: '123', nama: 'Dr. X' } as never])).toEqual({ '123': 'Dr. X' });
  });
});

describe('getMahasiswaTahunLulus', () => {
  it('mengutamakan tahun_lulus resmi', () => {
    expect(getMahasiswaTahunLulus(alumni, mahasiswa[0])).toBe(2023);
  });
  it('jatuh ke tracer, lalu estimasi angkatan+4', () => {
    expect(getMahasiswaTahunLulus(alumni, mahasiswa[1])).toBe(2024);
    expect(getMahasiswaTahunLulus(alumni, mahasiswa[2])).toBe(2024);
  });
});

describe('computeTahunOptions', () => {
  it('menggabungkan tahun dari alumni & mahasiswa lulus, urut menurun', () => {
    expect(computeTahunOptions(alumni, mahasiswa)).toEqual([2024, 2023]);
  });
});

describe('computeTrackedNpmSet', () => {
  it('berisi npm yang sudah terlacak', () => {
    expect(computeTrackedNpmSet(alumni).has('001')).toBe(true);
    expect(computeTrackedNpmSet(alumni).has('003')).toBe(false);
  });
});

describe('cohort filters', () => {
  it('memfilter cohort berdasarkan tahun', () => {
    expect(computeCohortLulusanMahasiswa(mahasiswa, alumni, '2023').map(m => m.npm)).toEqual(['001']);
    expect(computeCohortAlumni(alumni, '2024').map(a => a.npm_mahasiswa)).toEqual(['002']);
  });
  it('"All" mengembalikan semua', () => {
    expect(computeCohortLulusanMahasiswa(mahasiswa, alumni, 'All')).toHaveLength(3);
    expect(computeCohortAlumni(alumni, 'All')).toHaveLength(2);
  });
});

describe('computeUntrackedAlumni', () => {
  it('hanya mahasiswa lulus yang belum ada di tracer', () => {
    const untracked = computeUntrackedAlumni(
      computeCohortLulusanMahasiswa(mahasiswa, alumni, 'All'),
      computeTrackedNpmSet(alumni),
      '',
    );
    expect(untracked.map(m => m.npm)).toEqual(['003']);
  });
  it('memfilter pencarian nama/npm', () => {
    const untracked = computeUntrackedAlumni(
      computeCohortLulusanMahasiswa(mahasiswa, alumni, 'All'),
      computeTrackedNpmSet(alumni),
      'citra',
    );
    expect(untracked).toHaveLength(1);
  });
});

describe('filterAlumniByQuery', () => {
  it('mencari instansi & npm', () => {
    expect(filterAlumniByQuery(alumni, mahasiswa, 'geo')).toHaveLength(1);
    expect(filterAlumniByQuery(alumni, mahasiswa, '001')).toHaveLength(1);
    expect(filterAlumniByQuery(alumni, mahasiswa, '')).toHaveLength(2);
  });
});
