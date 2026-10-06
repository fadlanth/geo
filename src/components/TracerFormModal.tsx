import React from "react";
import { TracerStudy, Mahasiswa } from "../types";
import IconButton from "./IconButton";
import ComboboxMahasiswa from "./ComboboxMahasiswa";
import Button from "./Button";

export const TINGKAT_OPTIONS = [
  "Lokal",
  "Nasional",
  "Multinasional",
  "Internasional",
] as const;

interface TracerFormModalProps {
  editingAlumni: TracerStudy | null;
  form: TracerStudy;
  setForm: (f: TracerStudy) => void;
  isSubmitting: boolean;
  mahasiswa: Mahasiswa[];
  alumni: TracerStudy[];
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  modalRef: React.RefObject<HTMLDivElement | null>;
}

export default function TracerFormModal({
  editingAlumni,
  form,
  setForm,
  isSubmitting,
  mahasiswa,
  alumni,
  onSubmit,
  onClose,
  modalRef,
}: TracerFormModalProps) {
  const getMahasiswaTahunLulus = (m: Mahasiswa): number => {
    if (m.tahun_lulus) return m.tahun_lulus;
    const tracerMatch = alumni.find((a) => a.npm_mahasiswa === m.npm);
    if (tracerMatch?.tahun_lulus) return tracerMatch.tahun_lulus;
    if (m.angkatan) return m.angkatan + 4;
    return new Date().getFullYear();
  };

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tracer-modal-title"
      onClick={(e) => e.stopPropagation()}
      className="bg-white rounded-2xl border border-[var(--color-primary)]/10 max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 id="tracer-modal-title" className="font-display font-bold text-lg">
          {editingAlumni ? "Edit Data Tracer" : "Tambah Data Tracer"}
        </h3>
        <IconButton
          label="Tutup"
          onClick={() => {
            onClose();
          }}
          icon={<span className="text-sm leading-none">✕</span>}
        />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Identitas Mahasiswa */}
        <div>
          <label
            htmlFor="tracer-mahasiswa"
            className="block text-xs font-semibold mb-1"
          >
            Mahasiswa (Lulusan) *
          </label>
          <ComboboxMahasiswa
            id="tracer-mahasiswa"
            mahasiswa={mahasiswa.filter(
              (m) =>
                m.status === "Lulus" ||
                alumni.some((a) => a.npm_mahasiswa === m.npm),
            )}
            value={form.npm_mahasiswa}
            onChange={(npm) => {
              const mhs = mahasiswa.find((m) => m.npm === npm);
              setForm({
                ...form,
                npm_mahasiswa: npm,
                tahun_lulus:
                  mhs?.tahun_lulus ||
                  (mhs ? getMahasiswaTahunLulus(mhs) : form.tahun_lulus),
              });
            }}
            placeholder="Cari nama/NPM alumni lulus..."
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="tracer-tahun"
              className="block text-xs font-semibold mb-1"
            >
              Tahun Lulus *
            </label>
            <input
              id="tracer-tahun"
              type="number"
              required
              value={form.tahun_lulus}
              onChange={(e) =>
                setForm({ ...form, tahun_lulus: Number(e.target.value) })
              }
              className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <div>
            <label
              htmlFor="tracer-status"
              className="block text-xs font-semibold mb-1"
            >
              Status Lulusan *
            </label>
            <select
              id="tracer-status"
              value={form.status_lulusan}
              onChange={(e) =>
                setForm({
                  ...form,
                  status_lulusan: e.target
                    .value as TracerStudy["status_lulusan"],
                })
              }
              className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="Bekerja">Bekerja</option>
              <option value="Studi Lanjut">Studi Lanjut</option>
              <option value="Wiraswasta">Wiraswasta</option>
              <option value="Belum Bekerja">Belum Bekerja</option>
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="tracer-tunggu"
            className="block text-xs font-semibold mb-1"
          >
            Masa Tunggu (bulan) *
          </label>
          <input
            id="tracer-tunggu"
            type="number"
            min={0}
            value={form.masa_tunggu_bulan}
            onChange={(e) =>
              setForm({
                ...form,
                masa_tunggu_bulan: Number(e.target.value),
              })
            }
            className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
          />
        </div>

        {/* Conditional: Bekerja */}
        {form.status_lulusan === "Bekerja" && (
          <div className="border-t border-gray-100 pt-4 space-y-4">
            <h4 className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider">
              Data Pekerjaan
            </h4>
            <div>
              <label
                htmlFor="tracer-instansi"
                className="block text-xs font-semibold mb-1"
              >
                Instansi / Perusahaan
              </label>
              <input
                id="tracer-instansi"
                type="text"
                value={form.instansi_pekerjaan || ""}
                onChange={(e) =>
                  setForm({ ...form, instansi_pekerjaan: e.target.value })
                }
                className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="tracer-jabatan"
                  className="block text-xs font-semibold mb-1"
                >
                  Jabatan / Posisi
                </label>
                <input
                  id="tracer-jabatan"
                  type="text"
                  value={form.jabatan || ""}
                  onChange={(e) =>
                    setForm({ ...form, jabatan: e.target.value })
                  }
                  className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div>
                <label
                  htmlFor="tracer-tingkat"
                  className="block text-xs font-semibold mb-1"
                >
                  Tingkat Perusahaan
                </label>
                <select
                  id="tracer-tingkat"
                  value={form.tingkat_perusahaan || ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      tingkat_perusahaan: (e.target.value ||
                        undefined) as TracerStudy["tingkat_perusahaan"],
                    })
                  }
                  className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
                >
                  <option value="">-- Pilih --</option>
                  {TINGKAT_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label
                htmlFor="tracer-gaji"
                className="block text-xs font-semibold mb-1"
              >
                Gaji Bulanan (Rp)
              </label>
              <input
                id="tracer-gaji"
                type="number"
                min={0}
                step={100000}
                placeholder="Contoh: 8500000"
                value={form.gaji_pekerjaan || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    gaji_pekerjaan: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
                className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Kategori otomatis: 0-5jt / &gt;5-10jt / &gt;10jt
              </p>
            </div>
          </div>
        )}

        {/* Conditional: Studi Lanjut */}
        {form.status_lulusan === "Studi Lanjut" && (
          <div className="border-t border-gray-100 pt-4 space-y-4">
            <h4 className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider">
              Data Studi Lanjut
            </h4>
            <div>
              <label
                htmlFor="tracer-univ"
                className="block text-xs font-semibold mb-1"
              >
                Universitas / Institusi Tujuan
              </label>
              <input
                id="tracer-univ"
                type="text"
                placeholder="Contoh: Kyushu University / Institut Teknologi Bandung"
                value={form.universitas_tujuan || ""}
                onChange={(e) =>
                  setForm({ ...form, universitas_tujuan: e.target.value })
                }
                className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <label
                htmlFor="tracer-prodi"
                className="block text-xs font-semibold mb-1"
              >
                Program Studi
              </label>
              <input
                id="tracer-prodi"
                type="text"
                placeholder="Contoh: Magister Teknik Geofisika"
                value={form.program_studi || ""}
                onChange={(e) =>
                  setForm({ ...form, program_studi: e.target.value })
                }
                className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>
        )}

        {/* Conditional: Wiraswasta */}
        {form.status_lulusan === "Wiraswasta" && (
          <div className="border-t border-gray-100 pt-4 space-y-4">
            <h4 className="text-xs font-bold text-[var(--color-primary)] uppercase tracking-wider">
              Data Wiraswasta
            </h4>
            <div>
              <label
                htmlFor="tracer-usaha"
                className="block text-xs font-semibold mb-1"
              >
                Bidang Usaha
              </label>
              <input
                id="tracer-usaha"
                type="text"
                placeholder="Contoh: Jasa Survei Geofisika"
                value={form.bidang_usaha || ""}
                onChange={(e) =>
                  setForm({ ...form, bidang_usaha: e.target.value })
                }
                className="w-full text-sm p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
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
            ) : editingAlumni ? (
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
