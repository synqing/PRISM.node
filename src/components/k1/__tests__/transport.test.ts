import { describe, it, expect } from 'vitest';
import { crc32, makePutPlan, PUT_DATA_MAX, PAYLOAD_MAX, TLVType } from '../transport/wsTlv';

describe('crc32', () => {
  it('matches known vector', () => {
    const enc = new TextEncoder();
    const v = enc.encode('123456789');
    expect(crc32(v)).toBe(0xCBF43926 >>> 0);
  });
});

describe('TLV plan', () => {
  it('respects chunk sizes', () => {
    const payload = new Uint8Array(PUT_DATA_MAX * 2 + 10).fill(0xAB);
    const plan = makePutPlan(payload);
    const dataTlvs = plan.tlvs.filter((t) => t.type === TLVType.PUT_DATA);
    expect(dataTlvs.length).toBe(3);
    // Check sizes of each data TLV excluding 4-byte offset header
    const sizes = dataTlvs.map((t) => t.value.length - 4);
    expect(sizes[0]).toBe(PUT_DATA_MAX);
    expect(sizes[1]).toBe(PUT_DATA_MAX);
    expect(sizes[2]).toBe(10);
  });

  it('rejects oversize payload', () => {
    const payload = new Uint8Array(PAYLOAD_MAX + 1);
    expect(() => makePutPlan(payload)).toThrow();
  });
});
