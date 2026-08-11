// Format angka tampilan (locale Indonesia: 1.234 / 12.345)
export function fmt(n: number | undefined | null): string {
  if (n === undefined || n === null || isNaN(Number(n))) return '0';
  return Number(n).toLocaleString('id-ID');
}