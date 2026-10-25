/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { ContentReview } from '../../types';
import { exportFindingsCSV, exportReviewReportJSON } from '../reports';

describe('Reports & Data Exporters', () => {
  const dummyReview: ContentReview = {
    id: 'rev_test_1',
    title: 'Test Review Document',
    contentType: 'marketing_email',
    sourceFileName: 'email.txt',
    originalContent: 'Original draft content',
    currentContent: 'Revised draft content',
    versionHistory: [],
    findings: [
      {
        id: 'f1',
        ruleId: 'r1',
        category: 'prohibited_claims',
        severity: 'high',
        matchedText: 'untested claim',
        startIndex: 0,
        endIndex: 14,
        lineNumber: 1,
        contextSnippet: '...untested claim...',
        explanation: 'Do not claim without test proof',
        suggestedReplacement: 'verified feature',
        alternatives: ['verified feature'],
        findingType: 'rule_violation',
        verificationStatus: 'not_applicable',
        supportingFactId: null,
        supportingEvidence: 'Rule #r1',
        sourceDocument: 'Brand Guide',
        sourceSection: '1.2',
        reviewStatus: 'pending',
        dismissReason: null,
        reviewerNotes: null,
      },
    ],
    status: 'changes_required',
    reviewerNotes: 'Please address findings',
    approvalDecision: null,
    complianceScore: 85,
    analysisTimestamp: '2026-10-24T20:00:00Z',
    isStale: false,
    createdAt: '2026-10-24T20:00:00Z',
    updatedAt: '2026-10-24T20:00:00Z',
  };

  it('runs report generators without throw in browser environment', () => {
    // Mock URL and document anchor download in test environment
    const origCreateObjectURL = global.URL.createObjectURL;
    const origRevoke = global.URL.revokeObjectURL;

    global.URL.createObjectURL = () => 'blob:mock-url';
    global.URL.revokeObjectURL = () => {};

    expect(() => {
      exportReviewReportJSON(dummyReview);
      exportFindingsCSV(dummyReview.title, dummyReview.findings);
    }).not.toThrow();

    global.URL.createObjectURL = origCreateObjectURL;
    global.URL.revokeObjectURL = origRevoke;
  });
});
