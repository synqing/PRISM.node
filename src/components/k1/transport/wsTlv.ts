export const PAYLOAD_MAX = 262_144;
export const PUT_DATA_MAX = 4_089;

export enum TLVType {
  PUT_BEGIN = 0x01,
  PUT_DATA = 0x02,
  PUT_END = 0x03,
}

export interface TLV {
  type: TLVType;
  length: number;
  value: Uint8Array;
}

export function crc32(buf: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    let byte = buf[i];
    crc ^= byte;
    for (let k = 0; k < 8; k++) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xEDB88320 & mask);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function u16le(n: number): Uint8Array {
  const out = new Uint8Array(2);
  const dv = new DataView(out.buffer);
  dv.setUint16(0, n & 0xFFFF, true);
  return out;
}

function u32le(n: number): Uint8Array {
  const out = new Uint8Array(4);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, n >>> 0, true);
  return out;
}

export function tlv(type: TLVType, value: Uint8Array): TLV {
  return { type, length: value.length, value };
}

export function serializeTLV(t: TLV): Uint8Array {
  const header = new Uint8Array(1 + 2);
  header[0] = t.type & 0xFF;
  header.set(u16le(t.length), 1);
  const out = new Uint8Array(header.length + t.length);
  out.set(header, 0);
  out.set(t.value, header.length);
  return out;
}

export function makePutPlan(bytes: Uint8Array) {
  if (bytes.length > PAYLOAD_MAX) {
    throw new Error(`Payload ${bytes.length} exceeds device limit ${PAYLOAD_MAX}`);
  }
  const tlvs: TLV[] = [];
  const begin = tlv(TLVType.PUT_BEGIN, u32le(bytes.length));
  tlvs.push(begin);
  let offset = 0;
  while (offset < bytes.length) {
    const chunk = Math.min(PUT_DATA_MAX, bytes.length - offset);
    const value = new Uint8Array(4 + chunk);
    value.set(u32le(offset), 0);
    value.set(bytes.subarray(offset, offset + chunk), 4);
    tlvs.push(tlv(TLVType.PUT_DATA, value));
    offset += chunk;
  }
  const crc = crc32(bytes);
  tlvs.push(tlv(TLVType.PUT_END, u32le(crc)));
  const total = tlvs.reduce((sum, frame) => sum + 1 + 2 + frame.length, 0);
  return { tlvs, total, crc };
}

export function serializePlan(plan: { tlvs: TLV[] }): Uint8Array {
  const total = plan.tlvs.reduce((sum, frame) => sum + 1 + 2 + frame.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const frame of plan.tlvs) {
    const bytes = serializeTLV(frame);
    out.set(bytes, offset);
    offset += bytes.length;
  }
  return out;
}

export function dryRunReport(plan: { tlvs: TLV[]; total: number; crc: number }): string {
  const dataCount = plan.tlvs.filter((t) => t.type === TLVType.PUT_DATA).length;
  return `TLV plan: totalBytes=${plan.total} | PUT_DATA chunks=${dataCount} (≤${PUT_DATA_MAX}) | CRC32=0x${plan.crc
    .toString(16)
    .padStart(8, '0')}`;
}

export async function sendPlanOverWs(url: string, plan: { tlvs: TLV[] }): Promise<void> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => {
      try {
        for (const frame of plan.tlvs) {
          ws.send(serializeTLV(frame));
        }
        ws.close();
      } catch (err) {
        reject(err);
      }
    };
    ws.onerror = (ev) => {
      reject(new Error(`WebSocket error: ${String(ev)}`));
    };
    ws.onclose = () => resolve();
  });
}
