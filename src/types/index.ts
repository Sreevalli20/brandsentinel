/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

export type RuleCategory =
  | 'voice_tone'
  | 'prohibited_claims'
  | 'required_disclaimers'
  | 'terminology'
  | 'legal_regulatory'
  | 'accessibility'
  | 'formatting_style'
  | 'product_messaging';

export type MatchType = 'exact' | 'case_insensitive' | 'whole_word' | 'regex';

export type RuleType = 'prohibited' | 'required' | 'preferred';

export interface BrandRule {
  id: string;
  version: number;
  title: string;
  description: string;
  category: RuleCategory;
  ruleType: RuleType;
  matchType: MatchType;
  pattern: string; // The phrase, keyword, or regex
  approvedAlternatives: string[];
  severity: SeverityLevel;
  sourceDocument: string; // e.g. "Brand Guidelines v3.4"
  sourceSection: string; // e.g. "Section 4.1 - Legal Disclaimers"
  active: boolean;
  exceptions: string[]; // Phrases or substrings where rule is ignored
  createdAt: string;
  updatedAt: string;
}

export type FactVerificationStatus = 'verified' | 'unverified' | 'expired' | 'archived';

export interface ApprovedFact {
  id: string;
  statement: string;
  subject: string;
  sourceDocument: string;
  sourceSection: string;
  verificationStatus: FactVerificationStatus;
  effectiveDate: string; // YYYY-MM-DD
  expirationDate: string | null; // YYYY-MM-DD or null
  owner: string; // e.g., "Legal Compliance Officer"
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type ContentType =
  | 'social_media'
  | 'marketing_email'
  | 'advertisement'
  | 'website_copy'
  | 'product_description'
  | 'campaign_material'
  | 'business_doc'
  | 'press_release'
  | 'other';

export type WorkflowStatus =
  | 'draft'
  | 'in_review'
  | 'changes_required'
  | 'pending_approval'
  | 'approved'
  | 'rejected';

export type FindingStatus =
  | 'pending'
  | 'accepted_correction'
  | 'dismissed'
  | 'escalated'
  | 'reviewed';

export type FindingVerificationStatus =
  | 'supported'
  | 'contradicted'
  | 'unverified'
  | 'not_applicable';

export interface ReviewFinding {
  id: string;
  ruleId: string | null;
  category: RuleCategory | 'fact_check' | 'tone_heuristic' | 'duplicate_wording';
  severity: SeverityLevel;
  matchedText: string;
  startIndex: number;
  endIndex: number;
  lineNumber: number;
  contextSnippet: string;
  explanation: string;
  suggestedReplacement: string | null;
  alternatives: string[];
  findingType:
    | 'rule_violation'
    | 'missing_required'
    | 'unverified_claim'
    | 'contradicted_claim'
    | 'tone_heuristic'
    | 'duplicate_wording';
  verificationStatus: FindingVerificationStatus;
  supportingFactId: string | null;
  supportingEvidence: string | null;
  sourceDocument: string | null;
  sourceSection: string | null;
  reviewStatus: FindingStatus;
  dismissReason: string | null;
  reviewerNotes: string | null;
}

export interface ContentVersion {
  version: number;
  content: string;
  timestamp: string;
  author: string;
  changeNote?: string;
  findingsCount: number;
  complianceScore: number;
}

export interface ApprovalDecision {
  decision: 'approved' | 'rejected';
  decidedBy: string;
  decidedAt: string;
  overrideReason?: string;
  notes?: string;
  unresolvedCriticalCount: number;
  unresolvedHighCount: number;
}

export interface ContentReview {
  id: string;
  title: string;
  contentType: ContentType;
  sourceFileName: string | null;
  originalContent: string;
  currentContent: string;
  versionHistory: ContentVersion[];
  findings: ReviewFinding[];
  status: WorkflowStatus;
  reviewerNotes: string;
  approvalDecision: ApprovalDecision | null;
  complianceScore: number; // 0 to 100 calculated deterministically
  analysisTimestamp: string | null;
  isStale: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AuditEventType =
  | 'review_created'
  | 'content_modified'
  | 'validation_run'
  | 'finding_reviewed'
  | 'suggestion_applied'
  | 'suggestion_dismissed'
  | 'approval_requested'
  | 'approval_granted'
  | 'approval_denied'
  | 'rule_created'
  | 'rule_modified'
  | 'rule_deleted'
  | 'fact_created'
  | 'fact_modified'
  | 'fact_deleted'
  | 'export_performed'
  | 'workspace_reset'
  | 'sample_data_loaded';

export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  recordId: string;
  recordType: 'review' | 'rule' | 'fact' | 'workspace' | 'export';
  actor: string;
  details: Record<string, any>;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  reviewerDisplayName: string;
  reviewerRole: string;
  maxDocSizeBytes: number;
  defaultSeverityThreshold: SeverityLevel;
  claimMatchingThreshold: number; // 0.5 to 0.95 lexical similarity
  toneChecks: {
    exclamationMarkLimit: number;
    excessiveCapsWordsThreshold: number;
    flagUnverifiedSuperlatives: boolean;
    flagRepeatedPhrases: boolean;
    preferredFormality: 'casual' | 'balanced' | 'formal';
  };
  autoRevalidateOnEdit: boolean;
}

export type NavigationPage =
  | 'dashboard'
  | 'inspector'
  | 'guidelines'
  | 'facts'
  | 'terminology'
  | 'findings'
  | 'workflow'
  | 'audit'
  | 'reports'
  | 'settings';
