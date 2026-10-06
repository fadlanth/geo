import { useState } from "react";
import { RiwayatMBKM } from "../types";
import { SKEMA_KETERLIBATAN_OPTIONS } from "../components/MbkmFormModal";

interface UseMbkmFormStateArgs {
  subTab: "magang" | "penelitian";
}

export function useMbkmFormState({ subTab }: UseMbkmFormStateArgs) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMbkm, setEditingMbkm] = useState<RiwayatMBKM | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<RiwayatMBKM>({
    npm_mahasiswa: "",
    jenis_kegiatan: "Magang Industri",
    tempat_instansi: "",
    semester: "",
    judul_topik_magang: "",
    dosen_pembimbing_lapangan: "",
    nip_dosen_pembimbing_dalam: null,
    periode_magang: "",
    keterlibatan: "Dengan dosen tetap dari perguruan tinggi homebase",
    sumber_dana: "",
    nama_ketua_riset: "",
    bukti_dokumen: "",
  });

  const resetForm = () => {
    setForm({
      npm_mahasiswa: "",
      jenis_kegiatan:
        subTab === "magang" ? "Magang Industri" : "Penelitian Dosen",
      tempat_instansi:
        subTab === "magang"
          ? ""
          : "Dengan dosen tetap dari perguruan tinggi homebase",
      semester: "",
      judul_topik_magang: "",
      dosen_pembimbing_lapangan: "",
      nip_dosen_pembimbing_dalam: null,
      periode_magang: "",
      keterlibatan: "Dengan dosen tetap dari perguruan tinggi homebase",
      sumber_dana: "",
      nama_ketua_riset: "",
      bukti_dokumen: "",
    });
    setEditingMbkm(null);
  };

  const handleEditClick = (m: RiwayatMBKM) => {
    setEditingMbkm(m);
    setForm({
      npm_mahasiswa: m.npm_mahasiswa,
      jenis_kegiatan:
        m.jenis_kegiatan ||
        (subTab === "magang" ? "Magang Industri" : "Penelitian Dosen"),
      tempat_instansi: m.tempat_instansi || "",
      semester: m.semester || "",
      judul_topik_magang: m.judul_topik_magang || "",
      dosen_pembimbing_lapangan: m.dosen_pembimbing_lapangan || "",
      nip_dosen_pembimbing_dalam: m.nip_dosen_pembimbing_dalam || null,
      periode_magang: m.periode_magang || "",
      keterlibatan:
        m.keterlibatan ||
        (m.tempat_instansi &&
        (SKEMA_KETERLIBATAN_OPTIONS as readonly string[]).includes(
          m.tempat_instansi,
        )
          ? m.tempat_instansi
          : "Dengan dosen tetap dari perguruan tinggi homebase"),
      sumber_dana: m.sumber_dana || "",
      nama_ketua_riset:
        m.nama_ketua_riset || m.dosen_pembimbing_lapangan || "",
      bukti_dokumen: m.bukti_dokumen || "",
    });
    setShowAddModal(true);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  return {
    showAddModal,
    setShowAddModal,
    editingMbkm,
    setEditingMbkm,
    isSubmitting,
    setIsSubmitting,
    form,
    setForm,
    resetForm,
    handleEditClick,
    handleOpenAddModal,
  };
}
