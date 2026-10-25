export interface LocationHub {
  id: string;
  shortLabel: string;
  fullName: string;
  address: string;
  neighborhood: string;
  lat: number;
  lng: number;
  zoom: number;
  sampleComplaint: string;
  duplicateComplaint: string;
}

export const QUICK_LOCATION_HUBS: LocationHub[] = [
  {
    id: 'chennai-central',
    shortLabel: 'Central Chennai',
    fullName: 'Chennai, Tamil Nadu (Anna Salai / T. Nagar)',
    address: 'Anna Salai & Eldams Rd Signal, Teynampet, Chennai',
    neighborhood: 'Teynampet (Zone 9, Chennai)',
    lat: 13.0405,
    lng: 80.2503,
    zoom: 13,
    sampleComplaint:
      'Deep asphalt pothole with crumbled bitumen edges in the left MTC bus and two-wheeler lane on Anna Salai just before the Teynampet signal. Two-wheelers and buses are swerving suddenly to avoid the cavity.',
    duplicateComplaint:
      'Large pothole in the left bus lane on Anna Salai approaching Teynampet signal causing two-wheelers and buses to swerve around broken asphalt.',
  },
  {
    id: 'srm-chennai',
    shortLabel: 'SRM Chennai (KTR)',
    fullName: 'SRM Institute of Science & Technology, Kattankulathur, Chennai',
    address: 'SRM Arch Gate & GST Road (NH-32) Service Lane, Potheri, Kattankulathur',
    neighborhood: 'SRM Kattankulathur / Potheri',
    lat: 12.8230,
    lng: 80.0444,
    zoom: 15,
    sampleComplaint:
      'Deep pothole and broken storm-water drain slab along the GST Road service lane right outside SRM Arch Gate near Potheri railway station. Students and buses turning toward Tech Park are swerving sharply.',
    duplicateComplaint:
      'Crumbled asphalt pothole and damaged drain edge outside SRM Arch Gate on the GST Road service lane near Potheri station.',
  },
  {
    id: 'vit-vellore',
    shortLabel: 'VIT Vellore',
    fullName: 'Vellore Institute of Technology (VIT), Katpadi, Vellore',
    address: 'Tiruvalam Road (Outside VIT Main Gate), Katpadi, Vellore, TN',
    neighborhood: 'Katpadi / VIT Vellore',
    lat: 12.9692,
    lng: 79.1559,
    zoom: 15,
    sampleComplaint:
      'Three consecutive LED streetlights are completely dark and the asphalt shoulder is sunken along Tiruvalam Road outside VIT Vellore Main Gate in Katpadi, making evening pedestrian crossing hazardous.',
    duplicateComplaint:
      'Multiple dark streetlights and broken road edge on Tiruvalam Road outside VIT Vellore Main Gate in Katpadi.',
  },
  {
    id: 'iit-palakkad',
    shortLabel: 'IIT Palakkad',
    fullName: 'Indian Institute of Technology Palakkad (Nila Campus, Kanjikode, Kerala)',
    address: 'Nila Campus Approach Road, Kanjikode, IIT Palakkad, Kerala',
    neighborhood: 'Kanjikode / IIT Palakkad',
    lat: 10.8050,
    lng: 76.7263,
    zoom: 15,
    sampleComplaint:
      'Displaced concrete drain slabs and a deep eroded pothole on the Kanjikode–Nila Campus approach road at IIT Palakkad are blocking wheelchair and pedestrian walkway access.',
    duplicateComplaint:
      'Blocked walkway ramp and displaced concrete drain slab on the Nila Campus approach road at IIT Palakkad in Kanjikode.',
  },
];

export interface GeocodedPlace {
  displayName: string;
  neighborhood: string;
  lat: number;
  lng: number;
  zoom: number;
}

export async function searchPlaceByName(query: string): Promise<GeocodedPlace[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  // 1. Check instant built-in campus/city dictionary first for zero-latency demo reliability
  const localMatches: GeocodedPlace[] = [];
  for (const hub of QUICK_LOCATION_HUBS) {
    if (
      hub.shortLabel.toLowerCase().includes(q) ||
      hub.fullName.toLowerCase().includes(q) ||
      hub.address.toLowerCase().includes(q)
    ) {
      localMatches.push({
        displayName: hub.address,
        neighborhood: hub.neighborhood,
        lat: hub.lat,
        lng: hub.lng,
        zoom: hub.zoom,
      });
    }
  }

  // 2. Also query OpenStreetMap Nominatim for any location worldwide
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&q=${encodeURIComponent(
        query.trim()
      )}`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );
    if (res.ok) {
      const data = (await res.json()) as Array<{
        display_name: string;
        lat: string;
        lon: string;
        address?: Record<string, string>;
      }>;
      for (const item of data) {
        const lat = Number(parseFloat(item.lat).toFixed(5));
        const lng = Number(parseFloat(item.lon).toFixed(5));
        const addr = item.address || {};
        const neighborhood =
          addr.suburb ||
          addr.neighbourhood ||
          addr.city_district ||
          addr.town ||
          addr.city ||
          addr.county ||
          'Custom Selected Region';
        localMatches.push({
          displayName: item.display_name,
          neighborhood,
          lat,
          lng,
          zoom: 15,
        });
      }
    }
  } catch {
    // If offline, return localMatches
  }

  return localMatches.slice(0, 6);
}

export async function reverseGeocodeCoordinate(
  lat: number,
  lng: number
): Promise<{ address: string; neighborhood: string }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: { Accept: 'application/json' },
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        const addr = data.address || {};
        const neighborhood =
          addr.suburb ||
          addr.neighbourhood ||
          addr.city_district ||
          addr.town ||
          addr.city ||
          addr.county ||
          'Pinned Location';
        return {
          address: data.display_name.split(',').slice(0, 4).join(',').trim(),
          neighborhood,
        };
      }
    }
  } catch {
    // Fallback if offline
  }
  return {
    address: `Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
    neighborhood: 'Custom Map Coordinate',
  };
}
