"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu } from 'lucide-react';

const LoginPage = () => {
  const { loginWithGoogle, user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      // Redirect will be handled by the useEffect below
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google");
      console.error(err);
    }
  };

  // Redirect Logic
  useEffect(() => {
    if (user && !user.isAnonymous) {
      if (user.role === 'rescue') router.push('/rescue');
      else if (user.role === 'center') router.push('/center');
      // If Role is not assigned yet or unknown, maybe stay? Or default to rescue?
      // logic says: default to rescue if not admin.
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white">

      {/* 1. Header (Navbar) */}
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
            <Link href="/center" className="hover:text-yellow-400 transition">ส่วนกลาง/ศูนย์ช่วยเหลือ</Link>
            <Link href="/rescue" className="hover:text-yellow-400 transition">ช่วยเหลือ/กู้ภัย</Link>
            <Link href="#" className="hover:text-yellow-400 transition">ติดต่อ</Link>
            <Link href="#" className="hover:text-yellow-400 transition">เกี่ยวกับ</Link>
            <Link href="/victim">
              <button className="bg-white text-[#1E3A8A] px-6 py-2 rounded font-bold hover:bg-gray-100 transition shadow-sm border border-transparent hover:border-gray-300">
                แจ้งเหตุ
              </button>
            </Link>
          </div>

          <button className="md:hidden text-white">
            <Menu size={28} />
          </button>
        </div>
      </nav>

      {/* 2. Main Content (Blue Login Card) */}
      <div className="flex-grow flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-[#1E3A8A] p-10 rounded-2xl shadow-2xl text-center">

          <div className="text-white mb-8">
            <h2 className="text-3xl font-bold">เข้าสู่ระบบ</h2>
            <h3 className="text-xl mt-2 font-medium text-blue-100">ผู้ช่วยเหลือ/กู้ภัย</h3>
          </div>

          <div className="space-y-4">
            {/* Google Login */}
            <button
              onClick={handleGoogleLogin}
              className="w-full bg-white text-gray-700 font-bold py-3 px-4 rounded-lg shadow-sm hover:bg-gray-50 transition flex items-center justify-center gap-3"
            >
              <span className="text-red-500 font-bold text-xl">G</span> เข้าสู่ระบบด้วย Google
            </button>

            {/* Facebook Login Placeholder */}
            <button className="w-full bg-[#1877F2] text-white font-bold py-3 px-4 rounded-lg shadow-sm hover:bg-[#166fe5] transition flex items-center justify-center gap-3">
              <span className="font-bold text-xl">f</span> เข้าสู่ระบบด้วย Facebook
            </button>
          </div>

          {/* Error Message Display */}
          {error && (
            <div className="mt-4 bg-red-500/20 text-red-100 p-2 rounded text-sm border border-red-500/50">
              {error}
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#333333] text-gray-400 py-8 text-xs">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <h4 className="font-bold text-gray-300 mb-2">Contact</h4>
            <p>LINE Official Account: @thaisave</p>
            <p>เบอร์ติดต่อ: 1669</p>
          </div>
          <div>
            <p>copy right © 2024</p>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LoginPage;