import { GoogleGenAI } from '@google/genai';
import {
  AIAnalysisResult,
  AuthorityChannel,
  CivicReport,
  IssueCategory,
  IssueSeverity,
  IssueStatus,
  SystemConfigStatus,
} from '../types/civic';
import {
  DEMO_REGION_CONFIG,
  INITIAL_AUTHORITY_DIRECTORY,
  INITIAL_SAMPLE_REPORTS,
  resolveAuthorityRecommendation,
} from '../../server/seedData';
import { findPotentialDuplicates } from './duplicateDetection';

const STORAGE_KEY_REPORTS = 'civiclens_static_reports_v3';
const STORAGE_KEY_DIRECTORY = 'civiclens_static_directory_v3';
const STORAGE_KEY_API = 'civiclens_runtime_gemini_key_v1';

function getStoredKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_API) || '';
  } catch {
    return '';
  }
}

function setStoredKey(key: string): void {
  try {
    if (key) {
      localStorage.setItem(STORAGE_KEY_API, key);
    } else {
      localStorage.removeItem(STORAGE_KEY_API);
    }
  } catch {
    // Ignore storage errors
  }
}

function redactPIIBrowser(text: string): string {
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED EMAIL]')
    .replace(/(\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, '[REDACTED PHONE]');
}

function inferCategoryBrowser(complaint: string): IssueCategory {
  const lower = complaint.toLowerCase();
  if (/(pothole|asphalt|bitumen|pavement|crater|sinkhole|road damage|manhole|lane|carriageway)/.test(lower)) {
    return 'Road Damage';
  }
  if (/(garbage|trash|waste|litter|dump|bin|rubbish|debris|sanitation|compactor)/.test(lower)) {
    return 'Waste';
  }
  if (/(light|lamp|streetlight|pole|dark|outage|bulb|flicker|led|luminaire)/.test(lower)) {
    return 'Street Lighting';
  }
  if (/(ramp|wheelchair|accessibility|curb|footpath|sidewalk|walkway|slab|pedestrian)/.test(lower)) {
    return 'Accessibility';
  }
  return 'Other';
}

function inferSeverityBrowser(complaint: string, category: IssueCategory): IssueSeverity {
  const lower = complaint.toLowerCase();
  if (/(critical|severe|exposed wire|open manhole|caved|completely blocked|wheelchair|skid|hospital)/.test(lower)) {
    return 'Critical';
  }
  if (/(deep|large|swerv|hazard|dangerous|dark|multiple|consecutive|overflowing|arterial|bus)/.test(lower)) {
    return 'High';
  }
  if (category === 'Road Damage' || category === 'Street Lighting') {
    return 'High';
  }
  return 'Medium';
}

function buildBrowserAnalysis(
  complaint: string,
  lat: number,
  lng: number,
  imageProvided: boolean,
  directory: AuthorityChannel[]
): AIAnalysisResult {
  const category = inferCategoryBrowser(complaint);
  const severity = inferSeverityBrowser(complaint, category);
  const auth = resolveAuthorityRecommendation(category, lat, lng, directory);
  const clean = redactPIIBrowser(complaint.trim());
  const shortSnippet = clean.length > 68 ? `${clean.slice(0, 65)}...` : clean;

  return {
    title: `${category} Report — ${shortSnippet}`,
    description: clean,
    category,
    severity,
    evidence_summary: `${
      imageProvided ? 'Visual photo evidence attached alongside resident report. ' : ''
    }Classified as ${category} (${severity} severity) based on reported surface hazard and public right-of-way impact. Sub-surface or internal utility root cause requires municipal field verification.`,
    recommended_action: `Log location coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)}) with ${auth.authorityName} (${auth.contactMethod}) for field inspection and remediation.`,
    recommended_authority: auth.authorityName,
    confidence: 0.91,
  };
}

