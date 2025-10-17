export type GraphTick = (
  nodes: any[],
  wires: any[],
  t: number
) => { frames: Uint8Array | Float32Array };

// Minimal stub: produces a tiny grayscale frame driven by time
export const stubTick: GraphTick = (_nodes, _wires, t) => {
  const len = 64; // pretend 8x8 device
  const frame = new Uint8Array(len);
  const phase = Math.floor((t / 100) % len);
  for (let i = 0; i < len; i++) {
    frame[i] = i === phase ? 255 : 40;
  }
  return { frames: frame };
};

// Export schema (aligns with tooling expectations)
export interface GraphExport {
  nodes: any[];
  wires: any[];
  params: Record<string, unknown>;
  preview?: number[]; // flattened preview frame for quick inspection
  exportedAt: string;
}
