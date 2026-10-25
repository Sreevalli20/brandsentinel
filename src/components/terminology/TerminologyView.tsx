/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ArrowRight,
  BookmarkCheck,
  Check,
  Languages,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import { BrandRule } from '../../types';
import { evaluateBrandRules } from '../../services/rulesEngine';
import { SeverityBadge } from '../common/Badge';

interface TerminologyViewProps {
  rules: BrandRule[];
  reviewerName: string;
  onSaveRule: (rule: BrandRule) => Promise<void>;
}

export function TerminologyView({ rules, reviewerName, onSaveRule }: TerminologyViewProps) {
  const [testPhrase, setTestPhrase] = useState('');
  const [newProhibited, setNewProhibited] = useState('');
  const [newApproved, setNewApproved] = useState('');
  const [newDescription, setNewDescription] = useState('');

  // Terminology rules
  const termRules = rules.filter((r) => r.category === 'terminology');

  // Test engine output on testPhrase
  const testResults = testPhrase.trim()
    ? evaluateBrandRules(testPhrase, termRules)
    : null;

  const handleCreateTermPair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProhibited.trim() || !newApproved.trim()) return;

    const newRule: BrandRule = {
      id: `term_${Date.now()}`,
      version: 1,
      title: `Terminology: Use "${newApproved.trim()}" over "${newProhibited.trim()}"`,
      description:
        newDescription.trim() ||
        `Preferred brand nomenclature requires using "${newApproved.trim()}" instead of "${newProhibited.trim()}".`,
      category: 'terminology',
      ruleType: 'prohibited',
      matchType: 'whole_word',
      pattern: newProhibited.trim(),
      approvedAlternatives: [newApproved.trim()],
      severity: 'medium',
      sourceDocument: 'Brand Vocabulary Guide',
      sourceSection: 'Nomenclature',
      active: true,
      exceptions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await onSaveRule(newRule);
    setNewProhibited('');
    setNewApproved('');
    setNewDescription('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Languages className="w-5 h-5 text-blue-400" />
              Brand Terminology & Nomenclature Rules
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              {termRules.length} Defined Pairs
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Enforce corporate nomenclature, product name casing, trademark conventions, and preferred phrasing across all published assets.
          </p>
        </div>
      </div>

      {/* Interactive Sandbox & Fast Lookup Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-400" />
            Interactive Terminology Sandbox
          </h3>
          <p className="text-xs text-slate-400">
            Type any sample heading or snippet to instantly test against configured brand terminology rules.
          </p>

          <input
            type="text"
            value={testPhrase}
            onChange={(e) => setTestPhrase(e.target.value)}
            placeholder="Type a word or sentence (e.g. 'Brand Sentinel control room')..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-hidden focus:border-blue-500 font-mono"
          />

          {testResults && (
            <div className="pt-2 space-y-2">
              {testResults.findings.length === 0 ? (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-lg text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Passes terminology checks: No non-standard terms detected.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-amber-400">
                    {testResults.findings.length} Terminology Violation(s) Detected:
                  </div>
                  {testResults.findings.map((f) => (
                    <div
                      key={f.id}
                      className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-red-400 font-mono">
                          Prohibited: "{f.matchedText}"
                        </span>
                        <SeverityBadge severity={f.severity} />
                      </div>
                      <p className="text-slate-400">{f.explanation}</p>
                      {f.suggestedReplacement && (
                        <div className="text-emerald-400 font-semibold flex items-center gap-1.5 pt-1">
                          <ArrowRight className="w-3.5 h-3.5" />
                          <span>Approved Replacement: "{f.suggestedReplacement}"</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Add Terminology Pair */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-400" />
            Quick Add Terminology Pair
          </h3>
          <form onSubmit={handleCreateTermPair} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Disallowed / Prohibited Term *
              </label>
              <input
                type="text"
                required
                value={newProhibited}
                onChange={(e) => setNewProhibited(e.target.value)}
                placeholder="e.g. artificial intelligence bot"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Approved Brand Replacement *
              </label>
              <input
                type="text"
                required
                value={newApproved}
                onChange={(e) => setNewApproved(e.target.value)}
                placeholder="e.g. deterministic compliance engine"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Style Guidance / Context
              </label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="e.g. Always emphasize deterministic precision over generative ambiguity..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition"
            >
              Add Terminology Rule
            </button>
          </form>
        </div>
      </div>

      {/* Defined Terminology Dictionary Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">
            Active Nomenclature Dictionary ({termRules.length})
          </h3>
        </div>

        {termRules.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No specific terminology rules registered yet. Use the form above to add your first term pair.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800 font-medium">
                <tr>
                  <th className="py-3 px-4">Prohibited Phrase</th>
                  <th className="py-3 px-4">Approved Replacement</th>
                  <th className="py-3 px-4">Guideline Rationale</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Source Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {termRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-semibold text-red-300">
                      "{rule.pattern}"
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-emerald-400">
                      "{rule.approvedAlternatives[0] || 'N/A'}"
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 max-w-sm">{rule.description}</td>
                    <td className="py-3.5 px-4">
                      <SeverityBadge severity={rule.severity} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {rule.sourceDocument || 'Brand Guide'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
