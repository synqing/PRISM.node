export type RGB8 = [number, number, number];
export type Fps = 120 | 60 | 30;

export const PREVIEW_SPEC = {
  length: 320,
  fps: 120 as Fps,
};

export const ENGINE_CONFIG = {
  pixelCount: 320,
  colorFormat: 'RGB8' as const,
  mapping: 'concat-2x160',
  channels: [
    { gpio: 9, count: 160, start: 0, end: 159 },
    { gpio: 10, count: 160, start: 160, end: 319 },
  ],
  map: Array.from({ length: 320 }, (_, i) => i),
};

type GraphNode = any;

type RGB = [number, number, number];

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

// ----------------------------------------------
// sRGB helpers (gamma conversions)
// ----------------------------------------------
export function srgb8ToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function linearToSrgb8(v: number): number {
  const s = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  const u8 = Math.round(clamp01(s) * 255);
  return u8 < 0 ? 0 : u8 > 255 ? 255 : u8;
}

function rgb8ToLinear([r, g, b]: RGB8): [number, number, number] {
  return [srgb8ToLinear(r), srgb8ToLinear(g), srgb8ToLinear(b)];
}

function linearToRgb8([r, g, b]: [number, number, number]): RGB8 {
  return [linearToSrgb8(r), linearToSrgb8(g), linearToSrgb8(b)];
}

// ----------------------------------------------
// OKLab / OKLCH
// ----------------------------------------------
function oklabFromLinear([r, g, b]: [number, number, number]): [number, number, number] {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return [
    0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  ];
}

function linearFromOklab([L, a, b]: [number, number, number]): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

interface OKLCH {
  L: number;
  C: number;
  H: number; // degrees 0..360
}

function oklchFromOklab([L, a, b]: [number, number, number]): OKLCH {
  const C = Math.hypot(a, b);
  const H = (Math.atan2(b, a) * 180 / Math.PI + 360) % 360;
  return { L, C, H };
}

function oklabFromOklch({ L, C, H }: OKLCH): [number, number, number] {
  const Hr = H * Math.PI / 180;
  const a = C * Math.cos(Hr);
  const b = C * Math.sin(Hr);
  return [L, a, b];
}

function shortestArcDegrees(h1: number, h2: number, t: number): number {
  let d = ((h2 - h1 + 540) % 360) - 180;
  return (h1 + d * t + 360) % 360;
}

function hexToRgb8(hex: string): RGB8 {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

export function interpolateOklch(c1: RGB8, c2: RGB8, t: number): RGB8 {
  const o1 = oklchFromOklab(oklabFromLinear(rgb8ToLinear(c1)));
  const o2 = oklchFromOklab(oklabFromLinear(rgb8ToLinear(c2)));
  const L = o1.L + (o2.L - o1.L) * t;
  const C = o1.C + (o2.C - o1.C) * t;
  const H = shortestArcDegrees(o1.H, o2.H, t);
  const lab = oklabFromOklch({ L, C, H });
  const lin = linearFromOklab(lab);
  return linearToRgb8([clamp01(lin[0]), clamp01(lin[1]), clamp01(lin[2])]);
}

export function buildOklchLut(startHex: string, endHex: string, steps = 256): Uint8Array {
  const start = hexToRgb8(startHex);
  const end = hexToRgb8(endHex);
  const lut = new Uint8Array(steps * 3);
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const [r, g, b] = interpolateOklch(start, end, t);
    const idx = i * 3;
    lut[idx] = r;
    lut[idx + 1] = g;
    lut[idx + 2] = b;
  }
  return lut;
}

