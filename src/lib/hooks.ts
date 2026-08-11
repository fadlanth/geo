import { useEffect, useState } from 'react';

/**
 * Hook sederhana untuk menunda perubahan nilai (debounce).
 * Cocok untuk search input agar tiap ketik tidak memicu
 * render/filter berulang.
 *
 * @param value   nilai yang akan didebounce-kan
 * @param delay   milidetik (default 350)
 * @returns       nilai yang sudah stabil selama `delay`
 */
export function useDebounce<T>(value: T, delay: number = 350): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debounced;
}

/**
 * Hook kombinasi search-query -> debounced -> reset page.
 * Cocok untuk tabel yang pakai filter/search + pagination client-side.
 */
export function useSearch(initialPage: (page: number) => void) {
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 350);

  useEffect(() => {
    initialPage(1); // reset ke halaman 1 tiap ada query baru yang stabil
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return { query, setQuery, debounced };
}

/**
 * Menutup modal/dialog saat tombol Escape ditekan.
 * Listener hanya aktif ketika `open` bernilai true.
 */
export function useEscapeClose(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);
}
