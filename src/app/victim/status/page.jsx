"use client";
import { useState, useEffect, useRef } from 'react';
import { db } from '../../../lib/db';
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
// ✅ เพิ่ม increment ใน import
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, serverTimestamp, increment } from "firebase/firestore";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Send, MessageCircle, UserCheck, Handshake, Truck, Home, ShieldCheck, FileText, X, Menu } from 'lucide-react';
import Footer from '../../../components/Footer';
import dynamic from 'next/dynamic';



// ฟังก์ชันแยกข้อความ (Utility) - เหมือนเดิม
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

        if (meta.includes("ผู้ประสบภัย")) sender = "me";
        else sender = "officer";
      }
      chatLogs.push({ sender, time, message, original: part });
    } else {
      cleanDescParts.push(part);
    }
  });

  return { cleanDesc: cleanDescParts.join('\n\n'), chatLogs };
};

// ✅ Import Map แบบ Dynamic (เพื่อแก้ปัญหา window is not defined)
const LiveTrackingMap = dynamic(() => import('../../../components/map/LiveTrackingMap'), {
  ssr: false,
  loading: () => <div className="w-full h-[300px] bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-gray-400">กำลังโหลดแผนที่...</div>
});

export default function TrackingPage() {
  const [user, setUser] = useState(null);
  const [myReport, setMyReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // State Chat
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
  }, [isChatOpen, myReport, isSending]);

  // ✅ LOGIC ใหม่: เมื่อเปิดแชท ให้ล้างจำนวนข้อความที่ยังไม่อ่านของฝั่งเรา (unreadForVictim = 0)
  useEffect(() => {
    if (isChatOpen && myReport && myReport.unreadForVictim > 0) {
      const reportRef = doc(db, "reports", myReport.id);
      updateDoc(reportRef, { unreadForVictim: 0 }).catch(err => console.error("Clear badge error", err));
    }
  }, [isChatOpen, myReport]);

  const getCurrentStepIndex = (status) => {
    if (status === 'completed') return 5;
    if (status === 'traveling') return 4;
    if (status === 'accepted') return 3;
    if (status === 'investigating') return 2;
    return 1;
  };

  const steps = [
    { id: 1, label: "ส่งเรื่องแล้ว", icon: FileText },
    { id: 2, label: "กำลังตรวจสอบ", icon: UserCheck },
    { id: 3, label: "รับเคสแล้ว", icon: Handshake },
    { id: 4, label: "กู้ภัยกำลังเดินทางมาหาคุณ", icon: Truck },
    { id: 5, label: "ปิดเคส", icon: Home },
  ];

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;
    setIsSending(true);
    try {
      const reportRef = doc(db, "reports", myReport.id);
      const timeString = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

      // Append Message
      const newLog = `\n\n💬 [ผู้ประสบภัย ${timeString}]: ${chatMessage}`;
      const newDescription = (myReport.description || "") + newLog;

      await updateDoc(reportRef, {
        description: newDescription,
        lastUpdated: serverTimestamp(),
        // ✅ LOGIC ใหม่: เมื่อเราส่งข้อความ ให้เพิ่มเลขแจ้งเตือนฝั่งกู้ภัยทีละ 1
        unreadForRescuer: increment(1)
      });
      setChatMessage('');
    } catch (error) {
      console.error("Chat Error:", error);
      alert("ส่งไม่สำเร็จ: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleLogout = async () => {
    const auth = getAuth(db.app);
    await signOut(auth);
    router.push('/login');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  const currentStep = myReport ? getCurrentStepIndex(myReport.status) : 0;
  const { cleanDesc, chatLogs } = myReport ? parseReportData(myReport.description) : { cleanDesc: "", chatLogs: [] };

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      {/* Navbar */}
      <nav className="bg-[#1E3A8A] text-white w-full shadow-md sticky top-0 z-50">
        <div className="w-full px-6 py-4 flex justify-between items-center">
          <div className="flex flex-col">
            <Link href="/" className="text-2xl font-bold tracking-tight hover:opacity-90 transition">
              ThaiSave(ไทยเซฟ)
            </Link>
            <span className="text-[11px] text-blue-200 font-light tracking-widest opacity-80">
              ระบบกลางจัดการภัยพิบัติแห่งชาติ
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link href="/center" className="hover:text-yellow-400 transition">แดชบอร์ด</Link>
            <Link href="/rescue" className="hover:text-yellow-400 transition">ช่วยเหลือ/กู้ภัย</Link>
            <div className="flex bg-white rounded-lg shadow-sm border border-transparent hover:border-gray-300 transition overflow-hidden">
              <Link href="/victim">
                <button className="px-4 py-2 text-[#1E3A8A] text-sm font-bold hover:bg-gray-100 transition h-full border-r border-gray-200">
                  แจ้งเหตุ
                </button>
              </Link>
              <Link href="/victim/status">
                <button className="px-4 py-2 text-[#1E3A8A] text-sm font-bold hover:bg-gray-100 transition h-full">
                  สถานะ
                </button>
              </Link>
            </div>
          </div>
          <button className="md:hidden text-white">
            <Menu size={28} />
          </button>
        </div>
      </nav>

      <main className="flex-grow container mx-auto px-4 py-8 max-w-4xl">
        {/* Header*/}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4 text-gray-800">
            <Link href="/" className="hover:bg-gray-200 p-2 rounded-full transition">
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-2xl font-bold">Track Case ติดตามสถานะ</h1>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow transition"
          >
            + แจ้งเหตุใหม่
          </button>
        </div>

        {!myReport && (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-200">
            <p className="text-gray-500 mb-6 font-medium">ไม่พบรายการแจ้งเหตุของคุณ</p>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-2 rounded-lg font-bold shadow-md transition"
            >
              แจ้งเหตุใหม่ทันที
            </button>
          </div>
        )}

        {myReport && (
          <>
            {/* Main Status Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 relative transition-all">
              <div className="absolute left-0 top-0 bottom-0 w-2 bg-green-500 z-10"></div>
              <div className="p-6">
                {/* Header Info (เหมือนเดิม) */}
                <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
                  <div>
                    <p className="text-sm text-gray-500 font-semibold mb-1">Ticket ID: #{myReport.id.slice(0, 6)}</p>
                    <div className="flex items-center gap-2">
                      {myReport.responderName ? (
                        <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                          <ShieldCheck size={16} />
                          <span className="text-xs font-bold">{myReport.responderName} กำลังดูแลคุณ</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
                          <Loader2 size={16} className="animate-spin" />
                          <span className="text-xs font-bold">รอเจ้าหน้าที่รับเรื่อง</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Timeline (เหมือนเดิม) */}
                <div className="relative mb-24 px-2 md:px-4">
                  <div className="flex items-start w-full">
                    {steps.map((step, index) => {
                      const isActive = step.id <= currentStep;
                      const Icon = step.icon;
                      const isLast = index === steps.length - 1;

                      return (
                        <div key={step.id} className={`flex-1 flex items-center ${isLast ? 'flex-grow-0' : ''}`}>
                          <div className="flex items-center w-full">
                            {/* Step Node (Circle + Absolute Label) */}
                            <div className="relative z-10 flex flex-col items-center">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-4 
                                     ${isActive ? 'bg-white border-green-500 text-green-600 shadow-md scale-110' : 'bg-white border-gray-200 text-gray-300'}`}>
                                {isActive ? <span className="text-sm font-bold">{step.id}</span> : <span className="text-sm font-bold text-gray-300">{step.id}</span>}
                              </div>
                              <div className="absolute top-12 left-1/2 -translate-x-1/2 w-24 flex flex-col items-center gap-1">
                                <Icon size={16} className={isActive ? 'text-green-600' : 'text-gray-300'} />
                                <span className={`text-[10px] md:text-xs text-center font-bold px-1 rounded whitespace-normal
                                            ${isActive ? 'text-green-700' : 'text-gray-400'}
                                        `}>
                                  {step.label}
                                </span>
                              </div>
                            </div>

                            {/* Connector Line */}
                            {!isLast && (
                              <div className={`flex-1 h-2 -ml-1 -mr-1 relative z-0 ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-100'} transition-colors duration-500`}></div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Live Tracking Map */}
                {(myReport.status === 'traveling' || myReport.status === 'accepted') && (
                  <div className="px-6 pb-6">
                    <div className="mb-2 flex justify-between items-center">
                      <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        {myReport.status === 'traveling' ? '🚑 เจ้าหน้าที่กำลังเดินทางมาหาคุณ' : '📍 พิกัดจุดเกิดเหตุ'}
                      </h3>
                      {myReport.status === 'traveling' && (
                        <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full animate-pulse">
                          LIVE TRACKING
                        </span>
                      )}
                    </div>

                    {/* เรียกใช้ Component แผนที่ */}
                    <LiveTrackingMap
                      victimLat={myReport.latitude}
                      victimLng={myReport.longitude}
                      rescuerLat={myReport.rescuerLat} // รับค่าจากที่กู้ภัยส่งมา
                      rescuerLng={myReport.rescuerLng}
                    />
                  </div>
                )}

                {/* Info & Actions */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-4 mt-6 pt-6 border-t border-gray-100">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      {myReport.disasterType} <span className="text-sm font-normal text-gray-500">({myReport.province})</span>
                    </h2>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">รายละเอียด: {cleanDesc}</p>
                    <p className="text-xs text-gray-400 mt-2">อัปเดตล่าสุด: {myReport.lastUpdated ? myReport.lastUpdated.toDate().toLocaleTimeString('th-TH') : "เมื่อสักครู่"}</p>
                  </div>

                  {(myReport.status === 'accepted' || myReport.status === 'traveling' || myReport.status === 'completed') && (
                    <button
                      onClick={() => setIsChatOpen(!isChatOpen)}
                      className={`relative px-6 py-2.5 rounded-lg font-bold shadow-sm transition-all duration-300 flex items-center gap-2 whitespace-nowrap text-sm
                                                ${isChatOpen
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-blue-600 text-white hover:bg-blue-700 animate-pulse-slow'}
                                            `}
                    >
                      {/* ✅ UI ใหม่: Badge แจ้งเตือนข้อความ */}
                      {!isChatOpen && myReport.unreadForVictim > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-bounce">
                          {myReport.unreadForVictim}
                        </span>
                      )}

                      {isChatOpen ? (<><X size={18} /> ซ่อนแชท</>) : (<><MessageCircle size={18} /> ติดต่อเจ้าหน้าที่</>)}
                    </button>
                  )}
                </div>
              </div>

              {/* Sliding Chat Area (เหมือนเดิม) */}
              <div className={`transition-all duration-500 ease-in-out overflow-hidden bg-gray-50 border-t border-gray-100 ${isChatOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="flex flex-col h-[500px]">
                  <div className="flex-grow p-6 overflow-y-auto space-y-4 bg-gray-50/50">
                    {chatLogs.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                        <MessageCircle size={48} className="mb-2" />
                        <p>ถาม-ตอบ ข้อมูลเพิ่มเติมกับเจ้าหน้าที่</p>
                      </div>
                    ) : (
                      chatLogs.map((log, index) => (
                        <div key={index} className={`flex flex-col ${log.sender === 'me' ? 'items-end' : 'items-start'}`}>
                          <div className={`px-5 py-3 rounded-2xl text-sm max-w-[85%] shadow-sm relative ${log.sender === 'me' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'}`}>
                            {log.message}
                          </div>
                          <span className="text-[10px] text-gray-400 mt-1 mx-2 font-medium">{log.sender === 'me' ? 'คุณ' : 'จนท.'} • {log.time}</span>
                        </div>
                      ))
                    )}
                    <div ref={chatBottomRef}></div>
                  </div>
                  <div className="p-4 bg-white border-t border-gray-200">
                    <div className="flex gap-2 items-center bg-gray-100 p-2 rounded-xl border border-transparent focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                      <input
                        type="text"
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="พิมพ์ข้อความถึงเจ้าหน้าที่..."
                        className="flex-grow bg-transparent border-none outline-none text-gray-700 text-sm py-2 px-3"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={isSending || !chatMessage.trim()}
                        className={`p-2 rounded-lg transition-all transform hover:scale-105 active:scale-95 ${chatMessage.trim() ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                      >
                        {isSending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}