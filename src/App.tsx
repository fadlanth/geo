import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { 
  Menu, 
  User, 
  Database,
  LogOut,
  ChevronDown
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import LoginPage from './components/LoginPage';
import PublicLanding from './components/PublicLanding';
import Toast, { ToastOptions } from './components/Toast';
import ConfirmDialog from './components/ConfirmDialog';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuth, UserRole } from './lib/AuthContext';

// Hooks
import { useMahasiswaActions } from './hooks/useMahasiswaActions';
import { useDosenActions } from './hooks/useDosenActions';
import { usePrestasiActions } from './hooks/usePrestasiActions';
import { useMagangActions } from './hooks/useMagangActions';
import { useTracerActions } from './hooks/useTracerActions';

// Code-split: tab dimuat on-demand saat pertama kali dibuka
const OverviewTab = lazy(() => import('./components/OverviewTab'));
const MahasiswaTab = lazy(() => import('./components/MahasiswaTab'));
const DosenTab = lazy(() => import('./components/DosenTab'));
const PrestasiTab = lazy(() => import('./components/PrestasiTab'));
const TracerTab = lazy(() => import('./components/TracerTab'));
const MagangTab = lazy(() => import('./components/MagangTab'));
const AuditTab = lazy(() => import('./components/AuditTab'));

const VALID_TABS = ['ringkasan', 'mahasiswa', 'dosen', 'prestasi', 'mbkm', 'tracer', 'audit'];

const TAB_PERMISSIONS: Record<string, UserRole[]> = {
  ringkasan: ['admin', 'operator', 'dosen', 'guest'],
  mahasiswa: ['admin', 'operator'],
  dosen: ['admin', 'operator'],
  prestasi: ['admin', 'operator'],
  mbkm: ['admin', 'operator'],
  tracer: ['admin', 'operator'],
  audit: ['admin'],
};

const isTabAuthorized = (tab: string, userRole: UserRole): boolean => {
  const allowed = TAB_PERMISSIONS[tab];
  return allowed ? allowed.includes(userRole) : false;
};

