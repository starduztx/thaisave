"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin, Phone, Clock, Search, Filter, AlertTriangle,
  CheckCircle, ChevronDown, BarChart2, Activity, Shield, Volume2, VolumeX
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/db';
import dynamic from 'next/dynamic';
import RescueTeamTable from '@/components/dashboard/RescueTeamTable';
import PolicyReport from '@/components/dashboard/PolicyReport';
import Navbar from '../../components/Navbar';


// Dynamic Import Map (แก้ปัญหา window is not defined)
const MapWithNoSSR = dynamic(() => import('@/components/map/MapContainer'), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-gray-400">กำลังโหลดแผนที่...</div>
});

// --- 1. นิยามสถานะทั้งหมด ---
const STATUS_MAP = {
  investigating: {
    label: 'รอตรวจสอบ',
    color: 'bg-red-100 text-red-800',
    border: 'border-red-200 bg-white',
    strip: 'bg-red-400',
    btn: 'bg-red-100 text-red-700'
  },
  traveling: {
    label: 'กำลังช่วยเหลือ',
    color: 'bg-yellow-100 text-yellow-800',
    border: 'border-yellow-200 bg-white',
    strip: 'bg-yellow-500',
    btn: 'bg-yellow-100 text-yellow-700'
  },
  completed: {
    label: 'เสร็จสิ้น',
    color: 'bg-green-100 text-green-800',
    border: 'border-green-200 bg-white',
    strip: 'bg-green-500',
    btn: 'bg-green-100 text-green-700'
  }
};

