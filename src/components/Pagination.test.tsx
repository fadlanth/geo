// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Pagination from './Pagination';

describe('Pagination', () => {
  it('menampilkan nomor halaman dan memanggil onChange', () => {
    const onChange = vi.fn();
    render(<Pagination page={1} totalPages={3} onChange={onChange} />);
    fireEvent.click(screen.getByText('2'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('tombol prev nonaktif di halaman pertama', () => {
    const onChange = vi.fn();
    const { container } = render(
      <Pagination page={1} totalPages={3} onChange={onChange} />,
    );
    const buttons = container.querySelectorAll('button');
    expect(buttons[0]).toHaveProperty('disabled', true);
  });

  it('tombol next berpindah ke halaman berikutnya', () => {
    const onChange = vi.fn();
    const { container } = render(
      <Pagination page={1} totalPages={3} onChange={onChange} />,
    );
    const buttons = container.querySelectorAll('button');
    const nextBtn = buttons[buttons.length - 1];
    fireEvent.click(nextBtn);
    expect(onChange).toHaveBeenCalledWith(2);
  });
});
