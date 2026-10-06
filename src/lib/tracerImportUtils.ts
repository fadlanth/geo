// Integrasi dan normalisasi kolom hasil parse Tracer Study Pusat ke skema GEO INFO.

import { TracerStudy } from "../types";

// ── Column Alias Map ────────────────────────────────
// Maps various user-facing column names to the canonical DB field name.
// All keys are lowercased for matching.

const COLUMN_ALIASES: Record<string, keyof TracerStudy> = {
  // npm_mahasiswa
  npm_mahasiswa: "npm_mahasiswa",
  npm: "npm_mahasiswa",
  "npm mahasiswa": "npm_mahasiswa",
  nim: "npm_mahasiswa",
  "nim mahasiswa": "npm_mahasiswa",
  "no mahasiswa": "npm_mahasiswa",

  // tahun_lulus
  tahun_lulus: "tahun_lulus",
  "tahun lulus": "tahun_lulus",
  "thn lulus": "tahun_lulus",
  tahunlulus: "tahun_lulus",
  lulus: "tahun_lulus",
  year: "tahun_lulus",

  // status_lulusan
  status_lulusan: "status_lulusan",
  "status lulusan": "status_lulusan",
  status: "status_lulusan",
  sts: "status_lulusan",
  kegiatan: "status_lulusan",
  aktivitas: "status_lulusan",

  // masa_tunggu_bulan
  masa_tunggu_bulan: "masa_tunggu_bulan",
  "masa tunggu bulan": "masa_tunggu_bulan",
  "masa tunggu": "masa_tunggu_bulan",
  masa_tunggu: "masa_tunggu_bulan",
  tunggu: "masa_tunggu_bulan",
  "waiting time": "masa_tunggu_bulan",
  "masa tunggu (bulan)": "masa_tunggu_bulan",
  "masa tunggu (bln)": "masa_tunggu_bulan",

  // instansi_pekerjaan
  instansi_pekerjaan: "instansi_pekerjaan",
  "instansi pekerjaan": "instansi_pekerjaan",
  instansi: "instansi_pekerjaan",
  perusahaan: "instansi_pekerjaan",
  "nama instansi": "instansi_pekerjaan",
  "nama perusahaan": "instansi_pekerjaan",
  "tempat kerja": "instansi_pekerjaan",
  company: "instansi_pekerjaan",

  // jabatan
  jabatan: "jabatan",
  posisi: "jabatan",
  "jabatan/posisi": "jabatan",
  "nama jabatan": "jabatan",
  position: "jabatan",
  "job title": "jabatan",

  // tingkat_perusahaan
  tingkat_perusahaan: "tingkat_perusahaan",
  "tingkat perusahaan": "tingkat_perusahaan",
  tingkat: "tingkat_perusahaan",
  "level perusahaan": "tingkat_perusahaan",
  "skala perusahaan": "tingkat_perusahaan",
  skala: "tingkat_perusahaan",

  // gaji_pekerjaan
  gaji_pekerjaan: "gaji_pekerjaan",
  "gaji pekerjaan": "gaji_pekerjaan",
  gaji: "gaji_pekerjaan",
  "gaji (rp)": "gaji_pekerjaan",
  "gaji bulanan": "gaji_pekerjaan",
  salary: "gaji_pekerjaan",
  penghasilan: "gaji_pekerjaan",

  // universitas_tujuan
  universitas_tujuan: "universitas_tujuan",
  "universitas tujuan": "universitas_tujuan",
  universitas: "universitas_tujuan",
  kampus: "universitas_tujuan",
  "kampus tujuan": "universitas_tujuan",
  "nama kampus": "universitas_tujuan",
  "perguruan tinggi": "universitas_tujuan",
  "pt tujuan": "universitas_tujuan",
  university: "universitas_tujuan",

  // program_studi
  program_studi: "program_studi",
  "program studi": "program_studi",
  prodi: "program_studi",
  "prodi tujuan": "program_studi",
  jurusan: "program_studi",
  major: "program_studi",

  // bidang_usaha
  bidang_usaha: "bidang_usaha",
  "bidang usaha": "bidang_usaha",
  usaha: "bidang_usaha",
  "nama usaha": "bidang_usaha",
  "jenis usaha": "bidang_usaha",
  bisnis: "bidang_usaha",
};

