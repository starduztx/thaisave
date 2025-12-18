"use client";
import { useState, useEffect } from 'react';
import { db } from '../../lib/db'; 
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import Link from 'next/link';
import { ArrowLeft, Loader2, Send, X } from 'lucide-react';

export default function TrackingPage() {
  //ตัวแปรเก็บค่าสถานะต่างๆ
  const [user, setUser] = useState(null);
  const [myReport, setMyReport] = useState(null);
  const [loading, setLoading] = useState(true);

  // State สำหรับฟอร์มอัปเดต
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateText, setUpdateText] = useState('');
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);

  // 1. เช็ค Login
  useEffect(() => {
    if (!db) return;
    const auth = getAuth(db.app);
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
      else setLoading(false);
    });
    return () => unsubAuth();
  }, []);

  // 2. ดึงข้อมูลเคสล่าสุด
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

  // --- Logic คำนวณสถานะ (Stepper) ---
  const getCurrentStepIndex = (status) => {
    if (status === 'completed') return 4; 
    if (status === 'accepted') return 3; // กำลังเดินทาง/ช่วยเหลือ
    return 1; // ส่งเรื่องแล้ว (Pending)
  };

  // ชื่อขั้นตอนตาม UI ที่ออกแบบ
  const steps = [
    { id: 1, label: "ส่งเรื่องแล้ว" },
    { id: 2, label: "กำลังตรวจสอบ" }, // ขั้นนี้อาจจะข้ามไวหน่อยในระบบเรา
    { id: 3, label: "กำลังเดินทาง/ช่วยเหลือ" },
    { id: 4, label: "เสร็จสิ้น" },
  ];

  // --- ฟังก์ชันส่งข้อมูลอัปเดตเพิ่มเติม ---
  const handleSendUpdate = async () => {
    if (!updateText.trim()) return;
    setIsSubmittingUpdate(true);

    try {
        const reportRef = doc(db, "reports", myReport.id);
        
        // สร้างข้อความใหม่ (เอาของเก่า + ของใหม่ที่มีเวลาบอก)
        const timeString = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        const newDescription = `${myReport.description}\n\n[อัปเดตเพิ่มเติม ${timeString}]: ${updateText}`;

        await updateDoc(reportRef, {
            description: newDescription,
            lastUpdated: serverTimestamp() // บันทึกเวลาที่มีการแก้ล่าสุด
        });

        alert("✅ อัปเดตข้อมูลเพิ่มเติมสำเร็จ!");
        setUpdateText('');
        setIsUpdating(false); // ปิดฟอร์ม

    } catch (error) {
        console.error("Update Error:", error);
        alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
        setIsSubmittingUpdate(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-blue-600">
      <Loader2 className="animate-spin" size={48} />
    </div>
  );

  const currentStep = myReport ? getCurrentStepIndex(myReport.status) : 0;

  return (
    <div className="min-h-screen bg-[#b9b9c1] font-sans pb-20 p-4 flex flex-col items-center">
      
      {/* Header */}
      <div className="w-full max-w-2xl mb-6 flex items-center gap-3 text-white">
        <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition">
            <ArrowLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold">ความคืบหน้า</h1>
      </div>

      <div className="w-full max-w-2xl space-y-6">
        
        {!myReport && (
            <div className="text-center py-20 bg-white rounded-xl shadow-lg">
                <p className="text-gray-500 mb-6 font-medium">คุณยังไม่มีรายการแจ้งเหตุ</p>
                <Link href="/victim">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 rounded-lg font-bold">
                        แจ้งเหตุใหม่
                    </button>
                </Link>
            </div>
        )}

        {myReport && (
            <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                
                {/* Header Card */}
                <div className="p-6 border-b border-gray-100">
                    <h2 className="font-bold text-gray-800 mb-4">สถานะการแจ้งเหตุของคุณ</h2>
                    
                    {/* --- Horizontal Stepper (แบบในรูป) --- */}
                    <div className="relative mb-8 px-2">
                        {/* เส้นพื้นหลัง (สีเทา) */}
                        <div className="absolute top-[14px] left-0 w-full h-1.5 bg-gray-200 rounded-full z-0"></div>
                        
                        {/* เส้นสีเขียว (Progress) */}
                        <div 
                           className="absolute top-[14px] left-0 h-1.5 bg-green-500 rounded-full z-0 transition-all duration-700 ease-out"
                           style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                        ></div>

                        {/* จุดวงกลม */}
                        <div className="relative z-10 flex justify-between">
                            {steps.map((step) => {
                                const isActive = step.id <= currentStep;
                                return (
                                    <div key={step.id} className="flex flex-col items-center">
                                        <div className={`w-8 h-8 rounded-full border-4 transition-all duration-500 flex items-center justify-center
                                            ${isActive 
                                                ? 'bg-green-500 border-green-500 scale-110 shadow-md' 
                                                : 'bg-white border-gray-400'}
                                        `}>
                                            {/* ถ้า Active แล้ว ให้โชว์จุดสีขาวข้างใน */}
                                            {isActive && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ข้อความสถานะปัจจุบัน */}
                    <div className="text-center mb-6">
                        <span className="text-2xl mr-2">
                            {currentStep === 1 && "📨"}
                            {currentStep === 2 && "🕵️"}
                            {currentStep === 3 && "🚨"}
                            {currentStep === 4 && "✅"}
                        </span>
                        <span className={`font-bold text-lg ${
                            currentStep === 4 ? 'text-green-600' : 'text-green-600'
                        }`}>
                            {steps[currentStep - 1]?.label || "สถานะไม่ระบุ"}
                        </span>
                    </div>

                    {/* รายละเอียดเคส */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-1">
                            <h3 className="font-bold text-gray-900">{myReport.disasterType}</h3>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                                {myReport.timestamp?.toDate ? Math.floor((new Date() - myReport.timestamp.toDate()) / 60000) + ' นาทีที่แล้ว' : ''}
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                            {myReport.description}
                        </p>
                    </div>
                </div>

                {/* Footer / Button Area */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-col gap-3">
                    
                    {/* ปุ่มกดอัปเดต (ถ้ายังไม่เสร็จสิ้น) */}
                    {currentStep < 4 && !isUpdating && (
                        <div className="flex justify-end">
                            <button 
                                onClick={() => setIsUpdating(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold text-sm shadow transition-transform hover:scale-105 active:scale-95 flex items-center gap-2"
                            >
                                อัปเดตสถานการณ์
                            </button>
                        </div>
                    )}

                    {/* --- ฟอร์มอัปเดต (เด้งขึ้นมาเมื่อกดปุ่ม) --- */}
                    {isUpdating && (
                        <div className="bg-white border border-blue-200 rounded-lg p-4 animate-in fade-in slide-in-from-top-2">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-sm font-bold text-blue-800">ข้อมูลเพิ่มเติมถึงกู้ภัย:</label>
                                <button onClick={() => setIsUpdating(false)} className="text-gray-400 hover:text-red-500">
                                    <X size={18} />
                                </button>
                            </div>
                            
                            <textarea 
                                value={updateText}
                                onChange={(e) => setUpdateText(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none mb-3"
                                placeholder="เช่น น้ำลดลงแล้ว, ต้องการยาเพิ่ม, ย้ายจุดรอไปที่..."
                                rows="3"
                            />
                            
                            <div className="flex justify-end gap-2">
                                <button 
                                    onClick={() => setIsUpdating(false)}
                                    className="px-4 py-2 text-gray-600 text-sm hover:bg-gray-100 rounded-lg"
                                >
                                    ยกเลิก
                                </button>
                                <button 
                                    onClick={handleSendUpdate}
                                    disabled={isSubmittingUpdate}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 disabled:bg-gray-400"
                                >
                                    {isSubmittingUpdate ? <Loader2 className="animate-spin" size={16}/> : <Send size={16}/>}
                                    ส่งข้อมูล
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        )}
      </div>
    </div>
  );
}