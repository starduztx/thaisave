"use client";
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Menu, ChevronDown, MapPin as MapPinIcon, User } from 'lucide-react'; // อย่าลืม import MapPinIcon
import { db } from '../../lib/db';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, limit } from "firebase/firestore";

// Import Map แบบ Dynamic
const MapContainer = dynamic(() => import('../../components/map/MapContainer'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-[#6B7280] animate-pulse flex items-center justify-center text-white/50">กำลังโหลดแผนที่...</div>
});

import PolicyReport from '../../components/dashboard/PolicyReport';
import Navbar from '../../components/Navbar';

// --- Sub-Component: แปลงพิกัดเป็นชื่อจังหวัด ---
const LocationDisplay = ({ lat, lng, text }) => {
  const [province, setProvince] = useState(text || 'กำลังระบุพิกัด...');

  useEffect(() => {
    // ถ้ามีคำว่า จ. หรือ จังหวัด อยู่แล้ว ให้ใช้ text เดิมเลย
    if (text && (text.includes("จ.") || text.includes("จังหวัด"))) {
      setProvince(text);
      return;
    }

    // 2. เตรียมพิกัด (รองรับทั้งแยก Field และรวมใน String)
    let targetLat = lat;
    let targetLng = lng;

    if ((!targetLat || !targetLng) && text && text.includes(',')) {
      const parts = text.split(',').map(s => parseFloat(s.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        targetLat = parts[0];
        targetLng = parts[1];
      }
    }

    // 3. ยิง API ถ้ามีพิกัด
    if (targetLat && targetLng) {
      setProvince("กำลังระบุพิกัด...");

      // Primary: BigDataCloud
      fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${targetLat}&longitude=${targetLng}&localityLanguage=th`)
        .then(res => {
          if (!res.ok) throw new Error("BDC Error");
          return res.json();
        })
        .then(data => {
          if (data.principalSubdivision) {
            setProvince(data.principalSubdivision.replace("จังหวัด", "จ.").trim());
          } else {
            throw new Error("No Province Data");
          }
        })
        .catch(() => {
          // Fallback: Nominatim (OpenStreetMap)
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${targetLat}&lon=${targetLng}&zoom=10&accept-language=th`)
            .then(res => res.json())
            .then(data => {
              if (data.address && data.address.province) {
                setProvince(data.address.province.replace("จังหวัด", "จ.").trim());
              } else {
                setProvince(`${targetLat.toFixed(3)}, ${targetLng.toFixed(3)}`);
              }
            })
            .catch(() => setProvince(`${targetLat.toFixed(3)}, ${targetLng.toFixed(3)}`));
        });
    } else {
      // 4. ถ้าไม่มีข้อมูลอะไรเลย
      setProvince(text || "ไม่ระบุพิกัด");
    }
  }, [lat, lng, text]);

  return <span>{province}</span>;
};

// --- Helper: ซ่อนเบอร์โทร 4 ตัวท้าย ---
const maskPhone = (phone) => {
  if (!phone) return '-';
  if (phone.length < 4) return phone;
  return phone.slice(0, -4) + "xxxx";
};

