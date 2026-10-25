/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FactVerificationStatus, FindingStatus, FindingVerificationStatus, SeverityLevel, WorkflowStatus } from '../../types';

export function SeverityBadge({ severity }: { severity: SeverityLevel }) {
  const styles: Record<SeverityLevel, { bg: string; text: string; border: string; label: string }> = {
    critical: {
      bg: 'bg-red-500/15',
      text: 'text-red-400',
      border: 'border-red-500/30',
      label: 'Critical',
    },
    high: {
      bg: 'bg-orange-500/15',
      text: 'text-orange-400',
      border: 'border-orange-500/30',
      label: 'High',
    },
    medium: {
      bg: 'bg-amber-500/15',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      label: 'Medium',
    },
    low: {
      bg: 'bg-blue-500/15',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
      label: 'Low',
    },
  };

  const current = styles[severity] || styles.low;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border ${current.bg} ${current.text} ${current.border}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current" />
      {current.label}
    </span>
  );
}

export function WorkflowStatusBadge({ status }: { status: WorkflowStatus }) {
  const styles: Record<WorkflowStatus, { bg: string; text: string; border: string; label: string }> = {
    draft: {
      bg: 'bg-slate-800/80',
      text: 'text-slate-300',
      border: 'border-slate-700',
      label: 'Draft',
    },
    in_review: {
      bg: 'bg-blue-500/15',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
      label: 'In Review',
    },
    changes_required: {
      bg: 'bg-amber-500/15',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      label: 'Changes Required',
    },
    pending_approval: {
      bg: 'bg-purple-500/15',
      text: 'text-purple-400',
      border: 'border-purple-500/30',
      label: 'Pending Approval',
    },
    approved: {
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      label: 'Approved',
    },
    rejected: {
      bg: 'bg-rose-500/15',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      label: 'Rejected',
    },
  };

  const s = styles[status] || styles.draft;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${s.bg} ${s.text} ${s.border}`}
    >
      {s.label}
    </span>
  );
}

export function FindingStatusBadge({ status }: { status: FindingStatus }) {
  const labels: Record<FindingStatus, { text: string; color: string }> = {
    pending: { text: 'Unresolved', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    accepted_correction: {
      text: 'Correction Applied',
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    dismissed: { text: 'Dismissed', color: 'text-slate-400 bg-slate-800 border-slate-700' },
    escalated: { text: 'Escalated', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
    reviewed: { text: 'Reviewed', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  };

  const item = labels[status] || labels.pending;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${item.color}`}
    >
      {item.text}
    </span>
  );
}

export function VerificationBadge({
  status,
}: {
  status: FindingVerificationStatus | FactVerificationStatus;
}) {
  switch (status) {
    case 'verified':
    case 'supported':
      return (
        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          ✓ Verified Evidence
        </span>
      );
    case 'contradicted':
      return (
        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30">
          ✕ Contradicted Fact
        </span>
      );
    case 'expired':
      return (
        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30">
          ⚠ Expired Fact
        </span>
      );
    case 'archived':
      return (
        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
          Archived
        </span>
      );
    case 'unverified':
    default:
      return (
        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
          ? Unverified Claim
        </span>
      );
  }
}
