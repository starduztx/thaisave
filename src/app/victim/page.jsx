"use client";
// File: src/app/victim/page.js
// เวอร์ชัน: Full Screen Fluid (เต็มจอ 100%) + แผนที่ปักหมุด (Map Pinning)
// รวมดีไซน์ล่าสุดเข้ากับฟังก์ชันแผนที่

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic'; // จำเป็นสำหรับ Map
import { db } from '../../lib/db';
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import Link from 'next/link';
import { ChevronLeft, MapPin, Crosshair, AlertTriangle, Send, Menu, Upload, X} from 'lucide-react';
import { useRouter } from "next/navigation";


// Import Map แบบ Dynamic (เพื่อแก้ปัญหา Server-side Rendering)
const MapContainer = dynamic(() => import('../../components/map/MapContainer'), {
  ssr: false,
  loading: () => <div className="w-full h-[400px] bg-slate-100 animate-pulse flex items-center justify-center text-slate-400">กำลังโหลดแผนที่...</div>
});

export default function VictimReportPage() {
  const [disasterType, setDisasterType] = useState('น้ำท่วม (Flood)');
  const [description, setDescription] = useState('');

  // State สำหรับพิกัด (เก็บแยกเพื่อให้ส่งเข้า Map ได้)
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [locationString, setLocationString] = useState(''); // สำหรับโชว์ใน Input Box

  // State สำหรับจัดการรูปภาพ
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [user, setUser] = useState(null);

  const router = useRouter();

  // 1. Auto Login
  useEffect(() => {
    if (!db) return;
    const auth = getAuth(db.app);
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Login Error:", error);
      }
    };
    initAuth();
    onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
    });
  }, []);

  // ฟังก์ชัน: เมื่อเลือกจุดบนแผนที่
  const handleMapSelect = (newLat, newLng) => {
    setLat(newLat);
    setLng(newLng);
    setLocationString(`${newLat.toFixed(6)}, ${newLng.toFixed(6)}`);
  };

  // Helper: แปลงไฟล์เป็น Base64
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

  // จัดการเมื่อเลือกไฟล์
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 800 * 1024) {
        alert("⚠️ ไฟล์ใหญ่เกินไป! ระบบรองรับรูปไม่เกิน 800KB ครับ");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // ลบรูปภาพ
  const removeImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  // ฟังก์ชัน: ดึงพิกัด GPS
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง");
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        // อัปเดตทั้ง Map และ Input Box
        setLat(latitude);
        setLng(longitude);
        setLocationString(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);

        setIsGettingLocation(false);
      },
      (error) => {
        console.error("Geolocation Error:", error);
        alert("ไม่สามารถดึงพิกัดได้ กรุณาระบุเองหรือจิ้มบนแผนที่");
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // 2. Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("⚠️ กำลังเชื่อมต่อระบบ... กรุณารอสักครู่");
      return;
    }
    if (!description) {
      alert("⚠️ กรุณากรอกรายละเอียด");
      return;
    }
    if (!locationString) {
      alert("⚠️ กรุณาระบุพิกัด (กดปุ่มดึงพิกัด หรือจิ้มบนแผนที่)");
      return;
    }

    setIsSubmitting(true);

    try {
      let base64Image = null;

      // แปลงรูปเป็น Base64 ถ้ามี
      if (selectedFile) {
        base64Image = await convertToBase64(selectedFile);
      }

      const reportData = {
        userId: user.uid,
        disasterType,
        description,
        location: locationString, // ส่ง string ที่โชว์ใน box
        latitude: lat,            // ส่งแยก field ไปด้วยเผื่อใช้ทำแผนที่รวม
        longitude: lng,
        contactName,
        contactPhone,
        status: 'pending',
        timestamp: serverTimestamp(),
        imageUrl: base64Image,
        hasImage: !!selectedFile,
        aiAnalysis: { label: "Text Only", confidence: 100 }
      };

      const docRef = await addDoc(
        collection(db, "reports"),
        reportData
      );

      alert("✅ ส่งข้อมูลขอความช่วยเหลือสำเร็จ!");
      router.push(`/tracking/${docRef.id}`);

      // Reset Form
      setDescription('');
      setLocationString('');
      removeImage(); // Clear image

      setLat(null);
      setLng(null);
      setContactName('');
      setDisasterType('น้ำท่วม (Flood)');

    } catch (error) {
      console.error("Submission Error:", error);
      alert("❌ เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white">

      {/* 1. Header (Navbar) แบบเต็มจอ สีน้ำเงินเข้ม */}
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
            <Link href="/center" className="hover:text-yellow-400 transition">ส่วนกลาง/ศูนย์ช่วยเหลือ</Link>
            <Link href="/rescue" className="hover:text-yellow-400 transition">ช่วยเหลือ/กู้ภัย</Link>
            <Link href="#" className="hover:text-yellow-400 transition">ติดต่อ</Link>
            <Link href="#" className="hover:text-yellow-400 transition">เกี่ยวกับ</Link>
            <button className="bg-white text-[#1E3A8A] px-6 py-2 rounded font-bold hover:bg-gray-100 transition shadow-sm">
              แจ้งเหตุ
            </button>
          </div>

          {/* Mobile Menu Icon */}
          <button className="md:hidden text-white">
            <Menu size={28} />
          </button>
        </div>
      </nav>

      {/* 2. Main Content (พื้นที่เนื้อหา) */}
      <div className="flex-grow w-full py-8 px-4 md:px-8">

        <div className="w-full max-w-[1600px] mx-auto">
          {/* หัวข้อหน้า */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            แจ้งเหตุขอความช่วยเหลือด่วน
          </h1>

          {/* กล่องฟอร์มสีขาว (White Paper Style) */}
          <div className="bg-white rounded shadow-sm border border-gray-200 p-6 md:p-10 w-full">

            <div className="mb-8">
              <p className="text-gray-600 text-lg">
                กรุณากรอกข้อมูลให้ครบถ้วนและแนบหลักฐานจริง เพื่อให้เจ้าหน้าที่ประเมินสถานการณ์ได้ถูกต้อง
              </p>
            </div>

            {/* สถานะเชื่อมต่อ */}
            {!user && (
              <div className="bg-yellow-50 text-yellow-800 p-4 rounded mb-8 text-center animate-pulse border border-yellow-200">
                🔄 กำลังเชื่อมต่อระบบ...
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">

              {/* Row 1: ประเภทภัยพิบัติ */}
              <div>
                <label className="block text-gray-700 font-bold mb-2">
                  ประเภทภัยพิบัติ
                </label>
                <select
                  value={disasterType}
                  onChange={(e) => setDisasterType(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="น้ำท่วม (Flood)">น้ำท่วม (Flood)</option>
                  <option value="ไฟไหม้ (Fire)">ไฟไหม้ (Fire)</option>
                  <option value="ดินถล่ม (Landslide)">ดินถล่ม (Landslide)</option>
                  <option value="อื่นๆ (Other)">อื่นๆ (Other)</option>
                </select>
              </div>

              {/* Row 2: รายละเอียด */}
              <div>
                <label className="block text-gray-700 font-bold mb-2">
                  รายละเอียดสถานการณ์ (ระบุเด็ก/คนชรา/ผู้ป่วย)
                </label>
                <textarea
                  rows="4"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="เช่น น้ำท่วมถึงชั้น 2, มีผู้ป่วยติดเตียง 1 คน, เด็ก 2 คน, อาหารหมดแล้ว"
                  className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  required
                />
              </div>

              {/* Row 3: เบอร์ติดต่อ */}
              <div>
                <label className="block text-gray-700 font-bold mb-2">
                  เบอร์ติดต่อ (จำเป็น)
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="08x-xxx-xxxx"
                  className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  required
                />
              </div>

              {/* Row 3: พิกัด GPS */}
              <div>
                <label className="block text-gray-700 font-bold mb-2">
                  พิกัดสถานที่ (GPS)
                </label>

                {/* 3.1 แผนที่ปักหมุด (Map Component) */}
                <div className="w-full h-[400px] mb-4 border-2 border-gray-200 rounded-lg overflow-hidden relative z-0">
                  <MapContainer
                    selectedLat={lat}
                    selectedLng={lng}
                    onLocationSelect={handleMapSelect}
                  />
                </div>

                {/* 3.2 ปุ่มและช่องกรอกพิกัด */}
                <div className="flex flex-col sm:flex-row gap-0 sm:gap-2">
                  <div className="relative flex-grow">
                    <MapPin className="absolute top-3 left-3 text-gray-400" size={20} />
                    <input
                      type="text"
                      value={locationString}
                      onChange={(e) => setLocationString(e.target.value)}
                      placeholder="พิกัดจะขึ้นอัตโนมัติเมื่อกดปุ่ม GPS หรือจิ้มแผนที่"
                      className="w-full pl-10 p-3 border border-gray-300 rounded-t sm:rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 bg-gray-50"
                      required
                      readOnly // แนะนำให้ readOnly เพื่อบังคับใช้ Map/GPS
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={isGettingLocation}
                    className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-6 py-3 rounded-b sm:rounded font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap min-w-[180px]"
                  >
                    {isGettingLocation ? "กำลังค้นหา..." : "ดึงตำแหน่งปัจจุบัน"}
                  </button>
                </div>
              </div>

              {/* Row 4: แนบหลักฐาน (Visual Placeholder) */}
              {/* Row 4: แนบหลักฐาน (รูปภาพ) */}
              <div>
                <label className="block text-gray-700 font-bold mb-2">แนบหลักฐาน (รูปภาพ)</label>

                {!selectedFile ? (
                  <label className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center bg-gray-50 hover:bg-blue-50 transition cursor-pointer flex flex-col items-center justify-center gap-2">
                    <Upload size={40} className="text-blue-500" />
                    <span className="text-blue-600 font-medium">คลิกเพื่ออัปโหลดรูปภาพ</span>
                    <span className="text-xs text-gray-400">JPG, PNG (ขนาดไม่เกิน 800KB)</span>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                ) : (
                  <div className="relative border rounded-lg p-4 bg-gray-50 flex items-center gap-4">
                    <div className="relative w-24 h-24 rounded overflow-hidden border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
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

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || !user}
                  className={`w-full py-4 text-white font-bold text-xl rounded shadow-md transition-all
                    ${isSubmitting || !user
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.99]'}`}
                >
                  {isSubmitting ? "กำลังส่งข้อมูล..." : "ส่งข้อมูลขอความช่วยเหลือ"}
                
                </button>
                
              </div>

            </form>
          </div>
        </div>
      </div>

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