/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  Filter,
  MessageSquare,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  ContentReview,
  FindingStatus,
  FindingVerificationStatus,
  ReviewFinding,
  SeverityLevel,
} from '../../types';
import { exportFindingsCSV } from '../../services/reports';
import { logAuditEvent } from '../../services/storage';
import { FindingStatusBadge, SeverityBadge, VerificationBadge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface FindingsViewProps {
  reviews: ContentReview[];
  currentReview: ContentReview | null;
  reviewerName: string;
  onUpdateFinding: (reviewId: string, updatedFinding: ReviewFinding) => Promise<void>;
  onNavigateToInspector: (reviewId: string) => void;
}

export function FindingsView({
  reviews,
  currentReview,
  reviewerName,
  onUpdateFinding,
  onNavigateToInspector,
}: FindingsViewProps) {
  const [selectedReviewId, setSelectedReviewId] = useState<string>(
    currentReview?.id || (reviews[0]?.id ?? 'all')
  );
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [verificationFilter, setVerificationFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Dismiss modal state
  const [dismissModalOpen, setDismissModalOpen] = useState(false);
  const [targetFinding, setTargetFinding] = useState<{
    finding: ReviewFinding;
    reviewId: string;
  } | null>(null);
  const [dismissReason, setDismissReason] = useState('');

  // Escalate modal state
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [escalationNotes, setEscalationNotes] = useState('');

  // Collect findings based on review selector
  const activeReview = reviews.find((r) => r.id === selectedReviewId);
  const reviewPool = activeReview ? [activeReview] : reviews;

  const allItems: Array<{ finding: ReviewFinding; reviewId: string; reviewTitle: string }> = [];
  for (const r of reviewPool) {
    for (const f of r.findings) {
      allItems.push({ finding: f, reviewId: r.id, reviewTitle: r.title });
    }
  }

  // Filter
  const filteredItems = allItems.filter(({ finding, reviewTitle }) => {
    const matchesSearch =
      finding.matchedText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      finding.explanation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reviewTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (finding.supportingEvidence &&
        finding.supportingEvidence.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSeverity = severityFilter === 'all' || finding.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || finding.reviewStatus === statusFilter;
    const matchesVerification =
      verificationFilter === 'all' || finding.verificationStatus === verificationFilter;

    return matchesSearch && matchesSeverity && matchesStatus && matchesVerification;
  });

  const handleStatusChange = async (
    reviewId: string,
    finding: ReviewFinding,
    newStatus: FindingStatus,
    notes?: string
  ) => {
    const updated: ReviewFinding = {
      ...finding,
      reviewStatus: newStatus,
      reviewerNotes: notes || finding.reviewerNotes,
    };

    await onUpdateFinding(reviewId, updated);
    await logAuditEvent('finding_reviewed', reviewId, 'review', reviewerName, {
      findingId: finding.id,
      newStatus,
      notes,
    });
  };

  const handleConfirmDismiss = async () => {
    if (!targetFinding) return;
    await handleStatusChange(
      targetFinding.reviewId,
      {
        ...targetFinding.finding,
        dismissReason: dismissReason.trim() || 'Dismissed by reviewer',
      },
      'dismissed',
      dismissReason
    );
    setDismissModalOpen(false);
    setTargetFinding(null);
  };

  const handleConfirmEscalate = async () => {
    if (!targetFinding) return;
    await handleStatusChange(
      targetFinding.reviewId,
      targetFinding.finding,
      'escalated',
      escalationNotes
    );
    setEscalateModalOpen(false);
    setTargetFinding(null);
  };

  // Severity Distribution Counts
  const critCount = allItems.filter((i) => i.finding.severity === 'critical').length;
  const highCount = allItems.filter((i) => i.finding.severity === 'high').length;
  const medCount = allItems.filter((i) => i.finding.severity === 'medium').length;
  const lowCount = allItems.filter((i) => i.finding.severity === 'low').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              Brand Risk Radar & Findings Panel
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              {filteredItems.length} Matched Items
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Detailed inspection of policy violations, unverified claims, and contradictory copy. Review evidence snippets, escalate ambiguities, and manage risk overrides.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              exportFindingsCSV(
                activeReview ? activeReview.title : 'All_Workspace_Reviews',
                filteredItems.map((i) => i.finding)
              )
            }
            disabled={filteredItems.length === 0}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export Findings CSV</span>
          </button>
        </div>
      </div>

      {/* Risk Radar Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setSeverityFilter(severityFilter === 'critical' ? 'all' : 'critical')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            severityFilter === 'critical'
              ? 'bg-red-500/20 border-red-500 shadow-md'
              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-xs font-medium text-red-400 flex items-center justify-between">
            <span>Critical Severity</span>
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{critCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">Regulatory & Prohibited Claims</div>
        </div>

        <div
          onClick={() => setSeverityFilter(severityFilter === 'high' ? 'all' : 'high')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            severityFilter === 'high'
              ? 'bg-orange-500/20 border-orange-500 shadow-md'
              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-xs font-medium text-orange-400 flex items-center justify-between">
            <span>High Severity</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{highCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">Factual & Policy Violations</div>
        </div>

        <div
          onClick={() => setSeverityFilter(severityFilter === 'medium' ? 'all' : 'medium')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            severityFilter === 'medium'
              ? 'bg-amber-500/20 border-amber-500 shadow-md'
              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-xs font-medium text-amber-400 flex items-center justify-between">
            <span>Medium Severity</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{medCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">Terminology & Tone Mismatch</div>
        </div>

        <div
          onClick={() => setSeverityFilter(severityFilter === 'low' ? 'all' : 'low')}
          className={`p-4 rounded-xl border transition cursor-pointer ${
            severityFilter === 'low'
              ? 'bg-blue-500/20 border-blue-500 shadow-md'
              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="text-xs font-medium text-blue-400 flex items-center justify-between">
            <span>Low Severity</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{lowCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">Minor Stylistic Inconsistencies</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search matched text, citations, rationale..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {reviews.length > 0 && (
            <div className="flex items-center gap-1.5 text-slate-400">
              <span>Document:</span>
              <select
                value={selectedReviewId}
                onChange={(e) => setSelectedReviewId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-hidden"
              >
                <option value="all">All Documents ({reviews.length})</option>
                {reviews.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Unresolved / Pending</option>
              <option value="accepted_correction">Correction Applied</option>
              <option value="dismissed">Dismissed</option>
              <option value="escalated">Escalated</option>
              <option value="reviewed">Reviewed</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Evidence:</span>
            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-hidden"
            >
              <option value="all">All</option>
              <option value="supported">Verified Support</option>
              <option value="unverified">Unverified Claims</option>
              <option value="contradicted">Contradicted Facts</option>
            </select>
          </div>
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
            <CheckCircle2 className="w-10 h-10 text-emerald-400/60 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-300">No Findings Match Filter Criteria</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              All findings have been resolved or the current filters exclude remaining items.
            </p>
          </div>
        ) : (
          filteredItems.map(({ finding, reviewId, reviewTitle }) => (
            <div
              key={finding.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-3 hover:border-slate-700 transition"
            >
              {/* Top Row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <SeverityBadge severity={finding.severity} />
                  <FindingStatusBadge status={finding.reviewStatus} />
                  {finding.verificationStatus !== 'not_applicable' && (
                    <VerificationBadge status={finding.verificationStatus} />
                  )}
                  <span className="text-[11px] font-semibold text-slate-300 capitalize">
                    {finding.category.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                  <span>Doc: <strong className="text-slate-300">{reviewTitle}</strong></span>
                  <span>·</span>
                  <span className="font-mono">Line {finding.lineNumber}</span>
                  <button
                    onClick={() => onNavigateToInspector(reviewId)}
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-0.5 underline font-medium ml-1"
                  >
                    Open Editor <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Matched Content */}
              <div>
                <div className="text-[11px] font-semibold text-slate-400 mb-0.5">Matched Text:</div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/90 font-mono text-slate-200 text-xs">
                  <span className="text-red-400 font-bold">"{finding.matchedText}"</span>
                </div>
              </div>

              {/* Context Snippet */}
              {finding.contextSnippet && (
                <div className="text-slate-400 text-[11px]">
                  <span className="font-semibold text-slate-400">Context:</span> {finding.contextSnippet}
                </div>
              )}

              {/* Explanation & Evidence Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <div className="font-semibold text-slate-300 mb-1">Violation Explanation</div>
                  <p className="text-slate-400 leading-relaxed">{finding.explanation}</p>
                </div>

                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <div className="font-semibold text-slate-300 mb-1">
                    Rule Reference / Supporting Evidence
                  </div>
                  <p className="text-slate-400 leading-relaxed font-mono text-[11px]">
                    {finding.supportingEvidence ||
                      (finding.sourceDocument
                        ? `${finding.sourceDocument} (${finding.sourceSection || 'Section'}`
                        : 'No supporting fact registered in local library.')}
                  </p>
                </div>
              </div>

              {/* Suggested Alternative */}
              {finding.suggestedReplacement && (
                <div className="p-2.5 rounded-lg bg-blue-950/20 border border-blue-500/20 flex items-center justify-between">
                  <span className="text-slate-300">
                    Configured Alternative: <strong className="text-emerald-400 font-mono font-bold">"{finding.suggestedReplacement}"</strong>
                  </span>
                </div>
              )}

              {/* Notes or Dismiss Reason */}
              {finding.dismissReason && (
                <div className="text-[11px] text-slate-400 italic">
                  Dismissal Rationale: {finding.dismissReason}
                </div>
              )}
              {finding.reviewerNotes && (
                <div className="text-[11px] text-slate-400 italic">
                  Reviewer Notes: {finding.reviewerNotes}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                {finding.reviewStatus === 'pending' && (
                  <>
                    <button
                      onClick={() => handleStatusChange(reviewId, finding, 'reviewed')}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                    >
                      Mark Reviewed
                    </button>

                    <button
                      onClick={() => {
                        setTargetFinding({ finding, reviewId });
                        setEscalateModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded bg-rose-950/40 text-rose-300 border border-rose-500/30 hover:bg-rose-900/40 transition"
                    >
                      Escalate for Legal Review
                    </button>

                    <button
                      onClick={() => {
                        setTargetFinding({ finding, reviewId });
                        setDismissReason('');
                        setDismissModalOpen(true);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    >
                      Dismiss with Reason...
                    </button>
                  </>
                )}

                {finding.reviewStatus !== 'pending' && (
                  <button
                    onClick={() => handleStatusChange(reviewId, finding, 'pending')}
                    className="text-[11px] text-blue-400 hover:text-blue-300 underline"
                  >
                    Reopen Finding
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Dismiss Finding Modal */}
      <Modal
        isOpen={dismissModalOpen}
        onClose={() => setDismissModalOpen(false)}
        title="Dismiss Finding with Reason"
        subtitle="Record the explicit business or legal justification for dismissing this policy finding."
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Dismissal Rationale / Override Reason *
            </label>
            <textarea
              rows={3}
              required
              value={dismissReason}
              onChange={(e) => setDismissReason(e.target.value)}
              placeholder="e.g. Quoted third-party industry award; exempted under Section 4.1 footnote exemption..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setDismissModalOpen(false)}
              className="px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDismiss}
              disabled={!dismissReason.trim()}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold disabled:opacity-50"
            >
              Confirm Dismissal
            </button>
          </div>
        </div>
      </Modal>

      {/* Escalate Modal */}
      <Modal
        isOpen={escalateModalOpen}
        onClose={() => setEscalateModalOpen(false)}
        title="Escalate Finding for Review"
        subtitle="Mark this finding as requiring senior brand manager or legal counsel approval."
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Escalation Notes & Context
            </label>
            <textarea
              rows={3}
              value={escalationNotes}
              onChange={(e) => setEscalationNotes(e.target.value)}
              placeholder="Explain the ambiguity or why senior sign-off is required..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-hidden focus:border-red-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setEscalateModalOpen(false)}
              className="px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmEscalate}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold"
            >
              Escalate Finding
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
