export type GraphTick = (
  nodes: any[],
  wires: any[],
  t: number
) => { frames: Uint8Array };

// Export schema (aligns with tooling expectations)
export interface GraphExport {
  nodes: any[];
  wires: any[];
  params: Record<string, unknown>;
  preview?: number[]; // flattened preview frame for quick inspection
  exportedAt: string;
}

// Centralized preview/export constants
export const PREVIEW_SPEC = {
  length: 320, // pixels
  fps: 120,
};

// Engine configuration (v1): 1D strip of 320 RGB8 pixels
export const ENGINE_CONFIG = {
  pixelCount: 320,
  colorFormat: 'RGB8' as const,
  mapping: 'concat-2x160',
  channels: [
    { gpio: 9, count: 160, start: 0, end: 159 },
    { gpio: 10, count: 160, start: 160, end: 319 },
  ],
  // Identity mapping for concat-2x160
  map: Array.from({ length: 320 }, (_, i) => i),
};

type RGB = [number, number, number];

function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }

// HSV helpers
function rgbToHsv([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return [h, s, v];
}

function hsvToRgb([h, s, v]: [number, number, number]): RGB {
  let r = 0, g = 0, b = 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Evaluate graph producing per-pixel RGB data
export function tickGraph(nodes: any[], wires: any[], t: number): Uint8Array {
  const N = ENGINE_CONFIG.pixelCount;
  const u: number[] = Array.from({ length: N }, (_, i) => i / (N - 1));
  const byId: Record<string, any> = Object.fromEntries(nodes.map((n: any) => [n.id, n]));

  // Wire lookup: to.nodeId->inputPortId->{fromNode,fromPort}
  const inputs: Record<string, Record<string, { nodeId: string; portId: string }>> = {};
  for (const w of wires) {
    inputs[w.to.nodeId] ||= {} as any;
    inputs[w.to.nodeId][w.to.portId] = { nodeId: w.from.nodeId, portId: w.from.portId };
  }

  const memo: Record<string, RGB[]> = {};

  function evalNode(nodeId: string): RGB[] {
    if (memo[nodeId]) return memo[nodeId];
    const n = byId[nodeId];
    const kind = (n?.title || '').toLowerCase();
    const getParam = (id: string, def: number) => {
      const p = n?.parameters?.find((p: any) => p.id === id);
      const v = typeof p?.value === 'number' ? p.value : Number(p?.value);
      return Number.isFinite(v) ? v : def;
    };

    // Helpers to fetch upstream colors
    const inputColor = (portId: string, fallback: RGB = [0,0,0]): RGB[] => {
      const link = inputs[n.id]?.[portId];
      if (!link) return Array.from({length: N}, () => fallback);
      return evalNode(link.nodeId);
    };

    let out: RGB[] = Array.from({ length: N }, () => [0,0,0]);
    if (kind.includes('gradient')) {
      // Colored gradient: supports start/end color hex; fall back to grayscale percent window
      const start = getParam('start', 0) / 100;
      const end = getParam('end', 100) / 100;
      const a = Math.min(start, end), b = Math.max(start, end);
      const startHex = (n?.parameters?.find((p: any) => p.id === 'startColor')?.value as string) || '#000000';
      const endHex = (n?.parameters?.find((p: any) => p.id === 'endColor')?.value as string) || '#FFFFFF';
      const lut = buildOklchLut(startHex, endHex); // 256 x RGB8
      out = u.map((uu) => {
        const tt = clamp01((uu - a) / Math.max(1e-6, (b - a)));
        const idx = Math.max(0, Math.min(255, Math.round(tt * 255))) * 3;
        return [lut[idx], lut[idx + 1], lut[idx + 2]] as RGB;
      });
    } else if (kind.includes('hue')) {
      const amount = getParam('hue', 0); // degrees
      const inp = inputColor('input');
      out = inp.map((rgb) => {
        const hsv = rgbToHsv(rgb as RGB);
        const h = (hsv[0] + (amount / 360)) % 1;
        return hsvToRgb([h < 0 ? h + 1 : h, hsv[1], hsv[2]]);
      });
    } else if (kind.includes('blend')) {
      const a = inputColor('a');
      const bcol = inputColor('b');
      const mix = getParam('blend', 50) / 100;
      out = a.map((ca, i) => {
        const cb = bcol[i];
        return [
          Math.round(ca[0] * (1 - mix) + cb[0] * mix),
          Math.round(ca[1] * (1 - mix) + cb[1] * mix),
          Math.round(ca[2] * (1 - mix) + cb[2] * mix),
        ];
      });
    } else if (kind.includes('k1 output')) {
      // Pass-through color input
      out = inputColor('color');
    } else {
      // Unknown node: passthrough from first input if any
      const ports = Object.keys(inputs[n.id] || {});
      out = ports.length ? inputColor(ports[0]) : out;
    }

    memo[nodeId] = out;
    return out;
  }

  // Find outputs (nodes without downstream uses) — we assume K1 Output exists
  const outputNode = nodes.find((n: any) => String(n.title).toLowerCase().includes('k1 output')) || nodes[nodes.length - 1];
  const colors = evalNode(outputNode.id);

  const frame = new Uint8Array(N * 3);
  for (let i = 0; i < N; i++) {
    const phys = ENGINE_CONFIG.map[i];
    const c = colors[i];
    frame[phys * 3 + 0] = c[0];
    frame[phys * 3 + 1] = c[1];
    frame[phys * 3 + 2] = c[2];
  }
  return frame;
}

export const stubTick: GraphTick = (nodes, wires, t) => {
  const frames = tickGraph(nodes, wires, t);
  return { frames };
};

// Build a 256-step OKLCH gradient LUT between two hex colors (perceptual, gamma ~2.2)
function hexToRgb(hex: string): RGB {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

// sRGB <-> Linear helpers
function srgbToLinear(c: number) {
  c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function linearToSrgb(c: number) {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1/2.4) - 0.055; return Math.round(Math.max(0, Math.min(1, v)) * 255);
}

// Linear sRGB -> OKLab
function linSrgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const l = 0.4122214708*r + 0.5363325363*g + 0.0514459929*b;
  const m = 0.2119034982*r + 0.6806995451*g + 0.1073969566*b;
  const s = 0.0883024619*r + 0.2817188376*g + 0.6299787005*b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  const L = 0.2104542553*l_ + 0.7936177850*m_ - 0.0040720468*s_;
  const a = 1.9779984951*l_ - 2.4285922050*m_ + 0.4505937099*s_;
  const b2 = 0.0259040371*l_ + 0.7827717662*m_ - 0.8086757660*s_;
  return [L, a, b2];
}

// OKLab -> linear sRGB
function oklabToLinSrgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = Math.pow(L + 0.3963377774*a + 0.2158037573*b, 3);
  const m_ = Math.pow(L - 0.1055613458*a - 0.0638541728*b, 3);
  const s_ = Math.pow(L - 0.0894841775*a - 1.2914855480*b, 3);
  const r = + 4.0767416621*l_ - 3.3077115913*m_ + 0.2309699292*s_;
  const g = - 1.2684380046*l_ + 2.6097574011*m_ - 0.3413193965*s_;
  const bl = + 0.0041960863*l_ - 0.7034186147*m_ + 1.6990627610*s_;
  return [r, g, bl];
}

function rgbToOklab([r,g,b]: RGB): [number, number, number] {
  return linSrgbToOklab(srgbToLinear(r), srgbToLinear(g), srgbToLinear(b));
}

function oklabToRgb(L: number, a: number, b: number): RGB {
  const [rL, gL, bL] = oklabToLinSrgb(L, a, b);
  return [linearToSrgb(rL), linearToSrgb(gL), linearToSrgb(bL)];
}

function buildOklchLut(startHex: string, endHex: string): Uint8Array {
  // Convert endpoints to OKLCH
  const [La, aa, ba] = rgbToOklab(hexToRgb(startHex));
  const [Lb, ab, bb] = rgbToOklab(hexToRgb(endHex));
  const Ca = Math.hypot(aa, ba);
  const Cb = Math.hypot(ab, bb);
  const ha = Math.atan2(ba, aa); // radians
  const hb = Math.atan2(bb, ab);
  // shortest-arc hue interpolation
  let dh = hb - ha; if (dh > Math.PI) dh -= 2*Math.PI; else if (dh < -Math.PI) dh += 2*Math.PI;
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const L = La + (Lb - La) * t;
    const C = Ca + (Cb - Ca) * t;
    const h = ha + dh * t;
    const a = C * Math.cos(h);
    const b = C * Math.sin(h);
    const [rL, gL, bL] = oklabToLinSrgb(L, a, b);
    // simple gamut clip to [0,1] in linear, then back to sRGB
    const r = linearToSrgb(Math.max(0, Math.min(1, rL)));
    const g = linearToSrgb(Math.max(0, Math.min(1, gL)));
    const bl = linearToSrgb(Math.max(0, Math.min(1, bL)));
    const j = i * 3; lut[j] = r; lut[j + 1] = g; lut[j + 2] = bl;
  }
  return lut;
}

// Optional per-frame cap to enforce device power/brightness budget
export function applyFrameCapRGB8(frame: Uint8Array, capByte?: number): void {
  if (!capByte || capByte >= 255) return;
  let peak = 0;
  for (let i = 0; i < frame.length; i++) peak = Math.max(peak, frame[i]);
  if (peak <= capByte || peak === 0) return;
  const s = capByte / peak;
  for (let i = 0; i < frame.length; i++) frame[i] = Math.min(255, Math.round(frame[i] * s));
}
