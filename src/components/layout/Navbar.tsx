/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Database,
  Download,
  FilePlus,
  HardDriveDownload,
  HelpCircle,
  Moon,
  Sun,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { AppSettings, NavigationPage } from '../../types';
import {
  downloadSampleFactsJSON,
  downloadSampleGuidelinesJSON,
} from '../../services/sampleData';
import { Modal } from '../common/Modal';

interface NavbarProps {
  currentPage: NavigationPage;
  settings: AppSettings;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onNavigate: (page: NavigationPage) => void;
  onLoadSampleData: () => void;
  onClearSampleData: () => void;
  hasData: boolean;
  hasSampleData: boolean;
  activeReviewTitle?: string;
}

export function Navbar({
  currentPage,
  settings,
  theme,
  onToggleTheme,
  onNavigate,
  onLoadSampleData,
  onClearSampleData,
  hasData,
  hasSampleData,
  activeReviewTitle,
}: NavbarProps) {
  const [guideModalOpen, setGuideModalOpen] = useState(false);

  const pageTitles: Record<NavigationPage, string> = {
    dashboard: 'Workspace Overview & Compliance Metrics',
    inspector: 'Content Inspector & Real-Time Engine',
    guidelines: 'Brand Guidelines Repository',
    facts: 'Approved Facts & Evidence Library',
    terminology: 'Brand Terminology & Nomenclature Rules',
    findings: 'Review Findings & Brand Risk Radar',
    workflow: 'Human Approval & Review Governance',
    audit: 'Audit Ledger & Version History',
    reports: 'Compliance Reports & Data Exports',
    settings: 'Application Settings & Data Management',
  };

  return (
    <>
      <header className="h-16 bg-slate-900/90 border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              {pageTitles[currentPage]}
              {activeReviewTitle && (
                <span className="text-xs font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  Active: {activeReviewTitle}
                </span>
              )}
            </h2>
            <p className="text-[11px] text-slate-400">
              BrandSentinel AI • Tagline:{' '}
              <span className="text-slate-300 font-medium">Every Message. On Brand. Every Time.</span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          {/* Sample Data Guide Button */}
          <button
            onClick={() => setGuideModalOpen(true)}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
            title="Sample Data Guide & Instructions"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Sample Data Guide</span>
          </button>

          {!hasData && (
            <button
              onClick={onLoadSampleData}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/30 transition shadow-xs cursor-pointer"
              title="Load an explicitly labeled fictional example workspace for evaluation"
            >
              <HardDriveDownload className="w-3.5 h-3.5" />
              <span>Load Example Workspace</span>
            </button>
          )}

          {hasSampleData && (
            <button
              onClick={onClearSampleData}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 transition cursor-pointer"
              title="Remove all fictional sample records from the workspace"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Clear Sample Data</span>
            </button>
          )}

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-700/60 transition cursor-pointer"
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Navy Theme'}
            aria-label="Toggle Dark / Light Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-blue-500" />
            )}
          </button>

          <button
            onClick={() => onNavigate('inspector')}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>New Inspection</span>
          </button>

          <div className="h-6 w-px bg-slate-800 mx-0.5" />

          {/* Reviewer Identity Pill */}
          <div
            onClick={() => onNavigate('settings')}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-800/70 border border-slate-700/60 text-xs hover:border-slate-600 transition cursor-pointer"
            title="Configured Local Reviewer Identity"
          >
            <div className="w-6 h-6 rounded-full bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 font-bold text-[10px]">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
            <div className="text-left leading-tight hidden sm:block">
              <div className="text-slate-200 font-medium">{settings.reviewerDisplayName}</div>
              <div className="text-[10px] text-slate-400">{settings.reviewerRole}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Sample Data Guide & Instructions Modal */}
      <Modal
        isOpen={guideModalOpen}
        onClose={() => setGuideModalOpen(false)}
        title="Sample Brand Data Guide & JSON Exports"
        subtitle="Instructions on loading, evaluating, exporting, and clearing fictional sample guidelines and facts."
        maxWidth="max-w-2xl"
      >
        <div className="space-y-5 text-xs">
          {/* Transparency Notice */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1">
            <div className="font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Strict Fictional Data Transparency Notice
            </div>
            <p className="text-slate-300 leading-relaxed">
              All generated sample guidelines, approved facts, and demonstration documents are{' '}
              <strong>fictional examples</strong> created to demonstrate the deterministic rules engine,
              lexical claim grounding, and human review workflows. They are not actual legal policies or customer records.
            </p>
          </div>

          {/* Download JSON files */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="font-semibold text-slate-200 flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-400" />
              Download Sample JSON Files for Import
            </h4>
            <p className="text-slate-400">
              You can download these curated, labeled JSON files to your computer and test the native JSON import in the Brand Guidelines or Approved Facts tabs:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                onClick={downloadSampleGuidelinesJSON}
                className="p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition flex items-start gap-2.5 cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-200">sample_brand_guidelines.json</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    8 rules: voice, prohibited claims, disclaimers, terminology
                  </div>
                </div>
              </button>

              <button
                onClick={downloadSampleFactsJSON}
                className="p-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition flex items-start gap-2.5 cursor-pointer"
              >
                <Database className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-200">sample_approved_facts.json</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    5 verified facts: privacy, parsing, performance SLAs, expired fact
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* How to Load & Clear */}
          <div className="space-y-3">
            <h4 className="font-semibold text-slate-200">How to Load and Clear Sample Data</h4>
            <div className="space-y-2 text-slate-300">
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <strong className="text-white">1. Loading the Sample Workspace:</strong>
                <p className="text-slate-400 mt-0.5">
                  Click the <strong>"Load Example Workspace"</strong> button in the top navigation or dashboard. This populates 8 fictional brand rules, 5 verified facts, and 1 draft press announcement, then executes the local audit engine.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <strong className="text-white">2. Clearing the Sample Data:</strong>
                <p className="text-slate-400 mt-0.5">
                  Whenever you are done evaluating, click <strong>"Clear Sample Data"</strong> in the top navigation or in Settings. This removes only the sample records (prefixed with <code>sample_</code>), keeping any real rules or documents you created intact.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <strong className="text-white">3. Complete Reset:</strong>
                <p className="text-slate-400 mt-0.5">
                  To wipe all records entirely, navigate to <strong>Settings & Data</strong> and use the "Reset Workspace Database" option in the Danger Zone.
                </p>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onLoadSampleData();
                  setGuideModalOpen(false);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition"
              >
                <HardDriveDownload className="w-3.5 h-3.5" />
                <span>Load Sample Workspace Now</span>
              </button>

              {hasSampleData && (
                <button
                  onClick={() => {
                    onClearSampleData();
                    setGuideModalOpen(false);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-semibold text-xs flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Sample Data Now</span>
                </button>
              )}
            </div>

            <button
              onClick={() => setGuideModalOpen(false)}
              className="px-4 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
