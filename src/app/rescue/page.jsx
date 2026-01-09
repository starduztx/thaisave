"use client";
// File: src/app/rescue/page.js
// หน้าที่: Dashboard กู้ภัย (ปรับ Logic ปุ่ม Action ใหม่ + Location Permission)

import { useState, useEffect } from 'react';
import { db } from '../../lib/db';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import Link from 'next/link';
import { MapPin, CheckCircle, Image as ImageIcon, X, Truck, Menu, ClipboardList, Loader2 } from 'lucide-react';
import Navbar from '../../components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

// --- UTILITY: แยกข้อความ Description (เอาไว้โชว์แค่ข้อความหลัก) ---
const parseReportData = (fullDescription) => {
  if (!fullDescription) return { cleanDesc: "" };
  // ตัดส่วนที่เป็น Chat log ออก เพื่อแสดงแค่รายละเอียดตั้งต้น
  const cleanDesc = fullDescription.split('\n\n💬')[0];
  return { cleanDesc };
};

// --- SUB-COMPONENT: ปุ่มจัดการสถานะ (ปรับ Logic ตามโจทย์ + Gatekeeping) ---
function StatusActionButton({ report, user, isLocationEnabled, onRequestLocation }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAcceptCase = async () => {
    if (!user) { alert("รอโหลดข้อมูลผู้ใช้..."); return; }

    if (!confirm("ยืนยันที่จะ 'รับเคสนี้' ?")) return;

    // Gatekeeping logic for accepting cases
    const isAdmin = user && user.role === 'center';
    if (!isLocationEnabled && !isAdmin) {
      // Trigger the location request modal again
      onRequestLocation();
      return;
    }

    setLoading(true);
    try {
      const reportRef = doc(db, "reports", report.id);
      const rescuerName = user.name || user.displayName || user.email || 'จนท.กู้ภัย';

      await updateDoc(reportRef, {
        status: 'accepted',
        responderId: user.uid,
        responderName: rescuerName,
        acceptedAt: new Date(),
        lastUpdated: serverTimestamp()
      });
      // รับงานเสร็จ ไม่ต้องทำอะไร UI จะเปลี่ยนเป็นปุ่มจัดการเคสเอง
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 1. เคสใหม่ -> ปุ่มรับงาน (กดแล้วอัปเดต DB ทันที)
  if (report.status === 'pending' || report.status === 'investigating') {
    return (
      <button
        onClick={handleAcceptCase}
        disabled={loading}
        className="w-full h-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white py-2.5 rounded-lg font-medium shadow-sm transition-colors text-sm flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
        รับเคสนี้
      </button>
    );
  }

  // 2. รับงานแล้ว หรือ กำลังเดินทาง -> ปุ่มไปหน้าจัดการ (Link ไปหน้า Detail)
  if (report.status === 'accepted' || report.status === 'traveling') {
    return (
      <Link
        href={`/rescue/status?id=${report.id}`}
        // ✅ เพิ่ม class 'relative' เพื่อให้เป็นจุดอ้างอิงของ Badge
        className="relative w-full h-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium shadow-sm transition-colors text-sm flex items-center justify-center gap-2"
      >
        {/* 🔔 ส่วนแจ้งเตือน: แสดงเมื่อมีข้อความที่ยังไม่อ่าน */}
        {report.unreadForRescuer > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full border-2 border-white shadow-md z-10 animate-bounce">
            {report.unreadForRescuer}
          </span>
        )}

        <ClipboardList size={18} />
        จัดการเคส
      </Link>
    );
  }

  // 3. เสร็จสิ้น -> ปุ่มสถานะจบ (กดไม่ได้)
  if (report.status === 'completed') {
    return (
      <button disabled className="w-full h-full bg-gray-100 text-gray-400 py-2.5 rounded-lg font-medium border border-gray-200 cursor-not-allowed text-sm flex items-center justify-center gap-2">
        <CheckCircle size={18} /> เสร็จสิ้น
      </button>
    );
  }
  return null;
}

// --- SUB-COMPONENT: Location Permission Modal (From Old Code) ---
function LocationPermissionModal({ onEnable, onSkip }) {
  const [loading, setLoading] = useState(false);

  const handleEnable = async () => {
    setLoading(true);
    if (!navigator.geolocation) {
      alert("บราวเซอร์ของคุณไม่รองรับการระบุตำแหน่ง");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLoading(false);
        onEnable(position);
      },
      (error) => {
        setLoading(false);
        console.error("Location error:", error);
        alert("ไม่สามารถระบุตำแหน่งได้: " + error.message);
      }
    );
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        <div className="mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[#B91C1C]"
          >
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" fill="#B91C1C" stroke="none" />
            <circle cx="12" cy="10" r="2" fill="white" stroke="none" />
          </svg>
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-4">ระบุตำแหน่งของคุณ</h3>
        <p className="text-gray-600 mb-8 leading-relaxed">
          ให้เปิดตำแหน่งของคุณ<br />ขณะใช้งานหรือไม่?
        </p>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={handleEnable}
            disabled={loading}
            className="w-full bg-[#34A853] hover:bg-[#2d9249] text-white font-bold py-3.5 rounded-full shadow-sm transition-transform active:scale-95 disabled:opacity-70 disabled:active:scale-100 flex justify-center items-center gap-2"
          >
            {loading && <Loader2 className="animate-spin" size={20} />}
            เปิดตำแหน่ง
          </button>

          <button
            onClick={onSkip}
            className="w-full bg-white hover:bg-gray-50 text-gray-800 font-medium py-3.5 rounded-full border border-gray-300 transition-colors active:bg-gray-100"
          >
            ข้ามขั้นตอนนี้
          </button>
        </div>
      </div>
    </div>
  );
}

