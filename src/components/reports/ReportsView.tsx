/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import {
  ApprovedFact,
  AuditEvent,
  BrandRule,
  ContentReview,
} from '../../types';
import {
  exportApprovedFactsJSON,
  exportAuditHistoryJSON,
  exportBrandRulesJSON,
  exportFindingsCSV,
  exportReviewReportJSON,
  exportReviewsSummaryCSV,
  exportRevisedContent,
  triggerPrintSummary,
} from '../../services/reports';
import { SeverityBadge, WorkflowStatusBadge } from '../common/Badge';

interface ReportsViewProps {
  reviews: ContentReview[];
  rules: BrandRule[];
  facts: ApprovedFact[];
  auditEvents: AuditEvent[];
}

export function ReportsView({ reviews, rules, facts, auditEvents }: ReportsViewProps) {
  const [selectedReviewId, setSelectedReviewId] = useState<string>(reviews[0]?.id || '');
  const activeReview = reviews.find((r) => r.id === selectedReviewId) || reviews[0] || null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Compliance Reports & Data Exports
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              Export Center
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Generate printable executive summaries, download audit reports in JSON, export findings in CSV, or download cleaned content.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={triggerPrintSummary}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Printable Summary</span>
          </button>
        </div>
      </div>

      {/* Bulk Global Exports Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>All Content Reviews (CSV)</span>
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-[11px] text-slate-400">
            Export a tabular summary of all {reviews.length} reviews, status, score, and decision records.
          </p>
          <button
            onClick={() => exportReviewsSummaryCSV(reviews)}
            disabled={reviews.length === 0}
            className="w-full mt-2 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-3 h-3 text-emerald-400" />
            <span>Download All Reviews CSV</span>
          </button>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Brand Rules Repository (JSON)</span>
            <FileCheck className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-[11px] text-slate-400">
            Backup all {rules.length} configured brand rules with alternatives, severity, and citations.
          </p>
          <button
            onClick={() => exportBrandRulesJSON(rules)}
            disabled={rules.length === 0}
            className="w-full mt-2 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-3 h-3 text-blue-400" />
            <span>Download Rules JSON</span>
          </button>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Approved Facts Library (JSON)</span>
            <FileCheck className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-[11px] text-slate-400">
            Export {facts.length} verified factual evidence statements, owners, and citations.
          </p>
          <button
            onClick={() => exportApprovedFactsJSON(facts)}
            disabled={facts.length === 0}
            className="w-full mt-2 py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-3 h-3 text-purple-400" />
            <span>Download Facts JSON</span>
          </button>
        </div>
      </div>

      {/* Single Document Report Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 no-print">
          <div>
            <h3 className="text-sm font-semibold text-slate-200">
              Document Compliance Audit Dossier
            </h3>
            <p className="text-xs text-slate-400">Select a document to inspect and export full evidence.</p>
          </div>

          {reviews.length > 0 && (
            <select
              value={selectedReviewId}
              onChange={(e) => setSelectedReviewId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-hidden"
            >
              {reviews.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.complianceScore}%)
                </option>
              ))}
            </select>
          )}
        </div>

        {!activeReview ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No document available for reporting.
          </div>
        ) : (
          <div className="space-y-6 print:text-black">
            {/* Dossier Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800/80">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
                  BrandSentinel Compliance Report
                </span>
                <h2 className="text-lg font-bold text-white mt-0.5">{activeReview.title}</h2>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                  <WorkflowStatusBadge status={activeReview.status} />
                  <span>Type: <strong className="text-slate-300 capitalize">{activeReview.contentType.replace(/_/g, ' ')}</strong></span>
                  <span>·</span>
                  <span>Audit Date: {new Date(activeReview.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-3xl font-extrabold text-white">
                  {activeReview.complianceScore}%
                </div>
                <div className="text-[10px] text-slate-400 uppercase">Compliance Index</div>
              </div>
            </div>

            {/* Document Specific Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 no-print">
              <button
                onClick={() => exportReviewReportJSON(activeReview)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Review JSON</span>
              </button>

              <button
                onClick={() => exportFindingsCSV(activeReview.title, activeReview.findings)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export Findings CSV</span>
              </button>

              <button
                onClick={() => exportRevisedContent(activeReview.currentContent, activeReview.title, false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Download Revised .txt</span>
              </button>
            </div>

            {/* Methodology & Score Formula Explanation */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1.5">
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                Determinism & Scoring Methodology
              </div>
              <p className="text-slate-400 leading-relaxed">
                Score Formula: Starting base of 100 points. Penalties applied per unresolved finding: Critical (-25), High (-15), Medium (-8), Low (-3). Bounded between 0 and 100.
                This score represents rule compliance alignment and does not constitute a legal warranty.
              </p>
            </div>

            {/* Findings Summary Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                Audit Findings ({activeReview.findings.length})
              </h4>
              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase font-medium">
                    <tr>
                      <th className="py-2.5 px-3">Severity</th>
                      <th className="py-2.5 px-3">Matched Text</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Violation Explanation</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {activeReview.findings.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          Zero policy violations detected.
                        </td>
                      </tr>
                    ) : (
                      activeReview.findings.map((f) => (
                        <tr key={f.id} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3">
                            <SeverityBadge severity={f.severity} />
                          </td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-red-300">
                            "{f.matchedText}"
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 capitalize">
                            {f.category.replace(/_/g, ' ')}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 max-w-sm">{f.explanation}</td>
                          <td className="py-2.5 px-3 text-slate-400 capitalize">
                            {f.reviewStatus.replace(/_/g, ' ')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Decision & Approval Stamp */}
            {activeReview.approvalDecision && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                <div className="font-semibold text-slate-200">Formal Human Review Decision:</div>
                <div className="text-slate-300">
                  Document status:{' '}
                  <strong className="text-emerald-400 uppercase">
                    {activeReview.approvalDecision.decision}
                  </strong>{' '}
                  by {activeReview.approvalDecision.decidedBy} on{' '}
                  {new Date(activeReview.approvalDecision.decidedAt).toLocaleString()}
                </div>
                {activeReview.approvalDecision.overrideReason && (
                  <div className="text-amber-300">
                    <strong>Recorded Override Rationale:</strong>{' '}
                    {activeReview.approvalDecision.overrideReason}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
