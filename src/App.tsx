import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  User, 
  Database
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import OverviewTab from './components/OverviewTab';
import MahasiswaTab from './components/MahasiswaTab';
import DosenTab from './components/DosenTab';
import PrestasiTab from './components/PrestasiTab';
import TracerTab from './components/TracerTab';
import MagangTab from './components/MagangTab';
import AuditTab from './components/AuditTab';
import LoginPage from './components/LoginPage';
import PublicLanding from './components/PublicLanding';
import Toast, { ToastOptions } from './components/Toast';
import { academicService } from './lib/academicService';
import { useAuth } from './lib/AuthContext';
import { Mahasiswa, Dosen, Prestasi, TracerStudy, RiwayatMBKM, AnggotaPrestasi } from './types';

export default function App() {
  const { isAuthenticated, isLoading: authLoading, logout, username, role } = useAuth();
  
  const [activeTab, setActiveTab] = useState('ringkasan');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Toast notifications state
  const [toast, setToast] = useState<(ToastOptions & { id: string }) | null>(null);

  const triggerToast = (options: ToastOptions) => {
    const id = Date.now().toString() + Math.random().toString();
    setToast({ ...options, id });
  };

  // Core Academics Data States
  const [mahasiswa, setMahasiswa] = useState<Mahasiswa[]>([]);
  const [dosen, setDosen] = useState<Dosen[]>([]);
  const [prestasi, setPrestasi] = useState<Prestasi[]>([]);
  const [anggotaPrestasi, setAnggotaPrestasi] = useState<AnggotaPrestasi[]>([]);
  const [alumni, setAlumni] = useState<TracerStudy[]>([]);
  const [mbkm, setMbkm] = useState<RiwayatMBKM[]>([]);

  // Loading State
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data fetch with loading indicator for CRUD refreshes
  const fetchAllData = async () => {
    setIsRefreshing(true);
    try {
      setDosen(await academicService.getDosen());
    } catch (err: any) {
      console.error('Gagal memuat dosen:', err);
    }
    try {
      setMahasiswa(await academicService.getMahasiswa());
    } catch (err: any) {
      console.error('Gagal memuat mahasiswa:', err);
    }
    try {
      setPrestasi(await academicService.getPrestasi());
    } catch (err: any) {
      console.error('Gagal memuat prestasi:', err);
    }
    try {
      setAnggotaPrestasi(await academicService.getAnggotaPrestasi());
    } catch (err: any) {
      console.error('Gagal memuat anggota prestasi:', err);
    }
    try {
      setAlumni(await academicService.getTracerAlumni());
    } catch (err: any) {
      console.error('Gagal memuat alumni:', err);
    }
    try {
      setMbkm(await academicService.getMBKM());
    } catch (err: any) {
      console.error('Gagal memuat MBKM:', err);
    }
    setIsRefreshing(false);
  };

  // Initial load with global spinner
  const loadAllData = async () => {
    setInitialLoading(true);
    await fetchAllData();
    setInitialLoading(false);
  };

  // Muat data HANYA saat sesi sudah aktif (tamu tidak melakukan query data)
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadAllData();
    }
  }, [authLoading, isAuthenticated]);

  // --- STUDENT ACTION HANDLERS ---
  const handleSaveMahasiswa = async (mhs: Mahasiswa) => {
    try {
      await academicService.saveMahasiswa(mhs);
      await fetchAllData();
      triggerToast({
        kind: 'success',
        title: 'Data Disimpan',
        message: `Berhasil menyimpan data mahasiswa ${mhs.nama}.`
      });
    } catch (err) {
      triggerToast({
        kind: 'error',
        title: 'Gagal Menyimpan',
        message: 'Tidak dapat menyimpan data mahasiswa.'
      });
    }
  };

  const normalizeGender = (val: string): string => {
    const v = val.trim().toLowerCase();
    if (v === 'l' || v === 'laki-laki') return 'L';
    if (v === 'p' || v === 'perempuan') return 'P';
    return 'L';
  };

  const handleBulkImportMahasiswa = async (data: any[]) => {
    try {
      // Basic validation & formatting
      const formattedData: Mahasiswa[] = data.map(row => ({
        npm: String(row.NPM || row.npm || '').trim(),
        nama: String(row.Nama || row.nama || '').trim(),
        angkatan: Number(row.Angkatan || row.angkatan) || new Date().getFullYear(),
        jenis_kelamin: normalizeGender(String(row['Jenis Kelamin'] || row.jenis_kelamin || '')),
        fakultas: String(row.Fakultas || row.fakultas || '').trim() || 'FMIPA',
        prodi: String(row.Prodi || row.prodi || '').trim() || 'Geofisika',
        status: (String(row.Status || row.status || '').trim() as any) || 'Regulasi Akademik',
        nip_dosen_wali: String(row['NIP Dosen Wali'] || row.nip_dosen_wali || '').replace(/\s+/g, '') || null,
        tahun_lulus: row['Tahun Lulus'] || row.tahun_lulus ? Number(row['Tahun Lulus'] || row.tahun_lulus) : undefined
      })).filter(m => m.npm && m.nama);

      if (formattedData.length === 0) {
        throw new Error('Tidak ada data mahasiswa valid yang ditemukan dalam file.');
      }
      
      await academicService.bulkInsertMahasiswa(formattedData);
      await fetchAllData();
      triggerToast({
        kind: 'success',
        title: 'Import Berhasil',
        message: `Berhasil menambahkan/memperbarui ${formattedData.length} data mahasiswa.`
      });
    } catch (err: any) {
      triggerToast({
        kind: 'error',
        title: 'Import Gagal',
        message: err.message || 'Terjadi kesalahan format data atau koneksi.'
      });
      throw err;
    }
  };

  const handleDeleteMahasiswa = async (npm: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus mahasiswa ini dari sistem akademik?')) {
      try {
        await academicService.deleteMahasiswa(npm);
        await fetchAllData();
        triggerToast({
          kind: 'success',
          title: 'Data Dihapus',
          message: 'Berhasil menghapus mahasiswa dari sistem.'
        });
      } catch (err: any) {
        triggerToast({
          kind: 'error',
          title: 'Gagal Menghapus',
          message: err.message || 'Tidak dapat menghapus data mahasiswa.'
        });
      }
    }
  };

  // --- ADVISOR ACTION HANDLERS ---
  const handleSaveDosen = async (d: Dosen) => {
    try {
      await academicService.saveDosen(d);
      await fetchAllData();
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

  const handleDeleteDosen = async (nip: string) => {
    const dObj = dosen.find(d => d.nip === nip);
    const nama = dObj ? dObj.nama : 'Dosen';
    const studentsWithThisAdvisor = mahasiswa.filter(m => m.nip_dosen_wali === nip);
    const mhsMsg = studentsWithThisAdvisor.length > 0 
      ? `\n\nPerhatian: Ada ${studentsWithThisAdvisor.length} mahasiswa bimbingan yang akan diplot ulang ke 'Belum Diplot'.` 
      : '';

    if (confirm(`Apakah Anda yakin ingin menghapus data dosen ${nama}?${mhsMsg}`)) {
      try {
        await academicService.deleteDosen(nip);
        await fetchAllData();
        triggerToast({
          kind: 'success',
          title: 'Dosen Wali Dihapus',
          message: `Berhasil menghapus dosen ${nama} dari sistem.`
        });
      } catch (err: any) {
        triggerToast({
          kind: 'error',
          title: 'Gagal Menghapus',
          message: err.message || 'Tidak dapat menghapus data dosen.'
        });
      }
    }
  };

  const handleBulkImportDosen = async (data: any[]) => {
    try {
      const formattedData: Dosen[] = data.map(row => {
        const nama = String(row.NAMA || row.Nama || row.nama || '').trim();
        const nip = String(row.NIP || row.nip || '').replace(/\s+/g, '');
        const golongan = String(row.GOL || row.Golongan || row.golongan || '').trim() || 'III/b';
        const pangkat = String(row.PANGKAT || row.Pangkat || row.pangkat || '').trim() || 'Penata Muda Tk. I';
        const jabatan = String(row.JABATAN || row.Jabatan || row.jabatan || '').trim() || 'Asisten Ahli';
        
        // Determine is_dosen_wali
        const isWaliVal = row['IS DOSEN WALI'] !== undefined ? row['IS DOSEN WALI'] : (row['Is Dosen Wali'] !== undefined ? row['Is Dosen Wali'] : row.is_dosen_wali);
        const is_dosen_wali = isWaliVal === 'true' || isWaliVal === true || String(isWaliVal || '').toLowerCase() === 'ya' || String(isWaliVal || '').toLowerCase() === 'true';

        // Auto-generate kode_dosen from name if not provided
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

        return {
          nip,
          nama,
          kode_dosen,
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
      await fetchAllData();
      triggerToast({
        kind: 'success',
        title: 'Import Dosen Berhasil',
        message: `Berhasil menambahkan/memperbarui ${formattedData.length} data dosen.`
      });
    } catch (err: any) {
      triggerToast({
        kind: 'error',
        title: 'Import Gagal',
        message: err.message || 'Terjadi kesalahan format data atau koneksi.'
      });
      throw err;
    }
  };

  // --- ACHIEVEMENT ACTION HANDLERS ---
  const handleSavePrestasi = async (p: Prestasi) => {
    try {
      await academicService.savePrestasi(p);
      await fetchAllData();
      triggerToast({
        kind: 'success',
        title: 'Prestasi Tersimpan',
        message: `Data prestasi ${p.nama_kompetisi} berhasil disimpan.`
      });
    } catch (err: any) {
      triggerToast({
        kind: 'error',
        title: 'Gagal Menyimpan',
        message: err.message || 'Terjadi kesalahan saat menyimpan data prestasi.'
      });
    }
  };

  const handleDeletePrestasi = async (id: string) => {
    if (confirm('Hapus pencatatan prestasi ini?')) {
      try {
        await academicService.deletePrestasi(id);
        await fetchAllData();
        triggerToast({
          kind: 'success',
          title: 'Prestasi Dihapus',
          message: 'Pencatatan prestasi berhasil dihapus.'
        });
      } catch (err: any) {
        triggerToast({
          kind: 'error',
          title: 'Gagal Menghapus',
          message: err.message || 'Gagal menghapus data prestasi.'
        });
      }
    }
  };

  // --- ANGGOTA PRESTASI ACTION HANDLERS ---
  const handleSaveAnggota = async (anggota: AnggotaPrestasi) => {
    try {
      await academicService.saveAnggotaPrestasi(anggota);
      await fetchAllData();
      triggerToast({
        kind: 'success',
        title: 'Anggota Tersimpan',
        message: `Data anggota prestasi berhasil disimpan.`
      });
    } catch (err: any) {
      triggerToast({
        kind: 'error',
        title: 'Gagal Menyimpan',
        message: err.message || 'Terjadi kesalahan saat menyimpan data anggota prestasi.'
      });
    }
  };

  const handleDeleteAnggota = async (id: string) => {
    try {
      await academicService.deleteAnggotaPrestasi(id);
      await fetchAllData();
      triggerToast({
        kind: 'success',
        title: 'Anggota Dihapus',
        message: 'Anggota prestasi berhasil dihapus.'
      });
    } catch (err: any) {
      triggerToast({
        kind: 'error',
        title: 'Gagal Menghapus',
        message: err.message || 'Gagal menghapus data anggota prestasi.'
      });
    }
  };

  const handleBulkReplaceAnggota = async (id_prestasi: string, anggota: AnggotaPrestasi[]) => {
    try {
      await academicService.bulkReplaceAnggotaPrestasi(id_prestasi, anggota);
      await fetchAllData();
    } catch (err: any) {
      triggerToast({
        kind: 'error',
        title: 'Gagal Simpan Anggota',
        message: err.message || 'Terjadi kesalahan saat menyimpan anggota prestasi.'
      });
    }
  };

  // --- MBKM ACTION HANDLERS ---
  const handleSaveMbkm = async (m: RiwayatMBKM) => {
    try {
      await academicService.saveMBKM(m);
      await fetchAllData();
      triggerToast({
        kind: 'success',
        title: 'Magang Tersimpan',
        message: `Data magang ${m.tempat_instansi} berhasil disimpan.`
      });
    } catch (err: any) {
      triggerToast({
        kind: 'error',
        title: 'Gagal Menyimpan',
        message: err.message || 'Terjadi kesalahan saat menyimpan data magang.'
      });
      throw err;
    }
  };

  const handleBulkImportPrestasi = async (data: any[]) => {
    let count = 0;
    let errors = 0;
    for (const row of data) {
      const npm = String(row.npm_mahasiswa || row['NPM Mahasiswa'] || row['NPM'] || row['npm'] || '').trim();
      const namaMhs = String(row.nama_mahasiswa || row['Nama Mahasiswa'] || row['Nama'] || '').trim();
      if (!npm && !namaMhs) { errors++; continue; }
      const juaraVal = row.juara_ke || row['Juara Ke'] || 0;
      const juaraNum = (() => { const n = Number(juaraVal); if (!isNaN(n)) return n; const m = String(juaraVal).match(/(\d+)/); return m ? parseInt(m[1], 10) : 0; })();
      const p: Prestasi = {
        npm_mahasiswa: npm || undefined,
        nama_mahasiswa: namaMhs || undefined,
        nama_kompetisi: String(row.nama_kompetisi || row['Nama Kompetisi'] || '').trim(),
        tingkat: (row.tingkat || row['Tingkat'] || 'Nasional') as any,
        juara_ke: juaraNum,
        jenis_peserta: (row.jenis_peserta || row['Jenis Peserta'] || 'Individu') as 'Individu' | 'Kelompok',
        tahun_kegiatan: Number(row.tahun_kegiatan || row['Tahun'] || row['Tahun Kegiatan'] || 0) || undefined,
        tempat: String(row.tempat || row['Tempat'] || '').trim() || undefined,
        dosen_pembimbing: String(row.dosen_pembimbing || row['Dosen Pembimbing'] || row['Dospem'] || '').trim() || undefined
      };
      if (!p.nama_kompetisi) { errors++; continue; }
      try {
        await academicService.savePrestasi(p);
        count++;
      } catch { errors++; }
    }
    await fetchAllData();
    if (count > 0) {
      triggerToast({
        kind: 'success',
        title: 'Import Prestasi Berhasil',
        message: errors > 0
          ? `${count} data berhasil diimport, ${errors} gagal.`
          : `Berhasil menambahkan/memperbarui ${count} data prestasi.`
      });
    } else {
      triggerToast({
        kind: 'error',
        title: 'Import Gagal',
        message: 'Tidak ada data prestasi valid yang dapat diimport.'
      });
      throw new Error('Import gagal');
    }
  };

  const handleBulkImportMagang = async (data: any[]) => {
    let count = 0;
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
      try {
        await academicService.saveMBKM(m);
        count++;
      } catch { errors++; }
    }
    await fetchAllData();
    if (count > 0) {
      triggerToast({
        kind: 'success',
        title: 'Import Magang Berhasil',
        message: errors > 0
          ? `${count} data berhasil diimport, ${errors} gagal.`
          : `Berhasil menambahkan/memperbarui ${count} data magang.`
      });
    } else {
      triggerToast({
        kind: 'error',
        title: 'Import Gagal',
        message: 'Tidak ada data magang valid yang dapat diimport.'
      });
      throw new Error('Import gagal');
    }
  };

  const handleDeleteMbkm = async (id: string) => {
    if (confirm('Hapus data riwayat MBKM ini?')) {
      try {
        await academicService.deleteMBKM(id);
        await fetchAllData();
        triggerToast({
          kind: 'success',
        title: 'Data Magang Dihapus',
        message: 'Data magang berhasil dihapus.'
        });
      } catch (err: any) {
        triggerToast({
          kind: 'error',
        title: 'Gagal Menghapus',
        message: err.message || 'Gagal menghapus data magang.'
        });
      }
    }
  };

  // --- TRACER STUDY ALUMNI ACTION HANDLERS ---
  const handleSaveAlumni = async (al: TracerStudy) => {
    try {
      await academicService.saveTracerAlumni(al);
      await fetchAllData();
      triggerToast({
        kind: 'success',
        title: 'Data Tracer Tersimpan',
        message: `Data tracer study alumni berhasil disimpan.`
      });
    } catch (err: any) {
      triggerToast({
        kind: 'error',
        title: 'Gagal Menyimpan',
        message: err.message || 'Terjadi kesalahan saat menyimpan data tracer study.'
      });
    }
  };

  const handleDeleteAlumni = async (id: string) => {
    if (confirm('Hapus data tracer alumni ini?')) {
      try {
        await academicService.deleteTracerAlumni(id);
        await fetchAllData();
        triggerToast({
          kind: 'success',
          title: 'Data Tracer Study Dihapus',
          message: 'Data tracer study alumni berhasil dihapus.'
        });
      } catch (err: any) {
        triggerToast({
          kind: 'error',
          title: 'Gagal Menghapus',
          message: err.message || 'Gagal menghapus data tracer study.'
        });
      }
    }
  };

  if (authLoading) {
    return <SplashScreen />;
  }

  if (!isAuthenticated) {
    return showLogin ? (
      <LoginPage onBack={() => setShowLogin(false)} />
    ) : (
      <PublicLanding onLogin={() => setShowLogin(true)} />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-base)]">
      {/* SIDEBAR NAVIGATION */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        role={role}
      />

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP NAVBAR HEADER */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl transition text-[var(--color-accent)] hover:bg-[var(--color-accent-dark)]/10"
              aria-label="Buka menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-gray-400 font-mono">Sistem Informasi Akademik</span>
              <span className="text-gray-300">/</span>
              <span className="text-xs font-bold font-display uppercase tracking-wider text-[var(--color-accent)]">
                Geofisika UNPAD
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick connection indicator */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-gray-50 border border-gray-100 rounded-full">
              <Database className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} />
              <span className="text-[10px] font-semibold text-gray-500">
                Connected Cloud DB
              </span>
            </div>

            {/* Admin User info */}
            <div className="flex items-center gap-2.5">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-[var(--color-text-main)]">{username}</p>
                <p className="text-[9px] text-gray-400 font-semibold tracking-wider uppercase">Fakultas MIPA ({role})</p>
              </div>
              <button 
                onClick={logout}
                className="p-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] rounded-xl text-[var(--color-base)] transition"
                title="Keluar (Logout)"
              >
                <User className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* PAGE BODY SCROLL CONTAINER */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* MAIN PAGE ROUTER CONTROLLER */}
          <>
            {activeTab === 'ringkasan' && (
              <OverviewTab 
                mahasiswa={mahasiswa} 
                dosen={dosen} 
                prestasi={prestasi} 
                alumni={alumni} 
                mbkm={mbkm}
                loading={initialLoading || isRefreshing}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === 'mahasiswa' && (
              <MahasiswaTab
                mahasiswa={mahasiswa}
                dosen={dosen}
                loading={initialLoading || isRefreshing}
                onSaveMahasiswa={handleSaveMahasiswa}
                onDeleteMahasiswa={handleDeleteMahasiswa}
                onBulkImportMahasiswa={handleBulkImportMahasiswa}
                triggerToast={triggerToast}
              />
            )}

            {activeTab === 'dosen' && (
              <DosenTab
                dosen={dosen}
                mahasiswa={mahasiswa}
                loading={initialLoading || isRefreshing}
                onSaveDosen={handleSaveDosen}
                onDeleteDosen={handleDeleteDosen}
                onBulkImportDosen={handleBulkImportDosen}
                triggerToast={triggerToast}
              />
            )}

            {activeTab === 'prestasi' && (
              <PrestasiTab
                prestasi={prestasi}
                mahasiswa={mahasiswa}
                anggotaPrestasi={anggotaPrestasi}
                loading={initialLoading || isRefreshing}
                onSavePrestasi={handleSavePrestasi}
                onDeletePrestasi={handleDeletePrestasi}
                onSaveAnggota={handleSaveAnggota}
                onDeleteAnggota={handleDeleteAnggota}
                onBulkReplaceAnggota={handleBulkReplaceAnggota}
                onBulkImportPrestasi={handleBulkImportPrestasi}
                onRefresh={fetchAllData}
                triggerToast={triggerToast}
              />
            )}

            {activeTab === 'mbkm' && (
              <MagangTab
                mbkm={mbkm}
                mahasiswa={mahasiswa}
                dosen={dosen}
                loading={initialLoading || isRefreshing}
                onSaveMbkm={handleSaveMbkm}
                onDeleteMbkm={handleDeleteMbkm}
                onBulkImportMagang={handleBulkImportMagang}
                onRefresh={fetchAllData}
                triggerToast={triggerToast}
              />
            )}

            {activeTab === 'tracer' && (
              <TracerTab
                alumni={alumni}
                mahasiswa={mahasiswa}
                loading={initialLoading || isRefreshing}
                onSaveAlumni={handleSaveAlumni}
                onDeleteAlumni={handleDeleteAlumni}
                onRefresh={fetchAllData}
                triggerToast={triggerToast}
              />
            )}

            {activeTab === 'audit' && (
              <AuditTab
                loading={initialLoading || isRefreshing}
                triggerToast={triggerToast}
              />
            )}
          </>
        </main>
      </div>

      {/* Global Toast render */}
      {toast && (
        <Toast key={toast.id} toast={toast} onClose={(id) => setToast(null)} />
      )}
    </div>
  );
}

function SplashScreen() {
  return (
    <div className="min-h-screen bg-[var(--color-base)] flex flex-col items-center justify-center gap-4 p-4">
      <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center overflow-hidden">
        <img src="/LOGO-01.png" alt="Logo UNPAD" className="w-full h-full object-contain p-1" />
      </div>
      <div className="w-8 h-8 border-4 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
      <p className="text-xs text-[var(--color-text-main)]/50 font-medium">
        Memeriksa sesi... mohon tunggu
      </p>
    </div>
  );
}
