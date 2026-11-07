/** VoIPzeker extension status codes (listextensionsstatus). */
export type DeviceStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const isDeviceOffline = (s: number) => s === 0 || s === 2;

/**
 * Map a polled device status to the next call step.
 * 3/4 = own device ringing, 5 = outgoing answered → active,
 * back to 1 (idle) after being active → ended.
 */
export function nextCallState(status: number, answered: boolean): 'ringing' | 'active' | 'ended' | null {
  if (status === 3 || status === 4) return answered ? null : 'ringing';
  if (status === 5) return 'active';
  if (status === 1 && answered) return 'ended';
  if (isDeviceOffline(status) && answered) return 'ended';
  return null;
}
