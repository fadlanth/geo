import { useState } from "react";
import { Mahasiswa, TracerStudy } from "../types";

interface UseTracerFormStateArgs {
  filterTahun: string;
  resolveTahunLulus: (m: Mahasiswa) => number;
}

export function useTracerFormState({
  filterTahun,
  resolveTahunLulus,
}: UseTracerFormStateArgs) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAlumni, setEditingAlumni] = useState<TracerStudy | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<TracerStudy>({
    npm_mahasiswa: "",
    tahun_lulus: new Date().getFullYear(),
    status_lulusan: "Bekerja",
    masa_tunggu_bulan: 0,
    instansi_pekerjaan: "",
    jabatan: "",
    tingkat_perusahaan: undefined,
    gaji_pekerjaan: undefined,
    universitas_tujuan: "",
    program_studi: "",
    bidang_usaha: "",
  });

  const resetForm = () => {
    setForm({
      npm_mahasiswa: "",
      tahun_lulus:
        filterTahun !== "All" ? Number(filterTahun) : new Date().getFullYear(),
      status_lulusan: "Bekerja",
      masa_tunggu_bulan: 0,
      instansi_pekerjaan: "",
      jabatan: "",
      tingkat_perusahaan: undefined,
      gaji_pekerjaan: undefined,
      universitas_tujuan: "",
      program_studi: "",
      bidang_usaha: "",
    });
    setEditingAlumni(null);
  };

  const handleEditClick = (a: TracerStudy) => {
    setEditingAlumni(a);
    setForm({
      npm_mahasiswa: a.npm_mahasiswa,
      tahun_lulus: a.tahun_lulus,
      status_lulusan: a.status_lulusan,
      masa_tunggu_bulan: a.masa_tunggu_bulan,
      instansi_pekerjaan: a.instansi_pekerjaan || "",
      jabatan: a.jabatan || "",
      tingkat_perusahaan: a.tingkat_perusahaan,
      gaji_pekerjaan: a.gaji_pekerjaan,
      universitas_tujuan: a.universitas_tujuan || "",
      program_studi: a.program_studi || "",
      bidang_usaha: a.bidang_usaha || "",
    });
    setShowAddModal(true);
  };

  const handleQuickInputTracer = (m: Mahasiswa) => {
    setEditingAlumni(null);
    setForm({
      npm_mahasiswa: m.npm,
      tahun_lulus: resolveTahunLulus(m),
      status_lulusan: "Bekerja",
      masa_tunggu_bulan: 0,
      instansi_pekerjaan: "",
      jabatan: "",
      tingkat_perusahaan: undefined,
      gaji_pekerjaan: undefined,
      universitas_tujuan: "",
      program_studi: "",
      bidang_usaha: "",
    });
    setShowAddModal(true);
  };

  return {
    showAddModal,
    setShowAddModal,
    editingAlumni,
    setEditingAlumni,
    isSubmitting,
    setIsSubmitting,
    form,
    setForm,
    resetForm,
    handleEditClick,
    handleQuickInputTracer,
  };
}
