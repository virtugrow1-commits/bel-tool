export const MAX_TEAM = 5;
export function enforceOrganization(actual: string, requested?: unknown) {
  if (requested !== undefined && requested !== actual) throw new Error('Andere organisatie niet toegestaan');
  return actual;
}
export function requireAdmin(role: string) {
  if (role !== 'admin') throw new Error('Alleen beheerders mogen dit uitvoeren');
}
export function canInvite(count: number) { return count < MAX_TEAM; }