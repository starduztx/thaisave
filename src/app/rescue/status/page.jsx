"use client";
import { useState, useEffect, useRef, Suspense } from 'react';
import { db } from '../../../lib/db';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Send, X, MessageCircle, UserCheck, Handshake, Truck, Home, ShieldCheck, FileText, User, CheckCircle, MapPin, Menu } from 'lucide-react';
import Footer from '../../../components/Footer';

// ฟังก์ชันแยกข้อความ (Same logic)
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

                // ** LOGIC FOR RESCUE TEAM **
                if (meta.includes("เจ้าหน้าที่")) sender = "me"; // เจ้าหน้าที่ = ฉัน
                else sender = "victim"; // ผู้ประสบภัย = เขา
            }
            chatLogs.push({ sender, time, message, original: part });
        } else {
            cleanDescParts.push(part);
        }
    });

    return { cleanDesc: cleanDescParts.join('\n\n'), chatLogs };
};

function RescueStatusContent() {
    const [user, setUser] = useState(null);
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    // Use SearchParams for Rescue (Specific Case ID)
    const searchParams = useSearchParams();
    const reportId = searchParams.get('id');

    // State
    const [isChatOpen, setIsChatOpen] = useState(false); // Default Closed like original
    const [chatMessage, setChatMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const chatBottomRef = useRef(null);

    useEffect(() => {
        if (!db) return;
        const auth = getAuth(db.app);
        const unsubAuth = onAuthStateChanged(auth, (u) => {
            if (u) setUser(u);
        });
        return () => unsubAuth();
    }, []);

    // Fetch Report by ID (Rescue Mode)
    useEffect(() => {
        if (!reportId) {
            setLoading(false);
            return;
        }
        const reportRef = doc(db, "reports", reportId);
        const unsubFirestore = onSnapshot(reportRef, (docSnap) => {
            if (docSnap.exists()) {
                setReport({ id: docSnap.id, ...docSnap.data() });
            } else {
                setReport(null);
            }
            setLoading(false);
        });
        return () => unsubFirestore();
    }, [reportId]);

    // Auto Scroll Chat
    useEffect(() => {
        if (isChatOpen && chatBottomRef.current) {
            chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [isChatOpen, report, isSending]);

    const getCurrentStepIndex = (status) => {
        if (status === 'completed') return 5;
        if (status === 'traveling') return 4;
        if (status === 'accepted') return 3;
        return 1;
    };

    const steps = [
        { id: 1, label: "ส่งเรื่องแล้ว", icon: FileText },
        { id: 2, label: "กำลังตรวจสอบ", icon: UserCheck },
        { id: 3, label: "รับเคสแล้ว", icon: Handshake },
        { id: 4, label: "กำลังเดินทาง", icon: Truck },
        { id: 5, label: "ปิดเคส", icon: Home },
    ];

    const handleSendMessage = async () => {
        if (!chatMessage.trim()) return;
        setIsSending(true);
        try {
            const reportRef = doc(db, "reports", report.id);
            const timeString = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

            // ** Send as Officer **
            const newLog = `\n\n💬 [เจ้าหน้าที่ ${timeString}]: ${chatMessage}`;
            const newDescription = (report.description || "") + newLog;

            await updateDoc(reportRef, {
                description: newDescription,
                lastUpdated: serverTimestamp()
            });
            setChatMessage('');
        } catch (error) {
            alert("ส่งไม่สำเร็จ: " + error.message);
        } finally {
            setIsSending(false);
        }
    };

    const handleUpdateStatus = async (newStatus) => {
        if (!user) { alert("กรุณาเข้าสู่ระบบก่อน"); return; }

        let confirmMsg = "";
        if (newStatus === 'accepted') confirmMsg = "ยืนยันที่จะ 'รับเคสนี้' ?";
        else if (newStatus === 'traveling') confirmMsg = "พร้อม 'ออกเดินทาง' ช่วยเหลือ ?";
        else if (newStatus === 'completed') confirmMsg = "ช่วยเหลือสำเร็จและต้องการ 'ปิดเคส' ?";

        if (!confirm(confirmMsg)) return;

        try {
            const reportRef = doc(db, "reports", report.id);
            let updateData = { status: newStatus, lastUpdated: serverTimestamp() };

            if (newStatus === 'accepted') {
                const rescuerName = user.displayName || user.email || 'จนท.กู้ภัย';
                updateData.responderId = user.uid;
                updateData.responderName = rescuerName;
                updateData.acceptedAt = new Date();
            }
            if (newStatus === 'completed') updateData.completedAt = new Date();

            await updateDoc(reportRef, updateData);
        } catch (error) {
            alert("Error: " + error.message);
        }
    };

    // Helper to render the action button
    const renderActionButton = () => {
        if (report.status === 'pending') {
            return (
                <button
                    onClick={() => handleUpdateStatus('accepted')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm transition flex items-center gap-2"
                >
                    <CheckCircle size={18} /> รับเคสนี้
                </button>
            );
        }
        if (report.status === 'accepted') {
            return (
                <button
                    onClick={() => handleUpdateStatus('traveling')}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm transition flex items-center gap-2 animate-pulse"
                >
                    <Truck size={18} /> ออกเดินทาง
                </button>
            );
        }
        if (report.status === 'traveling') {
            return (
                <button
                    onClick={() => handleUpdateStatus('completed')}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-sm transition flex items-center gap-2"
                >
                    <MapPin size={18} /> ถึงจุดหมาย / ปิดเคส
                </button>
            );
        }
        if (report.status === 'completed') {
            return (
                <button disabled className="bg-gray-100 text-gray-400 px-6 py-2 rounded-lg text-sm font-bold border border-gray-200 cursor-not-allowed flex items-center gap-2">
                    <CheckCircle size={18} /> เสร็จสิ้น
                </button>
            );
        }
        return null;
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

    if (!report) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
            <p>ไม่พบข้อมูลเคส หรือรหัสไม่ถูกต้อง</p>
            <Link href="/rescue" className="mt-4 text-blue-600 underline">กลับหน้า Dashboard</Link>
        </div>
    );

    const currentStep = getCurrentStepIndex(report.status);
    const { cleanDesc, chatLogs } = parseReportData(report.description);

    return (
        <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
            {/* 1. Header (Navbar) */}
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
                        <Link href="/rescue" className="text-yellow-400 font-bold border-b-2 border-yellow-400 pb-1 cursor-default">ช่วยเหลือ/กู้ภัย</Link>
                        <button
                            onClick={() => getAuth(db.app).signOut().then(() => window.location.href = '/login')}
                            className="text-white hover:text-white/80 transition font-medium bg-red-500 hover:bg-red-600 px-4 py-1.5 rounded-lg shadow-sm"
                        >
                            ออกจากระบบ
                        </button>
                    </div>
                </div>
            </nav>

            <main className="flex-grow container mx-auto px-4 py-8 max-w-4xl">
                {/* Back & Title */}
                <div className="flex items-center gap-4 mb-6 text-gray-800">
                    <Link href="/rescue" className="hover:bg-gray-200 p-2 rounded-full transition">
                        <ArrowLeft size={24} />
                    </Link>
                    <h1 className="text-2xl font-bold">Track Case ติดตามสถานะ (ผู้ช่วยเหลือ/กู้ภัย)</h1>
                </div>

                {/* Main Card (Unified) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 relative transition-all">
                    {/* Status Strip */}
                    <div className="absolute left-0 top-0 bottom-0 w-2 bg-green-500 z-10"></div>

                    <div className="p-6">
                        {/* Header Info */}
                        <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
                            <div>
                                <h3 className="text-sm text-gray-500 font-semibold uppercase tracking-wider mb-1">รับเคส : มูลนิธิร่วมกตัญญู (ตัวอย่าง)</h3>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                                        <ShieldCheck size={16} />
                                        <span className="text-xs font-bold">คุณกำลังปฏิบัติหน้าที่</span>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase
                                        ${report.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}
                                    `}>
                                        {report.status}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="relative mb-8 px-4">
                            <div className="absolute top-[18px] left-0 right-0 h-2 bg-gray-100 rounded-full -z-0 mx-10"></div>
                            <div
                                className="absolute top-[18px] left-0 h-2 bg-green-500 rounded-full -z-0 mx-10 transition-all duration-700 ease-out"
                                style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                            ></div>
                            <div className="flex justify-between items-start relative z-10">
                                {steps.map((step) => {
                                    const isActive = step.id <= currentStep;
                                    const Icon = step.icon;
                                    return (
                                        <div key={step.id} className="flex flex-col items-center gap-2 w-24">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-4
                                                ${isActive ? 'bg-white border-green-500 text-green-600 shadow-md scale-110' : 'bg-white border-gray-200 text-gray-300'}
                                            `}>
                                                {isActive ? <span className="text-sm font-bold">{step.id}</span> : <span className="text-sm font-bold text-gray-300">{step.id}</span>}
                                            </div>
                                            <div className="flex flex-col items-center gap-1">
                                                <Icon size={16} className={isActive ? 'text-green-600' : 'text-gray-300'} />
                                                <span className={`text-[10px] md:text-xs text-center font-bold px-2 py-0.5 rounded
                                                    ${isActive ? 'text-green-700' : 'text-gray-400'}
                                                `}>
                                                    {step.label}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Info & Actions */}
                        <div className="flex flex-col md:flex-row justify-between items-end gap-4 mt-6 pt-6 border-t border-gray-100">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    {report.disasterType} <span className="text-sm font-normal text-gray-500">({report.location})</span>
                                </h2>
                                <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">รายละเอียด: {cleanDesc}</p>
                                <p className="text-xs text-gray-400 mt-2">แจ้งเมื่อ: {report.timestamp ? new Date(report.timestamp.seconds * 1000).toLocaleString('th-TH') : "ไม่ระบุ"}</p>
                            </div>

                            {/* Buttons Area */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsChatOpen(!isChatOpen)}
                                    className={`px-6 py-2 rounded-lg font-bold shadow-sm transition-all duration-300 flex items-center gap-2 whitespace-nowrap text-sm border
                                        ${isChatOpen
                                            ? 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
                                            : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700 animate-pulse-slow'}
                                    `}
                                >
                                    {isChatOpen ? (<><X size={18} /> ซ่อนแชท</>) : (<><MessageCircle size={18} /> ติดต่อผู้แจ้ง</>)}
                                </button>

                                {renderActionButton()}
                            </div>
                        </div>
                    </div>

                    {/* Collapsible Chat Area (Inside Card) */}
                    <div
                        className={`transition-all duration-500 ease-in-out overflow-hidden bg-gray-50 border-t border-gray-100
                        ${isChatOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}
                    `}
                    >
                        <div className="flex flex-col h-[500px]">
                            {/* Messages */}
                            <div className="flex-grow p-6 overflow-y-auto space-y-4 bg-gray-50/50">
                                {chatLogs.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                                        <MessageCircle size={48} className="mb-2" />
                                        <p>เริ่มการสนทนาเพื่อสอบถามข้อมูลเพิ่มเติม</p>
                                    </div>
                                ) : (
                                    chatLogs.map((log, index) => (
                                        <div key={index} className={`flex flex-col ${log.sender === 'me' ? 'items-end' : 'items-start'}`}>
                                            <div className={`px-5 py-3 rounded-2xl text-sm max-w-[85%] shadow-sm relative
                                                ${log.sender === 'me'
                                                    ? 'bg-blue-600 text-white rounded-br-none'
                                                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'}
                                            `}>
                                                {log.message}
                                            </div>
                                            <span className="text-[10px] text-gray-400 mt-1 mx-2 font-medium">
                                                {log.sender === 'me' ? 'คุณ (จนท.)' : 'ผู้ประสบภัย'} • {log.time}
                                            </span>
                                        </div>
                                    ))
                                )}
                                <div ref={chatBottomRef}></div>
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-white border-t border-gray-200">
                                <div className="flex gap-2 items-center bg-gray-100 p-2 rounded-xl border border-transparent focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                                    <input
                                        type="text"
                                        value={chatMessage}
                                        onChange={(e) => setChatMessage(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="พิมพ์ข้อความถึงผู้ประสบภัย..."
                                        className="flex-grow bg-transparent border-none outline-none text-gray-700 text-sm py-2 px-3"
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={isSending || !chatMessage.trim()}
                                        className={`p-2 rounded-lg transition-all transform hover:scale-105 active:scale-95
                                            ${chatMessage.trim() ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
                                        `}
                                    >
                                        {isSending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </main>

            <Footer />
        </div>
    );
}

export default function RescueStatusPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-gray-50"><Loader2 className="animate-spin text-blue-600" /></div>}>
            <RescueStatusContent />
        </Suspense>
    );
}
