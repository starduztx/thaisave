"use client";
// File: src/components/map/MapContainer.jsx
// อัปเดต: เปลี่ยนจากหมุดสี เป็นหมุดไอคอน (DivIcon + Lucide) ตามประเภทภัยพิบัติ

import { useState, useEffect } from 'react';
import { MapContainer as LeafletMap, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// 1. Import ไอคอนจาก Lucide React
import { Droplets, Flame, Car, Mountain, AlertTriangle, MapPin as MapPinIcon } from 'lucide-react';
// 2. Import renderToStaticMarkup เพื่อแปลง React Icon เป็น HTML string สำหรับ Leaflet
import { renderToStaticMarkup } from 'react-dom/server';


// --- ฟังก์ชันสร้าง Custom DivIcon จาก Lucide Icon ---
// ฟังก์ชันนี้จะสร้างหมุดวงกลมสีพื้นหลัง และมีไอคอนสีขาวอยู่ตรงกลาง
const createLucideMarker = (IconComponent, bgColor) => {
    const iconHtml = renderToStaticMarkup(
        <div style={{
            backgroundColor: bgColor,
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}>
            <IconComponent color="white" size={20} />
        </div>
    );

    return L.divIcon({
        html: iconHtml,
        className: 'custom-leaflet-icon', // ต้องมี class หลอกๆ ไว้
        iconSize: [36, 36],     // ขนาดของ div ที่สร้าง
        iconAnchor: [18, 36],   // จุดปักหมุด (กลางแนวนอน, ล่างสุดแนวตั้ง)
        popupAnchor: [0, -36],  // จุดที่ popup เด้งขึ้นมา (เหนือหมุด)
    });
};


// --- เตรียมไอคอนต่างๆ ไว้ล่วงหน้า ---
const icons = {
    flood: createLucideMarker(Droplets, '#3B82F6'),   // น้ำท่วม (สีฟ้า)
    fire: createLucideMarker(Flame, '#EF4444'),       // ไฟไหม้ (สีแดง)
    accident: createLucideMarker(Car, '#F59E0B'),     // อุบัติเหตุ (สีส้ม)
    landslide: createLucideMarker(Mountain, '#78350F'),// ดินถล่ม (สีน้ำตาลเข้ม)
    general: createLucideMarker(AlertTriangle, '#6B7280'), // ทั่วไป (สีเทา)
    userPin: createLucideMarker(MapPinIcon, '#10B981'), // หมุดที่ผู้ใช้จิ้มเอง (สีเขียว)
};


// --- ฟังก์ชันเลือกไอคอนตามประเภทภัย (ใช้ .includes เพื่อความยืดหยุ่น) ---
const getIconByType = (type) => {
  if (!type) return icons.general;
  const lowerType = type.toLowerCase();

  if (lowerType.includes('น้ำท่วม') || lowerType.includes('flood')) return icons.flood;
  if (lowerType.includes('ไฟไหม้') || lowerType.includes('อัคคีภัย') || lowerType.includes('fire')) return icons.fire;
  if (lowerType.includes('อุบัติเหตุ') || lowerType.includes('รถชน') || lowerType.includes('accident')) return icons.accident;
  if (lowerType.includes('ดินถล่ม') || lowerType.includes('landslide')) return icons.landslide;
  
  return icons.general; // ถ้าไม่ตรงเงื่อนไขไหนเลย
};


// --- Helper Components (เหมือนเดิม) ---
function RecenterAutomatically({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) map.flyTo([lat, lng], 16, { animate: true });
  }, [lat, lng, map]);
  return null;
}

function LocationMarker({ onLocationSelect }) {
  const [position, setPosition] = useState(null);
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      if (onLocationSelect) onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  // หมุดที่จิ้มเองตอนแจ้งเหตุ ให้ใช้ไอคอน userPin (สีเขียว)
  return position === null ? null : <Marker position={position} icon={icons.userPin}></Marker>;
}


// --- Main Component ---
export default function MapContainer({
  reports = [],
  selectedLat,
  selectedLng,
  onLocationSelect,
  className = "w-full h-full"
}) {
  // **สำคัญ:** ถ้าใช้ DivIcon บางครั้ง Leaflet ต้องการ CSS global นิดหน่อยเพื่อให้แสดงผลถูก
  // เราใส่ style tag เล็กๆ ไว้ตรงนี้ได้เลย
  useEffect(() => {
      const style = document.createElement('style');
      style.innerHTML = `.custom-leaflet-icon { background: transparent; border: none; }`;
      document.head.appendChild(style);
      return () => { document.head.removeChild(style); }
  }, []);


  const defaultCenter = [13.7649, 100.5383];
  const center = (selectedLat && selectedLng) ? [selectedLat, selectedLng] : defaultCenter;

  return (
    <div className={`rounded-xl overflow-hidden shadow-sm border border-gray-200 relative z-0 ${className}`}>
      <LeafletMap key={`${center[0]}-${center[1]}`} center={center} zoom={6} style={{ width: "100%", height: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* --- โหมด Dashboard (แสดงหลายจุด + แยกไอคอน) --- */}
        {reports.map((report) => (
          (report.latitude && report.longitude) && (
            <Marker 
              key={report.id} 
              position={[report.latitude, report.longitude]} 
              // เรียกใช้ฟังก์ชันเลือกไอคอนตรงนี้
              icon={getIconByType(report.disasterType)}
            >
              <Popup>
                <div className="text-sm min-w-[150px]">
                  {/* แสดงไอคอนเล็กๆ ใน Popup ด้วยก็ได้ */}
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      {report.disasterType}
                  </h3>
                  <p className="text-xs text-gray-500 mb-1">{report.location}</p>
                  <p className="mb-2 italic">"{report.description}"</p>
                  <span className={`px-2 py-0.5 rounded text-[10px] text-white ${
                    ['completed','approved','accepted'].includes(report.status) ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    {report.status}
                  </span>
                </div>
              </Popup>
            </Marker>
          )
        ))}

        {/* --- โหมดแจ้งเหตุ (จิ้มปักหมุด) --- */}
        {onLocationSelect && (
          <>
            <RecenterAutomatically lat={selectedLat} lng={selectedLng} />
            <LocationMarker onLocationSelect={onLocationSelect} />
            {selectedLat && selectedLng && (
              // หมุดที่แสดงจากพิกัดที่ส่งมา ใช้ userPin สีเขียว
              <Marker position={[selectedLat, selectedLng]} icon={icons.userPin} />
            )}
             <div className="absolute bottom-4 left-4 bg-white/90 px-3 py-1 rounded-md text-xs shadow text-gray-600 z-[1000]">
                แตะเพื่อระบุพิกัด
             </div>
          </>
        )}
      </LeafletMap>
    </div>
  );
}