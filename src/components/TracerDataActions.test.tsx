// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import TracerDataActions from "./TracerDataActions";

describe("TracerDataActions", () => {
  afterEach(() => {
    cleanup();
  });

  const defaultProps = {
    onImportPusat: vi.fn(),
    onImportStandar: vi.fn(),
    onExportCohort: vi.fn(),
    onExportMultiSheet: vi.fn(),
    onExportAkreditasi: vi.fn(),
  };

  it("merender tombol Impor dan Ekspor", () => {
    render(<TracerDataActions {...defaultProps} />);
    expect(screen.getByRole("button", { name: /impor/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /ekspor/i })).toBeDefined();
  });

  it("membuka menu impor dan memicu handler saat opsi dipilih", () => {
    const onImportPusat = vi.fn();
    render(
      <TracerDataActions {...defaultProps} onImportPusat={onImportPusat} />,
    );

    const imporBtn = screen.getByRole("button", { name: /impor/i });
    fireEvent.click(imporBtn);

    const diktiOption = screen.getByText(/Kuesioner Dikti/i);
    expect(diktiOption).toBeDefined();

    fireEvent.click(diktiOption);
    expect(onImportPusat).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Kuesioner Dikti/i)).toBeNull();
  });

  it("membuka menu ekspor dan memicu handler saat opsi dipilih", () => {
    const onExportAkreditasi = vi.fn();
    render(
      <TracerDataActions
        {...defaultProps}
        onExportAkreditasi={onExportAkreditasi}
      />,
    );

    const eksporBtn = screen.getByRole("button", { name: /ekspor/i });
    fireEvent.click(eksporBtn);

    const akreditasiOption = screen.getByText(/Matriks LKPS LAMSAMA/i);
    expect(akreditasiOption).toBeDefined();

    fireEvent.click(akreditasiOption);
    expect(onExportAkreditasi).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Matriks LKPS LAMSAMA/i)).toBeNull();
  });

  it("menutup menu saat Escape ditekan", () => {
    render(<TracerDataActions {...defaultProps} />);

    const imporBtn = screen.getByRole("button", { name: /impor/i });
    fireEvent.click(imporBtn);
    expect(screen.getByText(/Kuesioner Dikti/i)).toBeDefined();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText(/Kuesioner Dikti/i)).toBeNull();
  });
});
