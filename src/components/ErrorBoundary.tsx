import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--color-base)] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center">
            <AlertTriangle className="w-10 h-10 mx-auto text-[var(--color-primary)] mb-4" />
            <h1 className="font-display font-extrabold text-lg text-[var(--color-text-main)]">Terjadi Kesalahan</h1>
            <p className="text-sm text-[var(--color-text-main)]/55 mt-2">
              Aplikasi mengalami error yang tidak terduga. Muat ulang halaman untuk melanjutkan.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2.5 text-sm font-semibold rounded-xl bg-[var(--color-primary)] text-white hover:opacity-90 transition"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}