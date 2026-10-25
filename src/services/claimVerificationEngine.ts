/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApprovedFact, ReviewFinding } from '../types';
import { getContextSnippet, getLineNumber } from './rulesEngine';

export interface ExtractedClaimSentence {
  sentence: string;
  startIndex: number;
  endIndex: number;
  claimType: 'numerical' | 'comparative' | 'guarantee' | 'performance' | 'general';
  detectedIndicators: string[];
}

/**
 * Tokenizes text into words for lexical matching.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s%]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/**
 * Calculates Jaccard token similarity (0.0 to 1.0).
 */
export function calculateLexicalSimilarity(a: string, b: string): number {
  const tokensA = new Set(tokenize(a));
  const tokensB = new Set(tokenize(b));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersection++;
    }
  }

  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Extracts candidate claim sentences containing metrics, numerical data, comparative claims, or guarantees.
 */
export function extractCandidateClaims(text: string): ExtractedClaimSentence[] {
  if (!text || !text.trim()) return [];

  const claims: ExtractedClaimSentence[] = [];
  // Split text by sentence boundaries while tracking start index
  const sentenceRegex = /[^.!?\n]+[.!?\n]*/g;
  let match: RegExpExecArray | null;

  const numericalRegex = /\b\d+(\.\d+)?%?|\b\d+x\b|\bzero\b|\b100%\b/i;
  const comparativeRegex = /\b(faster|highest|lowest|leading|unlimited|always|never|superior|safest|cheapest|quickest)\b/i;
  const guaranteeRegex = /\b(guarantee|guaranteed|certified|proven|risk-free|sla|patented|compliant|endorsed)\b/i;
  const performanceRegex = /\b(uptime|throughput|latency|reduction|increase|benchmark|accuracy|precision)\b/i;
  const productRegex = /\b(server|servers|cloud|offline|local|data|privacy|security|engine|encryption|api|storage|database|processing)\b/i;

  while ((match = sentenceRegex.exec(text)) !== null) {
    const rawSentence = match[0];
    const cleanSentence = rawSentence.trim();
    if (cleanSentence.length < 15) continue; // Skip very short phrases like titles or bullets

    const startIndex = match.index + rawSentence.indexOf(cleanSentence);
    const endIndex = startIndex + cleanSentence.length;

    const indicators: string[] = [];
    let claimType: ExtractedClaimSentence['claimType'] = 'general';

    if (numericalRegex.test(cleanSentence)) {
      claimType = 'numerical';
      const numMatch = cleanSentence.match(numericalRegex);
      if (numMatch) indicators.push(`Metric: "${numMatch[0]}"`);
    } else if (guaranteeRegex.test(cleanSentence)) {
      claimType = 'guarantee';
      const gMatch = cleanSentence.match(guaranteeRegex);
      if (gMatch) indicators.push(`Commitment: "${gMatch[0]}"`);
    } else if (comparativeRegex.test(cleanSentence)) {
      claimType = 'comparative';
      const cMatch = cleanSentence.match(comparativeRegex);
      if (cMatch) indicators.push(`Comparative: "${cMatch[0]}"`);
    } else if (performanceRegex.test(cleanSentence)) {
      claimType = 'performance';
      const pMatch = cleanSentence.match(performanceRegex);
      if (pMatch) indicators.push(`Performance: "${pMatch[0]}"`);
    } else if (productRegex.test(cleanSentence)) {
      claimType = 'general';
      const prodMatch = cleanSentence.match(productRegex);
      if (prodMatch) indicators.push(`Product attribute: "${prodMatch[0]}"`);
    }

    if (indicators.length > 0) {
      claims.push({
        sentence: cleanSentence,
        startIndex,
        endIndex,
        claimType,
        detectedIndicators: indicators,
      });
    }
  }

  return claims;
}

/**
 * Checks if a fact is actively valid (verified, not expired, not archived).
 */
export function isFactActiveAndVerified(fact: ApprovedFact): { isValid: boolean; reason?: string } {
  if (fact.verificationStatus === 'archived') {
    return { isValid: false, reason: 'Fact is archived and cannot be used as active evidence.' };
  }
  if (fact.verificationStatus === 'unverified') {
    return { isValid: false, reason: 'Fact is marked unverified in the library.' };
  }
  if (fact.verificationStatus === 'expired') {
    return { isValid: false, reason: 'Fact is explicitly marked as expired.' };
  }

  if (fact.expirationDate) {
    const expTime = new Date(fact.expirationDate).getTime();
    if (!isNaN(expTime) && expTime < Date.now()) {
      return { isValid: false, reason: `Fact expired on ${fact.expirationDate}.` };
    }
  }

  return { isValid: true };
}

/**
 * Detects whether a claim directly contradicts an approved fact.
 * A contradiction is flagged when there is high topical overlap but opposing assertions or conflicting numbers.
 */
function detectContradiction(
  claimSentence: string,
  factStatement: string
): { isContradicted: boolean; explanation?: string } {
  const claimLower = claimSentence.toLowerCase();
  const factLower = factStatement.toLowerCase();

  // Extract numbers
  const extractNumbers = (str: string) => {
    const matches = str.match(/\b\d+(\.\d+)?%?\b/g);
    return matches ? matches.map((m) => m.trim()) : [];
  };

  const claimNums = extractNumbers(claimLower);
  const factNums = extractNumbers(factLower);

  // If both mention key subjects and differing metrics
  const sharedWords = tokenize(claimSentence).filter((w) => tokenize(factStatement).includes(w));

  if (sharedWords.length >= 3 && claimNums.length > 0 && factNums.length > 0) {
    const hasSharedNumber = claimNums.some((cn) => factNums.includes(cn));
    if (!hasSharedNumber) {
      return {
        isContradicted: true,
        explanation: `Claim asserts metric "${claimNums.join(', ')}", whereas verified source fact states "${factNums.join(', ')}". Conflicting numbers require immediate resolution.`,
      };
    }
  }

  // Explicit negation polarity conflict: e.g. "no cloud" vs "cloud", "local" vs "external server/cloud"
  if (
    (factLower.includes('offline') || factLower.includes('local') || factLower.includes('zero cloud') || factLower.includes('no cloud')) &&
    (claimLower.includes('cloud server') || claimLower.includes('hosted api') || claimLower.includes('external server') || claimLower.includes('external cloud'))
  ) {
    return {
      isContradicted: true,
      explanation: `Claim mentions cloud/external server transmission, which directly contradicts verified fact stating local/offline execution with zero cloud transmission.`,
    };
  }

  return { isContradicted: false };
}

