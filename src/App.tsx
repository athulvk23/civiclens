import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Edit3,
  ExternalLink,
  Filter,
  LayoutGrid,
  List,
  MapPin,
  Moon,
  Navigation,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  Ticket,
  User,
  X,
} from 'lucide-react';
import {
  AuthorityChannel,
  CivicReport,
  DuplicateMatch,
  IssueCategory,
  IssueSeverity,
  IssueStatus,
  SystemConfigStatus,
} from './types/civic';
import { findPotentialDuplicates } from './utils/duplicateDetection';
import {
  LocationHub,
  QUICK_LOCATION_HUBS,
  searchPlaceByName,
} from './utils/locationHubs';
import { CivicMap } from './components/CivicMap';
import { ReportFormModal } from './components/ReportFormModal';
import { ReportDetailModal } from './components/ReportDetailModal';
import { DirectoryModal } from './components/DirectoryModal';

const CATEGORIES: Array<'All' | IssueCategory> = [
  'All',
  'Road Damage',
  'Waste',
  'Street Lighting',
  'Accessibility',
  'Other',
];

function formatTicketCode(report: CivicReport): string {
  const num = report.id.replace(/[^0-9]/g, '').slice(-3) || '456';
  const prefix =
    report.category === 'Road Damage'
      ? 'RD'
      : report.category === 'Waste'
      ? 'WS'
      : report.category === 'Street Lighting'
      ? 'SL'
      : report.category === 'Accessibility'
      ? 'AC'
      : 'CL';
  return `${prefix}-3426-${num.padStart(3, '0')}`;
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '24 Oct, 2026';
  }
}