// ----------------------------------------------
// HSV (kept for HueShift node)
// ----------------------------------------------
function rgbToHsv([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
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

// ----------------------------------------------
// Graph evaluation
// ----------------------------------------------
export function applyFrameCapRGB8(frame: Uint8Array, capByte: number): Uint8Array {
  if (!Number.isFinite(capByte) || capByte >= 255) return frame;
  let peak = 0;
  for (let i = 0; i < frame.length; i++) if (frame[i] > peak) peak = frame[i];
  if (peak <= capByte || peak === 0) return frame;
  const scale = capByte / peak;
  for (let i = 0; i < frame.length; i++) {
    const value = Math.round(frame[i] * scale);
    frame[i] = value < 0 ? 0 : value > 255 ? 255 : value;
  }
  return frame;
}

export function tickGraph(nodes: GraphNode[], wires: any[], t: number): Uint8Array {
  const N = ENGINE_CONFIG.pixelCount;
  const u: number[] = Array.from({ length: N }, (_, i) => i / (N - 1));
  const byId: Record<string, any> = Object.fromEntries(nodes.map((n: any) => [n.id, n]));

  const inputs: Record<string, Record<string, { nodeId: string; portId: string }>> = {};
  for (const w of wires) {
    inputs[w.to.nodeId] ||= {} as any;
    inputs[w.to.nodeId][w.to.portId] = { nodeId: w.from.nodeId, portId: w.from.portId };
  }

  const memo: Record<string, RGB[]> = {};

  const evalNode = (nodeId: string): RGB[] => {
    if (memo[nodeId]) return memo[nodeId];
    const n = byId[nodeId];
    const kind = (n?.title || '').toLowerCase();
    const getParam = (id: string, def: number) => {
      const p = n?.parameters?.find((p: any) => p.id === id);
      const v = typeof p?.value === 'number' ? p.value : Number(p?.value);
      return Number.isFinite(v) ? v : def;
    };

    const inputColor = (portId: string, fallback: RGB = [0, 0, 0]): RGB[] => {
      const link = inputs[n.id]?.[portId];
      if (!link) return Array.from({ length: N }, () => fallback);
      return evalNode(link.nodeId);
    };

    let out: RGB[] = Array.from({ length: N }, () => [0, 0, 0]);
    if (kind.includes('gradient')) {
      const start = getParam('start', 0) / 100;
      const end = getParam('end', 100) / 100;
      const a = Math.min(start, end), b = Math.max(start, end);
      const startHex = (n?.parameters?.find((p: any) => p.id === 'startColor')?.value as string) || '#000000';
      const endHex = (n?.parameters?.find((p: any) => p.id === 'endColor')?.value as string) || '#FFFFFF';
      const lut = buildOklchLut(startHex, endHex, 256);
      out = u.map((uu) => {
        const tt = clamp01((uu - a) / Math.max(1e-6, b - a));
        const idx = Math.max(0, Math.min(255, Math.round(tt * 255))) * 3;
        return [lut[idx], lut[idx + 1], lut[idx + 2]] as RGB;
      });
    } else if (kind.includes('hue')) {
      const amount = getParam('hue', 0);
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
      out = inputColor('color');
    } else {
      const ports = Object.keys(inputs[n.id] || {});
      out = ports.length ? inputColor(ports[0]) : out;
    }

    memo[nodeId] = out;
    return out;
  };

  const outputNode =
    nodes.find((n: any) => String(n.title).toLowerCase().includes('k1 output')) || nodes[nodes.length - 1];
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

export function tickGraphN(
  nodes: GraphNode[],
  wires: any[],
  fps: Fps,
  frames: number,
  cap?: { enabled: boolean; capByte: number }
): { frames: Uint8Array[]; preview: Uint8Array } {
  const count = Math.max(1, Math.floor(frames));
  const dt = 1 / fps;
  const output: Uint8Array[] = [];
  for (let i = 0; i < count; i++) {
    let frame = tickGraph(nodes, wires, i * dt);
    if (cap?.enabled) frame = applyFrameCapRGB8(frame.slice(), cap.capByte);
    output.push(frame);
  }
  const preview = output[output.length - 1] ?? new Uint8Array(PREVIEW_SPEC.length * 3);
  return { frames: output, preview };
}

export const stubTick = (nodes: GraphNode[], wires: any[], t: number) => ({ frames: tickGraph(nodes, wires, t) });
