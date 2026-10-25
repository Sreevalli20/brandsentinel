/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Database,
  FileCheck2,
  FileSearch,
  HardDriveDownload,
  ShieldCheck,
} from 'lucide-react';
import { ApprovedFact, BrandRule, ContentReview, NavigationPage } from '../../types';
import { SeverityBadge, WorkflowStatusBadge } from '../common/Badge';

interface DashboardViewProps {
  reviews: ContentReview[];
  rules: BrandRule[];
  facts: ApprovedFact[];
  onNavigate: (page: NavigationPage) => void;
  onSelectReview: (reviewId: string) => void;
  onLoadSampleWorkspace: () => void;
}

export function DashboardView({
  reviews,
  rules,
  facts,
  onNavigate,
  onSelectReview,
  onLoadSampleWorkspace,
}: DashboardViewProps) {
  // Aggregate real statistics from persisted data
  const totalReviews = reviews.length;
  const pendingApprovals = reviews.filter((r) => r.status === 'pending_approval');

  // Compute all findings across all reviews
  const allFindings = reviews.flatMap((r) => r.findings);
  const unresolvedFindings = allFindings.filter(
    (f) => f.reviewStatus !== 'accepted_correction' && f.reviewStatus !== 'dismissed'
  );

  const criticalCount = unresolvedFindings.filter((f) => f.severity === 'critical').length;
  const highCount = unresolvedFindings.filter((f) => f.severity === 'high').length;
  const mediumCount = unresolvedFindings.filter((f) => f.severity === 'medium').length;
  const lowCount = unresolvedFindings.filter((f) => f.severity === 'low').length;

  const avgScore =
    reviews.length > 0
      ? Math.round(reviews.reduce((acc, r) => acc + (r.complianceScore || 0), 0) / reviews.length)
      : 100;

  // Most frequently violated rules
  const ruleViolationCounts: Record<string, { title: string; count: number; severity: string }> = {};
  for (const finding of allFindings) {
    if (finding.ruleId) {
      if (!ruleViolationCounts[finding.ruleId]) {
        const rule = rules.find((r) => r.id === finding.ruleId);
        ruleViolationCounts[finding.ruleId] = {
          title: rule ? rule.title : finding.explanation,
          count: 0,
          severity: finding.severity,
        };
      }
      ruleViolationCounts[finding.ruleId].count++;
    }
  }

  const topViolatedRules = Object.entries(ruleViolationCounts)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 5);

  // Recent approval decisions
  const reviewsWithDecisions = reviews
    .filter((r) => r.approvalDecision !== null)
    .sort(
      (a, b) =>
        new Date(b.approvalDecision!.decidedAt).getTime() -
        new Date(a.approvalDecision!.decidedAt).getTime()
    )
    .slice(0, 5);

  // Empty state handling
  const isEmpty = reviews.length === 0 && rules.length === 0 && facts.length === 0;

  return (
    <div className="space-y-6">
      {/* Top Banner & Status */}
      <div className="bg-linear-to-r from-slate-900 via-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold tracking-wider bg-blue-500/20 text-blue-300 rounded border border-blue-500/30 uppercase">
              Compliance Governance Center
            </span>
            <span className="text-xs text-slate-400">· Offline Local Architecture</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            BrandSentinel AI Protection Hub
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Real-time pre-publication brand policy verification. Run client-side deterministic rule audits and ground messaging against local approved evidence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onNavigate('inspector')}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition shadow-lg shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
          >
            <FileSearch className="w-4 h-4" />
            <span>Launch Content Inspector</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Content Reviews</span>
            <FileCheck2 className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{totalReviews}</span>
            <span className="text-xs text-slate-400">persisted in IndexedDB</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Avg Compliance Score</span>
            <span className="font-semibold text-emerald-400">{avgScore}%</span>
          </div>
        </div>

        <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Critical & High Risks</span>
            <AlertCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-red-400">
              {criticalCount + highCount}
            </span>
            <span className="text-xs text-slate-400">open findings</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span className="text-red-400">{criticalCount} Critical</span>
            <span className="text-orange-400">{highCount} High</span>
          </div>
        </div>

        <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Medium & Low Flags</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-400">
              {mediumCount + lowCount}
            </span>
            <span className="text-xs text-slate-400">stylistic / tone flags</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span className="text-amber-400">{mediumCount} Medium</span>
            <span className="text-blue-400">{lowCount} Low</span>
          </div>
        </div>

        <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Awaiting Approval</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-purple-400">
              {pendingApprovals.length}
            </span>
            <span className="text-xs text-slate-400">documents in queue</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Rules: {rules.length}</span>
            <span>Approved Facts: {facts.length}</span>
          </div>
        </div>
      </div>

      {/* Empty State when zero data exists */}
      {isEmpty && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-8 text-center max-w-3xl mx-auto space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">BrandSentinel AI Workspace is Clean</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              No brand guidelines or documents have been imported yet. You can start by configuring your brand rules and verified facts, or load our fictional example workspace.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left pt-2">
            <div
              onClick={() => onNavigate('guidelines')}
              className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
            >
              <div className="flex items-center gap-2 text-blue-400 text-sm font-semibold mb-1">
                <BookOpen className="w-4 h-4" /> 1. Define Rules
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                Add prohibited phrases, mandatory disclaimers, or tone standards.
              </p>
            </div>

            <div
              onClick={() => onNavigate('facts')}
              className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
            >
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold mb-1">
                <Database className="w-4 h-4" /> 2. Add Approved Facts
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                Log verified product specifications and performance claims with citations.
              </p>
            </div>

            <div
              onClick={() => onNavigate('inspector')}
              className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition cursor-pointer"
            >
              <div className="flex items-center gap-2 text-purple-400 text-sm font-semibold mb-1">
                <FileSearch className="w-4 h-4" /> 3. Inspect Content
              </div>
              <p className="text-xs text-slate-400 leading-normal">
                Paste draft text or upload PDF/DOCX to run deterministic compliance checks.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onLoadSampleWorkspace}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/40 transition flex items-center gap-2 cursor-pointer"
            >
              <HardDriveDownload className="w-4 h-4" />
              <span>Load Fictional Example Workspace</span>
            </button>
            <span className="text-xs text-slate-400">or start entering real rules</span>
          </div>
        </div>
      )}

      {/* Main Content Sections: Recent Reviews & Rule Breakdown */}
      {!isEmpty && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Reviews (2 cols) */}
          <div className="lg:col-span-2 bg-slate-900/80 rounded-xl border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-blue-400" />
                Recently Reviewed Documents
              </h3>
              <button
                onClick={() => onNavigate('inspector')}
                className="text-xs font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                Inspect New Content <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {reviews.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No documents reviewed yet. Launch the Content Inspector to audit your first draft.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-slate-400 uppercase tracking-wider border-b border-slate-800 font-medium">
                    <tr>
                      <th className="py-2.5 px-3">Document Title</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Compliance</th>
                      <th className="py-2.5 px-3">Findings</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {reviews.slice(0, 6).map((r) => {
                      const unresolvedCount = r.findings.filter(
                        (f) =>
                          f.reviewStatus !== 'accepted_correction' && f.reviewStatus !== 'dismissed'
                      ).length;
                      return (
                        <tr
                          key={r.id}
                          className="hover:bg-slate-800/40 transition group cursor-pointer"
                          onClick={() => {
                            onSelectReview(r.id);
                            onNavigate('inspector');
                          }}
                        >
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-200 group-hover:text-blue-400 transition">
                              {r.title}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Updated {new Date(r.updatedAt).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-400 capitalize">
                            {r.contentType.replace(/_/g, ' ')}
                          </td>
                          <td className="py-3 px-3">
                            <WorkflowStatusBadge status={r.status} />
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`font-semibold ${
                                r.complianceScore >= 90
                                  ? 'text-emerald-400'
                                  : r.complianceScore >= 70
                                  ? 'text-amber-400'
                                  : 'text-red-400'
                              }`}
                            >
                              {r.complianceScore}%
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-slate-300 font-medium">{unresolvedCount}</span>
                            <span className="text-slate-400 text-[10px] ml-1">unresolved</span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button className="text-xs text-blue-400 hover:text-blue-300 font-medium underline">
                              Open
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Side Column: Top Violated Rules & Recent Decisions */}
          <div className="space-y-6">
            {/* Top Violated Rules */}
            <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center justify-between">
                <span>Frequently Flagged Rules</span>
                <span className="text-[10px] font-mono text-slate-400">{topViolatedRules.length} Active</span>
              </h3>
              {topViolatedRules.length === 0 ? (
                <p className="text-xs text-slate-400 py-3">No rule violations detected across documents.</p>
              ) : (
                <div className="space-y-2.5">
                  {topViolatedRules.map(([ruleId, item]) => (
                    <div
                      key={ruleId}
                      className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs flex items-center justify-between"
                    >
                      <div className="truncate pr-2">
                        <div className="text-slate-300 font-medium truncate">{item.title}</div>
                        <div className="text-[10px] text-slate-400 capitalize">{item.severity} severity</div>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-xs font-semibold">
                        {item.count}x
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Approval Decisions */}
            <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center justify-between">
                <span>Recent Human Decisions</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </h3>
              {reviewsWithDecisions.length === 0 ? (
                <p className="text-xs text-slate-400 py-3">No formal approvals or rejections logged yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {reviewsWithDecisions.map((r) => (
                    <div
                      key={r.id}
                      className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300 font-medium truncate max-w-[160px]">
                          {r.title}
                        </span>
                        <span
                          className={`font-semibold capitalize text-[11px] ${
                            r.approvalDecision?.decision === 'approved'
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {r.approvalDecision?.decision}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center justify-between">
                        <span>By: {r.approvalDecision?.decidedBy}</span>
                        <span>{new Date(r.approvalDecision!.decidedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
