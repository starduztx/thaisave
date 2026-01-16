"use client";
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Menu, ChevronDown, MapPin as MapPinIcon, User } from 'lucide-react'; // อย่าลืม import MapPinIcon
import { db } from '../../lib/db';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, limit } from "firebase/firestore";
import RescueTeamTable from '@/components/dashboard/RescueTeamTable';

// --- 1. นิยามสถานะทั้งหมดที่มีในระบบ ---
const STATUS_MAP = {
  investigating: { label: 'รอตรวจสอบ', color: 'bg-yellow-100 text-yellow-800', border: 'border-yellow-200' },
  traveling:       { label: 'กำลังช่วยเหลือ', color: 'bg-orange-100 text-orange-800', border: 'border-orange-200' },
  completed:     { label: 'เสร็จสิ้น', color: 'bg-green-100 text-green-800', border: 'border-green-200' }
};

// สถานะไหนที่ถือว่า "จบงานแล้ว" (เอาไว้กรองหรือเปลี่ยนสีพื้นหลัง)
const IS_FINISHED = (status) => ['completed'].includes(status);


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
    // 1. รับค่าจาก Database (priority หลัก)
    let displayText = text;

    // 2. ถ้าไม่มี text ให้ลองเช็คว่ามีค่า lat, lng ไหม (เผื่อเคสเก่าๆ ที่ยังไม่มี text)
    if ((!displayText || displayText === "ไม่ระบุ") && lat && lng) {
      displayText = `${lat.toFixed(4)}, ${lng.toFixed(4)}`; // แปลงเป็นเลขพิกัดแทน
    }

    // 3. เริ่มเข้าสู่กระบวนการ "จัดสวย" (Formatter)
    if (displayText && displayText.trim() !== "") {
      let cleanText = displayText.toString().trim();

      // --- เช็คเงื่อนไขต่างๆ เพื่อดูว่าจะเติม "จ." ดีไหม ---
      
      // A. เช็คว่าเป็นที่อยู่ละเอียด/กทม. หรือไม่ (พวกนี้ไม่ต้องเติม จ.)
      const isFullAddress = 
        cleanText.includes("ต.") || cleanText.includes("อ.") || 
        cleanText.includes("ถ.") || cleanText.includes("ซ.") ||
        cleanText.includes("หมู่") || cleanText.includes("อาคาร") ||
        cleanText.includes("กทม") || cleanText.includes("กรุงเทพ");

      // B. เช็คว่าเป็นเลขพิกัดหรือไม่ (ถ้าใช่ ให้ใส่ไอคอนหมุด)
      // (regex เช็คว่ามีแต่ตัวเลข จุด และลูกน้ำ)
      const isCoordinate = /^[0-9.,\s-]+$/.test(cleanText);

      // C. เช็คว่ามีคำนำหน้าอยู่แล้วไหม
      const hasPrefix = cleanText.startsWith("จ.") || cleanText.startsWith("จังหวัด");

      if (isCoordinate) {
        setProvince(`📍 ${cleanText}`); // เคสเลขพิกัด
      } else if (isFullAddress || hasPrefix) {
        setProvince(cleanText); // เคสที่อยู่ครบ หรือมี จ. อยู่แล้ว -> โชว์เลย
      } else {
        setProvince(`จ.${cleanText}`); // เคสจังหวัดโดดๆ -> เติม จ. ให้ดูดี
      }
      
    } else {
      // 4. ถ้าไม่มีข้อมูลอะไรเลยจริงๆ
      setProvince("ไม่ระบุพิกัด");
    }

  }, [lat, lng, text]); // Dependency Array

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
    // กรองประเภทภัย (เหมือนเดิม)
    const typeValue = item.disasterType || '';
    const matchType = filterType === 'all' || typeValue.includes(filterType);

    // ✅ กรองสถานะ: ถ้าเลือก 'all' เอาหมด / ถ้าเลือกเจาะจง ให้เช็คว่าตรงกันไหม
    let matchStatus = true;
    if (filterStatus !== 'all') {
      // เทียบ value ใน DB กับ value ที่เราเลือกใน Dropdown
      matchStatus = item.status === filterStatus; 
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

  
  const STATUS_MAP = {
  // 1. สถานะ: รอตรวจสอบ
  investigating: { 
    label: 'รอตรวจสอบ', 
    // สีป้ายและขอบการ์ด
    badge: 'bg-yellow-100 text-yellow-800', 
    border: 'border-yellow-200 bg-white',
    // สีแถบซ้าย (เข้มกว่าป้ายหน่อย)
    strip: 'bg-yellow-400',
    // ปุ่มกด: ถ้าอยู่สถานะนี้ ปุ่มจะพาไป -> "traveling"
    action: { label: 'รับเรื่อง / ออกปฏิบัติการ', next: 'traveling', btnColor: 'bg-blue-600 hover:bg-blue-700 text-white' }
  },

  // 2. สถานะ: กำลังช่วยเหลือ (Traveling)
  traveling: { 
    label: 'กำลังช่วยเหลือ', 
    badge: 'bg-orange-100 text-orange-800', 
    border: 'border-orange-200 bg-orange-50/30', // ใส่พื้นหลังจางๆ ให้รู้ว่ากำลังทำงาน
    strip: 'bg-orange-500',
    // ปุ่มกด: ถ้าอยู่สถานะนี้ ปุ่มจะพาไป -> "completed"
    action: { label: 'ปิดงาน / เสร็จสิ้น', next: 'completed', btnColor: 'bg-green-600 hover:bg-green-700 text-white' }
  },

  // 3. สถานะ: เสร็จสิ้น
  completed: { 
    label: 'เสร็จสิ้น', 
    badge: 'bg-green-100 text-green-800', 
    border: 'border-green-200 bg-green-50/30',
    strip: 'bg-green-500',
    // ปุ่มกด: จบงานแล้ว ไม่มีปุ่ม หรือเป็นปุ่ม Disabled
    action: { label: 'เรียบร้อย', next: null, btnColor: 'bg-gray-100 text-gray-400 cursor-default' }
  }
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
                  className="appearance-none bg-white border border-gray-300 rounded px-4 py-2 pr-8 text-sm focus:outline-none focus:border-blue-500 w-48"
                >
                  <option value="all">สถานะทั้งหมด</option>
                  
                  {/* ✅ วนลูปสร้างตัวเลือกจาก STATUS_MAP (เพิ่มลดง่ายในอนาคต) */}
                  {Object.keys(STATUS_MAP).map((key) => (
                    <option key={key} value={key}>
                      {STATUS_MAP[key].label}
                    </option>
                  ))}
                  
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

              {filteredReports.map(item => {
                  // ดึงค่าสีตามสถานะ (ถ้าไม่มี ให้ใช้ default เป็น investigating)
                  const statusConfig = STATUS_MAP[item.status] || STATUS_MAP['investigating'];

                  return (
                    <div key={item.id} className={`p-5 rounded-xl border flex flex-col md:flex-row gap-4 relative overflow-hidden transition-all hover:shadow-md items-start md:items-center ${statusConfig.border}`}>
                      
                      {/* 1. เส้นสีด้านซ้าย (ดึงจาก config.strip) */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${statusConfig.strip}`}></div>

                      {/* Left: Info */}
                      <div className="flex-grow pl-3 flex flex-col justify-center gap-2">
                        <div className="flex items-center gap-2">
                          
                          {/* 2. ป้ายสถานะ (ดึงจาก config.color) */}
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>

                          <span className="text-gray-500 text-sm flex items-center gap-1">
                            <MapPinIcon size={14} />
                            {/* ตรงนี้ใช้ LocationDisplay หรือ Text ปกติของคุณได้เลย */}
                            <span>{item.province || "ไม่ระบุ"}</span>
                          </span>
                        </div>

                        <h4 className="text-lg font-bold text-gray-900 leading-tight">
                          {item.disasterType}
                        </h4>

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

                      {/* Right: Action Button */}
                      <div className="flex flex-row md:flex-col justify-between items-center md:items-end w-full md:w-auto gap-3 pl-3 md:pl-0 border-t md:border-t-0 border-gray-100 pt-3 md:pt-0 mt-2 md:mt-0">

                        {/* 3. ปุ่มกด (ดึงสีจาก config.btn) */}
                        <button
                          onClick={() => updateStatus(item.id, item.status)}
                          className={`px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors whitespace-nowrap ${statusConfig.btn}`}
                        >
                          {/* ข้อความในปุ่ม: ถ้าเสร็จแล้วโชว์ติ๊กถูก ถ้ายังไม่เสร็จให้โชว์ข้อความสถานะ */}
                          {item.status === 'completed' ? '✓ เสร็จสิ้น' : statusConfig.label}
                        </button>

                        <span className="text-xs text-gray-400">
                          {item.timestamp ? new Date(item.timestamp.seconds * 1000).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                        </span>
                      </div>

                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Policy Report Section */}
        <div className="mt-12 border-t pt-8">
          <RescueTeamTable reports={reports} />

          <PolicyReport reports={reports} />
        </div>
      </main>
    </div>
  );
}