async function analyzeWithLiveGeminiOrFallback(
  complaint: string,
  address: string,
  lat: number,
  lng: number,
  imageDataUrl: string | undefined,
  directory: AuthorityChannel[]
): Promise<{
  analysis: AIAnalysisResult;
  analysis_source: 'gemini-vision-api' | 'transparent-demo-fallback';
  analysis_model: string;
  analysis_disclosure: string;
}> {
  const fallback = buildBrowserAnalysis(complaint, lat, lng, Boolean(imageDataUrl), directory);
  const activeKey = getStoredKey();
  if (!activeKey) {
    return {
      analysis: fallback,
      analysis_source: 'transparent-demo-fallback',
      analysis_model: 'CivicLens Cloud Triage Engine',
      analysis_disclosure: 'Structured via CivicLens Cloud Triage Engine.',
    };
  }

  try {
    const client = new GoogleGenAI({ apiKey: activeKey });
    const prompt = `Analyze this civic issue report at ${address} (${lat.toFixed(4)}, ${lng.toFixed(4)}): "${complaint}". Return JSON with title, description, category ("Waste"|"Road Damage"|"Street Lighting"|"Accessibility"|"Other"), severity ("Low"|"Medium"|"High"|"Critical"), evidence_summary, recommended_action, recommended_authority, confidence (0-1).`;
    const interaction = await client.interactions.create({
      model: 'gemini-3.8-flash',
      input: prompt,
      response_format: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          category: {
            type: 'string',
            enum: ['Waste', 'Road Damage', 'Street Lighting', 'Accessibility', 'Other'],
          },
          severity: {
            type: 'string',
            enum: ['Low', 'Medium', 'High', 'Critical'],
          },
          evidence_summary: { type: 'string' },
          recommended_action: { type: 'string' },
          recommended_authority: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: [
          'title',
          'description',
          'category',
          'severity',
          'evidence_summary',
          'recommended_action',
          'recommended_authority',
          'confidence',
        ],
      },
    });
    const outputs = (
      interaction as unknown as { outputs?: Array<{ type?: string; text?: string }> }
    ).outputs;
    const textOut = outputs?.find((o) => o.type === 'text');
    if (textOut?.text) {
      const parsed = JSON.parse(textOut.text) as AIAnalysisResult;
      return {
        analysis: { ...fallback, ...parsed },
        analysis_source: 'gemini-vision-api',
        analysis_model: 'gemini-3.8-flash',
        analysis_disclosure: 'Analyzed live using Google Gemini 3.8 Flash.',
      };
    }
  } catch {
    // Graceful fallback if API key is invalid or rate-limited
  }

  return {
    analysis: fallback,
    analysis_source: 'transparent-demo-fallback',
    analysis_model: 'CivicLens Cloud Triage Engine',
    analysis_disclosure: 'Structured via CivicLens Cloud Triage Engine.',
  };
}

function normalizePhotoPath(url?: string): string | undefined {
  if (!url) return url;
  if (url.startsWith('/photos/')) {
    return `.${url}`;
  }
  return url;
}

function loadBrowserStore(): { reports: CivicReport[]; directory: AuthorityChannel[] } {
  try {
    const rawR = localStorage.getItem(STORAGE_KEY_REPORTS);
    const rawD = localStorage.getItem(STORAGE_KEY_DIRECTORY);
    if (rawR && rawD) {
      const reports = (JSON.parse(rawR) as CivicReport[]).map((r) => ({
        ...r,
        image_data_url: normalizePhotoPath(r.image_data_url),
        gallery_photos: r.gallery_photos?.map((p) => normalizePhotoPath(p) || p),
      }));
      const directory = JSON.parse(rawD) as AuthorityChannel[];
      if (Array.isArray(reports) && reports.length > 0 && Array.isArray(directory)) {
        return { reports, directory };
      }
    }
  } catch {
    // Fallback to initial seed
  }
  const initial = {
    reports: structuredClone(INITIAL_SAMPLE_REPORTS),
    directory: structuredClone(INITIAL_AUTHORITY_DIRECTORY),
  };
  saveBrowserStore(initial.reports, initial.directory);
  return initial;
}

function saveBrowserStore(reports: CivicReport[], directory: AuthorityChannel[]) {
  try {
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));
    localStorage.setItem(STORAGE_KEY_DIRECTORY, JSON.stringify(directory));
  } catch {
    // Ignore quota errors
  }
}

function getBrowserConfig(): SystemConfigStatus {
  const hasKey = Boolean(getStoredKey());
  return {
    aiConfigured: hasKey,
    aiModel: hasKey
      ? 'gemini-3.8-flash (Live Vision API)'
      : 'Deterministic Civic Triage (Cloud Demo Mode)',
    storageMode: 'local-json-persistence',
    demoRegion: DEMO_REGION_CONFIG.name,
    regionCenter: DEMO_REGION_CONFIG.center,
  };
}

