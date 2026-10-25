import React, { useEffect, useRef, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Plus,
  Save,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import {
  AuthorityChannel,
  IssueCategory,
  SystemConfigStatus,
} from '../types/civic';
import { attachDialogLightDismissFallback } from '../utils/dialogAndFormUtils';

interface DirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  directory: AuthorityChannel[];
  systemConfig: SystemConfigStatus | null;
  onSaveChannel: (channel: AuthorityChannel) => Promise<void>;
  onSaveRuntimeKey: (apiKey: string) => Promise<void>;
  isDark: boolean;
}

const ALL_CATEGORIES: IssueCategory[] = [
  'Road Damage',
  'Waste',
  'Street Lighting',
  'Accessibility',
  'Other',
];

export const DirectoryModal: React.FC<DirectoryModalProps> = ({
  isOpen,
  onClose,
  directory,
  systemConfig,
  onSaveChannel,
  onSaveRuntimeKey,
  isDark,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [editingChannel, setEditingChannel] = useState<AuthorityChannel | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [savingChannel, setSavingChannel] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    return attachDialogLightDismissFallback(dialogRef.current, onClose);
  }, [onClose]);

  const handleChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChannel) return;
    setSavingChannel(true);
    setFeedback(null);
    try {
      await onSaveChannel(editingChannel);
      setFeedback(`Saved "${editingChannel.name}" and updated authority routing.`);
      setEditingChannel(null);
    } finally {
      setSavingChannel(false);
    }
  };

  const handleKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKey(true);
    setFeedback(null);
    try {
      await onSaveRuntimeKey(apiKeyInput);
      setApiKeyInput('');
      setFeedback(
        apiKeyInput.trim()
          ? 'Live Gemini 3.8 Flash API key saved in server memory.'
          : 'Switched to built-in Demo Triage Mode.'
      );
    } finally {
      setSavingKey(false);
    }
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
      aria-labelledby="directory-modal-title"
      className={`m-auto w-full max-w-2xl rounded-2xl border p-0 shadow-2xl open:flex open:flex-col max-h-[88vh] ${modalShell}`}
    >
      {/* Minimalist Top Bar matching SmartRoad Header */}
      <div className="flex items-center justify-between bg-[#0f172a] px-6 py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sky-400">
            <User className="h-4 w-4" />
          </div>
          <div>
            <h2 id="directory-modal-title" className="text-sm font-bold text-white">
              Coordinator Profile &amp; Settings
            </h2>
            <p className="text-[11px] text-slate-300">
              Multi-Hub Civic Triage • Chennai • SRM • VIT • IIT Palakkad
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-white/10 p-1.5 text-slate-300 hover:bg-white/20 hover:text-white transition"
          aria-label="Close profile and settings modal"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="overflow-y-auto px-6 py-5 space-y-5">
        {feedback && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{feedback}</span>
          </div>
        )}

        {/* 1. Minimalist Profile Summary Card */}
        <div className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 ${cardBg}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0f172a] text-white font-bold text-sm dark:bg-sky-500 dark:text-slate-950">
              CC
            </div>
            <div>
              <div className="text-sm font-bold">Civic Coordinator</div>
              <div className={`text-xs ${mutedText}`}>
                Role: Municipal &amp; Campus Triage Administrator
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {directory.length} Verified Authorities Active
            </span>
          </div>
        </div>

        {/* 2. Minimalist AI Key Settings */}
        <div className={`rounded-xl border p-4 space-y-3 ${cardBg}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-sky-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Gemini Vision AI Engine
              </h3>
            </div>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                systemConfig?.aiConfigured
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
              }`}
            >
              {systemConfig?.aiConfigured ? 'Gemini 3.8 Flash Live' : 'Built-In Demo Mode'}
            </span>
          </div>

          <p className={`text-xs ${mutedText}`}>
            Works out-of-the-box in Demo Mode, or paste a <code className="font-mono">GEMINI_API_KEY</code> below to enable live Gemini 3.8 Flash multimodal analysis.
          </p>

          <form onSubmit={handleKeySubmit} className="flex flex-wrap gap-2">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Optional: Paste GEMINI_API_KEY..."
              className={`flex-1 min-w-[220px] rounded-lg border px-3 py-1.5 text-xs focus:border-sky-500 focus:outline-none ${inputClass}`}
            />
            <button
              type="submit"
              disabled={savingKey}
              className="rounded-lg bg-[#0f172a] dark:bg-sky-500 px-4 py-1.5 text-xs font-bold text-white dark:text-slate-950 hover:opacity-90 transition"
            >
              {savingKey ? 'Saving...' : apiKeyInput.trim() ? 'Save API Key' : 'Use Demo Mode'}
            </button>
          </form>
        </div>

        {/* 3. Clean Authority Channels List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-sky-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Official Authority Directory ({directory.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() =>
                setEditingChannel({
                  id: `custom-${Date.now().toString(36)}`,
                  name: '',
                  jurisdiction: 'Greater Chennai Corporation, TN',
                  categories: ['Road Damage'],
                  officialUrl: 'https://chennaicorporation.gov.in/',
                  verified: true,
                  contactMethod: 'GCC 1913 Helpline / Namma Chennai App',
                  routingRationale: '',
                  notes: '',
                })
              }
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                isDark
                  ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                  : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Plus className="h-3.5 w-3.5" /> Add Authority
            </button>
          </div>

          {editingChannel && (
            <form
              onSubmit={handleChannelSubmit}
              className={`rounded-xl border p-4 space-y-3 ${cardBg}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">
                  {editingChannel.name || 'New Authority Channel'}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingChannel(null)}
                  className={`text-xs font-semibold ${mutedText} hover:underline`}
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>
                    Authority Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingChannel.name}
                    onChange={(e) =>
                      setEditingChannel({ ...editingChannel, name: e.target.value })
                    }
                    className={`w-full rounded-lg border px-3 py-1.5 text-xs ${inputClass}`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>
                    Jurisdiction *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingChannel.jurisdiction}
                    onChange={(e) =>
                      setEditingChannel({ ...editingChannel, jurisdiction: e.target.value })
                    }
                    className={`w-full rounded-lg border px-3 py-1.5 text-xs ${inputClass}`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>
                    Official Portal URL
                  </label>
                  <input
                    type="url"
                    value={editingChannel.officialUrl}
                    onChange={(e) =>
                      setEditingChannel({ ...editingChannel, officialUrl: e.target.value })
                    }
                    className={`w-full rounded-lg border px-3 py-1.5 text-xs ${inputClass}`}
                  />
                </div>
                <div>
                  <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>
                    Helpline / Contact
                  </label>
                  <input
                    type="text"
                    value={editingChannel.contactMethod}
                    onChange={(e) =>
                      setEditingChannel({ ...editingChannel, contactMethod: e.target.value })
                    }
                    className={`w-full rounded-lg border px-3 py-1.5 text-xs ${inputClass}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-[11px] font-semibold mb-1 ${mutedText}`}>
                  Categories Handled
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_CATEGORIES.map((cat) => {
                    const active = editingChannel.categories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          const next = active
                            ? editingChannel.categories.filter((c) => c !== cat)
                            : [...editingChannel.categories, cat];
                          setEditingChannel({
                            ...editingChannel,
                            categories: next.length ? next : ['Other'],
                          });
                        }}
                        className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                          active
                            ? 'border-[#0f172a] bg-[#0f172a] text-white dark:border-sky-400 dark:bg-sky-500 dark:text-slate-950'
                            : isDark
                            ? 'border-slate-700 bg-slate-900 text-slate-400'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingChannel.verified}
                    onChange={(e) =>
                      setEditingChannel({ ...editingChannel, verified: e.target.checked })
                    }
                    className="rounded"
                  />
                  Verified Official Channel
                </label>

                <button
                  type="submit"
                  disabled={savingChannel}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f172a] dark:bg-sky-500 px-4 py-1.5 text-xs font-bold text-white dark:text-slate-950 hover:opacity-90"
                >
                  <Save className="h-3.5 w-3.5" />
                  {savingChannel ? 'Saving...' : 'Save Authority'}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-2">
            {directory.map((ch) => (
              <div
                key={ch.id}
                className={`flex flex-col justify-between gap-3 rounded-xl border p-3.5 sm:flex-row sm:items-center ${cardBg}`}
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-xs">{ch.name}</span>
                    {ch.verified ? (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="h-3 w-3" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        <ShieldAlert className="h-3 w-3" /> Unverified
                      </span>
                    )}
                  </div>
                  <div className={`flex flex-wrap items-center gap-3 text-[11px] ${mutedText}`}>
                    <span>{ch.contactMethod}</span>
                    {ch.officialUrl && (
                      <a
                        href={ch.officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                      >
                        Portal <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingChannel(ch)}
                  className={`self-start rounded-lg border px-3 py-1 text-xs font-semibold sm:self-center shrink-0 ${
                    isDark
                      ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </dialog>
  );
};
