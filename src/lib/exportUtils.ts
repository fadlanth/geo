import * as XLSX from 'xlsx';

/**
 * Utility to export an array of objects to an Excel (.xlsx) file.
 * Automatically handles sheet creation and triggers the browser download.
 */
export function exportToExcel(data: any[], fileName: string, sheetName: string = 'Data') {
  if (!data || data.length === 0) {
    alert('Tidak ada data untuk diekspor.');
    return;
  }

  try {
    // Generate worksheet from JSON data
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Create new workbook
    const wb = XLSX.utils.book_new();
    
    // Append worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // Trigger download
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  } catch (error) {
    console.error('Failed to export data to Excel:', error);
    alert('Gagal mengekspor data ke Excel.');
  }
}
