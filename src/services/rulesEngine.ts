/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppSettings, BrandRule, ReviewFinding } from '../types';

export interface RuleEvaluationResult {
  findings: ReviewFinding[];
  evaluatedRuleCount: number;
  activeRuleCount: number;
  metrics: {
    totalFindings: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
}

/**
 * Calculates line number (1-indexed) given a string and character index.
 */
export function getLineNumber(text: string, index: number): number {
  if (index <= 0) return 1;
  const sub = text.substring(0, index);
  return (sub.match(/\n/g) || []).length + 1;
}

/**
 * Generates an excerpt snippet with contextual ellipses around a matched range.
 */
export function getContextSnippet(text: string, start: number, end: number, contextLen = 45): string {
  const contextStart = Math.max(0, start - contextLen);
  const contextEnd = Math.min(text.length, end + contextLen);

  const prefix = contextStart > 0 ? '...' : '';
  const suffix = contextEnd < text.length ? '...' : '';

  return `${prefix}${text.substring(contextStart, contextEnd).replace(/\s+/g, ' ')}${suffix}`;
}

/**
 * Tests whether a matched range falls inside an exception context.
 */
function isCoveredByException(text: string, start: number, end: number, exceptions: string[]): boolean {
  if (!exceptions || exceptions.length === 0) return false;

  const windowStart = Math.max(0, start - 100);
  const windowEnd = Math.min(text.length, end + 100);
  const surrounding = text.substring(windowStart, windowEnd).toLowerCase();

  return exceptions.some((exc) => exc.trim() && surrounding.includes(exc.trim().toLowerCase()));
}

/**
 * Escapes regex special characters.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Core Deterministic Rules Engine
 */
export function evaluateBrandRules(
  content: string,
  rules: BrandRule[],
  settings?: AppSettings
): RuleEvaluationResult {
  const findings: ReviewFinding[] = [];
  const activeRules = rules.filter((r) => r.active);

  if (!content || !content.trim()) {
    return {
      findings: [],
      evaluatedRuleCount: 0,
      activeRuleCount: activeRules.length,
      metrics: {
        totalFindings: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
      },
    };
  }

  // 1. Evaluate configured Brand Rules
  for (const rule of activeRules) {
    if (!rule.pattern || !rule.pattern.trim()) continue;

    if (rule.ruleType === 'required') {
      // Required terminology / disclaimers: must be present in the document
      let isPresent = false;
      const pattern = rule.pattern.trim();

      if (rule.matchType === 'exact') {
        isPresent = content.includes(pattern);
      } else if (rule.matchType === 'case_insensitive') {
        isPresent = content.toLowerCase().includes(pattern.toLowerCase());
      } else if (rule.matchType === 'whole_word') {
        const regex = new RegExp(`\\b${escapeRegex(pattern)}\\b`, 'i');
        isPresent = regex.test(content);
      } else if (rule.matchType === 'regex') {
        try {
          const regex = new RegExp(pattern, 'i');
          isPresent = regex.test(content);
        } catch {
          isPresent = content.includes(pattern);
        }
      }

      if (!isPresent) {
        findings.push({
          id: `fnd_req_${rule.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          ruleId: rule.id,
          category: rule.category,
          severity: rule.severity,
          matchedText: '[Missing Required Text]',
          startIndex: 0,
          endIndex: 0,
          lineNumber: 1,
          contextSnippet: `Required text omitted from document: "${pattern}"`,
          explanation: `The policy "${rule.title}" mandates that this required statement or disclaimer must be included in the content.`,
          suggestedReplacement: pattern,
          alternatives: rule.approvedAlternatives || [],
          findingType: 'missing_required',
          verificationStatus: 'not_applicable',
          supportingFactId: null,
          supportingEvidence: `Configured Rule: ${rule.title} (${rule.sourceDocument || 'Brand Policy'}${
            rule.sourceSection ? ` · ${rule.sourceSection}` : ''
          })`,
          sourceDocument: rule.sourceDocument || 'Brand Guidelines',
          sourceSection: rule.sourceSection || null,
          reviewStatus: 'pending',
          dismissReason: null,
          reviewerNotes: null,
        });
      }
    } else {
      // Prohibited or Preferred terminology: detect occurrences in content
      const pattern = rule.pattern.trim();
      let regex: RegExp | null = null;

      try {
        if (rule.matchType === 'exact') {
          // Exact character sequence, case-sensitive
          regex = new RegExp(escapeRegex(pattern), 'g');
        } else if (rule.matchType === 'case_insensitive') {
          regex = new RegExp(escapeRegex(pattern), 'gi');
        } else if (rule.matchType === 'whole_word') {
          regex = new RegExp(`(?<=[^\\p{L}\\p{N}]|^)${escapeRegex(pattern)}(?=[^\\p{L}\\p{N}]|$)`, 'giu');
        } else if (rule.matchType === 'regex') {
          regex = new RegExp(pattern, 'g');
        }
      } catch {
        regex = new RegExp(escapeRegex(pattern), 'gi');
      }

      if (regex) {
        let match: RegExpExecArray | null;
        while ((match = regex.exec(content)) !== null) {
          const startIndex = match.index;
          const matchedText = match[0];
          const endIndex = startIndex + matchedText.length;

          // Check if covered by configured exceptions
          if (isCoveredByException(content, startIndex, endIndex, rule.exceptions)) {
            continue;
          }

          const lineNumber = getLineNumber(content, startIndex);
          const contextSnippet = getContextSnippet(content, startIndex, endIndex);
          const suggestedReplacement =
            rule.approvedAlternatives && rule.approvedAlternatives.length > 0
              ? rule.approvedAlternatives[0]
              : null;

          findings.push({
            id: `fnd_rule_${rule.id}_${startIndex}`,
            ruleId: rule.id,
            category: rule.category,
            severity: rule.severity,
            matchedText,
            startIndex,
            endIndex,
            lineNumber,
            contextSnippet,
            explanation:
              rule.description ||
              `The phrase "${matchedText}" violates the brand policy "${rule.title}".`,
            suggestedReplacement,
            alternatives: rule.approvedAlternatives || [],
            findingType: 'rule_violation',
            verificationStatus: 'not_applicable',
            supportingFactId: null,
            supportingEvidence: `Rule reference: ${rule.title} (${rule.sourceDocument || 'Brand Policy'}${
              rule.sourceSection ? ` · ${rule.sourceSection}` : ''
            })`,
            sourceDocument: rule.sourceDocument || 'Brand Guidelines',
            sourceSection: rule.sourceSection || null,
            reviewStatus: 'pending',
            dismissReason: null,
            reviewerNotes: null,
          });

          // Prevent infinite loop on 0-length matches
          if (match.index === regex.lastIndex) {
            regex.lastIndex++;
          }
        }
      }
    }
  }

  // 2. Duplicate wording check (e.g. repeated adjacent words: "the the", "with with")
  const duplicateWordRegex = /\b([a-zA-Z]{2,})\s+\1\b/gi;
  let dupMatch: RegExpExecArray | null;
  while ((dupMatch = duplicateWordRegex.exec(content)) !== null) {
    const startIndex = dupMatch.index;
    const matchedText = dupMatch[0];
    const endIndex = startIndex + matchedText.length;
    const repeatedWord = dupMatch[1];

    findings.push({
      id: `fnd_dup_${startIndex}`,
      ruleId: null,
      category: 'formatting_style',
      severity: 'low',
      matchedText,
      startIndex,
      endIndex,
      lineNumber: getLineNumber(content, startIndex),
      contextSnippet: getContextSnippet(content, startIndex, endIndex),
      explanation: `Repeated adjacent word detected: "${repeatedWord}". This is typically an accidental duplicate entry.`,
      suggestedReplacement: repeatedWord,
      alternatives: [repeatedWord],
      findingType: 'duplicate_wording',
      verificationStatus: 'not_applicable',
      supportingFactId: null,
      supportingEvidence: 'Grammar and Editorial Style Heuristic',
      sourceDocument: 'Standard Editorial Hygiene',
      sourceSection: 'Duplicate Token Prevention',
      reviewStatus: 'pending',
      dismissReason: null,
      reviewerNotes: null,
    });
  }

  // 3. Brand Voice & Tone Heuristics (based on settings)
  const toneOpts = settings?.toneChecks || {
    exclamationMarkLimit: 1,
    excessiveCapsWordsThreshold: 2,
    flagUnverifiedSuperlatives: true,
    flagRepeatedPhrases: true,
    preferredFormality: 'balanced',
  };

  // 3a. Excessive Exclamation Marks
  const exclamationRegex = /!{2,}/g;
  let exclMatch: RegExpExecArray | null;
  while ((exclMatch = exclamationRegex.exec(content)) !== null) {
    const startIndex = exclMatch.index;
    const matchedText = exclMatch[0];
    const endIndex = startIndex + matchedText.length;

    findings.push({
      id: `fnd_tone_excl_${startIndex}`,
      ruleId: null,
      category: 'voice_tone',
      severity: 'low',
      matchedText,
      startIndex,
      endIndex,
      lineNumber: getLineNumber(content, startIndex),
      contextSnippet: getContextSnippet(content, startIndex, endIndex),
      explanation: `Multiple exclamation marks ("${matchedText}") violate enterprise editorial standards. Limit punctuation to a single period or exclamation mark.`,
      suggestedReplacement: '.',
      alternatives: ['.', '!'],
      findingType: 'tone_heuristic',
      verificationStatus: 'not_applicable',
      supportingFactId: null,
      supportingEvidence: 'Heuristic Brand Tone Check',
      sourceDocument: 'Tone & Voice Standards',
      sourceSection: 'Punctuation Guidelines',
      reviewStatus: 'pending',
      dismissReason: null,
      reviewerNotes: null,
    });
  }

  // 3b. Shouting / Excessive ALL CAPS words (>4 letters, excluding common acronyms)
  const capsRegex = /\b[A-Z]{4,}\b/g;
  const commonAcronyms = new Set(['HTTP', 'HTTPS', 'HTML', 'JSON', 'REST', 'SaaS', 'GDPR', 'HIPAA', 'SOC2', 'API', 'UUID', 'SDK', 'PDF']);
  let capsMatch: RegExpExecArray | null;
  while ((capsMatch = capsRegex.exec(content)) !== null) {
    const word = capsMatch[0];
    if (commonAcronyms.has(word)) continue;

    const startIndex = capsMatch.index;
    const endIndex = startIndex + word.length;

    findings.push({
      id: `fnd_tone_caps_${startIndex}`,
      ruleId: null,
      category: 'voice_tone',
      severity: 'low',
      matchedText: word,
      startIndex,
      endIndex,
      lineNumber: getLineNumber(content, startIndex),
      contextSnippet: getContextSnippet(content, startIndex, endIndex),
      explanation: `All-caps word "${word}" detected. Shouting typography diminishes professional brand voice.`,
      suggestedReplacement: word.charAt(0) + word.slice(1).toLowerCase(),
      alternatives: [word.charAt(0) + word.slice(1).toLowerCase(), word.toLowerCase()],
      findingType: 'tone_heuristic',
      verificationStatus: 'not_applicable',
      supportingFactId: null,
      supportingEvidence: 'Heuristic Brand Tone Check',
      sourceDocument: 'Tone & Voice Standards',
      sourceSection: 'Typography & Casing',
      reviewStatus: 'pending',
      dismissReason: null,
      reviewerNotes: null,
    });
  }

  // 3c. Unverified Superlative Heuristics
  if (toneOpts.flagUnverifiedSuperlatives) {
    const superlatives = [
      'best in the world',
      'unmatched performance',
      '#1 platform',
      'world-leading',
      'revolutionary breakthrough',
      '100% bug-free',
      'unrivaled',
      'cheapest on earth',
      'guaranteed instant results',
      'completely flaw-free',
    ];

    for (const sup of superlatives) {
      const supRegex = new RegExp(`\\b${escapeRegex(sup)}\\b`, 'gi');
      let sm: RegExpExecArray | null;
      while ((sm = supRegex.exec(content)) !== null) {
        // If there is already a specific rule finding at this exact location, skip to avoid duplicate findings
        const alreadyFlagged = findings.some(
          (f) => Math.abs(f.startIndex - sm!.index) < 3 && f.category === 'prohibited_claims'
        );
        if (alreadyFlagged) continue;

        const startIndex = sm.index;
        const matchedText = sm[0];
        const endIndex = startIndex + matchedText.length;

        findings.push({
          id: `fnd_tone_sup_${startIndex}`,
          ruleId: null,
          category: 'prohibited_claims',
          severity: 'medium',
          matchedText,
          startIndex,
          endIndex,
          lineNumber: getLineNumber(content, startIndex),
          contextSnippet: getContextSnippet(content, startIndex, endIndex),
          explanation: `Subjective superlative claim "${matchedText}" may trigger regulatory scrutiny without accredited substantiation. Heuristic flag: consider replacing with concrete data points.`,
          suggestedReplacement: null,
          alternatives: [],
          findingType: 'tone_heuristic',
          verificationStatus: 'unverified',
          supportingFactId: null,
          supportingEvidence: 'Heuristic Superlative Classifier',
          sourceDocument: 'Fair Advertising & Substantiation Guidelines',
          sourceSection: 'Section 2 - Comparative Claims',
          reviewStatus: 'pending',
          dismissReason: null,
          reviewerNotes: null,
        });
      }
    }
  }

  // Sort findings by position in text (startIndex ascending)
  findings.sort((a, b) => a.startIndex - b.startIndex);

  // Calculate metrics
  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const highCount = findings.filter((f) => f.severity === 'high').length;
  const mediumCount = findings.filter((f) => f.severity === 'medium').length;
  const lowCount = findings.filter((f) => f.severity === 'low').length;

  return {
    findings,
    evaluatedRuleCount: rules.length,
    activeRuleCount: activeRules.length,
    metrics: {
      totalFindings: findings.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
    },
  };
}
