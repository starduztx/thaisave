"use client";

// File: src/app/rescue/page.jsx
// Location: หน้า Dashboard หลักสำหรับกู้ภัย (แสดงรายการแจ้งเหตุ)

import React, { useState } from 'react';
import { MapPin, Clock, AlertCircle, Phone, Navigation, CheckCircle, Search, Filter, Siren } from 'lucide-react';

const RescuePage = () => {
  // Mock Data: จำลองข้อมูลเคสที่แจ้งเข้ามา
  const [cases, setCases] = useState([
    {
      id: 1,
      type: "Flood",
      severity: "Critical", // 1. วิกฤต (สีแดง)
      title: "น้ำท่วมสูงมิดหัว ผู้ป่วยติดเตียง",
      location: "อ.หาดใหญ่ จ.สงขลา",
      distance: "1.2 กม.",
      time: "10 นาทีที่แล้ว",
      reporter: "คุณสมชาย",
      phone: "081-xxx-xxxx",
      details: "ระดับน้ำสูงมาก ต้องการเรือด่วน มีผู้ป่วยติดเตียง 1 คนเคลื่อนย้ายไม่ได้",
      status: "pending"
    },
    {
      id: 2,
      type: "Fire",
      severity: "High", // 2. สูง (สีส้ม)
      title: "ไฟไหม้ชุมชนแออัด",
      location: "เขตคลองเตย กทม.",
      distance: "5.0 กม.",
      time: "25 นาทีที่แล้ว",
      reporter: "คุณวิภา",
      phone: "089-xxx-xxxx",
      details: "ไฟลามเร็วมาก ต้องการรถดับเพลิงและรถพยาบาลด่วน",
      status: "pending"
    },
    {
      id: 3,
      type: "Flood",
      severity: "Monitor", // 3. เฝ้าระวัง (สีเหลือง)
      title: "ขาดแคลนอาหารและน้ำดื่ม",
      location: "อ.เมือง จ.เชียงราย",
      distance: "12 กม.",
      time: "1 ชม. ที่แล้ว",
      reporter: "คุณก้อง",
      phone: "090-xxx-xxxx",
      details: "ติดอยู่ในบ้านชั้น 2 ออกไม่ได้ อาหารหมดมา 2 วันแล้ว",
      status: "pending"
    },
    {
      id: 4,
      type: "Storm",
      severity: "Monitor", // 3. เฝ้าระวัง (สีเหลือง)
      title: "ต้นไม้ล้มขวางถนน",
      location: "อ.แม่ริม จ.เชียงใหม่",
      distance: "8.5 กม.",
      time: "2 ชม. ที่แล้ว",
      reporter: "คุณน้อย",
      phone: "082-xxx-xxxx",
      details: "ต้นไม้ใหญ่ล้มทับสายไฟและขวางถนน รถผ่านไม่ได้",
      status: "pending"
    }
  ]);

  const [filter, setFilter] = useState("All"); // All, Critical, NearMe

  // ฟังก์ชันกดรับงาน
  const handleAcceptCase = (id) => {
    const confirm = window.confirm("ยืนยันการรับเคสนี้? ระบบจะแจ้งเตือนไปยังผู้ประสบภัยทันที");
    if (confirm) {
      setCases(cases.map(c => 
        c.id === id ? { ...c, status: "accepted" } : c
      ));
      alert("รับงานสำเร็จ! กรุณารีบเดินทางไปยังจุดเกิดเหตุ");
    }
  };

  // กรองข้อมูลตาม Tab ที่เลือก
  const filteredCases = cases.filter(c => {
    if (filter === "All") return true;
    // ปรับเงื่อนไข Filter ให้ครอบคลุม Critical และ High เมื่อเลือกดูเคสด่วน
    if (filter === "Critical") return c.severity === "Critical" || c.severity === "High";
    // จำลอง Logic ใกล้ฉัน (จริงๆ ต้องคำนวณ Lat/Long)
    if (filter === "NearMe") return parseFloat(c.distance) < 5.0; 
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header & Stats */}
      <div className="bg-white p-4 shadow-sm mb-6 sticky top-0 z-30">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Siren className="text-red-600 animate-pulse" />
            ศูนย์วิทยุกู้ภัย
          </h1>
          <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">
            Online: 24
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            onClick={() => setFilter("All")}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${filter === "All" ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            ทั้งหมด ({cases.length})
          </button>
          <button 
            onClick={() => setFilter("Critical")}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${filter === "Critical" ? "bg-red-600 text-white shadow-red-200 shadow-lg" : "bg-white border border-red-100 text-red-600 hover:bg-red-50"}`}
          >
            วิกฤต/สูง ({cases.filter(c => c.severity === 'Critical' || c.severity === 'High').length})
          </button>
          <button 
            onClick={() => setFilter("NearMe")}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${filter === "NearMe" ? "bg-blue-600 text-white" : "bg-white border border-blue-100 text-blue-600 hover:bg-blue-50"}`}
          >
            ใกล้ฉัน (&lt; 5km)
          </button>
        </div>
      </div>

      {/* Case List Feed */}
      <div className="px-4 space-y-4 max-w-4xl mx-auto">
        {filteredCases.map((item) => (
          <div 
            key={item.id} 
            className={`bg-white rounded-2xl p-5 shadow-sm border-l-4 transition-all hover:shadow-md ${
              item.status === 'accepted' ? 'border-green-500 opacity-70 bg-green-50' : 
              item.severity === 'Critical' ? 'border-red-600' : 
              item.severity === 'High' ? 'border-orange-500' : 'border-yellow-400' // สีเหลืองสำหรับ Monitor
            }`}
          >
            {/* Header Card */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex gap-2 items-center">
                {item.severity === 'Critical' && (
                  <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-md animate-pulse">
                    วิกฤต
                  </span>
                )}
                {item.severity === 'High' && (
                  <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-md">
                    สูง
                  </span>
                )}
                {item.severity === 'Monitor' && (
                  <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-md border border-yellow-200">
                    เฝ้าระวัง
                  </span>
                )}
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {item.time}
                </span>
              </div>
              <span className="text-sm font-bold text-blue-600 flex items-center gap-1">
                <Navigation className="w-3 h-3" /> {item.distance}
              </span>
            </div>

            {/* Content */}
            <h3 className="text-lg font-bold text-gray-800 mb-1">{item.title}</h3>
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.details}</p>
            
            <div className="flex items-center gap-4 text-xs text-gray-500 mb-4 bg-gray-50 p-2 rounded-lg">
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.location}</span>
              <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {item.reporter}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {item.status === 'accepted' ? (
                <button disabled className="w-full bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-default">
                  <CheckCircle className="w-5 h-5" /> รับงานแล้ว
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => handleAcceptCase(item.id)}
                    className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 active:scale-95 transition-transform shadow-lg shadow-slate-200"
                  >
                    รับงานนี้
                  </button>
                  <button className="flex-none bg-white border border-gray-200 text-gray-600 px-4 rounded-xl hover:bg-gray-50">
                    <MapPin className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {filteredCases.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search className="w-8 h-8 text-gray-300" />
            </div>
            <p>ไม่พบรายการแจ้งเหตุในหมวดหมู่นี้</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RescuePage;