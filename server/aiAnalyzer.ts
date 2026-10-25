import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';
import {
  AIAnalysisResult,
  AuthorityChannel,
  IssueCategory,
  IssueSeverity,
} from '../src/types/civic';
import { resolveAuthorityRecommendation } from './seedData';

const VALID_CATEGORIES: IssueCategory[] = [
  'Waste',
  'Road Damage',
  'Street Lighting',
  'Accessibility',
  'Other',
];

const VALID_SEVERITIES: IssueSeverity[] = ['Low', 'Medium', 'High', 'Critical'];

const SUPPORTED_VISION_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export function redactPII(text: string): string {
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED EMAIL]')
    .replace(/(\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, '[REDACTED PHONE]');
}

export function parseDataUrl(dataUrl?: string): { mimeType: string; base64Data: string } | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  if (/^(\.?\/)?photos\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/i.test(dataUrl)) {
    try {
      const localPath = path.resolve(process.cwd(), 'public', dataUrl.replace(/^\.?\//, ''));
      if (fs.existsSync(localPath)) {
        const buf = fs.readFileSync(localPath);
        return {
          mimeType: 'image/jpeg',
          base64Data: buf.toString('base64'),
        };
      }
    } catch {
      return null;
    }
  }
  const match = dataUrl.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1].toLowerCase(),
    base64Data: match[2],
  };
}

export function validateAndSanitizeAIAnalysis(
  raw: Record<string, unknown>,
  fallbackInput: {
    complaint: string;
    lat: number;
    lng: number;
    imageProvided: boolean;
    directory: AuthorityChannel[];
  }
): AIAnalysisResult {
  const rawCategory = String(raw.category || '').trim();
  const category: IssueCategory = VALID_CATEGORIES.includes(rawCategory as IssueCategory)
    ? (rawCategory as IssueCategory)
    : inferCategoryFromText(fallbackInput.complaint);

  const rawSeverity = String(raw.severity || '').trim();
  const severity: IssueSeverity = VALID_SEVERITIES.includes(rawSeverity as IssueSeverity)
    ? (rawSeverity as IssueSeverity)
    : inferSeverityFromText(fallbackInput.complaint, category);

  const authorityRec = resolveAuthorityRecommendation(
    category,
    fallbackInput.lat,
    fallbackInput.lng,
    fallbackInput.directory
  );

  const title = redactPII(
    typeof raw.title === 'string' && raw.title.trim().length >= 5
      ? raw.title.trim().slice(0, 120)
      : buildDefaultTitle(fallbackInput.complaint, category)
  );

  const description = redactPII(
    typeof raw.description === 'string' && raw.description.trim().length >= 10
      ? raw.description.trim().slice(0, 600)
      : fallbackInput.complaint.trim().slice(0, 500)
  );

  const evidence_summary = redactPII(
    typeof raw.evidence_summary === 'string' && raw.evidence_summary.trim().length >= 10
      ? raw.evidence_summary.trim().slice(0, 600)
      : buildDefaultEvidenceSummary(fallbackInput.complaint, category, fallbackInput.imageProvided)
  );

  const recommended_action = redactPII(
    typeof raw.recommended_action === 'string' && raw.recommended_action.trim().length >= 10
      ? raw.recommended_action.trim().slice(0, 450)
      : buildDefaultAction(category, authorityRec.authorityName)
  );

  const recommended_authority =
    typeof raw.recommended_authority === 'string' && raw.recommended_authority.trim().length >= 3
      ? raw.recommended_authority.trim()
      : authorityRec.authorityName;

  const rawConf = Number(raw.confidence);
  const confidence =
    !Number.isNaN(rawConf) && rawConf >= 0.1 && rawConf <= 1
      ? Number(rawConf.toFixed(2))
      : fallbackInput.imageProvided
      ? 0.86
      : 0.78;

  return {
    title,
    description,
    category,
    severity,
    evidence_summary,
    recommended_action,
    recommended_authority,
    confidence,
  };
}

