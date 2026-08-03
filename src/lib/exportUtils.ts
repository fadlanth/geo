import * as XLSX from 'xlsx';

/**
 * Export array objek ke Excel (.xlsx) dan picu download di browser.
 */
export function exportToExcel(data: any[], fileName: string, sheetName: string = 'Data') {
  if (!data || data.length === 0 || data.every((row) => Object.keys(row).length === 0)) {
    alert('Tidak ada data untuk diekspor.');
    return;
  }
  try {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  } catch (error) {
    console.error('Failed to export data to Excel:', error);
    alert('Gagal mengekspor data ke Excel.');
  }
}

/**
 * Export data tabel aktif (filtered) ke CSV — ringan & universal.
 */
export function exportToCsv(data: any[], fileName: string) {
  if (!data || data.length === 0) {
    alert('Tidak ada data untuk diekspor.');
    return;
  }
  try {
    const csv = XLSX.utils
      .sheet_to_csv(XLSX.utils.json_to_sheet(data))
      .replace(/\r?\n/g, '\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export CSV:', error);
    alert('Gagal mengekspor CSV.');
  }
}

/**
 * Export rekap statistik Dashboard (ringkasan) ke Excel ganda sheet.
 */
export function exportRekapToExcel(rekap: Record<string, any>, fileName: string = 'Rekap_GEO_INFO') {
  try {
    const wb = XLSX.utils.book_new();

    // Sheet 1: ringkasan angka
    const summary = Object.entries(rekap).map(([k, v]) => ({ Indikator: k, Nilai: v }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Ringkasan');

    // Sheet 2: versi "flat" rekap mentah
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet([rekap]),
      'Data Mentah'
    );

    XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (error) {
    console.error('Failed to export rekap:', error);
    alert('Gagal mengekspor rekap ke Excel.');
  }
}
