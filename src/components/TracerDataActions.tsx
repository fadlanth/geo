import React, { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  Download,
  ChevronDown,
  Sparkles,
  FileSpreadsheet,
  Search,
  GraduationCap,
  Loader2,
} from "lucide-react";
import Button from "./Button";
import { useEscapeClose } from "../lib/hooks";

interface TracerDataActionsProps {
  onImportPusat: () => void;
  onImportStandar: () => void;
  onExportCohort: () => void;
  onExportMultiSheet: () => void;
  onExportAkreditasi: () => void;
  isExportingMultiSheet?: boolean;
}

export default function TracerDataActions({
  onImportPusat,
  onImportStandar,
  onExportCohort,
  onExportMultiSheet,
  onExportAkreditasi,
  isExportingMultiSheet = false,
}: TracerDataActionsProps) {
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const importRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEscapeClose(importOpen, () => setImportOpen(false));
  useEscapeClose(exportOpen, () => setExportOpen(false));

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (importRef.current && !importRef.current.contains(target)) {
        setImportOpen(false);
      }
      if (exportRef.current && !exportRef.current.contains(target)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-2">
      {/* ── DROPDOWN IMPOR ── */}
      <div className="relative" ref={importRef}>
        <Button
          variant="secondary"
          onClick={() => {
            setImportOpen(!importOpen);
            setExportOpen(false);
          }}
          aria-haspopup="menu"
          aria-expanded={importOpen}
          icon={<UploadCloud className="w-4 h-4" />}
          className="shadow-xs font-semibold"
        >
          Impor{" "}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-150 ${
              importOpen ? "rotate-180" : ""
            }`}
          />
        </Button>

        {importOpen && (
          <div
            role="menu"
            aria-label="Menu Pilihan Impor Tracer Study"
            className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="px-3 py-1.5 border-b border-slate-100 mb-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Sumber Data Masuk
              </p>
            </div>

            {/* Opsi 1: Kuesioner Dikti / Universitas */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setImportOpen(false);
                onImportPusat();
              }}
              className="w-full text-left p-2.5 rounded-lg hover:bg-emerald-50/80 transition-colors group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-slate-800 group-hover:text-emerald-950">
                      Kuesioner Dikti / Universitas
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                      Otomatis
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 mt-0.5 leading-snug">
                    Format unduhan pusat (kode f8, f5-02, filter geofisika).
                  </p>
                </div>
              </div>
            </button>

            {/* Opsi 2: File Excel / CSV Standar */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setImportOpen(false);
                onImportStandar();
              }}
              className="w-full text-left p-2.5 rounded-lg hover:bg-slate-100 transition-colors group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              <div className="flex items-start gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-slate-800 group-hover:text-slate-900">
                      File Excel / CSV Standar
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
                      Template
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 mt-0.5 leading-snug">
                    Rekap mandiri (kolom NPM, Status, Instansi, Masa Tunggu).
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* ── DROPDOWN EKSPOR ── */}
      <div className="relative" ref={exportRef}>
        <Button
          variant="secondary"
          onClick={() => {
            setExportOpen(!exportOpen);
            setImportOpen(false);
          }}
          aria-haspopup="menu"
          aria-expanded={exportOpen}
          icon={
            isExportingMultiSheet ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
            ) : (
              <Download className="w-4 h-4" />
            )
          }
          className="shadow-xs font-semibold"
        >
          Ekspor{" "}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-150 ${
              exportOpen ? "rotate-180" : ""
            }`}
          />
        </Button>

        {exportOpen && (
          <div
            role="menu"
            aria-label="Menu Pilihan Ekspor Tracer Study"
            className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="px-3 py-1.5 border-b border-slate-100 mb-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Format Berkas Ekspor (.xlsx)
              </p>
            </div>

            {/* Opsi 1: Data Cohort Terfilter */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setExportOpen(false);
                onExportCohort();
              }}
              className="w-full text-left p-2.5 rounded-lg hover:bg-blue-50/80 transition-colors group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              <div className="flex items-start gap-2.5">
                <Search className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-950">
                      Data Cohort Terfilter
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
                      Tabel Aktif
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 mt-0.5 leading-snug">
                    Sesuai filter tahun kelulusan &amp; pencarian aktif di
                    layar.
                  </p>
                </div>
              </div>
            </button>

            {/* Opsi 2: Laporan Multi-Sheet */}
            <button
              type="button"
              role="menuitem"
              disabled={isExportingMultiSheet}
              onClick={() => {
                setExportOpen(false);
                onExportMultiSheet();
              }}
              className="w-full text-left p-2.5 rounded-lg hover:bg-teal-50/80 transition-colors group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              <div className="flex items-start gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-slate-800 group-hover:text-teal-950">
                      Laporan Multi-Sheet
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-teal-100 text-teal-800 rounded">
                      Lengkap
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 mt-0.5 leading-snug">
                    Dipisah lembar sheet Bekerja, Wiraswasta, dan Studi Lanjut.
                  </p>
                </div>
              </div>
            </button>

            {/* Opsi 3: Matriks Akreditasi LAMSAMA */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setExportOpen(false);
                onExportAkreditasi();
              }}
              className="w-full text-left p-2.5 rounded-lg hover:bg-indigo-50/80 transition-colors group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              <div className="flex items-start gap-2.5">
                <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-slate-800 group-hover:text-indigo-950">
                      Matriks LKPS LAMSAMA
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded">
                      Akreditasi
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 mt-0.5 leading-snug">
                    Format borang standar akreditasi prodi &amp; capaian IKU-1.
                  </p>
                </div>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
