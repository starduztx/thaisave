"use client";
import { useState, useEffect, useRef } from 'react';
import { db } from '../../../lib/db'; // เช็ค path ให้ถูกกับโปรเจคของคุณ
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import Link from 'next/link';
import { ArrowLeft, Loader2, Send, X, MessageCircle, UserCheck, Handshake, Siren, Home, ShieldCheck, FileText, Truck } from 'lucide-react';

// ฟังก์ชันแยกข้อความ (Utility)
const parseReportData = (fullDescription) => {
    if (!fullDescription) return { cleanDesc: "", chatLogs: [] };

    // แยกด้วย \n\n
    const parts = fullDescription.split('\n\n');
    const cleanDescParts = [];
    const chatLogs = [];

    parts.forEach(part => {
        if (part.trim().startsWith('💬')) {
            // format: 💬 [ผู้ประสบภัย 10:30]: ข้อความ
            const firstColonIndex = part.indexOf(']:');
            let sender = "unknown";
            let time = "";
            let message = part;

            if (firstColonIndex !== -1) {
                const meta = part.substring(0, firstColonIndex);
                message = part.substring(firstColonIndex + 2).trim();
                
                const timeMatch = meta.match(/(\d{2}:\d{2})/);
                time = timeMatch ? timeMatch[0] : "";
                
                if (meta.includes("ผู้ประสบภัย")) sender = "me"; // ฝั่งเรา (User)
                else sender = "officer"; // ฝั่งเจ้าหน้าที่
            }
            chatLogs.push({ sender, time, message, original: part });
        } else {
            cleanDescParts.push(part);
        }
    });

    return { cleanDesc: cleanDescParts.join('\n\n'), chatLogs };
};

