import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Code2,
  ExternalLink,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import { CivicReport, IssueStatus } from '../types/civic';
import { findPotentialDuplicates } from '../utils/duplicateDetection';
import { attachDialogLightDismissFallback } from '../utils/dialogAndFormUtils';

interface ReportDetailModalProps {
  report: CivicReport | null;
  allReports: CivicReport[];
  onClose: () => void;
  onUpdateStatus: (reportId: string, newStatus: IssueStatus, note: string) => Promise<void>;
  onSelectRelatedReport: (report: CivicReport) => void;
  isDark: boolean;
}

const STATUS_OPTIONS: IssueStatus[] = [
  'Submitted',
  'Under Review',
  'In Progress',
  'Resolved',
];

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  report,
  allReports,
  onClose,
  onUpdateStatus,
  onSelectRelatedReport,
  isDark,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<IssueStatus>('Submitted');
  const [statusNote, setStatusNote] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (report && !dialog.open) {
      dialog.showModal();
    } else if (!report && dialog.open) {
      dialog.close();
    }
    if (report) {
      setSelectedStatus(report.status);
      setStatusNote('');
      setActivePhotoIdx(0);
    }
  }, [report]);

  useEffect(() => {
    return attachDialogLightDismissFallback(dialogRef.current, onClose);
  }, [onClose]);

  const relatedDuplicates = useMemo(() => {
    if (!report) return [];
    return findPotentialDuplicates(
      {
        title: report.title,
        description: `${report.description} ${report.raw_complaint}`,
        category: report.category,
        lat: report.location.lat,
        lng: report.location.lng,
        excludeId: report.id,
      },
      allReports
    );
  }, [report, allReports]);

  if (!report) {
    return (
      <dialog
        ref={dialogRef}
        {...({ closedby: 'any' } as Record<string, string>)}
        className="hidden"
      />
    );
  }

  const photos =
    report.gallery_photos && report.gallery_photos.length > 0
      ? report.gallery_photos
      : report.image_data_url
      ? [report.image_data_url]
      : [];

  const handleStatusSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingStatus(true);
    try {
      await onUpdateStatus(report.id, selectedStatus, statusNote);
      setStatusNote('');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const structuredAiPayload = {
    title: report.title,
    description: report.description,
    category: report.category,
    severity: report.severity,
    evidence_summary: report.evidence_summary,
    recommended_action: report.recommended_action,
    recommended_authority: report.recommended_authority,
    confidence: report.confidence,
  };

  const modalShell = isDark
    ? 'border-slate-800 bg-slate-900 text-slate-100'
    : 'border-slate-200 bg-white text-slate-900';

  const cardBg = isDark
    ? 'border-slate-800 bg-slate-950/70'
    : 'border-slate-200 bg-[#f8fafc]';

  const inputClass = isDark
    ? 'border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500'
    : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400';

  const mutedText = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as Record<string, string>)}
      aria-labelledby="detail-modal-title"
      className={`m-auto w-full max-w-3xl rounded-2xl border p-0 shadow-2xl open:flex open:flex-col max-h-[90vh] ${modalShell}`}
    >
      {/* Minimalist Top Bar matching SmartRoad Header */}
      <div className="flex items-start justify-between gap-4 bg-[#0f172a] px-6 py-4 text-white">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-bold text-white ${
                report.severity === 'Critical' || report.severity === 'High'
                  ? 'bg-red-500'
                  : report.severity === 'Medium'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
            >
              ● {report.severity}
            </span>
            <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
              {report.category}
            </span>
            <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
              {report.status}
            </span>
          </div>
          <h2 id="detail-modal-title" className="text-base font-bold text-white leading-snug">
            {report.title}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <MapPin className="h-3.5 w-3.5 text-sky-400" />
            <span>
              {report.location.address} ({report.location.lat.toFixed(4)},{' '}
              {report.location.lng.toFixed(4)})
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-white/10 p-1.5 text-slate-300 hover:bg-white/20 hover:text-white transition"
          aria-label="Close issue detail modal"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="overflow-y-auto px-6 py-5 space-y-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Left Column: Summary, Evidence, Recommended Action */}
          <div className="space-y-4 lg:col-span-7">
            <div className={`rounded-xl border p-4 space-y-2.5 ${cardBg}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  AI Issue Summary
                </h3>
                <button
                  type="button"
                  onClick={() => setShowRawJson((v) => !v)}
                  className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-mono ${
                    isDark
                      ? 'border-slate-700 bg-slate-900 text-slate-300'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <Code2 className="h-3 w-3 text-sky-500" />
                  {showRawJson ? 'Hide JSON' : 'JSON Schema'}
                </button>
              </div>
              <p className="text-xs leading-relaxed">{report.description}</p>

              {showRawJson && (
                <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950 p-3 text-[11px] font-mono text-emerald-300">
                  {JSON.stringify(structuredAiPayload, null, 2)}
                </pre>
              )}

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className={`text-[11px] font-semibold block ${mutedText}`}>
                  Resident Complaint:
                </span>
                <p className="text-xs italic mt-0.5">"{report.raw_complaint}"</p>
              </div>
            </div>

            <div className={`rounded-xl border p-4 space-y-2 ${cardBg}`}>
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Evidence &amp; Recommended Action
              </h3>
              <p className={`text-xs leading-relaxed ${mutedText}`}>
                {report.evidence_summary}
              </p>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
                  Next Step:
                </span>
                <p className="text-xs font-medium mt-0.5">{report.recommended_action}</p>
              </div>
            </div>
          </div>

          {/* Right Column: 3-Photo Gallery + Authority Card */}
          <div className="space-y-4 lg:col-span-5">
            {photos.length > 0 && (
              <div className={`overflow-hidden rounded-xl border p-2.5 space-y-2 ${cardBg}`}>
                <img
                  src={photos[activePhotoIdx] || photos[0]}
                  alt={report.title}
                  className="h-44 w-full rounded-lg object-cover"
                />
                {photos.length > 1 && (
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((photoUrl, idx) => (
                      <button
                        key={`${photoUrl}-${idx}`}
                        type="button"
                        onClick={() => setActivePhotoIdx(idx)}
                        className={`overflow-hidden rounded-lg border-2 h-14 transition ${
                          activePhotoIdx === idx
                            ? 'border-sky-500'
                            : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={photoUrl}
                          alt={`Evidence ${idx + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Grounded Authority Routing Card */}
            <div className={`rounded-xl border p-4 space-y-2.5 ${cardBg}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                  <Building2 className="h-4 w-4 text-sky-500" />
                  <span>Routed Authority</span>
                </div>
                {report.authority_details.verified ? (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="h-3 w-3" /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                    <ShieldAlert className="h-3 w-3" /> Unverified
                  </span>
                )}
              </div>

              <div className="text-xs font-bold">{report.authority_details.authorityName}</div>
              <p className={`text-[11px] leading-relaxed ${mutedText}`}>
                {report.authority_details.whyRecommended}
              </p>

              {report.authority_details.officialUrl && (
                <a
                  href={report.authority_details.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#0f172a] dark:bg-sky-500 px-3 py-2 text-xs font-bold text-white dark:text-slate-950 hover:opacity-90 transition"
                >
                  <span>Open Official Portal</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Duplicate Matches (if any) */}
        {relatedDuplicates.length > 0 && (
          <div className={`rounded-xl border p-4 space-y-2 ${cardBg}`}>
            <div className="flex items-center gap-2 text-xs font-bold">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>Related Nearby Tickets ({relatedDuplicates.length})</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {relatedDuplicates.map((dup) => {
                const targetReport = allReports.find((r) => r.id === dup.reportId);
                return (
                  <div
                    key={dup.reportId}
                    className="flex items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs"
                  >
                    <div>
                      <div className="font-bold line-clamp-1">{dup.title}</div>
                      <div className={`text-[11px] ${mutedText}`}>
                        {dup.distanceMeters}m away • {dup.status}
                      </div>
                    </div>
                    {targetReport && (
                      <button
                        type="button"
                        onClick={() => onSelectRelatedReport(targetReport)}
                        className="rounded bg-amber-500/20 px-2.5 py-1 text-[11px] font-bold hover:bg-amber-500/30 shrink-0"
                      >
                        View
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Status Update & Activity Timeline */}
        <div className={`grid grid-cols-1 gap-5 lg:grid-cols-12 rounded-xl border p-4 ${cardBg}`}>
          <div className="lg:col-span-5 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Update Status
            </h3>
            <form onSubmit={handleStatusSave} className="space-y-2">
              <div className="grid grid-cols-2 gap-1.5">
                {STATUS_OPTIONS.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSelectedStatus(st)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                      selectedStatus === st
                        ? 'border-[#0f172a] bg-[#0f172a] text-white dark:border-sky-400 dark:bg-sky-500 dark:text-slate-950'
                        : isDark
                        ? 'border-slate-700 bg-slate-900 text-slate-300'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Add action note..."
                className={`w-full rounded-lg border px-3 py-1.5 text-xs focus:outline-none ${inputClass}`}
              />
              <button
                type="submit"
                disabled={isUpdatingStatus}
                className="w-full rounded-lg bg-[#0f172a] dark:bg-sky-500 px-3 py-2 text-xs font-bold text-white dark:text-slate-950 hover:opacity-90 transition"
              >
                {isUpdatingStatus ? 'Saving...' : 'Save Status'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Activity History ({report.status_history.length})
            </h3>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {[...report.status_history].reverse().map((item, idx) => (
                <div
                  key={`${item.timestamp}-${idx}`}
                  className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-xs ${
                    isDark
                      ? 'border-slate-800 bg-slate-900'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold">{item.status}</span>
                      <span className={`inline-flex items-center gap-1 text-[10px] ${mutedText}`}>
                        <Clock className="h-3 w-3" />
                        {new Date(item.timestamp).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    <p className={`mt-0.5 text-[11px] ${mutedText}`}>{item.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
};
