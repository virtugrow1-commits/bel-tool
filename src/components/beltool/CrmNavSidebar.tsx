import { cn } from '@/lib/utils';
import { useState } from 'react';

const NAV_ITEMS = [
  { icon: '🚀', label: 'Launchpad', id: 'launchpad' },
  { icon: '📊', label: 'Dashboard', id: 'dashboard' },
  { icon: '💬', label: 'Gesprekken', id: 'conversations' },
  { icon: '📅', label: 'Kalenders', id: 'calendars' },
  { icon: '👤', label: 'Contacten', id: 'contacts' },
  { icon: '🎯', label: 'Leads', id: 'leads' },
  { icon: '💳', label: 'Betalingen', id: 'payments' },
];

const NAV_ITEMS_BOTTOM = [
  { icon: '🤖', label: 'AI-agenten', id: 'ai' },
  { icon: '📣', label: 'Marketing', id: 'marketing' },
  { icon: '⚡', label: 'Automatisering', id: 'automation' },
  { icon: '🌐', label: 'Sites', id: 'sites' },
  { icon: '👥', label: 'Lidmaatschappen', id: 'memberships' },
  { icon: '📁', label: 'Media Drive', id: 'media' },
  { icon: '⭐', label: 'Reputatie', id: 'reputation' },
  { icon: '📈', label: 'Rapportage', id: 'reporting' },
  { icon: '🧩', label: 'App-marketplace', id: 'marketplace' },
];

interface CrmNavSidebarProps {
  onShowSettings: () => void;
}

export function CrmNavSidebar({ onShowSettings }: CrmNavSidebarProps) {
  const [active] = useState('beltool');

  return (
    <div className="w-[72px] flex flex-col items-center border-r border-border/50 flex-shrink-0 py-3 gap-0.5" style={{ background: 'hsl(222 34% 8%)' }}>
      {/* Logo */}
      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center mb-3 cursor-pointer hover:bg-primary/30 transition-colors">
        <span className="text-primary text-lg font-extrabold">V</span>
      </div>

      {/* Top nav */}
      <div className="flex flex-col gap-0.5 w-full px-1.5">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={cn(
              'flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg text-center transition-colors w-full',
              'text-muted-foreground/40 hover:text-muted-foreground/70 hover:bg-foreground/[0.04]'
            )}
            title={item.label}
          >
            <span className="text-[14px] leading-none opacity-60">{item.icon}</span>
            <span className="text-[8px] font-medium leading-tight truncate w-full">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-8 h-px bg-border/30 my-1.5" />

      {/* Bottom nav */}
      <div className="flex flex-col gap-0.5 w-full px-1.5 flex-1 overflow-y-auto">
        {NAV_ITEMS_BOTTOM.map(item => (
          <button
            key={item.id}
            className={cn(
              'flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg text-center transition-colors w-full',
              'text-muted-foreground/40 hover:text-muted-foreground/70 hover:bg-foreground/[0.04]'
            )}
            title={item.label}
          >
            <span className="text-[14px] leading-none opacity-60">{item.icon}</span>
            <span className="text-[8px] font-medium leading-tight truncate w-full">{item.label}</span>
          </button>
        ))}

        {/* Bel-Tool - active */}
        <button
          className="flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg text-center w-full bg-primary/[0.12] text-primary"
        >
          <span className="text-[14px] leading-none">📞</span>
          <span className="text-[8px] font-bold leading-tight">Bel-Tool</span>
        </button>
      </div>

      {/* Settings at bottom */}
      <button
        onClick={onShowSettings}
        className="flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg text-muted-foreground/30 hover:text-muted-foreground/60 hover:bg-foreground/[0.04] transition-colors w-[calc(100%-12px)]"
        title="Instellingen"
      >
        <span className="text-[14px] leading-none">⚙️</span>
        <span className="text-[8px] font-medium">Instellingen</span>
      </button>
    </div>
  );
}
