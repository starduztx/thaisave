"use client";
// File: src/app/rescue/page.js
// หน้าที่: Dashboard สำหรับทีมกู้ภัย (รับเคส, ดูแผนที่, อัปเดตสถานะ)
// Update: ปรับ Header ให้เหมือนหน้า Home/Victim (Consistent Design)

import { useState, useEffect } from 'react';
import { db } from '../../lib/db';
import { collection, query, orderBy, onSnapshot, updateDoc, doc } from "firebase/firestore";
import Link from 'next/link';
import { MapPin, Phone, Clock, CheckCircle, AlertTriangle, Filter, ChevronDown, User, Menu } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
// ... other imports

export default function RescueDashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true); // Loading for DATA, not Auth
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // Stats (คำนวณจากข้อมูลจริง)
  const [stats, setStats] = useState({
    new: 0,
    accepted: 0,
    completed: 0,
    total: 0
  });

  // 1. Fetch Data Realtime
  useEffect(() => {
    if (!db) return;

    const q = query(collection(db, "reports"), orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));

      setReports(items);

      setStats({
        new: items.filter(i => i.status === 'pending').length,
        accepted: items.filter(i => i.status === 'accepted').length,
        completed: items.filter(i => i.status === 'completed').length,
        total: items.length
      });

      setLoading(false);
    }, (error) => {
      console.error("Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Actions
  const handleAcceptCase = async (id) => {
    if (!confirm("ยืนยันที่จะรับเคสนี้?")) return;
    try {
      await updateDoc(doc(db, "reports", id), { status: 'accepted', acceptedAt: new Date() });
    } catch (e) { alert("Error: " + e.message); }
  };

  const handleCloseCase = async (id) => {
    if (!confirm("ยืนยันการปิดเคส (ช่วยเหลือสำเร็จ)?")) return;
    try {
      await updateDoc(doc(db, "reports", id), { status: 'completed', completedAt: new Date() });
    } catch (e) { alert("Error: " + e.message); }
  };

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

      {/* --- STANDARD HEADER (เหมือนหน้าอื่น) --- */}
      <nav className="bg-[#1E3A8A] text-white w-full shadow-md sticky top-0 z-50">
        <div className="w-full px-6 py-4 flex justify-between items-center">
          {/* Brand */}
          <div className="flex flex-col">
            <Link href="/" className="text-2xl font-bold tracking-tight hover:opacity-90 transition leading-tight">
              ThaiSave(ไทยเซฟ)
            </Link>
            <span className="text-[11px] text-blue-200 font-light tracking-widest opacity-80">
              ระบบกลางจัดการภัยพิบัติแห่งชาติ
            </span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="/center" className="hover:text-yellow-400 transition opacity-80 hover:opacity-100">ส่วนกลาง/ศูนย์ช่วยเหลือ</Link>
            <span className="text-yellow-400 font-bold border-b-2 border-yellow-400 pb-1 cursor-default">ช่วยเหลือ/กู้ภัย</span>

            <Link href="#" className="hover:text-yellow-400 transition opacity-80 hover:opacity-100">ติดต่อ</Link>
            <Link href="#" className="hover:text-yellow-400 transition opacity-80 hover:opacity-100">เกี่ยวกับ</Link>

            <button
              onClick={handleLogout}
              className="text-white hover:text-white/80 transition font-medium bg-red-500 hover:bg-red-600 px-4 py-1.5 rounded-lg shadow-sm"
            >
              ออกจากระบบ
            </button>
          </div>

          {/* Mobile Menu Icon */}
          <button className="md:hidden text-white">
            <Menu size={28} />
          </button>
        </div>
      </nav>

      {/* --- CONTENT --- */}
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Dashboard Case ศูนย์บริหารจัดการภัยพิบัติ</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Real-time Update
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="เคสใหม่ในพื้นที่" value={stats.new} color="text-red-600" borderColor="border-red-500" />
          <StatCard label="กำลังดำเนินการ" value={stats.accepted} color="text-blue-600" borderColor="border-blue-500" />
          <StatCard label="ปิดเคสแล้ว" value={stats.completed} color="text-green-600" borderColor="border-green-500" />
          <StatCard label="ทั้งหมด" value={stats.total} color="text-gray-600" borderColor="border-gray-300" />
        </div>

        {/* Filter Section */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm mb-6 border border-gray-200">
          <h3 className="font-bold text-lg text-gray-700 flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-500" /> รายการแจ้งเหตุล่าสุด
          </h3>
          <div className="flex gap-2 mt-2 md:mt-0">
            <button className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm bg-gray-50 hover:bg-gray-100 text-gray-700">
              <Filter size={14} /> กรองข้อมูล <ChevronDown size={14} />
            </button>
          </div>
        </div>

        {/* Case List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
              <p className="text-gray-500 text-lg">ยังไม่มีการแจ้งเหตุในขณะนี้</p>
              <p className="text-gray-400 text-sm">เหตุการณ์ปกติ</p>
            </div>
          ) : (
            reports.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all group">
                <div className="p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${item.status === 'pending' ? 'bg-red-100 text-red-600 animate-pulse' :
                        item.status === 'accepted' ? 'bg-blue-100 text-blue-600' :
                          'bg-green-100 text-green-600'
                        }`}>
                        {item.status === 'pending' ? 'รอการช่วยเหลือ' :
                          item.status === 'accepted' ? 'กำลังดำเนินการ' : 'เสร็จสิ้น'}
                      </span>
                      <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold border border-gray-200">
                        {item.disasterType}
                      </span>
                    </div>
                    <span className="text-gray-400 text-xs flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
                      <Clock size={12} /> {timeAgo(item.timestamp)}
                    </span>
                  </div>

                  <div className="flex flex-col md:flex-row gap-6">
                    {/* ข้อมูล */}
                    <div className="flex-grow space-y-3">
                      <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        {item.disasterType}
                        {item.location && <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded flex items-center gap-1"><MapPin size={12} /> {item.location}</span>}
                      </h3>

                      <div className="bg-[#F8FAFC] p-4 rounded-lg border border-gray-100 text-gray-700 italic border-l-4 border-l-blue-500">
                        "{item.description}"
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                        <div className="flex items-center gap-1">
                          <User size={14} className="text-gray-400" />
                          <span>ผู้แจ้ง: {item.contactName || 'ไม่ระบุชื่อ'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone size={14} className="text-gray-400" />
                          {item.contactName ? <a href={`tel:${item.contactName}`} className="text-blue-600 hover:underline">{item.contactName}</a> : <span>ไม่มีเบอร์</span>}
                        </div>
                      </div>
                    </div>

                    {/* ปุ่ม Action */}
                    <div className="md:w-56 flex flex-col justify-end gap-2 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6">
                      {item.status === 'pending' && (
                        <button
                          onClick={() => handleAcceptCase(item.id)}
                          className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white py-3 rounded-lg font-bold shadow-sm transition-colors text-sm"
                        >
                          รับเคสนี้
                        </button>
                      )}
                      {item.status === 'accepted' && (
                        <button
                          onClick={() => handleCloseCase(item.id)}
                          className="w-full bg-[#16A34A] hover:bg-[#15803d] text-white py-3 rounded-lg font-bold shadow-sm transition-colors text-sm flex items-center justify-center gap-2"
                        >
                          <CheckCircle size={16} /> ปิดเคส (สำเร็จ)
                        </button>
                      )}
                      {item.status === 'completed' && (
                        <button disabled className="w-full bg-gray-100 text-gray-400 py-3 rounded-lg font-bold cursor-not-allowed text-sm border border-gray-200">
                          ดำเนินการเสร็จสิ้น
                        </button>
                      )}

                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${item.location}`}
                        target="_blank"
                        className="w-full text-center text-xs text-gray-500 hover:text-blue-600 hover:underline py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        เปิดแผนที่ Google Maps ↗
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Sub-component สำหรับ Card สถิติ
function StatCard({ label, value, color, borderColor }) {
  return (
    <div className={`bg-white p-6 rounded-xl shadow-sm border-b-4 ${borderColor} flex flex-col items-center justify-center transition-transform hover:-translate-y-1`}>
      <p className="text-gray-500 text-sm mb-1">{label}</p>
      <h3 className={`text-4xl font-bold ${color}`}>{value}</h3>
    </div>
  );
}