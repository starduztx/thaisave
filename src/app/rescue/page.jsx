"use client";
// File: src/app/rescue/page.js
// หน้าที่: Dashboard กู้ภัย (อัปเดต: แจ้งเตือนเคสใหม่ + ป้องกันแย่งงาน)

import { useState, useEffect, useRef } from 'react'; // ✅ เพิ่ม useRef
import { db } from '../../lib/db';
import { collection, query, orderBy, onSnapshot, doc, serverTimestamp, runTransaction } from "firebase/firestore"; // ✅ เพิ่ม runTransaction
import Link from 'next/link';
import { MapPin, CheckCircle, Image as ImageIcon, X, Truck, ClipboardList, Loader2, Bell, Lock } from 'lucide-react'; // ✅ เพิ่ม Icon
import Navbar from '../../components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

// --- UTILITY: แยกข้อความ Description ---
const parseReportData = (fullDescription) => {
  if (!fullDescription) return { cleanDesc: "" };
  const cleanDesc = fullDescription.split('\n\n💬')[0];
  return { cleanDesc };
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
};

// --- SUB-COMPONENT: ปุ่มจัดการสถานะ (✅ อัปเดต: Transaction & Lock) ---
function StatusActionButton({ report, user, isLocationEnabled, onRequestLocation }) {
  const [loading, setLoading] = useState(false);

  const handleAcceptCase = async () => {
    if (!user) { alert("รอโหลดข้อมูลผู้ใช้..."); return; }
    if (!confirm("ยืนยันที่จะ 'รับเคสนี้' ?")) return;

    const isAdmin = user && user.role === 'center';
    if (!isLocationEnabled && !isAdmin) {
      onRequestLocation();
      return;
    }

    setLoading(true);
    try {
      const reportRef = doc(db, "reports", report.id);
      const rescuerName = user.name || user.displayName || user.email || 'จนท.กู้ภัย';

      // ✅ ใช้ Transaction ป้องกัน Race Condition (แย่งกันกด)
      await runTransaction(db, async (transaction) => {
        const sfDoc = await transaction.get(reportRef);
        if (!sfDoc.exists()) throw "ไม่พบข้อมูลเคสนี้";

        const data = sfDoc.data();
        // เช็คว่าสถานะเปลี่ยนไปหรือยัง (โดนคนอื่นรับไปแล้ว?)
        if (data.status !== 'pending' && data.status !== 'investigating') {
          throw "⚠️ เคสนี้ถูกรับงานไปแล้วโดยทีมอื่น!";
        }

        // ถ้ายังว่างอยู่ ให้ทำการอัปเดต
        transaction.update(reportRef, {
          status: 'accepted',
          responderId: user.uid,
          responderName: rescuerName,
          acceptedAt: new Date(),
          lastUpdated: serverTimestamp()
        });
      });

    } catch (error) {
      // ถ้าแย่งกดไม่ทัน ให้แจ้งเตือนผู้ใช้
      alert(error.message || error);
    } finally {
      setLoading(false);
    }
  };

  // 1. เช็คก่อนเลยว่า "โดนคนอื่นรับไปแล้วหรือยัง" (ไม่ใช่เรา และ สถานะไม่ใช่ของใหม่)
  const isTakenByOthers = (report.status === 'accepted' || report.status === 'traveling' || report.status === 'completed') && report.responderId !== user.uid;

  if (isTakenByOthers) {
    return (
      <button disabled className="w-full h-full bg-gray-100 text-gray-500 py-2.5 rounded-lg font-medium border border-gray-200 cursor-not-allowed text-sm flex items-center justify-center gap-2">
        <Lock size={16} /> รับเคสโดย {report.responderName || 'ทีมอื่น'}
      </button>
    );
  }

  // 2. เคสใหม่ -> ปุ่มรับงาน
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

  // 3. รับงานแล้ว (โดยเราเอง) -> ปุ่มไปหน้าจัดการ
  if ((report.status === 'accepted' || report.status === 'traveling') && report.responderId === user.uid) {
    return (
      <Link
        href={`/rescue/status?id=${report.id}`}
        className="relative w-full h-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium shadow-sm transition-colors text-sm flex items-center justify-center gap-2"
      >
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

  // 4. เสร็จสิ้น (โดยเรา)
  if (report.status === 'completed') {
    return (
      <button disabled className="w-full h-full bg-gray-100 text-gray-400 py-2.5 rounded-lg font-medium border border-gray-200 cursor-not-allowed text-sm flex items-center justify-center gap-2">
        <CheckCircle size={18} /> เสร็จสิ้น
      </button>
    );
  }
  return null;
}

// --- SUB-COMPONENT: Location Modal ---
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
      (position) => { setLoading(false); onEnable(position); },
      (error) => { setLoading(false); alert("ไม่สามารถระบุตำแหน่งได้: " + error.message); }
    );
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onSkip}>
      <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6"><MapPin size={60} className="text-[#B91C1C]" /></div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">ระบุตำแหน่งของคุณ</h3>
        <p className="text-gray-600 mb-8 leading-relaxed">ให้เปิดตำแหน่งของคุณ<br />ขณะใช้งานหรือไม่?</p>
        <button onClick={handleEnable} disabled={loading} className="w-full bg-[#34A853] hover:bg-[#2d9249] text-white font-bold py-3.5 rounded-full shadow-sm flex justify-center items-center gap-2">
          {loading && <Loader2 className="animate-spin" size={20} />} เปิดตำแหน่ง
        </button>
      </div>
    </div>
  );
}

