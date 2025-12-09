// File: src/app/rescue/layout.jsx
// Location: Layout สำหรับส่วนกู้ภัย (Dashboard Style)

import { Ambulance, List, Map, User, LogOut } from 'lucide-react';

export const metadata = {
  title: "สำหรับกู้ภัย | ThaiSave",
  description: "ระบบบริหารจัดการงานกู้ภัย",
};

export default function RescueLayout({ children }) {
  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      
      {/* 1. Sidebar (แสดงเฉพาะจอใหญ่ Desktop) */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-white flex-col shadow-xl z-20">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-lg">
            <Ambulance className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Rescue Team</h1>
            <p className="text-xs text-slate-400">ThaiSave Portal</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <a href="/rescue" className="flex items-center gap-3 px-4 py-3 bg-blue-600 rounded-xl text-white shadow-md transition-transform hover:scale-105">
            <List className="w-5 h-5" />
            <span>งานทั้งหมด (Feed)</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-xl transition-colors">
            <Map className="w-5 h-5" />
            <span>แผนที่ภาพรวม</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-xl transition-colors">
            <User className="w-5 h-5" />
            <span>งานของฉัน</span>
          </a>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-medium w-full px-4 py-2">
            <LogOut className="w-4 h-4" /> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col h-screen relative">
        
        {/* Mobile Header (แสดงเฉพาะจอมือถือ) */}
        <header className="md:hidden bg-slate-900 text-white p-4 shadow-md flex justify-between items-center z-20">
          <div className="flex items-center gap-2">
            <Ambulance className="w-6 h-6 text-blue-400" />
            <span className="font-bold text-lg">Rescue</span>
          </div>
          <button className="p-2 text-slate-300">
            <User className="w-6 h-6" />
          </button>
        </header>

        {/* Content Scrollable Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}