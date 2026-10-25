/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Archive,
  Calendar,
  CheckCircle2,
  Database,
  Download,
  Edit2,
  FileCheck,
  Filter,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { ApprovedFact, FactVerificationStatus } from '../../types';
import { exportApprovedFactsJSON } from '../../services/reports';
import { downloadSampleFactsJSON } from '../../services/sampleData';
import { logAuditEvent } from '../../services/storage';
import { VerificationBadge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface ApprovedFactsViewProps {
  facts: ApprovedFact[];
  reviewerName: string;
  onSaveFact: (fact: ApprovedFact) => Promise<void>;
  onDeleteFact: (id: string) => Promise<void>;
}

export function ApprovedFactsView({
  facts,
  reviewerName,
  onSaveFact,
  onDeleteFact,
}: ApprovedFactsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFact, setEditingFact] = useState<ApprovedFact | null>(null);

  // Form State
  const [statement, setStatement] = useState('');
  const [subject, setSubject] = useState('');
  const [sourceDocument, setSourceDocument] = useState('');
  const [sourceSection, setSourceSection] = useState('');
  const [verificationStatus, setVerificationStatus] =
    useState<FactVerificationStatus>('verified');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [expirationDate, setExpirationDate] = useState('');
  const [owner, setOwner] = useState(reviewerName);
  const [notes, setNotes] = useState('');

  const jsonImportRef = useRef<HTMLInputElement>(null);

  // Derive unique subjects
  const subjects = Array.from(new Set(facts.map((f) => f.subject).filter(Boolean)));

  const filteredFacts = facts.filter((f) => {
    const matchesSearch =
      f.statement.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.sourceDocument.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.owner.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || f.verificationStatus === statusFilter;
    const matchesSubject = subjectFilter === 'all' || f.subject === subjectFilter;

    return matchesSearch && matchesStatus && matchesSubject;
  });

  const openAddModal = () => {
    setEditingFact(null);
    setStatement('');
    setSubject('Product Specification');
    setSourceDocument('');
    setSourceSection('');
    setVerificationStatus('verified');
    setEffectiveDate(new Date().toISOString().split('T')[0]);
    setExpirationDate('');
    setOwner(reviewerName);
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (fact: ApprovedFact) => {
    setEditingFact(fact);
    setStatement(fact.statement);
    setSubject(fact.subject);
    setSourceDocument(fact.sourceDocument);
    setSourceSection(fact.sourceSection);
    setVerificationStatus(fact.verificationStatus);
    setEffectiveDate(fact.effectiveDate);
    setExpirationDate(fact.expirationDate || '');
    setOwner(fact.owner);
    setNotes(fact.notes);
    setIsModalOpen(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statement.trim()) return;

    const now = new Date().toISOString();

    const fact: ApprovedFact = {
      id: editingFact ? editingFact.id : `fact_${Date.now()}`,
      statement: statement.trim(),
      subject: subject.trim() || 'General',
      sourceDocument: sourceDocument.trim() || 'Verified Documentation',
      sourceSection: sourceSection.trim(),
      verificationStatus,
      effectiveDate,
      expirationDate: expirationDate.trim() || null,
      owner: owner.trim() || reviewerName,
      notes: notes.trim(),
      createdAt: editingFact ? editingFact.createdAt : now,
      updatedAt: now,
    };

    await onSaveFact(fact);
    await logAuditEvent(
      editingFact ? 'fact_modified' : 'fact_created',
      fact.id,
      'fact',
      reviewerName,
      { statement: fact.statement, status: fact.verificationStatus }
    );

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              Approved Facts & Evidence Library
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              {facts.length} Verified Records
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Maintain verified product claims, numerical benchmarks, uptime SLAs, and architecture facts. Content claims lacking supporting facts are flagged as unverified for human review.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => exportApprovedFactsJSON(facts)}
            disabled={facts.length === 0}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Facts JSON</span>
          </button>

          <button
            onClick={downloadSampleFactsJSON}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 border border-indigo-500/30 transition flex items-center gap-1.5 cursor-pointer"
            title="Download curated fictional sample approved facts JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sample Facts JSON</span>
          </button>

          <button
            onClick={openAddModal}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Approved Fact</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search facts, subjects, citations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-hidden focus:border-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="verified">Verified (Active)</option>
              <option value="unverified">Unverified (Draft)</option>
              <option value="expired">Expired</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {subjects.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Subject:</span>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-hidden focus:border-emerald-500"
              >
                <option value="all">All Subjects</option>
                {subjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Facts Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {filteredFacts.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Database className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-300">No Approved Facts in Library</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {facts.length === 0
                ? 'Ground your brand claims with verified facts. Click "Add Approved Fact" to record substantiated evidence.'
                : 'No facts match your search filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800 font-medium">
                <tr>
                  <th className="py-3 px-4">Subject & Statement</th>
                  <th className="py-3 px-4">Verification Status</th>
                  <th className="py-3 px-4">Source Reference</th>
                  <th className="py-3 px-4">Effective / Expiration</th>
                  <th className="py-3 px-4">Responsible Owner</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredFacts.map((fact) => {
                  const isExpired =
                    fact.verificationStatus === 'expired' ||
                    (fact.expirationDate && new Date(fact.expirationDate).getTime() < Date.now());

                  return (
                    <tr key={fact.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 max-w-md">
                        <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block mb-0.5">
                          {fact.subject}
                        </span>
                        <div className="font-medium text-slate-200 leading-relaxed">
                          "{fact.statement}"
                        </div>
                        {fact.notes && (
                          <div className="text-[11px] text-slate-400 mt-1 italic">
                            Note: {fact.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <VerificationBadge
                          status={isExpired ? 'expired' : fact.verificationStatus}
                        />
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        <div className="font-medium">{fact.sourceDocument}</div>
                        {fact.sourceSection && (
                          <div className="text-[10px] text-slate-400">{fact.sourceSection}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        <div>From: {fact.effectiveDate}</div>
                        {fact.expirationDate ? (
                          <div className={isExpired ? 'text-rose-400 font-semibold' : ''}>
                            Until: {fact.expirationDate}
                          </div>
                        ) : (
                          <div className="text-slate-400">No expiration</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">{fact.owner}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(fact)}
                            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                            title="Edit Fact"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm('Delete this approved fact?')) {
                                await onDeleteFact(fact.id);
                                await logAuditEvent('fact_deleted', fact.id, 'fact', reviewerName, {
                                  statement: fact.statement,
                                });
                              }
                            }}
                            className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                            title="Delete Fact"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Fact Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFact ? 'Edit Approved Fact' : 'Add Verified Fact to Library'}
        subtitle="Record verified product specifications, numbers, and features grounded in official documentation."
      >
        <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Verifiable Statement / Fact *
            </label>
            <textarea
              required
              rows={3}
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder="e.g. BrandSentinel AI runs 100% locally in browser memory without sending document data to external cloud servers."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Subject / Product Area *</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Privacy & Security, Performance, Pricing"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Verification Status</label>
              <select
                value={verificationStatus}
                onChange={(e) => setVerificationStatus(e.target.value as FactVerificationStatus)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden focus:border-emerald-500"
              >
                <option value="verified">Verified (Approved for evidence)</option>
                <option value="unverified">Unverified (Pending confirmation)</option>
                <option value="expired">Expired (Historical only)</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Source Document Name *</label>
              <input
                type="text"
                required
                value={sourceDocument}
                onChange={(e) => setSourceDocument(e.target.value)}
                placeholder="e.g. SOC 2 Type II Report 2026, Technical Specs"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Section / Table / Page</label>
              <input
                type="text"
                value={sourceSection}
                onChange={(e) => setSourceSection(e.target.value)}
                placeholder="e.g. Section 4.1, Table 2"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Effective Date *</label>
              <input
                type="date"
                required
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Expiration Date (Optional)</label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Responsible Role / Owner</label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="e.g. Legal Lead"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Verification Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal verification context, audit report reference, or review schedule..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden focus:border-emerald-500"
            />
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
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition"
            >
              {editingFact ? 'Update Fact' : 'Save Fact'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
