/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  CheckSquare,
  FileSearch,
  FileText,
  History,
  Languages,
  LayoutDashboard,
  Settings,
  Shield,
} from 'lucide-react';
import { NavigationPage } from '../../types';

interface SidebarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  pendingApprovalsCount: number;
  unresolvedFindingsCount: number;
}

export function Sidebar({
  currentPage,
  onNavigate,
  pendingApprovalsCount,
  unresolvedFindingsCount,
}: SidebarProps) {
  const navItems: Array<{
    id: NavigationPage;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeColor?: string;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inspector', label: 'Content Inspector', icon: FileSearch },
    { id: 'guidelines', label: 'Brand Guidelines', icon: BookOpen },
    { id: 'facts', label: 'Approved Facts', icon: CheckCircle2 },
    { id: 'terminology', label: 'Terminology Rules', icon: Languages },
    {
      id: 'findings',
      label: 'Review Findings',
      icon: AlertTriangle,
      badge: unresolvedFindingsCount,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'workflow',
      label: 'Approval Workflow',
      icon: CheckSquare,
      badge: pendingApprovalsCount,
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    },
    { id: 'audit', label: 'Audit History', icon: History },
    { id: 'reports', label: 'Reports & Export', icon: FileText },
    { id: 'settings', label: 'Settings & Data', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800/80 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
            BrandSentinel <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono">AI</span>
          </h1>
          <p className="text-[10px] text-slate-400 font-medium tracking-wide">
            On Brand. Every Time.
          </p>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Workspace Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-blue-400' : 'text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${item.badgeColor || 'bg-slate-800 text-slate-300'}`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Local Engine Status Box */}
      <div className="p-4 m-3 rounded-xl bg-slate-950/60 border border-slate-800/90 text-xs text-slate-400 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Client Engine Active
          </span>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
            LOCAL
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          100% deterministic rules & facts matching. Zero external API calls or remote cloud telemetry.
        </p>
      </div>
    </aside>
  );
}
