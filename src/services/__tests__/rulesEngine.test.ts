/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { BrandRule } from '../../types';
import { calculateComplianceScore } from '../localAuditor';
import { evaluateBrandRules, getLineNumber } from '../rulesEngine';

describe('BrandSentinel Deterministic Rules Engine', () => {
  const sampleRuleExact: BrandRule = {
    id: 'rule_1',
    version: 1,
    title: 'Brand Capitalization',
    description: 'Ensure exact capitalization',
    category: 'terminology',
    ruleType: 'prohibited',
    matchType: 'exact',
    pattern: 'brandSentinel',
    approvedAlternatives: ['BrandSentinel AI'],
    severity: 'medium',
    sourceDocument: 'Brand Guide',
    sourceSection: '1.0',
    active: true,
    exceptions: [],
    createdAt: '',
    updatedAt: '',
  };

  const sampleRuleWholeWord: BrandRule = {
    id: 'rule_2',
    version: 1,
    title: 'Prohibit Best in Class',
    description: 'Avoid unsubstantiated claims',
    category: 'prohibited_claims',
    ruleType: 'prohibited',
    matchType: 'whole_word',
    pattern: 'best in class',
    approvedAlternatives: ['enterprise-grade'],
    severity: 'critical',
    sourceDocument: 'Legal Policy',
    sourceSection: '4.2',
    active: true,
    exceptions: ['quoted award'],
    createdAt: '',
    updatedAt: '',
  };

  const sampleRequiredRule: BrandRule = {
    id: 'rule_3',
    version: 1,
    title: 'Required Disclaimer',
    description: 'Must include trademark disclaimer',
    category: 'required_disclaimers',
    ruleType: 'required',
    matchType: 'case_insensitive',
    pattern: 'All rights reserved.',
    approvedAlternatives: ['All rights reserved.'],
    severity: 'high',
    sourceDocument: 'Legal Guide',
    sourceSection: 'Footer',
    active: true,
    exceptions: [],
    createdAt: '',
    updatedAt: '',
  };

  it('detects exact phrase matching with accurate offsets and line numbers', () => {
    const text = 'Line 1\nWelcome to brandSentinel application.';
    const res = evaluateBrandRules(text, [sampleRuleExact]);

    expect(res.findings.length).toBe(1);
    const f = res.findings[0];
    expect(f.matchedText).toBe('brandSentinel');
    expect(f.startIndex).toBe(text.indexOf('brandSentinel'));
    expect(f.lineNumber).toBe(2);
    expect(f.suggestedReplacement).toBe('BrandSentinel AI');
    expect(f.severity).toBe('medium');
  });

  it('detects whole-word boundary matching without false positives on substrings', () => {
    const text = 'We offer the best in class security features for our platform.';
    const res = evaluateBrandRules(text, [sampleRuleWholeWord]);
    expect(res.findings.length).toBe(1);
    expect(res.findings[0].matchedText).toBe('best in class');
    expect(res.findings[0].severity).toBe('critical');
  });

  it('respects configured exceptions', () => {
    const text = 'According to the quoted award, our tool is best in class.';
    const res = evaluateBrandRules(text, [sampleRuleWholeWord]);
    // The rule has 'quoted award' as an exception in sampleRuleWholeWord
    expect(res.findings.length).toBe(0);
  });

  it('detects missing required statements or disclaimers', () => {
    const text = 'This document is missing the mandatory footer.';
    const res = evaluateBrandRules(text, [sampleRequiredRule]);
    expect(res.findings.length).toBe(1);
    expect(res.findings[0].findingType).toBe('missing_required');
    expect(res.findings[0].suggestedReplacement).toBe('All rights reserved.');
  });

  it('detects duplicate adjacent words', () => {
    const text = 'Welcome to the the platform today.';
    const res = evaluateBrandRules(text, []);
    const dupFindings = res.findings.filter((f) => f.findingType === 'duplicate_wording');
    expect(dupFindings.length).toBe(1);
    expect(dupFindings[0].matchedText).toBe('the the');
    expect(dupFindings[0].suggestedReplacement).toBe('the');
  });

  it('calculates line number correctly for multiline text', () => {
    const text = 'Line 1\nLine 2\nLine 3 with target';
    const targetIdx = text.indexOf('target');
    expect(getLineNumber(text, targetIdx)).toBe(3);
  });

  it('calculates compliance scores correctly and decrements for findings', () => {
    const findings: any[] = [
      { severity: 'critical', reviewStatus: 'pending' },
      { severity: 'high', reviewStatus: 'pending' },
      { severity: 'medium', reviewStatus: 'pending' },
      { severity: 'low', reviewStatus: 'pending' },
    ];
    // 100 - (25 + 15 + 8 + 3) = 100 - 51 = 49
    expect(calculateComplianceScore(findings)).toBe(49);

    // Resolved findings should not penalize score
    findings[0].reviewStatus = 'accepted_correction';
    // 100 - (15 + 8 + 3) = 74
    expect(calculateComplianceScore(findings)).toBe(74);
  });
});
