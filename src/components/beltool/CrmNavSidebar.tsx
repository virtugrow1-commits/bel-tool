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
  return (
    <nav className="w-[220px] flex flex-col flex-shrink-0 bg-sidebar text-sidebar-foreground">
      {/* Logo area */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="text-primary text-sm font-extrabold">C</span>
          </div>
          <span className="text-sm font-bold text-white tracking-tight">ClioCRM</span>
        </div>
      </div>

      {/* Account selector */}
      <div className="mx-3 mt-3 mb-2 px-3 py-2 rounded-lg bg-primary/15 border border-primary/25">
        <div className="text-[11px] font-semibold text-primary">Cliqmakers</div>
        <div className="text-[9px] text-white/40">Hilvarenbeek, Noord-Brabant</div>
      </div>

      {/* Search */}
      <div className="px-3 mb-2">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-[11px] text-white/30">
          <span>🔍</span>
          <span>Zoeken</span>
          <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/25 font-mono">ctrl K</span>
        </div>
      </div>

      {/* Top nav items */}
      <div className="flex flex-col px-2 gap-px">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className="flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-left transition-colors w-full text-white/50 hover:text-white/70 hover:bg-white/[0.05]"
          >
            <span className="text-[14px] w-5 text-center opacity-70">{item.icon}</span>
            <span className="text-[12px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="mx-4 my-2 h-px bg-white/10" />

      {/* Bottom nav items */}
      <div className="flex flex-col px-2 gap-px flex-1 overflow-y-auto">
        {NAV_ITEMS_BOTTOM.map(item => (
          <button
            key={item.id}
            className="flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-left transition-colors w-full text-white/50 hover:text-white/70 hover:bg-white/[0.05]"
          >
            <span className="text-[14px] w-5 text-center opacity-70">{item.icon}</span>
            <span className="text-[12px] font-medium">{item.label}</span>
          </button>
        ))}

        {/* Bel-Tool — active */}
        <button className="flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-left w-full bg-primary/[0.12] text-primary border border-primary/20">
          <span className="text-[14px] w-5 text-center">📞</span>
          <span className="text-[12px] font-semibold">Bel-Tool</span>
        </button>
      </div>

      {/* Settings */}
      <div className="px-2 pb-3 pt-2 border-t border-white/10 mt-auto">
        <button
          onClick={onShowSettings}
          className="flex items-center gap-2.5 px-3 py-[7px] rounded-lg text-left transition-colors w-full text-white/40 hover:text-white/60 hover:bg-white/[0.05]"
        >
          <span className="text-[14px] w-5 text-center">⚙️</span>
          <span className="text-[12px] font-medium">Instellingen</span>
        </button>
      </div>
    </nav>
  );
}