export default function App() {
  const { isAuthenticated, isLoading: authLoading, logout, username, role } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu]);
  
  // Hash-based routing & sub-routing (e.g. #mbkm/penelitian)
  const parseHash = () => {
    const raw = window.location.hash.replace(/^#\/?/, '').trim();
    const [tab, subTab] = raw.split('/');
    const resolvedTab = VALID_TABS.includes(tab) ? tab : 'ringkasan';
    return {
      tab: resolvedTab,
      subTab: subTab || (resolvedTab === 'mbkm' ? 'magang' : undefined)
    };
  };

  const initialRoute = parseHash();
  const [activeTab, setActiveTabState] = useState<string>(initialRoute.tab);
  const [activeSubTab, setActiveSubTab] = useState<string>(initialRoute.subTab || 'magang');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const setActiveTab = useCallback((tab: string, subTab?: string) => {
    if (isTabAuthorized(tab, role)) {
      setActiveTabState(tab);
      const nextSubTab = subTab || (tab === 'mbkm' ? 'magang' : undefined);
      if (nextSubTab) {
        setActiveSubTab(nextSubTab);
      }
      window.location.hash = nextSubTab && tab === 'mbkm' ? `#${tab}/${nextSubTab}` : `#${tab}`;
    } else {
      setActiveTabState('ringkasan');
      window.location.hash = '#ringkasan';
    }
  }, [role]);

  // Validasi tab saat role teridentifikasi
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (!isTabAuthorized(activeTab, role)) {
        setActiveTab('ringkasan');
      }
    }
  }, [authLoading, isAuthenticated, activeTab, role, setActiveTab]);

  useEffect(() => {
    const handleHashChange = () => {
      const { tab, subTab } = parseHash();
      if (isTabAuthorized(tab, role)) {
        setActiveTabState(tab);
        if (subTab) setActiveSubTab(subTab);
      } else {
        setActiveTab('ringkasan');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [role, setActiveTab]);

  // Toast notifications state
  const [toast, setToast] = useState<(ToastOptions & { id: string }) | null>(null);

  // Delete confirmation dialog state
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    detail?: string;
    onConfirm: () => void;
  } | null>(null);

  const triggerToast = useCallback((options: ToastOptions) => {
    const id = Date.now().toString() + Math.random().toString();
    setToast({ ...options, id });
  }, []);

  // Hooks per-entitas
  const {
    mahasiswa,
    refreshMahasiswa,
    handleSaveMahasiswa,
    handleBulkImportMahasiswa,
    handleDeleteMahasiswa
  } = useMahasiswaActions(triggerToast, setConfirmAction, async () => {
    await Promise.all([refreshPrestasi(), refreshMbkm(), refreshAlumni()]);
  });

  const {
    dosen,
    refreshDosen,
    handleSaveDosen,
    handleDeleteDosen,
    handleBulkImportDosen
  } = useDosenActions(mahasiswa, triggerToast, setConfirmAction, refreshMahasiswa);

  const {
    prestasi,
    anggotaPrestasi,
    refreshPrestasi,
    refreshAnggota,
    handleSavePrestasi,
    handleDeletePrestasi,
    handleSaveAnggota,
    handleDeleteAnggota,
    handleBulkReplaceAnggota,
    handleBulkImportPrestasi
  } = usePrestasiActions(triggerToast, setConfirmAction);

  const {
    mbkm,
    refreshMbkm,
    handleSaveMbkm,
    handleDeleteMbkm,
    handleBulkImportMagang
  } = useMagangActions(dosen, triggerToast, setConfirmAction);

  const {
    alumni,
    refreshAlumni,
    handleSaveAlumni,
    handleDeleteAlumni,
    handleBulkImportAlumni
  } = useTracerActions(triggerToast, setConfirmAction);

  // Loading State
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAllData = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      refreshDosen(),
      refreshMahasiswa(),
      refreshPrestasi(),
      refreshAnggota(),
      refreshAlumni(),
      refreshMbkm()
    ]);
    setIsRefreshing(false);
  }, [refreshDosen, refreshMahasiswa, refreshPrestasi, refreshAnggota, refreshAlumni, refreshMbkm]);

  // Muat data HANYA saat sesi sudah aktif
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      setInitialLoading(true);
      fetchAllData().finally(() => setInitialLoading(false));
    }
  }, [authLoading, isAuthenticated, fetchAllData]);

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
        activeSubTab={activeSubTab}
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

            {/* Profile dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setShowProfileMenu(prev => !prev)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-50 transition"
                aria-expanded={showProfileMenu}
                aria-haspopup="true"
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-[var(--color-base)]">
                  <User className="w-4.5 h-4.5" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold text-[var(--color-text-main)] leading-tight">{username}</p>
                  <p className="text-[9px] text-gray-400 font-semibold tracking-wider uppercase">FMIPA · {role}</p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 hidden sm:block transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-gray-100 shadow-lg shadow-black/8 py-1.5 z-50">
                  <div className="px-4 py-2.5 border-b border-gray-100">
                    <p className="text-sm font-bold text-[var(--color-text-main)]">{username}</p>
                    <p className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase mt-0.5">Fakultas MIPA · {role}</p>
                  </div>
                  <div className="p-1.5">
                    <button
                      onClick={() => { setShowProfileMenu(false); logout(); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      Keluar dari Sistem
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* PAGE BODY SCROLL CONTAINER */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <ErrorBoundary>
            <Suspense fallback={
              <div className="flex items-center justify-center py-24">
                <div className="w-8 h-8 border-4 border-[var(--color-primary)]/20 border-t-[var(--color-primary)] rounded-full animate-spin" />
              </div>
            }>
              {!isTabAuthorized(activeTab, role) ? (
                <div className="bg-white rounded-2xl p-8 border border-red-100 text-center max-w-lg mx-auto my-12 shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 font-bold text-xl">
                    !
                  </div>
                  <h3 className="font-display font-bold text-lg text-[var(--color-text-main)]">Akses Terbatas</h3>
                  <p className="text-sm text-gray-500 mt-2">
                    Peran Anda saat ini (<strong className="capitalize">{role}</strong>) tidak memiliki hak akses untuk membuka halaman ini.
                  </p>
                  <button
                    onClick={() => setActiveTab('ringkasan')}
                    className="mt-6 px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-xs font-bold hover:bg-[var(--color-primary-dark)] transition"
                  >
                    Kembali ke Dashboard
                  </button>
                </div>
              ) : (
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
                      activeSubTab={activeSubTab}
                      onSubTabChange={setActiveSubTab}
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
                      dosen={dosen}
                      loading={initialLoading || isRefreshing}
                      onSaveAlumni={handleSaveAlumni}
                      onDeleteAlumni={handleDeleteAlumni}
                      onBulkImportAlumni={handleBulkImportAlumni}
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
              )}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {/* Global Confirm Dialog render */}
      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.title}
          message={confirmAction.message}
          detail={confirmAction.detail}
          onConfirm={() => {
            confirmAction.onConfirm();
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* Global Toast render */}
      {toast && (
        <Toast key={toast.id} toast={toast} onClose={() => setToast(null)} />
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
