import { useState } from 'react';
import { Modal } from './Modal';
import { useBelTool } from '@/contexts/BelToolContext';
import type { CompanyContact, Company } from '@/types/beltool';
import { getWorkdays, fmtDate, TIMES } from '@/lib/beltool-data';

interface CallbackSchedulerProps {
  open: boolean;
  onClose: () => void;
  contact: CompanyContact;
  company: Company | null;
  onSave: (cb: { contactId: string; contactName: string; companyName: string; date: string; time: string; note: string; status: 'scheduled' }) => void;
}

export function CallbackScheduler({ open, onClose, contact, company, onSave }: CallbackSchedulerProps) {
  const { t } = useBelTool();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');

  return (
    <Modal open={open} onClose={onClose} title={t.callbackTitle}>
      <div className="text-[13px] text-muted-foreground mb-4">
        {contact.firstName} {contact.lastName} — {company?.name}
      </div>
      <div className="flex gap-3 mb-3">
        <div className="flex-1">
          <div className="text-[11px] text-muted-foreground mb-1">{t.chooseDate}</div>
          <select value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-foreground/[0.05] text-foreground text-[13px] outline-none">
            <option value="">{t.pickDate}</option>
            {getWorkdays(10).map(d => {
              const v = d.toISOString().split('T')[0];
              return <option key={v} value={v} className="text-foreground bg-card">{fmtDate(v)}</option>;
            })}
          </select>
        </div>
        <div className="flex-1">
          <div className="text-[11px] text-muted-foreground mb-1">{t.chooseTime}</div>
          <select value={time} onChange={e => setTime(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-foreground/[0.05] text-foreground text-[13px] outline-none">
            <option value="">{t.pickTime}</option>
            {TIMES.map(t => <option key={t} value={t} className="text-foreground bg-card">{t}</option>)}
          </select>
        </div>
      </div>
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder={t.callbackNotePlaceholder}
        rows={2}
        className="w-full px-3 py-2.5 rounded-lg border border-border bg-foreground/[0.03] text-foreground text-[13px] outline-none resize-y leading-relaxed mb-4"
      />
      <button
        onClick={() => {
          if (!date || !time) return;
          onSave({
            contactId: contact.id,
            contactName: `${contact.firstName} ${contact.lastName}`,
            companyName: company?.name || '',
            date, time, note,
            status: 'scheduled',
          });
          onClose();
        }}
        className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold active:scale-[0.97] transition-transform"
      >
        {t.callbackConfirm}
      </button>
    </Modal>
  );
}
