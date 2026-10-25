/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Download,
  FileCheck2,
  Filter,
  History,
  Lock,
  Search,
  Shield,
  User,
} from 'lucide-react';
import { AuditEvent, AuditEventType } from '../../types';
import { exportAuditHistoryJSON } from '../../services/reports';

interface AuditHistoryViewProps {
  auditEvents: AuditEvent[];
}

export function AuditHistoryView({ auditEvents }: AuditHistoryViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const filteredEvents = auditEvents.filter((evt) => {
    const matchesSearch =
      evt.eventType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.recordId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(evt.details).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || evt.eventType === typeFilter;

    return matchesSearch && matchesType;
  });

  const getEventBadge = (type: AuditEventType) => {
    switch (type) {
      case 'approval_granted':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'approval_denied':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      case 'validation_run':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'suggestion_applied':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'rule_created':
      case 'rule_modified':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-blue-400" />
              Audit Ledger & Governance History
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              {auditEvents.length} Recorded Events
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Verifiable chronological log of all document imports, rule modifications, validation runs, suggestion applications, and approval decisions.
          </p>
        </div>

        <button
          onClick={() => exportAuditHistoryJSON(auditEvents)}
          disabled={auditEvents.length === 0}
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5 text-blue-400" />
          <span>Export Audit Log (JSON)</span>
        </button>
      </div>

      {/* Honesty & Architecture Disclaimer */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 text-xs text-slate-400 flex items-start gap-3">
        <Lock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-slate-200">
            Local Storage Ledger Transparency Statement
          </div>
          <p className="leading-relaxed">
            These audit records are stored locally in the browser's IndexedDB. While designed to track all user actions accurately without fabrication, local browser storage is accessible to the machine operator and does not provide cryptographic tamper-proofing or multi-user server immutability.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search audit events, actors, record IDs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <Filter className="w-3.5 h-3.5" />
          <span>Event Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-hidden focus:border-blue-500"
          >
            <option value="all">All Events</option>
            <option value="validation_run">Validation Run</option>
            <option value="suggestion_applied">Suggestion Applied</option>
            <option value="approval_granted">Approval Granted</option>
            <option value="approval_denied">Approval Denied</option>
            <option value="rule_created">Rule Created</option>
            <option value="rule_modified">Rule Modified</option>
            <option value="fact_created">Fact Created</option>
            <option value="content_modified">Content Modified</option>
            <option value="export_performed">Export Performed</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No audit records match the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider border-b border-slate-800 font-medium">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Target Record ID</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Details Summary</th>
                  <th className="py-3 px-4 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {filteredEvents.map((evt) => {
                  const isExpanded = expandedEventId === evt.id;

                  return (
                    <React.Fragment key={evt.id}>
                      <tr className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                          {new Date(evt.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${getEventBadge(
                              evt.eventType
                            )}`}
                          >
                            {evt.eventType.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{evt.recordId}</td>
                        <td className="py-3 px-4 text-slate-300 font-sans">{evt.actor}</td>
                        <td className="py-3 px-4 text-slate-400 max-w-xs truncate font-sans">
                          {Object.entries(evt.details || {})
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' · ')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setExpandedEventId(isExpanded ? null : evt.id)}
                            className="text-blue-400 hover:text-blue-300 underline font-sans text-xs"
                          >
                            {isExpanded ? 'Hide' : 'Inspect JSON'}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-950/90">
                          <td colSpan={6} className="p-4">
                            <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-[11px] overflow-x-auto">
                              {JSON.stringify(evt, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
