// Selector murni untuk modul Tracer Study & Monitoring Cohort.
// Dipisahkan dari TracerTab agar logika derivasi data bisa diuji mandiri.

import { Mahasiswa, TracerStudy, Dosen } from "../types";

export function buildDosenMap(dosen: Dosen[] = []): Record<string, string> {
  const map: Record<string, string> = {};
  (dosen || []).forEach((d) => {
    map[d.nip] = d.nama;
  });
  return map;
}

export function getMahasiswaTahunLulus(
  alumni: TracerStudy[],
  m: Mahasiswa,
): number {
  if (m.tahun_lulus) return m.tahun_lulus;
  const tracerMatch = alumni.find((a) => a.npm_mahasiswa === m.npm);
  if (tracerMatch?.tahun_lulus) return tracerMatch.tahun_lulus;
  if (m.angkatan) return m.angkatan + 4;
  return new Date().getFullYear();
}

export function computeTahunOptions(
  alumni: TracerStudy[],
  mahasiswa: Mahasiswa[],
): number[] {
  const years = new Set<number>();
  alumni.forEach((a) => {
    if (a.tahun_lulus) years.add(a.tahun_lulus);
  });
  mahasiswa.forEach((m) => {
    if (m.status === "Lulus") {
      years.add(getMahasiswaTahunLulus(alumni, m));
    }
  });
  return Array.from(years).sort((a, b) => b - a);
}

export function computeTrackedNpmSet(alumni: TracerStudy[]): Set<string> {
  return new Set(alumni.map((a) => a.npm_mahasiswa));
}

export function computeCohortLulusanMahasiswa(
  mahasiswa: Mahasiswa[],
  alumni: TracerStudy[],
  filterTahun: string,
): Mahasiswa[] {
  const lulusan = mahasiswa.filter((m) => m.status === "Lulus");
  if (filterTahun === "All") return lulusan;
  return lulusan.filter(
    (m) => getMahasiswaTahunLulus(alumni, m).toString() === filterTahun,
  );
}

export function computeCohortAlumni(
  alumni: TracerStudy[],
  filterTahun: string,
): TracerStudy[] {
  if (filterTahun === "All") return alumni;
  return alumni.filter((a) => a.tahun_lulus.toString() === filterTahun);
}

export function computeUntrackedAlumni(
  cohortLulusan: Mahasiswa[],
  trackedNpmSet: Set<string>,
  searchQuery: string,
): Mahasiswa[] {
  return cohortLulusan
    .filter((m) => !trackedNpmSet.has(m.npm))
    .filter((m) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return m.nama.toLowerCase().includes(q) || m.npm.includes(q);
    });
}

export function filterAlumniByQuery(
  cohortAlumni: TracerStudy[],
  mahasiswa: Mahasiswa[],
  searchQuery: string,
): TracerStudy[] {
  return cohortAlumni.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const mhs = mahasiswa.find((m) => m.npm === a.npm_mahasiswa);
    const namaMhs = mhs ? mhs.nama.toLowerCase() : "";
    const inst = (
      a.instansi_pekerjaan ||
      a.universitas_tujuan ||
      a.bidang_usaha ||
      ""
    ).toLowerCase();
    return (
      namaMhs.includes(q) ||
      a.npm_mahasiswa.includes(q) ||
      inst.includes(q) ||
      (a.jabatan || "").toLowerCase().includes(q)
    );
  });
}
