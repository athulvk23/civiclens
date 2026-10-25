import {
  AuthorityChannel,
  AuthorityRecommendation,
  CivicReport,
  IssueCategory,
  IssueSeverity,
  IssueStatus,
} from '../src/types/civic';

export interface RegionHubPreset {
  id: string;
  name: string;
  shortLabel: string;
  center: { lat: number; lng: number };
  zoom: number;
  radiusMeters: number;
  jurisdictionName: string;
  defaultAddress: string;
  defaultNeighborhood: string;
  sampleComplaint: string;
  duplicateComplaint: string;
}

export const REGION_HUB_PRESETS: RegionHubPreset[] = [
  {
    id: 'chennai-central',
    name: 'Chennai, Tamil Nadu (Anna Salai / T. Nagar / Mylapore / Adyar / Guindy)',
    shortLabel: 'Central Chennai',
    center: { lat: 13.0405, lng: 80.2503 },
    zoom: 13,
    radiusMeters: 15000,
    jurisdictionName: 'Greater Chennai Corporation, TN',
    defaultAddress: 'Anna Salai & Eldams Rd Signal, Teynampet, Chennai',
    defaultNeighborhood: 'Teynampet (Zone 9)',
    sampleComplaint:
      'Deep asphalt pothole with crumbled bitumen edges in the left MTC bus and two-wheeler lane on Anna Salai just before the Teynampet signal. Two-wheelers and buses are swerving suddenly to avoid the cavity.',
    duplicateComplaint:
      'Large pothole in the left bus lane on Anna Salai approaching Teynampet signal causing two-wheelers and buses to swerve around broken asphalt.',
  },
  {
    id: 'srm-chennai',
    name: 'SRM Institute of Science & Technology, Kattankulathur (Chennai / GST Road)',
    shortLabel: 'SRM Chennai (KTR)',
    center: { lat: 12.8230, lng: 80.0444 },
    zoom: 14,
    radiusMeters: 8000,
    jurisdictionName: 'Maraimalai Nagar Municipality & SRM Kattankulathur Campus',
    defaultAddress: 'SRM Arch Gate & GST Road (NH-32) Foot Overbridge, Potheri, Kattankulathur',
    defaultNeighborhood: 'SRM Kattankulathur / Potheri',
    sampleComplaint:
      'Deep pothole and broken storm-water drain slab along the GST Road service lane right outside SRM Arch Gate near Potheri railway station. Students and buses turning toward Tech Park are swerving sharply.',
    duplicateComplaint:
      'Crumbled asphalt pothole and damaged drain edge outside SRM Arch Gate on the GST Road service lane near Potheri station.',
  },
  {
    id: 'vit-vellore',
    name: 'Vellore Institute of Technology (VIT Vellore / Katpadi)',
    shortLabel: 'VIT Vellore',
    center: { lat: 12.9692, lng: 79.1559 },
    zoom: 14,
    radiusMeters: 8000,
    jurisdictionName: 'Vellore City Municipal Corporation (VCMC) & VIT Katpadi Corridor',
    defaultAddress: 'VIT Main Gate & Tiruvalam Road, Katpadi, Vellore, TN',
    defaultNeighborhood: 'Katpadi / VIT Vellore',
    sampleComplaint:
      'Multiple streetlights are completely dark and the asphalt edge is sunken along Tiruvalam Road outside VIT Vellore Main Gate 1 toward Chittoor Bus Stand, making evening pedestrian crossing hazardous for students.',
    duplicateComplaint:
      'Streetlight outage and damaged road shoulder outside VIT Main Gate on Tiruvalam Road in Katpadi, Vellore.',
  },
  {
    id: 'iit-palakkad',
    name: 'IIT Palakkad (Nila & Sahyadri Campus, Kanjikode, Kerala)',
    shortLabel: 'IIT Palakkad',
    center: { lat: 10.8050, lng: 76.7263 },
    zoom: 14,
    radiusMeters: 8000,
    jurisdictionName: 'Pudussery / Palakkad LSGD & IIT Palakkad Campus Corridor',
    defaultAddress: 'IIT Palakkad Main Approach Road (Walayar–Kanjikode NH-544 Link), Palakkad, Kerala',
    defaultNeighborhood: 'Kanjikode / IIT Palakkad',
    sampleComplaint:
      'Monsoon waterlogging and a deep eroded pothole on the Kanjikode–Nila Campus approach road near the NH-544 underpass. Cyclists and campus shuttle buses have to cross into the opposite lane.',
    duplicateComplaint:
      'Deep eroded pothole and waterlogged asphalt on the IIT Palakkad approach road near the Kanjikode NH-544 junction.',
  },
];

export const DEMO_REGION_CONFIG = {
  name: 'Multi-Hub Civic Network (Chennai • SRM KTR • VIT Vellore • IIT Palakkad)',
  center: { lat: 13.0405, lng: 80.2503 },
  boundsRadiusMeters: 15000,
};

