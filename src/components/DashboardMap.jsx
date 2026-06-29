import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";

import { useEffect } from "react";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

const statusMarkerColors = {
  pending: "#ca8a04",
  assigned: "#2563eb",
  resolved: "#16a34a",
  archived: "#4b5563",
};

function createStatusIcon(status, selected) {
  const color =
    statusMarkerColors[status] || "#2563eb";

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width: ${selected ? 24 : 18}px;
        height: ${selected ? 24 : 18}px;
        background: ${color};
        border: 3px solid white;
        border-radius: 9999px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.35);
      "></div>
    `,
    iconSize: [selected ? 24 : 18, selected ? 24 : 18],
    iconAnchor: [selected ? 12 : 9, selected ? 12 : 9],
  });
}

function getCoordinates(report) {
  if (!report || !report.location) return null;
  const lat = report.location.latitude ?? report.location.lat;
  const lng = report.location.longitude ?? report.location.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return null;
  return [lat, lng];
}

function FlyToReport({ report }) {
  const map = useMap();

  useEffect(() => {
    const coords = getCoordinates(report);
    if (!coords) return;

    map.flyTo(
      coords,
      17,
      {
        duration: 1.5,
      }
    );
  }, [report, map]);

  return null;
}

export default function DashboardMap({
  reports,
  selectedReport,
  onSelectReport,
}) {
  return (
    <div className="ds-card ds-shadow-card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", height: "600px" }}>
      
      {/* Map Header */}
      <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--color-divider)", flexShrink: 0 }}>
        <h2 className="ds-section-header" style={{ margin: "0 0 4px 0" }}>Live Incident Map</h2>
        <p className="ds-label ds-secondary" style={{ margin: 0 }}>Real-time incident locations</p>
      </div>

      <div style={{ flex: 1, position: "relative" }}>
        <MapContainer
          center={[12.9716, 77.5946]}
          zoom={11}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution="© OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FlyToReport report={selectedReport} />

          {reports.map((report) => {
            const coords = getCoordinates(report);
            if (!coords) return null;

            const selected = selectedReport?.id === report.id;

            return (
              <Marker
                key={report.id}
                icon={createStatusIcon(report.status, selected)}
                position={coords}
                eventHandlers={{
                  click: () => onSelectReport?.(report),
                }}
              >
                <Popup>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "bold", margin: 0 }}>{report.category}</h3>
                    <p style={{ margin: 0, fontSize: "14px", color: "var(--color-text-secondary)" }}>{report.description}</p>
                    <hr style={{ border: "none", borderTop: "1px solid var(--color-divider)", margin: "4px 0" }} />
                    <p style={{ margin: 0, fontSize: "12px" }}><strong>Status:</strong> {report.status}</p>
                    <p style={{ margin: 0, fontSize: "12px" }}><strong>Latitude:</strong> {coords[0].toFixed(5)}</p>
                    <p style={{ margin: 0, fontSize: "12px" }}><strong>Longitude:</strong> {coords[1].toFixed(5)}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
