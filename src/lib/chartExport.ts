// =====================================================
// Chart export: unduh grafik recharts sebagai file SVG
// (format paling kompatibel: bisa dibuka di browser,
//  Office, dan editor vektor; warna di-resolve agar
//  tampil benar di luar aplikasi)
// =====================================================

const resolveCssVars = (value: string): string => {
  const cache = new Map<string, string>();
  return value.replace(/var\((--[\w-]+)\)/g, (_, name: string) => {
    if (!cache.has(name)) {
      const resolved = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      cache.set(name, resolved);
    }
    return cache.get(name) || '';
  });
};

const fixSvgColors = (root: SVGElement) => {
  const fixAttr = (el: SVGElement) => {
    ['fill', 'stroke', 'color', 'stop-color'].forEach((attr) => {
      const val = el.getAttribute(attr);
      if (val && val.includes('var(')) el.setAttribute(attr, resolveCssVars(val));
    });
    const style = el.getAttribute('style');
    if (style && style.includes('var(')) el.setAttribute('style', resolveCssVars(style));
  };

  fixAttr(root);
  root.querySelectorAll('*').forEach((el) => fixAttr(el as SVGElement));
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Unduh chart (SVG di dalam container) sebagai file .svg.
 */
export function downloadChartAsSvg(container: HTMLElement | null, fileName: string): void {
  if (!container) return;
  const svg = container.querySelector('svg');
  if (!svg) return;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  // Beri warna dasar agar elemen ber-fill "currentColor" tetap terlihat.
  const rootText = getComputedStyle(document.documentElement).getPropertyValue('--color-text-main').trim();
  if (rootText) clone.setAttribute('color', rootText);

  fixSvgColors(clone);

  const xml = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  downloadBlob(blob, `${fileName}.svg`);
}