// ── Status Normalizer ───────────────────────────────

const STATUS_ALIASES: Record<string, TracerStudy["status_lulusan"]> = {
  bekerja: "Bekerja",
  bekrja: "Bekerja",
  kerja: "Bekerja",
  "sudah bekerja": "Bekerja",
  "sudah kerja": "Bekerja",
  work: "Bekerja",
  working: "Bekerja",
  employed: "Bekerja",

  wiraswasta: "Wiraswasta",
  wiraswarta: "Wiraswasta",
  wirausaha: "Wiraswasta",
  entrepreneur: "Wiraswasta",
  "usaha sendiri": "Wiraswasta",

  "studi lanjut": "Studi Lanjut",
  studi: "Studi Lanjut",
  "lanjut studi": "Studi Lanjut",
  kuliah: "Studi Lanjut",
  "kuliah lagi": "Studi Lanjut",
  "melanjutkan studi": "Studi Lanjut",
  "lanjut kuliah": "Studi Lanjut",
  s2: "Studi Lanjut",
  s3: "Studi Lanjut",
  magister: "Studi Lanjut",
  master: "Studi Lanjut",
  doktor: "Studi Lanjut",

  "belum bekerja": "Belum Bekerja",
  "belum kerja": "Belum Bekerja",
  belum: "Belum Bekerja",
  "tidak bekerja": "Belum Bekerja",
  pengangguran: "Belum Bekerja",
  unemployed: "Belum Bekerja",
  "mencari kerja": "Belum Bekerja",
};

export function normalizeStatus(raw: unknown): {
  value: TracerStudy["status_lulusan"] | null;
  warning?: string;
} {
  if (raw == null || String(raw).trim() === "")
    return { value: null, warning: "Status lulusan kosong" };

  const key = String(raw).trim().toLowerCase();
  const matched = STATUS_ALIASES[key];
  if (matched) return { value: matched };

  // Fuzzy: check if any alias is a substring
  for (const [alias, status] of Object.entries(STATUS_ALIASES)) {
    if (key.includes(alias) || alias.includes(key)) {
      return {
        value: status,
        warning: `Status "${raw}" diinterpretasi sebagai "${status}"`,
      };
    }
  }

  return { value: null, warning: `Status "${raw}" tidak dikenali` };
}

// ── Tingkat Perusahaan Normalizer ────────────────────

const TINGKAT_ALIASES: Record<string, TracerStudy["tingkat_perusahaan"]> = {
  lokal: "Lokal",
  local: "Lokal",
  daerah: "Lokal",
  regional: "Lokal",

  nasional: "Nasional",
  national: "Nasional",
  bumn: "Nasional",

  multinasional: "Multinasional",
  mnc: "Multinasional",
  "multi nasional": "Multinasional",
  multinational: "Multinasional",

  internasional: "Internasional",
  international: "Internasional",
  global: "Internasional",
};

export function normalizeTingkat(
  raw: unknown,
): TracerStudy["tingkat_perusahaan"] | undefined {
  if (raw == null || String(raw).trim() === "") return undefined;
  const key = String(raw).trim().toLowerCase();
  return TINGKAT_ALIASES[key] ?? undefined;
}

// ── Gaji Parser ─────────────────────────────────────

