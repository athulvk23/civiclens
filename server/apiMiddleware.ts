import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {
  AuthorityChannel,
  CivicReport,
  IssueCategory,
  IssueStatus,
  SystemConfigStatus,
} from '../src/types/civic';
import {
  DEMO_REGION_CONFIG,
  INITIAL_AUTHORITY_DIRECTORY,
  INITIAL_SAMPLE_REPORTS,
  resolveAuthorityRecommendation,
} from './seedData';
import { analyzeCivicIssue, redactPII } from './aiAnalyzer';
import { findPotentialDuplicates } from '../src/utils/duplicateDetection';

dotenv.config();

interface StoreData {
  reports: CivicReport[];
  directory: AuthorityChannel[];
}

const DATA_DIR = path.resolve(process.cwd(), 'server', 'data');
const STORE_PATH = path.join(DATA_DIR, 'runtime-store.json');

let runtimeGeminiKey = (process.env.GEMINI_API_KEY || '').trim();

function getSupabaseClient(): SupabaseClient | null {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (url && key && url.startsWith('http')) {
    return createClient(url, key);
  }
  return null;
}

export function loadStore(): StoreData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as StoreData;
      if (Array.isArray(parsed.reports) && Array.isArray(parsed.directory)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[CivicLens Store] Failed to read runtime-store.json, re-seeding:', err);
  }

  const initial: StoreData = {
    reports: structuredClone(INITIAL_SAMPLE_REPORTS),
    directory: structuredClone(INITIAL_AUTHORITY_DIRECTORY),
  };
  saveStore(initial);
  return initial;
}

export function saveStore(data: StoreData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[CivicLens Store] Failed to write runtime-store.json:', err);
  }
}

export function getSystemConfig(): SystemConfigStatus {
  const activeKey = runtimeGeminiKey || (process.env.GEMINI_API_KEY || '').trim();
  const supabase = getSupabaseClient();
  return {
    aiConfigured: Boolean(activeKey),
    aiModel: activeKey ? 'gemini-3.8-flash (Live Vision API)' : 'Deterministic Civic Triage (Demo Mode)',
    storageMode: supabase ? 'supabase' : 'local-json-persistence',
    demoRegion: process.env.DEMO_REGION || DEMO_REGION_CONFIG.name,
    regionCenter: DEMO_REGION_CONFIG.center,
  };
}

