import { describe, it, expect } from "vitest";
import {
  normalizeStatus,
  normalizeTingkat,
  parseGaji,
  parseMasaTunggu,
  autoMapColumns,
  validateAndNormalizeRows,
  getImportSummary,
} from "./tracerImportUtils";

describe("normalizeStatus", () => {
  it("mengenali status persis", () => {
    expect(normalizeStatus("Bekerja").value).toBe("Bekerja");
    expect(normalizeStatus("wiraswasta").value).toBe("Wiraswasta");
    expect(normalizeStatus("Studi Lanjut").value).toBe("Studi Lanjut");
    expect(normalizeStatus("belum bekerja").value).toBe("Belum Bekerja");
  });

  it("mengenali alias dan typo", () => {
    expect(normalizeStatus("sudah kerja").value).toBe("Bekerja");
    expect(normalizeStatus("wirausaha").value).toBe("Wiraswasta");
    expect(normalizeStatus("kuliah").value).toBe("Studi Lanjut");
    expect(normalizeStatus("mencari kerja").value).toBe("Belum Bekerja");
  });

  it("fallback fuzzy menghasilkan warning", () => {
    const r = normalizeStatus("bekerja di PT XYZ");
    expect(r.value).toBe("Bekerja");
    expect(r.warning).toBeDefined();
  });

  it("kosong dan tak dikenal", () => {
    expect(normalizeStatus("").value).toBeNull();
    expect(normalizeStatus(null).value).toBeNull();
    expect(normalizeStatus("astronaut").value).toBeNull();
  });
});

describe("normalizeTingkat", () => {
  it("memetakan alias umum", () => {
    expect(normalizeTingkat("lokal")).toBe("Lokal");
    expect(normalizeTingkat("BUMN")).toBe("Nasional");
    expect(normalizeTingkat("multinasional")).toBe("Multinasional");
    expect(normalizeTingkat("global")).toBe("Internasional");
  });
  it("undefined bila kosong atau tak dikenal", () => {
    expect(normalizeTingkat("")).toBeUndefined();
    expect(normalizeTingkat("kecil")).toBeUndefined();
  });
});

describe("parseGaji", () => {
  it("angka polos", () => {
    expect(parseGaji("8500000").value).toBe(8500000);
    expect(parseGaji(5000000).value).toBe(5000000);
  });
  it("format ribuan titik/koma", () => {
    expect(parseGaji("8.500.000").value).toBe(8500000);
    expect(parseGaji("8,500,000").value).toBe(8500000);
  });
  it("prefiks Rp dan singkatan jt", () => {
    expect(parseGaji("Rp 5.000.000").value).toBe(5000000);
    expect(parseGaji("5jt").value).toBe(5000000);
    expect(parseGaji("5.5jt").value).toBe(5500000);
  });
  it("kosong jadi undefined, tak parse jadi warning", () => {
    expect(parseGaji("").value).toBeUndefined();
    expect(parseGaji("banyak").value).toBeUndefined();
    expect(parseGaji("banyak").warning).toBeDefined();
  });
});

describe("parseMasaTunggu", () => {
  it("angka langsung", () => {
    expect(parseMasaTunggu("6").value).toBe(6);
  });
  it("satuan bulan dan tahun", () => {
    expect(parseMasaTunggu("3 bulan").value).toBe(3);
    expect(parseMasaTunggu("2 tahun").value).toBe(24);
  });
  it("kosong/tak valid jadi 0 + warning", () => {
    expect(parseMasaTunggu("").value).toBe(0);
    expect(parseMasaTunggu("lama").value).toBe(0);
    expect(parseMasaTunggu("lama").warning).toBeDefined();
  });
});

describe("autoMapColumns", () => {
  it("memetakan header umum dan mendeteksi kolom wajib kurang", () => {
    const r = autoMapColumns([
      "NPM",
      "Tahun Lulus",
      "Status",
      "Masa Tunggu",
      "Gaji",
    ]);
    const fields = r.mapped.map((m) => m.targetField);
    expect(fields).toContain("npm_mahasiswa");
    expect(fields).toContain("tahun_lulus");
    expect(fields).toContain("status_lulusan");
    expect(fields).toContain("masa_tunggu_bulan");
    expect(fields).toContain("gaji_pekerjaan");
    expect(r.missingRequired).toHaveLength(0);
  });
  it("kolom tak dikenal jadi unmapped, wajib kurang tercatat", () => {
    const r = autoMapColumns(["NPM Mahasiswa", "KolomAneh"]);
    expect(r.unmapped).toContain("KolomAneh");
    expect(r.missingRequired).toContain("tahun_lulus");
  });
});

describe("validateAndNormalizeRows", () => {
  const mapping = autoMapColumns([
    "NPM",
    "Tahun Lulus",
    "Status",
    "Masa Tunggu",
    "Gaji",
  ]).mapped;

  it("baris valid lolos tanpa error", () => {
    const [v] = validateAndNormalizeRows(
      [
        {
          NPM: "140710220001",
          "Tahun Lulus": 2024,
          Status: "Bekerja",
          "Masa Tunggu": "3",
          Gaji: "5jt",
        },
      ],
      mapping,
    );
    expect(v.isValid).toBe(true);
    expect(v.errors).toHaveLength(0);
    expect(v.row.npm_mahasiswa).toBe("140710220001");
    expect(v.row.tahun_lulus).toBe(2024);
    expect(v.row.gaji_pekerjaan).toBe(5000000);
  });

  it("NPM kosong jadi error", () => {
    const [v] = validateAndNormalizeRows(
      [{ NPM: "", "Tahun Lulus": 2024, Status: "Bekerja", "Masa Tunggu": "3" }],
      mapping,
    );
    expect(v.isValid).toBe(false);
    expect(v.errors.join(" ")).toMatch(/NPM/);
  });
});

describe("getImportSummary", () => {
  it("menghitung kategori baris", () => {
    const mapping = autoMapColumns([
      "NPM",
      "Tahun Lulus",
      "Status",
      "Masa Tunggu",
    ]).mapped;
    const rows = validateAndNormalizeRows(
      [
        {
          NPM: "111",
          "Tahun Lulus": 2024,
          Status: "Bekerja",
          "Masa Tunggu": "2",
        },
        { NPM: "", "Tahun Lulus": 2024, Status: "Bekerja", "Masa Tunggu": "2" },
      ],
      mapping,
    );
    const s = getImportSummary(rows);
    expect(s.totalRows).toBe(2);
    expect(s.errorRows).toBe(1);
  });
});
