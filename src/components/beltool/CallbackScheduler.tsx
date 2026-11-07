import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from './Modal';
import { useBelTool } from '@/contexts/BelToolContext';
import type { CompanyContact, Company } from '@/types/beltool';
import { getWorkdays, fmtDate, TIMES } from '@/lib/beltool-data';

interface CallbackSchedulerProps {
  open: boolean;
  onClose: () => void;
  contact: CompanyContact;
  company: Company | null;
  onSave: (cb: { contactId: string; contactName: string; companyName: string; date: string; time: string; note: string; status: 'scheduled' }) => Promise<void>;
}

export function CallbackScheduler({ open, onClose, contact, company, onSave }: CallbackSchedulerProps) {
  const { t } = useBelTool();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Build date options: today + next 10 workdays
  const dateOptions = useMemo(() => {
    const today = new Date();
    const todayVal = today.toISOString().split('T')[0];
    const todayLabel = today.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'long' });
    const workdays = getWorkdays(10).map(d => ({
      value: d.toISOString().split('T')[0],
      label: fmtDate(d.toISOString().split('T')[0]),
    }));
    // Add today at the start if not already a workday in the list
    if (!workdays.some(w => w.value === todayVal)) {
      workdays.unshift({ value: todayVal, label: `${todayLabel} (vandaag)` });
    } else {
      const idx = workdays.findIndex(w => w.value === todayVal);
      if (idx >= 0) workdays[idx].label += ' (vandaag)';
    }
    return workdays;
  }, []);

  // Filter time slots: if today is selected, only show times 30+ min from now
  const availableTimes = useMemo(() => {
    if (date !== todayStr) return TIMES;
    const now = new Date();
    const minTime = new Date(now.getTime() + 30 * 60 * 1000);
    const minHour = minTime.getHours();
    const minMin = minTime.getMinutes();
    return TIMES.filter(t => {
      const [h, m] = t.split(':').map(Number);
      return h > minHour || (h === minHour && m >= minMin);
    });
  }, [date, todayStr]);

  return (
    <Modal open={open} onClose={onClose} title={t.callbackTitle}>
      <div className="text-[13px] text-muted-foreground mb-4">
        {contact.firstName} {contact.lastName} — {company?.name}
      </div>
      <div className="flex gap-3 mb-3">
        <div className="flex-1">
          <div className="text-[11px] text-muted-foreground mb-1">{t.chooseDate}</div>
          <select value={date} onChange={e => { setDate(e.target.value); setTime(''); }} className="w-full px-3 py-2.5 rounded-lg border border-border bg-foreground/[0.05] text-foreground text-[13px] outline-none">
            <option value="">{t.pickDate}</option>
            {dateOptions.map(d => (
              <option key={d.value} value={d.value} className="text-foreground bg-card">{d.label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <div className="text-[11px] text-muted-foreground mb-1">{t.chooseTime}</div>
          <select value={time} onChange={e => setTime(e.target.value)} className="w-full px-3 py-2.5 rounded-lg border border-border bg-foreground/[0.05] text-foreground text-[13px] outline-none">
            <option value="">{t.pickTime}</option>
            {availableTimes.map(tm => <option key={tm} value={tm} className="text-foreground bg-card">{tm}</option>)}
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
      {error && <p role="alert" className="text-destructive text-sm mb-3">{error}</p>}
      <Button disabled={saving || !date || !time}
        onClick={async () => {
          if (!date || !time) return;
          setSaving(true);setError('');
          try{await onSave({
            contactId: contact.id,
            contactName: `${contact.firstName} ${contact.lastName}`,
            companyName: company?.name || '',
            date, time, note,
            status: 'scheduled',
          });
          onClose();}catch(e){setError(e instanceof Error?e.message:'Opslaan mislukt');}finally{setSaving(false);}
        }}
        className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold active:scale-[0.97] transition-transform"
      >
        {t.callbackConfirm}
      </Button>
    </Modal>
  );
}