function readJsonBody(req: IncomingMessage, maxBytes = 10 * 1024 * 1024): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('Payload exceeds maximum size limit (8MB max image/request).'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf-8');
        if (!raw.trim()) {
          resolve({});
          return;
        }
        resolve(JSON.parse(raw) as Record<string, unknown>);
      } catch {
        reject(new Error('Invalid JSON payload in request body.'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const urlObj = new URL(req.url || '/', 'http://localhost');
  const pathname = urlObj.pathname;

  if (!pathname.startsWith('/api/')) {
    return false;
  }

  const store = loadStore();

  try {
    // 1. GET /api/bootstrap
    if (req.method === 'GET' && pathname === '/api/bootstrap') {
      sendJson(res, 200, {
        reports: store.reports,
        directory: store.directory,
        config: getSystemConfig(),
      });
      return true;
    }

    // 2. POST /api/analyze (AI analysis preview + duplicate check without saving)
    if (req.method === 'POST' && pathname === '/api/analyze') {
      const body = await readJsonBody(req);
      const complaint = String(body.complaint || '').trim();
      const address = String(body.address || 'Selected Map Location, Chennai, TN').trim();
      const lat = Number(body.lat ?? DEMO_REGION_CONFIG.center.lat);
      const lng = Number(body.lng ?? DEMO_REGION_CONFIG.center.lng);
      const imageDataUrl = typeof body.imageDataUrl === 'string' ? body.imageDataUrl : undefined;

      if (complaint.length < 10) {
        sendJson(res, 400, {
          error: 'Please enter a descriptive complaint (at least 10 characters) so the issue can be analyzed accurately.',
        });
        return true;
      }

      if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        sendJson(res, 400, {
          error: 'Invalid geographic coordinates provided.',
        });
        return true;
      }

      const activeKey = runtimeGeminiKey || (process.env.GEMINI_API_KEY || '').trim();
      const analysis = await analyzeCivicIssue({
        complaint,
        address,
        lat,
        lng,
        imageDataUrl,
        directory: store.directory,
        apiKey: activeKey,
      });

      const authorityDetails = resolveAuthorityRecommendation(
        analysis.result.category,
        lat,
        lng,
        store.directory
      );

      const duplicates = findPotentialDuplicates(
        {
          title: analysis.result.title,
          description: `${analysis.result.description} ${complaint}`,
          category: analysis.result.category,
          lat,
          lng,
        },
        store.reports
      );

      sendJson(res, 200, {
        analysis: analysis.result,
        analysis_source: analysis.analysis_source,
        analysis_model: analysis.analysis_model,
        analysis_disclosure: analysis.analysis_disclosure,
        authority_details: authorityDetails,
        duplicates,
      });
      return true;
    }

    // 3. POST /api/reports (Submit and store a new civic issue report)
    if (req.method === 'POST' && pathname === '/api/reports') {
      const body = await readJsonBody(req);
      const complaint = String(body.complaint || '').trim();
      const address = String(body.address || '').trim();
      const neighborhood = String(body.neighborhood || 'Central Chennai Corridor').trim();
      const lat = Number(body.lat);
      const lng = Number(body.lng);
      const imageDataUrl = typeof body.imageDataUrl === 'string' ? body.imageDataUrl : undefined;
      const contactInfo = String(body.contact || '').trim();

      if (complaint.length < 10) {
        sendJson(res, 400, {
          error: 'Complaint description must be at least 10 characters.',
        });
        return true;
      }
      if (!address) {
        sendJson(res, 400, {
          error: 'Please select a location on the map or enter a street/intersection address.',
        });
        return true;
      }
      if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        sendJson(res, 400, {
          error: 'Valid map coordinates (latitude and longitude) are required.',
        });
        return true;
      }

      if (imageDataUrl) {
        const validPrefix =
          /^data:image\/(jpeg|jpg|png|webp|gif|svg\+xml);/i.test(imageDataUrl) ||
          /^(\.?\/)?photos\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/i.test(imageDataUrl);
        if (!validPrefix) {
          sendJson(res, 400, {
            error: 'Unsupported image format. Please upload a JPEG, PNG, or WebP image.',
          });
          return true;
        }
        if (imageDataUrl.length > 7.5 * 1024 * 1024) {
          sendJson(res, 400, {
            error: 'Image exceeds the 5MB maximum upload size.',
          });
          return true;
        }
      }

      const activeKey = runtimeGeminiKey || (process.env.GEMINI_API_KEY || '').trim();
      const analysis = await analyzeCivicIssue({
        complaint,
        address,
        lat,
        lng,
        imageDataUrl,
        directory: store.directory,
        apiKey: activeKey,
      });

      // Allow optional user override of category if explicitly provided and valid
      const validCategories: IssueCategory[] = [
        'Waste',
        'Road Damage',
        'Street Lighting',
        'Accessibility',
        'Other',
      ];
      const finalCategory: IssueCategory =
        typeof body.categoryOverride === 'string' &&
        validCategories.includes(body.categoryOverride as IssueCategory)
          ? (body.categoryOverride as IssueCategory)
          : analysis.result.category;

      const authorityDetails = resolveAuthorityRecommendation(
        finalCategory,
        lat,
        lng,
        store.directory
      );

      const nowIso = new Date().toISOString();
      const newReport: CivicReport = {
        id: `civic-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        title: analysis.result.title,
        description: analysis.result.description,
        raw_complaint: redactPII(complaint),
        category: finalCategory,
        severity: analysis.result.severity,
        evidence_summary: analysis.result.evidence_summary,
        recommended_action: analysis.result.recommended_action,
        recommended_authority: authorityDetails.authorityName,
        confidence: analysis.result.confidence,
        location: {
          lat: Number(lat.toFixed(5)),
          lng: Number(lng.toFixed(5)),
          address: redactPII(address),
          neighborhood: redactPII(neighborhood),
        },
        image_data_url: imageDataUrl,
        gallery_photos: imageDataUrl
          ? [
              imageDataUrl,
              finalCategory === 'Waste'
                ? './photos/waste-2.jpg'
                : finalCategory === 'Street Lighting'
                ? './photos/lighting-2.jpg'
                : finalCategory === 'Accessibility'
                ? './photos/sidewalk-2.jpg'
                : './photos/pothole-2.jpg',
              finalCategory === 'Waste'
                ? './photos/waste-3.jpg'
                : finalCategory === 'Street Lighting'
                ? './photos/lighting-3.jpg'
                : finalCategory === 'Accessibility'
                ? './photos/sidewalk-3.jpg'
                : './photos/pothole-3.jpg',
            ]
          : undefined,
        image_provided: Boolean(imageDataUrl),
        status: 'Submitted',
        status_history: [
          {
            status: 'Submitted',
            timestamp: nowIso,
            note: `Submitted by resident (${
              analysis.analysis_source === 'gemini-vision-api'
                ? 'Analyzed with Gemini 3.8 Flash'
                : 'Structured via CivicLens Transparent Demo Mode'
            }).`,
            actor: 'Resident Reporter',
          },
        ],
        created_at: nowIso,
        updated_at: nowIso,
        is_sample_data: false,
        analysis_source: analysis.analysis_source,
        analysis_model: analysis.analysis_model,
        analysis_disclosure: analysis.analysis_disclosure,
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
      saveStore(store);

      // Optional Supabase mirror if configured
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          await supabase.from('civic_reports').insert([{ id: newReport.id, payload: newReport }]);
        } catch (supaErr) {
          console.warn('[CivicLens Supabase] Optional sync failed, stored locally:', supaErr);
        }
      }

      sendJson(res, 201, {
        report: newReport,
        duplicates,
      });
      return true;
    }

    // 4. PATCH /api/reports/:id/status
    const statusMatch = pathname.match(/^\/api\/reports\/([^/]+)\/status$/);
    if (req.method === 'PATCH' && statusMatch) {
      const reportId = decodeURIComponent(statusMatch[1]);
      const body = await readJsonBody(req);
      const newStatus = String(body.status || '').trim() as IssueStatus;
      const note = String(body.note || '').trim();
      const actor = String(body.actor || 'Community Coordinator').trim();

      const validStatuses: IssueStatus[] = [
        'Submitted',
        'Under Review',
        'In Progress',
        'Resolved',
      ];
      if (!validStatuses.includes(newStatus)) {
        sendJson(res, 400, { error: 'Invalid status value.' });
        return true;
      }

      const target = store.reports.find((r) => r.id === reportId);
      if (!target) {
        sendJson(res, 404, { error: 'Report not found.' });
        return true;
      }

      const nowIso = new Date().toISOString();
      target.status = newStatus;
      target.updated_at = nowIso;
      target.status_history.push({
        status: newStatus,
        timestamp: nowIso,
        note:
          note ||
          `Status updated to "${newStatus}" in community action tracker.`,
        actor,
      });

      saveStore(store);
      sendJson(res, 200, { report: target });
      return true;
    }

    // 5. PUT /api/directory (Update or add authority channel in the editable directory)
    if (req.method === 'PUT' && pathname === '/api/directory') {
      const body = await readJsonBody(req);
      const channel = body.channel as AuthorityChannel | undefined;
      if (!channel || !channel.id || !channel.name) {
        sendJson(res, 400, { error: 'Valid authority channel id and name are required.' });
        return true;
      }

      const existingIdx = store.directory.findIndex((c) => c.id === channel.id);
      if (existingIdx >= 0) {
        store.directory[existingIdx] = {
          ...store.directory[existingIdx],
          ...channel,
        };
      } else {
        store.directory.push(channel);
      }

      // Recompute authority recommendations across reports so directory edits immediately take effect
      store.reports = store.reports.map((report) => {
        const updatedAuth = resolveAuthorityRecommendation(
          report.category,
          report.location.lat,
          report.location.lng,
          store.directory
        );
        return {
          ...report,
          recommended_authority: updatedAuth.authorityName,
          authority_details: updatedAuth,
        };
      });

      saveStore(store);
      sendJson(res, 200, {
        directory: store.directory,
        reports: store.reports,
      });
      return true;
    }

    // 6. POST /api/config/runtime-key (Allows setting GEMINI_API_KEY in server memory for live judge testing)
    if (req.method === 'POST' && pathname === '/api/config/runtime-key') {
      const body = await readJsonBody(req);
      const key = String(body.apiKey || '').trim();
      runtimeGeminiKey = key;
      sendJson(res, 200, {
        config: getSystemConfig(),
      });
      return true;
    }

    // 7. POST /api/reset-demo (Reset to clean initial sample dataset)
    if (req.method === 'POST' && pathname === '/api/reset-demo') {
      const fresh: StoreData = {
        reports: structuredClone(INITIAL_SAMPLE_REPORTS),
        directory: structuredClone(INITIAL_AUTHORITY_DIRECTORY),
      };
      saveStore(fresh);
      sendJson(res, 200, {
        reports: fresh.reports,
        directory: fresh.directory,
        config: getSystemConfig(),
      });
      return true;
    }

    sendJson(res, 404, { error: `Unknown API endpoint: ${req.method} ${pathname}` });
    return true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    console.error('[CivicLens API Error]:', message);
    sendJson(res, 500, { error: message });
    return true;
  }
}
