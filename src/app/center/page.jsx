"use client";
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Menu, ChevronDown } from 'lucide-react';
import { db, auth } from '../../lib/db';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";

// Import Map แบบ Dynamic
const MapContainer = dynamic(() => import('../../components/map/MapContainer'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-[#6B7280] animate-pulse flex items-center justify-center text-white/50">กำลังโหลดแผนที่...</div>
});

import PolicyReport from '../../components/dashboard/PolicyReport';

export default function CenterDashboardPage() {
  const [reports, setReports] = useState([]);
  const [showCaseList, setShowCaseList] = useState(true);
  const { user, logout } = useAuth(); // Use Global Auth
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // Removed redundant local auth effect


  useEffect(() => {
    if (!user || !db) return;
    const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(items);
    });
    return () => unsubscribe();
  }, [user]);

  // ฟังก์ชันเปลี่ยนสถานะ (Manual Approve)
  const updateStatus = async (id, currentStatus) => {
    // ถ้าสถานะเป็น Accepted หรือ Completed แล้ว อาจจะไม่ต้องทำอะไร หรือให้ Reset กลับได้
    // Logic: Toggle Approve <-> Pending
    const isAlreadyGreen = ['approved', 'accepted', 'completed'].includes(currentStatus);
    const newStatus = isAlreadyGreen ? 'pending' : 'approved';

    if (!confirm(`ยืนยันการเปลี่ยนสถานะเป็น ${newStatus === 'approved' ? 'อนุมัติ' : 'รอตรวจสอบ'}?`)) return;

    try {
      await updateDoc(doc(db, 'reports', id), { status: newStatus });
    } catch (e) {
      console.error("Error updating status:", e);
      alert("เกิดข้อผิดพลาดในการอัปเดตสถานะ");
    }
  };

  // Helper: ตรวจสอบสถานะที่เป็น "สีเขียว" (ปกติ/ดำเนินการแล้ว)
  const isGreenStatus = (status) => ['approved', 'accepted', 'completed'].includes(status);

  // Helper: ข้อความสถานะ
  const getStatusLabel = (status) => {
    switch (status) {
      case 'approved': return 'อนุมัติแล้ว';
      case 'accepted': return 'กู้ภัยรับเรื่องแล้ว';
      case 'completed': return 'ช่วยเหลือสำเร็จ';
      default: return 'วิกฤต / รอความช่วยเหลือ';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-10">
      {/* 1. Header (Navbar) แบบเต็มจอ สีน้ำเงินเข้ม (เหมือนหน้า Victim) */}
      <nav className="bg-[#1E3A8A] text-white w-full shadow-md sticky top-0 z-50">
        <div className="w-full px-6 py-4 flex justify-between items-center">
          {/* Brand */}
          <div className="flex flex-col">
            <Link href="/" className="text-2xl font-bold tracking-tight hover:opacity-90 transition">
              ThaiSave(ไทยเซฟ)
            </Link>
            <span className="text-[11px] text-blue-200 font-light tracking-widest opacity-80">
              ระบบกลางจัดการภัยพิบัติแห่งชาติ
            </span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <span className="text-yellow-400 font-bold border-b-2 border-yellow-400 pb-1 cursor-default">แดชบอร์ด</span>
            <Link href="/rescue" className="hover:text-yellow-400 transition opacity-80 hover:opacity-100">ช่วยเหลือ/กู้ภัย</Link>

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

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Dashboard ภาพรวมประเทศ</h2>
        </div>

        {/* 1. Map Section (ภาพรวม) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-medium text-gray-800">แผนที่ประเทศไทย</h3>
            <div className="flex gap-3">
              <div className="relative">
                <select className="appearance-none bg-white border border-gray-300 rounded px-4 py-2 pr-8 text-sm focus:outline-none focus:border-blue-500 w-40">
                  <option>ประเภทภัยพิบัติ</option>
                  <option>น้ำท่วม</option>
                  <option>ไฟไหม้</option>
                </select>
                <ChevronDown className="absolute right-2 top-2.5 text-gray-500 pointer-events-none" size={16} />
              </div>
              <div className="relative">
                <select className="appearance-none bg-white border border-gray-300 rounded px-4 py-2 pr-8 text-sm focus:outline-none focus:border-blue-500 w-32">
                  <option>สถานะ</option>
                  <option>รออนุมัติ</option>
                  <option>ดำเนินการแล้ว</option>
                </select>
                <ChevronDown className="absolute right-2 top-2.5 text-gray-500 pointer-events-none" size={16} />
              </div>
            </div>
          </div>

          {/* Real Map Component */}
          <div className="h-[400px] w-full border border-gray-300 rounded-lg overflow-hidden relative z-0">
            <MapContainer reports={reports} />
          </div>
        </div>

        {/* 2. Case List Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-gray-800">ภาพรวมเคส</h3>
          <button
            onClick={() => setShowCaseList(!showCaseList)}
            className="bg-white border border-gray-300 px-4 py-1.5 rounded shadow-sm text-sm font-medium hover:bg-gray-50 text-gray-700 transition"
          >
            {showCaseList ? 'ซ่อนข้อมูล' : 'แสดงข้อมูล'}
          </button>
        </div>

        {/* Case List */}
        <div className="space-y-4">
          {showCaseList && (
            reports.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
                <p className="text-gray-500">ยังไม่มีการแจ้งเหตุเข้ามาในระบบ</p>
              </div>
            ) : reports.map(item => (
              <div key={item.id} className={`bg-white p-6 rounded-xl shadow-sm border flex flex-col md:flex-row gap-6 relative overflow-hidden transition-all ${isGreenStatus(item.status) ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
                }`}>
                {/* Visual Status Indicator Line (Left Border) */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${isGreenStatus(item.status) ? 'bg-green-500' : 'bg-[#EF4444]'}`}></div>

                <div className="flex-grow pl-2">
                  {/* Header: Type and Location */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${isGreenStatus(item.status)
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-600'
                      }`}>
                      {getStatusLabel(item.status)}
                    </span>
                    <span className="text-gray-500 text-sm">
                      {item.location || 'ไม่ระบุพิกัด'}
                    </span>
                  </div>

                  {/* Title & Contact */}
                  <h4 className="text-lg font-bold text-gray-900 mb-1">
                    {item.disasterType} {item.contactName ? `ผู้แจ้ง: ${item.contactName}` : ''}
                  </h4>
                  <p className="text-xs text-gray-500 mb-3">
                    ผู้แจ้ง: คุณ {item.contactName || '-'} ({item.contactPhone || '-'})
                  </p>

                  {/* Description Box */}
                  <div className="bg-gray-100/80 rounded p-3 mb-4 text-sm text-gray-700">
                    "{item.description}"
                  </div>

                  {/* Images & Map Link */}
                  <div className="flex gap-4 items-center">
                    <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-[10px] text-gray-500">
                      บันทึก<br />หลักฐาน
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`}
                      target="_blank"
                      className="text-blue-600 text-xs underline font-medium"
                    >
                      ดูพิกัดบนแผนที่
                    </a>
                  </div>
                </div>

                {/* Right Action Button */}
                <div className="flex flex-col justify-start items-end min-w-[150px]">
                  <button
                    onClick={() => updateStatus(item.id, item.status)}
                    className={`px-6 py-1.5 rounded-full text-sm font-bold shadow-sm transition-colors ${isGreenStatus(item.status)
                      ? 'bg-[#10B981] text-white hover:bg-[#059669]' // Green button
                      : 'bg-[#FDE68A] text-[#92400E] hover:bg-yellow-200'
                      }`}
                  >
                    {isGreenStatus(item.status) ? 'อนุมัติเรียบร้อย' : 'รออนุมัติ'}
                  </button>
                  {isGreenStatus(item.status) && (
                    <span className="text-[10px] text-green-600 mt-2 font-medium">
                      {item.status === 'accepted' ? 'กู้ภัยกำลังเดินทาง' : item.status === 'completed' ? 'ช่วยเหลือสำเร็จ' : 'เจ้าหน้าที่รับเรื่องแล้ว'}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Policy Report Section (Moved to bottom) */}
        <div className="mt-12 border-t pt-8">
          <PolicyReport reports={reports} />
        </div>
      </main>
    </div>
  );
}