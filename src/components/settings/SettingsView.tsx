/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Database,
  Download,
  FileCheck,
  HardDriveDownload,
  Lock,
  Moon,
  RotateCcw,
  Save,
  Settings,
  Shield,
  Sliders,
  Sun,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import { AppSettings, SeverityLevel } from '../../types';
import {
  clearFictionalExampleData,
  downloadSampleFactsJSON,
  downloadSampleGuidelinesJSON,
  loadFictionalExampleWorkspace,
} from '../../services/sampleData';
import { exportAllData, importData, logAuditEvent } from '../../services/storage';

interface SettingsViewProps {
  settings: AppSettings;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onSaveSettings: (settings: AppSettings) => Promise<void>;
  onResetWorkspace: () => Promise<void>;
  onRefreshData?: () => Promise<void>;
}

export function SettingsView({
  settings,
  theme,
  onToggleTheme,
  onSaveSettings,
  onResetWorkspace,
  onRefreshData,
}: SettingsViewProps) {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [isSaved, setIsSaved] = useState(false);
  const [sampleActionMessage, setSampleActionMessage] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetText, setResetText] = useState('');

  const backupInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleThemeChange = (newTheme: 'dark' | 'light') => {
    setFormData((prev) => ({ ...prev, theme: newTheme }));
    if (newTheme !== theme) {
      onToggleTheme();
    }
  };

  const handleLoadSample = async () => {
    await loadFictionalExampleWorkspace(formData.reviewerDisplayName);
    if (onRefreshData) await onRefreshData();
    setSampleActionMessage('Fictional example workspace loaded successfully.');
    setTimeout(() => setSampleActionMessage(null), 4000);
  };

  const handleClearSample = async () => {
    const res = await clearFictionalExampleData(formData.reviewerDisplayName);
    if (onRefreshData) await onRefreshData();
    setSampleActionMessage(
      `Cleared sample data (${res.deletedRules} rules, ${res.deletedFacts} facts, ${res.deletedReviews} sample reviews removed).`
    );
    setTimeout(() => setSampleActionMessage(null), 4000);
  };

  const handleFullBackup = async () => {
    const backup = await exportAllData();
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brandsentinel_complete_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    await logAuditEvent(
      'export_performed',
      'full_database',
      'export',
      formData.reviewerDisplayName,
      { backupDate: new Date().toISOString() }
    );
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        await importData(json);
        alert('Database restored successfully. Page will refresh to load state.');
        window.location.reload();
      } catch (err: any) {
        alert(`Failed to restore backup: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmReset = async () => {
    if (resetText.trim() !== 'RESET') {
      alert('You must type RESET to confirm full workspace deletion.');
      return;
    }

    await onResetWorkspace();
    alert('All local database records have been reset. Reloading workspace.');
    window.location.reload();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            Application Settings & Data Governance
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure appearance theme, reviewer credentials, validation engine parameters, and sample datasets.
          </p>
        </div>

        {isSaved && (
          <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
            ✓ Settings Saved
          </span>
        )}
      </div>

      {sampleActionMessage && (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-400" />
          <span>{sampleActionMessage}</span>
        </div>
      )}

      {/* Theme Selection Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Sun className="w-4 h-4 text-amber-400" />
              Interface Theme & Visual Appearance
            </h3>
            <p className="text-slate-400 mt-0.5">
              Choose between the dark navy enterprise palette with restrained blue accents or the high-contrast light mode.
            </p>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            Active: {theme === 'dark' ? 'Dark Navy' : 'Light'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Dark Navy Card */}
          <div
            onClick={() => handleThemeChange('dark')}
            className={`p-4 rounded-xl border transition cursor-pointer flex items-start gap-3.5 ${
              theme === 'dark'
                ? 'bg-slate-950 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
              <Moon className="w-5 h-5 text-blue-400" />
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                <span>Dark Navy Enterprise Theme</span>
                {theme === 'dark' && (
                  <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.2 rounded font-mono">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Deep navy (#070C18) background with white text, restrained blue accents, and high-contrast borders.
              </p>
            </div>
          </div>

          {/* Light Theme Card */}
          <div
            onClick={() => handleThemeChange('light')}
            className={`p-4 rounded-xl border transition cursor-pointer flex items-start gap-3.5 ${
              theme === 'light'
                ? 'bg-white border-blue-600 ring-2 ring-blue-600/20 shadow-md'
                : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
              <Sun className="w-5 h-5 text-amber-500" />
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <span>Light High-Contrast Theme</span>
                {theme === 'light' && (
                  <span className="text-[10px] bg-blue-600/10 text-blue-600 px-1.5 py-0.2 rounded font-mono">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Clean slate-50 background, deep navy text (#0F172A), crisp borders, and accessible high-contrast controls.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sample Data Management & Export Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            Sample Data Management & Exportable Presets
          </h3>
          <p className="text-slate-400 mt-0.5">
            Pre-packaged, explicitly labeled fictional brand guidelines and approved facts. Use these to test the deterministic rules engine and claim verification without manual entry.
          </p>
        </div>

        {/* Fictional Transparency Notice */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 space-y-1">
          <div className="font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Strict Fictional Data Transparency Notice
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed">
            All sample data is explicitly labeled as fictional example data. It demonstrates brand voice guidelines, prohibited superlatives, required disclaimers, and factual evidence grounding. It can be cleared at any time with a single click.
          </p>
        </div>

        {/* Action Buttons: Download JSON & Load/Clear */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span>Sample Brand Guidelines JSON</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Contains 8 rules covering brand voice, prohibited claims, required disclaimers, and terminology.
            </p>
            <button
              type="button"
              onClick={downloadSampleGuidelinesJSON}
              className="w-full mt-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Download sample_brand_guidelines.json</span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Sample Approved Facts JSON</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Contains 5 verified facts covering local memory guarantees, parsing, SLAs, and expired records.
            </p>
            <button
              type="button"
              onClick={downloadSampleFactsJSON}
              className="w-full mt-1 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Download sample_approved_facts.json</span>
            </button>
          </div>
        </div>

        {/* 1-Click Operations */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-slate-200">One-Click Workspace Actions</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Load sample workspace to explore findings, or remove only the sample records.
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleLoadSample}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <HardDriveDownload className="w-3.5 h-3.5" />
              <span>Load Sample Workspace</span>
            </button>

            <button
              type="button"
              onClick={handleClearSample}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600/15 hover:bg-rose-600/25 text-rose-300 border border-rose-500/30 font-medium transition flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Sample Data</span>
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Reviewer Profile */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-400" />
            Local Reviewer Display Identity
          </h3>
          <p className="text-slate-400">
            This name and title will be stamped on approval decisions, audit events, and compliance certificates.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Reviewer Name</label>
              <input
                type="text"
                value={formData.reviewerDisplayName}
                onChange={(e) =>
                  setFormData({ ...formData, reviewerDisplayName: e.target.value })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-hidden focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Reviewer Role / Title</label>
              <input
                type="text"
                value={formData.reviewerRole}
                onChange={(e) => setFormData({ ...formData, reviewerRole: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Validation Engine Tuning */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            Deterministic Engine Parameters
          </h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-slate-300 font-medium">
                  Claim-to-Fact Lexical Similarity Threshold: (
                  {Math.round(formData.claimMatchingThreshold * 100)}%)
                </label>
                <span className="text-slate-400 font-mono text-[11px]">
                  {formData.claimMatchingThreshold}
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="0.95"
                step="0.05"
                value={formData.claimMatchingThreshold}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    claimMatchingThreshold: parseFloat(e.target.value),
                  })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Higher threshold requires stricter lexical overlap before a claim is treated as supported by an approved fact.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Maximum Upload File Size (MB)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={Math.round(formData.maxDocSizeBytes / (1024 * 1024))}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxDocSizeBytes: Math.max(1, parseInt(e.target.value) || 15) * 1024 * 1024,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Default Minimum Severity Level
                </label>
                <select
                  value={formData.defaultSeverityThreshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      defaultSeverityThreshold: e.target.value as SeverityLevel,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-hidden"
                >
                  <option value="low">Low (Inspect all findings)</option>
                  <option value="medium">Medium (Focus on key violations)</option>
                  <option value="high">High (High & Critical only)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="autoRevalidate"
                checked={formData.autoRevalidateOnEdit}
                onChange={(e) =>
                  setFormData({ ...formData, autoRevalidateOnEdit: e.target.checked })
                }
                className="rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0"
              />
              <label htmlFor="autoRevalidate" className="text-slate-300 cursor-pointer">
                Automatically re-evaluate rules upon document import
              </label>
            </div>
          </div>
        </div>

        {/* Tone & Heuristic Checks */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
          <h3 className="text-sm font-semibold text-slate-200">
            Brand Voice & Tone Heuristics Configuration
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Consecutive Exclamation Marks Limit
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={formData.toneChecks.exclamationMarkLimit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    toneChecks: {
                      ...formData.toneChecks,
                      exclamationMarkLimit: parseInt(e.target.value) || 1,
                    },
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Preferred Brand Formality Tone
              </label>
              <select
                value={formData.toneChecks.preferredFormality}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    toneChecks: {
                      ...formData.toneChecks,
                      preferredFormality: e.target.value as any,
                    },
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden"
              >
                <option value="formal">Enterprise Formal</option>
                <option value="balanced">Balanced Professional</option>
                <option value="casual">Conversational</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="flagSup"
                checked={formData.toneChecks.flagUnverifiedSuperlatives}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    toneChecks: {
                      ...formData.toneChecks,
                      flagUnverifiedSuperlatives: e.target.checked,
                    },
                  })
                }
                className="rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0"
              />
              <label htmlFor="flagSup" className="text-slate-300 cursor-pointer">
                Flag unaccredited superlatives (e.g. "best in the world", "unrivaled")
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="flagRep"
                checked={formData.toneChecks.flagRepeatedPhrases}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    toneChecks: {
                      ...formData.toneChecks,
                      flagRepeatedPhrases: e.target.checked,
                    },
                  })
                }
                className="rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0"
              />
              <label htmlFor="flagRep" className="text-slate-300 cursor-pointer">
                Detect duplicate adjacent tokens (e.g. "the the", "for for")
              </label>
            </div>
          </div>
        </div>

        {/* Save Settings Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-2 transition shadow-lg shadow-blue-500/20 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Application Settings</span>
          </button>
        </div>
      </form>

      {/* Database Backup & Reset Operations */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 text-xs">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          Workspace Backup & Data Management
        </h3>
        <p className="text-slate-400">
          All records, rules, facts, reviews, and audit events are stored inside your browser's IndexedDB. Export full backups regularly or restore from a previously exported snapshot.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleFullBackup}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export Complete Database (JSON)</span>
          </button>

          <input
            type="file"
            ref={backupInputRef}
            onChange={handleRestoreBackup}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => backupInputRef.current?.click()}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Restore Backup JSON</span>
          </button>
        </div>

        {/* Danger Zone: Workspace Reset */}
        <div className="mt-6 pt-5 border-t border-slate-800/80">
          <div className="text-red-400 font-semibold flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-4 h-4" />
            Danger Zone: Reset Local Workspace
          </div>
          <p className="text-slate-400 mb-3">
            Permanently delete all brand rules, approved facts, reviews, and audit records stored in this browser.
          </p>

          {!resetConfirmOpen ? (
            <button
              type="button"
              onClick={() => setResetConfirmOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-red-600/15 hover:bg-red-600/25 text-red-400 border border-red-500/30 font-semibold transition cursor-pointer"
            >
              Reset Workspace Database...
            </button>
          ) : (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 space-y-3">
              <p className="text-red-300 font-medium">
                Type <strong>RESET</strong> in all caps to confirm full deletion of all local records:
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={resetText}
                  onChange={(e) => setResetText(e.target.value)}
                  placeholder="RESET"
                  className="bg-slate-950 border border-red-500/40 rounded px-3 py-1.5 text-red-200 font-mono"
                />
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  disabled={resetText.trim() !== 'RESET'}
                  className="px-4 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-semibold transition disabled:opacity-40"
                >
                  Confirm Destruction
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetConfirmOpen(false);
                    setResetText('');
                  }}
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
