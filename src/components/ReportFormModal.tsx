import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Compass,
  FileWarning,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  AIAnalysisResult,
  AuthorityRecommendation,
  CivicReport,
  DuplicateMatch,
} from '../types/civic';
import { findPotentialDuplicates } from '../utils/duplicateDetection';
import { generateSamplePotholePngDataUrl } from '../utils/samplePhotoGenerator';
import {
  attachDialogLightDismissFallback,
  initFormValidationSync,
} from '../utils/dialogAndFormUtils';
import {
  GeocodedPlace,
  LocationHub,
  QUICK_LOCATION_HUBS,
  reverseGeocodeCoordinate,
  searchPlaceByName,
} from '../utils/locationHubs';
import { CivicMap } from './CivicMap';

interface ReportFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingReports: CivicReport[];
  activeHub: LocationHub;
  onSelectHub: (hub: LocationHub) => void;
  onReportSubmitted: (report: CivicReport, duplicates: DuplicateMatch[]) => void;
  onInspectExistingReport: (report: CivicReport) => void;
  isDark: boolean;
}

export const ReportFormModal: React.FC<ReportFormModalProps> = ({
  isOpen,
  onClose,
  existingReports,
  activeHub,
  onSelectHub,
  onReportSubmitted,
  onInspectExistingReport,
  isDark,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [complaint, setComplaint] = useState('');
  const [address, setAddress] = useState(activeHub.address);
  const [neighborhood, setNeighborhood] = useState(activeHub.neighborhood);
  const [lat, setLat] = useState<number>(activeHub.lat);
  const [lng, setLng] = useState<number>(activeHub.lng);
  const [contact, setContact] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(undefined);
  const [imageFileName, setImageFileName] = useState<string>('');

  const [placeQuery, setPlaceQuery] = useState('');
  const [isSearchingPlace, setIsSearchingPlace] = useState(false);
  const [placeResults, setPlaceResults] = useState<GeocodedPlace[]>([]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [previewResult, setPreviewResult] = useState<{
    analysis: AIAnalysisResult;
    analysis_source: 'gemini-vision-api' | 'transparent-demo-fallback';
    analysis_model: string;
    analysis_disclosure: string;
    authority_details: AuthorityRecommendation;
  } | null>(null);

  useEffect(() => {
    setAddress(activeHub.address);
    setNeighborhood(activeHub.neighborhood);
    setLat(activeHub.lat);
    setLng(activeHub.lng);
    setPreviewResult(null);
  }, [activeHub]);

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

  useEffect(() => {
    return initFormValidationSync(formRef.current);
  }, [isOpen]);

  const liveDuplicates = useMemo(() => {
    if (complaint.trim().length < 8) return [];
    return findPotentialDuplicates(
      {
        description: complaint,
        title: previewResult?.analysis.title,
        category: previewResult?.analysis.category,
        lat,
        lng,
      },
      existingReports
    );
  }, [complaint, lat, lng, existingReports, previewResult]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setErrorMessage(
        `Unsupported file format (${file.type || 'unknown'}). Please upload a JPEG, PNG, or WebP image.`
      );
      e.target.value = '';
      return;
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMessage(
        `Image size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds the 5.0 MB maximum limit.`
      );
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageDataUrl(reader.result);
        setImageFileName(file.name);
        setPreviewResult(null);
      }
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read image file. Please try another image.');
    };
    reader.readAsDataURL(file);
  };

  const handleSwitchHubInForm = (hub: LocationHub) => {
    onSelectHub(hub);
    setAddress(hub.address);
    setNeighborhood(hub.neighborhood);
    setLat(hub.lat);
    setLng(hub.lng);
    setPlaceResults([]);
    setPreviewResult(null);
  };

  const handlePlaceSearch = async () => {
    if (!placeQuery.trim()) return;
    setIsSearchingPlace(true);
    try {
      const results = await searchPlaceByName(placeQuery);
      setPlaceResults(results);
      if (results.length > 0) {
        const top = results[0];
        setAddress(top.displayName.split(',').slice(0, 4).join(',').trim());
        setNeighborhood(top.neighborhood);
        setLat(top.lat);
        setLng(top.lng);
        setPreviewResult(null);
      }
    } finally {
      setIsSearchingPlace(false);
    }
  };

  const handleLoadHubSamplePreset = () => {
    setErrorMessage(null);
    const photoUrl =
      activeHub.id === 'vit-vellore'
        ? './photos/lighting-1.jpg'
        : './photos/pothole-1.jpg';
    setComplaint(activeHub.sampleComplaint);
    setAddress(activeHub.address);
    setNeighborhood(activeHub.neighborhood);
    setLat(Number((activeHub.lat + 0.0001).toFixed(5)));
    setLng(Number((activeHub.lng + 0.0001).toFixed(5)));
    setImageDataUrl(photoUrl);
    setImageFileName(`${activeHub.id}-evidence.jpg`);
    setPreviewResult(null);
  };

  const handleLoadDuplicateDemoPreset = () => {
    setErrorMessage(null);
    const photoUrl =
      activeHub.id === 'vit-vellore'
        ? './photos/lighting-2.jpg'
        : './photos/pothole-2.jpg';
    setComplaint(activeHub.duplicateComplaint);
    setAddress(activeHub.address);
    setNeighborhood(activeHub.neighborhood);
    setLat(Number((activeHub.lat - 0.0001).toFixed(5)));
    setLng(Number((activeHub.lng - 0.0001).toFixed(5)));
    setImageDataUrl(photoUrl);
    setImageFileName(`duplicate-${activeHub.id}-check.jpg`);
    setPreviewResult(null);
  };

  const handleLoadOutsideRegionPreset = () => {
    setErrorMessage(null);
    setComplaint(
      'Concrete median barrier has shifted slightly after heavy rain along the highway bypass, leaving loose gravel along the shoulder.'
    );
    setAddress('NH-48 Highway Bypass, Kanchipuram Outskirts');
    setNeighborhood('Outside Pre-Configured Hub Boundary');
    setLat(12.8342);
    setLng(79.7036);
    setImageDataUrl(undefined);
    setImageFileName('');
    setPreviewResult(null);
  };

  const handleMapCoordinatePick = async (pickedLat: number, pickedLng: number) => {
    setLat(pickedLat);
    setLng(pickedLng);
    setAddress(`Pinned Coordinate (${pickedLat.toFixed(4)}, ${pickedLng.toFixed(4)})`);
    setPreviewResult(null);
    const rev = await reverseGeocodeCoordinate(pickedLat, pickedLng);
    setAddress(rev.address);
    setNeighborhood(rev.neighborhood);
  };

  const handleAnalyzePreview = async () => {
    setErrorMessage(null);
    if (complaint.trim().length < 10) {
      setErrorMessage(
        'Please enter at least 10 characters describing the issue before running AI analysis.'
      );
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaint,
          address,
          lat,
          lng,
          imageDataUrl,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze civic issue.');
      }
      setPreviewResult(data);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to reach AI analysis endpoint.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (complaint.trim().length < 10) {
      setErrorMessage('Please enter a detailed description of at least 10 characters.');
      return;
    }
    if (!address.trim()) {
      setErrorMessage('Please provide a location address or select a point on the map.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaint,
          address,
          neighborhood,
          lat,
          lng,
          imageDataUrl,
          contact,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit report.');
      }

      setComplaint('');
      setImageDataUrl(undefined);
      setImageFileName('');
      setContact('');
      setPreviewResult(null);
      onReportSubmitted(data.report, data.duplicates || []);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const surfaceBg = isDark ? 'bg-slate-900 text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-200';
  const subCardBg = isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200/80';
  const inputBg = isDark
    ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500'
    : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400';

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: 'any' } as Record<string, string>)}
      aria-labelledby="report-modal-title"
      className={`m-auto w-full max-w-4xl rounded-2xl border p-0 shadow-2xl open:flex open:flex-col max-h-[92vh] ${surfaceBg}`}
    >
      {/* Modal Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-[#0f172a] px-6 py-4 text-white rounded-t-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <h2 id="report-modal-title" className="text-base font-bold tracking-tight">
              Raise New Civic Ticket — {activeHub.shortLabel}
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-300">
            Describe the problem or attach a photo. AI will classify, score severity, and route to the right authority.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-300 hover:text-white"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Modal Body */}
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        noValidate
        className="overflow-y-auto px-6 py-5 space-y-5"
      >
        {/* Quick Hub Switcher & 1-Click Test Scenarios */}
        <div className={`rounded-xl border p-3.5 space-y-3 ${subCardBg}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <Compass className="h-4 w-4 text-sky-500" />
              <span>Select Campus / City Region:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_LOCATION_HUBS.map((hub) => {
                const isCurrent = activeHub.id === hub.id;
                return (
                  <button
                    key={hub.id}
                    type="button"
                    onClick={() => handleSwitchHubInForm(hub)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      isCurrent
                        ? 'bg-[#0f172a] text-white dark:bg-sky-500 dark:text-slate-950 shadow-sm'
                        : isDark
                        ? 'border border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'
                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {hub.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800 pt-2.5">
            <div className="flex items-center gap-1.5 text-xs font-medium opacity-80">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Quick-Fill Demo Scenarios ({activeHub.shortLabel}):</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleLoadHubSamplePreset}
                className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-600 dark:text-sky-300 hover:bg-sky-500/20 transition"
              >
                1. Fill Sample Issue + Photo
              </button>
              <button
                type="button"
                onClick={handleLoadDuplicateDemoPreset}
                className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition"
              >
                2. Fill Duplicate Test
              </button>
              <button
                type="button"
                onClick={handleLoadOutsideRegionPreset}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1 text-xs font-medium opacity-80 hover:opacity-100 transition"
              >
                3. Test Outside Jurisdiction
              </button>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-600 dark:text-red-300"
          >
            <FileWarning className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Please check your input: </span>
              {errorMessage}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Left Column: Description, Photo, Contact */}
          <div className="space-y-4 lg:col-span-7">
            <div className="field">
              <label
                htmlFor="complaint-input"
                className="block text-xs font-bold uppercase tracking-wider mb-1"
              >
                1. What is the problem? <span className="text-red-500">*</span>
              </label>
              <p id="complaint-rules" className="rules-list text-xs">
                Describe the issue clearly (at least 10 characters), including lane or footpath position.
              </p>
              <textarea
                id="complaint-input"
                name="complaint"
                required
                minLength={10}
                rows={4}
                value={complaint}
                onChange={(e) => {
                  setComplaint(e.target.value);
                  setPreviewResult(null);
                }}
                aria-describedby="complaint-rules"
                placeholder={`e.g., ${activeHub.sampleComplaint.slice(0, 105)}...`}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:border-sky-500 focus:outline-none ${inputBg}`}
              />
            </div>

            {/* Image Upload */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider">
                  2. Photo Evidence (Optional • Max 5MB)
                </label>
                {imageDataUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setImageDataUrl(undefined);
                      setImageFileName('');
                      setPreviewResult(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove Photo
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              {!imageDataUrl ? (
                <div className={`flex flex-wrap items-center gap-3 rounded-xl border border-dashed p-4 ${subCardBg}`}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0f172a] text-white px-3.5 py-2 text-xs font-semibold hover:bg-slate-800 transition"
                  >
                    <Upload className="h-4 w-4 text-sky-400" />
                    Upload Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const pngUrl = generateSamplePotholePngDataUrl();
                      setImageDataUrl(pngUrl);
                      setImageFileName('sample-road-damage-photo.png');
                      setPreviewResult(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-600 dark:text-sky-300 hover:bg-sky-500/20 transition"
                  >
                    <Camera className="h-4 w-4" />
                    Use Sample Pothole Photo
                  </button>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700">
                  <div className="relative h-36 w-full bg-slate-900">
                    <img
                      src={imageDataUrl}
                      alt="Uploaded civic issue preview"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute bottom-2 left-2 rounded bg-slate-950/85 px-2 py-0.5 text-[11px] font-mono text-white">
                      {imageFileName || 'Attached Photo'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Optional Contact Field */}
            <div className="field">
              <label
                htmlFor="contact-input"
                className="block text-xs font-bold uppercase tracking-wider mb-1"
              >
                3. Contact Email (Optional — Kept Private)
              </label>
              <p id="contact-rules" className="rules-list text-[11px]">
                Never shown publicly; personal details are automatically redacted from reports.
              </p>
              <input
                id="contact-input"
                type="email"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                aria-describedby="contact-rules"
                placeholder="resident@example.com (optional)"
                className={`w-full rounded-xl border px-3.5 py-2 text-sm focus:border-sky-500 focus:outline-none ${inputBg}`}
              />
            </div>
          </div>

          {/* Right Column: Location Search & Map Picker */}
          <div className="space-y-3 lg:col-span-5">
            <div>
              <label
                htmlFor="address-input"
                className="block text-xs font-bold uppercase tracking-wider mb-1"
              >
                4. Location (Search or Click Map) <span className="text-red-500">*</span>
              </label>

              <div className="flex gap-1.5 mb-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 opacity-50" />
                  <input
                    type="text"
                    value={placeQuery}
                    onChange={(e) => setPlaceQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handlePlaceSearch();
                      }
                    }}
                    placeholder="Search SRM, VIT, IIT Palakkad, or any place..."
                    className={`w-full rounded-lg border pl-8 pr-2.5 py-1.5 text-xs focus:border-sky-500 focus:outline-none ${inputBg}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={handlePlaceSearch}
                  disabled={isSearchingPlace}
                  className="rounded-lg bg-[#0f172a] text-white px-3 py-1.5 text-xs font-semibold hover:bg-slate-800 shrink-0"
                >
                  {isSearchingPlace ? '...' : 'Find'}
                </button>
              </div>

              {placeResults.length > 0 && (
                <div className={`mb-2 max-h-28 overflow-y-auto rounded-lg border p-1 space-y-1 ${subCardBg}`}>
                  {placeResults.map((pl, idx) => (
                    <button
                      key={`${pl.lat}-${pl.lng}-${idx}`}
                      type="button"
                      onClick={() => {
                        setAddress(pl.displayName.split(',').slice(0, 4).join(',').trim());
                        setNeighborhood(pl.neighborhood);
                        setLat(pl.lat);
                        setLng(pl.lng);
                        setPlaceResults([]);
                        setPreviewResult(null);
                      }}
                      className="w-full text-left rounded px-2 py-1 text-[11px] hover:bg-sky-500/15 flex items-center gap-1.5"
                    >
                      <MapPin className="h-3 w-3 shrink-0 text-sky-500" />
                      <span className="truncate">{pl.displayName}</span>
                    </button>
                  ))}
                </div>
              )}

              <input
                id="address-input"
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street address or landmark..."
                className={`w-full rounded-xl border px-3 py-2 text-xs mb-2 focus:border-sky-500 focus:outline-none ${inputBg}`}
              />

              {isOpen && (
                <div className="rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700">
                  <CivicMap
                    reports={existingReports}
                    selectedReportId={null}
                    onSelectReport={onInspectExistingReport}
                    pickerCoordinates={{ lat, lng }}
                    focusCenter={{ lat, lng, zoom: 15 }}
                    onPickCoordinates={handleMapCoordinatePick}
                    heightClass="h-48"
                  />
                </div>
              )}

              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase opacity-60">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lat}
                    onChange={(e) => setLat(Number(e.target.value))}
                    className={`w-full rounded-lg border px-2.5 py-1 text-xs font-mono ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase opacity-60">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lng}
                    onChange={(e) => setLng(Number(e.target.value))}
                    className={`w-full rounded-lg border px-2.5 py-1 text-xs font-mono ${inputBg}`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Duplicate Detection Alert */}
        {liveDuplicates.length > 0 && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>
                  Similar Ticket Detected Nearby ({liveDuplicates.length} match)
                </span>
              </div>
              <span className="text-[11px] opacity-75">
                Never auto-merged — inspect to check if already reported
              </span>
            </div>
            <div className="space-y-2">
              {liveDuplicates.map((dup) => {
                const fullReport = existingReports.find((r) => r.id === dup.reportId);
                return (
                  <div
                    key={dup.reportId}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${subCardBg}`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{dup.title}</span>
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-mono font-bold text-amber-700 dark:text-amber-300">
                          {Math.round(dup.similarityScore * 100)}% match • {dup.distanceMeters}m away
                        </span>
                      </div>
                      <div className="mt-0.5 text-[11px] opacity-75">
                        {dup.matchReasons.join(' • ')}
                      </div>
                    </div>
                    {fullReport && (
                      <button
                        type="button"
                        onClick={() => onInspectExistingReport(fullReport)}
                        className="rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-800 dark:text-amber-200 hover:bg-amber-500/30"
                      >
                        View Ticket
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Analysis Preview Panel */}
        {previewResult && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/20 pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  AI Structured Preview
                </span>
                <span className="rounded-full bg-slate-900 text-white px-2.5 py-0.5 text-[10px] font-mono">
                  {previewResult.analysis_model}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">
                Confidence: {Math.round(previewResult.analysis.confidence * 100)}%
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
              <div className={`rounded-lg border p-2.5 ${subCardBg}`}>
                <span className="text-[10px] uppercase opacity-60 block">Title</span>
                <span className="font-bold mt-0.5 block">{previewResult.analysis.title}</span>
              </div>
              <div className={`rounded-lg border p-2.5 ${subCardBg}`}>
                <span className="text-[10px] uppercase opacity-60 block">Category & Severity</span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded bg-sky-500/15 px-2 py-0.5 font-bold text-sky-600 dark:text-sky-300">
                    {previewResult.analysis.category}
                  </span>
                  <span className="rounded bg-red-500/15 px-2 py-0.5 font-bold text-red-600 dark:text-red-300">
                    {previewResult.analysis.severity}
                  </span>
                </div>
              </div>
              <div className={`rounded-lg border p-2.5 ${subCardBg}`}>
                <span className="text-[10px] uppercase opacity-60 block">Routed Authority</span>
                <span className="font-bold mt-0.5 block">
                  {previewResult.authority_details.authorityName}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
              <div className={`rounded-lg border p-2.5 ${subCardBg}`}>
                <span className="text-[10px] uppercase opacity-60 block">
                  Evidence Summary (Visible vs. Assumptions)
                </span>
                <p className="mt-1 leading-relaxed">{previewResult.analysis.evidence_summary}</p>
              </div>
              <div className={`rounded-lg border p-2.5 ${subCardBg}`}>
                <span className="text-[10px] uppercase opacity-60 block">Recommended Next Action</span>
                <p className="mt-1 leading-relaxed">{previewResult.analysis.recommended_action}</p>
              </div>
            </div>

            <p className="text-[11px] opacity-75 italic">
              <ShieldCheck className="inline h-3.5 w-3.5 mr-1 text-sky-500" />
              {previewResult.analysis_disclosure}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
          <button
            type="button"
            onClick={handleAnalyzePreview}
            disabled={isAnalyzing || isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-2.5 text-xs font-bold text-sky-600 dark:text-sky-300 hover:bg-sky-500/20 disabled:opacity-50 transition"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 text-sky-500" />
                Preview AI Analysis
              </>
            )}
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold hover:opacity-80"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isAnalyzing}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0f172a] dark:bg-sky-500 px-5 py-2.5 text-xs font-bold text-white dark:text-slate-950 shadow-md hover:opacity-90 disabled:opacity-50 transition"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting Ticket...
                </>
              ) : (
                <>+ Submit Ticket</>
              )}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
};
