"use client";

// File: src/app/victim/page.jsx
// Location: หน้าแจ้งเหตุผู้ประสบภัย (Real Implementation - ต่อ DB และ AI จริง)

import React, { useState, useEffect } from 'react';
import { Camera, MapPin, Phone, AlertTriangle, Send, CheckCircle, Clock, Navigation, Loader2 } from 'lucide-react';

// Import Firebase
import { db, storage } from '../../lib/firebase/config';
import { collection, addDoc, serverTimestamp, doc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Import AI Service
import { analyzeDisasterImage } from '../../lib/aiService';

const VictimPage = () => {
  // --- State Management ---
  const [step, setStep] = useState(1); // 1=Form, 2=Tracking
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  
  // Form Data
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [location, setLocation] = useState(null);
  const [phone, setPhone] = useState("");
  const [details, setDetails] = useState("");
  const [aiResult, setAiResult] = useState(null);

  // Tracking Data
  const [currentCaseId, setCurrentCaseId] = useState(null);
  const [caseStatus, setCaseStatus] = useState("pending");

  // --- Logic 1: จัดการรูปภาพ & AI ---
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));

    setStatusText("AI กำลังวิเคราะห์ภาพ...");
    setLoading(true); // โชว์ Loading ตอน AI คิด
    try {
      const result = await analyzeDisasterImage(file);
      setAiResult(result);
      
      if (!details) {
        setDetails(`เหตุการณ์: ${result.label} (ความมั่นใจ ${result.confidence}%)`);
      }
    } catch (error) {
      console.error("AI Error:", error);
    } finally {
      setLoading(false);
      setStatusText("");
    }
  };

  // --- Logic 2: ดึง GPS จริง ---
  const handleGetLocation = () => {
    setLoading(true);
    setStatusText("กำลังค้นหาพิกัด GPS...");
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLoading(false);
          setStatusText("");
        },
        (error) => {
          console.error("GPS Error:", error);
          setLoading(false);
          alert("ไม่สามารถดึงพิกัดได้: กรุณาเปิด GPS หรืออนุญาตการเข้าถึง");
        },
        { enableHighAccuracy: true }
      );
    } else {
      setLoading(false);
      alert("Browser ไม่รองรับ GPS");
    }
  };

  // --- Logic 3: ส่งข้อมูลเข้า Firebase ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!imageFile || !location || !phone) {
      alert("กรุณาถ่ายรูป, ระบุพิกัด และใส่เบอร์โทรให้ครบถ้วน");
      return;
    }

    const confirm = window.confirm("ยืนยันการส่งขอความช่วยเหลือ?");
    if (!confirm) return;

    setLoading(true);
    setStatusText("กำลังอัปโหลดข้อมูล...");

    try {
      // 1. Upload Image
      const filename = `reports/${Date.now()}_${imageFile.name}`;
      const storageRef = ref(storage, filename);
      const snapshot = await uploadBytes(storageRef, imageFile);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // 2. Save Data
      const docRef = await addDoc(collection(db, "reports"), {
        phone: phone,
        details: details,
        location: location,
        imageUrl: downloadURL,
        aiAnalysis: aiResult || { label: "N/A" },
        status: "pending",
        createdAt: serverTimestamp(),
      });

      // 3. Save ID & Move Next
      localStorage.setItem("current_case_id", docRef.id);
      setCurrentCaseId(docRef.id);
      setStep(2);
      window.scrollTo(0, 0);

    } catch (error) {
      console.error("Submit Error:", error);
      alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setLoading(false);
      setStatusText("");
    }
  };

  // --- Logic 4: Real-time Tracking ---
  useEffect(() => {
    if (step === 2 && currentCaseId) {
      const caseRef = doc(db, "reports", currentCaseId);
      const unsubscribe = onSnapshot(caseRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCaseStatus(data.status);
        }
      });
      return () => unsubscribe();
    }
  }, [step, currentCaseId]);

  // ================= UI SECTION =================

  if (step === 2) {
    // หน้าติดตามสถานะ (เหมือนเดิม)
    return (
      <div className="min-h-screen bg-gray-50 font-sans pb-10">
        <header className="bg-white p-4 shadow-sm sticky top-0 z-50 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-800">สถานะความช่วยเหลือ</h1>
          <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 animate-pulse">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Real-time
          </div>
        </header>

        <main className="p-4 space-y-4 max-w-md mx-auto">
          <div className={`bg-white rounded-2xl p-6 shadow-md border-l-4 transition-colors duration-500 ${caseStatus === 'pending' ? 'border-gray-400' : 'border-blue-500'}`}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {caseStatus === 'pending' && "รอรับเรื่อง"}
                  {caseStatus === 'assigned' && "กำลังเดินทาง"}
                  {caseStatus === 'on_scene' && "ถึงจุดเกิดเหตุ"}
                  {caseStatus === 'resolved' && "ช่วยเหลือสำเร็จ"}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Case ID: #{currentCaseId?.slice(0, 6)}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-full">
                {caseStatus === 'assigned' ? <Navigation className="w-6 h-6 text-blue-600 animate-bounce" /> : <Clock className="w-6 h-6 text-gray-400" />}
              </div>
            </div>

            <div className="space-y-8 relative pl-2 border-l-2 border-gray-100 ml-2">
              <div className="relative pl-6">
                <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${['pending', 'assigned', 'on_scene', 'resolved'].includes(caseStatus) ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'}`}></div>
                <h3 className="font-bold text-gray-800">ส่งข้อมูลเข้าระบบ</h3>
                <p className="text-xs text-gray-500">ข้อมูลของท่านถูกส่งถึงศูนย์สั่งการแล้ว</p>
              </div>
              <div className="relative pl-6">
                <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${['assigned', 'on_scene', 'resolved'].includes(caseStatus) ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'}`}></div>
                <h3 className={`font-bold ${['assigned', 'on_scene', 'resolved'].includes(caseStatus) ? 'text-blue-600' : 'text-gray-400'}`}>เจ้าหน้าที่รับเรื่องแล้ว</h3>
              </div>
              <div className="relative pl-6">
                <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${['on_scene', 'resolved'].includes(caseStatus) ? 'bg-orange-500 border-orange-500' : 'bg-white border-gray-300'}`}></div>
                <h3 className={`font-bold ${['on_scene', 'resolved'].includes(caseStatus) ? 'text-orange-600' : 'text-gray-400'}`}>ถึงจุดเกิดเหตุ</h3>
              </div>
            </div>
          </div>
          <button onClick={() => window.location.href = '/'} className="w-full py-4 text-gray-500 text-sm underline hover:text-gray-800">กลับหน้าหลัก</button>
        </main>
      </div>
    );
  }

  // หน้าฟอร์ม (Step 1)
  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex flex-col items-center justify-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mb-4" />
          <p className="text-lg font-medium">{statusText}</p>
        </div>
      )}

      <header className="bg-red-600 text-white p-6 rounded-b-3xl shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-3 mb-1">
          <div className="bg-white/20 p-2 rounded-full">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">แจ้งเหตุฉุกเฉิน</h1>
            <p className="text-red-100 text-xs">ระบุพิกัดและส่งภาพถ่ายเพื่อขอความช่วยเหลือ</p>
          </div>
        </div>
      </header>

      <main className="p-4 -mt-4 relative z-10 max-w-md mx-auto">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-5 space-y-6">
          {/* Upload Photo */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
              <span className="bg-red-100 text-red-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
              ถ่ายรูปสถานการณ์จริง *
            </label>
            <div className="relative group">
              <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <div className={`border-2 border-dashed rounded-xl h-56 flex flex-col items-center justify-center transition-all duration-300 ${imagePreview ? 'border-red-500 bg-gray-50' : 'border-gray-300 bg-gray-50'}`}>
                {imagePreview ? (
                  <div className="relative w-full h-full p-2">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-lg shadow-sm" />
                    {aiResult && (
                      <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-sm p-2 rounded-lg text-white text-xs">
                        <p className="font-bold flex items-center gap-2">🤖 AI: <span className="text-yellow-400 text-sm">{aiResult.label}</span></p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <div className="bg-white p-3 rounded-full shadow-sm inline-block mb-3"><Camera className="w-8 h-8 text-red-500" /></div>
                    <p className="text-sm font-medium text-gray-600">แตะเพื่อถ่ายรูป</p>
                    <p className="text-xs text-gray-400 mt-1">ระบบจะใช้ AI ประเมินให้อัตโนมัติ</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* GPS */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
              <span className="bg-red-100 text-red-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
              ตำแหน่งของคุณ *
            </label>
            <button type="button" onClick={handleGetLocation} disabled={loading} className={`w-full flex items-center justify-center gap-2 p-4 rounded-xl border font-medium transition-all shadow-sm active:scale-95 ${location ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {location ? <><CheckCircle className="w-5 h-5 text-green-600" /><span className="truncate">พิกัด: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}</span></> : <><MapPin className="text-red-500 w-5 h-5" /><span>กดปุ่มนี้เพื่อระบุตำแหน่ง GPS</span></>}
            </button>
          </div>

          {/* Phone */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
              <span className="bg-red-100 text-red-600 w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
              เบอร์โทรติดต่อกลับ *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Phone className="h-5 w-5 text-gray-400" /></div>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08x-xxx-xxxx" className="block w-full pl-10 pr-3 py-3 border-gray-300 rounded-xl bg-gray-50 focus:ring-red-500 focus:border-red-500 text-sm" required />
            </div>
          </div>

          {/* Details */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 ml-8">รายละเอียดเพิ่มเติม</label>
            <textarea rows="3" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="เช่น ระดับน้ำสูงเท่าไหร่?" className="block w-full p-3 border-gray-300 rounded-xl bg-gray-50 focus:ring-red-500 focus:border-red-500 text-sm resize-none"></textarea>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 text-lg mt-4 disabled:opacity-50">
            <Send className="w-5 h-5" /> ส่งขอความช่วยเหลือ
          </button>
        </form>
      </main>
    </div>
  );
};

export default VictimPage;