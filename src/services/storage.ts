/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppSettings, ApprovedFact, AuditEvent, BrandRule, ContentReview } from '../types';

const DB_NAME = 'brandsentinel_db';
const DB_VERSION = 1;

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  reviewerDisplayName: 'Local Compliance Officer',
  reviewerRole: 'Brand Reviewer',
  maxDocSizeBytes: 15 * 1024 * 1024, // 15MB
  defaultSeverityThreshold: 'low',
  claimMatchingThreshold: 0.65,
  toneChecks: {
    exclamationMarkLimit: 1,
    excessiveCapsWordsThreshold: 2,
    flagUnverifiedSuperlatives: true,
    flagRepeatedPhrases: true,
    preferredFormality: 'balanced',
  },
  autoRevalidateOnEdit: true,
};

// In-memory fallback if IndexedDB is unavailable
class InMemoryStorage {
  rules = new Map<string, BrandRule>();
  facts = new Map<string, ApprovedFact>();
  reviews = new Map<string, ContentReview>();
  audit = new Map<string, AuditEvent>();
  settings: AppSettings = { ...DEFAULT_SETTINGS };
}

const memoryStore = new InMemoryStorage();
let useMemoryFallback = false;

function openDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    useMemoryFallback = true;
    return Promise.reject(new Error('IndexedDB not supported'));
  }

  return new Promise((resolve, reject) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('rules')) {
          const ruleStore = db.createObjectStore('rules', { keyPath: 'id' });
          ruleStore.createIndex('category', 'category', { unique: false });
          ruleStore.createIndex('severity', 'severity', { unique: false });
          ruleStore.createIndex('active', 'active', { unique: false });
        }

        if (!db.objectStoreNames.contains('facts')) {
          const factStore = db.createObjectStore('facts', { keyPath: 'id' });
          factStore.createIndex('subject', 'subject', { unique: false });
          factStore.createIndex('verificationStatus', 'verificationStatus', { unique: false });
        }

        if (!db.objectStoreNames.contains('reviews')) {
          const reviewStore = db.createObjectStore('reviews', { keyPath: 'id' });
          reviewStore.createIndex('status', 'status', { unique: false });
          reviewStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('audit_events')) {
          const auditStore = db.createObjectStore('audit_events', { keyPath: 'id' });
          auditStore.createIndex('timestamp', 'timestamp', { unique: false });
          auditStore.createIndex('recordId', 'recordId', { unique: false });
          auditStore.createIndex('eventType', 'eventType', { unique: false });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        useMemoryFallback = true;
        resolve(null as any); // fallback gracefully
      };
    } catch {
      useMemoryFallback = true;
      resolve(null as any);
    }
  });
}

// Generic transaction helper
async function performTx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => Promise<T> | T
): Promise<T> {
  const db = await openDB();
  if (!db || useMemoryFallback) {
    throw new Error('Using fallback');
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const result = callback(store);

      tx.oncomplete = () => {
        Promise.resolve(result).then(resolve).catch(reject);
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    } catch (err) {
      reject(err);
    }
  });
}

// Brand Rules Repository
export async function getAllRules(): Promise<BrandRule[]> {
  try {
    return await performTx('rules', 'readonly', (store) => {
      return new Promise<BrandRule[]>((res, rej) => {
        const req = store.getAll();
        req.onsuccess = () => res(req.result || []);
        req.onerror = () => rej(req.error);
      });
    });
  } catch {
    return Array.from(memoryStore.rules.values());
  }
}

export async function saveRule(rule: BrandRule): Promise<void> {
  try {
    await performTx('rules', 'readwrite', (store) => {
      store.put(rule);
    });
  } catch {
    memoryStore.rules.set(rule.id, rule);
  }
}

export async function deleteRule(id: string): Promise<void> {
  try {
    await performTx('rules', 'readwrite', (store) => {
      store.delete(id);
    });
  } catch {
    memoryStore.rules.delete(id);
  }
}

// Approved Facts Library
export async function getAllFacts(): Promise<ApprovedFact[]> {
  try {
    return await performTx('facts', 'readonly', (store) => {
      return new Promise<ApprovedFact[]>((res, rej) => {
        const req = store.getAll();
        req.onsuccess = () => res(req.result || []);
        req.onerror = () => rej(req.error);
      });
    });
  } catch {
    return Array.from(memoryStore.facts.values());
  }
}

export async function saveFact(fact: ApprovedFact): Promise<void> {
  try {
    await performTx('facts', 'readwrite', (store) => {
      store.put(fact);
    });
  } catch {
    memoryStore.facts.set(fact.id, fact);
  }
}

export async function deleteFact(id: string): Promise<void> {
  try {
    await performTx('facts', 'readwrite', (store) => {
      store.delete(id);
    });
  } catch {
    memoryStore.facts.delete(id);
  }
}

