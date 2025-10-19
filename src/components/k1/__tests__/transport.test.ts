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
    const payload = new Uint8Array(PUT_DATA_MAX * 2 + 10);
    const plan = makePutPlan('test.bin', payload, PUT_DATA_MAX);
    const dataFrames = plan.frames.filter((f) => f[0] === 0x11);
    // First byte 0x11 denotes our PUT_DATA type in this variant
    expect(dataFrames.length).toBe(3);
  });

  it('rejects oversize payload', () => {
    const payload = new Uint8Array(PAYLOAD_MAX + 1);
    expect(() => makePutPlan('big.bin', payload)).toThrow();
  });
});

