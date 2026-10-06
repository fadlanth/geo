import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import StatusChip from './StatusChip';

describe('StatusChip', () => {
  it('merender label status', () => {
    const html = renderToString(<StatusChip status="Lulus" />);
    expect(html).toContain('Lulus');
    expect(html).toContain('status-lulus');
  });

  it('jatuh ke tone neutral untuk status tak dikenal', () => {
    const html = renderToString(<StatusChip status="Tidak Dikenal" />);
    expect(html).toContain('status-neutral');
  });

  it('tone eksplisit dipakai bila status tak ada di peta', () => {
    const html = renderToString(<StatusChip status="Khusus" tone="green" />);
    expect(html).toContain('status-lulus');
  });
});
