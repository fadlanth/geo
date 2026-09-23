import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileCheck,
  AlertCircle,
  X,
  CheckCircle2,
  Users,
  Briefcase,
  BookOpen,
  Store,
  Clock,
  Sparkles,
  Loader2,
  Filter
} from 'lucide-react';
import Button from './Button';
import { useEscapeClose } from '../lib/hooks';
import { parseTracerFile, TracerParseResult } from '../lib/tracerParser';
import { academicService } from '../lib/academicService';
import { ToastOptions } from './Toast';

interface TracerImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  triggerToast?: (options: ToastOptions) => void;
}

export const TracerImporterModal: React.FC<TracerImporterModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  triggerToast
}) => {
  useEscapeClose(isOpen, onClose);

  const [dragActive, setDragActive] = useState<boolean>(false);
  const [filterGeofisika, setFilterGeofisika] = useState<boolean>(true);
  const [fileName, setFileName] = useState<string>('');
  const [fileRawData, setFileRawData] = useState<ArrayBuffer | string | null>(null);
  const [parseResult, setParseResult] = useState<TracerParseResult | null>(null);
  const [parsing, setParsing] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessFile = async (file: File, onlyGeofisika: boolean) => {
    try {
      setParsing(true);
      setErrorMessage(null);
      setFileName(file.name);

      const buffer = await file.arrayBuffer();
      setFileRawData(buffer);

      const result = parseTracerFile(buffer, onlyGeofisika);
      setParseResult(result);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Format file tidak valid.');
      console.error('[TracerImporter] Parse error:', errorObj);
      setErrorMessage(errorObj.message);
      setParseResult(null);
    } finally {
      setParsing(false);
    }
  };

  const handleToggleFilter = (checked: boolean) => {
    setFilterGeofisika(checked);
    if (fileRawData) {
      try {
        setParsing(true);
        const result = parseTracerFile(fileRawData, checked);
        setParseResult(result);
      } catch (err) {
        console.error(err);
      } finally {
        setParsing(false);
      }
    }
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0], filterGeofisika);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0], filterGeofisika);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!parseResult || parseResult.tracerList.length === 0) return;

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const { mahasiswaCount, tracerCount } = await academicService.importTracerBundle(
        parseResult.mahasiswaList,
        parseResult.tracerList
      );

      triggerToast?.({
        kind: 'success',
        title: 'Import Tracer Sukses!',
        message: `Berhasil mengimpor ${tracerCount} data tracer alumni. (${mahasiswaCount} mahasiswa baru otomatis didaftarkan ke database).`
      });

      await onSuccess();
      onClose();
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Gagal menyimpan ke database.');
      console.error('[TracerImporter] Save error:', errorObj);
      setErrorMessage(errorObj.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-stone-200 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header Modal */}
        <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-[#241f20]">
                Auto-Pilot Importer (Tracer Study Pusat)
              </h3>
              <p className="text-xs text-[#241f20]/60">
                Otomatis saring Geofisika, bersihkan kolom kuesioner, dan daftarkan mahasiswa baru tanpa error database.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Opsi Filter Prodi */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 text-xs">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[var(--color-primary)]" />
              <span className="font-semibold text-[#241f20]">Penyaringan Otomatis:</span>
              <span className="text-[#241f20]/70">Hanya ambil mahasiswa Geofisika (abaikan jurusan lain)</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={filterGeofisika}
                onChange={(e) => handleToggleFilter(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
            </label>
          </div>

          {/* Area Drag & Drop */}
          <div
            role="button"
            tabIndex={0}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            aria-label="Pilih berkas tracer study atau seret berkas ke sini"
            className={`border-2 border-dashed rounded-3xl p-8 text-center transition cursor-pointer flex flex-col items-center justify-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
              dragActive
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                : 'border-stone-300 hover:border-[var(--color-primary)]/50 bg-stone-50/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.xml"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-stone-200 flex items-center justify-center text-[var(--color-primary)]">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#241f20]">
                Klik untuk memilih file tracer study atau tarik file ke sini
              </p>
              <p className="text-xs text-stone-500 mt-0.5">
                Mendukung file Excel (.xlsx, .xls), CSV, dan XML Spreadsheet dari berbagai tahun survei
              </p>
            </div>
            {fileName && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-stone-200 text-xs font-mono text-[var(--color-primary)] rounded-full shadow-2xs">
                <FileCheck className="w-3.5 h-3.5" />
                {fileName}
              </span>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-start gap-3 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">Gagal memproses file</p>
                <p className="mt-0.5 text-rose-700">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {parsing && (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-[var(--color-primary)]">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="text-xs font-medium">Menganalisis baris kuesioner tracer study...</p>
            </div>
          )}

          {/* HASIL PARSING & PREVIEW */}
          {parseResult && !parsing && (
            <div className="space-y-5 animate-in fade-in duration-300">
              
              {/* Ringkasan Ekstraksi */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/70">
                  <div className="text-xl font-extrabold text-emerald-700">
                    {parseResult.geofisikaFound}
                  </div>
                  <div className="text-[11px] text-[#241f20]/70 font-medium">
                    Alumni Geofisika Siap Import
                  </div>
                </div>

                <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-200/70">
                  <div className="text-xl font-extrabold text-teal-800">
                    {parseResult.mahasiswaList.length}
                  </div>
                  <div className="text-[11px] text-teal-700 font-medium">
                    Auto-Daftar Mahasiswa (No Error)
                  </div>
                </div>

                <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/70">
                  <div className="text-xl font-extrabold text-amber-800">
                    {parseResult.otherMajorsSkipped}
                  </div>
                  <div className="text-[11px] text-amber-700 font-medium">
                    Jurusan Lain Dilewati Otomatis
                  </div>
                </div>

                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/70">
                  <div className="text-xl font-extrabold text-[#241f20]">
                    {parseResult.totalRowsInFile}
                  </div>
                  <div className="text-[11px] text-[#241f20]/70 font-medium">
                    Total Baris Data di File
                  </div>
                </div>
              </div>

              {/* Status Breakdown Chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100/70 text-emerald-800">
                  <Briefcase className="w-3.5 h-3.5" /> Bekerja: {parseResult.breakdown.bekerja}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-teal-100/70 text-teal-800">
                  <BookOpen className="w-3.5 h-3.5" /> Studi Lanjut: {parseResult.breakdown.studiLanjut}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100/70 text-amber-800">
                  <Store className="w-3.5 h-3.5" /> Wiraswasta: {parseResult.breakdown.wiraswasta}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-200 text-stone-700">
                  <Clock className="w-3.5 h-3.5" /> Belum Bekerja: {parseResult.breakdown.belumBekerja}
                </span>
              </div>

              {/* Tabel Pratinjau 5 Baris Pertama */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-[#241f20]">
                    Pratinjau Hasil Bersih ({parseResult.tracerList.length} data):
                  </p>
                  <span className="text-[10px] text-stone-400">Menampilkan hingga 5 sampel</span>
                </div>
                <div className="overflow-x-auto border border-stone-200 rounded-2xl max-h-56">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">NPM</th>
                        <th className="py-2.5 px-3">Tahun</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Masa Tunggu</th>
                        <th className="py-2.5 px-3">Instansi / Kampus S2</th>
                        <th className="py-2.5 px-3">Jabatan / Prodi S2</th>
                        <th className="py-2.5 px-3">Gaji</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 bg-white">
                      {parseResult.tracerList.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-stone-50/50">
                          <td className="py-2 px-3 font-mono font-semibold text-stone-800">
                            {row.npm_mahasiswa}
                          </td>
                          <td className="py-2 px-3">{row.tahun_lulus}</td>
                          <td className="py-2 px-3">
                            <span className="font-semibold text-stone-800">{row.status_lulusan}</span>
                          </td>
                          <td className="py-2 px-3">{row.masa_tunggu_bulan} bln</td>
                          <td className="py-2 px-3">
                            {row.instansi_pekerjaan || row.universitas_tujuan || '-'}
                          </td>
                          <td className="py-2 px-3">
                            {row.jabatan || row.program_studi || '-'}
                          </td>
                          <td className="py-2 px-3">
                            {row.gaji_pekerjaan ? `Rp ${row.gaji_pekerjaan.toLocaleString('id-ID')}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-stone-100 bg-stone-50 flex items-center justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Batal
          </Button>

          <Button
            type="button"
            onClick={handleSaveToDatabase}
            disabled={!parseResult || parseResult.tracerList.length === 0 || submitting}
            icon={submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          >
            {submitting ? (
              <span>Menyimpan ke Database...</span>
            ) : (
              <span>Simpan {parseResult?.tracerList.length || 0} Data ke Database</span>
            )}
          </Button>
        </div>

      </div>
    </div>
  );
};

export default TracerImporterModal;
