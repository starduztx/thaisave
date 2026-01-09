"use client";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Ambulance, Home, Clock, MapPin } from 'lucide-react';

// --- สร้างไอคอน (เหมือนเดิม) ---
const createIcon = (IconComponent, color) => {
    const iconHtml = renderToStaticMarkup(
        <div style={{
            backgroundColor: color,
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '3px solid white',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
        }}>
            <IconComponent color="white" size={24} />
        </div>
    );

    return L.divIcon({
        html: iconHtml,
        className: 'custom-tracking-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -40],
    });
};

const ambulanceIcon = createIcon(Ambulance, '#EF4444');
const homeIcon = createIcon(Home, '#10B981');

// --- Component ช่วยปรับมุมกล้อง ---
function FitBounds({ victimPos, rescuerPos }) {
    const map = useMap();
    useEffect(() => {
        if (victimPos && rescuerPos) {
            try {
                const bounds = L.latLngBounds([victimPos, rescuerPos]);
                map.fitBounds(bounds, { padding: [80, 80] }); // เพิ่ม padding ให้เส้นไม่ชิดขอบ
            } catch (e) {
                console.error("Map bounds error:", e);
            }
        }
    }, [victimPos, rescuerPos, map]);
    return null;
}

export default function LiveTrackingMap({ victimLat, victimLng, rescuerLat, rescuerLng }) {
    const vLat = Number(victimLat) || 13.7563;
    const vLng = Number(victimLng) || 100.5018;
    const rLat = rescuerLat ? Number(rescuerLat) : null;
    const rLng = rescuerLng ? Number(rescuerLng) : null;

    // State สำหรับเก็บข้อมูลเส้นทาง
    const [routeData, setRouteData] = useState(null);

    // ฟังก์ชันดึงข้อมูลเส้นทางจาก OSRM (API ฟรี)
    useEffect(() => {
        if (vLat && vLng && rLat && rLng) {
            // OSRM ใช้ format: longitude,latitude
            const url = `https://router.project-osrm.org/route/v1/driving/${rLng},${rLat};${vLng},${vLat}?overview=full&geometries=geojson`;

            fetch(url)
                .then(res => res.json())
                .then(data => {
                    if (data.routes && data.routes.length > 0) {
                        const route = data.routes[0];
                        setRouteData({
                            distance: (route.distance / 1000).toFixed(1), // กิโลเมตร
                            duration: (route.duration / 60).toFixed(0),   // นาที
                            // สลับ lat/lng เพราะ GeoJSON เป็น [lng, lat] แต่ Leaflet ใช้ [lat, lng]
                            geometry: route.geometry.coordinates.map(coord => [coord[1], coord[0]])
                        });
                    }
                })
                .catch(err => console.error("Error fetching route:", err));
        }
    }, [vLat, vLng, rLat, rLng]);

    return (
        <div className="w-full h-[300px] rounded-xl overflow-hidden border border-gray-200 shadow-sm relative z-0">
             <style jsx global>{`
                .custom-tracking-icon { background: transparent; border: none; }
            `}</style>
            
            {/* ✅ กล่องแสดงระยะทางและเวลา (Overlay บนแผนที่) */}
            {routeData && (
                <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-[500] bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-gray-200 flex items-center gap-4 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-1.5 text-gray-700">
                        <MapPin size={16} className="text-blue-600" />
                        <span className="text-sm font-bold">{routeData.distance} กม.</span>
                    </div>
                    <div className="w-px h-4 bg-gray-300"></div>
                    <div className="flex items-center gap-1.5 text-gray-700">
                        <Clock size={16} className="text-orange-500" />
                        <span className="text-sm font-bold">{routeData.duration} นาที</span>
                    </div>
                </div>
            )}

            <MapContainer center={[vLat, vLng]} zoom={13} style={{ width: '100%', height: '100%' }}>
                <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <Marker position={[vLat, vLng]} icon={homeIcon}>
                    <Popup>จุดเกิดเหตุ (คุณ)</Popup>
                </Marker>

                {rLat && rLng && (
                    <>
                        <Marker position={[rLat, rLng]} icon={ambulanceIcon}>
                            <Popup>รถกู้ภัย</Popup>
                        </Marker>
                        
                        {/* ✅ วาดเส้นทางสีน้ำเงินตามถนน */}
                        {routeData && routeData.geometry && (
                            <Polyline 
                                positions={routeData.geometry} 
                                pathOptions={{ color: '#3B82F6', weight: 5, opacity: 0.7, lineCap: 'round' }} 
                            />
                        )}

                        <FitBounds victimPos={[vLat, vLng]} rescuerPos={[rLat, rLng]} />
                    </>
                )}
            </MapContainer>
        </div>
    );
}