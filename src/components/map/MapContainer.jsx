"use client";
// File: src/components/map/MapContainer.jsx
// หน้าที่: แสดงแผนที่ OpenStreetMap (Leaflet) ของจริง
// สถานะ: เวอร์ชันใช้งานจริง (Real Map) 
// ⚠️ หมายเหตุ: หากดูใน Canvas Preview อาจจะ Error เพราะขาด Library แต่ในเครื่องคุณจะทำงานได้ปกติครับ

import { useState, useEffect } from 'react';
// Import ไลบรารีแผนที่ของจริง
import { MapContainer as LeafletMap, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- แก้ไขปัญหา Icon หมุดไม่ขึ้นใน Next.js (Standard Fix) ---
// ต้องกำหนด path ของรูปหมุดใหม่เพราะ webpack บางทีหาไม่เจอ
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// --- Helper: เลื่อนมุมกล้องตามพิกัดอัตโนมัติ ---
function RecenterAutomatically({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.flyTo([lat, lng], 16, { animate: true }); // Zoom level 16
    }
  }, [lat, lng, map]);
  return null;
}

// --- Helper: ดักจับการคลิกเพื่อปักหมุด ---
function LocationMarker({ onLocationSelect }) {
  const [position, setPosition] = useState(null);

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      // ส่งค่าพิกัดกลับไปให้ Parent Component
      if (onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  return position === null ? null : (
    <Marker position={position} icon={icon}></Marker>
  );
}

// --- Main Component ---
export default function MapContainer({
  selectedLat,
  selectedLng,
  onLocationSelect,
  className = "w-full h-full"
}) {
  // พิกัดเริ่มต้น (อนุสาวรีย์ชัยฯ - กลางกรุงเทพ)
  const defaultCenter = [13.7649, 100.5383];
  const center = (selectedLat && selectedLng) ? [selectedLat, selectedLng] : defaultCenter;

  return (
    <div className={`rounded-xl overflow-hidden shadow-sm border border-gray-200 relative z-0 ${className}`}>
      <LeafletMap
        center={center}
        zoom={13}
        style={{ width: "100%", height: "100%" }}
      >
        {/* Layer แผนที่จาก OpenStreetMap */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Components เสริมการทำงาน (เลื่อนกล้อง, ดักคลิก) */}
        <RecenterAutomatically lat={selectedLat} lng={selectedLng} />
        <LocationMarker onLocationSelect={onLocationSelect} />

        {/* แสดงหมุดถ้ามีค่าส่งเข้ามา (เช่น จาก GPS หรือจากการคลิกก่อนหน้า) */}
        {selectedLat && selectedLng && (
          <Marker position={[selectedLat, selectedLng]} icon={icon} />
        )}
      </LeafletMap>

      {/* คำแนะนำ */}
      <div className="absolute bottom-4 left-4 bg-white/90 px-3 py-1 rounded-md text-xs shadow text-gray-600 z-[1000]">
        แตะบนแผนที่เพื่อปักหมุด
      </div>
    </div>
  );
}