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

/**
 * Unduh chart (SVG di dalam container) sebagai file PNG.
 * CSS variables pada fill/stroke di-resolve agar warna tampil benar.
 */
export function downloadChartAsPng(container: HTMLElement | null, fileName: string): void {
  if (!container) return;
  const svg = container.querySelector('svg');
  if (!svg) return;

  const rect = svg.getBoundingClientRect();
  const width = Math.max(rect.width, 200);
  const height = Math.max(rect.height, 120);
  const scale = 2;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(width * scale));
  clone.setAttribute('height', String(height * scale));
  clone.setAttribute('viewBox', `0 0 ${width} ${height}`);
  fixSvgColors(clone);

  const xml = new XMLSerializer().serializeToString(clone);
  const svgData = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };
  img.src = svgData;
}