/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import {
  clearFictionalExampleData,
  loadFictionalExampleWorkspace,
  SAMPLE_FACTS,
  SAMPLE_RULES,
} from '../sampleData';
import { getAllFacts, getAllReviews, getAllRules, saveRule } from '../storage';

describe('Sample Brand Guidelines and Approved Facts', () => {
  it('includes examples for brand voice, prohibited claims, and terminology', () => {
    const hasVoice = SAMPLE_RULES.some((r) => r.category === 'voice_tone');
    const hasProhibited = SAMPLE_RULES.some((r) => r.category === 'prohibited_claims');
    const hasTerminology = SAMPLE_RULES.some((r) => r.category === 'terminology');
    const hasDisclaimer = SAMPLE_RULES.some((r) => r.category === 'required_disclaimers');

    expect(hasVoice).toBe(true);
    expect(hasProhibited).toBe(true);
    expect(hasTerminology).toBe(true);
    expect(hasDisclaimer).toBe(true);
  });

  it('includes verified facts and expired historical facts', () => {
    const hasVerified = SAMPLE_FACTS.some((f) => f.verificationStatus === 'verified');
    const hasExpired = SAMPLE_FACTS.some((f) => f.verificationStatus === 'expired');

    expect(hasVerified).toBe(true);
    expect(hasExpired).toBe(true);
  });

  it('loads sample workspace and allows clearing fictional records without deleting user data', async () => {
    // Save a custom user rule that does not have 'sample_' prefix
    const customUserRule = {
      id: 'custom_user_rule_99',
      version: 1,
      title: 'Custom User Policy',
      description: 'User created policy',
      category: 'terminology' as const,
      ruleType: 'prohibited' as const,
      matchType: 'whole_word' as const,
      pattern: 'custom error phrase',
      approvedAlternatives: ['approved phrase'],
      severity: 'high' as const,
      sourceDocument: 'User Doc',
      sourceSection: '1.0',
      active: true,
      exceptions: [],
      createdAt: '',
      updatedAt: '',
    };
    await saveRule(customUserRule);

    // Load sample workspace
    await loadFictionalExampleWorkspace('Tester');

    let rules = await getAllRules();
    expect(rules.some((r) => r.id === 'custom_user_rule_99')).toBe(true);
    expect(rules.some((r) => r.id === 'sample_rule_voice_1')).toBe(true);

    // Clear fictional sample data
    await clearFictionalExampleData('Tester');

    rules = await getAllRules();
    // Custom user rule MUST still exist!
    expect(rules.some((r) => r.id === 'custom_user_rule_99')).toBe(true);
    // Sample rule MUST be gone
    expect(rules.some((r) => r.id.startsWith('sample_'))).toBe(false);

    const facts = await getAllFacts();
    expect(facts.some((f) => f.id.startsWith('sample_'))).toBe(false);

    const reviews = await getAllReviews();
    expect(reviews.some((rev) => rev.id.startsWith('sample_'))).toBe(false);
  });
});