export default function CenterDashboardPage() {
  const [reports, setReports] = useState([]);
  const [teams, setTeams] = useState([]); // ✅ State สำหรับเก็บข้อมูลทีม
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCaseList, setShowCaseList] = useState(true);

  // Sound Refs
  // Sound Refs
  const audioRef = useRef(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    audioRef.current = new Audio(`${basePath}/alert.mp3`);

    // ✅ Silent Unlock Strategy: ปลดล็อคเสียงทันทีที่ผู้ใช้คลิกตรงไหนก็ได้ในหน้าเว็บ
    const unlockAudio = () => {
      if (audioRef.current) {
        audioRef.current.play().then(() => {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }).catch(() => { });
        // ลบ Listener ออกทันทีที่ทำสำเร็จ (ทำแค่ครั้งเดียว)
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
      }
    };

    document.addEventListener('click', unlockAudio);
    document.addEventListener('keydown', unlockAudio);

    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // ดึงข้อมูล Realtime
  useEffect(() => {
    const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Play sound on new arrival
      if (!isFirstLoad.current) {
        const changes = snapshot.docChanges();

        const hasNew = changes.some(change => change.type === 'added');

        // ✅ Play sound directly
        if (hasNew && audioRef.current) {
          console.log("🔊 Playing notification sound!");
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(e => console.error("Audio play failed (waiting for interaction)", e));
        }
      } else {
        isFirstLoad.current = false;
      }

      setReports(data);
    });
    // 2. ดึงข้อมูล Teams (สำหรับจัดกลุ่มในตาราง)
    const qTeams = query(collection(db, 'teams'));
    const unsubscribeTeams = onSnapshot(qTeams, (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeams(teamsData);
    });

    return () => {
      unsubscribe();
      unsubscribeTeams();
    };
  }, []);

  // กรองข้อมูล
  const filteredReports = reports.filter((item) => {
    const typeValue = item.disasterType || '';
    const matchType = filterType === 'all' || typeValue.includes(filterType);

    let matchStatus = true;
    if (filterStatus !== 'all') {
      matchStatus = item.status === filterStatus;
    }

    return matchType && matchStatus;
  });

  // ฟังก์ชันช่วย Mask เบอร์โทร
  const maskPhone = (phone) => {
    if (!phone || phone.length < 10) return phone || '-';
    return phone.substring(0, 6) + 'xxxx';
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900 pb-20">

      <Navbar activePage="center" />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 mt-2">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard ภาพรวมประเทศ</h1>
        </div>
        {/* Map Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-gray-700 flex items-center gap-2">
              <MapPin size={18} className="text-red-500" /> แผนที่จุดเกิดเหตุ
            </h2>
          </div>
          <div className="h-[400px] w-full relative z-0">
            <MapWithNoSSR reports={filteredReports} />
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            ภาพรวมเคส <span className="text-sm font-normal text-gray-500">({filteredReports.length})</span>
          </h2>

          <div className="flex gap-3 w-full md:w-auto items-center">

            <div className="relative flex-grow md:flex-grow-0">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded px-4 py-2 pr-8 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="all">ภัยพิบัติทุกประเภท</option>
                <option value="น้ำท่วม">น้ำท่วม (Flood)</option>
                <option value="ไฟไหม้">ไฟไหม้ (Fire)</option>
                <option value="ดินถล่ม">ดินถล่ม (Landslide)</option>
              </select>
              <ChevronDown className="absolute right-2 top-2.5 text-gray-500 pointer-events-none" size={16} />
            </div>

            <div className="relative flex-grow md:flex-grow-0">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-300 rounded px-4 py-2 pr-8 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="all">สถานะทั้งหมด</option>
                {Object.keys(STATUS_MAP).map((key) => (
                  <option key={key} value={key}>
                    {STATUS_MAP[key].label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 text-gray-500 pointer-events-none" size={16} />
            </div>

            <button
              onClick={() => setShowCaseList(!showCaseList)}
              className="bg-white border border-gray-300 px-4 py-2 rounded text-sm hover:bg-gray-50 text-gray-600"
            >
              {showCaseList ? 'ซ่อนข้อมูล' : 'แสดงข้อมูล'}
            </button>
          </div>
        </div>

        {/* --- Case List Grid (ส่วนที่ปรับปรุง Layout) --- */}
        {showCaseList && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className="h-[600px] overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4 content-start">

              {filteredReports.map(item => {
                const statusConfig = STATUS_MAP[item.status] || STATUS_MAP['investigating'];

                return (
                  <div key={item.id} className={`relative bg-white rounded-xl border p-4 flex flex-row justify-between overflow-hidden transition-all hover:shadow-md min-h-[140px] ${statusConfig.border}`}>

                    {/* เส้นสีด้านซ้าย */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${statusConfig.strip}`}></div>

                    {/* ฝั่งซ้าย: ข้อมูล */}
                    <div className="flex flex-col justify-between pl-3 flex-1 gap-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                        <span className="text-gray-500 text-xs flex items-center gap-1 truncate">
                          <MapPin size={12} />
                          {item.province || "ไม่ระบุ"}
                        </span>
                      </div>

                      <h4 className="text-lg font-bold text-gray-900 leading-tight line-clamp-2">
                        {item.disasterType}
                      </h4>

                      <div className="text-sm text-gray-600 mt-1">
                        <div className="flex flex-col gap-0.5 text-xs text-gray-500">
                          <div className="flex gap-1">
                            <span>ผู้แจ้ง:</span>
                            <span className="font-medium text-gray-700">{item.contactName || '-'}</span>
                          </div>
                          <div className="flex gap-1">
                            <span>เบอร์โทร:</span>
                            <span className="font-mono bg-gray-50 px-1 rounded">{maskPhone(item.contactPhone)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ฝั่งขวา: วันที่ & สถานะ */}
                    <div className="flex flex-col justify-between items-end pl-2 min-w-[100px]">
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {item.timestamp ? new Date(item.timestamp.seconds * 1000).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </span>

                      <div className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm whitespace-nowrap flex items-center gap-1 cursor-default select-none border border-transparent ${item.status === 'completed'
                        ? 'bg-white border-gray-200 text-green-600'
                        : statusConfig.btn
                        }`}>
                        {item.status === 'completed' && <span>✓</span>}
                        {item.status === 'completed' ? 'เสร็จสิ้น' : statusConfig.label}
                      </div>
                    </div>

                  </div>
                );
              })}

            </div>
          </div>
        )}

        {/* --- ส่วนสรุปผล (Table & Graph) --- */}
        <div className="border-t pt-8 space-y-8">
          <RescueTeamTable reports={reports} teams={teams} groupByTeam={true} />
          <PolicyReport reports={reports} />
        </div>

      </main>
    </div>
  );
}