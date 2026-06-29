import {
  MapContainer,
  TileLayer,
  ZoomControl,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import LocationMarker from "./LocationMarker";

export default function MapView({ location }) {
  return (
    <MapContainer
      center={[12.9716, 77.5946]}
      zoom={13}
      zoomControl={false}
      className="h-full w-full z-0"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* User Location */}
      <LocationMarker location={location} />

      {/* Move zoom controls away from header */}
      <ZoomControl position="bottomright" />
    </MapContainer>
  );
}