import React, { useState } from 'react';
import { Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(password);
    if (!success) {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-base)] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3.5 bg-white rounded-3xl shadow-xl border border-gray-100 mb-6 flex items-center justify-center">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/1/10/Universitas_Padjadjaran_Logo.png" 
              alt="Logo UNPAD" 
              className="w-16 h-16 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="font-display font-extrabold text-3xl text-[var(--color-text-main)] tracking-tight">
            GEO INFO UNPAD
          </h1>
          <p className="text-[var(--color-text-main)]/60 font-medium mt-2">
            Portal Sistem Informasi Akademik
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl p-8 border border-[var(--color-primary)]/10 shadow-2xl">
          <h2 className="font-display font-bold text-xl text-center mb-6">Masuk sebagai Admin</h2>
          
          {error && (
            <div className="mb-6 p-4 rounded-xl text-sm flex items-start gap-3 border" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, var(--color-base))', borderColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', color: 'var(--color-primary)' }}>
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Demo Login</p>
                  <p className="text-xs mt-1">Untuk saat ini, akses dibatasi untuk administrator. Gunakan kata sandi demo <b>admin123</b> untuk uji cepat.</p>
                </div>
              </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-[var(--color-text-main)]/60 uppercase tracking-wider mb-2">
                Kata Sandi Administrator
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(false); }}
                  placeholder="Masukkan kata sandi..."
                  className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)] focus:bg-white transition"
                />
              </div>
              <p className="text-[11px] text-gray-400 font-medium mt-2 text-center">Gunakan <b>admin123</b> untuk masuk pada versi demo ini.</p>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-[var(--color-primary)] text-white py-4 rounded-xl font-bold hover:bg-[var(--color-primary-light)] transition shadow-lg shadow-[var(--color-primary)]/20"
            >
              Masuk ke Dasbor <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>

        <div className="text-center mt-12 text-xs text-[var(--color-text-main)]/40 font-mono">
          &copy; {new Date().getFullYear()} Program Studi Geofisika, Fakultas MIPA, Universitas Padjadjaran.
        </div>
      </div>
    </div>
  );
}
