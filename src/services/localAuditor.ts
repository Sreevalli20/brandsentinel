/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppSettings, ApprovedFact, BrandRule, ReviewFinding } from '../types';
import { extractCandidateClaims, verifyClaimsAgainstFacts } from './claimVerificationEngine';
import { evaluateBrandRules } from './rulesEngine';
import { logAuditEvent } from './storage';

export interface AuditRunSummary {
  findings: ReviewFinding[];
  complianceScore: number;
  durationMs: number;
  metrics: {
    totalFindings: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    unverifiedClaimsCount: number;
    contradictedClaimsCount: number;
    missingRequiredCount: number;
  };
  rulesEvaluated: number;
  factsConsulted: number;
  claimsInspected: number;
  engineMode: 'Local Deterministic Rules & Lexical Grounding';
  transparencyNotice: string;
}

/**
 * Calculates a transparent, reproducible compliance score between 0 and 100.
 * Formula:
 * Start at 100.
 * Deduct 25 points per Critical finding.
 * Deduct 15 points per High finding.
 * Deduct 8 points per Medium finding.
 * Deduct 3 points per Low finding.
 * Floor at 0.
 * Resolved findings (accepted or dismissed) do not penalize the score.
 */
export function calculateComplianceScore(findings: ReviewFinding[]): number {
  const unresolved = findings.filter(
    (f) => f.reviewStatus !== 'accepted_correction' && f.reviewStatus !== 'dismissed'
  );

  let deduction = 0;
  for (const f of unresolved) {
    if (f.severity === 'critical') deduction += 25;
    else if (f.severity === 'high') deduction += 15;
    else if (f.severity === 'medium') deduction += 8;
    else if (f.severity === 'low') deduction += 3;
  }

  return Math.max(0, 100 - deduction);
}

/**
 * Local Audit Runner for pre-publication brand compliance inspection.
 * Executes on-premise entirely within the user's browser runtime.
 */
export async function runLocalBrandAudit(
  content: string,
  rules: BrandRule[],
  facts: ApprovedFact[],
  settings: AppSettings,
  reviewId: string = 'ad_hoc',
  actorName: string = 'Local Auditor'
): Promise<AuditRunSummary> {
  const startTime = performance.now();

  // 1. Evaluate Brand Rules & Heuristics
  const rulesResult = evaluateBrandRules(content, rules, settings);

  // 2. Extract Candidate Claims and verify against Approved Facts
  const candidateClaims = extractCandidateClaims(content);
  const factFindings = verifyClaimsAgainstFacts(
    content,
    candidateClaims,
    facts,
    settings.claimMatchingThreshold
  );

  // 3. Merge findings and remove exact duplicate offsets
  const combinedFindings: ReviewFinding[] = [...rulesResult.findings];

  for (const ff of factFindings) {
    // Avoid duplicate finding if same range already has a critical rule violation
    const isRedundant = combinedFindings.some(
      (rf) => Math.abs(rf.startIndex - ff.startIndex) < 5 && rf.severity === 'critical'
    );
    if (!isRedundant) {
      combinedFindings.push(ff);
    }
  }

  // Sort by document position
  combinedFindings.sort((a, b) => a.startIndex - b.startIndex);

  // 4. Calculate metrics
  const criticalCount = combinedFindings.filter((f) => f.severity === 'critical').length;
  const highCount = combinedFindings.filter((f) => f.severity === 'high').length;
  const mediumCount = combinedFindings.filter((f) => f.severity === 'medium').length;
  const lowCount = combinedFindings.filter((f) => f.severity === 'low').length;

  const unverifiedClaimsCount = combinedFindings.filter(
    (f) => f.findingType === 'unverified_claim'
  ).length;
  const contradictedClaimsCount = combinedFindings.filter(
    (f) => f.findingType === 'contradicted_claim'
  ).length;
  const missingRequiredCount = combinedFindings.filter(
    (f) => f.findingType === 'missing_required'
  ).length;

  const complianceScore = calculateComplianceScore(combinedFindings);
  const durationMs = Math.round((performance.now() - startTime) * 10) / 10;

  // Log audit event
  await logAuditEvent('validation_run', reviewId, 'review', actorName, {
    totalFindings: combinedFindings.length,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    complianceScore,
    durationMs,
  });

  return {
    findings: combinedFindings,
    complianceScore,
    durationMs,
    metrics: {
      totalFindings: combinedFindings.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      unverifiedClaimsCount,
      contradictedClaimsCount,
      missingRequiredCount,
    },
    rulesEvaluated: rulesResult.evaluatedRuleCount,
    factsConsulted: facts.length,
    claimsInspected: candidateClaims.length,
    engineMode: 'Local Deterministic Rules & Lexical Grounding',
    transparencyNotice:
      'All inspection performed client-side using deterministic regex, whole-word matching, and local lexical overlap against verified facts. No remote LLMs, third-party APIs, or external telemetry were invoked.',
  };
}
