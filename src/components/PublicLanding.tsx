import React, { useEffect, useState } from 'react';
import { Users, BookOpen, Award, GraduationCap, ShieldCheck, ArrowRight, Database, Sparkles, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PublicLandingProps {
  onLogin: () => void;
}

interface RekapPublik {
  total_mahasiswa: number;
  total_dosen: number;
  total_prestasi: number;
  total_mbkm: number;
  total_alumni: number;
}

const EMPTY_REKAP: RekapPublik = {
  total_mahasiswa: 0,
  total_dosen: 0,
  total_prestasi: 0,
  total_mbkm: 0,
  total_alumni: 0,
};

export default function PublicLanding({ onLogin }: PublicLandingProps) {
  const [rekap, setRekap] = useState<RekapPublik>(EMPTY_REKAP);
  const [loading, setLoading] = useState(true);

  const loadRekap = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('v_publik_rekap').select('*').limit(1);
      if (error) throw error;
      if (data && data[0]) setRekap(data[0] as RekapPublik);
    } catch (err) {
      console.warn('Agregat publik belum tersedia (jalankan migrasi 001_security.sql):', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRekap();
  }, []);

  const stats = [
    { label: 'Mahasiswa Aktif', value: rekap.total_mahasiswa, icon: Users },
    { label: 'Dosen', value: rekap.total_dosen, icon: BookOpen },
    { label: 'Prestasi Mahasiswa', value: rekap.total_prestasi, icon: Award },
    { label: 'Riwayat Magang/MBKM', value: rekap.total_mbkm, icon: Database },
    { label: 'Alumni Terlacak', value: rekap.total_alumni, icon: GraduationCap },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-base)]">
      {/* Hero */}
      <div className="bg-[var(--color-primary)] text-[var(--color-base)] relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-72 h-72 rounded-full bg-[var(--color-primary-light)]/40 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-24 w-80 h-80 rounded-full bg-[var(--color-primary-soft)]/25 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-14 sm:py-16">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)] rounded-full text-xs font-semibold mb-5 backdrop-blur-sm border border-[var(--color-primary-muted)]">
                <Sparkles className="w-3.5 h-3.5" />
                Sistem Informasi Akademik Geofisika
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
                GEO INFO UNPAD
              </h1>
              <p className="text-sm sm:text-base text-[var(--color-base)]/80 font-normal leading-relaxed max-w-xl">
                Portal data akademik Program Studi Geofisika — dari Bumi untuk Negeri.
                Halaman ini menampilkan ringkasan umum; data rinci hanya untuk pengelola internal.
              </p>
            </div>

            <button
              onClick={onLogin}
              className="inline-flex items-center gap-2 bg-[var(--color-base)] text-[var(--color-primary)] px-6 py-3.5 rounded-2xl font-bold shadow-lg hover:-translate-y-0.5 transition"
            >
              Masuk untuk Pengelola <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Statistik agregat */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display font-bold text-lg text-[var(--color-text-main)]">
            Ringkasan Data Prodi
          </h2>
          <button
            onClick={loadRekap}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary)] hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Muat ulang
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse h-28" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="bg-white rounded-2xl border border-[var(--color-primary)]/10 p-5 shadow-xs hover:shadow-md transition duration-200"
                >
                  <div className="p-3 bg-[var(--color-primary-soft)] text-[var(--color-primary-dark)] rounded-xl w-fit mb-3">
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-3xl font-bold font-display text-[var(--color-text-main)]">
                    {s.value.toLocaleString('id-ID')}
                  </p>
                  <p className="text-xs text-[var(--color-text-main)]/60 font-medium mt-1">{s.label}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Catatan privasi */}
        <div className="mt-10 flex items-start gap-3 p-5 rounded-2xl border border-[var(--color-success)]/20 bg-white">
          <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-[var(--color-success)]" />
          <div className="text-sm">
            <p className="font-bold text-[var(--color-text-main)]">Aman &amp; Terlindungi</p>
            <p className="mt-1 text-[var(--color-text-main)]/60 leading-relaxed">
              Yang tampil di sini hanya angka agregat tanpa data pribadi (NPM, NIP, riwayat, dan nama).
              Nama, data mahasiswa &amp; dosen, prestasi, dan tracer study hanya dapat diakses pengelola
              yang telah terautentikasi dengan akun resmi — dilindungi kebijakan akses berlapis (Row Level Security).
            </p>
          </div>
        </div>

        <div className="text-center mt-12 text-xs text-[var(--color-text-main)]/40 font-mono">
          &copy; {new Date().getFullYear()} Program Studi Geofisika, Fakultas MIPA, Universitas Padjadjaran.
        </div>
      </div>
    </div>
  );
}