export const INITIAL_AUTHORITY_DIRECTORY: AuthorityChannel[] = [
  {
    id: 'gcc-bus-route-roads',
    name: 'Greater Chennai Corporation (GCC) — Bus Route Roads (BRR) & Highways',
    jurisdiction: 'Greater Chennai Corporation, TN',
    categories: ['Road Damage'],
    officialUrl: 'https://chennaicorporation.gov.in/gcc/citizen-details/online-services/public-grievance/',
    verified: true,
    contactMethod: 'Namma Chennai App / GCC 1913 Civic Helpline',
    routingRationale:
      'GCC Bus Route Roads (BRR) and Zonal Engineering divisions manage pothole patching, bitumen resurfacing, and damaged carriageways across Chennai city wards.',
    notes: 'Verified official Greater Chennai Corporation grievance channel.',
  },
  {
    id: 'gcc-solid-waste-management',
    name: 'Greater Chennai Corporation (GCC) — Solid Waste Management (SWM)',
    jurisdiction: 'Greater Chennai Corporation, TN',
    categories: ['Waste'],
    officialUrl: 'https://chennaicorporation.gov.in/gcc/department/solid-waste-management/',
    verified: true,
    contactMethod: 'Namma Chennai App / 1913 Helpline / Urbaser Sumeet Zonal Desk',
    routingRationale:
      'GCC Solid Waste Management oversees compactor bin clearance, street sweeping, and illegal garbage dumping across all 15 Chennai zones.',
    notes: 'Verified official GCC Solid Waste Management channel.',
  },
  {
    id: 'gcc-electrical-streetlights',
    name: 'GCC Electrical Department & TANGEDCO — Streetlight Maintenance',
    jurisdiction: 'Greater Chennai Corporation, TN',
    categories: ['Street Lighting'],
    officialUrl: 'https://chennaicorporation.gov.in/gcc/department/electrical/',
    verified: true,
    contactMethod: 'GCC 1913 Helpline / TANGEDCO Minnagam (94987 94987)',
    routingRationale:
      'GCC Electrical Department and TANGEDCO maintain LED street luminaires, high-mast lamps, and underground streetlight feeder cables.',
    notes: 'Pole stencil number helps zonal electrical engineers locate the faulty fixture faster.',
  },
  {
    id: 'gcc-footpath-nmt-cell',
    name: 'GCC Non-Motorized Transport (NMT) & Footpath Accessibility Cell',
    jurisdiction: 'Greater Chennai Corporation, TN',
    categories: ['Accessibility'],
    officialUrl: 'https://chennaicorporation.gov.in/gcc/citizen-details/online-services/public-grievance/',
    verified: true,
    contactMethod: 'GCC 1913 Helpline / Namma Chennai App',
    routingRationale:
      'GCC Zonal Enforcement & NMT Cell handle obstructed pedestrian footpaths, damaged wheelchair curb ramps, and broken storm-water drain slabs.',
    notes: 'Verified official GCC public grievance channel for pedestrian & differently-abled right-of-way.',
  },
  {
    id: 'srm-maraimalai-nagar-civic',
    name: 'Maraimalai Nagar Municipality & NHAI GST Road Corridor (SRM Kattankulathur)',
    jurisdiction: 'Maraimalai Nagar Municipality & SRM Kattankulathur Campus',
    categories: ['Road Damage', 'Waste', 'Street Lighting', 'Accessibility', 'Other'],
    officialUrl: 'https://www.tnurbantree.tn.gov.in/maraimalainagar/',
    verified: true,
    contactMethod: 'TN Urban e-Seva Grievance Portal / NHAI 1033 Helpline / SRM Estate Office',
    routingRationale:
      'Covers Potheri / Kattankulathur municipal wards (Maraimalai Nagar Municipality), GST Road NH-32 service lanes (NHAI 1033), and SRM campus perimeter infrastructure.',
    notes: 'Verified regional channel for SRM Kattankulathur / Potheri corridor.',
  },
  {
    id: 'vit-vellore-municipal-corp',
    name: 'Vellore City Municipal Corporation (VCMC) — Katpadi Zone & VIT Corridor',
    jurisdiction: 'Vellore City Municipal Corporation (VCMC) & VIT Katpadi Corridor',
    categories: ['Road Damage', 'Waste', 'Street Lighting', 'Accessibility', 'Other'],
    officialUrl: 'https://www.tnurbantree.tn.gov.in/vellore/',
    verified: true,
    contactMethod: 'Vellore Corporation Grievance Portal / Toll-Free 1800-425-1600',
    routingRationale:
      'Vellore City Municipal Corporation (Zone 1 Katpadi) manages civic roads, street lighting, sanitation, and drainage along Tiruvalam Road and the VIT Vellore perimeter.',
    notes: 'Verified official Vellore City Municipal Corporation channel.',
  },
  {
    id: 'iit-palakkad-lsgd-kerala',
    name: 'Local Self Government Department (LSGD Kerala — Palakkad / Pudussery) & NHAI',
    jurisdiction: 'Pudussery / Palakkad LSGD & IIT Palakkad Campus Corridor',
    categories: ['Road Damage', 'Waste', 'Street Lighting', 'Accessibility', 'Other'],
    officialUrl: 'https://ksmart.lsgkerala.gov.in/',
    verified: true,
    contactMethod: 'K-SMART LSGD Citizen Portal / PWD Kerala Toll-Free 1800-425-7771',
    routingRationale:
      'Kerala LSGD (K-SMART portal) and PWD Roads wing handle civic road maintenance, drainage, and public lighting in the Kanjikode / Walayar / IIT Palakkad corridor.',
    notes: 'Verified official Kerala LSGD K-SMART citizen grievance portal.',
  },
];

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function resolveAuthorityRecommendation(
  category: IssueCategory,
  lat: number,
  lng: number,
  directory: AuthorityChannel[]
): AuthorityRecommendation {
  let closestHub: RegionHubPreset | null = null;
  let minDistance = Infinity;

  for (const hub of REGION_HUB_PRESETS) {
    const dist = calculateDistance(lat, lng, hub.center.lat, hub.center.lng);
    if (dist < minDistance) {
      minDistance = dist;
      closestHub = hub;
    }
  }

  if (!closestHub || minDistance > closestHub.radiusMeters) {
    return {
      channelId: null,
      authorityName: 'Local Municipal / Panchayat Civic Grievance Cell (Unverified External Region)',
      jurisdiction: `Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)}) — Outside Pre-Verified Hubs`,
      officialUrl: null,
      verified: false,
      contactMethod: 'Local Municipal Corporation / State Public Grievance Portal (CPGRAMS / 311)',
      whyRecommended: `Selected coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)}) are ${(
        minDistance / 1000
      ).toFixed(1)} km from the nearest configured hub (${closestHub?.shortLabel || 'Chennai'}).`,
      cautionNote:
        'Exact municipal department cannot be verified from the pre-configured directory for this custom location. Route cautiously to the local municipal body, campus estate office, or state public grievance portal.',
    };
  }

  const jurisdictionMatches = directory.filter(
    (ch) => ch.jurisdiction === closestHub!.jurisdictionName
  );
  const matched =
    jurisdictionMatches.find((ch) => ch.categories.includes(category)) ||
    jurisdictionMatches[0] ||
    directory.find((ch) => ch.categories.includes(category));

  if (!matched) {
    return {
      channelId: null,
      authorityName: `${closestHub.shortLabel} Municipal Civic Intake`,
      jurisdiction: closestHub.jurisdictionName,
      officialUrl: null,
      verified: false,
      contactMethod: 'Local Civic Helpline',
      whyRecommended: `Located within ${closestHub.shortLabel} (${(minDistance / 1000).toFixed(
        1
      )} km from hub center).`,
      cautionNote: 'No specific directory entry mapped; present report to general municipal intake.',
    };
  }

  const isGeneralFallback = category === 'Other';

  return {
    channelId: matched.id,
    authorityName: matched.name,
    jurisdiction: matched.jurisdiction,
    officialUrl: matched.officialUrl || null,
    verified: matched.verified && !isGeneralFallback,
    contactMethod: matched.contactMethod,
    whyRecommended: `Matched "${category}" within ${closestHub.shortLabel} (${(
      minDistance / 1000
    ).toFixed(1)} km from ${closestHub.shortLabel} center). ${matched.routingRationale}`,
    cautionNote: isGeneralFallback
      ? 'Issue classified as Other; routed cautiously to general civic grievance intake for manual triage.'
      : undefined,
  };
}

