import { describe, it, expect } from 'vitest';
import { buildOklchLut, applyFrameCapRGB8, PREVIEW_SPEC } from '../engine';

describe('engine OKLCH + caps', () => {
  it('PREVIEW_SPEC length is 320', () => {
    expect(PREVIEW_SPEC.length).toBe(320);
  });

  it('OKLCH LUT has correct size and endpoints', () => {
    const start: [number,number,number] = [255, 0, 0];
    const end:   [number,number,number] = [0, 0, 255];
    const lut = buildOklchLut('#ff0000', '#0000ff', 256);
    expect(lut.length).toBe(256*3);
    expect(lut[0]).toBeGreaterThan(200);
    expect(lut[1]).toBeLessThan(10);
    expect(lut[2]).toBeLessThan(10);
    const iEnd = (256-1)*3;
    expect(lut[iEnd+0]).toBeLessThan(10);
    expect(lut[iEnd+1]).toBeLessThan(10);
    expect(lut[iEnd+2]).toBeGreaterThan(200);
  });

  it('applyFrameCapRGB8 caps max channel to capByte', () => {
    const frame = new Uint8Array([255, 64, 32, 200, 199, 10]);
    const out = applyFrameCapRGB8(frame.slice(), 128);
    expect(Math.max(...Array.from(out))).toBeLessThanOrEqual(128);
  });
});

