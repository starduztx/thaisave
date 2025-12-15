"use client";
import { useState } from 'react';
import { db } from '../../lib/db'; 
import { collection, addDoc } from 'firebase/firestore';

export default function SimpleTestPage() {
  const [msg, setMsg] = useState('พร้อมทดสอบ...');

  const testSimple = async () => {
    setMsg('⏳ กำลังส่งข้อมูล... (ไม่ต้องรอ Login)');
    try {
      // ยิงตรงไปที่ Database เลย (เพราะเราเปิด Rules public แล้ว)
      await addDoc(collection(db, "test_simple"), {
        hello: "world",
        time: new Date()
      });
      setMsg('✅ สำเร็จ! เชื่อมต่อ Database ได้แล้ว (Rules public ทำงาน)');
      alert('เย้! เชื่อมต่อได้แล้วครับ กลับไปหน้าหลักได้เลย');
    } catch (e) {
      setMsg(`❌ พัง: ${e.message}`);
    }
  };

  return (
    <div className="p-10 text-center">
      <h1 className="text-xl font-bold mb-4">ทดสอบแบบง่าย (Simple Test)</h1>
      <div className="bg-gray-100 p-4 rounded mb-4 text-lg">{msg}</div>
      <button onClick={testSimple} className="bg-green-600 text-white px-6 py-3 rounded font-bold shadow-lg active:scale-95">
        จิ้มเพื่อทดสอบ
      </button>
    </div>
  );
}