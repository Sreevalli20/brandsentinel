/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  AppSettings,
  ApprovedFact,
  AuditEvent,
  BrandRule,
  ContentReview,
  NavigationPage,
  ReviewFinding,
} from './types';
import {
  DEFAULT_SETTINGS,
  deleteFact,
  deleteReview,
  deleteRule,
  getAllFacts,
  getAllReviews,
  getAllRules,
  getAuditEvents,
  getSettings,
  logAuditEvent,
  resetAllData,
  saveFact,
  saveReview,
  saveRule,
  saveSettings,
} from './services/storage';
import {
  clearFictionalExampleData,
  loadFictionalExampleWorkspace,
} from './services/sampleData';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { ContentInspectorView } from './components/inspector/ContentInspectorView';
import { BrandGuidelinesView } from './components/guidelines/BrandGuidelinesView';
import { ApprovedFactsView } from './components/facts/ApprovedFactsView';
import { TerminologyView } from './components/terminology/TerminologyView';
import { FindingsView } from './components/findings/FindingsView';
import { ApprovalWorkflowView } from './components/workflow/ApprovalWorkflowView';
import { AuditHistoryView } from './components/audit/AuditHistoryView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';

export default function App() {
  const [currentPage, setCurrentPage] = useState<NavigationPage>('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  // Theme State: 'dark' | 'light'
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('brandsentinel_theme');
      if (stored === 'light' || stored === 'dark') return stored;
    }
    return 'dark';
  });

  // Core application data collections from IndexedDB
  const [reviews, setReviews] = useState<ContentReview[]>([]);
  const [rules, setRules] = useState<BrandRule[]>([]);
  const [facts, setFacts] = useState<ApprovedFact[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Selected document context
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);

  // Sync theme with DOM and localStorage
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
      localStorage.setItem('brandsentinel_theme', theme);
    }
  }, [theme]);

  // Initial Data Hydration from IndexedDB
  const loadDatabase = async () => {
    try {
      const [storedRules, storedFacts, storedReviews, storedAudit, storedSettings] =
        await Promise.all([
          getAllRules(),
          getAllFacts(),
          getAllReviews(),
          getAuditEvents(),
          getSettings(),
        ]);

      setRules(storedRules);
      setFacts(storedFacts);
      setReviews(storedReviews);
      setAuditEvents(storedAudit);
      setSettings(storedSettings);

      // Hydrate theme from stored settings if present and valid
      if (storedSettings?.theme) {
        setTheme(storedSettings.theme);
      }

      if (storedReviews.length > 0 && !activeReviewId) {
        setActiveReviewId(storedReviews[0].id);
      }
    } catch (err) {
      console.error('Failed to initialize database from IndexedDB:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDatabase();
  }, []);

  // Theme Toggle Handler
  const handleToggleTheme = async () => {
    const nextTheme: 'dark' | 'light' = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    const updatedSettings = { ...settings, theme: nextTheme };
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);
  };

  // CRUD & Mutation Handlers
  const handleSaveReview = async (review: ContentReview) => {
    await saveReview(review);
    setReviews((prev) => {
      const existingIdx = prev.findIndex((r) => r.id === review.id);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = review;
        return next;
      }
      return [review, ...prev];
    });
    setActiveReviewId(review.id);
    const updatedAudit = await getAuditEvents();
    setAuditEvents(updatedAudit);
  };

  const handleSaveRule = async (rule: BrandRule) => {
    await saveRule(rule);
    setRules((prev) => {
      const idx = prev.findIndex((r) => r.id === rule.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = rule;
        return next;
      }
      return [...prev, rule];
    });
    const updatedAudit = await getAuditEvents();
    setAuditEvents(updatedAudit);
  };

  const handleDeleteRule = async (id: string) => {
    await deleteRule(id);
    setRules((prev) => prev.filter((r) => r.id !== id));
    const updatedAudit = await getAuditEvents();
    setAuditEvents(updatedAudit);
  };

  const handleSaveFact = async (fact: ApprovedFact) => {
    await saveFact(fact);
    setFacts((prev) => {
      const idx = prev.findIndex((f) => f.id === fact.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = fact;
        return next;
      }
      return [...prev, fact];
    });
    const updatedAudit = await getAuditEvents();
    setAuditEvents(updatedAudit);
  };

  const handleDeleteFact = async (id: string) => {
    await deleteFact(id);
    setFacts((prev) => prev.filter((f) => f.id !== id));
    const updatedAudit = await getAuditEvents();
    setAuditEvents(updatedAudit);
  };

  const handleUpdateFinding = async (reviewId: string, updatedFinding: ReviewFinding) => {
    const targetReview = reviews.find((r) => r.id === reviewId);
    if (!targetReview) return;

    const updatedFindings = targetReview.findings.map((f) =>
      f.id === updatedFinding.id ? updatedFinding : f
    );

    const updatedRev: ContentReview = {
      ...targetReview,
      findings: updatedFindings,
      updatedAt: new Date().toISOString(),
    };

    await handleSaveReview(updatedRev);
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    await saveSettings(newSettings);
    setSettings(newSettings);
    if (newSettings.theme !== theme) {
      setTheme(newSettings.theme);
    }
  };

  const handleResetWorkspace = async () => {
    await resetAllData();
    setReviews([]);
    setRules([]);
    setFacts([]);
    setAuditEvents([]);
    setSettings(DEFAULT_SETTINGS);
    setActiveReviewId(null);
  };

  const handleLoadSampleWorkspace = async () => {
    setIsLoading(true);
    try {
      await loadFictionalExampleWorkspace(settings.reviewerDisplayName);
      await loadDatabase();
      setCurrentPage('inspector');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSampleWorkspace = async () => {
    setIsLoading(true);
    try {
      await clearFictionalExampleData(settings.reviewerDisplayName);
      await loadDatabase();
    } finally {
      setIsLoading(false);
    }
  };

  const activeReview = reviews.find((r) => r.id === activeReviewId) || null;

  // Unresolved counts for badges
  const pendingApprovalsCount = reviews.filter((r) => r.status === 'pending_approval').length;
  const allUnresolvedFindingsCount = reviews
    .flatMap((r) => r.findings)
    .filter((f) => f.reviewStatus === 'pending').length;

  const hasData = reviews.length > 0 || rules.length > 0 || facts.length > 0;
  const hasSampleData =
    rules.some((r) => r.id.startsWith('sample_')) ||
    facts.some((f) => f.id.startsWith('sample_')) ||
    reviews.some((r) => r.id.startsWith('sample_'));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-xs font-mono text-slate-300">
          Initializing BrandSentinel AI Local Storage Engine...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-row selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/* Sidebar Navigation */}
      <div className="no-print">
        <Sidebar
          currentPage={currentPage}
          onNavigate={(page) => setCurrentPage(page)}
          pendingApprovalsCount={pendingApprovalsCount}
          unresolvedFindingsCount={allUnresolvedFindingsCount}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Navbar
          currentPage={currentPage}
          settings={settings}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onNavigate={(page) => setCurrentPage(page)}
          onLoadSampleData={handleLoadSampleWorkspace}
          onClearSampleData={handleClearSampleWorkspace}
          hasData={hasData}
          hasSampleData={hasSampleData}
          activeReviewTitle={activeReview?.title}
        />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {currentPage === 'dashboard' && (
            <DashboardView
              reviews={reviews}
              rules={rules}
              facts={facts}
              onNavigate={(page) => setCurrentPage(page)}
              onSelectReview={(id) => {
                setActiveReviewId(id);
                setCurrentPage('inspector');
              }}
              onLoadSampleWorkspace={handleLoadSampleWorkspace}
            />
          )}

          {currentPage === 'inspector' && (
            <ContentInspectorView
              currentReview={activeReview}
              rules={rules}
              facts={facts}
              settings={settings}
              onSaveReview={handleSaveReview}
              onNewReview={() => {
                setActiveReviewId(null);
              }}
            />
          )}

          {currentPage === 'guidelines' && (
            <BrandGuidelinesView
              rules={rules}
              reviewerName={settings.reviewerDisplayName}
              onSaveRule={handleSaveRule}
              onDeleteRule={handleDeleteRule}
            />
          )}

          {currentPage === 'facts' && (
            <ApprovedFactsView
              facts={facts}
              reviewerName={settings.reviewerDisplayName}
              onSaveFact={handleSaveFact}
              onDeleteFact={handleDeleteFact}
            />
          )}

          {currentPage === 'terminology' && (
            <TerminologyView
              rules={rules}
              reviewerName={settings.reviewerDisplayName}
              onSaveRule={handleSaveRule}
            />
          )}

          {currentPage === 'findings' && (
            <FindingsView
              reviews={reviews}
              currentReview={activeReview}
              reviewerName={settings.reviewerDisplayName}
              onUpdateFinding={handleUpdateFinding}
              onNavigateToInspector={(id) => {
                setActiveReviewId(id);
                setCurrentPage('inspector');
              }}
            />
          )}

          {currentPage === 'workflow' && (
            <ApprovalWorkflowView
              reviews={reviews}
              currentReview={activeReview}
              reviewerName={settings.reviewerDisplayName}
              reviewerRole={settings.reviewerRole}
              onSaveReview={handleSaveReview}
              onSelectReview={(id) => setActiveReviewId(id)}
              onNavigateToInspector={(id) => {
                setActiveReviewId(id);
                setCurrentPage('inspector');
              }}
            />
          )}

          {currentPage === 'audit' && <AuditHistoryView auditEvents={auditEvents} />}

          {currentPage === 'reports' && (
            <ReportsView
              reviews={reviews}
              rules={rules}
              facts={facts}
              auditEvents={auditEvents}
            />
          )}

          {currentPage === 'settings' && (
            <SettingsView
              settings={settings}
              theme={theme}
              onToggleTheme={handleToggleTheme}
              onSaveSettings={handleSaveSettings}
              onResetWorkspace={handleResetWorkspace}
              onRefreshData={loadDatabase}
            />
          )}
        </main>
      </div>
    </div>
  );
}
