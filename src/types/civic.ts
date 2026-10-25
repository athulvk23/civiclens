export type IssueCategory =
  | 'Waste'
  | 'Road Damage'
  | 'Street Lighting'
  | 'Accessibility'
  | 'Other';

export type IssueSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export type IssueStatus =
  | 'Submitted'
  | 'Under Review'
  | 'In Progress'
  | 'Resolved';

export interface AIAnalysisResult {
  title: string;
  description: string;
  category: IssueCategory;
  severity: IssueSeverity;
  evidence_summary: string;
  recommended_action: string;
  recommended_authority: string;
  confidence: number;
}

export interface AuthorityChannel {
  id: string;
  name: string;
  jurisdiction: string;
  categories: IssueCategory[];
  officialUrl: string;
  verified: boolean;
  contactMethod: string;
  routingRationale: string;
  notes: string;
}

export interface AuthorityRecommendation {
  channelId: string | null;
  authorityName: string;
  jurisdiction: string;
  officialUrl: string | null;
  verified: boolean;
  contactMethod: string;
  whyRecommended: string;
  cautionNote?: string;
}

export interface StatusHistoryEntry {
  status: IssueStatus;
  timestamp: string;
  note: string;
  actor: string;
}

export interface CivicReport extends AIAnalysisResult {
  id: string;
  raw_complaint: string;
  location: {
    lat: number;
    lng: number;
    address: string;
    neighborhood: string;
  };
  image_data_url?: string;
  gallery_photos?: string[];
  image_provided: boolean;
  status: IssueStatus;
  status_history: StatusHistoryEntry[];
  created_at: string;
  updated_at: string;
  is_sample_data: boolean;
  analysis_source: 'gemini-vision-api' | 'transparent-demo-fallback';
  analysis_model: string;
  analysis_disclosure: string;
  authority_details: AuthorityRecommendation;
  contact_provided: boolean; // Never expose actual PII in public reports
}

export interface DuplicateMatch {
  reportId: string;
  title: string;
  category: IssueCategory;
  severity: IssueSeverity;
  status: IssueStatus;
  address: string;
  distanceMeters: number;
  similarityScore: number; // 0 to 1
  matchReasons: string[];
  isSampleData: boolean;
  createdAt: string;
}

export interface SystemConfigStatus {
  aiConfigured: boolean;
  aiModel: string;
  storageMode: 'supabase' | 'local-json-persistence';
  demoRegion: string;
  regionCenter: { lat: number; lng: number };
}
