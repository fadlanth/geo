import { Prestasi } from '../types';

/**
 * Helper loader on-demand untuk library XLSX (mengurangi bundle awal ~445 KB).
 */
async function getXLSX() {
  return await import('xlsx');
}

/**
 * Export array objek ke Excel (.xlsx) dan picu download di browser.
 */
export async function exportToExcel(data: Record<string, unknown>[], fileName: string, sheetName: string = 'Data') {
  if (!data || data.length === 0 || data.every((row) => Object.keys(row).length === 0)) {
    console.warn('Tidak ada data untuk diekspor.');
    return;
  }
  try {
    const XLSX = await getXLSX();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  } catch (error) {
    console.error('Failed to export data to Excel:', error);
  }
}

/**
 * Export data rekap (multi-sheet) ke Excel (.xlsx).
 * @param sheets  object { "Nama Sheet": arrayOfObjects, ... }
 * @param fileName  tanpa ekstensi
 */
export async function exportRekapMultiSheetToExcel(
  sheets: Record<string, Record<string, unknown>[]>,
  fileName: string = 'Rekap'
) {
  try {
    const XLSX = await getXLSX();
    const wb = XLSX.utils.book_new();
    Object.entries(sheets).forEach(([sheetName, rows]) => {
      if (rows && rows.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), sheetName);
      }
    });
    if (Object.keys(wb.SheetNames).length === 0) {
      console.warn('Tidak ada data rekap untuk diekspor.');
      return;
    }
    XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (error) {
    console.error('Failed to export multi-sheet Excel:', error);
  }
}

/**
 * Export data tabel aktif (filtered) ke CSV — ringan & universal.
 */
export async function exportToCsv(data: Record<string, unknown>[], fileName: string) {
  if (!data || data.length === 0) {
    console.warn('Tidak ada data untuk diekspor.');
    return;
  }
  try {
    const XLSX = await getXLSX();
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
  }
}

/**
 * Export rekap statistik Dashboard (ringkasan) ke Excel ganda sheet.
 */
export async function exportRekapToExcel(rekap: Record<string, unknown>, fileName: string = 'Rekap_GEO_INFO') {
  try {
    const XLSX = await getXLSX();
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
  }
}

