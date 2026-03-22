import { useAuth } from '@/hooks/useAuth';
import { useLeads } from '@/hooks/useLeads';
import { useCallFlow } from '@/hooks/useCallFlow';
import { useCallbacks } from '@/hooks/useCallbacks';
import { useScoring } from '@/hooks/useScoring';
import { useIncomingCalls } from '@/hooks/useIncomingCalls';
import { useSettings } from '@/hooks/useSettings';
import { useFlash } from '@/hooks/useFlash';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useMobileSidebar } from '@/hooks/useMobileSidebar';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { store } from '@/lib/beltool-store';
import { fmtDate } from '@/lib/beltool-data';
import { BelToolContext } from '@/contexts/BelToolContext';
import { ContactSidebar } from '@/components/beltool/ContactSidebar';
import { AnswersSidebar } from '@/components/beltool/AnswersSidebar';
import { CallContent } from '@/components/beltool/CallContent';
import { LoginScreen } from '@/components/beltool/LoginScreen';
import { SettingsPanel } from '@/components/beltool/SettingsPanel';
import { Leaderboard } from '@/components/beltool/Leaderboard';
import { AgendaView } from '@/components/beltool/AgendaView';
import { CallbackScheduler } from '@/components/beltool/CallbackScheduler';
import { Modal } from '@/components/beltool/Modal';
import { ContactDetailPanel } from '@/components/beltool/ContactDetailPanel';
import { ErrorBoundary } from '@/components/beltool/ErrorBoundary';
import { ToastBanner } from '@/components/beltool/ToastBanner';
import { CallbackPopup } from '@/components/beltool/CallbackPopup';
import { IncomingCallPopup } from '@/components/beltool/IncomingCallPopup';
import { ShortcutsHelp } from '@/components/beltool/ShortcutsHelp';
import { CliqErrorBanner } from '@/components/beltool/CliqErrorBanner';
import { MobileHeader } from '@/components/beltool/MobileHeader';
import { AuthGuard } from '@/components/beltool/AuthGuard';

