/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  Clock,
  FileCheck2,
  Lock,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react';
import {
  ApprovalDecision,
  ContentReview,
  WorkflowStatus,
} from '../../types';
import { logAuditEvent } from '../../services/storage';
import { SeverityBadge, WorkflowStatusBadge } from '../common/Badge';
import { Modal } from '../common/Modal';

interface ApprovalWorkflowViewProps {
  reviews: ContentReview[];
  currentReview: ContentReview | null;
  reviewerName: string;
  reviewerRole: string;
  onSaveReview: (review: ContentReview) => Promise<void>;
  onSelectReview: (id: string) => void;
  onNavigateToInspector: (id: string) => void;
}

export function ApprovalWorkflowView({
  reviews,
  currentReview,
  reviewerName,
  reviewerRole,
  onSaveReview,
  onSelectReview,
  onNavigateToInspector,
}: ApprovalWorkflowViewProps) {
  const [selectedReviewId, setSelectedReviewId] = useState<string>(
    currentReview?.id || (reviews[0]?.id ?? '')
  );

  const activeReview = reviews.find((r) => r.id === selectedReviewId) || currentReview || null;

  // Decision Modal state
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [targetDecision, setTargetDecision] = useState<'approved' | 'rejected'>('approved');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [acknowledgedRisks, setAcknowledgedRisks] = useState(false);

  // Status transition handler
  const handleTransitionStatus = async (newStatus: WorkflowStatus) => {
    if (!activeReview) return;
    const updated: ContentReview = {
      ...activeReview,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    await onSaveReview(updated);
    await logAuditEvent('approval_requested', activeReview.id, 'review', reviewerName, {
      fromStatus: activeReview.status,
      toStatus: newStatus,
    });
  };

  // Open Decision Dialog
  const openDecisionModal = (decision: 'approved' | 'rejected') => {
    setTargetDecision(decision);
    setDecisionNotes('');
    setOverrideReason('');
    setAcknowledgedRisks(false);
    setDecisionModalOpen(true);
  };

  // Execute Approval or Rejection Decision
  const handleExecuteDecision = async () => {
    if (!activeReview) return;

    const unresolvedCrit = activeReview.findings.filter(
      (f) =>
        f.severity === 'critical' &&
        f.reviewStatus !== 'accepted_correction' &&
        f.reviewStatus !== 'dismissed'
    ).length;

    const unresolvedHigh = activeReview.findings.filter(
      (f) =>
        f.severity === 'high' &&
        f.reviewStatus !== 'accepted_correction' &&
        f.reviewStatus !== 'dismissed'
    ).length;

    if (targetDecision === 'approved' && (unresolvedCrit > 0 || unresolvedHigh > 0)) {
      if (!overrideReason.trim()) {
        alert('You must provide an explicit override reason when unresolved Critical or High findings exist.');
        return;
      }
      if (!acknowledgedRisks) {
        alert('You must check the risk acknowledgement confirmation box.');
        return;
      }
    }

    const decisionRecord: ApprovalDecision = {
      decision: targetDecision,
      decidedBy: `${reviewerName} (${reviewerRole})`,
      decidedAt: new Date().toISOString(),
      overrideReason: overrideReason.trim() || undefined,
      notes: decisionNotes.trim() || undefined,
      unresolvedCriticalCount: unresolvedCrit,
      unresolvedHighCount: unresolvedHigh,
    };

    const newStatus: WorkflowStatus = targetDecision === 'approved' ? 'approved' : 'rejected';

    const updated: ContentReview = {
      ...activeReview,
      status: newStatus,
      approvalDecision: decisionRecord,
      updatedAt: new Date().toISOString(),
    };

    await onSaveReview(updated);
    await logAuditEvent(
      targetDecision === 'approved' ? 'approval_granted' : 'approval_denied',
      activeReview.id,
      'review',
      reviewerName,
      {
        decision: targetDecision,
        decidedBy: decisionRecord.decidedBy,
        overrideReason: decisionRecord.overrideReason,
        unresolvedCriticalCount: unresolvedCrit,
        unresolvedHighCount: unresolvedHigh,
      }
    );

    setDecisionModalOpen(false);
  };

  // Status Kanban Columns
  const statusColumns: Array<{
    status: WorkflowStatus;
    title: string;
    description: string;
    color: string;
  }> = [
    { status: 'draft', title: 'Draft', description: 'Under composition', color: 'border-slate-800' },
    { status: 'in_review', title: 'In Review', description: 'Auditing rules', color: 'border-blue-500/40' },
    { status: 'changes_required', title: 'Changes Required', description: 'Violations to fix', color: 'border-amber-500/40' },
    { status: 'pending_approval', title: 'Pending Approval', description: 'Awaiting human sign-off', color: 'border-purple-500/40' },
    { status: 'approved', title: 'Approved', description: 'Authorized for publication', color: 'border-emerald-500/40' },
    { status: 'rejected', title: 'Rejected', description: 'Publication declined', color: 'border-rose-500/40' },
  ];

  const unresolvedCritical = activeReview?.findings.filter(
    (f) =>
      f.severity === 'critical' &&
      f.reviewStatus !== 'accepted_correction' &&
      f.reviewStatus !== 'dismissed'
  ).length || 0;

  const unresolvedHigh = activeReview?.findings.filter(
    (f) =>
      f.severity === 'high' &&
      f.reviewStatus !== 'accepted_correction' &&
      f.reviewStatus !== 'dismissed'
  ).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-purple-400" />
              Human Approval & Release Governance
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              Stage Gate Control
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Formal human sign-off process before public release. Pre-approval risk gates prevent accidental publication of unresolved Critical or High policy violations.
          </p>
        </div>

        {reviews.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Select Document:</span>
            <select
              value={selectedReviewId}
              onChange={(e) => {
                setSelectedReviewId(e.target.value);
                onSelectReview(e.target.value);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 font-medium focus:outline-hidden focus:border-purple-500"
            >
              {reviews.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.status.replace(/_/g, ' ')})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Kanban Stages Board */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statusColumns.map((col) => {
          const colReviews = reviews.filter((r) => r.status === col.status);
          const isSelectedCol = activeReview?.status === col.status;

          return (
            <div
              key={col.status}
              className={`p-3 rounded-xl bg-slate-900/70 border transition flex flex-col justify-between ${
                isSelectedCol ? col.color : 'border-slate-800/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-200">{col.title}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {colReviews.length}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mb-2">{col.description}</div>
              </div>

              {activeReview && activeReview.status !== col.status && (
                <button
                  onClick={() => handleTransitionStatus(col.status)}
                  className="w-full mt-2 py-1 text-[10px] font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Move Active Here
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Review Decision Workspace */}
      {!activeReview ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
          <CheckSquare className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-300">No Review Selected</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Select a document above or create a new inspection in the Content Inspector.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Document Summary (8 Cols) */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">{activeReview.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <WorkflowStatusBadge status={activeReview.status} />
                  <span className="text-xs text-slate-400 capitalize">
                    {activeReview.contentType.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-400">
                    Score:{' '}
                    <strong
                      className={
                        activeReview.complianceScore >= 90
                          ? 'text-emerald-400'
                          : activeReview.complianceScore >= 70
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }
                    >
                      {activeReview.complianceScore}%
                    </strong>
                  </span>
                </div>
              </div>

              <button
                onClick={() => onNavigateToInspector(activeReview.id)}
                className="text-xs text-blue-400 hover:text-blue-300 underline font-medium flex items-center gap-1"
              >
                Inspect Full Document in Editor <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Outstanding Risks Warning Banner */}
            {(unresolvedCritical > 0 || unresolvedHigh > 0) && (
              <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/30 text-xs space-y-1.5 text-red-300">
                <div className="font-bold flex items-center gap-2 text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Pre-Approval Gate: Unresolved High/Critical Risks Present
                </div>
                <p className="text-slate-300 leading-relaxed">
                  This document currently has{' '}
                  <strong className="text-red-400">{unresolvedCritical} Critical</strong> and{' '}
                  <strong className="text-orange-400">{unresolvedHigh} High</strong> severity
                  findings. Enterprise policy requires either correcting these violations or
                  recording an explicit executive override reason before approving.
                </p>
              </div>
            )}

            {/* Findings Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Unresolved Findings ({activeReview.findings.filter((f) => f.reviewStatus === 'pending').length})
              </h4>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {activeReview.findings.filter((f) => f.reviewStatus === 'pending').length === 0 ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-lg text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>All findings have been resolved, corrected, or exempted.</span>
                  </div>
                ) : (
                  activeReview.findings
                    .filter((f) => f.reviewStatus === 'pending')
                    .map((f) => (
                      <div
                        key={f.id}
                        className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center justify-between"
                      >
                        <div className="space-y-0.5 truncate pr-2">
                          <div className="flex items-center gap-2">
                            <SeverityBadge severity={f.severity} />
                            <span className="font-mono text-slate-200">"{f.matchedText}"</span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">{f.explanation}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          Ln {f.lineNumber}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Recorded Decision History */}
            {activeReview.approvalDecision && (
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-2">
                <div className="font-semibold text-slate-200 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    Recorded Human Decision
                  </span>
                  <span
                    className={`font-bold uppercase px-2 py-0.5 rounded text-[11px] ${
                      activeReview.approvalDecision.decision === 'approved'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {activeReview.approvalDecision.decision}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 space-y-1">
                  <div>
                    <strong>Decided By:</strong> {activeReview.approvalDecision.decidedBy}
                  </div>
                  <div>
                    <strong>Decided At:</strong>{' '}
                    {new Date(activeReview.approvalDecision.decidedAt).toLocaleString()}
                  </div>
                  {activeReview.approvalDecision.overrideReason && (
                    <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300">
                      <strong>Executive Override Rationale:</strong>{' '}
                      {activeReview.approvalDecision.overrideReason}
                    </div>
                  )}
                  {activeReview.approvalDecision.notes && (
                    <div>
                      <strong>Reviewer Notes:</strong> {activeReview.approvalDecision.notes}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Decision Action Panel (4 Cols) */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              Decision Action Panel
            </h3>

            <p className="text-xs text-slate-400 leading-relaxed">
              Record a formal human decision. Decisions are stamped with your reviewer identity, exact findings counts, and logged immutably into the audit trail.
            </p>

            <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/90 text-xs space-y-1">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Active Reviewer:</div>
              <div className="font-semibold text-slate-200">{reviewerName}</div>
              <div className="text-[11px] text-slate-400">{reviewerRole}</div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => openDecisionModal('approved')}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Authorize & Approve Content</span>
              </button>

              <button
                onClick={() => openDecisionModal('rejected')}
                className="w-full py-2 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject / Decline Publication</span>
              </button>

              <button
                onClick={() => handleTransitionStatus('changes_required')}
                className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Request Changes from Author</span>
              </button>
            </div>

            {/* Legal / Operational Notice */}
            <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/60 text-[10px] text-slate-400 space-y-1 leading-normal">
              <div className="font-semibold text-slate-400 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" />
                Governance Transparency Notice
              </div>
              <p>
                Approval confirms a local authorized reviewer completed verification against configured brand guidelines and verified facts. It does not constitute formal legal counsel.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Decision Execution Modal */}
      <Modal
        isOpen={decisionModalOpen}
        onClose={() => setDecisionModalOpen(false)}
        title={targetDecision === 'approved' ? 'Authorize Content Approval' : 'Decline Publication (Reject)'}
        subtitle="This action will be stamped with your reviewer identity and logged in the persistent audit trail."
      >
        <div className="space-y-4 text-xs">
          {targetDecision === 'approved' && (unresolvedCritical > 0 || unresolvedHigh > 0) && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg space-y-2">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                Mandatory Override Justification Required
              </div>
              <p>
                There are {unresolvedCritical} Critical and {unresolvedHigh} High unresolved findings. You must document an explicit rationale for this risk override.
              </p>
              <div>
                <label className="block font-medium text-slate-200 mb-1">
                  Executive Override Rationale *
                </label>
                <textarea
                  rows={2}
                  required
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Legal counsel pre-approved this specific comparative wording for the Q4 press release..."
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-hidden focus:border-red-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="ackRisks"
                  checked={acknowledgedRisks}
                  onChange={(e) => setAcknowledgedRisks(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-red-500 focus:ring-0"
                />
                <label htmlFor="ackRisks" className="text-slate-200 font-medium cursor-pointer">
                  I acknowledge and accept the risks associated with these outstanding policy findings.
                </label>
              </div>
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Reviewer Decision Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              placeholder="Add release notes, distribution restrictions, or approval conditions..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="pt-2 border-t border-slate-800 flex justify-end gap-3">
            <button
              onClick={() => setDecisionModalOpen(false)}
              className="px-4 py-2 rounded-lg text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteDecision}
              className={`px-4 py-2 rounded-lg font-semibold text-white transition ${
                targetDecision === 'approved'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              Confirm {targetDecision === 'approved' ? 'Approval' : 'Rejection'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
