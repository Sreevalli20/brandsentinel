/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileCode,
  FileEdit,
  FileSpreadsheet,
  FileText,
  FileUp,
  History,
  Info,
  Play,
  RotateCcw,
  Save,
  ShieldAlert,
  Sparkles,
  SplitSquareVertical,
  X,
} from 'lucide-react';
import {
  AppSettings,
  ApprovedFact,
  BrandRule,
  ContentReview,
  ContentType,
  ReviewFinding,
} from '../../types';
import { extractTextFromFile } from '../../services/documentExtractor';
import { runLocalBrandAudit } from '../../services/localAuditor';
import { exportFindingsCSV, exportRevisedContent, exportReviewReportJSON } from '../../services/reports';
import { logAuditEvent } from '../../services/storage';
import { FindingStatusBadge, SeverityBadge, VerificationBadge } from '../common/Badge';

interface ContentInspectorViewProps {
  currentReview: ContentReview | null;
  rules: BrandRule[];
  facts: ApprovedFact[];
  settings: AppSettings;
  onSaveReview: (review: ContentReview) => Promise<void>;
  onNewReview: () => void;
}

export function ContentInspectorView({
  currentReview,
  rules,
  facts,
  settings,
  onSaveReview,
  onNewReview,
}: ContentInspectorViewProps) {
  // Local state
  const [title, setTitle] = useState(currentReview?.title || 'Untitled Marketing Copy');
  const [contentType, setContentType] = useState<ContentType>(
    currentReview?.contentType || 'marketing_email'
  );
  const [content, setContent] = useState(currentReview?.currentContent || '');
  const [originalContent, setOriginalContent] = useState(
    currentReview?.originalContent || currentReview?.currentContent || ''
  );
  const [sourceFileName, setSourceFileName] = useState<string | null>(
    currentReview?.sourceFileName || null
  );

  const [findings, setFindings] = useState<ReviewFinding[]>(currentReview?.findings || []);
  const [complianceScore, setComplianceScore] = useState<number>(
    currentReview?.complianceScore ?? 100
  );
  const [isStale, setIsStale] = useState<boolean>(currentReview?.isStale ?? false);
  const [analysisTimestamp, setAnalysisTimestamp] = useState<string | null>(
    currentReview?.analysisTimestamp || null
  );

  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'diff' | 'versions'>('editor');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync when currentReview changes
  React.useEffect(() => {
    if (currentReview) {
      setTitle(currentReview.title);
      setContentType(currentReview.contentType);
      setContent(currentReview.currentContent);
      setOriginalContent(currentReview.originalContent);
      setSourceFileName(currentReview.sourceFileName);
      setFindings(currentReview.findings);
      setComplianceScore(currentReview.complianceScore);
      setIsStale(currentReview.isStale);
      setAnalysisTimestamp(currentReview.analysisTimestamp);
    }
  }, [currentReview?.id]);

  // Handle content typing
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setContent(newText);
    setIsStale(true);
  };

  // Run the deterministic audit engine
  const handleRunAudit = async () => {
    if (!content.trim()) {
      setErrorMessage('Please paste text or upload a document to inspect.');
      return;
    }

    setIsValidating(true);
    setErrorMessage(null);

    try {
      const result = await runLocalBrandAudit(
        content,
        rules,
        facts,
        settings,
        currentReview?.id || 'new_review',
        settings.reviewerDisplayName
      );

      setFindings(result.findings);
      setComplianceScore(result.complianceScore);
      setIsStale(false);
      setAnalysisTimestamp(new Date().toISOString());
      setSuccessMessage(
        `Audit completed in ${result.durationMs}ms. Evaluated ${result.rulesEvaluated} rules and ${result.factsConsulted} verified facts.`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(`Audit failed: ${err.message || 'Unknown error during rule execution'}`);
    } finally {
      setIsValidating(false);
    }
  };

  // File Upload & Local Text Extraction
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setErrorMessage(null);

    try {
      const extracted = await extractTextFromFile(file, settings.maxDocSizeBytes);
      setContent(extracted.text);
      setOriginalContent(extracted.text);
      setSourceFileName(extracted.fileName);
      setTitle(extracted.title || file.name);
      setIsStale(true);

      setSuccessMessage(
        `Extracted ${extracted.wordCount} words from ${extracted.fileType} file (${(
          extracted.fileSize / 1024
        ).toFixed(1)} KB).`
      );
      setTimeout(() => setSuccessMessage(null), 4000);

      // Auto-validate if enabled
      if (settings.autoRevalidateOnEdit) {
        setTimeout(() => handleRunAudit(), 300);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to extract text from file.');
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Apply suggested replacement directly into the text
  const handleApplySuggestion = (finding: ReviewFinding, replacement: string) => {
    if (!replacement) return;

    let newContent = content;
    if (finding.findingType === 'missing_required') {
      // Append required statement to the bottom
      newContent = `${content.trim()}\n\n${replacement}`;
    } else {
      // Replace text at matched coordinates
      const before = content.substring(0, finding.startIndex);
      const after = content.substring(finding.endIndex);
      newContent = `${before}${replacement}${after}`;
    }

    setContent(newContent);
    setIsStale(true);

    // Update finding review status
    const updatedFindings = findings.map((f) =>
      f.id === finding.id
        ? {
            ...f,
            reviewStatus: 'accepted_correction' as const,
            suggestedReplacement: replacement,
          }
        : f
    );
    setFindings(updatedFindings);

    // Log audit event
    logAuditEvent(
      'suggestion_applied',
      currentReview?.id || 'active_doc',
      'review',
      settings.reviewerDisplayName,
      {
        findingId: finding.id,
        matchedText: finding.matchedText,
        appliedReplacement: replacement,
      }
    );

    // Re-run audit to reflect accurate offsets and new score
    setTimeout(() => {
      runLocalBrandAudit(
        newContent,
        rules,
        facts,
        settings,
        currentReview?.id || 'active_doc',
        settings.reviewerDisplayName
      ).then((res) => {
        setFindings(res.findings);
        setComplianceScore(res.complianceScore);
        setIsStale(false);
        setAnalysisTimestamp(new Date().toISOString());
      });
    }, 200);
  };

  // Dismiss a finding with recorded reason
  const handleDismissFinding = (findingId: string, reason: string) => {
    const updated = findings.map((f) =>
      f.id === findingId
        ? {
            ...f,
            reviewStatus: 'dismissed' as const,
            dismissReason: reason || 'Dismissed by reviewer',
          }
        : f
    );
    setFindings(updated);

    logAuditEvent(
      'suggestion_dismissed',
      currentReview?.id || 'active_doc',
      'review',
      settings.reviewerDisplayName,
      {
        findingId,
        reason,
      }
    );
  };

  // Save review to persistent database
  const handleSave = async () => {
    const revId = currentReview?.id || `rev_${Date.now()}`;
    const now = new Date().toISOString();

    const newVersion = {
      version: (currentReview?.versionHistory?.length || 0) + 1,
      content,
      timestamp: now,
      author: settings.reviewerDisplayName,
      changeNote: isStale ? 'Content modified' : 'Validation completed',
      findingsCount: findings.length,
      complianceScore,
    };

    const reviewToSave: ContentReview = {
      id: revId,
      title: title.trim() || 'Untitled Document',
      contentType,
      sourceFileName,
      originalContent,
      currentContent: content,
      versionHistory: [...(currentReview?.versionHistory || []), newVersion],
      findings,
      status: currentReview?.status || 'in_review',
      reviewerNotes: currentReview?.reviewerNotes || '',
      approvalDecision: currentReview?.approvalDecision || null,
      complianceScore,
      analysisTimestamp,
      isStale,
      createdAt: currentReview?.createdAt || now,
      updatedAt: now,
    };

    await onSaveReview(reviewToSave);
    await logAuditEvent('content_modified', revId, 'review', settings.reviewerDisplayName, {
      title,
      version: newVersion.version,
      complianceScore,
    });

    setSuccessMessage('Review record saved to local IndexedDB successfully.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Scroll editor to matched finding
  const handleScrollToFinding = (finding: ReviewFinding) => {
    setSelectedFindingId(finding.id);
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(finding.startIndex, finding.endIndex);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex-1 w-full md:w-auto">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-bold text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-blue-500 focus:outline-hidden transition px-1 py-0.5"
              placeholder="Document Title..."
            />
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as ContentType)}
              className="text-xs bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-hidden focus:border-blue-500 capitalize cursor-pointer"
            >
              <option value="marketing_email">Marketing Email</option>
              <option value="social_media">Social Media Post</option>
              <option value="advertisement">Advertisement</option>
              <option value="website_copy">Website Copy</option>
              <option value="product_description">Product Description</option>
              <option value="campaign_material">Campaign Material</option>
              <option value="press_release">Press Release</option>
              <option value="business_doc">Business Document</option>
              <option value="other">Other Document</option>
            </select>
          </div>
          {sourceFileName && (
            <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 px-1">
              <FileCode className="w-3.5 h-3.5 text-blue-400" />
              <span>Extracted from: {sourceFileName}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".txt,.md,.markdown,.pdf,.docx"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isExtracting}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Import TXT, PDF, or DOCX document"
          >
            <FileUp className="w-3.5 h-3.5 text-blue-400" />
            <span>{isExtracting ? 'Extracting...' : 'Upload File'}</span>
          </button>

          <button
            onClick={handleRunAudit}
            disabled={isValidating || !content.trim()}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
            <span>{isValidating ? 'Auditing...' : 'Run Compliance Audit'}</span>
          </button>

          <button
            onClick={handleSave}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Review</span>
          </button>

          <button
            onClick={onNewReview}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            Clear / New
          </button>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Notice:</span> {errorMessage}
          </div>
          <button onClick={() => setErrorMessage(null)}>
            <X className="w-4 h-4 hover:text-white" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main Split Inspector View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Editor & Diff Tabs (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[650px]">
            {/* Editor Sub-header */}
            <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveTab('editor')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                    activeTab === 'editor'
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileEdit className="w-3.5 h-3.5 inline mr-1.5" />
                  Text Editor
                </button>
                <button
                  onClick={() => setActiveTab('diff')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                    activeTab === 'diff'
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <SplitSquareVertical className="w-3.5 h-3.5 inline mr-1.5" />
                  Compare Original vs Revised
                </button>
                <button
                  onClick={() => setActiveTab('versions')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                    activeTab === 'versions'
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <History className="w-3.5 h-3.5 inline mr-1.5" />
                  Versions ({currentReview?.versionHistory?.length || 1})
                </button>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                {isStale && (
                  <span className="text-amber-400 flex items-center gap-1 font-medium text-[11px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    <AlertTriangle className="w-3 h-3" /> Re-audit Recommended
                  </span>
                )}
                <span>{content.split(/\s+/).filter(Boolean).length} words</span>
                <span>{content.length} chars</span>
              </div>
            </div>

            {/* Editor Body */}
            <div className="flex-1 relative p-4 flex flex-col">
              {activeTab === 'editor' && (
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={handleContentChange}
                  placeholder="Paste or type content here, or upload a TXT, Markdown, PDF, or Word DOCX document above..."
                  className="w-full flex-1 bg-transparent text-slate-200 text-sm font-mono leading-relaxed resize-none focus:outline-hidden focus:ring-0 placeholder:text-slate-600"
                />
              )}

              {activeTab === 'diff' && (
                <div className="flex-1 overflow-y-auto space-y-4 font-mono text-xs">
                  <div className="grid grid-cols-2 gap-4 h-full">
                    <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80 overflow-y-auto">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">
                        Original Content (Source)
                      </div>
                      <div className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {originalContent || 'No original version available.'}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80 overflow-y-auto">
                      <div className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">
                        Current Revised Content
                      </div>
                      <div className="text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {content}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'versions' && (
                <div className="flex-1 overflow-y-auto space-y-3">
                  <h4 className="text-xs font-semibold text-slate-300">Saved Document Revisions</h4>
                  {(!currentReview?.versionHistory || currentReview.versionHistory.length === 0) ? (
                    <p className="text-xs text-slate-400">Save the review to record the first historical version.</p>
                  ) : (
                    currentReview.versionHistory.map((v) => (
                      <div
                        key={v.version}
                        className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-slate-200">
                            Version {v.version} · {v.changeNote || 'Snapshot'}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Saved by {v.author} on {new Date(v.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-slate-400">
                            Score: <strong className="text-emerald-400">{v.complianceScore}%</strong>
                          </span>
                          <button
                            onClick={() => {
                              setContent(v.content);
                              setIsStale(true);
                            }}
                            className="text-xs text-blue-400 hover:text-blue-300 font-medium underline"
                          >
                            Restore This Text
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Quick Export Footer */}
            <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
              <span className="text-[11px]">Local Processing Guaranteed</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportRevisedContent(content, title, false)}
                  className="hover:text-slate-200 transition"
                  title="Download Revised Text"
                >
                  Export .txt
                </button>
                <span>·</span>
                <button
                  onClick={() => exportRevisedContent(content, title, true)}
                  className="hover:text-slate-200 transition"
                  title="Download Revised Markdown"
                >
                  Export .md
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Risk Radar & Interactive Findings (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Compliance Score & Risk Radar Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Brand Compliance Score
                </span>
                <div className="text-2xl font-black text-white mt-0.5 flex items-baseline gap-2">
                  <span
                    className={
                      complianceScore >= 90
                        ? 'text-emerald-400'
                        : complianceScore >= 70
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }
                  >
                    {complianceScore}/100
                  </span>
                  <span className="text-xs font-normal text-slate-400">
                    {complianceScore === 100
                      ? 'Fully Compliant'
                      : `${findings.filter((f) => f.reviewStatus === 'pending').length} open findings`}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-slate-400">Formula:</div>
                <div className="text-[10px] text-slate-400 font-mono">
                  100 - (C×25 + H×15 + M×8 + L×3)
                </div>
              </div>
            </div>

            {/* Score Bar */}
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  complianceScore >= 90
                    ? 'bg-emerald-500'
                    : complianceScore >= 70
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${complianceScore}%` }}
              />
            </div>
          </div>

          {/* Findings List */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-[525px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-blue-400" />
                Findings & Evidence ({findings.length})
              </h3>
              {findings.length > 0 && (
                <button
                  onClick={() => exportFindingsCSV(title, findings)}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <FileSpreadsheet className="w-3 h-3" />
                  CSV
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {findings.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400/60 mb-2" />
                  <p className="text-sm font-medium text-slate-300">No Policy Violations Found</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    The deterministic rules engine found zero conflicts against configured rules or approved facts.
                  </p>
                </div>
              ) : (
                findings.map((f) => {
                  const isSelected = selectedFindingId === f.id;
                  const isPending = f.reviewStatus === 'pending';

                  return (
                    <div
                      key={f.id}
                      onClick={() => handleScrollToFinding(f)}
                      className={`p-3 rounded-lg border text-xs transition cursor-pointer ${
                        isSelected
                          ? 'border-blue-500 bg-slate-800/90 shadow-md'
                          : isPending
                          ? 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                          : 'border-slate-800/50 bg-slate-950/20 opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <SeverityBadge severity={f.severity} />
                          <FindingStatusBadge status={f.reviewStatus} />
                          {f.verificationStatus !== 'not_applicable' && (
                            <VerificationBadge status={f.verificationStatus} />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Ln {f.lineNumber}
                        </span>
                      </div>

                      <div className="font-semibold text-slate-200 mb-1">
                        Matched: <span className="text-red-300 font-mono">"{f.matchedText}"</span>
                      </div>

                      <p className="text-slate-400 leading-normal mb-2">{f.explanation}</p>

                      {/* Supporting Evidence Reference */}
                      {f.supportingEvidence && (
                        <div className="text-[11px] bg-slate-900/90 p-2 rounded border border-slate-800 text-slate-300 mb-2">
                          <span className="font-semibold text-slate-400">Source Evidence:</span>{' '}
                          {f.supportingEvidence}
                        </div>
                      )}

                      {/* Suggested Replacements */}
                      {f.suggestedReplacement && isPending && (
                        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                          <span className="text-slate-400">Approved Alternative:</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplySuggestion(f, f.suggestedReplacement!);
                            }}
                            className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 font-semibold text-[11px] flex items-center gap-1 transition"
                          >
                            <Check className="w-3 h-3" />
                            Apply: "{f.suggestedReplacement}"
                          </button>
                        </div>
                      )}

                      {/* Manual Dismiss Action */}
                      {isPending && (
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDismissFinding(f.id, 'Reviewed and exempted by user');
                            }}
                            className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                          >
                            Dismiss Finding
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