export function getPrestasiRekapByYear(prestasi: Prestasi[]) {
  const individualPrestasi = (prestasi || []).filter((p) =>
    p &&
    typeof p.npm_mahasiswa === 'string' &&
    p.npm_mahasiswa.trim() !== '' &&
    typeof p.tahun_kegiatan === 'number' &&
    !Number.isNaN(p.tahun_kegiatan)
  );

  const years = [...new Set(individualPrestasi.map((p) => p.tahun_kegiatan))].sort((a, b) => a - b);

  const tingkatRows = years.map((tahun) => {
    const rows = individualPrestasi.filter((p) => p.tahun_kegiatan === tahun);
    const internasional = rows.filter((p) => p.tingkat === 'Internasional').length;
    const nasional = rows.filter((p) => p.tingkat === 'Nasional').length;
    return {
      Tahun: tahun,
      Internasional: internasional,
      Nasional: nasional,
      Jumlah: internasional + nasional,
    };
  });

  const juaraRows = years.map((tahun) => {
    const rows = individualPrestasi.filter((p) => p.tahun_kegiatan === tahun);
    const juara1 = rows.filter((p) => Number(p.juara_ke) === 1).length;
    const juara2 = rows.filter((p) => Number(p.juara_ke) === 2).length;
    const juara3 = rows.filter((p) => Number(p.juara_ke) === 3).length;
    return {
      Tahun: tahun,
      'Juara 1': juara1,
      'Juara 2': juara2,
      'Juara 3': juara3,
      Jumlah: juara1 + juara2 + juara3,
    };
  });

  return { years, tingkatRows, juaraRows };
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildPrestasiRekapSvg(tingkatRows: any[], juaraRows: any[]) {
  const tingkatMax = Math.max(1, ...tingkatRows.flatMap((row) => [row.Internasional, row.Nasional, row.Jumlah]));
  const juaraMax = Math.max(1, ...juaraRows.flatMap((row) => [row['Juara 1'], row['Juara 2'], row['Juara 3'], row.Jumlah]));

  const renderBarChart = (
    title: string,
    data: any[],
    valueKeys: string[],
    colors: Record<string, string>,
    xOffset: number,
    yOffset: number,
    chartWidth: number,
    chartHeight: number,
    maxValue: number,
    labelFormatter?: (value: number) => string,
  ) => {
    const leftPad = 60;
    const bottomPad = 40;
    const chartInnerWidth = chartWidth - leftPad - 30;
    const chartInnerHeight = chartHeight - bottomPad - 20;
    const groupWidth = chartInnerWidth / data.length;
    const barWidth = Math.min(28, groupWidth * 0.25);

    const axisLines = `
      <line x1="${leftPad}" y1="${yOffset + chartInnerHeight}" x2="${xOffset + chartWidth - 30}" y2="${yOffset + chartInnerHeight}" stroke="#666" stroke-width="1" />
      <line x1="${leftPad}" y1="${yOffset}" x2="${leftPad}" y2="${yOffset + chartInnerHeight}" stroke="#666" stroke-width="1" />
    `;

    const bars = data
      .map((row, index) => {
        const groupX = xOffset + leftPad + index * groupWidth + groupWidth * 0.2;
        return valueKeys.map((key, keyIndex) => {
          const value = Number(row[key] || 0);
          const barHeight = (value / maxValue) * chartInnerHeight;
          const x = groupX + keyIndex * (barWidth + 10);
          const y = yOffset + chartInnerHeight - barHeight;
          return `
            <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${colors[key]}" rx="1" />
            <text x="${x + barWidth / 2}" y="${y - 8}" text-anchor="middle" font-size="11" fill="#333">${labelFormatter ? labelFormatter(value) : value}</text>
          `;
        }).join('');
      })
      .join('');

    const labels = data.map((row, index) => {
      const x = xOffset + leftPad + index * groupWidth + groupWidth / 2;
      return `<text x="${x}" y="${yOffset + chartInnerHeight + 22}" text-anchor="middle" font-size="11" fill="#333">${row.Tahun}</text>`;
    }).join('');

    const legends = valueKeys.map((key, index) => {
      const x = xOffset + 20 + index * 170;
      return `
        <rect x="${x}" y="${yOffset - 20}" width="12" height="12" fill="${colors[key]}" rx="2" />
        <text x="${x + 18}" y="${yOffset - 10}" font-size="12" fill="#333">${key}</text>
      `;
    }).join('');

    return `
      <g>
        <text x="${xOffset + chartWidth / 2}" y="${yOffset - 35}" text-anchor="middle" font-size="16" font-weight="700" fill="#333">${title}</text>
        ${legends}
        ${axisLines}
        ${bars}
        ${labels}
      </g>
    `;
  };

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
      <rect width="100%" height="100%" fill="#f3f3f3"/>
      ${renderBarChart('Rekap Tingkat Prestasi Mahasiswa', tingkatRows, ['Internasional', 'Nasional'], { Internasional: '#3b82f6', Nasional: '#f59e0b' }, 60, 120, 500, 340, tingkatMax)}
      ${renderBarChart('Rekap Juara Prestasi Mahasiswa', juaraRows, ['Juara 1', 'Juara 2', 'Juara 3'], { 'Juara 1': '#3b82f6', 'Juara 2': '#f59e0b', 'Juara 3': '#9ca3af' }, 650, 120, 500, 340, juaraMax)}
    </svg>
  `;
}

/**
 * Download rekap prestasi mahasiswa dalam 1 file Excel + 1 file SVG grafik.
 * Data dihitung per individu mahasiswa, bukan berdasarkan jumlah event/kelompok.
 */
export async function exportPrestasiRekapToExcel(prestasi: Prestasi[], fileName: string = 'rekap_prestasi_mahasiswa') {
  const individualPrestasi = (prestasi || []).filter((p) =>
    p &&
    typeof p.npm_mahasiswa === 'string' &&
    p.npm_mahasiswa.trim() !== '' &&
    typeof p.tahun_kegiatan === 'number' &&
    !Number.isNaN(p.tahun_kegiatan)
  );

  if (individualPrestasi.length === 0) {
    console.warn('Tidak ada data prestasi per individu mahasiswa untuk diunduh.');
    return;
  }

  const { tingkatRows, juaraRows } = getPrestasiRekapByYear(individualPrestasi);

  try {
    const XLSX = await getXLSX();
    const wb = XLSX.utils.book_new();

  const tingkatHeader = ['TAHUN', 'TINGKAT INTERNASIONAL', 'TINGKAT NASIONAL', 'JUMLAH'];
  const tingkatBody = tingkatRows.map((row) => [row.Tahun, row.Internasional, row.Nasional, row.Jumlah]);
  const tingkatTotal = ['',
    tingkatRows.reduce((sum, row) => sum + Number(row.Internasional || 0), 0),
    tingkatRows.reduce((sum, row) => sum + Number(row.Nasional || 0), 0),
    tingkatRows.reduce((sum, row) => sum + Number(row.Jumlah || 0), 0),
  ];

  const tingkatSheet = XLSX.utils.aoa_to_sheet([
    tingkatHeader,
    ...tingkatBody,
    ['JUMLAH', tingkatTotal[1], tingkatTotal[2], tingkatTotal[3]],
  ]);

  const juaraHeader = ['TAHUN', 'JUARA 1', 'JUARA 2', 'JUARA 3', 'JUMLAH'];
  const juaraBody = juaraRows.map((row) => [row.Tahun, row['Juara 1'], row['Juara 2'], row['Juara 3'], row.Jumlah]);
  const juaraTotal = [
    'JUMLAH',
    juaraRows.reduce((sum, row) => sum + Number(row['Juara 1'] || 0), 0),
    juaraRows.reduce((sum, row) => sum + Number(row['Juara 2'] || 0), 0),
    juaraRows.reduce((sum, row) => sum + Number(row['Juara 3'] || 0), 0),
    juaraRows.reduce((sum, row) => sum + Number(row.Jumlah || 0), 0),
  ];

  const juaraSheet = XLSX.utils.aoa_to_sheet([
    juaraHeader,
    ...juaraBody,
    juaraTotal,
  ]);

  XLSX.utils.book_append_sheet(wb, tingkatSheet, 'Tingkat');
  XLSX.utils.book_append_sheet(wb, juaraSheet, 'Juara');
  XLSX.writeFile(wb, `${fileName}.xlsx`);

  const svgContent = buildPrestasiRekapSvg(tingkatRows, juaraRows);
  downloadBlob(new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' }), `${fileName}_grafik.svg`);
  } catch (err) {
    console.error('Failed to export prestasi rekap:', err);
  }
}

