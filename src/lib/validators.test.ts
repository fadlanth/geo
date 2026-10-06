import { describe, it, expect } from "vitest";
import { validators, val, JENIS_STATUS_MAHASISWA } from "./validators";

describe("validators.npm", () => {
  it("menolak kosong dan non-angka", () => {
    expect(validators.npm("").ok).toBe(false);
    expect(validators.npm("abc123").ok).toBe(false);
    expect(validators.npm("123").ok).toBe(false);
  });
  it("menerima 6–20 digit", () => {
    expect(validators.npm("140710220001").ok).toBe(true);
  });
});

describe("validators.nip", () => {
  it("menolak format salah", () => {
    expect(validators.nip("123").ok).toBe(false);
    expect(validators.nip("").ok).toBe(false);
  });
  it("menerima 9–20 digit dan menoleransi spasi", () => {
    expect(validators.nip("19820315 200812 1 001").ok).toBe(true);
  });
});

describe("validators.angkatan", () => {
  it("memperketat rentang tahun", () => {
    expect(validators.angkatan(1999).ok).toBe(false);
    expect(validators.angkatan(2020).ok).toBe(true);
    expect(validators.angkatan("abc").ok).toBe(false);
  });
});

describe("validators.tahunLulus", () => {
  it("lulus tidak boleh di bawah angkatan", () => {
    expect(validators.tahunLulus(2020, 2022).ok).toBe(false);
    expect(validators.tahunLulus(2024, 2022).ok).toBe(true);
  });
});

describe("validators.email", () => {
  it("format dasar", () => {
    expect(validators.email("a@b.co.id").ok).toBe(true);
    expect(validators.email("a@b").ok).toBe(false);
    expect(validators.email("").ok).toBe(false);
  });
});

describe("validators.sandi", () => {
  it("opsional tapi minimal 4 bila diisi", () => {
    expect(validators.sandi("").ok).toBe(true);
    expect(validators.sandi("abc").ok).toBe(false);
    expect(validators.sandi("abcd").ok).toBe(true);
  });
});

describe("validators.enum & all", () => {
  it("enum menolak nilai di luar daftar", () => {
    expect(validators.enum("Lulus", JENIS_STATUS_MAHASISWA, "Status").ok).toBe(
      true,
    );
    expect(
      validators.enum("Lulusan", JENIS_STATUS_MAHASISWA, "Status").ok,
    ).toBe(false);
  });
  it("all mengumpulkan semua error field", () => {
    const errors = validators.all({
      npm: () => validators.npm(""),
      nama: () => validators.nama("Andi"),
    });
    expect(errors.npm).toBeDefined();
    expect(errors.nama).toBeUndefined();
  });
});

describe("val", () => {
  it("ekstrak pesan hanya saat gagal", () => {
    expect(val(validators.npm(""))).toBeDefined();
    expect(val(validators.npm("140710220001"))).toBeUndefined();
  });
});
