/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { ApprovedFact } from '../../types';
import {
  calculateLexicalSimilarity,
  extractCandidateClaims,
  isFactActiveAndVerified,
  verifyClaimsAgainstFacts,
} from '../claimVerificationEngine';

describe('Claim Verification and Evidence Grounding', () => {
  const verifiedFact: ApprovedFact = {
    id: 'fact_1',
    statement: 'BrandSentinel AI processes all documents locally in browser memory with zero cloud transmission.',
    subject: 'Privacy',
    sourceDocument: 'Architecture Whitepaper',
    sourceSection: 'Sec 2.1',
    verificationStatus: 'verified',
    effectiveDate: '2026-01-01',
    expirationDate: '2028-01-01',
    owner: 'CISO',
    notes: 'Verified',
    createdAt: '',
    updatedAt: '',
  };

  const expiredFact: ApprovedFact = {
    id: 'fact_expired',
    statement: 'BrandSentinel offers 99.5% uptime guarantees.',
    subject: 'Uptime',
    sourceDocument: '2024 SLA',
    sourceSection: 'Sec 1',
    verificationStatus: 'expired',
    effectiveDate: '2024-01-01',
    expirationDate: '2025-01-01',
    owner: 'Ops Lead',
    notes: 'Expired policy',
    createdAt: '',
    updatedAt: '',
  };

  it('calculates lexical similarity accurately between matching token sets', () => {
    const simHigh = calculateLexicalSimilarity(
      'BrandSentinel AI processes all documents locally in browser memory',
      'BrandSentinel AI processes all documents locally in browser memory with zero cloud transmission'
    );
    expect(simHigh).toBeGreaterThan(0.6);

    const simLow = calculateLexicalSimilarity(
      'Our team enjoys drinking artisanal coffee in the morning',
      'BrandSentinel AI processes all documents locally in browser memory'
    );
    expect(simLow).toBeLessThan(0.1);
  });

  it('extracts candidate sentences containing metrics, guarantees, or comparatives', () => {
    const text =
      'BrandSentinel AI is an offline tool. It provides 100% data privacy with guaranteed zero data leaks. Also it is faster than cloud alternatives.';
    const claims = extractCandidateClaims(text);

    expect(claims.length).toBeGreaterThanOrEqual(2);
    const hasMetric = claims.some((c) => c.sentence.includes('100%'));
    const hasComparative = claims.some((c) => c.sentence.includes('faster'));
    expect(hasMetric).toBe(true);
    expect(hasComparative).toBe(true);
  });

  it('disallows expired facts from being used as active approved evidence', () => {
    const status = isFactActiveAndVerified(expiredFact);
    expect(status.isValid).toBe(false);
    expect(status.reason).toBeDefined();
  });

  it('flags unverified claims for manual review when no approved fact matches', () => {
    const text = 'Our platform delivers a 400% increase in productivity with zero effort.';
    const candidateClaims = extractCandidateClaims(text);
    const findings = verifyClaimsAgainstFacts(text, candidateClaims, [verifiedFact], 0.7);

    expect(findings.length).toBeGreaterThan(0);
    const unv = findings.find((f) => f.findingType === 'unverified_claim');
    expect(unv).toBeDefined();
    expect(unv?.verificationStatus).toBe('unverified');
    expect(unv?.explanation).toContain('Unverified claim');
  });

  it('flags contradiction when claim directly contradicts an approved fact', () => {
    const text = 'BrandSentinel sends documents to external cloud server for heavy processing.';
    const candidateClaims = extractCandidateClaims(text);
    const findings = verifyClaimsAgainstFacts(text, candidateClaims, [verifiedFact], 0.3);

    const contra = findings.find((f) => f.findingType === 'contradicted_claim');
    expect(contra).toBeDefined();
    expect(contra?.severity).toBe('critical');
    expect(contra?.verificationStatus).toBe('contradicted');
  });
});