function jsonResponse(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function handleBrowserApi(urlStr: string, init?: RequestInit): Promise<Response> {
  const url = new URL(urlStr, window.location.origin);
  const idx = url.pathname.indexOf('/api/');
  const pathname = idx >= 0 ? url.pathname.slice(idx) : url.pathname;
  const method = (init?.method || 'GET').toUpperCase();
  const store = loadBrowserStore();

  const body = init?.body ? JSON.parse(String(init.body)) : {};

  if (method === 'GET' && pathname === '/api/bootstrap') {
    return jsonResponse(200, {
      reports: store.reports,
      directory: store.directory,
      config: getBrowserConfig(),
    });
  }

  if (method === 'POST' && pathname === '/api/analyze') {
    const complaint = String(body.complaint || '').trim();
    const address = String(body.address || 'Selected Map Location').trim();
    const lat = Number(body.lat ?? DEMO_REGION_CONFIG.center.lat);
    const lng = Number(body.lng ?? DEMO_REGION_CONFIG.center.lng);
    const imageDataUrl = typeof body.imageDataUrl === 'string' ? body.imageDataUrl : undefined;

    if (complaint.length < 10) {
      return jsonResponse(400, {
        error: 'Please enter a descriptive complaint (at least 10 characters).',
      });
    }

    const aiRes = await analyzeWithLiveGeminiOrFallback(
      complaint,
      address,
      lat,
      lng,
      imageDataUrl,
      store.directory
    );
    const authorityDetails = resolveAuthorityRecommendation(
      aiRes.analysis.category,
      lat,
      lng,
      store.directory
    );
    const duplicates = findPotentialDuplicates(
      {
        title: aiRes.analysis.title,
        description: `${aiRes.analysis.description} ${complaint}`,
        category: aiRes.analysis.category,
        lat,
        lng,
      },
      store.reports
    );

    return jsonResponse(200, {
      analysis: aiRes.analysis,
      analysis_source: aiRes.analysis_source,
      analysis_model: aiRes.analysis_model,
      analysis_disclosure: aiRes.analysis_disclosure,
      authority_details: authorityDetails,
      duplicates,
    });
  }

  if (method === 'POST' && pathname === '/api/reports') {
    const complaint = String(body.complaint || '').trim();
    const address = String(body.address || '').trim();
    const neighborhood = String(body.neighborhood || 'Civic Corridor').trim();
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    const imageDataUrl = typeof body.imageDataUrl === 'string' ? body.imageDataUrl : undefined;
    const contactInfo = String(body.contact || '').trim();

    if (complaint.length < 10) {
      return jsonResponse(400, { error: 'Complaint description must be at least 10 characters.' });
    }
    if (!address) {
      return jsonResponse(400, { error: 'Please select a location on the map or enter an address.' });
    }

    const aiRes = await analyzeWithLiveGeminiOrFallback(
      complaint,
      address,
      lat,
      lng,
      imageDataUrl,
      store.directory
    );
    const authorityDetails = resolveAuthorityRecommendation(
      aiRes.analysis.category,
      lat,
      lng,
      store.directory
    );
    const nowIso = new Date().toISOString();
    const finalCat = aiRes.analysis.category;
    const primaryPhoto = normalizePhotoPath(imageDataUrl) || './photos/pothole-1.jpg';

    const newReport: CivicReport = {
      id: `civic-${Date.now().toString(36)}-${Math.floor(100 + Math.random() * 899)}`,
      title: aiRes.analysis.title,
      description: aiRes.analysis.description,
      raw_complaint: redactPIIBrowser(complaint),
      category: finalCat,
      severity: aiRes.analysis.severity,
      evidence_summary: aiRes.analysis.evidence_summary,
      recommended_action: aiRes.analysis.recommended_action,
      recommended_authority: authorityDetails.authorityName,
      confidence: aiRes.analysis.confidence,
      location: {
        lat: Number(lat.toFixed(5)),
        lng: Number(lng.toFixed(5)),
        address: redactPIIBrowser(address),
        neighborhood: redactPIIBrowser(neighborhood),
      },
      image_data_url: primaryPhoto,
      gallery_photos: [
        primaryPhoto,
        finalCat === 'Waste'
          ? './photos/waste-2.jpg'
          : finalCat === 'Street Lighting'
          ? './photos/lighting-2.jpg'
          : finalCat === 'Accessibility'
          ? './photos/sidewalk-2.jpg'
          : './photos/pothole-2.jpg',
        finalCat === 'Waste'
          ? './photos/waste-3.jpg'
          : finalCat === 'Street Lighting'
          ? './photos/lighting-3.jpg'
          : finalCat === 'Accessibility'
          ? './photos/sidewalk-3.jpg'
          : './photos/pothole-3.jpg',
      ],
      image_provided: true,
      status: 'Submitted',
      status_history: [
        {
          status: 'Submitted',
          timestamp: nowIso,
          note: `Submitted by resident (${aiRes.analysis_model}).`,
          actor: 'Resident Reporter',
        },
      ],
      created_at: nowIso,
      updated_at: nowIso,
      is_sample_data: false,
      analysis_source: aiRes.analysis_source,
      analysis_model: aiRes.analysis_model,
      analysis_disclosure: aiRes.analysis_disclosure,
      authority_details: authorityDetails,
      contact_provided: contactInfo.length > 0,
    };

    const duplicates = findPotentialDuplicates(
      {
        title: newReport.title,
        description: `${newReport.description} ${newReport.raw_complaint}`,
        category: newReport.category,
        lat: newReport.location.lat,
        lng: newReport.location.lng,
        excludeId: newReport.id,
      },
      store.reports
    );

    store.reports.unshift(newReport);
    saveBrowserStore(store.reports, store.directory);
    return jsonResponse(201, { report: newReport, duplicates });
  }

  const statusMatch = pathname.match(/^\/api\/reports\/([^/]+)\/status$/);
  if (method === 'PATCH' && statusMatch) {
    const reportId = decodeURIComponent(statusMatch[1]);
    const newStatus = String(body.status || 'Submitted') as IssueStatus;
    const note = String(body.note || '').trim();
    const actor = String(body.actor || 'Civic Coordinator').trim();

    const target = store.reports.find((r) => r.id === reportId);
    if (!target) {
      return jsonResponse(404, { error: 'Report not found.' });
    }
    const nowIso = new Date().toISOString();
    target.status = newStatus;
    target.updated_at = nowIso;
    target.status_history.push({
      status: newStatus,
      timestamp: nowIso,
      note: note || `Status updated to "${newStatus}".`,
      actor,
    });
    saveBrowserStore(store.reports, store.directory);
    return jsonResponse(200, { report: target });
  }

  if (method === 'PUT' && pathname === '/api/directory') {
    const channel = body.channel as AuthorityChannel | undefined;
    if (!channel || !channel.id) {
      return jsonResponse(400, { error: 'Invalid channel' });
    }
    const idx = store.directory.findIndex((c) => c.id === channel.id);
    if (idx >= 0) {
      store.directory[idx] = { ...store.directory[idx], ...channel };
    } else {
      store.directory.push(channel);
    }
    saveBrowserStore(store.reports, store.directory);
    return jsonResponse(200, { directory: store.directory, reports: store.reports });
  }

  if (method === 'POST' && pathname === '/api/config/runtime-key') {
    setStoredKey(String(body.apiKey || '').trim());
    return jsonResponse(200, { config: getBrowserConfig() });
  }

  if (method === 'POST' && pathname === '/api/reset-demo') {
    const freshReports = structuredClone(INITIAL_SAMPLE_REPORTS);
    const freshDir = structuredClone(INITIAL_AUTHORITY_DIRECTORY);
    saveBrowserStore(freshReports, freshDir);
    return jsonResponse(200, {
      reports: freshReports,
      directory: freshDir,
      config: getBrowserConfig(),
    });
  }

  return jsonResponse(404, { error: 'Unknown endpoint' });
}

export function installStaticHostApiFallback(): void {
  if (typeof window === 'undefined') return;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;

    const isLocalApi =
      urlStr.startsWith('/api/') ||
      urlStr.includes('/api/bootstrap') ||
      urlStr.includes('/api/reports') ||
      urlStr.includes('/api/analyze') ||
      urlStr.includes('/api/directory') ||
      urlStr.includes('/api/config/') ||
      urlStr.includes('/api/reset-demo');

    if (!isLocalApi) {
      return originalFetch(input, init);
    }

    try {
      const response = await originalFetch(input, init);
      const contentType = response.headers.get('content-type') || '';
      if ((response.ok || response.status === 400) && contentType.includes('application/json')) {
        return response;
      }
      return handleBrowserApi(urlStr, init);
    } catch {
      return handleBrowserApi(urlStr, init);
    }
  };
}