export function parseGaji(raw: unknown): {
  value: number | undefined;
  warning?: string;
} {
  if (raw == null || String(raw).trim() === "") return { value: undefined };

  const str = String(raw).trim();

  // Already a clean number
  const directNum = Number(str);
  if (!isNaN(directNum) && directNum >= 0) {
    return { value: directNum > 0 ? directNum : undefined };
  }

  // Remove "Rp", "Rp.", currency prefix, spaces
  const cleaned = str.replace(/^rp\.?\s*/i, "").trim();

  // Handle "jt" / "juta" shorthand: "5jt" → 5000000, "5.5jt" → 5500000
  const jtMatch = cleaned.match(/^([0-9]+(?:[.,][0-9]+)?)\s*(?:jt|juta)$/i);
  if (jtMatch) {
    const num = parseFloat(jtMatch[1].replace(",", "."));
    if (!isNaN(num)) return { value: Math.round(num * 1_000_000) };
  }

  // Handle dot-separated thousands: "5.000.000" → 5000000
  if (cleaned.includes(".") && !cleaned.includes(",")) {
    const parts = cleaned.split(".");
    // If all parts after first are exactly 3 digits, it's thousands separator
    if (parts.length >= 2 && parts.slice(1).every((p) => p.length === 3)) {
      const num = Number(parts.join(""));
      if (!isNaN(num) && num >= 0) return { value: num };
    }
  }

  // Handle comma-separated thousands: "5,000,000"
  const commaClean = cleaned.replace(/,/g, "");
  const commaNum = Number(commaClean);
  if (!isNaN(commaNum) && commaNum >= 0) return { value: commaNum };

  return { value: undefined, warning: `Gaji "${raw}" tidak bisa di-parse` };
}

// ── Masa Tunggu Parser ──────────────────────────────

export function parseMasaTunggu(raw: unknown): {
  value: number;
  warning?: string;
} {
  if (raw == null || String(raw).trim() === "")
    return { value: 0, warning: "Masa tunggu kosong, diset 0" };

  const str = String(raw).trim();

  // Direct number
  const directNum = Number(str);
  if (!isNaN(directNum) && directNum >= 0)
    return { value: Math.round(directNum) };

  // "X bulan" / "X bln"
  const blnMatch = str.match(/^(\d+)\s*(?:bulan|bln|bul|month|months)$/i);
  if (blnMatch) return { value: Number(blnMatch[1]) };

  // "X tahun" / "X thn"
  const thnMatch = str.match(/^(\d+)\s*(?:tahun|thn|year|years)$/i);
  if (thnMatch) return { value: Number(thnMatch[1]) * 12 };

  return {
    value: 0,
    warning: `Masa tunggu "${raw}" tidak bisa di-parse, diset 0`,
  };
}

// ── Column Auto-Mapper ──────────────────────────────

export interface ColumnMapping {
  sourceColumn: string; // original column name from file
  targetField: keyof TracerStudy; // mapped DB field
}

export function autoMapColumns(fileHeaders: string[]): {
  mapped: ColumnMapping[];
  unmapped: string[]; // file columns that couldn't be matched
  missingRequired: string[]; // required DB fields not found in file
} {
  const mapped: ColumnMapping[] = [];
  const unmapped: string[] = [];
  const mappedFields = new Set<string>();

  for (const header of fileHeaders) {
    const normalized = header
      .trim()
      .toLowerCase()
      .replace(/[_-]/g, " ") // underscores/dashes to spaces
      .replace(/\s+/g, " "); // collapse whitespace

    // Try exact match first, then normalized match
    const exactKey = header.trim().toLowerCase();
    let field = COLUMN_ALIASES[exactKey] || COLUMN_ALIASES[normalized];

    // Try partial match
    if (!field) {
      for (const [alias, target] of Object.entries(COLUMN_ALIASES)) {
        if (normalized.includes(alias) || alias.includes(normalized)) {
          field = target;
          break;
        }
      }
    }

    if (field && !mappedFields.has(field)) {
      mapped.push({ sourceColumn: header, targetField: field });
      mappedFields.add(field);
    } else if (!field) {
      unmapped.push(header);
    }
  }

  // Check required fields
  const REQUIRED_FIELDS = [
    "npm_mahasiswa",
    "tahun_lulus",
    "status_lulusan",
    "masa_tunggu_bulan",
  ];
  const missingRequired = REQUIRED_FIELDS.filter((f) => !mappedFields.has(f));

  return { mapped, unmapped, missingRequired };
}

// ── Row Validation ──────────────────────────────────

