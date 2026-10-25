/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApprovedFact, AuditEvent, BrandRule, ContentReview, ReviewFinding } from '../types';

/**
 * Triggers a native browser file download.
 */
export function downloadFile(content: string, fileName: string, contentType: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Escapes fields for CSV format.
 */
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Exports a Content Review report in JSON.
 */
export function exportReviewReportJSON(review: ContentReview): void {
  const data = {
    exportType: 'BrandSentinel_Review_Report',
    exportedAt: new Date().toISOString(),
    review,
    methodology: {
      engine: 'BrandSentinel Local Deterministic Rules Engine',
      externalApiUsed: false,
      scoringFormula:
        'Score = 100 - (Critical x 25 + High x 15 + Medium x 8 + Low x 3) [Floor: 0]',
      disclaimer:
        'This automated compliance report reflects alignment against configured brand policies and approved facts. It does not constitute formal legal counsel.',
    },
  };
  const jsonStr = JSON.stringify(data, null, 2);
  downloadFile(jsonStr, `brandsentinel-review-${review.id}.json`, 'application/json');
}

/**
 * Exports review findings in CSV format.
 */
export function exportFindingsCSV(reviewTitle: string, findings: ReviewFinding[]): void {
  const headers = [
    'Finding ID',
    'Severity',
    'Category',
    'Line Number',
    'Matched Text',
    'Suggested Replacement',
    'Explanation',
    'Verification Status',
    'Supporting Evidence / Rule',
    'Source Document',
    'Review Status',
    'Dismissal Reason',
    'Reviewer Notes',
  ];

  const rows = findings.map((f) => [
    escapeCsv(f.id),
    escapeCsv(f.severity.toUpperCase()),
    escapeCsv(f.category),
    escapeCsv(f.lineNumber),
    escapeCsv(f.matchedText),
    escapeCsv(f.suggestedReplacement || 'N/A'),
    escapeCsv(f.explanation),
    escapeCsv(f.verificationStatus),
    escapeCsv(f.supportingEvidence || 'None'),
    escapeCsv(f.sourceDocument ? `${f.sourceDocument} (${f.sourceSection || ''})` : 'N/A'),
    escapeCsv(f.reviewStatus),
    escapeCsv(f.dismissReason || ''),
    escapeCsv(f.reviewerNotes || ''),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const safeName = reviewTitle.toLowerCase().replace(/[^a-z0-9]/g, '_');
  downloadFile(csvContent, `findings_${safeName}_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Exports review summary list in CSV format.
 */
export function exportReviewsSummaryCSV(reviews: ContentReview[]): void {
  const headers = [
    'Review ID',
    'Title',
    'Content Type',
    'Workflow Status',
    'Compliance Score',
    'Total Findings',
    'Critical Findings',
    'High Findings',
    'Medium Findings',
    'Low Findings',
    'Approval Decision',
    'Decided By',
    'Decided At',
    'Created At',
    'Updated At',
  ];

  const rows = reviews.map((r) => {
    const crit = r.findings.filter((f) => f.severity === 'critical').length;
    const high = r.findings.filter((f) => f.severity === 'high').length;
    const med = r.findings.filter((f) => f.severity === 'medium').length;
    const low = r.findings.filter((f) => f.severity === 'low').length;

    return [
      escapeCsv(r.id),
      escapeCsv(r.title),
      escapeCsv(r.contentType),
      escapeCsv(r.status),
      escapeCsv(r.complianceScore),
      escapeCsv(r.findings.length),
      escapeCsv(crit),
      escapeCsv(high),
      escapeCsv(med),
      escapeCsv(low),
      escapeCsv(r.approvalDecision ? r.approvalDecision.decision : 'None'),
      escapeCsv(r.approvalDecision ? r.approvalDecision.decidedBy : ''),
      escapeCsv(r.approvalDecision ? r.approvalDecision.decidedAt : ''),
      escapeCsv(r.createdAt),
      escapeCsv(r.updatedAt),
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadFile(csvContent, `brandsentinel_reviews_summary_${Date.now()}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Exports Brand Rules in JSON.
 */
export function exportBrandRulesJSON(rules: BrandRule[]): void {
  const data = {
    exportType: 'BrandSentinel_Brand_Rules',
    exportedAt: new Date().toISOString(),
    ruleCount: rules.length,
    rules,
  };
  downloadFile(JSON.stringify(data, null, 2), `brand_guidelines_rules_${Date.now()}.json`, 'application/json');
}

/**
 * Exports Approved Facts in JSON.
 */
export function exportApprovedFactsJSON(facts: ApprovedFact[]): void {
  const data = {
    exportType: 'BrandSentinel_Approved_Facts',
    exportedAt: new Date().toISOString(),
    factCount: facts.length,
    facts,
  };
  downloadFile(JSON.stringify(data, null, 2), `approved_facts_library_${Date.now()}.json`, 'application/json');
}

/**
 * Exports Audit History in JSON.
 */
export function exportAuditHistoryJSON(auditEvents: AuditEvent[]): void {
  const data = {
    exportType: 'BrandSentinel_Audit_Log',
    exportedAt: new Date().toISOString(),
    eventCount: auditEvents.length,
    disclaimer:
      'Browser-local audit logs. These records are stored inside local browser IndexedDB and do not represent a centralized cryptographically signed enterprise ledger.',
    events: auditEvents,
  };
  downloadFile(JSON.stringify(data, null, 2), `audit_history_${Date.now()}.json`, 'application/json');
}

/**
 * Exports Revised Content as TXT or MD.
 */
export function exportRevisedContent(content: string, fileName: string, asMarkdown = false): void {
  const ext = asMarkdown ? 'md' : 'txt';
  const mime = asMarkdown ? 'text/markdown' : 'text/plain';
  downloadFile(content, `${fileName}_revised.${ext}`, mime);
}

/**
 * Triggers native browser print view for printable review summary.
 */
export function triggerPrintSummary(): void {
  window.print();
}