export default function CenterDashboardPage() {
  const [reports, setReports] = useState([]);
  const [showCaseList, setShowCaseList] = useState(true);
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const filteredReports = reports.filter((item) => {
    const typeValue = item.disasterType || '';
    const matchType = filterType === 'all' || typeValue.includes(filterType);

    let matchStatus = true;
    if (filterStatus === 'pending') {
      matchStatus = ['pending', 'approved', 'accepted'].includes(item.status);
    } else if (filterStatus === 'completed') {
      matchStatus = item.status === 'completed';
    }
    return matchType && matchStatus;
  });

  useEffect(() => {
    if (!user || !db) return;
    const q = query(
      collection(db, 'reports'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(items);
    });
    return () => unsubscribe();
  }, [user]);

  const updateStatus = async (id, currentStatus) => {
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

  const isGreenStatus = (status) => status === 'completed';

  const getStatusLabel = (status) => {
    if (status === 'completed') return 'เสร็จสิ้น';
    return 'รอตรวจสอบ';
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-10">
      <Navbar activePage="center" />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Dashboard ภาพรวมประเทศ</h2>
        </div>

        {/* 1. Map Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-medium text-gray-800">
              แผนที่ประเทศไทย ({filteredReports.length} เคส)
            </h3>

            <div className="flex gap-3">
              <div className="relative">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded px-4 py-2 pr-8 text-sm focus:outline-none focus:border-blue-500 w-40"
                >
                  <option value="all">ทุกประเภทภัย</option>
                  <option value="น้ำท่วม">น้ำท่วม</option>
                  <option value="ไฟไหม้">ไฟไหม้</option>
                  <option value="ดินถล่ม">ดินถล่ม</option>
                </select>
                <ChevronDown className="absolute right-2 top-2.5 text-gray-500 pointer-events-none" size={16} />
              </div>

              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded px-4 py-2 pr-8 text-sm focus:outline-none focus:border-blue-500 w-40"
                >
                  <option value="all">สถานะทั้งหมด</option>
                  <option value="pending">รอตรวจสอบ</option>
                  <option value="completed">เสร็จสิ้น</option>
                </select>
                <ChevronDown className="absolute right-2 top-2.5 text-gray-500 pointer-events-none" size={16} />
              </div>
            </div>
          </div>
          <div className="h-[400px] w-full border border-gray-300 rounded-lg overflow-hidden relative z-0">
            <MapContainer reports={filteredReports} />
          </div>
        </div>

        {/* 2. Case List (Updated UI - Bigger Cards) */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-gray-800">ภาพรวมเคส ({filteredReports.length})</h3>
          <button
            onClick={() => setShowCaseList(!showCaseList)}
            className="bg-white border border-gray-300 px-4 py-1.5 rounded shadow-sm text-sm font-medium hover:bg-gray-50 text-gray-700 transition"
          >
            {showCaseList ? 'ซ่อนข้อมูล' : 'แสดงข้อมูล'}
          </button>
        </div>

        {showCaseList && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="h-[600px] overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">

              {filteredReports.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <p>ไม่พบข้อมูลตามเงื่อนไขที่เลือก</p>
                </div>
              ) : (
                filteredReports.map(item => (
                  <div key={item.id} className={`p-5 rounded-xl border flex flex-col md:flex-row gap-4 relative overflow-hidden transition-all hover:shadow-md items-start md:items-center ${isGreenStatus(item.status) ? 'border-green-200 bg-green-50/30' : 'border-gray-200 bg-white'
                    }`}>
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isGreenStatus(item.status) ? 'bg-green-500' : 'bg-[#EF4444]'}`}></div>

                    {/* Left: Info */}
                    <div className="flex-grow pl-3 flex flex-col justify-center gap-2">
                      {/* Row 1: Status & Location */}
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${isGreenStatus(item.status) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {getStatusLabel(item.status)}
                        </span>
                        <span className="text-gray-500 text-sm flex items-center gap-1">
                          <MapPinIcon size={14} />
                          <LocationDisplay lat={item.latitude} lng={item.longitude} text={item.location} />
                        </span>
                      </div>

                      {/* Row 2: Title (Bigger) */}
                      <h4 className="text-lg font-bold text-gray-900 leading-tight">
                        {item.disasterType}
                      </h4>

                      {/* Row 3: Contact Info (Split Lines) */}
                      <div className="flex flex-col gap-1 text-sm text-gray-600 mt-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium min-w-[60px]">ผู้แจ้ง:</span>
                          <span>{item.contactName || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium min-w-[60px]">เบอร์โทร:</span>
                          <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-mono text-xs">
                            {maskPhone(item.contactPhone)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Action Button & Date */}
                    <div className="flex flex-row md:flex-col justify-between items-center md:items-end w-full md:w-auto gap-3 pl-3 md:pl-0 border-t md:border-t-0 border-gray-100 pt-3 md:pt-0 mt-2 md:mt-0">

                      <button
                        onClick={() => updateStatus(item.id, item.status)}
                        className={`px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors whitespace-nowrap ${isGreenStatus(item.status) ? 'bg-[#10B981] text-white hover:bg-[#059669]' : 'bg-[#FDE68A] text-[#92400E] hover:bg-yellow-200'}`}
                      >
                        {isGreenStatus(item.status) ? '✓ เสร็จสิ้น' : 'รอตรวจสอบ'}
                      </button>

                      <span className="text-xs text-gray-400">
                        {item.timestamp ? new Date(item.timestamp.seconds * 1000).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </span>
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Policy Report Section */}
        <div className="mt-12 border-t pt-8">
          <PolicyReport reports={reports} />
        </div>
      </main>
    </div>
  );
}