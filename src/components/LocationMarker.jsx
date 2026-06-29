import { Marker, Popup, useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";

const blueIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function LocationMarker({ location }) {
  const map = useMap();

  useEffect(() => {
    if (location) {
      map.flyTo(
        [location.latitude, location.longitude],
        17,
        {
          duration: 1.5,
        }
      );
    }
  }, [location, map]);

  if (!location) return null;

  return (
    <Marker
      position={[
        location.latitude,
        location.longitude,
      ]}
      icon={blueIcon}
    >
      <Popup>
        📍 Your Current Location
      </Popup>
    </Marker>
  );
}