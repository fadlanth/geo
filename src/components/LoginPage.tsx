import React, { useState } from 'react';
import { Lock, Mail, AlertCircle, ArrowRight, ArrowLeft, KeyRound, CheckCircle2, LogIn } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

interface LoginPageProps {
  onBack?: () => void;
}

export default function LoginPage({ onBack }: LoginPageProps) {
  const { login, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'login' | 'reset'>('login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setSubmitting(true);
    try {
      if (mode === 'reset') {
        await resetPassword(email.trim());
        setInfo('Tautan reset kata sandi telah dikirim ke email Anda.');
      } else {
        await login(email.trim(), password);
        // Sukses: auth berubah → App otomatis menampilkan dashboard.
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal masuk. Periksa email dan kata sandi Anda.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-base)] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3.5 bg-white rounded-3xl shadow-xl border border-gray-100 mb-6 flex items-center justify-center">
            <img src="/LOGO-01.png" alt="Logo UNPAD" className="w-16 h-16 rounded-2xl object-contain" />
          </div>
          <h1 className="font-display font-extrabold text-3xl text-[var(--color-text-main)] tracking-tight">
            GEO INFO UNPAD
          </h1>
          <p className="text-[var(--color-text-main)]/60 font-medium mt-2">
            Portal Sistem Informasi Akademik
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-8 border border-[var(--color-primary)]/10 shadow-2xl">
          {onBack && (
            <button
              onClick={onBack}
              className="mb-4 inline-flex items-center gap-1.5 text-xs text-[var(--color-text-main)]/60 hover:text-[var(--color-primary)] transition font-semibold"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali ke halaman publik
            </button>
          )}

          <h2 className="font-display font-bold text-xl text-center mb-1">
            {mode === 'login' ? 'Masuk' : 'Atur Ulang Kata Sandi'}
          </h2>
          <p className="text-xs text-[var(--color-text-main)]/50 text-center mb-6">
            {mode === 'login'
              ? 'Gunakan akun email staf yang telah didaftarkan.'
              : 'Masukkan email terdaftar untuk menerima tautan reset.'}
          </p>

          {(error || (mode === 'reset' && info)) && (
            <div
              className="mb-6 p-4 rounded-xl text-sm flex items-start gap-3 border"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, var(--color-base))',
                borderColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                color: 'var(--color-primary)',
              }}
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{error ? 'Gagal Masuk' : 'Periksa Email'}</p>
                <p className="text-xs mt-1">{error || info}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-[var(--color-text-main)]/60 uppercase tracking-wider mb-2">
                Email Pengguna
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@unpad.ac.id"
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)] focus:bg-white transition"
                  autoComplete="email"
                />
              </div>
            </div>

            {mode === 'login' && (
              <div>
                <label className="block text-xs font-bold text-[var(--color-text-main)]/60 uppercase tracking-wider mb-2">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi..."
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)] focus:bg-white transition"
                    autoComplete="current-password"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="mt-2 text-[11px] font-semibold text-[var(--color-primary)] hover:underline"
                >
                  Lupa kata sandi?
                </button>
              </div>
            )}

            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-[11px] font-semibold text-[var(--color-primary)] hover:underline"
              >
                ← Kembali ke masuk
              </button>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white py-4 rounded-xl font-bold hover:bg-[var(--color-primary-light)] transition shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : mode === 'login' ? (
                <>
                  Masuk ke Dasbor <ArrowRight className="w-5 h-5" />
                </>
              ) : (
                <>
                  Kirim Tautan Reset <KeyRound className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-8 text-xs text-[var(--color-text-main)]/40 font-mono">
          Login admin dikelola lewat Supabase Auth (Autentikasi multi-akun).
        </div>
        <div className="text-center mt-2 text-xs text-[var(--color-text-main)]/40 font-mono">
          &copy; {new Date().getFullYear()} Program Studi Geofisika, Fakultas MIPA, Universitas Padjadjaran.
        </div>
      </div>
    </div>
  );
}