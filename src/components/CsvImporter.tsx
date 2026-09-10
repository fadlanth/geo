import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, FileText, X } from 'lucide-react';
import Button from './Button';
import { errMsg } from '../lib/format';

const getXLSX = async () => import('xlsx');

interface CsvImporterProps {
  title: string;
  expectedHeaders: string[];
  optionalHeaders?: string[]; // Headers that are not required in the file
  onImport: (data: Record<string, unknown>[]) => Promise<void>;
  onClose: () => void;
  templateCsv?: string; // Optional raw string of template CSV
  templateData?: Record<string, unknown>[]; // Optional array of template data for Excel export
}

export default function CsvImporter({
  title,
  expectedHeaders,
  optionalHeaders = [],
  onImport,
  onClose,
  templateCsv,
  templateData
}: CsvImporterProps) {
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'preview' | 'importing' | 'success' | 'error'>('idle');
  const [parsedData, setParsedData] = useState<Record<string, unknown>[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sheets, setSheets] = useState<string[]>([]); // For Excel files with multiple sheets
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [allSheetData, setAllSheetData] = useState<{ [key: string]: Record<string, unknown>[] }>({});

  // Normalize header for flexible matching
  const normalizeHeader = (h: string) => h.trim().toLowerCase();

  // Get headers missing from rows (only required ones, not optional)
  const getMissingRequiredHeaders = (rows: Record<string, unknown>[]): string[] => {
    if (rows.length === 0) return expectedHeaders.filter(h => !optionalHeaders.includes(h));
    const fileHeaders = Object.keys(rows[0]).map(normalizeHeader);
    return expectedHeaders.filter(h => {
      if (optionalHeaders.includes(h)) return false;
      return !fileHeaders.includes(normalizeHeader(h));
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = (selectedFile: File) => {
    const isExcel = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls') || selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const isCsv = selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv');

    if (!isCsv && !isExcel) {
      setErrorMsg('Harap unggah file dengan format .csv atau .xlsx');
      setStatus('error');
      return;
    }
    setStatus('parsing');

    if (isExcel) {
      processExcelFile(selectedFile);
    } else {
      processCsvFile(selectedFile);
    }
  };

  const processExcelFile = async (selectedFile: File) => {
    try {
      const XLSX = await getXLSX();
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result as ArrayBuffer;
          const workbook = XLSX.read(data, { type: 'array' });
        const sheetNames = workbook.SheetNames;

        if (sheetNames.length === 0) {
          throw new Error('File Excel tidak memiliki sheet data.');
        }

        const allData: { [key: string]: Record<string, unknown>[] } = {};
        sheetNames.forEach((sheetName) => {
          const ws = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(ws, { defval: '' });
          allData[sheetName] = jsonData as Record<string, unknown>[];
        });

        setAllSheetData(allData);
        setSheets(sheetNames);
        setSelectedSheet(sheetNames[0]);

        const firstSheetData = allData[sheetNames[0]];
        if (firstSheetData.length === 0) {
          throw new Error('Sheet tidak memiliki data baris.');
        }

        setParsedData(firstSheetData);
        setStatus('preview');
      } catch (err) {
        setErrorMsg(errMsg(err, 'Gagal memproses file Excel.'));
        setStatus('error');
      }
    };
    reader.readAsArrayBuffer(selectedFile);
    } catch (err) {
      setErrorMsg(errMsg(err, 'Gagal memuat modul pengolah Excel.'));
      setStatus('error');
    }
  };

  const processCsvFile = (selectedFile: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = text.split('\n').map(row => row.trim()).filter(row => row.length > 0);
        
        if (rows.length < 2) {
          throw new Error('File CSV kosong atau tidak memiliki data baris (hanya header).');
        }

        const headers = rows[0].split(',').map(h => h.trim());
        const headersNorm = headers.map(normalizeHeader);

        const missingHeaders = expectedHeaders.filter(eh => {
          if (optionalHeaders.includes(eh)) return false;
          return !headersNorm.includes(normalizeHeader(eh));
        });
        if (missingHeaders.length > 0) {
          throw new Error(`Kolom hilang: ${missingHeaders.join(', ')}. Pastikan format sesuai template.`);
        }

        const data: Record<string, unknown>[] = [];
        for (let i = 1; i < rows.length; i++) {
          const values = rows[i].split(',').map(v => v.trim());
          const obj: Record<string, unknown> = {};
          headers.forEach((header, index) => {
            obj[header] = values[index] !== undefined ? values[index] : '';
          });
          data.push(obj);
        }

        setParsedData(data);
        setStatus('preview');
      } catch (err) {
        setErrorMsg(errMsg(err, 'Gagal memproses file CSV.'));
        setStatus('error');
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleSheetChange = (newSheet: string) => {
    setSelectedSheet(newSheet);
    const sheetData = allSheetData[newSheet] || [];
    const missingRequired = getMissingRequiredHeaders(sheetData);
    if (missingRequired.length > 0) {
      setErrorMsg(`Kolom wajib hilang di sheet "${newSheet}": ${missingRequired.join(', ')}. Pastikan format sesuai template.`);
      setParsedData([]);
      setStatus('error');
      return;
    }
    if (sheetData.length === 0) {
      setErrorMsg(`Sheet "${newSheet}" tidak memiliki data baris.`);
      setParsedData([]);
      setStatus('error');
      return;
    }
    setParsedData(sheetData);
    setStatus('preview');
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleExecuteImport = async () => {
    const missingRequired = getMissingRequiredHeaders(parsedData);
    if (missingRequired.length > 0) {
      setErrorMsg(`Kolom wajib hilang: ${missingRequired.join(', ')}. Pastikan format sesuai template.`);
      setStatus('error');
      return;
    }
    setStatus('importing');
    try {
      await onImport(parsedData);
      setStatus('success');
    } catch (err) {
      setErrorMsg(errMsg(err, 'Terjadi kesalahan saat menyimpan data ke server.'));
      setStatus('error');
    }
  };

  const downloadTemplate = async () => {
    if (!templateCsv && !templateData) return;

    // If we have templateData, create Excel file
    if (templateData && templateData.length > 0) {
      try {
        const XLSX = await getXLSX();
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Template');
        XLSX.writeFile(wb, `template_${title.toLowerCase().replace(/\s+/g, '_')}.xlsx`);
        return;
      } catch (err) {
        console.error('Failed to generate template Excel:', err);
      }
    }

    // Fallback: create CSV file
    const blob = new Blob([templateCsv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template_${title.toLowerCase().replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-[var(--color-primary)] text-white">
          <div>
            <h3 className="font-display font-bold text-lg">Import CSV: {title}</h3>
              <p className="text-xs opacity-80 mt-0.5">Unggah data massal dengan mudah melalui format CSV atau Excel</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* STATE: IDLE OR ERROR (SHOW UPLOAD) */}
          {(status === 'idle' || status === 'error') && (
            <div className="space-y-4">
              {status === 'error' && (
                <div className="p-4 rounded-xl text-sm flex gap-3 items-start" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, var(--color-base))', border: '1px solid color-mix(in srgb, var(--color-primary) 12%, transparent)', color: 'var(--color-primary)' }}>
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Import Gagal</p>
                    <p className="text-xs mt-1">{errorMsg}</p>
                    <button 
                      onClick={() => setStatus('idle')}
                      className="mt-2 text-xs font-bold hover:underline"
                    >
                      Coba Lagi
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs text-blue-900 font-semibold mb-2">📋 Format Kolom yang Diperlukan:</p>
                <div className="text-xs text-blue-800 space-y-1">
                  <p><span className="font-mono bg-white px-2 py-1 rounded mr-2">{expectedHeaders.join(', ')}</span></p>
                  <p className="mt-2">✓ Gunakan template yang tersedia untuk kemudahan</p>
                  <p>✓ Pastikan data sesuai dengan urutan kolom</p>
                </div>
              </div>

              <div 
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer ${
                  dragActive ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-gray-200 hover:border-[var(--color-primary)]/50 hover:bg-gray-50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                   accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleChange}
                />
                <div className="mx-auto w-16 h-16 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-full flex items-center justify-center mb-4">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-[var(--color-text-main)] mb-1">Klik atau Tarik file CSV ke sini</h4>
                  <p className="text-xs text-gray-500">Format: .csv atau .xlsx | Maksimal: 5MB</p>
                
                {templateCsv && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}
                    className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--color-primary-soft)] hover:bg-[var(--color-primary-muted)] text-[var(--color-primary-dark)] text-xs font-semibold rounded-lg transition"
                  >
                      <FileText className="w-4 h-4" /> Download Template {templateData ? 'Excel' : 'CSV'}
                  </button>
                )}
                {templateData && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}
                    className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--color-primary-soft)] hover:bg-[var(--color-primary-muted)] text-[var(--color-primary-dark)] text-xs font-semibold rounded-lg transition"
                  >
                    <FileText className="w-4 h-4" /> Download Template Excel (.xlsx)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STATE: PARSING OR IMPORTING */}
          {(status === 'parsing' || status === 'importing') && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-bold text-[var(--color-text-main)]">
                  {status === 'parsing' ? 'Menganalisis file...' : 'Menyimpan data ke server...'}
              </p>
            </div>
          )}

          {/* STATE: PREVIEW */}
          {status === 'preview' && (
            <div className="space-y-4">
                {sheets.length > 1 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <p className="text-xs text-blue-900 font-semibold mb-2">📊 Pilih Sheet:</p>
                    <div className="flex gap-2 flex-wrap">
                      {sheets.map((sheet) => (
                        <button
                          key={sheet}
                          onClick={() => handleSheetChange(sheet)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            selectedSheet === sheet
                              ? 'bg-[var(--color-primary)] text-white'
                              : 'bg-white border border-blue-200 text-blue-900 hover:bg-blue-100'
                          }`}
                        >
                          {sheet}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              <div className="flex justify-between items-end">
                <div>
                  <h4 className="font-bold text-sm">Preview Data</h4>
                  <p className="text-xs text-gray-500">Ditemukan {parsedData.length} baris data yang siap diimpor.</p>
                </div>
                <button 
                  onClick={() => setStatus('idle')}
                  className="text-xs font-bold text-gray-500 hover:text-gray-700"
                >
                  Ganti File
                </button>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-x-auto max-h-60">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 border-b border-gray-200 w-10 text-center">#</th>
                      {expectedHeaders.map(h => (
                        <th key={h} className="p-2 border-b border-gray-200 font-bold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-100 last:border-0">
                        <td className="p-2 text-center text-gray-400">{idx + 1}</td>
                        {expectedHeaders.map(h => (
                          <td key={h} className="p-2">{String(row[h] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedData.length > 5 && (
                  <div className="p-2 text-center text-gray-400 font-medium border-t border-gray-100 bg-white">
                    ... dan {parsedData.length - 5} baris lainnya
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button variant="secondary" onClick={onClose}>
                  Batal
                </Button>
                <Button onClick={handleExecuteImport}>
                  Mulai Import Data
                </Button>
              </div>
            </div>
          )}

          {/* STATE: SUCCESS */}
          {status === 'success' && (
            <div className="py-8 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: 'color-mix(in srgb, var(--color-success) 12%, var(--color-base))', color: 'var(--color-success)' }}>
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h4 className="font-bold text-lg text-[var(--color-text-main)]">Import Berhasil!</h4>
                <p className="text-sm text-gray-500 mt-1">Sebanyak {parsedData.length} baris data telah ditambahkan ke sistem.</p>
              </div>
              <Button
                onClick={onClose}
                className="mt-6"
              >
                Selesai
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
