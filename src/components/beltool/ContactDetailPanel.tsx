import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { CompanyContact, Company } from '@/types/beltool';

interface ContactDetailPanelProps {
  contact: CompanyContact;
  company: Company;
  onUpdateContact: (c: CompanyContact) => void;
  onUpdateCompany: (c: Company) => void;
  onClose: () => void;
}

export function ContactDetailPanel({ contact, company, onUpdateContact, onUpdateCompany, onClose }: ContactDetailPanelProps) {
  const [editContact, setEditContact] = useState<CompanyContact>({ ...contact });
  const [editCompany, setEditCompany] = useState<Company>({ ...company });
  const [tab, setTab] = useState<'contact' | 'company'>('contact');

  const save = () => {
    onUpdateContact(editContact);
    onUpdateCompany(editCompany);
    onClose();
  };

  const inputCls = 'w-full px-2 py-1.5 rounded border border-border bg-foreground/[0.04] text-foreground text-sm outline-none focus:ring-1 focus:ring-primary';

  return (
    <div className="w-80 border-l border-border flex flex-col overflow-hidden" style={{ background: 'hsl(222 32% 7%)' }}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold">Details bewerken</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground bg-transparent border-none text-lg cursor-pointer">×</button>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setTab('contact')}
            className={cn('flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors', tab === 'contact' ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.04] text-muted-foreground')}
          >
            Contact
          </button>
          <button
            onClick={() => setTab('company')}
            className={cn('flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors', tab === 'company' ? 'bg-primary text-primary-foreground' : 'bg-foreground/[0.04] text-muted-foreground')}
          >
            Bedrijf
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'contact' && (
          <div className="space-y-3">
            {([['firstName', 'Voornaam'], ['lastName', 'Achternaam'], ['role', 'Functie'], ['phone', 'Telefoon'], ['email', 'Email'], ['linkedin', 'LinkedIn']] as const).map(([key, label]) => (
              <div key={key}>
                <label className="text-[10px] text-muted-foreground/50 uppercase">{label}</label>
                <input
                  value={(editContact as any)[key] || ''}
                  onChange={e => setEditContact(p => ({ ...p, [key]: e.target.value }))}
                  className={inputCls}
                />
              </div>
            ))}
            <div>
              <label className="text-[10px] text-muted-foreground/50 uppercase">Notities</label>
              <textarea
                value={editContact.notes || ''}
                onChange={e => setEditContact(p => ({ ...p, notes: e.target.value }))}
                rows={3}
                className={cn(inputCls, 'resize-none')}
              />
            </div>
          </div>
        )}

        {tab === 'company' && (
          <div className="space-y-3">
            {([['name', 'Bedrijfsnaam'], ['industry', 'Branche'], ['website', 'Website'], ['address', 'Adres']] as const).map(([key, label]) => (
              <div key={key}>
                <label className="text-[10px] text-muted-foreground/50 uppercase">{label}</label>
                <input
                  value={(editCompany as any)[key] || ''}
                  onChange={e => setEditCompany(p => ({ ...p, [key]: e.target.value }))}
                  className={inputCls}
                />
              </div>
            ))}
            <div>
              <label className="text-[10px] text-muted-foreground/50 uppercase">Notities</label>
              <textarea
                value={editCompany.notes || ''}
                onChange={e => setEditCompany(p => ({ ...p, notes: e.target.value }))}
                rows={3}
                className={cn(inputCls, 'resize-none')}
              />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border">
        <button onClick={save} className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold active:scale-[0.97] transition-transform">
          Opslaan
        </button>
      </div>
    </div>
  );
}