export interface ValidatedRow {
  row: TracerStudy;
  rowIndex: number; // 1-based row number from file
  warnings: string[];
  errors: string[];
  isValid: boolean;
}

export function validateAndNormalizeRows(
  rawData: Record<string, unknown>[],
  columnMapping: ColumnMapping[],
): ValidatedRow[] {
  return rawData.map((rawRow, idx) => {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Step 1: Map raw columns to canonical fields
    const mapped: Record<string, unknown> = {};
    for (const { sourceColumn, targetField } of columnMapping) {
      mapped[targetField] = rawRow[sourceColumn];
    }

    // Step 2: Parse & validate npm_mahasiswa
    const npm = String(mapped["npm_mahasiswa"] || "").trim();
    if (!npm) {
      errors.push("NPM kosong");
    }

    // Step 3: Parse tahun_lulus
    const tahunRaw = Number(mapped["tahun_lulus"]);
    let tahun_lulus = new Date().getFullYear();
    if (!isNaN(tahunRaw) && tahunRaw >= 1990 && tahunRaw <= 2100) {
      tahun_lulus = tahunRaw;
    } else if (
      mapped["tahun_lulus"] != null &&
      String(mapped["tahun_lulus"]).trim() !== ""
    ) {
      warnings.push(
        `Tahun lulus "${mapped["tahun_lulus"]}" tidak valid, digunakan tahun sekarang`,
      );
    }

    // Step 4: Normalize status
    const statusResult = normalizeStatus(mapped["status_lulusan"]);
    if (!statusResult.value) {
      errors.push(statusResult.warning || "Status lulusan tidak valid");
    }
    if (statusResult.warning && statusResult.value) {
      warnings.push(statusResult.warning);
    }
    const status_lulusan = statusResult.value || "Bekerja";

    // Step 5: Parse masa_tunggu
    const tungguResult = parseMasaTunggu(mapped["masa_tunggu_bulan"]);
    if (tungguResult.warning) warnings.push(tungguResult.warning);

    // Step 6: Parse gaji
    const gajiResult = parseGaji(mapped["gaji_pekerjaan"]);
    if (gajiResult.warning) warnings.push(gajiResult.warning);

    // Step 7: Normalize tingkat_perusahaan
    const tingkat = normalizeTingkat(mapped["tingkat_perusahaan"]);
    if (
      mapped["tingkat_perusahaan"] &&
      String(mapped["tingkat_perusahaan"]).trim() &&
      !tingkat
    ) {
      warnings.push(
        `Tingkat perusahaan "${mapped["tingkat_perusahaan"]}" tidak dikenali`,
      );
    }

    // Step 8: Build TracerStudy object
    const row: TracerStudy = {
      npm_mahasiswa: npm,
      tahun_lulus,
      status_lulusan,
      masa_tunggu_bulan: tungguResult.value,
      instansi_pekerjaan:
        String(mapped["instansi_pekerjaan"] || "").trim() || undefined,
      jabatan: String(mapped["jabatan"] || "").trim() || undefined,
      tingkat_perusahaan: tingkat,
      gaji_pekerjaan: gajiResult.value,
      universitas_tujuan:
        String(mapped["universitas_tujuan"] || "").trim() || undefined,
      program_studi: String(mapped["program_studi"] || "").trim() || undefined,
      bidang_usaha: String(mapped["bidang_usaha"] || "").trim() || undefined,
    };

    return {
      row,
      rowIndex: idx + 1,
      warnings,
      errors,
      isValid: errors.length === 0,
    };
  });
}

// ── Summary Helper ──────────────────────────────────

export interface ImportSummary {
  totalRows: number;
  validRows: number;
  warningRows: number;
  errorRows: number;
}

export function getImportSummary(validated: ValidatedRow[]): ImportSummary {
  return {
    totalRows: validated.length,
    validRows: validated.filter((v) => v.isValid && v.warnings.length === 0)
      .length,
    warningRows: validated.filter((v) => v.isValid && v.warnings.length > 0)
      .length,
    errorRows: validated.filter((v) => !v.isValid).length,
  };
}