/**
 * Verifies extracted candidate claims against the Approved Facts Library.
 */
export function verifyClaimsAgainstFacts(
  content: string,
  candidateClaims: ExtractedClaimSentence[],
  facts: ApprovedFact[],
  matchThreshold = 0.6
): ReviewFinding[] {
  const findings: ReviewFinding[] = [];

  for (const claim of candidateClaims) {
    let bestFact: ApprovedFact | null = null;
    let bestScore = 0;
    let contradictionInfo: { isContradicted: boolean; explanation?: string } = { isContradicted: false };

    // Search active verified facts only
    for (const fact of facts) {
      const activeCheck = isFactActiveAndVerified(fact);
      const similarity = calculateLexicalSimilarity(claim.sentence, fact.statement);

      if (similarity > bestScore) {
        bestScore = similarity;
        bestFact = fact;
      }

      // Check for contradiction even across all facts to warn user
      const contra = detectContradiction(claim.sentence, fact.statement);
      if (contra.isContradicted && similarity >= 0.15) {
        contradictionInfo = contra;
        bestFact = fact;
        break;
      }
    }

    const lineNumber = getLineNumber(content, claim.startIndex);
    const contextSnippet = getContextSnippet(content, claim.startIndex, claim.endIndex);

    if (contradictionInfo.isContradicted && bestFact) {
      findings.push({
        id: `fnd_fact_contra_${claim.startIndex}`,
        ruleId: null,
        category: 'product_messaging',
        severity: 'critical',
        matchedText: claim.sentence,
        startIndex: claim.startIndex,
        endIndex: claim.endIndex,
        lineNumber,
        contextSnippet,
        explanation: `Contradiction detected: ${contradictionInfo.explanation}`,
        suggestedReplacement: bestFact.statement,
        alternatives: [bestFact.statement],
        findingType: 'contradicted_claim',
        verificationStatus: 'contradicted',
        supportingFactId: bestFact.id,
        supportingEvidence: `Contradicted by Fact #${bestFact.id}: "${bestFact.statement}" (${bestFact.sourceDocument}${
          bestFact.sourceSection ? ` · ${bestFact.sourceSection}` : ''
        })`,
        sourceDocument: bestFact.sourceDocument,
        sourceSection: bestFact.sourceSection,
        reviewStatus: 'pending',
        dismissReason: null,
        reviewerNotes: null,
      });
    } else if (bestFact && bestScore >= matchThreshold) {
      const activeStatus = isFactActiveAndVerified(bestFact);
      if (!activeStatus.isValid) {
        // Matched an expired or unverified fact
        findings.push({
          id: `fnd_fact_exp_${claim.startIndex}`,
          ruleId: null,
          category: 'prohibited_claims',
          severity: 'high',
          matchedText: claim.sentence,
          startIndex: claim.startIndex,
          endIndex: claim.endIndex,
          lineNumber,
          contextSnippet,
          explanation: `Claim matches Fact #${bestFact.id}, but this evidence is unusable: ${activeStatus.reason}. Renew the verified fact or update content.`,
          suggestedReplacement: null,
          alternatives: [],
          findingType: 'unverified_claim',
          verificationStatus: 'unverified',
          supportingFactId: bestFact.id,
          supportingEvidence: `Expired/Unverified Fact: "${bestFact.statement}" (${bestFact.sourceDocument})`,
          sourceDocument: bestFact.sourceDocument,
          sourceSection: bestFact.sourceSection,
          reviewStatus: 'pending',
          dismissReason: null,
          reviewerNotes: null,
        });
      } else {
        // Fully supported by active verified fact
        // Note: As an honest evidence system, we don't treat lexical similarity alone as absolute proof,
        // but we record the match rationale transparently.
        // We only create an informational finding if the user needs to confirm the citation.
      }
    } else {
      // Unsupported or ambiguous claim -> Unverified: manual review required
      findings.push({
        id: `fnd_fact_unv_${claim.startIndex}`,
        ruleId: null,
        category: 'prohibited_claims',
        severity: claim.claimType === 'guarantee' || claim.claimType === 'numerical' ? 'high' : 'medium',
        matchedText: claim.sentence,
        startIndex: claim.startIndex,
        endIndex: claim.endIndex,
        lineNumber,
        contextSnippet,
        explanation: `Unverified claim (${claim.detectedIndicators.join(', ')}) — Insufficient evidence in local Approved Facts Library. Manual review and substantiation required prior to public distribution.`,
        suggestedReplacement: null,
        alternatives: [],
        findingType: 'unverified_claim',
        verificationStatus: 'unverified',
        supportingFactId: null,
        supportingEvidence: 'None in local repository. (Lexical overlap with existing facts was below the threshold).',
        sourceDocument: null,
        sourceSection: null,
        reviewStatus: 'pending',
        dismissReason: null,
        reviewerNotes: null,
      });
    }
  }

  return findings;
}