// --- MAIN PAGE ---
export default function RescueDashboard() {
  const [viewingImage, setViewingImage] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Location States
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isLocationEnabled, setIsLocationEnabled] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  // Notification States
  const [toast, setToast] = useState(null); // { message, type }
  const audioRef = useRef(null); // สำหรับเล่นเสียง
  const isFirstLoad = useRef(true); // ป้องกันเสียงดังตอนโหลดหน้าเว็บครั้งแรก

  useEffect(() => {
    // โหลดเสียงเตรียมไว้
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    audioRef.current = new Audio(`${basePath}/alert.mp3`);
  }, []);

  // Location Check
  useEffect(() => {
    if (!user || user.role === 'center') return;
    const timer = setTimeout(() => {
      const savedLocationState = localStorage.getItem('rescue_location_enabled');
      if (savedLocationState === 'true') {
        setIsLocationEnabled(true);
        navigator.geolocation.getCurrentPosition(
          (position) => setUserLocation(position),
          (error) => console.error("Auto-location error:", error)
        );
      } else {
        setShowLocationModal(true);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [user]);

  const handleLocationEnable = (position) => {
    setIsLocationEnabled(true);
    setUserLocation(position);
    setShowLocationModal(false);
    localStorage.setItem('rescue_location_enabled', 'true');
  };

  const handleLocationSkip = () => { setIsLocationEnabled(false); setShowLocationModal(false); };

  // Guard
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      if (user.role === 'pending') router.push('/pending-approval');
      if (user.role === 'victim') router.push('/login');
    } else {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const [stats, setStats] = useState({ new: 0, accepted: 0, completed: 0, total: 0 });

  // Real-time Data & Alert Logic
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "reports"), orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate() }));

      // ✅ Logic แจ้งเตือนเคสใหม่
      if (!isFirstLoad.current) {
        // ถ้าจำนวนเคสเพิ่มขึ้น แสดงว่ามีเคสใหม่ (วิธีง่ายๆ แต่ได้ผล)
        if (items.length > reports.length) {
          // เล่นเสียง (แบบจำกัดเวลา 3 วินาที)
          if (audioRef.current) {
            audioRef.current.currentTime = 0; // 1. รีเซ็ตให้เริ่มเล่นจากวินาทีที่ 0 เสมอ
            audioRef.current.play().catch(e => console.log("Audio permission denied"));
            setTimeout(() => {
              if (audioRef.current) {
                audioRef.current.pause();       // หยุดเล่น
                audioRef.current.currentTime = 0; // กรอเทปกลับไปจุดเริ่มต้นเตรียมไว้รอบหน้า
              }
            }, 2000); // 2000 = 2 วิ, 5000 = 5 วิ
          }
          // แสดง Toast notification
          setToast({ message: "🚨 มีการแจ้งเหตุเข้ามาใหม่!", type: "alert" });
          // ซ่อน Toast อัตโนมัติ
          setTimeout(() => setToast(null), 5000);
        }
      } else {
        isFirstLoad.current = false;
      }

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
  }, [reports.length]); // dependency reports.length เพื่อเทียบของเก่ากับใหม่

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
    <div className="min-h-screen bg-[#F0F2F5] font-sans relative">
      <Navbar activePage="rescue" />

      {/* ✅ Toast Notification */}
      {toast && (
        <div className="fixed top-24 right-4 z-[100] bg-red-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right duration-300">
          <div className="bg-white/20 p-2 rounded-full"><Bell className="animate-wiggle" /></div>
          <div>
            <h4 className="font-bold">แจ้งเตือนด่วน</h4>
            <p className="text-sm">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="ml-2 hover:bg-white/20 p-1 rounded"><X size={16} /></button>
        </div>
      )}

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
              reports.map((item, index) => {
                const { cleanDesc } = parseReportData(item.description);
                // เช็คว่าเป็นเคสใหม่มากๆ หรือไม่ (เช่น เพิ่งมาเมื่อกี้นี้) เพื่อใส่ Effect
                const isNewArrival = index === 0 && (new Date() - item.timestamp) < 60000; // น้อยกว่า 1 นาที

                return (
                  <div key={item.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all ${isNewArrival ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-200'}`}>
                    <div className="p-6">
                      {/* HEADER */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-wrap items-center gap-1">
                          {isNewArrival && <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase animate-pulse">NEW</span>}
                          {item.status === 'pending' && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">วิกฤต/รอการช่วยเหลือ</span>}
                          {item.status === 'investigating' && <span className="bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">กำลังตรวจสอบ</span>}
                          {item.status === 'accepted' && <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">รับเคสแล้ว</span>}
                          {item.status === 'traveling' && <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase animate-pulse">กำลังเดินทาง</span>}
                          {item.status === 'completed' && <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">เสร็จสิ้น</span>}
                          <span className="text-gray-500 text-xs">{item.province || item.location || 'ไม่ระบุพิกัด'}</span>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-gray-400 text-xs">
                            {timeAgo(item.timestamp)} {item.timestamp && `เวลา ${item.timestamp.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`}
                          </span>
                          {isLocationEnabled && userLocation && item.latitude && item.longitude && (item.status === 'pending' || item.status === 'investigating') && (
                            <span className="text-blue-600 text-xs font-bold">
                              ห่างจากคุณ {calculateDistance(userLocation.coords.latitude, userLocation.coords.longitude, item.latitude, item.longitude)} กม.
                            </span>
                          )}
                        </div>
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

                      {/* FOOTER ACTIONS */}
                      <div className="flex flex-col md:flex-row gap-3 pt-4 border-t border-gray-100">
                        {item.imageUrl ? (
                          <button onClick={() => setViewingImage(item.imageUrl)} className="flex-1 flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300 py-2.5 rounded-lg font-medium transition-colors shadow-sm text-sm">
                            <ImageIcon size={18} /> ดูหลักฐาน
                          </button>
                        ) : (
                          <button disabled className="flex-1 flex items-center justify-center gap-2 bg-gray-50 text-gray-400 border border-gray-200 py-2.5 rounded-lg font-medium text-sm cursor-not-allowed">
                            <ImageIcon size={18} /> ไม่มีภาพ
                          </button>
                        )}

                        <a href={`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`} target="_blank" rel="noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-700 text-white py-2.5 rounded-lg font-medium transition-colors shadow-sm text-sm">
                          <MapPin size={18} /> ดูแผนที่
                        </a>

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

      {showLocationModal && (
        <LocationPermissionModal onEnable={handleLocationEnable} onSkip={handleLocationSkip} />
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