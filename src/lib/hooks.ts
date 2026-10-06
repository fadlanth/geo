import { useEffect, useState } from "react";

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
  const [query, setQuery] = useState("");
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
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);
}

/**
 * Menjaga fokus keyboard tetap berada di dalam modal/dialog saat terbuka (Focus Trap).
 * Otomatis memfokuskan elemen interaktif pertama dan mengembalikan fokus saat ditutup.
 */
export function useFocusTrap(
  open: boolean,
  containerRef: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open || !containerRef.current) return;
    const container = containerRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusables = (): HTMLElement[] => {
      return Array.from(
        container.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(
        (el) =>
          el.offsetWidth > 0 ||
          el.offsetHeight > 0 ||
          el.getClientRects().length > 0,
      );
    };

    const focusables = getFocusables();
    if (focusables.length > 0) {
      // Tunggu hingga render DOM stabil sebelum focus
      const timer = setTimeout(() => {
        focusables[0]?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const currentFocusables = getFocusables();
      if (currentFocusables.length === 0) return;

      const firstEl = currentFocusables[0];
      const lastEl = currentFocusables[currentFocusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, containerRef]);
}
