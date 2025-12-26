"use client";
// File: src/app/rescue/page.js
// หน้าที่: Dashboard กู้ภัย (ปรับ UI ปุ่มอยู่ด้านล่าง แนวนอน 3 ปุ่ม)

import { useState, useEffect, useRef } from 'react';
import { db } from '../../lib/db';
import { collection, query, orderBy, onSnapshot, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import Link from 'next/link';
import { MapPin, Phone, Clock, CheckCircle, AlertTriangle, Filter, ChevronDown, User, Menu, Image as ImageIcon, X, Truck, MessageCircle, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

// --- UTILITY: แยกข้อความ Description กับ Chat ---
const parseReportData = (fullDescription) => {
  if (!fullDescription) return { cleanDesc: "", chatLogs: [] };
  const parts = fullDescription.split('\n\n');
  const cleanDescParts = [];
  const chatLogs = [];

  parts.forEach(part => {
    if (part.trim().startsWith('💬')) {
      const firstColonIndex = part.indexOf(']:');
      let sender = "unknown";
      let time = "";
      let message = part;

      if (firstColonIndex !== -1) {
        const meta = part.substring(0, firstColonIndex);
        message = part.substring(firstColonIndex + 2).trim();
        const timeMatch = meta.match(/(\d{2}:\d{2})/);
        time = timeMatch ? timeMatch[0] : "";
        if (meta.includes("ผู้ประสบภัย")) sender = "user";
        else if (meta.includes("เจ้าหน้าที่")) sender = "officer";
      }
      chatLogs.push({ sender, time, message, original: part });
    } else {
      cleanDescParts.push(part);
    }
  });

  return { cleanDesc: cleanDescParts.join('\n\n'), chatLogs };
};

// --- SUB-COMPONENT: ปุ่มจัดการสถานะ (Status Button) ---
function StatusActionButton({ report, user }) {
  const [loading, setLoading] = useState(false);

  const handleUpdateStatus = async (newStatus) => {
    if (!user) { alert("รอโหลดข้อมูลผู้ใช้..."); return; }
    let confirmMsg = "";
    if (newStatus === 'accepted') confirmMsg = "ยืนยันที่จะ 'รับเคสนี้' ?";
    else if (newStatus === 'traveling') confirmMsg = "พร้อม 'ออกเดินทาง' ช่วยเหลือ ?";
    else if (newStatus === 'completed') confirmMsg = "ช่วยเหลือสำเร็จและต้องการ 'ปิดเคส' ?";

    if (!confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const reportRef = doc(db, "reports", report.id);
      let updateData = { status: newStatus, lastUpdated: serverTimestamp() };

      if (newStatus === 'accepted') {
        const rescuerName = user.name || user.displayName || user.email || 'จนท.กู้ภัย';
        updateData.responderId = user.uid;
        updateData.responderName = rescuerName;
        updateData.acceptedAt = new Date();
      }
      if (newStatus === 'completed') updateData.completedAt = new Date();

      await updateDoc(reportRef, updateData);
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ปุ่มสถานะต่างๆ (ปรับ w-full ให้เต็มพื้นที่ flex-1)
  if (report.status === 'pending') {
    return (
      <button onClick={() => handleUpdateStatus('accepted')} disabled={loading} className="w-full h-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white py-2.5 rounded-lg font-medium shadow-sm transition-colors text-sm flex items-center justify-center gap-2">
        <CheckCircle size={18} /> รับเคสนี้
      </button>
    );
  }
  if (report.status === 'accepted') {
    return (
      <button onClick={() => handleUpdateStatus('traveling')} disabled={loading} className="w-full h-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-lg font-medium shadow-sm transition-colors text-sm flex items-center justify-center gap-2 animate-pulse">
        <Truck size={18} /> ออกเดินทาง
      </button>
    );
  }
  if (report.status === 'traveling') {
    return (
      <button onClick={() => handleUpdateStatus('completed')} disabled={loading} className="w-full h-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-medium shadow-sm transition-colors text-sm flex items-center justify-center gap-2">
        <MapPin size={18} /> ถึงจุดหมาย / ปิดเคส
      </button>
    );
  }
  if (report.status === 'completed') {
    return (
      <button disabled className="w-full h-full bg-gray-100 text-gray-400 py-2.5 rounded-lg font-medium border border-gray-200 cursor-not-allowed text-sm flex items-center justify-center gap-2">
        <CheckCircle size={18} /> เสร็จสิ้น
      </button>
    );
  }
  return null;
}

// --- SUB-COMPONENT: Chat Modal ---
function RescueChatModal({ report, onClose, user }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const { chatLogs } = parseReportData(report.description);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatLogs]);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const timeString = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      const newLog = `\n\n💬 [เจ้าหน้าที่ ${timeString}]: ${message}`;
      const reportRef = doc(db, "reports", report.id);
      await updateDoc(reportRef, { description: report.description + newLog, lastUpdated: serverTimestamp() });
      setMessage("");
    } catch (e) { alert("ส่งไม่สำเร็จ: " + e.message); } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200">
        <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-2"><MessageCircle size={20} /><div><h3 className="font-bold text-sm">แชทกับผู้แจ้งเหตุ</h3><p className="text-[10px] opacity-80">{report.disasterType}</p></div></div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded"><X size={20} /></button>
        </div>
        <div className="flex-grow overflow-y-auto p-4 bg-slate-50 space-y-3 min-h-[300px]">
          {chatLogs.length === 0 ? <div className="text-center text-gray-400 text-xs mt-10">-- ยังไม่มีการสนทนา --</div> :
            chatLogs.map((log, i) => (
              <div key={i} className={`flex flex-col ${log.sender === 'officer' ? 'items-end' : 'items-start'}`}>
                <div className={`px-3 py-2 rounded-lg text-sm max-w-[85%] shadow-sm ${log.sender === 'officer' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'}`}>{log.message}</div>
                <span className="text-[10px] text-gray-400 mt-1 mx-1">{log.sender === 'officer' ? 'คุณ' : 'ผู้แจ้ง'} • {log.time}</span>
              </div>
            ))
          }
          <div ref={bottomRef}></div>
        </div>
        <div className="p-3 bg-white border-t border-gray-200 flex gap-2">
          <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="พิมพ์ข้อความ..." className="flex-grow bg-gray-100 border-none rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
          <button onClick={handleSend} disabled={sending || !message.trim()} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition">{sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}</button>
        </div>
      </div>
    </div>
  );
}

