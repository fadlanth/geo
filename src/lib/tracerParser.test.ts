import { describe, it, expect } from 'vitest';
import { parseTracerFile } from './tracerParser';

const CSV = `NIM,Nama Lengkap,Prodi,Tahun Lulus,Status Lulusan,Masa Tunggu
140710190026,Andi Pratama,Geofisika,2023,Bekerja,3
140710190027,Siti Aminah,Geofisika,2023,Studi Lanjut,0
140710200031,Budi,Teknik Geologi,2023,Bekerja,2
`;

describe('parseTracerFile', () => {
  it('memfilter prodi Geofisika dan mengisi tracerList', async () => {
    const result = await parseTracerFile(CSV, true);
    expect(result.geofisikaFound).toBe(3);
    expect(result.otherMajorsSkipped).toBe(0);
    expect(result.tracerList).toHaveLength(3);
    expect(result.breakdown.bekerja).toBe(2);
    expect(result.breakdown.studiLanjut).toBe(1);
  });

  it('memuat semua jurusan bila filter dimatikan', async () => {
    const csv = `NIM,Nama Lengkap,Prodi,Tahun Lulus,Status Lulusan,Masa Tunggu\n520710190026,X,Geofisika,2023,Bekerja,1\n120710190027,Y,Geologi,2023,Bekerja,1`;
    const result = await parseTracerFile(csv, false);
    expect(result.tracerList).toHaveLength(2);
  });

  it('melewati baris prodi lain bila NIM bukan 14071x', async () => {
    const csv = `NIM,Nama Lengkap,Prodi,Tahun Lulus,Status Lulusan,Masa Tunggu\n520710190026,X,Geofisika,2023,Bekerja,1\n120710190027,Y,Geologi,2023,Bekerja,1`;
    const result = await parseTracerFile(csv, true);
    expect(result.geofisikaFound).toBe(1);
    expect(result.otherMajorsSkipped).toBe(1);
  });

  it('melempar error bila header tidak dikenali', async () => {
    await expect(parseTracerFile('foo,bar\n1,2', true)).rejects.toThrow();
  });

  it('menolak baris tanpa NIM yang valid', async () => {
    const csv = `NIM,Nama Lengkap,Prodi,Tahun Lulus,Status Lulusan\nx,Y,Geofisika,2023,Bekerja`;
    const result = await parseTracerFile(csv, false);
    expect(result.tracerList).toHaveLength(0);
  });
});
