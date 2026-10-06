import React from "react";
import { X } from "lucide-react";
import { RiwayatMBKM, Mahasiswa, Dosen } from "../types";
import ComboboxMahasiswa from "./ComboboxMahasiswa";
import Button from "./Button";

export const SKEMA_KETERLIBATAN_OPTIONS = [
  "Dengan dosen tetap dari perguruan tinggi homebase",
  "Dengan lembaga riset yang bereputasi",
  "Dengan pemerintah/BUMN/BUMD (dibimbing dosen)",
  "Dengan dosen tetap dari perguruan tinggi lain",
] as const;

interface MbkmFormModalProps {
  subTab: "magang" | "penelitian";
  editingMbkm: RiwayatMBKM | null;
  form: RiwayatMBKM;
  setForm: (f: RiwayatMBKM) => void;
  isSubmitting: boolean;
  mahasiswa: Mahasiswa[];
  dosen: Dosen[];
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  modalRef: React.RefObject<HTMLDivElement | null>;
}

export default function MbkmFormModal({
  subTab,
  editingMbkm,
  form,
  setForm,
  isSubmitting,
  mahasiswa,
  dosen,
  onSubmit,
  onClose,
  modalRef,
}: MbkmFormModalProps) {
  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="magang-modal-title"
      onClick={(e) => e.stopPropagation()}
      className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-xl max-h-[90vh] overflow-y-auto border border-slate-200"
    >
      <div className="flex items-start justify-between pb-4 border-b border-slate-100 mb-4">
        <div>
          <h3
            id="magang-modal-title"
            className="font-display font-bold text-lg text-[var(--color-text-main)]"
          >
            {editingMbkm
              ? subTab === "magang"
                ? "Edit Data Magang Industri"
                : "Edit Keterlibatan Penelitian Dosen"
              : subTab === "magang"
                ? "Catat Magang Industri Baru"
                : "Catat Keterlibatan Penelitian Dosen Baru"}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {subTab === "magang"
              ? "Lengkapi rincian instansi dan bimbingan magang mahasiswa."
              : "Lengkapi data keterlibatan mahasiswa dalam riset dosen."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            onClose();
          }}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:outline-none transition"
          aria-label="Tutup modal"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
        {/* Form Khusus Magang Industri */}
        {subTab === "magang" ? (
          <>
            <div>
              <h4 className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider mb-3">
                Data Wajib Magang
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label
                    htmlFor="magang-mahasiswa"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Mahasiswa <span className="text-rose-500">*</span>
                  </label>
                  <ComboboxMahasiswa
                    id="magang-mahasiswa"
                    mahasiswa={mahasiswa}
                    value={form.npm_mahasiswa}
                    onChange={(npm) => setForm({ ...form, npm_mahasiswa: npm })}
                    placeholder="Cari nama/NPM mahasiswa..."
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="magang-tempat"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Tempat / Instansi Magang{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="magang-tempat"
                    type="text"
                    required
                    placeholder="Contoh: PT Pertamina Geothermal Energy"
                    value={form.tempat_instansi}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tempat_instansi: e.target.value,
                      })
                    }
                    className="w-full text-sm p-2.5 border border-slate-300 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20 focus-visible:border-[var(--color-primary)] text-slate-800 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor="magang-semester"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Semester Pelaksanaan{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="magang-semester"
                    type="text"
                    required
                    placeholder="Contoh: Genap 2025/2026"
                    value={form.semester}
                    onChange={(e) =>
                      setForm({ ...form, semester: e.target.value })
                    }
                    className="w-full text-sm p-2.5 border border-slate-300 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20 focus-visible:border-[var(--color-primary)] text-slate-800 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor="magang-periode"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Periode Magang
                  </label>
                  <input
                    id="magang-periode"
                    type="text"
                    placeholder="Contoh: 1 Juli - 31 Agustus 2026"
                    value={form.periode_magang || ""}
                    onChange={(e) =>
                      setForm({ ...form, periode_magang: e.target.value })
                    }
                    className="w-full text-sm p-2.5 border border-slate-300 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20 focus-visible:border-[var(--color-primary)] text-slate-800 placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Topik & Pembimbing
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label
                    htmlFor="magang-judul"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Judul Topik Magang
                  </label>
                  <input
                    id="magang-judul"
                    type="text"
                    placeholder="Contoh: Analisis Petrofisika dan Evaluasi Formasi Reservoar"
                    value={form.judul_topik_magang || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        judul_topik_magang: e.target.value,
                      })
                    }
                    className="w-full text-sm p-2.5 border border-slate-300 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20 focus-visible:border-[var(--color-primary)] text-slate-800 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor="magang-dpl"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Dosen Pembimbing Lapangan
                  </label>
                  <input
                    id="magang-dpl"
                    type="text"
                    placeholder="Contoh: Ir. Budi Santoso (PT Pertamina)"
                    value={form.dosen_pembimbing_lapangan || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        dosen_pembimbing_lapangan: e.target.value,
                      })
                    }
                    className="w-full text-sm p-2.5 border border-slate-300 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20 focus-visible:border-[var(--color-primary)] text-slate-800 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor="magang-dpd"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Dosen Pembimbing UNPAD
                  </label>
                  <select
                    id="magang-dpd"
                    value={form.nip_dosen_pembimbing_dalam || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        nip_dosen_pembimbing_dalam: e.target.value || null,
                      })
                    }
                    className="w-full text-sm p-2.5 border border-slate-300 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20 focus-visible:border-[var(--color-primary)] text-slate-800 font-medium"
                  >
                    <option value="">-- Belum Ditentukan --</option>
                    {dosen.map((d) => (
                      <option key={d.nip} value={d.nip}>
                        {d.nama} ({d.nip})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Form Khusus Penelitian Dosen (Sesuai Kolom Borang Riil) */
          <>
            <div>
              <h4 className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider mb-3">
                Data Riset & Keterlibatan
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label
                    htmlFor="riset-mahasiswa"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Mahasiswa <span className="text-rose-500">*</span>
                  </label>
                  <ComboboxMahasiswa
                    id="riset-mahasiswa"
                    mahasiswa={mahasiswa}
                    value={form.npm_mahasiswa}
                    onChange={(npm) => setForm({ ...form, npm_mahasiswa: npm })}
                    placeholder="Cari nama/NPM mahasiswa..."
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="riset-keterlibatan"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Skema Keterlibatan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="riset-keterlibatan"
                    value={form.keterlibatan}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm({
                        ...form,
                        keterlibatan: val,
                        tempat_instansi: val,
                      });
                    }}
                    className="w-full text-sm p-2.5 border border-slate-300 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20 focus-visible:border-[var(--color-primary)] text-slate-800 font-medium"
                  >
                    {SKEMA_KETERLIBATAN_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {form.keterlibatan ===
                    "Dengan dosen tetap dari perguruan tinggi homebase" && (
                    <p className="text-[11px] text-emerald-700 mt-1 font-medium">
                      Skema Homebase: Anda dapat langsung memilih dosen
                      Geofisika Unpad pada kolom "Pilih Dosen UNPAD" di bawah.
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="riset-judul"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Judul Riset <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="riset-judul"
                    required
                    rows={2}
                    placeholder="Contoh: Monitoring Getaran Tanah Berbasis IoT dan AI untuk Mitigasi Bencana..."
                    value={form.judul_topik_magang || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        judul_topik_magang: e.target.value,
                      })
                    }
                    className="w-full text-sm p-2.5 border border-slate-300 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20 focus-visible:border-[var(--color-primary)] text-slate-800 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor="riset-sumberdana"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Jenis Riset / Sumber Dana
                  </label>
                  <input
                    id="riset-sumberdana"
                    type="text"
                    placeholder="Contoh: Hibah Bappeltbangda, RKDU 2026, RIM..."
                    value={form.sumber_dana || ""}
                    onChange={(e) =>
                      setForm({ ...form, sumber_dana: e.target.value })
                    }
                    className="w-full text-sm p-2.5 border border-slate-300 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20 focus-visible:border-[var(--color-primary)] text-slate-800 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor="riset-periode"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Tahun / Periode <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="riset-periode"
                    type="text"
                    required
                    placeholder="Contoh: 2025, 2025-2026 genap 25/26"
                    value={form.semester}
                    onChange={(e) =>
                      setForm({ ...form, semester: e.target.value })
                    }
                    className="w-full text-sm p-2.5 border border-slate-300 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20 focus-visible:border-[var(--color-primary)] text-slate-800 placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Ketua Riset & Dokumen Bukti
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="riset-ketua"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Nama Ketua Riset (Dosen)
                  </label>
                  <input
                    id="riset-ketua"
                    type="text"
                    placeholder="Contoh: Prof. Dr. rer. nat. Yudi Rosandi, M.Si."
                    value={form.nama_ketua_riset || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        nama_ketua_riset: e.target.value,
                      })
                    }
                    className="w-full text-sm p-2.5 border border-slate-300 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20 focus-visible:border-[var(--color-primary)] text-slate-800 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor="riset-dosen-unpad"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Pilih Dosen UNPAD (Sinkron NIP)
                  </label>
                  <select
                    id="riset-dosen-unpad"
                    value={form.nip_dosen_pembimbing_dalam || ""}
                    onChange={(e) => {
                      const nip = e.target.value || null;
                      const d = dosen.find((ds) => ds.nip === nip);
                      setForm({
                        ...form,
                        nip_dosen_pembimbing_dalam: nip,
                        nama_ketua_riset: d ? d.nama : form.nama_ketua_riset,
                      });
                    }}
                    className="w-full text-sm p-2.5 border border-slate-300 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20 focus-visible:border-[var(--color-primary)] text-slate-800 font-medium"
                  >
                    <option value="">
                      -- Dosen Luar / Pilih Dosen UNPAD --
                    </option>
                    {dosen.map((d) => (
                      <option key={d.nip} value={d.nip}>
                        {d.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="riset-bukti"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Bukti Dokumen{" "}
                    <span className="text-slate-400 font-normal">
                      (Opsional)
                    </span>
                  </label>
                  <input
                    id="riset-bukti"
                    type="text"
                    placeholder="Contoh: https://drive.google.com/... atau nama berkas PDF (opsional)"
                    value={form.bukti_dokumen || ""}
                    onChange={(e) =>
                      setForm({ ...form, bukti_dokumen: e.target.value })
                    }
                    className="w-full text-sm p-2.5 border border-slate-300 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/20 focus-visible:border-[var(--color-primary)] text-slate-800 placeholder:text-slate-400"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Dapat berupa tautan berkas online (Google Drive / OneDrive /
                    repositori) agar bisa diklik langsung dari tabel.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onClose();
            }}
          >
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                Menyimpan...
              </>
            ) : editingMbkm ? (
              "Simpan Perubahan"
            ) : (
              "Simpan Data"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