function inferCategoryFromText(text: string): IssueCategory {
  const lower = text.toLowerCase();
  if (/(pothole|asphalt|bitumen|pavement|crater|sinkhole|road damage|damaged road|broken road|cracked road|carriageway)/.test(lower)) {
    return 'Road Damage';
  }
  if (/(trash|garbage|litter|dumping|dumpster|compactor|bin|waste|rubbish|overflow)/.test(lower)) {
    return 'Waste';
  }
  if (/(light|lamp|streetlight|luminaire|dark|bulb|flicker|outage|pole)/.test(lower)) {
    return 'Street Lighting';
  }
  if (/(wheelchair|ada|ramp|sidewalk|footpath|walkway|blocked|obstruction|stroller|blind|tactile)/.test(lower)) {
    return 'Accessibility';
  }
  return 'Other';
}

function inferSeverityFromText(text: string, category: IssueCategory): IssueSeverity {
  const lower = text.toLowerCase();
  if (
    /(critical|emergency|exposed wire|live wire|deep sinkhole|completely blocked|wheelchair trapped|severe hazard|swerving into oncoming)/.test(
      lower
    )
  ) {
    return 'Critical';
  }
  if (
    /(deep.*pothole|pothole.*deep|swerv|dark|three|multiple|blocked|bicycle|bike lane|bus and bike|bus lane|sharp|dangerous|hazard|injury|crumbled)/.test(
      lower
    )
  ) {
    return 'High';
  }
  if (category === 'Waste' || /(overflow|graffiti|single|minor|cracked)/.test(lower)) {
    return 'Medium';
  }
  return 'Medium';
}

function buildDefaultTitle(complaint: string, category: IssueCategory): string {
  const cleaned = redactPII(complaint.trim()).replace(/\s+/g, ' ');
  const firstClause = cleaned.split(/[.!?]/)[0].trim();
  if (firstClause.length >= 12 && firstClause.length <= 85) {
    return `${category}: ${firstClause.charAt(0).toUpperCase()}${firstClause.slice(1)}`;
  }
  return `${category} Report — ${cleaned.slice(0, 62)}${cleaned.length > 62 ? '...' : ''}`;
}

function buildDefaultEvidenceSummary(
  complaint: string,
  category: IssueCategory,
  imageProvided: boolean
): string {
  const visualPrefix = imageProvided
    ? 'Uploaded visual attachment accompanies resident description. Visible surface condition supports a report under ' +
      category +
      ', while underlying structural or utility causes cannot be verified from surface imagery alone.'
    : 'No photo uploaded; assessment is derived strictly from the written resident observation and requires field verification.';
  return `${visualPrefix} Resident notes: "${redactPII(complaint.trim().slice(0, 180))}".`;
}

function buildDefaultAction(category: IssueCategory, authorityName: string): string {
  switch (category) {
    case 'Road Damage':
      return `Submit exact intersection/lane position and photo to ${authorityName} for cold-patch or asphalt surface repair. Keep clear of active traffic lanes.`;
    case 'Waste':
      return `Forward container location and overflow description to ${authorityName} for public litter pickup or right-of-way sanitation sweep.`;
    case 'Street Lighting':
      return `Report outage corridor and nearest cross-street (plus pole badge number if safely visible) to ${authorityName}.`;
    case 'Accessibility':
      return `Report right-of-way barrier or curb ramp defect to ${authorityName} for priority ADA clearance inspection.`;
    default:
      return `Submit documented coordinates and summary to ${authorityName} for manual triage and department routing.`;
  }
}