// --- MAIN PAGE ---
export default function RescueDashboard() {
  const [viewingImage, setViewingImage] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout, loading: authLoading } = useAuth();
  const router = useRouter();

  // Location States (Merged)
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  // Initial Location Check logic
  useEffect(() => {
    if (!user || user.role === 'center') return; // Skip for admins or if no user yet

    // Show modal once data is loaded and we are on the page
    const timer = setTimeout(() => {
      setShowLocationModal(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, [user]);

  const handleLocationEnable = (position) => {
    setIsLocationEnabled(true);
    setUserLocation(position);
    setShowLocationModal(false);
  };

  const handleLocationSkip = () => {
    setIsLocationEnabled(false);
    setShowLocationModal(false);
  };

  // Guard: Protect Rescue Page
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      if (user.role === 'pending') router.push('/pending-approval');
      if (user.role === 'victim') router.push('/login');
    } else {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleLogout = async () => { try { await logout(); window.location.href = '/login'; } catch (error) { console.error("Logout failed", error); } };

  const [stats, setStats] = useState({ new: 0, accepted: 0, completed: 0, total: 0 });

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "reports"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate() }));
      setReports(items);
      setStats({
        new: items.filter(i => i.status === 'pending' || i.status === 'investigating').length,
        accepted: items.filter(i => i.status === 'accepted' || i.status === 'traveling').length,
        completed: items.filter(i => i.status === 'completed').length,
        total: items.length
      });
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const timeAgo = (date) => {
    if (!date) return "";
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return "เมื่อสักครู่";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
    return date.toLocaleDateString('th-TH');
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] font-sans">
      <Navbar activePage="rescue" />

      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Dashboard Case กู้ภัย</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> Real-time
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="รอรับเคส" value={stats.new} color="text-red-600" borderColor="border-red-500" />
          <StatCard label="กำลังทำ" value={stats.accepted} color="text-blue-600" borderColor="border-blue-500" />
          <StatCard label="เสร็จสิ้น" value={stats.completed} color="text-green-600" borderColor="border-green-500" />
          <StatCard label="ทั้งหมด" value={stats.total} color="text-gray-600" borderColor="border-gray-300" />
        </div>

        <div className="space-y-4">
          {loading ? <div className="text-center py-20"><Loader2 className="animate-spin mx-auto text-blue-600" /></div> :
            reports.length === 0 ? <div className="text-center py-20 text-gray-500">ไม่มีรายการแจ้งเหตุ</div> : (
              reports.map((item) => {
                const { cleanDesc } = parseReportData(item.description);
                return (
                  <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all">
                    <div className="p-6">
                      {/* HEADER */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {item.status === 'pending' && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">วิกฤต/รอการช่วยเหลือ</span>}
                          {item.status === 'investigating' && <span className="bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">กำลังตรวจสอบ</span>}
                          {item.status === 'accepted' && <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">รับเคสแล้ว</span>}
                          {item.status === 'traveling' && <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase animate-pulse">กำลังเดินทาง</span>}
                          {item.status === 'completed' && <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">เสร็จสิ้น</span>}
                          <span className="text-gray-500 text-xs">{item.province || item.location || 'ไม่ระบุพิกัด'}</span>
                        </div>
                        <span className="text-gray-400 text-xs">{timeAgo(item.timestamp)}</span>
                      </div>

                      {/* BODY */}
                      <div className="mb-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{item.disasterType}</h3>
                        <div className="text-xs text-gray-500 mb-2">
                          ผู้แจ้ง: {item.contactName || '-'} ({item.contactPhone || '-'})
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm text-gray-700 italic">
                          "{cleanDesc || item.description}"
                        </div>
                      </div>

                      {/* FOOTER ACTIONS - ปรับลดเหลือ 3 ปุ่มหลัก */}
                      <div className="flex flex-col md:flex-row gap-3 pt-4 border-t border-gray-100">
                        {/* 1. ปุ่มดูรูป */}
                        {item.imageUrl ? (
                          <button onClick={() => setViewingImage(item.imageUrl)} className="flex-1 flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300 py-2.5 rounded-lg font-medium transition-colors shadow-sm text-sm">
                            <ImageIcon size={18} /> ดูหลักฐาน
                          </button>
                        ) : (
                          <button disabled className="flex-1 flex items-center justify-center gap-2 bg-gray-50 text-gray-400 border border-gray-200 py-2.5 rounded-lg font-medium text-sm cursor-not-allowed">
                            <ImageIcon size={18} /> ไม่มีภาพ
                          </button>
                        )}

                        {/* 2. ปุ่มดูแผนที่ */}
                        <a href={`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`} target="_blank" rel="noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-700 text-white py-2.5 rounded-lg font-medium transition-colors shadow-sm text-sm">
                          <MapPin size={18} /> ดูแผนที่
                        </a>

                        {/* 3. ปุ่ม Action หลัก (เปลี่ยนตามสถานะ) */}
                        <div className="flex-1 h-full">
                          <StatusActionButton
                            report={item}
                            user={user}
                            isLocationEnabled={isLocationEnabled}
                            onRequestLocation={() => setShowLocationModal(true)}
                          />
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })
            )}
        </div>
      </div>

      {viewingImage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4" onClick={() => setViewingImage(null)}>
          <button className="absolute top-4 right-4 text-white bg-white/10 p-2 rounded-full"><X size={24} /></button>
          <img src={viewingImage} alt="Evidence" className="max-w-full max-h-[90vh] object-contain rounded" />
        </div>
      )}

      {/* Location Modal (Rendered here) */}
      {showLocationModal && (
        <LocationPermissionModal
          onEnable={handleLocationEnable}
          onSkip={handleLocationSkip}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color, borderColor }) {
  return (
    <div className={`bg-white p-4 rounded-xl shadow-sm border-b-4 ${borderColor} text-center`}>
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <h3 className={`text-2xl font-bold ${color}`}>{value}</h3>
    </div>
  );
}