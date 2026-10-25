import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { CivicReport, IssueSeverity } from '../types/civic';

interface CivicMapProps {
  reports: CivicReport[];
  selectedReportId: string | null;
  onSelectReport: (report: CivicReport) => void;
  pickerCoordinates?: { lat: number; lng: number } | null;
  onPickCoordinates?: (lat: number, lng: number) => void;
  focusCenter?: { lat: number; lng: number; zoom?: number } | null;
  heightClass?: string;
}

const SEVERITY_COLORS: Record<IssueSeverity, string> = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#eab308',
  Low: '#22c55e',
};

function getTicketCode(report: CivicReport): string {
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

function isValidCoord(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export const CivicMap: React.FC<CivicMapProps> = ({
  reports,
  selectedReportId,
  onSelectReport,
  pickerCoordinates,
  onPickCoordinates,
  focusCenter,
  heightClass = 'h-full',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenter: [number, number] =
      pickerCoordinates && isValidCoord(pickerCoordinates.lat, pickerCoordinates.lng)
        ? [pickerCoordinates.lat, pickerCoordinates.lng]
        : focusCenter && isValidCoord(focusCenter.lat, focusCenter.lng)
        ? [focusCenter.lat, focusCenter.lng]
        : [13.0405, 80.2503];

    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: focusCenter?.zoom || 13,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    mapRef.current = map;
    markersLayerRef.current = markersLayer;

    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {
        // Ignore if unmounted
      }
    }, 120);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      pickerMarkerRef.current = null;
    };
  }, []);

  // Attach map click handler when onPickCoordinates is provided
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (onPickCoordinates && isValidCoord(e.latlng.lat, e.latlng.lng)) {
        onPickCoordinates(
          Number(e.latlng.lat.toFixed(5)),
          Number(e.latlng.lng.toFixed(5))
        );
      }
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [onPickCoordinates]);

  // Render report markers with SmartRoad-style circular icon pins & clean structured popup
  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    reports.forEach((report) => {
      if (!isValidCoord(report.location?.lat, report.location?.lng)) return;

      const isSelected = report.id === selectedReportId;
      const color = SEVERITY_COLORS[report.severity] || '#f97316';
      const size = isSelected ? 38 : 30;
      const ticketCode = getTicketCode(report);
      const formattedDate = new Date(report.created_at).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      const innerGlyph = `<svg width="${isSelected ? 16 : 13}" height="${
        isSelected ? 16 : 13
      }" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/></svg>`;

      const icon = L.divIcon({
        className: '',
        html: `<div class="civic-marker-pin" style="width:${size}px;height:${size}px;background:${color};${
          isSelected
            ? 'box-shadow:0 0 0 6px rgba(249,115,22,0.32), 0 8px 20px rgba(15,23,42,0.45);transform:scale(1.1);'
            : ''
        }">
          ${innerGlyph}
        </div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker([report.location.lat, report.location.lng], {
        icon,
        title: `${ticketCode} — ${report.title}`,
      });

      marker.on('click', () => {
        onSelectReport(report);
      });

      const sevBg =
        report.severity === 'Critical' || report.severity === 'High'
          ? '#ef4444'
          : report.severity === 'Medium'
          ? '#f59e0b'
          : '#10b981';

      marker.bindPopup(
        `<div style="min-width:255px;padding:6px 4px;font-family:Inter,system-ui,sans-serif;">
          <div style="font-weight:800;font-size:14px;margin-bottom:6px;letter-spacing:-0.01em;">
            ${ticketCode}
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">
            <span style="background:${sevBg};color:#ffffff;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;">
              ● ${report.severity}
            </span>
            <span style="background:rgba(16,185,129,0.18);color:#10b981;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;">
              ${report.status}
            </span>
            <span style="background:rgba(100,116,139,0.16);color:#64748b;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;">
              ${report.is_sample_data ? 'SAMPLE' : 'LIVE'}
            </span>
          </div>
          <div style="display:grid;grid-template-columns:95px 1fr;row-gap:6px;column-gap:8px;font-size:11px;border-top:1px solid rgba(148,163,184,0.2);padding-top:8px;">
            <span style="color:#64748b;">Ticket Raised On</span>
            <span style="font-weight:600;text-align:right;">${formattedDate}</span>
            <span style="color:#64748b;">Incident Type</span>
            <span style="font-weight:600;text-align:right;">${report.category}</span>
            <span style="color:#64748b;">Address</span>
            <span style="font-weight:600;text-align:right;line-height:1.25;">${report.location.address}</span>
            <span style="color:#64748b;">Coordinates</span>
            <span style="font-weight:600;text-align:right;font-family:monospace;">${report.location.lat.toFixed(4)}, ${report.location.lng.toFixed(4)}</span>
          </div>
        </div>`,
        { closeButton: false, offset: [0, -10] }
      );

      marker.addTo(layer);

      if (isSelected) {
        try {
          marker.openPopup();
        } catch {
          // Ignore if hidden
        }
      }
    });
  }, [reports, selectedReportId, onSelectReport]);

  // Safely move map when selectedReportId changes
  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (!map || !container || !selectedReportId) return;
    if (container.clientWidth === 0 || container.clientHeight === 0) return;

    const found = reports.find((r) => r.id === selectedReportId);
    if (found && isValidCoord(found.location.lat, found.location.lng)) {
      try {
        map.invalidateSize();
        map.setView([found.location.lat, found.location.lng], Math.max(map.getZoom(), 14), {
          animate: true,
        });
      } catch {
        // Ignore
      }
    }
  }, [selectedReportId]);

  // Safely move map when focusCenter changes
  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (!map || !container || !focusCenter) return;
    if (!isValidCoord(focusCenter.lat, focusCenter.lng)) return;
    if (container.clientWidth === 0 || container.clientHeight === 0) return;

    try {
      map.invalidateSize();
      map.setView([focusCenter.lat, focusCenter.lng], focusCenter.zoom || 14, {
        animate: true,
      });
    } catch {
      // Ignore
    }
  }, [focusCenter?.lat, focusCenter?.lng, focusCenter?.zoom]);

  // Render picker marker when choosing coordinates in form
  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (!map) return;

    if (!pickerCoordinates || !isValidCoord(pickerCoordinates.lat, pickerCoordinates.lng)) {
      if (pickerMarkerRef.current) {
        pickerMarkerRef.current.remove();
        pickerMarkerRef.current = null;
      }
      return;
    }

    const pinIcon = L.divIcon({
      className: '',
      html: `<div style="width:32px;height:32px;border-radius:9999px;background:#0f172a;border:3px solid #ffffff;box-shadow:0 0 0 5px rgba(14,165,233,0.45),0 6px 16px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:#ffffff;font-weight:900;font-size:15px;">+</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });

    if (!pickerMarkerRef.current) {
      pickerMarkerRef.current = L.marker(
        [pickerCoordinates.lat, pickerCoordinates.lng],
        { icon: pinIcon }
      ).addTo(map);
    } else {
      pickerMarkerRef.current.setLatLng([
        pickerCoordinates.lat,
        pickerCoordinates.lng,
      ]);
    }

    if (container && container.clientWidth > 0 && container.clientHeight > 0) {
      try {
        map.invalidateSize();
        map.setView([pickerCoordinates.lat, pickerCoordinates.lng], map.getZoom(), {
          animate: true,
        });
      } catch {
        // Ignore
      }
    }
  }, [pickerCoordinates?.lat, pickerCoordinates?.lng]);

  return (
    <div className={`relative w-full overflow-hidden ${heightClass}`}>
      <div ref={containerRef} className="h-full w-full z-0" />
    </div>
  );
};
