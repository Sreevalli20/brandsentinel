/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Check,
  Download,
  Edit2,
  FileText,
  Filter,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { BrandRule, MatchType, RuleCategory, RuleType, SeverityLevel } from '../../types';
import { extractTextFromFile } from '../../services/documentExtractor';
import { exportBrandRulesJSON } from '../../services/reports';
import { downloadSampleGuidelinesJSON } from '../../services/sampleData';
import { logAuditEvent } from '../../services/storage';
import { SeverityBadge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface BrandGuidelinesViewProps {
  rules: BrandRule[];
  reviewerName: string;
  onSaveRule: (rule: BrandRule) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
}

export function BrandGuidelinesView({
  rules,
  reviewerName,
  onSaveRule,
  onDeleteRule,
}: BrandGuidelinesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  // Modal State for Add / Edit Rule
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<BrandRule | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<RuleCategory>('prohibited_claims');
  const [ruleType, setRuleType] = useState<RuleType>('prohibited');
  const [matchType, setMatchType] = useState<MatchType>('whole_word');
  const [pattern, setPattern] = useState('');
  const [alternativesText, setAlternativesText] = useState('');
  const [severity, setSeverity] = useState<SeverityLevel>('medium');
  const [sourceDocument, setSourceDocument] = useState('');
  const [sourceSection, setSourceSection] = useState('');
  const [active, setActive] = useState(true);
  const [exceptionsText, setExceptionsText] = useState('');

  // Guideline Document Import State
  const [isDocImportModalOpen, setIsDocImportModalOpen] = useState(false);
  const [extractedGuidelineText, setExtractedGuidelineText] = useState('');
  const [extractedDocName, setExtractedDocName] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  const jsonImportRef = useRef<HTMLInputElement>(null);
  const docFileImportRef = useRef<HTMLInputElement>(null);

  // Filter rules
  const filteredRules = rules.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.pattern.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.sourceDocument && r.sourceDocument.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
    const matchesSeverity = severityFilter === 'all' || r.severity === severityFilter;

    return matchesSearch && matchesCategory && matchesSeverity;
  });

  const openAddModal = () => {
    setEditingRule(null);
    setTitle('');
    setDescription('');
    setCategory('prohibited_claims');
    setRuleType('prohibited');
    setMatchType('whole_word');
    setPattern('');
    setAlternativesText('');
    setSeverity('medium');
    setSourceDocument('');
    setSourceSection('');
    setActive(true);
    setExceptionsText('');
    setIsModalOpen(true);
  };

  const openEditModal = (rule: BrandRule) => {
    setEditingRule(rule);
    setTitle(rule.title);
    setDescription(rule.description);
    setCategory(rule.category);
    setRuleType(rule.ruleType);
    setMatchType(rule.matchType);
    setPattern(rule.pattern);
    setAlternativesText(rule.approvedAlternatives.join('\n'));
    setSeverity(rule.severity);
    setSourceDocument(rule.sourceDocument);
    setSourceSection(rule.sourceSection);
    setActive(rule.active);
    setExceptionsText(rule.exceptions.join('\n'));
    setIsModalOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pattern.trim() || !title.trim()) return;

    const alternatives = alternativesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const exceptions = exceptionsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const now = new Date().toISOString();

    const rule: BrandRule = {
      id: editingRule ? editingRule.id : `rule_${Date.now()}`,
      version: editingRule ? editingRule.version + 1 : 1,
      title: title.trim(),
      description: description.trim(),
      category,
      ruleType,
      matchType,
      pattern: pattern.trim(),
      approvedAlternatives: alternatives,
      severity,
      sourceDocument: sourceDocument.trim() || 'Internal Brand Guide',
      sourceSection: sourceSection.trim(),
      active,
      exceptions,
      createdAt: editingRule ? editingRule.createdAt : now,
      updatedAt: now,
    };

    await onSaveRule(rule);
    await logAuditEvent(
      editingRule ? 'rule_modified' : 'rule_created',
      rule.id,
      'rule',
      reviewerName,
      { title: rule.title, category: rule.category, severity: rule.severity }
    );

    setIsModalOpen(false);
  };

  // Guideline Document (PDF / DOCX) Extraction
  const handleDocFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setImportNotice(null);

    try {
      const extracted = await extractTextFromFile(file);
      setExtractedGuidelineText(extracted.text);
      setExtractedDocName(file.name);
      setSourceDocument(file.name);
      setIsDocImportModalOpen(true);
    } catch (err: any) {
      alert(`Failed to extract document: ${err.message}`);
    } finally {
      setIsExtracting(false);
      if (docFileImportRef.current) docFileImportRef.current.value = '';
    }
  };

  // JSON Import
  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        const importedRules = Array.isArray(json) ? json : json.rules;
        if (Array.isArray(importedRules)) {
          for (const r of importedRules) {
            await onSaveRule(r);
          }
          await logAuditEvent('rule_created', 'bulk', 'rule', reviewerName, {
            importedCount: importedRules.length,
          });
          alert(`Successfully imported ${importedRules.length} rules.`);
        }
      } catch (err: any) {
        alert(`Invalid JSON file: ${err.message}`);
      }
    };
    reader.readAsText(file);
    if (jsonImportRef.current) jsonImportRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-400" />
              Brand Guidelines & Policy Rules
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              {rules.length} Configured
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Configure authoritative brand rules, prohibited phrases, required disclaimers, and tone policies. Every rule has an explicit citation and severity.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="file"
            ref={docFileImportRef}
            onChange={handleDocFileUpload}
            accept=".pdf,.docx,.txt,.md"
            className="hidden"
          />
          <button
            onClick={() => docFileImportRef.current?.click()}
            disabled={isExtracting}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Import guideline PDF or DOCX"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>{isExtracting ? 'Extracting...' : 'Import Guideline Doc'}</span>
          </button>

          <input
            type="file"
            ref={jsonImportRef}
            onChange={handleJsonImport}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => jsonImportRef.current?.click()}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import JSON</span>
          </button>

          <button
            onClick={() => exportBrandRulesJSON(rules)}
            disabled={rules.length === 0}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={downloadSampleGuidelinesJSON}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/30 transition flex items-center gap-1.5 cursor-pointer"
            title="Download curated fictional sample brand guidelines JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sample Rules JSON</span>
          </button>

          <button
            onClick={openAddModal}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Rule</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search rules, phrases, citations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-hidden focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="prohibited_claims">Prohibited Claims</option>
              <option value="required_disclaimers">Required Disclaimers</option>
              <option value="terminology">Terminology & Naming</option>
              <option value="voice_tone">Brand Voice & Tone</option>
              <option value="legal_regulatory">Legal & Regulatory</option>
              <option value="accessibility">Accessibility Rules</option>
              <option value="formatting_style">Formatting & Style</option>
              <option value="product_messaging">Product Messaging</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-hidden focus:border-blue-500"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Rules Table / Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {filteredRules.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-300">No Brand Rules Found</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {rules.length === 0
                ? 'Your brand guideline repository is empty. Click "Add Rule" or "Import Guideline Doc" above to start configuring policies.'
                : 'No rules match your search or filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800 font-medium">
                <tr>
                  <th className="py-3 px-4">Rule Title & Category</th>
                  <th className="py-3 px-4">Pattern / Requirement</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Approved Alternative</th>
                  <th className="py-3 px-4">Source Reference</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{rule.title}</div>
                      <div className="text-[10px] text-slate-400 capitalize">
                        {rule.category.replace(/_/g, ' ')}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300 max-w-xs truncate">
                      <span className="text-[10px] text-slate-400 font-sans block">
                        {rule.ruleType === 'required' ? 'Mandatory:' : 'Prohibited:'} ({rule.matchType})
                      </span>
                      "{rule.pattern}"
                    </td>
                    <td className="py-3.5 px-4">
                      <SeverityBadge severity={rule.severity} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">
                      {rule.approvedAlternatives.length > 0 ? (
                        <span className="text-emerald-400">"{rule.approvedAlternatives[0]}"</span>
                      ) : (
                        <span className="text-slate-500 italic">None configured</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      <div>{rule.sourceDocument || 'Brand Guide'}</div>
                      {rule.sourceSection && (
                        <div className="text-[10px] text-slate-400">{rule.sourceSection}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium border ${
                          rule.active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {rule.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(rule)}
                          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                          title="Edit Rule"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Delete rule "${rule.title}"?`)) {
                              await onDeleteRule(rule.id);
                              await logAuditEvent('rule_deleted', rule.id, 'rule', reviewerName, {
                                title: rule.title,
                              });
                            }
                          }}
                          className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                          title="Delete Rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Rule Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRule ? 'Edit Brand Rule' : 'Configure New Brand Rule'}
        subtitle="Specify exact or whole-word prohibited phrases, mandatory disclaimers, and approved alternatives."
      >
        <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Rule Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Prohibit Unsubstantiated #1 Claims"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Policy Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as RuleCategory)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden focus:border-blue-500"
              >
                <option value="prohibited_claims">Prohibited Claims</option>
                <option value="required_disclaimers">Required Disclaimers</option>
                <option value="terminology">Terminology & Naming</option>
                <option value="voice_tone">Brand Voice & Tone</option>
                <option value="legal_regulatory">Legal & Regulatory</option>
                <option value="accessibility">Accessibility Rules</option>
                <option value="formatting_style">Formatting & Style</option>
                <option value="product_messaging">Product Messaging</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Rule Description / Rationale</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain why this rule exists and how to comply..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Rule Nature</label>
              <select
                value={ruleType}
                onChange={(e) => setRuleType(e.target.value as RuleType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden focus:border-blue-500"
              >
                <option value="prohibited">Prohibited (flag if present)</option>
                <option value="required">Required (flag if missing)</option>
                <option value="preferred">Preferred (suggest replacement)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Match Type</label>
              <select
                value={matchType}
                onChange={(e) => setMatchType(e.target.value as MatchType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden focus:border-blue-500"
              >
                <option value="whole_word">Whole Word (recommended)</option>
                <option value="case_insensitive">Case-Insensitive Substring</option>
                <option value="exact">Exact Case-Sensitive</option>
                <option value="regex">Regular Expression (Regex)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as SeverityLevel)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden focus:border-blue-500"
              >
                <option value="critical">Critical (Regulatory / Legal)</option>
                <option value="high">High (Major Brand Violation)</option>
                <option value="medium">Medium (Terminology / Tone)</option>
                <option value="low">Low (Minor Style)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Pattern / Target Text (Phrase or Regex) *
            </label>
            <input
              type="text"
              required
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="e.g. world's cheapest OR all rights reserved"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Approved Alternatives (One per line)
            </label>
            <textarea
              rows={2}
              value={alternativesText}
              onChange={(e) => setAlternativesText(e.target.value)}
              placeholder="Enter approved replacement phrases (first line is default suggestion)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Source Document</label>
              <input
                type="text"
                value={sourceDocument}
                onChange={(e) => setSourceDocument(e.target.value)}
                placeholder="e.g. Brand Manual 2026"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Section / Page Citation</label>
              <input
                type="text"
                value={sourceSection}
                onChange={(e) => setSourceSection(e.target.value)}
                placeholder="e.g. Section 3.2, Page 14"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Exceptions (Surrounding phrases that excuse this rule)
            </label>
            <textarea
              rows={2}
              value={exceptionsText}
              onChange={(e) => setExceptionsText(e.target.value)}
              placeholder="e.g. quoted customer testimonial&#10;third-party rating"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="ruleActiveCheck"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0"
            />
            <label htmlFor="ruleActiveCheck" className="text-slate-300 cursor-pointer">
              Rule is active and enforced during audits
            </label>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition"
            >
              {editingRule ? 'Save Changes' : 'Create Rule'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Guideline Document Review Modal */}
      <Modal
        isOpen={isDocImportModalOpen}
        onClose={() => setIsDocImportModalOpen(false)}
        title="Review Extracted Guideline Document"
        subtitle={`Source: ${extractedDocName} — Review extracted text and convert sections into configured rules.`}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Honest Engine Notice:</span> BrandSentinel AI does not
              claim to automatically divine authoritative legal policy from arbitrary unstructured
              documents. Please inspect the extracted text below and select or copy specific phrases to
              configure verified rules.
            </div>
          </div>

          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 max-h-80 overflow-y-auto font-mono text-[11px] leading-relaxed text-slate-300 whitespace-pre-wrap">
            {extractedGuidelineText}
          </div>

          <div className="flex justify-between items-center pt-2">
            <span className="text-slate-400">
              Select or copy target wording from the box above to create rules.
            </span>
            <button
              onClick={() => {
                setIsDocImportModalOpen(false);
                openAddModal();
                setSourceDocument(extractedDocName);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition"
            >
              Configure Rule from this Source
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
