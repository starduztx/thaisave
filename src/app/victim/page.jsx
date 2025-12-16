"use client";
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { db } from '../../lib/db'; 
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import Link from 'next/link';
// ✅ ส่วนที่เพิ่มใหม่: Import ไอคอน Upload, X, ImageIcon มาใช้ตกแต่ง
import { MapPin, Menu, Upload, X, Image as ImageIcon } from 'lucide-react'; 

const MapContainer = dynamic(() => import('../../components/map/MapContainer'), { 
  ssr: false, 
  loading: () => <div className="w-full h-[400px] bg-slate-100 animate-pulse flex items-center justify-center text-slate-400">กำลังโหลดแผนที่...</div>
});

export default function VictimReportPage() {
  const [disasterType, setDisasterType] = useState('น้ำท่วม (Flood)'); 
  const [description, setDescription] = useState('');
  
  // State พิกัด
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [locationString, setLocationString] = useState('');

  // ---------------------------------------------------------------------------
  // ✅ ส่วนที่เพิ่มใหม่: State สำหรับจัดการรูปภาพและผลลัพธ์ AI
  // ---------------------------------------------------------------------------
  const [selectedFile, setSelectedFile] = useState(null); // เก็บไฟล์รูปจริง
  const [previewUrl, setPreviewUrl] = useState(null);     // เก็บ URL รูปเพื่อแสดงตัวอย่าง
  const [aiResult, setAiResult] = useState(null);         // เก็บผลที่ AI ตอบกลับมา
  // ---------------------------------------------------------------------------

  const [contactPhone, setContactPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!db) return;
    const auth = getAuth(db.app);
    signInAnonymously(auth).catch(console.error);
    onAuthStateChanged(auth, (u) => { if (u) setUser(u); });
  }, []);

  //แปลงค่ารูปเป็น base64 (ถ้าต้องการใช้)
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);
      fileReader.onload = () => {
        resolve(fileReader.result);
      };
      fileReader.onerror = (error) => {
        reject(error);
      };
    });
  };

  const handleMapSelect = (newLat, newLng) => {
    setLat(newLat);
    setLng(newLng);
    setLocationString(`${newLat.toFixed(6)}, ${newLng.toFixed(6)}`);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) return alert("Browser ไม่รองรับ");
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        setLocationString(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        setIsGettingLocation(false);
      },
      () => { alert("ดึงพิกัดไม่ได้"); setIsGettingLocation(false); }
    );
  };

  // ---------------------------------------------------------------------------
  // ✅ ส่วนที่เพิ่มใหม่: ฟังก์ชันจัดการเมื่อผู้ใช้เลือกไฟล์รูป
  // ---------------------------------------------------------------------------
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 800 * 1024) {
        alert("⚠️ ไฟล์ใหญ่เกินไป! ระบบฟรีรองรับรูปไม่เกิน 800KB ครับ \n(ลองแคปหน้าจอรูปนั้นมาส่งแทน จะช่วยลดขนาดไฟล์ได้ครับ)");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file)); // สร้าง Link ปลอมๆ เพื่อโชว์รูปในเว็บ
      setAiResult(null); // เคลียร์ค่า AI เดิมออก (ถ้ามี)
    }
  };

  const removeImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAiResult(null);
  };
  // ---------------------------------------------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user || !description || !locationString) {
      alert("กรุณากรอกข้อมูลให้ครบและระบุพิกัด");
      return;
    }
    
    // ✅ ส่วนที่เพิ่มใหม่: เช็คว่าถ้าไม่มีรูป ไม่ให้ส่ง (Optional: ลบออกได้ถ้าไม่บังคับ)
    if (!selectedFile) {
        alert("กรุณาแนบรูปภาพหลักฐาน");
        return;
    }

    setIsSubmitting(true);

    try {
      let base64Image = null; //เพิ่มตัวแปรเก็บ base64

      // -----------------------------------------------------------------------
      // ✅ ส่วนที่เพิ่มใหม่: Logic การส่งรูปไปหา API และรอผลจาก AI
      // -----------------------------------------------------------------------
      if (selectedFile) {
        base64Image = await convertToBase64(selectedFile); //เรียกใช้ฟังก์ชันแปลงเป็น base64
        
      }
      // -----------------------------------------------------------------------

      const reportData = {
        userId: user.uid,
        disasterType,
        description,
        location: locationString,
        latitude: lat,
        longitude: lng,
        contactPhone,
        status: 'pending',
        timestamp: serverTimestamp(),
        imageUrl: base64Image, //เก็บ url รูป ลงฐานข้อมูล
        hasImage: !!selectedFile,
      };

      await addDoc(collection(db, "reports"), reportData);

      alert("✅ ส่งข้อมูลขอความช่วยเหลือสำเร็จ! \nเจ้าหน้าที่จะตรวจสอบหลักฐานและติดต่อกลับโดยเร็วที่สุด");
      
      // Reset Form
      setDescription('');
      setLocationString('');
      setLat(null);
      setLng(null);
      setContactPhone('');
      removeImage(); 

    } catch (error) {
      console.error(error);
      alert("❌ เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white">
      {/* Navbar เดิม */}
      <nav className="bg-[#1E3A8A] text-white w-full shadow-md sticky top-0 z-50">
        <div className="w-full px-6 py-4 flex justify-between items-center">
          <div className="flex flex-col">
            <Link href="/" className="text-2xl font-bold">ThaiSave(ไทยเซฟ)</Link>
            <span className="text-[11px] text-blue-200 opacity-80">ระบบกลางจัดการภัยพิบัติแห่งชาติ</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
             <button className="bg-white text-[#1E3A8A] px-6 py-2 rounded font-bold">แจ้งเหตุ</button>
          </div>
          <button className="md:hidden text-white"><Menu size={28} /></button>
        </div>
      </nav>

      <div className="flex-grow w-full py-8 px-4 md:px-8">
        <div className="w-full max-w-[1600px] mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">แจ้งเหตุขอความช่วยเหลือด่วน</h1>

          <div className="bg-white rounded shadow-sm border border-gray-200 p-6 md:p-10 w-full">
            
            {!user && <div className="bg-yellow-50 text-yellow-800 p-4 mb-8">🔄 กำลังเชื่อมต่อระบบ...</div>}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* ส่วน Input เดิม (ซ่อนไว้เพื่อประหยัดพื้นที่ดูโค้ด) */}
              <div>
                 <label className="block text-gray-700 font-bold mb-2">ประเภทภัยพิบัติ</label>
                 <select value={disasterType} onChange={(e) => setDisasterType(e.target.value)} className="w-full p-3 border border-gray-300 rounded">
                   <option value="น้ำท่วม (Flood)">น้ำท่วม (Flood)</option>
                   <option value="ไฟไหม้ (Fire)">ไฟไหม้ (Fire)</option>
                   <option value="อื่นๆ (Other)">อื่นๆ (Other)</option>
                 </select>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-2">รายละเอียด</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows="4" className="w-full p-3 border border-gray-300 rounded" required />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-2">เบอร์ติดต่อ</label>
                <input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="w-full p-3 border border-gray-300 rounded" required />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-2">พิกัดสถานที่</label>
                <div className="w-full h-[400px] mb-4 border-2 border-gray-200 rounded-lg overflow-hidden relative">
                   <MapContainer selectedLat={lat} selectedLng={lng} onLocationSelect={handleMapSelect} />
                </div>
                <div className="flex gap-2">
                   <input type="text" value={locationString} readOnly className="flex-grow p-3 border border-gray-300 rounded bg-gray-50" placeholder="พิกัด GPS" />
                   <button type="button" onClick={handleGetLocation} disabled={isGettingLocation} className="bg-blue-600 text-white px-6 rounded whitespace-nowrap">
                     {isGettingLocation ? "..." : "ดึงพิกัดปัจจุบัน"}
                   </button>
                </div>
              </div>

              {/* ------------------------------------------------------------- */}
              {/* ✅ ส่วนที่เพิ่มใหม่: UI สำหรับอัปโหลดรูป (แทนกล่องเปล่าเดิม) */}
              {/* ------------------------------------------------------------- */}
              <div>
                 <label className="block text-gray-700 font-bold mb-2">แนบหลักฐาน (รูปภาพ)</label>
                 
                 {/* เงื่อนไข: ถ้ายังไม่เลือกไฟล์ ให้โชว์ปุ่ม Upload */}
                 {!selectedFile ? (
                    <label className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center bg-gray-50 hover:bg-blue-50 transition cursor-pointer flex flex-col items-center justify-center gap-2">
                        <Upload size={40} className="text-blue-500" />
                        <span className="text-blue-600 font-medium">คลิกเพื่ออัปโหลดรูปภาพ</span>
                        <span className="text-xs text-gray-400">JPG, PNG (แนบรูปภาพที่ไม่เกิน 800KB)</span>
                        <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                 ) : (
                    //เงื่อนไข: ถ้าเลือกไฟล์แล้ว ให้โชว์ Preview และปุ่มลบ 
                    <div className="relative border rounded-lg p-4 bg-gray-50 flex items-center gap-4">
                        <div className="relative w-24 h-24 rounded overflow-hidden border">
                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-grow">
                            <p className="font-medium text-gray-700 truncate">{selectedFile.name}</p>
                            <p className="text-sm text-green-600">พร้อมส่งหลักฐาน</p>
                        </div>
                        <button type="button" onClick={removeImage} className="text-red-500 hover:text-red-700 p-2">
                            <X size={24} />
                        </button>
                    </div>
                 )}
              </div>
              {/* ------------------------------------------------------------- */}

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={isSubmitting || !user} 
                  className={`w-full py-4 text-white font-bold text-xl rounded shadow-md transition-all
                    ${isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}
                  `}
                >
                  {isSubmitting ? "กำลังส่งข้อมูล..." : "ส่งข้อมูลขอความช่วยเหลือ"}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}