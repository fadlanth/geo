import { useState, useCallback } from "react";
import { academicService } from "../lib/academicService";
import { TracerStudy } from "../types";
import { errMsg } from "../lib/format";
import { ToastOptions } from "../components/Toast";

export function useTracerActions(
  triggerToast: (opts: ToastOptions) => void,
  setConfirmAction: (
    action: {
      title: string;
      message: string;
      detail?: string;
      onConfirm: () => void;
    } | null,
  ) => void,
) {
  const [alumni, setAlumni] = useState<TracerStudy[]>([]);

  const refreshAlumni = useCallback(async () => {
    try {
      const data = await academicService.getTracerAlumni();
      setAlumni(data);
    } catch (err) {
      console.error("Gagal memuat alumni:", err);
    }
  }, []);

  const handleSaveAlumni = async (al: TracerStudy) => {
    try {
      await academicService.saveTracerAlumni(al);
      await refreshAlumni();
      triggerToast({
        kind: "success",
        title: "Data Tracer Tersimpan",
        message: `Data tracer study alumni berhasil disimpan.`,
      });
    } catch (err) {
      triggerToast({
        kind: "error",
        title: "Gagal Menyimpan",
        message: errMsg(
          err,
          "Terjadi kesalahan saat menyimpan data tracer study.",
        ),
      });
    }
  };

  const handleDeleteAlumni = (id: string) => {
    setConfirmAction({
      title: "Hapus Data Tracer Study",
      message:
        "Apakah Anda yakin ingin menghapus data tracer study alumni ini dari sistem?",
      onConfirm: async () => {
        try {
          await academicService.deleteTracerAlumni(id);
          await refreshAlumni();
          triggerToast({
            kind: "success",
            title: "Data Tracer Study Dihapus",
            message: "Data tracer study alumni berhasil dihapus.",
          });
        } catch (err) {
          triggerToast({
            kind: "error",
            title: "Gagal Menghapus",
            message: errMsg(err, "Gagal menghapus data tracer study."),
          });
        }
      },
    });
  };

  const handleBulkImportAlumni = async (records: TracerStudy[]) => {
    try {
      await academicService.bulkSaveTracerAlumni(records);
      await refreshAlumni();
      triggerToast({
        kind: "success",
        title: "Import Tracer Berhasil",
        message: `Berhasil mengimpor ${records.length} data tracer alumni.`,
      });
    } catch (err) {
      triggerToast({
        kind: "error",
        title: "Gagal Mengimpor",
        message: errMsg(
          err,
          "Terjadi kesalahan saat mengimpor data tracer alumni.",
        ),
      });
      throw err;
    }
  };

  return {
    alumni,
    setAlumni,
    refreshAlumni,
    handleSaveAlumni,
    handleDeleteAlumni,
    handleBulkImportAlumni,
  };
}
