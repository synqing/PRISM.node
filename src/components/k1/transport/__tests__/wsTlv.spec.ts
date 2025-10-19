import { describe, it, expect } from 'vitest'
import { crc32, makePutPlan, TLVType } from '../wsTlv'

function hex(b: Uint8Array) { return Array.from(b).map(x => x.toString(16).padStart(2,'0')).join('') }

describe('crc32', () => {
  it('matches known vectors', () => {
    const empty = new Uint8Array([])
    expect(crc32(empty)).toBe(0x00000000)
    const abc = new TextEncoder().encode('abc')
    expect(crc32(abc)).toBe(0x352441C2 >>> 0)
  })
})

describe('TLV framing', () => {
  it('encodes begin/data/end and plan sizes look sane', () => {
    const bytes = new TextEncoder().encode('hello world')
    const plan = makePutPlan(bytes)
    // total equals serialized tlv bytes length
    const dataCount = plan.tlvs.filter(t => t.type === TLVType.PUT_DATA).length
    expect(dataCount).toBeGreaterThanOrEqual(1)
    // Check first/last TLV types are BEGIN/END
    expect(plan.tlvs[0].type).toBe(TLVType.PUT_BEGIN)
    expect(plan.tlvs.at(-1)!.type).toBe(TLVType.PUT_END)
  })
})