interface SeedSpec {
  id: string;
  title: string;
  description: string;
  raw_complaint: string;
  category: IssueCategory;
  severity: IssueSeverity;
  status: IssueStatus;
  lat: number;
  lng: number;
  address: string;
  neighborhood: string;
  photos: [string, string, string];
  evidence_summary: string;
  recommended_action: string;
  confidence: number;
  created_at: string;
  updated_at: string;
  status_note: string;
}

const SEED_SPECS: SeedSpec[] = [
  // ============================================================================
  // CENTRAL CHENNAI HUB (7 Tickets)
  // ============================================================================
  {
    id: 'sample-456',
    title: 'Deep Asphalt Pothole in Left MTC Bus Lane on Anna Salai near Teynampet Signal',
    description:
      'Large surface pothole with crumbled bitumen edges in the northbound bus and two-wheeler lane on Anna Salai approaching the Eldams Road / Teynampet signal, forcing two-wheelers and MTC buses to swerve.',
    raw_complaint:
      'There is a deep pothole right in the left lane on Anna Salai just before the Teynampet signal. Two-wheelers and MTC buses are swerving suddenly around it and loose gravel is scattered across the road.',
    category: 'Road Damage',
    severity: 'High',
    status: 'In Progress',
    lat: 13.0405,
    lng: 80.2503,
    address: 'Anna Salai & Eldams Rd Signal, Teynampet, Chennai',
    neighborhood: 'Teynampet (Zone 9)',
    photos: ['./photos/pothole-1.jpg', './photos/pothole-2.jpg', './photos/pothole-3.jpg'],
    evidence_summary:
      'Visible asphalt cavity in an active arterial bus and two-wheeler lane with loose aggregate along the rim. High severity reflects immediate swerving risk; subsurface utility cause requires field inspection.',
    recommended_action:
      'Dispatch Zone 9 Bus Route Roads (BRR) cold-mix patching crew and place reflective cones ahead of the Teynampet signal approach.',
    confidence: 0.94,
    created_at: '2026-10-21T09:15:00.000Z',
    updated_at: '2026-10-24T04:15:00.000Z',
    status_note: 'Inspecting road foundation; cold-mix patching crew scheduled for night shift.',
  },
  {
    id: 'sample-457',
    title: 'Overflowing Compactor Bin & Plastic Litter Near Pondy Bazaar Pedestrian Plaza',
    description:
      'Street-side solid waste compactor bin on Sir Thyagaraya Road (Pondy Bazaar, T. Nagar) is overflowing onto the Smart City pedestrian walkway with packaging waste and food cartons.',
    raw_complaint:
      'The garbage compactor bin on Sir Thyagaraya Road in Pondy Bazaar T. Nagar has been overflowing since yesterday evening. Bags and plastic cartons are blocking half the footpath.',
    category: 'Waste',
    severity: 'Medium',
    status: 'Submitted',
    lat: 13.0418,
    lng: 80.2341,
    address: 'Sir Thyagaraya Rd, Pondy Bazaar, T. Nagar, Chennai',
    neighborhood: 'T. Nagar (Zone 10)',
    photos: ['./photos/waste-1.jpg', './photos/waste-2.jpg', './photos/waste-3.jpg'],
    evidence_summary:
      'Accumulated municipal solid waste spilling from a roadside bin onto the paved pedestrian plaza. No hazardous or biomedical waste is visible.',
    recommended_action:
      'Route to GCC Zone 10 Solid Waste Management / Urbaser Sumeet conservancy supervisor for immediate compactor clearance.',
    confidence: 0.92,
    created_at: '2026-10-23T14:20:00.000Z',
    updated_at: '2026-10-23T14:20:00.000Z',
    status_note: 'Logged with Zone 10 SWM conservancy desk for morning compactor round.',
  },
  {
    id: 'sample-458',
    title: 'Four Consecutive LED Streetlight Poles Dark on Luz Church Road (Mylapore)',
    description:
      'A stretch of four streetlights along Luz Church Road near Nageswara Rao Park in Mylapore remains unlit after 6:30 PM, leaving the pedestrian crossing and bus stop in darkness.',
    raw_complaint:
      'Four streetlights in a row on Luz Church Road near Nageswara Rao Park gate in Mylapore are completely off at night. Senior citizens walking from the park can barely see the curb.',
    category: 'Street Lighting',
    severity: 'High',
    status: 'Under Review',
    lat: 13.0329,
    lng: 80.2683,
    address: 'Luz Church Rd, Near Nageswara Rao Park, Mylapore, Chennai',
    neighborhood: 'Mylapore (Zone 9)',
    photos: ['./photos/lighting-1.jpg', './photos/lighting-2.jpg', './photos/lighting-3.jpg'],
    evidence_summary:
      'Multi-pole darkness along an urban collector street suggests a local feeder pillar trip or timer relay fault rather than individual bulb failure.',
    recommended_action:
      'Inspect feeder pillar along Luz Church Road and restore phase supply via GCC Electrical Department / TANGEDCO.',
    confidence: 0.91,
    created_at: '2026-10-22T18:40:00.000Z',
    updated_at: '2026-10-23T11:10:00.000Z',
    status_note: 'Assigned to Zone 9 electrical AE for feeder box inspection.',
  },
  {
    id: 'sample-459',
    title: 'Broken Storm-Water Drain Slab & Blocked Wheelchair Ramp on LB Road (Adyar)',
    description:
      'Precast concrete storm-water drain cover slab has caved in across the pedestrian footpath ramp on Lattice Bridge (LB) Road near Adyar Signal, creating an open drop hazard.',
    raw_complaint:
      'A concrete slab over the storm drain on the footpath at LB Road near Adyar depot signal is broken and sunken, blocking wheelchair and stroller access completely.',
    category: 'Accessibility',
    severity: 'Critical',
    status: 'In Progress',
    lat: 12.9982,
    lng: 80.2568,
    address: 'Lattice Bridge (LB) Road, Near Adyar Signal, Chennai',
    neighborhood: 'Adyar (Zone 13)',
    photos: ['./photos/sidewalk-1.jpg', './photos/sidewalk-2.jpg', './photos/sidewalk-3.jpg'],
    evidence_summary:
      'Fractured concrete footpath slab exposing a recessed drain channel directly in the pedestrian path of travel. Critical severity due to fall hazard and barrier to mobility-impaired residents.',
    recommended_action:
      'Barricade the open footpath cavity immediately and install a reinforced precast RCC drain cover slab via GCC Zone 13 NMT Cell.',
    confidence: 0.95,
    created_at: '2026-10-20T08:00:00.000Z',
    updated_at: '2026-10-23T16:30:00.000Z',
    status_note: 'Safety barricades placed; replacement RCC slab casting queued at Zone 13 yard.',
  },
  {
    id: 'sample-460',
    title: 'Cratered Asphalt & Exposed Aggregate on Kathipara Flyover Service Road (Guindy)',
    description:
      'Repeated heavy bus braking at the Kathipara urban square service lane turning toward Guindy Industrial Estate has peeled off the top wearing course, leaving a 1.2m wide pothole.',
    raw_complaint:
      'Huge pothole on the Kathipara service road curve heading toward Guindy railway station. Bikes skidded on the loose stones this morning.',
    category: 'Road Damage',
    severity: 'Critical',
    status: 'Submitted',
    lat: 13.0067,
    lng: 80.2045,
    address: 'Kathipara Urban Square Service Rd, Guindy, Chennai',
    neighborhood: 'Guindy (Zone 13)',
    photos: ['./photos/pothole-2.jpg', './photos/pothole-3.jpg', './photos/pothole-1.jpg'],
    evidence_summary:
      'Severe wearing-course delamination and loose stone aggregate on a high-speed turning curve. Critical priority due to two-wheeler skidding risk.',
    recommended_action:
      'Sweep loose aggregate immediately and apply hot-mix bituminous macadam patch via GCC BRR / Highways wing.',
    confidence: 0.93,
    created_at: '2026-10-24T05:30:00.000Z',
    updated_at: '2026-10-24T05:30:00.000Z',
    status_note: 'Ticket raised by commuter; flagged Critical for Guindy zonal engineer.',
  },
  {
    id: 'sample-461',
    title: 'Uncollected Construction & Commercial Waste Pile on Velachery Main Road',
    description:
      'Mixed commercial packaging, plastic bags, and broken masonry rubble dumped beside the bus shelter on Velachery Main Road near Vijayanagar junction.',
    raw_complaint:
      'Garbage and construction sacks have been dumped next to the bus shelter on Velachery Main Road near Vijayanagar bus terminus, causing foul smell and narrowing the lane.',
    category: 'Waste',
    severity: 'Medium',
    status: 'Resolved',
    lat: 12.9791,
    lng: 80.2184,
    address: 'Velachery Main Rd, Near Vijayanagar Bus Stand, Chennai',
    neighborhood: 'Velachery (Zone 13)',
    photos: ['./photos/waste-2.jpg', './photos/waste-3.jpg', './photos/waste-1.jpg'],
    evidence_summary:
      'Roadside waste accumulation encroaching on bus bay shoulder. Verified cleared during morning conservancy drive.',
    recommended_action:
      'Clear waste pile with mini-tipper lorry and sanitize bus bay curb with bleaching powder.',
    confidence: 0.90,
    created_at: '2026-10-19T11:00:00.000Z',
    updated_at: '2026-10-22T17:15:00.000Z',
    status_note: 'Cleared by Urbaser Sumeet Zone 13 night conservancy team and verified.',
  },
  {
    id: 'sample-462',
    title: 'Sunken Manhole Rim & Cracked Pavement Outside Egmore Railway Station',
    description:
      'Recessed circular utility manhole cover and fractured surrounding asphalt on Gandhi Irwin Road outside Chennai Egmore Railway Station main taxi exit.',
    raw_complaint:
      'The road surface around the drainage manhole right outside Egmore Railway Station main exit on Gandhi Irwin Road has sunk by almost 4 inches, jolting autos and taxis.',
    category: 'Road Damage',
    severity: 'High',
    status: 'Under Review',
    lat: 13.0732,
    lng: 80.2609,
    address: 'Gandhi Irwin Rd, Egmore Railway Station Exit, Chennai',
    neighborhood: 'Egmore (Zone 5)',
    photos: ['./photos/pothole-3.jpg', './photos/pothole-1.jpg', './photos/pothole-2.jpg'],
    evidence_summary:
      'Differential settlement around utility chamber collar in a high-traffic station exit lane. Requires collar raising and asphalt leveling.',
    recommended_action:
      'Coordinate between GCC Zone 5 Roads and CMWSSB to raise manhole frame flush with carriageway.',
    confidence: 0.91,
    created_at: '2026-10-22T07:45:00.000Z',
    updated_at: '2026-10-23T12:00:00.000Z',
    status_note: 'Joint inspection requested with CMWSSB depot engineer.',
  },

  // ============================================================================
  // SRM CHENNAI — KATTANKULATHUR HUB (5 Tickets)
  // ============================================================================
  {
    id: 'sample-501',
    title: 'Deep Pothole & Crumbled Edge on GST Road Service Lane Outside SRM Arch Gate',
    description:
      'Large water-worn pothole on the NH-32 (GST Road) service lane directly outside SRM Arch Gate near Potheri Railway Station foot-overbridge, causing campus buses and bikes to swerve.',
    raw_complaint:
      'There is a deep pothole with broken bitumen edges on the GST Road service lane right in front of SRM Arch Gate at Potheri. Students on two-wheelers and college buses turning in have to swerve sharply.',
    category: 'Road Damage',
    severity: 'High',
    status: 'In Progress',
    lat: 12.8230,
    lng: 80.0444,
    address: 'SRM Arch Gate & GST Road Service Lane, Potheri, Kattankulathur',
    neighborhood: 'SRM Kattankulathur / Potheri',
    photos: ['./photos/pothole-1.jpg', './photos/pothole-3.jpg', './photos/pothole-2.jpg'],
    evidence_summary:
      'High-exposure carriageway defect at a major university transit junction. Swerving conflict between student two-wheelers and heavy buses warrants High severity.',
    recommended_action:
      'Log with Maraimalai Nagar Municipality & NHAI GST Road maintenance unit for bituminous patching outside SRM Arch Gate.',
    confidence: 0.95,
    created_at: '2026-10-22T10:15:00.000Z',
    updated_at: '2026-10-24T03:40:00.000Z',
    status_note: 'Inspecting road edge near Potheri FOB; patching material mobilized.',
  },
  {
    id: 'sample-502',
    title: 'Overflowing Waste Bin & Food Packaging Litter Near Potheri Railway Station',
    description:
      'Public waste receptacle along the student food-street walkway between Potheri suburban station and SRM Main Campus is overflowing with disposable containers.',
    raw_complaint:
      'The waste bin near Potheri railway station entrance opposite SRM gate is completely overflowing with plastic food boxes and wrappers onto the footpath.',
    category: 'Waste',
    severity: 'Medium',
    status: 'Submitted',
    lat: 12.8214,
    lng: 80.0419,
    address: 'Potheri Railway Station Approach Rd, Kattankulathur',
    neighborhood: 'Potheri Ward (Maraimalai Nagar)',
    photos: ['./photos/waste-1.jpg', './photos/waste-3.jpg', './photos/waste-2.jpg'],
    evidence_summary:
      'Visible overflow of packaging waste along a high-footfall suburban rail and student walkway.',
    recommended_action:
      'Schedule daily evening compactor pickup via Maraimalai Nagar Municipality sanitation wing.',
    confidence: 0.92,
    created_at: '2026-10-23T19:00:00.000Z',
    updated_at: '2026-10-23T19:00:00.000Z',
    status_note: 'Submitted to Maraimalai Nagar municipal sanitary inspector.',
  },
  {
    id: 'sample-503',
    title: 'Displaced Concrete Footpath Slab Blocking Walkway Near SRM Tech Park',
    description:
      'Broken and tilted storm-drain cover slab along the pedestrian walkway between SRM Tech Park and the Hostel Zone forces pedestrians to step into the vehicular lane.',
    raw_complaint:
      'Concrete footpath slab near SRM Tech Park bus bay is cracked and tilted into the drain channel, making it impossible for wheelchair users or walkers at night.',
    category: 'Accessibility',
    severity: 'High',
    status: 'Under Review',
    lat: 12.8248,
    lng: 80.0462,
    address: 'SRM Tech Park Avenue, Kattankulathur Campus Corridor',
    neighborhood: 'SRM Kattankulathur',
    photos: ['./photos/sidewalk-2.jpg', './photos/sidewalk-1.jpg', './photos/sidewalk-3.jpg'],
    evidence_summary:
      'Physical obstruction and trip hazard along an active student pedestrian spine.',
    recommended_action:
      'Reset precast drain slab and level paver blocks via Campus Estate & Municipal Civil Maintenance.',
    confidence: 0.93,
    created_at: '2026-10-22T15:30:00.000Z',
    updated_at: '2026-10-23T09:45:00.000Z',
    status_note: 'Civil maintenance engineer inspected slab dimensions for replacement.',
  },
  {
    id: 'sample-504',
    title: 'Dark Streetlight Stretch Along Valliammai Junction to Estancia Link Road',
    description:
      'Five consecutive streetlight poles along the link road beside Valliammai Engineering Gate in Kattankulathur are non-functional after sunset.',
    raw_complaint:
      'Streetlights on the link road behind Valliammai gate in Kattankulathur are completely dark after 6:30 PM. Hundreds of students walk here after evening lab hours.',
    category: 'Street Lighting',
    severity: 'High',
    status: 'Submitted',
    lat: 12.8265,
    lng: 80.0408,
    address: 'Valliammai Junction Link Rd, Potheri, Kattankulathur',
    neighborhood: 'Kattankulathur North',
    photos: ['./photos/lighting-2.jpg', './photos/lighting-1.jpg', './photos/lighting-3.jpg'],
    evidence_summary:
      'Unlit pedestrian and two-wheeler corridor during evening peak movement hours.',
    recommended_action:
      'Check overhead streetlight fuse box and replace faulty LED drivers via Maraimalai Nagar electrical desk.',
    confidence: 0.90,
    created_at: '2026-10-23T20:15:00.000Z',
    updated_at: '2026-10-23T20:15:00.000Z',
    status_note: 'Reported by hostel student representative; queued for line inspection.',
  },
  {
    id: 'sample-505',
    title: 'Eroded Road Shoulder & Potholes at Guduvancheri Bus Terminus Entry (GST Road)',
    description:
      'Deep ruts and broken asphalt at the bus bay entry of Guduvancheri Bus Stand one stop north of SRM Kattankulathur on GST Road.',
    raw_complaint:
      'The entrance to Guduvancheri bus stand off GST Road has deep potholes filled with gravel and muddy water, causing buses to lurch violently.',
    category: 'Road Damage',
    severity: 'Medium',
    status: 'Resolved',
    lat: 12.8438,
    lng: 80.0597,
    address: 'GST Road Bus Bay, Guduvancheri, Chengalpattu District',
    neighborhood: 'Guduvancheri Corridor',
    photos: ['./photos/pothole-2.jpg', './photos/pothole-1.jpg', './photos/pothole-3.jpg'],
    evidence_summary:
      'Bus bay wearing-course erosion caused by high axle loads and poor surface drainage.',
    recommended_action:
      'Compact wet-mix macadam base and lay bituminous surface layer across bus bay entrance.',
    confidence: 0.91,
    created_at: '2026-10-18T12:00:00.000Z',
    updated_at: '2026-10-21T18:00:00.000Z',
    status_note: 'Bus bay resurfaced and compacted by highway maintenance crew.',
  },

  // ============================================================================
  // VIT VELLORE — KATPADI HUB (4 Tickets)
  // ============================================================================
  {
    id: 'sample-601',
    title: 'Three Consecutive Streetlights Out Outside VIT Vellore Main Gate (Tiruvalam Rd)',
    description:
      'Three pedestrian street-lighting poles along Tiruvalam Road outside VIT Vellore Main Gate 1 toward Katpadi remain unlit after dusk, leaving the student crosswalk in darkness.',
    raw_complaint:
      'Three LED streetlights in a row are completely dark on Tiruvalam Road right outside VIT Vellore Main Gate in Katpadi. Students crossing the road at night are barely visible to oncoming vehicles.',
    category: 'Street Lighting',
    severity: 'High',
    status: 'Under Review',
    lat: 12.9692,
    lng: 79.1559,
    address: 'Tiruvalam Road (Outside VIT Main Gate 1), Katpadi, Vellore',
    neighborhood: 'Katpadi / VIT Vellore (Zone 1)',
    photos: ['./photos/lighting-1.jpg', './photos/lighting-3.jpg', './photos/lighting-2.jpg'],
    evidence_summary:
      'Multiple adjacent fixtures dark simultaneously along a high-density university crosswalk corridor; requires VCMC Zone 1 electrical inspection.',
    recommended_action:
      'Report multi-pole outage on Tiruvalam Road (Katpadi Zone) to Vellore City Municipal Corporation (VCMC) electrical wing.',
    confidence: 0.92,
    created_at: '2026-10-23T21:10:00.000Z',
    updated_at: '2026-10-24T03:00:00.000Z',
    status_note: 'Verified Katpadi coordinates and assigned to VCMC Zone 1 electrical line team.',
  },
  {
    id: 'sample-602',
    title: 'Deep Pothole & Cracked Bitumen on Katpadi Railway Station Approach Road',
    description:
      'Severe asphalt cavity in the auto-rickshaw and bus approach lane leading to Katpadi Junction Railway Station Platform 1 entrance in Vellore.',
    raw_complaint:
      'Large pothole right on the approach curve to Katpadi Railway Station entrance. Autos and cabs dropping students have to swerve into oncoming traffic.',
    category: 'Road Damage',
    severity: 'High',
    status: 'In Progress',
    lat: 12.9718,
    lng: 79.1384,
    address: 'Katpadi Junction Railway Station Approach Rd, Vellore',
    neighborhood: 'Katpadi Railway Colony',
    photos: ['./photos/pothole-3.jpg', './photos/pothole-2.jpg', './photos/pothole-1.jpg'],
    evidence_summary:
      'Active carriageway pothole on a primary intermodal transit feeder road in Katpadi.',
    recommended_action:
      'Patch cavity with hot-mix bitumen via Vellore City Municipal Corporation Zone 1 engineering wing.',
    confidence: 0.94,
    created_at: '2026-10-21T16:40:00.000Z',
    updated_at: '2026-10-23T17:20:00.000Z',
    status_note: 'Road cut marked and cold-mix patching scheduled by VCMC Zone 1.',
  },
  {
    id: 'sample-603',
    title: 'Uncollected Roadside Waste Near VIT Gate 3 Commercial Lane (Vaibhav Nagar)',
    description:
      'Overflowing secondary waste collection point near the student eateries outside VIT Gate 3 in Vaibhav Nagar, Katpadi.',
    raw_complaint:
      'Garbage bags and food cartons are piled up near the corner bin outside VIT Gate 3 toward Vaibhav Nagar, attracting stray cattle onto the road.',
    category: 'Waste',
    severity: 'Medium',
    status: 'Submitted',
    lat: 12.9726,
    lng: 79.1612,
    address: 'Vaibhav Nagar Link Rd, Near VIT Gate 3, Katpadi, Vellore',
    neighborhood: 'Vaibhav Nagar / Katpadi',
    photos: ['./photos/waste-3.jpg', './photos/waste-1.jpg', './photos/waste-2.jpg'],
    evidence_summary:
      'Overflowing municipal bin along a residential and student dining street.',
    recommended_action:
      'Dispatch VCMC Katpadi ward battery-operated micro-compactor vehicle for clearance.',
    confidence: 0.90,
    created_at: '2026-10-24T02:15:00.000Z',
    updated_at: '2026-10-24T02:15:00.000Z',
    status_note: 'Logged in VCMC Katpadi sanitation queue.',
  },
  {
    id: 'sample-604',
    title: 'Damaged Pedestrian Curb Ramp & Uneven Pavers at Chittoor Bus Stand (Katpadi)',
    description:
      'Cracked concrete curb ramp and dislodged interlocking footpath tiles at the Chittoor Bus Stand pedestrian crossing on Katpadi–Chittoor Road.',
    raw_complaint:
      'The pedestrian footpath ramp at Chittoor Bus Stand junction in Katpadi has broken concrete edges and missing tiles, making it unsafe for elderly passengers.',
    category: 'Accessibility',
    severity: 'Medium',
    status: 'Resolved',
    lat: 12.9654,
    lng: 79.1462,
    address: 'Chittoor Bus Stand Junction, Katpadi Rd, Vellore',
    neighborhood: 'Katpadi Central',
    photos: ['./photos/sidewalk-1.jpg', './photos/sidewalk-3.jpg', './photos/sidewalk-2.jpg'],
    evidence_summary:
      'Uneven pedestrian transition at a major bus boarding intersection.',
    recommended_action:
      'Relay interlocking paver blocks and re-grade concrete curb ramp at bus stand crosswalk.',
    confidence: 0.91,
    created_at: '2026-10-19T09:00:00.000Z',
    updated_at: '2026-10-22T14:50:00.000Z',
    status_note: 'Curb ramp re-concreted and pavers leveled by VCMC civil contractor.',
  },

  // ============================================================================
  // IIT PALAKKAD — KANJIKODE HUB (4 Tickets)
  // ============================================================================
  {
    id: 'sample-701',
    title: 'Obstructed Pedestrian Ramp & Displaced Drain Slab Near IIT Palakkad Nila Campus',
    description:
      'Wheelchair and pedestrian footpath ramp near the IIT Palakkad Nila Campus junction in Kanjikode is blocked by displaced concrete culvert slabs and storm debris.',
    raw_complaint:
      'Pedestrian and wheelchair access on the walkway near the IIT Palakkad Nila campus entrance road in Kanjikode is obstructed by displaced concrete drain slabs, forcing walkers onto the main road.',
    category: 'Accessibility',
    severity: 'Critical',
    status: 'In Progress',
    lat: 10.8050,
    lng: 76.7263,
    address: 'Nila Campus Approach Road, Kanjikode, IIT Palakkad, Kerala',
    neighborhood: 'Kanjikode / IIT Palakkad',
    photos: ['./photos/sidewalk-3.jpg', './photos/sidewalk-1.jpg', './photos/sidewalk-2.jpg'],
    evidence_summary:
      'Direct physical barrier on a pedestrian ramp forcing foot traffic into the active roadway. Classified as Critical due to mobility obstruction and traffic conflict.',
    recommended_action:
      'Report footpath obstruction and displaced slab via Kerala LSGD K-SMART portal / PWD Roads wing for Kanjikode corridor clearance.',
    confidence: 0.95,
    created_at: '2026-10-22T15:00:00.000Z',
    updated_at: '2026-10-24T04:00:00.000Z',
    status_note: 'Culvert slab realignment crew scheduled via Pudussery Grama Panchayat / PWD.',
  },
  {
    id: 'sample-702',
    title: 'Monsoon Eroded Pothole on Sahyadri Campus Link Road Near Walayar NH-544',
    description:
      'Deep water-scoured pothole and broken asphalt edge along the link road connecting NH-544 to IIT Palakkad Sahyadri Campus, hazardous for campus shuttle buses and cyclists.',
    raw_complaint:
      'Heavy rain has washed away the road surface on the Sahyadri Campus link road off NH-544 in Kanjikode, leaving a deep pothole right on the curve.',
    category: 'Road Damage',
    severity: 'High',
    status: 'Submitted',
    lat: 10.8112,
    lng: 76.7315,
    address: 'Sahyadri Campus Link Rd (Off NH-544), Kanjikode, Palakkad',
    neighborhood: 'Sahyadri Corridor / Pudussery',
    photos: ['./photos/pothole-1.jpg', './photos/pothole-2.jpg', './photos/pothole-3.jpg'],
    evidence_summary:
      'Monsoon surface scouring and edge drop-off on a two-lane campus connector road.',
    recommended_action:
      'Clear side-drain silt and patch carriageway cavity with bituminous macadam via PWD Kerala Roads section.',
    confidence: 0.93,
    created_at: '2026-10-23T17:10:00.000Z',
    updated_at: '2026-10-23T17:10:00.000Z',
    status_note: 'Logged on K-SMART portal for PWD Palakkad road maintenance.',
  },
  {
    id: 'sample-703',
    title: 'High-Mast & Streetlight Outage at Kanjikode Town Bus Stand Junction',
    description:
      'Streetlight feeder along the Kanjikode NH-544 service road and bus stand junction is dark after 7 PM, reducing visibility for evening commuters and trucks.',
    raw_complaint:
      'The streetlights at Kanjikode bus stand junction on the NH-544 service road are not working for the past two nights, making the highway underpass crossing very dark.',
    category: 'Street Lighting',
    severity: 'High',
    status: 'Under Review',
    lat: 10.7958,
    lng: 76.7421,
    address: 'Kanjikode Town Bus Stand & NH-544 Underpass, Palakkad, Kerala',
    neighborhood: 'Kanjikode Town',
    photos: ['./photos/lighting-3.jpg', './photos/lighting-2.jpg', './photos/lighting-1.jpg'],
    evidence_summary:
      'Dark highway underpass and bus boarding zone with heavy commercial truck traffic.',
    recommended_action:
      'Coordinate with KSEB Kanjikode section and NHAI corridor maintenance to restore underpass lighting.',
    confidence: 0.91,
    created_at: '2026-10-22T20:00:00.000Z',
    updated_at: '2026-10-23T14:30:00.000Z',
    status_note: 'Assigned to electrical wing via K-SMART Pudussery panchayat desk.',
  },
  {
    id: 'sample-704',
    title: 'Dumped Packaging & Industrial Scrap Along Pudussery Industrial Service Lane',
    description:
      'Uncollected pile of discarded packaging waste and plastic sacks along the Pudussery industrial area service road west of Kanjikode.',
    raw_complaint:
      'Plastic sacks and packaging waste have been dumped along the roadside drain in Pudussery near Kanjikode industrial estate, blocking rainwater flow.',
    category: 'Waste',
    severity: 'Medium',
    status: 'Resolved',
    lat: 10.7995,
    lng: 76.7180,
    address: 'Pudussery Industrial Estate Service Rd, Kanjikode, Palakkad',
    neighborhood: 'Pudussery West',
    photos: ['./photos/waste-2.jpg', './photos/waste-1.jpg', './photos/waste-3.jpg'],
    evidence_summary:
      'Roadside solid waste accumulation obstructing open storm-water drainage channel.',
    recommended_action:
      'Clear waste via Haritha Karma Sena / Pudussery LSGD sanitation squad and clear drain inlet.',
    confidence: 0.90,
    created_at: '2026-10-18T10:00:00.000Z',
    updated_at: '2026-10-21T16:15:00.000Z',
    status_note: 'Cleared by Pudussery LSGD sanitation team and drain desilted.',
  },
];