export function App() {
  const [reports, setReports] = useState<CivicReport[]>([]);
  const [directory, setDirectory] = useState<AuthorityChannel[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfigStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Theme management synced with <meta name="color-scheme"> per modern-web-guidance
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const meta = document.querySelector('meta[name="color-scheme"]');
      const content = meta?.getAttribute('content') || localStorage.getItem('color-scheme') || 'light';
      if (content === 'dark') return true;
      if (content === 'light') return false;
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    } catch {
      return false;
    }
  });

  const handleToggleTheme = () => {
    const nextDark = !isDark;
    const targetScheme = nextDark ? 'dark' : 'light';
    setIsDark(nextDark);
    try {
      const sysDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
      const sysScheme = sysDark ? 'dark' : 'light';
      const meta = document.querySelector('meta[name="color-scheme"]');
      if (targetScheme === sysScheme) {
        localStorage.removeItem('color-scheme');
        if (meta) meta.setAttribute('content', 'light dark');
      } else {
        localStorage.setItem('color-scheme', targetScheme);
        if (meta) meta.setAttribute('content', targetScheme);
      }
    } catch {
      // Ignore storage restrictions
    }
  };

  // Active Region / Campus Hub & Map Focus
  const [activeHub, setActiveHub] = useState<LocationHub>(QUICK_LOCATION_HUBS[0]);
  const [mapFocus, setMapFocus] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
  } | null>({
    lat: QUICK_LOCATION_HUBS[0].lat,
    lng: QUICK_LOCATION_HUBS[0].lng,
    zoom: QUICK_LOCATION_HUBS[0].zoom,
  });

  // Left Panel Mode: 'inspector' (single ticket like SmartRoad screenshot) vs 'list' (All Tickets + Summary)
  const [leftPanelMode, setLeftPanelMode] = useState<'inspector' | 'list'>('inspector');
  const [showJudgeWalkthrough, setShowJudgeWalkthrough] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | IssueCategory>('All');
  const [selectedSeverity, setSelectedSeverity] = useState<'All' | IssueSeverity>('All');
  const [selectedStatus, setSelectedStatus] = useState<'All' | IssueStatus>('All');

  // Selection & Modals
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [detailModalReport, setDetailModalReport] = useState<CivicReport | null>(null);
  const [isReportFormOpen, setIsReportFormOpen] = useState(false);
  const [isDirectoryOpen, setIsDirectoryOpen] = useState(false);

  // Inline comment & copy state in left inspector
  const [commentInput, setCommentInput] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [copiedField, setCopiedField] = useState<'address' | 'coords' | null>(null);

  const fetchBootstrapData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/bootstrap');
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
        setDirectory(data.directory || []);
        setSystemConfig(data.config || null);
        if (data.reports?.length && !selectedReportId) {
          setSelectedReportId(data.reports[0].id);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedReportId]);

  useEffect(() => {
    fetchBootstrapData();
  }, []);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      if (selectedCategory !== 'All' && report.category !== selectedCategory) {
        return false;
      }
      if (selectedSeverity !== 'All' && report.severity !== selectedSeverity) {
        return false;
      }
      if (selectedStatus !== 'All' && report.status !== selectedStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${formatTicketCode(report)} ${report.title} ${report.description} ${
          report.raw_complaint
        } ${report.location.address} ${report.location.neighborhood} ${
          report.recommended_authority
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [reports, selectedCategory, selectedSeverity, selectedStatus, searchQuery]);

  const activeReport = useMemo(() => {
    return (
      reports.find((r) => r.id === selectedReportId) ||
      filteredReports[0] ||
      reports[0] ||
      null
    );
  }, [reports, filteredReports, selectedReportId]);

  const activeReportDuplicates = useMemo(() => {
    if (!activeReport) return [];
    return findPotentialDuplicates(
      {
        title: activeReport.title,
        description: `${activeReport.description} ${activeReport.raw_complaint}`,
        category: activeReport.category,
        lat: activeReport.location.lat,
        lng: activeReport.location.lng,
        excludeId: activeReport.id,
      },
      reports
    );
  }, [activeReport, reports]);

  // Dynamic Community Summary & Stats
  const stats = useMemo(() => {
    const total = reports.length;
    const communityCount = reports.filter((r) => !r.is_sample_data).length;
    const sampleCount = reports.filter((r) => r.is_sample_data).length;
    const submittedCount = reports.filter((r) => r.status === 'Submitted').length;
    const underReviewCount = reports.filter((r) => r.status === 'Under Review').length;
    const inProgressCount = reports.filter((r) => r.status === 'In Progress').length;
    const resolvedCount = reports.filter((r) => r.status === 'Resolved').length;

    const narrative =
      total === 0
        ? 'No civic tickets logged yet. Click "+ New Ticket" to submit an issue.'
        : `Tracking ${total} tickets across active hubs (${communityCount} genuine community ${
            communityCount === 1 ? 'submission' : 'submissions'
          } & ${sampleCount} labeled sample ${
            sampleCount === 1 ? 'ticket' : 'tickets'
          }): ${submittedCount} Submitted, ${underReviewCount} Under Review, ${inProgressCount} In Progress, and ${resolvedCount} Resolved.`;

    return {
      total,
      communityCount,
      sampleCount,
      submittedCount,
      underReviewCount,
      inProgressCount,
      resolvedCount,
      narrative,
    };
  }, [reports]);

  const handleSelectHub = (hub: LocationHub) => {
    setActiveHub(hub);
    setMapFocus({ lat: hub.lat, lng: hub.lng, zoom: hub.zoom });
    const nearbyReport = reports.find(
      (r) =>
        Math.abs(r.location.lat - hub.lat) < 0.08 &&
        Math.abs(r.location.lng - hub.lng) < 0.08
    );
    if (nearbyReport) {
      setSelectedReportId(nearbyReport.id);
      setLeftPanelMode('inspector');
    }
  };

  const handleSearchOrJump = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // If query doesn't match existing tickets, jump map to that place via OpenStreetMap Nominatim!
    const places = await searchPlaceByName(searchQuery);
    if (places.length > 0) {
      const top = places[0];
      const shortName = top.displayName.split(',')[0].trim();
      const customHub: LocationHub = {
        id: `custom-${Date.now()}`,
        shortLabel: shortName,
        fullName: top.displayName,
        address: top.displayName.split(',').slice(0, 4).join(',').trim(),
        neighborhood: top.neighborhood,
        lat: top.lat,
        lng: top.lng,
        zoom: top.zoom || 15,
        sampleComplaint: `Deep asphalt pothole and damaged roadside curb near ${shortName} causing two-wheelers and pedestrians to swerve.`,
        duplicateComplaint: `Large pothole and crumbled road surface near ${shortName} creating a hazard.`,
      };
      setActiveHub(customHub);
      setMapFocus({ lat: top.lat, lng: top.lng, zoom: top.zoom || 15 });
    }
  };

  const handleCopyText = (text: string, field: 'address' | 'coords') => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleReportSubmitted = (
    newReport: CivicReport,
    _duplicates: DuplicateMatch[]
  ) => {
    setReports((prev) => [newReport, ...prev]);
    setSelectedReportId(newReport.id);
    setLeftPanelMode('inspector');
    setMapFocus({
      lat: newReport.location.lat,
      lng: newReport.location.lng,
      zoom: 16,
    });
    setIsReportFormOpen(false);
  };

  const handleUpdateStatus = async (
    reportId: string,
    newStatus: IssueStatus,
    note: string
  ) => {
    const res = await fetch(`/api/reports/${encodeURIComponent(reportId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        note,
        actor: 'Civic Coordinator',
      }),
    });
    if (!res.ok) return;
    const data = await res.json();
    const updatedReport: CivicReport = data.report;

    setReports((prev) =>
      prev.map((r) => (r.id === updatedReport.id ? updatedReport : r))
    );
    if (detailModalReport?.id === updatedReport.id) {
      setDetailModalReport(updatedReport);
    }
  };

  const handleAddInlineComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReport || !commentInput.trim()) return;
    setIsSavingComment(true);
    try {
      await handleUpdateStatus(activeReport.id, activeReport.status, commentInput.trim());
      setCommentInput('');
    } finally {
      setIsSavingComment(false);
    }
  };

  const handleSaveChannel = async (channel: AuthorityChannel) => {
    const res = await fetch('/api/directory', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setDirectory(data.directory);
    setReports(data.reports);
  };

  const handleSaveRuntimeKey = async (apiKey: string) => {
    const res = await fetch('/api/config/runtime-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setSystemConfig(data.config);
  };

  const handleResetDemo = async () => {
    const res = await fetch('/api/reset-demo', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      setReports(data.reports || []);
      setDirectory(data.directory || []);
      setSystemConfig(data.config || null);
      setSelectedCategory('All');
      setSelectedSeverity('All');
      setSelectedStatus('All');
      setSearchQuery('');
      setActiveHub(QUICK_LOCATION_HUBS[0]);
      setMapFocus({
        lat: QUICK_LOCATION_HUBS[0].lat,
        lng: QUICK_LOCATION_HUBS[0].lng,
        zoom: QUICK_LOCATION_HUBS[0].zoom,
      });
      if (data.reports?.length) {
        setSelectedReportId(data.reports[0].id);
        setLeftPanelMode('inspector');
      }
    }
  };

  // Theme classes
  const appOuterBg = isDark ? 'bg-[#090d16] text-slate-100' : 'bg-[#e2e8f0] text-slate-900';
  const shellBg = isDark
    ? 'bg-slate-900 border-slate-800 shadow-2xl'
    : 'bg-white border-slate-300/90 shadow-xl';
  const toolbarBg = isDark
    ? 'bg-slate-900 border-slate-800'
    : 'bg-white border-slate-200';
  const leftPanelBg = isDark
    ? 'bg-slate-900 border-slate-800'
    : 'bg-white border-slate-200';
  const infoCardBg = isDark
    ? 'bg-slate-950/70 border-slate-800/90 text-slate-200'
    : 'bg-[#f8fafc] border-slate-200/80 text-slate-800';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-500';
  const floatingChipBg = isDark
    ? 'bg-slate-900/95 text-slate-200 border-slate-700 shadow-lg'
    : 'bg-white/95 text-slate-700 border-slate-200 shadow-md';

  const latestComment =
    activeReport?.status_history[activeReport.status_history.length - 1]?.note ||
    'Initial ticket logged';

  return (
    <div className={`min-h-screen flex flex-col p-0 sm:p-3 transition-colors duration-200 ${appOuterBg}`}>
      {/* SmartRoad-Inspired Framed App Shell */}
      <div className={`mx-auto flex w-full max-w-[1600px] flex-1 flex-col overflow-hidden sm:rounded-2xl border ${shellBg}`}>
        {/* 1. TOP NAVY HEADER BAR */}
        <header className="flex flex-wrap items-center justify-between gap-3 bg-[#0f172a] px-4 py-2.5 text-white">
          <div className="flex items-center gap-6">
            {/* Brand Logo */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 font-black text-sky-400 tracking-tighter text-lg">
                C
              </div>
              <span className="text-base font-extrabold tracking-tight text-white">
                CivicLens
              </span>
            </div>

            {/* 1-Click Campus / City Switcher Pills */}
            <div className="hidden md:flex items-center gap-1.5 rounded-xl bg-slate-900/90 p-1 border border-slate-800">
              {QUICK_LOCATION_HUBS.map((hub) => {
                const isActive = activeHub.id === hub.id;
                return (
                  <button
                    key={hub.id}
                    type="button"
                    onClick={() => handleSelectHub(hub)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      isActive
                        ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                    }`}
                  >
                    {hub.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2.5">
            {/* AI Engine Status Badge */}
            <button
              type="button"
              onClick={() => setIsDirectoryOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-[11px] font-medium text-slate-200 hover:border-sky-400 transition"
              title="Configure Gemini Vision API Key or Authority Directory"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  systemConfig?.aiConfigured ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span>
                {systemConfig?.aiConfigured ? 'Gemini 3.8 Live' : 'Demo Triage Mode'}
              </span>
            </button>

            {/* Judge Walkthrough Toggle */}
            <button
              type="button"
              onClick={() => setShowJudgeWalkthrough((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                showJudgeWalkthrough
                  ? 'border-sky-400 bg-sky-500/20 text-sky-200'
                  : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
              title="Toggle 2-Minute Judge Demo Guide"
            >
              <Bell className="h-3.5 w-3.5 text-sky-400" />
              <span className="hidden sm:inline">Demo Guide</span>
            </button>

            {/* Light / Dark Mode Toggle */}
            <button
              type="button"
              onClick={handleToggleTheme}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-800/80 text-slate-200 hover:border-sky-400 hover:text-white transition"
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-sky-300" />
              )}
            </button>

            {/* Profile / Authority Settings Pill (matching screenshot's "John Jones / Manage Profile") */}
            <button
              type="button"
              onClick={() => setIsDirectoryOpen(true)}
              className="flex items-center gap-2.5 rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-1 text-left hover:border-slate-600 transition"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-slate-200">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="hidden sm:block leading-tight">
                <div className="text-[11px] font-bold text-white">Civic Coordinator</div>
                <div className="text-[9px] text-slate-400">Manage Directory & AI</div>
              </div>
            </button>
          </div>
        </header>

        {/* Collapsible Judge Demo Walkthrough Strip */}
        {showJudgeWalkthrough && (
          <div className="border-b border-sky-500/30 bg-sky-950/90 px-4 py-2.5 text-xs text-sky-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold text-sky-300 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> 2-Min Demo Flow:
              </span>
              <span>1. Pick hub (Chennai / SRM / VIT / IIT Palakkad)</span>
              <span>→</span>
              <span>2. Click <strong>+ New Ticket</strong> &amp; load sample photo</span>
              <span>→</span>
              <span>3. Check AI evidence &amp; GCC/Campus routing</span>
              <span>→</span>
              <span>4. Test duplicate detection &amp; update status</span>
            </div>
            <button
              type="button"
              onClick={() => setShowJudgeWalkthrough(false)}
              className="text-sky-300 hover:text-white text-[11px] font-semibold"
            >
              Close
            </button>
          </div>
        )}

        {/* 2. BODY: LEFT SLIM ICON RAIL + MAIN CONTENT */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left Slim Icon Sidebar (matching screenshot's Home / Tickets / Settings rail) */}
          <aside className="hidden sm:flex w-16 shrink-0 flex-col items-center justify-between border-r border-slate-800 bg-[#111827] py-4 text-slate-400">
            <div className="flex flex-col items-center gap-4 w-full">
              <button
                type="button"
                onClick={() => setLeftPanelMode('list')}
                className={`flex flex-col items-center gap-1 w-full py-2 text-[10px] font-semibold transition border-l-2 ${
                  leftPanelMode === 'list'
                    ? 'border-white text-white bg-white/5'
                    : 'border-transparent hover:text-slate-200'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                <span>Home</span>
              </button>

              <button
                type="button"
                onClick={() => setLeftPanelMode('inspector')}
                className={`flex flex-col items-center gap-1 w-full py-2 text-[10px] font-semibold transition border-l-2 ${
                  leftPanelMode === 'inspector'
                    ? 'border-white text-white bg-white/5'
                    : 'border-transparent hover:text-slate-200'
                }`}
              >
                <Ticket className="h-4 w-4" />
                <span>Tickets</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDirectoryOpen(true)}
                className="flex flex-col items-center gap-1 w-full py-2 text-[10px] font-semibold border-l-2 border-transparent hover:text-slate-200 transition"
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetDemo}
              className="flex flex-col items-center gap-1 py-2 text-[10px] text-slate-400 hover:text-white transition"
              title="Reset sample dataset"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Reset</span>
            </button>
          </aside>

          {/* Main Workspace Container */}
          <div className="flex flex-1 flex-col min-w-0">
            {/* Sub-Header Toolbar: Search Left + All Tickets & "+ New Ticket" Right */}
            <div className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5 ${toolbarBg}`}>
              <form
                onSubmit={handleSearchOrJump}
                className="flex items-center gap-2 flex-1 max-w-md"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tickets or type any place (SRM, VIT, IIT Palakkad)..."
                    className={`w-full rounded-lg border px-3.5 py-1.5 pr-8 text-xs focus:border-sky-500 focus:outline-none ${
                      isDark
                        ? 'border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500'
                        : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                  <button
                    type="submit"
                    title="Search or jump map to typed place"
                    className="absolute right-2.5 top-1.5 opacity-60 hover:opacity-100"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              </form>

              {/* Mobile Hub Switcher */}
              <div className="flex md:hidden flex-wrap gap-1">
                {QUICK_LOCATION_HUBS.map((hub) => (
                  <button
                    key={hub.id}
                    type="button"
                    onClick={() => handleSelectHub(hub)}
                    className={`rounded px-2 py-1 text-[10px] font-bold ${
                      activeHub.id === hub.id
                        ? 'bg-[#0f172a] text-white dark:bg-sky-500 dark:text-slate-950'
                        : 'border border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {hub.shortLabel}
                  </button>
                ))}
              </div>

              {/* Right Action Buttons: All Tickets + "+ New Ticket" */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    setLeftPanelMode((m) => (m === 'list' ? 'inspector' : 'list'))
                  }
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition ${
                    leftPanelMode === 'list'
                      ? 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-300'
                      : isDark
                      ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                      : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Ticket className="h-3.5 w-3.5" />
                  <span>All Tickets ({filteredReports.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsReportFormOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f172a] dark:bg-sky-500 px-4 py-1.5 text-xs font-bold text-white dark:text-slate-950 shadow-sm hover:opacity-90 transition"
                >
                  <Plus className="h-4 w-4" />
                  <span>New Ticket</span>
                </button>
              </div>
            </div>

            {/* 3. SPLIT WORKSPACE: LEFT TICKET INSPECTOR / LIST + RIGHT FULL-HEIGHT MAP */}
            <div className="grid flex-1 grid-cols-1 lg:grid-cols-12 min-h-[580px] overflow-hidden">
              {/* LEFT PANEL (~42% width on desktop) */}
              <div className={`lg:col-span-5 border-r overflow-y-auto p-5 space-y-4 max-h-[640px] ${leftPanelBg}`}>
                {isLoading ? (
                  <div className={`py-16 text-center text-xs ${mutedText}`}>
                    Loading civic tickets...
                  </div>
                ) : leftPanelMode === 'inspector' && activeReport ? (
                  /* === SMARTROAD-STYLE SINGLE TICKET INSPECTOR === */
                  <div className="space-y-4">
                    {/* Ticket ID Header Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="text-xl font-extrabold tracking-tight text-[#1e3a8a] dark:text-sky-400">
                          {formatTicketCode(activeReport)}
                        </h2>
                        <p className="mt-0.5 text-xs font-semibold leading-snug">
                          {activeReport.title}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setDetailModalReport(activeReport)}
                          title="Open Full AI JSON & Timeline Modal"
                          className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
                            isDark
                              ? 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
                              : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setLeftPanelMode('list')}
                          title="Back to All Tickets List"
                          className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${
                            isDark
                              ? 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
                              : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Severity & Status Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-[11px] font-bold text-white ${
                          activeReport.severity === 'Critical' ||
                          activeReport.severity === 'High'
                            ? 'bg-red-500'
                            : activeReport.severity === 'Medium'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                      >
                        ● {activeReport.severity}
                      </span>

                      <span className="inline-flex items-center rounded-md bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        {activeReport.status}
                      </span>

                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                          activeReport.is_sample_data
                            ? isDark
                              ? 'bg-slate-800 text-slate-300'
                              : 'bg-slate-200 text-slate-700'
                            : 'bg-sky-500/15 text-sky-600 dark:text-sky-300'
                        }`}
                      >
                        {activeReport.is_sample_data
                          ? 'Sample Data'
                          : 'Community Submission'}
                      </span>
                    </div>

                    {/* Card 1: Raised On, Address (with Copy), Coordinates (with Copy) */}
                    <div className={`rounded-xl border p-3.5 space-y-2.5 text-xs ${infoCardBg}`}>
                      <div className="flex items-center justify-between gap-4">
                        <span className={mutedText}>Ticket Raised On</span>
                        <span className="font-semibold">
                          {formatShortDate(activeReport.created_at)}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-4">
                        <span className={`shrink-0 ${mutedText}`}>Address</span>
                        <div className="flex items-center gap-2 text-right">
                          <span className="font-semibold leading-snug max-w-[220px]">
                            {activeReport.location.address}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyText(activeReport.location.address, 'address')
                            }
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:opacity-80"
                            title="Copy address"
                          >
                            {copiedField === 'address' ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className={mutedText}>Coordinates</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold">
                            {activeReport.location.lat.toFixed(5)},{' '}
                            {activeReport.location.lng.toFixed(5)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyText(
                                `${activeReport.location.lat.toFixed(5)}, ${activeReport.location.lng.toFixed(5)}`,
                                'coords'
                              )
                            }
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:opacity-80"
                            title="Copy coordinates"
                          >
                            {copiedField === 'coords' ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Incident Type, Status, Authority, Evidence & Inline Comment Bar */}
                    <div className={`rounded-xl border p-3.5 space-y-2.5 text-xs ${infoCardBg}`}>
                      <div className="flex items-center justify-between gap-4">
                        <span className={mutedText}>Incident Type</span>
                        <span className="font-bold">{activeReport.category}</span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className={mutedText}>Work Progress Status</span>
                        <select
                          aria-label="Update Work Progress Status"
                          value={activeReport.status}
                          onChange={(e) =>
                            handleUpdateStatus(
                              activeReport.id,
                              e.target.value as IssueStatus,
                              `Status updated to ${e.target.value}.`
                            )
                          }
                          className={`rounded-lg border px-2.5 py-1 text-xs font-bold focus:outline-none ${
                            isDark
                              ? 'border-slate-700 bg-slate-900 text-sky-300'
                              : 'border-slate-300 bg-white text-slate-900'
                          }`}
                        >
                          {(
                            [
                              'Submitted',
                              'Under Review',
                              'In Progress',
                              'Resolved',
                            ] as IssueStatus[]
                          ).map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-start justify-between gap-4">
                        <span className={`shrink-0 ${mutedText}`}>Routed Authority</span>
                        <div className="text-right">
                          <span className="font-semibold block leading-snug">
                            {activeReport.recommended_authority}
                          </span>
                          {activeReport.authority_details.officialUrl && (
                            <a
                              href={activeReport.authority_details.officialUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline mt-0.5"
                            >
                              {activeReport.authority_details.verified ? (
                                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <ShieldAlert className="h-3 w-3 text-amber-500" />
                              )}
                              <span>Official Portal</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className={mutedText}>Last Updated Date</span>
                        <span className="font-semibold">
                          {formatShortDate(activeReport.updated_at)}
                        </span>
                      </div>

                      <div className="pt-1 border-t border-slate-200/70 dark:border-slate-800">
                        <span className={`block text-[11px] ${mutedText}`}>
                          AI Evidence Summary
                        </span>
                        <p className="mt-0.5 text-[11px] leading-relaxed">
                          {activeReport.evidence_summary}
                        </p>
                      </div>

                      <div className="pt-1 border-t border-slate-200/70 dark:border-slate-800">
                        <span className={`block text-[11px] ${mutedText}`}>
                          Recommended Action
                        </span>
                        <p className="mt-0.5 text-[11px] font-medium leading-relaxed">
                          {activeReport.recommended_action}
                        </p>
                      </div>

                      {/* Duplicate Detection Match Row */}
                      {activeReportDuplicates.length > 0 && (
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                            <span>
                              {activeReportDuplicates.length} similar nearby ticket (
                              {activeReportDuplicates[0].distanceMeters}m away)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const match = reports.find(
                                (r) => r.id === activeReportDuplicates[0].reportId
                              );
                              if (match) setSelectedReportId(match.id);
                            }}
                            className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 shrink-0"
                          >
                            View Match
                          </button>
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-4 pt-1 border-t border-slate-200/70 dark:border-slate-800">
                        <span className={`shrink-0 ${mutedText}`}>Comments</span>
                        <span className="font-medium text-right">{latestComment}</span>
                      </div>

                      {/* Inline "Type here... + Add Comment" Box matching screenshot */}
                      <form
                        onSubmit={handleAddInlineComment}
                        className={`mt-2 flex items-center gap-2 rounded-lg border p-1 ${
                          isDark
                            ? 'border-slate-700 bg-slate-900'
                            : 'border-slate-200 bg-white'
                        }`}
                      >
                        <input
                          type="text"
                          value={commentInput}
                          onChange={(e) => setCommentInput(e.target.value)}
                          placeholder="Type follow-up note here..."
                          className="flex-1 bg-transparent px-2.5 py-1 text-xs focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={isSavingComment || !commentInput.trim()}
                          className="rounded-md bg-[#0f172a] dark:bg-sky-500 px-3 py-1.5 text-[11px] font-bold text-white dark:text-slate-950 hover:opacity-90 disabled:opacity-40 transition shrink-0"
                        >
                          {isSavingComment ? 'Adding...' : 'Add Comment'}
                        </button>
                      </form>
                    </div>

                    {/* Photos Gallery Section matching screenshot's 3-photo row */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold">Photos</h3>
                        <button
                          type="button"
                          onClick={() => setDetailModalReport(activeReport)}
                          className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                        >
                          Inspect Full Details &amp; JSON →
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        {(activeReport.gallery_photos &&
                        activeReport.gallery_photos.length > 0
                          ? activeReport.gallery_photos
                          : activeReport.image_data_url
                          ? [activeReport.image_data_url]
                          : []
                        ).map((photoUrl, idx) => (
                          <div
                            key={`${photoUrl}-${idx}`}
                            onClick={() => setDetailModalReport(activeReport)}
                            className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer group relative h-24 bg-slate-100 dark:bg-slate-800"
                          >
                            <img
                              src={photoUrl}
                              alt={`${activeReport.title} — Photo ${idx + 1}`}
                              className="h-full w-full object-cover group-hover:scale-105 transition duration-200"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* === ALL TICKETS LIST + COMMUNITY SUMMARY VIEW === */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-extrabold">
                        All Civic Tickets ({filteredReports.length})
                      </h2>
                      {activeReport && (
                        <button
                          type="button"
                          onClick={() => setLeftPanelMode('inspector')}
                          className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                        >
                          Back to Inspector →
                        </button>
                      )}
                    </div>

                    {/* Live Community Summary Box */}
                    <div className={`rounded-xl border p-3.5 text-xs space-y-2 ${infoCardBg}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold uppercase tracking-wider text-[11px] text-sky-600 dark:text-sky-400">
                          Community Action Summary
                        </span>
                        <span className="text-[10px] font-semibold opacity-75">
                          {stats.communityCount} Genuine • {stats.sampleCount} Sample
                        </span>
                      </div>
                      <p className="leading-relaxed">{stats.narrative}</p>
                    </div>

                    {/* Ticket Cards List */}
                    <div className="space-y-2.5">
                      {filteredReports.map((rep) => {
                        const isSel = rep.id === selectedReportId;
                        return (
                          <div
                            key={rep.id}
                            onClick={() => {
                              setSelectedReportId(rep.id);
                              setLeftPanelMode('inspector');
                              setMapFocus({
                                lat: rep.location.lat,
                                lng: rep.location.lng,
                                zoom: 15,
                              });
                            }}
                            className={`rounded-xl border p-3 cursor-pointer transition ${
                              isSel
                                ? 'border-sky-500 bg-sky-500/5'
                                : isDark
                                ? 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                                : 'border-slate-200 bg-[#f8fafc] hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-extrabold text-xs text-[#1e3a8a] dark:text-sky-400">
                                {formatTicketCode(rep)}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`rounded px-2 py-0.5 text-[10px] font-bold text-white ${
                                    rep.severity === 'Critical' || rep.severity === 'High'
                                      ? 'bg-red-500'
                                      : rep.severity === 'Medium'
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                >
                                  ● {rep.severity}
                                </span>
                                <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                  {rep.status}
                                </span>
                              </div>
                            </div>
                            <div className="text-xs font-bold line-clamp-1">{rep.title}</div>
                            <div className={`mt-1 text-[11px] flex items-center justify-between ${mutedText}`}>
                              <span className="truncate max-w-[240px]">
                                {rep.location.address}
                              </span>
                              <span>{rep.is_sample_data ? 'Sample' : 'Live'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT PANEL: FULL-HEIGHT INTERACTIVE MAP WITH FLOATING CHIPS (~58% width) */}
              <div className="lg:col-span-7 relative min-h-[460px] h-full">
                {/* Floating Top Filter Strip on Map (matching screenshot's Potholes × / Broken drain cover / List view) */}
                <div className="pointer-events-none absolute top-3 left-3 right-3 z-[400] flex flex-wrap items-center justify-between gap-2">
                  <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
                    <span
                      className={`hidden sm:inline-flex h-7 w-7 items-center justify-center rounded-lg border ${floatingChipBg}`}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </span>

                    {CATEGORIES.map((cat) => {
                      const active = selectedCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() =>
                            setSelectedCategory(
                              active && cat !== 'All' ? 'All' : cat
                            )
                          }
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold transition ${
                            active
                              ? 'border-[#0f172a] bg-white text-slate-950 dark:border-sky-400 dark:bg-slate-900 dark:text-white shadow-md font-bold'
                              : `${floatingChipBg} hover:opacity-95`
                          }`}
                        >
                          <span>{cat}</span>
                          {active && cat !== 'All' && (
                            <X className="h-3 w-3 opacity-70" />
                          )}
                        </button>
                      );
                    })}

                    <span
                      className={`hidden sm:inline-flex h-7 w-7 items-center justify-center rounded-lg border ${floatingChipBg}`}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>

                  {/* Right Floating Map Controls: Severity Filter + List View Button */}
                  <div className="pointer-events-auto flex items-center gap-1.5">
                    <div className={`inline-flex items-center rounded-lg border px-2 py-1 text-xs ${floatingChipBg}`}>
                      <Filter className="h-3.5 w-3.5 mr-1 opacity-70" />
                      <select
                        aria-label="Filter map by severity"
                        value={selectedSeverity}
                        onChange={(e) =>
                          setSelectedSeverity(
                            e.target.value as 'All' | IssueSeverity
                          )
                        }
                        className="bg-transparent text-xs font-semibold focus:outline-none"
                      >
                        <option value="All" className="text-slate-900">
                          All Severity
                        </option>
                        <option value="Critical" className="text-slate-900">
                          Critical
                        </option>
                        <option value="High" className="text-slate-900">
                          High
                        </option>
                        <option value="Medium" className="text-slate-900">
                          Medium
                        </option>
                        <option value="Low" className="text-slate-900">
                          Low
                        </option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setLeftPanelMode((m) =>
                          m === 'list' ? 'inspector' : 'list'
                        )
                      }
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-semibold ${floatingChipBg}`}
                    >
                      <List className="h-3.5 w-3.5" />
                      <span>
                        {leftPanelMode === 'list' ? 'Inspector view' : 'List view'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Full-bleed Leaflet Map */}
                <CivicMap
                  reports={filteredReports}
                  selectedReportId={activeReport?.id || null}
                  focusCenter={mapFocus}
                  onSelectReport={(rep) => {
                    setSelectedReportId(rep.id);
                    setLeftPanelMode('inspector');
                  }}
                  heightClass="h-full min-h-[540px]"
                />
              </div>
            </div>

            {/* 4. BOTTOM STATUS BAR (Matching the screenshot's bottom strip!) */}
            <footer
              className={`flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2 text-[11px] ${toolbarBg}`}
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-slate-500" />
                <span className="font-bold">{activeHub.shortLabel}</span>
                <span className={mutedText}>
                  {stats.total} tickets ({stats.communityCount} live, {stats.sampleCount} sample)
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsReportFormOpen(true)}
                className={`hidden md:inline-flex items-center gap-1.5 font-medium hover:underline ${mutedText}`}
              >
                <Navigation className="h-3 w-3" />
                <span>Click "+ New Ticket" to report a problem in {activeHub.shortLabel}</span>
              </button>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedStatus('All')}
                  className={`inline-flex items-center gap-1 font-semibold ${
                    selectedStatus === 'All' ? 'underline font-bold' : mutedText
                  }`}
                >
                  <span>All ({stats.total})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus('Submitted')}
                  className={`inline-flex items-center gap-1 font-semibold ${
                    selectedStatus === 'Submitted' ? 'underline font-bold' : ''
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Submitted ({stats.submittedCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus('In Progress')}
                  className={`inline-flex items-center gap-1 font-semibold ${
                    selectedStatus === 'In Progress' ? 'underline font-bold' : ''
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-sky-500" />
                  <span>In Progress ({stats.inProgressCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStatus('Resolved')}
                  className={`inline-flex items-center gap-1 font-semibold ${
                    selectedStatus === 'Resolved' ? 'underline font-bold' : mutedText
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-slate-400" />
                  <span>Completed ({stats.resolvedCount})</span>
                </button>
              </div>
            </footer>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ReportFormModal
        isOpen={isReportFormOpen}
        onClose={() => setIsReportFormOpen(false)}
        existingReports={reports}
        activeHub={activeHub}
        onSelectHub={handleSelectHub}
        onReportSubmitted={handleReportSubmitted}
        onInspectExistingReport={(rep) => {
          setIsReportFormOpen(false);
          setSelectedReportId(rep.id);
          setLeftPanelMode('inspector');
        }}
        isDark={isDark}
      />

      <ReportDetailModal
        report={detailModalReport}
        allReports={reports}
        onClose={() => setDetailModalReport(null)}
        onUpdateStatus={handleUpdateStatus}
        onSelectRelatedReport={(related) => {
          setSelectedReportId(related.id);
          setDetailModalReport(related);
        }}
        isDark={isDark}
      />

      <DirectoryModal
        isOpen={isDirectoryOpen}
        onClose={() => setIsDirectoryOpen(false)}
        directory={directory}
        systemConfig={systemConfig}
        onSaveChannel={handleSaveChannel}
        onSaveRuntimeKey={handleSaveRuntimeKey}
        isDark={isDark}
      />
    </div>
  );
}

export default App;
