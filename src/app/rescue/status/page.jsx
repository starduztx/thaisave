"use client";
import { useState, useEffect, useRef, Suspense } from 'react';
import { db } from '../../../lib/db';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Send, X, MessageCircle, UserCheck, Handshake, Siren, Home, ShieldCheck, FileText, Truck, User } from 'lucide-react';

// ฟังก์ชันแยกข้อความ (Same logic but identifying "me" as Officer)
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
    const [isChatOpen, setIsChatOpen] = useState(false);
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
    }, [isChatOpen, report]);

    const getCurrentStepIndex = (status) => {
        if (status === 'completed') return 5;
        if (status === 'traveling') return 4;
        if (status === 'accepted') return 3;
        return 1;
    };

    const steps = [
        { id: 1, label: "แจ้งเหตุ", icon: FileText },
        { id: 2, label: "ตรวจสอบ", icon: UserCheck },
        { id: 3, label: "รับเคส", icon: Handshake },
        { id: 4, label: "เดินทาง", icon: Truck },
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

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#1E1E2E]"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;

    if (!report) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#1E1E2E] text-gray-400">
            <p>ไม่พบข้อมูลเคส หรือรหัสไม่ถูกต้อง</p>
            <Link href="/rescue" className="mt-4 text-blue-400 underline">กลับหน้า Dashboard</Link>
        </div>
    );

    const currentStep = getCurrentStepIndex(report.status);
    const { cleanDesc, chatLogs } = parseReportData(report.description);

    return (
        <div className="min-h-screen bg-[#1E1E2E] font-sans pb-20 p-4 flex flex-col items-center">

            {/* Header */}
            <div className="w-full max-w-3xl mb-6 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                    <Link href="/rescue" className="p-2 hover:bg-white/10 rounded-full transition"><ArrowLeft size={24} /></Link>
                    <h1 className="text-xl font-bold">Case Operation Dashboard</h1>
                </div>
                <div className="bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-semibold border border-white/20">
                    Case #{report.id.slice(0, 6)}
                </div>
            </div>

            <div className="w-full max-w-3xl space-y-6">

                <div className="bg-white rounded-xl shadow-xl overflow-hidden border-l-4 border-blue-500 relative transition-all">

                    {/* 1. Header & Timeline */}
                    <div className="p-6">
                        <div className="mb-6 flex justify-between items-start">
                            <p className="font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-full text-sm">
                                สถานะปัจจุบัน: <span className="text-blue-600 font-bold uppercase">{report.status}</span>
                            </p>
                            {/* Officer Name (Yourself) */}
                            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                                <ShieldCheck size={16} />
                                <span className="text-sm font-bold">คุณกำลังปฏิบัติหน้าที่</span>
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="relative mb-8 mt-4 mx-2">
                            <div className="absolute top-[20px] left-0 right-0 h-1 bg-gray-200 -z-0 mx-8"></div>
                            <div
                                className="absolute top-[20px] left-0 h-1 bg-blue-500 -z-0 mx-8 transition-all duration-700 ease-out"
                                style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                            ></div>

                            <div className="flex justify-between items-start relative z-10">
                                {steps.map((step) => {
                                    const isActive = step.id <= currentStep;
                                    const Icon = step.icon;
                                    return (
                                        <div key={step.id} className="flex flex-col items-center gap-2 w-20">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 shadow-sm border-2
                                ${isActive ? 'bg-blue-500 border-blue-500 text-white scale-110 shadow-md' : 'bg-white border-gray-300 text-gray-300'}
                            `}>
                                                <Icon size={18} />
                                            </div>
                                            <span className={`text-[10px] md:text-xs text-center font-medium
                                ${isActive ? 'text-blue-600 font-bold' : 'text-gray-400'}
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
                                <h3 className="font-bold text-gray-900 text-lg">{report.disasterType}</h3>
                                <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{cleanDesc}</p>
                                <div className="flex gap-4 mt-2">
                                    <span className="flex items-center gap-1 text-xs text-gray-500"><User size={12} /> ผู้แจ้ง: {report.contactName || '-'}</span>
                                    <span className="flex items-center gap-1 text-xs text-gray-500"><Truck size={12} /> {report.location}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsChatOpen(!isChatOpen)}
                                className={`px-6 py-2.5 rounded-lg font-bold shadow-sm transition-all duration-300 flex items-center gap-2 whitespace-nowrap text-sm
                                ${isChatOpen
                                        ? 'bg-gray-500 hover:bg-gray-600 text-white'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white animate-pulse-slow'}
                            `}
                            >
                                {isChatOpen ? (<><X size={18} /> ซ่อนแชท</>) : (<><MessageCircle size={18} /> ติดต่อผู้แจ้ง</>)}
                            </button>
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
                                                {log.sender === 'me' ? 'คุณ (จนท.)' : 'ผู้ประสบภัย'} • {log.time}
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
                                    placeholder="พิมพ์ข้อความถึงผู้ประสบภัย..."
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
            </div>
        </div>
    );
}

export default function RescueStatusPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-[#1E1E2E]"><Loader2 className="animate-spin text-blue-500" /></div>}>
            <RescueStatusContent />
        </Suspense>
    );
}
