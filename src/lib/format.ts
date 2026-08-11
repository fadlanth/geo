// Format angka tampilan (locale Indonesia: 1.234 / 12.345)
export function fmt(n: number | undefined | null): string {
  if (n === undefined || n === null || isNaN(Number(n))) return '0';
  return Number(n).toLocaleString('id-ID');
}

// Ambil pesan error dari hasil catch (unknown) dengan fallback
export function errMsg(err: unknown, fallback = 'Terjadi kesalahan.'): string {
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === 'string' && err) return err;
  return fallback;
}