export default function TrackingPage() {
  const [user, setUser] = useState(null);
  const [myReport, setMyReport] = useState(null);
  const [loading, setLoading] = useState(true);

  // State สำหรับ Chat
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (!db) return;
    const auth = getAuth(db.app);
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
      else setLoading(false);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "reports"),
      where("userId", "==", user.uid),
      orderBy("timestamp", "desc"),
      limit(1)
    );
    const unsubFirestore = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        setMyReport({ id: snapshot.docs[0].id, ...docData });
      } else {
        setMyReport(null);
      }
      setLoading(false);
    });
    return () => unsubFirestore();
  }, [user]);

  // Auto Scroll Chat
  useEffect(() => {
    if (isChatOpen && chatBottomRef.current) {
        chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [isChatOpen, myReport]);

  // --- Logic Timeline (Update ล่าสุด) ---
  const getCurrentStepIndex = (status) => {
    if (status === 'completed') return 5;
    if (status === 'traveling') return 4; // กำลังเดินทาง = 4
    if (status === 'accepted') return 3;  // รับเคส = 3
    return 1;
  };

  const steps = [
    { id: 1, label: "ส่งเรื่องแล้ว", icon: FileText },
    { id: 2, label: "กำลังตรวจสอบ", icon: UserCheck },
    { id: 3, label: "รับเคสแล้ว", icon: Handshake },
    { id: 4, label: "กำลังเดินทาง", icon: Truck }, // ใช้ icon Truck หรือ Siren
    { id: 5, label: "ปิดเคส", icon: Home },
  ];

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;
    setIsSending(true);
    try {
      const reportRef = doc(db, "reports", myReport.id);
      const timeString = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      
      // Append ข้อความลงไป
      const newLog = `\n\n💬 [ผู้ประสบภัย ${timeString}]: ${chatMessage}`;
      const newDescription = (myReport.description || "") + newLog;

      await updateDoc(reportRef, {
        description: newDescription,
        lastUpdated: serverTimestamp()
      });
      setChatMessage('');
    } catch (error) {
      console.error("Chat Error:", error);
      alert("ส่งไม่สำเร็จ: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#1E1E2E]"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;

  const currentStep = myReport ? getCurrentStepIndex(myReport.status) : 0;
  const { cleanDesc, chatLogs } = myReport ? parseReportData(myReport.description) : { cleanDesc: "", chatLogs: [] };

  return (
    <div className="min-h-screen bg-[#1E1E2E] font-sans pb-20 p-4 flex flex-col items-center">

      {/* Header */}
      <div className="w-full max-w-3xl mb-6 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
            <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition"><ArrowLeft size={24} /></Link>
            <h1 className="text-xl font-bold">Track Case ติดตามสถานะ</h1>
        </div>
        <Link href="/victim">
            <button className="bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-white/20 border border-white/20">
            + แจ้งเหตุใหม่
            </button>
        </Link>
      </div>

      <div className="w-full max-w-3xl space-y-6">

        {!myReport && (
          <div className="text-center py-20 bg-white rounded-xl shadow-lg">
            <p className="text-gray-500 mb-6">ไม่พบรายการแจ้งเหตุของคุณ</p>
            <Link href="/victim"><button className="bg-red-600 text-white px-8 py-2 rounded-lg font-bold">แจ้งเหตุใหม่</button></Link>
          </div>
        )}

        {myReport && (
          <div className="bg-white rounded-xl shadow-xl overflow-hidden border-l-4 border-green-500 relative transition-all">
            
            {/* 1. Header & Timeline */}
            <div className="p-6">
                <div className="mb-6 flex justify-between items-start">
                    <p className="font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-full text-sm">
                        Ticket ID : #{myReport.id.slice(0, 6)}
                    </p>
                    {myReport.responderName && (
                        <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                             <ShieldCheck size={16} />
                             <span className="text-sm font-bold">{myReport.responderName} กำลังดูแล</span>
                        </div>
                    )}
                </div>

                {/* Timeline */}
                <div className="relative mb-8 mt-4 mx-2">
                    {/* เส้นพื้นหลัง */}
                    <div className="absolute top-[20px] left-0 right-0 h-1 bg-gray-200 -z-0 mx-8"></div>
                    
                    {/* เส้น Progress */}
                    <div 
                        className="absolute top-[20px] left-0 h-1 bg-green-500 -z-0 mx-8 transition-all duration-700 ease-out"
                        style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                    ></div>

                    <div className="flex justify-between items-start relative z-10">
                    {steps.map((step) => {
                        const isActive = step.id <= currentStep;
                        const Icon = step.icon;
                        return (
                        <div key={step.id} className="flex flex-col items-center gap-2 w-20">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-sm border-2
                                ${isActive ? 'bg-green-500 border-green-500 text-white scale-110 shadow-md' : 'bg-white border-gray-300 text-gray-300'}
                            `}>
                                <Icon size={18} />
                            </div>
                            <span className={`text-[10px] md:text-xs text-center font-medium
                                ${isActive ? 'text-green-600 font-bold' : 'text-gray-400'}
                            `}>
                            {step.label}
                            </span>
                        </div>
                        );
                    })}
                    </div>
                </div>

                {/* Info & Chat Toggle */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex-grow">
                        <h3 className="font-bold text-gray-900 text-lg">{myReport.disasterType}</h3>
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{cleanDesc}</p>
                        <p className="text-xs text-gray-400 mt-2">อัปเดต: {myReport.lastUpdated ? myReport.lastUpdated.toDate().toLocaleTimeString('th-TH') : "เมื่อสักครู่"}</p>
                    </div>

                    {/* ปุ่มกดเปิดแชท (แสดงเมื่อรับเคสแล้ว หรือ กำลังเดินทาง) */}
                    {(myReport.status === 'accepted' || myReport.status === 'traveling') && (
                        <button
                            onClick={() => setIsChatOpen(!isChatOpen)}
                            className={`px-6 py-2.5 rounded-lg font-bold shadow-sm transition-all duration-300 flex items-center gap-2 whitespace-nowrap text-sm
                                ${isChatOpen 
                                    ? 'bg-gray-500 hover:bg-gray-600 text-white' 
                                    : 'bg-[#2563EB] hover:bg-blue-700 text-white animate-pulse-slow'}
                            `}
                        >
                            {isChatOpen ? (<><X size={18} /> ซ่อนแชท</>) : (<><MessageCircle size={18} /> อัปเดตสถานการณ์</>)}
                        </button>
                    )}
                </div>
            </div>

            {/* 2. Slide Down Chat Area */}
            <div 
                className={`transition-all duration-500 ease-in-out overflow-hidden bg-white border-t border-gray-100
                    ${isChatOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
                `}
            >
                <div className="p-4 bg-slate-50 flex flex-col h-[400px]">
                    {/* Chat Logs */}
                    <div className="flex-grow p-4 space-y-3 overflow-y-auto mb-4 border border-gray-200 rounded-lg bg-white shadow-inner">
                         {chatLogs.length === 0 ? (
                            <div className="text-center text-xs text-gray-400 my-10">-- เริ่มต้นการสนทนา --</div>
                         ) : (
                            chatLogs.map((log, index) => (
                                <div key={index} className={`flex flex-col ${log.sender === 'me' ? 'items-end' : 'items-start'}`}>
                                    <div className={`px-4 py-2 rounded-2xl text-sm max-w-[80%] shadow-sm
                                        ${log.sender === 'me' 
                                            ? 'bg-blue-600 text-white rounded-br-none' 
                                            : 'bg-gray-200 text-gray-800 rounded-bl-none'}
                                    `}>
                                        {log.message}
                                    </div>
                                    <span className="text-[10px] text-gray-400 mt-1 mx-2">
                                        {log.sender === 'me' ? 'คุณ' : 'จนท.'} • {log.time}
                                    </span>
                                </div>
                            ))
                         )}
                         <div ref={chatBottomRef}></div>
                    </div>

                    {/* Input */}
                    <div className="flex gap-2 items-center bg-white p-2 rounded-xl shadow-sm border border-gray-200">
                        <input
                            type="text"
                            value={chatMessage}
                            onChange={(e) => setChatMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="พิมพ์ข้อความ..."
                            className="flex-grow bg-transparent border-none outline-none text-gray-700 text-sm py-2 px-2"
                        />
                        <button
                            onClick={handleSendMessage}
                            disabled={isSending || !chatMessage.trim()}
                            className={`p-2 rounded-lg transition-colors
                                ${chatMessage.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                            `}
                        >
                            {isSending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                        </button>
                    </div>
                </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}