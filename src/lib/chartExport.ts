// =====================================================
// Chart export: serialisasi SVG recharts -> PNG download
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
 * Unduh chart (SVG di dalam container) sebagai file PNG.
 * CSS variables pada fill/stroke di-resolve agar warna tampil benar.
 */
export function downloadChartAsPng(container: HTMLElement | null, fileName: string): void {
  if (!container) return;
  const svg = container.querySelector('svg');
  if (!svg) return;

  const rect = svg.getBoundingClientRect();
  const attrWidth = parseFloat(svg.getAttribute('width') || '0');
  const attrHeight = parseFloat(svg.getAttribute('height') || '0');
  const width = Math.max(rect.width, attrWidth, 400);
  const height = Math.max(rect.height, attrHeight, 240);
  const scale = 2;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width * scale));
  clone.setAttribute('height', String(height * scale));
  clone.setAttribute('viewBox', `0 0 ${width} ${height}`);

  // Beri warna dasar agar elemen ber-fill "currentColor" tetap terlihat.
  const rootText = getComputedStyle(document.documentElement).getPropertyValue('--color-text-main').trim();
  if (rootText) clone.setAttribute('color', rootText);

  fixSvgColors(clone);

  const xml = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const finish = (out: Blob | null) => {
        URL.revokeObjectURL(url);
        if (out) downloadBlob(out, `${fileName}.png`);
      };
      if (typeof canvas.toBlob === 'function') {
        canvas.toBlob(finish, 'image/png');
      } else {
        const dataUrl = canvas.toDataURL('image/png');
        URL.revokeObjectURL(url);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${fileName}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Gagal merasterisasi grafik:', err);
      URL.revokeObjectURL(url);
    }
  };
  img.onerror = () => {
    console.error('Gagal memuat SVG untuk ekspor grafik.');
    URL.revokeObjectURL(url);
  };
  img.src = url;
}