// --- MAIN PAGE ---
export default function RescueDashboard() {
  const [viewingImage, setViewingImage] = useState(null);
  const [chatReport, setChatReport] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => { try { await logout(); router.push('/login'); } catch (error) { console.error("Logout failed", error); } };

  const [stats, setStats] = useState({ new: 0, accepted: 0, completed: 0, total: 0 });

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "reports"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate() }));
      setReports(items);
      setStats({
        new: items.filter(i => i.status === 'pending').length,
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
            <Link href="/center" className="hover:text-yellow-400 transition opacity-80 hover:opacity-100">แดชบอร์ด</Link>
            <span className="text-yellow-400 font-bold border-b-2 border-yellow-400 pb-1 cursor-default">ช่วยเหลือ/กู้ภัย</span>

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

                      {/* HEADER: สถานะ & เวลา */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {item.status === 'pending' && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">วิกฤต/รอการช่วยเหลือ</span>}
                          {item.status === 'accepted' && <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">รับเคสแล้ว</span>}
                          {item.status === 'traveling' && <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase animate-pulse">กำลังเดินทาง</span>}
                          {item.status === 'completed' && <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">เสร็จสิ้น</span>}
                          <span className="text-gray-500 text-xs">{item.location || 'อ.หาดใหญ่ จ.สงขลา'}</span>
                        </div>
                        <span className="text-gray-400 text-xs">{timeAgo(item.timestamp)}</span>
                      </div>

                      {/* BODY: เนื้อหา */}
                      <div className="mb-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{item.disasterType} <span className="text-sm font-normal text-gray-500">ระยะห่าง 6.7 กิโลเมตร</span></h3>
                        <div className="text-xs text-gray-500 mb-2">
                          ผู้แจ้ง: {item.contactName || 'คุณสมชาย'} ({item.contactPhone || '081-xxx-xxxx'})
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm text-gray-700 italic">
                          "{cleanDesc || item.description}"
                        </div>
                      </div>

                      {/* FOOTER: ปุ่ม Action (Layout ใหม่: แนวนอนด้านล่าง) */}
                      <div className="flex flex-col md:flex-row gap-3 pt-4 border-t border-gray-100">

                        {/* 1. ปุ่มดูรูป (สีขาว) */}
                        {item.imageUrl ? (
                          <button onClick={() => setViewingImage(item.imageUrl)} className="flex-1 flex items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300 py-2.5 rounded-lg font-medium transition-colors shadow-sm text-sm">
                            <ImageIcon size={18} /> ดูภาพหลักฐาน
                          </button>
                        ) : (
                          <button disabled className="flex-1 flex items-center justify-center gap-2 bg-gray-50 text-gray-400 border border-gray-200 py-2.5 rounded-lg font-medium text-sm cursor-not-allowed">
                            <ImageIcon size={18} /> ไม่มีภาพ
                          </button>
                        )}

                        {/* 2. ปุ่มดูแผนที่ (สีเทาเข้ม) */}
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.location || 'Thailand')}`} target="_blank" rel="noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-700 text-white py-2.5 rounded-lg font-medium transition-colors shadow-sm text-sm">
                          <MapPin size={18} /> ดูแผนที่
                        </a>

                        {/* 3. ปุ่มเปลี่ยนสถานะ (สีน้ำเงิน/เขียว/ส้ม) */}
                        <div className="flex-1 h-full">
                          <StatusActionButton report={item} user={user} />
                        </div>

                        {/* แถม: ปุ่มแชท (เฉพาะตอนรับเคสแล้ว) */}
                        {(item.status === 'accepted' || item.status === 'traveling') && (
                          <button onClick={() => router.push(`/rescue/status?id=${item.id}`)} className="flex-none px-3 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition">
                            <MessageCircle size={20} />
                          </button>
                        )}
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
      {chatReport && <RescueChatModal report={chatReport} user={user} onClose={() => setChatReport(null)} />}
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