// Content Reviews
export async function getAllReviews(): Promise<ContentReview[]> {
  try {
    const list = await performTx('reviews', 'readonly', (store) => {
      return new Promise<ContentReview[]>((res, rej) => {
        const req = store.getAll();
        req.onsuccess = () => res(req.result || []);
        req.onerror = () => rej(req.error);
      });
    });
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch {
    return Array.from(memoryStore.reviews.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }
}

export async function getReviewById(id: string): Promise<ContentReview | null> {
  try {
    return await performTx('reviews', 'readonly', (store) => {
      return new Promise<ContentReview | null>((res, rej) => {
        const req = store.get(id);
        req.onsuccess = () => res(req.result || null);
        req.onerror = () => rej(req.error);
      });
    });
  } catch {
    return memoryStore.reviews.get(id) || null;
  }
}

export async function saveReview(review: ContentReview): Promise<void> {
  try {
    await performTx('reviews', 'readwrite', (store) => {
      store.put(review);
    });
  } catch {
    memoryStore.reviews.set(review.id, review);
  }
}

export async function deleteReview(id: string): Promise<void> {
  try {
    await performTx('reviews', 'readwrite', (store) => {
      store.delete(id);
    });
  } catch {
    memoryStore.reviews.delete(id);
  }
}

// Audit Trail
export async function getAuditEvents(): Promise<AuditEvent[]> {
  try {
    const list = await performTx('audit_events', 'readonly', (store) => {
      return new Promise<AuditEvent[]>((res, rej) => {
        const req = store.getAll();
        req.onsuccess = () => res(req.result || []);
        req.onerror = () => rej(req.error);
      });
    });
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch {
    return Array.from(memoryStore.audit.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
}

export async function logAuditEvent(
  eventType: AuditEvent['eventType'],
  recordId: string,
  recordType: AuditEvent['recordType'],
  actor: string,
  details: Record<string, any>
): Promise<AuditEvent> {
  const event: AuditEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    timestamp: new Date().toISOString(),
    eventType,
    recordId,
    recordType,
    actor,
    details,
  };

  try {
    await performTx('audit_events', 'readwrite', (store) => {
      store.put(event);
    });
  } catch {
    memoryStore.audit.set(event.id, event);
  }

  return event;
}

// Settings
export async function getSettings(): Promise<AppSettings> {
  try {
    const res = await performTx('settings', 'readonly', (store) => {
      return new Promise<any>((resolve, reject) => {
        const req = store.get('app_settings');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    });
    if (res && res.data) {
      return { ...DEFAULT_SETTINGS, ...res.data };
    }
    return DEFAULT_SETTINGS;
  } catch {
    return memoryStore.settings || DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await performTx('settings', 'readwrite', (store) => {
      store.put({ id: 'app_settings', data: settings });
    });
  } catch {
    memoryStore.settings = settings;
  }
}

// Complete Database Export & Reset
export async function exportAllData(): Promise<{
  exportDate: string;
  version: string;
  rules: BrandRule[];
  facts: ApprovedFact[];
  reviews: ContentReview[];
  audit: AuditEvent[];
  settings: AppSettings;
}> {
  const [rules, facts, reviews, audit, settings] = await Promise.all([
    getAllRules(),
    getAllFacts(),
    getAllReviews(),
    getAuditEvents(),
    getSettings(),
  ]);

  return {
    exportDate: new Date().toISOString(),
    version: '1.0.0',
    rules,
    facts,
    reviews,
    audit,
    settings,
  };
}

export async function importData(imported: {
  rules?: BrandRule[];
  facts?: ApprovedFact[];
  reviews?: ContentReview[];
  settings?: AppSettings;
}): Promise<void> {
  if (imported.rules && Array.isArray(imported.rules)) {
    for (const r of imported.rules) {
      await saveRule(r);
    }
  }
  if (imported.facts && Array.isArray(imported.facts)) {
    for (const f of imported.facts) {
      await saveFact(f);
    }
  }
  if (imported.reviews && Array.isArray(imported.reviews)) {
    for (const rev of imported.reviews) {
      await saveReview(rev);
    }
  }
  if (imported.settings) {
    await saveSettings(imported.settings);
  }
}

export async function resetAllData(): Promise<void> {
  const db = await openDB();
  if (db && !useMemoryFallback) {
    const stores = ['rules', 'facts', 'reviews', 'audit_events', 'settings'];
    for (const name of stores) {
      await performTx(name, 'readwrite', (store) => {
        store.clear();
      });
    }
  }
  memoryStore.rules.clear();
  memoryStore.facts.clear();
  memoryStore.reviews.clear();
  memoryStore.audit.clear();
  memoryStore.settings = { ...DEFAULT_SETTINGS };
}
