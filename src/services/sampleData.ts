/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApprovedFact, BrandRule, ContentReview } from '../types';
import { runLocalBrandAudit } from './localAuditor';
import { downloadFile } from './reports';
import {
  DEFAULT_SETTINGS,
  deleteFact,
  deleteReview,
  deleteRule,
  getAllFacts,
  getAllReviews,
  getAllRules,
  logAuditEvent,
  saveFact,
  saveReview,
  saveRule,
} from './storage';

export const SAMPLE_RULES: BrandRule[] = [
  {
    id: 'sample_rule_voice_1',
    version: 1,
    title: 'Brand Voice: Prohibit Overpromising Superlatives',
    description: 'BrandSentinel tone is confident, grounded, and empirical. Never use unsubstantiated superlative marketing claims regarding absolute market dominance.',
    category: 'voice_tone',
    ruleType: 'prohibited',
    matchType: 'whole_word',
    pattern: 'best in the world',
    approvedAlternatives: [
      'designed for enterprise teams',
      'industry-tested solution',
      'high-performance platform',
    ],
    severity: 'critical',
    sourceDocument: 'Brand Governance Manual 2026',
    sourceSection: 'Section 4.1 - Unsubstantiated Claims',
    active: true,
    exceptions: ['quoted customer review', 'third-party award title'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sample_rule_voice_2',
    version: 1,
    title: 'Tone & Style: Avoid Exaggerated Breakthrough Claims',
    description: "Prohibit using dramatic buzzwords like 'revolutionary breakthrough'. Describe empirical features and outcomes instead.",
    category: 'voice_tone',
    ruleType: 'prohibited',
    matchType: 'whole_word',
    pattern: 'revolutionary breakthrough',
    approvedAlternatives: [
      'significant architectural improvement',
      'new engineering release',
      'enhanced capability',
    ],
    severity: 'medium',
    sourceDocument: 'Editorial Style Guide',
    sourceSection: 'Section 2.4 - Tone Discipline',
    active: true,
    exceptions: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sample_rule_claim_1',
    version: 1,
    title: 'Prohibited Claim: Absolute Bug-Free Guarantee',
    description: 'Do not promise 100% bug-free operation or absolute guarantee without verified legal warranty endorsements.',
    category: 'prohibited_claims',
    ruleType: 'prohibited',
    matchType: 'case_insensitive',
    pattern: '100% bug-free',
    approvedAlternatives: [
      'thoroughly tested against enterprise test suites',
      'rigorously validated and automated',
    ],
    severity: 'critical',
    sourceDocument: 'Legal & Risk Governance Standards',
    sourceSection: 'Warranty Disclaimers, Sec 3.2',
    active: true,
    exceptions: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sample_rule_claim_2',
    version: 1,
    title: 'Prohibited Claim: Unaccredited #1 Platform Claim',
    description: "Prohibit claiming '#1 platform' or 'world-leading' unless citing an accredited independent industry benchmark report.",
    category: 'prohibited_claims',
    ruleType: 'prohibited',
    matchType: 'whole_word',
    pattern: '#1 platform',
    approvedAlternatives: [
      'enterprise-grade compliance solution',
      'production-tested brand protection platform',
    ],
    severity: 'critical',
    sourceDocument: 'Fair Advertising & Substantiation Manual',
    sourceSection: 'Section 1.2 - Comparative Claims',
    active: true,
    exceptions: ['Gartner Peer Insights badge', 'verified award quotation'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sample_rule_term_1',
    version: 1,
    title: 'Brand Terminology: Exact Brand Casing "BrandSentinel AI"',
    description: "Always capitalize as 'BrandSentinel AI' in CamelCase. Never write 'Brand Sentinel' as two words or all lowercase 'brandsentinel'.",
    category: 'terminology',
    ruleType: 'prohibited',
    matchType: 'exact',
    pattern: 'Brand Sentinel',
    approvedAlternatives: ['BrandSentinel AI'],
    severity: 'medium',
    sourceDocument: 'Identity & Trademark Standards',
    sourceSection: 'Section 1.1 - Corporate Nomenclature',
    active: true,
    exceptions: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sample_rule_term_2',
    version: 1,
    title: 'Brand Terminology: Preferred Term "Workspace" over "Control Room"',
    description: "Refer to the brand compliance interface as a 'workspace' or 'governance portal' rather than 'control room' or 'cockpit'.",
    category: 'terminology',
    ruleType: 'preferred',
    matchType: 'whole_word',
    pattern: 'control room',
    approvedAlternatives: ['compliance workspace', 'governance portal'],
    severity: 'low',
    sourceDocument: 'Brand Tone & Product Nomenclature',
    sourceSection: 'UI Terminology Dictionary',
    active: true,
    exceptions: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sample_rule_term_3',
    version: 1,
    title: 'Brand Terminology: Use "Deterministic Engine" not "Black Box AI"',
    description: "To maintain customer trust in audit transparency, refer to rule matching as 'deterministic engine' rather than 'black box AI'.",
    category: 'terminology',
    ruleType: 'preferred',
    matchType: 'whole_word',
    pattern: 'black box AI',
    approvedAlternatives: ['deterministic rules engine', 'transparent rule evaluation'],
    severity: 'medium',
    sourceDocument: 'Technical Marketing Standards',
    sourceSection: 'Section 3.1 - Architecture Terminology',
    active: true,
    exceptions: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sample_rule_req_1',
    version: 1,
    title: 'Required Legal Disclaimer: Performance Footnote',
    description: 'Any marketing document or announcement referencing performance metrics must include the mandatory variation disclaimer.',
    category: 'required_disclaimers',
    ruleType: 'required',
    matchType: 'case_insensitive',
    pattern: 'Results may vary based on local workstation specifications.',
    approvedAlternatives: ['Results may vary based on local workstation specifications.'],
    severity: 'high',
    sourceDocument: 'Legal Compliance Playbook 2026',
    sourceSection: 'Mandatory Disclaimers, Sec 5.2',
    active: true,
    exceptions: ['social media posts under 280 characters'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

export const SAMPLE_FACTS: ApprovedFact[] = [
  {
    id: 'sample_fact_privacy_1',
    statement: 'BrandSentinel AI processes all documents 100% locally in browser memory without sending document data to external cloud servers.',
    subject: 'Data Architecture & Privacy',
    sourceDocument: 'Technical Architecture Whitepaper 2026',
    sourceSection: 'Section 2.1 - Local Memory Processing Guarantee',
    verificationStatus: 'verified',
    effectiveDate: '2026-01-01',
    expirationDate: '2028-12-31',
    owner: 'Chief Information Security Officer',
    notes: 'Verified by internal cybersecurity audit; confirms zero egress on document contents.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sample_fact_engine_1',
    statement: 'The deterministic rules engine supports regex, exact phrase, whole-word, and case-insensitive matching.',
    subject: 'Engine Capabilities',
    sourceDocument: 'Product Technical Specification v4',
    sourceSection: 'Section 5.3 - Matching Modalities',
    verificationStatus: 'verified',
    effectiveDate: '2026-01-01',
    expirationDate: null,
    owner: 'Head of Engineering',
    notes: 'Fully covered by Vitest automated test suite.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sample_fact_formats_1',
    statement: 'BrandSentinel AI extracts text client-side from plain text (.txt), Markdown (.md), PDF (.pdf via PDF.js), and Microsoft Word (.docx via Mammoth.js).',
    subject: 'File Support & Parsing',
    sourceDocument: 'Supported Document Matrix 2026',
    sourceSection: 'Section 1.0 - Formats',
    verificationStatus: 'verified',
    effectiveDate: '2026-01-01',
    expirationDate: '2027-12-31',
    owner: 'Principal Product Manager',
    notes: 'Image-only scanned PDFs require digital text layer; OCR limitation noted in documentation.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sample_fact_perf_1',
    statement: 'Audit rule evaluation completes in under 100 milliseconds for standard business copy under 15,000 words.',
    subject: 'Performance Benchmarks',
    sourceDocument: 'Performance Audit Q1 2026',
    sourceSection: 'Table 4.2 - Workstation Benchmarks',
    verificationStatus: 'verified',
    effectiveDate: '2026-01-01',
    expirationDate: '2027-06-30',
    owner: 'Performance Engineering Lead',
    notes: 'Tested on Chrome and Safari desktop runtimes.',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sample_fact_legacy_exp',
    statement: 'Legacy version 1.0 supported only plain text files.',
    subject: 'Historical Capabilities',
    sourceDocument: 'Release Notes 1.0',
    sourceSection: 'Archive Records',
    verificationStatus: 'expired',
    effectiveDate: '2024-01-01',
    expirationDate: '2025-01-01',
    owner: 'Documentation Archivist',
    notes: 'Expired fact. Used to test the claim engine ability to exclude expired evidence from active claims.',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];

export const SAMPLE_DRAFT_TEXT = `Welcome to Brand Sentinel! We are proud to announce the best in the world platform for brand protection.

Our team has built a 100% bug-free solution that operates completely in the the browser. It processes documents faster than any other competitor on earth, giving you guaranteed instant results with zero errors.

Inspect your documents today inside our control room.`;

/**
 * Downloads sample brand guidelines JSON file.
 */
export function downloadSampleGuidelinesJSON(): void {
  const payload = {
    notice: 'FICTIONAL EXAMPLE DATA — FOR DEMONSTRATION AND TESTING ONLY',
    description: 'Fictional Brand Guidelines and Policy Rules for BrandSentinel AI. Contains examples for brand voice, prohibited claims, required disclaimers, and terminology.',
    isFictionalData: true,
    exportedAt: new Date().toISOString(),
    ruleCount: SAMPLE_RULES.length,
    rules: SAMPLE_RULES,
  };
  downloadFile(
    JSON.stringify(payload, null, 2),
    'sample_brand_guidelines.json',
    'application/json'
  );
}

/**
 * Downloads sample approved facts JSON file.
 */
export function downloadSampleFactsJSON(): void {
  const payload = {
    notice: 'FICTIONAL EXAMPLE DATA — FOR DEMONSTRATION AND TESTING ONLY',
    description: 'Fictional Approved Facts Library for BrandSentinel AI. Contains verifiable technical facts, SLA metrics, and historical expiration records for claim testing.',
    isFictionalData: true,
    exportedAt: new Date().toISOString(),
    factCount: SAMPLE_FACTS.length,
    facts: SAMPLE_FACTS,
  };
  downloadFile(
    JSON.stringify(payload, null, 2),
    'sample_approved_facts.json',
    'application/json'
  );
}

/**
 * Loads the complete fictional example workspace into IndexedDB.
 */
export async function loadFictionalExampleWorkspace(
  reviewerName: string = 'Demo Reviewer'
): Promise<void> {
  // Save sample rules
  for (const rule of SAMPLE_RULES) {
    await saveRule(rule);
  }

  // Save sample facts
  for (const fact of SAMPLE_FACTS) {
    await saveFact(fact);
  }

  // Run audit on the sample text to produce actual findings
  const auditResult = await runLocalBrandAudit(
    SAMPLE_DRAFT_TEXT,
    SAMPLE_RULES,
    SAMPLE_FACTS,
    DEFAULT_SETTINGS,
    'sample_review_1',
    reviewerName
  );

  const sampleReview: ContentReview = {
    id: 'sample_review_1',
    title: 'Fictional Example: Q4 Launch Press Announcement',
    contentType: 'press_release',
    sourceFileName: 'q4_press_release_draft.txt',
    originalContent: SAMPLE_DRAFT_TEXT,
    currentContent: SAMPLE_DRAFT_TEXT,
    versionHistory: [
      {
        version: 1,
        content: SAMPLE_DRAFT_TEXT,
        timestamp: new Date().toISOString(),
        author: reviewerName,
        changeNote: 'Initial draft import for demonstration',
        findingsCount: auditResult.findings.length,
        complianceScore: auditResult.complianceScore,
      },
    ],
    findings: auditResult.findings,
    status: 'in_review',
    reviewerNotes:
      'This is a sample document populated by the "Load Example Workspace" action to illustrate findings, risk radar, and approval workflows.',
    approvalDecision: null,
    complianceScore: auditResult.complianceScore,
    analysisTimestamp: new Date().toISOString(),
    isStale: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveReview(sampleReview);

  await logAuditEvent('sample_data_loaded', 'workspace', 'workspace', reviewerName, {
    note: 'User loaded fictional example workspace for evaluation purposes.',
  });
}

/**
 * Clears ONLY fictional example records (prefixed with sample_) from the workspace,
 * preserving any user-configured rules, facts, and documents.
 */
export async function clearFictionalExampleData(
  reviewerName: string = 'Local Auditor'
): Promise<{ deletedRules: number; deletedFacts: number; deletedReviews: number }> {
  const [allRules, allFacts, allReviews] = await Promise.all([
    getAllRules(),
    getAllFacts(),
    getAllReviews(),
  ]);

  let deletedRules = 0;
  for (const r of allRules) {
    if (r.id.startsWith('sample_')) {
      await deleteRule(r.id);
      deletedRules++;
    }
  }

  let deletedFacts = 0;
  for (const f of allFacts) {
    if (f.id.startsWith('sample_')) {
      await deleteFact(f.id);
      deletedFacts++;
    }
  }

  let deletedReviews = 0;
  for (const rev of allReviews) {
    if (rev.id.startsWith('sample_')) {
      await deleteReview(rev.id);
      deletedReviews++;
    }
  }

  await logAuditEvent('workspace_reset', 'workspace', 'workspace', reviewerName, {
    action: 'clear_sample_data',
    deletedRules,
    deletedFacts,
    deletedReviews,
  });

  return { deletedRules, deletedFacts, deletedReviews };
}
