import { describe, it, expect } from 'vitest';
import { nextCallState, isDeviceOffline } from '@/lib/call-status';
import { normalizePhone } from '@/lib/phone';

describe('call status', () => {
  it('0 and 2 are offline', () => { expect(isDeviceOffline(0)).toBe(true); expect(isDeviceOffline(2)).toBe(true); expect(isDeviceOffline(1)).toBe(false); });
  it('own device ringing shows ringing', () => { expect(nextCallState(4, false)).toBe('ringing'); expect(nextCallState(3, false)).toBe('ringing'); });
  it('status 5 becomes active', () => expect(nextCallState(5, false)).toBe('active'));
  it('back to 1 after active ends the call', () => expect(nextCallState(1, true)).toBe('ended'));
  it('idle before answer does not end', () => expect(nextCallState(1, false)).toBeNull());
});

describe('phone normalisation', () => {
  it('NL national', () => expect(normalizePhone('06 1244 4829')).toBe('+31612444829'));
  it('0031 prefix', () => expect(normalizePhone('0031612444829')).toBe('+31612444829'));
  it('0032 prefix', () => expect(normalizePhone('0032 470 12 34 56')).toBe('+32470123456'));
  it('+32 kept', () => expect(normalizePhone('+32 470 123456')).toBe('+32470123456'));
  it('+31(0) trunk zero removed', () => expect(normalizePhone('+31 (0)6 12444829')).toBe('+31612444829'));
  it('Belgian national with country BE', () => expect(normalizePhone('0470 12 34 56', 'BE')).toBe('+32470123456'));
  it('Belgian national with country name', () => expect(normalizePhone('0470123456', 'België')).toBe('+32470123456'));
  it('unknown country defaults to NL', () => expect(normalizePhone('0201234567', '')).toBe('+31201234567'));
});
