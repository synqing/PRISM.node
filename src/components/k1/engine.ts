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
      // 1D grayscale gradient from Start%..End%
      const start = getParam('start', 0) / 100;
      const end = getParam('end', 100) / 100;
      const a = Math.min(start, end), b = Math.max(start, end);
      out = u.map((uu) => {
        const tt = clamp01((uu - a) / Math.max(1e-6, (b - a)));
        const v = Math.round(tt * 255);
        return [v, v, v];
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
    const c = colors[i];
    frame[i * 3 + 0] = c[0];
    frame[i * 3 + 1] = c[1];
    frame[i * 3 + 2] = c[2];
  }
  return frame;
}

export const stubTick: GraphTick = (nodes, wires, t) => {
  const frames = tickGraph(nodes, wires, t);
  return { frames };
};