export const INITIAL_SAMPLE_REPORTS: CivicReport[] = SEED_SPECS.map((spec) => {
  const auth = resolveAuthorityRecommendation(
    spec.category,
    spec.lat,
    spec.lng,
    INITIAL_AUTHORITY_DIRECTORY
  );

  const history = [
    {
      status: 'Submitted' as IssueStatus,
      timestamp: spec.created_at,
      note: `Ticket raised for ${spec.neighborhood}.`,
      actor: 'Civic Reporter',
    },
  ];

  if (spec.status !== 'Submitted') {
    history.push({
      status: spec.status,
      timestamp: spec.updated_at,
      note: spec.status_note,
      actor: 'Municipal Coordinator',
    });
  } else {
    history[0].note = spec.status_note;
  }

  return {
    id: spec.id,
    title: spec.title,
    description: spec.description,
    raw_complaint: spec.raw_complaint,
    category: spec.category,
    severity: spec.severity,
    evidence_summary: spec.evidence_summary,
    recommended_action: spec.recommended_action,
    recommended_authority: auth.authorityName,
    confidence: spec.confidence,
    location: {
      lat: spec.lat,
      lng: spec.lng,
      address: spec.address,
      neighborhood: spec.neighborhood,
    },
    image_data_url: spec.photos[0],
    gallery_photos: spec.photos,
    image_provided: true,
    status: spec.status,
    status_history: history,
    created_at: spec.created_at,
    updated_at: spec.updated_at,
    is_sample_data: true,
    analysis_source: 'transparent-demo-fallback',
    analysis_model: 'Pre-seeded Multi-Hub Civic Dataset',
    analysis_disclosure:
      'Pre-seeded demonstration ticket with real representative civic hazard photography.',
    authority_details: auth,
    contact_provided: false,
  };
});
