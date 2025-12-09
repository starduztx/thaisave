"use client";

// File: src/app/page.jsx
// Location: หน้าแรกสุด (Landing Page) - ปรับปรุง Navigation ใหม่

import { ShieldAlert, Users, Building2, ChevronRight, Siren } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50">
      
      {/* Hero Section */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-600 text-white pt-24 pb-48 px-6 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full -ml-10 -mb-10 blur-2xl"></div>
        
        <div className="container mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-blue-800/50 backdrop-blur-sm px-4 py-2 rounded-full mb-6 border border-blue-400/30 animate-pulse">
            <span className="w-2.5 h-2.5 bg-green-400 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.5)]"></span>
            <span className="text-xs font-semibold tracking-wide uppercase text-blue-100">ระบบพร้อมใช้งาน 24 ชม.</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
            ThaiSave <br/>
            <span className="text-yellow-300 drop-shadow-lg">รวมพลังกู้ภัย</span> ฝ่าวิกฤต
          </h1>
          
          <p className="text-blue-100 text-lg md:text-xl max-w-2xl mx-auto mb-4 leading-relaxed">
            แพลตฟอร์มกลางสำหรับจัดการภัยพิบัติแห่งชาติ
          </p>
          <p className="text-blue-200 text-sm md:text-base font-light">
            เชื่อมต่อผู้ประสบภัย ทีมกู้ภัย และหน่วยงานรัฐ เข้าด้วยกันอย่างรวดเร็วและแม่นยำ
          </p>
        </div>
      </header>

      {/* Main Navigation Cards (3 ปุ่มหลัก) */}
      <section className="container mx-auto px-6 -mt-32 relative z-20 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* 1. สำหรับประชาชน (ไม่ต้อง Login) */}
          <a href="/victim" className="block group">
            <div className="bg-white p-8 rounded-3xl shadow-xl border-b-8 border-red-600 hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer h-full relative overflow-hidden">
              <div className="absolute inset-0 bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                  <div className="bg-red-100 w-16 h-16 rounded-2xl flex items-center justify-center text-red-600 shadow-sm group-hover:scale-110 transition-transform">
                    <ShieldAlert className="w-9 h-9" />
                  </div>
                  <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">
                    ประชาชน
                  </span>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-800 mb-3 group-hover:text-red-700 transition-colors">
                  แจ้งเหตุฉุกเฉิน
                </h3>
                <p className="text-gray-600 mb-6 flex-grow">
                  ขอความช่วยเหลือทันที! ไม่ต้องลงทะเบียน ใช้ AI ช่วยวิเคราะห์พิกัดและประเมินสถานการณ์
                </p>
                
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <div className="w-full bg-red-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 group-hover:bg-red-700 transition-colors">
                    แจ้งเหตุทันที <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          </a>

          {/* 2. สำหรับกู้ภัย (Login) */}
          <a href="/rescue" className="block group">
            <div className="bg-white p-8 rounded-3xl shadow-xl border-b-8 border-blue-600 hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer h-full relative overflow-hidden">
              <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                  <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                    <Siren className="w-9 h-9" />
                  </div>
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
                    เจ้าหน้าที่
                  </span>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-800 mb-3 group-hover:text-blue-700 transition-colors">
                  สำหรับทีมกู้ภัย
                </h3>
                <p className="text-gray-600 mb-6 flex-grow">
                  เข้าสู่ระบบเพื่อรับงาน คัดกรองเคสวิกฤต และอัปเดตสถานะการช่วยเหลือแบบ Real-time
                </p>
                
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <div className="text-blue-600 font-bold flex items-center gap-2 group-hover:underline">
                    เข้าสู่ระบบกู้ภัย <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          </a>

          {/* 3. สำหรับศูนย์สั่งการ (Login) */}
          <a href="/center" className="block group">
            <div className="bg-white p-8 rounded-3xl shadow-xl border-b-8 border-green-600 hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer h-full relative overflow-hidden">
              <div className="absolute inset-0 bg-green-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10 flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                  <div className="bg-green-100 w-16 h-16 rounded-2xl flex items-center justify-center text-green-600 shadow-sm group-hover:scale-110 transition-transform">
                    <Building2 className="w-9 h-9" />
                  </div>
                  <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                    หน่วยงานรัฐ
                  </span>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-800 mb-3 group-hover:text-green-700 transition-colors">
                  ศูนย์สั่งการ
                </h3>
                <p className="text-gray-600 mb-6 flex-grow">
                  Dashboard ภาพรวมสถานการณ์ จัดสรรทรัพยากร และยืนยันข้อมูลผู้ประสบภัย
                </p>
                
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <div className="text-green-600 font-bold flex items-center gap-2 group-hover:underline">
                    เข้าสู่ระบบศูนย์ฯ <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>
          </a>

        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-10 mt-auto border-t border-gray-100">
        <div className="container mx-auto px-6 text-center">
          <p className="text-gray-600 font-medium mb-2">© 2025 ThaiSave Project. All rights reserved.</p>
          <p className="text-gray-400 text-sm">โครงการเพื่อสังคม โดยทีมพัฒนาอาสาสมัคร</p>
        </div>
      </footer>
    </div>
  );
}