export async function analyzeCivicIssue(params: {
  complaint: string;
  address: string;
  lat: number;
  lng: number;
  imageDataUrl?: string;
  directory: AuthorityChannel[];
  apiKey?: string;
}): Promise<{
  result: AIAnalysisResult;
  analysis_source: 'gemini-vision-api' | 'transparent-demo-fallback';
  analysis_model: string;
  analysis_disclosure: string;
}> {
  const cleanComplaint = redactPII(params.complaint.trim());
  const parsedImage = parseDataUrl(params.imageDataUrl);
  const imageProvided = Boolean(params.imageDataUrl);
  const authorityPreMatch = resolveAuthorityRecommendation(
    inferCategoryFromText(cleanComplaint),
    params.lat,
    params.lng,
    params.directory
  );

  const directorySummary = params.directory
    .map(
      (d) =>
        `- ${d.name} (Categories: ${d.categories.join(', ')}; Jurisdiction: ${d.jurisdiction})`
    )
    .join('\n');

  const activeApiKey = (params.apiKey || process.env.GEMINI_API_KEY || '').trim();

  if (activeApiKey) {
    try {
      const client = new GoogleGenAI({ apiKey: activeApiKey });

      const promptText = `You are CivicLens, an objective civic issue analysis assistant for ${params.address} (${params.lat.toFixed(4)}, ${params.lng.toFixed(4)}).
Analyze the resident's complaint and optional image to produce a structured civic report.

CRITICAL INTEGRITY RULES:
1. Distinguish visible or explicitly stated evidence from assumptions. Never claim an image proves underground, internal electrical, or legal liability facts it cannot establish.
2. Never include personal identifiable information (names, phone numbers, emails) in any field.
3. Choose category strictly from: "Waste", "Road Damage", "Street Lighting", "Accessibility", "Other".
4. Choose severity strictly from: "Low", "Medium", "High", "Critical".
5. Ground recommended_authority in this configured local directory when applicable:
${directorySummary}

Resident Complaint:
"""
${cleanComplaint}
"""
Image attached: ${imageProvided ? 'Yes' : 'No'}`;

      const inputParts: Array<
        | { type: 'text'; text: string }
        | { type: 'image'; data: string; mime_type: string }
      > = [{ type: 'text', text: promptText }];

      if (parsedImage && SUPPORTED_VISION_MIMES.has(parsedImage.mimeType)) {
        inputParts.push({
          type: 'image',
          data: parsedImage.base64Data,
          mime_type: parsedImage.mimeType,
        });
      }

      const interaction = await client.interactions.create({
        model: 'gemini-3.8-flash',
        input: inputParts,
        response_format: [
          {
            type: 'text',
            mime_type: 'application/json',
            schema: {
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
          },
        ],
      });

      const rawText = interaction.output_text || '';
      const parsedJson = JSON.parse(rawText) as Record<string, unknown>;
      const validated = validateAndSanitizeAIAnalysis(parsedJson, {
        complaint: cleanComplaint,
        lat: params.lat,
        lng: params.lng,
        imageProvided,
        directory: params.directory,
      });

      return {
        result: validated,
        analysis_source: 'gemini-vision-api',
        analysis_model: 'gemini-3.8-flash',
        analysis_disclosure:
          parsedImage && SUPPORTED_VISION_MIMES.has(parsedImage.mimeType)
            ? 'Analyzed live via Google Gemini Vision API (gemini-3.8-flash) using multimodal image + text inspection.'
            : 'Analyzed live via Google Gemini API (gemini-3.8-flash) using structured text inspection.',
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown Gemini API error';
      console.warn('[CivicLens AI] Live Gemini call failed, falling back safely:', errorMessage);
      const fallbackResult = validateAndSanitizeAIAnalysis(
        {},
        {
          complaint: cleanComplaint,
          lat: params.lat,
          lng: params.lng,
          imageProvided,
          directory: params.directory,
        }
      );
      return {
        result: fallbackResult,
        analysis_source: 'transparent-demo-fallback',
        analysis_model: 'Deterministic Civic Triage Fallback',
        analysis_disclosure: `Live Gemini API call encountered an error (${errorMessage.slice(
          0,
          120
        )}). Generated structured report via transparent deterministic rule engine so your submission is not lost.`,
      };
    }
  }

  // No GEMINI_API_KEY configured — run clearly disclosed deterministic analysis
  const fallbackResult = validateAndSanitizeAIAnalysis(
    {
      recommended_authority: authorityPreMatch.authorityName,
    },
    {
      complaint: cleanComplaint,
      lat: params.lat,
      lng: params.lng,
      imageProvided,
      directory: params.directory,
    }
  );

  return {
    result: fallbackResult,
    analysis_source: 'transparent-demo-fallback',
    analysis_model: 'Deterministic Civic Triage (Demo Mode)',
    analysis_disclosure:
      'GEMINI_API_KEY is not configured in the server environment. Report was structured using CivicLens Transparent Demo Mode rules (no AI analysis was fabricated). Configure GEMINI_API_KEY in .env or Server Settings to enable live Gemini 3.8 Flash multimodal vision analysis.',
  };
}
