import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, ChevronDown, FileText, FileSpreadsheet, Sparkles } from 'lucide-react';
import Button from './Button';

interface DataActionsProps {
  onImportCsv: () => void;
  onImportExcel: () => void;
  onExportExcel: () => void;
  onExportRekapPrestasi?: () => void;
  onImportPusat?: () => void;
  onExportMultiSheet?: () => void;
}

export default function DataActions({
  onImportCsv,
  onImportExcel,
  onExportExcel,
  onExportRekapPrestasi,
  onImportPusat,
  onExportMultiSheet
}: DataActionsProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="secondary"
        onClick={() => setOpen(!open)}
        icon={<UploadCloud className="w-4 h-4" />}
      >
        Data <ChevronDown className={`w-3 h-3 transition ${open ? 'rotate-180' : ''}`} />
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150">
          <p className="px-4 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Import Data</p>
          {onImportPusat && (
            <button
              onClick={() => { setOpen(false); onImportPusat(); }}
              className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-700 hover:bg-emerald-50 hover:text-emerald-800 transition text-left"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">Format Tracer Pusat</span>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-md">Auto</span>
            </button>
          )}
          <button
            onClick={() => { setOpen(false); onImportCsv(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition"
          >
            <FileText className="w-4 h-4 text-blue-600 shrink-0" /> Format Standar CSV
          </button>
          <button
            onClick={() => { setOpen(false); onImportExcel(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" /> Format Standar Excel
          </button>
          <div className="border-t border-gray-100 my-1" />
          <p className="px-4 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Export Data</p>
          {onExportMultiSheet && (
            <button
              onClick={() => { setOpen(false); onExportMultiSheet(); }}
              className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-700 hover:bg-teal-50 hover:text-teal-800 transition text-left"
            >
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-teal-600 shrink-0" />
                <span className="font-medium">Laporan Multi-Sheet</span>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-teal-100 text-teal-700 rounded-md">Lengkap</span>
            </button>
          )}
          <button
            onClick={() => { setOpen(false); onExportExcel(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" /> Excel (.xlsx)
          </button>
          {onExportRekapPrestasi && (
            <button
              onClick={() => { setOpen(false); onExportRekapPrestasi(); }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-violet-600 shrink-0" /> Rekap + Grafik
            </button>
          )}
        </div>
      )}
    </div>
  );
}
