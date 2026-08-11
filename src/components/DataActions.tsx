import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, ChevronDown, FileText, FileSpreadsheet } from 'lucide-react';
import Button from './Button';

interface DataActionsProps {
  onImportCsv: () => void;
  onImportExcel: () => void;
  onExportExcel: () => void;
  onExportRekapPrestasi?: () => void;
}

export default function DataActions({ onImportCsv, onImportExcel, onExportExcel, onExportRekapPrestasi }: DataActionsProps) {
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
        <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1.5">
          <p className="px-4 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Import</p>
          <button
            onClick={() => { setOpen(false); onImportCsv(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition"
          >
            <FileText className="w-4 h-4 text-blue-600" /> CSV
          </button>
          <button
            onClick={() => { setOpen(false); onImportExcel(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel
          </button>
          <div className="border-t border-gray-100 my-1" />
          <p className="px-4 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Export</p>
          <button
            onClick={() => { setOpen(false); onExportExcel(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel
          </button>
          {onExportRekapPrestasi && (
            <button
              onClick={() => { setOpen(false); onExportRekapPrestasi(); }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-violet-600" /> Rekap + Grafik
            </button>
          )}
        </div>
      )}
    </div>
  );
}