export default function BelTool() {
  // --- Core hooks ---
  const { user, login, logout, resetPassword, loading: authLoading } = useAuth();
  const { toast, flash } = useFlash();
  const darkMode = useDarkMode();
  const navigate = useNavigate();
  const { isMobile, sidebarOpen, toggleSidebar, closeSidebar, closeOnAction } = useMobileSidebar();
  const settings = useSettings();
  const { t, lang, setLang, managedUsers, updateManagedUsers } = settings;

  const scoring = useScoring(user);
  const { scores, convRate, addScore, allScores, setAllScores, setContactInfo } = scoring;

  const leads = useLeads(user);
  const { companies, cliqLoading, cliqError, hasMoreLeads, stageFilter, setStageFilter, search, setSearch, reloadLeads, loadMoreLeads, updateCompStage, updateContact, updateCompany } = leads;

  const callFlow = useCallFlow({
    updateCompStage,
    addScore,
    pipelineInfo: leads.pipelineInfo,
    stageMap: leads.stageMap,
  });

  const {
    activeCompId, activeContactId, expandedComp, setExpandedComp,
    phase, setPhase, callState, setCallState, activeCallId,
    answers, setAnswers, notes, setNotes,
    bookDate, setBookDate, bookTime, setBookTime, bookAdvisor, setBookAdvisor,
    showDetail, setShowDetail, taskString, curStep,
    selectContact, startDialing, confirmConnected, hangup, endCall, nextContact,
  } = callFlow;

  const callbacksHook = useCallbacks();
  const { callbacks, showCallbackQueue, setShowCallbackQueue, callbackPopup, dueCallbacks, todayStr, scheduledCallbacks, saveCallback: rawSaveCallback, completeCallback: rawCompleteCallback, dismissPopup, clearPopup } = callbacksHook;

  // Derived state
  const activeComp = companies.find(c => c.id === activeCompId) || null;
  const activeContact = activeComp?.contacts.find(c => c.id === activeContactId) || null;
  const contactName = activeContact ? `${activeContact.firstName} ${activeContact.lastName}` : '';

  // Keep scoring ref in sync
  useEffect(() => {
    setContactInfo(contactName, activeContactId, activeCompId);
  }, [contactName, activeContactId, activeCompId, setContactInfo]);

  // Incoming calls
  const { incomingCall, answerCall, dismissCall } = useIncomingCalls({
    user,
    companies,
    activeCallId,
    setCallState,
    flash,
  });

  // Keyboard shortcuts (proper hook, no DOM queries)
  const { showHelp: showShortcuts, setShowHelp: setShowShortcuts } = useKeyboardShortcuts({
    phase,
    callState,
    activeContact,
    onStartCall: () => startDialing(),
    onHangup: hangup,
    onFocusNotes: () => {
      const ta = document.querySelector('textarea[placeholder]') as HTMLTextAreaElement;
      ta?.focus();
    },
  });

  // Wrapped callback actions
  const handleSaveCallback = (cb: Omit<import('@/types/beltool').CallbackEntry, 'id' | 'userId'>) => {
    rawSaveCallback(cb, user?.id);
    if (activeCompId) updateCompStage(activeCompId, 'terugbellenGepland');
    addScore('callback');
    flash(t.callbackSaved, 'info');
    callFlow.resetCallState();
  };

  const handleCompleteCallback = (cbId: number) => {
    const cb = rawCompleteCallback(cbId);
    flash('Callback voltooid!');
    if (cb) {
      const comp = companies.find(c => c.contacts.some(ct => ct.id === cb.contactId));
      const ct = comp?.contacts.find(c => c.id === cb.contactId);
      if (comp && ct) selectContact(comp, ct);
    }
  };

  const handleAnswerIncoming = async () => {
    const call = await answerCall();
    if (call?.contactId && call?.companyId) {
      const comp = companies.find(c => c.id === call.companyId);
      const ct = comp?.contacts.find(c => c.id === call.contactId);
      if (comp && ct) {
        selectContact(comp, ct);
        setCallState('active');
      }
    }
  };

  const handleLogout = () => {
    logout();
    callFlow.resetCallState();
  };

  // --- Render ---
  if (authLoading) return <AuthGuard loading={true}><div /></AuthGuard>;
  if (!user) return <LoginScreen onLogin={login} onResetPassword={resetPassword} />;

  const ctx = {
    lang, setLang, user, t, allScores, setAllScores,
    webhooks: settings.webhooks, setWebhooks: settings.setWebhooks,
    apiKey: settings.apiKey, setApiKey: settings.setApiKey,
    surveyConfig: settings.surveyConfig, setSurveyConfig: settings.setSurveyConfig,
    cliqConfig: settings.cliqConfig, setCliqConfig: settings.setCliqConfig,
  };

  return (
    <ErrorBoundary>
      <BelToolContext.Provider value={ctx}>
        <div className={cn('flex h-screen overflow-hidden bg-background text-foreground', isMobile && 'flex-col')}>

          <ToastBanner toast={toast} />
          <CallbackPopup
            popup={callbackPopup}
            onDismiss={dismissPopup}
            onCall={(id) => { handleCompleteCallback(id); clearPopup(); }}
          />
          <IncomingCallPopup
            call={incomingCall}
            onAnswer={handleAnswerIncoming}
            onDismiss={dismissCall}
          />
          <ShortcutsHelp open={showShortcuts} onClose={() => setShowShortcuts(false)} />

          <SettingsPanel
            open={settings.showSettings}
            onClose={() => settings.setShowSettings(false)}
            onSyncLeads={reloadLeads}
            managedUsers={managedUsers}
            onUpdateUsers={updateManagedUsers}
          />
          <Leaderboard open={settings.showLeaderboard} onClose={() => settings.setShowLeaderboard(false)} />
          <AgendaView open={settings.showAgenda} onClose={() => settings.setShowAgenda(false)} appointments={settings.appts} />

          {settings.showCallback && activeContact && activeComp && (
            <CallbackScheduler
              open={settings.showCallback}
              onClose={() => settings.setShowCallback(false)}
              contact={activeContact}
              company={activeComp}
              onSave={handleSaveCallback}
            />
          )}

          <Modal open={showCallbackQueue} onClose={() => setShowCallbackQueue(false)} title={t.callbackQueue}>
            {scheduledCallbacks.length === 0 ? (
              <div className="text-center text-muted-foreground/30 py-6">{t.noCallbacks}</div>
            ) : (
              scheduledCallbacks.sort((a, b) => a.date.localeCompare(b.date)).map(cb => {
                const overdue = cb.date < todayStr;
                const isToday = cb.date === todayStr;
                return (
                  <div key={cb.id} className="flex items-center gap-3 py-2.5 border-b border-border/30">
                    <div className="flex-1">
                      <div className="font-semibold text-[13px]">{cb.contactName}</div>
                      <div className="text-[11px] text-muted-foreground/40">{cb.companyName} — {fmtDate(cb.date)} {cb.time}</div>
                    </div>
                    {overdue && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">OVERDUE</span>}
                    {isToday && !overdue && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-warning/10 text-warning">{t.callbackDue}</span>}
                    <button
                      onClick={() => { setShowCallbackQueue(false); handleCompleteCallback(cb.id); }}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold active:scale-95 transition-transform"
                    >
                      {t.callbackNow}
                    </button>
                  </div>
                );
              })
            )}
          </Modal>

          {/* Mobile header */}
          {isMobile && (
            <MobileHeader
              user={user}
              scores={scores}
              onToggleSidebar={toggleSidebar}
              dueCallbackCount={dueCallbacks.length}
            />
          )}

          {/* Mobile sidebar backdrop */}
          {isMobile && sidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/40"
              style={{ backdropFilter: 'blur(2px)', animation: 'fadeIn 0.15s ease' }}
              onClick={closeSidebar}
            />
          )}

          {/* Sidebar — always visible on desktop, slide-over on mobile */}
          <div className={cn(
            'flex-shrink-0 z-50',
            isMobile
              ? 'fixed inset-y-0 left-0 w-[280px] transition-transform duration-200 ease-out'
              : 'relative',
            isMobile && !sidebarOpen && '-translate-x-full',
            isMobile && sidebarOpen && 'translate-x-0'
          )}>
            <ContactSidebar
              companies={companies} activeCompId={activeCompId} activeContactId={activeContactId}
              expandedComp={expandedComp} setExpandedComp={setExpandedComp}
              search={search} onSearchChange={setSearch}
              onSelectContact={(comp, ct) => { selectContact(comp, ct); closeOnAction(); }}
              phase={phase}
              onBusy={() => flash(t.finishFirst, 'err')}
              scores={scores} convRate={convRate} user={user}
              onLogout={handleLogout}
              onShowAgenda={() => { settings.setShowAgenda(true); closeOnAction(); }}
              onShowCallbackQueue={() => { setShowCallbackQueue(true); closeOnAction(); }}
              onShowLeaderboard={() => { settings.setShowLeaderboard(true); closeOnAction(); }}
              onShowSettings={() => { settings.setShowSettings(true); closeOnAction(); }}
              onShowRapportage={() => { navigate('/rapportage'); closeOnAction(); }}
              dueCallbackCount={dueCallbacks.length}
              appointmentCount={settings.appts.length}
              hasMoreLeads={hasMoreLeads}
              loadingMore={cliqLoading}
              onLoadMore={loadMoreLeads}
              stageFilter={stageFilter}
              onStageFilterChange={setStageFilter}
              onSelectFromLog={(entry) => {
                if (entry.contactId && entry.companyId) {
                  const comp = companies.find(c => c.id === entry.companyId);
                  const ct = comp?.contacts.find(c => c.id === entry.contactId);
                  if (comp && ct) { selectContact(comp, ct); closeOnAction(); return; }
                }
                const name = entry.contact;
                const comp = companies.find(c => c.contacts.some(ct => `${ct.firstName} ${ct.lastName}` === name));
                const ct = comp?.contacts.find(c => `${c.firstName} ${c.lastName}` === name);
                if (comp && ct) { selectContact(comp, ct); closeOnAction(); }
              }}
              onInsertNote={(text) => setNotes(prev => prev ? prev + '\n' + text : text)}
              cliqError={cliqError}
              onRetryCliq={reloadLeads}
              theme={darkMode.theme}
              onThemeChange={darkMode.setTheme}
            />
          </div>

          <div className="flex-1 flex flex-col overflow-hidden bg-background">
            {(phase === 'idle' || phase === 'precall' || curStep >= 0 || ['sent', 'done', 'lost', 'noanswer'].includes(phase)) && activeContact && activeComp ? (
              <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden">
                  <CallContent
                    activeContact={activeContact} activeComp={activeComp}
                    phase={phase} callState={callState} setPhase={setPhase}
                    answers={answers} setAnswers={setAnswers} taskString={taskString}
                    onEndCall={(ph, stage) => endCall(ph, stage, answers, notes, activeContact, activeComp)}
                    onNextContact={nextContact}
                    showToast={flash} updateStage={updateCompStage} addScore={addScore}
                    bookDate={bookDate} setBookDate={setBookDate}
                    bookTime={bookTime} setBookTime={setBookTime}
                    bookAdvisor={bookAdvisor} setBookAdvisor={setBookAdvisor}
                    scores={scores} onShowCallback={() => settings.setShowCallback(true)}
                    onStartDialing={startDialing}
                    onHangup={hangup}
                    onConfirmConnected={confirmConnected}
                    activeCompId={activeCompId}
                    onShowDetail={() => setShowDetail(true)}
                    notes={notes}
                    onNotesChange={setNotes}
                    dailyTargets={store.get('dailyTargets', { calls: 50, appointments: 5, surveys: 10 })}
                  />
                </div>
                {curStep >= 1 && !isMobile && (
                  <AnswersSidebar
                    answers={answers} taskString={taskString} notes={notes} onNotesChange={setNotes}
                    onSendDigital={() => { endCall('sent', 'enqueteVerstuurd', answers, notes, activeContact, activeComp); addScore('verstuurd'); flash(t.surveyDigitalSent, 'info'); }}
                    onNoAnswer={() => { endCall('noanswer', 'geenGehoor', answers, notes, activeContact, activeComp); addScore('geenGehoor'); flash(t.noAnswerNoted); }}
                    onGoToAppointment={() => { if (activeCompId) updateCompStage(activeCompId, 'enqueteTel'); addScore('enquete'); setPhase('bridge'); }}
                    onShowCallback={() => settings.setShowCallback(true)}
                  />
                )}
                {showDetail && activeContact && activeComp && (
                  <ContactDetailPanel
                    contact={activeContact}
                    company={activeComp}
                    onUpdateContact={(uc) => updateContact(activeCompId!, uc)}
                    onUpdateCompany={updateCompany}
                    onClose={() => setShowDetail(false)}
                  />
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
                <div className="text-5xl mb-2">📞</div>
                <div className="text-lg font-bold text-foreground/40">{t.selectContact}</div>
                <div className="text-[13px] text-foreground/20">{t.clickName}</div>
              </div>
            )}
          </div>
        </div>
      </BelToolContext.Provider>
    </ErrorBoundary>
  );
}
