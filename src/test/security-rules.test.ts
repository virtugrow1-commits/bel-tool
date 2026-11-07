import { describe, it, expect } from 'vitest';
import { enforceOrganization, requireAdmin, canInvite } from '../../supabase/functions/_shared/security-rules';
describe('team access boundaries',()=>{
  it('allows Willem plus four staff, not a sixth',()=>{expect(canInvite(4)).toBe(true);expect(canInvite(5)).toBe(false);});
  it('rejects a different requested organization',()=>{expect(()=>enforceOrganization('a','b')).toThrow();expect(enforceOrganization('a','a')).toBe('a');expect(enforceOrganization('a')).toBe('a');});
  it('restricts administration to admins',()=>{expect(()=>requireAdmin('caller')).toThrow();expect(()=>requireAdmin('manager')).toThrow();expect(()=>requireAdmin('admin')).not.toThrow();});
});